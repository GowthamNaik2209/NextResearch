import { test } from "node:test";
import assert from "node:assert/strict";
import { listSectors } from "@/lib/sector-content";
import { cleanPickedFrom } from "./picked-from";

test("pickedFrom keeps only real industry slugs, for the stocks given", () => {
  const slug = listSectors()[0].slug;
  assert.deepEqual(cleanPickedFrom({ A: slug, B: "not-an-industry", C: 7, D: slug }, ["A", "B", "C"]), { A: slug });
  assert.deepEqual(cleanPickedFrom(null, ["A"]), {});
  assert.deepEqual(cleanPickedFrom("ev4w", ["A"]), {});
});
