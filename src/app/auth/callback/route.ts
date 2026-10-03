import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

// Handles both the Google OAuth redirect and email-confirmation links.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      await ensureProfile(data.user.id, data.user.email);
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Log the real reason server-side instead of swallowing it — this is
    // commonly a PKCE code-verifier mismatch (e.g. the confirmation link was
    // opened in a different browser/app than the one that started signup or
    // OAuth, which is common on mobile when the link is tapped from Mail/Gmail
    // instead of the browser tab the flow began in).
    console.error("auth/callback: exchangeCodeForSession failed", error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
