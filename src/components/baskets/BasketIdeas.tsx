"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Idea } from "@/lib/baskets/ideas";

// The Baskets page's ideas: today's lists, fetched after the page shows (the first build of the
// day reads every stock's prices). "Top performers" is one card with a switch for its period.
type CardIdea = Omit<Idea, "stocks"> & { stocks: { ticker: string; name: string; stat: string }[] };
type State = { status: "loading" } | { status: "error" } | { status: "ok"; asOf: string; ideas: CardIdea[] };

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1)}%`;
const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function BasketIdeas() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [period, setPeriod] = useState("1y");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetch("/api/baskets/ideas")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { asOf: string; ideas: CardIdea[] }) => live && setState({ status: "ok", asOf: d.asOf, ideas: d.ideas }))
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
    };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <div aria-busy className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <span className="sr-only">Loading today&rsquo;s basket ideas…</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-line/60" />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">
        Basket ideas couldn&rsquo;t load right now.{" "}
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((a) => a + 1);
          }}
          className="font-semibold text-accent underline"
        >
          Retry
        </button>
      </p>
    );
  }

  const tops = state.ideas.filter((i) => i.id.startsWith("top-"));
  const top = tops.find((i) => i.id === `top-${period}`) ?? tops[0];
  const rest = state.ideas.filter((i) => !i.id.startsWith("top-"));

  return (
    <div className="flex flex-col gap-2">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top && (
          <li>
            <IdeaCard
              idea={top}
              title="Top performers"
              switcher={
                <div role="group" aria-label="Period" className="inline-flex rounded-full border border-line bg-bg p-0.5">
                  {tops.map((t) => {
                    const id = t.id.slice(4);
                    return (
                      <button key={t.id} type="button" aria-pressed={t.id === top.id} onClick={() => setPeriod(id)} className={"min-h-8 min-w-8 rounded-full px-2 text-[11px] font-semibold transition " + (t.id === top.id ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}>
                        {t.retLabel}
                      </button>
                    );
                  })}
                </div>
              }
            />
          </li>
        )}
        {rest.map((i) => (
          <li key={i.id}>
            <IdeaCard idea={i} />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-ink-soft">Lists as of {dayOf(state.asOf)}, re-ranked each day from the latest closes. Past returns, not a recommendation.</p>
    </div>
  );
}

function IdeaCard({ idea, title, switcher }: { idea: CardIdea; title?: string; switcher?: React.ReactNode }) {
  return (
    // The card opens the idea (its title link stretches over it); the period switch sits above that.
    <div className="relative flex h-full flex-col gap-2 rounded-2xl border border-line bg-panel p-4 transition hover:border-accent">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-semibold text-ink">
          <Link href={`/baskets/ideas/${idea.id}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
            {title ?? idea.title}
          </Link>
        </h3>
        {idea.ret != null && (
          <span className="flex-none text-right">
            <span className={"block font-mono text-sm font-bold " + (idea.ret >= 0 ? "text-pos" : "text-danger")}>{pct(idea.ret)}</span>
            <span className="block text-[10px] text-ink-soft">{idea.retLabel}</span>
          </span>
        )}
      </div>
      {switcher && <div className="relative z-10 self-start">{switcher}</div>}
      <p className="text-xs leading-relaxed text-ink-soft">{idea.blurb}</p>
      <ul className="mt-auto flex flex-col gap-1 border-t border-line pt-2">
        {idea.stocks.slice(0, 3).map((s) => (
          <li key={s.ticker} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-ink">{s.name}</span>
            <span className="max-w-[55%] flex-none truncate font-mono text-[11px] text-ink-soft">{s.stat}</span>
          </li>
        ))}
      </ul>
      <span className="text-[11px] text-ink-soft">
        {idea.stocks.length} stocks{idea.stocks.length > 3 ? ` · ${idea.stocks.length - 3} more inside` : ""}
      </span>
    </div>
  );
}
