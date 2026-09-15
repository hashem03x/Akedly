import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  sub: string; // merchantId
}

export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signAuthToken(merchantId: string): string {
  return jwt.sign({ sub: merchantId }, env.jwtSecret, { expiresIn: AUTH_TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload");
  }

  return { sub: decoded.sub };
}
