import { resolveServerPort, assertProductionConfig } from './config/env.js';
import { buildServer } from './app.js';
import { closePvpStorage } from './pvp/pvpStorage.js';

// Fail fast on unsafe production configuration (weak secrets, missing DB).
assertProductionConfig();

const app = await buildServer();

app.addHook('onClose', async () => {
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
