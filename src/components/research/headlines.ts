// Action titles ("the one-sentence takeaway") for the research-deck slides, derived from each
// deck's data. Kept pure and out of slides.tsx (a client component) so a script can print every
// deck's headlines and check their grammar and logic in one pass - generated copy fails quietly
// otherwise ("1 flags a risk", "4 tailwinds against 5 headwinds ... balanced").
import type { Deck, DeckCompany } from "@/lib/sector-content/reports";
import type { PestleKey, SeriesPoint } from "@/lib/sector-content/reports/types";

// Lower-cases a leading capital for mid-sentence use, but leaves acronyms and proper nouns
// that carry further capitals ("AI workloads", "PLI-ACC", "Vodafone Idea") alone.
export const lcFirst = (t: string) => (/^[A-Z][a-z]/.test(t) && !/^[A-Z][a-z]+ [A-Z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
export const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// Small counts read better as words in a headline ("one flags a risk", not "1 flags a risk").
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const countWord = (n: number) => WORDS[n] ?? String(n);
export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const pluralWord = (n: number, one: string, many = one + "s") => `${countWord(n)} ${n === 1 ? one : many}`;
const capFirst = (t: string) => t[0].toUpperCase() + t.slice(1);

// Fiscal/calendar year from a chart label ("FY26", "FY26BE", "2030P") for growth maths and spacing.
export const yearOf = (label: string) => {
  const m = label.match(/(\d{4}|\d{2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n < 100 ? 2000 + n : n;
};

export function growthLine(points: SeriesPoint[]) {
  const actual = points.filter((p) => !p.projected && p.value > 0);
  const proj = points.filter((p) => p.projected);
  if (actual.length < 2) return null;
  const a = actual[0];
  const b = actual[actual.length - 1];
  const ya = yearOf(a.label);
  const yb = yearOf(b.label);
  const years = ya != null && yb != null && yb > ya ? yb - ya : Math.max(1, actual.length - 1);
  const cagr = (Math.pow(b.value / a.value, 1 / years) - 1) * 100;
  const end = proj[proj.length - 1];
  return { a, b, cagr, end, multiple: b.value / a.value };
}

export function developmentsTitle(deck: Deck) {
  const devs = deck.report.developments;
  const pos = devs.filter((d) => d.impact === "pos").length;
  const neg = devs.filter((d) => d.impact === "neg").length;
  const neutral = devs.length - pos - neg;
  const parts = [pos && plural(pos, "tailwind"), neg && plural(neg, "headwind"), neutral && `${neutral} neutral`].filter((x): x is string => !!x);
  const head = `${plural(devs.length, "recent move")} ${devs.length === 1 ? "is" : "are"} reshaping the industry`;
  // "6 recent moves ...: 6 tailwinds" repeats the count; say "all of them" instead.
  if (devs.length > 1 && (pos === devs.length || neg === devs.length)) return `${head}, all of them ${pos ? "tailwinds" : "headwinds"}`;
  return `${head}: ${listJoin(parts)}`;
}

export function overviewTitle(deck: Deck) {
  const o = deck.report.overview;
  const g = growthLine(o.chart.points);
  if (!g) return o.chart.title;
  // Very high CAGRs come from launch-year bases and read better as a multiple.
  const growth = g.cagr > 100 ? `~${Math.round(g.multiple)}x` : `~${Math.round(g.cagr)}% a year`;
  const proj = g.end && Math.abs(g.end.value / g.b.value - 1) >= 0.15 ? `, with ${g.end.label} projected at ~${(g.end.value / g.b.value).toFixed(1)}x the ${g.b.label} level` : "";
  return `${o.chart.title}: ${growth} from ${g.a.label} to ${g.b.label}${proj}`;
}

export function valueChainTitle(deck: Deck) {
  const chain = deck.report.valueChain;
  const high = chain.filter((s) => s.moat === "high").map((s) => lcFirst(s.stage));
  if (high.length === 0) return `${capFirst(countWord(chain.length))} stages from inputs to end market, each with a distinct margin profile`;
  if (high.length <= 2) {
    // "grid, transformers & switchgear and operators" reads as one list; name comma-laden stages as stages.
    const names = high.some((h) => h.includes(",")) ? listJoin(high.map((h) => `the ${h} stage`)) : listJoin(high);
    return `The strongest moats sit in ${names}, across ${chain.length} stages from inputs to end market`;
  }
  // Comma-laden stage names don't list cleanly.
  if (high.slice(0, 2).some((s) => s.includes(","))) return `${high.length} of ${chain.length} stages carry high moats`;
  return `${high.length} of ${chain.length} stages carry high moats, led by ${listJoin(high.slice(0, 2))}`;
}

export function driversTitle(deck: Deck) {
  const d = deck.report.drivers;
  return `${capFirst(pluralWord(d.length, "structural driver"))} underpin${d.length === 1 ? "s" : ""} growth, starting with ${lcFirst(d[0].title)}`;
}

const PESTLE_KEYS: PestleKey[] = ["political", "economic", "social", "technological", "legal", "environmental"];

export function pestleTitle(deck: Deck) {
  const all = PESTLE_KEYS.flatMap((k) => deck.report.pestle[k]);
  const pos = all.filter((p) => p.impact === "pos").length;
  const neg = all.filter((p) => p.impact === "neg").length;
  const diff = pos - neg;
  // The verdict follows the actual balance: a one- or two-point lead tilts it, a wider one decides it.
  if (diff === 0) return `Tailwinds and headwinds are evenly matched (${pos} each): a balanced external backdrop`;
  if (diff > 0)
    return `${plural(pos, "tailwind")} against ${plural(neg, "headwind")}: ${diff >= 3 ? "a supportive" : "a mildly supportive"} external backdrop`;
  return `${plural(neg, "headwind")} against ${plural(pos, "tailwind")}: ${diff <= -3 ? "a challenging external backdrop" : "a mixed external backdrop that leans cautious"}`;
}

export function beneficiariesTitle(deck: Deck) {
  const core = deck.companies.filter((c) => c.tier === "core").map((c) => c.name);
  const n = deck.companies.length;
  if (!core.length) return `${n} listed companies stand to benefit, ranked by how directly`;
  // Four names read fine in a headline; "and one other" would hide the fourth.
  const named = core.length > 4 ? `${core.slice(0, 3).join(", ")} and ${pluralWord(core.length - 3, "other")}` : listJoin(core);
  return `${named} ${core.length === 1 ? "is" : "are"} the most direct way to own the theme among ${n} listed beneficiaries`;
}

// Revenue CAGR is only meaningful over 3+ reported years; shorter histories show "—" (see DeckCompany.revCagr).
export function scorecardTitle(deck: Deck, rows: DeckCompany[]) {
  const top = rows.find((r) => r.revCagr != null && (r.revStart ?? 0) >= 100) ?? rows.find((r) => r.revCagr != null);
  const best = [...rows].filter((r) => r.roce != null).sort((a, b) => b.roce! - a.roce!)[0];
  if (!top) return "How the beneficiaries compare on growth, margins and valuation";
  // Headline ignores small-base growth (starting revenue under Rs 100 Cr), which reads as a percentage artefact.
  const firstWithCagr = rows.find((r) => r.revCagr != null);
  const lead = (top.revStart ?? 0) >= 100 && firstWithCagr && firstWithCagr.key !== top.key ? "Among companies with a Rs 100 Cr+ revenue base, " : "";
  const roce = best && best.key !== top.key ? `; ${best.name} earns the highest return on capital (${best.roce!.toFixed(0)}% ROCE)` : "";
  return `${lead}${top.name} has grown revenue fastest (~${Math.round(top.revCagr!)}% a year)${roce}`;
}

export function companyNewsTitle(deck: Deck) {
  const total = deck.news.length;
  const pos = deck.news.filter((n) => n.tone === "pos").length;
  const neg = deck.news.filter((n) => n.tone === "neg").length;
  const risk = neg ? `; ${neg === 1 ? "one flags a risk" : `${countWord(neg)} flag risks`}` : "";
  if (pos === 0) return `None of ${total} recent company moves is a clear positive for the industry${risk}`;
  if (pos === total) return `All ${total} recent company moves strengthen the industry`;
  return `${pos} of ${total} recent company moves strengthen the industry${risk}`;
}

export function outlookTitle(deck: Deck) {
  const r = deck.report;
  return `The base case holds unless the biggest risk bites: ${lcFirst((r.risks.find((k) => k.severity === "high") ?? r.risks[0]).risk)}`;
}
