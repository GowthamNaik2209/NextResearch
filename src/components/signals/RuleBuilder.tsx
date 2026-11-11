"use client";

import { METRICS, METRIC_BY_ID, defaultLevel } from "@/lib/signals/metrics";
import { OPS, STOP_LIMITS, conditionFor, usesMetric, type Condition, type Op, type RuleSet, type Stops } from "@/lib/signals/strategy";
import { MINI_SEG, miniSegBtn } from "@/components/baskets/Panel";
import { MetricInfo, MetricPicker } from "./MetricPicker";

// The Rules panel of the signal backtest: entry and exit conditions (indicator, comparison, a number
// or another indicator of the same kind) and the exit controls. Indicators this stock's prices can't
// give (no high/low for a Screener-priced stock) are listed but can't be picked. Each indicator has a
// small "i" with its one-line note and a link to the indicators guide.

const FIELD = "min-h-9 rounded border border-line bg-panel-2 px-1.5 font-mono text-xs font-semibold text-ink sm:min-h-8";
const ADD = "inline-flex min-h-9 items-center rounded border border-btn bg-bg px-2 font-mono text-[11px] font-semibold text-accent hover:bg-accent/10 disabled:opacity-50 sm:min-h-7";

function ConditionRow({ c, onChange, onRemove, unavailable, n }: { c: Condition; onChange: (c: Condition) => void; onRemove: () => void; unavailable: Record<string, string>; n: number }) {
  const def = METRIC_BY_ID.get(c.m);
  const kind = def?.kind ?? "price";
  const sameKind = METRICS.filter((m) => m.kind === kind && m.id !== c.m);
  const setOp = (op: Op) => {
    if (op === "rising" || op === "falling") return onChange({ m: c.m, op, n: c.n ?? 5 });
    if (op === "within") return onChange({ m: c.m, op, r: c.r ?? sameKind[0]?.id, v: c.op === "within" ? c.v : 2 });
    return onChange({ m: c.m, op, ...(c.r && c.op !== "within" ? { r: c.r } : { v: c.op === "within" || c.v == null ? defaultLevel(kind) : c.v }) });
  };
  const setMetric = (id: string) => {
    const k = METRIC_BY_ID.get(id)?.kind;
    // A second indicator of another kind no longer compares: back to a number.
    if (c.r && METRIC_BY_ID.get(c.r)?.kind !== k) {
      const next = conditionFor(id);
      return onChange(next.m === id ? next : { m: id, op: c.op === "within" ? "above" : c.op, v: defaultLevel(k ?? "pct") });
    }
    onChange({ ...c, m: id });
  };
  const ops = OPS.filter((o) => o.id !== "within" || sameKind.length > 0);
  const vsMetric = !!c.r;
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded border border-line bg-bg p-1.5">
      <MetricPicker label={`Condition ${n}: indicator`} value={c.m} onChange={setMetric} unavailable={unavailable} />
      <MetricInfo id={c.m} />
      <select aria-label={`Condition ${n}: comparison`} value={c.op} onChange={(e) => setOp(e.target.value as Op)} className={FIELD}>
        {ops.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {c.op === "rising" || c.op === "falling" ? (
        <label className="flex items-center gap-1 text-[11px] text-ink-soft">
          <input aria-label={`Condition ${n}: days`} type="number" min={1} max={250} value={c.n ?? 5} onChange={(e) => onChange({ ...c, n: Number(e.target.value) })} className={FIELD + " w-16"} />
          days
        </label>
      ) : (
        <>
          {c.op === "within" && (
            <label className="flex items-center gap-1 text-[11px] text-ink-soft">
              <input aria-label={`Condition ${n}: percent`} type="number" step="0.5" min={0.1} max={50} value={c.v ?? 2} onChange={(e) => onChange({ ...c, v: Number(e.target.value) })} className={FIELD + " w-16"} />% of
            </label>
          )}
          {vsMetric || c.op === "within" ? (
            <>
              <MetricPicker label={`Condition ${n}: compared with`} value={c.r ?? sameKind[0]?.id ?? ""} onChange={(r) => onChange({ ...c, r })} kind={kind} exclude={c.m} unavailable={unavailable} />
              {c.r && c.r !== "close" && <MetricInfo id={c.r} />}
            </>
          ) : (
            <input aria-label={`Condition ${n}: level`} type="number" step="any" value={c.v ?? 0} onChange={(e) => onChange({ ...c, v: e.target.value === "" ? 0 : Number(e.target.value) })} className={FIELD + " w-20"} />
          )}
          {usesMetric(c.op) && c.op !== "within" && sameKind.length > 0 && (
            <button
              type="button"
              onClick={() => onChange(vsMetric ? { m: c.m, op: c.op, v: defaultLevel(kind) } : { m: c.m, op: c.op, r: sameKind.find((m) => !unavailable[m.id])?.id ?? sameKind[0].id })}
              className={ADD}
              title={vsMetric ? "Compare with a number instead" : "Compare with another indicator instead"}
            >
              {vsMetric ? "vs number" : "vs indicator"}
            </button>
          )}
        </>
      )}
      <button type="button" onClick={onRemove} aria-label={`Remove condition ${n}`} className="ml-auto inline-flex min-h-9 min-w-9 items-center justify-center rounded border border-btn text-ink-soft hover:text-ink sm:min-h-7 sm:min-w-7">
        ×
      </button>
    </li>
  );
}

