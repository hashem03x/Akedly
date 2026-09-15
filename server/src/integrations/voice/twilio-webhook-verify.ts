import crypto from "node:crypto";
import { env } from "../../config/env";

/**
 * Twilio's request-validation algorithm: HMAC-SHA1 (base64) of the full
 * request URL with all POST param key/value pairs, sorted by key, appended
 * directly to it — compared against X-Twilio-Signature.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(
  fullUrl: string,
  params: Record<string, string>,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader || !env.twilioAuthToken) return false;

  const sortedData =
    fullUrl +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  const expected = crypto.createHmac("sha1", env.twilioAuthToken).update(sortedData, "utf8").digest("base64");

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
