import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

const key = () => new TextEncoder().encode(config.SESSION_SECRET);
export async function createSession() {
  if (config.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must have at least 32 characters");
  return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key());
}
export async function verifySession(token?: string) {
  if (!token || config.SESSION_SECRET.length < 32) return false;
  try { const { payload } = await jwtVerify(token, key()); return payload.role === "admin"; } catch { return false; }
}
export function safePasswordMatch(input: string) {
  const expected = config.ADMIN_PASSWORD;
  if (!expected || input.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
