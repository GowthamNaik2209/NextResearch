import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { ShortcutLink } from "./KeyboardShortcuts";
import { NavPill } from "./NavPill";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      {/* md+: logo | centred section pill | actions. The equal 1fr side columns keep the pill on
          the page's centre line whatever the width of the account chip. */}
      <div className="mx-auto flex max-w-page items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-2 lg:gap-4">
        <ShortcutLink href="/" shortcut="H" label="Home" className="tap-target flex items-center gap-2 justify-self-start">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-bg">N</span>
          <span className="font-display text-base font-bold tracking-tight text-ink">NextResearch</span>
        </ShortcutLink>
        {/* Analysis holds the industries (Deep dive), reports and charts; it replaced Themes. */}
        <NavPill />
        {/* Tighter spacing on phones so menu + watchlist + account (with the name chip on the
            landing page) still fit beside the logo at 375px; at md the tighter gaps keep logo + pill +
            Sign up inside 768px. */}
        <div className="flex items-center gap-2 justify-self-end sm:gap-3 md:gap-2 lg:gap-3">
          <MobileMenu />
          {/* Not on phones (logo + menu + heart + Sign up + account already fill 375px) nor at
              md, where the five text links take the room; the account menu still has it there. */}
          <span className="hidden sm:contents md:hidden lg:contents">
            <ThemeToggle variant="icon" />
          </span>
          <ShortcutLink
            href="/watchlist"
            shortcut="W"
            label="Watchlist"
            className="tap-target flex h-8 w-8 items-center sm:h-9 sm:w-9 justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-danger"
            aria-label="Watchlist"
          >
            <HeartIcon />
          </ShortcutLink>
          {/* Signed-out only, so it never shares the row with the landing-page name chip. All widths
              see the same "Sign up" label everywhere (it fits beside the logo and icons at 375px). */}
          {!user && (
            <Link href="/signup" className="tap-target whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-bg hover:opacity-90 sm:px-3.5 sm:py-2 sm:text-sm">
              Sign up
            </Link>
          )}
          <UserMenu key={`${user?.id ?? "anon"}-${displayName}`} email={user?.email ?? null} displayName={displayName} />
        </div>
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
