// Prints every IPO deck's generated slide headlines, to proofread them in one pass:
// `npx tsx scripts/print-ipo-headlines.ts`.
import { listIpoDecks } from "../src/lib/ipo-content";
import { businessTitle, financialsTitle, industryTitle, issueTitle, kpiTitle, peersTitle, proceedsTitle, risksTitle } from "../src/components/ipo/headlines";

for (const d of listIpoDecks()) {
  console.log(`\n${d.slug}`);
  for (const t of [issueTitle, businessTitle, industryTitle, financialsTitle, kpiTitle, proceedsTitle, peersTitle, risksTitle]) console.log("  - " + t(d));
}
