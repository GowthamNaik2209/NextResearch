import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// Sign-up pitch at the foot of the landing page - only for visitors without an account.
export async function ClosingCta() {
  if (await getCurrentUser()) return null;
  return (
    <section className="mx-auto max-w-page px-5 py-20">
      <div className="rounded-3xl bg-accent px-8 py-12 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-bg">Build your basket around a theme, not a tip.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-bg/80">Create an account to keep your own baskets, backtested against the Nifty 50, and a watchlist of the companies you follow.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="rounded-lg bg-bg px-6 py-2.5 text-sm font-semibold text-ink hover:opacity-90">Create an account</Link>
          <Link href="#themes" className="rounded-lg border border-bg/40 px-6 py-2.5 text-sm font-semibold text-bg hover:bg-bg/10">Keep browsing</Link>
        </div>
      </div>
    </section>
  );
}
