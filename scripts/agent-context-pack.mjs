import fs from 'node:fs';
import path from 'node:path';

const files = [
  'AGENTS.md',
  'README.md',
  'docs/00_MASTER_BUILD_BRIEF.md',
  'docs/16_PVP_RANKED_DESIGN.md',
  'docs/18_PVP_ELIGIBILITY_AND_ANTI_SYBIL.md',
  'docs/19_AGENT_WORKFLOW_AND_CODE_OWNERSHIP.md',
  'docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md',
  'docs/21_PAYOUT_APPROVAL_AND_RATE_LIMITING.md',
  'docs/api/openapi.yaml',
  'resources/environment_variables.md',
  'resources/pvp_database_schema.sql',
  'apps/server/src/pvp/repositories.ts',
  'apps/server/src/pvp/matchmaking.ts',
  'apps/server/src/pvp/eligibility.ts',
  'apps/server/src/pvp/season.ts',
  'apps/server/src/pvp/payoutApproval.ts',
  'apps/server/src/pvp/treasuryPayoutPreflight.ts',
  'apps/server/src/security/rateLimit.ts',
];

let output = `# Chronofrost Agent Context Bundle\n\nGenerated at ${new Date().toISOString()}\n\n`;
for (const file of files) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) continue;
  output += `\n\n---\n\n## ${file}\n\n`;
  output += '```' + (file.endsWith('.ts') ? 'ts' : file.endsWith('.yaml') ? 'yaml' : file.endsWith('.sql') ? 'sql' : 'md') + '\n';
  output += fs.readFileSync(full, 'utf8').trimEnd();
  output += '\n```\n';
}

fs.writeFileSync('AGENT_CONTEXT_BUNDLE.md', output);
console.log('wrote AGENT_CONTEXT_BUNDLE.md');
