import crypto from "node:crypto";
import { env } from "../../config/env";

export function verifyShopifyWebhookHmac(rawBody: Buffer | undefined, hmacHeader: string | undefined): boolean {
  if (!rawBody || !hmacHeader || !env.shopifyApiSecret) return false;

  const expected = crypto.createHmac("sha256", env.shopifyApiSecret).update(rawBody).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(hmacHeader);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
