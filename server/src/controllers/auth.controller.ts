import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AppError } from "../utils/app-error";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies";
import { sendSuccess } from "../utils/api-response";
import type { LoginInput, RegisterInput } from "../validation/auth.schema";

async function register(req: Request<unknown, unknown, RegisterInput>, res: Response): Promise<void> {
  const { token, merchant } = await AuthService.register(req.body);
  setAuthCookie(res, token);
  sendSuccess(res, { merchant }, 201);
}

async function login(req: Request<unknown, unknown, LoginInput>, res: Response): Promise<void> {
  const { token, merchant } = await AuthService.login(req.body);
  setAuthCookie(res, token);
  sendSuccess(res, { merchant });
}

function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  sendSuccess(res, { loggedOut: true });
}

async function me(req: Request, res: Response): Promise<void> {
  if (!req.merchantId) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const merchant = await AuthService.getById(req.merchantId);
  sendSuccess(res, { merchant });
}

export const AuthController = { register, login, logout, me };
