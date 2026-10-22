"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  companyLinkExposure,
  companyLinkKey,
  getSector,
  tickerForSupplier,
  EXPOSURE_TYPE_LABEL,
  EXPOSURE_STRENGTH_LABEL,
  type SupplierFinancials,
} from "@/lib/sector-content";
import { installFinancials } from "@/lib/financials/store";
import { listScenarios, scenarioCompanies, scenarioZoneImpacts } from "@/lib/sector-content/scenarios";
import { mountExplorer, type ExplorerController, type ExplorerDom, type ImpactMap } from "./engine";
import { GUIDED_TOUR_ENABLED } from "@/lib/feature-flags";
import { SupplierDetail } from "./SupplierDetail";
import { CompanyComparison } from "./CompanyComparison";
import { WatchlistButton } from "./WatchlistButton";
import { UserMenu } from "@/components/UserMenu";
import { MobileMenu } from "@/components/MobileMenu";
import "./explorer.css";

const TOUR_STEP_MS = 3400;

const noopSubscribe = () => () => {};
// Whether the Web Speech API exists — differs between server (always "no") and
// client, so it's read through useSyncExternalStore (React's sanctioned way to
// pull in a value that can only be known client-side) rather than written via
// setState in an effect, which would just be a same-shaped hydration workaround
// with an extra render instead of none.
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false
  );
}

type Props = {
  slug: string;
  // This sector's company figures by ticker, from the database (the explore page loads them).
  figures: Record<string, SupplierFinancials>;
  userEmail?: string | null;
  displayName?: string | null;
};

