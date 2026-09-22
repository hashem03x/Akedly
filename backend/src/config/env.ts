import "dotenv/config";

function required(name: string, fallback?: string): string {
  // Treat an unset OR blank env var the same way — a `.env` file with `KEY=`
  // (present but empty) should fall back in development, not silently pass an
  // empty string through to things like JWT signing.
  const raw = process.env[name];
  const value = raw === undefined || raw === "" ? fallback : raw;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),

  mongodbUri: required("MONGODB_URI", isProduction ? undefined : "mongodb://127.0.0.1:27017/akedly"),

  jwtSecret: required("JWT_SECRET", isProduction ? undefined : "dev-insecure-jwt-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",

  // Public URL of this backend itself — needed to build redirect/callback URLs
  // (e.g. the Shopify OAuth callback and webhook delivery addresses) that must
  // point back to the backend, not the frontend. Required in production: if it's
  // missing there, we'd otherwise silently build callback URLs pointing at
  // localhost, which is exactly the kind of bug that should fail loudly at boot
  // instead of quietly breaking every merchant's Shopify connection.
  backendUrl: required("BACKEND_URL", isProduction ? undefined : `http://localhost:${Number(process.env.PORT ?? 4000)}`),

  credentialsEncryptionKey: required(
    "CREDENTIALS_ENCRYPTION_KEY",
    isProduction ? undefined : "0".repeat(64)
  ),

  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID ?? "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET ?? "",
    scopes: process.env.SHOPIFY_SCOPES ?? "read_orders,write_orders",
    apiVersion: process.env.SHOPIFY_API_VERSION ?? "2024-07",
  },

  woocommerce: {
    // WooCommerce credentials are provided per-store (consumer key/secret), not globally.
  },

  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER ?? (isProduction ? "meta" : "mock"),
    metaAccessToken: process.env.WHATSAPP_META_ACCESS_TOKEN ?? "",
    metaPhoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID ?? "",
    // Trimmed defensively: a stray trailing newline/space from copy-pasting into
    // a dashboard env var field would otherwise silently break the exact-match
    // comparison against Meta's hub.verify_token during webhook verification.
    metaVerifyToken: (process.env.WHATSAPP_META_VERIFY_TOKEN ?? "").trim(),
    metaAppSecret: process.env.WHATSAPP_META_APP_SECRET ?? "",
    metaApiVersion: process.env.WHATSAPP_META_API_VERSION ?? "v20.0",
    twilioAccountSid: process.env.WHATSAPP_TWILIO_ACCOUNT_SID ?? "",
    twilioAuthToken: process.env.WHATSAPP_TWILIO_AUTH_TOKEN ?? "",
    twilioFromNumber: process.env.WHATSAPP_TWILIO_FROM_NUMBER ?? "",
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
  },
};

if (env.isProduction && env.whatsapp.provider === "mock") {
  throw new Error(
    "WHATSAPP_PROVIDER=mock is not allowed in production. Configure a real provider."
  );
}
