// Imperative three.js layer for the sector explorer — ported from the original
// NextResearch artifact's "ENGINE" section (see src/lib/sector-content/products.ts
// for where the geometry-building half of that port lives). Kept imperative
// deliberately: per-frame camera-projected callout positions, marker pulsing and
// camera tweening aren't a good fit for React's render cycle. Everything that IS a
// discrete, infrequent state change (which zone/supplier is selected, which camera
// view is active, deep-dive stage) is instead reported back to the React component
// via the `callbacks` below, which owns that state and renders the panel/rail from it.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SectorDef, SectorZone } from "@/lib/sector-content/core";
import { readTheme } from "@/lib/theme";

export type ExplorerDom = {
  stage: HTMLDivElement;
  leaderSvg: SVGSVGElement;
  railLeft: HTMLDivElement;
  railRight: HTMLDivElement;
  railTop: HTMLDivElement;
  railBottom: HTMLDivElement;
  mobileTags: HTMLDivElement;
  layerButtons: Map<number, HTMLButtonElement>; // level index -> that layer's button
  breadcrumb: HTMLDivElement;
  // The Layers slider; kept in step with the level when buttons or a system pick move it.
  slider?: HTMLInputElement | null;
  // The details panel. On phones/tablets it is a bottom sheet over the stage, so the engine
  // measures how much of the stage it covers and frames the scene in the strip above it.
  sheet?: HTMLElement | null;
};

export type ExplorerCallbacks = {
  // `reset` is true when closing the system also put the model back to its opening state
  // (layer 0, default camera view), so the shell can mark that view active again.
  onZoneChange: (zoneId: string | null, reset?: boolean) => void;
  onDeepDiveStageChange: (stage: number | null) => void;
  // Once, after the first frames are on screen (model drawn, labels placed).
  onReady?: () => void;
};

// Scenario overlay: zone id -> how hard it is hit (1-3) and whether it helps or hurts.
export type ImpactMap = Record<string, { severity: 1 | 2 | 3; effect: "headwind" | "tailwind" }>;

export type ExplorerController = {
  setImpact: (impact: ImpactMap | null) => void;
  selectZone: (zoneId: string | null) => void;
  // Hover only ever drives the 3D marker's scale/opacity (see the animation loop
  // below) — it never needs to reach React, so the rail's zone buttons (rendered
  // in SectorExplorer.tsx) call this directly on mouseenter/mouseleave instead of
  // going through a callback + re-render.
  setHover: (zoneId: string | null) => void;
  flyTo: (viewId: string) => void;
  // Both are user-driven layer moves (buttons / slider): leaving the selected system's
  // layer deselects it, so the panel and leader line never point at a peeled-away part.
  setTargetLevel: (level: number) => void;
  setLevelImmediate: (level: number) => void;
  enterDeepDive: () => void;
  exitDeepDive: () => void;
  cycleDeepStage: () => void;
  dispose: () => void;
};

type ZoneRuntime = {
  def: SectorZone;
  marker: THREE.Mesh;
  ring: THREE.Mesh;
  box: HTMLButtonElement;
  tag: HTMLButtonElement;
  line: SVGLineElement;
  tagLine: SVGLineElement;
  // This frame's measurements (updateCallouts reads them all before it writes anything).
  tw: number;
  th: number;
  boxRect: DOMRect | null;
};

