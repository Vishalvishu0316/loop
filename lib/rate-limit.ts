/**
 * <rate-limit.ts> – Sliding window in-memory rate limiter for Next.js API routes.
 *
 * Tracks request counts per key (IP or userId) within a configurable time window.
 * Expired entries are automatically garbage collected.
 */

type RateLimitOptions = {
  /** Maximum allowed requests within the window */
  limit: number;
  /** Sliding window duration in milliseconds (e.g. 60_000 for 1 minute) */
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const store = new Map<string, { count: number; resetTime: number }>();

// Cleanup stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 120_000);

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    const resetTime = now + options.windowMs;
    store.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: resetTime,
    };
  }

  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count++;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    reset: record.resetTime,
  };
}

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }
  return "127.0.0.1";
}
