"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHECKS, COSTS, MAX_ENTRY, MAX_EXIT, PRESETS, RANGES, conditionFor, encodeStrategy, type Strategy } from "@/lib/signals/strategy";
import { describeStrategy } from "@/lib/signals/describe";
import type { SavedSignal } from "@/lib/signals/saved";
import type { Scope, TargetChoices } from "@/lib/signals/targets";
import { MINI_SEG, Panel } from "@/components/baskets/Panel";
import { ConfirmDialog } from "@/components/baskets/ConfirmDialog";
import { fmtDay, signedPct } from "@/lib/format";
import { RuleSetEditor, StopsEditor } from "./RuleBuilder";
import { StarterCards } from "./StarterCards";
import { StockResults, Readings } from "./StockResults";
import { BasketResults } from "./BasketResults";
import { SavedPanel } from "./SavedPanel";
import { BTN, FIELD, ctlLabel, segBtn, type Answer } from "./ui";

// The signal backtest (docs/SIGNALS.md): pick a stock or basket, start from an idea or build rules,
// and see how they would have traded. Changing the stock, basket, range, check or costs runs again at
// once; rule edits wait for Run, so a half-made rule isn't sent. Saved rules (one set per stock or
// basket) open where they were left, and their email switch turns on the nightly alert. `locked`: it
// was opened for one stock or basket (its pop-up or page), so there is no Stock/Basket switch or
// picker; opening another stock or saved signal goes to that one's own Signals page.

type Where = { scope: Scope; target: string };

const sameRules = (a: Strategy, b: Strategy) => JSON.stringify(a) === JSON.stringify(b);

