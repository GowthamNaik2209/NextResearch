// Market benchmarks for the Analysis page's comparison charts: the Nifty 50, the Sensex and
// each industry's own index. Yahoo keeps full history for only a few NSE sector indices
// (Pharma, IT); for the rest it returns a day or two, so those lines are drawn from an ETF
// that tracks the index (`via`), which follows it to within its small fee drag.
// Industries with no matching index (semiconductors, data centres, solar) get none rather
// than a loose stand-in. Telecom and hospitals have NSE indices since Jun 2026 (Nifty
// Telecommunications, Nifty Hospitals) but no Yahoo history or ETF yet; add them once one exists. Capital markets has an index, but its ETF (GROWWCAPM.NS)
// only reaches a year of history in Dec 2026; add it then. Insurance has one too, but its only
// ETF (INSUREIETF.NS) listed Aug 2026; add it from Aug 2027. Chemicals likewise: its ETFs (GROWWCHEM.NS from Jan 2026,
// CHEMICAL.NS from Jul 2026) have under a year, and Yahoo returns one day for the index; add it from Jan 2027. Symbols checked against Yahoo, Nov 2026.
export type Benchmark = { id: string; name: string; symbol: string; via?: string };

export const BENCHMARKS = {
  nifty50: { id: "nifty50", name: "Nifty 50", symbol: "^NSEI" },
  sensex: { id: "sensex", name: "Sensex", symbol: "^BSESN" },
  niftyauto: { id: "niftyauto", name: "Nifty Auto", symbol: "AUTOBEES.NS", via: "Nippon India Nifty Auto ETF" },
  niftyev: { id: "niftyev", name: "Nifty EV & New Age Auto", symbol: "EVINDIA.NS", via: "Mirae Asset Nifty EV and New Age Automotive ETF" },
  niftypharma: { id: "niftypharma", name: "Nifty Pharma", symbol: "^CNXPHARMA" },
  niftyrealty: { id: "niftyrealty", name: "Nifty Realty", symbol: "MOREALTY.NS", via: "Motilal Oswal Nifty Realty ETF" },
  niftydefence: { id: "niftydefence", name: "Nifty India Defence", symbol: "MODEFENCE.NS", via: "Motilal Oswal Nifty India Defence ETF" },
  niftyrailpsu: { id: "niftyrailpsu", name: "Nifty India Railways PSU", symbol: "GROWWRAIL.NS", via: "Groww Nifty India Railways PSU ETF" },
  niftyenergy: { id: "niftyenergy", name: "Nifty Energy", symbol: "MOENERGY.NS", via: "Motilal Oswal Nifty Energy ETF" },
  niftyhealthcare: { id: "niftyhealthcare", name: "Nifty Healthcare", symbol: "HEALTHIETF.NS", via: "ICICI Prudential Nifty Healthcare ETF" },
  niftyinternet: { id: "niftyinternet", name: "Nifty India Internet", symbol: "INTERNET.NS", via: "Mirae Asset Nifty India Internet ETF" },
  niftyit: { id: "niftyit", name: "Nifty IT", symbol: "^CNXIT" },
  niftyfmcg: { id: "niftyfmcg", name: "Nifty FMCG", symbol: "^CNXFMCG" },
  niftyconsumption: { id: "niftyconsumption", name: "Nifty India Consumption", symbol: "^CNXCONSUM" },
  niftymetal: { id: "niftymetal", name: "Nifty Metal", symbol: "^CNXMETAL" },
  niftybank: { id: "niftybank", name: "Nifty Bank", symbol: "BANKBEES.NS", via: "Nippon India ETF Nifty Bank BeES" },
  niftypsubank: { id: "niftypsubank", name: "Nifty PSU Bank", symbol: "PSUBNKBEES.NS", via: "Nippon India ETF Nifty PSU Bank BeES" },
  niftytourism: { id: "niftytourism", name: "Nifty India Tourism", symbol: "MOTOUR.NS", via: "Motilal Oswal Nifty India Tourism ETF" },
} satisfies Record<string, Benchmark>;

export type BenchmarkId = keyof typeof BENCHMARKS;

/** Broad-market lines offered on every industry's chart. */
export const MARKET_BENCHMARKS: BenchmarkId[] = ["nifty50", "sensex"];

// Sector slug -> its industry index(es). A sector missing here has no matching index.
const SECTOR_INDEX: Partial<Record<string, BenchmarkId[]>> = {
  ev4w: ["niftyauto", "niftyev"],
  railways: ["niftyrailpsu"],
  naval: ["niftydefence"],
  aerospace: ["niftydefence"],
  energy: ["niftyenergy"],
  realestate: ["niftyrealty"],
  pharma: ["niftypharma"],
  hospitals: ["niftyhealthcare"],
  transmission: ["niftyenergy"],
  consumerinternet: ["niftyinternet"],
  defenceproc: ["niftydefence"],
  rareearth: ["niftymetal"],
  pliacc: ["niftyev", "niftyenergy"],
  greenh2: ["niftyenergy"],
  banks: ["niftybank", "niftypsubank"],
  hotels: ["niftytourism"],
  itservices: ["niftyit"],
  autos: ["niftyauto"],
  fmcg: ["niftyfmcg"],
  consumerbrands: ["niftyconsumption"],
};

export function sectorBenchmarks(slug: string): Benchmark[] {
  return (SECTOR_INDEX[slug] ?? []).map((id) => BENCHMARKS[id]);
}

export function getBenchmark(id: string): Benchmark | null {
  return Object.hasOwn(BENCHMARKS, id) ? BENCHMARKS[id as BenchmarkId] : null;
}
