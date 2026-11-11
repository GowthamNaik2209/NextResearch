import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GROUPS, GROUP_QUESTION, METRICS } from "@/lib/signals/metrics";
import { GUIDE, GUIDE_INTRO } from "@/lib/signals/guide";
import { SignalsGate } from "@/components/signals/SignalsGate";

// The indicators guide (docs/SIGNALS.md section 4): every indicator the signal backtest offers, grouped
// by the question it answers, with what it measures, how it is worked out here, how people commonly
// use it, its usual trap and an example rule. Each one has an anchor (#rsi14) that the rule builder's
// and readings' "i" notes link to. Part of Signals, so tablets and computers only for now.
export const metadata = {
  title: "Indicators guide",
  description: "What each technical indicator in NextResearch's signal backtest measures, how it is worked out, how it is commonly used and where it misleads.",
  robots: { index: false, follow: true },
};

export default function IndicatorsGuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-4xl flex-1 flex-col gap-5 px-4 pt-5 pb-14 sm:px-5">
        <nav aria-label="Back" className="-my-1 flex flex-wrap items-center gap-x-4 text-xs font-semibold text-accent">
          <Link href="/signals" className="inline-flex min-h-8 items-center hover:underline pointer-coarse:min-h-9">
            &larr; Signal backtest
          </Link>
        </nav>
        <header className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Indicators guide</h1>
          <p className="text-sm text-ink-soft">{GUIDE_INTRO}</p>
        </header>
        <SignalsGate what="read the indicators guide">
          <div className="flex flex-col gap-6">
            <nav aria-label="Jump to" className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-md border border-line bg-panel/95 px-1.5 py-1.5 backdrop-blur">
              {GROUPS.map((g) => (
                <a key={g} href={`#group-${g.toLowerCase()}`} title={GROUP_QUESTION[g]} className="inline-flex min-h-8 flex-none items-center whitespace-nowrap rounded border border-btn px-2 text-[11px] font-semibold text-accent hover:bg-accent/10">
                  {g}
                </a>
              ))}
            </nav>
            {GROUPS.map((g) => (
              <section key={g} id={`group-${g.toLowerCase()}`} className="flex scroll-mt-36 flex-col gap-2.5">
                <h2 className="font-display text-lg font-bold text-ink">
                  {GROUP_QUESTION[g]} <span className="text-sm font-normal text-ink-soft">· {g}</span>
                </h2>
                {METRICS.filter((m) => m.group === g).map((m) => {
                  const e = GUIDE[m.id];
                  return (
                    <article key={m.id} id={m.id} className="scroll-mt-36 rounded-md border border-line bg-panel px-3.5 py-3 target:border-accent">
                      <h3 className="font-mono text-sm font-semibold text-ink">{m.label}</h3>
                      {e ? (
                        <dl className="mt-1.5 grid gap-x-3 gap-y-1 text-[13px] leading-relaxed sm:grid-cols-[7rem_minmax(0,1fr)]">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:pt-0.5">What it is</dt>
                          <dd className="text-ink">{e.what}</dd>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:pt-0.5">How it&rsquo;s worked out</dt>
                          <dd className="font-mono text-xs text-ink">{e.how}</dd>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:pt-0.5">How it&rsquo;s used</dt>
                          <dd className="text-ink">{e.use}</dd>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:pt-0.5">Watch out</dt>
                          <dd className="text-ink">{e.trap}</dd>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:pt-0.5">Example rule</dt>
                          <dd className="font-mono text-xs text-accent">{e.example}</dd>
                        </dl>
                      ) : (
                        <p className="mt-1 text-[13px] text-ink-soft">{m.note}</p>
                      )}
                    </article>
                  );
                })}
              </section>
            ))}
            <p className="text-[11px] leading-relaxed text-ink-soft">Common practice described, not advice. Rules describe what prices did; they are not buy or sell calls.</p>
          </div>
        </SignalsGate>
      </main>
      <SiteFooter />
    </>
  );
}
