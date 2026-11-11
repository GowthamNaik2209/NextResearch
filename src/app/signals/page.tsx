import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureFinancials } from "@/lib/financials/load";
import { decodeStrategy, DEFAULT_STRATEGY } from "@/lib/signals/strategy";
import { listSaved, type SavedSignal } from "@/lib/signals/saved";
import { listTargets, resolveTarget, type Scope } from "@/lib/signals/targets";
import { SignalLab } from "@/components/signals/SignalLab";
import { SignalsGate } from "@/components/signals/SignalsGate";
import { safeNext } from "@/lib/safe-next";

// Signal backtests (docs/SIGNALS.md): entry and exit rules from technical indicators, backtested on a
// covered stock or a basket. Signed-in only, and tablets and computers only (SignalsGate). `?t=` picks
// a stock, `?b=` a basket (an industry "industry:<slug>" or the user's own basket id), `?s=` carries
// the rules (strategy.ts). With neither, it opens the user's most recently saved signal where they
// left it; a stock or basket with saved rules opens with them unless the link carries rules.
// `?from=` (a same-site path, the stock pop-up's or basket page's) means it was opened for that one
// stock or basket: no Stock/Basket switch or picker, and Back returns there.
export const metadata = { title: "Signal backtest", robots: { index: false, follow: false } };

const DEFAULT_TICKER = "BEL";

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ t?: string; b?: string; s?: string; from?: string }> }) {
  const { t, b, s, from } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const q = new URLSearchParams(Object.entries({ t, b, from }).filter((e): e is [string, string] => !!e[1]));
    redirect(`/login?next=${encodeURIComponent(`/signals${q.size ? `?${q}` : ""}`)}`);
  }
  const back = from ? safeNext(from, "") : "";
  await ensureFinancials();
  // Saved signals are a nice-to-have on this page: if they can't load, it still works without them.
  const [choices, saved] = await Promise.all([listTargets(user.id), listSaved(user.id).catch((e): SavedSignal[] => (console.error("signals: saved read failed", e), []))]);

  const asked: { scope: Scope; target: string } | null = t ? { scope: "stock", target: t } : b ? { scope: "basket", target: b } : null;
  const target = asked ? await resolveTarget(asked.scope, asked.target, user.id).catch(() => null) : null;
  const resume = !target && !asked ? (saved[0] ?? null) : null;
  const where = target ? { scope: target.scope, target: target.target } : resume ? { scope: resume.scope, target: resume.target } : { scope: "stock" as const, target: choices.stocks.find((x) => x.ticker === DEFAULT_TICKER)?.ticker ?? choices.stocks[0].ticker };
  const mine = saved.find((x) => x.scope === where.scope && x.target === where.target);
  const strategy = decodeStrategy(s) ?? mine?.strategy ?? DEFAULT_STRATEGY;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1 flex-col gap-3 px-4 pt-5 pb-14 sm:px-5">
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href={back && target ? back : "/baskets"} className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; {back && target ? "Back" : "Baskets"}
          </Link>
          <Link href="/signals/indicators" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            Indicators guide
          </Link>
        </nav>
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Signal backtest</h1>
          <p className="max-w-3xl text-sm text-ink-soft">Pick a stock or basket, start from an idea or set your own entry and exit rules, and see how they would have traded over past prices.</p>
        </header>
        <SignalsGate>
          <SignalLab key={`${where.scope}:${where.target}:${back}`} choices={choices} initial={where} initialStrategy={strategy} initialSaved={saved} notFound={asked && !target ? asked.target : null} locked={!!back && !!target} />
        </SignalsGate>
      </main>
      <SiteFooter />
    </>
  );
}
