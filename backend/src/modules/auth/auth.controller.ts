import type { Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../middleware/error.middleware";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { toMerchantDto } from "../merchants/merchant.dto";
import { loginMerchant, registerMerchant } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.validation";

const COOKIE_NAME = "akedly_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const { merchant, token } = await registerMerchant(input);
  setSessionCookie(res, token);
  sendSuccess(res, { merchant: toMerchantDto(merchant), token }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { merchant, token } = await loginMerchant(input);
  setSessionCookie(res, token);
  sendSuccess(res, { merchant: toMerchantDto(merchant), token });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  sendSuccess(res, { ok: true });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res) => {
  sendSuccess(res, { merchant: toMerchantDto(req.merchant!) });
});
