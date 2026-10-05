import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3">
      <Link href="/" className="flex items-baseline gap-3">
        <span className="rounded-md border border-accent bg-accent/10 px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-accent">
          NextResearch
        </span>
      </Link>
      <nav className="flex items-center gap-3">
        <Link
          href="/watchlist"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-danger"
          aria-label="Watchlist"
          title="Watchlist"
        >
          <HeartIcon />
        </Link>
        <UserMenu key={`${user?.id ?? "anon"}-${displayName}`} email={user?.email ?? null} displayName={displayName} />
      </nav>
    </header>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.9 1 5.3 4.3 4.1c2.3-.8 4.6.1 5.9 2 .5.7 1.4 1.9 1.8 2.5.4-.6 1.3-1.8 1.8-2.5 1.3-1.9 3.6-2.8 5.9-2 3.3 1.2 4.2 4.8 2.5 7.6C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
