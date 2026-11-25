// Prints every IPO deck's generated slide headlines, to proofread them in one pass:
// `npx tsx scripts/print-ipo-headlines.ts`. Peers join the company table, so it is read (read-only)
// from DATABASE_URL first.
import { listIpoDecks } from "../src/lib/ipo-content";
import { businessTitle, financialsTitle, industryTitle, issueTitle, kpiTitle, peersTitle, proceedsTitle, risksTitle } from "../src/components/ipo/headlines";
import { installFinancialsFromDatabase } from "../src/lib/financials/test-db";

installFinancialsFromDatabase().then(() => {
  for (const d of listIpoDecks()) {
    console.log(`\n${d.slug}`);
    for (const t of [issueTitle, businessTitle, industryTitle, financialsTitle, kpiTitle, proceedsTitle, peersTitle, risksTitle]) console.log("  - " + t(d));
  }
  process.exit(0);
});
