import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env, isProduction, resolveCorsOrigin } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { shopRoutes } from './routes/shop.js';
import { authRoutes } from './routes/auth.js';
import { pvpRoutes } from './routes/pvp.js';
import { initPvpStorage, getPvpStorage, getPgStorageHandle } from './pvp/pvpStorage.js';
import { registerMatchPersistence } from './pvp/pvpPersistence.js';
import { ladder } from './pvp/ladder.js';

export interface BuildServerOptions {
  /** Fastify logger config; pass false to silence (tests). */
  logger?: boolean | object;
}

/**
 * Construct the fully-wired API (security headers, CORS, storage, routes, and
 * sanitized error handling) WITHOUT binding a port. The bootstrap in index.ts
 * calls listen(); tests use app.inject(). Separating construction from listen
 * makes the production hardening testable.
 */
export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? { level: env.LOG_LEVEL },
    // This API only accepts small JSON bodies; cap to limit abuse.
    bodyLimit: 256 * 1024,
    // Behind a PaaS load balancer — honor X-Forwarded-For so req.ip (used by the
    // rate limiter) reflects the real client.
    trustProxy: true,
  });

  // Security headers. This is a JSON API consumed by a separate static client,
  // so a response CSP does not apply here; keep helmet's other protections.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: resolveCorsOrigin(), credentials: true });

  // Select + connect the storage backend before serving traffic. In postgres
  // mode this fails fast on an unreachable database and rehydrates the ladder.
  await initPvpStorage();
  app.log.info({ adapter: env.PVP_STORAGE_ADAPTER }, 'PvP storage initialized');
  if (getPgStorageHandle()) {
    const repos = getPvpStorage();
    registerMatchPersistence(
      {
        upsertRankedPlayer: (player) => repos.players.upsertRankedPlayer(player),
        insertMatch: (record) => repos.matches.insertMatch(record),
      },
      (err) => app.log.error({ err }, 'PvP match write-through failed'),
    );
    const loaded = await repos.players.listRankedPlayers(10_000);
    app.log.info({ count: ladder.hydrate(loaded) }, 'PvP ladder rehydrated from durable storage');
  }

  // Sanitized error handler: pass through client (4xx) messages, but never leak
  // internal details for 5xx in production.
  app.setErrorHandler((error, request, reply) => {
    const status = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled request error');
      return reply.code(status).send({ error: isProduction() ? 'internal server error' : error.message });
    }
    return reply.code(status).send({ error: error.message });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'not found' });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(pvpRoutes);
  await app.register(shopRoutes);

  return app;
}
