import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3">
      <Link href="/" className="flex items-baseline gap-3">
        <span className="rounded-md border border-accent bg-accent/10 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-accent">
          NextResearch
        </span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/watchlist" className="text-ink-soft hover:text-ink">
          Watchlist
        </Link>
        {user ? (
          <form action={logout}>
            <button className="rounded-lg border border-line px-3 py-1.5 text-ink-soft hover:border-accent hover:text-ink">
              Log out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-line px-3 py-1.5 text-ink-soft hover:border-accent hover:text-ink"
          >
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
