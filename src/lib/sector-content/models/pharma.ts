// Pharmaceuticals: a miniature pill-to-patient manufacturing campus on a
// display plinth, laid out the way an Indian formulations + API major builds a
// greenfield site (Hyderabad / Ahmedabad / Vizag pharma-city style).
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Oral-solid-dosage (OSD) formulation plant in the middle, with the
//     packaging & dispatch hall welded to its east end.
//   · Sterile injectables / biologics block behind it (north), with a utility
//     yard and the cold-chain warehouse + reefer truck court to the east.
//   · API chemistry plant to the west: a tall reactor bay and a CDMO
//     custom-synthesis / kilo-lab suite, fed by pipe racks from the solvent
//     tank farm and the KSM drum store behind it.
//   · Glass R&D / innovation centre at the front-left, car park, and a
//     pharmacy storefront on the boulevard at the front-right campus edge.
//
// Layers: 0 Campus (exteriors, roads, trucks, pharmacy, R&D centre),
// 1 Process Lines (OSD + packaging walls section down, roofs lift away),
// 2 Sterile & Biologics (sterile block sections down), 3 Chemistry & Inputs
// (reactor bay + CDMO suite section down, KSM store and tank farm light up).
// Buildings "peel" with a moving world-space clipping plane (a real section
// cut with a dark cap line) rather than fading, so walls never ghost-sort.
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  lathe,
  layerMats,
  lerp,
  mergeInto,
  railing,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on.
export const PHARMA_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: campus
  domestic: { pos: [-0.61, 0.5, 2.55], side: "bottom" }, // pharmacy storefront sign
  specialty: { pos: [-3.5, 0.98, 2.08], side: "left" }, // R&D centre roof
  distribution: { pos: [3.6, 0.88, -2.3], side: "right" }, // cold-chain warehouse
  // layer 1: process lines
  generics: { pos: [0.22, 0.44, 1.42], side: "bottom" }, // tablet compression
  packaging: { pos: [2.42, 0.3, 0.55], side: "bottom" }, // blister line
  // layer 2: sterile & biologics
  injectables: { pos: [1.45, 0.44, -1.42], side: "right" }, // fill-finish isolator
  biologics: { pos: [-0.2, 0.52, -2.45], side: "top" }, // bioreactors
  // layer 3: chemistry & inputs
  api: { pos: [-3.55, 0.7, 0.42], side: "left" }, // reactor bay
  ksm: { pos: [-2.2, 0.24, -2.3], side: "left" }, // KSM drum store
  cdmo: { pos: [-2.3, 0.42, -0.2], side: "left" }, // custom-synthesis suite
};

// `layer` (optional): a view about one layer also peels the model to it (engine.ts flyTo),
// so e.g. the Reactor Bay shot opens the chemistry layer instead of looking at a roof.
export const PHARMA_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.8, 6.0, 9.3],
    target: [0.4, -0.05, 0.5],
    narration:
      "Welcome to the pharma anatomy tour. This campus follows a medicine from molecule to patient: chemistry makes the active ingredient, the formulation plants turn it into tablets and injectables, packaging and cold chain move it out, and the pharmacy hands it over.",
  },
  {
    id: "campus",
    label: "Campus",
    pos: [3.6, 1.9, 8.2],
    target: [0.2, 0.35, 1.4],
    narration:
      "From the boulevard: the pharmacy at the campus edge is where branded formulations meet the patient. Behind it sit the formulation plant, and the glass R&D centre where specialty and complex generics are developed.",
  },
  {
    id: "tablets",
    layer: 1,
    label: "Tablet Line",
    pos: [1.6, 3.3, 4.6],
    target: [0.9, 0.15, 0.95],
    narration:
      "The oral solid dosage line: raw materials are dispensed, granulated and dried, blended, compressed into tablets on rotary presses and film-coated, then blister-packed or bottled in the packaging hall next door.",
  },
  {
    id: "sterile",
    layer: 2,
    label: "Sterile Suite",
    pos: [2.6, 3.4, 1.4],
    target: [0.55, 0.25, -1.9],
    narration:
      "The sterile block. On the left, stainless bioreactors grow cells for biosimilars and vaccines, followed by chromatography purification. On the right, vials are washed, depyrogenated and filled inside a glove-port isolator, then freeze-dried in the lyophiliser.",
  },
  {
    id: "reactors",
    layer: 3,
    label: "Reactor Bay",
    pos: [-0.4, 3.0, 3.6],
    target: [-3.0, 0.45, -0.4],
    narration:
      "API chemistry: glass-lined and stainless reactors run multi-step synthesis on a steel structure, with condensers above and centrifuges and dryers below. Solvents come from the tank farm, key starting materials from the drum store, and the CDMO suite runs custom synthesis for global innovators.",
  },
  {
    id: "logistics",
    label: "Cold Chain",
    pos: [7.4, 2.8, 1.8],
    target: [3.4, 0.3, -1.0],
    narration:
      "Distribution: finished packs move to the temperature-controlled warehouse and out in refrigerated trucks to stockists, hospitals and pharmacies.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration: "From above you can read the whole chain: chemistry on the left, formulation in the middle, sterile at the back, logistics and the pharmacy on the right.",
  },
];

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Box = { x0: number; x1: number; z0: number; z1: number; h: number };

