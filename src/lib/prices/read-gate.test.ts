import { test } from "node:test";
import assert from "node:assert/strict";
import { createReadGate, ReadTimedOut, StorePaused } from "./read-gate";

// A read the test settles by hand.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("no more than atOnce reads run; the next starts when one ends", async () => {
  const gate = createReadGate({ atOnce: 2, timeoutMs: 1000, pauseMs: 1000, holdMaxMs: 5000 });
  const reads = [deferred<number>(), deferred<number>(), deferred<number>()];
  let started = 0;
  const runs = reads.map((d) => gate.run(() => (started++, d.promise)));
  await tick();
  assert.equal(started, 2);
  assert.equal(gate.waiting, 1);
  reads[0].resolve(1);
  await tick();
  assert.equal(started, 3);
  reads[1].resolve(2);
  reads[2].resolve(3);
  assert.deepEqual(await Promise.all(runs), [1, 2, 3]);
  assert.equal(gate.running, 0);
});

test("a timed-out read keeps its turn until its query really ends", async () => {
  const gate = createReadGate({ atOnce: 1, timeoutMs: 20, pauseMs: 0, holdMaxMs: 5000 });
  const slow = deferred<string>();
  await assert.rejects(gate.run(() => slow.promise), ReadTimedOut);
  // The caller has given up, but the query is still running: no second read may start yet.
  assert.equal(gate.running, 1);
  let started = false;
  const next = gate.run(async () => ((started = true), "next"));
  await tick();
  assert.equal(started, false);
  slow.resolve("late");
  assert.equal(await next, "next");
  assert.equal(started, true);
  assert.equal(gate.running, 0);
});

test("after a timeout the gate pauses: waiting reads and new reads give up at once", async () => {
  let now = 0;
  const gate = createReadGate({ atOnce: 1, timeoutMs: 20, pauseMs: 60_000, holdMaxMs: 5000, now: () => now });
  const slow = deferred<string>();
  const first = gate.run(() => slow.promise);
  let queuedRan = false;
  const queued = gate.run(async () => ((queuedRan = true), "x"));
  await assert.rejects(first, ReadTimedOut);
  await assert.rejects(queued, StorePaused);
  assert.equal(queuedRan, false);
  assert.equal(gate.paused(), true);
  await assert.rejects(gate.run(async () => "y"), StorePaused);
  // The pause ends; the slow query has ended too, so reads flow again.
  slow.resolve("late");
  await tick();
  now = 60_001;
  assert.equal(gate.paused(), false);
  assert.equal(await gate.run(async () => "z"), "z");
});

test("a query that never answers gives its turn back after holdMaxMs", async () => {
  const gate = createReadGate({ atOnce: 1, timeoutMs: 10, pauseMs: 0, holdMaxMs: 40 });
  await assert.rejects(gate.run(() => new Promise<never>(() => {})), ReadTimedOut);
  assert.equal(gate.running, 1);
  await wait(60);
  assert.equal(gate.running, 0);
  assert.equal(await gate.run(async () => 7), 7);
});

test("a second timeout during a pause extends it", async () => {
  let now = 0;
  const gate = createReadGate({ atOnce: 2, timeoutMs: 20, pauseMs: 1000, holdMaxMs: 5000, now: () => now });
  const a = gate.run(() => new Promise<never>(() => {}));
  await tick();
  now = 5;
  const b = gate.run(() => new Promise<never>(() => {}));
  await assert.rejects(a, ReadTimedOut);
  await assert.rejects(b, ReadTimedOut);
  now = 1004; // past the first pause, inside the second
  assert.equal(gate.paused(), true);
});

test("a waiter is let in when a hung query's turn is given back by holdMaxMs", async () => {
  const gate = createReadGate({ atOnce: 1, timeoutMs: 80, pauseMs: 0, holdMaxMs: 30 });
  const hung = gate.run(() => new Promise<never>(() => {}));
  const next = gate.run(async () => "in");
  // In at 30 ms, before the hung read's own 80 ms deadline.
  assert.equal(await next, "in");
  await assert.rejects(hung, ReadTimedOut);
});

test("a failing read hands its turn on and passes the error through without pausing", async () => {
  const gate = createReadGate({ atOnce: 1, timeoutMs: 1000, pauseMs: 60_000, holdMaxMs: 5000 });
  await assert.rejects(gate.run(async () => { throw new Error("boom"); }), /boom/);
  await assert.rejects(gate.run(() => { throw new Error("sync boom"); }), /sync boom/);
  assert.equal(gate.paused(), false);
  assert.equal(gate.running, 0);
  assert.equal(await gate.run(async () => 1), 1);
});
