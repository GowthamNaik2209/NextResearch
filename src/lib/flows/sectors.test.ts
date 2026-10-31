import assert from "node:assert/strict";
import { test } from "node:test";
import { SECTOR_SHORT } from "./sectors";

// NSDL's sector names as its fortnightly report prints them (BSE's classification, Oct 2026).
const NSDL = new Set([
  "Automobile and Auto Components", "Capital Goods", "Chemicals", "Construction", "Construction Materials", "Consumer Durables",
  "Consumer Services", "Diversified", "Fast Moving Consumer Goods", "Financial Services", "Forest Materials", "Healthcare",
  "Information Technology", "Media, Entertainment & Publication", "Metals & Mining", "Oil, Gas & Consumable Fuels", "Power", "Realty",
  "Services", "Telecommunication", "Textiles", "Utilities",
]);

test("short sector names are only given for sectors NSDL prints, by their exact names", () => {
  for (const n of Object.keys(SECTOR_SHORT)) assert.ok(NSDL.has(n), `short name for unknown sector "${n}"`);
});
