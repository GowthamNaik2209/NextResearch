"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { isFollowed, refollowIndustry, subscribeFollows, unfollowIndustry } from "@/components/FollowIndustryButton";
import type { FollowedSector } from "@/lib/follows";

// /watchlist's followed industries: one chip each (opens its page) with an unfollow. The page is
// rendered with the follows as they were on load; an unfollowed chip stays in place, struck through
// with an Undo, until the next load, so nothing jumps under the finger. A ✕ that fails says so.

function useStillFollowed(slugs: string[]): string[] {
  const key = useSyncExternalStore(
    subscribeFollows,
    () => slugs.filter((s) => isFollowed(s) !== false).join(","),
    () => slugs.join(",")
  );
  return key ? key.split(",") : [];
}

export function FollowedChips({ follows }: { follows: FollowedSector[] }) {
  const still = new Set(useStillFollowed(follows.map((f) => f.slug)));
  // Per chip: a ✕ on one chip while another is saving still goes through.
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState(false);
  const act = async (slug: string, on: boolean) => {
    if (busy.has(slug)) return;
    setBusy((b) => new Set(b).add(slug));
    setFailed(false);
    const ok = on ? await refollowIndustry(slug) : await unfollowIndustry(slug);
    if (!ok) setFailed(true);
    setBusy((b) => {
      const next = new Set(b);
      next.delete(slug);
      return next;
    });
  };
  const dropped = follows.length - still.size;
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {follows.map((f) => {
          const on = still.has(f.slug);
          return (
            <li key={f.slug} className={"flex min-h-9 items-center rounded-full border border-btn bg-panel text-sm " + (on ? "" : "opacity-60")}>
              <Link href={`/sector/${f.slug}`} className={"py-1.5 pl-3.5 pr-2 font-semibold text-ink hover:text-accent " + (on ? "" : "line-through")}>
                {f.name}
              </Link>
              <button
                type="button"
                onClick={() => act(f.slug, !on)}
                aria-busy={busy.has(f.slug) || undefined}
                aria-label={on ? `Unfollow ${f.name}` : `Follow ${f.name} again`}
                className="tap-target mr-1 rounded-full px-2 py-1 text-xs text-ink-soft hover:bg-accent/10 hover:text-ink"
              >
                {on ? "✕" : "Undo"}
              </button>
            </li>
          );
        })}
      </ul>
      {dropped > 0 && (
        <p className="mt-2 text-[11px] text-ink-soft">
          News from the {dropped === 1 ? "industry" : "industries"} you just unfollowed drops off when the page reloads.
        </p>
      )}
      {failed && <p role="alert" className="mt-2 text-xs text-danger">Couldn&rsquo;t save that change. Try again in a moment.</p>}
    </div>
  );
}

/** The followed-industries news, hidden once every follow is undone (it updates on the next load). */
export function FollowedNewsGate({ slugs, children }: { slugs: string[]; children: React.ReactNode }) {
  const still = useStillFollowed(slugs);
  if (still.length === 0) return null;
  return <>{children}</>;
}
