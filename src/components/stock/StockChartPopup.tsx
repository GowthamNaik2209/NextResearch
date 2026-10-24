"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CloseButton, ModalShell } from "./StockModal";
import { PriceTag } from "./PriceTag";
import { freshQuote, mergeStats } from "./merge";
import { useStockData } from "./useStockData";

// lightweight-charts loads with the pop-up, not with the Analysis page.
const ChartView = dynamic(() => import("./ChartView").then((m) => m.ChartView), {
  ssr: false,
  loading: () => <ChartLoading />,
});

/** One industry or policy in the picker: its layers (in the map's order) and listed stocks, biggest first. */
export type ChartPickerIndustry = {
  slug: string;
  name: string;
  category: "sector" | "policy";
  layers: string[];
  /** `core`: the industry is the company's main one (a picker opens on a core stock, not on a
   * conglomerate that is only a supplier here). */
  stocks: { ticker: string; name: string; layer: string; core: boolean }[];
};

// The stock a list opens on: its biggest core company, else its biggest.
const firstPick = (list: ChartPickerIndustry["stocks"]) => (list.find((s) => s.core) ?? list[0])?.ticker ?? "";

// Plot height in this pop-up: shorter than the stock pop-up's, as the dropdowns sit above it.
const PLOT_HEIGHT = "h-[34vh] min-h-[200px] sm:h-[min(340px,34vh)]";

// The stock lists come with the page on a ?view=charts link, else from /docs/baskets the first time
// a Charts button is pressed; one request per visit, retried after a failure.
let industriesReq: Promise<ChartPickerIndustry[]> | null = null;
function fetchIndustries(): Promise<ChartPickerIndustry[]> {
  industriesReq ??= fetch("/docs/baskets")
    .then((r) => (r.ok ? (r.json() as Promise<ChartPickerIndustry[]>) : Promise.reject(new Error(String(r.status)))))
    .catch((e) => {
      industriesReq = null;
      throw e;
    });
  return industriesReq;
}

const ALL = "";

