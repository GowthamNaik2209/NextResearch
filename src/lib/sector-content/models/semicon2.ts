// Semicon 2.0 + Mobile Phones (MPMS): a miniature "chip-to-phone" electronics campus on a
// display plinth - the kind of cluster Sanand / Dholera (Gujarat) or Jewar (UP) is becoming,
// where a wafer fab, a chip packaging (OSAT) plant and a smartphone assembly plant share roads,
// utilities and a dispatch yard.
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Wafer fab (tall white block, rooftop air handlers + scrubber stacks) on the west, with the
//     bulk-gas / chemicals yard against its west wall and the utility strip (cooling towers,
//     ultra-pure-water plant, substation) in front of it.
//   · Chip packaging & test (OSAT/ATMP) plant at the back-middle; a compound-semiconductor and
//     advanced-packaging suite is walled off at its east end.
//   · Phone assembly plant in the middle-front: PCBA (SMT) lines and the sub-assembly supermarket
//     at its west end, final assembly / test / pack lines in the rest, export containers at its
//     east dock.
//   · Export warehouse + truck court at the back-right, chip-design centre at the front-left and
//     a phone store with a billboard on the boulevard at the front-right.
//
// Layers: 0 Campus & Market (exteriors, roads, trucks, store, design centre, utilities),
// 1 Phone Assembly (phone plant walls section down, roof lifts), 2 Packaging & Test (OSAT walls
// section down), 3 Wafer Fab (fab walls section down, gas yard lights up). Buildings "peel" with
// a moving world-space clipping plane (a real section cut with a dark cap line) rather than
// fading, so walls never ghost-sort; peeled layers stay as dimmed context.
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
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on.
export const SEMICON2_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: campus & market
  design: { pos: [-3.55, 0.8, 2.17], side: "top" }, // chip-design centre roof
  utilities: { pos: [-2.0, 0.3, 1.02], side: "left" }, // cooling towers / UPW plant
  brands: { pos: [3.0, 0.66, 2.42], side: "right" }, // phone store billboard
  // layer 1: phone assembly
  subassy: { pos: [-0.28, 0.22, 1.28], side: "left" }, // sub-assembly flow racks at the plant's front-west
  phone_ems: { pos: [1.9, 0.14, 0.72], side: "right" }, // final assembly conveyor
  // layer 2: packaging & test
  osat: { pos: [0.1, 0.2, -2.05], side: "top" }, // wire-bonder hall
  advpack: { pos: [1.5, 0.3, -1.95], side: "right" }, // compound / advanced-packaging suite
  // layer 3: wafer fab
  fab: { pos: [-2.2, 0.42, -1.04], side: "top" }, // FOUP stocker + overhead transport
  equipment: { pos: [-3.3, 0.23, -1.8], side: "top" }, // lithography scanner
  gases: { pos: [-4.55, 0.78, -1.25], side: "left" }, // bulk gas tanks
};

