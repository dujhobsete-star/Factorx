import { NextRequest, NextResponse } from "next/server";
import { ProxyProtocol } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  country: z.string().length(2).transform((v) => v.toUpperCase()).optional(),
  protocol: z.nativeEnum(ProxyProtocol).optional(),
  limit: z.coerce.number().int().min(1).optional().default(10),
  quality: z.enum(["ALL", "GOOD", "EXCELLENT"]).optional().default("ALL"),
  format: z.enum(["json", "text"]).optional().default("json")
});
export async function GET(request: NextRequest) {
  const ip = config.TRUST_PROXY_HEADERS === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(ip ?? "unknown")) return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { country, protocol, quality, format } = parsed.data;
  const limit = Math.min(parsed.data.limit, config.MAX_PROXY_GENERATION, 50);
  const latency = quality === "EXCELLENT" ? config.EXCELLENT_LATENCY_MS : quality === "GOOD" ? config.GOOD_LATENCY_MS : undefined;
  const rows = await db.$queryRaw<Array<{ id:string; ip:string; port:number; protocol:ProxyProtocol; country:string|null; countryCode:string|null; latencyMs:number|null }>>`
    SELECT "id","ip","port","protocol","country","countryCode","latencyMs" FROM "Proxy"
    WHERE "status"='ACTIVE'::"ProxyStatus"
      AND (${country ?? null}::text IS NULL OR "countryCode"=${country ?? null})
      AND (${protocol ?? null}::text IS NULL OR "protocol"::text=${protocol ?? null})
      AND (${latency ?? null}::int IS NULL OR "latencyMs" <= ${latency ?? null})
    ORDER BY random() LIMIT ${limit}`;
  if (format === "text") return new NextResponse(rows.map((p) => `${p.protocol.toLowerCase()}://${p.ip}:${p.port}`).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
  return NextResponse.json({ proxies: rows, count: rows.length });
}
