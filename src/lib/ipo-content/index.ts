// Upcoming-IPO decks: one authored `IpoReport` per company (./<slug>.ts), joined with the sector
// content so a listed peer we already cover opens the regular stock pop-up. `IpoDeck` is plain,
// serializable data for the client slide viewer (components/ipo).
import { companyFinancials, findSupplierByTicker, parseCrore, type SectorSupplier } from "../sector-content";
import type { IpoReport, IpoStage } from "./types";
import { memoByFinancials } from "@/lib/financials/store";
import { istToday, liveIpoStatus } from "./status";
import { jioPlatforms } from "./jio-platforms";
import { nse } from "./nse";
import { zepto } from "./zepto";
import { phonepe } from "./phonepe";
import { manipalHospitals } from "./manipal-hospitals";
import { oyo } from "./oyo";
import { zetwerk } from "./zetwerk";
import { parasHealthcare } from "./paras-healthcare";

export type { IpoReport, IpoStage } from "./types";

const IPOS: IpoReport[] = [zetwerk, jioPlatforms, parasHealthcare, zepto, phonepe, oyo, nse, manipalHospitals];

// Nearest to listing first: open, then dated, then approved, then filed; recent listings last.
const STAGE_ORDER: Record<IpoStage, number> = { open: 0, upcoming: 1, approved: 2, filed: 3, listed: 4 };
const byStage = (a: { status: { stage: IpoStage } }, b: { status: { stage: IpoStage } }) => STAGE_ORDER[a.status.stage] - STAGE_ORDER[b.status.stage];

// The authored stage and chip ("Opens 21 Oct") are written once and go stale; every read rolls them
// forward to `today` (IST) from the dated timeline (liveIpoStatus), keeping the authored ones when
// the timeline has no dated opening, closing or listing to go by.
export function listIpos(today = istToday()): IpoReport[] {
  return IPOS.map((r) => liveIpoStatus(r, today)).sort(byStage);
}

export function getIpo(slug: string, today = istToday()): IpoReport | null {
  const r = IPOS.find((x) => x.slug === slug);
  return r ? liveIpoStatus(r, today) : null;
}

// After the join every peer has all three figures (null when unknown). `asOf` is the shared table's
// date for an NSE peer, the deck's own `asOf` for a peer with no NSE listing.
export type IpoPeer = Omit<IpoReport["peers"][number], "mcapCr" | "revenueCr" | "pe"> & {
  mcapCr: number | null;
  revenueCr: number | null;
  pe: number | null;
  asOf: string;
  supplier: SectorSupplier | null;
};

export type IpoDeck = Omit<IpoReport, "peers"> & { peers: IpoPeer[] };

export function buildIpoDeck(r: IpoReport): IpoDeck {
  return {
    ...r,
    peers: r.peers.map((p) => {
      const f = p.ticker ? companyFinancials(p.ticker) : null;
      const supplier = p.ticker ? findSupplierByTicker(p.ticker) : null;
      if (f) return { ...p, mcapCr: parseCrore(f.mcap), revenueCr: f.rev?.[4] ?? null, pe: f.kpi?.[0] ?? null, asOf: f.asOf ?? r.asOf, supplier };
      return { ...p, mcapCr: p.mcapCr ?? null, revenueCr: p.revenueCr ?? null, pe: p.pe ?? null, asOf: r.asOf, supplier };
    }),
  };
}

// The peer join reads the company table, so it is rebuilt only when new figures are installed; the
// status is rolled forward on every call, as it depends on the day, not the figures.
const joinedDecks = memoByFinancials(() => IPOS.map(buildIpoDeck));

export function listIpoDecks(today = istToday()): IpoDeck[] {
  return joinedDecks().map((d) => liveIpoStatus(d, today)).sort(byStage);
}
