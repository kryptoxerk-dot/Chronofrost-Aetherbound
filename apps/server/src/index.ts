import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { shopRoutes } from './routes/shop.js';
import { authRoutes } from './routes/auth.js';
import { pvpRoutes } from './routes/pvp.js';
import { initPvpStorage, closePvpStorage } from './pvp/pvpStorage.js';

const app = Fastify({ logger: true });

// Select + connect the PvP storage backend before serving traffic. In postgres
// mode this fails fast on an unreachable database.
await initPvpStorage();
app.log.info({ adapter: env.PVP_STORAGE_ADAPTER }, 'PvP storage initialized');

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(pvpRoutes);
await app.register(shopRoutes);

app.addHook('onClose', async () => {
  await closePvpStorage();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

try {
  await app.listen({ port: env.SERVER_PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
