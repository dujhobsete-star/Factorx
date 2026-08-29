import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
export async function GET() {
  const [active, groups, last, countries] = await Promise.all([
    db.proxy.count({ where: { status: "ACTIVE" } }),
    db.proxy.groupBy({ by: ["protocol"], where: { status: "ACTIVE" }, _count: true }),
    db.proxyMaintenanceRun.findFirst({ where: { status: "COMPLETED" }, orderBy: { finishedAt: "desc" } }),
    db.proxy.groupBy({ by: ["countryCode", "country"], where: { status: "ACTIVE", countryCode: { not: null } }, _count: true, orderBy: { _count: { countryCode: "desc" } } })
  ]);
  const protocols = { http: 0, https: 0, socks4: 0, socks5: 0 };
  groups.forEach((g) => { protocols[g.protocol.toLowerCase() as keyof typeof protocols] = g._count; });
  const next = last?.finishedAt ? new Date(last.finishedAt.getTime() + 24 * 60 * 60_000) : null;
  return NextResponse.json({ activeProxies: active, targetStock: config.TARGET_PROXY_STOCK, status: active > 0 ? "OPERATIONAL" : "INITIALIZING", lastMaintenance: last?.finishedAt, nextMaintenance: next, protocols, countries: countries.map(c => ({ code: c.countryCode, name: c.country, count: c._count })) });
}
