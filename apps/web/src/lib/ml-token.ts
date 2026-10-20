import "server-only";
import { createHmac } from "node:crypto";

/** Mints the short-lived token the browser sends to the ML service. Same scheme as services/ml/app/auth.py. */
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function mintMlToken(claims: { sub: string; role: "admin" | "mentor"; inst?: string; demo?: boolean }, ttlSeconds = 600) {
  const secret = process.env.ASCORA_TOKEN_SECRET;
  if (!secret) throw new Error("ASCORA_TOKEN_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64(JSON.stringify({ ...claims, exp }));
  const sig = b64(createHmac("sha256", secret).update(payload).digest());
  return { token: `${payload}.${sig}`, exp };
}
