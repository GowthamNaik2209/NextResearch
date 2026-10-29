import { test } from "node:test";
import assert from "node:assert/strict";
import { windowMoves } from "./episodes";

const at = (key: string, day: string, close: number) => ({ key, day: new Date(`${day}T00:00:00Z`), close });

test("an episode's move is close to close inside the window, only for stocks trading through it", () => {
  const w = { from: "2020-02-20", to: "2020-03-23" };
  const m = windowMoves(
    [at("A", "2020-02-20", 100), at("LATE", "2020-03-10", 50), at("TMPV", "2020-02-20", 10)],
    [at("A", "2020-03-23", 70), at("LATE", "2020-03-23", 40), at("TMPV", "2020-03-23", 5)],
    w,
  );
  assert.equal(m.get("A")!.toFixed(1), "-30.0");
  assert.ok(!m.has("LATE"), "listed after the window opened");
  assert.ok(!m.has("TMPV"), "before its history cut (the Oct 2025 demerger)");
});
