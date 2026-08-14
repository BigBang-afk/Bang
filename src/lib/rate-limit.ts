/**
 * Minimal in-memory sliding-window rate limiter for Phase 1.
 *
 * This is process-local — fine for a single Next.js server instance during
 * early development, but it does NOT coordinate across serverless/edge
 * instances. Before Phase 2 introduces real API routes that need rate
 * limiting in production (auth endpoints, AI analysis calls), swap this for
 * a shared store such as Upstash Redis (`@upstash/ratelimit`), keyed the
 * same way (see `key` below), so limits hold across all instances.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key Unique identifier for the caller + action, e.g. `login:<ip>`
 *   or `ai-analysis:<userId>`.
 * @param limit Max requests allowed within `windowMs`.
 * @param windowMs Window size in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
