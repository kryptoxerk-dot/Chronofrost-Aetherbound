# Task 001 — Implement Postgres PvP Repositories

## Goal

Make ranked PvP state durable before public prize seasons.

## Files

```text
apps/server/src/pvp/repositories.ts
apps/server/src/pvp/adapters/postgresRepositories.ts
apps/server/src/pvp/adapters/repositoryFactory.ts
resources/pvp_database_schema.sql
```

## Requirements

- Implement all methods in `PvpRepositories`.
- Keep memory adapter for tests/local dev.
- Add transaction-safe writes for matches/actions/rating updates.
- Add unique constraints for match IDs, payout request IDs, and tx signatures.
- Do not change public route behavior in the same patch unless tests prove it.

## Tests

- Insert and retrieve ranked player.
- Insert and retrieve match with action logs.
- List matches for player.
- Save and retrieve latest season snapshot.
- Save payout plan.
