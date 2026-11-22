import { test } from "node:test";
import assert from "node:assert/strict";
import { signedNum } from "./format";

test("signedNum: a typographic minus, and never a negative zero", () => {
  assert.equal(signedNum(-0.04, 1), "0.0");
  assert.equal(signedNum(-0.0), "0.0");
  assert.equal(signedNum(0.31, 1), "+0.3");
  assert.equal(signedNum(-1.26, 1), "−1.3");
  assert.equal(signedNum(null), "—");
});