export function mountExplorer(
  dom: ExplorerDom,
  sector: SectorDef,
  callbacks: ExplorerCallbacks
): ExplorerController {
  const { stage, leaderSvg, railLeft, railRight, railTop, railBottom, mobileTags } = dom;

  // Render on demand: an idle explorer (nothing moving, nobody touching it) draws no frames, so
  // it doesn't keep the GPU busy and the phone warm. Anything that changes what is on screen
  // calls invalidate(); the loop (animate) also keeps drawing while a camera flight, layer
  // crossfade, marker easing or OrbitControls damping is still moving, while the stage or a
  // label's layout changes (bottom sheet sliding, rail reflow), and always for models that
  // animate on their own (build() returns `animated: true`, e.g. data-centre LEDs, wind turbines).
  let wake = 2; // full frames still owed (2: one to place the labels, one to draw them there)
  const invalidate = () => {
    wake = Math.max(wake, 2);
  };

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x141c28, 10, 23);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.6, 2.4, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  // Filmic tone mapping + a procedural studio environment map give the
  // PBR materials in each sector's build() real reflections to work with —
  // without an env map, metal/clearcoat/glass all render flat and plasticky.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.appendChild(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.2;
  controls.maxDistance = 17;
  // Keeps the camera above the floor; an authored view from below (EV "Under") lifts it while
  // parked there (see flyTo), otherwise the clamp flattened it into a ground-level side view.
  const FLOOR_POLAR = Math.PI * 0.495;
  controls.maxPolarAngle = FLOOR_POLAR;
  let floorAfterFlight = false;
  controls.target.set(0, 0.55, 0);
  controls.addEventListener("start", () => {
    shot = null;
    camAnim = null;
    focusReturn = null;
    invalidate();
  });
  controls.addEventListener("change", invalidate);

  // Labels (phone tags, callouts) sit over the canvas, so a pinch or drag whose fingers land
  // on them never reached OrbitControls and the model wouldn't zoom or turn - on a phone the
  // labels cover much of the model, so people's fingers land on them all the time. Touches that
  // start on a label are driven here with the same maths OrbitControls uses; a plain tap still
  // falls through to the label's click (opening that system). OrbitControls is paused while
  // such a gesture runs so a second finger on the canvas doesn't also rotate.
  let suppressLabelClickUntil = 0;
  let labelGesture: { dist: number; x: number; y: number; moved: boolean } | null = null;
  const onLabel = (t: EventTarget | null) => !!(t as Element | null)?.closest?.(".mtag, .callout");
  const touchDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const touchMid = (ts: TouchList) => {
    let x = 0,
      y = 0;
    for (let i = 0; i < ts.length; i++) {
      x += ts[i].clientX;
      y += ts[i].clientY;
    }
    return { x: x / ts.length, y: y / ts.length };
  };
  const startLabelGesture = (e: TouchEvent) => {
    const ts = e.touches;
    if (!Array.from(ts).some((t) => onLabel(t.target))) return;
    const m = touchMid(ts);
    labelGesture = { dist: ts.length >= 2 ? touchDist(ts[0], ts[1]) : 0, x: m.x, y: m.y, moved: labelGesture?.moved ?? false };
    if (ts.length >= 2) controls.enabled = false;
  };
  const onGestureStart = (e: TouchEvent) => startLabelGesture(e);
  const onGestureMove = (e: TouchEvent) => {
    if (!labelGesture) return;
    const ts = e.touches;
    const m = touchMid(ts);
    if (!labelGesture.moved && ts.length < 2 && Math.hypot(m.x - labelGesture.x, m.y - labelGesture.y) < 8) return;
    e.preventDefault();
    if (!labelGesture.moved) {
      labelGesture.moved = true;
      controls.enabled = false;
      shot = null;
      camAnim = null;
      focusReturn = null;
    }
    if (ts.length >= 2) {
      const d = touchDist(ts[0], ts[1]);
      if (labelGesture.dist > 0 && d > 0) controls.dollyOut(Math.pow(d / labelGesture.dist, controls.zoomSpeed));
      labelGesture.dist = d;
    } else {
      const h = renderer.domElement.clientHeight || 1;
      controls.rotateLeft(((2 * Math.PI * (m.x - labelGesture.x)) / h) * controls.rotateSpeed);
      controls.rotateUp(((2 * Math.PI * (m.y - labelGesture.y)) / h) * controls.rotateSpeed);
    }
    labelGesture.x = m.x;
    labelGesture.y = m.y;
    invalidate();
  };
  const onGestureEnd = (e: TouchEvent) => {
    if (!labelGesture) return;
    if (labelGesture.moved) suppressLabelClickUntil = performance.now() + 400;
    if (e.touches.length === 0) {
      labelGesture = null;
      controls.enabled = true;
    } else startLabelGesture(e); // a finger lifted: continue with the ones still down
  };
  stage.addEventListener("touchstart", onGestureStart, { passive: true });
  stage.addEventListener("touchmove", onGestureMove, { passive: false });
  stage.addEventListener("touchend", onGestureEnd);
  stage.addEventListener("touchcancel", onGestureEnd);

  // How far to pull preset views back on a portrait (phone) stage, where the
  // narrow horizontal field of view would otherwise crop the model's sides.
  // Fog and the zoom-out limit scale with it so the farther camera isn't
  // looking at a washed-out model.
  const aspectFit = () => (camera.aspect < 1 ? Math.min(2.1, Math.pow(1 / camera.aspect, 0.75)) : 1);
  // Pixels of the stage's bottom edge hidden under the bottom-sheet panel (phones/tablets).
  // The projection centre is shifted up by half of it (setViewOffset), so whatever the
  // camera looks at sits in the middle of the strip that is actually visible.
  let sheetInset = 0;
  function applyViewOffset() {
    const w = stage.clientWidth,
      h = Math.max(stage.clientHeight, 1);
    if (sheetInset > 0.5) camera.setViewOffset(w, h, 0, sheetInset / 2, w, h);
    else camera.clearViewOffset();
  }
  // `cap`: the framing never works with less than a fifth of the stage; the labels' cut-off
  // line uses the sheet's real top (uncapped), so no label peeks out from under a full sheet.
  function measureSheetInset(stageRect: DOMRect, cap = true) {
    const el = dom.sheet;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    // The desktop side panel sits beside the stage, not over it.
    if (r.left > stageRect.left + 8 || r.right < stageRect.right - 8) return 0;
    const covered = Math.max(0, stageRect.bottom - r.top);
    return cap ? Math.min(stageRect.height * 0.8, covered) : covered;
  }
  let fitMaxDistance = 0;
  function resize() {
    const w = stage.clientWidth,
      h = stage.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    applyViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    controls.maxDistance = Math.max(17 * aspectFit(), fitMaxDistance * 1.3);
    invalidate(); // a resized canvas is blank until drawn again
  }
  window.addEventListener("resize", resize);
  // The stage can change size without a window resize (phone layout settling,
  // panel/maximize toggles), so watch the element itself as well.
  const stageObserver = new ResizeObserver(() => {
    resize();
    // Re-fit the current preset view to the new aspect unless the user has
    // orbited away from it (an in-flight animation re-fits every frame anyway).
    if (shot && !camAnim) {
      const f = fitView(shot);
      camera.position.copy(f.pos);
      controls.target.copy(f.target);
    }
  });
  stageObserver.observe(stage);

  scene.add(new THREE.HemisphereLight(0x8fa8bf, 0x0a0e14, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(5, 8, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x49d4c9, 0.35);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  const fillLight = new THREE.PointLight(0xffffff, 0.25, 20);
  fillLight.position.set(-3, 2, 3);
  scene.add(fillLight);
  const gridHelper = new THREE.GridHelper(16, 32, 0x2a3d52, 0x1b2836);
  gridHelper.position.y = -0.001;
  scene.add(gridHelper);
  // Light mode renders the models in full colour on a pale studio-grey stage
  // (explorer.css), so the scene follows the live theme toggle (<html
  // data-theme>): fog fades distance toward that backdrop instead of navy, the
  // floor grid is softened, and the env map is lifted a touch for the brighter
  // surroundings.
  const gridMat = gridHelper.material as import("three").LineBasicMaterial;
  gridMat.transparent = true;
  const fog = scene.fog as THREE.Fog;
  const applyGridTheme = () => {
    const light = readTheme() === "light";
    gridMat.opacity = light ? 0.16 : 1;
    fog.color.setHex(light ? 0xd3d9e0 : 0x141c28);
    scene.environmentIntensity = light ? 0.7 : 0.55;
    renderer.toneMappingExposure = light ? 1.0 : 1.05;
    invalidate();
  };
  applyGridTheme();
  const themeObserver = new MutationObserver(applyGridTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const productRoot = new THREE.Group();
  scene.add(productRoot);
  const markersGroup = new THREE.Group();
  scene.add(markersGroup);

  const layerGroups = sector.layerNames.map(() => {
    const g = new THREE.Group();
    productRoot.add(g);
    return g;
  });
  const staticGroup = new THREE.Group();
  productRoot.add(staticGroup);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productState = sector.build({ THREE, layerGroups, staticGroup }) as any;

  let currentLevel = 0;
  let targetLevel = 0;
  let currentZoneId: string | null = null;
  let hoveredZoneId: string | null = null;
  let impact: ImpactMap | null = null;
  // With a scenario on (and no zone picked) the untouched layers fade back so the hit ones stand out.
  const isDimmedZone = (id: string) => (currentZoneId ? id !== currentZoneId : impact ? !impact[id] : false);
  const labelsVisible = true;
  let deepDiveActive = false;
  let deepStage = 0;
  // The preset view the camera is parked on (null once the user orbits). `fit` views are
  // pulled back until the whole model fits the stage (see fitView).
  type Shot = { pos: number[]; target: number[]; fit: boolean };
  let shot: Shot | null = null;
  // While a system is selected the camera eases over to centre it; this is the framing to
  // go back to on deselect (dropped as soon as the user orbits, since they've moved on).
  let focusReturn: { pos: THREE.Vector3; target: THREE.Vector3; shot: Shot | null } | null = null;
  let camAnim: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    t0: number;
    dur: number;
  } | null = null;

  function applyLevel(v: number) {
    if (productState?.applyLevel) productState.applyLevel(v);
    const roundedIdx = Math.round(v);
    const onStop = Math.abs(v - roundedIdx) < 0.05;
    // One button per layer: the button for the layer we're settled on is lit.
    dom.layerButtons.forEach((btn, level) => {
      const active = roundedIdx === level && onStop;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    // Not while the user is dragging it (it has focus then), or it would fight their finger.
    if (dom.slider && document.activeElement !== dom.slider) dom.slider.value = String(v);
    if (!deepDiveActive) updateBreadcrumb();
  }

  // Each part is its own element so CSS can keep the crumb on one line and truncate only
  // the system's name (labels are authored text, so they go in as textContent, not HTML).
  // The nodes are built once and updated in place (applyLevel runs every frame of a tween).
  // No close button here: the system closes from the panel's × (the sheet handle's on phones),
  // and a second × in the crumb did the same thing.
  let crumbKey = "";
  let crumb: { layer: HTMLElement; zoneParts: HTMLElement[]; zone: HTMLElement } | null = null;
  function crumbNodes() {
    if (crumb && dom.breadcrumb.contains(crumb.layer)) return crumb;
    const el = (tag: string, cls: string, text: string) => {
      const n = document.createElement(tag);
      n.className = cls;
      n.textContent = text;
      return n;
    };
    const layer = el("span", "bc-layer", "");
    const zone = el("b", "bc-zone", "");
    const zoneParts = [el("span", "bc-sep", "\u203a"), zone];
    dom.breadcrumb.replaceChildren(el("b", "bc-root", "Product"), el("span", "bc-sep bc-root", "\u203a"), layer, ...zoneParts);
    crumb = { layer, zoneParts, zone };
    return crumb;
  }
  function updateBreadcrumb() {
    const z = currentZoneId ? sector.zones.find((zz) => zz.id === currentZoneId) : null;
    // With a system picked, name the layer that shows it (where the model is heading) rather
    // than each layer the tween passes through, so the crumb doesn't change under the reader.
    const idx = z && z.layer != null && z.layer >= 0 && z.layer < sector.layerNames.length ? z.layer : Math.round(currentLevel);
    const layerName = sector.layerNames[idx] ?? sector.layerNames[0];
    const key = `${layerName}|${currentZoneId ?? ""}`;
    const nodes = crumbNodes();
    if (key === crumbKey) return; // applyLevel runs every frame of a layer tween
    crumbKey = key;
    nodes.layer.textContent = layerName;
    nodes.zone.textContent = z ? z.label : currentZoneId ?? "";
    nodes.zoneParts.forEach((n) => (n.hidden = !currentZoneId));
  }

  // Phone tags that had to move off their marker to stay clear of the others get a thin
  // leader back to it, so a displaced tag still points at its part.
  const tagLeaders = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  tagLeaders.setAttribute("class", "mtag-leaders");
  tagLeaders.setAttribute("aria-hidden", "true");
  mobileTags.appendChild(tagLeaders);
  const zones = new Map<string, ZoneRuntime>();
  const markerMeshes: THREE.Mesh[] = [];

  for (const z of sector.zones) {
    // Markers draw over the model (depthTest off): the shells are now solid,
    // so anchors on internal parts would otherwise be hidden at the outer layer.
    const mat = new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 1, depthTest: false });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), mat);
    marker.renderOrder = 10;
    marker.position.set(z.pos[0], z.pos[1], z.pos[2]);
    marker.userData.zoneId = z.id;
    markersGroup.add(marker);
    markerMeshes.push(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.09, 24),
      new THREE.MeshBasicMaterial({ color: z.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthTest: false })
    );
    ring.renderOrder = 10;
    ring.position.copy(marker.position);
    ring.lookAt(camera.position);
    ring.userData.isRing = true;
    ring.userData.parent = marker;
    markersGroup.add(ring);

    // Callouts and phone tags are real buttons, so they're reachable and operable by
    // keyboard and announced as interactive.
    const box = document.createElement("button");
    box.type = "button";
    box.className = "callout";
    box.textContent = z.label;
    box.setAttribute("aria-pressed", "false");
    box.style.setProperty("--zc", z.color);
    box.addEventListener("click", () => {
      if (performance.now() < suppressLabelClickUntil) return;
      selectZone(z.id);
    });
    box.addEventListener("pointerenter", () => setHoverGuarded(z.id));
    box.addEventListener("pointerleave", () => setHoverGuarded(null, z.id));
    const railEl = { left: railLeft, right: railRight, top: railTop, bottom: railBottom }[z.side];
    railEl.appendChild(box);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", z.color);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "3 3");
    line.setAttribute("opacity", "0.5");
    leaderSvg.appendChild(line);

    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "mtag";
    // The text truncates inside its own span, so the tag itself needn't clip (overflow) and its
    // enlarged touch area (::after, explorer.css) isn't cut off.
    const tagText = document.createElement("span");
    tagText.className = "mtag-t";
    tagText.textContent = z.label;
    tag.appendChild(tagText);
    // Phone tags are truncated to keep the model visible; the full name stays accessible.
    tag.setAttribute("aria-label", z.label);
    tag.title = z.label;
    tag.setAttribute("aria-pressed", "false");
    tag.style.setProperty("--zc", z.color);
    tag.addEventListener("click", () => {
      if (performance.now() < suppressLabelClickUntil) return; // that touch was a pinch/drag
      selectZone(z.id);
    });
    mobileTags.appendChild(tag);
    const tagLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tagLine.setAttribute("stroke", z.color);
    tagLine.setAttribute("stroke-width", "1.25");
    tagLeaders.appendChild(tagLine);

    zones.set(z.id, { def: z, marker, ring, box, tag, line, tagLine, tw: 0, th: 0, boxRect: null });
  }

  function setHoverGuarded(id: string | null, onlyIfCurrent?: string) {
    if (onlyIfCurrent !== undefined && hoveredZoneId !== onlyIfCurrent) return;
    setHover(id);
  }
  function setHover(id: string | null) {
    if (id === hoveredZoneId) return;
    hoveredZoneId = id;
    invalidate();
  }

  // A manual layer move (button, slider, layer-specific camera view) away from the
  // selected system's own layer clears the selection: otherwise the panel stays open with
  // a leader line pointing at a part that has just been peeled away or covered up.
  function leaveLayer(level: number) {
    if (!currentZoneId) return;
    const zl = zones.get(currentZoneId)?.def.layer;
    if (zl != null && Math.round(level) !== zl) selectZone(null, { keepLayer: true });
  }
  function setUserLevel(level: number, immediate: boolean) {
    invalidate();
    targetLevel = level;
    if (immediate) {
      currentLevel = level;
      applyLevel(currentLevel);
    }
    leaveLayer(level);
  }

  const IMPACT_COLOR = { headwind: 0xe8705e, tailwind: 0x3fbf8a };
  function setImpact(next: ImpactMap | null) {
    invalidate();
    impact = next && Object.keys(next).length ? next : null;
    for (const [zid, zr] of zones) {
      const hit = impact?.[zid];
      const mats = [zr.marker.material, zr.ring.material] as THREE.MeshBasicMaterial[];
      mats.forEach((m) => m.color.set(hit ? IMPACT_COLOR[hit.effect] : zr.def.color));
      zr.marker.userData.impactSeverity = hit?.severity ?? 0;
      zr.tag.dataset.impact = hit ? hit.effect : "";
      zr.box.dataset.impact = hit ? hit.effect : "";
      zr.tag.dataset.severity = hit ? String(hit.severity) : "";
      zr.box.dataset.severity = hit ? String(hit.severity) : "";
    }
  }

  // Closing a system (✕, closing the panel, tapping away) returns to the whole model: layer 0
  // and the opening camera view. Only an explicit layer change by the user keeps the layer
  // (keepLayer), since that deselect is a side effect of them choosing where to look.
  function selectZone(id: string | null, opts: { keepLayer?: boolean } = {}) {
    invalidate();
    const closing = id == null && currentZoneId != null && !opts.keepLayer;
    currentZoneId = id;
    // Drop any hover with it. The panel's "Systems in this model" rows set hover on mouseenter
    // and are unmounted by the very click that picks one, so their mouseleave never fires: the
    // picked label kept its thick, solid leader line after the card was closed.
    hoveredZoneId = null;
    // Peel the model to the layer where the picked system is actually visible, so
    // choosing "e-axle" from any entry point (marker, callout, Systems list, deep
    // link) shows the drive unit rather than a marker floating over the paint.
    const layer = id ? zones.get(id)?.def.layer : undefined;
    if (layer != null && !deepDiveActive && layer >= 0 && layer < sector.layerNames.length) targetLevel = layer;
    for (const [zid, zr] of zones) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zr.marker.userData as any).selected = zid === id;
      zr.box.setAttribute("aria-pressed", String(zid === id));
      zr.tag.setAttribute("aria-pressed", String(zid === id));
    }
    if (!deepDiveActive) {
      if (closing) {
        targetLevel = 0;
        flyTo(defaultViewId);
      }
      updateBreadcrumb();
      if (id) focusZone(id);
      else if (!closing) unfocus();
    }
    callbacks.onZoneChange(id, closing && !deepDiveActive);
  }

  // Bring the picked system into view. With a bottom sheet (phones/tablets) the panel is
  // about to cover the lower part of the stage, so always bring the marker to the middle
  // of the strip above the sheet (the view offset does the vertical part) - but pan
  // sideways only when it would sit near a side edge, so the rest of the model stays in
  // frame instead of being cropped to centre a system near one end. Beside a side panel
  // only move when the marker would otherwise be off-stage or squeezed against an edge.
  function focusZone(id: string) {
    const z = zones.get(id)?.def;
    if (!z) return;
    const p = new THREE.Vector3(z.pos[0], z.pos[1], z.pos[2]);
    const sheetMode = sheetLayout();
    // Judge framing from where the camera is heading, not where it is mid-flight (a deep link
    // selects the system while the opening shot is still animating in).
    const from = camAnim ? camAnim.endTarget : controls.target;
    const fromPos = camAnim ? camAnim.endPos : camera.position;
    const cam = camera.clone();
    cam.position.copy(fromPos);
    cam.lookAt(from);
    cam.updateMatrixWorld();
    const v = p.clone().project(cam);
    const w = stage.clientWidth,
      h = stage.clientHeight;
    const sx = (v.x * 0.5 + 0.5) * w,
      sy = (-v.y * 0.5 + 0.5) * h;
    const m = Math.min(90, w * 0.15);
    const xInFrame = v.z <= 1 && sx > m && sx < w - m;
    if (!sheetMode && xInFrame && sy > 60 && sy < h - 60) return;
    if (!focusReturn) focusReturn = { pos: fromPos.clone(), target: from.clone(), shot };
    const shift = p.clone().sub(from);
    if (sheetMode && xInFrame) {
      // Drop the screen-horizontal part of the move: centre vertically, keep the sideways framing.
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
      shift.addScaledVector(right, -shift.dot(right));
    }
    const target = from.clone().add(shift);
    const endPos = fromPos.clone().add(shift);
    shot = null;
    camAnim = { startPos: camera.position.clone(), endPos, startTarget: controls.target.clone(), endTarget: target, t0: performance.now(), dur: 700 };
  }
  function unfocus() {
    if (!focusReturn) return;
    const back = focusReturn;
    focusReturn = null;
    shot = back.shot;
    const f = back.shot ? fitView(back.shot) : { pos: back.pos, target: back.target };
    camAnim = {
      startPos: camera.position.clone(),
      endPos: f.pos,
      startTarget: controls.target.clone(),
      endTarget: f.target,
      t0: performance.now(),
      dur: 700,
    };
  }

  // The whole model's extent, for framing the overview shots. Measured once at level 0 and
  // clamped to the floor grid so a stray far-off prop can't push the camera out.
  // Uses each mesh's own box corners rather than the whole model's box: a crane on one
  // corner would otherwise put a phantom point high above every other corner too.
  const modelCorners: THREE.Vector3[] = [];
  {
    const clampBox = new THREE.Box3(new THREE.Vector3(-8, -2, -8), new THREE.Vector3(8, 12, 8));
    const b = new THREE.Box3();
    const seen = new Set<string>();
    productRoot.updateMatrixWorld(true);
    productRoot.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      b.setFromObject(o).intersect(clampBox);
      if (b.isEmpty()) return;
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        const key = `${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        modelCorners.push(c);
      }
    });
  }
  const modelBox = new THREE.Box3().setFromPoints(modelCorners);
  // Smallest camera distance (along the view's direction) at which the whole model fits
  // the visible part of the stage with a small margin, for the current aspect.
  function viewBasis(dir: THREE.Vector3) {
    const f = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(f, camera.up);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    return { right, up };
  }
  // Half-extents of the visible frame as tangents (vertical: the strip above the sheet).
  function frameTans(fill: number) {
    const h = Math.max(stage.clientHeight, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * fill;
    return { tanV: tan * Math.max(0.3, (h - sheetInset) / h), tanH: tan * camera.aspect };
  }
  function fitDistance(dir: THREE.Vector3, t: THREE.Vector3, fill = 0.9, points = modelCorners) {
    if (!points.length) return 0;
    const { right, up } = viewBasis(dir);
    const { tanV, tanH } = frameTans(fill);
    let need = 0;
    for (const c of points) {
      const q = c.clone().sub(t);
      const along = q.dot(dir);
      need = Math.max(need, along + Math.abs(q.dot(right)) / tanH, along + Math.abs(q.dot(up)) / tanV);
    }
    return need;
  }
  // The model's on-screen extent (as tangents) seen from t + dir * dist.
  function screenExtent(dir: THREE.Vector3, t: THREE.Vector3, dist: number) {
    const { right, up } = viewBasis(dir);
    const cam = t.clone().addScaledVector(dir, dist);
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const c of modelCorners) {
      const q = c.clone().sub(cam);
      const z = Math.max(1e-3, -q.dot(dir));
      const x = q.dot(right) / z,
        y = q.dot(up) / z;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return { x0, x1, y0, y1, right, up };
  }
  // Portrait stages (phones, tablets held upright): the authored overview is a low, wide
  // three-quarter shot, so once it is pulled back to fit the narrow width the model is a thin
  // band with empty stage above and below. Tilt the camera up (only up: by at most 20°, to at most 50°) and turn it up to 30° either way, which
  // shows more of the floor plan for the same width, and re-centre the model in the visible
  // strip, picking the angle that fills the most of the frame.
  function portraitFit(dir0: THREE.Vector3, t0: THREE.Vector3) {
    const az = Math.atan2(dir0.x, dir0.z);
    const el0 = Math.asin(THREE.MathUtils.clamp(dir0.y, -1, 1));
    const cap = Math.max(el0, Math.min(el0 + THREE.MathUtils.degToRad(20), THREE.MathUtils.degToRad(50)));
    const { tanV, tanH } = frameTans(1);
    let best: { dir: THREE.Vector3; t: THREE.Vector3; dist: number; score: number } | null = null;
    const steps = 6;
    const deg = THREE.MathUtils.degToRad(1);
    for (let i = 0; i <= steps; i++) for (const daz of [0, -10, 10, -20, 20, -30, 30]) {
      const el = el0 + ((cap - el0) * i) / steps;
      const a = az + daz * deg;
      const dir = new THREE.Vector3(Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el));
      const t = t0.clone();
      // Every system's marker stays well inside the frame (its tag sits above it); the model's
      // outermost corners may run a few percent past the sides, which on a diagonal plinth only
      // trims its tips and lets the whole model be drawn noticeably larger.
      const need = () => Math.max(fitDistance(dir, t, 1.04), fitDistance(dir, t, 0.86, markerPoints));
      let dist = need();
      for (let k = 0; k < 3; k++) {
        const e = screenExtent(dir, t, dist);
        t.addScaledVector(e.right, ((e.x0 + e.x1) / 2) * dist).addScaledVector(e.up, ((e.y0 + e.y1) / 2) * dist);
        dist = need();
      }
      const e = screenExtent(dir, t, dist);
      // A turned or steeper view has to earn it: the further from the authored angle, the
      // more of the frame it must fill to win.
      const fillFrac = (Math.min(2, (e.x1 - e.x0) / tanH) * Math.min(2, (e.y1 - e.y0) / tanV)) / 4;
      const score = fillFrac * (1 - 0.005 * Math.abs(daz)) * (1 - 0.15 * ((el - el0) / deg / 30));
      if (!best || score > best.score) best = { dir, t, dist, score };
    }
    return best!;
  }
  // Views are authored for a landscape stage. Overview shots (`fit`) back off until the
  // whole model fits - narrow phone stages and the desktop stage squeezed between the
  // rail and the panel both cropped wide plinths otherwise; on portrait stages they are also
  // tilted and re-centred (portraitFit). Close-ups keep their framing and are only pulled
  // back in proportion to how portrait the stage is.
  const sheetLayout = () => !!dom.sheet && getComputedStyle(dom.sheet).position === "fixed";
  let fitCache: { s: Shot; key: string; pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  function fitView(s: Shot) {
    const key = `${camera.aspect.toFixed(4)}|${Math.round(sheetInset)}|${stage.clientHeight}|${sheetLayout()}`;
    if (!fitCache || fitCache.s !== s || fitCache.key !== key) fitCache = { s, key, ...computeFit(s) };
    return { pos: fitCache.pos.clone(), target: fitCache.target.clone() };
  }
  function computeFit(s: Shot) {
    const t = new THREE.Vector3(s.target[0], s.target[1], s.target[2]);
    const dir = new THREE.Vector3(s.pos[0], s.pos[1], s.pos[2]).sub(t);
    const authored = dir.length();
    dir.normalize();
    // A camera placed inside the model (a cabin view) stays where it was put: pulled back for a
    // portrait stage it would end up outside, looking at the bodywork instead of the interior.
    if (!s.fit) {
      // Short shots only (today just the EV cabin): a plinth's box also contains close-ups taken
      // over it, such as cockpit and nacelle shots, which still need the portrait pull-back.
      const inside = authored < 1.6 && modelBox.containsPoint(t.clone().addScaledVector(dir, authored));
      return { pos: t.clone().addScaledVector(dir, authored * (inside ? 1 : aspectFit())), target: t };
    }
    let dist: number;
    let target = t;
    // Only in the phone/tablet layout (bottom sheet over the stage). The desktop stage between
    // the rail and the side panel can be portrait too, but its overviews are approved as authored.
    // Every sector unless it opts out (SectorDef.portraitFit === false), and tablets held upright
    // (stage 600px+ wide) always: an authored low, wide shot left the model a thin band across the
    // middle third with empty stage above and below.
    if ((sector.portraitFit !== false || stage.clientWidth >= 600) && camera.aspect < 1 && sheetLayout() && modelCorners.length) {
      const p = portraitFit(dir, t);
      dir.copy(p.dir);
      target = p.t;
      dist = p.dist;
    } else dist = Math.max(authored, fitDistance(dir, t));
    if (dist > fitMaxDistance) {
      fitMaxDistance = dist;
      controls.maxDistance = Math.max(controls.maxDistance, dist * 1.3);
    }
    return { pos: target.clone().addScaledVector(dir, dist), target };
  }
  const markerPoints = sector.zones.map((z) => new THREE.Vector3(z.pos[0], z.pos[1], z.pos[2]));
  const defaultViewId = sector.defaultView || sector.views[0]?.id;
  const isFitView = (id: string) => id === defaultViewId || id === "top";

  function flyTo(viewId: string) {
    invalidate();
    const v = sector.views.find((x) => x.id === viewId) as (SectorDef["views"][number] & { layer?: number }) | undefined;
    if (!v) return;
    focusReturn = null;
    // A view from under the floor shows the whole underside, so it is framed like an overview.
    const fromBelow = v.pos[1] < 0;
    // Leaving it, the floor clamp waits for the flight to land: applied at once, it would snap
    // the camera from under the model up to the horizon.
    if (fromBelow) controls.maxPolarAngle = Math.PI * 0.97;
    floorAfterFlight = !fromBelow && controls.maxPolarAngle !== FLOOR_POLAR;
    shot = { pos: v.pos, target: v.target, fit: isFitView(v.id) || fromBelow };
    // A view about one layer (e.g. "Underground") also peels the model to that layer.
    if (v.layer != null && v.layer >= 0 && v.layer < sector.layerNames.length) {
      exitDeepDive();
      setUserLevel(v.layer, false);
    }
    const f = fitView(shot);
    camAnim = {
      startPos: camera.position.clone(),
      endPos: f.pos,
      startTarget: controls.target.clone(),
      endTarget: f.target,
      t0: performance.now(),
      dur: 900,
    };
  }

  // ---- deep dive (only sectors that define productState.deep support this) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deepDiveDef = (sector as any).deepDive as
    | {
        entryCamera: { pos: number[]; target: number[] };
        stageCount: number;
        buttonLabel: string;
        breadcrumbTrail: (stage: number) => string[];
        applyStage: (stage: number, refs: unknown) => void;
        exit: (refs: unknown) => void;
      }
    | undefined;

  function updateDeepBreadcrumb() {
    if (!deepDiveDef) return;
    const trail = deepDiveDef.breadcrumbTrail(deepStage);
    crumbKey = "";
    dom.breadcrumb.innerHTML = trail.map((t, i) => (i === trail.length - 1 ? `<b>${t}</b>` : t)).join(" &rsaquo; ");
  }

  function enterDeepDive() {
    invalidate();
    if (!deepDiveDef) return;
    deepDiveActive = true;
    deepStage = 0;
    targetLevel = sector.layerNames.length - 1;
    currentLevel = targetLevel;
    applyLevel(currentLevel);
    const c = deepDiveDef.entryCamera;
    focusReturn = null;
    shot = { pos: c.pos, target: c.target, fit: false };
    const f = fitView(shot);
    camAnim = {
      startPos: camera.position.clone(),
      endPos: f.pos,
      startTarget: controls.target.clone(),
      endTarget: f.target,
      t0: performance.now(),
      dur: 1000,
    };
    deepDiveDef.applyStage(deepStage, productState.deep);
    updateDeepBreadcrumb();
    callbacks.onDeepDiveStageChange(deepStage);
  }
  function exitDeepDive() {
    invalidate();
    if (!deepDiveActive || !deepDiveDef) return;
    deepDiveActive = false;
    deepDiveDef.exit(productState.deep);
    updateBreadcrumb();
    callbacks.onDeepDiveStageChange(null);
  }
  function cycleDeepStage() {
    invalidate();
    if (!deepDiveDef) return;
    deepStage = (deepStage + 1) % deepDiveDef.stageCount;
    deepDiveDef.applyStage(deepStage, productState.deep);
    updateDeepBreadcrumb();
    callbacks.onDeepDiveStageChange(deepStage);
  }

  // ---- raycasting ----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos: { x: number; y: number } | null = null;

  function setPointer(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    return { x: e.clientX, y: e.clientY };
  }
  const onPointerDown = (e: PointerEvent) => {
    downPos = setPointer(e);
  };
  const onPointerUp = (e: PointerEvent) => {
    const p = setPointer(e);
    if (!downPos) return;
    const dist = Math.hypot(p.x - downPos.x, p.y - downPos.y);
    downPos = null;
    if (dist > 6) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    if (hits.length) selectZone(hits[0].object.userData.zoneId as string);
    // A tap on empty stage (not a drag - those return above) closes the open system.
    else if (currentZoneId) selectZone(null);
  };
  const onPointerMove = (e: PointerEvent) => {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    const newHover = hits.length ? (hits[0].object.userData.zoneId as string) : null;
    if (newHover !== hoveredZoneId) {
      setHover(newHover);
      renderer.domElement.style.cursor = hoveredZoneId ? "pointer" : "grab";
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  // ---- callout positioning (every frame) ----
  // Scratch vector for per-frame maths: this runs for every system on every frame, so allocating
  // here meant thousands of short-lived objects a second for the garbage collector.
  const scratch = new THREE.Vector3();
  let lastViewBox = "";
  let compactTags = false;
  let compactAt = 0;
  function updateCallouts() {
    // Every layout read happens first, then every write. Reading a size or position after a style
    // write makes the browser lay the page out again, and that used to happen once per system per
    // frame (each tag's offsetWidth / each callout's rect read right after the previous one moved).
    const stageRect = stage.getBoundingClientRect();
    const w = stageRect.width,
      h = stageRect.height;
    const inset = measureSheetInset(stageRect);
    const sheetTop = h - measureSheetInset(stageRect, false);
    // Phones/tablets show the tags over the model; wider screens the callout rails (one or the
    // other is display:none, so only the visible set is measured and positioned).
    const phoneTags = mobileTags.offsetParent !== null;
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    if (phoneTags) {
      // Keep tags out from under the stage's own floating chrome (breadcrumb, buttons, pill).
      stage.querySelectorAll<HTMLElement>(".breadcrumb, .reset-btn, .controls-btn, .scn-pill").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width) placed.push({ x0: r.left - stageRect.left, x1: r.right - stageRect.left, y0: r.top - stageRect.top, y1: r.bottom - stageRect.top });
      });
    }
    for (const zr of zones.values()) {
      if (phoneTags) {
        zr.tw = zr.tag.offsetWidth;
        zr.th = zr.tag.offsetHeight;
      } else zr.boxRect = zr.box.getBoundingClientRect();
    }

    // ---- writes only from here ----
    const viewBox = `0 0 ${w} ${h}`;
    if (viewBox !== lastViewBox) {
      lastViewBox = viewBox;
      leaderSvg.setAttribute("viewBox", viewBox);
    }
    if (Math.abs(inset - sheetInset) > 0.5) {
      sheetInset = inset;
      applyViewOffset();
    }
    // Labels stop at the sheet's real top edge.
    const visibleH = Math.min(h - sheetInset, sheetTop);

    // Phone tags are anchored to their 3D markers, which often sit close together; stack them
    // so none overlaps. Most important first (selected, then scenario-hit) so they keep their spot.
    const rank = (zr: ZoneRuntime) => (currentZoneId === zr.def.id ? 0 : impact?.[zr.def.id] ? 1 : 2);
    const ordered = phoneTags ? [...zones.values()].sort((a, b) => rank(a) - rank(b)) : zones.values();
    // Phones label every system (the user wants the whole map visible); with one selected the
    // others stay readable but lighter (isDimmed). Tags are stacked so none overlap.
    const EDGE = 8;
    let anyCrowded = false;
    // De-emphasised labels (.dimmed in explorer.css) keep their solid backing and only soften
    // text and border: fading the whole label left it unreadable over pale parts in dark mode.

    for (const zr of ordered) {
      const z = zr.def;
      const v = scratch.set(z.pos[0], z.pos[1], z.pos[2]).project(camera);
      const behind = v.z > 1;
      let px = (v.x * 0.5 + 0.5) * w;
      let py = (-v.y * 0.5 + 0.5) * h;
      // Marker outside the visible stage (or behind the camera): its callout/tag would
      // otherwise be clamped to an edge and appear to label some unrelated part.
      const offscreen = behind || px < 0 || px > w || py < 0 || py > visibleH;
      py = Math.max(EDGE, Math.min(h - EDGE, py));

      const isSelected = currentZoneId === z.id;
      const isDimmed = isDimmedZone(z.id);

      if (phoneTags) {
        const tagHidden = offscreen;
        const mx = px,
          my = py;
        let crowded = false;
        if (!tagHidden) {
          const tagScale = isSelected ? 1.08 : 1;
          // .mtag is drawn at translate(-50%, -138%) of its left/top point.
          const tw = zr.tw * tagScale;
          const th = zr.th * tagScale;
          // At least EDGE px from the stage's sides.
          px = Math.max(Math.min(w / 2, EDGE + tw / 2), Math.min(Math.max(w / 2, w - EDGE - tw / 2), px));
          const xMin = Math.min(w / 2, EDGE + tw / 2),
            xMax = Math.max(w / 2, w - EDGE - tw / 2);
          const rectAt = (x: number, y: number) => ({ x0: x - tw / 2 - 2, x1: x + tw / 2 + 2, y0: y - 1.38 * th - 2, y1: y - 0.38 * th + 2 });
          const overlap = (r: ReturnType<typeof rectAt>) =>
            placed.reduce((s, p) => s + Math.max(0, Math.min(r.x1, p.x1) - Math.max(r.x0, p.x0)) * Math.max(0, Math.min(r.y1, p.y1) - Math.max(r.y0, p.y0)), 0);
          // Find the free slot nearest the marker: a row up or down, or a nudge sideways (cheaper
          // than a row, since a sideways tag still sits over its marker). The most important tags
          // (selected, scenario-hit) were placed first. If nothing is free, take the slot that
          // overlaps least - every tag stays at full strength (labels never fade unless a
          // system is picked) and lies under the placed ones.
          const rowH = th + 3;
          let best: { x: number; y: number; r: ReturnType<typeof rectAt>; over: number; score: number } | null = null;
          // A wide search: with the sheet open the strip above it is short, and a narrow one
          // ran out of free slots and stacked names on top of each other.
          // Besides nudges around the marker, every row also tries a sweep across the full stage
          // width (a leader line then joins tag and marker): with a company card open the strip
          // above the sheet is only a few rows tall, and the nudges alone ran out of free slots.
          const xs = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05].map((sx) => px + sx * tw);
          for (let i = 0; i <= 8; i++) xs.push(xMin + ((xMax - xMin) * i) / 8);
          for (let k = -12; k <= 12; k++) {
            for (const xc of xs) {
              const x = Math.max(xMin, Math.min(xMax, xc));
              const y = py + k * rowH;
              const r = rectAt(x, y);
              if (r.y0 < EDGE || r.y1 > visibleH - EDGE) continue;
              const cost = Math.abs(k) * rowH + Math.abs(x - px) * 0.6 + (k < 0 ? 0 : 2);
              const over = overlap(r);
              const score = over > 0 ? 1e6 + over + cost * 4 : cost;
              if (!best || score < best.score) best = { x, y, r, over, score };
            }
          }
          if (best) {
            placed.push(best.r);
            px = best.x;
            py = best.y;
            crowded = best.over > 0 && !isSelected;
            if (crowded) anyCrowded = true;
          } else {
            // No row fits at all (a very short strip): keep the tag inside the strip above the
            // sheet rather than at its marker, where it was cut by the stage edge or the sheet.
            py = Math.max(EDGE + 1.38 * th, Math.min(visibleH - EDGE + 0.38 * th, py));
            anyCrowded = true;
          }
        }
        // Hidden tags still sit inside the stage, so they never widen its scrollable area.
        px = Math.max(0, Math.min(w, px));
        zr.tag.style.left = px + "px";
        zr.tag.style.top = py + "px";
        zr.tag.classList.toggle("selected", isSelected);
        zr.tag.classList.toggle("dimmed", isDimmed);
        const tagShown = labelsVisible && !tagHidden;
        zr.tag.style.opacity = tagShown ? "1" : "0";
        zr.tag.style.zIndex = isSelected ? "3" : crowded ? "1" : "2";
        zr.tag.style.pointerEvents = tagShown ? "auto" : "none";
        zr.tag.tabIndex = tagShown ? 0 : -1;
        zr.tag.setAttribute("aria-hidden", String(!tagShown));
        // Leader from the marker to the nearest point of the tag's lower (or upper) edge,
        // drawn only when the tag had to move clear of its usual spot just above the marker.
        const tw = zr.tw,
          th = zr.th;
        const below = my > py - 0.38 * th;
        const ax = Math.max(px - tw / 2 + 6, Math.min(px + tw / 2 - 6, mx));
        const ay = below ? py - 0.38 * th : py - 1.38 * th;
        const far = Math.hypot(ax - mx, ay - my) > th * 0.9;
        zr.tagLine.setAttribute("x1", String(mx));
        zr.tagLine.setAttribute("y1", String(my));
        zr.tagLine.setAttribute("x2", String(ax));
        zr.tagLine.setAttribute("y2", String(ay));
        zr.tagLine.setAttribute("opacity", String(tagShown && far ? (isDimmed ? 0.4 : 0.75) : 0));
        continue;
      }

      const boxRect = zr.boxRect;
      if (!boxRect) continue;
      let anchorX: number, anchorY: number;
      if (z.side === "left") {
        anchorX = boxRect.right - stageRect.left;
        anchorY = (boxRect.top + boxRect.bottom) / 2 - stageRect.top;
      } else if (z.side === "right") {
        anchorX = boxRect.left - stageRect.left;
        anchorY = (boxRect.top + boxRect.bottom) / 2 - stageRect.top;
      } else if (z.side === "top") {
        anchorX = (boxRect.left + boxRect.right) / 2 - stageRect.left;
        anchorY = boxRect.bottom - stageRect.top;
      } else {
        anchorX = (boxRect.left + boxRect.right) / 2 - stageRect.left;
        anchorY = boxRect.top - stageRect.top;
      }

      zr.line.setAttribute("x1", String(anchorX));
      zr.line.setAttribute("y1", String(anchorY));
      zr.line.setAttribute("x2", String(px));
      zr.line.setAttribute("y2", String(py));
      const active = isSelected || hoveredZoneId === z.id;
      zr.line.setAttribute("stroke-width", active ? "2.5" : "1.5");
      zr.line.setAttribute("opacity", String(offscreen ? 0 : active ? 0.95 : isDimmed ? 0.2 : 0.45));
      zr.line.setAttribute("stroke-dasharray", active ? "none" : "3 3");
      zr.box.classList.toggle("selected", isSelected);
      zr.box.classList.toggle("dimmed", isDimmed);
      zr.box.classList.toggle("off", offscreen);
      const boxShown = labelsVisible && !offscreen;
      zr.box.style.opacity = boxShown ? "1" : "0";
      zr.box.style.pointerEvents = boxShown ? "auto" : "none";
      zr.box.tabIndex = boxShown ? 0 : -1;
      zr.box.setAttribute("aria-hidden", String(!boxShown));
    }
    leaderSvg.style.opacity = labelsVisible ? "1" : "0";
    // Still crowded after the search (a short strip above an open company card): switch the
    // unpicked tags to a smaller size, which the next frame measures and re-stacks (layoutChanged
    // sees the new tag sizes). It switches back only once the strip has grown, so it can't flicker.
    if (phoneTags) {
      if (!compactTags && anyCrowded) {
        compactTags = true;
        compactAt = visibleH;
        mobileTags.classList.add("compact");
        invalidate();
      } else if (compactTags && visibleH > compactAt + 40) {
        compactTags = false;
        mobileTags.classList.remove("compact");
        invalidate();
      }
    }
  }

  // ---- animation loop ----
  // Camera distance (scene units) from which a marker is drawn at full size; see the marker loop.
  const MARKER_FULL_SIZE_AT = 6;
  // Models with their own motion (build() returns `animated: true`) keep the loop drawing.
  const animated = !!productState?.animated;
  // Below these an easing value counts as settled (sub-pixel, invisible), so the loop can go idle.
  const SETTLED_POS = 1e-4;
  const SETTLED_EASE = 1e-3;
  // What the labels depend on besides the camera: the stage's box, the sheet's top edge and each
  // label's size/rail position. Compared on idle frames only, and it is layout reads alone (no
  // writes before them), so it costs no forced layout.
  let lastLayout = "";
  function layoutChanged() {
    const r = stage.getBoundingClientRect();
    let sig = `${r.left},${r.top},${r.width},${r.height}|${dom.sheet ? dom.sheet.getBoundingClientRect().top : ""}`;
    if (mobileTags.offsetParent !== null) {
      for (const zr of zones.values()) sig += `|${zr.tag.offsetWidth}x${zr.tag.offsetHeight}`;
      // The stage's floating chrome the phone tags keep clear of (see updateCallouts).
      stage.querySelectorAll<HTMLElement>(".breadcrumb, .reset-btn, .controls-btn, .scn-pill").forEach((el) => {
        const q = el.getBoundingClientRect();
        sig += `|${q.left},${q.top},${q.width}`;
      });
    } else
      for (const zr of zones.values()) {
        const q = zr.box.getBoundingClientRect();
        sig += `|${q.left},${q.top},${q.width},${q.height}`;
      }
    if (sig === lastLayout) return false;
    lastLayout = sig;
    return true;
  }
  const timer = new THREE.Timer();
  let rafId = 0;
  let frames = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    timer.update();
    const dt = timer.getDelta();
    let active = wake > 0 || !!camAnim || animated;
    if (wake > 0) wake--;

    if (Math.abs(targetLevel - currentLevel) > 0.002) {
      currentLevel += (targetLevel - currentLevel) * Math.min(1, dt * 4);
      applyLevel(currentLevel);
      active = true;
    }
    layerGroups.forEach((g) => {
      const ty = g.userData.targetY || 0;
      if (Math.abs(ty - g.position.y) < SETTLED_POS) return;
      g.position.y += (ty - g.position.y) * Math.min(1, dt * 5);
      active = true;
    });
    if (productState?.spreadMeshes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productState.spreadMeshes.forEach((m: any) => {
        const tx = m.userData.targetX !== undefined ? m.userData.targetX : m.userData.baseX;
        if (Math.abs(tx - m.position.x) < SETTLED_POS) return;
        m.position.x += (tx - m.position.x) * Math.min(1, dt * 6);
        active = true;
      });
    }
    markerMeshes.forEach((m) => {
      const selected = !!m.userData.selected;
      const isDimmed = isDimmedZone(m.userData.zoneId as string);
      const sev = (m.userData.impactSeverity as number) || 0;
      const s = selected ? 1.6 : m.userData.zoneId === hoveredZoneId ? 1.3 : 1.0 + sev * 0.25;
      // Markers are sized for the overview distances. Closer than that (a cockpit view, a deep
      // zoom) they shrink with the distance so they keep roughly their overview size on screen,
      // instead of becoming discs that fill a third of the stage.
      const near = THREE.MathUtils.clamp(camera.position.distanceTo(m.position) / MARKER_FULL_SIZE_AT, 0.02, 1);
      // Only the emphasis (pick/hover/impact) eases; the distance factor applies at once, so a
      // marker never shows up huge for the first frames of a close-up.
      const prev = (m.userData.ease as number | undefined) ?? 1;
      const eased = prev + (s - prev) * 0.2;
      m.userData.ease = eased;
      m.scale.setScalar(eased * near);
      const mat = m.material as THREE.MeshBasicMaterial;
      const targetOp = isDimmed ? 0.22 : 1;
      mat.opacity += (targetOp - mat.opacity) * 0.2;
      if (Math.abs(s - eased) > SETTLED_EASE || Math.abs(targetOp - mat.opacity) > SETTLED_EASE) active = true;
    });
    markersGroup.children.forEach((c) => {
      if (c.userData.isRing) {
        c.lookAt(camera.position);
        const parent = c.userData.parent as THREE.Mesh;
        c.scale.copy(parent.scale);
        const ringDimmed = isDimmedZone(parent.userData.zoneId as string);
        const targetRingOp = ringDimmed ? 0.15 : 0.7;
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity += (targetRingOp - mat.opacity) * 0.2;
        if (Math.abs(targetRingOp - mat.opacity) > SETTLED_EASE) active = true;
      }
    });
    if (!active) active = layoutChanged();
    if (active) updateCallouts();

    let cameraMoved = false;
    if (camAnim) {
      const t = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
      const ease = 1 - Math.pow(1 - t, 3);
      if (shot) {
        // The aspect (and the sheet's inset) may still be settling.
        const f = fitView(shot);
        camAnim.endPos.copy(f.pos);
        camAnim.endTarget.copy(f.target);
      }
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
      cameraMoved = true;
      if (t >= 1) {
        camAnim = null;
        if (floorAfterFlight) {
          floorAfterFlight = false;
          controls.maxPolarAngle = FLOOR_POLAR;
        }
      }
    }

    // Also drives OrbitControls' damping after a drag ends: true while the camera still drifts.
    if (controls.update()) cameraMoved = true;
    if (!active && !cameraMoved) return;
    // The labels above were placed from the previous frame's camera; one more frame after the
    // camera stops brings them to its final position.
    if (cameraMoved) wake = Math.max(wake, 1);
    // Fog is tuned for the authored distances; keep it behind the model when an overview
    // has been pulled further back to fit a narrow stage.
    const camDist = camera.position.distanceTo(controls.target);
    const k = aspectFit();
    fog.near = Math.max(10 * k, camDist - 3);
    fog.far = Math.max(23 * k, camDist + 12);
    renderer.render(scene, camera);
    // Two frames in: the first places the labels, the second draws them where they belong.
    if (++frames === 2) callbacks.onReady?.();
  }

  applyLevel(0);
  resize();
  flyTo(sector.defaultView || sector.views[0]?.id);
  animate();

  function dispose() {
    themeObserver.disconnect();
    stage.removeEventListener("touchstart", onGestureStart);
    stage.removeEventListener("touchmove", onGestureMove);
    stage.removeEventListener("touchend", onGestureEnd);
    stage.removeEventListener("touchcancel", onGestureEnd);
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    stageObserver.disconnect();
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    controls.dispose();
    // Materials don't free their textures (the models' canvas textures: signs, screens, the
    // data centre's LED strips, contact shadows), so dispose every texture a material holds too.
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          for (const v of Object.values(m)) if ((v as THREE.Texture | null)?.isTexture) textures.add(v as THREE.Texture);
          m.dispose();
        });
      }
    });
    textures.forEach((t) => t.dispose());
    envRT.dispose();
    renderer.dispose();
    // Hand the WebGL context back now rather than whenever it is garbage collected: browsers cap
    // live contexts (about 16), and moving between explorers would otherwise pile them up.
    renderer.forceContextLoss();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    tagLeaders.remove();
    for (const zr of zones.values()) {
      zr.box.remove();
      zr.tag.remove();
      zr.line.remove();
      zr.tagLine.remove();
    }
  }

  return {
    setImpact,
    selectZone,
    setHover,
    flyTo,
    setTargetLevel: (n: number) => setUserLevel(n, false),
    setLevelImmediate: (n: number) => setUserLevel(n, true),
    enterDeepDive,
    exitDeepDive,
    cycleDeepStage,
    dispose,
  };
}
