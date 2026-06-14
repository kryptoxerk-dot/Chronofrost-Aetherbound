import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'AGENTS.md',
  'docs/19_AGENT_WORKFLOW_AND_CODE_OWNERSHIP.md',
  'docs/20_NEXT_PHASE_IMPLEMENTATION_BACKLOG.md',
  'docs/api/openapi.yaml',
  'apps/server/src/pvp/matchmaking.ts',
  'apps/server/src/pvp/eligibility.ts',
  'apps/server/src/pvp/payoutApproval.ts',
  'apps/server/src/security/rateLimit.ts',
  'resources/pvp_database_schema.sql',
  'prompts/CODEX_PHASE_5_PROMPT.md',
  'prompts/CLAUDE_PHASE_5_PROMPT.md',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));
if (missing.length) {
  console.error('Agent preflight failed. Missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['verify', 'architecture:guard', 'agent:context']) {
  if (!rootPackage.scripts?.[script]) {
    console.error(`Agent preflight failed. Missing package script: ${script}`);
    process.exit(1);
  }
}

console.log('agent-preflight passed');
