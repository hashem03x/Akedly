import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { connectToDatabase } from "../src/config/db";

const app = createApp();

/** Vercel serverless entry. Each invocation reuses a warm Mongo connection when possible. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await connectToDatabase();
  return app(req, res);
}
