// Basket names stay unique per person: a name already taken gets the lowest free number after
// it ("My basket" → "My basket 1" → "My basket 2"). Compared ignoring case and outer spaces.
const MAX_NAME = 60;
const key = (s: string) => s.trim().toLowerCase();

export function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken.map(key));
  if (!used.has(key(name))) return name;
  // "My basket 1" numbers on from "My basket" (to "My basket 2"), but only when "My basket" is
  // itself taken: a name like "Top 10" keeps its number and becomes "Top 10 1".
  const stripped = name.replace(/\s+\d+$/, "").trim();
  const base = stripped && used.has(key(stripped)) ? stripped : name.trim();
  for (let n = 1; ; n++) {
    const suffix = ` ${n}`;
    const next = base.slice(0, MAX_NAME - suffix.length).trimEnd() + suffix;
    if (!used.has(key(next))) return next;
  }
}
