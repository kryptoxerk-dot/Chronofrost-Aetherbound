# Task 004 — Wire Postgres PvP Repositories Into the Running Server

## Goal

Make the durable Postgres adapter (Task 001) the actual storage backend when
`PVP_STORAGE_ADAPTER=postgres`, without a big-bang rewrite of PvP routes.

## Files

```text
apps/server/package.json            (add pg dependency)
apps/server/src/config/env.ts       (DATABASE_URL)
apps/server/src/pvp/adapters/repositoryFactory.ts
apps/server/src/index.ts            (construct Pool, inject)
resources/pvp_database_schema.sql   (migration source)
scripts/                            (migration runner, optional)
```

## Requirements

- Add `pg` (node-postgres) as a server dependency; create a `Pool` from `DATABASE_URL`.
- When `PVP_STORAGE_ADAPTER=postgres`, build repositories via
  `createPvpRepositories('postgres', pool)`; keep `memory` as the default.
- Provide a migration path: a runner script or a documented
  `psql "$DATABASE_URL" -f resources/pvp_database_schema.sql`.
- Route PvP services through the repository bundle incrementally. Do not rewrite
  all routes at once; prove each move with tests.
- Keep memory adapter behavior identical for local dev/tests.

## Acceptance

```text
ratings survive server restart
matches + action logs survive server restart
season snapshots survive server restart
memory mode still passes the full existing test suite
pnpm verify:agent passes
```

## Forbidden

- No automatic treasury transfer.
- No change to public route request/response contracts in the same patch unless
  tests prove equivalence.
