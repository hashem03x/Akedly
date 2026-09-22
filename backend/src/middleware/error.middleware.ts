import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";
import { sendError } from "../utils/api-response";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, "ROUTE_NOT_FOUND", `No route for ${req.method} ${req.path}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof ZodError) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid request data.", err.flatten());
  }

  if (err?.name === "MongoServerError" && err?.code === 11000) {
    return sendError(res, 409, "DUPLICATE_RESOURCE", "This resource already exists.");
  }

  logger.error("Unhandled error", {
    message: err?.message,
    stack: env.isProduction ? undefined : err?.stack,
    path: req.path,
  });

  return sendError(
    res,
    500,
    "INTERNAL_ERROR",
    env.isProduction ? "Something went wrong." : String(err?.message ?? err)
  );
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
