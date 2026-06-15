import type { MatchRecord, RankedPlayer } from './ladder.js';

/**
 * Durable write-through for completed ranked matches.
 *
 * The in-memory ladder is the authoritative live store; this mirrors completed
 * matches + post-match player state into the configured repository so ranked
 * data survives a restart in postgres mode. It is fire-and-forget: gameplay must
 * never break if the database hiccups, so failures go to the error handler
 * rather than throwing into the request path.
 */
export interface CompletedMatchSink {
  upsertRankedPlayer(player: RankedPlayer): Promise<unknown>;
  insertMatch(record: MatchRecord): Promise<unknown>;
}

let sink: CompletedMatchSink | null = null;
let onError: (err: unknown) => void = () => {};

export function registerMatchPersistence(next: CompletedMatchSink | null, errorHandler?: (err: unknown) => void): void {
  sink = next;
  if (errorHandler) onError = errorHandler;
}

export function persistCompletedMatch(record: MatchRecord, players: RankedPlayer[]): void {
  const active = sink;
  if (!active) return;
  void (async () => {
    try {
      // Players first so the match's FK references resolve and rating events read
      // the authoritative post-match rating.
      for (const player of players) await active.upsertRankedPlayer(player);
      await active.insertMatch(record);
    } catch (err) {
      onError(err);
    }
  })();
}
