// Defence Procurement (DAC approvals): a miniature defence production &
// acceptance yard on a display plinth - the physical things a DAC approval
// eventually turns into, and the sheds where Indian industry builds them.
//
// Plan (+X east, +Z toward the default camera):
//   back-left   ordnance & materials shop (sawtooth roof) + an earth-covered
//               ammunition magazine (igloo) in front of it
//   back-centre the platform assembly hangar (barrel-vault roof, big door):
//               a delta-wing fighter and a light helicopter on the aircraft
//               line, an engine/wing jig, and a military-truck line
//   back-right  the electronics & radar lab (flat roof, rooftop plant) with an
//               outdoor surveillance-radar tower beside it
//   front       the trials & acceptance range: a test track with a
//               self-propelled howitzer, a canister missile launcher on its
//               pad, a drone pad with a quadcopter and a counter-drone vehicle,
//               and a fitting-out basin with a frigate at the jetty.
//
// Layers (contract with policies/defenceproc.ts):
//   0 Trials Range          everything closed; the range systems are the story
//   1 Assembly Hangar       hangar roof lifts away, walls ghost: aircraft,
//                           vehicle line and the engine/wing jig
//   2 Electronics Lab       lab roof lifts, walls ghost: AESA radar face on its
//                           test stand, anechoic wall, PCB benches, racks
//   3 Ordnance & Materials  shop roof lifts and the magazine mound turns
//                           translucent: shells, propellant mixer, forging
//                           press, alloy bar stock
// Range systems ghost (not hide) once you go inside, so the yard stays legible.
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  contactShadow,
  lathe,
  layerMats,
  lerp,
  mergeInto,
  railing,
  roundedBox,
  smoothstep,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// Building footprints (shared by the geometry and the anchors).
const HGR = { x0: -2.35, x1: 1.65, z0: -3.25, z1: -0.65, h: 0.78, rise: 0.62 };
const LAB = { x0: 2.05, x1: 4.65, z0: -3.2, z1: -1.35, h: 0.66 };
const ORD = { x0: -4.65, x1: -2.7, z0: -3.2, z1: -1.3, h: 0.72 };
const IGLOO = { cx: -3.75, cz: -0.3, len: 0.8, r: 0.33 };
const BASIN = { x0: 3.3, x1: 4.95, z0: -0.55, z1: 3.55 };

// zone id -> 3D marker position + which rail its callout sits on.
export const DEFENCEPROC_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0 - trials range
  missiles: { pos: [-1.0, 0.7, 2.06], side: "bottom" }, // raised missile canisters
  drones: { pos: [1.55, 0.72, 2.25], side: "bottom" }, // hovering quadcopter
  artillery: { pos: [-3.0, 0.32, 2.05], side: "bottom" }, // howitzer turret
  naval: { pos: [3.92, 0.24, 2.3], side: "bottom" }, // frigate forward gun
  // layer 1 - assembly hangar
  aircraft: { pos: [-1.35, 0.3, -2.45], side: "top" }, // fighter canopy
  vehicles: { pos: [0.1, 0.32, -1.2], side: "top" }, // truck line
  aerostructures: { pos: [1.15, 0.32, -2.6], side: "right" }, // engine on cradle
  // layer 2 - electronics lab
  radars_ew: { pos: [2.62, 0.5, -2.45], side: "top" }, // AESA radar face
  subsystems: { pos: [3.95, 0.22, -1.95], side: "right" }, // PCB benches
  // layer 3 - ordnance & materials
  // Both sit at the shop's far (west) side or out in front of it, well clear of the hangar.
  ammunition: { pos: [-3.75, 0.2, -0.35], side: "left" }, // shells stacked in the earth-covered magazine
  materials: { pos: [-4.15, 0.16, -1.55], side: "left" }, // special-alloy bar stock
};

