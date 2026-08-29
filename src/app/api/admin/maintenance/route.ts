import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(request: NextRequest) {
  if (!await verifySession(request.cookies.get("fx_admin")?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const running = await db.maintenanceJob.findFirst({ where: { status: { in: ["PENDING", "RUNNING"] } } });
  if (running) return NextResponse.json({ id: running.id, status: running.status }, { status: 202 });
  const job = await db.maintenanceJob.create({ data: {} });
  return NextResponse.json({ id: job.id, status: job.status }, { status: 202 });
}
