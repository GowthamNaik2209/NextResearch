import assert from "node:assert/strict";
import { test } from "node:test";
import { returnToStockPath, safeNext } from "./safe-next";

test("safeNext keeps same-site paths, with or without a query", () => {
  assert.equal(safeNext("/watchlist"), "/watchlist");
  assert.equal(safeNext("/sector/energy-generation?stock=NTPC"), "/sector/energy-generation?stock=NTPC");
  assert.equal(safeNext("/"), "/");
});

test("safeNext rejects anything that could leave the site", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "@evil.com", "evil.com", "/\t/evil.com", "", null, undefined, 42]) {
    assert.equal(safeNext(bad), "/", String(bad));
  }
});

test("returnToStockPath adds the stock param and keeps the existing query", () => {
  assert.equal(returnToStockPath("/sector/ev", "", "TATAMOTORS"), "/sector/ev?stock=TATAMOTORS");
  assert.equal(returnToStockPath("/sector/ev", "?view=map", "M&M"), "/sector/ev?view=map&stock=M%26M");
  assert.equal(returnToStockPath("/", "?stock=OLD", "NEW"), "/?stock=NEW");
});
