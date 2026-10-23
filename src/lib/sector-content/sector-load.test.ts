import { test } from "node:test";
import assert from "node:assert/strict";
import { getSector, listSectorSlugs, resolveSupplierKey, tickerForSupplier, companyLinkKey } from "./index";
import { SECTOR_LOADERS, loadSector } from "./sectors/load";

// The explorer loads its sector through sectors/load.ts and the server through the registry
// (products.ts); a sector added to one and not the other would 404 or never load in the browser.
test("the browser loader and the server registry list the same sectors", () => {
  assert.deepEqual(Object.keys(SECTOR_LOADERS).sort(), listSectorSlugs().sort());
});

test("a loaded sector is the registry's sector", async () => {
  for (const slug of listSectorSlugs()) {
    const loaded = await loadSector(slug);
    const server = getSector(slug)!;
    assert.ok(loaded, slug);
    // Same module instance: the same supplier objects (whose figures the browser installs in place).
    assert.equal(loaded.suppliers, server.suppliers, slug);
    assert.equal(loaded.slug, slug);
  }
  assert.equal(await loadSector("no-such-sector"), null);
});

test("retired supplier keys still resolve, to a record linked from the old key's zones", () => {
  const aero = getSector("aerospace")!;
  assert.equal(resolveSupplierKey(aero, "hal_mro"), "hal_prime");
  assert.equal(resolveSupplierKey(aero, "hal_prime"), "hal_prime");
  assert.equal(resolveSupplierKey(aero, "nope"), null);
  assert.equal(resolveSupplierKey(aero, null), null);
  // The MRO zone (where hal_mro used to sit) links the merged record.
  assert.ok(aero.zones.find((z) => z.id === "mro")!.suppliers.some((l) => companyLinkKey(l) === "hal_prime"));
  assert.equal(resolveSupplierKey(getSector("energy")!, "bhelHydro"), "bhel");
});

test("one supplier record per company within a sector", () => {
  for (const slug of listSectorSlugs()) {
    const seen = new Map<string, string>();
    for (const [key, sup] of Object.entries(getSector(slug)!.suppliers)) {
      const t = tickerForSupplier(sup);
      assert.ok(!seen.has(t), `${slug}: ${t} has two records (${seen.get(t)}, ${key}) - merge them and add a keyAliases entry`);
      seen.set(t, key);
    }
  }
});
