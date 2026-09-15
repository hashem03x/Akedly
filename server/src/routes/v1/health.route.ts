import { Router } from "express";
import { getDatabaseStatus } from "../../config/db";
import { env } from "../../config/env";
import { sendSuccess } from "../../utils/api-response";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    environment: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
  });
});
