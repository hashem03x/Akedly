import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env";
import { sendError } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

// Express only recognizes error-handling middleware by its 4-argument arity,
// so `_next` must stay in the signature even though it's unused.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error("ERROR", `Unhandled error on ${req.method} ${req.originalUrl}`, { message });

  sendError(res, 500, "INTERNAL_SERVER_ERROR", isProduction ? "Something went wrong" : message);
}
