"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSector } from "@/lib/sector-content";
import { mountExplorer, type ExplorerController, type ExplorerDom } from "./engine";
import { SupplierDetail } from "./SupplierDetail";
import "./explorer.css";

type Props = {
  slug: string;
};

export function SectorExplorer({ slug }: Props) {
  // Looked up here (client bundle) rather than passed as a prop from the server
  // page — the sector object carries three.js geometry-building functions, which
  // can't cross the server/client boundary as React props. The page's own
  // getSector(slug) check (src/app/sector/[slug]/page.tsx) guarantees this exists.
  const sector = getSector(slug)!;

  const stageRef = useRef<HTMLDivElement>(null);
  const leaderSvgRef = useRef<SVGSVGElement>(null);
  const railLeftRef = useRef<HTMLDivElement>(null);
  const railRightRef = useRef<HTMLDivElement>(null);
  const railTopRef = useRef<HTMLDivElement>(null);
  const railBottomRef = useRef<HTMLDivElement>(null);
  const mobileTagsRef = useRef<HTMLDivElement>(null);
  const shellLabelRef = useRef<HTMLSpanElement>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);
  const layerButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const controllerRef = useRef<ExplorerController | null>(null);

  const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>(sector.defaultView || sector.views[0]?.id);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isZoneMenuOpen, setIsZoneMenuOpen] = useState(false);
  const [deepStage, setDeepStage] = useState<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deepDive = (sector as any).deepDive as { buttonLabel: string } | undefined;

  useEffect(() => {
    if (
      !stageRef.current ||
      !leaderSvgRef.current ||
      !railLeftRef.current ||
      !railRightRef.current ||
      !railTopRef.current ||
      !railBottomRef.current ||
      !mobileTagsRef.current ||
      !shellLabelRef.current ||
      !breadcrumbRef.current
    ) {
      return;
    }
    const dom: ExplorerDom = {
      stage: stageRef.current,
      leaderSvg: leaderSvgRef.current,
      railLeft: railLeftRef.current,
      railRight: railRightRef.current,
      railTop: railTopRef.current,
      railBottom: railBottomRef.current,
      mobileTags: mobileTagsRef.current,
      layerButtons: layerButtonRefs.current,
      shellLabel: shellLabelRef.current,
      breadcrumb: breadcrumbRef.current,
    };
    const controller = mountExplorer(dom, sector, {
      onZoneChange: (zoneId) => {
        setCurrentZoneId(zoneId);
        setCurrentSupplier(null);
        setIsPanelOpen(!!zoneId);
        setIsZoneMenuOpen(false);
      },
      onDeepDiveStageChange: setDeepStage,
    });
    controllerRef.current = controller;
    setCurrentZoneId(null);
    setCurrentSupplier(null);
    setIsPanelOpen(false);
    setDeepStage(null);
    setActiveView(sector.defaultView || sector.views[0]?.id);

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
    // Re-mount whenever the sector changes; layerButtonRefs is cleared per-mount
    // by React's own ref-callback churn since the buttons below are keyed by sector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.slug]);

  const zone = currentZoneId ? sector.zones.find((z) => z.id === currentZoneId) ?? null : null;

  // A zone with exactly one supplier auto-opens it (mirrors the original) — derived
  // at render time rather than synced via an effect, so there's no extra render pass.
  const effectiveSupplier = currentSupplier ?? (zone && zone.suppliers.length === 1 ? zone.suppliers[0] : null);

  const handleFlyTo = useCallback((viewId: string) => {
    controllerRef.current?.flyTo(viewId);
    setActiveView(viewId);
  }, []);

  const handleShellClick = useCallback(() => {
    controllerRef.current?.toggleShell();
  }, []);

  const handleLayerClick = useCallback((level: number) => {
    controllerRef.current?.exitDeepDive();
    controllerRef.current?.setTargetLevel(level);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    controllerRef.current?.setLevelImmediate(parseFloat(e.target.value));
  }, []);

  const handleSelectZone = useCallback((id: string | null) => {
    controllerRef.current?.selectZone(id);
  }, []);

  return (
    <div className="nr-explorer">
      <header>
        <div className="title-block">
          <span className="brand">NextResearch</span>
          <h1>{sector.headerTitle}</h1>
          <span className="sub">{sector.headerSub}</span>
        </div>
        <div className="right">
          <Link href="/" className="hdr-btn">
            &larr; All sectors
          </Link>
          <div className="status">
            <i /> LIVE MODEL &middot; drag to orbit &middot; scroll to zoom
          </div>
        </div>
      </header>

      <div className="app">
        <div className="rail">
          <div className="rail-label">Layers</div>
          <div>
            <button
              ref={(el) => {
                if (el) layerButtonRefs.current.set(0, el);
              }}
              className="layer-btn"
              onClick={handleShellClick}
            >
              <span className="n">01</span> <span ref={shellLabelRef}>{sector.layerNames[0]}</span>
            </button>
            {sector.layerNames.slice(2).map((name, i) => {
              const level = i + 2;
              return (
                <button
                  key={level}
                  ref={(el) => {
                    if (el) layerButtonRefs.current.set(level, el);
                  }}
                  className="layer-btn"
                  data-level={level}
                  onClick={() => handleLayerClick(level)}
                >
                  <span className="n">0{level}</span> {name}
                </button>
              );
            })}
          </div>
          <div className="layer-slider-wrap">
            <input
              type="range"
              min={0}
              max={sector.layerNames.length - 1}
              step={0.01}
              defaultValue={0}
              onChange={handleSliderChange}
            />
          </div>

          <div className="rail-label" style={{ marginTop: 6 }}>
            Systems
          </div>
          <button
            type="button"
            className={"zone-more-btn" + (isZoneMenuOpen ? " open" : "")}
            onClick={() => setIsZoneMenuOpen((o) => !o)}
          >
            <span>{zone ? zone.label : "Systems"}</span>
            <span className="chev">&#9662;</span>
          </button>
          <div className={"zone-btns" + (isZoneMenuOpen ? " expanded" : "")}>
            {sector.zones.map((z) => {
              const isSelected = currentZoneId === z.id;
              const isDimmed = !!currentZoneId && !isSelected;
              return (
                <button
                  key={z.id}
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
                className={"view-btn" + (activeView === v.id ? " active" : "")}
                onClick={() => handleFlyTo(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="stage" ref={stageRef}>
          <div className="stage-grid-overlay" />
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
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, zIndex: 5 }}>
              <button className="tbtn active" onClick={() => controllerRef.current?.cycleDeepStage()}>
                {deepDive.buttonLabel}
              </button>
              <button className="tbtn danger active" onClick={() => controllerRef.current?.exitDeepDive()}>
                Back to product
              </button>
            </div>
          )}
        </div>

        <div className={"panel-wrap" + (isPanelOpen ? "" : " collapsed")}>
          <div className="panel-handle" onClick={() => setIsPanelOpen((o) => !o)}>
            <span className="grip" />
            <span>{zone ? zone.label : "Tap a part for supplier & financial details"}</span>
            <button
              className="panel-close-btn"
              type="button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                setIsPanelOpen(false);
              }}
            >
              &times;
            </button>
          </div>
          <div className="panel">
            {!zone ? (
              <p className="panel-empty">
                Click a highlighted component to see its function and suppliers — or use Layers / Systems to look
                inside first.
              </p>
            ) : (
              <>
                <h2>
                  <span className="zc-tag" style={{ background: zone.color }} />
                  {zone.label}
                </h2>
                <p className="zdesc">{zone.desc}</p>
                {zone.deepDive && deepDive && (
                  <button
                    className="deepdive-btn"
                    onClick={() =>
                      deepStage !== null ? controllerRef.current?.exitDeepDive() : controllerRef.current?.enterDeepDive()
                    }
                  >
                    {deepStage !== null ? "Back to product" : "Open deep dive ->"}
                  </button>
                )}
                <div className="chips">
                  {zone.suppliers.map((key) => {
                    const s = sector.suppliers[key];
                    return (
                      <div
                        key={key}
                        className={"chip" + (effectiveSupplier === key ? " active" : "")}
                        onClick={() => setCurrentSupplier(key)}
                      >
                        <span>{s.name}</span>
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
                    zoneSuppliers={zone.suppliers}
                    onSelectSupplier={setCurrentSupplier}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
