# Verification Report — Task 002: Durable Payout Approval Workflow

Date: 2026-06-15

## Scope

Moved payout approval from a process-only in-memory map to a repository seam with
a durable Postgres adapter backed by `pvp_payout_plans`. Planning, approval, and
execution stay separate. No treasury transfer is performed; this records the
review lifecycle and the execution signature only.

## Files changed

- `apps/server/src/pvp/payoutApproval.ts` — refactored into an async
  `PayoutApprovalRepository` interface + `createMemoryPayoutApprovalRepository()`;
  `payoutApprovals` is now a memory-backed singleton implementing it.
- `apps/server/src/pvp/adapters/postgresPayoutApproval.ts` — new; durable adapter
  over `pvp_payout_plans`. Status transitions are atomic conditional UPDATEs
  (`WHERE status = 'pending_review'`); execution recording is gated on
  `status = 'approved' AND execution_tx_signature IS NULL` and the column's
  UNIQUE constraint blocks signature reuse across requests.
- `apps/server/src/pvp/pvpStorage.ts` — composition root now also provides the
  payout approval repository per adapter (`getPayoutApprovals()`), falling back
  to the in-memory singleton before init.
- `apps/server/src/routes/pvp.ts` — payout admin routes now resolve the repo via
  `getPayoutApprovals()` and `await` it (await inside try/catch so durable-store
  rejections are caught). Request/response contracts unchanged.
- Tests: `payoutApproval.test.ts` updated to async + double-execution case;
  `adapters/postgresPayoutApproval.test.ts` new (6 tests, focused fake DB).

## Tests

- create → approve → record execution (memory + postgres) ✓
- rejected request cannot be approved or executed ✓
- double execution blocked on an approved request ✓
- non-studio-funded plan rejected at create ✓
- cancel + list-by-season newest-first ✓
- unknown request returns null ✓

## Commands run

```text
node scripts/agent-preflight.mjs     -> agent-preflight passed
node scripts/architecture-guard.mjs  -> architecture-guard passed
pnpm -r typecheck                     -> Done
pnpm -r test                          -> 10 server files / 56 tests + client 9 = 65 passed
pnpm -r build                         -> built (shared + server + client)
```

## Invariants preserved

- Planning ≠ approval ≠ execution. `attachExecutionSignature` only records a
  signature; it never signs or sends a transfer.
- Only `fundedBy: 'studio-treasury'` plans can be submitted (enforced in both
  adapters; architecture guard blocks `fundedBy: 'player...'`).
- No public payout-request creation; all routes remain admin-gated.
- Double execution prevented at the app layer and by the DB UNIQUE constraint.

## Follow-ups

- Treasury executor (Lane A4): a separate, admin-gated, signed transfer step that
  consumes approved requests — only after manual review. Not in this task.
- Next task: `.codex/tasks/003-client-pvp-ui.md`.
