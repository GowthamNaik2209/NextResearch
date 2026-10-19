"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Create basket: switch on industries (any mix) and your watchlist, then switch individual stocks
// off or on. A stock in two of the industries switched on is listed once, under the first.
export type BuilderStock = { ticker: string; name: string; layer: string };
export type BuilderIndustry = { slug: string; name: string; icon: string; category: "sector" | "policy"; stocks: BuilderStock[] };

const WATCHLIST = "__watchlist";

export function BasketBuilder({
  industries,
  watchlist,
  universe,
  max,
  initialGroups = [],
}: {
  industries: BuilderIndustry[];
  /** The signed-in reader's liked stocks (only those that can go in a basket). */
  watchlist: BuilderStock[];
  /** Every listed stock, for "Add any stock". */
  universe: BuilderStock[];
  max: number;
  /** Groups switched on when the page opens (an industry slug, or the watchlist). */
  initialGroups?: string[];
}) {
  const router = useRouter();
  const groups = useMemo(() => {
    const all = [...(watchlist.length ? [{ slug: WATCHLIST, name: "Your watchlist", icon: "♥", category: "sector" as const, stocks: watchlist }] : []), ...industries];
    return new Map(all.map((g) => [g.slug, g]));
  }, [industries, watchlist]);
  const byTicker = useMemo(() => new Map(universe.map((s) => [s.ticker, s])), [universe]);

  const [on, setOn] = useState<string[]>(() => initialGroups.filter((g) => groups.has(g)));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(on.flatMap((g) => groups.get(g)!.stocks.map((s) => s.ticker))));
  // Stocks added one by one, outside any group switched on.
  const [extra, setExtra] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [weighting, setWeighting] = useState<"equal" | "mcap">("equal");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Each stock shown once: under the first group switched on that has it, else under "Added".
  const sections = useMemo(() => {
    const seen = new Set<string>();
    const out: { slug: string; name: string; stocks: BuilderStock[] }[] = [];
    for (const slug of on) {
      const g = groups.get(slug)!;
      const stocks = g.stocks.filter((s) => !seen.has(s.ticker));
      stocks.forEach((s) => seen.add(s.ticker));
      out.push({ slug, name: g.name, stocks });
    }
    const added = extra.filter((t) => !seen.has(t)).map((t) => byTicker.get(t)!).filter(Boolean);
    if (added.length) out.push({ slug: "__added", name: "Added", stocks: added });
    return out;
  }, [on, groups, extra, byTicker]);
  const shown = useMemo(() => new Set(sections.flatMap((s) => s.stocks.map((x) => x.ticker))), [sections]);
  const tickers = [...picked].filter((t) => shown.has(t));
  const over = tickers.length > max;

  const toggleGroup = (slug: string) => {
    setError(null);
    if (on.includes(slug)) {
      const rest = on.filter((g) => g !== slug);
      // A stock listed under this group moves to the next group switched on that has it. It keeps
      // its choice there, unless that group has every one of its own stocks switched off.
      const leaving = sections.find((s) => s.slug === slug)?.stocks.map((s) => s.ticker) ?? [];
      const ownOf = (g: string) => sections.find((s) => s.slug === g)?.stocks ?? [];
      const drop = new Set<string>();
      for (const t of leaving) {
        if (extra.includes(t)) continue;
        const to = rest.find((g) => groups.get(g)!.stocks.some((s) => s.ticker === t));
        if (!to || !ownOf(to).some((s) => picked.has(s.ticker))) drop.add(t);
      }
      setOn(rest);
      setPicked((p) => new Set([...p].filter((t) => !drop.has(t))));
    } else {
      setOn([...on, slug]);
      setPicked((p) => new Set([...p, ...groups.get(slug)!.stocks.map((s) => s.ticker)]));
    }
  };
  const toggleStock = (t: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  const setSection = (stocks: BuilderStock[], value: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      for (const s of stocks) {
        if (value) n.add(s.ticker);
        else n.delete(s.ticker);
      }
      return n;
    });
  const addOne = (t: string) => {
    if (!shown.has(t)) setExtra((e) => [...e, t]);
    setPicked((p) => new Set([...p, t]));
    setQuery("");
    // Straight back to the search box, ready for the next stock.
    searchRef.current?.focus();
  };

  const q = query.trim().toLowerCase();
  const matches = q ? universe.filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)).slice(0, 8) : [];

  const create = async () => {
    if (!tickers.length || over) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, name: name.trim() || undefined, weighting }) }).catch(() => null);
    const json = res ? await res.json().catch(() => null) : null;
    if (res?.ok && json?.id) return router.push(`/baskets/${json.id}`);
    setBusy(false);
    if (res?.status === 401) return router.push("/login?next=/baskets/new");
    setError(json?.error === "limit" ? `You have ${json.max} baskets, the most one account can keep. Delete one to make room.` : "Couldn’t create the basket right now. Try again.");
  };

  const chip = (active: boolean) =>
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition " + (active ? "border-accent bg-accent text-bg" : "border-line bg-panel text-ink hover:border-accent");
  const seg = (active: boolean) => "min-h-9 rounded-full px-3 text-xs font-semibold transition " + (active ? "bg-accent text-bg" : "text-ink-soft hover:text-ink");
  const sectors = [...groups.values()].filter((g) => g.slug !== WATCHLIST && g.category === "sector");
  const policies = [...groups.values()].filter((g) => g.category === "policy");

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="b-start" className="flex flex-col gap-3">
        <h2 id="b-start" className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          1 · Switch on industries
        </h2>
        <p className="-mt-1 text-xs text-ink-soft">Each adds its listed stocks. Mix as many as you like.</p>
        {groups.has(WATCHLIST) && (
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={on.includes(WATCHLIST)} onClick={() => toggleGroup(WATCHLIST)} className={chip(on.includes(WATCHLIST))}>
              ♥ Your watchlist ({watchlist.length})
            </button>
          </div>
        )}
        {[
          { label: "Industries", list: sectors },
          { label: "Policies", list: policies },
        ]
          .filter((x) => x.list.length)
          .map((x) => (
            <div key={x.label} className="flex flex-col gap-2">
              <span className="text-[11px] text-ink-soft">{x.label}</span>
              <div className="flex flex-wrap gap-2">
                {x.list.map((g) => (
                  <button key={g.slug} type="button" aria-pressed={on.includes(g.slug)} onClick={() => toggleGroup(g.slug)} className={chip(on.includes(g.slug))}>
                    {g.name}
                    <span className={"font-mono text-[10px] " + (on.includes(g.slug) ? "opacity-80" : "text-ink-soft")}>{g.stocks.length}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </section>

      <section aria-labelledby="b-stocks" className="flex flex-col gap-3">
        <h2 id="b-stocks" className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          2 · Pick the stocks
        </h2>
        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add any listed stock by name or ticker"
            aria-label="Add any listed stock"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
          />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-lg">
              {matches.map((s) => {
                const have = picked.has(s.ticker) && shown.has(s.ticker);
                return (
                  <li key={s.ticker}>
                    <button type="button" disabled={have} onClick={() => addOne(s.ticker)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm text-ink hover:bg-accent/10 disabled:opacity-50">
                      <span className="min-w-0 truncate">
                        {s.name} <span className="font-mono text-[11px] text-ink-soft">{s.ticker}</span>
                      </span>
                      <span className="flex-none text-xs font-semibold text-accent">{have ? "Added" : "+ Add"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {q && matches.length === 0 && <p className="mt-1 text-xs text-ink-soft">No listed stock matches &ldquo;{query}&rdquo;.</p>}
        </div>

        {sections.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">Switch on an industry above, or add a stock by name.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((sec) => {
              const count = sec.stocks.filter((s) => picked.has(s.ticker)).length;
              return (
                <section key={sec.slug} aria-label={sec.name} className="flex min-w-0 flex-col rounded-2xl border border-line bg-panel">
                  <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                    <span title={sec.name} className="min-w-0 truncate text-sm font-semibold text-ink">{sec.name}</span>
                    <span className="flex flex-none items-center gap-2 text-[11px] text-ink-soft">
                      <span className="font-mono">
                        {count}/{sec.stocks.length}
                      </span>
                      <button type="button" onClick={() => setSection(sec.stocks, count < sec.stocks.length)} className="min-h-8 rounded-md px-1.5 font-semibold text-accent hover:underline">
                        {count < sec.stocks.length ? "All" : "None"}
                      </button>
                    </span>
                  </div>
                  {sec.stocks.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-ink-soft">Its stocks are already listed under another industry above.</p>
                  ) : (
                    <ul className="max-h-80 divide-y divide-line overflow-y-auto overscroll-contain">
                      {sec.stocks.map((s) => {
                        const isOn = picked.has(s.ticker);
                        return (
                          <li key={s.ticker}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                              <input type="checkbox" checked={isOn} onChange={() => toggleStock(s.ticker)} className="peer sr-only" />
                              <span aria-hidden className={"relative h-5 w-9 flex-none rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent " + (isOn ? "bg-accent" : "bg-line")}>
                                <span className={"absolute top-0.5 h-4 w-4 rounded-full bg-bg shadow transition-all " + (isOn ? "left-[18px]" : "left-0.5")} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={"block truncate text-sm " + (isOn ? "font-semibold text-ink" : "text-ink-soft")}>{s.name}</span>
                                <span className="block truncate text-[11px] text-ink-soft">
                                  {s.ticker} · {s.layer}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="b-name" className="flex flex-col gap-3">
        <h2 id="b-name" className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          3 · Name it
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="My basket"
            aria-label="Basket name"
            className="min-w-0 flex-1 basis-56 rounded-lg border border-line bg-panel px-3 py-2 text-base text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none sm:text-sm"
          />
          <div role="group" aria-label="Weighting" className="inline-flex rounded-full border border-line bg-panel p-0.5">
            <button type="button" aria-pressed={weighting === "equal"} onClick={() => setWeighting("equal")} className={seg(weighting === "equal")}>
              Equal weight
            </button>
            <button type="button" aria-pressed={weighting === "mcap"} onClick={() => setWeighting("mcap")} className={seg(weighting === "mcap")}>
              Market cap
            </button>
          </div>
        </div>
      </section>

      {/* The count and Create stay in reach however long the lists get. */}
      <div className="sticky bottom-0 z-30 -mx-5 border-t border-line bg-bg/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <p role="status" className={"min-w-0 text-xs " + (over || error ? "text-danger" : "text-ink-soft")}>
            {error ?? (over ? `${tickers.length} stocks: a basket holds up to ${max}. Switch some off.` : tickers.length ? `${tickers.length} stock${tickers.length > 1 ? "s" : ""} selected` : "No stocks selected yet")}
          </p>
          <button type="button" onClick={create} disabled={busy || !tickers.length || over} className="min-h-10 flex-none rounded-lg bg-accent px-5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-40">
            {busy ? "Creating…" : "Create basket"}
          </button>
        </div>
      </div>
    </div>
  );
}
