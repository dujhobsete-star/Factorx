import { NextRequest, NextResponse } from "next/server";
import { ProxyProtocol } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  country: z.string().length(2).transform((value) => value.toUpperCase()).optional(), protocol: z.nativeEnum(ProxyProtocol).optional(),
  limit: z.coerce.number().int().min(1).optional().default(10), page: z.coerce.number().int().min(1).optional().default(1),
  quality: z.enum(["ALL", "GOOD", "EXCELLENT"]).optional().default("ALL"), format: z.enum(["json", "text"]).optional().default("json"),
});
export async function GET(request: NextRequest) {
  const ip = config.TRUST_PROXY_HEADERS === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(ip ?? "unknown")) return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { country, protocol, quality, format, page } = parsed.data; const limit = Math.min(parsed.data.limit, config.MAX_PROXY_GENERATION, 50);
  const latencyMs = quality === "EXCELLENT" ? { lte: config.EXCELLENT_LATENCY_MS } : quality === "GOOD" ? { lte: config.GOOD_LATENCY_MS } : undefined;
  const where = { status: "ACTIVE" as const, ...(country ? { countryVerified: country } : {}), ...(protocol ? { protocol } : {}), ...(latencyMs ? { latencyMs } : {}) };
  const [rows,total] = await Promise.all([
    db.proxy.findMany({ where, select: { id:true,ip:true,port:true,protocol:true,country:true,countryVerified:true,latencyMs:true,lastCheckedAt:true }, orderBy:[{latencyMs:"asc"},{id:"asc"}], skip:(page-1)*limit,take:limit }),
    db.proxy.count({ where }),
  ]);
  if(format==="text") return new NextResponse(rows.map(p=>`${p.protocol.toLowerCase()}://${p.ip}:${p.port}`).join("\n"),{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  return NextResponse.json({proxies:rows.map(p=>({...p,countryCode:p.countryVerified,brVerified:p.countryVerified==="BR"})),count:rows.length,total,page,pages:Math.ceil(total/limit)},{headers:{"cache-control":"no-store"}});
}
