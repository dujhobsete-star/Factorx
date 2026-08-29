import { NextResponse } from "next/server";
import { createSession, safePasswordMatch } from "@/lib/auth";
export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !safePasswordMatch(password)) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("fx_admin", await createSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 28800, path: "/" });
  return response;
}
