import crypto from 'node:crypto';

export type FixedWindowRateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
  now?: () => number;
  repeatedLimitLogThreshold?: number;
  onRepeatedLimit?: (event: RepeatedRateLimitEvent) => void;
};

export type RateLimitResult = {
  allowed: boolean;
  name: string;
  key: string;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterMs: number;
};

export type RepeatedRateLimitEvent = {
  name: string;
  keyScope: string;
  keyHash: string;
  limit: number;
  rejectedCount: number;
  retryAfterMs: number;
  resetAt: string;
};

type Bucket = {
  count: number;
  rejectedCount: number;
  resetAtMs: number;
};

export type FixedWindowRateLimiter = ReturnType<typeof createFixedWindowRateLimiter>;

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
}

export function createFixedWindowRateLimiter(options: FixedWindowRateLimitOptions) {
  assertPositiveInteger('limit', options.limit);
  assertPositiveInteger('windowMs', options.windowMs);
  const repeatedLimitLogThreshold = options.repeatedLimitLogThreshold ?? 3;
  if (!Number.isInteger(repeatedLimitLogThreshold) || repeatedLimitLogThreshold < 0) {
    throw new Error('repeatedLimitLogThreshold must be a non-negative integer');
  }

  const buckets = new Map<string, Bucket>();
  const now = options.now ?? (() => Date.now());

  function consume(key: string, cost = 1): RateLimitResult {
    assertPositiveInteger('cost', cost);
    const safeKey = key.trim() || 'anonymous';
    const nowMs = now();
    const existing = buckets.get(safeKey);
    const bucket = !existing || existing.resetAtMs <= nowMs
      ? { count: 0, rejectedCount: 0, resetAtMs: nowMs + options.windowMs }
      : existing;

    const nextCount = bucket.count + cost;
    const allowed = nextCount <= options.limit;
    if (allowed) {
      bucket.count = nextCount;
      buckets.set(safeKey, bucket);
    } else {
      // Keep the bucket so repeated rejected requests share the same reset time.
      bucket.rejectedCount += 1;
      buckets.set(safeKey, bucket);
    }

    const result = {
      allowed,
      name: options.name,
      key: safeKey,
      limit: options.limit,
      remaining: Math.max(0, options.limit - bucket.count),
      resetAt: new Date(bucket.resetAtMs).toISOString(),
      retryAfterMs: Math.max(0, bucket.resetAtMs - nowMs),
    };

    if (
      !allowed &&
      options.onRepeatedLimit &&
      repeatedLimitLogThreshold > 0 &&
      bucket.rejectedCount >= repeatedLimitLogThreshold &&
      bucket.rejectedCount % repeatedLimitLogThreshold === 0
    ) {
      options.onRepeatedLimit(toRepeatedRateLimitEvent(result, bucket.rejectedCount));
    }

    return result;
  }

  function reset(key?: string): void {
    if (key) buckets.delete(key);
    else buckets.clear();
  }

  function snapshot(): Array<{ key: string; count: number; rejectedCount: number; resetAt: string }> {
    return [...buckets.entries()].map(([key, bucket]) => ({
      key,
      count: bucket.count,
      rejectedCount: bucket.rejectedCount,
      resetAt: new Date(bucket.resetAtMs).toISOString(),
    }));
  }

  return { consume, reset, snapshot };
}

export function rateLimitKey(scope: string, id: string): string {
  return `${scope}:${id.trim() || 'anonymous'}`;
}

function toRepeatedRateLimitEvent(result: RateLimitResult, rejectedCount: number): RepeatedRateLimitEvent {
  const [keyScope = 'unknown'] = result.key.split(':', 1);
  return {
    name: result.name,
    keyScope,
    keyHash: crypto.createHash('sha256').update(result.key).digest('hex').slice(0, 16),
    limit: result.limit,
    rejectedCount,
    retryAfterMs: result.retryAfterMs,
    resetAt: result.resetAt,
  };
}

export function createRateLimitWarningLogger(
  warn: (message: string) => void = (message) => console.warn(message),
): (event: RepeatedRateLimitEvent) => void {
  return (event) => {
    warn(
      [
        'rate-limit repeated rejection',
        `name=${event.name}`,
        `keyScope=${event.keyScope}`,
        `keyHash=${event.keyHash}`,
        `limit=${event.limit}`,
        `rejectedCount=${event.rejectedCount}`,
        `retryAfterMs=${event.retryAfterMs}`,
        `resetAt=${event.resetAt}`,
      ].join(' '),
    );
  };
}
