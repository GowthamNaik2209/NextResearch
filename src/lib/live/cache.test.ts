import assert from "node:assert/strict";
import { test } from "node:test";
import { cached, INFLIGHT_MAX_MS } from "./cache";

test("cached() serves repeat calls from memory", async () => {
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cached("t:hit", 60_000, load), 1);
  assert.equal(await cached("t:hit", 60_000, load), 1);
  assert.equal(calls, 1);
});

test("cached() shares one in-flight load between concurrent callers", async () => {
  let calls = 0;
  const load = () => new Promise<number>((resolve) => setTimeout(() => resolve(++calls), 20));
  const [a, b] = await Promise.all([cached("t:inflight", 60_000, load), cached("t:inflight", 60_000, load)]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(calls, 1);
});

test("cached() remembers a failed (null) load for only about a minute, not the full TTL", async () => {
  let calls = 0;
  const load = async () => (++calls === 1 ? null : "recovered");
  assert.equal(await cached("t:null", 6 * 60 * 60 * 1000, load), null);
  // Still within the short failure window: no refetch yet.
  assert.equal(await cached("t:null", 6 * 60 * 60 * 1000, load), null);
  assert.equal(calls, 1);
});

test("cached() does not let a hung load block later callers forever", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  const hung = cached("t:hung", 60_000, () => new Promise<string>(() => {}));
  void hung;
  t.mock.timers.tick(INFLIGHT_MAX_MS + 1);
  assert.equal(await cached("t:hung", 60_000, async () => "fresh"), "fresh");
});
