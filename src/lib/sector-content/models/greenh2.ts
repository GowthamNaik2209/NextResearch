// Green Hydrogen Mission: a miniature coastal green-hydrogen hub on a display plinth - the kind
// of SIGHT-backed project (Kandla, Paradip, Kakinada) where renewable power is split into
// hydrogen, turned into ammonia and either used next door or shipped out.
//
// Plan (+X east, +Z south/front; the overview camera looks in from the SE):
//   · Back row - the offtakers at the edge: a green-ammonia plant in the west (air-separation
//     cold box, Haber-Bosch converter, prilling tower with its conveyor to a barrel-vault urea
//     store, a domed ammonia tank), a refinery column cluster in the middle (four distillation
//     columns, fired heater, floating-roof tanks, a flare) and a green-steel mill in the east (a
//     framed hydrogen-DRI shaft furnace, an EAF melt shop with electrodes through the roof,
//     baghouse and a coil yard).
//   · Middle row - the hydrogen plant: an electrolyser hall (two rows of filter-press stacks with
//     gas separators and rectifier cabinets), water treatment to the west (clarifiers, RO skid,
//     demin tanks), a compressor canopy to the east and the producer's control building.
//   · Renewable power, kept compact as context: a solar field at the front left, two wind
//     turbines on the west edge (rotors turn) and a small substation feeding the hall.
//   · Storage & transport: ammonia spheres and hydrogen bullets in a bund, the pipe rack that
//     carries hydrogen and ammonia to every offtaker, a tube trailer on the road, and a pipeline
//     out to an export jetty with loading arms and an ammonia carrier at the berth.
//
// Layers (outside -> inside): 0 Offtake & Demand (the offtakers solid, the hall closed),
// 1 Hydrogen Plant (offtakers ghost; the hall's walls section down and its roof lifts away),
// 2 Renewable Power (plant ghosts; solar, wind and substation come forward again),
// 3 Storage & Transport (spheres, pipe rack, jetty and tanker come forward; the rest ghosts).
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

// ------------------------------------------------------------ site plan (shared by anchors)
const PX = 4.75,
  PZ = 3.25,
  PR = 0.45;
const HALL = { x0: -1.9, x1: 1.1, z0: -0.95, z1: 0.75, h: 0.62 };
const PRILL = { x: -3.95, z: -2.45, r: 0.2, h: 1.7 };
const DRI = { x: 1.8, z: -2.35, h: 1.45 };
const CTRL = { x0: 1.35, x1: 2.15, z0: -1.05, z1: -0.55, h: 0.3 };
const STACK_X = [-1.5, -0.95, -0.4, 0.15, 0.7];
const STACK_Z = [-0.42, 0.28];
const SPHERES: Vec2[] = [
  [3.2, -0.4],
  [4.05, -0.4],
];
const SPH_R = 0.34;
const JETTY = { x: 2.3, z0: 1.9, z1: 2.3 };
const SHIP = { x0: 0.95, x1: 3.65, z: 2.76, b: 0.21 };
const TURBINES: { x: number; z: number; h: number }[] = [
  { x: -4.15, z: -0.75, h: 1.8 },
  { x: -4.2, z: 0.6, h: 1.65 },
];

// zone id -> 3D marker position + which rail its callout sits on. Within a rail, callouts stack in
// the order the zones are listed in the sector def (ammonia, refineries, steel, producers,
// electrolysers, bop, power, transport), which follows the screen top -> bottom from the overview.
export const GREENH2_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: offtake & demand
  ammonia: { pos: [PRILL.x, PRILL.h + 0.08, PRILL.z + 0.12], side: "left" }, // prilling tower head house
  refineries: { pos: [-0.5, 1.15, -2.31], side: "top" }, // tallest distillation column
  steel: { pos: [DRI.x - 0.3, DRI.h * 0.6, DRI.z + 0.3], side: "right" }, // top-gas duct on the hydrogen-DRI shaft furnace
  // layer 1: hydrogen plant
  producers: { pos: [1.75, 0.43, -0.8], side: "right" }, // producer's control building sign
  electrolysers: { pos: [-0.95, 0.21, 0.3], side: "left" }, // electrolyser stack
  bop: { pos: [2.15, 0.22, 0.25], side: "right" }, // hydrogen compressor skid
  // layer 2: renewable power
  power: { pos: [-1.98, 0.14, 2.65], side: "left" }, // solar field, front row
  // layer 3: storage & transport
  transport: { pos: [JETTY.x, 0.44, JETTY.z1 + 0.06], side: "bottom" }, // jetty loading arms
};

