import { createApp } from "./app";
import { connectToDatabase } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function main() {
  await connectToDatabase();
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`Akedly API listening on port ${env.port}`, { nodeEnv: env.nodeEnv });
  });
}

main().catch((err) => {
  logger.error("Failed to start server", { message: err?.message });
  process.exit(1);
});
