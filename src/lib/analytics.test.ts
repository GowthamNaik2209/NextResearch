import { test } from "node:test";
import assert from "node:assert/strict";
import { track } from "./analytics";

type Win = { gtag?: (...a: unknown[]) => void };
const g = globalThis as unknown as { window?: Win };

test("track is a no-op on the server and when the GA tag is not loaded", () => {
  delete g.window;
  assert.doesNotThrow(() => track("view_stock", { ticker: "LT" }));
  g.window = {};
  assert.doesNotThrow(() => track("view_stock", { ticker: "LT" }));
  delete g.window;
});

test("track sends the event to gtag and cuts long values to GA's 100 characters", () => {
  const calls: unknown[][] = [];
  g.window = { gtag: (...a) => calls.push(a) };
  track("search", { result_type: "company", result: "x".repeat(150), term_length: 3 });
  track("create_basket", { stocks: 12 });
  delete g.window;
  assert.equal(calls.length, 2);
  const [kind, name, params] = calls[0] as [string, string, Record<string, string | number>];
  assert.equal(kind, "event");
  assert.equal(name, "search");
  assert.equal(String(params.result).length, 100);
  assert.equal(params.term_length, 3);
  assert.deepEqual(calls[1][2], { stocks: 12 });
});

test("a throwing gtag never breaks the page", () => {
  g.window = { gtag: () => { throw new Error("blocked"); } };
  assert.doesNotThrow(() => track("open_map", { sector: "datacenter", entry: "none" }));
  delete g.window;
});
