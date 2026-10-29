import type { getPlatformStats } from "@/lib/sector-content/stats";

/** Headline numbers, computed from the sector content (never hand-typed - see getPlatformStats). */
export function StatsStrip({ stats }: { stats: ReturnType<typeof getPlatformStats> }) {
  const items: [number, string][] = [
    [stats.sectors, "industries & policies mapped"],
    // Zones: the systems a map is split into (the 3-5 peel-away layers are something else).
    [stats.zones, "value-chain systems"],
    [stats.companies, "companies profiled"],
    [stats.listed, "listed on Indian exchanges"],
  ];
  return (
    <div className="border-t border-line bg-panel">
      <dl className="mx-auto grid max-w-page grid-cols-2 gap-y-4 px-5 py-6 sm:grid-cols-4">
        {items.map(([n, label]) => (
          <div key={label}>
            <dt className="font-display text-3xl font-bold text-ink">{n}</dt>
            <dd className="text-xs text-ink-soft">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
