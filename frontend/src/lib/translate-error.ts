const KNOWN_AUTH_ERROR_CODES = [
  "EMAIL_IN_USE",
  "INVALID_CREDENTIALS",
  "VALIDATION_ERROR",
  "UNKNOWN_ERROR",
] as const;
type KnownAuthErrorCode = (typeof KNOWN_AUTH_ERROR_CODES)[number];

function isKnownAuthErrorCode(code: string): code is KnownAuthErrorCode {
  return (KNOWN_AUTH_ERROR_CODES as readonly string[]).includes(code);
}

/** Maps a backend error code to a translated message, falling back to the raw message. */
export function translateAuthError(
  t: (key: `errors.${KnownAuthErrorCode}`) => string,
  code: string,
  fallbackMessage: string
): string {
  return isKnownAuthErrorCode(code) ? t(`errors.${code}`) : fallbackMessage;
}
