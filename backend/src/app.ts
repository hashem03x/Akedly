import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rate-limit.middleware";
import webhookRoutes from "./modules/webhooks/webhooks.routes";
import apiRoutes from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );

  if (!env.isProduction) {
    app.use(morgan("dev"));
  }

  // Webhook routes parse their own raw body (for signature verification) and must be
  // mounted before the global JSON body parser below.
  app.use("/api/v1/webhooks", webhookRoutes);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api/v1", apiRateLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
