// The "Ask NextResearch" assistant: a few suggested questions for the page you are on, each
// answered from the authored content and the one FIN table - so the answers carry the same figures
// as the rest of the site, and a new sector, company or IPO gets its questions with no extra work.
// The code-written answer is always available; the optional AI layer (./ai.ts) only rephrases an
// answer's `facts` and is thrown away if it brings in a number that is not in them.
import { companyFinancials, getSector, listSectors } from "../sector-content";
import { getCompanyPage, primaryAppearance } from "../sector-content/companies";
import { CORE_CENTRALITY, listCompanyMetrics, sectorCompanyMetrics, sectorNumbers, type CompanyMetrics } from "../sector-content/insights";
import { getPlatformStats } from "../sector-content/stats";
import { getIpo, listIpos } from "../ipo-content";

export type AssistantQuestion = {
  id: string;
  q: string;
  // The code-written answer, shown as is when there is no AI and as the fallback.
  a: string;
  // Plain fact lines handed to the AI writer; every number it may use appears here.
  facts: string[];
};

export type AssistantContext = {
  // platform | ipos | sector:<slug> | company:<slug> | ipo:<slug>
  key: string;
  // What the panel says it is about: "Defence", "HAL", "NextResearch".
  title: string;
  asOf: string | null;
  questions: AssistantQuestion[];
};

