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
import type { SectorDef, SectorZone } from "@/lib/sector-content";

export type ExplorerDom = {
  stage: HTMLDivElement;
  leaderSvg: SVGSVGElement;
  railLeft: HTMLDivElement;
  railRight: HTMLDivElement;
  railTop: HTMLDivElement;
  railBottom: HTMLDivElement;
  mobileTags: HTMLDivElement;
  layerButtons: Map<number, HTMLButtonElement>; // level index -> button (0 = shell)
  shellLabel: HTMLSpanElement; // shell button's label swaps between layerNames[0]/[1]
  breadcrumb: HTMLDivElement;
};

export type ExplorerCallbacks = {
  onZoneChange: (zoneId: string | null) => void;
  onDeepDiveStageChange: (stage: number | null) => void;
};

export type ExplorerController = {
  selectZone: (zoneId: string | null) => void;
  // Hover only ever drives the 3D marker's scale/opacity (see the animation loop
  // below) — it never needs to reach React, so the rail's zone buttons (rendered
  // in SectorExplorer.tsx) call this directly on mouseenter/mouseleave instead of
  // going through a callback + re-render.
  setHover: (zoneId: string | null) => void;
  flyTo: (viewId: string) => void;
  setTargetLevel: (level: number) => void;
  setLevelImmediate: (level: number) => void;
  toggleShell: () => void;
  enterDeepDive: () => void;
  exitDeepDive: () => void;
  cycleDeepStage: () => void;
  dispose: () => void;
};

type ZoneRuntime = {
  def: SectorZone;
  marker: THREE.Mesh;
  ring: THREE.Mesh;
  box: HTMLDivElement;
  tag: HTMLDivElement;
  line: SVGLineElement;
};

