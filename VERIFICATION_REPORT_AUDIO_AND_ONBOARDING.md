# Verification Report — Audio, Mute, and First-Run Onboarding

Date: 2026-06-15

## Scope

Lane B "onboarding clarity and audio pass". Adds asset-free procedural sound
effects, a global mute toggle persisted across sessions, and a one-time
How-to-Play overlay. No new assets ship; cues are synthesized with Web Audio and
degrade to a no-op when muted or unavailable.

## Files changed

- `apps/client/src/audio/sfx.ts` — new. Procedural SFX: pure `SFX_SPECS` tone
  table, pure `shouldPlaySfx()`, and a guarded `playSfx()` that lazily creates a
  shared AudioContext and synthesizes a short enveloped blip. No-op in Node /
  when muted.
- `apps/client/src/services/onboarding.ts` — new. Pure How-to-Play content +
  `shouldShowHowToPlay()` gate (once, after the launch notice).
- `apps/client/src/systems/gameState.ts` — added persisted `muted` +
  `seenHowToPlay`; `isMuted()` / `toggleMuted()` helpers.
- `apps/client/src/scenes/HudScene.ts` — owns the global `[M]` mute toggle and a
  sound-state indicator (works from any scene via the always-on overlay).
- `apps/client/src/scenes/TownScene.ts` — first-run How-to-Play overlay; gates
  movement/interaction while shown; marks `seenHowToPlay` on dismiss.
- `apps/client/src/scenes/BattleScene.ts` — cues for attack/freeze/defend, the
  enemy hit, and victory/defeat.
- `apps/client/src/scenes/ShopScene.ts` — selection blip + purchase cue.
- Tests: `audio/sfx.test.ts` (3), `services/onboarding.test.ts` (2), gameState
  mute test; fixtures in `launchNotice.test.ts` / `shopView.test.ts` updated for
  the new fields.

## Verification

```text
pnpm --filter @chronofrost/client typecheck -> Done
pnpm --filter @chronofrost/client test       -> 12 files / 41 tests passed (+6)
node scripts/agent-preflight.mjs             -> passed
node scripts/architecture-guard.mjs          -> passed
pnpm --filter @chronofrost/client build      -> built
```

Bundle impact: entry grew ~6 KB (1,509 -> 1,515 KB) — the audio is procedural,
so no audio assets are added and the Solana lazy-split is unaffected.

## Notes

- Mute and "seen guide" persist in the existing localStorage save (alongside the
  launch-notice flag); they degrade gracefully where storage is unavailable.
- `playSfx` is safe to call unconditionally — it self-gates on mute + Web Audio
  availability, so scenes don't branch on audio state.
