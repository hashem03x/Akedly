import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      // Fixed, known values so webhook signature tests can compute a
      // matching HMAC deterministically — never real credentials.
      JWT_SECRET: "test-jwt-secret-not-for-production-use",
      TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
      SHOPIFY_API_SECRET: "test-shopify-api-secret",
      SHOPIFY_CLIENT_ID: "test-shopify-client-id",
      SHOPIFY_APP_URL: "https://test.example.com",
      WHATSAPP_APP_SECRET: "test-whatsapp-app-secret",
      WHATSAPP_VERIFY_TOKEN: "test-verify-token",
      TWILIO_AUTH_TOKEN: "test-twilio-auth-token",
      PUBLIC_APP_URL: "https://test.example.com",
    },
  },
});
