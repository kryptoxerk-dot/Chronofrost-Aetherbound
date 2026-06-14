# Task 002 — Durable Payout Approval Workflow

## Goal

Move payout approval requests from in-memory to Postgres.

## Requirements

- Keep payout planning separate from approval.
- Keep approval separate from execution.
- Persist request status transitions.
- Prevent double execution by unique tx signature / request status.
- Keep admin actor and timestamps.

## Forbidden

- No automatic treasury transfer in this task.
- No player-funded payouts.
- No public payout request creation.
