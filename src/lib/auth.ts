import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// getUser() re-validates the session against Supabase's auth server on every
// call (by design, unlike a local JWT decode) — several components on the
// same page (SiteHeader plus a page's own auth check) were each calling it
// separately, tripling that network round-trip per request. React's cache()
// memoizes this per-request, so every caller in one render shares one call.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
