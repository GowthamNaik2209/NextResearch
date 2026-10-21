// Rare-Earth Magnets (REPM): a miniature "mine to motor" site on a display plinth - the whole
// sintered NdFeB magnet chain the Rs 7,280 crore scheme is trying to build in India.
//
// Plan (+X east, +Z south/front; the overview camera looks in from the south, so the chain reads
// left -> right on screen):
//   · West: the coast. A beach-sand mine (dredge pond inside a terraced pit, wet concentrator
//     spirals, black-sand and monazite stockpiles) with the sea along the edge, and a hard-rock
//     rare-earth hill (carbonatite, Ambadungar-style) with mining benches behind it.
//   · Back-middle: the separation plant (cracking digesters, solvent-extraction mixer-settler
//     banks, precipitation and calcining) and the metal & alloy hall (molten-salt electrolysis
//     cells, strip-casting furnace).
//   · Front-middle: the sintered magnet plant (hydrogen decrepitation + jet mill, field press,
//     isostatic press, vacuum sintering furnaces, machining, coating, magnetiser) and the
//     magnet-recycling shed beside it.
//   · East: what the magnets go into - a cutaway EV traction motor, an e-scooter hub motor, a
//     missile on its launcher, and a direct-drive wind turbine.
//
// Layers (outside -> inside, product -> ground): 0 End Uses, 1 Magnet Plant (magnet plant and
// recycling shed walls section down, roofs lift), 2 Refining & Alloy (separation + alloy halls
// section down), 3 Mine & Minerals (the sand overburden and the hill's rock shell go glassy to
// show the black-sand ore layer and the carbonatite ore body). Buildings peel with a moving
// world-space clipping plane (as in pharma.ts) so walls never ghost-sort.
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
  liftingSurface,
  mergeInto,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// Site plan (shared by anchors and geometry). The plinth is kept close to square so the overview
// fills a portrait phone stage as well as the desktop one.
const MAG = { x0: -2.25, x1: 0.95, z0: 0.35, z1: 2.05, h: 0.72 };
const REC = { x0: 1.15, x1: 2.1, z0: 0.5, z1: 1.7, h: 0.55 };
const SEP = { x0: -2.25, x1: -0.35, z0: -2.95, z1: -1.25, h: 0.85 };
const ALY = { x0: -0.15, x1: 1.75, z0: -2.95, z1: -1.3, h: 0.9 };
const PIT = { x: -3.2, z: 1.45, sx: 0.65, sz: 0.9 };
const HILL = { x: -3.4, z: -2.2, k: 0.8 };
// End-use deck along the east edge: wind turbine at the back, then a fighter jet, an EV with its
// traction motor on a stand beside it, and an e-scooter at the front.
const WIND = { x: 3.4, z: -2.35, h: 2.3 };
const JET = { x: 3.35, y: 0.34, z: -0.42, yaw: -2.62, pitch: 0.1 };
const CAR = { x: 3.15, z: 1.2 };
const MOTOR: Vec3 = [3.95, 0.3, 1.25];
const MOTOR_S = 0.42;
const SCOOT = { x: 3.3, z: 2.72 };
const SCOOT_S = 1.5;
/** A point in the jet's own frame (nose +X) -> world, matching its group's pitch-then-yaw. */
function jetPt([x, y, z]: Vec3): Vec3 {
  const x1 = x * Math.cos(JET.pitch) - y * Math.sin(JET.pitch);
  const y1 = x * Math.sin(JET.pitch) + y * Math.cos(JET.pitch);
  return [JET.x + x1 * Math.cos(JET.yaw) + z * Math.sin(JET.yaw), JET.y + y1, JET.z - x1 * Math.sin(JET.yaw) + z * Math.cos(JET.yaw)];
}
// Equipment inside the magnet plant and the separation plant was laid out for longer halls; these
// squeeze its x positions into the current footprints (shapes are kept, only spacing changes).
const fMag = (x: number) => -0.65 + (x + 0.075) * 0.877;
const fSep = (x: number) => -1.3 + (x + 1.275) * 0.884;
const fAly = (x: number) => x - 0.225;
const fRec = (x: number) => x - 0.85;

// zone id -> 3D marker position + which rail its callout sits on. Within a rail, callouts stack in
// the order the zones are listed in the sector def, so that order follows the screen (top -> bottom,
// left -> right) from the overview to keep leader lines from crossing.
export const RAREEARTH_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: end uses
  wind: { pos: [WIND.x, WIND.h + 0.1, WIND.z + 0.3], side: "right" }, // ring generator behind the hub
  defence: { pos: jetPt([-0.4, 0.0, -0.22]), side: "right" }, // elevon + its actuator, near wing
  ev_motors: { pos: [MOTOR[0], MOTOR[1] + 0.1, MOTOR[2] + 0.06], side: "right" }, // rotor magnets in the cutaway
  ev_2w: { pos: [SCOOT.x - 0.2 * SCOOT_S, 0.03 + 0.113 * SCOOT_S, SCOOT.z + 0.06], side: "right" }, // rear hub motor
  // layer 1: magnet plant
  magnet_making: { pos: [fMag(0.34), 0.26, 1.08], side: "bottom" }, // sintering furnaces
  recycling: { pos: [fRec(2.35), 0.18, 0.8], side: "bottom" }, // scrap-magnet bins
  // layer 2: refining & alloy
  separation: { pos: [fSep(-1.22), 0.16, -1.75], side: "left" }, // solvent-extraction mixer-settlers
  metal_alloy: { pos: [fAly(0.7), 0.32, -2.15], side: "top" }, // electrolysis cells
  // layer 3: mine & minerals
  beach_sand: { pos: [PIT.x + 0.4, 0.14, PIT.z + 0.2], side: "left" }, // black-sand ore terraces
  hardrock: { pos: [HILL.x, 0.58, HILL.z], side: "left" }, // carbonatite ore body inside the hill
};