const crore = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")} Cr`;
// One decimal, no trailing ".0" (so "18" rather than "18.0").
const dec = (n: number) => String(Number(n.toFixed(1)));
const signed = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(Math.round(n))}%`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const ask = (id: string, q: string, a: string, facts: string[] = [a]): AssistantQuestion => ({ id, q, a, facts });

// Which context a page gets. Pop-ups opened by a query (?ipo=, ?report=, charts' ?sector=) win,
// because that is what the reader is looking at.
export function contextKeyForPath(pathname: string, params: URLSearchParams): string {
  const ipo = params.get("ipo");
  if (ipo && getIpo(ipo)) return `ipo:${ipo}`;
  const report = params.get("report") ?? (params.get("view") === "charts" ? params.get("sector") : null);
  if (report && getSector(report)) return `sector:${report}`;
  const [, first, slug] = pathname.split("/");
  if (first === "sector" && slug) return `sector:${slug}`;
  if (first === "company" && slug) return `company:${slug}`;
  if (first === "ipos") return "ipos";
  return "platform";
}

export function buildContext(key: string): AssistantContext | null {
  const [kind, slug] = key.split(":");
  if (kind === "platform" && !slug) return platformContext();
  if (kind === "ipos" && !slug) return iposContext();
  if (kind === "sector" && slug) return sectorContext(slug);
  if (kind === "company" && slug) return companyContext(slug);
  if (kind === "ipo" && slug) return ipoContext(slug);
  return null;
}

// ---- Whole platform (landing page and every page without its own context) ----

function topMovers(n: number): CompanyMetrics[] {
  return listCompanyMetrics()
    .filter((c) => c.cagr1y != null && !c.outlier)
    .sort((a, b) => b.cagr1y! - a.cagr1y!)
    .slice(0, n);
}

function commonAsOf(tickers: string[]): string | null {
  return tickers.map((t) => companyFinancials(t)?.asOf).find(Boolean) ?? null;
}

function upcomingIpos() {
  return listIpos().filter((r) => r.status.stage !== "listed");
}

function upcomingIposQuestion(): AssistantQuestion {
  const ipos = upcomingIpos();
  return ask(
    "upcoming-ipos",
    "Which IPOs are coming up?",
    ipos.length
      ? `${plural(ipos.length, "IPO")} on our list: ${ipos.map((r) => `${r.name} (${r.status.label})`).join("; ")}. Each has a 10-slide deck on the IPOs page.`
      : "There are no upcoming IPOs on our list right now.",
  );
}

function platformContext(): AssistantContext {
  const stats = getPlatformStats();
  const live = listSectors().filter((s) => !s.muted);
  const industries = live.filter((s) => s.category !== "policy").map((s) => s.name);
  const policies = live.filter((s) => s.category === "policy").map((s) => s.name);
  const movers = topMovers(5);
  const asOf = commonAsOf(movers.map((m) => m.ticker));
  return {
    key: "platform",
    title: "NextResearch",
    asOf,
    questions: [
      ask(
        "what",
        "What can I do on NextResearch?",
        `NextResearch maps ${plural(industries.length, "industry", "industries")} and ${plural(policies.length, "policy", "policies")} as supply chains, covering ${stats.listed} listed companies. Pick a theme to see who supplies what, open any company for its figures, chart and news, save companies to your watchlist, and build a basket to test how a group of stocks would have done.`,
      ),
      ask("themes", "Which themes are covered?", `Industries: ${list(industries)}.${policies.length ? ` Policies: ${list(policies)}.` : ""}`),
      ask(
        "movers",
        "Which companies rose most over the past year?",
        movers.length
          ? `Biggest 1-year share price gains among the companies we map: ${movers.map((m) => `${m.name} ${signed(m.cagr1y!)}`).join(", ")}${asOf ? ` (as of ${asOf})` : ""}.`
          : "We don't have 1-year price changes for these companies yet.",
      ),
      upcomingIposQuestion(),
    ],
  };
}

function iposContext(): AssistantContext {
  return {
    key: "ipos",
    title: "IPOs",
    asOf: null,
    questions: [
      upcomingIposQuestion(),
      ask(
        "stages",
        "What do the IPO status labels mean?",
        "Filed: the company has sent its draft prospectus (DRHP) to SEBI. Approved: SEBI has cleared it. Upcoming: dates are set. Open: you can apply now. Listed: recently started trading.",
      ),
      ask(
        "deck",
        "What is in each IPO deck?",
        "Ten slides from the offer document: the issue, business, industry, financials, KPIs, use of proceeds and shareholding, peer valuation, strengths and risks, and the outlook with sources.",
      ),
    ],
  };
}

// ---- One industry or policy ----

function sectorContext(slug: string): AssistantContext | null {
  const s = getSector(slug);
  if (!s || s.muted) return null;
  const kind = s.category === "policy" ? "policy" : "industry";
  const cs = sectorCompanyMetrics(slug);
  const core = cs.filter((c) => c.centrality >= CORE_CENTRALITY);
  const n = sectorNumbers(slug);
  // Price moves among the companies the theme is really about (not lenders on its edge), and not
  // ones whose latest year is a one-off.
  const movers = core.filter((c) => !c.outlier && c.cagr1y != null).sort((x, y) => y.cagr1y! - x.cagr1y!);
  const biggest = core.filter((c) => c.mcapCr != null).sort((x, y) => y.mcapCr! - x.mcapCr!).slice(0, 5);
  const pes = core.filter((c) => c.pe != null && c.pe > 0).sort((x, y) => x.pe! - y.pe!);
  const asOf = commonAsOf(cs.map((c) => c.ticker));
  const asOfNote = asOf ? ` (as of ${asOf})` : "";

  const val = [n.medianPe != null ? `a median P/E of ${dec(n.medianPe)}` : null, n.medianRoce != null ? `median ROCE of ${dec(n.medianRoce)}%` : null].filter(
    (x): x is string => !!x,
  );
  const summary = [
    `${s.name} is a${kind === "industry" ? "n" : ""} ${kind} theme with ${plural(cs.length, "listed company", "listed companies")} across ${plural(s.zones.length, "part")} of the chain.`,
    val.length ? `They trade at ${list(val)}.` : "",
    n.combinedRevenueCr != null
      ? `Core companies made ${crore(n.combinedRevenueCr)} in revenue last year${n.medianGrowthPct != null ? `, with median growth of ${dec(n.medianGrowthPct)}%` : ""}.`
      : "",
    movers[0] ? `Best 1-year performer: ${movers[0].name} (${signed(movers[0].cagr1y!)}).` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const best = movers.slice(0, 3);
  // Never repeat a "best" name among the weakest when there are only four or five.
  const worst = movers.slice(Math.max(best.length, movers.length - 3)).reverse();
  const why = (s.whyNow?.length ? s.whyNow : s.thesisSummary ?? []).slice(0, 3);

  const questions = [
    ask("summary", `Summarise ${s.name}`, summary, [`${s.name}: ${s.tagline}`, summary, ...(s.thesisSummary ?? []).slice(0, 2).map((t) => `Thesis: ${t}`)]),
    ...(biggest.length
      ? [ask("biggest", "Who are the biggest companies here?", `By market cap: ${biggest.map((c) => `${c.name} (${crore(c.mcapCr!)})`).join(", ")}${asOfNote}.`)]
      : []),
    ...(best.length
      ? [
          ask(
            "movers",
            "Who did best and worst over the past year?",
            `Best: ${best.map((c) => `${c.name} ${signed(c.cagr1y!)}`).join(", ")}.${worst.length ? ` Weakest: ${worst.map((c) => `${c.name} ${signed(c.cagr1y!)}`).join(", ")}.` : ""} Share price change over 1 year${asOfNote}.`,
          ),
        ]
      : []),
    ...(n.medianPe != null
      ? [
          ask(
            "valuation",
            "How expensive is this theme?",
            [
              `Median P/E is ${dec(n.medianPe)}${n.medianRoce != null ? ` and median ROCE ${dec(n.medianRoce)}%` : ""}.`,
              pes.length > 1 ? `Lowest P/E: ${pes[0].name} (${dec(pes[0].pe!)}). Highest: ${pes[pes.length - 1].name} (${dec(pes[pes.length - 1].pe!)}).` : "",
              n.medianGrowthPct != null ? `Median revenue growth last year was ${dec(n.medianGrowthPct)}%.` : "",
            ]
              .filter(Boolean)
              .join(" "),
          ),
        ]
      : []),
    ...(why.length ? [ask("why", "Why does this theme matter now?", why.map(sentence).join(" "))] : []),
  ];
  return { key: `sector:${slug}`, title: s.name, asOf, questions };
}

// ---- One listed company ----

let metricsByTicker: Map<string, CompanyMetrics> | null = null;
// FY labels for the 5-year revenue/profit arrays (FY22..FY26, see SupplierFinancials).
const FY = ["FY22", "FY23", "FY24", "FY25", "FY26"];

function companyContext(slug: string): AssistantContext | null {
  const page = getCompanyPage(slug);
  if (!page) return null;
  const f = companyFinancials(page.ticker);
  metricsByTicker ??= new Map(listCompanyMetrics().map((m) => [m.ticker, m]));
  const m = metricsByTicker.get(page.ticker);
  const main = primaryAppearance(page);
  const themes = [...new Set(page.appearances.map((x) => x.sectorName))];
  const asOf = f?.asOf ?? null;
  const asOfNote = asOf ? ` (as of ${asOf})` : "";
  const peer = sectorNumbers(main.sectorSlug);

  const val = [f?.mcap ? `market cap ${f.mcap}` : null, m?.pe != null ? `P/E ${dec(m.pe)}` : null, m?.roce != null ? `ROCE ${dec(m.roce)}%` : null].filter(
    (x): x is string => !!x,
  );
  const summary = [
    sentence(`${page.name} (NSE: ${page.ticker}): ${main.role} in ${main.sectorName}${themes.length > 1 ? `, and mapped in ${plural(themes.length - 1, "other theme")}` : ""}`),
    val.length ? `${val[0][0].toUpperCase()}${list(val).slice(1)}.` : "",
    m?.revenueCr != null ? `Latest-year revenue ${crore(m.revenueCr)}${m.revGrowthPct != null ? ` (${m.revGrowthPct >= 0 ? "up" : "down"} ${dec(Math.abs(m.revGrowthPct))}%)` : ""}.` : "",
    m?.cagr1y != null ? `Shares ${signed(m.cagr1y)} over 1 year${asOfNote}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Its strongest role in each theme (up to two themes), skipping a role already said: big
  // companies repeat one description across several layers.
  const roles: string[] = [];
  const saidTheme = new Set<string>();
  const saidRole = new Set<string>();
  for (const x of page.appearances.slice().sort((a, b) => b.weight - a.weight)) {
    if (roles.length === 2 || saidTheme.has(x.sectorName) || saidRole.has(x.role)) continue;
    saidTheme.add(x.sectorName);
    saidRole.add(x.role);
    roles.push(`In ${x.sectorName} (${x.zoneLabel}): ${x.role}`);
  }

  const rev = f?.rev ?? [];
  const np = f?.np ?? [];
  const yr = (i: number, arr: (number | null)[]) => (arr.length === FY.length ? FY[i] : `year ${i + 1}`);
  // Years without a figure are null; the sentence needs both ends.
  const [rev0, revN, np0, npN] = [rev[0], rev[rev.length - 1], np[0], np[np.length - 1]];
  const growth =
    rev.length >= 2 && rev0 != null && revN != null
      ? [
          `Revenue went from ${crore(rev0)} in ${yr(0, rev)} to ${crore(revN)} in ${yr(rev.length - 1, rev)}.`,
          np.length >= 2 && np0 != null && npN != null ? `Net profit went from ${crore(np0)} to ${crore(npN)} over the same years.` : "",
          m?.revGrowthPct != null ? `Latest-year revenue growth: ${dec(m.revGrowthPct)}%.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  const valuation =
    m?.pe != null || m?.roce != null
      ? [
          m?.pe != null ? `P/E is ${dec(m.pe)}${peer.medianPe != null ? `, against a median of ${dec(peer.medianPe)} for ${main.sectorName}` : ""}.` : "",
          m?.roce != null ? `ROCE is ${dec(m.roce)}%${peer.medianRoce != null ? ` (theme median ${dec(peer.medianRoce)}%)` : ""}.` : "",
          m?.divYield != null ? `Dividend yield: ${dec(m.divYield)}%.` : "",
          m?.pctFrom52wHigh != null ? `The share price is ${dec(Math.abs(m.pctFrom52wHigh))}% below its 52-week high${asOfNote}.` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  const strengths = main.supplier.strengths?.slice(0, 2) ?? [];
  const risks = main.supplier.risks?.slice(0, 2) ?? [];

  const questions = [
    ask("summary", `Summarise ${page.name}`, summary),
    ask(
      "role",
      "Where does it sit in the supply chain?",
      // The roles name their themes, so only list the ones they leave out.
      [
        `${page.name} is mapped in ${plural(themes.length, "theme")}.`,
        ...roles.map(sentence),
        themes.length > saidTheme.size ? `Also in ${list(themes.filter((t) => !saidTheme.has(t)))}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    ),
    ...(growth ? [ask("growth", "How has it grown?", growth)] : []),
    ...(valuation ? [ask("valuation", "How is it valued?", valuation)] : []),
    ...(strengths.length || risks.length
      ? [
          ask(
            "strengths-risks",
            "What are its strengths and risks?",
            [strengths.length ? `Strengths: ${strengths.map(sentence).join(" ")}` : "", risks.length ? `Risks: ${risks.map(sentence).join(" ")}` : ""].filter(Boolean).join(" "),
          ),
        ]
      : []),
  ];
  return { key: `company:${slug}`, title: page.name, asOf, questions };
}