// `layer` (optional): a view about one layer also peels the model to it.
export const DEFENCEPROC_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    // Steeper than a street-level view and aimed at the model's visual centre, so the yard
    // fills a portrait phone stage as well as the desktop one.
    pos: [4.68, 8.61, 10.54],
    target: [0.18, 0.3, 0.9],
    narration:
      "Welcome to the defence procurement yard. A Defence Acquisition Council approval is only a promise to buy. This yard shows what that promise turns into: missiles, drones, guns and ships tested on the range in front, and the hangar, electronics lab and ordnance shop behind where Indian industry builds them.",
  },
  {
    id: "range",
    label: "Trials Range",
    // From the front and high enough to take in the whole range, howitzer to frigate.
    pos: [0.5, 7.4, 11.4],
    target: [0.3, 0.2, 1.4],
    narration:
      "The trials and acceptance range. Before any contract is signed, equipment goes through field trials here: the howitzer on the test track, the canister missile launcher, the drone pad and the counter-drone jammer. Trials are the slowest step between an approval and an order. At the jetty on the right a frigate is fitting out: warships and submarines are the largest single contracts in Indian defence.",
  },
  {
    id: "hangar",
    layer: 1,
    label: "Assembly Hangar",
    pos: [2.2, 3.5, 2.4],
    target: [-0.45, 0.25, -1.95],
    narration:
      "Inside the assembly hangar: a delta-wing fighter and a light helicopter on the aircraft line, an engine on its cradle beside a wing jig, and military trucks on the vehicle line. This is where platform primes turn orders into deliveries, and where engine supply often sets the pace.",
  },
  {
    id: "lab",
    layer: 2,
    label: "Electronics Lab",
    pos: [5.9, 2.9, 0.9],
    target: [3.3, 0.25, -2.25],
    narration:
      "The electronics lab: an active radar face made of hundreds of transmit-receive modules sits on its test stand in front of an anechoic wall, with circuit-board benches and test racks behind. Radars, electronic warfare and avionics are the fastest-growing slice of every platform.",
  },
  {
    id: "ordnance",
    layer: 3,
    label: "Ordnance & Materials",
    pos: [-1.6, 3.0, 1.9],
    target: [-3.7, 0.25, -1.75],
    narration:
      "The ordnance and materials shop: propellant and explosive mixing, artillery shells on pallets and in the earth-covered magazine, a forging press with a hot billet, and special-alloy bar stock. Ammunition is consumed, so it is the most repeatable order in defence.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration: "From above: the range at the front, and the ordnance shop, assembly hangar and electronics lab along the back.",
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

export function buildDefenceproc(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [rangeG, hangarG, labG, ordG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const L = layerMats();
  const DS = THREE.DoubleSide;

  // ------------------------------------------------------------ helpers
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);
  /** Local frame (front = +Z, floor = y 0) -> world, rotated about Y. */
  const place = (P: Put, x: number, y: number, z: number, ry = 0, s = 1): Put => (m, g) => {
    if (s !== 1) g.scale(s, s, s);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    P(m, g);
  };
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
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrap = true) => {
    const t = canvasTexture(THREE, w, h, draw);
    if (wrap) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
    return t;
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  const std = (color: number, metalness = 0.2, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // ------------------------------------------------------------ textures
  const groundTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#b9b29c";
    g.fillRect(0, 0, w, h);
    const r = mulberry(3);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(120,105,80,0.10)" : "rgba(255,250,235,0.10)";
      g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
    }
  });
  groundTex.repeat.set(3, 3);
  const apronTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#a9adb0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(60,65,70,0.18)";
    for (let i = 0; i <= 4; i++) {
      g.fillRect(i * 64, 0, 1.2, h);
      g.fillRect(0, i * 64, w, 1.2);
    }
  });
  apronTex.repeat.set(4, 2);
  const cladTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#dfe2df";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(0,0,0,0.09)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(x + 2, 0, 1, h);
    }
    g.fillStyle = "#5a6366";
    g.fillRect(0, h - 12, w, 12);
  });
  const roofTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#8f9b98";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(0,0,0,0.14)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x + 3, 0, 1, h);
    }
  });
  const labTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#eef0f2";
    g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, h * 0.3, 0, h * 0.62);
    gr.addColorStop(0, "#2b4a63");
    gr.addColorStop(1, "#16283a");
    g.fillStyle = gr;
    g.fillRect(0, h * 0.3, w, h * 0.32);
    g.fillStyle = "#cfd6dc";
    for (let x = 0; x < w; x += 32) g.fillRect(x, h * 0.3, 2.5, h * 0.32);
    g.fillStyle = "#2e86ab";
    g.fillRect(0, h * 0.14, w, 6);
    g.fillStyle = "#56606a";
    g.fillRect(0, h - 12, w, 12);
  });
  const ordTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#cfc8b8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.07)";
    for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 20) g.fillRect(x + ((Math.floor(x / 20) % 2) * 10), 0, 1, h);
    g.fillStyle = "#c2582b";
    g.fillRect(0, h * 0.16, w, 5);
    g.fillStyle = "#5a5a52";
    g.fillRect(0, h - 12, w, 12);
  });
  const radarTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#3d4650";
      g.fillRect(0, 0, w, h);
      const n = 16;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = (i + j) % 2 ? "#cfd6dd" : "#b8c2cc";
          g.fillRect(i * (w / n) + 1.5, j * (h / n) + 1.5, w / n - 3, h / n - 3);
        }
    },
    false
  );
  const pcbTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#1f6b3a";
    g.fillRect(0, 0, w, h);
    const r = mulberry(11);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = r() > 0.6 ? "#111" : "#c9b37a";
      g.fillRect(r() * w, r() * h, 4 + r() * 16, 3 + r() * 10);
    }
    g.strokeStyle = "rgba(220,200,120,0.55)";
    for (let i = 0; i < 30; i++) {
      g.beginPath();
      g.moveTo(r() * w, r() * h);
      g.lineTo(r() * w, r() * h);
      g.stroke();
    }
  });
  const screenTex = tex(
    128,
    80,
    (g, w, h) => {
      g.fillStyle = "#06121c";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#35d0a0";
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x < w; x++) g.lineTo(x, h / 2 + Math.sin(x / 6) * 14 * Math.sin(x / 40));
      g.stroke();
      g.fillStyle = "rgba(53,208,160,0.25)";
      g.fillRect(0, h - 14, w, 2);
    },
    false
  );
  const waterTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#4b8fae";
    g.fillRect(0, 0, w, h);
    const r = mulberry(7);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,20,40,0.12)";
      g.fillRect(r() * w, r() * h, 10 + r() * 30, 1.5);
    }
  });
  waterTex.repeat.set(2, 4);
  const camoTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#5d6640";
    g.fillRect(0, 0, w, h);
    const r = mulberry(21);
    const cols = ["#4a5233", "#6f6b4a", "#3e4430"];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = cols[i % 3];
      g.beginPath();
      g.ellipse(r() * w, r() * h, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });

  // ------------------------------------------------------------ materials
  // Plinth & ground (always on).
  const base = {
    plinth: L.add("base", std(0x2e3640, 0.1, 0.8)),
    plinthEdge: L.add("base", std(0x4a5560, 0.3, 0.5)),
    ground: L.add("base", std(0xffffff, 0, 0.95, { map: groundTex })),
    apron: L.add("base", std(0xffffff, 0, 0.85, { map: apronTex })),
    grass: L.add("base", std(0x6f8a4a, 0, 0.95)),
    track: L.add("base", std(0x7a6a52, 0, 0.98)),
    asphalt: L.add("base", std(0x4a4f55, 0, 0.9)),
    paint: L.add("base", std(0xe9c54a, 0, 0.6)),
    white: L.add("base", std(0xf2f2ee, 0, 0.6)),
    water: L.add("base", std(0xffffff, 0.1, 0.2, { map: waterTex })),
    quay: L.add("base", std(0xa7a59b, 0, 0.85)),
  };
  // Context (fence, trees, range furniture) - softens as you go inside.
  const ctxM = {
    fence: L.add("ctx", std(0x8a949c, 0.6, 0.4)),
    leaf: L.add("ctx", std(0x4f6e3a, 0, 0.9)),
    trunk: L.add("ctx", std(0x5b4636, 0, 0.9)),
  };
  // Range systems (layer 0 story; ghost when you go inside).
  const rg = {
    olive: L.add("range", std(0x5d6640, 0.25, 0.65)),
    camo: L.add("range", std(0xffffff, 0.2, 0.7, { map: camoTex })),
    dark: L.add("range", std(0x2a2e2a, 0.4, 0.6)),
    tyre: L.add("range", std(0x1c1c1c, 0, 0.9)),
    steel: L.add("range", std(0x8c949a, 0.7, 0.35)),
    canister: L.add("range", std(0x707a5a, 0.35, 0.55)),
    white: L.add("range", std(0xeeeeea, 0.1, 0.5)),
    glass: L.add("range", std(0x1d2a33, 0.6, 0.15)),
    drone: L.add("range", std(0x30353a, 0.4, 0.45)),
    rotor: L.add("range", std(0x9aa3aa, 0.2, 0.3, { opacity: 0.45, side: DS })),
    red: L.add("range", std(0xc8442f, 0.2, 0.5)),
    hullGrey: L.add("range", std(0x7d8891, 0.35, 0.5)),
    hullDark: L.add("range", std(0x3b434a, 0.3, 0.6)),
    deck: L.add("range", std(0x5d666d, 0.2, 0.7, { side: DS })),
    radome: L.add("range", std(0xe6e8ea, 0.1, 0.4)),
    radar: L.add("range", std(0xffffff, 0.4, 0.4, { map: radarTex })),
  };
  // Hangar shell + interior.
  const hg = {
    wall: L.add("hgrWall", std(0xffffff, 0.2, 0.6, { map: cladTex, side: DS })),
    frame: L.add("hgrWall", std(0x4d565e, 0.6, 0.4)),
    roof: L.add("hgrRoof", std(0xffffff, 0.45, 0.45, { map: roofTex, side: DS })),
    gable: L.add("hgrRoof", std(0xffffff, 0.2, 0.6, { map: cladTex, side: DS })),
    roofFrame: L.add("hgrRoof", std(0x4d565e, 0.6, 0.4)),
    door: L.add("hgrWall", std(0x6b767e, 0.5, 0.45)),
    floor: L.add("hgrEq", std(0xc9cfd2, 0, 0.6)),
    line: L.add("hgrEq", std(0xe9c54a, 0, 0.6)),
    jet: L.add("hgrEq", std(0x8d979f, 0.45, 0.4)),
    jetDark: L.add("hgrEq", std(0x4b545b, 0.4, 0.45)),
    canopy: L.add("hgrEq", std(0x1d2a33, 0.7, 0.1)),
    primer: L.add("hgrEq", std(0x9fb58a, 0.2, 0.55)),
    heli: L.add("hgrEq", std(0x56613f, 0.3, 0.55)),
    truck: L.add("hgrEq", std(0x5d6640, 0.25, 0.65)),
    canvas: L.add("hgrEq", std(0x6f6b4a, 0, 0.9)),
    tyre: L.add("hgrEq", std(0x1c1c1c, 0, 0.9)),
    yellow: L.add("hgrEq", std(0xe0b52e, 0.3, 0.5)),
    steel: L.add("hgrEq", std(0x8c949a, 0.7, 0.35)),
    engine: L.add("hgrEq", std(0xb7a37c, 0.85, 0.3)),
    blue: L.add("hgrEq", std(0x2f5fa8, 0.3, 0.5)),
  };
  // Lab shell + interior.
  const lb = {
    wall: L.add("labWall", std(0xffffff, 0.1, 0.55, { map: labTex, side: DS })),
    roof: L.add("labRoof", std(0xb9c0c5, 0.3, 0.6)),
    plant: L.add("labRoof", std(0x9aa3aa, 0.6, 0.4)),
    floor: L.add("labEq", std(0xdde3e8, 0, 0.6)),
    radar: L.add("labEq", std(0xffffff, 0.4, 0.4, { map: radarTex })),
    frame: L.add("labEq", std(0x4b545b, 0.6, 0.4)),
    foam: L.add("labEq", std(0x3a5872, 0, 0.95)),
    bench: L.add("labEq", std(0xf0f2f4, 0.1, 0.5)),
    pcb: L.add("labEq", std(0xffffff, 0.2, 0.5, { map: pcbTex })),
    screen: L.add("labEq", new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.7, roughness: 0.3 })),
    rack: L.add("labEq", std(0x23292f, 0.5, 0.4)),
    led: L.add("labEq", new THREE.MeshStandardMaterial({ color: 0x35d0a0, emissive: 0x35d0a0, emissiveIntensity: 1.2 })),
    glass: L.add("labEq", std(0xa9c6d8, 0.1, 0.1, { opacity: 0.35 })),
    orange: L.add("labEq", std(0xd9742b, 0.2, 0.5)),
  };
  // Ordnance shop shell + interior.
  const od = {
    wall: L.add("ordWall", std(0xffffff, 0.05, 0.8, { map: ordTex, side: DS })),
    roof: L.add("ordRoof", std(0xffffff, 0.45, 0.5, { map: roofTex, side: DS })),
    skylight: L.add("ordRoof", std(0x9fb6c4, 0.2, 0.2)),
    mound: L.add("igloo", std(0x7f8a55, 0, 0.95, { side: DS })),
    headwall: L.add("igloo", std(0xb4b0a4, 0, 0.85)),
    floor: L.add("ordEq", std(0x9da3a7, 0, 0.8)),
    shell: L.add("ordEq", std(0x7a8048, 0.4, 0.45)),
    band: L.add("ordEq", std(0xb88a3e, 0.8, 0.3)),
    pallet: L.add("ordEq", std(0x8a6a44, 0, 0.9)),
    crate: L.add("ordEq", std(0x5d6640, 0.1, 0.8)),
    vessel: L.add("ordEq", std(0xc4cacf, 0.85, 0.25)),
    steel: L.add("ordEq", std(0x5b646b, 0.7, 0.4)),
    blue: L.add("ordEq", std(0x2f5fa8, 0.3, 0.5)),
    hot: L.add("ordEq", new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 0.5 })),
    alloy: L.add("ordEq", std(0xd2d6da, 0.9, 0.22)),
    ingot: L.add("ordEq", std(0xa7aeb5, 0.9, 0.3)),
    yellow: L.add("ordEq", std(0xe0b52e, 0.3, 0.5)),
    red: L.add("ordEq", std(0xb03a2e, 0.2, 0.6)),
  };

  const B = putter(baseG);
  const C = putter(rangeG); // context lives with the range group
  const R = putter(rangeG);
  const H = putter(hangarG);
  const LB = putter(labG);
  const O = putter(ordG);

  // ============================================================ PLINTH & GROUND
  const PX0 = -5.1,
    PX1 = 5.1,
    PZ0 = -3.6,
    PZ1 = 3.75;
  B(base.plinth, bb(PX0, PX1, -0.26, -0.02, PZ0, PZ1));
  B(base.plinthEdge, bb(PX0 - 0.03, PX1 + 0.03, -0.3, -0.24, PZ0 - 0.03, PZ1 + 0.03));
  // Ground slab with the basin cut out (three pieces around it).
  const groundTop = (x0: number, x1: number, z0: number, z1: number) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    uvScale(g, (x1 - x0) / 3.4, (z1 - z0) / 3.4);
    return g;
  };
  B(base.ground, groundTop(PX0, BASIN.x0, PZ0, PZ1));
  B(base.ground, groundTop(BASIN.x0, PX1, PZ0, BASIN.z0));
  B(base.ground, groundTop(BASIN.x1, PX1, BASIN.z0, PZ1));
  B(base.ground, groundTop(BASIN.x0, BASIN.x1, BASIN.z1, PZ1));
  // Apron in front of the hangar and lab + service road.
  {
    const g = new THREE.PlaneGeometry(7.4, 1.25).rotateX(-Math.PI / 2).translate(-0.85, 0.004, -0.02);
    B(base.apron, g);
    B(base.asphalt, bb(-4.9, BASIN.x0 - 0.05, 0.0, 0.006, 0.66, 0.92));
    for (let x = -4.7; x < BASIN.x0 - 0.3; x += 0.36) B(base.white, bb(x, x + 0.18, 0.006, 0.008, 0.785, 0.795));
    // Taxi line into the hangar.
    B(base.paint, bb(-0.37, -0.33, 0.004, 0.0075, -0.65, 0.6));
    B(base.paint, bb(-2.1, 1.4, 0.004, 0.0075, 0.45, 0.48));
  }
  // Test track (rounded loop) front-left, with the grass infield.
  const TR = { cx: -3.05, cz: 2.15, ax: 1.55, az: 0.95 };
  {
    const loop = (sx: number, sz: number, n = 56) => {
      const pts: T.Vector2[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const c = Math.cos(a),
          s = Math.sin(a);
        pts.push(new THREE.Vector2(TR.cx + sx * Math.sign(c) * Math.pow(Math.abs(c), 0.6), -(TR.cz + sz * Math.sign(s) * Math.pow(Math.abs(s), 0.6))));
      }
      return pts;
    };
    const outer = new THREE.Shape(loop(TR.ax, TR.az));
    outer.holes.push(new THREE.Path(loop(TR.ax - 0.32, TR.az - 0.32).reverse()));
    B(base.track, new THREE.ShapeGeometry(outer).rotateX(-Math.PI / 2).translate(0, 0.005, 0));
    B(base.grass, new THREE.ShapeGeometry(new THREE.Shape(loop(TR.ax - 0.32, TR.az - 0.32))).rotateX(-Math.PI / 2).translate(0, 0.004, 0));
  }
  // Launch pad and drone pad.
  B(base.apron, new THREE.CircleGeometry(0.62, 40).rotateX(-Math.PI / 2).translate(-0.55, 0.006, 2.25));
  B(base.paint, new THREE.RingGeometry(0.57, 0.6, 40).rotateX(-Math.PI / 2).translate(-0.55, 0.008, 2.25));
  B(base.asphalt, new THREE.CircleGeometry(0.5, 40).rotateX(-Math.PI / 2).translate(1.55, 0.006, 2.3));
  B(base.white, new THREE.RingGeometry(0.42, 0.45, 40).rotateX(-Math.PI / 2).translate(1.55, 0.008, 2.3));
  B(base.white, bb(1.48, 1.51, 0.006, 0.009, 2.13, 2.47));
  B(base.white, bb(1.59, 1.62, 0.006, 0.009, 2.13, 2.47));
  B(base.white, bb(1.51, 1.59, 0.006, 0.009, 2.285, 2.315));
  // Fitting-out basin: dark pit, water, quay edges.
  B(base.quay, bb(BASIN.x0 - 0.01, BASIN.x0 + 0.01, -0.02, 0.01, BASIN.z0, BASIN.z1));
  B(base.quay, bb(BASIN.x1 - 0.01, BASIN.x1 + 0.01, -0.02, 0.01, BASIN.z0, BASIN.z1));
  B(base.quay, bb(BASIN.x0, BASIN.x1, -0.02, 0.01, BASIN.z0 - 0.01, BASIN.z0 + 0.01));
  B(base.quay, bb(BASIN.x0, BASIN.x1, -0.02, 0.01, BASIN.z1 - 0.01, BASIN.z1 + 0.01));
  {
    const g = new THREE.PlaneGeometry(BASIN.x1 - BASIN.x0, BASIN.z1 - BASIN.z0).rotateX(-Math.PI / 2).translate((BASIN.x0 + BASIN.x1) / 2, -0.012, (BASIN.z0 + BASIN.z1) / 2);
    B(base.water, g);
  }
  // Jetty along the west side of the basin + bollards.
  B(base.quay, bb(BASIN.x0, BASIN.x0 + 0.22, -0.04, 0.012, BASIN.z0 + 0.25, BASIN.z1 - 0.3));
  for (let z = BASIN.z0 + 0.45; z < BASIN.z1 - 0.3; z += 0.5) B(base.plinthEdge, cyl(0.018, 0.04, BASIN.x0 + 0.19, 0.012, z, 10));

  // Perimeter fence and a few trees (context).
  {
    const fx0 = PX0 + 0.08,
      fx1 = PX1 - 0.08,
      fz0 = PZ0 + 0.08,
      fz1 = PZ1 - 0.08;
    // Straight runs only: a railing through a corner is a smooth curve that bulges off the plinth.
    const runs: [Vec3, Vec3][] = [
      [[fx0, 0, fz1], [fx0, 0, fz0]],
      [[fx0, 0, fz0], [BASIN.x0 - 0.1, 0, fz0]],
      [[BASIN.x1 + 0.08, 0, fz0], [fx1, 0, fz0]],
      [[fx1, 0, fz0], [fx1, 0, BASIN.z0 - 0.1]],
      [[fx0, 0, fz1], [BASIN.x0 - 0.1, 0, fz1]],
    ];
    for (const r of runs) C(ctxM.fence, railing(THREE, r, 0.11, 0.004, 0.22));
    const trees: Vec2[] = [
      [-4.85, 0.35],
      [-4.85, 0.95],
      [-4.85, -0.25],
      [1.85, 3.45],
      [2.35, 3.45],
      [2.85, 3.45],
      [-4.3, 3.45],
      [1.85, -3.35],
      [-2.55, -3.4],
    ];
    for (const [x, z] of trees) {
      C(ctxM.trunk, cyl(0.025, 0.12, x, 0, z, 8));
      C(ctxM.leaf, new THREE.IcosahedronGeometry(0.17, 1).scale(1, 1.25, 1).translate(x, 0.27, z));
    }
  }

  // ============================================================ RANGE: HOWITZER (K9-style)
  {
    const P = place(R, TR.cx + 0.15, 0.006, TR.cz - TR.az + 0.16, 0.12);
    // Tracks.
    for (const s of [-1, 1]) {
      P(rg.tyre, rb(0.7, 0.1, 0.09, 0.045, 0, 0, s * 0.15));
      for (let i = 0; i < 6; i++) P(rg.dark, cylZ(0.04, 0.095, -0.27 + i * 0.108, 0.045, s * 0.15, 12));
    }
    // Hull and turret.
    P(rg.camo, rb(0.72, 0.12, 0.38, 0.025, 0, 0.09, 0));
    P(rg.camo, rb(0.34, 0.12, 0.3, 0.03, -0.07, 0.21, 0));
    P(rg.olive, bx(0.1, 0.05, 0.16, 0.12, 0.25, 0));
    // Barrel (forward = +x), elevated a few degrees.
    {
      const g = new THREE.CylinderGeometry(0.018, 0.022, 0.86, 12).rotateZ(-Math.PI / 2 + 0.12).translate(0.53, 0.32, 0);
      P(rg.olive, g);
      P(rg.dark, cylX(0.03, 0.06, 0.95, 0.37, 0).rotateZ(0));
    }
    P(rg.dark, cyl(0.025, 0.04, -0.12, 0.33, 0.07, 10));
  }
  // An HMV truck on the track (from the September AoN).
  {
    const P = place(R, TR.cx - 0.95, 0.006, TR.cz + 0.55, -1.25);
    truck(P, { body: rg.olive, canvas: rg.camo, tyre: rg.tyre, glass: rg.glass, dark: rg.dark });
  }

  // ============================================================ RANGE: CANISTER MISSILE LAUNCHER
  {
    const P = place(R, -0.55, 0.006, 2.25, -0.35);
    // 8x8 chassis along x, cab at +x.
    P(rg.dark, bx(0.92, 0.04, 0.2, 0, 0.06, 0));
    for (const x of [-0.34, -0.2, 0.12, 0.26]) for (const z of [-0.105, 0.105]) P(rg.tyre, cylZ(0.055, 0.045, x, 0.055, z, 14));
    P(rg.olive, rb(0.2, 0.17, 0.24, 0.03, 0.36, 0.08, 0));
    P(rg.glass, bx(0.005, 0.06, 0.2, 0.462, 0.17, 0));
    P(rg.olive, bx(0.62, 0.05, 0.24, -0.1, 0.1, 0));
    // Erector arm + two canisters raised ~70 degrees, pivot at the rear.
    const tilt = 1.2;
    for (const z of [-0.055, 0.055]) {
      const g = new THREE.CylinderGeometry(0.048, 0.048, 0.72, 16).translate(0, 0.36, 0).rotateZ(Math.PI / 2 - tilt).translate(-0.4, 0.15, z);
      P(rg.canister, g);
      const cap = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16).translate(0, 0.73, 0).rotateZ(Math.PI / 2 - tilt).translate(-0.4, 0.15, z);
      P(rg.red, cap);
    }
    P(rg.steel, bar(THREE, [0.05, 0.15, 0], [-0.22, 0.42, 0], 0.016, 8));
    P(rg.dark, bx(0.08, 0.06, 0.24, -0.42, 0.12, 0));
  }

  // ============================================================ RANGE: DRONE PAD + COUNTER-DRONE
  {
    // Quadcopter hovering over the pad.
    const P = place(R, 1.55, 0.6, 2.3, 0.4);
    P(rg.drone, rb(0.16, 0.05, 0.1, 0.02, 0, 0, 0));
    P(rg.dark, cyl(0.025, 0.03, 0, -0.03, 0, 12));
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const ax = sx * 0.16,
        az = sz * 0.16;
      P(rg.drone, bar(THREE, [0, 0.025, 0], [ax, 0.03, az], 0.008, 6));
      P(rg.dark, cyl(0.014, 0.025, ax, 0.02, az, 10));
      P(rg.rotor, cyl(0.085, 0.003, ax, 0.05, az, 24));
      P(rg.drone, bar(THREE, [ax * 0.8, 0, az * 0.8], [ax * 0.8, -0.07, az * 0.8], 0.005, 4));
    }
    // A fixed-wing loitering munition on its launcher rail by the pad.
    const Q = place(R, 2.25, 0.006, 2.85, 0.6);
    Q(rg.steel, bar(THREE, [-0.2, 0.05, 0], [0.2, 0.2, 0], 0.012, 6));
    Q(rg.steel, bar(THREE, [-0.18, 0, 0], [-0.18, 0.06, 0], 0.01, 6));
    Q(rg.steel, bar(THREE, [0.15, 0, 0], [0.15, 0.18, 0], 0.01, 6));
    {
      const g = new THREE.CylinderGeometry(0.018, 0.022, 0.26, 12).rotateZ(-Math.PI / 2).rotateZ(0.36).translate(0.02, 0.15, 0);
      Q(rg.white, g);
      Q(rg.white, bx(0.06, 0.006, 0.32, 0.03, 0.155, 0).rotateZ(0));
    }
    // Counter-drone vehicle: 4x4 with mast-mounted jammer / sensor head.
    const V = place(R, 2.55, 0.006, 1.55, -0.5);
    V(rg.dark, bx(0.42, 0.03, 0.17, 0, 0.05, 0));
    for (const x of [-0.13, 0.14]) for (const z of [-0.08, 0.08]) V(rg.tyre, cylZ(0.045, 0.04, x, 0.045, z, 14));
    V(rg.olive, rb(0.14, 0.12, 0.18, 0.025, 0.13, 0.07, 0));
    V(rg.glass, bx(0.005, 0.05, 0.15, 0.202, 0.14, 0));
    V(rg.olive, rb(0.24, 0.1, 0.18, 0.02, -0.08, 0.07, 0));
    V(rg.steel, cyl(0.012, 0.36, -0.1, 0.17, 0, 8));
    V(rg.white, rb(0.1, 0.07, 0.1, 0.015, -0.1, 0.53, 0));
    V(rg.radar, bx(0.004, 0.09, 0.12, -0.04, 0.5, 0));
    V(rg.dark, cylX(0.02, 0.06, -0.17, 0.57, 0, 10));
  }

  // ============================================================ RANGE: FRIGATE IN THE BASIN
  {
    const sx = BASIN.x0 + 0.62,
      z0 = BASIN.z0 + 0.3,
      z1 = BASIN.z1 - 0.35;
    const Lh = z1 - z0,
      half = 0.21;
    // Plan outline (x = beam, y = along length -> world z), pointed bow at +z.
    const plan: Vec2[] = [
      [-half * 0.85, 0],
      [half * 0.85, 0],
      [half, Lh * 0.18],
      [half, Lh * 0.62],
      [half * 0.55, Lh * 0.88],
      [0, Lh],
      [-half * 0.55, Lh * 0.88],
      [-half, Lh * 0.62],
      [-half, Lh * 0.18],
    ];
    const hullShape = new THREE.Shape(plan.map((p) => new THREE.Vector2(p[0], p[1])));
    const hull = new THREE.ExtrudeGeometry(hullShape, { depth: 0.2, bevelEnabled: false }).rotateX(Math.PI / 2);
    // After rotateX(+90): shape y -> z (forward), extrude z -> -y. Shift so deck at y=0.13.
    hull.translate(sx, 0.13, z0);
    R(rg.hullGrey, hull);
    const boot = new THREE.ExtrudeGeometry(hullShape, { depth: 0.035, bevelEnabled: false }).rotateX(Math.PI / 2).scale(1.01, 1, 1);
    boot.translate(sx, -0.025, z0);
    R(rg.hullDark, boot);
    // Deck.
    const deckShape = new THREE.Shape(plan.map((p) => new THREE.Vector2(p[0] * 0.97, p[1])));
    R(rg.deck, new THREE.ShapeGeometry(deckShape).rotateX(Math.PI / 2).translate(sx, 0.132, z0));
    // Superstructure (stealthy faceted blocks), mast, funnel, gun, VLS, helo deck.
    const zc = z0 + Lh * 0.5;
    R(rg.hullGrey, rb(0.36, 0.16, 0.95, 0.03, sx, 0.13, zc - 0.05));
    R(rg.hullGrey, rb(0.3, 0.12, 0.45, 0.03, sx, 0.29, zc + 0.12));
    R(rg.glass, bx(0.28, 0.025, 0.004, sx, 0.36, zc + 0.348));
    R(rg.hullDark, rb(0.16, 0.12, 0.2, 0.02, sx, 0.29, zc - 0.32));
    // Mast with radar faces (where the anchor sits).
    R(rg.hullGrey, new THREE.CylinderGeometry(0.05, 0.1, 0.32, 4).rotateY(Math.PI / 4).translate(sx, 0.57, zc + 0.12));
    R(rg.radome, new THREE.SphereGeometry(0.045, 14, 10).translate(sx, 0.76, zc + 0.12));
    R(rg.steel, bar(THREE, [sx, 0.78, zc + 0.12], [sx, 0.9, zc + 0.12], 0.006, 6));
    // Forward gun + VLS block.
    R(rg.hullGrey, rb(0.11, 0.06, 0.13, 0.03, sx, 0.13, z0 + Lh * 0.74));
    R(rg.hullDark, cylZ(0.009, 0.22, sx, 0.165, z0 + Lh * 0.74 + 0.15, 8));
    R(rg.hullDark, bx(0.18, 0.012, 0.16, sx, 0.132, z0 + Lh * 0.62));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) R(rg.deck, bx(0.035, 0.003, 0.06, sx - 0.06 + i * 0.04, 0.144, z0 + Lh * 0.62 - 0.035 + j * 0.07));
    // Helo deck markings at the stern.
    R(base.white, new THREE.RingGeometry(0.09, 0.105, 28).rotateX(-Math.PI / 2).translate(sx, 0.134, z0 + 0.25));
    // Lifelines.
    R(rg.steel, railing(THREE, plan.slice(1, 6).map((p) => [sx + p[0] * 0.95, 0.132, z0 + p[1]] as Vec3), 0.035, 0.0025, 0.1));
  }

  // ============================================================ HANGAR SHELL
  const hgrRoof = new THREE.Group();
  hangarG.add(hgrRoof);
  {
    const { x0, x1, z0, z1, h, rise } = HGR;
    const W = x1 - x0,
      D = z1 - z0,
      xc = (x0 + x1) / 2;
    // Floor slab (interior).
    H(hg.floor, bb(x0 + 0.02, x1 - 0.02, 0.0, 0.01, z0 + 0.02, z1 - 0.02));
    // Walls: back, two sides, front with a wide door opening.
    const wallPlane = (len: number, ht: number, cx: number, cz: number, ry: number, y0 = 0) => {
      const g = new THREE.PlaneGeometry(len, ht);
      uvScale(g, len / 0.9, 1);
      g.rotateY(ry);
      g.translate(cx, y0 + ht / 2, cz);
      return g;
    };
    H(hg.wall, wallPlane(W, h, xc, z0, Math.PI));
    H(hg.wall, wallPlane(D, h, x1, (z0 + z1) / 2, Math.PI / 2));
    H(hg.wall, wallPlane(D, h, x0, (z0 + z1) / 2, -Math.PI / 2));
    const dx0 = -1.45,
      dx1 = 0.75,
      dh = 0.64;
    H(hg.wall, wallPlane(dx0 - x0, h, (x0 + dx0) / 2, z1, 0));
    H(hg.wall, wallPlane(x1 - dx1, h, (dx1 + x1) / 2, z1, 0));
    H(hg.wall, wallPlane(dx1 - dx0, h - dh, (dx0 + dx1) / 2, z1, 0, dh));
    // Door frame and parked door leaves (slid to the sides, outside).
    H(hg.frame, bb(dx0 - 0.03, dx0, 0, h, z1 - 0.01, z1 + 0.03));
    H(hg.frame, bb(dx1, dx1 + 0.03, 0, h, z1 - 0.01, z1 + 0.03));
    H(hg.frame, bb(dx0 - 0.03, dx1 + 0.03, dh, dh + 0.04, z1 - 0.01, z1 + 0.03));
    for (const s of [-1, 1]) {
      const xL = s < 0 ? dx0 - 0.42 : dx1 + 0.02;
      H(hg.door, bb(xL, xL + 0.4, 0.0, dh, z1 + 0.03, z1 + 0.05));
      for (let k = 1; k < 4; k++) H(hg.frame, bb(xL, xL + 0.4, (dh * k) / 4, (dh * k) / 4 + 0.008, z1 + 0.05, z1 + 0.055));
    }
    // Corner columns.
    for (const x of [x0, x1]) for (const z of [z0, z1]) H(hg.frame, bx(0.05, h, 0.05, x, 0, z));
    // Barrel-vault roof along x: half-cylinder scaled to the rise.
    const R0 = D / 2 + 0.06;
    const vault = new THREE.CylinderGeometry(R0, R0, W + 0.1, 40, 1, true, 0, Math.PI);
    vault.rotateZ(Math.PI / 2);
    vault.scale(1, rise / R0, 1);
    uvScale(vault, 6, 1);
    vault.translate(xc, h, (z0 + z1) / 2);
    put(hgrRoof, hg.roof, vault);
    // Gable ends (half-ellipse plates).
    const gablePts: T.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI;
      gablePts.push(new THREE.Vector2(Math.cos(a) * R0, Math.sin(a) * rise));
    }
    const gShape = new THREE.Shape(gablePts);
    for (const x of [x0 - 0.05, x1 + 0.05]) {
      const g = new THREE.ShapeGeometry(gShape).rotateY(Math.PI / 2).translate(x, h, (z0 + z1) / 2);
      uvScale(g, 2, 2);
      put(hgrRoof, hg.gable, g);
    }
    // Roof ribs + ridge vents.
    for (let i = 0; i <= 6; i++) {
      const x = x0 + (W * i) / 6;
      const pts: Vec3[] = [];
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI;
        pts.push([x, h + Math.sin(a) * rise + 0.008, (z0 + z1) / 2 + Math.cos(a) * R0]);
      }
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      put(hgrRoof, hg.roofFrame, new THREE.TubeGeometry(curve, 32, 0.008, 5, false));
    }
    for (let i = 0; i < 5; i++) put(hgrRoof, hg.roofFrame, rb(0.22, 0.04, 0.12, 0.015, x0 + 0.45 + i * 0.78, h + rise - 0.005, (z0 + z1) / 2));
  }

  // ============================================================ HANGAR INTERIOR
  {
    const P = H;
    // Floor markings: aircraft bays and the vehicle line.
    P(hg.line, bb(HGR.x0 + 0.1, HGR.x1 - 0.1, 0.01, 0.013, -1.92, -1.9));
    for (const x of [-0.45, 0.75]) P(hg.line, bb(x - 0.01, x + 0.01, 0.01, 0.013, HGR.z0 + 0.1, -1.92));

    // --- Delta-wing fighter (nose toward the door, +z) on jacks.
    {
      const fx = -1.35,
        fz = -2.45,
        fy = 0.12;
      const len = 0.95;
      const prof: Vec2[] = [
        [0.001, 0],
        [0.03, 0.04],
        [0.055, 0.14],
        [0.065, 0.36],
        [0.066, 0.62],
        [0.056, 0.78],
        [0.038, 0.88],
        [0.001, len],
      ];
      const fus = lathe(THREE, prof, 20).rotateX(Math.PI / 2).translate(fx, fy, fz - len / 2);
      // lathe y -> after rotateX(+90): y -> z. Nose at z = fz + len/2.
      P(hg.jet, fus);
      // Delta wing (thin plate) - shape in (span x, forward y).
      const wing = new THREE.Shape([
        new THREE.Vector2(0, 0.62),
        new THREE.Vector2(0.43, 0.08),
        new THREE.Vector2(0.43, 0.02),
        new THREE.Vector2(0, 0.02),
        new THREE.Vector2(-0.43, 0.02),
        new THREE.Vector2(-0.43, 0.08),
      ]);
      P(hg.jet, new THREE.ExtrudeGeometry(wing, { depth: 0.012, bevelEnabled: false }).rotateX(Math.PI / 2).translate(fx, fy + 0.0, fz - len / 2));
      // Fin.
      const fin = new THREE.Shape([new THREE.Vector2(0.02, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0.12, 0.2), new THREE.Vector2(0.06, 0.2)]);
      P(hg.jetDark, new THREE.ExtrudeGeometry(fin, { depth: 0.008, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(fx + 0.004, fy + 0.05, fz - len / 2));
      // Canopy, intake lips, nose probe, exhaust.
      P(hg.canopy, new THREE.SphereGeometry(0.04, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.9, 2.4).translate(fx, fy + 0.045, fz + 0.24));
      for (const s of [-1, 1]) P(hg.jetDark, rb(0.035, 0.05, 0.16, 0.012, fx + s * 0.07, fy - 0.035, fz + 0.06));
      P(hg.jetDark, cylZ(0.004, 0.08, fx, fy, fz + len / 2 + 0.03, 6));
      P(hg.jetDark, cylZ(0.04, 0.04, fx, fy, fz - len / 2 - 0.0, 16));
      // Jacks + a work stand.
      for (const [jx, jz] of [
        [0, 0.33],
        [-0.22, -0.18],
        [0.22, -0.18],
      ] as Vec2[]) {
        P(hg.yellow, cyl(0.03, 0.01, fx + jx, 0.01, fz + jz, 10));
        P(hg.steel, cyl(0.009, fy - 0.02, fx + jx, 0.02, fz + jz, 8));
      }
      P(hg.yellow, bb(fx + 0.48, fx + 0.6, 0.0, 0.16, fz - 0.15, fz + 0.05));
      P(hg.steel, railing(THREE, [[fx + 0.48, 0.16, fz - 0.15], [fx + 0.6, 0.16, fz - 0.15], [fx + 0.6, 0.16, fz + 0.05]], 0.06, 0.003, 0.06));
    }

    // --- Light utility helicopter (ALH-style), primer-green, rotor folded.
    {
      const hx = 0.2,
        hz = -2.55;
      const body = lathe(
        THREE,
        [
          [0.001, 0],
          [0.05, 0.03],
          [0.085, 0.12],
          [0.09, 0.26],
          [0.07, 0.36],
          [0.03, 0.42],
          [0.001, 0.44],
        ],
        18
      )
        .scale(1, 1, 0.9)
        .rotateZ(-Math.PI / 2)
        .translate(hx - 0.22, 0.17, hz);
      // lathe y-axis -> after rotateZ(-90): y -> +x. Nose at x = hx + 0.22.
      P(hg.heli, body);
      P(hg.canopy, new THREE.SphereGeometry(0.06, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.9, 1).rotateZ(-0.5).translate(hx + 0.13, 0.19, hz));
      // Tail boom, fin, tail rotor.
      P(hg.heli, bar(THREE, [hx - 0.2, 0.2, hz], [hx - 0.62, 0.23, hz], 0.022, 10));
      P(hg.heli, bx(0.07, 0.11, 0.008, hx - 0.62, 0.2, hz));
      P(hg.jetDark, cylZ(0.05, 0.004, hx - 0.62, 0.28, hz + 0.012, 16));
      // Mast + four blades folded along the boom.
      P(hg.jetDark, cyl(0.014, 0.08, hx, 0.26, hz, 8));
      for (const a of [-0.08, -0.03, 0.03, 0.08]) P(hg.jetDark, bx(0.62, 0.006, 0.022, hx - 0.28, 0.335, hz + a));
      // Skids.
      for (const s of [-1, 1]) {
        P(hg.steel, bar(THREE, [hx - 0.15, 0.015, hz + s * 0.08], [hx + 0.17, 0.015, hz + s * 0.08], 0.007, 6));
        for (const x of [hx - 0.08, hx + 0.1]) P(hg.steel, bar(THREE, [x, 0.015, hz + s * 0.08], [x, 0.1, hz + s * 0.04], 0.006, 6));
      }
    }

    // --- Engine on its cradle + wing in an assembly jig (aerostructures).
    {
      const ex = 1.15,
        ez = -2.6;
      P(hg.yellow, bb(ex - 0.16, ex + 0.16, 0.0, 0.03, ez - 0.07, ez + 0.07));
      for (const dx of [-0.11, 0.11]) P(hg.yellow, bx(0.02, 0.1, 0.1, ex + dx, 0.03, ez));
      const eng = lathe(
        THREE,
        [
          [0.001, 0],
          [0.07, 0.0],
          [0.075, 0.04],
          [0.07, 0.22],
          [0.055, 0.3],
          [0.045, 0.34],
          [0.001, 0.34],
        ],
        22
      )
        .rotateZ(-Math.PI / 2)
        .translate(ex - 0.17, 0.2, ez);
      P(hg.engine, eng);
      P(hg.jetDark, cylX(0.066, 0.008, ex - 0.17, 0.2, ez, 22));
      // Wing jig behind: two frames holding a wing panel in primer.
      const jz = ez + 0.42;
      for (const x of [ex - 0.3, ex + 0.3]) {
        P(hg.blue, bx(0.03, 0.42, 0.03, x, 0, jz));
        P(hg.blue, bx(0.12, 0.03, 0.12, x, 0, jz));
      }
      P(hg.blue, bb(ex - 0.32, ex + 0.32, 0.42, 0.45, jz - 0.015, jz + 0.015));
      P(hg.primer, bx(0.56, 0.26, 0.012, ex, 0.12, jz).rotateX(0));
      // Trolley of parts.
      P(hg.steel, bb(ex + 0.25, ex + 0.38, 0.02, 0.12, ez - 0.05, ez + 0.06));
      P(hg.primer, bb(ex + 0.26, ex + 0.37, 0.12, 0.15, ez - 0.04, ez + 0.05));
    }

    // --- Vehicle line: three HMV trucks in build + an overhead gantry.
    {
      for (let i = 0; i < 3; i++) {
        const tp = place(H, -1.65 + i * 0.9, 0.01, -1.25, 0);
        truck(tp, { body: hg.truck, canvas: hg.canvas, tyre: hg.tyre, glass: hg.canopy, dark: hg.jetDark }, i === 2);
      }
      for (const x of [-2.15, 1.45]) {
        P(hg.yellow, bx(0.02, 0.6, 0.02, x, 0, -0.85));
        P(hg.yellow, bx(0.02, 0.6, 0.02, x, 0, -1.65));
      }
      P(hg.yellow, bb(-2.16, 1.46, 0.6, 0.62, -0.86, -0.84));
      P(hg.yellow, bb(-2.16, 1.46, 0.6, 0.62, -1.66, -1.64));
      P(hg.yellow, bb(0.51, 0.55, 0.615, 0.645, -1.66, -0.84));
      P(hg.steel, bar(THREE, [0.53, 0.62, -1.25], [0.53, 0.42, -1.25], 0.004, 4));
      P(hg.steel, bx(0.05, 0.03, 0.05, 0.53, 0.4, -1.25));
    }
  }

  // ============================================================ LAB SHELL
  const labRoof = new THREE.Group();
  labG.add(labRoof);
  {
    const { x0, x1, z0, z1, h } = LAB;
    const W = x1 - x0,
      D = z1 - z0;
    LB(lb.floor, bb(x0 + 0.02, x1 - 0.02, 0, 0.01, z0 + 0.02, z1 - 0.02));
    const side = (len: number, cx: number, cz: number, ry: number) => {
      const g = new THREE.PlaneGeometry(len, h);
      uvScale(g, len / 1.2, 1);
      g.rotateY(ry);
      g.translate(cx, h / 2, cz);
      return g;
    };
    put(labG, lb.wall, mergeInto(THREE, [side(W, (x0 + x1) / 2, z1, 0), side(W, (x0 + x1) / 2, z0, Math.PI), side(D, x1, (z0 + z1) / 2, Math.PI / 2), side(D, x0, (z0 + z1) / 2, -Math.PI / 2)]));
    put(labRoof, lb.roof, bb(x0 - 0.04, x1 + 0.04, h, h + 0.04, z0 - 0.04, z1 + 0.04));
    put(labRoof, lb.roof, bb(x0 - 0.04, x1 + 0.04, h + 0.04, h + 0.07, z1 - 0.0, z1 + 0.04));
    // Rooftop plant + a small radome (test antenna).
    for (let i = 0; i < 3; i++) put(labRoof, lb.plant, rb(0.3, 0.1, 0.22, 0.02, x0 + 0.5 + i * 0.42, h + 0.04, z0 + 0.35));
    put(labRoof, lb.plant, new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(x1 - 0.4, h + 0.04, z0 + 0.5));
    put(labRoof, lb.plant, cyl(0.16, 0.03, x1 - 0.4, h + 0.04, z0 + 0.5, 18));
    // Entrance canopy.
    put(labRoof, lb.roof, bb(x0 + 0.3, x0 + 0.8, h * 0.55, h * 0.55 + 0.025, z1, z1 + 0.22));
  }

  // ============================================================ LAB INTERIOR
  {
    const P = LB;
    // AESA radar face on a tilting test stand, in front of an anechoic wall.
    const rx = 2.62,
      rz = -2.5;
    P(lb.frame, bb(rx - 0.12, rx + 0.12, 0.01, 0.05, rz - 0.12, rz + 0.12));
    P(lb.frame, cyl(0.03, 0.24, rx, 0.05, rz, 12));
    {
      const face = new THREE.CylinderGeometry(0.24, 0.24, 0.03, 8, 1);
      // Map the top cap to the tile texture (CylinderGeometry caps already have 0..1 UVs).
      face.rotateY(Math.PI / 8).rotateX(Math.PI / 2 - 0.35).translate(rx, 0.5, rz + 0.02);
      P(lb.radar, face);
      P(lb.frame, new THREE.TorusGeometry(0.245, 0.012, 6, 8).rotateZ(Math.PI / 8).rotateX(-0.35).translate(rx, 0.5, rz + 0.02));
    }
    // Anechoic wall: blue foam pyramids (instanced).
    {
      const cone = new THREE.ConeGeometry(0.035, 0.08, 4).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4);
      const nx = 12,
        ny = 7;
      const im = new THREE.InstancedMesh(cone, lb.foam, nx * ny);
      const o = new THREE.Object3D();
      let k = 0;
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          o.position.set(LAB.x0 + 0.12 + i * 0.05, 0.08 + j * 0.075, LAB.z0 + 0.06);
          o.updateMatrix();
          im.setMatrixAt(k++, o.matrix);
        }
      labG.add(im);
      P(lb.foam, bb(LAB.x0 + 0.08, LAB.x0 + 0.72, 0.04, 0.6, LAB.z0 + 0.01, LAB.z0 + 0.03));
    }
    // Glass partition separating the radar bay from the electronics benches.
    P(lb.glass, bb(3.12, 3.135, 0.01, 0.55, LAB.z0 + 0.05, LAB.z1 - 0.3));
    // PCB benches with monitors (subsystems).
    for (let r = 0; r < 2; r++) {
      const z = -2.75 + r * 0.6;
      P(lb.bench, bb(3.35, 4.45, 0.12, 0.14, z - 0.12, z + 0.12));
      for (const x of [3.38, 4.42]) for (const dz of [-0.1, 0.1]) P(lb.frame, bx(0.015, 0.12, 0.015, x, 0, z + dz));
      for (let i = 0; i < 4; i++) {
        const x = 3.5 + i * 0.27;
        P(lb.pcb, bx(0.14, 0.008, 0.1, x, 0.14, z + 0.02));
        P(lb.frame, bx(0.012, 0.08, 0.012, x, 0.14, z - 0.09));
        P(lb.screen, bx(0.13, 0.08, 0.006, x, 0.21, z - 0.09).rotateX(0));
      }
    }
    // Test racks along the east wall with LEDs.
    for (let i = 0; i < 4; i++) {
      const z = -3.0 + i * 0.3;
      P(lb.rack, bb(4.47, 4.6, 0.01, 0.5, z - 0.11, z + 0.11));
      for (let k = 0; k < 6; k++) P(lb.led, bx(0.004, 0.008, 0.06, 4.468, 0.08 + k * 0.07, z - 0.02));
    }
    // Environmental test chamber (orange door).
    P(lb.bench, bb(2.25, 2.95, 0.01, 0.42, -1.75, -1.5));
    P(lb.orange, bb(2.45, 2.75, 0.06, 0.38, -1.5, -1.49));
  }

  // ============================================================ OUTDOOR SURVEILLANCE RADAR (lab yard)
  {
    const tx = 4.55,
      tz = -0.9;
    const legs: Vec2[] = [
      [-0.11, -0.11],
      [0.11, -0.11],
      [0.11, 0.11],
      [-0.11, 0.11],
    ];
    for (const [dx, dz] of legs) R(rg.steel, bar(THREE, [tx + dx, 0, tz + dz], [tx + dx * 0.45, 0.62, tz + dz * 0.45], 0.008, 5));
    for (const y of [0.18, 0.36, 0.54]) {
      const k = 1 - (0.55 * y) / 0.62;
      for (let i = 0; i < 4; i++) {
        const a = legs[i],
          b = legs[(i + 1) % 4];
        R(rg.steel, bar(THREE, [tx + a[0] * k, y, tz + a[1] * k], [tx + b[0] * k, y, tz + b[1] * k], 0.005, 4));
      }
    }
    R(rg.white, bx(0.14, 0.04, 0.14, tx, 0.62, tz));
    // Rotating rectangular array (frozen at a pleasing angle).
    R(rg.radar, bx(0.42, 0.18, 0.025, 0, 0, 0).rotateX(-0.3).rotateY(0.7).translate(tx, 0.7, tz));
    R(rg.white, bx(0.06, 0.06, 0.06, tx, 0.66, tz));
  }

  // ============================================================ ORDNANCE SHOP SHELL
  const ordRoof = new THREE.Group();
  ordG.add(ordRoof);
  {
    const { x0, x1, z0, z1, h } = ORD;
    const W = x1 - x0,
      D = z1 - z0;
    O(od.floor, bb(x0 + 0.02, x1 - 0.02, 0, 0.01, z0 + 0.02, z1 - 0.02));
    const side = (len: number, cx: number, cz: number, ry: number) => {
      const g = new THREE.PlaneGeometry(len, h);
      uvScale(g, len / 0.9, 1);
      g.rotateY(ry);
      g.translate(cx, h / 2, cz);
      return g;
    };
    put(ordG, od.wall, mergeInto(THREE, [side(W, (x0 + x1) / 2, z1, 0), side(W, (x0 + x1) / 2, z0, Math.PI), side(D, x1, (z0 + z1) / 2, Math.PI / 2), side(D, x0, (z0 + z1) / 2, -Math.PI / 2)]));
    // Sawtooth roof: 4 teeth running along x, glazing faces north.
    const n = 4,
      tooth = D / n,
      th = 0.18;
    for (let i = 0; i < n; i++) {
      const za = z0 + i * tooth,
        zb = za + tooth;
      const slope = Math.hypot(tooth, th);
      const ang = Math.atan2(th, tooth);
      const g = new THREE.PlaneGeometry(W + 0.06, slope).rotateX(-Math.PI / 2 + ang).translate((x0 + x1) / 2, h + th / 2, (za + zb) / 2);
      uvScale(g, 4, 1);
      put(ordRoof, od.roof, g);
      put(ordRoof, od.skylight, new THREE.PlaneGeometry(W + 0.06, th).rotateY(Math.PI).translate((x0 + x1) / 2, h + th / 2, za + 0.002));
    }
    // Gable triangles closing the sawtooth ends.
    for (const x of [x0 - 0.03, x1 + 0.03]) {
      for (let i = 0; i < n; i++) {
        const za = z0 + i * tooth;
        const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(tooth, 0), new THREE.Vector2(0, th)]);
        put(ordRoof, od.roof, new THREE.ShapeGeometry(tri).rotateY(-Math.PI / 2).translate(x, h, za));
      }
    }
    // Blast-wall stub + chimney stack for the forge.
    put(ordRoof, od.roof, cyl(0.05, 0.4, x1 - 0.35, h, z0 + 0.3, 12));
  }

  // ============================================================ ORDNANCE INTERIOR
  {
    const P = O;
    // Propellant / explosive mixer: stainless vessel on legs with agitator drive. The ammunition
    // marker sits on the magazine out front; the materials one on the bar stock at the west end.
    const mx = -3.3,
      mz = -2.55;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      P(od.steel, bx(0.02, 0.18, 0.02, mx + 0.11 * Math.cos(a), 0.01, mz + 0.11 * Math.sin(a)));
    }
    P(
      od.vessel,
      lathe(
        THREE,
        [
          [0.001, 0],
          [0.08, 0.02],
          [0.13, 0.08],
          [0.13, 0.26],
          [0.12, 0.29],
          [0.001, 0.29],
        ],
        24
      ).translate(mx, 0.12, mz)
    );
    P(od.blue, cyl(0.04, 0.07, mx, 0.41, mz, 12));
    P(od.steel, bb(mx - 0.2, mx + 0.2, 0.3, 0.32, mz + 0.16, mz + 0.2));
    P(od.yellow, railing(THREE, [[mx - 0.2, 0.32, mz + 0.18], [mx + 0.2, 0.32, mz + 0.18]], 0.05, 0.003, 0.08));
    // Casting station: a row of shell bodies under a pour line.
    P(od.steel, bb(-4.2, -3.6, 0.01, 0.12, -2.95, -2.7));
    for (let i = 0; i < 6; i++) P(od.shell, cyl(0.022, 0.1, -3.65 - i * 0.1, 0.12, -2.83, 12));
    P(od.blue, bar(THREE, [-3.4, 0.34, -2.83], [-4.23, 0.34, -2.83], 0.012, 8));

    // Finished 155 mm shells on pallets (instanced).
    {
      const shellGeo = lathe(
        THREE,
        [
          [0.001, 0],
          [0.021, 0],
          [0.022, 0.01],
          [0.021, 0.06],
          [0.019, 0.085],
          [0.012, 0.105],
          [0.004, 0.118],
          [0.001, 0.12],
        ],
        14
      );
      const pts: Vec3[] = [];
      const pal: Vec2[] = [
        [-2.95, -1.65],
        [-3.25, -1.65],
        [-2.95, -1.95],
      ];
      for (const [px, pz] of pal) {
        P(od.pallet, bx(0.22, 0.02, 0.22, px, 0.01, pz));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pts.push([px - 0.075 + i * 0.05, 0.03, pz - 0.075 + j * 0.05]);
      }
      // Inside the igloo magazine as well.
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 3; j++) pts.push([IGLOO.cx - 0.12 + j * 0.12, 0.012, IGLOO.cz - 0.32 + i * 0.1]);
      const im = new THREE.InstancedMesh(shellGeo, od.shell, pts.length);
      const o = new THREE.Object3D();
      pts.forEach((p, i) => {
        o.position.set(p[0], p[1], p[2]);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      ordG.add(im);
      for (const [px, pz] of pal) P(od.band, bx(0.2, 0.006, 0.2, px, 0.075, pz).scale(1, 1, 1));
    }

    // Forging press with a glowing billet + alloy bar stock (materials anchor), west end.
    const fx = -4.1,
      fz = -2.05;
    for (const dx of [-0.13, 0.13]) P(od.steel, bx(0.06, 0.52, 0.12, fx + dx, 0.01, fz));
    P(od.steel, bb(fx - 0.2, fx + 0.2, 0.5, 0.6, fz - 0.08, fz + 0.08));
    P(od.blue, bb(fx - 0.16, fx + 0.16, 0.0, 0.1, fz - 0.1, fz + 0.1));
    P(od.steel, bx(0.16, 0.06, 0.14, fx, 0.32, fz));
    P(od.steel, cyl(0.03, 0.12, fx, 0.38, fz, 12));
    P(od.hot, cyl(0.035, 0.08, fx, 0.1, fz, 14));
    // Furnace beside it.
    P(od.red, rb(0.24, 0.26, 0.22, 0.02, fx - 0.36, 0.01, fz - 0.05));
    P(od.hot, bx(0.1, 0.08, 0.005, fx - 0.36, 0.08, fz + 0.065));
    // Bar stock rack (special alloys) + ingot stacks.
    const sx = -4.15,
      sz = -1.55;
    for (const dx of [-0.2, 0.2]) P(od.steel, bx(0.02, 0.14, 0.18, sx + dx, 0.01, sz));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P(od.alloy, cylX(0.016, 0.5, sx, 0.05 + j * 0.05, sz - 0.06 + i * 0.04, 10));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) P(od.ingot, rb(0.08, 0.03, 0.035, 0.006, -3.75, 0.01 + j * 0.032, -1.62 + i * 0.05 - 0.05).translate(0, 0, 0));
  }

  // ============================================================ IGLOO MAGAZINE (shell)
  {
    // Earth-covered arch running front-to-back (z), concrete headwall + door at the front.
    const { cx, cz, len, r } = IGLOO;
    put(ordG, od.mound, new THREE.CylinderGeometry(r, r, len, 24, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 0.78, 1).translate(cx, 0, cz));
    // Earth slope closing the back end (quarter sphere toward -z).
    put(ordG, od.mound, new THREE.SphereGeometry(r, 18, 10, 0, Math.PI, 0, Math.PI / 2).rotateY(Math.PI).scale(1, 0.78, 0.7).translate(cx, 0, cz - len / 2));
    put(ordG, od.headwall, bb(cx - r - 0.06, cx + r + 0.06, 0, r * 0.78 + 0.04, cz + len / 2 - 0.01, cz + len / 2 + 0.04));
    put(ordG, od.crate, bb(cx - 0.1, cx + 0.1, 0, 0.18, cz + len / 2 + 0.04, cz + len / 2 + 0.046));
    for (let i = 0; i < 2; i++) put(ordG, od.crate, rb(0.2, 0.08, 0.12, 0.01, cx, 0.0 + i * 0.08, cz + len / 2 - 0.12));
  }

  // ------------------------------------------------------------ contact shadows
  for (const [x, z, w, d] of [
    [-0.55, 2.25, 1.3, 0.6],
    [TR.cx + 0.15, TR.cz - TR.az + 0.16, 1.0, 0.6],
    [2.55, 1.55, 0.6, 0.4],
  ] as [number, number, number, number][]) {
    const s = contactShadow(THREE, w, d, 0.4, 0.009);
    s.position.x = x;
    s.position.z = z;
    rangeG.add(s);
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
  const GHOST = 0.13;
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      L.set("ctx", lerp(1, 0.45, ease(a)));
      L.set("range", lerp(1, 0.32, ease(a)));
      // Hangar (layer 1).
      L.set("hgrRoof", 1 - smoothstep(a, 0.04, 0.55));
      hgrRoof.position.y = ease(a) * 0.7;
      L.set("hgrWall", lerp(1, GHOST, ease(a)));
      L.set("hgrEq", lerp(1, 0.28, ease(b)));
      // Lab (layer 2).
      L.set("labRoof", 1 - smoothstep(b, 0.04, 0.55));
      labRoof.position.y = ease(b) * 0.6;
      L.set("labWall", lerp(1, GHOST, ease(b)));
      L.set("labEq", lerp(1, 0.3, ease(c)));
      // Ordnance shop + magazine (layer 3).
      L.set("ordRoof", 1 - smoothstep(c, 0.04, 0.55));
      ordRoof.position.y = ease(c) * 0.6;
      L.set("ordWall", lerp(1, GHOST, ease(c)));
      L.set("igloo", lerp(1, 0.16, ease(c)));
      L.set("ordEq", 1);
    },
  };

  // ------------------------------------------------------------ shared parts
  /** 6x6 military truck along +x (cab at +x), ~0.62 long. `bare` = chassis-only (in build). */
  function truck(
    P: Put,
    m: { body: T.Material; canvas: T.Material; tyre: T.Material; glass: T.Material; dark: T.Material },
    bare = false
  ) {
    P(m.dark, bx(0.6, 0.035, 0.16, 0, 0.06, 0));
    for (const x of [-0.2, -0.08, 0.2]) for (const z of [-0.085, 0.085]) P(m.tyre, cylZ(0.05, 0.04, x, 0.05, z, 14));
    P(m.body, rb(0.16, 0.15, 0.2, 0.025, 0.22, 0.08, 0));
    P(m.glass, bx(0.005, 0.055, 0.17, 0.302, 0.16, 0));
    P(m.dark, bx(0.02, 0.04, 0.2, 0.31, 0.08, 0));
    if (bare) return;
    P(m.body, bb(-0.3, 0.13, 0.095, 0.15, -0.1, 0.1));
    P(m.canvas, new THREE.CylinderGeometry(0.1, 0.1, 0.42, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.7, 1).translate(-0.085, 0.15, 0));
  }
}
