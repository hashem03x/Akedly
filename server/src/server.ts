import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info("SERVER", `Akedly backend listening on port ${env.port}`, {
      environment: env.nodeEnv,
    });
  });
}

main().catch((error: unknown) => {
  logger.error("SERVER", "Failed to start server", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