// ---- One IPO deck ----

function ipoContext(slug: string): AssistantContext | null {
  const r = getIpo(slug);
  if (!r) return null;
  const i = r.issue;
  const questions = [
    ask("summary", `Summarise the ${r.name} IPO`, [sentence(`${r.name} (${r.sectorLabel}): ${r.tagline}`), `Status: ${r.status.label}.`, `Our view: ${sentence(r.stance.line)}`].join(" ")),
    ask(
      "issue",
      "How big is the issue, and when is it?",
      [
        `Issue size: ${i.size}.`,
        i.priceBand ? `Price band: ${i.priceBand}.` : "No price band yet.",
        i.lotSize ? `Lot size: ${i.lotSize}.` : "",
        i.valuation ? `Valuation: ${i.valuation}.` : "",
        sentence(r.status.detail),
      ]
        .filter(Boolean)
        .join(" "),
    ),
    ...(r.risks.length ? [ask("risks", "What are the main risks?", r.risks.slice(0, 3).map((x) => `${x.severity[0].toUpperCase()}${x.severity.slice(1)} risk: ${sentence(x.risk)}`).join(" "))] : []),
    ...(r.valuationNote ? [ask("peers", "How does it compare with listed peers?", sentence(r.valuationNote))] : []),
  ];
  return { key: `ipo:${slug}`, title: `${r.name} IPO`, asOf: r.asOf, questions };
}
