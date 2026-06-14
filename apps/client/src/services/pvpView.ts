import type { MatchFighter, PublicMatchState, RankedPlayer } from './pvpApi';

// Pure, framework-free formatting helpers for the PvP UI. Kept out of the Phaser
// scene so they can be unit-tested without a canvas.

/** Whole seconds remaining until an ISO deadline, clamped at 0. */
export function secondsUntil(deadlineIso: string | null, nowMs: number): number {
  if (!deadlineIso) return 0;
  const deadline = Date.parse(deadlineIso);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.floor((deadline - nowMs) / 1000));
}

/** A compact HP bar like "[####----] 12/24". */
export function hpBar(fighter: MatchFighter, width = 8): string {
  const ratio = fighter.maxHp > 0 ? Math.max(0, Math.min(1, fighter.hp / fighter.maxHp)) : 0;
  const filled = Math.round(ratio * width);
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}] ${fighter.hp}/${fighter.maxHp}`;
}

export function fighterLine(fighter: MatchFighter, viewerId: string): string {
  const who = fighter.id === viewerId ? 'YOU' : fighter.name;
  const guard = fighter.defending ? ' *guard*' : '';
  return `${who.slice(0, 10).padEnd(10)} ${hpBar(fighter)}${guard}`;
}

/** Human-readable outcome line for a completed match, from the viewer's seat. */
export function matchOutcomeText(match: PublicMatchState): string {
  if (match.status !== 'complete') return '';
  let base: string;
  if (match.winnerId === null) base = 'Draw.';
  else if (match.winnerId === match.viewerId) base = 'Victory!';
  else base = 'Defeat.';

  const delta = match.ratingDelta?.[match.viewerId];
  if (typeof delta === 'number') {
    const sign = delta >= 0 ? '+' : '';
    return `${base}  Rating ${sign}${delta}`;
  }
  return base;
}

export function leaderboardLines(players: RankedPlayer[]): string[] {
  return players.map((p, i) => {
    const rank = String(i + 1).padStart(2, ' ');
    const name = p.name.slice(0, 12).padEnd(12);
    const record = `${p.wins}-${p.losses}-${p.draws}`;
    return `${rank}. ${name} ${String(p.rating).padStart(4)}  ${record}`;
  });
}
