import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;
  const link = "hidden text-sm font-medium text-ink-soft hover:text-ink md:inline";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-bg">N</span>
          <span className="font-display text-base font-bold tracking-tight text-ink">NextResearch</span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/#sectors" className={link}>Sectors</Link>
          <Link href="/connections" className={link}>Connections</Link>
          <Link href="/updates" className={link}>Updates</Link>
          <Link href="/#how" className={link}>How it works</Link>
          <Link href="/docs" className={link}>Reading list</Link>
          <Link
            href="/watchlist"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-danger"
            aria-label="Watchlist"
            title="Watchlist"
          >
            <HeartIcon />
          </Link>
          {!user && (
            <Link href="/signup" className="hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-bg hover:opacity-90 sm:inline">
              Get started
            </Link>
          )}
          <UserMenu key={`${user?.id ?? "anon"}-${displayName}`} email={user?.email ?? null} displayName={displayName} />
        </nav>
      </div>
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
