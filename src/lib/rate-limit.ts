import { config } from "./config";
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, maximum = config.API_RATE_LIMIT) {
  const now = Date.now(); const entry = buckets.get(key);
  if (buckets.size > 10000) for (const [id, bucket] of buckets) if (bucket.reset <= now) buckets.delete(id);
  if (!entry || entry.reset <= now) { buckets.set(key, { count: 1, reset: now + 60_000 }); return true; }
  if (entry.count >= maximum) return false;
  entry.count++; return true;
}
