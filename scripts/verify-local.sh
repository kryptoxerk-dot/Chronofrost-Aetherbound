#!/usr/bin/env bash
set -euo pipefail

corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --frozen-lockfile
pnpm verify:agent
