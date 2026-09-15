import type { Request, Response } from "express";
import { sendError } from "../utils/api-response";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`);
}