export function SectorExplorer({ slug, figures, userEmail = null, displayName = null }: Props) {
  const searchParams0 = useSearchParams();
  // Fill this sector's suppliers (`f`) before anything below reads them. Idempotent (the same
  // figures land in the same places), so running it during render is safe.
  useMemo(() => installFinancials(figures, { partial: true }), [figures]);
  // Looked up here (client bundle) rather than passed as a prop from the server
  // page — the sector object carries three.js geometry-building functions, which
  // can't cross the server/client boundary as React props. The page's own
  // getSector(slug) check (src/app/sector/[slug]/explore/page.tsx) guarantees this exists.
  const sector = getSector(slug)!;

  const stageRef = useRef<HTMLDivElement>(null);
  const leaderSvgRef = useRef<SVGSVGElement>(null);
  const railLeftRef = useRef<HTMLDivElement>(null);
  const railRightRef = useRef<HTMLDivElement>(null);
  const railTopRef = useRef<HTMLDivElement>(null);
  const railBottomRef = useRef<HTMLDivElement>(null);
  const mobileTagsRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const layerButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const controllerRef = useRef<ExplorerController | null>(null);

  const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>(sector.defaultView || sector.views[0]?.id);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  // Phones/tablets: the open sheet starts at a "peek" height so the picked part stays in
  // view above it; it expands to full height on a tap/drag of the handle, on scrolling
  // the panel, or when a company is picked (its details run long).
  const [isSheetFull, setIsSheetFull] = useState(false);
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);
  // Phone: the scenario list collapses behind a dropdown button, like Systems.
  const [isScenarioMenuOpen, setIsScenarioMenuOpen] = useState(false);
  // Phone-only: the Layers / Systems / Camera controls float over the stage (instead of
  // stacking above it and eating vertical space) and open from a button on the stage.
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [deepStage, setDeepStage] = useState<number | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  // False until the engine has drawn its first frames (model built, labels placed). Building a
  // model can take seconds on a phone, and the stage was a blank canvas meanwhile.
  const [isSceneReady, setIsSceneReady] = useState(false);
  const zoneListRef = useRef<HTMLDivElement>(null);
  // Phone/tablet controls overlay: a tap anywhere outside it closes it (not just its own
  // button). When that tap lands on the 3D stage or the bottom sheet it is used up by the
  // close - the rest of that same press (its pointerup/click, or a touch gesture it starts)
  // doesn't also pick a system or step the sheet - however long it's held. Taps elsewhere
  // (header buttons) still go through.
  useEffect(() => {
    if (!isControlsOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || t.closest(".rail, .controls-btn")) return;
      setIsControlsOpen(false);
      if (!t.closest(".stage, .panel-wrap")) return;
      e.stopPropagation();
      const id = e.pointerId;
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      const opts = { capture: true } as const;
      const onTouch = (ev: TouchEvent) => ev.stopPropagation(); // label gestures listen to touch events
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        stop(ev);
        window.removeEventListener("pointerup", onUp, opts);
        window.removeEventListener("pointercancel", onUp, opts);
        window.removeEventListener("touchstart", onTouch, opts);
        window.removeEventListener("touchmove", onTouch, opts);
        // The press's click follows its pointerup straight away; drop just that one.
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, opts), 50);
      };
      window.addEventListener("pointerup", onUp, opts);
      window.addEventListener("pointercancel", onUp, opts);
      window.addEventListener("touchstart", onTouch, opts);
      window.addEventListener("touchmove", onTouch, opts);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsControlsOpen(false);
    window.addEventListener("pointerdown", onDown, { capture: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, [isControlsOpen]);
  const scenarios = listScenarios(slug);
  // Deep link: ?scenario=<id>; an unknown id is ignored.
  const [scenarioId, setScenarioId] = useState<string | null>(() => {
    const id = searchParams0.get("scenario");
    return id && scenarios.some((x) => x.id === id) ? id : null;
  });
  const [isTouring, setIsTouring] = useState(false);
  const [isMuted, setIsMutedState] = useState(false);
  const [tourCaption, setTourCaption] = useState<string | null>(null);
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors `isMuted` for the tour's setTimeout loop (see startTour below) — a
  // plain state read inside that closure would stay stuck at whatever `isMuted`
  // was when the loop started, since the closure isn't re-created per render.
  const isMutedRef = useRef(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deepDive = (sector as any).deepDive as { buttonLabel: string } | undefined;

  const speechSupported = useSpeechSupported();

  const setIsMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    setIsMutedState(muted);
    if (muted && speechSupported) window.speechSynthesis.cancel();
  }, [speechSupported]);

  const stopTour = useCallback(() => {
    if (tourTimerRef.current) {
      clearTimeout(tourTimerRef.current);
      tourTimerRef.current = null;
    }
    if (speechSupported) window.speechSynthesis.cancel();
    setIsTouring(false);
    setTourCaption(null);
  }, [speechSupported]);

  // Cycles the camera through every authored view for this sector, pausing at
  // each one — reuses the same flyTo() the view-grid buttons call manually, just
  // driven by a timer instead of a click. Stops itself if the sector has no views
  // (shouldn't happen — every sector defines at least one) rather than looping forever.
  // Each step also narrates: speaks the view's authored `narration` line via the
  // Web Speech API when unmuted, or shows it as an on-screen caption when muted —
  // same script either way, just two different ways to consume it.
  const startTour = useCallback(() => {
    if (sector.views.length === 0) return;
    controllerRef.current?.selectZone(null);
    setIsTouring(true);
    let i = 0;
    const step = () => {
      const view = sector.views[i % sector.views.length];
      controllerRef.current?.flyTo(view.id);
      setActiveView(view.id);
      const line = view.narration ?? `Now viewing the ${view.label} view of ${sector.name}.`;
      setTourCaption(line);
      let stepDuration = TOUR_STEP_MS;
      if (speechSupported) {
        window.speechSynthesis.cancel();
        if (!isMutedRef.current) {
          const utterance = new SpeechSynthesisUtterance(line);
          window.speechSynthesis.speak(utterance);
          // Give slower/longer lines enough time to finish before the camera
          // moves on, rather than always waiting a fixed, speech-length-agnostic beat.
          stepDuration = Math.min(9000, Math.max(TOUR_STEP_MS, line.length * 65));
        }
      }
      i += 1;
      tourTimerRef.current = setTimeout(step, stepDuration);
    };
    step();
  }, [sector.views, sector.name, speechSupported]);

  useEffect(() => {
    if (
      !stageRef.current ||
      !leaderSvgRef.current ||
      !railLeftRef.current ||
      !railRightRef.current ||
      !railTopRef.current ||
      !railBottomRef.current ||
      !mobileTagsRef.current ||
      !breadcrumbRef.current
    ) {
      return;
    }
    setIsSceneReady(false);
    const dom: ExplorerDom = {
      stage: stageRef.current,
      leaderSvg: leaderSvgRef.current,
      railLeft: railLeftRef.current,
      railRight: railRightRef.current,
      railTop: railTopRef.current,
      railBottom: railBottomRef.current,
      mobileTags: mobileTagsRef.current,
      layerButtons: layerButtonRefs.current,
      breadcrumb: breadcrumbRef.current,
      slider: sliderRef.current,
      sheet: sheetRef.current,
    };
    const controller = mountExplorer(dom, sector, {
      onZoneChange: (zoneId, reset) => {
        if (reset) setActiveView(sector.defaultView || sector.views[0]?.id);
        setCurrentZoneId(zoneId);
        setCurrentSupplier(null);
        setIsPanelOpen(!!zoneId);
        setIsSheetFull(false);
        setIsZoneMenuOpen(false);
        setIsComparisonOpen(false);
      },
      onDeepDiveStageChange: setDeepStage,
      onReady: () => setIsSceneReady(true),
    });
    controllerRef.current = controller;
    setDeepStage(null);
    setActiveView(sector.defaultView || sector.views[0]?.id);
    setIsComparisonOpen(false);

    // Deep link: ?zone=<id>&company=<key> selects a zone/company on load (e.g. a
    // link from the overview page's company list); invalid/missing ids just fall
    // through to the empty state exactly as before this existed. Computed as plain
    // values first, then applied unconditionally below, rather than setState calls
    // nested in `if` blocks — same outcome, but it's what the state-in-effect lint
    // rule wants: an early-return shape it can't tell apart from stale state.
    const linkedZoneId = searchParams.get("zone");
    const linkedCompanyKey = searchParams.get("company");
    const validZone = linkedZoneId && sector.zones.some((z) => z.id === linkedZoneId) ? linkedZoneId : null;
    const validCompany = validZone && linkedCompanyKey && sector.suppliers[linkedCompanyKey] ? linkedCompanyKey : null;
    if (validZone) controller.selectZone(validZone);
    setCurrentZoneId(validZone);
    setCurrentSupplier(validCompany);
    setIsPanelOpen(!!validZone);
    setIsSheetFull(!!validCompany);

    // ?tour=1 (from the overview page's "Start guided tour" action) auto-starts
    // the camera cycle once the scene has had a moment to settle into its default
    // view — muted for now (see GUIDED_TOUR_ENABLED) along with the rest of the tour.
    if (GUIDED_TOUR_ENABLED && searchParams.get("tour") === "1") {
      tourTimerRef.current = setTimeout(startTour, 700);
    }

    return () => {
      stopTour();
      controller.dispose();
      controllerRef.current = null;
    };
    // Re-mount whenever the sector changes; layerButtonRefs is cleared per-mount
    // by React's own ref-callback churn since the buttons below are keyed by sector.
    // searchParams is intentionally read but not a dependency — it's consulted only
    // for this initial deep-link, not resubscribed to on every URL change the sync
    // effect below makes (that would just remount the whole scene in a loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.slug]);

  const scenario = scenarioId ? scenarios.find((x) => x.id === scenarioId) ?? null : null;
  const scenarioZones = scenario ? scenarioZoneImpacts(sector, scenario) : [];
  const scenarioCos = scenario ? scenarioCompanies(sector, scenario) : [];

  // Pushes the active scenario into the 3D scene. Runs after the mount effect above (declaration
  // order), so the controller exists on first load too.
  useEffect(() => {
    const map: ImpactMap | null = scenario
      ? Object.fromEntries(scenarioZones.map((z) => [z.zone, { severity: z.severity, effect: z.effect }]))
      : null;
    controllerRef.current?.setImpact(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, sector.slug]);

  const handlePickScenario = useCallback(
    (id: string | null) => {
      stopTour();
      controllerRef.current?.selectZone(null);
      setScenarioId(id);
      setIsPanelOpen(!!id);
      setIsSheetFull(false);
    },
    [stopTour]
  );

  // One-way sync: selection state -> URL. Never reads searchParams back into state
  // here (that's the effect above, once, on mount) — doing so would turn this into
  // a loop, each URL update re-triggering a read that triggers another update.
  // The native history API, not router.replace: a router navigation re-renders the page on the
  // server (auth, figures) on every pick, while replaceState only rewrites the address bar
  // (Next keeps useSearchParams in step). Replace, not push: picks don't pile up history entries,
  // so Back still leaves the explorer, as before.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentZoneId) params.set("zone", currentZoneId);
    else params.delete("zone");
    if (currentSupplier) params.set("company", currentSupplier);
    else params.delete("company");
    if (scenarioId) params.set("scenario", scenarioId);
    else params.delete("scenario");
    params.delete("tour");
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentZoneId, currentSupplier, scenarioId]);

  const zone = currentZoneId ? sector.zones.find((z) => z.id === currentZoneId) ?? null : null;
  // Normalized to plain keys once here — a zone's suppliers may be bare keys or
  // {key, exposureType, exposureStrength} objects (see SectorCompanyLink) — so
  // nothing downstream needs to know which shape this sector's zones use.
  const zoneSupplierKeys = zone ? zone.suppliers.map(companyLinkKey) : [];
  // Per-company exposure for *this* zone specifically — a company's exposure can
  // differ zone to zone, so this is keyed off the current zone's own links, not
  // looked up from the company record.
  const zoneExposure = new Map(
    (zone?.suppliers ?? []).map((link): [string, ReturnType<typeof companyLinkExposure>] => [
      companyLinkKey(link),
      companyLinkExposure(link),
    ])
  );

  // A zone with exactly one supplier auto-opens it (mirrors the original) — derived
  // at render time rather than synced via an effect, so there's no extra render pass.
  const effectiveSupplier = currentSupplier ?? (zoneSupplierKeys.length === 1 ? zoneSupplierKeys[0] : null);

  // Desktop: the open Systems list can run past the bottom of the rail; bring it into view.
  useEffect(() => {
    if (!isZoneMenuOpen) return;
    const raf = requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      zoneListRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [isZoneMenuOpen]);

  // Manual interaction anywhere in the explorer cancels an in-progress guided
  // tour — the tour is a suggestion, not a lock, so any deliberate click wins.
  const handleFlyTo = useCallback(
    (viewId: string) => {
      stopTour();
      controllerRef.current?.flyTo(viewId);
      setActiveView(viewId);
    },
    [stopTour]
  );

  // Back to the sector's opening camera: for anyone who has orbited or zoomed deep into the model.
  const handleResetView = useCallback(() => {
    stopTour();
    const id = sector.defaultView || sector.views[0]?.id;
    controllerRef.current?.flyTo(id);
    setActiveView(id);
  }, [stopTour, sector.defaultView, sector.views]);

  const handleLayerClick = useCallback(
    (level: number) => {
      stopTour();
      controllerRef.current?.exitDeepDive();
      controllerRef.current?.setTargetLevel(level);
    },
    [stopTour]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      stopTour();
      controllerRef.current?.setLevelImmediate(parseFloat(e.target.value));
    },
    [stopTour]
  );
  // On release the slider settles on the nearest layer, so a layer is always named and lit
  // (dragging still scrubs smoothly through the crossfade in between).
  const handleSliderRelease = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    const v = parseFloat(e.currentTarget.value);
    if (Number.isFinite(v)) controllerRef.current?.setTargetLevel(Math.round(v));
  }, []);

  const handleSelectZone = useCallback(
    (id: string | null) => {
      stopTour();
      controllerRef.current?.selectZone(id);
    },
    [stopTour]
  );

  // A company pick (chip, prev/next arrows, scenario list) opens the sheet fully; the
  // effect below then brings its details into view.
  const handlePickSupplier = useCallback((key: string) => {
    setCurrentSupplier(key);
    setIsSheetFull(true);
  }, []);

  // The company details render below the chips and write-up, often well under the
  // fold of the panel, so scroll the panel (not the page) to them on every pick -
  // including a ?company= deep link. Waits a frame so the new details have laid out.
  useEffect(() => {
    if (!currentSupplier) return;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const detail = panel?.querySelector<HTMLElement>(".supplier-detail");
      if (!panel || !detail) return;
      const top = panel.scrollTop + detail.getBoundingClientRect().top - panel.getBoundingClientRect().top - 8;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [currentSupplier, currentZoneId]);

  // Sheet handle: a tap steps closed -> peek -> full -> peek; a drag moves it a step up or
  // down (dragging down from peek closes it). Pointer events so it works for touch and mouse.
  const handleDrag = useRef<{ y: number } | null>(null);
  // Closing the panel while a system is open also closes the system, which puts the model back
  // to its opening state (engine selectZone(null)); a scenario-only panel just closes.
  const closePanel = useCallback(() => {
    if (currentZoneId) controllerRef.current?.selectZone(null);
    // Closing a scenario's sheet ends the scenario too, back to the plain model.
    else if (scenarioId) handlePickScenario(null);
    else setIsPanelOpen(false);
  }, [currentZoneId, scenarioId, handlePickScenario]);
  const stepSheet = useCallback(
    (dir: "up" | "down" | "tap") => {
      if (dir === "tap") {
        if (!isPanelOpen) setIsPanelOpen(true);
        else setIsSheetFull((f) => !f);
      } else if (dir === "up") {
        if (!isPanelOpen) setIsPanelOpen(true);
        else setIsSheetFull(true);
      } else if (isSheetFull) setIsSheetFull(false);
      else closePanel();
    },
    [isPanelOpen, isSheetFull, closePanel]
  );

  const handleToggleTour = useCallback(() => {
    if (isTouring) stopTour();
    else startTour();
  }, [isTouring, startTour, stopTour]);

  // Esc steps back one thing at a time, topmost first: the Compare table, then the picked
  // company's card, then the open system (back to the whole model), then the scenario, then an
  // open Systems / What-if list. Pop-ups that own the keyboard (the stock pop-up, the sign-up
  // prompt, the header menus, the phone controls overlay) handle their own Esc, so it is left
  // to them while they are open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
      if (isComparisonOpen) return setIsComparisonOpen(false);
      if (isControlsOpen || document.querySelector('[aria-modal="true"]:not(.compare-box)')) return;
      if (document.querySelector('.nr-explorer header [aria-expanded="true"]')) return;
      if (currentSupplier && zoneSupplierKeys.length > 1) return setCurrentSupplier(null);
      if (currentZoneId) return handleSelectZone(null);
      if (scenarioId) return handlePickScenario(null);
      if (isZoneMenuOpen || isScenarioMenuOpen) {
        setIsZoneMenuOpen(false);
        setIsScenarioMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={"nr-explorer" + (isControlsOpen ? " controls-open" : "")}>
      <header>
        <div className="title-block">
          <Link href="/" className="brand tap-target" style={{ textDecoration: "none" }} aria-label="NextResearch home">
            <span className="brand-full">NextResearch</span>
            <span className="brand-mark" aria-hidden>N</span>
          </Link>
          {/* The sector's own name, as on its overview page and across the site (the authored
              headerTitle strings mixed "EV ANATOMY" with "RARE-EARTH MAGNETS (REPM)"). */}
          <h1 title={sector.name}>{sector.name}</h1>
          {sector.dataStatus && (
            <span className={"badge " + (sector.dataStatus === "demo" ? "unlisted" : "listed")} title={sector.dataStatus === "demo" ? "From publicly available information" : undefined}>
              {sector.dataStatus === "demo" ? "Public data" : sector.dataStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="right">
          <Link href={`/sector/${sector.slug}`} className="hdr-btn tap-target" aria-label="Back to overview" title="Back to overview">
            &larr;<span className="lbl"> Overview</span>
          </Link>
          <div className="status" title="Drag to orbit · scroll to zoom">
            <i /> LIVE 3D
          </div>
        </div>
        <div className="user-nav">
          {/* Same phone-only site menu as the rest of the site (it hides itself from md up). */}
          <MobileMenu hideFrom="min-[1001px]:hidden" />
          <Link
            href="/watchlist"
            className="tap-target flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel-2 text-ink-soft hover:border-accent hover:text-danger"
            aria-label="Watchlist"
            title="Watchlist"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7.5-4.6-10.2-9.3C.1 8.9 1 5.3 4.3 4.1c2.3-.8 4.6.1 5.9 2 .5.7 1.4 1.9 1.8 2.5.4-.6 1.3-1.8 1.8-2.5 1.3-1.9 3.6-2.8 5.9-2 3.3 1.2 4.2 4.8 2.5 7.6C19.5 16.4 12 21 12 21z" />
            </svg>
          </Link>
          <UserMenu key={`${userEmail ?? "anon"}-${displayName}`} email={userEmail} displayName={displayName} />
        </div>
      </header>

      <div className="app">
        <div
          className="rail"
          onClick={(e) => {
            // Picking a layer / system / camera view closes the overlay so the model is visible
            // again; the "Systems" dropdown toggle only expands its own list.
            const btn = (e.target as HTMLElement).closest("button");
            if (btn && !btn.classList.contains("zone-more-btn")) setIsControlsOpen(false);
          }}
        >
          <div className="rail-label" id="nrLayersLabel">Layers</div>
          {/* One button per layer, numbered from the outside in; the engine lights the one the
              model has settled on (applyLevel) and keeps the slider below in step. */}
          <div className="layer-btns" role="group" aria-labelledby="nrLayersLabel">
            {sector.layerNames.map((name, level) => (
              <button
                key={level}
                type="button"
                ref={(el) => {
                  if (el) layerButtonRefs.current.set(level, el);
                  else layerButtonRefs.current.delete(level);
                }}
                className="layer-btn"
                data-level={level}
                aria-pressed={level === 0}
                onClick={() => handleLayerClick(level)}
              >
                <span className="n" aria-hidden>
                  {String(level + 1).padStart(2, "0")}
                </span>
                <span>{name}</span>
              </button>
            ))}
          </div>
          <div className="layer-slider-wrap">
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={sector.layerNames.length - 1}
              step={0.01}
              defaultValue={0}
              list="nrLayerStops"
              aria-label="Open up the model, layer by layer"
              title="Open up the model, layer by layer"
              onChange={handleSliderChange}
              onPointerUp={handleSliderRelease}
              onKeyUp={handleSliderRelease}
            />
            {/* Tick marks: one stop per layer button. */}
            <datalist id="nrLayerStops">
              {sector.layerNames.map((name, level) => (
                <option key={level} value={level} label={name} />
              ))}
            </datalist>
          </div>

          {scenarios.length > 0 && (
            <>
              <div className="rail-label" style={{ marginTop: 6 }}>
                What if…
              </div>
              <button
                type="button"
                className={"zone-more-btn scn-more" + (isScenarioMenuOpen ? " open" : "")}
                onClick={() => setIsScenarioMenuOpen((o) => !o)}
                aria-expanded={isScenarioMenuOpen}
                aria-controls="nrScenarioList"
                aria-label={scenario ? `What if scenarios (showing: ${scenario.title})` : "What if scenarios"}
              >
                <span>{scenario ? `What if: ${scenario.title}` : "What if…"}</span>
                <span className="chev" aria-hidden>
                  &#9662;
                </span>
              </button>
              <div id="nrScenarioList" className={"scn-list" + (isScenarioMenuOpen ? " expanded" : "")}>
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    aria-pressed={scenarioId === sc.id}
                    className={"scn-btn" + (scenarioId === sc.id ? " active" : "")}
                    title={sc.blurb}
                    onClick={() => handlePickScenario(scenarioId === sc.id ? null : sc.id)}
                  >
                    {sc.title}
                  </button>
                ))}
              </div>
              {/* No separate "Clear scenario" here: the lit scenario toggles off, and the stage's
                  "What if: … ×" pill clears it from anywhere. */}
            </>
          )}

          <div className="rail-label" style={{ marginTop: 6 }}>
            Systems
          </div>
          <button
            type="button"
            className={"zone-more-btn" + (isZoneMenuOpen ? " open" : "")}
            onClick={() => setIsZoneMenuOpen((o) => !o)}
            aria-expanded={isZoneMenuOpen}
            aria-controls="nrSystemsList"
            aria-label={zone ? `Systems (selected: ${zone.label})` : "Systems"}
          >
            <span>{zone ? zone.label : "Systems"}</span>
            <span className="chev" aria-hidden>
              &#9662;
            </span>
          </button>
          <div id="nrSystemsList" ref={zoneListRef} className={"zone-btns" + (isZoneMenuOpen ? " expanded" : "")}>
            {sector.zones.map((z) => {
              const isSelected = currentZoneId === z.id;
              const isDimmed = !!currentZoneId && !isSelected;
              return (
                <button
                  key={z.id}
                  type="button"
                  aria-pressed={isSelected}
                  title={z.label}
                  className={"zone-btn" + (isSelected ? " active" : "") + (isDimmed ? " dimmed" : "")}
                  style={{ ["--zc" as string]: z.color } as React.CSSProperties}
                  onClick={() => handleSelectZone(z.id)}
                  onMouseEnter={() => controllerRef.current?.setHover(z.id)}
                  onMouseLeave={() => controllerRef.current?.setHover(null)}
                >
                  <span className="dot" />
                  <span>{z.label}</span>
                </button>
              );
            })}
          </div>

          <div className="rail-label" style={{ marginTop: 6 }}>
            Camera view
          </div>
          <div className="view-grid">
            {sector.views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={activeView === v.id}
                className={"view-btn" + (activeView === v.id ? " active" : "")}
                onClick={() => handleFlyTo(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stage" ref={stageRef}>
          <button
            type="button"
            className={"controls-btn" + (isControlsOpen ? " on" : "")}
            onClick={() => setIsControlsOpen((o) => !o)}
            aria-label="Layers, systems and camera"
            aria-expanded={isControlsOpen}
            title="Layers, systems and camera"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
            </svg>
          </button>
          <button
            type="button"
            className="reset-btn"
            onClick={handleResetView}
            aria-label="Reset to the starting view"
            title="Reset to the starting view"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3M8 11h6" />
            </svg>
          </button>
          {scenario && (
            <button type="button" className="scn-pill" onClick={() => handlePickScenario(null)} title="Clear scenario">
              <span>What if: {scenario.title}</span>
              <b aria-hidden>&times;</b>
              <span className="sr-only">Clear scenario</span>
            </button>
          )}
          <div className="stage-grid-overlay" />
          {!isSceneReady && (
            <div className="stage-loading" role="status">
              <span className="spinner" aria-hidden />
              Loading the 3D model…
            </div>
          )}
          <svg className="leader-svg" ref={leaderSvgRef} />
          <div className="callout-rail rail-left" ref={railLeftRef} />
          <div className="callout-rail rail-right" ref={railRightRef} />
          <div className="callout-rail rail-top" ref={railTopRef} />
          <div className="callout-rail rail-bottom" ref={railBottomRef} />
          <div className="mobile-tags" ref={mobileTagsRef} />
          <div className="breadcrumb" ref={breadcrumbRef}>
            <b>Product</b>
          </div>

          {deepStage !== null && deepDive && (
            <div style={{ position: "absolute", top: 12, right: 56, display: "flex", gap: 8, zIndex: 5 }}>
              <button className="tbtn active" onClick={() => controllerRef.current?.cycleDeepStage()}>
                {deepDive.buttonLabel}
              </button>
              <button className="tbtn danger active" onClick={() => controllerRef.current?.exitDeepDive()}>
                Back to product
              </button>
            </div>
          )}

          {GUIDED_TOUR_ENABLED && isTouring && tourCaption && isMuted && (
            <div className="tour-caption">{tourCaption}</div>
          )}

          {GUIDED_TOUR_ENABLED && (
            <div className="toolbar">
              <button className={"tbtn" + (isTouring ? " active" : "")} onClick={handleToggleTour}>
                {isTouring ? "■ Stop tour" : "▶ Guided tour"}
              </button>
              {speechSupported && (
                <button
                  className="tbtn"
                  title={isMuted ? "Unmute narration" : "Mute narration (shows subtitles instead)"}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? "🔇 Subtitles on" : "🔊 Narration on"}
                </button>
              )}
            </div>
          )}
        </div>

        <div
          ref={sheetRef}
          className={"panel-wrap" + (isPanelOpen ? (isSheetFull ? " full" : " peek") : " collapsed")}
        >
          <div
            className="panel-handle"
            role="button"
            tabIndex={0}
            aria-expanded={isPanelOpen}
            aria-label={isPanelOpen ? (isSheetFull ? "Shrink details panel" : "Expand details panel") : "Open details panel"}
            onPointerDown={(e) => {
              handleDrag.current = { y: e.clientY };
              // Keep receiving the pointer when a drag leaves the handle.
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerUp={(e) => {
              const start = handleDrag.current;
              handleDrag.current = null;
              if (!start || (e.target as HTMLElement).closest(".panel-close-btn")) return;
              const dy = e.clientY - start.y;
              stepSheet(dy < -30 ? "up" : dy > 30 ? "down" : "tap");
            }}
            onPointerCancel={() => (handleDrag.current = null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                stepSheet("tap");
              }
            }}
          >
            <span className="grip" />
            <span className="panel-handle-text">
              {zone ? zone.label : scenario ? `What if: ${scenario.title}` : "Tap a part for supplier & financial details"}
            </span>
            <button
              className="panel-close-btn"
              type="button"
              aria-label="Close"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                closePanel();
              }}
            >
              &times;
            </button>
          </div>
          {/* Side panel (wider screens): the system's name and its close in a bar that stays put
              while the panel scrolls - floating over the panel, the × covered the company card's
              "next" arrow once the card scrolled up. Phones close from the sheet handle instead.
              Closing the system returns the model to its opening state. */}
          {zone && (
            <div className="panel-bar">
              <h2>
                <span className="zc-tag" style={{ background: zone.color }} />
                {zone.label}
              </h2>
              <button className="panel-close-btn" type="button" aria-label={`Close ${zone.label}`} onClick={closePanel}>
                &times;
              </button>
            </div>
          )}
          <div
            className="panel"
            ref={panelRef}
            onScroll={(e) => {
              // Scrolling a peeking sheet means the reader wants more: open it fully.
              if (isPanelOpen && !isSheetFull && e.currentTarget.scrollTop > 24 && getComputedStyle(e.currentTarget.parentElement!).position === "fixed")
                setIsSheetFull(true);
            }}
          >
            {!zone && scenario ? (
              <>
                <h2>{scenario.title}</h2>
                <p className="zdesc">{scenario.story}</p>
                <div>
                  <div className="chart-label">Layers touched</div>
                  <div className="chips" style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                    {scenarioZones.map((z) => (
                      <button key={z.zone} className="scn-row" onClick={() => handleSelectZone(z.zone)}>
                        <span>
                          {z.label}
                          <small>{z.why}</small>
                        </span>
                        <span className={"scn-tag " + z.effect}>
                          {z.effect === "headwind" ? "Headwind" : "Tailwind"} · {["", "Low", "Medium", "High"][z.severity]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="chart-label">Listed companies most exposed</div>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                    {scenarioCos.slice(0, 10).map((c) => (
                      <button
                        key={c.key}
                        className="scn-row"
                        onClick={() => {
                          handleSelectZone(c.zoneId);
                          handlePickSupplier(c.key);
                        }}
                      >
                        <span>
                          {c.name}
                          <small>
                            {c.zoneLabel}
                            {c.strength ? ` · ${EXPOSURE_STRENGTH_LABEL[c.strength].toLowerCase()} exposure` : ""}
                          </small>
                        </span>
                        <span className={"scn-tag " + c.effect}>{c.effect === "headwind" ? "Headwind" : "Tailwind"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="fine">
                  An illustrative reading of the supply chain, not a forecast. Layers are rated by how directly they are exposed; companies
                  rank on that times their authored exposure to the layer. Information only, not investment advice.
                </p>
              </>
            ) : !zone ? (
              // Nothing picked: rather than one sentence in an empty column, an index of the model -
              // every system with its layer and how many listed companies it holds, one click away.
              <>
                <p className="panel-intro">
                  Pick a part on the model, or a system below, to see what it does and who supplies it. Layers peel the
                  model open.
                </p>
                <div>
                  <div className="chart-label">Systems in this model</div>
                  <div className="sys-list">
                    {sector.zones.map((z) => {
                      const listed = z.suppliers.filter((link) => sector.suppliers[companyLinkKey(link)]?.listed).length;
                      const layer = z.layer != null ? sector.layerNames[z.layer] : null;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          className="sys-row"
                          style={{ ["--zc" as string]: z.color } as React.CSSProperties}
                          onClick={() => handleSelectZone(z.id)}
                          onMouseEnter={() => controllerRef.current?.setHover(z.id)}
                          onMouseLeave={() => controllerRef.current?.setHover(null)}
                        >
                          <span className="dot" aria-hidden />
                          <span className="sys-name">{z.label}</span>
                          <small>
                            {layer ? `${layer} · ` : ""}
                            {listed === 1 ? "1 listed" : `${listed} listed`}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Phones/tablets: the bar above is hidden, so the name heads the sheet here. */}
                <h2 className="zone-title">
                  <span className="zc-tag" style={{ background: zone.color }} />
                  {zone.label}
                </h2>
                {scenario && (
                  <div className="scn-banner">
                    <b>{scenario.title}:</b>{" "}
                    {(() => {
                      const hit = scenarioZones.find((z) => z.zone === zone.id);
                      return hit
                        ? `${hit.effect === "headwind" ? "headwind" : "tailwind"}, ${["", "low", "medium", "high"][hit.severity]} impact. ${hit.why}.`
                        : "this layer is not directly touched.";
                    })()}{" "}
                    <button className="scn-clear" onClick={() => handleSelectZone(null)}>
                      Back to scenario
                    </button>
                  </div>
                )}
                <p className="zdesc">{zone.desc}</p>

                {/* Clickable buttons (deep dive, compare, supplier chips) come
                    right after the header, ahead of the narrative write-up
                    below — on a long zone with all six write-up sections
                    filled in, these were getting pushed far enough down that
                    the actual interactive part of the panel was off-screen. */}
                {zone.deepDive && deepDive && (
                  <button
                    className="deepdive-btn"
                    onClick={() =>
                      deepStage !== null ? controllerRef.current?.exitDeepDive() : controllerRef.current?.enterDeepDive()
                    }
                  >
                    {deepStage !== null ? "Back to product" : "Open deep dive →"}
                  </button>
                )}
                {zoneSupplierKeys.length > 1 && (
                  <button className="compare-btn" onClick={() => setIsComparisonOpen(true)}>
                    Compare companies &rarr;
                  </button>
                )}
                <div className="chips">
                  {zoneSupplierKeys.map((key) => {
                    const s = sector.suppliers[key];
                    const exposure = zoneExposure.get(key);
                    return (
                      // A div with button semantics, not a <button>: it contains the watchlist button.
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        aria-pressed={effectiveSupplier === key}
                        className={"chip" + (effectiveSupplier === key ? " active" : "")}
                        onClick={() => handlePickSupplier(key)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            handlePickSupplier(key);
                          }
                        }}
                      >
                        <span>
                          {s.name}
                          {/* The open company's heart is on its card below; one per company on screen. */}
                          {s.listed && effectiveSupplier !== key && <WatchlistButton ticker={tickerForSupplier(s)} name={s.name} />}
                          {exposure?.exposureType && (
                            <span className="fine" style={{ marginLeft: 6 }}>
                              {EXPOSURE_TYPE_LABEL[exposure.exposureType]}
                              {exposure.exposureStrength ? ` · ${EXPOSURE_STRENGTH_LABEL[exposure.exposureStrength]}` : ""}
                            </span>
                          )}
                        </span>
                        <span className={"badge " + (s.listed ? "listed" : "unlisted")}>
                          {s.listed ? "Listed" : "Unlisted"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {effectiveSupplier && (
                  <SupplierDetail
                    key={effectiveSupplier}
                    sector={sector}
                    supplierKey={effectiveSupplier}
                    zoneSuppliers={zoneSupplierKeys}
                    onSelectSupplier={handlePickSupplier}
                  />
                )}

                {zone.roleInSystem && (
                  <div>
                    <div className="chart-label">Where it fits</div>
                    <p className="role" style={{ marginTop: 4 }}>
                      {zone.roleInSystem}
                    </p>
                  </div>
                )}
                {zone.whyItMatters && (
                  <div>
                    <div className="chart-label">Why it matters</div>
                    <p className="role" style={{ marginTop: 4 }}>
                      {zone.whyItMatters}
                    </p>
                  </div>
                )}
                {zone.valuePoolDescription && (
                  <div>
                    <div className="chart-label">Where the value pool sits</div>
                    <p className="role" style={{ marginTop: 4 }}>
                      {zone.valuePoolDescription}
                    </p>
                  </div>
                )}
                {zone.keyDrivers && zone.keyDrivers.length > 0 && (
                  <div>
                    <div className="chart-label">Key drivers</div>
                    <ul className="unlisted-facts" style={{ marginTop: 4 }}>
                      {zone.keyDrivers.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {zone.bottlenecks && zone.bottlenecks.length > 0 && (
                  <div>
                    <div className="chart-label">Potential bottlenecks</div>
                    <ul className="unlisted-facts" style={{ marginTop: 4 }}>
                      {zone.bottlenecks.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {zone.investorMetrics && zone.investorMetrics.length > 0 && (
                  <div>
                    <div className="chart-label">Investor metrics to watch</div>
                    <ul className="unlisted-facts" style={{ marginTop: 4 }}>
                      {zone.investorMetrics.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {zone.relatedComponents && zone.relatedComponents.length > 0 && (
                  <div>
                    <div className="chart-label">Related layers</div>
                    <div className="chips" style={{ marginTop: 4 }}>
                      {zone.relatedComponents.map((relatedId) => {
                        const related = sector.zones.find((z) => z.id === relatedId);
                        if (!related) return null;
                        return (
                          <div
                            key={relatedId}
                            className="chip"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectZone(related.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectZone(related.id);
                              }
                            }}
                          >
                            <span>
                              <span className="zc-tag" style={{ background: related.color }} />
                              {related.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isComparisonOpen && zone && (
        <CompanyComparison key={zone.id} sector={sector} zone={zone} onClose={() => setIsComparisonOpen(false)} />
      )}
    </div>
  );
}
