"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Creates a basket (empty, or from the given stocks) and opens it ready for editing.
export function NewBasketButton({ tickers, name, label, className }: { tickers?: string[]; name?: string; label: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(null);
          const res = await fetch("/api/baskets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickers, name }) }).catch(() => null);
          if (res?.status === 401) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          const json = res ? await res.json().catch(() => null) : null;
          if (res?.ok && json?.id) router.push(`/baskets/${json.id}?edit=1`);
          else {
            setBusy(false);
            setFailed(basketCreateError(json));
          }
        }}
        className={className}
      >
        {busy ? "Creating…" : label}
      </button>
      {failed && <span className="text-xs text-danger">{failed}</span>}
    </span>
  );
}

/** What to tell someone whose new basket wasn't made. */
export function basketCreateError(json: { error?: string; max?: number } | null): string {
  return json?.error === "limit"
    ? `You have ${json.max ?? "the most"} baskets, the limit. Delete one to make another.`
    : "Couldn\u2019t create it right now. Try again.";
}
