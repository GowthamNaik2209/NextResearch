import Link from "next/link";
import { updatesHref, type UpdatesView } from "./controls";

const VIEWS: { view: UpdatesView; label: string }[] = [
  { view: "news", label: "Updates" },
  { view: "flows", label: "FII / DII" },
];

// Headlines or the FII / DII view, for the industry picked beside it. Links, so each view has its own
// address and the browser's back button returns to the other.
export function ViewSwitch({ view, sector }: { view: UpdatesView; sector?: string }) {
  return (
    <nav aria-label="Updates view" className="ml-auto inline-flex flex-none rounded-full border border-line bg-panel p-[3px]">
      {VIEWS.map((v) => {
        const on = v.view === view;
        return (
          <Link
            key={v.view}
            href={updatesHref({ sector, view: v.view })}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={"tap-y inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold " + (on ? "bg-accent text-bg" : "text-ink-soft hover:text-ink")}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