export function buildPharma(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [campusG, osdG, sterG, apiG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };

  // ------------------------------------------------------------ merge batches
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);
  /** Local machine frame (front = +Z, floor = y 0) -> world. */
  const place = (P: Put, x: number, y: number, z: number, ry = 0, s = 1): Put => (m, g) => {
    if (s !== 1) g.scale(s, s, s);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    P(m, g);
  };

  // Geometry shorthands (base at y).
  const bx = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const bb = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    bx(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r, 2).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop?: number) =>
    new THREE.CylinderGeometry(rTop ?? r, r, h, seg, 1).translate(x, y + h / 2, z);
  const cylX = (r: number, len: number, x: number, y: number, z: number, seg = 16) =>
    new THREE.CylinderGeometry(r, r, len, seg, 1).rotateZ(Math.PI / 2).translate(x, y, z);
  const cylZ = (r: number, len: number, x: number, y: number, z: number, seg = 16) =>
    new THREE.CylinderGeometry(r, r, len, seg, 1).rotateX(Math.PI / 2).translate(x, y, z);
  /** Process vessel: straight shell + 2:1-ish dished heads (lathed); lowest point at y. */
  const vessel = (r: number, h: number, x: number, y: number, z: number, k = 0.38, seg = 28) => {
    const pts: Vec2[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = (Math.PI / 2) * (1 - i / 6);
      pts.push([Math.max(1e-3, r * Math.cos(t)), k * r * (1 - Math.sin(t))]);
    }
    for (let i = 1; i <= 6; i++) {
      const t = (Math.PI / 2) * (i / 6);
      pts.push([Math.max(1e-3, r * Math.cos(t)), k * r + h + k * r * Math.sin(t)]);
    }
    return lathe(THREE, pts, seg).translate(x, y, z);
  };
  /** Domed vertical storage tank, base at y. */
  const tankGeo = (r: number, h: number, x: number, y: number, z: number, dome = 0.3, seg = 28) => {
    const pts: Vec2[] = [
      [0, 0],
      [r * 0.98, 0],
      [r, r * 0.03],
      [r, h],
    ];
    for (let i = 1; i <= 6; i++) {
      const t = (i / 6) * (Math.PI / 2);
      pts.push([Math.max(1e-3, r * Math.cos(t)), h + r * dome * Math.sin(t)]);
    }
    return lathe(THREE, pts, seg).translate(x, y, z);
  };
  const vesselLike = (r: number, h: number, x: number, y: number, z: number) => tankGeo(r, h, x, y, z, 0.6, 20);
  const ring = (r: number, t: number, x: number, y: number, z: number, axis: "x" | "y" | "z" = "z", seg = 20) => {
    const g = new THREE.TorusGeometry(r, t, 6, seg);
    if (axis === "x") g.rotateY(Math.PI / 2);
    if (axis === "y") g.rotateX(Math.PI / 2);
    return g.translate(x, y, z);
  };
  const uvBox = (w: number, h: number, d: number, tile = 1) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    const faceU = [d, d, w, w, w, w];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setX(i, uv.getX(i) * (faceU[f] / tile));
        if (f === 2 || f === 3) uv.setY(i, uv.getY(i) * (d / tile));
      }
    return g;
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** Four outward-facing wall planes (open top/bottom); UV u repeats per `tile` units, v spans 0..h. */
  const wallRing = (b: Box, skip = "", tile = 1) => {
    const geos: T.BufferGeometry[] = [];
    const side = (len: number, cx: number, cz: number, ry: number) => {
      const g = new THREE.PlaneGeometry(len, b.h);
      uvScale(g, len / tile, 1);
      g.rotateY(ry);
      g.translate(cx, b.h / 2, cz);
      geos.push(g);
    };
    const w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    if (!skip.includes("s")) side(w, (b.x0 + b.x1) / 2, b.z1, 0);
    if (!skip.includes("n")) side(w, (b.x0 + b.x1) / 2, b.z0, Math.PI);
    if (!skip.includes("e")) side(d, b.x1, (b.z0 + b.z1) / 2, Math.PI / 2);
    if (!skip.includes("w")) side(d, b.x0, (b.z0 + b.z1) / 2, -Math.PI / 2);
    return mergeInto(THREE, geos);
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrapT = false) => {
    const t = canvasTexture(THREE, w, h, draw);
    t.wrapS = THREE.RepeatWrapping;
    if (wrapT) t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  // ------------------------------------------------------------ site plan
  const FLOOR = 0.012;
  const DADO = 0.1;
  const OSD: Box = { x0: -0.95, x1: 2.0, z0: 0.0, z1: 1.85, h: 0.7 };
  const PKG: Box = { x0: 2.0, x1: 3.25, z0: 0.0, z1: 1.85, h: 0.6 };
  const STER: Box = { x0: -0.95, x1: 2.1, z0: -2.95, z1: -0.85, h: 0.9 };
  const API: Box = { x0: -4.45, x1: -2.6, z0: -1.0, z1: 0.95, h: 1.15 };
  const CDMO: Box = { x0: -2.5, x1: -1.55, z0: -0.85, z1: 0.8, h: 0.65 };
  const WH: Box = { x0: 2.6, x1: 4.6, z0: -2.95, z1: -1.65, h: 0.78 };
  const PH: Box = { x0: -1.0, x1: -0.22, z0: 2.05, z1: 2.72, h: 0.3 };
  const TF = { x0: -4.45, x1: -3.0, z0: -3.0, z1: -1.6 };
  const KSM: Box = { x0: -2.8, x1: -1.6, z0: -2.95, z1: -1.65, h: 0.36 };
  const UY = { x0: 2.17, x1: 2.53, z0: -2.9, z1: -1.75 };
  const ETP = { x0: 3.5, x1: 4.6, z0: 0.22, z1: 2.74 };
  const RD = { cx: -3.5, cz: 2.08, ax: 0.98, az: 0.6, h: 0.81 };
  const PX = 5.1,
    PZ = 3.6,
    PR = 0.45;
  // Roads: [x0, z0, x1, z1, width]
  const ROADS: [number, number, number, number, number][] = [
    [-5.4, 3.12, 5.4, 3.12, 0.36], // public boulevard
    [-4.85, -1.3, -4.85, 3.12, 0.26],
    [-4.85, -1.3, -1.3, -1.3, 0.26],
    [-1.3, -3.3, -1.3, 3.12, 0.26],
    [-1.3, -0.45, 4.85, -0.45, 0.26],
    [4.85, -0.45, 4.85, 3.12, 0.26],
  ];
  const rdPts = (scale: number, n = 48): Vec2[] => {
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = Math.cos(a),
        s = Math.sin(a);
      pts.push([
        RD.cx + RD.ax * scale * Math.sign(c) * Math.pow(Math.abs(c), 0.62),
        RD.cz + RD.az * scale * Math.sign(s) * Math.pow(Math.abs(s), 0.62),
      ]);
    }
    return pts;
  };

  // ------------------------------------------------------------ textures
  type FacadeOpts = {
    base: string;
    joint?: string;
    plinth: string;
    accent?: string;
    accentAt?: number;
    bands?: Vec2[];
    ribs?: boolean;
    louvre?: Vec2;
    pitch?: number;
  };
  /** Façade texture: 1 world unit per repeat horizontally, full height vertically. */
  const facade = (H: number, o: FacadeOpts) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      const Y = (f: number) => h - f * h;
      g.fillStyle = o.base;
      g.fillRect(0, 0, w, h);
      if (o.ribs) {
        for (let x = 0; x < w; x += 10) {
          g.fillStyle = "rgba(0,0,0,0.11)";
          g.fillRect(x, 0, 3, h);
          g.fillStyle = "rgba(255,255,255,0.22)";
          g.fillRect(x + 3, 0, 1, h);
        }
      } else {
        g.fillStyle = o.joint ?? "rgba(0,0,0,0.08)";
        for (let y = h; y > 0; y -= 256 * 0.1) g.fillRect(0, y, w, 1.2);
        for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 1.2, h);
      }
      if (o.louvre) {
        const [a, b] = o.louvre;
        g.fillStyle = "#56616b";
        g.fillRect(0, Y(b), w, Y(a) - Y(b));
        g.fillStyle = "#7c8791";
        for (let y = Y(b) + 2; y < Y(a) - 1; y += 4) g.fillRect(0, y, w, 1.4);
        g.fillStyle = "#3f4851";
        for (let x = 0; x < w; x += 64) g.fillRect(x, Y(b), 3, Y(a) - Y(b));
      }
      for (const [a, b] of o.bands ?? []) {
        const y0 = Y(b),
          y1 = Y(a);
        const gr = g.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, "#2d4459");
        gr.addColorStop(1, "#16222d");
        g.fillStyle = gr;
        g.fillRect(0, y0, w, y1 - y0);
        g.fillStyle = "rgba(190,220,240,0.16)";
        g.fillRect(0, y0 + 2, w, (y1 - y0) * 0.3);
        g.fillStyle = "#c9d0d6";
        const p = o.pitch ?? 32;
        for (let x = 0; x < w; x += p) g.fillRect(x, y0, 2.5, y1 - y0);
        g.fillRect(0, y0 - 1.5, w, 3);
        g.fillRect(0, y1 - 1.5, w, 3);
      }
      if (o.accent) {
        g.fillStyle = o.accent;
        g.fillRect(0, Y(o.accentAt ?? 0.5) - 4, w, 8);
      }
      g.fillStyle = o.plinth;
      g.fillRect(0, Y(0.09), w, h - Y(0.09));
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(0, Y(0.09) - 1, w, 1.2);
    });
  const osdTex = facade(OSD.h, { base: "#eef1f3", plinth: "#56606a", accent: "#17a398", accentAt: 0.56, bands: [[0.64, 0.82]] });
  const pkgTex = facade(PKG.h, { base: "#dfe5ea", plinth: "#56606a", ribs: true, accent: "#2f6fd0", accentAt: 0.8, bands: [[0.5, 0.62]], pitch: 64 });
  const sterTex = facade(STER.h, { base: "#f1f3f5", plinth: "#4e5862", accent: "#2f5fc4", accentAt: 0.72, bands: [[0.22, 0.32]], pitch: 64 });
  const apiTex = facade(API.h, { base: "#b9c1c8", plinth: "#4c555e", ribs: true, accent: "#d9742b", accentAt: 0.9, louvre: [0.62, 0.78] });
  const cdmoTex = facade(CDMO.h, { base: "#eceff1", plinth: "#4e5862", accent: "#7a5cc7", accentAt: 0.9, bands: [[0.2, 0.4], [0.58, 0.78]] });
  const whTex = facade(WH.h, { base: "#e9eef2", plinth: "#3d4650", ribs: true, accent: "#2e86ab", accentAt: 0.84 });
  const phTex = tex(256, 96, (g, w, h) => {
    g.fillStyle = "#f2efe8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#16a05a";
    g.fillRect(0, 8, w, 14);
    g.fillStyle = "#54606a";
    g.fillRect(0, h - 8, w, 8);
  });
  const roofTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#bfc4c8";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#b0b5ba";
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1.5);
      g.fillStyle = "#cdd1d5";
      g.fillRect(0, 120, w, 14);
    },
    true
  );
  const epoxyTex = (base: string, line: string) =>
    tex(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        g.fillStyle = line;
        for (let i = 0; i <= 4; i++) {
          g.fillRect(i * 64, 0, 1, h);
          g.fillRect(0, i * 64, w, 1);
        }
      },
      true
    );
  const osdFloorTex = epoxyTex("#d7dfe3", "rgba(80,100,115,0.12)");
  osdFloorTex.repeat.set(3, 3);
  const sterFloorTex = epoxyTex("#d9e2ea", "rgba(60,90,140,0.13)");
  sterFloorTex.repeat.set(3, 3);
  const apiFloorTex = epoxyTex("#9da3a7", "rgba(40,45,50,0.18)");
  apiFloorTex.repeat.set(2, 2);
  const grateTex = tex(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = "#6c757e";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#3a4148";
      for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 3, h);
    },
    true
  );
  grateTex.repeat.set(10, 10);

  // ------------------------------------------------------------ ground plan
  const GX0 = -PX,
    GX1 = PX,
    GZ0 = -PZ,
    GZ1 = PZ;
  const GW = 2048,
    GH = Math.round((2048 * (GZ1 - GZ0)) / (GX1 - GX0));
  const groundTex = canvasTexture(THREE, GW, GH, (g) => {
    const sx = GW / (GX1 - GX0);
    const X = (x: number) => (x - GX0) * sx;
    const Z = (z: number) => (z - GZ0) * sx;
    const rect = (x0: number, x1: number, z0: number, z1: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    };
    const rnd = mulberry(11);
    g.fillStyle = "#5d7d4b";
    g.fillRect(0, 0, GW, GH);
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = rnd() > 0.5 ? "rgba(255,255,210,0.04)" : "rgba(0,25,0,0.05)";
      g.beginPath();
      g.arc(rnd() * GW, rnd() * GH, 8 + rnd() * 46, 0, Math.PI * 2);
      g.fill();
    }
    // Mowing stripes.
    g.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 0; x < GW; x += 48) g.fillRect(x, 0, 24, GH);

    // Concrete aprons around the buildings.
    const apron = "#a9aca6";
    const pad = (b: { x0: number; x1: number; z0: number; z1: number }, m: number, c = apron) => rect(b.x0 - m, b.x1 + m, b.z0 - m, b.z1 + m, c);
    pad(OSD, 0.1);
    pad(PKG, 0.1);
    pad(STER, 0.1);
    pad(API, 0.1);
    pad(CDMO, 0.1);
    pad(WH, 0.1);
    pad(KSM, 0.06, "#9a9d98");
    pad(TF, 0.04, "#8f928d");
    pad(UY, 0.06, "#9a9d98");
    pad(ETP, 0.0, "#a3a69f");
    rect(PH.x0 - 0.06, PH.x1 + 0.06, PH.z0 - 0.06, 2.94, "#b9b4a8");
    // Truck court.
    rect(2.48, 4.72, -1.68, -0.58, "#4a5057");
    // Soft ambient-occlusion halo around every footprint.
    g.save();
    g.filter = "blur(10px)";
    for (const b of [OSD, PKG, STER, API, CDMO, WH, PH, KSM]) {
      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(X(b.x0 - 0.02), Z(b.z0 - 0.02), (b.x1 - b.x0 + 0.04) * sx, (b.z1 - b.z0 + 0.04) * sx);
    }
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.beginPath();
    rdPts(1.02).forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.closePath();
    g.fill();
    g.restore();
    // Bund floor.
    rect(TF.x0, TF.x1, TF.z0, TF.z1, "#8b8e8a");
    // Roads: kerb, asphalt, centre dashes.
    const roadPath = (r: (typeof ROADS)[number]) => {
      g.beginPath();
      g.moveTo(X(r[0]), Z(r[1]));
      g.lineTo(X(r[2]), Z(r[3]));
    };
    g.lineCap = "square";
    for (const r of ROADS) {
      roadPath(r);
      g.strokeStyle = "#cfcabd";
      g.lineWidth = (r[4] + 0.05) * sx;
      g.stroke();
    }
    for (const r of ROADS) {
      roadPath(r);
      g.strokeStyle = "#3a3f45";
      g.lineWidth = r[4] * sx;
      g.stroke();
    }
    g.lineCap = "butt";
    for (const r of ROADS) {
      roadPath(r);
      g.strokeStyle = "rgba(240,238,225,0.75)";
      g.lineWidth = 2;
      g.setLineDash([16, 14]);
      g.stroke();
      g.setLineDash([]);
    }
    // Truck-court bay lines + dock aprons.
    g.strokeStyle = "rgba(240,200,60,0.85)";
    g.lineWidth = 2.5;
    for (const x of [2.72, 3.17, 3.62, 4.07, 4.52]) {
      g.beginPath();
      g.moveTo(X(x), Z(-1.65));
      g.lineTo(X(x), Z(-0.95));
      g.stroke();
    }
    // Car park.
    rect(-2.42, -1.47, 1.18, 2.82, "#383d43");
    g.strokeStyle = "rgba(235,235,225,0.75)";
    g.lineWidth = 2;
    for (let z = 1.22; z <= 2.8; z += 0.13) {
      for (const [xa, xb] of [
        [-2.42, -2.18],
        [-1.71, -1.47],
      ]) {
        g.beginPath();
        g.moveTo(X(xa), Z(z));
        g.lineTo(X(xb), Z(z));
        g.stroke();
      }
    }
    // Footpaths and plazas.
    g.strokeStyle = "#c2bcae";
    g.lineCap = "round";
    g.lineWidth = 0.08 * sx;
    const path = (pts: Vec2[]) => {
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
    };
    path([
      [0.5, 2.94],
      [0.5, 1.95],
    ]);
    path([
      [-3.5, 2.94],
      [-3.5, 2.7],
    ]);
    path([
      [-2.55, 2.1],
      [-2.42, 2.1],
    ]);
    rect(0.15, 0.85, 1.95, 2.25, "#bdb7a9");
    // Zebra crossings.
    g.fillStyle = "rgba(245,245,240,0.85)";
    for (let i = 0; i < 6; i++) {
      g.fillRect(X(0.38 + i * 0.045), Z(2.95), 0.022 * sx, 0.33 * sx);
      g.fillRect(X(-1.17 + 0.02), Z(-0.3 + i * 0.045 - 0.07), 0.22 * sx, 0.022 * sx);
    }
  });
  groundTex.anisotropy = 8;

  // ------------------------------------------------------------ materials
  const baseMats = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.35 })),
    osdFloor: L.add("base", std(0xffffff, 0.05, 0.4, { map: osdFloorTex })),
    sterFloor: L.add("base", std(0xffffff, 0.05, 0.35, { map: sterFloorTex })),
    apiFloor: L.add("base", std(0xffffff, 0.05, 0.8, { map: apiFloorTex })),
    corridor: L.add("base", std(0xb7cad6, 0.05, 0.45)),
    bund: L.add("base", std(0x9a9d9a, 0, 0.9)),
  };
  const cm = {
    canopy: L.add("trees", std(0xffffff, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    hedge: L.add("trees", std(0x3f6a37, 0, 0.9)),
    car: L.add("ctx", std(0xffffff, 0.5, 0.35)),
    carGlass: L.add("ctx", std(0x1b2631, 0.6, 0.15)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    white: L.add("ctx", std(0xeef1f3, 0.1, 0.45)),
    grey: L.add("ctx", std(0x8b949c, 0.45, 0.45)),
    dark: L.add("ctx", std(0x2b3137, 0.4, 0.5)),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    truckBody: L.add("ctx", std(0xf4f6f8, 0.25, 0.35)),
    cabBlue: L.add("ctx", std(0x2b62c4, 0.45, 0.3)),
    cabRed: L.add("ctx", std(0xc23b32, 0.45, 0.3)),
    teal: L.add("ctx", std(0x1aa395, 0.2, 0.4)),
    yellow: L.add("ctx", std(0xe2b33a, 0.35, 0.45)),
    whWall: L.add("ctx", std(0xffffff, 0.2, 0.45, { map: whTex })),
    roof: L.add("ctx", std(0xffffff, 0.05, 0.85, { map: roofTex })),
    soffit: L.add("ctx", std(0x3c434b, 0.2, 0.7)),
    phWall: L.add("ctx", std(0xffffff, 0.05, 0.6, { map: phTex })),
    shopGlass: L.add("ctx", std(0x9fc9d8, 0.5, 0.08, { emissive: 0x2a3d33, emissiveIntensity: 0.6 })),
    green: L.add("ctx", std(0x15964f, 0.2, 0.45)),
    cross: L.add("ctx", std(0x0a3018, 0, 0.4, { emissive: 0x22d36a, emissiveIntensity: 1.4 })),
    rdGlass: L.add("ctx", std(0x2b4a5e, 0.65, 0.07, { opacity: 0.86, envMapIntensity: 1.4 })),
    slab: L.add("ctx", std(0xf1f3f4, 0.05, 0.45)),
    greenRoof: L.add("ctx", std(0x5f8c45, 0, 0.9)),
    solar: L.add("ctx", std(0x1d2c4a, 0.6, 0.2)),
    ct: L.add("ctx", std(0x9fb2b5, 0.1, 0.55)),
    fan: L.add("ctx", std(0x262b30, 0.4, 0.5, { side: DS })),
    chiller: L.add("ctx", std(0x2f7fa8, 0.45, 0.4)),
    shopItems: L.add("ctx", std(0xe6c14b, 0.1, 0.5)),
    water: L.add("ctx", std(0x3f6f73, 0.1, 0.22, { envMapIntensity: 0.6 })),
    concrete: L.add("ctx", std(0xb4b7b3, 0, 0.85, { side: DS })),
  };
  /** Roof package of a peeling building (fades as it lifts). */
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    sky: L.add(bucket, std(0x2a3f52, 0.6, 0.15)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
    ss: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
  });
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    ssDark: L.add(bucket, std(0x8e979f, 0.85, 0.32)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    glass: L.add(bucket, std(0xd5ebf3, 0.2, 0.05, { opacity: 0.3 })),
    win: L.add(bucket, std(0x1c2a36, 0.6, 0.15)),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    amberLed: L.add(bucket, std(0x332000, 0, 0.5, { emissive: 0xffb020, emissiveIntensity: 0.9 })),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    teal: L.add(bucket, std(0x17a398, 0.25, 0.4)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    glr: L.add(bucket, std(0x22508f, 0.3, 0.16)),
    steel: L.add(bucket, std(0x5c6b7a, 0.6, 0.45)),
    grate: L.add(bucket, std(0xffffff, 0.6, 0.5, { map: grateTex })),
    wall: L.add(bucket, std(0xf2f4f6, 0.05, 0.6)),
    wallBase: L.add(bucket, std(0x9fb3c2, 0.1, 0.5)),
    wallGlass: L.add(bucket, std(0xc4dce8, 0.3, 0.06, { opacity: 0.32 })),
    carton: L.add(bucket, std(0xc59a6a, 0, 0.8)),
    wood: L.add(bucket, std(0x9a7448, 0, 0.85)),
    amberGlass: L.add(bucket, std(0x8a4a12, 0.25, 0.12, { opacity: 0.88 })),
    resin: L.add(bucket, std(0x3f78d8, 0.1, 0.5)),
    liquid: L.add(bucket, std(0xd8a24a, 0.1, 0.2, { opacity: 0.75 })),
    hot: L.add(bucket, std(0x331100, 0, 0.5, { emissive: 0xff7a2a, emissiveIntensity: 1.2 })),
    frost: L.add(bucket, std(0xdfeaf2, 0.1, 0.5)),
    bag: L.add(bucket, std(0xf7f7f2, 0, 0.6)),
    foil: L.add(bucket, std(0xd8dde2, 0.95, 0.2)),
  });
  type EqM = ReturnType<typeof eqMats>;
  const om = eqMats("osdEq");
  const sm = eqMats("sterEq");
  const am = eqMats("apiEq");
  const yd = {
    tank: L.add("yard", std(0xeef1f3, 0.15, 0.35)),
    ss: L.add("yard", std(0xc2c9d0, 0.85, 0.28)),
    concrete: L.add("yard", std(0xa2a5a3, 0, 0.9)),
    steel: L.add("yard", std(0x5c6b7a, 0.6, 0.45)),
    yellow: L.add("yard", std(0xe2b33a, 0.4, 0.45)),
    pipeBlue: L.add("yard", std(0x3a78c2, 0.5, 0.4)),
    pipeGreen: L.add("yard", std(0x3a9d6e, 0.45, 0.4)),
    pipeRed: L.add("yard", std(0xb8443a, 0.4, 0.45)),
    pipeGrey: L.add("yard", std(0xa7b0b8, 0.75, 0.3)),
    bandBlue: L.add("yard", std(0x2e6fc0, 0.3, 0.4)),
    bandGreen: L.add("yard", std(0x2f9a63, 0.3, 0.4)),
    bandOrange: L.add("yard", std(0xd9742b, 0.3, 0.4)),
    drum: L.add("yard", std(0xffffff, 0.35, 0.45)),
    pallet: L.add("yard", std(0x9a7448, 0, 0.85)),
    bag: L.add("yard", std(0xf2f0e6, 0, 0.65)),
    dark: L.add("yard", std(0x2e343b, 0.45, 0.45)),
    cabOrange: L.add("yard", std(0xd9742b, 0.4, 0.35)),
    tyre: L.add("yard", std(0x17181a, 0.1, 0.85)),
  };
  const shedRoof = {
    sheet: L.add("roofKsm", std(0xb3bcc4, 0.55, 0.4, { side: DS })),
    frame: L.add("roofKsm", std(0x5c6b7a, 0.6, 0.45)),
  };

  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusOsd = focus([om.white, om.ss], 0x17a398);
  const focusSter = focus([sm.white, sm.ss], 0x3d6ff0);
  const focusApi = focus([am.ss, am.glr], 0xd96c2b);
  const focusYard = focus([yd.tank, yd.drum], 0x9c6b30);

  const C = putter(campusG),
    O = putter(osdG),
    S = putter(sterG),
    A = putter(apiG),
    Y = putter(apiG);

  // ============================================================ PLINTH + GROUND
  {
    const rr = new THREE.Shape();
    const x0 = -PX,
      x1 = PX,
      z0 = -PZ,
      z1 = PZ;
    // Shape lives in (x, -z) so rotateX(-PI/2) lands it on the XZ plane facing up.
    rr.moveTo(x0 + PR, -z0);
    rr.lineTo(x1 - PR, -z0);
    rr.quadraticCurveTo(x1, -z0, x1, -z0 - PR);
    rr.lineTo(x1, -z1 + PR);
    rr.quadraticCurveTo(x1, -z1, x1 - PR, -z1);
    rr.lineTo(x0 + PR, -z1);
    rr.quadraticCurveTo(x0, -z1, x0, -z1 + PR);
    rr.lineTo(x0, -z0 - PR);
    rr.quadraticCurveTo(x0, -z0, x0 + PR, -z0);
    const gg = new THREE.ShapeGeometry(rr, 12).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - GX0) / (GX1 - GX0), 1 - (p.getZ(i) - GZ0) / (GZ1 - GZ0));
    gg.translate(0, 0.004, 0);
    mesh(campusG, gg, baseMats.ground);
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    mesh(campusG, pl, baseMats.plinth);
    // Thin glowing lip half-way down the plinth.
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    mesh(campusG, lip, baseMats.lip);
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Group; bucket: string };
  const peels: Record<string, Peel[]> = { osd: [], ster: [], api: [] };
  const capMat = std(0x343c45, 0.3, 0.6);
  const makePeel = (key: "osd" | "ster" | "api", b: Box, map: T.Texture, roofBucket: string, skip = "") => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.h);
    const wm = std(0xffffff, 0.15, 0.55, { map, side: DS, clippingPlanes: [plane] });
    mesh(campusG, wallRing(b, skip), wm);
    const roof = new THREE.Group();
    campusG.add(roof);
    const cap = new THREE.Group();
    campusG.add(cap);
    const t = 0.03,
      hh = 0.02;
    const capG = mergeInto(THREE, [
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z0 - t / 2, b.z0 + t / 2),
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z1 - t / 2, b.z1 + t / 2),
      bb(b.x0 - t / 2, b.x0 + t / 2, -hh, 0, b.z0, b.z1),
      bb(b.x1 - t / 2, b.x1 + t / 2, -hh, 0, b.z0, b.z1),
    ]);
    mesh(cap, capG, capMat);
    cap.position.y = b.h;
    const pe: Peel = { b, plane, roof, cap, bucket: roofBucket };
    peels[key].push(pe);
    // Roof slab + parapet.
    const R = roofMats(roofBucket);
    const P = putter(roof);
    P(R.mem, uvScale(bb(b.x0, b.x1, b.h - 0.03, b.h, b.z0, b.z1), b.x1 - b.x0, b.z1 - b.z0));
    const pt = 0.025,
      ph = 0.05;
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(R.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(R.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    return { P, R, wm, plane };
  };
  /** Extra façade geometry (doors, canopies) clipped with the building's walls. */
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55) => std(color, metal, rough, { clippingPlanes: [plane], side: DS });

  // ---- OSD plant.
  {
    const { P, R, plane } = makePeel("osd", OSD, osdTex, "roofOsd");
    const H = OSD.h;
    for (let i = 0; i < 4; i++) {
      const x = -0.55 + i * 0.75;
      P(R.unit, rb(0.42, 0.13, 0.24, 0.02, x, H, 0.55));
      P(R.dark, bx(0.4, 0.012, 0.2, x, H + 0.13, 0.55));
      for (const dx of [-0.11, 0.11]) P(R.dark, cyl(0.05, 0.012, x + dx, H + 0.13, 0.55, 16));
      P(R.unit, bx(0.1, 0.05, 0.1, x, H, 0.75));
      P(R.ss, cyl(0.025, 0.12, x + 0.3, H, 1.3, 12));
      P(R.dark, cyl(0.035, 0.02, x + 0.3, H + 0.12, 1.3, 12));
    }
    for (let i = 0; i < 6; i++) P(R.sky, bb(-0.7 + i * 0.45, -0.5 + i * 0.45, H + 0.002, H + 0.03, 1.05, 1.6));
    // Entrance canopy + glazed lobby on the south face.
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    put(campusG, glassM, bb(0.2, 0.8, 0.0, 0.4, OSD.z1 + 0.002, OSD.z1 + 0.012));
    put(campusG, whiteM, bb(0.12, 0.88, 0.4, 0.43, OSD.z1, OSD.z1 + 0.22));
    for (const x of [0.16, 0.84]) put(campusG, whiteM, cyl(0.01, 0.4, x, 0, OSD.z1 + 0.2, 8));
  }
  // ---- Packaging & dispatch hall (shares the OSD east wall).
  {
    const { P, R, plane } = makePeel("osd", PKG, pkgTex, "roofOsd", "w");
    const H = PKG.h;
    // Rooftop solar rows.
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 2; k++) {
        const g = new THREE.BoxGeometry(0.5, 0.008, 0.16).rotateX(-0.35).translate(2.36 + k * 0.56, H + 0.06, 0.3 + r * 0.3);
        P(R.solar, g);
        P(R.dark, bx(0.012, 0.05, 0.012, 2.15 + k * 0.56, H, 0.34 + r * 0.3));
        P(R.dark, bx(0.012, 0.05, 0.012, 2.57 + k * 0.56, H, 0.34 + r * 0.3));
      }
    // Dock doors + leveller canopy on the north face (towards the service road).
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    const canM = clipMat(0x9aa4ad, plane, 0.5, 0.45);
    for (const x of [2.3, 2.65, 3.0]) {
      put(campusG, doorM, bb(x - 0.12, x + 0.12, 0, 0.26, -0.012, -0.002));
      put(campusG, canM, bb(x - 0.15, x + 0.15, 0.3, 0.32, -0.16, 0));
    }
  }
  // ---- Sterile & biologics block.
  {
    const { P, R } = makePeel("ster", STER, sterTex, "roofSter");
    const H = STER.h;
    // Mechanical penthouse with louvres + AHUs + exhaust stacks.
    P(R.unit, rb(1.6, 0.22, 0.7, 0.02, 0.55, H, -2.2));
    P(R.dark, bb(-0.25, 1.35, H + 0.05, H + 0.17, -1.852, -1.848));
    for (let i = 0; i < 6; i++) P(R.dark, bb(-0.2 + i * 0.27, -0.05 + i * 0.27, H + 0.06, H + 0.16, -1.848, -1.846));
    for (let i = 0; i < 3; i++) {
      const x = -0.55 + i * 0.95;
      P(R.unit, rb(0.5, 0.1, 0.22, 0.02, x, H, -1.25));
      for (const dx of [-0.12, 0.12]) P(R.dark, cyl(0.045, 0.01, x + dx, H + 0.1, -1.25, 16));
    }
    for (const [x, z] of [
      [1.85, -2.7],
      [1.85, -2.4],
      [-0.7, -2.75],
    ])
      P(R.ss, cyl(0.03, 0.3, x, H, z, 14));
  }
  // ---- API reactor bay (tall, louvred) + CDMO suite.
  {
    const { P, R } = makePeel("api", API, apiTex, "roofApi");
    const H = API.h;
    P(R.ss, cyl(0.05, 0.55, -4.25, H, -0.8, 18));
    P(R.dark, cyl(0.055, 0.03, -4.25, H + 0.55, -0.8, 18));
    P(R.ss, rb(0.18, 0.2, 0.18, 0.03, -4.0, H, -0.75)); // scrubber
    for (let i = 0; i < 3; i++) {
      P(R.unit, rb(0.3, 0.1, 0.18, 0.02, -3.9 + i * 0.5, H, 0.55));
      P(R.dark, cyl(0.04, 0.012, -3.9 + i * 0.5, H + 0.1, 0.55, 14));
    }
    for (let i = 0; i < 5; i++) P(R.dark, bx(0.04, 0.12, 0.04, -4.2 + i * 0.35, H, 0.05));
  }
  {
    const { P, R } = makePeel("api", CDMO, cdmoTex, "roofApi");
    const H = CDMO.h;
    for (let i = 0; i < 3; i++) for (const dz of [0, 0.22]) {
      P(R.ss, cyl(0.022, 0.14, -2.35, H, -0.6 + i * 0.4 + dz, 12));
      P(R.dark, cyl(0.03, 0.02, -2.35, H + 0.14, -0.6 + i * 0.4 + dz, 12));
    }
    P(R.unit, rb(0.32, 0.1, 0.22, 0.02, -1.85, H, 0.3));
  }

  // ============================================================ CONTEXT BUILDINGS (layer 0)
  // ---- Cold-chain warehouse with dock shelters and roof condensers.
  {
    const b = WH;
    const g = uvBox(b.x1 - b.x0, b.h, b.z1 - b.z0);
    mesh(campusG, g, [cm.whWall, cm.whWall, cm.roof, cm.soffit, cm.whWall, cm.whWall], [(b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2]);
    C(cm.white, bb(b.x0, b.x1, b.h, b.h + 0.05, b.z1 - 0.025, b.z1));
    C(cm.white, bb(b.x0, b.x1, b.h, b.h + 0.05, b.z0, b.z0 + 0.025));
    C(cm.white, bb(b.x0, b.x0 + 0.025, b.h, b.h + 0.05, b.z0, b.z1));
    C(cm.white, bb(b.x1 - 0.025, b.x1, b.h, b.h + 0.05, b.z0, b.z1));
    for (const x of [2.95, 3.4, 3.85, 4.3]) {
      C(cm.dark, bb(x - 0.14, x + 0.14, 0, 0.3, b.z1, b.z1 + 0.05)); // shelter
      C(cm.grey, bb(x - 0.11, x + 0.11, 0.02, 0.26, b.z1 + 0.05, b.z1 + 0.052));
      C(cm.grey, bb(x - 0.12, x + 0.12, 0.08, 0.1, b.z1, b.z1 + 0.09)); // leveller
    }
    C(cm.white, bb(b.x0 + 0.1, b.x1 - 0.1, 0.36, 0.39, b.z1, b.z1 + 0.3)); // dock canopy
    for (let i = 0; i < 4; i++)
      for (const z of [-2.65, -2.25]) {
        const x = 2.95 + i * 0.45;
        C(cm.grey, rb(0.34, 0.08, 0.16, 0.015, x, b.h, z));
        for (const dx of [-0.08, 0.08]) {
          C(cm.dark, cyl(0.055, 0.004, x + dx, b.h + 0.08, z, 16));
        }
      }
    // Pipe bridge of refrigerant lines.
    C(cm.grey, bb(2.7, 4.5, b.h + 0.01, b.h + 0.03, -2.45, -2.43));
  }
  // ---- Utility yard (chillers + cooling-tower cells) between sterile block and warehouse.
  {
    for (const z of [-2.7, -2.35]) {
      C(cm.ct, rb(0.3, 0.2, 0.3, 0.015, 2.35, 0, z));
      C(cm.fan, cyl(0.1, 0.06, 2.35, 0.2, z, 20, 0.115));
      C(cm.dark, cyl(0.09, 0.005, 2.35, 0.255, z, 20));
    }
    for (const z of [-2.0, -1.85]) {
      C(cm.chiller, rb(0.32, 0.1, 0.12, 0.012, 2.35, 0, z));
      C(cm.dark, bx(0.28, 0.004, 0.08, 2.35, 0.1, z));
    }
    C(cm.grey, tube(THREE, [[2.2, 0.1, -2.05], [2.13, 0.3, -2.05], [2.1, 0.3, -2.05]], 0.016, 8));
  }
  // ---- Effluent treatment / zero-liquid-discharge plant (front-right corner).
  {
    for (const z of [0.62, 1.26]) {
      const x = 4.05;
      C(cm.concrete, new THREE.CylinderGeometry(0.27, 0.27, 0.07, 40, 1, true).translate(x, 0.035, z));
      C(cm.concrete, ring(0.27, 0.012, x, 0.07, z, "y", 40));
      C(cm.water, cyl(0.265, 0.004, x, 0.055, z, 40));
      C(cm.grey, bx(0.56, 0.02, 0.04, x, 0.075, z)); // rotating bridge
      C(cm.yellow, bx(0.56, 0.004, 0.044, x, 0.095, z));
      C(cm.grey, cyl(0.04, 0.05, x, 0.07, z, 14));
    }
    const ax0 = 3.6,
      ax1 = 4.52,
      az0 = 1.68,
      az1 = 2.3;
    C(cm.concrete, bb(ax0, ax1, 0, 0.07, az0, az0 + 0.03));
    C(cm.concrete, bb(ax0, ax1, 0, 0.07, az1 - 0.03, az1));
    C(cm.concrete, bb(ax0, ax0 + 0.03, 0, 0.07, az0, az1));
    C(cm.concrete, bb(ax1 - 0.03, ax1, 0, 0.07, az0, az1));
    C(cm.concrete, bb((ax0 + ax1) / 2 - 0.015, (ax0 + ax1) / 2 + 0.015, 0, 0.07, az0, az1));
    C(cm.water, bb(ax0 + 0.03, ax1 - 0.03, 0.04, 0.05, az0 + 0.03, az1 - 0.03));
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++) C(cm.white, cyl(0.035, 0.006, ax0 + 0.14 + i * 0.22, 0.05, az0 + 0.18 + j * 0.27, 14));
    // Multiple-effect evaporator + RO skid house (ZLD).
    C(cm.white, rb(0.42, 0.22, 0.26, 0.015, 3.82, 0, 2.55));
    C(cm.roof, bb(3.6, 4.04, 0.22, 0.235, 2.41, 2.69));
    C(cm.dark, bb(3.66, 3.86, 0, 0.16, 2.682, 2.684));
    for (const x of [4.2, 4.33, 4.46]) {
      C(cm.white, vesselLike(0.045, 0.3, x, 0, 2.55));
      C(cm.grey, bx(0.012, 0.03, 0.012, x, 0.38, 2.55));
    }
    C(cm.grey, bb(4.15, 4.5, 0.28, 0.29, 2.5, 2.6));
    C(cm.grey, tube(THREE, [[4.05, 0.12, 0.95], [4.3, 0.12, 0.95], [4.3, 0.12, 1.55], [4.3, 0.1, 1.7]], 0.012, 8));
  }

  // ---- Pharmacy storefront on the boulevard.
  {
    const b = PH;
    const PCX = (b.x0 + b.x1) / 2;
    const g = uvBox(b.x1 - b.x0, b.h, b.z1 - b.z0, 1);
    mesh(campusG, g, [cm.phWall, cm.phWall, cm.roof, cm.soffit, cm.phWall, cm.phWall], [(b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2]);
    // Shopfront: glazing, door, fascia, awning.
    C(cm.shopGlass, bb(b.x0 + 0.06, b.x1 - 0.06, 0.02, 0.2, b.z1, b.z1 + 0.006));
    for (let x = b.x0 + 0.06; x <= b.x1 - 0.05; x += 0.146) C(cm.white, bb(x - 0.006, x + 0.006, 0.02, 0.2, b.z1, b.z1 + 0.012));
    C(cm.dark, bb(PCX - 0.06, PCX + 0.06, 0.02, 0.19, b.z1 + 0.004, b.z1 + 0.012));
    C(cm.green, bb(b.x0 - 0.01, b.x1 + 0.01, 0.21, 0.27, b.z1, b.z1 + 0.03));
    const aw = new THREE.BoxGeometry(b.x1 - b.x0 - 0.04, 0.008, 0.16).rotateX(0.32).translate((b.x0 + b.x1) / 2, 0.205, b.z1 + 0.08);
    C(cm.white, aw);
    // Shelves of product glimpsed through the glass.
    for (let i = 0; i < 4; i++) C(cm.shopItems, bx(0.12, 0.13, 0.03, b.x0 + 0.14 + i * 0.19, 0.02, b.z1 - 0.06));
    // Rooftop light-box cross + a pylon sign by the road.
    C(cm.dark, bx(0.02, 0.1, 0.02, PCX, b.h, 2.55));
    C(cm.green, rb(0.16, 0.16, 0.03, 0.02, PCX, b.h + 0.06, 2.55));
    C(cm.cross, bx(0.11, 0.035, 0.034, PCX, b.h + 0.122, 2.55));
    C(cm.cross, bx(0.035, 0.11, 0.034, PCX, b.h + 0.085, 2.55));
    C(cm.grey, cyl(0.012, 0.42, b.x0 - 0.08, 0, 2.86, 8));
    C(cm.green, rb(0.12, 0.12, 0.025, 0.015, b.x0 - 0.08, 0.36, 2.86));
    C(cm.cross, bx(0.08, 0.025, 0.028, b.x0 - 0.08, 0.408, 2.86));
    C(cm.cross, bx(0.025, 0.08, 0.028, b.x0 - 0.08, 0.38, 2.86));
    C(cm.grey, rb(0.18, 0.06, 0.12, 0.012, b.x1 - 0.14, b.h, 2.25));
    C(cm.dark, cyl(0.04, 0.005, b.x1 - 0.14, b.h + 0.06, 2.25, 14));
  }
  // ---- R&D / innovation centre: superelliptic glass drum, three floors, green roof.
  {
    const shapeOf = (pts: Vec2[]) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const ext = (pts: Vec2[], y0: number, h: number) =>
      new THREE.ExtrudeGeometry(shapeOf(pts), { depth: h, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, y0, 0);
    const FH = RD.h / 3;
    mesh(campusG, ext(rdPts(0.97), 0, RD.h), cm.rdGlass);
    for (let f = 0; f <= 3; f++) {
      const s = f === 3 ? 1.05 : 1.03 + f * 0.01;
      C(cm.slab, ext(rdPts(s), f * FH - (f === 0 ? 0 : 0.012), f === 0 ? 0.02 : 0.03));
    }
    // Mullions.
    const outline = rdPts(0.975, 96);
    for (let i = 0; i < outline.length; i += 2) {
      const [x, z] = outline[i];
      C(cm.slab, bx(0.008, RD.h, 0.008, x, 0, z));
    }
    // Floor plates + core inside (seen through the glass).
    for (let f = 1; f < 3; f++) C(cm.slab, ext(rdPts(0.95), f * FH - 0.01, 0.012));
    C(cm.white, cyl(0.12, RD.h, RD.cx + 0.3, 0, RD.cz - 0.1, 20));
    // Green roof, rooftop pavilion and a PV canopy.
    C(cm.greenRoof, ext(rdPts(0.92), RD.h + 0.03, 0.012));
    C(cm.slab, rb(0.5, 0.14, 0.32, 0.03, RD.cx - 0.35, RD.h + 0.03, RD.cz - 0.05));
    C(cm.rdGlass, bx(0.46, 0.09, 0.005, RD.cx - 0.35, RD.h + 0.06, RD.cz + 0.112));
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(0.2, 0.008, 0.44).rotateZ(0.25).translate(RD.cx + 0.12 + i * 0.22, RD.h + 0.12, RD.cz);
      C(cm.solar, g);
      C(cm.grey, bx(0.01, 0.1, 0.01, RD.cx + 0.12 + i * 0.22, RD.h + 0.03, RD.cz - 0.15));
      C(cm.grey, bx(0.01, 0.1, 0.01, RD.cx + 0.12 + i * 0.22, RD.h + 0.03, RD.cz + 0.15));
    }
    // Entrance canopy on the boulevard side.
    C(cm.slab, bb(RD.cx - 0.25, RD.cx + 0.25, 0.24, 0.26, RD.cz + 0.55, RD.cz + 0.78));
    for (const dx of [-0.22, 0.22]) C(cm.grey, cyl(0.008, 0.24, RD.cx + dx, 0, RD.cz + 0.75, 8));
  }

  // ---- Reefer trucks (cold chain), van, tanker.
  const reefer = (P: Put, cab: T.Material) => {
    // Local: +x forward, trailer rear at x = -0.52.
    P(cm.dark, bx(0.6, 0.025, 0.08, -0.22, 0.032, 0));
    P(cm.truckBody, rb(0.46, 0.15, 0.12, 0.01, -0.29, 0.058, 0));
    P(cm.teal, bx(0.42, 0.018, 0.122, -0.29, 0.1, 0));
    P(cm.grey, rb(0.03, 0.08, 0.1, 0.01, -0.045, 0.12, 0)); // reefer unit
    P(cab, rb(0.12, 0.12, 0.12, 0.02, 0.06, 0.036, 0));
    P(cm.carGlass, bx(0.006, 0.045, 0.1, 0.121, 0.11, 0));
    for (const x of [-0.46, -0.4, 0.0, 0.08])
      for (const z of [-0.052, 0.052]) P(cm.tyre, cylZ(0.024, 0.022, x, 0.024, z, 12));
  };
  for (const [x, cab] of [
    [2.95, cm.cabBlue],
    [3.85, cm.cabRed],
    [4.3, cm.cabBlue],
  ] as [number, T.Material][])
    reefer(place(C, x, 0, WH.z1 + 0.535, -Math.PI / 2), cab);
  reefer(place(C, 1.4, 0, 3.03), cm.cabBlue);
  reefer(place(C, -2.7, 0, 3.21, Math.PI), cm.cabRed);
  // Delivery van at the pharmacy.
  {
    const P = place(C, -0.45, 0, 3.0);
    P(cm.truckBody, rb(0.2, 0.1, 0.09, 0.02, 0, 0.02, 0));
    P(cm.carGlass, bx(0.005, 0.035, 0.08, 0.1, 0.07, 0));
    P(cm.green, bx(0.16, 0.015, 0.092, -0.02, 0.06, 0));
    for (const x of [-0.06, 0.06]) for (const z of [-0.04, 0.04]) P(cm.tyre, cylZ(0.02, 0.016, x, 0.02, z, 10));
  }

  // ---- Landscaping: trees, hedges, cars, street lights.
  {
    const rnd = mulberry(42);
    const solid: [number, number, number, number][] = [OSD, PKG, STER, API, CDMO, WH, PH, KSM, TF, UY].map((b) => [b.x0 - 0.16, b.x1 + 0.16, b.z0 - 0.16, b.z1 + 0.16]);
    solid.push([-4.6, -2.4, 1.35, 2.85]); // R&D
    solid.push([-2.45, -1.43, 1.15, 2.85]); // car park
    solid.push([2.45, 4.75, -1.7, -0.55]); // truck court
    solid.push([0.1, 0.9, 1.9, 2.95]); // plaza
    solid.push([1.95, 2.6, -2.95, -0.85]);
    solid.push([ETP.x0 - 0.12, ETP.x1 + 0.12, ETP.z0 - 0.12, ETP.z1 + 0.12]);
    const onRoad = (x: number, z: number) =>
      ROADS.some(([x0, z0, x1, z1, w]) => {
        const m = w / 2 + 0.12;
        return x >= Math.min(x0, x1) - m && x <= Math.max(x0, x1) + m && z >= Math.min(z0, z1) - m && z <= Math.max(z0, z1) + m;
      });
    const inPlinth = (x: number, z: number) => {
      const dx = Math.max(0, Math.abs(x) - (PX - PR - 0.12)),
        dz = Math.max(0, Math.abs(z) - (PZ - PR - 0.12));
      return Math.hypot(dx, dz) < PR - 0.05;
    };
    const free = (x: number, z: number) =>
      inPlinth(x, z) && !onRoad(x, z) && !solid.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
    const trees: [number, number, number][] = [];
    const ok = (x: number, z: number, sp: number) => trees.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > sp);
    // Boulevard avenue (both verges) + back belt.
    for (let x = -4.7; x <= 4.7; x += 0.42) {
      if (free(x, 3.45)) trees.push([x, 3.45, 0.85 + rnd() * 0.25]);
      if (free(x + 0.2, 2.8) && Math.abs(x + 0.2 - 0.5) > 0.5) trees.push([x + 0.2, 2.8, 0.75 + rnd() * 0.25]);
    }
    for (let i = 0; i < 900 && trees.length < 150; i++) {
      const x = (rnd() * 2 - 1) * PX,
        z = (rnd() * 2 - 1) * PZ;
      if (free(x, z) && ok(x, z, 0.2)) trees.push([x, z, 0.65 + rnd() * 0.45]);
    }
    const canopyGeo = new THREE.IcosahedronGeometry(0.11, 1).scale(1, 1.15, 1).translate(0, 0.21, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.014, 0.019, 0.13, 6).translate(0, 0.065, 0);
    const can = new THREE.InstancedMesh(canopyGeo, cm.canopy, trees.length);
    const tr = new THREE.InstancedMesh(trunkGeo, cm.trunk, trees.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    trees.forEach(([x, z, s], i) => {
      o.position.set(x, 0, z);
      o.scale.set(s, s * (0.9 + rnd() * 0.3), s);
      o.rotation.y = rnd() * 6;
      o.updateMatrix();
      can.setMatrixAt(i, o.matrix);
      tr.setMatrixAt(i, o.matrix);
      col.setHSL(0.22 + rnd() * 0.1, 0.34 + rnd() * 0.16, 0.22 + rnd() * 0.09, THREE.SRGBColorSpace);
      can.setColorAt(i, col);
    });
    campusG.add(can, tr);

    // Clipped hedge along the campus boundary.
    for (const [x0, x1] of [
      [-4.62, -3.6],
      [-3.4, -1.48],
      [-0.12, 0.36],
      [0.66, 3.55],
    ])
      C(cm.hedge, rb(x1 - x0, 0.05, 0.06, 0.02, (x0 + x1) / 2, 0, 2.89));

    // Cars: car park, R&D drop-off, along the boulevard.
    const cars: [number, number, number][] = [];
    for (let z = 1.285; z < 2.78; z += 0.13) {
      if (rnd() > 0.2) cars.push([-2.3, z, 0]);
      if (rnd() > 0.35) cars.push([-1.59, z, Math.PI]);
    }
    cars.push([2.6, 3.21, Math.PI], [-4.2, 3.03, 0], [4.85, 0.9, Math.PI / 2], [-4.85, 0.3, -Math.PI / 2]);
    const bodyGeo = roundedBox(THREE, 0.16, 0.045, 0.075, 0.018, 2).translate(0, 0.035, 0);
    const cabGeo = roundedBox(THREE, 0.085, 0.035, 0.066, 0.015, 2).translate(-0.01, 0.07, 0);
    const body = new THREE.InstancedMesh(bodyGeo, cm.car, cars.length);
    const cabin = new THREE.InstancedMesh(cabGeo, cm.carGlass, cars.length);
    const palette = [0xf2f2f2, 0xb8bec4, 0x2a2e33, 0xc23b32, 0x2b62c4, 0x6b7680, 0xe8e4da];
    cars.forEach(([x, z, ry], i) => {
      o.position.set(x, 0, z);
      o.scale.set(1, 1, 1);
      o.rotation.set(0, ry, 0);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix);
      cabin.setMatrixAt(i, o.matrix);
      col.setHex(palette[Math.floor(rnd() * palette.length)]);
      body.setColorAt(i, col);
    });
    campusG.add(body, cabin);

    // Street lights.
    for (let x = -4.4; x <= 4.6; x += 0.9) {
      for (const z of [2.9, 3.34]) {
        const dir = z < 3 ? 1 : -1;
        C(cm.pole, cyl(0.007, 0.32, x, 0, z, 6));
        C(cm.pole, bb(x - 0.004, x + 0.004, 0.31, 0.318, z, z + dir * 0.07));
        C(cm.lamp, bx(0.03, 0.008, 0.02, x, 0.305, z + dir * 0.07));
      }
    }
  }

  // ============================================================ FLOORS (base bucket)
  {
    const floor = (b: { x0: number; x1: number; z0: number; z1: number }, m: T.Material, rep = 1) =>
      mesh(campusG, uvScale(bb(b.x0 + 0.005, b.x1 - 0.005, 0, FLOOR, b.z0 + 0.005, b.z1 - 0.005), ((b.x1 - b.x0) / 3) * rep, ((b.z1 - b.z0) / 3) * rep), m);
    floor(OSD, baseMats.osdFloor, 1.2);
    floor(PKG, baseMats.osdFloor, 1.2);
    floor(STER, baseMats.sterFloor, 1.2);
    floor(API, baseMats.apiFloor, 1.5);
    floor(CDMO, baseMats.sterFloor, 1.2);
    mesh(campusG, bb(OSD.x0 + 0.05, OSD.x1 - 0.05, FLOOR, FLOOR + 0.002, 0.88, 1.02), baseMats.corridor);
    mesh(campusG, bb(PKG.x0 + 0.05, PKG.x1 - 0.05, FLOOR, FLOOR + 0.002, 0.86, 0.98), baseMats.corridor);
    mesh(campusG, bb(STER.x0 + 0.05, STER.x1 - 0.05, FLOOR, FLOOR + 0.002, -1.02, -0.92), baseMats.corridor);
  }

  // ============================================================ COMMON EQUIPMENT
  const signal = (P: Put, M: EqM, x: number, y: number, z: number) => {
    P(M.dark, cyl(0.005, 0.03, x, y, z, 6));
    P(M.greenLed, cyl(0.007, 0.012, x, y + 0.03, z, 8));
    P(M.amberLed, cyl(0.007, 0.01, x, y + 0.042, z, 8));
  };
  /** Low cleanroom partition: solid dado + vision glazing (axis-aligned). */
  const partition = (P: Put, M: EqM, x0: number, z0: number, x1: number, z1: number, h = 0.15, gh = 0.13) => {
    const t = 0.012;
    const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const a0 = ax ? Math.min(x0, x1) : Math.min(z0, z1),
      a1 = ax ? Math.max(x0, x1) : Math.max(z0, z1);
    const f = (lo: number, hi: number, m: T.Material, y0: number, y1: number) =>
      P(m, ax ? bb(lo, hi, y0, y1, z0 - t / 2, z0 + t / 2) : bb(x0 - t / 2, x0 + t / 2, y0, y1, lo, hi));
    f(a0, a1, M.wall, FLOOR, FLOOR + h);
    f(a0, a1, M.wallBase, FLOOR, FLOOR + 0.02);
    f(a0, a1, M.wallGlass, FLOOR + h, FLOOR + h + gh);
    f(a0, a1, M.grey, FLOOR + h + gh, FLOOR + h + gh + 0.008);
  };
  const ibc = (P: Put, M: EqM, x: number, z: number, y = FLOOR) => {
    for (const dx of [-0.035, 0.035]) for (const dz of [-0.035, 0.035]) P(M.ssDark, bx(0.008, 0.05, 0.008, x + dx, y, z + dz));
    P(M.ss, cyl(0.012, 0.04, x, y + 0.03, z, 4, 0.05).rotateY(Math.PI / 4));
    P(M.ss, rb(0.09, 0.08, 0.09, 0.012, x, y + 0.07, z));
    P(M.ssDark, cyl(0.02, 0.01, x, y + 0.15, z, 12));
  };
  const pallet = (P: Put, M: EqM, x: number, z: number, w = 0.11, d = 0.11) => P(M.wood, bx(w, 0.014, d, x, FLOOR, z));
  const cartonStack = (P: Put, M: EqM, x: number, z: number, layers = 3) => {
    pallet(P, M, x, z);
    for (let l = 0; l < layers; l++)
      for (const dx of [-0.026, 0.026]) for (const dz of [-0.026, 0.026]) P(M.carton, bx(0.05, 0.035, 0.05, x + dx, FLOOR + 0.014 + l * 0.036, z + dz));
  };

  // ============================================================ LAYER 1 - OSD LINE + PACKAGING
  {
    const M = om;
    const P = O;
    // Room layout: corridor along x (z 0.86..1.04), rooms north and south.
    partition(P, M, OSD.x0 + 0.04, 0.86, OSD.x1 - 0.04, 0.86);
    partition(P, M, OSD.x0 + 0.04, 1.04, OSD.x1 - 0.04, 1.04);
    for (const x of [-0.3, 0.45, 1.1]) partition(P, M, x, 0.04, x, 0.86);
    for (const x of [-0.3, 0.75]) partition(P, M, x, 1.04, x, 1.81);

    // R1 Dispensing: pallet racking + downflow booth.
    for (const x of [-0.85, -0.6]) {
      for (const dx of [-0.11, 0.11]) for (const dz of [0.08, 0.22]) P(M.orange, bx(0.01, 0.34, 0.01, x + dx, FLOOR, dz));
      for (const y of [0.12, 0.24, 0.34]) for (const dz of [0.08, 0.22]) P(M.blue, bx(0.23, 0.012, 0.01, x, FLOOR + y - 0.012, dz));
      for (const y of [0, 0.12, 0.24]) {
        P(M.wood, bx(0.2, 0.012, 0.13, x, FLOOR + y, 0.15));
        for (const dx of [-0.05, 0.05]) {
          P(M.blue, cyl(0.025, 0.08, x + dx - 0.02, FLOOR + y + 0.012, 0.13, 12));
          P(M.bag, rb(0.05, 0.06, 0.06, 0.015, x + dx + 0.025, FLOOR + y + 0.012, 0.17));
        }
      }
    }
    {
      const bxC = -0.6,
        bzC = 0.62;
      P(M.white, bx(0.32, 0.26, 0.02, bxC, FLOOR, bzC - 0.12)); // back return-air panel
      P(M.grey, bx(0.28, 0.12, 0.004, bxC, FLOOR + 0.04, bzC - 0.108));
      for (const dx of [-0.15, 0.15]) P(M.white, bx(0.02, 0.26, 0.24, bxC + dx, FLOOR, bzC));
      P(M.white, bx(0.32, 0.05, 0.25, bxC, FLOOR + 0.26, bzC));
      P(M.screen, bx(0.26, 0.004, 0.2, bxC, FLOOR + 0.258, bzC));
      P(M.ss, bx(0.08, 0.04, 0.08, bxC - 0.04, FLOOR, bzC)); // floor scale
      P(M.blue, cyl(0.025, 0.08, bxC + 0.06, FLOOR, bzC - 0.02, 12));
      P(M.ss, bx(0.1, 0.06, 0.06, bxC - 0.05, FLOOR + 0.06, bzC - 0.07));
    }

    // R2 Granulation: rapid mixer granulator -> wet mill -> fluid bed dryer.
    {
      const x = -0.1,
        z = 0.5;
      P(M.white, rb(0.2, 0.12, 0.16, 0.012, x, FLOOR, z));
      P(M.ss, cyl(0.075, 0.07, x, FLOOR + 0.12, z, 24));
      P(M.ss, vessel(0.075, 0.0, x, FLOOR + 0.17, z, 0.35).scale(1, 1, 1));
      P(M.ssDark, cyl(0.022, 0.06, x, FLOOR + 0.2, z, 14));
      P(M.blue, cyl(0.03, 0.04, x - 0.07, FLOOR + 0.09, z + 0.05, 14));
      P(M.ss, tube(THREE, [[x + 0.06, FLOOR + 0.13, z], [x + 0.13, FLOOR + 0.22, z - 0.02], [x + 0.25, FLOOR + 0.3, z - 0.08]], 0.012, 8));
      P(M.screen, bx(0.05, 0.035, 0.005, x + 0.05, FLOOR + 0.07, z + 0.082));
      signal(P, M, x - 0.08, FLOOR + 0.12, z - 0.06);
      // Wet mill (cone mill).
      P(M.ss, cyl(0.02, 0.05, x + 0.15, FLOOR + 0.1, z + 0.02, 12, 0.035));
      P(M.white, bx(0.05, 0.1, 0.05, x + 0.15, FLOOR, z + 0.02));
      // FBD: product bowl on trolley, expansion chamber, filter housing, exhaust duct.
      const fx = 0.28,
        fz = 0.38;
      P(M.dark, bx(0.14, 0.02, 0.14, fx, FLOOR, fz));
      P(M.ss, cyl(0.045, 0.08, fx, FLOOR + 0.03, fz, 24, 0.07));
      P(M.ss, cyl(0.07, 0.015, fx, FLOOR + 0.11, fz, 24));
      P(M.ss, cyl(0.072, 0.14, fx, FLOOR + 0.125, fz, 24));
      P(M.ss, vessel(0.075, 0.03, fx, FLOOR + 0.24, fz, 0.4));
      P(M.ssDark, cyl(0.025, 0.24, fx, FLOOR + 0.3, fz, 14));
      P(M.win, cylZ(0.02, 0.01, fx, FLOOR + 0.2, fz + 0.07, 14));
      P(M.white, rb(0.07, 0.18, 0.06, 0.01, fx + 0.11, FLOOR, fz - 0.03));
      P(M.screen, bx(0.004, 0.04, 0.04, fx + 0.146, FLOOR + 0.11, fz - 0.03));
      // Product container trolley waiting.
      P(M.ss, cyl(0.035, 0.05, fx - 0.03, FLOOR + 0.02, fz + 0.28, 20, 0.055));
      P(M.dark, bx(0.11, 0.02, 0.11, fx - 0.03, FLOOR, fz + 0.28));
    }

    // R3 Blending: bin blender (tilted IBC on a frame) + staged IBCs.
    {
      const x = 0.72,
        z = 0.45;
      P(M.white, rb(0.26, 0.06, 0.12, 0.012, x, FLOOR, z - 0.08));
      for (const dx of [-0.11, 0.11]) P(M.white, rb(0.04, 0.25, 0.06, 0.012, x + dx, FLOOR, z - 0.08));
      P(M.ssDark, cylX(0.015, 0.24, x, FLOOR + 0.2, z - 0.08, 12));
      const bin = mergeInto(THREE, [
        roundedBox(THREE, 0.12, 0.1, 0.12, 0.015, 2).translate(0, 0.02, 0),
        new THREE.CylinderGeometry(0.075, 0.018, 0.06, 4, 1).rotateY(Math.PI / 4).translate(0, -0.06, 0),
      ]);
      bin.rotateX(0.5).translate(x, FLOOR + 0.2, z - 0.05);
      P(M.ss, bin);
      P(M.yellow, bb(x - 0.18, x + 0.18, FLOOR, FLOOR + 0.003, z + 0.12, z + 0.13));
      P(M.screen, bx(0.05, 0.04, 0.005, x + 0.16, FLOOR + 0.12, z + 0.1));
      ibc(P, M, 0.98, 0.25);
      ibc(P, M, 0.98, 0.6);
    }

    // R4 QC lab: benches, HPLC stacks, fume hood.
    {
      for (const z of [0.3, 0.62]) {
        P(M.white, rb(0.6, 0.08, 0.12, 0.01, 1.55, FLOOR, z));
        P(M.dark, bx(0.6, 0.006, 0.12, 1.55, FLOOR + 0.08, z));
        for (let k = 0; k < 4; k++) {
          const x = 1.32 + k * 0.15;
          P(M.white, bx(0.06, 0.07, 0.07, x, FLOOR + 0.086, z));
          P(M.grey, bx(0.06, 0.004, 0.07, x, FLOOR + 0.12, z));
          P(M.screen, bx(0.045, 0.03, 0.004, x + 0.06, FLOOR + 0.09, z + 0.04));
        }
      }
      P(M.white, bx(0.26, 0.28, 0.12, 1.3, FLOOR, 0.1));
      P(M.glass, bx(0.22, 0.1, 0.004, 1.3, FLOOR + 0.12, 0.162));
    }

    // S1 IBC staging + vibro-sifter.
    for (const x of [-0.82, -0.68, -0.54]) for (const z of [1.2, 1.38]) ibc(P, M, x, z);
    {
      const x = -0.65,
        z = 1.65;
      P(M.white, rb(0.1, 0.05, 0.1, 0.01, x, FLOOR, z));
      for (let k = 0; k < 3; k++) P(M.ss, cyl(0.05, 0.022, x, FLOOR + 0.05 + k * 0.024, z, 20));
      P(M.ss, vessel(0.05, 0, x, FLOOR + 0.12, z, 0.4));
    }

    // S2 Compression: three high-speed rotary tablet presses.
    const tabletPress = (Q: Put) => {
      Q(M.white, rb(0.2, 0.12, 0.18, 0.015, 0, 0, 0));
      Q(M.dark, bx(0.202, 0.012, 0.182, 0, 0.12, 0));
      for (const dx of [-0.09, 0.09]) for (const dz of [-0.08, 0.08]) Q(M.ss, bx(0.012, 0.13, 0.012, dx, 0.132, dz));
      Q(M.glass, bx(0.17, 0.13, 0.15, 0, 0.132, 0));
      Q(M.ss, cyl(0.058, 0.02, 0, 0.135, 0, 24));
      Q(M.ssDark, cyl(0.03, 0.06, 0, 0.155, 0, 16));
      Q(M.ss, cyl(0.058, 0.02, 0, 0.215, 0, 24));
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        Q(M.ss, cyl(0.0045, 0.04, 0.047 * Math.cos(a), 0.155, 0.047 * Math.sin(a), 6));
      }
      Q(M.white, rb(0.2, 0.07, 0.18, 0.015, 0, 0.262, 0));
      Q(M.ss, cyl(0.022, 0.06, 0.03, 0.332, -0.02, 16, 0.045));
      Q(M.ss, cyl(0.045, 0.012, 0.03, 0.392, -0.02, 16));
      Q(M.ss, bar(THREE, [0.1, 0.18, 0.06], [0.17, 0.2, 0.1], 0.006, 6));
      Q(M.dark, rb(0.07, 0.05, 0.012, 0.006, 0.17, 0.18, 0.11));
      Q(M.screen, bx(0.058, 0.04, 0.004, 0.17, 0.185, 0.118));
      Q(M.ss, bar(THREE, [0.08, 0.14, 0.07], [0.15, 0.07, 0.11], 0.012, 8)); // deduster chute
      Q(M.ss, cyl(0.022, 0.06, 0.16, 0.0, 0.12, 12)); // metal detector
      Q(M.ss, cyl(0.03, 0.05, 0.16, 0.0, 0.2, 14)); // tablet bin
      signal(Q, M, -0.085, 0.332, 0.075);
    };
    for (const x of [-0.12, 0.2, 0.52]) tabletPress(place(P, x, FLOOR, 1.42));

    // S3 Coating: two perforated-pan auto-coaters with spray-solution tanks.
    const coater = (Q: Put) => {
      Q(M.white, rb(0.3, 0.26, 0.2, 0.02, 0, 0, 0));
      Q(M.ss, ring(0.078, 0.008, -0.03, 0.14, 0.102, "z", 28));
      Q(M.win, cylZ(0.07, 0.01, -0.03, 0.14, 0.1, 28));
      Q(M.ssDark, cylZ(0.05, 0.004, -0.03, 0.14, 0.106, 20)); // drum seen through the window
      Q(M.dark, bx(0.012, 0.05, 0.01, -0.12, 0.14, 0.104));
      Q(M.dark, rb(0.08, 0.06, 0.01, 0.006, 0.1, 0.15, 0.104));
      Q(M.screen, bx(0.066, 0.046, 0.004, 0.1, 0.157, 0.11));
      for (const dx of [-0.08, 0.06]) {
        Q(M.ss, cyl(0.024, 0.24, dx, 0.26, -0.05, 14));
      }
      Q(M.ss, vessel(0.035, 0.07, 0.2, 0, 0.0, 0.4, 18));
      Q(M.blue, cyl(0.014, 0.04, 0.2, 0.1, 0, 10));
      Q(M.ss, tube(THREE, [[0.2, 0.06, 0.03], [0.17, 0.04, 0.05], [0.15, 0.08, 0.07]], 0.004, 6));
      signal(Q, M, -0.13, 0.26, 0.08);
    };
    coater(place(P, 1.05, FLOOR, 1.42));
    coater(place(P, 1.55, FLOOR, 1.42));
    for (const x of [1.0, 1.25, 1.55, 1.8]) ibc(P, M, x, 1.72);

    // --------------------------- packaging hall
    // Blister line (z ~ 0.55): reel-fed thermoformer -> cartoner -> checkweigher -> case packer.
    {
      const z = 0.55;
      P(M.white, rb(0.5, 0.12, 0.16, 0.012, 2.35, FLOOR, z));
      P(M.glass, bx(0.48, 0.08, 0.14, 2.35, FLOOR + 0.12, z));
      for (const dx of [-0.24, 0, 0.24]) P(M.ss, bx(0.01, 0.08, 0.01, 2.35 + dx, FLOOR + 0.12, z + 0.07));
      P(M.white, bx(0.5, 0.012, 0.16, 2.35, FLOOR + 0.2, z));
      // PVC + foil reels at the infeed.
      P(M.bag, cylZ(0.045, 0.04, 2.16, FLOOR + 0.26, z, 24));
      P(M.foil, cylZ(0.035, 0.04, 2.3, FLOOR + 0.25, z, 24));
      P(M.ssDark, bx(0.02, 0.06, 0.02, 2.16, FLOOR + 0.2, z));
      P(M.ssDark, bx(0.02, 0.05, 0.02, 2.3, FLOOR + 0.2, z));
      // Formed web + blister cards.
      P(M.foil, bx(0.42, 0.003, 0.07, 2.36, FLOOR + 0.122, z));
      for (let k = 0; k < 6; k++) P(M.foil, bx(0.04, 0.006, 0.065, 2.2 + k * 0.06, FLOOR + 0.125, z));
      P(M.screen, bx(0.06, 0.04, 0.004, 2.5, FLOOR + 0.08, z + 0.083));
      signal(P, M, 2.58, FLOOR + 0.2, z - 0.06);
      // Cartoner.
      P(M.blue, rb(0.22, 0.14, 0.16, 0.012, 2.72, FLOOR, z));
      P(M.glass, bx(0.2, 0.06, 0.14, 2.72, FLOOR + 0.14, z));
      for (let k = 0; k < 5; k++) P(M.carton, bx(0.012, 0.05, 0.04, 2.66 + k * 0.025, FLOOR + 0.14, z - 0.04));
      // Checkweigher + case packer.
      P(M.ss, bx(0.1, 0.07, 0.07, 2.88, FLOOR, z));
      P(M.dark, bx(0.1, 0.006, 0.05, 2.88, FLOOR + 0.07, z));
      P(M.white, rb(0.14, 0.18, 0.16, 0.012, 3.06, FLOOR, z));
      P(M.glass, bx(0.12, 0.05, 0.14, 3.06, FLOOR + 0.18, z));
      for (let k = 0; k < 3; k++) P(M.carton, bx(0.03, 0.02, 0.03, 2.84 + k * 0.03, FLOOR + 0.076, z));
    }
    // Bottle line (z ~ 1.3): unscrambler -> counter -> capper -> labeller -> cartons.
    {
      const z = 1.3;
      P(M.ss, bx(0.95, 0.06, 0.05, 2.65, FLOOR, z));
      P(M.dark, bx(0.95, 0.004, 0.04, 2.65, FLOOR + 0.06, z));
      P(M.white, cyl(0.09, 0.06, 2.12, FLOOR, z, 28));
      P(M.ss, cyl(0.085, 0.008, 2.12, FLOOR + 0.06, z, 28));
      P(M.white, rb(0.12, 0.2, 0.14, 0.012, 2.42, FLOOR, z - 0.03));
      P(M.ss, cyl(0.02, 0.05, 2.42, FLOOR + 0.2, z - 0.03, 12, 0.05));
      P(M.glass, bx(0.1, 0.06, 0.03, 2.42, FLOOR + 0.06, z + 0.05));
      P(M.white, rb(0.1, 0.18, 0.12, 0.012, 2.64, FLOOR, z - 0.04));
      P(M.ss, cyl(0.03, 0.03, 2.64, FLOOR + 0.18, z - 0.04, 14));
      P(M.teal, rb(0.12, 0.13, 0.1, 0.012, 2.86, FLOOR, z - 0.06));
      P(M.bag, cylZ(0.03, 0.02, 2.86, FLOOR + 0.15, z - 0.06, 18));
      P(M.screen, bx(0.05, 0.035, 0.004, 2.86, FLOOR + 0.08, z - 0.008));
      signal(P, M, 2.42 - 0.05, FLOOR + 0.2, z - 0.09);
      for (const x of [3.05, 3.15]) cartonStack(P, M, x, z + 0.25, 2);
      // Amber glass bottles (instanced) on the conveyor + the unscrambler table.
      const bottlePts: Vec2[] = [
        [0, 0],
        [0.011, 0],
        [0.012, 0.002],
        [0.012, 0.026],
        [0.007, 0.032],
        [0.006, 0.036],
        [0, 0.036],
      ];
      const bottleGeo = lathe(THREE, bottlePts, 10);
      const capGeo = new THREE.CylinderGeometry(0.0068, 0.0068, 0.008, 10).translate(0, 0.039, 0);
      const spots: Vec3[] = [];
      for (let x = 2.22; x < 3.1; x += 0.034) if (Math.abs(x - 2.42) > 0.06 && Math.abs(x - 2.64) > 0.05) spots.push([x, FLOOR + 0.064, z]);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        spots.push([2.12 + 0.065 * Math.cos(a), FLOOR + 0.068, z + 0.065 * Math.sin(a)]);
      }
      const bi = new THREE.InstancedMesh(bottleGeo, M.amberGlass, spots.length);
      const ci = new THREE.InstancedMesh(capGeo, M.white, spots.length);
      const o = new THREE.Object3D();
      spots.forEach((p, i) => {
        o.position.set(p[0], p[1], p[2]);
        o.updateMatrix();
        bi.setMatrixAt(i, o.matrix);
        ci.setMatrixAt(i, o.matrix);
      });
      osdG.add(bi, ci);
    }
    // Dispatch: shrink-wrapped pallets of shipper cartons by the docks + stretch wrapper.
    for (const x of [2.2, 2.45, 2.75, 3.0]) cartonStack(P, M, x, 0.18, 3);
    {
      P(M.dark, cyl(0.1, 0.02, 2.4, FLOOR, 1.7, 24));
      P(M.white, bx(0.03, 0.3, 0.04, 2.53, FLOOR, 1.7));
      cartonStack(P, M, 2.4, 1.7, 3);
    }
    partition(P, M, PKG.x0 + 0.04, 0.95, PKG.x1 - 0.04, 0.95, 0.12, 0.1);
  }

  // ============================================================ LAYER 2 - STERILE & BIOLOGICS
  {
    const M = sm;
    const P = S;
    // Suites: biologics (west) | sterile injectables (east); upstream/lyo north, downstream/fill south.
    partition(P, M, 0.6, -2.91, 0.6, -0.89, 0.16, 0.16);
    partition(P, M, STER.x0 + 0.04, -1.95, STER.x1 - 0.04, -1.95, 0.16, 0.16);
    partition(P, M, STER.x0 + 0.04, -0.98, STER.x1 - 0.04, -0.98, 0.14, 0.18);

    // Upstream: three 2 kL stainless bioreactors + a seed train.
    const bioreactor = (Q: Put, r: number, h: number) => {
      const y0 = 0.07;
      const top = y0 + h + 2 * 0.38 * r;
      Q(M.ss, vessel(r, h, 0, y0, 0, 0.38, 32));
      for (const f of [0.25, 0.7]) Q(M.ssDark, cyl(r * 1.015, 0.008, 0, y0 + 0.38 * r + h * f, 0, 32));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5;
        Q(M.ssDark, bar(THREE, [r * 0.85 * Math.cos(a), y0 + 0.05, r * 0.85 * Math.sin(a)], [r * 1.1 * Math.cos(a), 0, r * 1.1 * Math.sin(a)], 0.008, 6));
      }
      Q(M.blue, cyl(r * 0.25, r * 0.6, 0, top, 0, 16));
      Q(M.ssDark, cyl(r * 0.18, r * 0.25, 0, top + r * 0.6, 0, 14));
      for (const [dx, dz] of [
        [r * 0.55, 0],
        [-r * 0.4, r * 0.4],
        [-r * 0.3, -r * 0.5],
      ])
        Q(M.ss, cyl(r * 0.09, r * 0.3, dx, top - 0.02, dz, 10));
      Q(M.win, cylZ(r * 0.12, 0.01, 0, y0 + 0.38 * r + h * 0.55, r * 0.99, 12));
      Q(M.ss, tube(THREE, [[r * 0.6, top - 0.01, 0], [r * 1.3, top + 0.03, 0], [r * 1.5, top - 0.06, 0], [r * 1.5, 0.02, 0]], 0.008, 6));
      Q(M.white, rb(0.07, 0.2, 0.06, 0.01, r * 1.7, 0, -r * 0.5)); // control tower
      Q(M.screen, bx(0.05, 0.04, 0.004, r * 1.7, 0.13, -r * 0.5 + 0.032));
    };
    for (const x of [-0.6, -0.2, 0.2]) bioreactor(place(P, x, FLOOR, -2.45), 0.11, 0.22);
    for (const z of [-2.75, -2.35]) bioreactor(place(P, 0.46, FLOOR, z, -Math.PI / 2), 0.045, 0.08);
    // Platform walkway behind the big vessels.
    P(M.grate, bb(-0.8, 0.35, FLOOR + 0.2, FLOOR + 0.21, -2.85, -2.68));
    P(M.yellow, railing(THREE, [[-0.8, FLOOR + 0.21, -2.68], [0.35, FLOOR + 0.21, -2.68]], 0.06, 0.003, 0.15));
    for (const x of [-0.78, -0.2, 0.33]) P(M.steel, bx(0.012, 0.2, 0.012, x, FLOOR, -2.7));

    // Downstream: chromatography skids + columns, TFF skid, buffer totes.
    const column = (Q: Put) => {
      Q(M.dark, rb(0.13, 0.02, 0.13, 0.008, 0, 0, 0));
      Q(M.ss, cyl(0.05, 0.015, 0, 0.02, 0, 24));
      Q(M.resin, cyl(0.043, 0.11, 0, 0.035, 0, 24));
      Q(M.glass, cyl(0.047, 0.15, 0, 0.035, 0, 24));
      Q(M.ss, cyl(0.05, 0.015, 0, 0.185, 0, 24));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        Q(M.ss, bx(0.006, 0.18, 0.006, 0.056 * Math.cos(a), 0.02, 0.056 * Math.sin(a)));
      }
      Q(M.ss, tube(THREE, [[0, 0.2, 0], [0, 0.24, 0], [0.09, 0.24, 0], [0.11, 0.12, 0]], 0.005, 6));
      Q(M.white, rb(0.12, 0.13, 0.1, 0.012, 0.14, 0, 0));
      Q(M.screen, bx(0.08, 0.05, 0.004, 0.14, 0.07, 0.052));
      for (const dz of [-0.03, 0.03]) Q(M.ssDark, cyl(0.012, 0.03, 0.18, 0.13, dz, 10));
    };
    for (const x of [-0.78, -0.42, -0.06]) column(place(P, x, FLOOR, -1.45));
    {
      const x = 0.3,
        z = -1.45;
      P(M.ssDark, bx(0.2, 0.012, 0.12, x, FLOOR, z));
      for (const dx of [-0.09, 0.09]) for (const dz of [-0.05, 0.05]) P(M.ss, bx(0.01, 0.16, 0.01, x + dx, FLOOR, z + dz));
      for (let k = 0; k < 4; k++) P(M.white, bx(0.16, 0.022, 0.08, x, FLOOR + 0.05 + k * 0.026, z));
      P(M.ss, vessel(0.04, 0.05, x - 0.02, FLOOR + 0.16, z, 0.4, 18));
    }
    for (let k = 0; k < 5; k++) {
      const x = -0.75 + k * 0.24;
      P(M.ssDark, bx(0.12, 0.012, 0.1, x, FLOOR, -1.13));
      P(M.bag, rb(0.1, 0.1, 0.09, 0.025, x, FLOOR + 0.012, -1.13));
      for (const dx of [-0.055, 0.055]) P(M.ss, bx(0.006, 0.12, 0.006, x + dx, FLOOR, -1.13 + 0.045));
    }

    // Fill-finish: washer -> depyrogenation tunnel -> filling isolator -> capper.
    {
      const z = -1.42;
      P(M.white, rb(0.14, 0.2, 0.2, 0.015, 0.75, FLOOR, z));
      P(M.ss, cyl(0.06, 0.02, 0.75, FLOOR + 0.2, z, 24));
      P(M.ss, rb(0.24, 0.24, 0.2, 0.015, 0.97, FLOOR, z));
      P(M.hot, bx(0.16, 0.05, 0.004, 0.97, FLOOR + 0.1, z + 0.101));
      P(M.white, rb(0.26, 0.06, 0.2, 0.015, 0.97, FLOOR + 0.24, z));
      // Isolator.
      const x0 = 1.1,
        x1 = 1.84,
        xc = (x0 + x1) / 2,
        w = x1 - x0;
      P(M.ss, rb(w, 0.16, 0.22, 0.015, xc, FLOOR, z));
      P(M.glass, bx(w - 0.02, 0.16, 0.2, xc, FLOOR + 0.16, z));
      for (let x = x0 + 0.01; x <= x1 - 0.005; x += w / 4) {
        for (const dz of [-0.1, 0.1]) P(M.ss, bx(0.012, 0.16, 0.012, x, FLOOR + 0.16, z + dz));
      }
      for (const dz of [-0.1, 0.1]) P(M.ss, bx(w, 0.012, 0.012, xc, FLOOR + 0.31, z + dz));
      P(M.white, rb(w + 0.02, 0.09, 0.24, 0.015, xc, FLOOR + 0.32, z));
      for (let k = 0; k < 6; k++) P(M.dark, bx(0.08, 0.004, 0.16, x0 + 0.08 + k * 0.12, FLOOR + 0.318, z));
      // Glove ports on both long faces.
      for (let k = 0; k < 5; k++) {
        const x = x0 + 0.1 + k * 0.135;
        for (const s of [-1, 1]) {
          P(M.ss, ring(0.019, 0.004, x, FLOOR + 0.235, z + s * 0.101, "z", 18));
          P(M.dark, cylZ(0.016, 0.04, x, FLOOR + 0.235, z + s * 0.08, 12));
        }
      }
      // Filling needles gantry.
      P(M.ss, bx(0.012, 0.1, 0.012, 1.42, FLOOR + 0.17, z - 0.06));
      P(M.ss, bx(0.1, 0.02, 0.03, 1.42, FLOOR + 0.25, z - 0.03));
      for (let k = 0; k < 4; k++) P(M.ss, cyl(0.002, 0.05, 1.385 + k * 0.024, FLOOR + 0.2, z, 6));
      P(M.ss, bx(w + 0.4, 0.008, 0.04, (0.7 + 1.98) / 2, FLOOR + 0.16, z));
      // Capper + inspection.
      P(M.white, rb(0.12, 0.2, 0.18, 0.015, 1.94, FLOOR, z));
      P(M.glass, bx(0.1, 0.06, 0.16, 1.94, FLOOR + 0.2, z));
      P(M.screen, bx(0.07, 0.045, 0.004, 1.94, FLOOR + 0.12, z + 0.092));
      signal(P, M, 1.86, FLOOR + 0.41, z + 0.08);
      // Glass vials (instanced) streaming through the line.
      const vialPts: Vec2[] = [
        [0, 0],
        [0.0075, 0],
        [0.008, 0.001],
        [0.008, 0.017],
        [0.0052, 0.021],
        [0.0052, 0.024],
        [0, 0.024],
      ];
      const vialGeo = lathe(THREE, vialPts, 10);
      const vcapGeo = new THREE.CylinderGeometry(0.0062, 0.0062, 0.006, 10).translate(0, 0.026, 0);
      const spots: Vec3[] = [];
      for (let x = 0.84; x < 1.98; x += 0.021) spots.push([x, FLOOR + 0.168, z]);
      // Trays of filled vials waiting for the lyophiliser.
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) spots.push([1.22 + i * 0.019, FLOOR + 0.07, -2.13 + j * 0.019]);
      const vi = new THREE.InstancedMesh(vialGeo, M.glass, spots.length);
      const vc = new THREE.InstancedMesh(vcapGeo, M.blue, spots.length);
      const o = new THREE.Object3D();
      spots.forEach((p, i) => {
        o.position.set(p[0], p[1], p[2]);
        o.updateMatrix();
        vi.setMatrixAt(i, o.matrix);
        vc.setMatrixAt(i, o.matrix);
      });
      sterG.add(vi, vc);
      const liq = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0066, 0.0066, 0.01, 8).translate(0, 0.006, 0), M.liquid, spots.length);
      spots.forEach((p, i) => {
        o.position.set(p[0], p[1], p[2]);
        o.updateMatrix();
        liq.setMatrixAt(i, o.matrix);
      });
      sterG.add(liq);
    }
    // Lyophiliser (freeze dryer): chamber with round door, condenser, vacuum skid, loading cart.
    {
      const x = 0.98,
        z = -2.5;
      P(M.ss, rb(0.36, 0.32, 0.32, 0.02, x, FLOOR, z));
      P(M.ss, cylZ(0.12, 0.02, x, FLOOR + 0.16, z + 0.17, 32));
      P(M.ssDark, ring(0.12, 0.01, x, FLOOR + 0.16, z + 0.18, "z", 32));
      P(M.win, cylZ(0.035, 0.01, x, FLOOR + 0.18, z + 0.18, 16));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        P(M.dark, bx(0.02, 0.02, 0.02, x + 0.13 * Math.cos(a), FLOOR + 0.15 + 0.13 * Math.sin(a), z + 0.175));
      }
      P(M.ss, cylX(0.075, 0.26, x + 0.02, FLOOR + 0.1, z - 0.27, 24));
      P(M.ss, cyl(0.075, 0.01, x + 0.15, FLOOR + 0.025, z - 0.27, 24).rotateZ(0));
      P(M.ssDark, bar(THREE, [x, FLOOR + 0.3, z - 0.1], [x, FLOOR + 0.3, z - 0.24], 0.025, 12));
      P(M.white, rb(0.14, 0.12, 0.1, 0.012, x + 0.26, FLOOR, z - 0.1));
      P(M.screen, bx(0.06, 0.04, 0.004, x + 0.26, FLOOR + 0.06, z - 0.048));
      P(M.blue, cyl(0.025, 0.05, x + 0.26, FLOOR + 0.12, z - 0.1, 12));
      // Automatic loading cart.
      P(M.ss, rb(0.16, 0.06, 0.12, 0.01, 1.27, FLOOR, -2.1));
    }
    // Walk-in cold rooms (2-8 °C) with refrigeration units on top.
    for (const z of [-2.68, -2.25]) {
      const x = 1.82;
      P(M.frost, rb(0.42, 0.28, 0.36, 0.015, x, FLOOR, z));
      P(M.white, bx(0.42, 0.012, 0.36, x, FLOOR + 0.28, z));
      P(M.dark, bx(0.004, 0.2, 0.12, x - 0.212, FLOOR, z));
      for (let k = 0; k < 6; k++) P(M.wallGlass, bx(0.006, 0.19, 0.018, x - 0.216, FLOOR + 0.005, z - 0.05 + k * 0.02));
      P(M.grey, rb(0.24, 0.08, 0.14, 0.01, x + 0.05, FLOOR + 0.29, z));
      for (const dx of [-0.06, 0.06]) P(M.dark, cyl(0.035, 0.005, x + 0.05 + dx, FLOOR + 0.37, z, 16));
      P(M.screen, bx(0.004, 0.03, 0.05, x - 0.212, FLOOR + 0.18, z + 0.1));
    }
  }

  // ============================================================ LAYER 3 - API CHEMISTRY
  {
    const M = am;
    const P = A;
    const F1 = 0.4,
      F2 = 0.78;
    const colsX = [-4.38, -3.825, -3.275, -2.67];
    const colsZ = [-0.93, -0.02, 0.88];
    // Steel structure.
    for (const x of colsX) for (const z of colsZ) P(M.steel, bx(0.03, F2 + 0.2, 0.03, x, FLOOR, z));
    for (const y of [F1, F2, F2 + 0.2]) {
      for (const z of colsZ) P(M.steel, bb(colsX[0], colsX[3], y - 0.025, y, z - 0.012, z + 0.012));
      for (const x of colsX) P(M.steel, bb(x - 0.012, x + 0.012, y - 0.025, y, colsZ[0], colsZ[2]));
    }
    // Bracing on the outer bays.
    for (const z of [colsZ[0], colsZ[2]]) {
      P(M.steel, bar(THREE, [colsX[0], FLOOR, z], [colsX[1], F1, z], 0.006, 4));
      P(M.steel, bar(THREE, [colsX[1], F1, z], [colsX[0], F2, z], 0.006, 4));
    }
    // Grating walkways (leave openings around the vessels; east bay double height).
    const walk = (y: number, x0: number, x1: number, full = true) => {
      P(M.grate, uvScale(bb(x0, x1, y, y + 0.012, -0.2, 0.2), (x1 - x0) * 0.5, 0.2));
      if (full) {
      P(M.grate, uvScale(bb(x0, x1, y, y + 0.012, -0.95, -0.7), (x1 - x0) * 0.5, 0.2));
      P(M.grate, uvScale(bb(x0, x1, y, y + 0.012, 0.66, 0.92), (x1 - x0) * 0.5, 0.2));
      for (const x of [-4.38, -3.825, -3.275]) if (x >= x0 - 0.01 && x <= x1) P(M.grate, uvScale(bb(x - 0.06, x + 0.06, y, y + 0.012, -0.95, 0.92), 0.1, 0.8));
      }
      P(M.yellow, railing(THREE, [[x0, y + 0.012, -0.2], [x1, y + 0.012, -0.2]], 0.06, 0.003, 0.14));
      P(M.yellow, railing(THREE, [[x0, y + 0.012, 0.2], [x1, y + 0.012, 0.2]], 0.06, 0.003, 0.14));
    };
    walk(F1, -4.42, -3.215);
    walk(F2, -4.42, -2.64, false);
    // Stair.
    P(M.steel, bar(THREE, [-2.95, FLOOR, -0.82], [-3.2, F1, -0.82], 0.035, 4).scale(1, 1, 1));
    P(M.yellow, bar(THREE, [-2.95, FLOOR + 0.06, -0.78], [-3.2, F1 + 0.06, -0.78], 0.003, 4));

    // Reactors: glass-lined (blue) and stainless, through the first floor.
    const reactor = (x: number, z: number, glr: boolean) => {
      const r = 0.12,
        h = 0.2,
        yb = 0.24;
      const top = yb + h + 2 * 0.38 * r;
      P(glr ? M.glr : M.ss, vessel(r, h, x, yb, z, 0.38, 32));
      P(M.ss, cyl(r * 1.07, h * 0.7, x, yb + 0.38 * r + 0.01, z, 32));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        P(M.ssDark, bx(0.05, 0.02, 0.03, x + (r + 0.03) * Math.cos(a), F1, z + (r + 0.03) * Math.sin(a)).rotateY(0));
      }
      P(M.ss, cyl(0.012, yb - FLOOR, x, FLOOR, z, 8));
      P(M.blue, bx(0.035, 0.025, 0.035, x, 0.1, z));
      P(M.ss, cyl(0.035, 0.03, x + 0.05, top - 0.03, z + 0.03, 14));
      for (const [dx, dz] of [
        [-0.06, 0.03],
        [0.03, -0.07],
      ])
        P(M.ss, cyl(0.012, 0.04, x + dx, top - 0.03, z + dz, 8));
      P(M.dark, bx(0.06, 0.05, 0.06, x, top - 0.005, z));
      P(M.blue, cyl(0.024, 0.08, x, top + 0.045, z, 14));
      P(M.ssDark, cyl(0.026, 0.01, x, top + 0.125, z, 14));
      // Vapour line up to the overhead condenser on the second floor.
      P(M.ss, tube(THREE, [[x - 0.06, top, z + 0.03], [x - 0.06, F2 + 0.06, z + 0.03], [x - 0.04, F2 + 0.09, z + 0.12], [x, F2 + 0.09, z + 0.16]], 0.01, 6));
      P(M.ss, cylX(0.035, 0.24, x, F2 + 0.09, z + 0.18, 16));
      P(M.ssDark, cyl(0.04, 0.012, x + 0.12, F2 + 0.05, z + 0.18, 16).rotateZ(0));
      P(M.ss, vessel(0.035, 0.06, x + 0.15, F2 + 0.012, z + 0.28 * Math.sign(z), 0.4, 16));
      signal(P, M, x + 0.09, F1 + 0.012, z - 0.12);
    };
    reactor(-4.1, -0.45, true);
    reactor(-3.55, -0.45, false);
    reactor(-4.1, 0.42, false);
    reactor(-3.55, 0.42, true);
    // Charging hopper / glove box at the first-floor walkway.
    P(M.white, rb(0.1, 0.12, 0.08, 0.01, -3.83, F1 + 0.012, 0.0));
    P(M.glass, bx(0.08, 0.06, 0.004, -3.83, F1 + 0.06, 0.042));

    // East double-height bay: basket centrifuge, ANFD, rotary cone vacuum dryer.
    {
      const x = -2.98;
      // Centrifuge.
      P(M.dark, bx(0.24, 0.03, 0.24, x, FLOOR, -0.45));
      P(M.ss, cyl(0.1, 0.08, x, FLOOR + 0.03, -0.45, 28));
      P(M.ss, vessel(0.1, 0, x, FLOOR + 0.08, -0.45, 0.3));
      P(M.blue, rb(0.06, 0.08, 0.06, 0.01, x + 0.1, FLOOR + 0.03, -0.55));
      P(M.screen, bx(0.004, 0.04, 0.05, x - 0.12, FLOOR + 0.1, -0.45));
      // Agitated Nutsche filter dryer on legs.
      P(M.ss, vessel(0.1, 0.08, x, 0.16, -0.1, 0.3));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        P(M.ssDark, bx(0.014, 0.16, 0.014, x + 0.09 * Math.cos(a), FLOOR, -0.1 + 0.09 * Math.sin(a)));
      }
      P(M.blue, cyl(0.025, 0.08, x, 0.16 + 0.08 + 0.06, -0.1, 14));
      // Rotary cone vacuum dryer: double cone on trunnions.
      const rc = lathe(
        THREE,
        [
          [0.001, -0.11],
          [0.025, -0.1],
          [0.09, -0.02],
          [0.09, 0.02],
          [0.025, 0.1],
          [0.001, 0.11],
        ],
        28
      ).translate(x, 0.26, 0.45);
      P(M.ss, rc);
      P(M.ssDark, cylX(0.014, 0.28, x, 0.26, 0.45, 10));
      for (const dx of [-0.14, 0.14]) P(M.white, rb(0.04, 0.26, 0.08, 0.008, x + dx, FLOOR, 0.45));
      P(M.blue, cyl(0.03, 0.06, x + 0.18, 0.16, 0.45, 12));
    }

    // CDMO / kilo-lab suite: walk-in fume hoods with jacketed glass reactors, lab islands, pilot reactors.
    {
      const hx = CDMO.x0 + 0.1;
      for (let i = 0; i < 3; i++) {
        const z = -0.55 + i * 0.4;
        P(M.white, bx(0.14, 0.38, 0.02, hx, FLOOR, z - 0.17));
        P(M.white, bx(0.14, 0.38, 0.02, hx, FLOOR, z + 0.17));
        P(M.white, bx(0.14, 0.06, 0.36, hx, FLOOR + 0.38, z));
        P(M.dark, bx(0.02, 0.38, 0.32, hx - 0.06, FLOOR, z));
        P(M.glass, bx(0.004, 0.3, 0.32, hx + 0.07, FLOOR + 0.06, z));
        P(M.ss, bx(0.006, 0.01, 0.32, hx + 0.072, FLOOR + 0.2, z));
        // Glass reactor on a frame.
        P(M.ssDark, bx(0.08, 0.008, 0.12, hx, FLOOR + 0.12, z));
        for (const dz of [-0.05, 0.05]) P(M.ssDark, bx(0.008, 0.25, 0.008, hx - 0.03, FLOOR, z + dz));
        P(M.glass, vessel(0.04, 0.07, hx, FLOOR + 0.13, z, 0.5, 20));
        P(M.liquid, cyl(0.035, 0.05, hx, FLOOR + 0.145, z, 18));
        P(M.dark, cyl(0.014, 0.05, hx, FLOOR + 0.27, z, 10));
        P(M.glass, cyl(0.01, 0.1, hx + 0.03, FLOOR + 0.24, z - 0.04, 10));
      }
      for (const z of [-0.45, 0.15]) {
        P(M.white, rb(0.16, 0.08, 0.44, 0.01, -2.0, FLOOR, z));
        P(M.dark, bx(0.16, 0.006, 0.44, -2.0, FLOOR + 0.08, z));
        P(M.white, bx(0.03, 0.08, 0.44, -2.0, FLOOR + 0.086, z));
        for (let k = 0; k < 3; k++) {
          P(M.screen, bx(0.004, 0.03, 0.05, -2.06, FLOOR + 0.1, z - 0.14 + k * 0.14));
          P(M.grey, bx(0.04, 0.04, 0.05, -1.95, FLOOR + 0.086, z - 0.14 + k * 0.14));
        }
      }
      for (const z of [0.5, 0.25]) {
        P(M.ss, vessel(0.055, 0.08, -1.7, FLOOR + 0.06, z, 0.4, 22));
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2;
          P(M.ssDark, bx(0.01, 0.07, 0.01, -1.7 + 0.05 * Math.cos(a), FLOOR, z + 0.05 * Math.sin(a)));
        }
        P(M.blue, cyl(0.016, 0.05, -1.7, FLOOR + 0.06 + 0.08 + 0.042, z, 10));
      }
      partition(P, M, CDMO.x0 + 0.3, CDMO.z0 + 0.04, CDMO.x0 + 0.3, CDMO.z1 - 0.04, 0.02, 0.2);
    }
  }

  // ============================================================ YARD - TANK FARM, KSM STORE, PIPE RACKS
  {
    const P = Y;
    // Bund wall.
    const bw = 0.03,
      bh = 0.06;
    P(yd.concrete, bb(TF.x0, TF.x1, 0, bh, TF.z0, TF.z0 + bw));
    P(yd.concrete, bb(TF.x0, TF.x1, 0, bh, TF.z1 - bw, TF.z1));
    P(yd.concrete, bb(TF.x0, TF.x0 + bw, 0, bh, TF.z0, TF.z1));
    P(yd.concrete, bb(TF.x1 - bw, TF.x1, 0, bh, TF.z0, TF.z1));
    mesh(apiG, bb(TF.x0 + bw, TF.x1 - bw, 0, 0.008, TF.z0 + bw, TF.z1 - bw), baseMats.bund);
    const bands = [yd.bandBlue, yd.bandGreen, yd.bandOrange];
    const tz = [-2.62, -2.05];
    const tx = [-4.15, -3.72, -3.29];
    tx.forEach((x, i) =>
      tz.forEach((z) => {
        const r = 0.16,
          h = 0.38;
        P(yd.tank, tankGeo(r, h, x, 0.008, z, 0.3, 28));
        P(bands[i], cyl(r * 1.01, 0.025, x, 0.24, z, 28));
        P(yd.concrete, cyl(r * 1.06, 0.012, x, 0.004, z, 28));
        P(yd.steel, bx(0.012, h, 0.004, x + r * 0.7, 0.01, z + r * 0.72));
        P(yd.ss, cyl(0.012, 0.04, x, 0.008 + h + 0.04, z, 8));
      })
    );
    // Catwalk across the tank tops.
    P(yd.steel, bb(tx[0] - 0.05, tx[2] + 0.05, 0.43, 0.44, -2.37, -2.3));
    P(yd.yellow, railing(THREE, [[tx[0] - 0.05, 0.44, -2.3], [tx[2] + 0.05, 0.44, -2.3]], 0.05, 0.003, 0.12));
    P(yd.steel, bx(0.02, 0.43, 0.02, tx[2] + 0.12, 0, -2.33));
    // Transfer pumps along the bund front + rack to the reactor bay.
    for (let i = 0; i < 4; i++) {
      P(yd.pipeBlue, rb(0.06, 0.04, 0.04, 0.008, -4.25 + i * 0.25, 0.008, -1.72));
      P(yd.dark, cylX(0.015, 0.04, -4.25 + i * 0.25 + 0.045, 0.03, -1.72, 10));
    }
    const rackX = -3.72;
    for (const z of [-1.62, -1.06]) {
      for (const dx of [-0.07, 0.07]) P(yd.steel, bx(0.02, 0.46, 0.02, rackX + dx, 0, z));
      P(yd.steel, bb(rackX - 0.08, rackX + 0.08, 0.44, 0.46, z - 0.01, z + 0.01));
    }
    const pipeMs = [yd.pipeBlue, yd.pipeGreen, yd.pipeGrey, yd.pipeRed];
    pipeMs.forEach((m, i) => {
      const x = rackX - 0.05 + i * 0.033;
      P(m, tube(THREE, [[x, 0.04, -1.74], [x, 0.47, -1.7], [x, 0.475, -1.4], [x, 0.475, -1.0]], 0.011, 8, false, 40));
    });
    // Second rack: reactor bay -> sterile block utilities (over the junction).
    const rz = -1.08;
    for (const x of [-2.55, -1.95, -1.55, -1.02]) {
      P(yd.steel, bx(0.02, 0.5, 0.02, x, 0, rz));
      P(yd.steel, bb(x - 0.01, x + 0.01, 0.48, 0.5, rz - 0.07, rz + 0.07));
    }
    pipeMs.forEach((m, i) => P(m, cylX(0.011, 1.6, -1.77, 0.515, rz - 0.05 + i * 0.033, 8)));
    // Solvent tanker at the unloading bay.
    {
      const Q = place(P, -4.25, 0, -1.3);
      Q(yd.dark, bx(0.56, 0.02, 0.07, -0.02, 0.03, 0));
      Q(yd.ss, cylX(0.055, 0.4, -0.08, 0.1, 0, 20));
      for (const dx of [-0.28, 0.12]) Q(yd.ss, new THREE.SphereGeometry(0.055, 16, 8, 0, Math.PI * 2, 0, Math.PI).scale(0.3, 1, 1).rotateZ(dx > 0 ? -Math.PI / 2 : Math.PI / 2).translate(dx, 0.1, 0));
      Q(yd.cabOrange, rb(0.1, 0.1, 0.1, 0.015, 0.2, 0.03, 0));
      Q(yd.dark, bx(0.005, 0.04, 0.08, 0.252, 0.09, 0));
      for (const x of [-0.24, -0.17, 0.2]) for (const z of [-0.045, 0.045]) Q(yd.tyre, cylZ(0.022, 0.018, x, 0.022, z, 10));
    }

    // KSM / intermediates drum store: pallets of HDPE + steel drums, FIBC bulk bags, forklift.
    const drumPts: [number, number][] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const px = KSM.x0 + 0.2 + i * 0.22,
          pz = KSM.z0 + 0.22 + j * 0.3;
        P(yd.pallet, bx(0.13, 0.014, 0.13, px, 0.004, pz));
        for (const dx of [-0.032, 0.032]) for (const dz of [-0.032, 0.032]) drumPts.push([px + dx, pz + dz]);
      }
    {
      const drumGeo = lathe(
        THREE,
        [
          [0, 0],
          [0.028, 0],
          [0.029, 0.004],
          [0.028, 0.025],
          [0.0295, 0.028],
          [0.028, 0.031],
          [0.028, 0.055],
          [0.0295, 0.058],
          [0.028, 0.062],
          [0.028, 0.08],
          [0.026, 0.083],
          [0, 0.083],
        ],
        16
      );
      const di = new THREE.InstancedMesh(drumGeo, yd.drum, drumPts.length);
      const o = new THREE.Object3D();
      const col = new THREE.Color();
      const rnd = mulberry(5);
      const dcol = [0x2a5fb0, 0x2a5fb0, 0x3a4048, 0xd9d9d2, 0x2a5fb0, 0x6b7a3a];
      drumPts.forEach(([x, z], i) => {
        o.position.set(x, 0.018, z);
        o.rotation.y = rnd() * 6;
        o.updateMatrix();
        di.setMatrixAt(i, o.matrix);
        col.setHex(dcol[Math.floor(rnd() * dcol.length)]);
        di.setColorAt(i, col);
      });
      apiG.add(di);
    }
    for (let i = 0; i < 4; i++) {
      const x = KSM.x1 - 0.1,
        z = KSM.z0 + 0.15 + i * 0.16;
      P(yd.pallet, bx(0.13, 0.014, 0.13, x, 0.004, z));
      P(yd.bag, rb(0.11, 0.11, 0.11, 0.03, x, 0.018, z));
      P(yd.bag, cyl(0.02, 0.02, x, 0.128, z, 8));
    }
    {
      const Q = place(P, -2.1, 0, KSM.z1 + 0.15, Math.PI / 2);
      Q(yd.yellow, rb(0.12, 0.07, 0.07, 0.012, 0, 0.02, 0));
      Q(yd.dark, bx(0.05, 0.05, 0.06, -0.02, 0.09, 0));
      Q(yd.dark, bx(0.008, 0.2, 0.05, 0.065, 0.01, 0));
      Q(yd.steel, bx(0.06, 0.004, 0.012, 0.1, 0.02, -0.02));
      Q(yd.steel, bx(0.06, 0.004, 0.012, 0.1, 0.02, 0.02));
      for (const x of [-0.04, 0.04]) for (const z of [-0.035, 0.035]) Q(yd.tyre, cylZ(0.018, 0.014, x, 0.018, z, 10));
    }
    // Open-sided shed: posts (yard) + gable roof (fades/lifts at layer 3).
    for (const x of [KSM.x0, (KSM.x0 + KSM.x1) / 2, KSM.x1])
      for (const z of [KSM.z0, KSM.z1]) P(yd.steel, bx(0.025, KSM.h, 0.025, x, 0, z));
  }
  const ksmRoof = new THREE.Group();
  campusG.add(ksmRoof);
  {
    const w = KSM.x1 - KSM.x0 + 0.1,
      d = KSM.z1 - KSM.z0 + 0.12;
    const xc = (KSM.x0 + KSM.x1) / 2,
      zc = (KSM.z0 + KSM.z1) / 2;
    const pitch = 0.18;
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(w, 0.012, d / 2 / Math.cos(pitch))
        .rotateX(s * pitch)
        .translate(xc, KSM.h + Math.tan(pitch) * (d / 4), zc + (s * d) / 4);
      put(ksmRoof, shedRoof.sheet, g);
    }
    put(ksmRoof, shedRoof.frame, bx(w, 0.02, 0.02, xc, KSM.h + Math.tan(pitch) * (d / 2) - 0.01, zc));
    put(ksmRoof, shedRoof.frame, bb(KSM.x0, KSM.x1, KSM.h - 0.03, KSM.h, KSM.z0 - 0.01, KSM.z0 + 0.01));
    put(ksmRoof, shedRoof.frame, bb(KSM.x0, KSM.x1, KSM.h - 0.03, KSM.h, KSM.z1 - 0.01, KSM.z1 + 0.01));
  }

  // ------------------------------------------------------------ flush batches
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ------------------------------------------------------------ levels
  const ease = (x: number) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  const peel = (list: Peel[], t: number) => {
    const e = ease(t);
    for (const p of list) {
      p.plane.constant = lerp(p.b.h, DADO, e);
      p.cap.position.y = p.plane.constant;
      p.roof.position.y = e * 0.55;
    }
    if (list.length) L.set(list[0].bucket, 1 - smoothstep(t, 0.04, 0.55));
  };
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      peel(peels.osd, a);
      peel(peels.ster, b);
      peel(peels.api, c);
      L.set("roofKsm", 1 - smoothstep(c, 0.04, 0.55));
      ksmRoof.position.y = ease(c) * 0.45;
      L.set("trees", lerp(1, 0.5, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("osdEq", smoothstep(a, 0.15, 0.85) * lerp(1, 0.22, ease(b)));
      L.set("sterEq", smoothstep(b, 0.15, 0.85) * lerp(1, 0.22, ease(c)));
      L.set("apiEq", smoothstep(c, 0.15, 0.85));
      L.set("yard", lerp(lerp(1, 0.45, ease(a)), 1, ease(c)));
      focusOsd(tri(v, 1) * 0.1);
      focusSter(tri(v, 2) * 0.1);
      focusApi(c * 0.08);
      focusYard(c * 0.12);
    },
  };
}
