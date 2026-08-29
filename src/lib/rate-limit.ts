import { config } from "./config";
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string) {
  const now = Date.now(); const entry = buckets.get(key);
  if (!entry || entry.reset <= now) { buckets.set(key, { count: 1, reset: now + 60_000 }); return true; }
  if (entry.count >= config.API_RATE_LIMIT) return false;
  entry.count++; return true;
}
