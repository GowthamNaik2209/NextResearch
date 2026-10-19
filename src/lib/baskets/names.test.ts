import { test } from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./names";

test("a free name is kept as typed", () => {
  assert.equal(uniqueName("My basket", []), "My basket");
  assert.equal(uniqueName("My basket", ["Other"]), "My basket");
});

test("a taken name gets the lowest free number", () => {
  assert.equal(uniqueName("My basket", ["My basket"]), "My basket 1");
  assert.equal(uniqueName("My basket", ["My basket", "My basket 1"]), "My basket 2");
  assert.equal(uniqueName("My basket", ["My basket", "My basket 2"]), "My basket 1");
});

test("case and outer spaces don't make a name different", () => {
  assert.equal(uniqueName("my BASKET", ["My basket"]), "my BASKET 1");
  assert.equal(uniqueName("My basket", [" my basket "]), "My basket 1");
});

test("a numbered name that is taken counts on from its base", () => {
  assert.equal(uniqueName("My basket 1", ["My basket", "My basket 1"]), "My basket 2");
});

test("a name that is only a number is numbered after itself", () => {
  assert.equal(uniqueName("2026", ["2026"]), "2026 1");
});

test("the numbered name stays within 60 characters", () => {
  const long = "x".repeat(60);
  const out = uniqueName(long, [long]);
  assert.equal(out.length, 60);
  assert.ok(out.endsWith(" 1"));
});

test("a number that is part of the name is kept", () => {
  assert.equal(uniqueName("Top 10", ["Top 10"]), "Top 10 1");
  assert.equal(uniqueName("Nifty 50", ["Nifty 50", "Nifty 50 1"]), "Nifty 50 2");
});
