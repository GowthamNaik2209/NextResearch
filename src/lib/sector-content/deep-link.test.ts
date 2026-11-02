import assert from "node:assert/strict";
import { test } from "node:test";
import { deepLinkZone } from "./core";

const sector = {
  zones: [
    { id: "cells", suppliers: [{ key: "waaree", exposureType: "direct_supplier", exposureStrength: "medium" }] },
    { id: "modules", suppliers: [{ key: "waaree", exposureType: "direct_supplier", exposureStrength: "high" }, { key: "insolation", exposureType: "direct_supplier", exposureStrength: "medium" }] },
  ],
} as unknown as Parameters<typeof deepLinkZone>[0];

test("a deep link opens its own zone when that zone is valid", () => {
  assert.equal(deepLinkZone(sector, "cells", "waaree"), "cells");
});

test("a bare ?company= link opens the zone of the company's strongest link", () => {
  assert.equal(deepLinkZone(sector, null, "waaree"), "modules");
  assert.equal(deepLinkZone(sector, "no-such-zone", "insolation"), "modules");
});

test("no zone and no known company opens nothing", () => {
  assert.equal(deepLinkZone(sector, null, null), null);
  assert.equal(deepLinkZone(sector, null, "unknown"), null);
});
