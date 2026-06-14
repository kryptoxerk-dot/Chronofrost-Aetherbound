import { describe, it, expect } from 'vitest';
import { secondsUntil, hpBar, fighterLine, matchOutcomeText, leaderboardLines } from './pvpView';
import type { MatchFighter, PublicMatchState, RankedPlayer } from './pvpApi';

function fighter(overrides: Partial<MatchFighter> = {}): MatchFighter {
  return { id: 'me', name: 'Me', hp: 12, maxHp: 24, nextTurn: 0, defending: false, ...overrides };
}

describe('pvpView helpers', () => {
  it('secondsUntil clamps and handles nulls', () => {
    const now = 1_000_000;
    expect(secondsUntil(new Date(now + 45_000).toISOString(), now)).toBe(45);
    expect(secondsUntil(new Date(now - 5_000).toISOString(), now)).toBe(0);
    expect(secondsUntil(null, now)).toBe(0);
    expect(secondsUntil('not-a-date', now)).toBe(0);
  });

  it('hpBar renders a proportional bar', () => {
    expect(hpBar(fighter({ hp: 24, maxHp: 24 }))).toBe('[########] 24/24');
    expect(hpBar(fighter({ hp: 0, maxHp: 24 }))).toBe('[--------] 0/24');
    expect(hpBar(fighter({ hp: 12, maxHp: 24 }))).toBe('[####----] 12/24');
  });

  it('fighterLine marks the viewer as YOU and shows guard', () => {
    expect(fighterLine(fighter({ id: 'me', defending: true }), 'me')).toContain('YOU');
    expect(fighterLine(fighter({ id: 'me', defending: true }), 'me')).toContain('*guard*');
    expect(fighterLine(fighter({ id: 'opp', name: 'Rival' }), 'me')).toContain('Rival');
  });

  it('matchOutcomeText reflects the viewer seat and rating delta', () => {
    const base: PublicMatchState = {
      matchId: 'm', status: 'complete', p1: { id: 'me', name: 'Me' }, p2: { id: 'opp', name: 'Op' },
      viewerId: 'me', currentTurnPlayerId: null, yourTurn: false, turnDeadlineAt: null, turns: 3, time: 0,
      fighters: [], winnerId: 'me', ratingDelta: { me: 12, opp: -12 }, recentLog: [],
    };
    expect(matchOutcomeText(base)).toBe('Victory!  Rating +12');
    expect(matchOutcomeText({ ...base, winnerId: 'opp', ratingDelta: { me: -12 } })).toBe('Defeat.  Rating -12');
    expect(matchOutcomeText({ ...base, winnerId: null, ratingDelta: undefined })).toBe('Draw.');
    expect(matchOutcomeText({ ...base, status: 'active' })).toBe('');
  });

  it('leaderboardLines numbers and formats players', () => {
    const players: RankedPlayer[] = [
      { id: 'a', name: 'Alice', rating: 1200, wins: 5, losses: 1, draws: 0, updatedAt: '' },
      { id: 'b', name: 'Bob', rating: 1100, wins: 3, losses: 3, draws: 1, updatedAt: '' },
    ];
    const lines = leaderboardLines(players);
    expect(lines[0]).toContain('1.');
    expect(lines[0]).toContain('Alice');
    expect(lines[0]).toContain('1200');
    expect(lines[0]).toContain('5-1-0');
    expect(lines[1]).toContain('2.');
  });
});
