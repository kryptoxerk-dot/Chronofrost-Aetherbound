#!/usr/bin/env node
// Validate environment/config gates before a public prototype deploy.
//
// Usage:
//   LAUNCH_TARGET=devnet node scripts/launch-readiness.mjs
//   LAUNCH_TARGET=mainnet node scripts/launch-readiness.mjs
//
// This is a static readiness check. It never signs transactions, never touches
// player wallets, and never sends tokens.

import process from 'node:process';

const target = (process.env.LAUNCH_TARGET ?? 'devnet').trim().toLowerCase();
const isMainnet = target === 'mainnet' || target === 'mainnet-beta';
const errors = [];
const warnings = [];

function value(name) {
  return process.env[name]?.trim() ?? '';
}

function isPlaceholder(raw) {
  const v = raw.trim().toLowerCase();
  return !v || v.includes('<') || v.includes('>') || v.includes('change-me') || v.includes('replace-with') || v.includes('dev-only');
}

function requireValue(name, why) {
  if (isPlaceholder(value(name))) errors.push(`${name} is required: ${why}`);
}

function requireEquals(name, expected, why) {
  if (value(name) !== expected) errors.push(`${name} must be ${expected}: ${why}`);
}

function requireOneOf(name, allowed, why) {
  if (!allowed.includes(value(name))) errors.push(`${name} must be one of ${allowed.join(', ')}: ${why}`);
}

function requireUrl(name, why) {
  try {
    const url = new URL(value(name));
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
  } catch {
    errors.push(`${name} must be an http(s) URL: ${why}`);
  }
}

function requireIntegerString(name, why) {
  if (!/^\d+$/.test(value(name))) errors.push(`${name} must be a non-negative integer string: ${why}`);
}

requireOneOf('SOLANA_CLUSTER', ['devnet', 'testnet', 'mainnet-beta'], 'server and wallet copy must agree on the target cluster');
if (value('VITE_SOLANA_CLUSTER')) {
  requireEquals('VITE_SOLANA_CLUSTER', value('SOLANA_CLUSTER'), 'client and server must target the same Solana cluster');
}

requireUrl('SOLANA_RPC_URL', 'server purchase verifier needs a reliable RPC');
if (value('VITE_SOLANA_RPC_URL')) requireUrl('VITE_SOLANA_RPC_URL', 'client purchase builder needs a reliable RPC');

requireValue('SESSION_SECRET', 'SIWS/session tokens must not use development defaults');
requireValue('PVP_ADMIN_TOKEN', 'admin routes need a non-placeholder token');
requireOneOf('SHOP_STORAGE_ADAPTER', ['memory', 'postgres'], 'shop storage adapter must be explicit');
requireOneOf('PVP_STORAGE_ADAPTER', ['memory', 'postgres'], 'PvP storage adapter must be explicit');
requireOneOf('SHOP_PURCHASES_ENABLED', ['true', 'false'], 'operator must intentionally enable or disable purchases');
requireIntegerString('PVP_PRIZE_POOL_RAW', 'mainnet prototype launch must make prize-pool intent explicit');

if (value('SHOP_PURCHASES_ENABLED') === 'true') {
  requireValue('AETHER_MINT', 'enabled cosmetic purchases need an official mint');
  requireValue('TREASURY_WALLET', 'enabled cosmetic purchases need a treasury wallet');
  requireValue('TREASURY_TOKEN_ACCOUNT', 'enabled cosmetic purchases need a treasury token account');
  if (value('VITE_AETHER_MINT')) requireEquals('VITE_AETHER_MINT', value('AETHER_MINT'), 'client and server mint must match');
  if (value('VITE_TREASURY_TOKEN_ACCOUNT')) {
    requireEquals('VITE_TREASURY_TOKEN_ACCOUNT', value('TREASURY_TOKEN_ACCOUNT'), 'client and server treasury ATA must match');
  }
}

if (isMainnet) {
  requireEquals('SOLANA_CLUSTER', 'mainnet-beta', 'mainnet launch must not point at devnet/testnet');
  requireEquals('VITE_SOLANA_CLUSTER', 'mainnet-beta', 'client wallet copy must not say devnet on mainnet');
  requireEquals('SHOP_STORAGE_ADAPTER', 'postgres', 'mainnet cosmetic orders/inventory must be durable');
  requireValue('DATABASE_URL', 'mainnet launch requires durable Postgres');
  requireValue('AETHER_MINT', 'mainnet launch requires the official $AETHER mint');
  requireValue('TREASURY_WALLET', 'mainnet launch requires a treasury wallet');
  requireValue('TREASURY_TOKEN_ACCOUNT', 'mainnet launch requires the treasury associated token account');
  if (value('PVP_PRIZE_POOL_RAW') !== '0') {
    errors.push('PVP_PRIZE_POOL_RAW must be 0 for mainnet prototype launch; PvP prizes are post-launch gated');
  }
  if (value('PVP_STORAGE_ADAPTER') === 'postgres') {
    warnings.push('PVP_STORAGE_ADAPTER=postgres is allowed only for no-prize PvP beta; hide PvP if not intentionally launching it');
  }
}

if (!isMainnet && value('SHOP_STORAGE_ADAPTER') === 'memory') {
  warnings.push('SHOP_STORAGE_ADAPTER=memory is acceptable for local/devnet smoke only; use postgres before public mainnet purchases');
}

if (errors.length > 0) {
  console.error(`launch-readiness failed for ${target}`);
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length) {
    console.error('Warnings:');
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`launch-readiness passed for ${target}`);
for (const warning of warnings) console.warn(`warning: ${warning}`);
