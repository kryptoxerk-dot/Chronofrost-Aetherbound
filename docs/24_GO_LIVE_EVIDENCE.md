# 24 - Go-Live Evidence

This is the operator-facing proof checklist for declaring the Chronofrost
mainnet prototype launch complete. It covers only the external gates that cannot
be proven from the local repository.

## Required file

Copy `resources/go_live_evidence.example.json` to a private operator-controlled
file, fill every placeholder with production evidence, then run:

```bash
node scripts/go-live-evidence-check.mjs path/to/go_live_evidence.json
```

For a schema-only check of the committed example:

```bash
node scripts/go-live-evidence-check.mjs resources/go_live_evidence.example.json --allow-placeholders
```

Do not commit the filled production evidence file if it contains private URLs,
operator contacts, legal references, or wallet dry-run details that should stay
internal.

## Evidence gates

| Gate | Evidence fields |
|---|---|
| Public deployment applied | `deployment.clientUrl`, `deployment.apiUrl`, `deployment.healthOk`, `deployment.corsSmokeOk`, `deployment.deployedAt` |
| Official `$AETHER` mint and treasury pinned | `aether.cluster`, `aether.mint`, `aether.treasuryWallet`, `aether.treasuryTokenAccount`, `aether.treasuryAtaVerified`, `aether.publicMintDisclosureUrl` |
| Mainnet tiny cosmetic dry run | `purchaseDryRun.confirmed`, `purchaseDryRun.txSignature`, `purchaseDryRun.orderId`, `purchaseDryRun.durableOrderId`, `purchaseDryRun.inventoryGrantId` |
| Legal/compliance review | `legal.approved`, `legal.approver`, `legal.approvalDate`, `legal.scope`, `legal.reference` |
| 5-tester playtest | `playtest.testersOpened >= 5`, `playtest.reachedFirstBattle >= 5`, `playtest.clearedDungeon >= 3`, `playtest.forcedWalletCount = 0`, `playtest.notesUrl` |
| Public status/rollback process | `rollback.purchasesDisabledTested`, `rollback.guestGameStayedOnline`, `rollback.method`, `rollback.operator`, `rollback.verifiedAt` |

## Launch sign-off rule

The repository can be a launch candidate without this evidence. The real
mainnet prototype launch is not complete until the validator passes against a
filled production evidence file and the audit in
`docs/23_MAINNET_PROTOTYPE_LAUNCH_AUDIT.md` has no open external gates.
