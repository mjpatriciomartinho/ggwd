import "server-only";
import { cookies, headers } from "next/headers";

// The public site is free to browse, but anything that spends AI credits (reports, game suggestions) needs
// the access code in JUDGE_CODE. Judges open any page with ?code=…, which stores it in a cookie; the MCP
// server sends it as the x-ggwd-code header. Without JUDGE_CODE (local dev) everything is open.

export const ACCESS_COOKIE = "ggwd_access";

export type Access = "open" | "unlocked" | "locked";

export class LockedError extends Error {}

const expected = () => process.env.JUDGE_CODE ?? "";

/** Constant-time comparison, so response timing doesn't leak how much of a guess was right. */
export function codeMatches(given: string): boolean {
  const want = expected();
  if (!want || given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function access(): Promise<Access> {
  if (!expected()) return "open";
  const given = (await headers()).get("x-ggwd-code") ?? (await cookies()).get(ACCESS_COOKIE)?.value ?? "";
  return codeMatches(given) ? "unlocked" : "locked";
}

export async function requireAccess() {
  if ((await access()) === "locked") {
    throw new LockedError("AI analysis is locked on the public demo. Hackathon judges: open the site with your access code.");
  }
}
