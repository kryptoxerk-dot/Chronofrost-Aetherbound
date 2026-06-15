#!/usr/bin/env node
// Validate operator-collected evidence before declaring the mainnet prototype live.
//
// Usage:
//   node scripts/go-live-evidence-check.mjs resources/go_live_evidence.example.json --allow-placeholders
//   node scripts/go-live-evidence-check.mjs path/to/go_live_evidence.json
//
// This script does not contact Solana, production services, or wallets. It only
// checks that the human/operator evidence file is complete enough for review.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const allowPlaceholders = args.includes('--allow-placeholders');
const fileArg = args.find((arg) => !arg.startsWith('--'));
const evidencePath = fileArg ? path.resolve(process.cwd(), fileArg) : path.resolve(process.cwd(), 'GO_LIVE_EVIDENCE.json');
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  if (!fs.existsSync(file)) {
    fail(`Evidence file not found: ${path.relative(process.cwd(), file) || file}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Evidence file is not valid JSON: ${error.message}`);
    return null;
  }
}

function at(root, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => (value == null ? undefined : value[key]), root);
}

function isPlaceholder(value) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.includes('todo') ||
    trimmed.includes('replace') ||
    trimmed.includes('example.com') ||
    trimmed.includes('placeholder')
  );
}

function requireString(root, dottedPath) {
  const value = at(root, dottedPath);
  if (typeof value !== 'string') {
    fail(`${dottedPath} must be a string`);
    return '';
  }
  if (!allowPlaceholders && isPlaceholder(value)) fail(`${dottedPath} must be filled with production evidence`);
  return value.trim();
}

function requireBoolean(root, dottedPath, expected = true) {
  const value = at(root, dottedPath);
  if (value !== expected) fail(`${dottedPath} must be ${expected}`);
}

function requireNumberAtLeast(root, dottedPath, minimum) {
  const value = at(root, dottedPath);
  if (!Number.isFinite(value) || value < minimum) fail(`${dottedPath} must be a number >= ${minimum}`);
}

function requireNumberEquals(root, dottedPath, expected) {
  const value = at(root, dottedPath);
  if (!Number.isFinite(value) || value !== expected) fail(`${dottedPath} must equal ${expected}`);
}

function requireUrl(root, dottedPath) {
  const value = requireString(root, dottedPath);
  if (allowPlaceholders && isPlaceholder(value)) return;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
  } catch {
    fail(`${dottedPath} must be an http(s) URL`);
  }
}

function requireIsoDate(root, dottedPath) {
  const value = requireString(root, dottedPath);
  if (allowPlaceholders && isPlaceholder(value)) return;
  if (Number.isNaN(Date.parse(value))) fail(`${dottedPath} must be an ISO-style date or timestamp`);
}

function requireCluster(root, dottedPath, expected) {
  const value = requireString(root, dottedPath);
  if (value !== expected) fail(`${dottedPath} must be ${expected}`);
}

function requireSolanaPublicKeyLike(root, dottedPath) {
  const value = requireString(root, dottedPath);
  if (allowPlaceholders && isPlaceholder(value)) return;
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) fail(`${dottedPath} must look like a Solana public key`);
}

function requireSignatureLike(root, dottedPath) {
  const value = requireString(root, dottedPath);
  if (allowPlaceholders && isPlaceholder(value)) return;
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(value)) fail(`${dottedPath} must look like a Solana transaction signature`);
}

const evidence = readJson(evidencePath);

if (evidence) {
  requireString(evidence, 'launchName');
  requireIsoDate(evidence, 'evidenceCollectedAt');
  requireString(evidence, 'operator.name');
  requireString(evidence, 'operator.contact');

  requireUrl(evidence, 'deployment.clientUrl');
  requireUrl(evidence, 'deployment.apiUrl');
  requireBoolean(evidence, 'deployment.healthOk');
  requireBoolean(evidence, 'deployment.corsSmokeOk');
  requireIsoDate(evidence, 'deployment.deployedAt');

  requireCluster(evidence, 'aether.cluster', 'mainnet-beta');
  requireSolanaPublicKeyLike(evidence, 'aether.mint');
  requireSolanaPublicKeyLike(evidence, 'aether.treasuryWallet');
  requireSolanaPublicKeyLike(evidence, 'aether.treasuryTokenAccount');
  requireBoolean(evidence, 'aether.treasuryAtaVerified');
  requireUrl(evidence, 'aether.publicMintDisclosureUrl');

  requireBoolean(evidence, 'purchaseDryRun.confirmed');
  requireString(evidence, 'purchaseDryRun.itemId');
  requireSolanaPublicKeyLike(evidence, 'purchaseDryRun.buyerWallet');
  requireSignatureLike(evidence, 'purchaseDryRun.txSignature');
  requireString(evidence, 'purchaseDryRun.orderId');
  requireString(evidence, 'purchaseDryRun.durableOrderId');
  requireString(evidence, 'purchaseDryRun.inventoryGrantId');
  requireString(evidence, 'purchaseDryRun.amountRaw');
  requireIsoDate(evidence, 'purchaseDryRun.confirmedAt');

  requireBoolean(evidence, 'legal.approved');
  requireString(evidence, 'legal.approver');
  requireIsoDate(evidence, 'legal.approvalDate');
  requireString(evidence, 'legal.scope');
  requireString(evidence, 'legal.reference');

  requireIsoDate(evidence, 'playtest.completedAt');
  requireNumberAtLeast(evidence, 'playtest.testersOpened', 5);
  requireNumberAtLeast(evidence, 'playtest.reachedFirstBattle', 5);
  requireNumberAtLeast(evidence, 'playtest.clearedDungeon', 3);
  requireNumberEquals(evidence, 'playtest.forcedWalletCount', 0);
  requireUrl(evidence, 'playtest.notesUrl');

  requireBoolean(evidence, 'rollback.purchasesDisabledTested');
  requireBoolean(evidence, 'rollback.guestGameStayedOnline');
  requireString(evidence, 'rollback.method');
  requireString(evidence, 'rollback.operator');
  requireIsoDate(evidence, 'rollback.verifiedAt');

  if (allowPlaceholders) warn('placeholder values were allowed; do not use this mode for a real launch sign-off');
}

if (errors.length > 0) {
  console.error('go-live evidence check failed');
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length > 0) {
    console.error('Warnings:');
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`go-live evidence check passed for ${path.relative(process.cwd(), evidencePath) || evidencePath}`);
for (const warning of warnings) console.warn(`warning: ${warning}`);