export const GREENH2_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.3, 0.05],
    narration:
      "Welcome to a green hydrogen hub. Sun and wind power an electrolyser plant that splits water into hydrogen; the hydrogen goes to an ammonia plant, a refinery and a steel mill at the back, or is turned into ammonia and shipped from the jetty. Peel it layer by layer, from the buyers at the edge to the tanks and pipes at the core.",
  },
  {
    id: "offtake",
    label: "Offtakers",
    pos: [0.1, 12.1, 5.6],
    target: [-0.4, 0.5, -2.2],
    narration:
      "The buyers. On the left, a green-ammonia plant with its tall prilling tower and urea store, the kind of offtake fertiliser makers like Chambal, Paradeep and RCF are tendering for. In the middle, refinery columns where IOC, BPCL, HPCL and Reliance swap grey hydrogen for green; on the right, a steel mill whose shaft furnace uses hydrogen instead of coal.",
  },
  {
    id: "plant",
    layer: 1,
    label: "Hydrogen Plant",
    pos: [2.6, 4.8, 6.0],
    target: [-0.25, 0.15, -0.1],
    narration:
      "The hydrogen plant. Inside the hall, two rows of electrolyser stacks split purified water into hydrogen and oxygen, with gas separators behind each stack and rectifiers along the wall; L&T, Ohmium and Thermax make them in India. Water treatment sits to the west, compressors to the east, and the control building belongs to a SIGHT-backed producer such as ACME, Adani or NTPC Green.",
  },
  {
    id: "power",
    layer: 2,
    label: "Renewable Power",
    pos: [0.6, 4.0, 6.6],
    target: [-2.4, 0.5, 0.85],
    narration:
      "Green hydrogen needs round-the-clock renewable power. A solar field and wind turbines feed the plant through a small substation; developers like NTPC Green, Adani Green, ACME and JSW Energy pair the two so the electrolysers run day and night.",
  },
  {
    id: "export",
    layer: 3,
    label: "Storage & Export",
    pos: [6.6, 3.8, 6.9],
    target: [2.6, 0.3, 1.15],
    narration:
      "Storage and transport. Hydrogen is held in bullets and ammonia in spheres, and a colour-coded pipe rack carries both to the offtakers. A pipeline runs out to the jetty, where loading arms fill an ammonia carrier for export through ports like Deendayal and Paradip.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the offtakers along the back, the electrolyser hall in the middle with water treatment, compressors and storage on either side, and the solar field, substation and export jetty along the front.",
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

export function buildGreenh2(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [offG, plantG, powerG, storeG] = ctx.layerGroups;
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
  const dome = (r: number, x: number, y: number, z: number, k = 1, seg = 20) =>
    new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, k, 1).translate(x, y, z);
  const sphere = (r: number, x: number, y: number, z: number, seg = 28) => {
    const pts: Vec2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * Math.PI;
      pts.push([Math.max(0.0005, Math.sin(t) * r), -Math.cos(t) * r]);
    }
    return lathe(THREE, pts, seg).translate(x, y, z);
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** Instanced copies of one geometry (one draw call). */
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: { p: Vec3; ry?: number; rx?: number; s?: Vec3 }[]) => {
    if (!items.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(it.rx ?? 0, it.ry ?? 0, 0);
      o.scale.set(...(it.s ?? ([1, 1, 1] as Vec3)));
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    parent.add(im);
    return im;
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const t = canvasTexture(THREE, w, h, draw);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  // ------------------------------------------------------------ textures
  const groundTex = canvasTexture(THREE, 1024, 704, (g, w, h) => {
    const X = (x: number) => ((x + PX) / (2 * PX)) * w;
    const Z = (z: number) => ((z + PZ) / (2 * PZ)) * h;
    const s = w / (2 * PX);
    const rect = (x0: number, x1: number, z0: number, z1: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s);
    };
    const rnd = mulberry(7);
    const speckle = (x0: number, x1: number, z0: number, z1: number, n: number, a = 0.06) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${a * (0.5 + rnd())})`;
        g.fillRect(X(x0) + rnd() * (x1 - x0) * s, Z(z0) + rnd() * (z1 - z0) * s, 2, 2);
      }
    };
    // Site earth, then lawns and verges.
    rect(-PX, PX, -PZ, PZ, "#cbc4ad");
    speckle(-PX, PX, -PZ, PZ, 3000);
    rect(-PX, -3.35, -1.1, 0.95, "#8ba66c"); // turbine meadow
    rect(-PX, PX, -PZ, -3.08, "#8ba66c"); // back verge
    rect(4.45, PX, -1.1, 1.9, "#8ba66c");
    speckle(-PX, -3.35, -1.1, 0.95, 400, 0.09);
    // Industrial pads for the offtakers and the plant.
    rect(-4.5, -1.95, -3.05, -1.45, "#bdbcb4");
    rect(-1.75, 1.05, -3.05, -1.45, "#b6b8b5");
    rect(1.25, 4.5, -3.05, -1.45, "#b0aea8");
    rect(-3.3, 2.75, -1.1, 0.88, "#c9ccc8");
    speckle(-4.5, 4.5, -3.05, 0.88, 2200, 0.05);
    // Storage bund (low wall drawn as a darker band).
    rect(2.8, 4.45, -0.88, 0.9, "#a9a79f");
    rect(2.86, 4.39, -0.82, 0.84, "#bebcb3");
    // Pipe-rack corridor.
    rect(-4.5, 4.5, -1.36, -1.14, "#a5a49c");
    // Solar field gravel with a lighter maintenance track between rows.
    rect(-4.5, -0.45, 1.28, 3.02, "#aea489");
    speckle(-4.5, -0.45, 1.28, 3.02, 900, 0.08);
    for (let r = 0; r < 5; r++) rect(-4.45, -0.5, 1.58 + r * 0.3, 1.63 + r * 0.3, "#bdb398");
    // Substation yard.
    rect(-0.3, 0.95, 1.25, 1.88, "#9fa19c");
    // Beach behind the sea.
    rect(0.2, PX, 1.86, 2.2, "#dccb9f");
    g.fillStyle = "#dccb9f";
    g.beginPath();
    g.ellipse(X(0.35), Z(2.6), 0.28 * s, 0.7 * s, 0, 0, Math.PI * 2);
    g.fill();
    // Road (asphalt with a dashed centre line) and a turning circle at its east end.
    rect(-4.6, 3.25, 0.98, 1.18, "#41464a");
    g.fillStyle = "#41464a";
    g.beginPath();
    g.arc(X(3.25), Z(1.08), 0.22 * s, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(235,235,225,0.75)";
    g.lineWidth = 2;
    g.setLineDash([10, 9]);
    g.beginPath();
    g.moveTo(X(-4.6), Z(1.08));
    g.lineTo(X(3.1), Z(1.08));
    g.stroke();
    g.setLineDash([]);
    // Spur roads into the plant and the offtakers' pads.
    rect(-0.15, 0.05, 0.75, 0.98, "#41464a");
    rect(2.65, 2.82, -1.1, 0.98, "#41464a");
  });
  groundTex.anisotropy = 8;

  const ribTex = (base: string, rib: string, pitch: number, w = 256, h = 64) =>
    tex(w, h, (g, W, H) => {
      g.fillStyle = base;
      g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += pitch) {
        g.fillStyle = rib;
        g.fillRect(x, 0, Math.max(1, pitch * 0.3), H);
      }
    });
  // Electrolyser hall façade: ribbed white cladding, a glazed band and a green base course.
  const hallTex = tex(512, 128, (g, w, h) => {
    g.fillStyle = "#eef2f0";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(0,0,0,0.08)";
      g.fillRect(x, 0, 2, h);
    }
    g.fillStyle = "#4f7287";
    g.fillRect(0, h * 0.3, w, h * 0.16);
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let x = 0; x < w; x += 32) g.fillRect(x, h * 0.3, 2, h * 0.16);
    g.fillStyle = "#1f8a5c";
    g.fillRect(0, h * 0.82, w, h * 0.18);
    g.fillStyle = "#1f8a5c";
    g.fillRect(0, 0, w, h * 0.05);
  });
  const roofTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#c9cfd2";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) {
      g.fillStyle = "rgba(0,0,0,0.07)";
      g.fillRect(0, y, w, 2);
    }
    g.fillStyle = "#7f9fb3";
    for (const x of [0.2, 0.5, 0.8]) g.fillRect(w * x - 6, h * 0.12, 12, h * 0.76);
  });
  const panelTex = canvasTexture(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = "#1a2a4d";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(170,190,220,0.35)";
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y <= h; y += h / 6) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = "rgba(210,220,235,0.9)";
    g.lineWidth = 3;
    for (let x = 0; x <= w; x += w / 6) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    g.strokeRect(1, 1, w - 2, h - 2);
  });
  // Filter-press stack: alternating cell frames along its length.
  const stackTex = tex(32, 64, (g, w, h) => {
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = (y / 4) % 2 ? "#3b444d" : "#8d99a4";
      g.fillRect(0, y, w, 4);
    }
  });
  const signTex = canvasTexture(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = "#1f8a5c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.font = "bold 76px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("GREEN H₂", w / 2, h / 2 + 4);
  });
  const floorTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#d3dbd7";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.07)";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1);
    g.fillStyle = "rgba(226,179,58,0.8)";
    g.fillRect(0, h * 0.47, w, 4);
  });
  floorTex.repeat.set(4, 2);

  // ------------------------------------------------------------ materials
  const base = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.93, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fae8f, emissiveIntensity: 0.35 })),
    sea: L.add("base", std(0x25799e, 0.25, 0.12, { opacity: 0.9, envMapIntensity: 1.2 })),
    foam: L.add("base", std(0xf4f7f8, 0, 0.6, { opacity: 0.85 })),
  };
  const trees = {
    canopy: L.add("trees", std(0x55803f, 0, 0.9, { flatShading: true })),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
  };
  // Layer 0: offtakers.
  const om = {
    concrete: L.add("off", std(0xffffff, 0.02, 0.85, { map: ribTex("#c9c6bd", "rgba(0,0,0,0.1)", 16) })),
    white: L.add("off", std(0xeef1f3, 0.12, 0.4)),
    ss: L.add("off", std(0xc9d0d6, 0.85, 0.28)),
    grey: L.add("off", std(0x8d97a1, 0.5, 0.45)),
    dark: L.add("off", std(0x2e343b, 0.45, 0.5)),
    steel: L.add("off", std(0x5c6b7a, 0.6, 0.45)),
    blue: L.add("off", std(0x2f6fd0, 0.3, 0.4)),
    green: L.add("off", std(0x2f8f5b, 0.25, 0.5)),
    red: L.add("off", std(0xb8452f, 0.3, 0.5)),
    rust: L.add("off", std(0x7a4a36, 0.4, 0.6)),
    shed: L.add("off", std(0xffffff, 0.4, 0.5, { map: ribTex("#8f979e", "rgba(0,0,0,0.18)", 10) })),
    shedRoof: L.add("off", std(0x5f7383, 0.5, 0.45)),
    shedEnd: L.add("off", std(0x8f979e, 0.4, 0.5, { side: DS })),
    vault: L.add("off", std(0xffffff, 0.2, 0.6, { map: ribTex("#d5d9d2", "rgba(0,0,0,0.12)", 12), side: DS })),
    yellow: L.add("off", std(0xe2b33a, 0.35, 0.45)),
    grate: L.add("off", std(0x6d7780, 0.6, 0.5)),
    coil: L.add("off", std(0x9aa4ad, 0.9, 0.3)),
    hot: L.add("off", std(0x331100, 0, 0.5, { emissive: 0xff7a2a, emissiveIntensity: 1.4 })),
    flame: L.add("off", new THREE.MeshBasicMaterial({ color: 0xffa040, opacity: 0.9 })),
  };
  // Layer 1: the hall shell peels; the equipment inside and around it is "plant".
  const hm = {
    wall: L.add("hallWall", std(0xffffff, 0.1, 0.55, { map: hallTex })),
    roof: L.add("hallRoof", std(0xffffff, 0.15, 0.7, { map: roofTex })),
    roofUnit: L.add("hallRoof", std(0xb9c0c5, 0.4, 0.45)),
    coping: L.add("hallRoof", std(0xe6eaec, 0.15, 0.5)),
  };
  const pm = {
    floor: L.add("plant", std(0xffffff, 0.05, 0.6, { map: floorTex })),
    dado: L.add("plant", std(0x3c464f, 0.3, 0.6)),
    white: L.add("plant", std(0xeef1f3, 0.12, 0.38)),
    ss: L.add("plant", std(0xc9d0d6, 0.88, 0.24)),
    grey: L.add("plant", std(0x8d97a1, 0.5, 0.42)),
    dark: L.add("plant", std(0x2e343b, 0.45, 0.45)),
    stack: L.add("plant", std(0xffffff, 0.5, 0.45, { map: stackTex })),
    endPlate: L.add("plant", std(0x2f6fd0, 0.4, 0.38)),
    o2: L.add("plant", std(0x8fc3e6, 0.3, 0.4)),
    green: L.add("plant", std(0x1f8a5c, 0.25, 0.45)),
    yellow: L.add("plant", std(0xe2b33a, 0.35, 0.45)),
    water: L.add("plant", std(0x3d8fb0, 0.2, 0.1, { opacity: 0.92 })),
    concrete: L.add("plant", std(0xc4c2ba, 0.02, 0.85)),
    canopy: L.add("plant", std(0xdfe4e6, 0.35, 0.5, { side: DS })),
    screen: L.add("plant", std(0x000000, 0, 0.4, { emissive: 0x6fe3b0, emissiveIntensity: 1.1 })),
    glass: L.add("plant", std(0x5d8296, 0.6, 0.12)),
    sign: L.add("plant", std(0xffffff, 0.1, 0.5, { map: signTex, emissive: 0x0b3a26, emissiveIntensity: 0.4 })),
  };
  // Layer 2: renewable power.
  const wm = {
    panel: L.add("power", std(0xffffff, 0.55, 0.22, { map: panelTex })),
    frame: L.add("power", std(0xb4bcc4, 0.8, 0.35)),
    white: L.add("power", std(0xeef1f3, 0.15, 0.45)),
    grey: L.add("power", std(0x8d97a1, 0.5, 0.42)),
    dark: L.add("power", std(0x2e343b, 0.45, 0.45)),
    porcelain: L.add("power", std(0x8a5a3c, 0.1, 0.4)),
    wire: L.add("power", std(0x4a5258, 0.6, 0.5)),
    tower: L.add("wind", std(0xf1f3f5, 0.15, 0.4)),
    blade: L.add("wind", std(0xe9edf0, 0.2, 0.35, { side: DS })),
    band: L.add("wind", std(0xc23b32, 0.3, 0.5)),
  };
  // Layer 3: storage & transport.
  const sm = {
    sphere: L.add("store", std(0xf2f4f5, 0.25, 0.32)),
    band: L.add("store", std(0x8b6fc4, 0.3, 0.45)),
    steel: L.add("store", std(0x5c6b7a, 0.6, 0.45)),
    grey: L.add("store", std(0x8d97a1, 0.5, 0.42)),
    dark: L.add("store", std(0x2e343b, 0.45, 0.45)),
    concrete: L.add("store", std(0xb7b5ad, 0.02, 0.85)),
    h2: L.add("store", std(0x2fae8f, 0.4, 0.35)),
    nh3: L.add("store", std(0x8b6fc4, 0.4, 0.38)),
    pipe: L.add("store", std(0xa7b0b8, 0.75, 0.3)),
    yellow: L.add("store", std(0xe2b33a, 0.35, 0.42)),
    hullRed: L.add("store", std(0xa8352b, 0.3, 0.55)),
    hull: L.add("store", std(0x24384f, 0.45, 0.4)),
    deck: L.add("store", std(0x5b7a5f, 0.3, 0.6)),
    white: L.add("store", std(0xf1f3f5, 0.12, 0.42)),
    glassDark: L.add("store", std(0x1a2430, 0.7, 0.1)),
    tyre: L.add("store", std(0x17181a, 0.1, 0.85)),
    cab: L.add("store", std(0x2b62c4, 0.45, 0.32)),
  };

  const O = putter(offG),
    P = putter(plantG),
    W = putter(powerG),
    S = putter(storeG);

  // ============================================================ PLINTH + GROUND + SEA
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
    ctx.staticGroup.add(new THREE.Mesh(gg, base.ground));
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    ctx.staticGroup.add(new THREE.Mesh(pl, base.plinth));
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    ctx.staticGroup.add(new THREE.Mesh(lip, base.lip));

    // Sea across the front-east corner (shape y = -world z, so rotateX(-90deg) lays it flat).
    const sea = new THREE.Shape();
    const m = (x: number, z: number) => [x, -z] as const;
    sea.moveTo(...m(0.3, PZ - 0.02));
    sea.lineTo(...m(0.3, 2.45));
    sea.quadraticCurveTo(...m(0.32, 2.08), ...m(0.85, 2.04));
    sea.lineTo(...m(PX - 0.02, 1.98));
    sea.lineTo(...m(PX - 0.02, PZ - PR));
    sea.quadraticCurveTo(...m(PX - 0.02, PZ - 0.02), ...m(PX - PR, PZ - 0.02));
    sea.closePath();
    const seaG = new THREE.ShapeGeometry(sea, 16).rotateX(-Math.PI / 2).translate(0, 0.012, 0);
    ctx.staticGroup.add(new THREE.Mesh(seaG, base.sea));
    const surf: Vec3[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      surf.push([lerp(0.9, PX - 0.06, t), 0.016, 2.07 + Math.sin(t * 11) * 0.015]);
    }
    ctx.staticGroup.add(new THREE.Mesh(tube(THREE, surf, 0.01, 5, false, 60), base.foam));
  }

  // Trees: one draw call for canopies, one for trunks.
  {
    const rnd = mulberry(21);
    const spots: Vec2[] = [
      [-4.5, -1.35],
      [-4.45, 1.0],
      [-3.55, 0.95],
      [-4.5, 2.95],
      [-0.3, 2.95],
      [1.25, -0.4],
      [2.35, -0.95],
      [2.45, -0.62],
      [4.55, -1.0],
      [4.58, -0.2],
      [4.58, 0.6],
      [4.55, 1.4],
      [-2.0, -1.05],
      [1.2, 1.55],
      [1.55, 1.7],
      [-3.2, -3.15],
      [0.2, -3.15],
      [3.6, -3.15],
    ];
    const can: { p: Vec3; s: Vec3; ry: number }[] = [];
    const tr: { p: Vec3; s: Vec3 }[] = [];
    for (const [x, z] of spots) {
      const k = 0.8 + rnd() * 0.45;
      can.push({ p: [x, 0.16 * k, z], s: [k, k * 1.1, k], ry: rnd() * 6 });
      tr.push({ p: [x, 0, z], s: [k, k, k] });
    }
    inst(ctx.staticGroup, new THREE.IcosahedronGeometry(0.1, 1), trees.canopy, can);
    inst(ctx.staticGroup, cyl(0.014, 0.12, 0, 0, 0, 6), trees.trunk, tr);
  }

  // ============================================================ LAYER 0: OFFTAKERS
  // ---- Green ammonia plant (west): ASU cold box, converter, prilling tower, urea store, tank.
  {
    // Prilling tower: ribbed concrete shaft, head house, bottom scraper house.
    const { x, z, r, h } = PRILL;
    O(om.concrete, uvScale(cyl(r, h - 0.14, x, 0, z, 28, r * 0.94), 1, 1));
    O(om.white, bx(0.34, 0.16, 0.34, x, h - 0.14, z));
    O(om.green, bx(0.35, 0.025, 0.35, x, h - 0.03, z));
    O(om.grey, bx(0.08, 0.05, 0.08, x + 0.08, h + 0.02, z - 0.06));
    O(om.white, bx(0.36, 0.12, 0.3, x + 0.06, 0, z + 0.05));
    // Inclined conveyor gallery from the foot of the tower to the urea store.
    const g0: Vec3 = [x + 0.2, 0.1, z + 0.12],
      g1: Vec3 = [-3.15, 0.36, -1.75];
    O(om.grey, bar(THREE, g0, g1, 0.035, 4));
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const px = lerp(g0[0], g1[0], t),
        py = lerp(g0[1], g1[1], t),
        pz = lerp(g0[2], g1[2], t);
      O(om.steel, bar(THREE, [px, 0, pz], [px, py, pz], 0.01, 4));
    }
    // Barrel-vault urea store.
    const vault = new THREE.CylinderGeometry(0.24, 0.24, 1.15, 24, 1, true, -Math.PI / 2, Math.PI)
      .rotateZ(Math.PI / 2)
      .translate(-2.75, 0.0, -1.72);
    O(om.vault, uvScale(vault, 6, 1));
    O(om.concrete, bb(-3.33, -2.17, 0, 0.05, -1.97, -1.47));
    // End walls of the vault.
    for (const ex of [-3.325, -2.175]) {
      const cap = new THREE.CircleGeometry(0.24, 16, 0, Math.PI).rotateY(Math.PI / 2).translate(ex, 0, -1.72);
      O(om.white, cap);
    }
    // Air-separation cold box (nitrogen) and the Haber-Bosch converter loop.
    O(om.blue, bx(0.18, 0.95, 0.18, -3.4, 0, -2.85));
    O(om.white, cyl(0.05, 0.6, -3.6, 0, -2.85, 12));
    O(om.white, cyl(0.1, 0.8, -3.0, 0, -2.75, 20));
    O(om.white, dome(0.1, -3.0, 0.8, -2.75, 0.7));
    O(om.grey, cylX(0.06, 0.4, -3.0, 0.12, -2.45, 14)); // waste-heat exchanger
    O(om.ss, cylX(0.045, 0.32, -3.05, 0.1, -2.28, 12)); // refrigeration
    O(om.steel, bar(THREE, [-3.31, 0.7, -2.85], [-3.1, 0.7, -2.75], 0.018, 6));
    O(om.steel, bar(THREE, [-3.0, 0.45, -2.66], [-3.0, 0.2, -2.48], 0.016, 6));
    O(om.steel, bar(THREE, [-2.9, 0.12, -2.45], [-2.62, 0.12, -2.45], 0.016, 6));
    // Domed double-wall ammonia storage tank.
    O(om.white, cyl(0.32, 0.36, -2.38, 0, -2.45, 32));
    O(om.white, dome(0.32, -2.38, 0.36, -2.45, 0.28, 32));
    O(om.green, cyl(0.322, 0.025, -2.38, 0.3, -2.45, 32));
    O(om.steel, tube(THREE, Array.from({ length: 9 }, (_, i) => {
      const a = -0.3 + i * 0.16;
      return [-2.38 + Math.cos(a) * 0.335, 0.03 + i * 0.04, -2.45 + Math.sin(a) * 0.335] as Vec3;
    }), 0.008, 4));
  }
  // ---- Refinery column cluster (middle).
  {
    const cols: [number, number, number, number][] = [
      [-1.2, -2.5, 0.12, 1.15],
      [-0.85, -2.78, 0.09, 0.95],
      [-0.5, -2.45, 0.14, 1.35],
      [-0.15, -2.78, 0.08, 0.8],
    ];
    for (const [x, z, r, h] of cols) {
      O(om.ss, cyl(r, h, x, 0, z, 24));
      O(om.ss, dome(r, x, h, z, 0.6, 20));
      O(om.dark, cyl(r * 1.25, 0.06, x, 0, z, 20));
      for (let y = 0.25; y < h - 0.05; y += 0.24) {
        O(om.yellow, new THREE.TorusGeometry(r + 0.025, 0.006, 4, 24).rotateX(Math.PI / 2).translate(x, y, z));
        O(om.grate, cyl(r + 0.03, 0.008, x, y - 0.006, z, 20));
      }
      O(om.yellow, bar(THREE, [x + r + 0.02, 0.02, z + 0.03], [x + r + 0.02, h, z + 0.03], 0.005, 4)); // ladder
      // Overhead vapour line to the condenser deck.
      O(om.steel, tube(THREE, [[x, h + r * 0.55, z], [x + 0.06, h + 0.12, z + 0.02], [x + 0.18, h * 0.7, z + 0.1]], 0.018, 6));
    }
    // Fired heater with its stack.
    O(om.red, bx(0.36, 0.3, 0.28, 0.35, 0, -2.55));
    O(om.dark, bx(0.38, 0.03, 0.3, 0.35, 0.3, -2.55));
    O(om.grey, cyl(0.045, 0.9, 0.42, 0.33, -2.55, 14, 0.04));
    O(om.red, cyl(0.047, 0.04, 0.42, 1.15, -2.55, 14));
    // Floating-roof tanks.
    for (const [x, z] of [
      [-1.3, -1.82],
      [0.5, -1.85],
    ] as Vec2[]) {
      O(om.white, new THREE.CylinderGeometry(0.22, 0.22, 0.22, 32, 1, true).translate(x, 0.11, z));
      O(om.grey, cyl(0.21, 0.01, x, 0.17, z, 32));
      O(om.green, cyl(0.223, 0.02, x, 0.18, z, 32));
    }
    // Flare stack (the flame flickers, see the end of build()).
    O(om.steel, cyl(0.025, 1.3, 0.8, 0, -2.85, 10, 0.018));
    O(om.red, cyl(0.03, 0.05, 0.8, 1.25, -2.85, 10));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      O(om.steel, bar(THREE, [0.8, 0.9, -2.85], [0.8 + Math.cos(a) * 0.22, 0, -2.85 + Math.sin(a) * 0.22], 0.004, 4));
    }
    // Pipe bundle between the columns and the heater.
    for (let k = 0; k < 3; k++) O(om.steel, bar(THREE, [-1.1, 0.12 + k * 0.03, -2.15], [0.3, 0.12 + k * 0.03, -2.15], 0.012, 6));
  }
  // ---- Green steel (east): hydrogen-DRI shaft furnace, EAF melt shop, baghouse, coil yard.
  {
    const { x, z, h } = DRI;
    const hw = 0.2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) O(om.steel, bx(0.03, h, 0.03, x + sx * hw, 0, z + sz * hw));
    for (let y = 0.3; y < h; y += 0.3) O(om.grate, bx(hw * 2 + 0.04, 0.018, hw * 2 + 0.04, x, y, z));
    for (const sz of [-1, 1])
      for (let y = 0; y < h - 0.3; y += 0.3) {
        O(om.steel, bar(THREE, [x - hw, y, z + sz * hw], [x + hw, y + 0.3, z + sz * hw], 0.005, 4));
      }
    O(om.rust, cyl(0.13, h - 0.25, x, 0.08, z, 24, 0.11));
    O(om.rust, dome(0.11, x, h - 0.17, z, 0.8));
    O(om.hot, cyl(0.135, 0.04, x, 0.28, z, 24));
    // Top-gas duct down to the heater/scrubber, and the hydrogen heater box.
    O(om.grey, tube(THREE, [[x, h - 0.1, z], [x - 0.12, h + 0.02, z + 0.1], [x - 0.3, h * 0.6, z + 0.3], [x - 0.32, 0.35, z + 0.42]], 0.035, 8));
    O(om.white, bx(0.26, 0.34, 0.24, x - 0.32, 0, z + 0.48));
    O(om.grey, cyl(0.03, 0.4, x - 0.38, 0.34, z + 0.45, 10));
    // EAF melt shop: gabled shed with electrodes through the roof and a glowing door.
    const sx0 = 2.35,
      sx1 = 3.9,
      sz0 = -2.95,
      sz1 = -1.85,
      sh = 0.62,
      ridge = 0.16;
    O(om.shed, uvScale(bb(sx0, sx1, 0, sh, sz0, sz1), 4, 1));
    for (const gx of [sx0, sx1]) {
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute([gx, sh, sz0, gx, sh, sz1, gx, sh + ridge, (sz0 + sz1) / 2], 3));
      gg.computeVertexNormals();
      O(om.shedEnd, gg);
    }
    const slope = Math.atan2(ridge, (sz1 - sz0) / 2);
    const half = Math.hypot(ridge, (sz1 - sz0) / 2);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(sx1 - sx0 + 0.06, 0.018, half + 0.03);
      g.rotateX(s * slope);
      g.translate((sx0 + sx1) / 2, sh + ridge / 2 + 0.01, (sz0 + sz1) / 2 + (s * (half + 0.03)) / 2 * Math.cos(slope));
      O(om.shedRoof, g);
    }
    O(om.hot, bb(2.75, 3.0, 0.02, 0.26, sz1 + 0.002, sz1 + 0.006));
    O(om.dark, bb(2.72, 3.03, 0.26, 0.28, sz1 + 0.002, sz1 + 0.012));
    for (let k = 0; k < 3; k++) O(om.dark, cyl(0.022, 0.4, 3.25 + (k - 1) * 0.07, sh + 0.05, -2.4, 10));
    O(om.steel, bx(0.3, 0.04, 0.06, 3.25, sh + 0.42, -2.4));
    // Fume duct to the baghouse, and its stack.
    O(om.grey, tube(THREE, [[3.4, sh + ridge * 0.8, -2.4], [3.7, sh + 0.3, -2.4], [4.05, sh + 0.25, -2.4], [4.2, 0.55, -2.4]], 0.04, 8));
    O(om.white, bx(0.32, 0.4, 0.4, 4.2, 0.12, -2.4));
    for (let k = 0; k < 3; k++) O(om.grey, cyl(0.04, 0.12, 4.2, 0, -2.53 + k * 0.13, 10, 0.08));
    O(om.grey, cyl(0.05, 1.0, 4.25, 0, -2.0, 14, 0.04));
    O(om.red, cyl(0.051, 0.05, 4.25, 0.85, -2.0, 14));
    // Coil yard.
    const coil = cylX(0.05, 0.07, 0, 0.05, 0, 18);
    const coils: { p: Vec3 }[] = [];
    for (let k = 0; k < 8; k++) coils.push({ p: [2.5 + k * 0.16, 0, -1.63] });
    inst(offG, coil, om.coil, coils);
    O(om.dark, bb(2.42, 3.8, 0, 0.012, -1.71, -1.55));
  }

  // ============================================================ LAYER 1: HYDROGEN PLANT
  // Hall shell: walls section down and the roof lifts away (see applyLevel).
  const wallG = new THREE.Group();
  const roofG = new THREE.Group();
  plantG.add(wallG, roofG);
  {
    const { x0, x1, z0, z1, h } = HALL;
    const Wl = putter(wallG),
      R = putter(roofG);
    const t = 0.025;
    const w = x1 - x0;
    Wl(hm.wall, uvScale(bb(x0, x1, 0, h, z1 - t / 2, z1 + t / 2), w / 1.0, 1));
    Wl(hm.wall, uvScale(bb(x0, x1, 0, h, z0 - t / 2, z0 + t / 2), w / 1.0, 1));
    Wl(hm.wall, uvScale(bb(x0 - t / 2, x0 + t / 2, 0, h, z0, z1), 1, 1));
    Wl(hm.wall, uvScale(bb(x1 - t / 2, x1 + t / 2, 0, h, z0, z1), 1, 1));
    R(hm.roof, uvScale(bb(x0 - 0.03, x1 + 0.03, h, h + 0.035, z0 - 0.03, z1 + 0.03), 2, 1));
    R(hm.coping, bb(x0 - 0.035, x1 + 0.035, h + 0.035, h + 0.05, z1 + 0.0, z1 + 0.035));
    R(hm.coping, bb(x0 - 0.035, x1 + 0.035, h + 0.035, h + 0.05, z0 - 0.035, z0));
    for (const ux of [-1.4, -0.6, 0.2])
      R(hm.roofUnit, rb(0.3, 0.07, 0.2, 0.015, ux, h + 0.035, (z0 + z1) / 2 - 0.45));
    for (let k = 0; k < 6; k++) R(hm.roofUnit, cyl(0.03, 0.08, x0 + 0.3 + k * 0.48, h + 0.035, z1 - 0.2, 10));
    // Permanent base course and floor.
    P(pm.dado, bb(x0 - 0.02, x1 + 0.02, 0, 0.07, z1 - 0.02, z1 + 0.02));
    P(pm.dado, bb(x0 - 0.02, x1 + 0.02, 0, 0.07, z0 - 0.02, z0 + 0.02));
    P(pm.dado, bb(x0 - 0.02, x0 + 0.02, 0, 0.07, z0, z1));
    P(pm.dado, bb(x1 - 0.02, x1 + 0.02, 0, 0.07, z0, z1));
    P(pm.floor, bb(x0, x1, 0.004, 0.008, z0, z1));
  }
  // Electrolyser stacks: two rows of five, each on a skid with H2/O2 separators behind.
  {
    const body = new THREE.CylinderGeometry(0.075, 0.075, 0.34, 20, 1).rotateZ(Math.PI / 2);
    uvScale(body, 1, 6);
    const plate = cylX(0.09, 0.025, 0, 0, 0, 20);
    const sep = new THREE.CylinderGeometry(0.034, 0.034, 0.3, 14, 1).translate(0, 0.15, 0);
    const sepTop = dome(0.034, 0, 0.3, 0, 0.8, 14);
    const sepG = mergeInto(THREE, [sep, sepTop]);
    const bodies: { p: Vec3 }[] = [];
    const plates: { p: Vec3 }[] = [];
    const h2s: { p: Vec3 }[] = [];
    const o2s: { p: Vec3 }[] = [];
    for (const z of STACK_Z)
      for (const x of STACK_X) {
        bodies.push({ p: [x, 0.135, z] });
        plates.push({ p: [x - 0.18, 0.135, z] }, { p: [x + 0.18, 0.135, z] });
        P(pm.grey, bx(0.44, 0.05, 0.2, x, 0.008, z));
        const sz = z - 0.18;
        h2s.push({ p: [x - 0.08, 0.008, sz] });
        o2s.push({ p: [x + 0.08, 0.008, sz] });
        P(pm.ss, bar(THREE, [x - 0.08, 0.2, z - 0.06], [x - 0.08, 0.2, sz], 0.012, 6));
        P(pm.ss, bar(THREE, [x + 0.08, 0.2, z - 0.06], [x + 0.08, 0.2, sz], 0.012, 6));
        P(pm.ss, bar(THREE, [x - 0.08, 0.32, sz], [x - 0.08, 0.4, sz], 0.01, 6));
      }
    inst(plantG, body, pm.stack, bodies);
    inst(plantG, plate, pm.endPlate, plates);
    inst(plantG, sepG, pm.white, h2s);
    inst(plantG, sepG, pm.o2, o2s);
    // H2 headers running the length of the hall, on posts, out through the north wall.
    for (const z of STACK_Z) {
      const sz = z - 0.18;
      P(pm.green, bar(THREE, [STACK_X[0] - 0.15, 0.4, sz], [HALL.x1 - 0.05, 0.4, sz], 0.014, 8));
      for (const x of [STACK_X[0] - 0.12, 0.42]) P(pm.grey, bar(THREE, [x, 0.008, sz + 0.06], [x, 0.4, sz + 0.06], 0.008, 4));
    }
    // Rectifier and transformer cabinets along the north wall, one per back-row stack.
    for (const x of STACK_X) {
      P(pm.dark, rb(0.3, 0.26, 0.12, 0.01, x, 0.008, HALL.z0 + 0.1));
      P(pm.screen, bb(x - 0.06, x + 0.06, 0.15, 0.21, HALL.z0 + 0.161, HALL.z0 + 0.164));
    }
    // DC busbars from the cabinets over to the back-row stacks.
    for (const x of STACK_X) P(pm.yellow, bar(THREE, [x, 0.27, HALL.z0 + 0.12], [x, 0.27, STACK_Z[0] - 0.24], 0.008, 4));
    // Lye tanks and pumps at the west end of the hall.
    P(pm.white, cyl(0.07, 0.24, -1.78, 0.008, -0.6, 16));
    P(pm.white, cyl(0.07, 0.24, -1.78, 0.008, 0.45, 16));
    P(pm.grey, rb(0.1, 0.07, 0.08, 0.01, -1.78, 0.008, -0.1));
  }
  // Water treatment (west): clarifiers, RO skid, demineralised-water tanks.
  {
    for (const [x, z] of [
      [-2.9, -0.5],
      [-2.42, -0.5],
    ] as Vec2[]) {
      P(pm.concrete, new THREE.CylinderGeometry(0.21, 0.21, 0.12, 28, 1, true).translate(x, 0.06, z));
      P(pm.concrete, new THREE.TorusGeometry(0.21, 0.012, 4, 28).rotateX(Math.PI / 2).translate(x, 0.12, z));
      P(pm.water, cyl(0.205, 0.004, x, 0.1, z, 28));
      P(pm.grey, bb(x - 0.21, x + 0.21, 0.13, 0.145, z - 0.02, z + 0.02)); // bridge
      P(pm.dark, cyl(0.03, 0.04, x, 0.13, z, 10));
    }
    // RO skid: a frame with racks of white pressure vessels.
    P(pm.grey, bb(-3.1, -2.4, 0, 0.03, 0.05, 0.42));
    for (const sx of [-3.08, -2.42])
      for (const sz of [0.07, 0.4]) P(pm.grey, bb(sx - 0.01, sx + 0.01, 0.03, 0.3, sz - 0.01, sz + 0.01));
    const ro: { p: Vec3 }[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) ro.push({ p: [-2.75, 0.08 + r * 0.075, 0.1 + c * 0.085] });
    inst(plantG, cylX(0.028, 0.62, 0, 0, 0, 12), pm.white, ro);
    // Demin water tanks.
    P(pm.white, cyl(0.1, 0.32, -2.42, 0, 0.66, 20));
    P(pm.white, dome(0.1, -2.42, 0.32, 0.66, 0.4));
    P(pm.white, cyl(0.1, 0.32, -2.9, 0, 0.66, 20));
    P(pm.white, dome(0.1, -2.9, 0.32, 0.66, 0.4));
    P(pm.ss, bar(THREE, [-2.32, 0.08, 0.66], [HALL.x0 - 0.02, 0.08, 0.5], 0.012, 6));
  }
  // Compressors (east): an open canopy over three reciprocating hydrogen compressors.
  {
    const cx0 = 1.4,
      cx1 = 2.6,
      cz0 = -0.32,
      cz1 = 0.78,
      ch = 0.44;
    for (const x of [cx0 + 0.03, cx1 - 0.03]) for (const z of [cz0 + 0.03, cz1 - 0.03]) P(pm.grey, bb(x - 0.015, x + 0.015, 0, ch, z - 0.015, z + 0.015));
    P(pm.canopy, bb(cx0 - 0.02, cx1 + 0.02, ch, ch + 0.02, cz0 - 0.02, cz1 + 0.02));
    P(pm.green, bb(cx0 - 0.02, cx1 + 0.02, ch - 0.03, ch, cz1 + 0.02, cz1 + 0.025));
    for (const z of [-0.12, 0.23, 0.58]) {
      P(pm.concrete, bb(1.48, 2.52, 0, 0.03, z - 0.12, z + 0.12));
      P(pm.green, cylX(0.06, 0.22, 1.65, 0.1, z, 18)); // motor
      P(pm.dark, cylX(0.07, 0.02, 1.78, 0.1, z, 20)); // flywheel
      P(pm.grey, rb(0.2, 0.13, 0.16, 0.015, 1.92, 0.03, z)); // crankcase
      for (const x of [2.12, 2.32]) {
        P(pm.ss, cylZ(0.055, 0.2, x, 0.12, z, 16));
        P(pm.dark, cylZ(0.06, 0.02, x, 0.12, z + 0.1, 16));
        P(pm.dark, cylZ(0.06, 0.02, x, 0.12, z - 0.1, 16));
      }
      P(pm.ss, bar(THREE, [2.12, 0.18, z], [2.32, 0.18, z], 0.012, 6));
      P(pm.white, cyl(0.035, 0.2, 2.45, 0.03, z, 12)); // snubber / knock-out drum
    }
    // Feed line from the hall.
    P(pm.green, bar(THREE, [HALL.x1, 0.3, 0.1], [cx0 + 0.05, 0.3, 0.1], 0.016, 8));
    P(pm.green, bar(THREE, [cx0 + 0.05, 0.3, 0.1], [cx0 + 0.05, 0.12, 0.1], 0.016, 8));
  }
  // Producer's control building with its roof sign.
  {
    const { x0, x1, z0, z1, h } = CTRL;
    P(pm.white, rb(x1 - x0, h, z1 - z0, 0.02, (x0 + x1) / 2, 0, (z0 + z1) / 2));
    P(pm.glass, bb(x0 + 0.04, x1 - 0.04, 0.12, 0.22, z1 + 0.0, z1 + 0.006));
    P(pm.dark, bb(x0 + 0.3, x0 + 0.42, 0, 0.11, z1, z1 + 0.008));
    P(pm.green, bb(x0, x1, h - 0.03, h, z1 - 0.002, z1 + 0.004));
    const sw = 0.62,
      shh = 0.155;
    const sign = new THREE.PlaneGeometry(sw, shh).translate((x0 + x1) / 2, h + 0.03 + shh / 2, (z0 + z1) / 2 + 0.06);
    P(pm.sign, sign);
    const back = new THREE.PlaneGeometry(sw, shh).rotateY(Math.PI).translate((x0 + x1) / 2, h + 0.03 + shh / 2, (z0 + z1) / 2 + 0.058);
    P(pm.grey, back);
    for (const sx of [-0.25, 0.25]) P(pm.grey, bar(THREE, [(x0 + x1) / 2 + sx, h, (z0 + z1) / 2 + 0.055], [(x0 + x1) / 2 + sx, h + 0.04, (z0 + z1) / 2 + 0.055], 0.006, 4));
  }

  // ============================================================ LAYER 2: RENEWABLE POWER
  // Solar field: five rows of tilted tables (one instanced mesh for panels, one for legs).
  {
    const tilt = 0.42;
    const panel = new THREE.BoxGeometry(0.5, 0.008, 0.2).rotateX(tilt);
    const legs = mergeInto(THREE, [
      bx(0.012, 0.09, 0.012, -0.2, 0, -0.06),
      bx(0.012, 0.09, 0.012, 0.2, 0, -0.06),
      bx(0.012, 0.045, 0.012, -0.2, 0, 0.06),
      bx(0.012, 0.045, 0.012, 0.2, 0, 0.06),
      bx(0.44, 0.01, 0.01, 0, 0.07, -0.05),
    ]);
    const tables: { p: Vec3 }[] = [];
    const legItems: { p: Vec3 }[] = [];
    for (let r = 0; r < 5; r++) {
      const z = 1.45 + r * 0.3;
      for (let c = 0; c < 7; c++) {
        const x = -4.18 + c * 0.55;
        tables.push({ p: [x, 0.09, z] });
        legItems.push({ p: [x, 0, z] });
      }
    }
    inst(powerG, panel, wm.panel, tables);
    inst(powerG, legs, wm.frame, legItems);
    // String inverters / inverter-transformer skids between blocks.
    for (const [x, z] of [
      [-2.25, 2.95],
      [-0.6, 2.95],
    ] as Vec2[]) {
      W(wm.white, rb(0.22, 0.1, 0.12, 0.01, x, 0, z));
      W(wm.grey, bb(x - 0.11, x + 0.11, 0.1, 0.112, z - 0.06, z + 0.06));
    }
  }
  // Wind turbines (west edge); the rotors turn.
  const rotors: T.Mesh[] = [];
  {
    const yaw = Math.PI / 4; // facing SE, toward the default camera
    const blade = liftingSurface(
      THREE,
      [
        { le: [0.045, 0.04, 0], chord: 0.11, t: 0.3 },
        { le: [0.06, 0.14, 0], chord: 0.13, t: 0.2 },
        { le: [0.042, 0.45, 0], chord: 0.08, t: 0.14 },
        { le: [0.022, 0.78, 0], chord: 0.03, t: 0.1 },
      ],
      [0, 0, 1],
      12
    );
    const rotorParts: T.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) rotorParts.push(blade.clone().rotateY(0.25).rotateZ((k / 3) * Math.PI * 2));
    const rotorG = mergeInto(THREE, rotorParts);
    const spinner = lathe(THREE, [[0.001, 0], [0.05, 0.0], [0.045, 0.04], [0.02, 0.08], [0.001, 0.09]], 18).rotateX(Math.PI / 2);
    TURBINES.forEach((tb, i) => {
      const { x, z, h } = tb;
      W(wm.tower, cyl(0.12, 0.04, x, 0, z, 20));
      W(wm.tower, lathe(THREE, [[0.001, 0], [0.055, 0], [0.048, h * 0.5], [0.032, h], [0.001, h]], 18).translate(x, 0.04, z));
      W(wm.band, cyl(0.051, 0.03, x, 0.04 + h * 0.15, z, 18));
      const nac = roundedBox(THREE, 0.1, 0.09, 0.26, 0.03, 2).translate(0, 0, -0.05).rotateY(yaw).translate(x, h + 0.08, z);
      W(wm.tower, nac);
      const hub = new THREE.Vector3(0, 0, 0.09).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const hx = x + hub.x,
        hy = h + 0.08,
        hz = z + hub.z;
      W(wm.tower, spinner.clone().rotateY(yaw).translate(hx, hy, hz));
      const rotor = new THREE.Mesh(rotorG, wm.blade);
      rotor.position.set(hx, hy, hz);
      rotor.rotation.set(0, yaw, i * 1.3);
      powerG.add(rotor);
      rotors.push(rotor);
    });
    // Collector cable trench from the turbines to the substation (drawn as a low kerb).
    W(wm.dark, bb(-4.1, -0.3, 0, 0.012, 1.21, 1.24));
    W(wm.dark, bb(-4.17, -4.13, 0, 0.012, -0.6, 1.24));
  }
  // Substation: two transformers, gantries and a line into the hall.
  {
    for (const x of [0.05, 0.55]) {
      const z = 1.6;
      W(wm.grey, rb(0.26, 0.2, 0.18, 0.015, x, 0.02, z));
      for (let k = 0; k < 5; k++) W(wm.dark, bb(x - 0.12 + k * 0.06, x - 0.1 + k * 0.06, 0.04, 0.2, z + 0.09, z + 0.13)); // radiators
      for (let k = 0; k < 3; k++) W(wm.porcelain, cyl(0.012, 0.1, x - 0.07 + k * 0.07, 0.22, z - 0.03, 8));
      W(wm.dark, bb(x - 0.15, x + 0.15, 0, 0.02, z - 0.11, z + 0.15));
    }
    // Gantries and the overhead feeder north over the road into the hall's front wall.
    for (const [z, hh] of [
      [1.35, 0.5],
      [0.85, 0.5],
    ] as Vec2[]) {
      for (const x of [0.02, 0.58]) W(wm.grey, bb(x - 0.015, x + 0.015, 0, hh, z - 0.015, z + 0.015));
      W(wm.grey, bb(0.0, 0.6, hh - 0.03, hh, z - 0.015, z + 0.015));
    }
    for (let k = 0; k < 3; k++) {
      const x = 0.12 + k * 0.18;
      W(wm.wire, tube(THREE, [[x, 0.46, 1.35], [x, 0.43, 1.1], [x, 0.46, 0.85]], 0.004, 4, false, 12));
      W(wm.porcelain, cyl(0.01, 0.04, x, 0.43, 1.35, 6));
      W(wm.wire, bar(THREE, [x, 0.46, 0.85], [x, 0.4, HALL.z1 + 0.01], 0.004, 4));
    }
  }

  // ============================================================ LAYER 3: STORAGE & TRANSPORT
  // Ammonia spheres on legs, hydrogen bullets on saddles.
  {
    for (const [x, z] of SPHERES) {
      const cy = 0.5;
      S(sm.sphere, sphere(SPH_R, x, cy, z));
      S(sm.band, new THREE.TorusGeometry(SPH_R + 0.004, 0.012, 6, 40).rotateX(Math.PI / 2).translate(x, cy, z));
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const lx = x + Math.cos(a) * SPH_R,
          lz = z + Math.sin(a) * SPH_R;
        S(sm.steel, bar(THREE, [lx, 0, lz], [lx, cy, lz], 0.014, 6));
        const a2 = ((k + 1) / n) * Math.PI * 2;
        S(sm.steel, bar(THREE, [lx, 0.05, lz], [x + Math.cos(a2) * SPH_R, cy - 0.12, z + Math.sin(a2) * SPH_R], 0.005, 4));
      }
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        S(sm.concrete, cyl(0.03, 0.03, x + Math.cos(a) * SPH_R, 0, z + Math.sin(a) * SPH_R, 8));
      }
      // Spiral stair to the top platform.
      const st: Vec3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const a = 0.6 + t * Math.PI * 0.9;
        const rr = SPH_R * Math.sin(Math.acos(lerp(-0.85, 0.95, t))) + 0.03;
        st.push([x + Math.cos(a) * rr, cy + lerp(-0.85, 0.95, t) * SPH_R, z + Math.sin(a) * rr]);
      }
      S(sm.yellow, tube(THREE, st, 0.007, 4, false, 60));
      S(sm.grey, cyl(0.07, 0.02, x, cy + SPH_R - 0.005, z, 14));
    }
    // Hydrogen bullets.
    for (const z of [0.32, 0.6]) {
      S(sm.white, cylX(0.095, 1.05, 3.62, 0.15, z, 22));
      for (const ex of [3.095, 4.145]) S(sm.white, new THREE.SphereGeometry(0.095, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(ex < 3.6 ? Math.PI / 2 : -Math.PI / 2).scale(0.5, 1, 1).translate(ex, 0.15, z));
      S(sm.h2, cylX(0.097, 0.04, 3.62, 0.15, z, 22));
      for (const sx of [3.3, 3.95]) S(sm.concrete, bb(sx - 0.04, sx + 0.04, 0, 0.08, z - 0.08, z + 0.08));
    }
    // Low bund wall.
    const bund = (x0: number, x1: number, z0: number, z1: number) => S(sm.concrete, bb(x0, x1, 0, 0.04, z0, z1));
    bund(2.8, 4.45, -0.88, -0.84);
    bund(2.8, 4.45, 0.86, 0.9);
    bund(2.8, 2.84, -0.88, 0.9);
    bund(4.41, 4.45, -0.88, 0.9);
    // Compressor -> bullets; bullets -> spheres (via an ammonia line along the bund).
    S(sm.h2, bar(THREE, [2.55, 0.22, 0.45], [3.05, 0.22, 0.45], 0.014, 8));
    S(sm.h2, bar(THREE, [3.05, 0.22, 0.45], [3.05, 0.15, 0.45], 0.014, 8));
  }
  // Pipe rack along the corridor between the offtakers and the plant: hydrogen (green), ammonia
  // (violet) and a utility line, with drops to each offtaker.
  {
    const z = -1.25,
      y = 0.28,
      xa = -4.3,
      xb = 4.3;
    for (let x = xa; x <= xb + 1e-6; x += 0.43) {
      S(sm.steel, bb(x - 0.012, x + 0.012, 0, y, z - 0.09, z - 0.066));
      S(sm.steel, bb(x - 0.012, x + 0.012, 0, y, z + 0.066, z + 0.09));
      S(sm.steel, bb(x - 0.015, x + 0.015, y - 0.02, y, z - 0.1, z + 0.1));
    }
    S(sm.h2, cylX(0.02, xb - xa, 0, y + 0.02, z - 0.05, 10));
    S(sm.nh3, cylX(0.022, xb - xa, 0, y + 0.022, z, 10));
    S(sm.pipe, cylX(0.016, xb - xa, 0, y + 0.016, z + 0.05, 10));
    // Hall -> rack.
    S(sm.h2, bar(THREE, [-0.3, 0.4, HALL.z0 - 0.01], [-0.3, 0.4, z - 0.05], 0.016, 8));
    S(sm.h2, bar(THREE, [-0.3, 0.4, z - 0.05], [-0.3, y + 0.02, z - 0.05], 0.016, 8));
    // Drops to the offtakers.
    const drop = (x: number, z1: number, mat: T.Material, dz: number) => {
      S(mat, bar(THREE, [x, y + 0.02, z + dz], [x, y + 0.02, z1], 0.014, 8));
      S(mat, bar(THREE, [x, y + 0.02, z1], [x, 0.06, z1], 0.014, 8));
    };
    drop(-2.38, -2.1, sm.nh3, 0); // ammonia tank
    drop(-3.0, -2.6, sm.h2, -0.05); // ammonia converter
    drop(-0.9, -2.15, sm.h2, -0.05); // refinery hydrogen
    drop(DRI.x - 0.32, -1.75, sm.h2, -0.05); // DRI hydrogen heater
    // Spheres <-> rack.
    S(sm.nh3, bar(THREE, [3.2, y + 0.022, z], [3.2, y + 0.022, -0.82], 0.014, 8));
    S(sm.nh3, bar(THREE, [3.2, y + 0.022, -0.82], [3.2, 0.2, -0.72], 0.014, 8));
  }
  // Export pipeline on sleepers from the storage bund to the jetty.
  {
    const y = 0.06;
    const path: Vec3[] = [
      [4.05, y, 0.9],
      [4.05, y, 1.72],
      [JETTY.x, y, 1.72],
    ];
    S(sm.nh3, bar(THREE, path[0], path[1], 0.02, 8));
    S(sm.nh3, bar(THREE, path[1], path[2], 0.02, 8));
    S(sm.nh3, bar(THREE, [4.05, y, 0.9], [4.05, 0.2, 0.9], 0.02, 8));
    S(sm.nh3, bar(THREE, [4.05, 0.2, 0.9], [4.05, 0.2, -0.06], 0.016, 8));
    for (let t = 0.98; t < 1.7; t += 0.18) S(sm.concrete, bb(3.98, 4.12, 0, 0.04, t - 0.02, t + 0.02));
    for (let x = JETTY.x + 0.15; x < 4.0; x += 0.2) S(sm.concrete, bb(x - 0.02, x + 0.02, 0, 0.04, 1.65, 1.79));
    S(sm.nh3, bar(THREE, [JETTY.x, y, 1.72], [JETTY.x, 0.15, JETTY.z0], 0.02, 8));
    S(sm.nh3, bar(THREE, [JETTY.x, 0.15, JETTY.z0], [JETTY.x, 0.15, JETTY.z1], 0.02, 8));
    // Pipeline marker posts.
    for (const x of [3.1, 3.7]) {
      S(sm.yellow, cyl(0.008, 0.08, x, 0, 1.82, 6));
      S(sm.yellow, bb(x - 0.02, x + 0.02, 0.07, 0.1, 1.818, 1.822));
    }
  }
  // Export jetty: trestle, loading platform, three loading arms, mooring dolphins.
  {
    const { x, z0, z1 } = JETTY;
    const deckY = 0.12;
    S(sm.concrete, bb(x - 0.08, x + 0.08, deckY - 0.02, deckY, z0, z1));
    S(sm.concrete, bb(x - 0.4, x + 0.4, deckY - 0.025, deckY, z1, z1 + 0.18));
    const piles: { p: Vec3 }[] = [];
    for (let z = z0 + 0.08; z < z1; z += 0.12) for (const sx of [-0.06, 0.06]) piles.push({ p: [x + sx, 0, z] });
    for (const sx of [-0.35, -0.12, 0.12, 0.35]) for (const sz of [0.03, 0.15]) piles.push({ p: [x + sx, 0, z1 + sz] });
    inst(storeG, cyl(0.016, deckY - 0.02, 0, 0, 0, 8), sm.steel, piles);
    // Loading arms: riser, inner boom up and out, outer boom down to the ship's manifold.
    for (const k of [-1, 0, 1]) {
      const ax = x + k * 0.2;
      const base: Vec3 = [ax, deckY, z1 + 0.06];
      const top: Vec3 = [ax, deckY + 0.24, z1 + 0.06];
      const elbow: Vec3 = [ax, deckY + 0.34, z1 + 0.2];
      const tip: Vec3 = [ax, 0.2, SHIP.z - SHIP.b + 0.03];
      S(sm.yellow, bar(THREE, base, top, 0.016, 8));
      S(sm.yellow, bar(THREE, top, elbow, 0.011, 6));
      S(sm.yellow, bar(THREE, elbow, tip, 0.01, 6));
      S(sm.dark, new THREE.SphereGeometry(0.018, 10, 8).translate(...elbow));
      S(sm.dark, cyl(0.035, 0.03, ax, deckY + 0.24, z1 + 0.06, 12));
    }
    S(sm.white, rb(0.14, 0.1, 0.1, 0.01, x - 0.3, deckY, z1 + 0.06)); // control hut
    S(sm.yellow, bb(x - 0.4, x + 0.4, deckY, deckY + 0.004, z1 + 0.165, z1 + 0.18));
    // Mooring dolphins with catwalks.
    for (const dx of [SHIP.x0 + 0.35, SHIP.x1 - 0.3]) {
      S(sm.concrete, cyl(0.07, deckY, dx, 0, z1 + 0.12, 16));
      S(sm.dark, cyl(0.015, 0.03, dx, deckY, z1 + 0.12, 8));
      S(sm.grey, bar(THREE, [dx + (dx < x ? 0.07 : -0.07), deckY, z1 + 0.12], [x + (dx < x ? -0.4 : 0.4), deckY, z1 + 0.12], 0.008, 4));
    }
  }
  // Ammonia carrier at the berth (bow west, accommodation aft/east).
  {
    const { x0, x1, z, b } = SHIP;
    const hullShape = (inset: number) => {
      const s = new THREE.Shape();
      const B = b - inset;
      s.moveTo(x1 - inset, -B * 0.85);
      s.lineTo(x1 - 0.06, -B);
      s.lineTo(x0 + 0.5, -B);
      s.quadraticCurveTo(x0 + 0.12 + inset, -B * 0.9, x0 + inset, 0);
      s.quadraticCurveTo(x0 + 0.12 + inset, B * 0.9, x0 + 0.5, B);
      s.lineTo(x1 - 0.06, B);
      s.lineTo(x1 - inset, B * 0.85);
      s.closePath();
      return s;
    };
    const slab = (inset: number, y0: number, y1: number) =>
      new THREE.ExtrudeGeometry(hullShape(inset), { depth: y1 - y0, bevelEnabled: false, curveSegments: 10 })
        .rotateX(-Math.PI / 2)
        .translate(0, y0, z);
    S(sm.hullRed, slab(0.004, -0.02, 0.045));
    S(sm.hull, slab(0, 0.045, 0.16));
    S(sm.deck, slab(0.012, 0.16, 0.165));
    S(sm.white, bb(x0 + 0.25, x0 + 0.42, 0.165, 0.22, z - 0.1, z + 0.1)); // forecastle
    // Cargo-tank domes and the trunk-deck pipe run.
    for (let k = 0; k < 4; k++) {
      const cx = x0 + 0.62 + k * 0.42;
      S(sm.white, cyl(0.13, 0.05, cx, 0.165, z, 24));
      S(sm.white, dome(0.13, cx, 0.215, z, 0.5, 24));
      S(sm.nh3, cyl(0.03, 0.04, cx, 0.27, z, 10));
    }
    S(sm.pipe, cylX(0.012, 1.7, x0 + 1.25, 0.2, z - 0.15, 8));
    S(sm.pipe, cylX(0.012, 1.7, x0 + 1.25, 0.2, z + 0.15, 8));
    // Midship manifold (where the loading arms land) and a hose crane.
    S(sm.nh3, bb(JETTY.x - 0.26, JETTY.x + 0.26, 0.165, 0.2, z - b + 0.02, z - b + 0.06));
    S(sm.yellow, cyl(0.015, 0.2, JETTY.x - 0.32, 0.165, z - 0.1, 8));
    S(sm.yellow, bar(THREE, [JETTY.x - 0.32, 0.36, z - 0.1], [JETTY.x - 0.05, 0.3, z - 0.15], 0.007, 4));
    // Accommodation block, bridge wings and funnel.
    const ax = x1 - 0.22;
    S(sm.white, bb(ax - 0.12, ax + 0.12, 0.165, 0.38, z - 0.15, z + 0.15));
    S(sm.white, bb(ax - 0.1, ax + 0.06, 0.38, 0.44, z - 0.2, z + 0.2));
    S(sm.glassDark, bb(ax - 0.104, ax - 0.098, 0.39, 0.425, z - 0.18, z + 0.18));
    for (let k = 0; k < 3; k++) S(sm.glassDark, bb(ax - 0.124, ax - 0.12, 0.2 + k * 0.055, 0.225 + k * 0.055, z - 0.12, z + 0.12));
    S(sm.dark, bb(ax + 0.1, ax + 0.2, 0.3, 0.46, z - 0.05, z + 0.05));
    S(sm.h2, bb(ax + 0.099, ax + 0.201, 0.4, 0.43, z - 0.051, z + 0.051));
    S(sm.grey, cyl(0.006, 0.12, ax - 0.02, 0.44, z, 6)); // mast
    // Wake/foam rim along the waterline.
    S(sm.white, new THREE.TorusGeometry(1, 0.008, 4, 48).scale((x1 - x0) / 2 + 0.03, b + 0.03, 1).rotateX(Math.PI / 2).translate((x0 + x1) / 2, 0.014, z));
  }
  // Hydrogen tube trailer on the road (distribution by road to smaller buyers).
  {
    const x = 1.55,
      z = 1.08;
    S(sm.cab, rb(0.13, 0.12, 0.13, 0.02, x - 0.32, 0.035, z));
    S(sm.glassDark, bb(x - 0.39, x - 0.385, 0.1, 0.14, z - 0.05, z + 0.05));
    S(sm.dark, bb(x - 0.25, x + 0.3, 0.035, 0.05, z - 0.06, z + 0.06));
    for (const dz of [-0.035, 0.035]) for (const dy of [0.085, 0.145]) S(sm.h2, cylX(0.03, 0.5, x + 0.03, dy, z + dz, 12));
    S(sm.grey, bb(x - 0.24, x - 0.22, 0.05, 0.18, z - 0.07, z + 0.07));
    S(sm.grey, bb(x + 0.27, x + 0.3, 0.05, 0.18, z - 0.07, z + 0.07));
    const wh: { p: Vec3 }[] = [];
    for (const wx of [x - 0.34, x - 0.18, x + 0.15, x + 0.24]) for (const dz of [-0.065, 0.065]) wh.push({ p: [wx, 0.025, z + dz] });
    inst(storeG, cylZ(0.025, 0.025, 0, 0, 0, 12), sm.tyre, wh);
  }

  // ------------------------------------------------------------ flush batches
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // Flare flame (its own mesh so it can flicker).
  const flame = new THREE.Mesh(
    lathe(THREE, [[0.001, 0], [0.035, 0.03], [0.03, 0.09], [0.012, 0.15], [0.001, 0.19]], 12),
    om.flame
  );
  flame.position.set(0.8, 1.3, -2.85);
  offG.add(flame);

  // Rotors spin and the flare flickers: the engine renders on demand, so `animated` keeps it drawing.
  if (rotors.length) {
    rotors[0].onBeforeRender = () => {
      const t = performance.now() / 1000;
      rotors.forEach((r, i) => (r.rotation.z = -t * 1.1 + i * 1.3));
      const f = 1 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 7.3 + 1);
      flame.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
    };
  }

  // ------------------------------------------------------------ levels
  const ease = (x: number) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusPlant = focus([pm.white, pm.ss, pm.floor], 0x1f8a5c);
  const focusPower = focus([wm.frame, wm.white], 0xe2b33a);
  const focusStore = focus([sm.sphere, sm.white], 0x8b6fc4);
  return {
    animated: true,
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      L.set("trees", lerp(1, 0.45, ease(a)));
      // Offtakers: solid outside, ghosted context once you go in.
      L.set("off", lerp(1, 0.2, ease(a)));
      // Hall: the walls drop to the base course and fade; the roof lifts away.
      const e = ease(a);
      wallG.scale.y = lerp(1, 0.15, e);
      roofG.position.y = e * 0.6;
      L.set("hallWall", 1 - smoothstep(a, 0.1, 0.7));
      L.set("hallRoof", 1 - smoothstep(a, 0.05, 0.55));
      L.set("plant", lerp(1, 0.22, ease(b)));
      // Power: context while you are in the plant, forward at layer 2, ghosted at layer 3.
      const pk = lerp(lerp(1, 0.5, ease(a)), 1, ease(b)) * lerp(1, 0.25, ease(c));
      L.set("power", pk);
      L.set("wind", Math.max(pk, 0.4));
      // Storage & transport: dimmed context until the innermost layer.
      L.set("store", lerp(lerp(1, 0.4, ease(a)), 1, ease(c)));
      focusPlant(tri(v, 1) * 0.22);
      focusPower(tri(v, 2) * 0.3);
      focusStore(tri(v, 3) * 0.2);
    },
  };
}