export function SignalLab({ choices, initial, initialStrategy, initialSaved, notFound, locked = false }: { choices: TargetChoices; initial: Where; initialStrategy: Strategy; initialSaved: SavedSignal[]; /** The link named a stock or basket that isn't available here. */ notFound?: string | null; locked?: boolean }) {
  const [where, setWhere] = useState<Where>(initial);
  const [strategy, setStrategy] = useState<Strategy>(initialStrategy);
  const [ran, setRan] = useState<{ key: string; answer: Answer } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(notFound ? `${notFound} isn't a covered stock or one of your baskets, so this opened instead.` : null);
  const top = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const rulesRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<SavedSignal[]>(initialSaved);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SavedSignal | null>(null);
  const req = useRef(0);

  const keyOf = (w: Where, s: Strategy) => `${w.scope}|${w.target}|${JSON.stringify(s)}`;
  const run = useCallback(async (w: Where, s: Strategy) => {
    const id = ++req.current;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/signals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: w.scope, target: w.target, strategy: s }) });
      const body = await res.json().catch(() => null);
      if (id !== req.current) return;
      if (!res.ok) {
        setError(body?.error ?? "The backtest couldn't run right now. Try again shortly.");
        return;
      }
      setRan({ key: keyOf(w, s), answer: body as Answer });
      // Only while this page is the one showing: an answer that lands after leaving must not write
      // its stock and rules into another page's address.
      if (window.location.pathname !== "/signals") return;
      const url = new URL(window.location.href);
      url.searchParams.delete(w.scope === "stock" ? "b" : "t");
      url.searchParams.set(w.scope === "stock" ? "t" : "b", w.target);
      url.searchParams.set("s", encodeStrategy(s));
      window.history.replaceState(null, "", url);
    } catch {
      if (id === req.current) setError("The backtest couldn't run right now. Check your connection and try again.");
    } finally {
      if (id === req.current) setBusy(false);
    }
  }, []);

  // The first run, and again whenever the stock/basket or a setting outside the rules changes.
  const outer = `${where.scope}|${where.target}|${strategy.range}|${strategy.check}|${strategy.cost}`;
  const latest = useRef({ where, strategy });
  // Kept current before the run below reads it (effects run in order).
  useEffect(() => {
    latest.current = { where, strategy };
  });
  useEffect(() => {
    void run(latest.current.where, latest.current.strategy);
  }, [outer, run]);

  const answer = ran?.answer ?? null;
  const stale = !!ran && ran.key !== keyOf(where, strategy);
  const here = saved.find((s) => s.scope === where.scope && s.target === where.target) ?? null;
  const dirty = !here || !sameRules(here.strategy, strategy);
  const stockAnswer = answer?.kind === "stock" && answer.target === where.target ? answer : null;
  const basketAnswer = answer?.kind === "basket" && answer.target === where.target ? answer : null;
  const unavailable = useMemo(() => {
    const out: Record<string, string> = {};
    for (const x of stockAnswer?.readings ?? []) if (x.unavailable) out[x.id] = x.unavailable;
    return out;
  }, [stockAnswer]);
  const sentence = describeStrategy(strategy);

  // The idea whose rules are on screen (range and costs aside), highlighted in the cards; none once edited.
  const preset = PRESETS.find((p) => sameRules({ ...p.strategy, range: strategy.range, cost: strategy.cost }, strategy))?.id ?? "";

  const set = (patch: Partial<Strategy>) => {
    // An edit makes the last note (added, saved, emails on) out of date.
    setNote(null);
    setStrategy((s) => ({ ...s, ...patch }));
  };
  /** Opens a stock or basket: with its saved rules if it has some, else with the rules on screen. */
  const go = (w: Where, rules?: Strategy) => {
    const mine = rules ?? saved.find((s) => s.scope === w.scope && s.target === w.target)?.strategy;
    setWhere(w);
    if (mine) {
      setStrategy(mine);
      setNote(rules ? null : "Your saved rules for this one are loaded.");
    } else setNote(null);
  };
  /** A link to another stock's or basket's Signals: locked to it with Back to this page, or the full page. */
  const elsewhere = (w: Where, rules: Strategy, lockHere: boolean) => {
    const q = new URLSearchParams({ [w.scope === "stock" ? "t" : "b"]: w.target, s: encodeStrategy(rules) });
    if (lockHere) q.set("from", window.location.pathname + window.location.search);
    router.push(`/signals?${q}`);
  };
  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setNote(null);
    const next = { ...p.strategy, range: strategy.range, cost: strategy.cost };
    setStrategy(next);
    // A different check makes the settings effect run it; running here as well would ask twice.
    if (next.check === strategy.check) void run(where, next);
  };
  const addReading = (id: string) => {
    if (strategy.entry.conds.length >= MAX_ENTRY) return;
    set({ entry: { ...strategy.entry, conds: [...strategy.entry.conds, conditionFor(id)] } });
    setNote(`Added to the entry rules: run the backtest to see the result.`);
    rulesRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const save = async (alerts: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/saved", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: where.scope, target: where.target, strategy, alerts }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) return setError(body?.error ?? "Couldn't save right now. Try again shortly.");
      const s = body.saved as SavedSignal;
      setSaved((list) => [s, ...list.filter((x) => x.id !== s.id)]);
      setNote(alerts ? "Saved, and emails are on: you'll get one when these rules are met on a close." : "Saved. These rules open here next time.");
      // Rules saved before they were run: run them, so the status and results describe what was saved.
      if (stale) void run(where, strategy);
    } catch {
      setError("Couldn't save right now. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };
  const toggleAlerts = async (s: SavedSignal, on: boolean) => {
    setSaved((list) => list.map((x) => (x.id === s.id ? { ...x, alerts: on } : x)));
    const res = await fetch("/api/signals/saved", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, alerts: on }) }).catch(() => null);
    if (!res?.ok) {
      setSaved((list) => list.map((x) => (x.id === s.id ? { ...x, alerts: !on } : x)));
      setError("Couldn't change the email right now. Try again shortly.");
    } else setNote(on ? `Emails on for ${s.name}: you'll get one when its rules are met on a close.` : `Emails off for ${s.name}.`);
  };
  const remove = async () => {
    const s = deleting;
    if (!s) return;
    const res = await fetch(`/api/signals/saved?id=${encodeURIComponent(s.id)}`, { method: "DELETE" }).catch(() => null);
    setDeleting(null);
    if (res?.ok) setSaved((list) => list.filter((x) => x.id !== s.id));
    else setError("Couldn't delete right now. Try again shortly.");
  };

  const r = stockAnswer?.result ?? null;
  const noEntry = !strategy.entry.conds.length;
  const status = noEntry
    ? "Add an entry condition to run or save these rules."
    : stale
    ? "Your rules changed: run the backtest to see where they stand."
    : stockAnswer
    ? r!.pending
      ? `${r!.pending === "entry" ? "Entry rules" : "An exit"} met on the ${fmtDay(stockAnswer.lastDay, { short: true })} close: the rules would trade at the next close.`
      : r!.now.in
        ? `The rules hold ${stockAnswer.ticker} since ${fmtDay(r!.now.since!, { short: true })} (${signedPct(r!.now.ret, 1)}).`
        : `The rules are out of ${stockAnswer.ticker}${r!.now.since ? ` since ${fmtDay(r!.now.since, { short: true })}` : ""}.`
    : basketAnswer
      ? `The rules hold ${basketAnswer.result.stocks.filter((s) => s.in).length} of ${basketAnswer.result.stats.size} stocks in ${basketAnswer.name}${basketAnswer.result.stocks.some((s) => s.pending) ? `; a rule was met on the last close for ${basketAnswer.result.stocks.filter((s) => s.pending).map((s) => s.ticker).join(", ")}` : ""}.`
      : null;

  return (
    <div ref={top} className="flex scroll-mt-16 flex-col gap-3">
      <StarterCards active={preset} onPick={applyPreset} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-panel px-3 py-2">
        {locked ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={ctlLabel}>{where.scope === "stock" ? "Stock" : "Basket"}</span>
            <span className="truncate text-sm font-semibold text-ink">
              {where.scope === "stock" ? `${choices.stocks.find((x) => x.ticker === where.target)?.name ?? where.target} · ${where.target}` : ([...choices.baskets, ...choices.industries].find((x) => x.target === where.target)?.name ?? "Basket")}
            </span>
          </div>
        ) : (
          <>
        <div className={MINI_SEG} role="group" aria-label="Backtest on">
          {(["stock", "basket"] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              aria-pressed={where.scope === sc}
              onClick={() => sc !== where.scope && go(sc === "stock" ? { scope: "stock", target: choices.stocks.find((x) => x.ticker === "BEL")?.ticker ?? choices.stocks[0].ticker } : { scope: "basket", target: choices.baskets[0]?.target ?? choices.industries[0].target })}
              className={segBtn(where.scope === sc) + " px-3"}
            >
              {sc === "stock" ? "Stock" : "Basket"}
            </button>
          ))}
        </div>
        <label className="flex min-w-0 items-center gap-1.5">
          <span className={ctlLabel}>{where.scope === "stock" ? "Stock" : "Basket"}</span>
          {where.scope === "stock" ? (
            <select value={where.target} onChange={(e) => go({ scope: "stock", target: e.target.value })} className={FIELD + " min-w-0 max-w-[16rem]"}>
              {choices.stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.name} · {s.ticker}
                </option>
              ))}
            </select>
          ) : (
            <select value={where.target} onChange={(e) => go({ scope: "basket", target: e.target.value })} className={FIELD + " min-w-0 max-w-[18rem]"}>
              {choices.baskets.length > 0 && (
                <optgroup label="Your baskets">
                  {choices.baskets.map((b) => (
                    <option key={b.target} value={b.target}>
                      {b.name} · {b.size}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Industries">
                {choices.industries.map((b) => (
                  <option key={b.target} value={b.target}>
                    {b.name} · {b.size}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </label>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <span className={ctlLabel}>Range</span>
          <div className={MINI_SEG} role="group" aria-label="Range">
            {RANGES.map((x) => (
              <button key={x} type="button" aria-pressed={strategy.range === x} onClick={() => set({ range: x })} className={segBtn(strategy.range === x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={ctlLabel}>Check rules</span>
          <div className={MINI_SEG} role="group" aria-label="Check rules">
            {CHECKS.map((x) => (
              <button key={x.id} type="button" aria-pressed={strategy.check === x.id} onClick={() => set({ check: x.id })} className={segBtn(strategy.check === x.id)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-1.5">
          <span className={ctlLabel}>Costs</span>
          <select value={strategy.cost} onChange={(e) => set({ cost: Number(e.target.value) })} className={FIELD}>
            {(COSTS.includes(strategy.cost) ? COSTS : [...COSTS, strategy.cost].sort((a, b) => a - b)).map((c) => (
              <option key={c} value={c}>
                {c === 0 ? "None" : `${c}% round trip`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(status || note) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-accent/50 bg-accent/5 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">{status}</span>
          {note && <span className="text-ink-soft">{note}</span>}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" disabled={saving || noEntry || (!dirty && !!here)} onClick={() => void save(here?.alerts ?? false)} className={BTN + " text-ink hover:bg-accent/10 disabled:opacity-50"}>
              {!here ? "Save these rules" : dirty ? "Update saved rules" : "Saved"}
            </button>
            {!here?.alerts ? (
              <button type="button" disabled={saving || noEntry} onClick={() => void (here && !dirty ? toggleAlerts(here, true) : save(true))} className={BTN + " border-accent bg-accent text-bg hover:opacity-90 disabled:opacity-60"}>
                {here && !dirty ? "Email me when they trigger" : "Save and email me when they trigger"}
              </button>
            ) : (
              <button type="button" onClick={() => void toggleAlerts(here, false)} className={BTN + " text-ink hover:bg-accent/10"}>
                Emails on · turn off
              </button>
            )}
          </span>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs text-danger">
          {error}
        </p>
      )}
      {stockAnswer && (stockAnswer.gaps.hl || stockAnswer.gaps.vol) && (
        <p className="rounded-md border border-line bg-panel px-3 py-1.5 text-[11px] text-ink-soft">
          {stockAnswer.name}&rsquo;s stored prices have {stockAnswer.gaps.hl && stockAnswer.gaps.vol ? "closes only" : stockAnswer.gaps.hl ? "closes and volumes but no daily high or low" : "no volume"}, so indicators that need{" "}
          {stockAnswer.gaps.hl && stockAnswer.gaps.vol ? "the rest" : stockAnswer.gaps.hl ? "the high and low" : "volume"} are marked n/a.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          {stockAnswer ? (
            <StockResults answer={stockAnswer} strategy={strategy} busy={busy} />
          ) : basketAnswer ? (
            <BasketResults
              answer={basketAnswer}
              busy={busy}
              onOpenStock={(t) => {
                if (locked) return elsewhere({ scope: "stock", target: t }, strategy, true);
                go({ scope: "stock", target: t }, strategy);
                top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
            />
          ) : (
            <div className={"flex min-h-64 items-center justify-center rounded-md border border-line bg-panel text-xs text-ink-soft " + (busy ? "animate-pulse" : "")}>
              {busy ? (where.scope === "basket" ? "Running the rules on every stock in the basket…" : "Running the backtest…") : "No result yet."}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Panel
            title="Rules"
            info={
              <>
                A rule met on a close trades at the next close; exit controls are checked on every close. The picker shows what each indicator measures.{" "}
                <Link href="/signals/indicators" className="font-semibold text-accent underline">
                  Indicators guide
                </Link>
              </>
            }
            bodyClassName="flex flex-col gap-3 p-2.5"
          >
            <div ref={rulesRef} className="scroll-mt-20 rounded border border-line bg-bg px-2.5 py-2 text-xs leading-relaxed text-ink">
              {strategy.entry.conds.length ? (
                <>
                  <p>{sentence.entry}</p>
                  <p className="mt-0.5">{sentence.exit}</p>
                </>
              ) : (
                <p className="text-amber-ink">Add an entry condition: the rules need at least one to get in.</p>
              )}
            </div>
            <RuleSetEditor title="Entry when" note="are true" rules={strategy.entry} max={MAX_ENTRY} unavailable={unavailable} onChange={(entry) => set({ entry })} />
            <RuleSetEditor title="Exit when" note="are true" rules={strategy.exit} max={MAX_EXIT} unavailable={unavailable} onChange={(exit) => set({ exit })} />
            <StopsEditor stops={strategy.stops} onChange={(stops) => set({ stops })} atrUnavailable={unavailable.atrPct ?? null} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void run(where, strategy)} disabled={busy || !strategy.entry.conds.length} className={BTN + " border-accent bg-accent text-bg hover:opacity-90 disabled:opacity-60"}>
                {busy ? "Running…" : "Run backtest"}
              </button>
              {stale && !busy && <span className="text-[11px] text-amber-ink">Rules changed: run to update the results</span>}
            </div>
          </Panel>

          <SavedPanel saved={saved} current={here?.id ?? null} onOpen={(s) => (locked ? s.scope !== where.scope || s.target !== where.target ? elsewhere({ scope: s.scope, target: s.target }, s.strategy, false) : go(where, s.strategy) : go({ scope: s.scope, target: s.target }, s.strategy))} onAlerts={toggleAlerts} onDelete={setDeleting} />

          {stockAnswer && (
            <Panel title={`Readings now · ${stockAnswer.ticker} · ${fmtDay(stockAnswer.lastDay, { short: true })} close`} info={
                <>
                  Each indicator on the last close; + adds it to the entry rules. Trend percentile here is the one every page shows; a backtest ranks each past day from stored prices, which can differ by a point or two.{" "}
                  <Link href="/signals/indicators" className="font-semibold text-accent underline">
                    Indicators guide
                  </Link>
                </>
              } bodyClassName="overflow-x-auto">
              <Readings answer={stockAnswer} onAdd={addReading} full={strategy.entry.conds.length >= MAX_ENTRY} />
            </Panel>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-soft">
        Past prices only: no taxes, dividends not added, costs as set above. Rules describe what prices did; they are not buy or sell calls. A research tool, not investment advice.
      </p>

      <ConfirmDialog open={!!deleting} title="Delete saved signal?" confirmLabel="Delete" danger onConfirm={() => void remove()} onCancel={() => setDeleting(null)}>
        The saved rules for {deleting?.name} and their email alert are removed. This can&rsquo;t be undone.
      </ConfirmDialog>
    </div>
  );
}
