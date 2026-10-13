import Link from "next/link";

/** Site-wide footer, including the "information only, not advice" disclaimer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="font-display text-base font-bold text-ink">NextResearch</span>
            <p className="mt-1 text-xs text-ink-soft">Supply-chain research for India&rsquo;s public markets.</p>
          </div>
          <nav className="flex gap-6 text-sm text-ink-soft">
            <Link href="/#sectors" className="hover:text-ink">Industries</Link>
            <Link href="/docs" className="hover:text-ink">Reading list</Link>
            <Link href="/watchlist" className="hover:text-ink">Watchlist</Link>
            <Link href="/login" className="hover:text-ink">Log in</Link>
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
