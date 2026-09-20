import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "lumen_session";
const password = process.env.AUTH_PASSWORD;
const secureCookies = process.env.AUTH_COOKIE_SECURE === "true";

function sessionToken() {
  return password ? createHmac("sha256", password).update("lumen-session").digest("hex") : "";
}

export function authEnabled() {
  return true;
}

export function passwordMatches(candidate: string) {
  if (!password) return false;
  const expected = Buffer.from(password);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function isAuthenticated() {
  if (!password) return false;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const expected = Buffer.from(sessionToken());
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function setSessionCookie() {
  return { name: cookieName, value: sessionToken(), httpOnly: true, sameSite: "strict" as const, secure: secureCookies, path: "/", maxAge: 60 * 60 * 24 * 30 };
}

export function clearSessionCookie() {
  return { name: cookieName, value: "", httpOnly: true, sameSite: "strict" as const, secure: secureCookies, path: "/", maxAge: 0 };
}
