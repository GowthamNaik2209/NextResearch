// Prints the validation problems of one IPO deck (or all): `npx tsx scripts/check-ipo.ts [slug]`.
import { listIpos } from "../src/lib/ipo-content";
import { validateIpo } from "../src/lib/ipo-content/validate";

const only = process.argv[2];
let bad = 0;
for (const r of listIpos()) {
  if (only && r.slug !== only) continue;
  const problems = validateIpo(r);
  bad += problems.length;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${r.slug}`);
  for (const m of problems) console.log(`     - ${m}`);
}
process.exit(bad ? 1 : 0);
