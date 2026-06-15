# Mainnet Prototype Launch Audit

Date: 2026-06-15

This is the current requirement-by-requirement audit for the accepted plan:
mainnet prototype launch, game-first, cosmetics-only, PvP post-launch/no-prize
unless explicitly enabled as beta.

## Repo-owned requirements

| Requirement | Status | Evidence |
|---|---|---|
| Free browser RPG prototype is playable without wallet | Complete | `BootScene`, `TownScene`, `DungeonScene`, `BattleScene`, local game state tests, launch smoke/client build |
| First-run notice states wallet optional, cosmetics only, no staking/betting/rewards | Complete | `apps/client/src/services/launchNotice.ts`, `launchNotice.test.ts`, `VERIFICATION_REPORT_LAUNCH_NOTICE.md` |
| Compact launch dungeon has 3 enemy archetypes + 1 boss | Complete | `FROSTGLASS_CAVERN_NODES`, `dungeonPlan.test.ts`, `VERIFICATION_REPORT_CORE_GAME_CONTENT.md` |
| Guest progression persists locally | Complete | `gameState.ts`, `gameState.test.ts`, HUD/quest/vitals updates |
| Mainnet cosmetic commerce is fixed-price cosmetics only | Complete in repo | `SHOP_ITEMS`, shop UI copy, launch notice, architecture guard, shop route contract |
| Backend never moves player tokens | Complete in repo | Client builds player-signed transfer; server only verifies tx signatures in `verifyPurchaseTransaction.ts` |
| Durable cosmetic orders and inventory grants | Complete | `shop_orders`, `shop_inventory_grants`, shop repositories, `VERIFICATION_REPORT_MAINNET_PROTOTYPE_SHOP.md` |
| Shop rollback keeps guest/catalog/inventory online | Complete | `/admin/shop/status`, `SHOP_PURCHASES_ENABLED`, launch smoke, route tests |
| Mainnet readiness gates reject unsafe env | Complete | `scripts/launch-readiness.mjs`, `VERIFICATION_REPORT_LAUNCH_READINESS.md` |
| PvP hidden for mainnet prototype by default | Complete | `VITE_PVP_ENABLED=false`, `TownScene`, readiness PvP beta gate, `VERIFICATION_REPORT_PVP_LAUNCH_GATING.md` |
| No staking, betting, player-funded rewards, or prize-claim route | Complete in repo | `scripts/architecture-guard.mjs`, route/code searches, verification reports |
| Deployment scaffolding | Complete in repo | `render.yaml`, server Dockerfile, `docs/14_DEPLOYMENT_RUNBOOK.md`, `launch-smoke.mjs` |
| Automated verification | Complete in repo | Server tests 70, client tests 35, typechecks/builds, smoke/readiness reports |

## External go-live gates

These cannot be proven from this local workspace and must be completed by the
operator before declaring the real mainnet launch complete:

| Gate | Required evidence |
|---|---|
| Public deployment applied | Live client URL, live API URL, `/health` response, CORS smoke |
| Official `$AETHER` mint and treasury pinned | Production env values, public mint disclosure, treasury ATA exists |
| Mainnet tiny cosmetic dry run | Real wallet-signed purchase tx, server confirm response, durable order/inventory row |
| Legal/compliance review | Written approval for target jurisdictions and launch copy |
| 5-tester playtest | Notes showing 5 opened, 5 reached first battle, 3 cleared dungeon, 0 forced to connect wallet |
| Public status/rollback process | Operator access to `SHOP_PURCHASES_ENABLED=false` or `/admin/shop/status` |

## Audit result

The repository is a launch candidate for the accepted mainnet prototype scope.
The thread goal should not be marked complete until the external go-live gates
above are evidenced, because the original plan includes actual mainnet launch
readiness, a tiny purchase dry run, and the playtest gate.

