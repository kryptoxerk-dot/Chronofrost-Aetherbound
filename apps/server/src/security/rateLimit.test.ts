import { describe, expect, it } from 'vitest';
import { createFixedWindowRateLimiter, createRateLimitWarningLogger, rateLimitKey, type RepeatedRateLimitEvent } from './rateLimit.js';

describe('fixed-window rate limiter', () => {
  it('allows requests up to the configured limit and rejects the next request', () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({ name: 'test', limit: 2, windowMs: 1_000, now: () => now });
    const key = rateLimitKey('wallet', 'alice');

    expect(limiter.consume(key).allowed).toBe(true);
    expect(limiter.consume(key).allowed).toBe(true);
    const blocked = limiter.consume(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(1_000);

    now += 1_001;
    expect(limiter.consume(key).allowed).toBe(true);
  });

  it('isolates keys', () => {
    const limiter = createFixedWindowRateLimiter({ name: 'test', limit: 1, windowMs: 1_000, now: () => 1_000 });
    expect(limiter.consume(rateLimitKey('wallet', 'alice')).allowed).toBe(true);
    expect(limiter.consume(rateLimitKey('wallet', 'alice')).allowed).toBe(false);
    expect(limiter.consume(rateLimitKey('wallet', 'bob')).allowed).toBe(true);
  });

  it('emits repeated-limit events with hashed identifiers only', () => {
    const events: RepeatedRateLimitEvent[] = [];
    const limiter = createFixedWindowRateLimiter({
      name: 'test.wallet',
      limit: 1,
      windowMs: 1_000,
      now: () => 1_000,
      repeatedLimitLogThreshold: 2,
      onRepeatedLimit: (event) => events.push(event),
    });
    const key = rateLimitKey('wallet', 'alice-raw-wallet');

    expect(limiter.consume(key).allowed).toBe(true);
    expect(limiter.consume(key).allowed).toBe(false);
    expect(events).toHaveLength(0);
    expect(limiter.consume(key).allowed).toBe(false);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'test.wallet',
      keyScope: 'wallet',
      limit: 1,
      rejectedCount: 2,
    });
    expect(events[0].keyHash).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(events[0])).not.toContain('alice-raw-wallet');
  });

  it('formats repeated-limit warnings for operator logs', () => {
    const lines: string[] = [];
    const log = createRateLimitWarningLogger((message) => lines.push(message));

    log({
      name: 'auth.nonce',
      keyScope: 'ip',
      keyHash: 'abcd1234abcd1234',
      limit: 1,
      rejectedCount: 3,
      retryAfterMs: 500,
      resetAt: '1970-01-01T00:00:02.000Z',
    });

    expect(lines).toEqual([
      'rate-limit repeated rejection name=auth.nonce keyScope=ip keyHash=abcd1234abcd1234 limit=1 rejectedCount=3 retryAfterMs=500 resetAt=1970-01-01T00:00:02.000Z',
    ]);
  });
});
