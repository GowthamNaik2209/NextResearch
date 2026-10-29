"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Idea } from "@/lib/baskets/ideas";
import { fmtDay, signedPct } from "@/lib/format";
import { InfoTip } from "@/components/InfoTip";
import { MINI_SEG, miniSegBtn, PANEL } from "./Panel";

// The Baskets page's ideas: today's lists, fetched after the page shows (the first build of the
// day reads every stock's prices). "Biggest gainers" is one card with a switch for its period.
// Each figure is the idea's own backtest, formatted as its page's return card formats it.
type CardIdea = Omit<Idea, "stocks"> & { stocks: { ticker: string; name: string; stat: string }[] };
type State = { status: "loading" } | { status: "error" } | { status: "ok"; asOf: string; ideas: CardIdea[] };

// The cards the page shows on a normal day: Biggest gainers, Highest ROCE, Scarce suppliers, In 3+
// industries, Recent listings and the four screens on company figures (lib/baskets/kpi-screens.ts).
const SKELETON_CARDS = 9;
// A card's usual height (title, blurb, three stocks, count), and Biggest gainers' with its period
// switch: the outlines are drawn at these and every card is at least this tall, so the section
// keeps its height when the lists arrive.
const CARD_H = "min-h-[12rem]";
// The footnote under the cards: two lines on a phone, one from sm up.
const FOOT = "min-h-[3em] text-[10px] text-ink-soft sm:min-h-0 sm:text-[11px]";
const TOP_CARD_H = "min-h-[14.625rem]";


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
      // The first build of the day reads every stock's prices, so this can take a few seconds:
      // the cards' outline shows at once, with a line saying what is happening.
      <div aria-busy className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* As many outlines as there are cards (Biggest gainers + the other lists), so none appear below later. */}
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div key={i} className={PANEL + " flex flex-col gap-2 p-3 " + (i === 0 ? TOP_CARD_H : CARD_H)}>
              <div className="flex justify-between gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-line/70" />
                <div className="h-4 w-12 animate-pulse rounded bg-line/70" />
              </div>
              <div className="h-3 w-full animate-pulse rounded bg-line/50" />
              <div className="mt-auto flex flex-col gap-1.5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-line/50" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-line/50" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-line/50" />
              </div>
            </div>
          ))}
        </div>
        {/* In the footnote's place and at its height, so the cards and footnote that replace them don't move anything below. */}
        <p role="status" className={FOOT}>
          Ranking today&rsquo;s lists from the latest closes…
        </p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className={PANEL + " px-3 py-3 text-xs text-ink-soft"}>
        Rule-based baskets couldn&rsquo;t load right now.{" "}
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
      {/* grid-cols-1 (minmax(0,1fr)), so a long figure beside a stock truncates instead of widening the page. */}
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {top && (
          <li>
            <IdeaCard
              idea={top}
              title="Biggest gainers"
              switcher={
                <div role="group" aria-label="Period" className={MINI_SEG}>
                  {tops.map((t) => {
                    const id = t.id.slice(4);
                    return (
                      <button key={t.id} type="button" aria-pressed={t.id === top.id} onClick={() => setPeriod(id)} className={miniSegBtn(t.id === top.id)}>
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
      <p className={FOOT}>Lists as of {fmtDay(state.asOf)}, re-ranked each day from the latest closes. Returns are past performance, not a recommendation or forecast.</p>
    </div>
  );
}

function IdeaCard({ idea, title, switcher }: { idea: CardIdea; title?: string; switcher?: React.ReactNode }) {
  return (
    // The card opens the idea (its title link stretches over it); the period switch sits above that.
    <div className={PANEL + " relative flex h-full flex-col gap-1.5 p-3 transition hover:border-accent " + (switcher ? TOP_CARD_H : CARD_H)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1">
          <h3 className="min-w-0 text-sm font-semibold text-ink">
            <Link href={`/baskets/ideas/${idea.id}`} className="after:absolute after:inset-0 after:rounded-md after:content-['']">
              {title ?? idea.title}
            </Link>
          </h3>
          {/* The rule in one line, above the card's stretched link so a tap opens the note, not the page. */}
          <span className="relative z-10 -my-0.5 flex-none">
            <InfoTip label={`How ${title ?? idea.title} is picked`}>{idea.rule}</InfoTip>
          </span>
        </div>
        {idea.ret != null && (
          <span className="flex-none text-right">
            <span className={"block font-mono text-sm font-bold tabular-nums " + (idea.ret >= 0 ? "text-pos" : "text-danger")}>{signedPct(idea.ret)}</span>
            <span className="block text-[10px] text-ink-soft">{idea.joinAtListing ? "since listing" : `past ${idea.retLabel}`}</span>
          </span>
        )}
      </div>
      {switcher && <div className="relative z-10 self-start">{switcher}</div>}
      <p className="text-[11px] leading-snug text-ink-soft">{idea.blurb}</p>
      <ul className="mt-auto flex flex-col border-t border-line pt-1">
        {idea.stocks.slice(0, 3).map((s) => (
          <li key={s.ticker} className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
            <span className="min-w-0 truncate text-ink">{s.name}</span>
            <span className="max-w-[55%] flex-none truncate font-mono text-[11px] text-ink-soft">{s.stat}</span>
          </li>
        ))}
      </ul>
      <span className="text-[10px] text-ink-soft">
        {idea.stocks.length} stocks{idea.stocks.length > 3 ? ` · ${idea.stocks.length - 3} more inside` : ""}
      </span>
    </div>
  );
}
