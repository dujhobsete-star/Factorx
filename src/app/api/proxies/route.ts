import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOnDemand } from "@/lib/proxy/on-demand";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
const schema = z.object({
  country: z.string().regex(/^[a-z]{2}$/i).transform(v => v.toUpperCase()).optional(),
  protocol: z.enum(["HTTP", "HTTPS", "SOCKS4", "SOCKS5"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  quality: z.enum(["ALL", "GOOD", "EXCELLENT"]).default("ALL"),
  format: z.enum(["json", "text"]).default("json"),
});
let running = 0;
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`generate:${ip}`, 3) || running >= 2) return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": "60" } });
  running++;
  try {
    const result = await generateOnDemand(parsed.data, request.signal);
    const headers = { "Cache-Control": "no-store" };
    if (parsed.data.format === "text") return new NextResponse(result.proxies.map(p => `${p.protocol.toLowerCase()}://${p.ip}:${p.port}`).join("\n"), { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "X-Proxy-Count": String(result.count) } });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "generation_unavailable" }, { status: 503 });
  } finally { running--; }
}
