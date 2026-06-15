import { describe, expect, it } from 'vitest';
import { pvpUnavailableMessage, townDestinationLabels } from './launchNavigation';

describe('launch navigation flags', () => {
  it('hides PvP from the mainnet prototype by default', () => {
    expect(townDestinationLabels({ pvpEnabled: false })).toEqual(['DUNGEON', 'SHOP']);
  });

  it('can expose Arena for the later no-prize PvP beta', () => {
    expect(townDestinationLabels({ pvpEnabled: true })).toEqual(['DUNGEON', 'SHOP', 'ARENA']);
    expect(pvpUnavailableMessage()).toContain('no-prize beta');
  });
});
