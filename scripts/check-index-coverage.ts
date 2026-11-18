// Nifty 500 coverage: what share of the index is in a live module (industry, policy or index) on the
// platform. Run at the start and end of every wave. Read-only, no database.
//
//   npx tsx scripts/check-index-coverage.ts
//   npx tsx scripts/check-index-coverage.ts --industry="Capital Goods"
// With --industry= only that industry's lines print; the final line still reports the whole index.
//
// Source of data/nifty500.csv: https://niftyindices.com/IndexConstituent/ind_nifty500list.csv
// Refresh: download that file over data/nifty500.csv (columns: Company Name,Industry,Symbol,Series,ISIN Code).
// "In a live module" = a listed supplier with a ticker in any non-muted sector of the registry.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { listSectors } from "../src/lib/sector-content/index";
import { indexCoverage, type IndexRow } from "../src/lib/sector-content/index-coverage";

/** One CSV line, honouring double-quoted fields that contain commas. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function main() {
  const lines = readFileSync(resolve(__dirname, "../data/nifty500.csv"), "utf8").split(/\r?\n/).filter((l) => l.trim());
  const head = parseLine(lines[0]);
  const col = (n: string) => head.indexOf(n);
  const [iName, iInd, iSym] = [col("Company Name"), col("Industry"), col("Symbol")];
  if (iName < 0 || iInd < 0 || iSym < 0) throw new Error("data/nifty500.csv: unexpected header " + lines[0]);
  const rows: IndexRow[] = lines.slice(1).map(parseLine).map((f) => ({ name: f[iName], industry: f[iInd], symbol: f[iSym] }));

  const covered = new Set<string>();
  for (const s of listSectors().filter((x) => !x.muted))
    for (const sup of Object.values(s.suppliers)) if (sup.listed && sup.f?.ticker) covered.add(sup.f.ticker);

  const arg = process.argv.find((a) => a.startsWith("--industry="))?.slice("--industry=".length).toLowerCase();
  const r = indexCoverage(rows, covered);
  if (arg && !r.industries.some((i) => i.industry.toLowerCase() === arg)) {
    console.log(`Unknown industry "${arg}". Known: ${r.industries.map((i) => i.industry).sort().join("; ")}`);
    process.exitCode = 1;
    return;
  }
  for (const i of r.industries) {
    if (arg && i.industry.toLowerCase() !== arg) continue;
    console.log(`${i.industry}: ${i.covered}/${i.total}`);
    if (i.missing.length) console.log(`  missing: ${i.missing.join(", ")}`);
  }
  console.log(`Nifty 500 coverage: ${r.covered}/${r.total} (${r.percent}%)`);
}

main();
