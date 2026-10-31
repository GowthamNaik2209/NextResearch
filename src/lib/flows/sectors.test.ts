import assert from "node:assert/strict";
import { test } from "node:test";
import { listSectorSlugs } from "@/lib/sector-content";
import { NSDL_SECTORS, SECTOR_SHORT } from "./sectors";

// NSDL's sector names as its fortnightly report prints them (BSE's classification, Oct 2026).
const NSDL = new Set([
  "Automobile and Auto Components", "Capital Goods", "Chemicals", "Construction", "Construction Materials", "Consumer Durables",
  "Consumer Services", "Diversified", "Fast Moving Consumer Goods", "Financial Services", "Forest Materials", "Healthcare",
  "Information Technology", "Media, Entertainment & Publication", "Metals & Mining", "Oil, Gas & Consumable Fuels", "Power", "Realty",
  "Services", "Telecommunication", "Textiles", "Utilities",
]);

test("every industry, policy and index maps to NSDL sectors by their exact names", () => {
  for (const slug of listSectorSlugs()) assert.ok(slug in NSDL_SECTORS, `${slug} has no NSDL sector mapping`);
  for (const [slug, names] of Object.entries(NSDL_SECTORS)) for (const n of names) assert.ok(NSDL.has(n), `${slug}: "${n}" is not an NSDL sector`);
  for (const n of Object.keys(SECTOR_SHORT)) assert.ok(NSDL.has(n), `short name for unknown sector "${n}"`);
});
