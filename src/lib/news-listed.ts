// Whether a covered company's shares trade yet: the maps' listed flag, or an IPO deck that has
// reached its listing. Used to drop IPO run-up headlines (price band, subscription) once listed.
import { findSupplierByTicker } from "@/lib/sector-content";
import { listIpos } from "@/lib/ipo-content";

export function isListedTicker(ticker: string): boolean {
  if (findSupplierByTicker(ticker)?.listed) return true;
  return listIpos().some((r) => r.ticker === ticker && r.status.stage === "listed");
}
