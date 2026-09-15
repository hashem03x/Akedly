import type { Response } from "supertest";

export function extractCookie(response: Response, name: string): string {
  const rawCookies = response.headers["set-cookie"] as unknown as string[] | undefined;
  const found = rawCookies?.find((cookie) => cookie.startsWith(`${name}=`));
  if (!found) {
    throw new Error(`Cookie "${name}" was not set on the response`);
  }
  return found.split(";")[0] as string;
}
