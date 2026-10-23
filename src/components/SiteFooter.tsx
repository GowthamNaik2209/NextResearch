import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/site";

/** Site-wide footer, including the "information only, not advice" disclaimer. */
export async function SiteFooter() {
  // Shares the header's per-request lookup (getCurrentUser is cache()d), so this costs nothing.
  const user = await getCurrentUser();
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="font-display text-base font-bold text-ink">NextResearch</span>
            <p className="mt-1 text-xs text-ink-soft">Supply-chain research for India&rsquo;s public markets.</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink pointer-coarse:min-h-9">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                Instagram
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">
                Queries: {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            <Link href="/docs" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Analysis</Link>
            <Link href="/companies" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Companies A-Z</Link>
            <Link href="/connections" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Connected companies</Link>
            <Link href="/baskets" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Baskets</Link>
            <Link href="/watchlist" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Watchlist</Link>
            {/* Signed in, the Watchlist and Baskets links above are the account's pages; "Log in" was a dead end. */}
            {!user && <Link href="/login" className="inline-flex items-center hover:text-ink pointer-coarse:min-h-9">Log in</Link>}
          </nav>
        </div>
        <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-ink-soft">
          NextResearch provides information for educational and research purposes only. Nothing on this site is investment advice, a recommendation
          or an offer to buy or sell any security. Data is compiled from public sources and may be incomplete or out of date. Investments in
          securities are subject to market risk; do your own research or consult a registered investment adviser before making decisions.
        </p>
      </div>
    </footer>
  );
}