// `layer` (optional): a view about one layer also peels the model to it.
export const SEMICON2_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    // Steeper than a street-level view and aimed at the model's visual centre, so the campus
    // fills a portrait phone stage as well as the desktop one.
    pos: [5.36, 7.89, 10.34],
    target: [0.23, -0.05, 0.7],
    narration:
      "Welcome to the chip-to-phone campus. Two government schemes meet here: Semicon 2.0 pays part of the cost of the wafer fab and the chip packaging plant at the back, and the Mobile Phone Manufacturing Scheme pays phone makers a share of their sales from the assembly plant in front - with a bonus when the parts inside are made in India.",
  },
  {
    id: "campus",
    label: "Campus",
    pos: [3.2, 2.0, 8.6],
    target: [-0.2, 0.35, 1.2],
    narration:
      "From the boulevard: the phone store and its billboard are where demand starts. The glass building on the left is the chip-design centre; behind it, the cooling towers and water plant keep the fab running. Containers at the phone plant's dock are mostly bound for export.",
  },
  {
    id: "assembly",
    layer: 1,
    label: "Assembly Line",
    pos: [3.9, 3.9, 5.5],
    target: [1.45, 0.05, 0.6],
    narration:
      "The phone plant. On the left, surface-mount lines print solder, place chips and bake circuit boards, next to racks of batteries, chargers and casings. On the right, workers assemble, test and box the phones - the sales this line produces are what the Mobile Phone Manufacturing Scheme rewards.",
  },
  {
    id: "packaging",
    layer: 2,
    label: "Packaging & Test",
    pos: [1.6, 4.5, 1.35],
    target: [0.6, 0.1, -1.95],
    narration:
      "Chip packaging and test, or OSAT. Wafers are sawn into dies, bonded to a substrate with fine gold or copper wires, sealed in plastic and tested. This is where India's first chip plants started production in 2026. The walled suite on the right is for silicon-carbide and glass-substrate packaging.",
  },
  {
    id: "fab",
    layer: 3,
    label: "Wafer Fab",
    pos: [-1.0, 4.6, 2.3],
    target: [-3.25, 0.2, -1.3],
    narration:
      "The wafer fab: inside a cleanroom, lithography scanners print circuit patterns, then etch and deposition tools build them up layer by layer, with wafers riding an overhead track in sealed pods. The yard on the left supplies ultra-pure gases and chemicals. Semicon 2.0 pays forty per cent of a large silicon fab's capital cost.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration: "From above you can read the chain: wafer fab and gas yard on the left, chip packaging at the back, phone assembly in the middle, and the warehouse, store and design centre around them.",
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

export function buildSemicon2(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [campusG, phoneG, osatG, fabG] = ctx.layerGroups;
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
  /** Local frame (front = +Z, floor = y 0) -> world. */
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
  /** Domed vertical tank, base at y. */
  const tankGeo = (r: number, h: number, x: number, y: number, z: number, dome = 0.35, seg = 24) => {
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
  /** Horizontal tank with dished ends along X, centre at (x, y, z). */
  const hTank = (r: number, len: number, x: number, y: number, z: number) => {
    const geos: T.BufferGeometry[] = [cylX(r, len, x, y, z, 18)];
    for (const s of [-1, 1])
      geos.push(
        new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2)
          .scale(1, 0.45, 1)
          .rotateZ((-s * Math.PI) / 2)
          .translate(x + (s * len) / 2, y, z)
      );
    return mergeInto(THREE, geos);
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  const uvBox = (w: number, h: number, d: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    const faceU = [d, d, w, w, w, w];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setX(i, uv.getX(i) * faceU[f]);
        if (f === 2 || f === 3) uv.setY(i, uv.getY(i) * d);
      }
    return g;
  };
  /** Four outward-facing wall planes (open top/bottom); UV u repeats per unit, v spans 0..h. */
  const wallRing = (b: Box, skip = "") => {
    const geos: T.BufferGeometry[] = [];
    const side = (len: number, cx: number, cz: number, ry: number) => {
      const g = new THREE.PlaneGeometry(len, b.h);
      uvScale(g, len, 1);
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
  const FAB: Box = { x0: -4.05, x1: -1.6, z0: -2.85, z1: 0.3, h: 1.0 };
  const GY = { x0: -4.95, x1: -4.2, z0: -2.85, z1: 0.3 };
  const UT = { x0: -4.9, x1: -1.6, z0: 0.72, z1: 1.32 };
  const DES = { x0: -4.6, x1: -2.5, z0: 1.62, z1: 2.72, h: 0.72 };
  const OSAT: Box = { x0: -0.85, x1: 1.95, z0: -2.95, z1: -1.0, h: 0.72 };
  const WH: Box = { x0: 2.45, x1: 4.7, z0: -2.95, z1: -1.7, h: 0.58 };
  const PHN: Box = { x0: -0.85, x1: 3.55, z0: -0.3, z1: 1.75, h: 0.6 };
  const ST: Box = { x0: 2.5, x1: 3.5, z0: 2.12, z1: 2.7, h: 0.3 };
  const CY = { x0: 3.82, x1: 4.62, z0: 0.0, z1: 1.2 }; // container yard at the phone plant's east dock
  const PX = 5.1,
    PZ = 3.6,
    PR = 0.45;
  // Roads: [x0, z0, x1, z1, width]
  const ROADS: [number, number, number, number, number][] = [
    [-5.4, 3.12, 5.4, 3.12, 0.36], // public boulevard
    [-1.25, -3.3, -1.25, 3.12, 0.26],
    [-1.25, -0.65, 4.85, -0.65, 0.26],
    [4.85, -0.65, 4.85, 3.12, 0.26],
    [-4.95, 0.51, -1.25, 0.51, 0.22],
  ];

  // ------------------------------------------------------------ textures
  type FacadeOpts = { base: string; plinth: string; accent?: string; accentAt?: number; bands?: Vec2[]; ribs?: boolean; louvre?: Vec2; pitch?: number };
  /** Façade texture: 1 world unit per repeat horizontally, full height vertically. */
  const facade = (H: number, o: FacadeOpts) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      const Y = (f: number) => h - f * h;
      g.fillStyle = o.base;
      g.fillRect(0, 0, w, h);
      if (o.ribs) {
        for (let x = 0; x < w; x += 10) {
          g.fillStyle = "rgba(0,0,0,0.10)";
          g.fillRect(x, 0, 3, h);
          g.fillStyle = "rgba(255,255,255,0.22)";
          g.fillRect(x + 3, 0, 1, h);
        }
      } else {
        g.fillStyle = "rgba(0,0,0,0.07)";
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
      g.fillRect(0, Y(0.08), w, h - Y(0.08));
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(0, Y(0.08) - 1, w, 1.2);
    });
  const fabTex = facade(FAB.h, { base: "#f1f4f6", plinth: "#4e5862", accent: "#3a64d8", accentAt: 0.66, louvre: [0.74, 0.92] });
  const osatTex = facade(OSAT.h, { base: "#e4e9ed", plinth: "#56606a", ribs: true, accent: "#d96c2b", accentAt: 0.86, bands: [[0.42, 0.56]], pitch: 64 });
  const phnTex = facade(PHN.h, { base: "#eef1f3", plinth: "#56606a", accent: "#17a398", accentAt: 0.84, bands: [[0.5, 0.7]] });
  const whTex = facade(WH.h, { base: "#e9eef2", plinth: "#3d4650", ribs: true, accent: "#2e86ab", accentAt: 0.84 });
  const roofTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#c2c7cb";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#b3b8bd";
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1.5);
      g.fillStyle = "#d0d4d8";
      g.fillRect(0, 120, w, 14);
    },
    true
  );
  const tileTex = (base: string, line: string, step = 32) =>
    tex(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        g.fillStyle = line;
        for (let i = 0; i <= w; i += step) {
          g.fillRect(i, 0, 1, h);
          g.fillRect(0, i, w, 1);
        }
      },
      true
    );
  const cleanTex = tileTex("#e3e8ee", "rgba(70,90,120,0.16)", 21); // raised-floor perforated tiles
  cleanTex.repeat.set(4, 4);
  const esdTex = tileTex("#c9d3d8", "rgba(40,70,80,0.14)", 64); // ESD epoxy floor
  esdTex.repeat.set(3, 3);
  const osatFloorTex = tileTex("#d9dee4", "rgba(80,90,110,0.14)", 64);
  osatFloorTex.repeat.set(3, 3);
  // Billboard: a phone on a gradient.
  const boardTex = canvasTexture(THREE, 256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#14315f");
    gr.addColorStop(1, "#1c8f8a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (const [x, r] of [
      [70, 0],
      [150, 0.15],
    ] as [number, number][]) {
      g.save();
      g.translate(x, 64);
      g.rotate(r);
      g.fillStyle = "#0b0f14";
      g.beginPath();
      g.roundRect(-24, -50, 48, 100, 9);
      g.fill();
      const sg = g.createLinearGradient(0, -46, 0, 46);
      sg.addColorStop(0, "#7fd8ff");
      sg.addColorStop(1, "#5b5bf0");
      g.fillStyle = sg;
      g.beginPath();
      g.roundRect(-20, -45, 40, 90, 6);
      g.fill();
      g.restore();
    }
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.fillRect(196, 44, 44, 8);
    g.fillRect(196, 60, 34, 6);
    g.fillRect(196, 74, 40, 6);
  });
  const desTex = tex(256, 192, (g, w, h) => {
    g.fillStyle = "#24384a";
    g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(170,210,235,0.28)");
    gr.addColorStop(1, "rgba(170,210,235,0.04)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d9e1e6";
    for (let x = 0; x < w; x += 21) g.fillRect(x, 0, 2, h);
    for (const f of [0, 1, 2, 3]) g.fillRect(0, h - (f * h) / 3 - 4, w, 6);
    g.fillStyle = "rgba(255,236,190,0.35)";
    for (let i = 0; i < 18; i++) g.fillRect((i * 53) % w, 20 + ((i * 37) % 140), 12, 10);
  });

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
    const rnd = mulberry(7);
    g.fillStyle = "#5f7f4c";
    g.fillRect(0, 0, GW, GH);
    for (let i = 0; i < 1000; i++) {
      g.fillStyle = rnd() > 0.5 ? "rgba(255,255,210,0.04)" : "rgba(0,25,0,0.05)";
      g.beginPath();
      g.arc(rnd() * GW, rnd() * GH, 8 + rnd() * 46, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 0; x < GW; x += 48) g.fillRect(x, 0, 24, GH);
    const apron = "#aaada7";
    const pad = (b: { x0: number; x1: number; z0: number; z1: number }, m: number, c = apron) => rect(b.x0 - m, b.x1 + m, b.z0 - m, b.z1 + m, c);
    pad(FAB, 0.1);
    pad(OSAT, 0.1);
    pad(PHN, 0.1);
    pad(WH, 0.1);
    pad(ST, 0.08, "#bdb7a9");
    pad(GY, 0.03, "#8f928d");
    pad(UT, 0.03, "#9a9d98");
    pad(CY, 0.06, "#7d8186");
    // Truck court.
    rect(2.4, 4.72, -1.7, -0.8, "#4a5057");
    // Soft ambient-occlusion halo around every footprint.
    g.save();
    g.filter = "blur(10px)";
    for (const b of [FAB, OSAT, PHN, WH, ST, DES]) {
      g.fillStyle = "rgba(0,0,0,0.32)";
      g.fillRect(X(b.x0 - 0.02), Z(b.z0 - 0.02), (b.x1 - b.x0 + 0.04) * sx, (b.z1 - b.z0 + 0.04) * sx);
    }
    g.restore();
    // Bund floors (gas yard, chemicals).
    rect(GY.x0, GY.x1, GY.z0, GY.z1, "#8b8e8a");
    g.strokeStyle = "rgba(230,190,60,0.85)";
    g.lineWidth = 3;
    g.strokeRect(X(GY.x0 + 0.03), Z(GY.z0 + 0.03), (GY.x1 - GY.x0 - 0.06) * sx, (GY.z1 - GY.z0 - 0.06) * sx);
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
    // Truck-court bay lines.
    g.strokeStyle = "rgba(240,200,60,0.85)";
    g.lineWidth = 2.5;
    for (const x of [2.7, 3.15, 3.6, 4.05, 4.5]) {
      g.beginPath();
      g.moveTo(X(x), Z(-1.68));
      g.lineTo(X(x), Z(-1.05));
      g.stroke();
    }
    // Car park in front of the phone plant.
    rect(-0.9, 0.62, 2.0, 2.84, "#383d43");
    g.strokeStyle = "rgba(235,235,225,0.75)";
    g.lineWidth = 2;
    for (let x = -0.86; x <= 0.6; x += 0.12) {
      for (const [za, zb] of [
        [2.02, 2.26],
        [2.58, 2.82],
      ]) {
        g.beginPath();
        g.moveTo(X(x), Z(za));
        g.lineTo(X(x), Z(zb));
        g.stroke();
      }
    }
    // Plaza + footpaths.
    rect(0.85, 2.3, 1.92, 2.3, "#bdb7a9");
    g.strokeStyle = "#c2bcae";
    g.lineCap = "round";
    g.lineWidth = 0.08 * sx;
    const path = (pts: Vec2[]) => {
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
    };
    path([
      [1.55, 2.94],
      [1.55, 2.3],
    ]);
    path([
      [-3.55, 2.94],
      [-3.55, 2.75],
    ]);
    path([
      [-2.45, 2.17],
      [-1.4, 2.17],
    ]);
    g.fillStyle = "rgba(245,245,240,0.85)";
    for (let i = 0; i < 6; i++) g.fillRect(X(1.43 + i * 0.045), Z(2.95), 0.022 * sx, 0.33 * sx);
  });
  groundTex.anisotropy = 8;

  // ------------------------------------------------------------ materials
  const baseMats = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x4a7cf0, emissiveIntensity: 0.4 })),
    cleanFloor: L.add("base", std(0xffffff, 0.08, 0.4, { map: cleanTex })),
    esdFloor: L.add("base", std(0xffffff, 0.05, 0.45, { map: esdTex })),
    osatFloor: L.add("base", std(0xffffff, 0.05, 0.42, { map: osatFloorTex })),
    walkway: L.add("base", std(0xe2c64a, 0.05, 0.6)),
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
    whWall: L.add("ctx", std(0xffffff, 0.2, 0.45, { map: whTex })),
    roof: L.add("ctx", std(0xffffff, 0.05, 0.85, { map: roofTex })),
    soffit: L.add("ctx", std(0x3c434b, 0.2, 0.7)),
    glass: L.add("ctx", std(0x2b4a5e, 0.65, 0.07, { opacity: 0.88, envMapIntensity: 1.4 })),
    desGlass: L.add("ctx", std(0xffffff, 0.55, 0.12, { map: desTex, envMapIntensity: 1.3 })),
    slab: L.add("ctx", std(0xf1f3f4, 0.05, 0.45)),
    greenRoof: L.add("ctx", std(0x5f8c45, 0, 0.9)),
    solar: L.add("ctx", std(0x1d2c4a, 0.6, 0.2)),
    ct: L.add("ctx", std(0x9fb2b5, 0.1, 0.55)),
    fan: L.add("ctx", std(0x262b30, 0.4, 0.5, { side: DS })),
    upw: L.add("ctx", std(0xf2f5f7, 0.2, 0.3)),
    blueSkid: L.add("ctx", std(0x2f6fd0, 0.35, 0.4)),
    xfmr: L.add("ctx", std(0x6d7a5e, 0.4, 0.5)),
    gravel: L.add("ctx", std(0x9a9b96, 0, 0.95)),
    board: L.add("ctx", std(0xffffff, 0, 0.5, { map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.55 })),
    shopGlass: L.add("ctx", std(0x9fc9d8, 0.5, 0.08, { emissive: 0x25344a, emissiveIntensity: 0.7 })),
    storeWall: L.add("ctx", std(0x1f2a36, 0.3, 0.45)),
    shopItems: L.add("ctx", std(0x101418, 0.3, 0.3, { emissive: 0x4a8cff, emissiveIntensity: 0.5 })),
    cont: [0x2e6fc0, 0xc8492f, 0x2f9a63, 0xd9a520, 0x6d7680].map((c) => L.add("ctx", std(c, 0.45, 0.45))),
    contRib: L.add("ctx", std(0x000000, 0, 1, { opacity: 0.18 })),
  };
  /** Roof package of a peeling building (fades as it lifts). */
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    ss: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
    accent: L.add(bucket, std(0x3a64d8, 0.3, 0.4)),
  });
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    black: L.add(bucket, std(0x15181c, 0.3, 0.4)),
    glass: L.add(bucket, std(0xd5ebf3, 0.2, 0.05, { opacity: 0.32 })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    amberLed: L.add(bucket, std(0x332000, 0, 0.5, { emissive: 0xffb020, emissiveIntensity: 0.9 })),
    hot: L.add(bucket, std(0x331100, 0, 0.5, { emissive: 0xff7a2a, emissiveIntensity: 1.2 })),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    teal: L.add(bucket, std(0x17a398, 0.25, 0.4)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    purple: L.add(bucket, std(0x7a5cc7, 0.3, 0.45)),
    steel: L.add(bucket, std(0x5c6b7a, 0.6, 0.45)),
    belt: L.add(bucket, std(0x6b7682, 0.2, 0.7)),
    wall: L.add(bucket, std(0xf2f4f6, 0.05, 0.6)),
    wallBase: L.add(bucket, std(0x9fb3c2, 0.1, 0.5)),
    wallGlass: L.add(bucket, std(0xc4dce8, 0.3, 0.06, { opacity: 0.32 })),
    carton: L.add(bucket, std(0xf4f4f0, 0, 0.7)),
    brown: L.add(bucket, std(0xc59a6a, 0, 0.8)),
    wood: L.add(bucket, std(0x9a7448, 0, 0.85)),
    smock: L.add(bucket, std(0x3f78d8, 0, 0.7)),
    bunny: L.add(bucket, std(0xa9c8ee, 0, 0.65)),
    skin: L.add(bucket, std(0xb98a63, 0, 0.7)),
    wafer: L.add(bucket, std(0x8c7fb0, 0.95, 0.12, { emissive: 0x241a40, emissiveIntensity: 0.4 })),
    sic: L.add(bucket, std(0x2c4a3a, 0.6, 0.25)),
    panel: L.add(bucket, std(0xbfe3ee, 0.4, 0.05, { opacity: 0.55 })),
    chamber: L.add(bucket, std(0xb9c5d1, 0.75, 0.3)),
    amberGlass: L.add(bucket, std(0xf2b33d, 0.1, 0.1, { opacity: 0.45, emissive: 0x7a4a00, emissiveIntensity: 0.35 })),
    amberFloor: L.add(bucket, std(0xf3dd9a, 0.05, 0.5, { emissive: 0x6a4a10, emissiveIntensity: 0.15 })),
    suiteFloor: L.add(bucket, std(0xd9cdea, 0.05, 0.5)),
  });
  type EqM = ReturnType<typeof eqMats>;
  const pm = eqMats("phoneEq");
  const om = eqMats("osatEq");
  const fm = eqMats("fabEq");
  const yd = {
    tank: L.add("yard", std(0xf0f3f5, 0.15, 0.35)),
    ss: L.add("yard", std(0xc2c9d0, 0.85, 0.28)),
    steel: L.add("yard", std(0x5c6b7a, 0.6, 0.45)),
    dark: L.add("yard", std(0x2e343b, 0.45, 0.45)),
    yellow: L.add("yard", std(0xe2b33a, 0.4, 0.45)),
    pipeBlue: L.add("yard", std(0x3a78c2, 0.5, 0.4)),
    pipeGreen: L.add("yard", std(0x3a9d6e, 0.45, 0.4)),
    pipeRed: L.add("yard", std(0xb8443a, 0.4, 0.45)),
    pipeGrey: L.add("yard", std(0xa7b0b8, 0.75, 0.3)),
    cabinet: L.add("yard", std(0xd8dde2, 0.4, 0.4)),
    bund: L.add("yard", std(0x9a9d9a, 0, 0.9)),
    tyre: L.add("yard", std(0x17181a, 0.1, 0.85)),
    cab: L.add("yard", std(0x2f9a63, 0.4, 0.35)),
  };

  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusPhone = focus([pm.white, pm.ss], 0x17a398);
  const focusOsat = focus([om.white, om.ss], 0xd96c2b);
  const focusFab = focus([fm.white, fm.ss], 0x3a64d8);
  const focusYard = focus([yd.tank, yd.cabinet], 0x1e9e76);
  const floorPhone = focus([baseMats.esdFloor], 0x17a398);
  const floorOsat = focus([baseMats.osatFloor], 0xd96c2b);
  const floorFab = focus([baseMats.cleanFloor], 0x3a64d8);

  const C = putter(campusG),
    Pn = putter(phoneG),
    O = putter(osatG),
    F = putter(fabG),
    Y = putter(fabG);

  // ============================================================ PLINTH + GROUND
  {
    const rr = new THREE.Shape();
    const x0 = -PX,
      x1 = PX,
      z0 = -PZ,
      z1 = PZ;
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
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    mesh(campusG, lip, baseMats.lip);
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Group; bucket: string };
  const peels: Record<string, Peel[]> = { phone: [], osat: [], fab: [] };
  const capMat = std(0x343c45, 0.3, 0.6);
  const makePeel = (key: "phone" | "osat" | "fab", b: Box, map: T.Texture, roofBucket: string, skip = "") => {
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
    peels[key].push({ b, plane, roof, cap, bucket: roofBucket });
    const R = roofMats(roofBucket);
    const P = putter(roof);
    P(R.mem, uvScale(bb(b.x0, b.x1, b.h - 0.03, b.h, b.z0, b.z1), b.x1 - b.x0, b.z1 - b.z0));
    const pt = 0.025,
      ph = 0.05;
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(R.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(R.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    return { P, R, plane };
  };
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55) => std(color, metal, rough, { clippingPlanes: [plane], side: DS });

  // ---- Wafer fab: tall cleanroom block, louvred mechanical floor, rooftop air handlers + scrubbers.
  {
    const { P, R, plane } = makePeel("fab", FAB, fabTex, "roofFab");
    const H = FAB.h;
    // Make-up air handlers (rows) with fan discs.
    for (let i = 0; i < 4; i++) {
      const z = -2.45 + i * 0.62;
      P(R.unit, rb(1.5, 0.12, 0.36, 0.02, -2.85, H, z));
      for (let k = 0; k < 4; k++) P(R.dark, cyl(0.06, 0.012, -3.4 + k * 0.36, H + 0.12, z, 18));
    }
    // Scrubber / exhaust stacks along the east edge.
    for (let i = 0; i < 4; i++) {
      const z = -2.55 + i * 0.75;
      P(R.ss, cyl(0.05, 0.32, -1.85, H, z, 16));
      P(R.dark, cyl(0.055, 0.02, -1.85, H + 0.32, z, 16));
      P(R.unit, rb(0.14, 0.1, 0.14, 0.015, -1.85, H, z + 0.18));
    }
    P(R.accent, bb(FAB.x0 + 0.05, FAB.x1 - 0.05, H, H + 0.012, -0.08, -0.02));
    // Glazed entrance + canopy on the south face, gowning annex.
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    put(campusG, glassM, bb(-2.9, -2.2, 0, 0.38, FAB.z1 + 0.002, FAB.z1 + 0.012));
    put(campusG, whiteM, bb(-3.0, -2.1, 0.38, 0.41, FAB.z1, FAB.z1 + 0.2));
    for (const x of [-2.96, -2.14]) put(campusG, whiteM, cyl(0.01, 0.38, x, 0, FAB.z1 + 0.18, 8));
  }
  // ---- OSAT / ATMP plant.
  {
    const { P, R, plane } = makePeel("osat", OSAT, osatTex, "roofOsat");
    const H = OSAT.h;
    for (let i = 0; i < 3; i++) {
      const x = -0.4 + i * 0.75;
      P(R.unit, rb(0.5, 0.12, 0.26, 0.02, x, H, -2.5));
      for (const dx of [-0.13, 0.13]) P(R.dark, cyl(0.05, 0.012, x + dx, H + 0.12, -2.5, 16));
    }
    // Rooftop solar on the south half.
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 4; k++) {
        const g = new THREE.BoxGeometry(0.5, 0.008, 0.16).rotateX(-0.35).translate(-0.5 + k * 0.6, H + 0.06, -1.95 + r * 0.26);
        P(R.solar, g);
      }
    for (const x of [1.45, 1.75]) P(R.ss, cyl(0.035, 0.22, x, H, -2.6, 14));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    const canM = clipMat(0x9aa4ad, plane, 0.5, 0.45);
    for (const x of [-0.3, 0.2]) {
      put(campusG, doorM, bb(x - 0.12, x + 0.12, 0, 0.24, OSAT.z1 + 0.002, OSAT.z1 + 0.012));
      put(campusG, canM, bb(x - 0.15, x + 0.15, 0.28, 0.3, OSAT.z1, OSAT.z1 + 0.14));
    }
  }
  // ---- Phone assembly plant.
  {
    const { P, R, plane } = makePeel("phone", PHN, phnTex, "roofPhone");
    const H = PHN.h;
    for (let i = 0; i < 5; i++) {
      const x = -0.45 + i * 0.85;
      P(R.unit, rb(0.42, 0.12, 0.24, 0.02, x, H, 0.25));
      for (const dx of [-0.11, 0.11]) P(R.dark, cyl(0.05, 0.012, x + dx, H + 0.12, 0.25, 16));
    }
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 6; k++) {
        const g = new THREE.BoxGeometry(0.55, 0.008, 0.16).rotateX(-0.35).translate(-0.35 + k * 0.66, H + 0.06, 0.85 + r * 0.28);
        P(R.solar, g);
      }
    // Glazed lobby + canopy on the south face (towards the plaza), dock doors on the east face.
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    put(campusG, glassM, bb(1.2, 1.9, 0, 0.36, PHN.z1 + 0.002, PHN.z1 + 0.012));
    put(campusG, whiteM, bb(1.1, 2.0, 0.36, 0.39, PHN.z1, PHN.z1 + 0.22));
    for (const x of [1.14, 1.96]) put(campusG, whiteM, cyl(0.01, 0.36, x, 0, PHN.z1 + 0.2, 8));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    for (const z of [0.15, 0.6, 1.05]) put(campusG, doorM, bb(PHN.x1 + 0.002, PHN.x1 + 0.012, 0, 0.24, z - 0.13, z + 0.13));
  }

  // ============================================================ CONTEXT (layer 0)
  // ---- Export warehouse with dock shelters.
  {
    const b = WH;
    const g = uvBox(b.x1 - b.x0, b.h, b.z1 - b.z0);
    mesh(campusG, g, [cm.whWall, cm.whWall, cm.roof, cm.soffit, cm.whWall, cm.whWall], [(b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2]);
    for (const [a0, a1, c0, c1] of [
      [b.x0, b.x1, b.z1 - 0.025, b.z1],
      [b.x0, b.x1, b.z0, b.z0 + 0.025],
      [b.x0, b.x0 + 0.025, b.z0, b.z1],
      [b.x1 - 0.025, b.x1, b.z0, b.z1],
    ])
      C(cm.white, bb(a0, a1, b.h, b.h + 0.05, c0, c1));
    for (const x of [2.92, 3.37, 3.82, 4.27]) {
      C(cm.dark, bb(x - 0.14, x + 0.14, 0, 0.3, b.z1, b.z1 + 0.05));
      C(cm.grey, bb(x - 0.11, x + 0.11, 0.02, 0.26, b.z1 + 0.05, b.z1 + 0.052));
    }
    C(cm.white, bb(b.x0 + 0.1, b.x1 - 0.1, 0.34, 0.37, b.z1, b.z1 + 0.28));
    for (let i = 0; i < 4; i++) C(cm.grey, rb(0.36, 0.07, 0.18, 0.015, 2.9 + i * 0.5, b.h, -2.45));
  }
  // ---- Utility strip: cooling towers, ultra-pure-water (UPW) plant, chillers, substation.
  {
    // Cooling-tower cells.
    for (let i = 0; i < 4; i++) {
      const x = -2.0 - i * 0.36;
      C(cm.ct, rb(0.32, 0.22, 0.4, 0.015, x, 0, 1.02));
      C(cm.fan, cyl(0.11, 0.06, x, 0.22, 1.02, 20, 0.125));
      C(cm.dark, cyl(0.1, 0.005, x, 0.278, 1.02, 20));
    }
    // UPW plant: RO skids + polished-water tanks.
    for (const x of [-3.6, -3.82, -4.04]) C(cm.upw, tankGeo(0.09, 0.36, x, 0, 0.92, 0.4));
    C(cm.blueSkid, rb(0.5, 0.08, 0.16, 0.012, -3.82, 0, 1.18));
    for (let i = 0; i < 5; i++) C(cm.upw, cylX(0.018, 0.44, -3.82, 0.1, 1.13 + i * 0.022, 10));
    // Substation: transformers on gravel, gantry.
    C(cm.gravel, bb(-4.85, -4.3, 0, 0.01, 0.75, 1.3));
    for (const z of [0.88, 1.15]) {
      C(cm.xfmr, rb(0.16, 0.14, 0.12, 0.01, -4.6, 0.01, z));
      for (let k = 0; k < 3; k++) C(cm.white, cyl(0.008, 0.07, -4.64 + k * 0.04, 0.15, z, 6));
    }
    for (const x of [-4.8, -4.38]) C(cm.pole, bx(0.015, 0.36, 0.015, x, 0, 1.02));
    C(cm.pole, bb(-4.82, -4.36, 0.34, 0.355, 1.01, 1.03));
    // Pipe bridge from the utility strip to the fab (UPW + chilled water).
    for (const [dz, m] of [
      [0, cm.upw],
      [0.03, cm.blueSkid],
    ] as [number, T.Material][])
      C(m, tube(THREE, [[-3.4, 0.1, 0.95 + dz], [-3.4, 0.42, 0.95 + dz], [-3.4, 0.42, FAB.z1 + 0.05], [-3.4, 0.3, FAB.z1 + 0.01]], 0.012, 8));
    C(cm.pole, bb(-3.44, -3.36, 0, 0.4, 0.62, 0.64));
  }
  // ---- Phone store + billboard on the boulevard.
  {
    const b = ST;
    const PCX = (b.x0 + b.x1) / 2;
    C(cm.storeWall, bb(b.x0, b.x1, 0, b.h, b.z0, b.z1 - 0.06));
    C(cm.shopGlass, bb(b.x0 + 0.02, b.x1 - 0.02, 0, b.h - 0.04, b.z1 - 0.06, b.z1));
    for (let x = b.x0 + 0.02; x <= b.x1 - 0.01; x += 0.16) C(cm.white, bb(x - 0.005, x + 0.005, 0, b.h - 0.04, b.z1 - 0.004, b.z1 + 0.004));
    C(cm.white, bb(b.x0 - 0.02, b.x1 + 0.02, b.h - 0.04, b.h + 0.02, b.z0 - 0.02, b.z1 + 0.04));
    // Display tables with phones.
    for (const x of [-0.3, 0, 0.3]) {
      C(cm.white, bx(0.18, 0.06, 0.1, PCX + x, 0, b.z1 - 0.18));
      for (const dx of [-0.05, 0, 0.05]) C(cm.shopItems, bx(0.02, 0.004, 0.04, PCX + x + dx, 0.06, b.z1 - 0.18));
    }
    // Rooftop billboard.
    for (const x of [PCX - 0.32, PCX + 0.32]) C(cm.pole, bx(0.02, 0.18, 0.02, x, b.h + 0.02, 2.4));
    C(cm.dark, bx(0.82, 0.42, 0.03, PCX, b.h + 0.16, 2.4));
    mesh(campusG, new THREE.PlaneGeometry(0.78, 0.38).translate(PCX, b.h + 0.37, 2.416), cm.board);
  }
  // ---- Chip-design centre: glass block, three floors, green roof, rooftop pavilion.
  {
    const w = DES.x1 - DES.x0,
      d = DES.z1 - DES.z0,
      cx = (DES.x0 + DES.x1) / 2,
      cz = (DES.z0 + DES.z1) / 2;
    const g = uvBox(w, DES.h, d);
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.8);
    desTex.repeat.set(1, 1);
    mesh(campusG, g, [cm.desGlass, cm.desGlass, cm.greenRoof, cm.soffit, cm.desGlass, cm.desGlass], [cx, DES.h / 2, cz]);
    for (let f = 0; f <= 3; f++) C(cm.slab, rb(w + 0.04, 0.025, d + 0.04, 0.01, cx, (f * DES.h) / 3 - (f === 0 ? 0 : 0.012), cz));
    // Roof pavilion + PV.
    C(cm.slab, rb(0.6, 0.14, 0.4, 0.03, cx - 0.4, DES.h + 0.01, cz - 0.1));
    for (let i = 0; i < 3; i++) {
      const gg = new THREE.BoxGeometry(0.22, 0.008, 0.5).rotateZ(0.25).translate(cx + 0.25 + i * 0.26, DES.h + 0.12, cz);
      C(cm.solar, gg);
      for (const dz of [-0.18, 0.18]) C(cm.grey, bx(0.01, 0.1, 0.01, cx + 0.25 + i * 0.26, DES.h + 0.01, cz + dz));
    }
    C(cm.slab, bb(cx - 0.3, cx + 0.3, 0.23, 0.25, DES.z1, DES.z1 + 0.22));
    for (const dx of [-0.27, 0.27]) C(cm.grey, cyl(0.008, 0.23, cx + dx, 0, DES.z1 + 0.2, 8));
  }
  // ---- Trucks and containers.
  const truck = (P: Put, cab: T.Material, cont: T.Material) => {
    // Local: +x forward, container rear at x = -0.52.
    P(cm.dark, bx(0.6, 0.025, 0.08, -0.22, 0.032, 0));
    P(cont, bx(0.46, 0.15, 0.12, -0.29, 0.058, 0));
    P(cm.contRib, bx(0.462, 0.13, 0.122, -0.29, 0.068, 0));
    P(cab, rb(0.12, 0.12, 0.12, 0.02, 0.06, 0.036, 0));
    P(cm.carGlass, bx(0.006, 0.045, 0.1, 0.121, 0.11, 0));
    for (const x of [-0.46, -0.4, 0.0, 0.08]) for (const z of [-0.052, 0.052]) P(cm.tyre, cylZ(0.024, 0.022, x, 0.024, z, 12));
  };
  truck(place(C, 2.92, 0, WH.z1 + 0.54, -Math.PI / 2), cm.cabBlue, cm.cont[0]);
  truck(place(C, 3.82, 0, WH.z1 + 0.54, -Math.PI / 2), cm.cabRed, cm.cont[1]);
  truck(place(C, 4.27, 0, WH.z1 + 0.54, -Math.PI / 2), cm.cabBlue, cm.cont[3]);
  truck(place(C, 1.0, 0, 3.03), cm.cabBlue, cm.cont[2]);
  truck(place(C, -2.6, 0, 3.21, Math.PI), cm.cabRed, cm.cont[0]);
  truck(place(C, 4.25, 0, 1.6, Math.PI / 2), cm.cabRed, cm.cont[4]);
  // Container stacks at the phone plant's dock (export).
  {
    let k = 0;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 3; j++)
        for (let l = 0; l < (j === 2 ? 1 : 2); l++) {
          const x = CY.x0 + 0.2 + i * 0.4,
            z = CY.z0 + 0.2 + j * 0.38,
            y = l * 0.13;
          const m = cm.cont[k++ % cm.cont.length];
          C(m, bx(0.38, 0.125, 0.15, x, y, z));
          C(cm.contRib, bx(0.382, 0.11, 0.152, x, y + 0.008, z));
        }
    // Reach stacker.
    const Q = place(C, 4.62, 0, 0.55, Math.PI);
    Q(cm.teal, rb(0.18, 0.08, 0.1, 0.015, 0, 0.02, 0));
    Q(cm.dark, bx(0.05, 0.06, 0.08, 0.05, 0.1, 0));
    Q(cm.grey, bar(THREE, [-0.06, 0.08, 0], [-0.22, 0.32, 0], 0.012, 6));
    for (const x of [-0.06, 0.06]) for (const z of [-0.05, 0.05]) Q(cm.tyre, cylZ(0.026, 0.02, x, 0.026, z, 10));
  }

  // ============================================================ GAS & CHEMICALS YARD (fab layer)
  {
    // Bulk cryogenic tanks (N2, O2, Ar) - the gas yard's landmark.
    for (const [z, h] of [
      [-2.35, 0.62],
      [-1.7, 0.7],
      [-1.05, 0.62],
    ] as [number, number][]) {
      Y(yd.tank, tankGeo(0.13, h, -4.6, 0.02, z, 0.35));
      for (const dx of [-0.08, 0.08]) Y(yd.steel, bx(0.02, 0.04, 0.02, -4.6 + dx, 0, z));
      Y(yd.pipeGrey, bar(THREE, [-4.47, 0.1, z], [-4.25, 0.1, z], 0.012, 6));
      // Ambient vaporiser fins.
      for (let k = 0; k < 4; k++) Y(yd.ss, bx(0.012, 0.3, 0.07, -4.36 + k * 0.03, 0.02, z + 0.18));
    }
    // Specialty-gas cabinets (silane, NF3, WF6...) in a bunker row.
    for (let i = 0; i < 6; i++) {
      const z = -0.55 + i * 0.12;
      Y(yd.cabinet, rb(0.14, 0.22, 0.1, 0.01, -4.55, 0.01, z));
      Y(yd.dark, bx(0.01, 0.05, 0.06, -4.48, 0.15, z));
    }
    Y(yd.yellow, bb(-4.66, -4.4, 0.24, 0.255, -0.62, 0.17));
    // Chemical day tanks (acids / solvents) in a bund + H2 tube trailer.
    Y(yd.bund, bb(-4.4, -4.22, 0, 0.05, -2.8, -2.55));
    for (const z of [-2.75, -2.6]) Y(yd.tank, hTank(0.05, 0.14, -4.31, 0.1, z));
    {
      const Q = place(Y, -4.35, 0, 0.1, Math.PI / 2);
      Q(yd.steel, bx(0.42, 0.02, 0.11, 0, 0.03, 0));
      for (const dz of [-0.03, 0.03]) for (const dy of [0.075, 0.13]) Q(yd.ss, cylX(0.028, 0.4, 0, dy, dz, 12));
      for (const x of [-0.15, -0.09, 0.15]) for (const z of [-0.05, 0.05]) Q(yd.tyre, cylZ(0.022, 0.018, x, 0.022, z, 10));
    }
    // Pipe rack into the fab's west wall.
    const rackZ = [-2.2, -1.4, -0.6];
    for (const z of rackZ) {
      Y(yd.steel, bx(0.02, 0.5, 0.02, -4.18, 0, z));
      Y(yd.steel, bb(-4.2, -4.05, 0.48, 0.5, z - 0.01, z + 0.01));
    }
    [yd.pipeGrey, yd.pipeBlue, yd.pipeGreen, yd.pipeRed].forEach((m, i) =>
      Y(m, new THREE.CylinderGeometry(0.011, 0.011, 1.85, 8).rotateX(Math.PI / 2).translate(-4.13, 0.515, -1.4 + 0.0 * i).translate(i * 0.03 - 0.045, 0, 0))
    );
  }

  // ============================================================ LANDSCAPING
  {
    const rnd = mulberry(42);
    const solid: [number, number, number, number][] = [FAB, OSAT, PHN, WH, ST, DES, GY, UT, CY].map((b) => [b.x0 - 0.16, b.x1 + 0.16, b.z0 - 0.16, b.z1 + 0.16]);
    solid.push([-0.95, 0.7, 1.9, 2.95]); // car park
    solid.push([2.35, 4.75, -1.75, -0.75]); // truck court
    solid.push([0.8, 2.4, 1.85, 2.95]); // plaza
    solid.push([3.7, 4.75, 1.3, 1.95]); // truck at dock
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
    const free = (x: number, z: number) => inPlinth(x, z) && !onRoad(x, z) && !solid.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
    const trees: [number, number, number][] = [];
    const ok = (x: number, z: number, sp: number) => trees.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > sp);
    for (let x = -4.7; x <= 4.7; x += 0.42) {
      if (free(x, 3.45)) trees.push([x, 3.45, 0.85 + rnd() * 0.25]);
      if (free(x + 0.2, 2.82) && Math.abs(x + 0.2 - 1.55) > 0.3) trees.push([x + 0.2, 2.82, 0.75 + rnd() * 0.25]);
    }
    for (let i = 0; i < 900 && trees.length < 130; i++) {
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
    for (const [x0, x1] of [
      [-4.62, -3.7],
      [-3.4, -1.45],
      [-1.05, 1.42],
      [1.7, 2.35],
      [3.65, 4.6],
    ])
      C(cm.hedge, rb(x1 - x0, 0.05, 0.06, 0.02, (x0 + x1) / 2, 0, 2.92));

    // Cars: car park + boulevard.
    const cars: [number, number, number][] = [];
    for (let x = -0.8; x < 0.6; x += 0.12) {
      if (rnd() > 0.2) cars.push([x, 2.14, Math.PI / 2]);
      if (rnd() > 0.35) cars.push([x, 2.7, -Math.PI / 2]);
    }
    cars.push([2.6, 3.21, Math.PI], [-4.2, 3.03, 0], [4.85, 0.4, Math.PI / 2], [-1.25, -1.9, -Math.PI / 2]);
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
    for (let x = -4.4; x <= 4.6; x += 0.9)
      for (const z of [2.9, 3.34]) {
        const dir = z < 3 ? 1 : -1;
        C(cm.pole, cyl(0.007, 0.32, x, 0, z, 6));
        C(cm.pole, bb(x - 0.004, x + 0.004, 0.31, 0.318, z, z + dir * 0.07));
        C(cm.lamp, bx(0.03, 0.008, 0.02, x, 0.305, z + dir * 0.07));
      }
  }

  // ============================================================ FLOORS (base bucket)
  {
    const floor = (b: { x0: number; x1: number; z0: number; z1: number }, m: T.Material) =>
      mesh(campusG, uvScale(bb(b.x0 + 0.005, b.x1 - 0.005, 0, FLOOR, b.z0 + 0.005, b.z1 - 0.005), (b.x1 - b.x0) / 3, (b.z1 - b.z0) / 3), m);
    floor(FAB, baseMats.cleanFloor);
    floor(OSAT, baseMats.osatFloor);
    floor(PHN, baseMats.esdFloor);
    mesh(campusG, bb(PHN.x0 + 0.05, PHN.x1 - 0.05, FLOOR, FLOOR + 0.002, 0.93, 0.99), baseMats.walkway);
    mesh(campusG, bb(OSAT.x0 + 0.05, 0.98, FLOOR, FLOOR + 0.002, -1.63, -1.58), baseMats.walkway);
  }

  // ============================================================ COMMON EQUIPMENT
  const signal = (P: Put, M: EqM, x: number, y: number, z: number) => {
    P(M.dark, cyl(0.005, 0.03, x, y, z, 6));
    P(M.greenLed, cyl(0.007, 0.012, x, y + 0.03, z, 8));
    P(M.amberLed, cyl(0.007, 0.01, x, y + 0.042, z, 8));
  };
  /** Low partition: solid dado + vision glazing (axis-aligned). */
  const partition = (P: Put, M: EqM, x0: number, z0: number, x1: number, z1: number, h = 0.14, gh = 0.14, glassM?: T.Material) => {
    const t = 0.012;
    const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const a0 = ax ? Math.min(x0, x1) : Math.min(z0, z1),
      a1 = ax ? Math.max(x0, x1) : Math.max(z0, z1);
    const f = (lo: number, hi: number, m: T.Material, y0: number, y1: number) =>
      P(m, ax ? bb(lo, hi, y0, y1, z0 - t / 2, z0 + t / 2) : bb(x0 - t / 2, x0 + t / 2, y0, y1, lo, hi));
    f(a0, a1, M.wall, FLOOR, FLOOR + h);
    f(a0, a1, M.wallBase, FLOOR, FLOOR + 0.02);
    f(a0, a1, glassM ?? M.wallGlass, FLOOR + h, FLOOR + h + gh);
    f(a0, a1, M.grey, FLOOR + h + gh, FLOOR + h + gh + 0.008);
  };
  /** Instanced people: [x, z, ry]; bunny suits in the fab, smocks elsewhere. */
  const people = (parent: T.Object3D, M: EqM, spots: [number, number][], suit: T.Material) => {
    const bodyGeo = new THREE.CapsuleGeometry(0.013, 0.034, 4, 8).translate(0, FLOOR + 0.03, 0);
    const headGeo = new THREE.SphereGeometry(0.011, 10, 8).translate(0, FLOOR + 0.072, 0);
    const bi = new THREE.InstancedMesh(bodyGeo, suit, spots.length);
    const hi = new THREE.InstancedMesh(headGeo, suit === M.bunny ? M.bunny : M.skin, spots.length);
    const o = new THREE.Object3D();
    spots.forEach(([x, z], i) => {
      o.position.set(x, 0, z);
      o.updateMatrix();
      bi.setMatrixAt(i, o.matrix);
      hi.setMatrixAt(i, o.matrix);
    });
    parent.add(bi, hi);
  };

  // ============================================================ LAYER 1 - PHONE ASSEMBLY PLANT
  {
    const P = Pn,
      M = pm;
    // ---- PCBA: two SMT lines along X (west end).
    const smt = (z: number) => {
      const y = FLOOR;
      // Conveyor rails along the whole line.
      P(M.steel, bb(-0.78, 0.86, y + 0.07, y + 0.08, z - 0.035, z - 0.025));
      P(M.steel, bb(-0.78, 0.86, y + 0.07, y + 0.08, z + 0.025, z + 0.035));
      // Loader / stencil printer / SPI.
      P(M.grey, rb(0.1, 0.12, 0.14, 0.01, -0.72, y, z));
      P(M.white, rb(0.14, 0.13, 0.16, 0.012, -0.56, y, z));
      P(M.screen, bx(0.05, 0.03, 0.004, -0.56, y + 0.08, z + 0.081));
      // Three pick-and-place modules with glass hoods + feeder banks.
      for (let k = 0; k < 3; k++) {
        const x = -0.36 + k * 0.17;
        P(M.white, rb(0.15, 0.11, 0.2, 0.012, x, y, z));
        P(M.glass, rb(0.13, 0.05, 0.16, 0.02, x, y + 0.11, z));
        P(M.dark, bx(0.12, 0.012, 0.03, x, y + 0.115, z));
        for (const s of [-1, 1]) P(M.teal, bx(0.13, 0.05, 0.025, x, y + 0.04, z + s * 0.115));
      }
      // Reflow oven with glowing vents.
      P(M.ss, rb(0.36, 0.1, 0.16, 0.012, 0.27, y, z));
      for (let k = 0; k < 6; k++) P(M.hot, bx(0.035, 0.006, 0.1, 0.13 + k * 0.055, y + 0.1, z));
      P(M.dark, bx(0.36, 0.012, 0.165, 0.27, y + 0.03, z));
      // AOI + unloader.
      P(M.white, rb(0.1, 0.12, 0.14, 0.01, 0.55, y, z));
      P(M.screen, bx(0.04, 0.03, 0.004, 0.55, y + 0.08, z + 0.071));
      P(M.grey, rb(0.1, 0.13, 0.14, 0.01, 0.72, y, z));
      signal(P, M, 0.55, y + 0.12, z - 0.05);
      signal(P, M, -0.56, y + 0.13, z - 0.05);
    };
    smt(0.0);
    smt(0.42);
    // ---- Sub-assembly supermarket: flow racks of batteries, chargers, casings, display modules.
    {
      const binGeo = roundedBox(THREE, 0.05, 0.025, 0.06, 0.005, 1);
      const spots: [number, number, number, number][] = [];
      for (let r = 0; r < 4; r++) {
        const x = -0.66 + r * 0.38;
        for (const z of [0.72, 1.28]) {
          // Rack frame: 3 sloped shelves.
          P(M.steel, bx(0.3, 0.008, 0.012, x, FLOOR, z - 0.08));
          for (const dx of [-0.15, 0.15]) for (const dz of [-0.08, 0.08]) P(M.steel, bx(0.012, 0.2, 0.012, x + dx, FLOOR, z + dz));
          for (let s = 0; s < 3; s++) {
            const y = FLOOR + 0.035 + s * 0.06;
            P(M.yellow, new THREE.BoxGeometry(0.3, 0.006, 0.17).rotateX(0.12).translate(x, y, z));
            for (let k = 0; k < 5; k++) spots.push([x - 0.12 + k * 0.06, y + 0.01, z, (r + s) % 4]);
          }
        }
      }
      const bi = new THREE.InstancedMesh(binGeo, M.white, spots.length);
      const o = new THREE.Object3D();
      const col = new THREE.Color();
      const binCols = [0x2b62c4, 0x1aa395, 0x2b3137, 0xe2b33a];
      spots.forEach(([x, y, z, c], i) => {
        o.position.set(x, y + 0.0125, z);
        o.rotation.set(0.12, 0, 0);
        o.updateMatrix();
        bi.setMatrixAt(i, o.matrix);
        col.setHex(binCols[c]);
        bi.setColorAt(i, col);
      });
      phoneG.add(bi);
      // Battery-pack and charger cells (small benches with operators).
      for (const x of [-0.5, 0.3]) {
        P(M.white, bx(0.26, 0.06, 0.1, x, FLOOR, 1.0));
        P(M.dark, bx(0.24, 0.004, 0.08, x, FLOOR + 0.06, 1.0));
      }
      partition(P, M, 0.92, -0.25, 0.92, 1.7);
    }
    // ---- Final assembly: three conveyors with workstations both sides, test + pack at the east end.
    const lineZ = [0.12, 0.66, 1.2];
    const phoneSpots: [number, number, number][] = [];
    const personSpots: [number, number][] = [];
    for (const z of lineZ) {
      const xa = 1.05,
        xb = 2.75;
      const y = FLOOR + 0.07;
      P(M.steel, bb(xa, xb, FLOOR + 0.03, y - 0.004, z - 0.04, z + 0.04));
      P(M.belt, bb(xa, xb, y - 0.004, y, z - 0.035, z + 0.035));
      for (let x = xa + 0.05; x < xb; x += 0.25) for (const s of [-1, 1]) P(M.steel, bx(0.012, 0.035, 0.012, x, FLOOR, z + s * 0.035));
      for (let x = xa + 0.06; x < xb - 0.02; x += 0.085) phoneSpots.push([x, y, z]);
      for (let x = xa + 0.12; x < xb - 0.05; x += 0.21)
        for (const s of [-1, 1]) {
          P(M.white, bx(0.11, 0.055, 0.06, x, FLOOR, z + s * 0.085));
          P(M.blue, bx(0.11, 0.004, 0.06, x, FLOOR + 0.055, z + s * 0.085));
          P(M.screen, bx(0.035, 0.025, 0.004, x, FLOOR + 0.06, z + s * 0.112));
          personSpots.push([x, z + s * 0.15]);
        }
      // Test cells: RF-shield boxes, two high.
      for (let k = 0; k < 3; k++)
        for (let l = 0; l < 2; l++) {
          P(M.ss, rb(0.07, 0.06, 0.08, 0.008, 2.85 + k * 0.08, FLOOR + 0.04 + l * 0.065, z));
          P(M.greenLed, bx(0.008, 0.008, 0.004, 2.85 + k * 0.08 + 0.02, FLOOR + 0.07 + l * 0.065, z + 0.042));
        }
      P(M.steel, bb(2.81, 3.1, FLOOR, FLOOR + 0.04, z - 0.045, z + 0.045));
    }
    // Pack-out: pallets of boxed phones.
    for (const z of [0.1, 0.55, 1.0, 1.45]) {
      const x = 3.32;
      P(M.wood, bx(0.13, 0.014, 0.13, x, FLOOR, z));
      for (let l = 0; l < 3; l++) for (const dx of [-0.03, 0.03]) for (const dz of [-0.03, 0.03]) P(l === 2 ? M.brown : M.carton, bx(0.055, 0.036, 0.055, x + dx, FLOOR + 0.014 + l * 0.037, z + dz));
    }
    signal(P, M, 3.12, FLOOR + 0.04, 1.55);
    // Phones on the belts: dark bodies + lit screens.
    {
      const bodyGeo = roundedBox(THREE, 0.03, 0.006, 0.058, 0.004, 1);
      const scrGeo = new THREE.PlaneGeometry(0.026, 0.052).rotateX(-Math.PI / 2);
      const pb = new THREE.InstancedMesh(bodyGeo, M.black, phoneSpots.length);
      const ps = new THREE.InstancedMesh(scrGeo, M.screen, phoneSpots.length);
      const o = new THREE.Object3D();
      phoneSpots.forEach(([x, y, z], i) => {
        o.position.set(x, y + 0.003, z);
        o.updateMatrix();
        pb.setMatrixAt(i, o.matrix);
        o.position.y = y + 0.0065;
        o.updateMatrix();
        ps.setMatrixAt(i, o.matrix);
      });
      phoneG.add(pb, ps);
    }
    personSpots.push([-0.5, 1.1], [0.3, 1.1], [-0.2, 0.21], [0.4, 0.21], [3.2, 0.8]);
    people(phoneG, M, personSpots, M.smock);
  }

  // ============================================================ LAYER 2 - OSAT / ATMP
  {
    const P = O,
      M = om;
    const y = FLOOR;
    // Wafer saws (dicing) + wafer-mount: back-left row.
    for (let k = 0; k < 4; k++) {
      const x = -0.65 + k * 0.17;
      P(M.white, rb(0.14, 0.13, 0.16, 0.012, x, y, -2.72));
      P(M.glass, rb(0.12, 0.04, 0.12, 0.015, x, y + 0.13, -2.72));
      P(M.wafer, cyl(0.035, 0.004, x, y + 0.132, -2.72, 24));
      P(M.screen, bx(0.04, 0.03, 0.004, x, y + 0.08, -2.638));
    }
    // Molding presses: back-right row.
    for (let k = 0; k < 3; k++) {
      const x = 0.1 + k * 0.27;
      P(M.grey, rb(0.22, 0.06, 0.18, 0.012, x, y, -2.72));
      for (const dx of [-0.08, 0.08]) for (const dz of [-0.06, 0.06]) P(M.ss, cyl(0.012, 0.14, x + dx, y + 0.06, -2.72 + dz, 10));
      P(M.dark, bx(0.2, 0.03, 0.16, x, y + 0.2, -2.72));
      P(M.orange, bx(0.2, 0.012, 0.16, x, y + 0.11, -2.72));
      signal(P, M, x + 0.1, y + 0.06, -2.62);
    }
    // Die-attach + wire bonders: instanced grid.
    {
      const spots: [number, number][] = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) spots.push([-0.66 + c * 0.17, -2.38 + r * 0.17]);
      const bodyGeo = roundedBox(THREE, 0.1, 0.1, 0.09, 0.01, 1).translate(0, y + 0.05, 0);
      const headGeo = mergeInto(THREE, [new THREE.BoxGeometry(0.06, 0.03, 0.05).translate(0, y + 0.115, -0.01), new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6).translate(0.0, y + 0.09, 0.012)]);
      const ledGeo = new THREE.BoxGeometry(0.01, 0.01, 0.004).translate(0.035, y + 0.07, 0.046);
      const a = new THREE.InstancedMesh(bodyGeo, M.white, spots.length);
      const b = new THREE.InstancedMesh(headGeo, M.dark, spots.length);
      const c = new THREE.InstancedMesh(ledGeo, M.amberLed, spots.length);
      const o = new THREE.Object3D();
      spots.forEach(([x, z], i) => {
        o.position.set(x, 0, z);
        o.updateMatrix();
        a.setMatrixAt(i, o.matrix);
        b.setMatrixAt(i, o.matrix);
        c.setMatrixAt(i, o.matrix);
      });
      osatG.add(a, b, c);
      // Magazine carts between rows.
      for (let r = 0; r < 3; r++) P(M.steel, bb(-0.7, 0.75, y + 0.005, y + 0.012, -2.305 + r * 0.17, -2.295 + r * 0.17));
    }
    // Test handlers + burn-in racks (front row).
    for (let k = 0; k < 4; k++) {
      const x = -0.62 + k * 0.2;
      P(M.white, rb(0.16, 0.12, 0.14, 0.012, x, y, -1.3));
      P(M.blue, bx(0.16, 0.02, 0.14, x, y + 0.12, -1.3));
      P(M.screen, bx(0.05, 0.035, 0.004, x, y + 0.07, -1.228));
    }
    for (let k = 0; k < 3; k++) {
      const x = 0.28 + k * 0.2;
      P(M.dark, bx(0.16, 0.3, 0.12, x, y, -1.28));
      for (let l = 0; l < 6; l++) P(l % 2 ? M.greenLed : M.amberLed, bx(0.13, 0.006, 0.004, x, y + 0.04 + l * 0.04, -1.218));
    }
    // ---- Compound-semiconductor + advanced-packaging suite (east end, walled).
    P(M.suiteFloor, bb(1.03, 1.9, y, y + 0.003, -2.9, -1.06));
    partition(P, M, 1.02, -2.9, 1.02, -1.05, 0.16, 0.16);
    partition(P, M, 1.02, -1.05, 1.9, -1.05, 0.16, 0.16);
    // SiC epitaxy reactors (domed vessels) with gas boxes.
    for (let k = 0; k < 3; k++) {
      const x = 1.2 + k * 0.24;
      P(M.ss, tankGeo(0.06, 0.12, x, y + 0.05, -2.62, 0.7));
      P(M.white, rb(0.16, 0.05, 0.16, 0.01, x, y, -2.62));
      P(M.purple, bx(0.06, 0.16, 0.06, x + 0.07, y, -2.78));
      P(M.hot, ring(0.062, 0.006, x, y + 0.11, -2.62));
    }
    // Glass-panel substrate line: panels on racks + laser via drill.
    for (let k = 0; k < 6; k++) P(M.panel, bx(0.006, 0.16, 0.2, 1.15 + k * 0.035, y + 0.02, -1.95));
    P(M.steel, bb(1.12, 1.36, y, y + 0.02, -2.06, -1.84));
    P(M.white, rb(0.26, 0.14, 0.22, 0.012, 1.6, y, -1.95));
    P(M.glass, rb(0.22, 0.06, 0.18, 0.02, 1.6, y + 0.14, -1.95));
    P(M.sic, bx(0.16, 0.004, 0.16, 1.6, y + 0.145, -1.95));
    // Wafers in the SiC suite's stocker.
    P(M.white, rb(0.3, 0.1, 0.14, 0.01, 1.55, y, -1.35));
    for (let k = 0; k < 5; k++) P(M.sic, cyl(0.03, 0.004, 1.43 + k * 0.06, y + 0.1, -1.35, 20));
    people(osatG, M, [[-0.1, -2.55], [0.6, -2.55], [-0.4, -1.5], [0.15, -1.5], [1.3, -2.3], [1.75, -1.6]], M.bunny);
  }
  function ring(r: number, t: number, x: number, y: number, z: number) {
    return new THREE.TorusGeometry(r, t, 6, 24).rotateX(Math.PI / 2).translate(x, y, z);
  }

  // ============================================================ LAYER 3 - WAFER FAB
  {
    const P = F,
      M = fm;
    const y = FLOOR;
    // Lithography bay: amber-lit (photoresist is light-sensitive), walled off with amber glass.
    P(M.amberFloor, bb(-3.98, -2.32, y, y + 0.003, -2.8, -1.42));
    partition(P, M, -2.32, -2.8, -2.32, -1.42, 0.05, 0.2, M.amberGlass);
    partition(P, M, -3.98, -1.42, -2.32, -1.42, 0.05, 0.2, M.amberGlass);
    for (const z of [-2.42, -1.8]) {
      // Scanner: wafer-stage module + illuminator column + reticle handler.
      P(M.white, rb(0.62, 0.2, 0.32, 0.025, -3.3, y, z));
      P(M.grey, rb(0.2, 0.3, 0.26, 0.02, -3.72, y, z));
      P(M.dark, bx(0.62, 0.025, 0.322, -3.3, y + 0.15, z));
      P(M.blue, bx(0.622, 0.014, 0.324, -3.3, y + 0.1, z));
      P(M.screen, bx(0.07, 0.045, 0.004, -3.45, y + 0.04, z + 0.162));
      // Coater/developer track docked to the scanner.
      P(M.white, rb(0.5, 0.15, 0.24, 0.02, -2.72, y, z));
      P(M.amberGlass, bx(0.46, 0.06, 0.004, -2.72, y + 0.08, z + 0.121));
      for (let k = 0; k < 4; k++) P(M.dark, cyl(0.022, 0.006, -2.9 + k * 0.12, y + 0.15, z, 14));
      signal(P, M, -3.0, y + 0.2, z - 0.12);
    }
    // Etch / deposition cluster tools: dark hex transfer chamber, steel process chambers, front-end module + FOUPs.
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const x = -3.55 + i * 0.56,
          z = -0.98 + j * 0.62;
        P(M.dark, cyl(0.11, 0.09, x, y, z, 6));
        P(M.glass, cyl(0.1, 0.012, x, y + 0.09, z, 6));
        for (let k = 0; k < 4; k++) {
          const ang = Math.PI + (k - 1.5) * (Math.PI / 3);
          const cx = x + Math.cos(ang) * 0.17,
            cz = z - Math.sin(ang) * 0.17 - 0.0;
          P(M.chamber, rb(0.11, 0.12, 0.11, 0.015, cx, y, cz).rotateY(0));
          P(M.dark, cyl(0.04, 0.03, cx, y + 0.12, cz, 14));
          P(M.ss, cyl(0.012, 0.06, cx, y + 0.15, cz, 8));
        }
        // Front-end module (EFEM) with load ports and FOUPs on the +x side.
        P(M.white, rb(0.1, 0.13, 0.22, 0.012, x + 0.17, y, z));
        for (const dz of [-0.06, 0.06]) P(M.orange, rb(0.05, 0.045, 0.05, 0.008, x + 0.25, y + 0.07, z + dz));
        for (const dz of [-0.06, 0.06]) P(M.steel, bx(0.06, 0.07, 0.06, x + 0.25, y, z + dz));
      }
    // Diffusion furnaces (tall, with hot-zone windows) + wet benches along the east wall.
    for (let k = 0; k < 5; k++) {
      const z = -2.6 + k * 0.16;
      P(M.white, bx(0.13, 0.4, 0.14, -1.83, y, z));
      P(M.dark, bx(0.132, 0.05, 0.142, -1.83, y + 0.35, z));
      P(M.blue, bx(0.004, 0.25, 0.012, -1.896, y + 0.05, z + 0.05));
      P(M.hot, bx(0.004, 0.07, 0.07, -1.897, y + 0.22, z - 0.01));
    }
    for (let k = 0; k < 2; k++) {
      const z = -1.62 + k * 0.36;
      P(M.ss, rb(0.15, 0.11, 0.3, 0.01, -1.85, y, z));
      P(M.glass, bx(0.15, 0.09, 0.3, -1.85, y + 0.11, z));
      for (let q = 0; q < 3; q++) P(M.teal, bx(0.08, 0.004, 0.07, -1.85, y + 0.112, z - 0.09 + q * 0.09));
    }
    // FOUP stocker: open-front shelving facing the camera (south) + overhead transport loop with pods.
    P(M.white, bb(-2.42, -1.98, y, y + 0.58, -1.25, -1.17));
    for (const xe of [-2.42, -1.98]) P(M.white, bb(xe - 0.02, xe + 0.02, y, y + 0.58, -1.25, -0.98));
    P(M.white, bb(-2.44, -1.96, y + 0.58, y + 0.6, -1.25, -0.98));
    for (let l = 0; l < 5; l++) {
      P(M.steel, bb(-2.4, -2.0, y + 0.07 + l * 0.1, y + 0.08 + l * 0.1, -1.17, -1.0));
      for (let k = 0; k < 4; k++) P(M.orange, rb(0.07, 0.06, 0.08, 0.008, -2.34 + k * 0.1, y + 0.08 + l * 0.1, -1.08));
    }
    const RY = 0.62;
    const loop: Vec3[] = [
      [-3.85, RY, -2.75],
      [-2.05, RY, -2.75],
      [-2.05, RY, 0.15],
      [-3.85, RY, 0.15],
    ];
    for (let i = 0; i < 4; i++) {
      const a = loop[i],
        b = loop[(i + 1) % 4];
      P(M.ss, bar(THREE, a, b, 0.012, 6));
    }
    for (const [x, z] of [
      [-3.85, -2.75],
      [-2.05, -2.75],
      [-2.05, 0.15],
      [-3.85, 0.15],
      [-2.95, -2.75],
      [-2.95, 0.15],
      [-3.85, -1.3],
      [-2.05, -1.3],
    ])
      P(M.steel, bx(0.012, RY - y, 0.012, x, y, z));
    // OHT vehicles carrying FOUPs.
    for (const [x, z] of [
      [-3.4, -2.75],
      [-2.6, -2.75],
      [-2.05, -2.1],
      [-2.05, -0.3],
      [-3.0, 0.15],
      [-3.85, -0.6],
      [-3.85, -1.9],
    ]) {
      P(M.dark, bx(0.06, 0.03, 0.05, x, RY - 0.02, z));
      P(M.orange, rb(0.045, 0.04, 0.045, 0.006, x, RY - 0.065, z));
    }
    people(fabG, M, [[-2.9, -2.1], [-3.3, -1.3], [-2.75, -0.6], [-2.2, -1.5], [-3.6, 0.05]], M.bunny);
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
      peel(peels.phone, a);
      peel(peels.osat, b);
      peel(peels.fab, c);
      L.set("trees", lerp(1, 0.5, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("phoneEq", smoothstep(a, 0.15, 0.85) * lerp(1, 0.22, ease(b)));
      L.set("osatEq", smoothstep(b, 0.15, 0.85) * lerp(1, 0.22, ease(c)));
      L.set("fabEq", smoothstep(c, 0.15, 0.85));
      L.set("yard", lerp(lerp(1, 0.45, ease(a)), 1, ease(c)));
      // The opened building's equipment and floor light up in its system colour, so each
      // layer reads clearly from the overview camera, not just in its close-up view.
      focusPhone(tri(v, 1) * 0.22);
      focusOsat(tri(v, 2) * 0.22);
      focusFab(c * 0.16);
      focusYard(c * 0.14);
      floorPhone(tri(v, 1) * 0.35);
      floorOsat(tri(v, 2) * 0.35);
      floorFab(c * 0.3);
    },
  };
}
