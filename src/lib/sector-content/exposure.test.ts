import { test } from "node:test";
import assert from "node:assert/strict";
import { getCompanyFootprint, listConnectedCompanies } from "./exposure";
import { listSectors } from "./index";
import { listScenarios, scenarioCompanies, scenarioZoneImpacts } from "./scenarios";

test("a company in several chains gets one entry per sector", () => {
  const fp = getCompanyFootprint("BHARATFORG");
  assert.ok(fp);
  assert.ok(fp.sectors.length >= 3);
  assert.equal(new Set(fp.sectors.map((s) => s.sectorSlug)).size, fp.sectors.length);
});

test("connected list only has multi-sector companies, widest first", () => {
  const list = listConnectedCompanies();
  assert.ok(list.length > 10);
  assert.ok(list.every((c) => c.sectors.length > 1));
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].sectors.length >= list[i].sectors.length);
});

test("every scenario touches real zones and ranks only listed companies", () => {
  for (const sector of listSectors().filter((s) => !s.muted)) {
    const scs = listScenarios(sector.slug);
    assert.ok(scs.length > 0, `${sector.slug} has scenarios`);
    for (const sc of scs) {
      assert.equal(scenarioZoneImpacts(sector, sc).length, sc.impacts.length, `${sc.id} zones resolve`);
      const cos = scenarioCompanies(sector, sc);
      assert.ok(cos.length > 0, `${sc.id} ranks companies`);
      assert.equal(new Set(cos.map((c) => c.key)).size, cos.length, "one row per company");
      for (let i = 1; i < cos.length; i++) assert.ok(cos[i - 1].score >= cos[i].score);
    }
  }
});
