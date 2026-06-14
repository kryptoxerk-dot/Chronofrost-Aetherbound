import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs|sql|md|yaml)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk('apps/server/src');
const violations = [];

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file);
  const checks = [
    [/app\.post\(['"]\/pvp\/match['"]/, 'unsafe one-shot PvP endpoint must not exist'],
    [/prizePoolRaw\s*[:=]\s*.*request\.body/s, 'public request body must not set prizePoolRaw'],
    [/fundedBy\s*[:=]\s*['"]player/i, 'server code must not introduce player-funded payout plans'],
    [/\b(stakeAmount|wagerAmount|playerPotRaw)\b/i, 'server code must not introduce staking/wagering amount fields'],
  ];
  for (const [regex, message] of checks) {
    if (regex.test(text)) violations.push(`${rel}: ${message}`);
  }
}

if (violations.length) {
  console.error('Architecture guard failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('architecture-guard passed');
