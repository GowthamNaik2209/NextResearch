// Shared by the Connections page (server) and its search box (client): a "use client" module's
// plain functions can't be called while rendering on the server.

import type { SectorCategory } from "@/lib/sector-content/core";

/** One row the Connections page can search: a company on the list, or an industry in its chips. */
export type ConnectionsSearchEntry =
  | { kind: "company"; key: string; label: string; ticker: string; sub: string }
  | { kind: "sector"; key: string; label: string; href: string; sub: string; category: SectorCategory };

/** The list row a company result scrolls to (the page sets this id on each <li>). */
export const connectionRowId = (ticker: string) => `conn-${ticker}`;

/** The tag a result row carries: what the landing search calls the same theme. */
export const connectionKindLabel = (e: ConnectionsSearchEntry) =>
  e.kind === "company" ? "Company" : e.category === "policy" ? "Policy" : e.category === "index" ? "Index" : "Industry";
