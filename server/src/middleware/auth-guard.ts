import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";
import { AUTH_COOKIE_NAME } from "../utils/cookies";
import { verifyAuthToken } from "../utils/jwt";

/**
 * Verifies the httpOnly session cookie and attaches `req.merchantId`.
 * Stateless — does not hit the database, so it's cheap to put in front of
 * every merchant-scoped route. Routes/services must read merchantId from
 * here, never from client-supplied input.
 */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.merchantId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired session"));
  }
}
