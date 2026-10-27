// Suggestions for the landing page's search box while the reader types: the pages their words point
// to (companies, themes, IPOs, how-the-site-works topics) and questions worth asking about them,
// which open the assistant. Matching is ./ask.ts's findKeys over our own index, with no model call,
// so it is instant and free on every keystroke; the AI writes the answer once a question is picked.
import { buildSearchIndex, type SearchEntry } from "../sector-content/stats";
import { contextFor, findKeys } from "./ask";
import { guideTopic } from "./guide";

export type Suggestion = {
  questions: string[];
  pages: { key: string; title: string; href: string; kind: "Company" | "Theme" | "IPO" | "Guide" }[];
};

const MAX_QUESTIONS = 4;
const MAX_PAGES = 4;

const KIND: Record<string, Suggestion["pages"][number]["kind"]> = { company: "Company", sector: "Theme", ipo: "IPO", ipos: "IPO", guide: "Guide" };

const hrefOf = (key: string) => {
  const [kind, slug] = key.split(":");
  if (kind === "company") return `/company/${slug}`;
  if (kind === "sector") return `/sector/${slug}`;
  if (kind === "ipo") return `/ipos?ipo=${slug}`;
  if (kind === "ipos") return "/ipos";
  return guideTopic(slug)?.href ?? "/";
};

// The page's own suggested questions say "it" / "here" (asked on that page); from the search box
// they need the name.
function named(q: string, title: string, kind: string): string {
  const out = q
    .replace(/\bits\b/g, `${title}'s`)
    .replace(/\bit\b/g, title)
    .replace(/\bhere\b/g, `in ${title}`);
  // A question that still doesn't say what it's about ("What are the main risks?") gets the name.
  if (out.includes(title)) return out;
  return `${out.replace(/\?$/, "")} ${kind === "Theme" ? "in" : "for"} ${title}?`;
}

export function suggest(term: string, index: SearchEntry[] = buildSearchIndex()): Suggestion {
  const keys = findKeys(term, "platform", index).filter((k) => k !== "platform");
  const pages = keys.slice(0, MAX_PAGES).map((key) => {
    const c = contextFor(key);
    return { key, title: c?.title ?? key, href: hrefOf(key), kind: KIND[key.split(":")[0]] ?? "Guide" };
  });

  const questions: string[] = [];
  const companies = pages.filter((p) => p.kind === "Company");
  if (companies.length >= 2) {
    const [a, b] = companies;
    questions.push(`Compare ${a.title} and ${b.title} on valuation`, `Compare ${a.title} and ${b.title} on growth`);
  }
  for (const p of pages) {
    if (p.kind === "Guide") questions.push(...(guideTopic(p.key.slice(6))?.asks ?? []));
    else for (const q of contextFor(p.key)?.questions.slice(0, 3) ?? []) questions.push(named(q.q, p.title, p.kind));
  }
  return { questions: [...new Set(questions)].slice(0, MAX_QUESTIONS), pages };
}
