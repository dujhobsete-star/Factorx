import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
export async function POST(request: NextRequest) {
  if (!await verifySession(request.cookies.get("fx_admin")?.value)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "maintenance_disabled", message: "Modo sob demanda: use o gerador para buscar e testar proxies. Nenhum worker é necessário." }, { status: 410 });
}
