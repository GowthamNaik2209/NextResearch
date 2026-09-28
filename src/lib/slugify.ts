export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Matches prisma/seed.ts's synthetic ticker for suppliers with no real stock ticker.
export function syntheticTicker(name: string): string {
  return `UNLISTED_${slugify(name)}`;
}
