import "dotenv/config";
import crypto from "node:crypto";
import { logger } from "../utils/logger";

type NodeEnv = "development" | "test" | "production";

interface EnvConfig {
  nodeEnv: NodeEnv;
  port: number;
  mongodbUri: string | undefined;
  frontendUrl: string;
  /** This server's own public HTTPS base URL (an ngrok URL in dev) — used to build webhook/callback URLs for providers that need to reach us (Twilio TwiML/status callbacks). */
  publicAppUrl: string | undefined;
  jwtSecret: string;
  tokenEncryptionKey: string;

  shopifyClientId: string | undefined;
  shopifyApiSecret: string | undefined;
  shopifyScopes: string;
  shopifyAppUrl: string | undefined;
  shopifyApiVersion: string;

  whatsappAccessToken: string | undefined;
  whatsappPhoneNumberId: string | undefined;
  whatsappBusinessAccountId: string | undefined;
  whatsappAppSecret: string | undefined;
  whatsappVerifyToken: string | undefined;

  voiceProvider: string;
  twilioAccountSid: string | undefined;
  twilioAuthToken: string | undefined;
  twilioPhoneNumber: string | undefined;
}

function readNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test") return value;
  return "development";
}

function resolveSecret(nodeEnv: NodeEnv, envVar: string, opts: { consequence: string }): string {
  const configured = process.env[envVar];
  if (configured) return configured;

  if (nodeEnv === "production") {
    throw new Error(`${envVar} must be set in production`);
  }

  const ephemeral = crypto.randomBytes(32).toString("hex");
  logger.warn(
    "CONFIG",
    `${envVar} not set — using a random ephemeral value for this process only. ${opts.consequence} Set ${envVar} in .env to avoid this.`,
  );
  return ephemeral;
}

const nodeEnv = readNodeEnv();

export const env: EnvConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || undefined,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3411",
  publicAppUrl: process.env.PUBLIC_APP_URL || undefined,
  jwtSecret: resolveSecret(nodeEnv, "JWT_SECRET", {
    consequence: "Existing sessions won't survive a restart.",
  }),
  tokenEncryptionKey: resolveSecret(nodeEnv, "TOKEN_ENCRYPTION_KEY", {
    consequence: "Any previously-encrypted provider tokens (e.g. a connected Shopify store) will become undecryptable after a restart — merchants will need to reconnect.",
  }),

  shopifyClientId: process.env.SHOPIFY_CLIENT_ID || undefined,
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET || undefined,
  shopifyScopes: process.env.SHOPIFY_SCOPES || "read_orders,read_customers",
  shopifyAppUrl: process.env.SHOPIFY_APP_URL || undefined,
  // Shopify releases a new stable API version quarterly (YYYY-01/04/07/10).
  // Bump this deliberately when adopting a newer one.
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-07",

  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || undefined,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || undefined,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || undefined,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET || undefined,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || undefined,

  voiceProvider: process.env.VOICE_PROVIDER || "twilio",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || undefined,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || undefined,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || undefined,
};

export const isProduction = env.nodeEnv === "production";
export const isTest = env.nodeEnv === "test";
