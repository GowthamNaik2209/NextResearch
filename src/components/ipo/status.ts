// The IPO status roll-forward lives with the IPO content (src/lib/ipo-content/status.ts), which
// applies it in listIpos()/listIpoDecks(); re-exported for UI code that needs it directly.
export { istToday, liveIpoStatus } from "@/lib/ipo-content/status";
