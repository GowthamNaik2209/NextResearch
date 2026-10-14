// Validate one sector's research deck in isolation while authoring it:
//   npx tsx scripts/check-report.ts <slug>
import { getSector } from "../src/lib/sector-content/index.js";
import { validateReport } from "../src/lib/sector-content/reports/validate.js";

const slug = process.argv[2];
const sector = slug ? getSector(slug) : null;
if (!sector) {
  console.error("usage: npx tsx scripts/check-report.ts <sector-slug>");
  process.exit(1);
}
import(`../src/lib/sector-content/reports/${slug}.ts`).then((mod) => {
  const problems = validateReport(mod[slug], sector);
  for (const m of problems) console.error(m);
  console.log(problems.length ? `${problems.length} problem(s)` : `${slug}: report OK`);
  process.exit(problems.length ? 1 : 0);
});
