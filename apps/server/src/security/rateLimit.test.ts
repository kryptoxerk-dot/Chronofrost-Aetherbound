import { describe, expect, it } from 'vitest';
import { createFixedWindowRateLimiter, rateLimitKey } from './rateLimit.js';

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
});
