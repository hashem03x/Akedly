import type { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";
import { sendSuccess } from "../utils/api-response";
import { AppError } from "../utils/app-error";

async function overview(req: Request, res: Response): Promise<void> {
  if (!req.merchantId) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  const stats = await DashboardService.getOverview(req.merchantId);
  sendSuccess(res, stats);
}

export const DashboardController = { overview };
