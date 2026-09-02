import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ mode: "on-demand", status: "ON_DEMAND", maxPerRequest: 50, sourceCacheSeconds: 300, requestTimeoutSeconds: 50, countries: [{ code: "BR", name: "Brasil (saída verificada)" }] });
}