export function RuleSetEditor({ title, rules, onChange, max, unavailable, note }: { title: string; rules: RuleSet; onChange: (r: RuleSet) => void; max: number; unavailable: Record<string, string>; note: string }) {
  const firstFree = METRICS.find((m) => !unavailable[m.id] && m.id === "rsi14")?.id ?? "rsi14";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{title}</span>
        <div className={MINI_SEG} role="group" aria-label={`${title}: how conditions join`}>
          <button type="button" aria-pressed={rules.all} onClick={() => onChange({ ...rules, all: true })} className={miniSegBtn(rules.all)}>
            All
          </button>
          <button type="button" aria-pressed={!rules.all} onClick={() => onChange({ ...rules, all: false })} className={miniSegBtn(!rules.all)}>
            Any
          </button>
        </div>
        <span className="text-[11px] text-ink-soft">{note}</span>
      </div>
      {rules.conds.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {rules.conds.map((c, i) => (
            <ConditionRow
              key={i}
              n={i + 1}
              c={c}
              unavailable={unavailable}
              onChange={(next) => onChange({ ...rules, conds: rules.conds.map((x, j) => (j === i ? next : x)) })}
              onRemove={() => onChange({ ...rules, conds: rules.conds.filter((_, j) => j !== i) })}
            />
          ))}
        </ol>
      )}
      <div>
        <button type="button" disabled={rules.conds.length >= max} onClick={() => onChange({ ...rules, conds: [...rules.conds, conditionFor(firstFree)] })} className={ADD}>
          + Add condition
        </button>
      </div>
    </div>
  );
}

const STOP_ROWS: { key: keyof Stops; label: string; unit: string; def: number; step: number }[] = [
  { key: "trail", label: "Trailing stop", unit: "% below the highest close", def: 15, step: 1 },
  { key: "loss", label: "Stop loss", unit: "% below entry", def: 8, step: 1 },
  { key: "atr", label: "ATR stop", unit: "× ATR 22 below the highest close", def: 3, step: 0.5 },
  { key: "profit", label: "Take profit", unit: "% above entry", def: 40, step: 5 },
  { key: "days", label: "Time stop", unit: "trading days", def: 120, step: 10 },
];

export function StopsEditor({ stops, onChange, atrUnavailable }: { stops: Stops; onChange: (s: Stops) => void; atrUnavailable: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Exit controls · checked every close</span>
      {STOP_ROWS.map((r) => {
        const on = stops[r.key] != null;
        const off = r.key === "atr" && !!atrUnavailable;
        return (
          <div key={r.key} className="flex flex-wrap items-center gap-1.5 rounded border border-line bg-bg p-1.5 text-xs">
            <label className="flex min-h-8 items-center gap-1.5 font-semibold text-ink">
              <input
                type="checkbox"
                checked={on}
                disabled={off && !on}
                onChange={(e) => {
                  const next = { ...stops };
                  if (e.target.checked) next[r.key] = r.def;
                  else delete next[r.key];
                  onChange(next);
                }}
                className="size-4 accent-[var(--accent)]"
              />
              {r.label}
            </label>
            <input
              aria-label={`${r.label} value`}
              type="number"
              step={r.step}
              min={STOP_LIMITS[r.key].min}
              max={STOP_LIMITS[r.key].max}
              value={stops[r.key] ?? r.def}
              disabled={!on}
              onChange={(e) => onChange({ ...stops, [r.key]: Number(e.target.value) })}
              className={FIELD + " w-16 disabled:opacity-50"}
            />
            <span className="text-[11px] text-ink-soft">{off ? `n/a: ${atrUnavailable}` : r.unit}</span>
          </div>
        );
      })}
    </div>
  );
}

