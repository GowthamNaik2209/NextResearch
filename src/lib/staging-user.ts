import type { User } from "@supabase/supabase-js";

// Staging has no Supabase auth set up (only production does), so sign-in-only features
// (watchlist, baskets) can't be tested there. With STAGING_SKIP_LOGIN=1 every visitor is
// treated as this one shared test user instead. It is never on in production: Vercel sets
// VERCEL_ENV=production there, which wins over the flag even if it's copied across by mistake.
// Staging and production share one database, so this user's watchlist and baskets are real
// rows - under its own fixed id, so they never mix with a real account's.
export function stagingSkipLogin() {
  return process.env.STAGING_SKIP_LOGIN === "1" && process.env.VERCEL_ENV !== "production";
}

export const STAGING_USER = {
  id: "00000000-0000-4000-8000-00000000057a",
  email: "staging-tester@nextresearch.test",
  user_metadata: { display_name: "Staging tester" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-21T00:00:00.000Z",
} as User;
