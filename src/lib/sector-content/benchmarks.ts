// Market benchmarks for the Analysis page's comparison charts: the Nifty 50, the Sensex and
// each industry's own index. Yahoo keeps full history for only a few NSE sector indices
// (Pharma, IT); for the rest it returns a day or two, so those lines are drawn from an ETF
// that tracks the index (`via`), which follows it to within its small fee drag.
// Industries with no matching index (semiconductors, data centres, telecom, solar) get
// none rather than a loose stand-in. Symbols checked against Yahoo, Oct 2026.
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
};

export function sectorBenchmarks(slug: string): Benchmark[] {
  return (SECTOR_INDEX[slug] ?? []).map((id) => BENCHMARKS[id]);
}

export function getBenchmark(id: string): Benchmark | null {
  return Object.hasOwn(BENCHMARKS, id) ? BENCHMARKS[id as BenchmarkId] : null;
}
