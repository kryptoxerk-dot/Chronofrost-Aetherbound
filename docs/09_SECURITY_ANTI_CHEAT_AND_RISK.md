# 09 — Security, Anti-Cheat, and Risk

## Core security rule

The client is untrusted. The browser can be modified. Any reward with economic value must be validated by the backend or an on-chain program.

## Prototype risk level

The starter code uses local state for quick gameplay. This is acceptable only because:

```text
no real token rewards
no mainnet value
no NFT mints
no competitive economy
```

## Purchase security checklist

Server must reject:

```text
expired order
unknown order
already confirmed order
already used tx signature
wrong token mint
wrong amount
wrong destination token account
missing memo/orderId
wrong buyer when verifiable
tx not confirmed/finalized
malformed tx
```

## Idempotency rules

```text
One orderId can grant at most one item.
One txSignature can be used at most once.
Confirmed orders cannot be modified.
Expired orders require a new quote.
Inventory grants must be transactional in production DB.
```

## Anti-cheat roadmap

### Level 0 — Prototype

```text
Client-only gameplay
No valuable rewards
Good for playability only
```

### Level 1 — Server-validated action logs

```text
Server creates dungeonRunId and seed.
Client submits action log.
Server replays combat deterministically.
Server grants off-chain reward if valid.
```

### Level 2 — Server-authoritative combat

```text
Server owns combat state.
Client sends actions only.
Server returns results.
Required before token rewards, PvP, co-op, or leaderboards with prizes.
```

### Level 3 — On-chain receipts

```text
For mainnet purchases, Anchor program records payment receipt.
Backend indexes chain events.
Inventory mirrors chain state.
```

## Treasury controls

For mainnet:

```text
Use separate hot wallet with limited funds.
Use multisig for treasury/admin funds.
Use withdrawal limits.
Use alerting on abnormal transfers.
Use kill switch for shop/rewards.
Never store full treasury private key on app server.
```

## Operational risks

| Risk | Mitigation |
|---|---|
| Token speculation overwhelms game | Game-first messaging, no ROI language, demo link pinned. |
| Bot farming | No token rewards early, action-log validation later. |
| Wallet phishing/fake mint | Pin official mint, domain binding, clear warning copy. |
| Failed tx UX | quote expiry, retry path, helpful error states. |
| Regulatory issue | utility-only framing, no revenue share/yield, legal review. |
| Scope creep | keep MVP single-player and browser-first. |

## Incident response

```text
Pause shop
Disable new quotes
Keep gameplay available without wallet
Publish issue notice
Analyze ledger/orders
Patch verifier
Reconcile inventory
Resume only after test replay
```
