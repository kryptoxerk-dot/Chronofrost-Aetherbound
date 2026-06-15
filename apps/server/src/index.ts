import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env, resolveServerPort, resolveCorsOrigin } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { shopRoutes } from './routes/shop.js';
import { authRoutes } from './routes/auth.js';
import { pvpRoutes } from './routes/pvp.js';
import { initPvpStorage, closePvpStorage, getPvpStorage, getPgStorageHandle } from './pvp/pvpStorage.js';
import { registerMatchPersistence } from './pvp/pvpPersistence.js';
import { ladder } from './pvp/ladder.js';
import { initShopStorage, closeShopStorage } from './shop/shopStorage.js';

const app = Fastify({ logger: true });

// Select + connect the PvP storage backend before serving traffic. In postgres
// mode this fails fast on an unreachable database.
await initPvpStorage();
app.log.info({ adapter: env.PVP_STORAGE_ADAPTER }, 'PvP storage initialized');
await initShopStorage({ client: getPgStorageHandle()?.client });
app.log.info({ adapter: env.SHOP_STORAGE_ADAPTER }, 'Shop storage initialized');

// In postgres mode, mirror completed matches to durable storage and rehydrate
// the live ladder so ranked ratings/records survive a restart.
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
  const count = ladder.hydrate(loaded);
  app.log.info({ count }, 'PvP ladder rehydrated from durable storage');
}

await app.register(cors, {
  origin: resolveCorsOrigin(),
  credentials: true,
});

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(pvpRoutes);
await app.register(shopRoutes);

app.addHook('onClose', async () => {
  await closeShopStorage();
  await closePvpStorage();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

try {
  await app.listen({ port: resolveServerPort(), host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
