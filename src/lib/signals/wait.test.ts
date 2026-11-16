import { test } from "node:test";
import assert from "node:assert/strict";
import { PENDING, waitUpTo } from "./wait";

const later = <T>(v: T, ms: number) => new Promise<T>((r) => setTimeout(() => r(v), ms));

test("a result that comes in time is returned", async () => {
  assert.equal(await waitUpTo(later("panel", 5), 200), "panel");
});

test("a result that takes longer than the wait gives PENDING", async () => {
  assert.equal(await waitUpTo(later("panel", 200), 5), PENDING);
});

test("the nightly check's longer wait gets a panel the page's 25 s would give up on", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const slow = new Promise<string>((r) => setTimeout(() => r("panel"), 60_000));
  const page = waitUpTo(slow, 25_000);
  const nightly = waitUpTo(slow, 200_000);
  t.mock.timers.tick(60_000);
  assert.equal(await page, PENDING);
  assert.equal(await nightly, "panel");
});