// The Analysis cards' Charts pop-up: a single stock's price chart (the stock pop-up's Chart tab),
// picked by industry, then layer, then stock. Basket-level analysis (backtest, projections) lives
// in Baskets; the footer links there.
export function StockChartPopup({
  initialSlug,
  initialIndustries,
  order,
  onSlug,
  onClose,
}: {
  initialSlug?: string;
  initialIndustries?: ChartPickerIndustry[];
  /** Industry slugs in the cards' order, so the Industry dropdown lists them the same way. */
  order?: string[];
  /** Told the industry on show, so the page can keep `?sector=` in step. */
  onSlug?: (slug: string) => void;
  onClose: () => void;
}) {
  const [industries, setIndustries] = useState<ChartPickerIndustry[] | null>(initialIndustries ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (industries) return;
    let live = true;
    fetchIndustries().then(
      (d) => live && setIndustries(d),
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, [industries]);

  return (
    <ModalShell label="Stock charts" onClose={onClose}>
      {(closeRef) =>
        industries?.length ? (
          <Picker industries={sorted(industries, order)} initialSlug={initialSlug} onSlug={onSlug} closeRef={closeRef} onClose={onClose} />
        ) : (
          <>
            <div className="flex flex-none items-center gap-3 border-b border-line bg-panel px-4 py-4 sm:px-6">
              <h2 className="min-w-0 flex-1 font-display text-base font-bold sm:text-xl">Stock charts</h2>
              <CloseButton closeRef={closeRef} onClose={onClose} />
            </div>
            <div className="p-4 sm:p-6">
              {failed ? (
                <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">The stock lists couldn&rsquo;t load. Check your connection and try again.</p>
              ) : (
                <ChartLoading />
              )}
            </div>
          </>
        )
      }
    </ModalShell>
  );
}

function Picker({
  industries,
  initialSlug,
  onSlug,
  closeRef,
  onClose,
}: {
  industries: ChartPickerIndustry[];
  initialSlug?: string;
  onSlug?: (slug: string) => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [slug, setSlug] = useState(() => (industries.some((x) => x.slug === initialSlug) ? initialSlug! : industries[0].slug));
  const [layer, setLayer] = useState(ALL);
  const ind = industries.find((x) => x.slug === slug) ?? industries[0];
  const inLayer = layer === ALL ? ind.stocks : ind.stocks.filter((s) => s.layer === layer);
  const [ticker, setTicker] = useState(() => firstPick(inLayer));
  const stock = inLayer.find((s) => s.ticker === ticker) ?? inLayer[0];
  const { data } = useStockData(stock?.ticker ?? "", !!stock);
  const quote = freshQuote(data?.quote);

  useEffect(() => onSlug?.(ind.slug), [ind.slug, onSlug]);

  // A new industry starts on all its layers and its biggest stock; a new layer on that layer's biggest.
  const pickIndustry = (s: string) => {
    const next = industries.find((x) => x.slug === s);
    setSlug(s);
    setLayer(ALL);
    setTicker(firstPick(next?.stocks ?? []));
  };
  const pickLayer = (l: string) => {
    setLayer(l);
    setTicker(firstPick(l === ALL ? ind.stocks : ind.stocks.filter((s) => s.layer === l)));
  };

  // The full stock pop-up (Summary, News, Fundamentals) opens through ?stock= like any company link,
  // on its own history entry so closing it steps back. This entry first drops ?view=charts, so the
  // step back lands on a URL that matches the page (this pop-up is closed by then).
  const openDetails = () => {
    if (!stock) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("sector");
    window.history.replaceState(window.history.state, "", url);
    url.searchParams.set("stock", stock.ticker);
    onClose();
    window.history.pushState({ nrStock: true }, "", url);
  };

  const sectors = industries.filter((x) => x.category !== "policy");
  const policies = industries.filter((x) => x.category === "policy");
  const count = (l: string) => ind.stocks.filter((s) => s.layer === l).length;
  const select = "w-full min-w-0 truncate rounded-lg border border-line bg-panel px-3 py-1.5 text-base font-semibold text-ink sm:py-2 sm:text-sm";
  const label = "flex min-w-0 flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft";

  return (
    <>
      <div className="flex flex-none items-start gap-3 border-b border-line bg-panel px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="min-w-0 break-words font-display text-base font-bold leading-snug sm:text-xl">{stock?.name ?? ind.name}</h2>
          {stock && (
            <p className="mt-0.5 truncate text-xs text-ink-soft">
              <span className="font-mono">
                {quote?.exchange ?? "NSE"}: {stock.ticker}
              </span>
              <span> · {stock.layer}</span>
            </p>
          )}
        </div>
        {stock && <PriceTag price={mergeStats(undefined, data).price} quote={quote} />}
        <CloseButton closeRef={closeRef} onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {/* Phones: Industry on its own row, Layer and Stock side by side, so the chart starts in view. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-3">
          <label className={label + " col-span-2 sm:col-span-1"}>
            Industry
            <select value={ind.slug} onChange={(e) => pickIndustry(e.target.value)} className={select}>
              <optgroup label="Industries">
                {sectors.map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
              {policies.length > 0 && (
                <optgroup label="Policies">
                  {policies.map((x) => (
                    <option key={x.slug} value={x.slug}>
                      {x.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <label className={label}>
            Layer
            <select value={layer} onChange={(e) => pickLayer(e.target.value)} className={select}>
              <option value={ALL}>All layers ({ind.stocks.length})</option>
              {ind.layers.map((l) => (
                <option key={l} value={l}>
                  {l} ({count(l)})
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Stock
            <select value={stock?.ticker ?? ""} onChange={(e) => setTicker(e.target.value)} className={select} disabled={!stock}>
              {inLayer.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          {stock ? (
            <ChartView key={stock.ticker} ticker={stock.ticker} quote={quote} height={PLOT_HEIGHT} />
          ) : (
            <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-ink-soft">No listed stocks here yet.</p>
          )}
        </div>
      </div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-line bg-panel px-4 py-2.5 text-xs font-semibold sm:px-6 sm:py-3">
        {stock ? (
          <button type="button" onClick={openDetails} className="text-left text-accent hover:underline pointer-coarse:min-h-9">
            <span className="sm:hidden">Stock details</span>
            <span className="hidden sm:inline">Full stock details</span> &rarr;
          </button>
        ) : (
          <span />
        )}
        <Link
          href={`/baskets/industry/${ind.slug}`}
          title={`${ind.name} basket: backtest and projections`}
          className="text-right text-ink-soft hover:text-accent hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-9 pointer-coarse:items-center"
        >
          Industry basket analysis &rarr;
        </Link>
      </div>
    </>
  );
}

function sorted(list: ChartPickerIndustry[], order?: string[]) {
  if (!order) return list;
  const at = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
  return [...list].sort((a, b) => at(a.slug) - at(b.slug));
}

function ChartLoading() {
  return (
    <div role="status" className="flex h-[34vh] min-h-[200px] items-center justify-center gap-3 rounded-2xl border border-line bg-panel text-sm text-ink-soft sm:h-[min(340px,34vh)]">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      Loading chart&hellip;
    </div>
  );
}
