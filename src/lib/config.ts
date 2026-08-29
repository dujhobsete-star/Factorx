import { z } from "zod";

const numberFromEnv = (fallback: number) => z.coerce.number().int().positive().default(fallback);
const schema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
  TARGET_PROXY_STOCK: numberFromEnv(500),
  PROXY_MAINTENANCE_CRON: z.string().default("0 3 * * *"),
  PROXY_TEST_TIMEOUT_MS: numberFromEnv(5000),
  PROXY_TEST_BATCH_SIZE: numberFromEnv(20),
  PROXY_TEST_CONCURRENCY: numberFromEnv(10),
  PROXY_FAILURE_COOLDOWN_HOURS: numberFromEnv(48),
  PROXY_VALIDATION_URL: z.string().url().default("https://httpbin.org/ip"),
  PROXY_SOURCE_URL: z.string().url().default("https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text"),
  MAX_PROXY_GENERATION: numberFromEnv(50),
  API_RATE_LIMIT: numberFromEnv(30),
  EXCELLENT_LATENCY_MS: numberFromEnv(300),
  GOOD_LATENCY_MS: numberFromEnv(800),
  ADMIN_PASSWORD: z.string().default(""),
  SESSION_SECRET: z.string().default(""),
  TRUST_PROXY_HEADERS: z.enum(["true", "false"]).default("false")
});
export const config = schema.parse(process.env);

export function calculateMissing(target: number, active: number) {
  return Math.max(0, target - active);
}
