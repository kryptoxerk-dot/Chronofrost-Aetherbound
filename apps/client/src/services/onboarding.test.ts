import { describe, it, expect } from 'vitest';
import { HOW_TO_PLAY_LINES, HOW_TO_PLAY_TITLE, shouldShowHowToPlay } from './onboarding';

describe('onboarding', () => {
  it('has a title and non-empty guidance lines', () => {
    expect(HOW_TO_PLAY_TITLE.length).toBeGreaterThan(0);
    expect(HOW_TO_PLAY_LINES.length).toBeGreaterThan(0);
    for (const line of HOW_TO_PLAY_LINES) expect(line.trim().length).toBeGreaterThan(0);
  });

  it('shows once, only after the launch notice is acknowledged', () => {
    expect(shouldShowHowToPlay({ seenHowToPlay: false, launchNoticeAccepted: true })).toBe(true);
    // Not before the launch notice is cleared.
    expect(shouldShowHowToPlay({ seenHowToPlay: false, launchNoticeAccepted: false })).toBe(false);
    // Not again once seen.
    expect(shouldShowHowToPlay({ seenHowToPlay: true, launchNoticeAccepted: true })).toBe(false);
  });
});
