import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(request: NextRequest) {
  if (!await verifySession(request.cookies.get("fx_admin")?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [statuses, protocols, countries, last, job, sources, brVerified] = await Promise.all([
    db.proxy.groupBy({ by: ["status"], _count: true }), db.proxy.groupBy({ by: ["protocol"], where: { status: "ACTIVE" }, _count: true }),
    db.proxy.groupBy({ by: ["countryCode"], where: { status: "ACTIVE", countryCode: { not: null } }, _count: true, orderBy: { _count: { countryCode: "desc" } }, take: 10 }),
    db.proxyMaintenanceRun.findFirst({ orderBy: { startedAt: "desc" } }), db.maintenanceJob.findFirst({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
    db.proxySourceHealth.findMany({ orderBy: [{ status: "asc" }, { candidatesPassed: "desc" }] }), db.proxy.count({ where: { status: "ACTIVE", countryVerified: "BR" } })
  ]);
  return NextResponse.json({ statuses, protocols, countries, last, job, sources, brVerified });
}