export function mountExplorer(
  dom: ExplorerDom,
  sector: SectorDef,
  callbacks: ExplorerCallbacks
): ExplorerController {
  const { stage, leaderSvg, railLeft, railRight, railTop, railBottom, mobileTags } = dom;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x141c28, 10, 23);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.6, 2.4, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  stage.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.2;
  controls.maxDistance = 17;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 0.55, 0);

  function resize() {
    const w = stage.clientWidth,
      h = stage.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", resize);

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
  const labelsVisible = true;
  let deepDiveActive = false;
  let deepStage = 0;
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
    dom.layerButtons.forEach((btn, level) => {
      const isShellBtn = level === 0;
      const active = isShellBtn ? (roundedIdx === 0 || roundedIdx === 1) && onStop : roundedIdx === level && onStop;
      btn.classList.toggle("active", active);
    });
    dom.shellLabel.textContent = roundedIdx === 1 && onStop ? sector.layerNames[1] : sector.layerNames[0];
    if (!deepDiveActive) updateBreadcrumb();
  }

  function updateBreadcrumb() {
    const idx = Math.round(currentLevel);
    let html = `<b>Product</b> &rsaquo; ${sector.layerNames[idx] ?? sector.layerNames[0]}`;
    if (currentZoneId) {
      const z = sector.zones.find((zz) => zz.id === currentZoneId);
      html += ` &rsaquo; <b>${z ? z.label : currentZoneId}</b><button id="nrBreadcrumbBack" title="Back to product">&#10005;</button>`;
    }
    dom.breadcrumb.innerHTML = html;
    const backBtn = dom.breadcrumb.querySelector("#nrBreadcrumbBack");
    backBtn?.addEventListener("click", () => selectZone(null));
  }

  const zones = new Map<string, ZoneRuntime>();
  const markerMeshes: THREE.Mesh[] = [];

  for (const z of sector.zones) {
    const mat = new THREE.MeshBasicMaterial({ color: z.color, transparent: true, opacity: 1 });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), mat);
    marker.position.set(z.pos[0], z.pos[1], z.pos[2]);
    marker.userData.zoneId = z.id;
    markersGroup.add(marker);
    markerMeshes.push(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.09, 24),
      new THREE.MeshBasicMaterial({ color: z.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.position.copy(marker.position);
    ring.lookAt(camera.position);
    ring.userData.isRing = true;
    ring.userData.parent = marker;
    markersGroup.add(ring);

    const box = document.createElement("div");
    box.className = "callout";
    box.textContent = z.label;
    box.style.setProperty("--zc", z.color);
    box.addEventListener("click", () => selectZone(z.id));
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

    const tag = document.createElement("div");
    tag.className = "mtag";
    tag.textContent = z.label;
    tag.style.setProperty("--zc", z.color);
    tag.addEventListener("click", () => selectZone(z.id));
    mobileTags.appendChild(tag);

    zones.set(z.id, { def: z, marker, ring, box, tag, line });
  }

function setHoverGuarded(id: string | null, onlyIfCurrent?: string) {
    if (onlyIfCurrent !== undefined && hoveredZoneId !== onlyIfCurrent) return;
    hoveredZoneId = id;
  }
  function setHover(id: string | null) {
    hoveredZoneId = id;
  }

  function toggleShell() {
    exitDeepDive();
    targetLevel = Math.round(currentLevel) <= 0 ? 1 : 0;
  }

  function selectZone(id: string | null) {
    currentZoneId = id;
    for (const [zid, zr] of zones) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zr.marker.userData as any).selected = zid === id;
    }
    if (!deepDiveActive) updateBreadcrumb();
    callbacks.onZoneChange(id);
  }

  function flyTo(viewId: string) {
    const v = sector.views.find((x) => x.id === viewId);
    if (!v) return;
    camAnim = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]),
      startTarget: controls.target.clone(),
      endTarget: new THREE.Vector3(v.target[0], v.target[1], v.target[2]),
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
    dom.breadcrumb.innerHTML = trail.map((t, i) => (i === trail.length - 1 ? `<b>${t}</b>` : t)).join(" &rsaquo; ");
  }

  function enterDeepDive() {
    if (!deepDiveDef) return;
    deepDiveActive = true;
    deepStage = 0;
    targetLevel = sector.layerNames.length - 1;
    currentLevel = targetLevel;
    applyLevel(currentLevel);
    const c = deepDiveDef.entryCamera;
    camAnim = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]),
      startTarget: controls.target.clone(),
      endTarget: new THREE.Vector3(c.target[0], c.target[1], c.target[2]),
      t0: performance.now(),
      dur: 1000,
    };
    deepDiveDef.applyStage(deepStage, productState.deep);
    updateDeepBreadcrumb();
    callbacks.onDeepDiveStageChange(deepStage);
  }
  function exitDeepDive() {
    if (!deepDiveActive || !deepDiveDef) return;
    deepDiveActive = false;
    deepDiveDef.exit(productState.deep);
    updateBreadcrumb();
    callbacks.onDeepDiveStageChange(null);
  }
  function cycleDeepStage() {
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
  };
  const onPointerMove = (e: PointerEvent) => {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    const newHover = hits.length ? (hits[0].object.userData.zoneId as string) : null;
    if (newHover !== hoveredZoneId) {
      hoveredZoneId = newHover;
      renderer.domElement.style.cursor = hoveredZoneId ? "pointer" : "grab";
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  // ---- callout positioning (every frame) ----
  function updateCallouts() {
    const stageRect = stage.getBoundingClientRect();
    const w = stageRect.width,
      h = stageRect.height;
    leaderSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    for (const zr of zones.values()) {
      const z = zr.def;
      const v = new THREE.Vector3(z.pos[0], z.pos[1], z.pos[2]);
      v.project(camera);
      const behind = v.z > 1;
      let px = (v.x * 0.5 + 0.5) * w;
      let py = (-v.y * 0.5 + 0.5) * h;
      py = Math.max(4, Math.min(h - 4, py));

      const isSelected = currentZoneId === z.id;
      const isDimmed = !!currentZoneId && !isSelected;

      const tagScale = isSelected ? 1.08 : 1;
      const halfTagW = ((zr.tag.offsetWidth || 0) * tagScale) / 2;
      const pxMax = Math.max(w / 2, w - 4 - halfTagW);
      const pxMin = Math.min(w / 2, 4 + halfTagW);
      px = Math.max(pxMin, Math.min(pxMax, px));

      zr.tag.style.left = px + "px";
      zr.tag.style.top = py + "px";
      zr.tag.classList.toggle("selected", isSelected);
      zr.tag.classList.toggle("dimmed", isDimmed);
      zr.tag.style.opacity = labelsVisible ? (isSelected ? "1" : isDimmed ? "0.28" : behind ? "0.35" : "1") : "0";
      zr.tag.style.pointerEvents = labelsVisible ? "auto" : "none";

      const boxRect = zr.box.getBoundingClientRect();
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
      zr.line.setAttribute("opacity", String(behind ? 0.15 : active ? 0.95 : isDimmed ? 0.12 : 0.45));
      zr.line.setAttribute("stroke-dasharray", active ? "none" : "3 3");
      zr.box.classList.toggle("selected", isSelected);
      zr.box.classList.toggle("dimmed", isDimmed);
      zr.box.style.opacity = labelsVisible ? (isDimmed ? "0.32" : "1") : "0";
      zr.box.style.pointerEvents = labelsVisible ? "auto" : "none";
    }
    leaderSvg.style.opacity = labelsVisible ? "1" : "0";
  }

  // ---- animation loop ----
  const timer = new THREE.Timer();
  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);
    timer.update();
    const dt = timer.getDelta();

    if (Math.abs(targetLevel - currentLevel) > 0.002) {
      currentLevel += (targetLevel - currentLevel) * Math.min(1, dt * 4);
      applyLevel(currentLevel);
    }
    layerGroups.forEach((g) => {
      const ty = g.userData.targetY || 0;
      g.position.y += (ty - g.position.y) * Math.min(1, dt * 5);
    });
    if (productState?.spreadMeshes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productState.spreadMeshes.forEach((m: any) => {
        const tx = m.userData.targetX !== undefined ? m.userData.targetX : m.userData.baseX;
        m.position.x += (tx - m.position.x) * Math.min(1, dt * 6);
      });
    }
    markerMeshes.forEach((m) => {
      const selected = !!m.userData.selected;
      const isDimmed = !!currentZoneId && !selected;
      const s = selected ? 1.6 : m.userData.zoneId === hoveredZoneId ? 1.3 : 1.0;
      m.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
      const mat = m.material as THREE.MeshBasicMaterial;
      const targetOp = isDimmed ? 0.22 : 1;
      mat.opacity += (targetOp - mat.opacity) * 0.2;
    });
    markersGroup.children.forEach((c) => {
      if (c.userData.isRing) {
        c.lookAt(camera.position);
        const parent = c.userData.parent as THREE.Mesh;
        c.scale.copy(parent.scale);
        const ringDimmed = !!currentZoneId && !parent.userData.selected;
        const targetRingOp = ringDimmed ? 0.15 : 0.7;
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity += (targetRingOp - mat.opacity) * 0.2;
      }
    });
    updateCallouts();

    if (camAnim) {
      const t = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startTarget, camAnim.endTarget, ease);
      if (t >= 1) camAnim = null;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  applyLevel(0);
  flyTo(sector.defaultView || sector.views[0]?.id);
  resize();
  animate();

  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    controls.dispose();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    for (const zr of zones.values()) {
      zr.box.remove();
      zr.tag.remove();
      zr.line.remove();
    }
  }

  return {
    selectZone,
    setHover,
    flyTo,
    setTargetLevel: (n: number) => (targetLevel = n),
    setLevelImmediate: (n: number) => {
      targetLevel = n;
      currentLevel = n;
      applyLevel(currentLevel);
    },
    toggleShell,
    enterDeepDive,
    exitDeepDive,
    cycleDeepStage,
    dispose,
  };
}
