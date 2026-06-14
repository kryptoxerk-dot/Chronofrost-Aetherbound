export type FixedWindowRateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
  now?: () => number;
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

type Bucket = {
  count: number;
  resetAtMs: number;
};

export type FixedWindowRateLimiter = ReturnType<typeof createFixedWindowRateLimiter>;

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
}

export function createFixedWindowRateLimiter(options: FixedWindowRateLimitOptions) {
  assertPositiveInteger('limit', options.limit);
  assertPositiveInteger('windowMs', options.windowMs);

  const buckets = new Map<string, Bucket>();
  const now = options.now ?? (() => Date.now());

  function consume(key: string, cost = 1): RateLimitResult {
    assertPositiveInteger('cost', cost);
    const safeKey = key.trim() || 'anonymous';
    const nowMs = now();
    const existing = buckets.get(safeKey);
    const bucket = !existing || existing.resetAtMs <= nowMs
      ? { count: 0, resetAtMs: nowMs + options.windowMs }
      : existing;

    const nextCount = bucket.count + cost;
    const allowed = nextCount <= options.limit;
    if (allowed) {
      bucket.count = nextCount;
      buckets.set(safeKey, bucket);
    } else {
      // Keep the bucket so repeated rejected requests share the same reset time.
      buckets.set(safeKey, bucket);
    }

    return {
      allowed,
      name: options.name,
      key: safeKey,
      limit: options.limit,
      remaining: Math.max(0, options.limit - (allowed ? bucket.count : bucket.count)),
      resetAt: new Date(bucket.resetAtMs).toISOString(),
      retryAfterMs: Math.max(0, bucket.resetAtMs - nowMs),
    };
  }

  function reset(key?: string): void {
    if (key) buckets.delete(key);
    else buckets.clear();
  }

  function snapshot(): Array<{ key: string; count: number; resetAt: string }> {
    return [...buckets.entries()].map(([key, bucket]) => ({
      key,
      count: bucket.count,
      resetAt: new Date(bucket.resetAtMs).toISOString(),
    }));
  }

  return { consume, reset, snapshot };
}

export function rateLimitKey(scope: string, id: string): string {
  return `${scope}:${id.trim() || 'anonymous'}`;
}
