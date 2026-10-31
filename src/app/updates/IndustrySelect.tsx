"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatesHref, type UpdatesView } from "./controls";

type Option = { slug: string; name: string; group: "Industries" | "Policies" | "Indices" };

// The industry picker on /updates: a native select (a phone opens its own picker, which shows the
// long names in full). Picking one reloads the page for it in place; without JavaScript the form's
// Show button does the same.
export function IndustrySelect({ options, active, view }: { options: Option[]; active?: string; view: UpdatesView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const groups = (["Industries", "Policies", "Indices"] as const).map((g) => [g, options.filter((o) => o.group === g)] as const).filter(([, os]) => os.length > 0);

  return (
    <form method="get" action="/updates" className="relative min-w-0 flex-[1_1_9rem] sm:max-w-sm">
      {view === "flows" && <input type="hidden" name="view" value="flows" />}
      <label htmlFor="sector" className="sr-only">
        Industry
      </label>
      <select
        id="sector"
        name="sector"
        defaultValue={active ?? ""}
        aria-busy={pending}
        onChange={(e) => {
          const sector = e.target.value || undefined;
          start(() => router.replace(updatesHref({ sector, view }), { scroll: false }));
        }}
        className={
          "h-10 w-full cursor-pointer appearance-none truncate rounded-full border border-line bg-panel pl-4 pr-9 text-base font-semibold text-ink hover:border-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm " +
          (pending ? "opacity-70" : "")
        }
      >
        <option value="">All themes</option>
        {groups.map(([g, os]) => (
          <optgroup key={g} label={g}>
            {os.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-2 w-2 -translate-y-[70%] rotate-45 border-b-[1.5px] border-r-[1.5px] border-ink-soft" />
      <noscript>
        <button type="submit" className="mt-2 inline-flex min-h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-bg">
          Show
        </button>
      </noscript>
    </form>
  );
}