export const RAREEARTH_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    // Aimed at the model's visual centre so it sits mid-stage on phones and tablets.
    pos: [2.13, 9.39, 9.86],
    target: [-0.11, 0.25, 0.18],
    narration:
      "Welcome to the rare-earth magnet chain. Read it left to right: beach sand and hard rock are mined, separated into rare-earth oxides, turned into metal and alloy, pressed and sintered into magnets, and finally built into wind turbines, aircraft, electric cars and e-scooters. India's Rs 7,280 crore scheme pays five companies to build the middle of this chain at home.",
  },
  {
    id: "uses",
    label: "End Uses",
    pos: [-0.1, 4.6, 6.0],
    target: [3.25, 0.6, 0.1],
    narration:
      "Where the magnets end up. The traction motor beside the car is cut open to show the magnet blocks buried in its rotor; the e-scooter carries one in its rear hub; fighter jets use them in the actuators that move their control surfaces; and direct-drive wind turbines ring their generators with them. In 2025, China's export curbs halved some Indian e-scooter output within weeks.",
  },
  {
    id: "magnets",
    layer: 1,
    label: "Magnet Line",
    pos: [-0.2, 3.3, 5.0],
    target: [-0.55, 0.2, 1.2],
    narration:
      "The sintered magnet line the scheme pays for. Alloy flakes are crushed with hydrogen and jet-milled to a fine powder, pressed inside a magnetic field to line the grains up, sintered in vacuum furnaces, machined, coated and finally magnetised. Next door, scrap magnets are recycled back into powder.",
  },
  {
    id: "refining",
    layer: 2,
    label: "Refining",
    pos: [-0.3, 3.9, 2.4],
    target: [-0.3, 0.2, -2.05],
    narration:
      "The hardest step. Monazite is cracked with caustic soda, then hundreds of mixer-settler stages pull neodymium and praseodymium apart from their near-identical neighbours. The oxide then goes to molten-salt electrolysis cells to become metal, and is melted with iron and boron into magnet alloy.",
  },
  {
    id: "mine",
    layer: 3,
    label: "Mine",
    pos: [-0.5, 4.4, 5.4],
    target: [-3.15, 0.15, 0.3],
    narration:
      "The source. India's rare earths sit mostly in monazite, a heavy mineral in the black beach sands of Kerala, Tamil Nadu, Odisha and Andhra Pradesh, mined by the state-owned IREL. Behind it, a hard-rock carbonatite deposit of the kind Gujarat's GMDC is developing at Ambadungar.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0, 13, 1.2],
    target: [0, 0, 0],
    narration: "From above: the coast and the mines on the left, refining at the back, the magnet plant in the middle and the products that use magnets on the right.",
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

export function buildRareearth(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [useG, magG, refG, mineG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // ------------------------------------------------------------ merge batches
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);
  const place = (P: Put, x: number, y: number, z: number, ry = 0, s = 1): Put => (m, g) => {
    if (s !== 1) g.scale(s, s, s);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    P(m, g);
  };

  /** Moves a geometry sideways so its centre lands at f(centre x): squeezes a layout's spacing
   *  without distorting any part. */
  const rx = (g: T.BufferGeometry, f: (x: number) => number) => {
    g.computeBoundingBox();
    const c = (g.boundingBox!.min.x + g.boundingBox!.max.x) / 2;
    return g.translate(f(c) - c, 0, 0);
  };
  const remap = (P: Put, f: (x: number) => number): Put => (m, g) => P(m, rx(g, f));

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
  const cone = (r: number, h: number, x: number, y: number, z: number, seg = 20) =>
    new THREE.ConeGeometry(r, h, seg, 1).translate(x, y + h / 2, z);
  /** Domed vertical tank, base at y. */
  const tankGeo = (r: number, h: number, x: number, y: number, z: number, dome = 0.3, seg = 24) => {
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
  /** Process vessel with dished heads, lowest point at y. */
  const vessel = (r: number, h: number, x: number, y: number, z: number, k = 0.4, seg = 22) => {
    const pts: Vec2[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = (Math.PI / 2) * (1 - i / 5);
      pts.push([Math.max(1e-3, r * Math.cos(t)), k * r * (1 - Math.sin(t))]);
    }
    for (let i = 1; i <= 5; i++) {
      const t = (Math.PI / 2) * (i / 5);
      pts.push([Math.max(1e-3, r * Math.cos(t)), k * r + h + k * r * Math.sin(t)]);
    }
    return lathe(THREE, pts, seg).translate(x, y, z);
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** Four outward-facing wall planes; UV u repeats per world unit, v spans 0..h. */
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

  // ------------------------------------------------------------ textures
  type FacadeOpts = { base: string; plinth: string; accent?: string; accentAt?: number; bands?: Vec2[]; ribs?: boolean; pitch?: number };
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
        g.fillStyle = "rgba(0,0,0,0.08)";
        for (let y = h; y > 0; y -= 25.6) g.fillRect(0, y, w, 1.2);
        for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 1.2, h);
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
      }
      if (o.accent) {
        g.fillStyle = o.accent;
        g.fillRect(0, Y(o.accentAt ?? 0.5) - 4, w, 8);
      }
      g.fillStyle = o.plinth;
      g.fillRect(0, Y(0.09), w, h - Y(0.09));
    });
  const magTex = facade(MAG.h, { base: "#eef1f3", plinth: "#56606a", accent: "#2e86ab", accentAt: 0.86, bands: [[0.42, 0.62]], pitch: 48 });
  const recTex = facade(REC.h, { base: "#d9dfd3", plinth: "#4f5a4c", ribs: true, accent: "#3aa05a", accentAt: 0.84 });
  const sepTex = facade(SEP.h, { base: "#c3c9cf", plinth: "#4c555e", ribs: true, accent: "#9c6b30", accentAt: 0.88, bands: [[0.55, 0.66]], pitch: 64 });
  const alyTex = facade(ALY.h, { base: "#b3bac1", plinth: "#474f58", ribs: true, accent: "#d96c2b", accentAt: 0.88 });
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
  // Fascia sign: the font shrinks until the text fits with a margin, so long names never clip.
  const signTex = (text: string, bg: string) =>
    canvasTexture(THREE, 1024, 160, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.9)";
      g.fillRect(0, h - 10, w, 4);
      g.fillStyle = "#ffffff";
      g.textAlign = "center";
      g.textBaseline = "middle";
      let px = 96;
      for (; px > 30; px -= 4) {
        g.font = `bold ${px}px Arial, Helvetica, sans-serif`;
        if (g.measureText(text).width <= w * 0.9) break;
      }
      g.fillText(text, w / 2, h / 2 + 2);
    });
  const floorTex = (base: string, line: string) => {
    const t = tex(
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
    t.repeat.set(4, 2);
    return t;
  };
  // Black heavy-mineral sand: ilmenite-dark with yellow monazite, red garnet and white zircon grains.
  const oreTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#2f2b27";
      g.fillRect(0, 0, w, h);
      const rnd = mulberry(7);
      for (let i = 0; i < 2600; i++) {
        const r = rnd();
        g.fillStyle = r < 0.3 ? "#d8a531" : r < 0.45 ? "#a2402c" : r < 0.6 ? "#e8e4da" : "#4a4440";
        g.fillRect(rnd() * w, rnd() * h, 1.6 + rnd() * 2.4, 1.6 + rnd() * 2.4);
      }
    },
    true
  );
  oreTex.repeat.set(3, 3);
  const sandTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#e3d1a4";
      g.fillRect(0, 0, w, h);
      const rnd = mulberry(3);
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = rnd() > 0.5 ? "rgba(120,95,50,0.12)" : "rgba(255,250,235,0.18)";
        g.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
    },
    true
  );
  sandTex.repeat.set(4, 4);
  const lamTex = tex(
    128,
    16,
    (g, w, h) => {
      g.fillStyle = "#4b535b";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#2c3238";
      for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.5, h);
    },
    true
  );

  // ------------------------------------------------------------ ground plan
  const PX = 4.3,
    PZ = 3.5,
    PR = 0.45;
  const SEA_X = -3.95;
  const GW = 2048,
    GH = Math.round((2048 * 2 * PZ) / (2 * PX));
  const groundTex = canvasTexture(THREE, GW, GH, (g) => {
    const sx = GW / (2 * PX);
    const X = (x: number) => (x + PX) * sx;
    const Z = (z: number) => (z + PZ) * sx;
    const rect = (x0: number, x1: number, z0: number, z1: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    };
    const rnd = mulberry(11);
    g.fillStyle = "#6d8550";
    g.fillRect(0, 0, GW, GH);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rnd() > 0.5 ? "rgba(255,255,210,0.05)" : "rgba(0,25,0,0.06)";
      g.beginPath();
      g.arc(rnd() * GW, rnd() * GH, 8 + rnd() * 40, 0, Math.PI * 2);
      g.fill();
    }
    // Beach: soft sand band from the hill to the front edge, wet sand at the waterline.
    const sand = g.createLinearGradient(X(SEA_X), 0, X(-2.4), 0);
    sand.addColorStop(0, "#cdb27a");
    sand.addColorStop(0.12, "#e6d3a3");
    sand.addColorStop(1, "#dcc898");
    g.fillStyle = sand;
    g.beginPath();
    g.moveTo(X(SEA_X - 0.2), Z(-1.0));
    g.bezierCurveTo(X(-3.3), Z(-1.1), X(-2.6), Z(-0.6), X(-2.55), Z(0.3));
    g.lineTo(X(-2.55), Z(PZ));
    g.lineTo(X(SEA_X - 0.2), Z(PZ));
    g.closePath();
    g.fill();
    // Hill apron (bare earth).
    g.fillStyle = "#9b8a6e";
    g.beginPath();
    g.ellipse(X(HILL.x), Z(HILL.z), 1.25 * HILL.k * sx, 1.0 * HILL.k * sx, 0, 0, Math.PI * 2);
    g.fill();
    // Plant aprons.
    const apron = "#aeb0aa";
    for (const b of [MAG, REC, SEP, ALY]) rect(b.x0 - 0.1, b.x1 + 0.1, b.z0 - 0.1, b.z1 + 0.1, apron);
    rect(-2.3, 2.1, -3.4, -2.98, "#a3a59f"); // tank farm strip behind the plants
    rect(2.42, 4.28, -1.15, 3.42, "#c9c4b6"); // end-use display deck surround
    g.fillStyle = "#b9b4a6"; // turbine pad
    g.beginPath();
    g.arc(X(WIND.x), Z(WIND.z), 0.42 * sx, 0, Math.PI * 2);
    g.fill();
    // Ambient-occlusion halos.
    g.save();
    g.filter = "blur(10px)";
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (const b of [MAG, REC, SEP, ALY]) g.fillRect(X(b.x0 - 0.02), Z(b.z0 - 0.02), (b.x1 - b.x0 + 0.04) * sx, (b.z1 - b.z0 + 0.04) * sx);
    g.restore();
    // Roads: main east-west service road, haul road from the pit, spur to the turbine.
    const roads: [number, number, number, number, number][] = [
      [-2.42, -0.7, 2.3, -0.7, 0.28],
      [-2.42, -0.7, -2.42, 3.38, 0.2],
      [2.3, -0.7, 2.3, 3.38, 0.2],
    ];
    const roadPath = (r: (typeof roads)[number]) => {
      g.beginPath();
      g.moveTo(X(r[0]), Z(r[1]));
      g.lineTo(X(r[2]), Z(r[3]));
    };
    g.lineCap = "square";
    for (const r of roads) {
      roadPath(r);
      g.strokeStyle = "#cfcabd";
      g.lineWidth = (r[4] + 0.05) * sx;
      g.stroke();
    }
    for (const r of roads) {
      roadPath(r);
      g.strokeStyle = "#3a3f45";
      g.lineWidth = r[4] * sx;
      g.stroke();
    }
    g.lineCap = "butt";
    for (const r of roads) {
      roadPath(r);
      g.strokeStyle = "rgba(240,238,225,0.75)";
      g.lineWidth = 2;
      g.setLineDash([16, 14]);
      g.stroke();
      g.setLineDash([]);
    }
    // Truck bays at the magnet plant's north dock.
    g.strokeStyle = "rgba(240,200,60,0.85)";
    g.lineWidth = 2.5;
    for (const x of [-0.9, -0.5, -0.1, 0.3].map(fMag)) {
      g.beginPath();
      g.moveTo(X(x), Z(-0.5));
      g.lineTo(X(x), Z(0.22));
      g.stroke();
    }
    // Deck tiles on the end-use pad.
    g.strokeStyle = "rgba(90,90,80,0.25)";
    g.lineWidth = 1.2;
    for (let x = 2.5; x <= 4.21; x += 0.2) {
      g.beginPath();
      g.moveTo(X(x), Z(-1.05));
      g.lineTo(X(x), Z(3.3));
      g.stroke();
    }
    for (let z = -1.05; z <= 3.31; z += 0.2) {
      g.beginPath();
      g.moveTo(X(2.5), Z(z));
      g.lineTo(X(4.2), Z(z));
      g.stroke();
    }
  });
  groundTex.anisotropy = 8;

  // ------------------------------------------------------------ materials
  const baseMats = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0xc9a227, emissiveIntensity: 0.35 })),
    sea: L.add("base", std(0x23739a, 0.25, 0.12, { opacity: 0.9, envMapIntensity: 1.2 })),
    foam: L.add("base", std(0xf4f7f8, 0, 0.6, { opacity: 0.85 })),
    magFloor: L.add("base", std(0xffffff, 0.05, 0.45, { map: floorTex("#d4dbe0", "rgba(60,80,100,0.14)") })),
    refFloor: L.add("base", std(0xffffff, 0.05, 0.75, { map: floorTex("#9fa5a8", "rgba(40,45,50,0.18)") })),
  };
  // Context around the plants (trees, vehicles, lamp posts): fades back on the inner layers.
  const cm = {
    canopy: L.add("trees", std(0x4f7a3c, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    palm: L.add("trees", std(0x3f7d3a, 0, 0.8, { side: DS })),
    white: L.add("ctx", std(0xeef1f3, 0.1, 0.45)),
    dark: L.add("ctx", std(0x2b3137, 0.4, 0.5)),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    cabBlue: L.add("ctx", std(0x2b62c4, 0.45, 0.3)),
    crate: L.add("ctx", std(0x9a7448, 0, 0.85)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    pipe: L.add("ctx", std(0xa7b0b8, 0.75, 0.3)),
    pipeY: L.add("ctx", std(0xd9b23a, 0.4, 0.4)),
    rackSteel: L.add("ctx", std(0x5c6b7a, 0.6, 0.45)),
    tank: L.add("ctx", std(0xeef1f3, 0.15, 0.35)),
    tankBand: L.add("ctx", std(0x9c6b30, 0.3, 0.45)),
    stack: L.add("ctx", std(0xb9bec3, 0.5, 0.4)),
    stackBand: L.add("ctx", std(0xc23b32, 0.3, 0.5)),
    argon: L.add("ctx", std(0xf3f5f6, 0.3, 0.3)),
  };
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    sky: L.add(bucket, std(0x2a3f52, 0.6, 0.15)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
  });
  // Roof-mounted plant on the refining halls: lifts and fades with their roofs.
  const sepScrub = {
    body: L.add("roofRef", std(0xdfe4e8, 0.35, 0.35)),
    band: L.add("roofRef", std(0x9c6b30, 0.3, 0.45)),
    stack: L.add("roofRef", std(0xb9bec3, 0.5, 0.4)),
    red: L.add("roofRef", std(0xc23b32, 0.3, 0.5)),
  };
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    steel: L.add(bucket, std(0x5c6b7a, 0.6, 0.45)),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    teal: L.add(bucket, std(0x17a398, 0.25, 0.4)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    copper: L.add(bucket, std(0xb8692f, 0.85, 0.32)),
    hot: L.add(bucket, std(0x331100, 0, 0.5, { emissive: 0xff7a2a, emissiveIntensity: 1.3 })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    magnet: L.add(bucket, std(0xc3c8ce, 0.95, 0.2)),
    powder: L.add(bucket, std(0x5a5e63, 0.4, 0.8)),
    oxide: L.add(bucket, std(0xb9a3c9, 0.05, 0.75)), // NdPr oxide is a pale lilac powder
    bag: L.add(bucket, std(0xf2f0e6, 0, 0.65)),
    scrap: L.add(bucket, std(0x7c838a, 0.7, 0.5)),
    bin: L.add(bucket, std(0x3a7d4f, 0.3, 0.5)),
    glass: L.add(bucket, std(0xd5ebf3, 0.2, 0.05, { opacity: 0.35 })),
  });
  type EqM = ReturnType<typeof eqMats>;
  const mm = eqMats("magEq");
  const rm = eqMats("refEq");
  // Mine: the overburden shells fade at layer 3 to show the ore underneath.
  const mineMats = {
    over: L.add("over", std(0xffffff, 0, 0.95, { map: sandTex, side: DS })),
    rock: L.add("over", std(0x8f8170, 0.05, 0.9, { flatShading: true, side: DS })),
    rockTop: L.add("over", std(0x7e8f5c, 0, 0.9, { flatShading: true })),
    ore: L.add("ore", std(0xffffff, 0.15, 0.7, { map: oreTex, side: DS })),
    carbonatite: L.add("ore", std(0xd9874c, 0.1, 0.6, { emissive: 0x5a2208, emissiveIntensity: 0.35, flatShading: true })),
    pond: L.add("mine", std(0x3c6e74, 0.2, 0.12, { opacity: 0.92 })),
    yellow: L.add("mine", std(0xe2b33a, 0.4, 0.45)),
    dark: L.add("mine", std(0x2e343b, 0.45, 0.45)),
    steel: L.add("mine", std(0x6a7682, 0.6, 0.45)),
    white: L.add("mine", std(0xeef1f3, 0.1, 0.45)),
    orange: L.add("mine", std(0xd96c2b, 0.35, 0.4)),
    float: L.add("mine", std(0xe7742c, 0.2, 0.5)),
    pipe: L.add("mine", std(0x2e343b, 0.3, 0.6)),
    spiral: L.add("mine", std(0x3f86c6, 0.3, 0.4)),
    tyre: L.add("mine", std(0x17181a, 0.1, 0.85)),
    blackPile: L.add("mine", std(0x2a2725, 0.2, 0.85)),
    monazite: L.add("mine", std(0xc99b3c, 0.1, 0.8)),
    zircon: L.add("mine", std(0xe9e5da, 0.05, 0.85)),
  };
  // End uses: full at layer 0, ghosted inside.
  const um = {
    alu: L.add("use", std(0xc4cad0, 0.75, 0.32, { side: DS })),
    aluDark: L.add("use", std(0x7d8790, 0.7, 0.4, { side: DS })),
    lam: L.add("use", std(0xffffff, 0.6, 0.45, { map: lamTex, side: DS })),
    copper: L.add("use", std(0xc0702f, 0.9, 0.3, { side: DS })),
    magnet: L.add("use", std(0xd2d7dd, 0.95, 0.16, { emissive: 0x1b4f8c, emissiveIntensity: 0.25 })),
    poleN: L.add("use", std(0xc23b32, 0.4, 0.4)),
    poleS: L.add("use", std(0x2b62c4, 0.4, 0.4)),
    shaft: L.add("use", std(0x9aa3ab, 0.9, 0.25)),
    stand: L.add("use", std(0x2e343b, 0.4, 0.5)),
    white: L.add("use", std(0xf1f3f5, 0.15, 0.45, { side: DS })),
    turbineGrey: L.add("use", std(0xd8dde2, 0.3, 0.45)),
    scooter: L.add("use", std(0x2aa59b, 0.45, 0.3)),
    seat: L.add("use", std(0x23272b, 0.2, 0.7)),
    tyre: L.add("use", std(0x17181a, 0.1, 0.85)),
    nose: L.add("use", std(0x4a535c, 0.5, 0.4)),
    jet: L.add("use", std(0x8e9aa6, 0.55, 0.4, { side: DS })),
    actuator: L.add("use", std(0xe2b33a, 0.35, 0.4, { emissive: 0x6a4a00, emissiveIntensity: 0.3 })),
    carBody: L.add("use", std(0x1f6fb2, 0.6, 0.28)),
    glassDark: L.add("use", std(0x1a2430, 0.7, 0.08)),
    blade: L.add("use", std(0xdfe4e9, 0.2, 0.35, { side: DS })),
    deck: L.add("use", std(0x3a434c, 0.3, 0.6)),
    glow: L.add("use", std(0x0a1a2a, 0, 0.5, { emissive: 0x49d4c9, emissiveIntensity: 0.9 })),
  };

  const U = putter(useG),
    N = putter(mineG);

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
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PX) / (2 * PX), 1 - (p.getZ(i) + PZ) / (2 * PZ));
    gg.translate(0, 0.004, 0);
    ctx.staticGroup.add(new THREE.Mesh(gg, baseMats.ground));
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    ctx.staticGroup.add(new THREE.Mesh(pl, baseMats.plinth));
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    ctx.staticGroup.add(new THREE.Mesh(lip, baseMats.lip));

    // Sea along the west edge (front half), with a surf line.
    const seaShape = new THREE.Shape();
    seaShape.moveTo(x0 + 0.02, 0.95);
    seaShape.lineTo(SEA_X, 0.95);
    seaShape.bezierCurveTo(SEA_X + 0.12, -0.2, SEA_X - 0.1, -1.6, SEA_X + 0.05, -z1 + 0.02);
    seaShape.lineTo(x0 + PR, -z1 + 0.02);
    seaShape.quadraticCurveTo(x0 + 0.02, -z1 + 0.02, x0 + 0.02, -z1 + PR);
    seaShape.closePath();
    const sea = new THREE.ShapeGeometry(seaShape, 16).rotateX(-Math.PI / 2).translate(0, 0.012, 0);
    ctx.staticGroup.add(new THREE.Mesh(sea, baseMats.sea));
    const surf: Vec3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const z = lerp(-0.95, z1 - 0.06, t);
      surf.push([SEA_X + 0.03 + Math.sin(t * 9) * 0.03, 0.016, z]);
    }
    ctx.staticGroup.add(new THREE.Mesh(tube(THREE, surf, 0.012, 5, false, 60), baseMats.foam));
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Group; bucket: string };
  const peels: Record<string, Peel[]> = { mag: [], ref: [] };
  const capMat = std(0x343c45, 0.3, 0.6);
  const DADO = 0.09;
  const makePeel = (key: "mag" | "ref", parent: T.Group, b: Box, map: T.Texture, roofBucket: string, sign?: { text: string; bg: string; face: "s" | "n" }) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.h);
    const wm = std(0xffffff, 0.15, 0.55, { map, side: DS, clippingPlanes: [plane] });
    parent.add(new THREE.Mesh(wallRing(b), wm));
    const roof = new THREE.Group();
    parent.add(roof);
    const cap = new THREE.Group();
    parent.add(cap);
    const t = 0.03,
      hh = 0.02;
    cap.add(
      new THREE.Mesh(
        mergeInto(THREE, [
          bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z0 - t / 2, b.z0 + t / 2),
          bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z1 - t / 2, b.z1 + t / 2),
          bb(b.x0 - t / 2, b.x0 + t / 2, -hh, 0, b.z0, b.z1),
          bb(b.x1 - t / 2, b.x1 + t / 2, -hh, 0, b.z0, b.z1),
        ]),
        capMat
      )
    );
    cap.position.y = b.h;
    peels[key].push({ b, plane, roof, cap, bucket: roofBucket });
    const RM = roofMats(roofBucket);
    const P = putter(roof);
    P(RM.mem, uvScale(bb(b.x0, b.x1, b.h - 0.03, b.h, b.z0, b.z1), b.x1 - b.x0, b.z1 - b.z0));
    const pt = 0.025,
      ph = 0.05;
    P(RM.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(RM.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(RM.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(RM.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    if (sign) {
      // Roof-edge fascia sign (lifts away with the roof).
      const sm = L.add(roofBucket, std(0xffffff, 0.1, 0.5, { map: signTex(sign.text, sign.bg) }));
      const w = Math.min(1.6, (b.x1 - b.x0) * 0.8);
      const sh = w * (160 / 1024);
      const g = new THREE.PlaneGeometry(w, sh);
      const zf = sign.face === "s" ? b.z1 + 0.006 : b.z0 - 0.006;
      if (sign.face === "n") g.rotateY(Math.PI);
      g.translate((b.x0 + b.x1) / 2, b.h + 0.04 + sh / 2, zf);
      // Steel backing frame so the sign reads as a board, not a sticker.
      P(RM.dark, bb((b.x0 + b.x1) / 2 - w / 2 - 0.012, (b.x0 + b.x1) / 2 + w / 2 + 0.012, b.h + 0.03, b.h + 0.05 + sh, zf - (sign.face === "s" ? 0.012 : -0.002), zf - (sign.face === "s" ? 0.002 : -0.012)));
      P(sm, g);
    }
    return { P, RM, plane };
  };
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55) => std(color, metal, rough, { clippingPlanes: [plane], side: DS });

  // ---- Magnet plant shell.
  {
    const { P, RM, plane } = makePeel("mag", magG, MAG, magTex, "roofMag", { text: "SINTERED MAGNET PLANT", bg: "#2e86ab", face: "s" });
    const H = MAG.h;
    for (let i = 0; i < 4; i++) {
      const x = fMag(-1.4 + i * 0.95);
      P(RM.unit, rb(0.36, 0.12, 0.22, 0.02, x, H, 0.8));
      P(RM.dark, cyl(0.045, 0.012, x - 0.08, H + 0.12, 0.8, 14));
      P(RM.dark, cyl(0.045, 0.012, x + 0.08, H + 0.12, 0.8, 14));
    }
    for (let i = 0; i < 7; i++) P(RM.sky, bb(fMag(-1.5 + i * 0.48) - 0.13, fMag(-1.5 + i * 0.48) + 0.13, H + 0.002, H + 0.03, 1.25, 1.75));
    for (let k = 0; k < 6; k++) P(RM.solar, new THREE.BoxGeometry(0.38, 0.008, 0.16).rotateX(-0.35).translate(fMag(-1.5 + k * 0.55), H + 0.05, 1.88));
    // North loading docks (doors + canopy) clipped with the walls.
    const doorM = clipMat(0x5b6670, plane, 0.5, 0.4);
    const canM = clipMat(0xe2e6e9, plane, 0.15, 0.5);
    for (const x of [-0.7, -0.3, 0.1].map(fMag)) put(magG, doorM, bb(x - 0.12, x + 0.12, 0.02, 0.32, MAG.z0 - 0.012, MAG.z0 - 0.002));
    put(magG, canM, bb(fMag(-0.95), fMag(0.35), 0.38, 0.4, MAG.z0 - 0.2, MAG.z0));
    // South glazed entrance.
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    put(magG, glassM, bb(fMag(-0.25), fMag(0.35), 0.0, 0.34, MAG.z1 + 0.002, MAG.z1 + 0.012));
    put(magG, canM, bb(fMag(-0.32), fMag(0.42), 0.34, 0.37, MAG.z1, MAG.z1 + 0.18));
  }
  // ---- Recycling shed shell.
  {
    const { P, RM } = makePeel("mag", magG, REC, recTex, "roofMag", { text: "MAGNET RECYCLING", bg: "#3aa05a", face: "s" });
    P(RM.unit, rb(0.24, 0.1, 0.18, 0.02, fRec(2.3), REC.h, 0.95));
    P(RM.dark, cyl(0.04, 0.012, fRec(2.3), REC.h + 0.1, 0.95, 12));
  }
  // ---- Separation plant shell.
  {
    const { P, RM } = makePeel("ref", refG, SEP, sepTex, "roofRef", { text: "RARE EARTH SEPARATION", bg: "#9c6b30", face: "s" });
    const H = SEP.h;
    // Roof: a row of fume-scrubber fans over the solvent-extraction hall, and two tall acid
    // scrubber towers with a duct header - a chemical plant, not a warehouse.
    for (let i = 0; i < 6; i++) {
      const x = SEP.x0 + 0.22 + i * 0.29;
      P(RM.unit, rb(0.16, 0.08, 0.16, 0.02, x, H, -1.6));
      P(RM.dark, cyl(0.055, 0.02, x, H + 0.08, -1.6, 16));
    }
    P(RM.dark, tube(THREE, [[SEP.x0 + 0.2, H + 0.13, -2.05], [SEP.x1 - 0.5, H + 0.13, -2.05]], 0.03, 10, false, 2));
    for (let i = 0; i < 4; i++) P(RM.dark, bar(THREE, [SEP.x0 + 0.3 + i * 0.36, H, -2.05], [SEP.x0 + 0.3 + i * 0.36, H + 0.13, -2.05], 0.018, 8));
    const sc = sepScrub;
    for (const [x, z, hh] of [[SEP.x1 - 0.35, -2.2, 0.75], [SEP.x1 - 0.35, -2.65, 0.6]] as Vec3[]) {
      P(sc.body, tankGeo(0.11, hh, x, H, z, 0.35, 22));
      for (let k = 1; k < 4; k++) P(sc.band, cyl(0.113, 0.02, x, H + (hh * k) / 4, z, 22));
      P(sc.band, cyl(0.03, 0.12, x, H + hh + 0.03, z, 10));
    }
    P(RM.dark, tube(THREE, [[SEP.x1 - 0.35, H + 0.13, -2.05], [SEP.x1 - 0.35, H + 0.13, -2.2]], 0.03, 10, false, 2));
  }
  // ---- Metal & alloy hall shell.
  {
    const { P, RM } = makePeel("ref", refG, ALY, alyTex, "roofRef", { text: "METAL & ALLOY", bg: "#d96c2b", face: "s" });
    const H = ALY.h;
    // Monitor roof (raised lantern) for furnace heat, two banded furnace stacks and a bag-filter
    // house with hoppers - reads as a hot metals hall from the overview.
    P(RM.unit, bb(ALY.x0 + 0.15, ALY.x1 - 0.55, H, H + 0.1, -2.3, -1.95));
    P(RM.sky, bb(ALY.x0 + 0.17, ALY.x1 - 0.57, H + 0.1, H + 0.115, -2.28, -1.97));
    for (const [x, z, hh] of [[ALY.x1 - 0.3, -2.6, 0.95], [ALY.x1 - 0.3, -2.25, 0.8]] as Vec3[]) {
      P(sepScrub.stack, cyl(0.055, hh, x, H, z, 16, 0.045));
      P(sepScrub.red, cyl(0.051, 0.06, x, H + hh - 0.14, z, 16));
      P(sepScrub.red, cyl(0.048, 0.06, x, H + hh - 0.04, z, 16));
    }
    P(RM.unit, rb(0.42, 0.2, 0.26, 0.02, ALY.x0 + 0.45, H, -2.6));
    for (let i = 0; i < 3; i++) P(RM.dark, new THREE.ConeGeometry(0.06, 0.08, 4).rotateX(Math.PI).rotateY(Math.PI / 4).translate(ALY.x0 + 0.3 + i * 0.15, H + 0.24, -2.6));
    P(RM.dark, tube(THREE, [[ALY.x0 + 0.66, H + 0.12, -2.6], [ALY.x1 - 0.3, H + 0.12, -2.6]], 0.028, 10, false, 2));
  }

  // Interior floors (under the equipment, above the ground).
  for (const b of [MAG, REC]) magG.add(new THREE.Mesh(uvScale(bb(b.x0 + 0.01, b.x1 - 0.01, 0.004, 0.012, b.z0 + 0.01, b.z1 - 0.01), 1, 1), baseMats.magFloor));
  for (const b of [SEP, ALY]) refG.add(new THREE.Mesh(bb(b.x0 + 0.01, b.x1 - 0.01, 0.004, 0.012, b.z0 + 0.01, b.z1 - 0.01), baseMats.refFloor));

  // ============================================================ MAGNET LINE (layer 1)
  const MLraw = putter(magG);
  const ML = remap(MLraw, fMag);
  const FL = 0.012;
  {
    const e: EqM = mm;
    const zc = 1.2;
    // Conveyor running the length of the line.
    MLraw(e.dark, bb(fMag(-1.75), fMag(1.6), FL + 0.06, FL + 0.075, zc + 0.3, zc + 0.42));
    for (let x = -1.7; x <= 1.6; x += 0.25) ML(e.steel, bx(0.015, 0.06, 0.1, x, FL, zc + 0.36));
    // 1. Hydrogen decrepitation vessel + jet mill (cyclone, filter, powder hopper).
    ML(e.ss, vessel(0.11, 0.28, -1.62, FL + 0.08, zc - 0.25));
    ML(e.steel, bb(-1.75, -1.49, FL, FL + 0.08, zc - 0.36, zc - 0.14));
    ML(e.ss, cyl(0.07, 0.2, -1.32, FL + 0.18, zc - 0.25, 18));
    ML(e.ss, new THREE.ConeGeometry(0.07, 0.16, 18).rotateX(Math.PI).translate(-1.32, FL + 0.1, zc - 0.25));
    ML(e.ss, cyl(0.055, 0.36, -1.15, FL, zc - 0.25, 16));
    ML(e.grey, tube(THREE, [[-1.62, 0.44, zc - 0.25], [-1.48, 0.5, zc - 0.25], [-1.32, 0.43, zc - 0.25]], 0.014, 6));
    ML(e.grey, tube(THREE, [[-1.32, 0.42, zc - 0.25], [-1.22, 0.47, zc - 0.25], [-1.15, 0.37, zc - 0.25]], 0.012, 6));
    ML(e.powder, cone(0.06, 0.06, -1.15, FL, zc + 0.12));
    // 2. Magnetic-field presses: C-frame with alignment coils.
    for (const x of [-0.85, -0.5]) {
      ML(e.blue, bx(0.22, 0.05, 0.26, x, FL, zc - 0.1));
      ML(e.blue, bx(0.06, 0.42, 0.22, x - 0.08, FL + 0.05, zc - 0.1));
      ML(e.blue, bx(0.2, 0.06, 0.22, x, FL + 0.41, zc - 0.1));
      ML(e.copper, new THREE.TorusGeometry(0.07, 0.025, 8, 20).rotateY(Math.PI / 2).translate(x + 0.02, FL + 0.24, zc - 0.1));
      ML(e.ss, cyl(0.03, 0.14, x + 0.02, FL + 0.27, zc - 0.1, 12));
      ML(e.screen, bx(0.05, 0.04, 0.005, x + 0.07, FL + 0.32, zc + 0.012));
    }
    // 3. Cold isostatic press.
    ML(e.white, vessel(0.08, 0.26, -0.22, FL, zc - 0.12, 0.35));
    ML(e.steel, bb(-0.32, -0.12, FL, FL + 0.03, zc - 0.22, zc - 0.02));
    // 4. Vacuum sintering furnaces (horizontal, door to the conveyor).
    for (let i = 0; i < 3; i++) {
      const x = 0.08 + i * 0.26;
      ML(e.white, cylZ(0.1, 0.42, x, FL + 0.14, zc - 0.12, 22));
      ML(e.dark, cylZ(0.105, 0.03, x, FL + 0.14, zc + 0.1, 22));
      ML(e.hot, cylZ(0.05, 0.005, x, FL + 0.14, zc + 0.118, 16));
      ML(e.steel, bb(x - 0.08, x + 0.08, FL, FL + 0.05, zc - 0.3, zc + 0.06));
      ML(e.grey, cyl(0.03, 0.16, x + 0.06, FL + 0.22, zc - 0.25, 10));
    }
    // 5. Machining (wire saw / grinder) and 6. coating tanks.
    ML(e.grey, rb(0.2, 0.2, 0.22, 0.02, 0.98, FL, zc - 0.12));
    ML(e.glass, bx(0.16, 0.08, 0.2, 0.98, FL + 0.2, zc - 0.12));
    ML(e.screen, bx(0.06, 0.04, 0.005, 1.04, FL + 0.14, zc - 0.005));
    for (let i = 0; i < 3; i++) {
      ML(e.teal, bx(0.1, 0.1, 0.18, 1.22 + i * 0.11, FL, zc - 0.12));
      ML(e.dark, bx(0.09, 0.005, 0.17, 1.22 + i * 0.11, FL + 0.1, zc - 0.12));
    }
    // 7. Magnetiser: a big copper coil on a bench.
    ML(e.dark, bx(0.22, 0.1, 0.24, 1.55, FL, zc - 0.12));
    ML(e.copper, new THREE.TorusGeometry(0.075, 0.03, 10, 24).translate(1.55, FL + 0.19, zc - 0.12));
    ML(e.orange, bx(0.04, 0.12, 0.04, 1.65, FL + 0.1, zc - 0.21));
    // Finished magnet blocks on trays along the conveyor (instanced).
    const blk = new THREE.BoxGeometry(0.035, 0.018, 0.022);
    const pts: Vec3[] = [];
    for (let x = 0.85; x <= 1.62; x += 0.065) for (const dz of [-0.025, 0.025]) pts.push([x, FL + 0.084, zc + 0.36 + dz]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 2; k++) pts.push([1.38 + c * 0.045, FL + 0.11 + k * 0.02, zc + 0.6 + r * 0.035]);
    const im = new THREE.InstancedMesh(blk, e.magnet, pts.length);
    const o = new THREE.Object3D();
    pts.forEach((p, i) => {
      o.position.set(fMag(p[0]), p[1], p[2]);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    magG.add(im);
    ML(e.steel, bb(1.33, 1.57, FL, FL + 0.11, zc + 0.56, zc + 0.7));
    // Alloy flake drums at the head of the line + an operator console.
    for (let i = 0; i < 4; i++) ML(e.grey, cyl(0.045, 0.1, -1.75 + i * 0.1, FL, zc + 0.62, 14));
    ML(e.white, bx(0.18, 0.12, 0.08, 0.6, FL, zc + 0.68));
    ML(e.screen, bx(0.14, 0.06, 0.005, 0.6, FL + 0.12, zc + 0.722));
  }
  // ---- Recycling shed interior: scrap motors and HDD magnets -> hydrogen recycling vessel.
  {
    const e: EqM = mm;
    const ML = remap(MLraw, fRec);
    for (let i = 0; i < 3; i++) {
      const x = 2.15 + i * 0.2;
      ML(e.bin, bx(0.16, 0.12, 0.2, x, FL, 0.8));
      ML(e.scrap, bx(0.14, 0.02, 0.18, x, FL + 0.12, 0.8));
      for (let k = 0; k < 3; k++) ML(e.scrap, cyl(0.022, 0.02, x - 0.04 + k * 0.04, FL + 0.135, 0.78 + (k % 2) * 0.04, 8));
    }
    ML(e.ss, vessel(0.1, 0.22, 2.55, FL, 1.35));
    ML(e.steel, bb(2.42, 2.68, FL, FL + 0.03, 1.22, 1.48));
    ML(e.yellow, rb(0.2, 0.14, 0.16, 0.02, 2.22, FL, 1.35));
    ML(e.dark, bx(0.08, 0.05, 0.1, 2.22, FL + 0.14, 1.35));
    for (let i = 0; i < 3; i++) ML(e.powder, cyl(0.04, 0.09, 2.8, FL, 0.75 + i * 0.12, 12));
  }

  // ============================================================ REFINING (layer 2)
  const RLraw = putter(refG);
  {
    const e: EqM = rm;
    const RL = remap(RLraw, fSep);
    // Cracking: caustic digesters at the west end.
    for (const z of [-2.55, -2.15]) {
      RL(e.ss, vessel(0.12, 0.3, -2.12, FL + 0.08, z));
      RL(e.steel, bb(-2.26, -1.98, FL, FL + 0.08, z - 0.14, z + 0.14));
      RL(e.grey, cyl(0.025, 0.1, -2.12, FL + 0.46, z, 10));
    }
    // Solvent-extraction cascade: two banks of mixer-settlers, liquor colour shifting along the
    // bank as neodymium/praseodymium (lilac) are pulled away from the lighter elements.
    const cells: { x: number; z: number; t: number }[] = [];
    for (let bank = 0; bank < 2; bank++)
      for (let i = 0; i < 11; i++) cells.push({ x: -1.82 + i * 0.12, z: bank === 0 ? -2.45 : -1.75, t: (bank * 11 + i) / 21 });
    const cellG = new THREE.BoxGeometry(0.098, 0.12, 0.3);
    const cellM = new THREE.InstancedMesh(cellG, e.white, cells.length);
    const liqG = new THREE.BoxGeometry(0.088, 0.004, 0.22);
    const liqM = new THREE.InstancedMesh(liqG, L.add("refEq", std(0xffffff, 0.1, 0.15)), cells.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const c0 = new THREE.Color(0x7fbf8a),
      c1 = new THREE.Color(0xb48ad6);
    cells.forEach((c, i) => {
      o.position.set(fSep(c.x), FL + 0.06, c.z);
      o.updateMatrix();
      cellM.setMatrixAt(i, o.matrix);
      o.position.set(fSep(c.x), FL + 0.121, c.z + 0.03);
      o.updateMatrix();
      liqM.setMatrixAt(i, o.matrix);
      col.copy(c0).lerp(c1, c.t);
      liqM.setColorAt(i, col);
    });
    refG.add(cellM, liqM);
    for (const c of cells) {
      RL(e.dark, cyl(0.022, 0.05, c.x, FL + 0.12, c.z - 0.1, 10));
      RL(e.grey, cyl(0.006, 0.03, c.x, FL + 0.17, c.z - 0.1, 6));
    }
    const [s0, s1] = [fSep(-1.9), fSep(-0.5)];
    for (const z of [-2.45, -1.75]) {
      RLraw(e.steel, bb(s0, s1, FL, FL + 0.005, z - 0.17, z + 0.17));
      RLraw(e.yellow, tube(THREE, [[s0, 0.2, z + 0.17], [s1, 0.2, z + 0.17]], 0.008, 6));
      RLraw(e.blue, tube(THREE, [[s0, 0.24, z - 0.17], [s1, 0.24, z - 0.17]], 0.01, 6));
    }
    // Precipitation reactors, filter press and calcining kiln at the east end -> oxide bags.
    for (const z of [-2.5, -2.15]) RL(e.ss, vessel(0.08, 0.2, -0.38, FL, z));
    RL(e.blue, bx(0.22, 0.12, 0.12, -0.4, FL, -1.75));
    for (let i = 0; i < 6; i++) RL(e.grey, bx(0.01, 0.1, 0.1, -0.48 + i * 0.03, FL + 0.12, -1.75));
    RL(e.orange, cylX(0.05, 0.36, -0.62, FL + 0.12, -2.85, 18).rotateZ(0));
    for (let i = 0; i < 4; i++) RL(e.bag, rb(0.07, 0.07, 0.07, 0.015, -0.32 - (i % 2) * 0.08, FL + Math.floor(i / 2) * 0.07, -1.42));
    RL(e.oxide, cone(0.035, 0.03, -0.32, FL + 0.14, -1.42, 12));
  }
  // ---- Metal & alloy hall interior.
  {
    const e: EqM = rm;
    const RL = remap(RLraw, fAly);
    // Molten-salt (fluoride) electrolysis cells: graphite pots with glowing tops and anode bars.
    for (let i = 0; i < 4; i++) {
      const x = 0.42 + i * 0.22;
      RL(e.dark, cyl(0.08, 0.16, x, FL, -2.15, 18));
      RL(e.hot, cyl(0.065, 0.004, x, FL + 0.16, -2.15, 18));
      RL(e.copper, bx(0.02, 0.12, 0.02, x - 0.03, FL + 0.16, -2.15));
      RL(e.copper, bx(0.02, 0.12, 0.02, x + 0.03, FL + 0.16, -2.15));
      RL(e.copper, bx(0.1, 0.015, 0.02, x, FL + 0.28, -2.15));
    }
    RL(e.copper, bb(0.3, 1.2, FL + 0.3, FL + 0.32, -2.17, -2.13));
    RL(e.steel, bb(0.28, 1.22, FL, FL + 0.01, -2.35, -1.95));
    // Vacuum induction melting + strip casting furnace: horizontal vessel with a casting wheel.
    RL(e.white, cylX(0.12, 0.36, 1.55, FL + 0.17, -2.55, 22));
    RL(e.dark, cylX(0.125, 0.025, 1.36, FL + 0.17, -2.55, 22));
    RL(e.ss, cylZ(0.08, 0.06, 1.55, FL + 0.17, -2.36, 22));
    RL(e.steel, bb(1.35, 1.75, FL, FL + 0.06, -2.7, -2.4));
    RL(e.grey, cyl(0.06, 0.18, 1.6, FL, -1.75, 14));
    for (let i = 0; i < 3; i++) RL(e.powder, cyl(0.045, 0.1, 1.25 + i * 0.11, FL, -1.55, 14));
    // Metal ingots on a pallet.
    for (let i = 0; i < 6; i++) RL(e.ss, bx(0.06, 0.025, 0.03, 0.45 + (i % 3) * 0.07, FL + 0.02 + Math.floor(i / 3) * 0.025, -1.6));
    RL(e.dark, bx(0.24, 0.02, 0.1, 0.52, FL, -1.6));
  }

  // ============================================================ YARD (tank farm, pipe rack)
  {
    const C = putter(useG);
    for (let i = 0; i < 4; i++) {
      const x = -2.0 + i * 0.42;
      C(cm.tank, tankGeo(0.14, 0.3, x, 0, -3.2, 0.25));
      C(cm.tankBand, cyl(0.142, 0.03, x, 0.22, -3.2, 24));
    }
    C(cm.stack, cyl(0.05, 1.05, -0.25, 0, -3.15, 14, 0.04));
    for (const y of [0.85, 0.95]) C(cm.stackBand, cyl(0.046, 0.04, -0.25, y, -3.15, 14));
    C(cm.argon, tankGeo(0.09, 0.42, 1.98, 0, -2.75, 0.4));
    C(cm.argon, tankGeo(0.07, 0.32, 1.98, 0, -2.45, 0.4));
    // Pipe rack from the separation plant to the alloy hall and on to the magnet plant.
    for (let x = -2.15; x <= 1.8; x += 0.395) {
      C(cm.rackSteel, bx(0.02, 0.3, 0.02, x, 0, -1.02));
      C(cm.rackSteel, bx(0.02, 0.3, 0.02, x, 0, -0.9));
      C(cm.rackSteel, bx(0.02, 0.015, 0.16, x, 0.3, -0.96));
    }
    C(cm.pipe, tube(THREE, [[-2.2, 0.33, -0.99], [1.85, 0.33, -0.99]], 0.014, 8, false, 4));
    C(cm.pipeY, tube(THREE, [[-2.2, 0.33, -0.93], [1.85, 0.33, -0.93]], 0.012, 8, false, 4));
    // Lamp posts along the service road.
    for (let x = -1.9; x <= 2.0; x += 1.3) {
      C(cm.pole, cyl(0.008, 0.36, x, 0, -0.5, 6));
      C(cm.lamp, bx(0.05, 0.012, 0.025, x, 0.36, -0.5));
    }
    // Trucks: an ore truck on the haul road, a magnet truck at the plant's dock.
    const truck = (x: number, z: number, ry: number, body: T.Material, load?: T.Material) => {
      const Q = place(C, x, 0, z, ry);
      Q(cm.cabBlue, rb(0.12, 0.11, 0.13, 0.015, 0.2, 0.03, 0));
      Q(cm.dark, bx(0.005, 0.05, 0.11, 0.263, 0.08, 0));
      Q(body, rb(0.3, 0.1, 0.14, 0.01, -0.03, 0.04, 0));
      if (load) Q(load, bx(0.26, 0.04, 0.12, -0.03, 0.14, 0));
      for (const tx of [0.2, -0.08, -0.15]) for (const tz of [-0.06, 0.06]) Q(cm.tyre, cylZ(0.028, 0.025, tx, 0.028, tz, 10));
    };
    truck(fMag(-0.5), -0.05, -Math.PI / 2, cm.white, cm.crate);
    truck(2.3, 0.9, -Math.PI / 2, cm.white, cm.crate);
    // Trees along the front edge and around the plants.
    const treeG = new THREE.IcosahedronGeometry(0.11, 1);
    const trunkG = new THREE.CylinderGeometry(0.012, 0.016, 0.1, 6);
    const tp: Vec3[] = [];
    for (let x = -2.1; x <= 2.0; x += 0.37) tp.push([x, 0, 2.62 + ((x * 7) % 0.12)]);
    for (let x = -1.9; x <= 1.9; x += 0.42) tp.push([x, 0, 3.1 + ((x * 5) % 0.1)]);
    for (const p of [[-0.3, -0.42], [0.6, -0.42], [1.55, 2.15], [1.95, -0.3], [-2.15, -0.3]] as Vec2[]) tp.push([p[0], 0, p[1]]);
    const rnd = mulberry(21);
    const canopy = new THREE.InstancedMesh(treeG, cm.canopy, tp.length);
    const trunks = new THREE.InstancedMesh(trunkG, cm.trunk, tp.length);
    const o = new THREE.Object3D();
    tp.forEach((p, i) => {
      const s = 0.8 + rnd() * 0.45;
      o.position.set(p[0], 0.05 * s, p[2]);
      o.scale.set(s, s, s);
      o.updateMatrix();
      trunks.setMatrixAt(i, o.matrix);
      o.position.set(p[0], 0.17 * s, p[2]);
      o.scale.set(s, s * 1.1, s);
      o.updateMatrix();
      canopy.setMatrixAt(i, o.matrix);
    });
    useG.add(canopy, trunks);
  }

  // ============================================================ MINES (layer 3)
  {
    // ---- Beach-sand pit: terraced bowl; sand overburden over a black-sand ore layer.
    const prof = (k: number): Vec2[] => [
      [0.001, 0.02],
      [0.42, 0.02],
      [0.46, 0.08 * k],
      [0.56, 0.085 * k],
      [0.6, 0.15 * k],
      [0.7, 0.155 * k],
      [0.75, 0.22 * k],
      [0.84, 0.23 * k],
      [0.93, 0.12 * k],
      [1.0, 0.012],
    ];
    const bowl = (k: number) => {
      const g = lathe(THREE, prof(k), 48);
      g.scale(PIT.sx, 1, PIT.sz);
      g.translate(PIT.x, 0, PIT.z);
      return g;
    };
    mineG.add(new THREE.Mesh(uvScale(bowl(1.0), 3, 1), mineMats.over));
    mineG.add(new THREE.Mesh(uvScale(bowl(0.93), 3, 1), mineMats.ore));
    // Dredge pond + floating dredge + floating slurry pipeline to the wet concentrator.
    const pond = new THREE.CircleGeometry(0.43, 36).rotateX(-Math.PI / 2).scale(PIT.sx, 1, PIT.sz).translate(PIT.x, 0.05, PIT.z);
    N(mineMats.pond, pond);
    {
      const Q = place(N, PIT.x - 0.04, 0.05, PIT.z - 0.05, 0.5, 0.75);
      Q(mineMats.yellow, rb(0.3, 0.05, 0.16, 0.015, 0, 0, 0));
      Q(mineMats.white, rb(0.1, 0.09, 0.1, 0.01, -0.05, 0.05, 0));
      Q(mineMats.dark, bx(0.08, 0.02, 0.09, -0.05, 0.1, 0));
      Q(mineMats.steel, bar(THREE, [0.12, 0.04, 0], [0.32, -0.03, 0], 0.014, 8));
      Q(mineMats.orange, cylX(0.03, 0.05, 0.33, -0.03, 0, 12));
      Q(mineMats.steel, bar(THREE, [0.05, 0.05, 0], [0.18, 0.2, 0], 0.008, 6));
      Q(mineMats.steel, bar(THREE, [0.18, 0.2, 0], [0.26, 0.02, 0], 0.006, 6));
    }
    const pl: Vec3[] = [
      [PIT.x - 0.18, 0.06, PIT.z + 0.05],
      [PIT.x - 0.15, 0.07, PIT.z + 0.35],
      [PIT.x - 0.05, 0.25, PIT.z + 0.85],
      [PIT.x + 0.05, 0.08, PIT.z + 1.0],
      [PIT.x + 0.1, 0.1, 2.85],
    ];
    N(mineMats.pipe, tube(THREE, pl, 0.012, 6, false, 40));
    for (let i = 0; i < 2; i++) {
      const p = pl[i];
      N(mineMats.float, new THREE.SphereGeometry(0.022, 10, 8).translate(p[0], 0.06, p[2]));
    }
    // Wet concentrator plant: platform of spiral separators.
    {
      const x0 = -3.3,
        z0 = 2.87;
      N(mineMats.steel, bb(x0 - 0.3, x0 + 0.3, 0, 0.02, z0 - 0.22, z0 + 0.22));
      for (const [dx, dz] of [[-0.28, -0.2], [0.28, -0.2], [-0.28, 0.2], [0.28, 0.2]] as Vec2[]) N(mineMats.steel, bx(0.02, 0.2, 0.02, x0 + dx, 0, z0 + dz));
      N(mineMats.steel, bb(x0 - 0.3, x0 + 0.3, 0.2, 0.22, z0 - 0.22, z0 + 0.22));
      for (let i = 0; i < 4; i++)
        for (let k = 0; k < 2; k++) {
          const cx = x0 - 0.21 + i * 0.14,
            cz = z0 - 0.08 + k * 0.16;
          const hp: Vec3[] = [];
          for (let s = 0; s <= 40; s++) {
            const a = s * 0.55;
            hp.push([cx + Math.cos(a) * 0.045, 0.42 - s * 0.0095, cz + Math.sin(a) * 0.045]);
          }
          N(mineMats.spiral, tube(THREE, hp, 0.012, 5, false, 90));
          N(mineMats.steel, cyl(0.008, 0.4, cx, 0.02, cz, 6));
        }
      N(mineMats.white, cyl(0.07, 0.12, x0 + 0.2, 0.42, z0, 16));
    }
    // Stockpiles: ilmenite (black), zircon (white), monazite (yellow-brown).
    N(mineMats.blackPile, cone(0.16, 0.14, -2.78, 0, 2.86, 22));
    N(mineMats.zircon, cone(0.1, 0.08, -2.78, 0, 3.27, 18));
    N(mineMats.monazite, cone(0.13, 0.11, -2.95, 0, 0.12, 18));
    // Front-end loader at the monazite pile.
    {
      const Q = place(N, -2.74, 0, 0.3, -2.2);
      Q(mineMats.yellow, rb(0.16, 0.08, 0.1, 0.012, 0, 0.04, 0));
      Q(mineMats.dark, bx(0.06, 0.06, 0.08, -0.03, 0.12, 0));
      Q(mineMats.yellow, bx(0.03, 0.04, 0.14, 0.12, 0.02, 0));
      for (const tx of [-0.05, 0.06]) for (const tz of [-0.06, 0.06]) Q(mineMats.tyre, cylZ(0.035, 0.03, tx, 0.035, tz, 10));
    }
    // Palm trees on the beach.
    {
      const palms: Vec2[] = [[-3.8, 3.15], [-3.85, 0.25], [-3.7, -0.7], [-2.62, -0.1]];
      for (const [x, z] of palms) {
        const lean = 0.06;
        N(cm.trunk, tube(THREE, [[x, 0, z], [x + lean * 0.5, 0.2, z], [x + lean, 0.42, z + 0.02]], 0.012, 6, false, 12));
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const tip: Vec3 = [x + lean + Math.cos(a) * 0.17, 0.36, z + 0.02 + Math.sin(a) * 0.17];
          const mid: Vec3 = [x + lean + Math.cos(a) * 0.09, 0.45, z + 0.02 + Math.sin(a) * 0.09];
          N(cm.palm, tube(THREE, [[x + lean, 0.43, z + 0.02], mid, tip], 0.014, 3, false, 8));
        }
      }
    }

    // ---- Hard-rock hill: terraced mining benches (rock shell) around a carbonatite ore body.
    {
      const benches: [number, number][] = [
        [1.15, 0.0],
        [0.98, 0.14],
        [0.8, 0.28],
        [0.62, 0.42],
        [0.44, 0.56],
      ];
      const shell: Vec2[] = [[0.001, 0.7]];
      for (let i = benches.length - 1; i >= 0; i--) {
        const [r, y] = benches[i];
        const top = i === benches.length - 1 ? 0.7 : benches[i + 1][1];
        shell.push([r - 0.06, top]);
        shell.push([r, top - 0.02]);
        shell.push([r + 0.02, y]);
      }
      const hill = lathe(THREE, shell, 9);
      hill.scale(1.05 * HILL.k, 1, 0.82 * HILL.k);
      hill.rotateY(0.3);
      hill.translate(HILL.x, 0, HILL.z);
      mineG.add(new THREE.Mesh(hill, mineMats.rock));
      // Scrubby green cap on the hilltop.
      mineG.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.4, 0.04, 9).scale(1.05 * HILL.k, 1, 0.82 * HILL.k).rotateY(0.3).translate(HILL.x, 0.7, HILL.z),
          mineMats.rockTop
        )
      );
      // Ore body: an irregular carbonatite plug inside the hill.
      const ore = new THREE.IcosahedronGeometry(0.42, 1);
      const p = ore.getAttribute("position") as T.BufferAttribute;
      const rnd = mulberry(5);
      for (let i = 0; i < p.count; i++) {
        const k = 0.85 + rnd() * 0.25;
        p.setXYZ(i, p.getX(i) * k * 1.1 * HILL.k, p.getY(i) * k * 0.75, p.getZ(i) * k * 0.85 * HILL.k);
      }
      ore.computeVertexNormals();
      ore.translate(HILL.x + 0.05, 0.3, HILL.z + 0.02);
      mineG.add(new THREE.Mesh(ore, mineMats.carbonatite));
      // Haul truck + drill rig on the benches.
      const Q = place(N, HILL.x + 0.62, 0.14, HILL.z + 0.34, -0.6);
      Q(mineMats.yellow, rb(0.2, 0.08, 0.12, 0.012, 0, 0.04, 0));
      Q(mineMats.orange, bx(0.12, 0.05, 0.11, -0.03, 0.12, 0));
      for (const tx of [-0.06, 0.07]) for (const tz of [-0.065, 0.065]) Q(mineMats.tyre, cylZ(0.035, 0.03, tx, 0.035, tz, 10));
      const D = place(N, HILL.x - 0.44, 0.42, HILL.z + 0.22, 0.4);
      D(mineMats.orange, rb(0.1, 0.05, 0.08, 0.01, 0, 0.0, 0));
      D(mineMats.steel, bx(0.015, 0.28, 0.015, 0.04, 0.05, 0));
    }
  }

  // ============================================================ END USES (layer 0)
  {
    // Display deck.
    U(um.deck, rb(1.72, 0.03, 4.3, 0.03, 3.35, 0.0, 1.13));

    // ---- Electric car (side-on, so the silhouette reads at a glance) plugged into a charger.
    {
      const C = place(U, CAR.x, 0.03, CAR.z, 0);
      const side = (pts: Vec2[], depth: number, bevel: number) => {
        const sh = new THREE.Shape();
        sh.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]);
        sh.closePath();
        return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 }).translate(0, 0, -depth / 2);
      };
      C(um.carBody, side([[-0.46, 0.07], [0.46, 0.07], [0.47, 0.16], [0.42, 0.2], [0.2, 0.235], [0.02, 0.35], [-0.29, 0.35], [-0.44, 0.25], [-0.47, 0.18]], 0.34, 0.025));
      // Glass band: sits just proud of the body on the sides and the windscreen.
      C(um.glassDark, side([[0.185, 0.25], [0.025, 0.362], [-0.28, 0.358], [-0.43, 0.258], [-0.42, 0.245], [0.17, 0.245]], 0.394, 0));
      C(um.carBody, bb(-0.12, -0.08, 0.245, 0.36, -0.198, 0.198)); // B-pillar
      for (const x of [-0.29, 0.29])
        for (const z of [-0.19, 0.19]) {
          C(um.tyre, new THREE.TorusGeometry(0.052, 0.03, 10, 24).translate(x, 0.08, z));
          C(um.aluDark, cylZ(0.048, 0.02, x, 0.08, z * 1.04, 20));
        }
      for (const z of [-0.13, 0.13]) {
        C(um.white, bx(0.012, 0.025, 0.07, 0.475, 0.145, z));
        C(um.poleN, bx(0.012, 0.022, 0.08, -0.48, 0.18, z));
      }
      C(um.glow, bx(0.04, 0.03, 0.005, -0.36, 0.2, 0.2)); // charge port
      // Charger post and cable.
      const cx = CAR.x - 0.62,
        cz = CAR.z + 0.32;
      U(um.white, rb(0.1, 0.3, 0.08, 0.02, cx, 0.03, cz));
      U(um.glow, bx(0.06, 0.05, 0.005, cx, 0.24, cz + 0.041));
      U(um.stand, tube(THREE, [[cx + 0.05, 0.2, cz], [cx + 0.12, 0.06, cz - 0.02], [CAR.x - 0.36, 0.23, CAR.z + 0.21]], 0.01, 6, false, 20));
    }

    // ---- Its traction motor, cut open on a stand in front of the car. Built along local Y, then
    // laid along X (shaft towards the car).
    const motor = new THREE.Group();
    motor.position.set(MOTOR[0], MOTOR[1], MOTOR[2]);
    motor.rotation.z = Math.PI / 2;
    motor.scale.setScalar(MOTOR_S);
    useG.add(motor);
    const MO = putter(motor);
    const P0 = Math.PI / 2,
      PL = Math.PI * 1.5; // open quarter faces up and towards the viewer
    const ringLathe = (r0: number, r1: number, h: number, seg = 48) =>
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(r0, -h / 2),
          new THREE.Vector2(r1, -h / 2),
          new THREE.Vector2(r1, h / 2),
          new THREE.Vector2(r0, h / 2),
          new THREE.Vector2(r0, -h / 2),
        ],
        seg,
        P0,
        PL
      );
    /** Flat cap closing a lathe cut at angle phi (lathe: x = r sin(phi), z = r cos(phi)). */
    const cutCap = (r0: number, r1: number, h: number, phi: number) => {
      const g = new THREE.PlaneGeometry(r1 - r0, h);
      g.translate((r0 + r1) / 2, 0, 0);
      g.rotateY(phi - Math.PI / 2);
      return g;
    };
    MO(um.alu, ringLathe(0.43, 0.46, 0.66));
    for (const phi of [P0, P0 + PL]) MO(um.alu, cutCap(0.43, 0.46, 0.66, phi));
    for (let i = 0; i < 18; i++) {
      const phi = P0 + 0.08 + (i / 18) * (PL - 0.16);
      MO(um.aluDark, new THREE.BoxGeometry(0.03, 0.6, 0.012).translate(0.47, 0, 0).rotateY(phi - Math.PI / 2));
    }
    MO(um.aluDark, new THREE.CylinderGeometry(0.46, 0.46, 0.03, 48).translate(0, -0.345, 0));
    MO(um.aluDark, new THREE.CylinderGeometry(0.1, 0.12, 0.08, 24).translate(0, -0.4, 0));
    MO(um.lam, ringLathe(0.31, 0.43, 0.5));
    for (const phi of [P0, P0 + PL]) MO(um.lam, cutCap(0.31, 0.43, 0.5, phi));
    for (const y of [-0.28, 0.28]) MO(um.copper, new THREE.TorusGeometry(0.37, 0.035, 8, 40, PL).rotateX(Math.PI / 2).rotateY(-Math.PI / 2).translate(0, y, 0));
    for (const phi of [P0, P0 + PL])
      for (let k = 0; k < 3; k++) MO(um.copper, new THREE.BoxGeometry(0.03, 0.5, 0.004).translate(0.33 + k * 0.035, 0, 0.002).rotateY(phi - Math.PI / 2));
    MO(um.lam, ringLathe(0.05, 0.29, 0.56));
    for (const phi of [P0, P0 + PL]) MO(um.lam, cutCap(0.05, 0.29, 0.56, phi));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      for (const s of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.085, 0.565, 0.026);
        g.rotateY(s * 0.42);
        g.translate(0.225, 0, s * 0.05);
        g.rotateY(a);
        MO(um.magnet, g);
      }
      MO(i % 2 ? um.poleN : um.poleS, new THREE.BoxGeometry(0.06, 0.006, 0.05).translate(0.25, 0.283, 0).rotateY(a));
    }
    MO(um.shaft, new THREE.CylinderGeometry(0.05, 0.05, 1.05, 20).translate(0, 0.05, 0));
    MO(um.aluDark, new THREE.CylinderGeometry(0.07, 0.07, 0.04, 6).translate(0, 0.56, 0));
    // Stand: plinth and two saddles.
    {
      const [mx, my, mz] = MOTOR;
      const r = 0.47 * MOTOR_S;
      U(um.stand, rb(0.4, 0.05, 0.32, 0.015, mx, 0.03, mz));
      for (const dx of [-0.09, 0.09]) U(um.stand, bb(mx + dx - 0.015, mx + dx + 0.015, 0.08, my - r * 0.75, mz - 0.07, mz + 0.07));
      U(um.glow, bb(mx - 0.2, mx + 0.2, 0.06, 0.066, mz + 0.155, mz + 0.162));
    }

    // ---- Electric scooter with a hub motor in the rear wheel.
    {
      const S = place(U, SCOOT.x, 0.03, SCOOT.z, 0, SCOOT_S);
      const wheel = (x: number, hub: boolean) => {
        S(um.tyre, new THREE.TorusGeometry(0.085, 0.028, 10, 26).translate(x, 0.113, 0));
        S(um.aluDark, cylZ(0.06, 0.03, x, 0.113, 0, 20));
        if (hub) {
          S(um.copper, cylZ(0.05, 0.05, x, 0.113, 0, 20));
          S(um.magnet, cylZ(0.056, 0.052, x, 0.113, 0, 20).scale(1, 1, 0.9));
          S(um.glow, new THREE.TorusGeometry(0.058, 0.006, 6, 24).translate(x, 0.113, 0.03));
        }
      };
      wheel(-0.2, true);
      wheel(0.22, false);
      S(um.scooter, rb(0.3, 0.035, 0.12, 0.015, 0.0, 0.07, 0)); // floorboard
      S(um.scooter, rb(0.2, 0.13, 0.13, 0.04, -0.13, 0.1, 0)); // rear body
      S(um.seat, rb(0.2, 0.03, 0.1, 0.015, -0.12, 0.23, 0));
      S(um.scooter, bar(THREE, [0.15, 0.09, 0], [0.22, 0.36, 0], 0.03, 10)); // apron / steering column
      S(um.scooter, rb(0.08, 0.06, 0.1, 0.02, 0.22, 0.16, 0)); // front mudguard / apron
      S(um.aluDark, bar(THREE, [0.22, 0.11, 0], [0.24, 0.36, 0], 0.012, 8));
      S(um.aluDark, bar(THREE, [0.23, 0.38, -0.11], [0.23, 0.38, 0.11], 0.01, 8));
      S(um.white, bx(0.03, 0.03, 0.06, 0.25, 0.33, 0));
      S(um.poleN, bx(0.01, 0.02, 0.05, -0.235, 0.18, 0));
    }

    // ---- Fighter jet on a display stand: rare-earth magnets sit in the actuators that move its
    // control surfaces (highlighted yellow on the wing trailing edges) and in its radar.
    {
      const m = new THREE.Group();
      m.position.set(JET.x, JET.y, JET.z);
      m.rotation.set(0, JET.yaw, JET.pitch);
      useG.add(m);
      const J = putter(m);
      const fus = lathe(
        THREE,
        [
          [0.001, -0.55],
          [0.045, -0.54],
          [0.055, -0.45],
          [0.062, -0.1],
          [0.06, 0.15],
          [0.05, 0.3],
          [0.035, 0.4],
        ],
        24
      ).rotateZ(-Math.PI / 2);
      J(um.jet, fus);
      J(um.nose, lathe(THREE, [[0.036, 0.39], [0.025, 0.47], [0.012, 0.53], [0.001, 0.57]], 24).rotateZ(-Math.PI / 2));
      J(um.stand, cylX(0.038, 0.05, -0.56, 0, 0, 16)); // nozzle
      J(um.glassDark, new THREE.SphereGeometry(0.05, 16, 10).scale(2.6, 0.9, 0.8).translate(0.2, 0.045, 0));
      for (const s of [-1, 1]) {
        // Delta wing, root to tip.
        J(
          um.jet,
          liftingSurface(
            THREE,
            [
              { le: [0.22, -0.005, s * 0.05], chord: 0.64, t: 0.05 },
              { le: [-0.05, -0.005, s * 0.24], chord: 0.33, t: 0.05 },
              { le: [-0.22, -0.005, s * 0.4], chord: 0.13, t: 0.05 },
            ],
            [0, 1, 0],
            12
          )
        );
        // Elevons (the surfaces magnet actuators move) and the actuator fairings under the wing.
        J(um.actuator, bx(0.07, 0.018, 0.29, -0.395, -0.012, s * 0.215));
        J(um.magnet, cylX(0.014, 0.1, -0.33, -0.022, s * 0.16, 10));
        J(um.magnet, cylX(0.014, 0.1, -0.33, -0.022, s * 0.28, 10));
        // Air intakes.
        J(um.aluDark, bx(0.17, 0.06, 0.035, 0.035, -0.04, s * 0.072));
      }
      // Fin.
      J(
        um.jet,
        liftingSurface(
          THREE,
          [
            { le: [-0.24, 0.04, 0], chord: 0.3, t: 0.06 },
            { le: [-0.42, 0.3, 0], chord: 0.11, t: 0.06 },
          ],
          [0, 0, 1],
          10
        )
      );
      J(um.actuator, bb(-0.55, -0.5, 0.06, 0.26, -0.006, 0.006)); // rudder
      // Display stand.
      U(um.stand, rb(0.36, 0.04, 0.36, 0.02, JET.x, 0.03, JET.z));
      U(um.stand, cyl(0.022, JET.y - 0.1, JET.x, 0.07, JET.z, 12));
      U(um.glow, new THREE.TorusGeometry(0.17, 0.005, 6, 32).rotateX(Math.PI / 2).translate(JET.x, 0.072, JET.z));
    }

    // ---- Direct-drive wind turbine: a ring generator lined with magnets sits between the hub
    // and the nacelle (shown through a cutaway in its cover).
    // It has its own materials ("wind" bucket): the tower is the tallest thing on the plinth, so it
    // stays readable context when you go inside rather than ghosting with the other end uses.
    {
      const wm = Object.fromEntries(
        (["stand", "white", "turbineGrey", "lam", "magnet", "glow", "blade", "poleN"] as const).map((k) => [k, L.add("wind", um[k].clone())])
      ) as Pick<typeof um, "stand" | "white" | "turbineGrey" | "lam" | "magnet" | "glow" | "blade" | "poleN">;
      const { x, z, h } = WIND;
      U(wm.stand, cyl(0.24, 0.05, x, 0, z, 24));
      const tower = lathe(
        THREE,
        [
          [0.001, 0],
          [0.11, 0],
          [0.1, h * 0.5],
          [0.065, h],
          [0.001, h],
        ],
        24
      ).translate(x, 0.05, z);
      U(wm.white, tower);
      U(wm.turbineGrey, cyl(0.112, 0.06, x, 0.05, z, 24));
      const ny = h + 0.12;
      U(wm.white, rb(0.2, 0.17, 0.44, 0.06, x, ny - 0.085, z - 0.1));
      U(wm.turbineGrey, new THREE.CylinderGeometry(0.19, 0.19, 0.1, 40, 1, true, Math.PI * 1.25, Math.PI * 1.5).rotateX(Math.PI / 2).translate(x, ny, z + 0.18));
      U(wm.lam, cylZ(0.14, 0.1, x, ny, z + 0.18, 36));
      const nMag = 28;
      const mg = new THREE.BoxGeometry(0.028, 0.02, 0.09);
      const im = new THREE.InstancedMesh(mg, wm.magnet, nMag);
      const o = new THREE.Object3D();
      for (let i = 0; i < nMag; i++) {
        const a = (i / nMag) * Math.PI * 2;
        o.position.set(x + Math.cos(a) * 0.16, ny + Math.sin(a) * 0.16, z + 0.18);
        o.rotation.set(0, 0, a + Math.PI / 2);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      }
      useG.add(im);
      U(wm.glow, new THREE.TorusGeometry(0.19, 0.006, 6, 40).translate(x, ny, z + 0.235));
      U(wm.white, lathe(THREE, [[0.001, 0], [0.085, 0.0], [0.08, 0.06], [0.045, 0.13], [0.001, 0.16]], 24).rotateX(Math.PI / 2).translate(x, ny, z + 0.24));
      const blade = liftingSurface(
        THREE,
        [
          { le: [0.07, 0.06, 0], chord: 0.17, t: 0.3 },
          { le: [0.09, 0.22, 0], chord: 0.2, t: 0.2 },
          { le: [0.065, 0.65, 0], chord: 0.12, t: 0.14 },
          { le: [0.035, 1.15, 0], chord: 0.05, t: 0.1 },
        ],
        [0, 0, 1],
        12
      );
      for (let k = 0; k < 3; k++) {
        const g = blade.clone().rotateY(0.3).rotateZ((k / 3) * Math.PI * 2);
        g.translate(x, ny, z + 0.3);
        U(wm.blade, g);
      }
      U(wm.poleN, cyl(0.067, 0.04, x, h * 0.62, z, 20)); // aviation-marking band
    }
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
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusMag = focus([mm.white, mm.ss], 0x2e86ab);
  const focusRef = focus([rm.white, rm.ss], 0x9c6b30);
  const floorMag = focus([baseMats.magFloor], 0x2e86ab);
  const floorRef = focus([baseMats.refFloor], 0xd96c2b);
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      peel(peels.mag, a);
      peel(peels.ref, b);
      // Products: solid on the outer layer, ghosted context once you go inside.
      L.set("use", lerp(1, 0.22, ease(a)));
      L.set("wind", lerp(1, 0.72, ease(a)));
      L.set("trees", lerp(1, 0.4, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("magEq", lerp(1, 0.2, ease(b)));
      L.set("refEq", lerp(1, 0.25, ease(c)));
      // Mines: context while you are in the plants, full again (and opened up) at layer 3.
      const mineK = lerp(lerp(1, 0.45, ease(a)), 1, ease(c));
      L.set("mine", mineK);
      L.set("ore", mineK);
      L.set("over", lerp(mineK, 0.16, ease(c)));
      // The opened plant's equipment and floor light up, so each layer reads from the overview.
      focusMag(tri(v, 1) * 0.22);
      focusRef(tri(v, 2) * 0.22);
      floorMag(tri(v, 1) * 0.35);
      floorRef(tri(v, 2) * 0.3);
    },
  };
}
