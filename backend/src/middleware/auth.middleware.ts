import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { verifyAuthToken } from "../utils/jwt";
import { MerchantModel, type MerchantDocument } from "../modules/merchants/merchant.model";

export interface AuthenticatedRequest extends Request {
  merchant?: MerchantDocument;
  merchantId?: string;
}

export function requireAuth() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies
        ?.akedly_token;
      const token = header?.startsWith("Bearer ") ? header.slice(7) : cookieToken;

      if (!token) {
        throw ApiError.unauthorized();
      }

      const payload = verifyAuthToken(token);
      const merchant = await MerchantModel.findById(payload.merchantId);
      if (!merchant) {
        throw ApiError.unauthorized("Session is no longer valid.", "INVALID_SESSION");
      }

      req.merchant = merchant;
      req.merchantId = merchant.id;
      next();
    } catch (err) {
      if (err instanceof ApiError) return next(err);
      next(ApiError.unauthorized("Invalid or expired session.", "INVALID_SESSION"));
    }
  };
}
