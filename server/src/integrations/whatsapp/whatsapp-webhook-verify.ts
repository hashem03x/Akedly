import crypto from "node:crypto";
import { env } from "../../config/env";

export function verifyWhatsAppSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
  if (!rawBody || !signatureHeader || !env.whatsappAppSecret) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", env.whatsappAppSecret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
