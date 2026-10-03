"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";

// Used to build the absolute redirect URLs Supabase needs for OAuth and
// email-confirmation links (signUp's emailRedirectTo, signInWithOAuth's
// redirectTo). NEXT_PUBLIC_SITE_URL is the source of truth when it's set,
// but if it's missing or wasn't picked up by a given deployment (e.g. it was
// added to Vercel after the last build — NEXT_PUBLIC_* vars are inlined at
// build time, so a dashboard-only change needs a fresh deploy to take
// effect), silently falling back to "http://localhost:3000" sends mobile
// users to a dead address once they leave this tab (Google consent screen,
// or their email app). Derive the real deployed origin from the incoming
// request's headers instead, and only fall back to localhost when neither
// source is available (i.e. truly local dev with no request context).
async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  if (data.user?.email) await ensureProfile(data.user.id, data.user.email);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback` },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.email && data.session) {
    // Supabase returns a session immediately when "Confirm email" is off in
    // the project's Auth settings. If it's on, data.session is undefined and
    // we fall through to the checkEmail branch below instead.
    await ensureProfile(data.user.id, data.user.email);
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect("/signup?checkEmail=1");
}

export async function loginWithGoogle(formData: FormData) {
  const next = String(formData.get("next") ?? "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`);
  }
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
