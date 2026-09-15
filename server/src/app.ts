import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { requestLogger } from "./middleware/request-logger";
import { v1Router } from "./routes/v1";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  const captureRawBody = (req: express.Request, _res: express.Response, buf: Buffer): void => {
    req.rawBody = buf;
  };
  app.use(express.json({ verify: captureRawBody }));
  // Twilio's webhooks (TwiML fetch, DTMF gather, status callbacks) POST
  // application/x-www-form-urlencoded, not JSON.
  app.use(express.urlencoded({ extended: true, verify: captureRawBody }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.use("/api/v1", v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
