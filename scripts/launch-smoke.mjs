#!/usr/bin/env node
// Local launch smoke test for the built prototype.
//
// Expected precondition:
//   pnpm build
//
// This starts the built API in memory mode with cosmetic purchases disabled,
// checks guest-safe endpoints, and confirms the static client build exists. It
// does not require Solana config, Postgres, wallet access, or token transfers.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const serverEntry = path.join(root, 'apps/server/dist/index.js');
const clientIndex = path.join(root, 'apps/client/dist/index.html');
const clientAssets = path.join(root, 'apps/client/dist/assets');
const port = Number(process.env.LAUNCH_SMOKE_PORT ?? 8799);
const baseUrl = `http://127.0.0.1:${port}`;

function requireBuiltArtifact(file, hint) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(root, file)}. Run ${hint} first.`);
  }
}

async function request(pathname, init) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

async function waitForHealth(deadlineMs) {
  let lastError;
  while (Date.now() < deadlineMs) {
    try {
      const { res, body } = await request('/health');
      if (res.ok && body?.ok === true) return body;
      lastError = new Error(`/health returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error('server did not become healthy');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

requireBuiltArtifact(serverEntry, 'pnpm --filter @chronofrost/server build');
requireBuiltArtifact(clientIndex, 'pnpm --filter @chronofrost/client build');
assert(fs.existsSync(clientAssets) && fs.readdirSync(clientAssets).some((name) => name.endsWith('.js')), 'Client dist/assets has no JS assets');

const server = spawn(process.execPath, [serverEntry], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    SERVER_PORT: String(port),
    CORS_ORIGIN: 'http://localhost:5173',
    PVP_STORAGE_ADAPTER: 'memory',
    SHOP_STORAGE_ADAPTER: 'memory',
    SHOP_PURCHASES_ENABLED: 'false',
    SESSION_SECRET: 'launch-smoke-session-secret',
    PVP_ADMIN_TOKEN: 'launch-smoke-admin-token',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logs = '';
server.stdout.on('data', (chunk) => {
  logs += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  logs += chunk.toString();
});

try {
  await waitForHealth(Date.now() + 10_000);

  const items = await request('/shop/items');
  assert(items.res.status === 200, `/shop/items returned ${items.res.status}`);
  assert(Array.isArray(items.body) && items.body.some((item) => item.id === 'founder_palette'), '/shop/items missing founder_palette');

  const quote = await request('/shop/quote', {
    method: 'POST',
    body: JSON.stringify({ wallet: '11111111111111111111111111111111', itemId: 'founder_palette' }),
  });
  assert(quote.res.status === 503, `/shop/quote disabled smoke expected 503, got ${quote.res.status}`);
  assert(quote.body?.error === 'shop purchases disabled', '/shop/quote disabled response changed');

  const status = await request('/admin/shop/status', {
    headers: { 'x-admin-token': 'launch-smoke-admin-token' },
  });
  assert(status.res.status === 200, `/admin/shop/status returned ${status.res.status}`);
  assert(status.body?.purchasesEnabled === false, '/admin/shop/status should report disabled purchases');

  const inventory = await request('/inventory/11111111111111111111111111111111');
  assert(inventory.res.status === 200, `/inventory returned ${inventory.res.status}`);
  assert(Array.isArray(inventory.body), '/inventory response is not an array');

  console.log('launch-smoke passed');
} catch (error) {
  console.error('launch-smoke failed');
  if (logs.trim()) console.error(logs.trim());
  console.error(error);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
