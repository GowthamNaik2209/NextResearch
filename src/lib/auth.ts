import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { STAGING_USER, stagingSkipLogin } from "@/lib/staging-user";

// The test user needs a Profile row before its first watchlist/basket write (foreign key);
// once per server instance is enough.
let stagingProfile: Promise<void> | null = null;

// getUser() re-validates the session against Supabase's auth server on every
// call (by design, unlike a local JWT decode) — several components on the
// same page (SiteHeader plus a page's own auth check) were each calling it
// separately, tripling that network round-trip per request. React's cache()
// memoizes this per-request, so every caller in one render shares one call.
export const getCurrentUser = cache(async () => {
  if (stagingSkipLogin()) {
    // Reading cookies is what keeps every page that checks the user rendered per request;
    // without it the build tries to prerender them (and write this Profile) and fails.
    await cookies();
    stagingProfile ??= ensureProfile(STAGING_USER.id, STAGING_USER.email!).catch((e) => {
      stagingProfile = null;
      throw e;
    });
    await stagingProfile;
    return STAGING_USER;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
