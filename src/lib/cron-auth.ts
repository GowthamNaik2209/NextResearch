// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set every request is
// refused, so local dev never writes. Shared by the cron routes (financials, prices, flows).
import { timingSafeEqual } from "node:crypto";

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
