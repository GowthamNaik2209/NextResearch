// Battery Storage (PLI-ACC): a miniature advanced-chemistry-cell gigafactory
// campus on a display plinth - the kind of site Ola, Reliance, Amara Raja,
// Exide or Agratas are building under the PLI scheme for ACC batteries.
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Front strip (outside the factory): a grid battery (BESS) container yard
//     with inverter skids and a step-up transformer to the west, an EV /
//     two-wheeler loading bay in the middle (a car carrier, EVs on chargers, a
//     row of e-scooters), and an open-sided pack-assembly shed to the east
//     (modules stacked into packs by robots) beside the cell hall's dispatch
//     canopy.
//   · The gigafactory behind it: one long building in three halls, built in the
//     order the cell is made (west -> east):
//       - Materials store (west): copper and aluminium foil rolls, separator
//         film, an electrolyte tank farm with salt drums and binder bags.
//       - Electrode hall (middle, tallest): a cathode and an anode coating line,
//         each with slurry mixers, a slot-die coater, a long drying oven and a
//         calender with its big steel rolls, fed by big-bag powder stations.
//       - Cell hall (east): a glass dry room with stacking/winding machines and
//         an electrolyte filler, formation & ageing racks lit green and amber,
//         and a conveyor of finished cells to the dispatch canopy.
//     A pipe rack along the back carries electrolyte from the store to the
//     cell hall.
//
// Layers: 0 Demand & Storage Sites (front strip, everything closed), 1 Cell
// Gigafactory (cell hall walls section down, roof lifts), 2 Electrode
// Materials (electrode hall opens), 3 Foils & Chemicals (materials store
// opens). Halls peel with a moving world-space clipping plane, like the ECMS
// and pharma campuses; the outside systems ghost rather than disappear.
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
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on.
export const PLIACC_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // Each rail lists its callouts in zone order, so markers are placed for that order to read
  // top->bottom (left/right rails) and left->right (top/bottom rails) from the default view.
  // Rails (zone order): left foil, BESS; top electrolyte, cathode, anode; right cells; bottom EVs, packs.
  // layer 0: demand & storage sites
  bess: { pos: [-2.66, 0.24, 1.87], side: "left" }, // BESS container roof
  evofftake: { pos: [0.0, 0.31, 1.22], side: "bottom" }, // EVs on the car carrier
  packs: { pos: [2.36, 0.19, 1.62], side: "bottom" }, // battery pack on the assembly line
  // layer 1: cell gigafactory
  cells: { pos: [2.75, 0.54, -2.3], side: "right" }, // formation racks
  // layer 2: electrode materials
  cathode: { pos: [-2.12, 0.35, -2.34], side: "top" }, // cathode slurry mixer
  anode: { pos: [0.72, 0.29, -0.7], side: "top" }, // anode slitter after the calender
  // layer 3: foils & chemicals
  electrolyte: { pos: [-4.0, 0.4, -2.2], side: "top" }, // west tank of the electrolyte farm
  foil: { pos: [-3.0, 0.28, -0.62], side: "left" }, // aluminium foil rolls
};

export const PLIACC_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.05, 0.1],
    narration:
      "Welcome to the battery gigafactory campus. The PLI scheme for advanced chemistry cells pays companies like Ola Electric, Reliance and Amara Raja to make battery cells in India instead of importing them. Out front are the buyers - grid battery yards, pack assemblers and EV makers - and inside the factory, the cell is built from foils and chemicals up.",
  },
  {
    id: "demand",
    layer: 0,
    label: "Storage & EVs",
    pos: [0.6, 5.9, 10.4],
    target: [-0.3, 0.1, 1.3],
    narration:
      "The demand side. On the left, white containers full of battery racks store solar power for the grid - developers like Tata Power and JSW Energy are building these. In the middle, EVs and scooters from Tata, Mahindra, Ola and TVS are loaded up, and on the right, in the open shed, cells are packed into battery packs with their control electronics - the work of Exide and Amara Raja.",
  },
  {
    id: "cellhall",
    layer: 1,
    label: "Cell Line",
    pos: [5.9, 4.3, 3.4],
    target: [2.0, 0.15, -1.25],
    narration:
      "The cell hall. In the glass dry room, where the air is drier than a desert, electrode sheets are stacked or wound with separator film and filled with electrolyte. Then each cell is charged for the first time on the green-lit formation racks and aged for weeks before it is graded and shipped.",
  },
  {
    id: "electrode",
    layer: 2,
    label: "Electrode Lines",
    pos: [2.1, 4.7, 3.1],
    target: [-0.65, 0.15, -1.45],
    narration:
      "The electrode hall. Mixers stir cathode powder (LFP or NMC) and anode graphite into a thick black slurry. A coater spreads it thinly on metal foil, a long oven dries it, and the steel rolls of the calender press it to an exact thickness - cathode on the back line, anode on the front.",
  },
  {
    id: "materials",
    layer: 3,
    label: "Foils & Chemicals",
    pos: [-0.9, 3.4, 2.4],
    target: [-3.35, 0.15, -1.25],
    narration:
      "The innermost layer is what a cell is made of. Copper foil carries the anode and aluminium foil the cathode; white separator film keeps them apart. In the tank farm, electrolyte made from lithium salts and solvents waits to be piped to the cell hall - chemical makers like Neogen and Gujarat Fluorochemicals are building this supply in India.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the gigafactory runs west to east in the order a cell is made - materials store, electrode hall, cell hall. Along the front are the customers for its cells: the grid battery yard, the EV loading bay and the pack shed.",
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

export function buildPliacc(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [campusG, cellG, eleG, matG] = ctx.layerGroups;
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
  const place = (P: Put, x: number, y: number, z: number, ry = 0): Put => (m, g) => {
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
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** Four outward-facing wall planes; UV u repeats per `tile` units, v spans 0..h. */
  const wallRing = (b: Box, tile = 1) => {
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
    side(w, (b.x0 + b.x1) / 2, b.z1, 0);
    side(w, (b.x0 + b.x1) / 2, b.z0, Math.PI);
    side(d, b.x1, (b.z0 + b.z1) / 2, Math.PI / 2);
    side(d, b.x0, (b.z0 + b.z1) / 2, -Math.PI / 2);
    return mergeInto(THREE, geos);
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrap = false) => {
    const t = canvasTexture(THREE, w, h, draw);
    if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    else t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  /** Instanced copies of one geometry (one draw call). */
  const inst = (
    parent: T.Object3D,
    geo: T.BufferGeometry,
    mat: T.Material,
    items: { p: Vec3; ry?: number; s?: Vec3; c?: number }[]
  ) => {
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(0, it.ry ?? 0, 0);
      o.scale.set(...(it.s ?? ([1, 1, 1] as Vec3)));
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      if (it.c !== undefined) {
        col.setHex(it.c);
        im.setColorAt(i, col);
      }
    });
    parent.add(im);
  };

  // ------------------------------------------------------------ site plan
  const FLOOR = 0.012;
  const DADO = 0.1;
  const MAT: Box = { x0: -4.35, x1: -2.45, z0: -2.75, z1: 0.25, h: 0.72 };
  const ELE: Box = { x0: -2.38, x1: 0.95, z0: -2.75, z1: 0.25, h: 0.92 };
  const CEL: Box = { x0: 1.02, x1: 3.2, z0: -2.75, z1: 0.25, h: 0.8 };
  const YARD = { x0: -4.38, x1: -1.72, z0: 0.88, z1: 2.5 }; // BESS yard
  const SHED: Box = { x0: 1.5, x1: 3.25, z0: 1.0, z1: 2.3, h: 0.42 }; // pack shed (east)
  const EVX = -1.38; // west edge of the EV bay (middle of the front strip)
  const PX = 4.75,
    PZ = 3.15,
    PR = 0.4;
  const GX0 = -PX,
    GX1 = PX,
    GZ0 = -PZ,
    GZ1 = PZ;

  // ------------------------------------------------------------ textures
  const groundTex = canvasTexture(THREE, 1024, 680, (g, w, h) => {
    const X = (x: number) => ((x - GX0) / (GX1 - GX0)) * w;
    const Z = (z: number) => ((z - GZ0) / (GZ1 - GZ0)) * h;
    const sx = w / (GX1 - GX0);
    const rnd = mulberry(7);
    g.fillStyle = "#c3c6c0";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + rnd() * 0.04})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    const rect = (c: string, x0: number, x1: number, z0: number, z1: number) => {
      g.fillStyle = c;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    };
    // Lawns.
    const lawn = (x0: number, x1: number, z0: number, z1: number) => {
      rect("#6f9a56", x0, x1, z0, z1);
      g.fillStyle = "rgba(40,70,30,0.25)";
      for (let i = 0; i < 220; i++) g.fillRect(X(x0) + rnd() * (x1 - x0) * sx, Z(z0) + rnd() * (z1 - z0) * sx, 2, 2);
    };
    lawn(-4.75, 4.75, 2.96, 3.15);
    lawn(4.47, 4.75, -3.15, 2.6);
    lawn(-4.75, 3.38, -3.15, -2.98);
    lawn(-1.62, -1.45, 0.86, 2.55);
    // BESS yard gravel.
    rect("#8d8f8c", YARD.x0, YARD.x1, YARD.z0, YARD.z1);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "40,40,40" : "230,230,225"},${0.15 + rnd() * 0.2})`;
      g.fillRect(X(YARD.x0) + rnd() * (YARD.x1 - YARD.x0) * sx, Z(YARD.z0) + rnd() * (YARD.z1 - YARD.z0) * sx, 2, 2);
    }
    // Container pads.
    g.fillStyle = "#b5b7b2";
    for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) g.fillRect(X(-4.25 + c * 0.66), Z(0.98 + r * 0.38), 0.54 * sx, 0.26 * sx);
    // Roads (asphalt with a dashed centre line).
    const road = (x0: number, z0: number, x1: number, z1: number) => {
      rect("#3e4348", x0, x1, z0, z1);
      g.strokeStyle = "rgba(235,235,225,0.75)";
      g.lineWidth = 2;
      g.setLineDash([10, 9]);
      g.beginPath();
      if (x1 - x0 > z1 - z0) {
        g.moveTo(X(x0), Z((z0 + z1) / 2));
        g.lineTo(X(x1), Z((z0 + z1) / 2));
      } else {
        g.moveTo(X((x0 + x1) / 2), Z(z0));
        g.lineTo(X((x0 + x1) / 2), Z(z1));
      }
      g.stroke();
      g.setLineDash([]);
    };
    road(-4.75, 2.58, 4.75, 2.95);
    road(3.38, -3.15, 4.45, 2.95);
    road(-4.45, 0.32, 3.38, 0.78);
    // EV parking bays with green charging markings.
    g.strokeStyle = "rgba(240,240,230,0.85)";
    g.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const x = EVX + i * 0.27;
      g.beginPath();
      g.moveTo(X(x), Z(1.72));
      g.lineTo(X(x), Z(2.1));
      g.stroke();
    }
    g.fillStyle = "rgba(47,170,110,0.55)";
    for (let i = 0; i < 9; i++) g.fillRect(X(EVX + 0.05 + i * 0.27), Z(1.74), 0.17 * sx, 0.34 * sx);
    // Scooter line.
    g.fillStyle = "rgba(240,240,230,0.7)";
    g.fillRect(X(EVX), Z(2.47), 2.3 * sx, 2);
    // Hazard hatching at the dispatch canopy and the pack shed apron.
    g.fillStyle = "rgba(226,179,58,0.85)";
    for (let i = 0; i < 10; i++) g.fillRect(X(1.55 + i * 0.16), Z(0.28), 0.06 * sx, 0.05 * sx);
    for (let i = 0; i < 6; i++) g.fillRect(X(1.6 + i * 0.28), Z(0.86), 0.1 * sx, 0.04 * sx);
  });
  groundTex.anisotropy = 8;

  const floorTex = (base: string, line: string, cell = 32) =>
    tex(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        g.fillStyle = line;
        for (let x = 0; x < w; x += cell) g.fillRect(x, 0, 1, h);
        for (let y = 0; y < h; y += cell) g.fillRect(0, y, w, 1);
      },
      true
    );
  const celFloorTex = floorTex("#dfe5e8", "rgba(0,0,0,0.07)");
  const eleFloorTex = floorTex("#cdd4d3", "rgba(0,0,0,0.08)");
  const matFloorTex = floorTex("#c9c3b8", "rgba(0,0,0,0.08)", 48);
  for (const t of [celFloorTex, eleFloorTex, matFloorTex]) t.repeat.set(3, 3);

  /** Façade: ribbed cladding, a high window band, an accent stripe and a base course. */
  const facade = (H: number, base: string, band: string, accent: string) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) {
        g.fillStyle = "rgba(0,0,0,0.08)";
        g.fillRect(x, 0, 3, h);
        g.fillStyle = "rgba(255,255,255,0.2)";
        g.fillRect(x + 3, 0, 1, h);
      }
      const y0 = h * 0.2,
        y1 = h * 0.32;
      g.fillStyle = band;
      g.fillRect(0, y0, w, y1 - y0);
      g.fillStyle = "rgba(255,255,255,0.25)";
      for (let x = 0; x < w; x += 32) g.fillRect(x, y0, 2, y1 - y0);
      g.fillStyle = accent;
      g.fillRect(0, h * 0.06, w, h * 0.05);
      g.fillStyle = "#59616a";
      g.fillRect(0, h * 0.9, w, h * 0.1);
    });
  const celTex = facade(CEL.h, "#eef1f4", "#2b4a63", "#2faa6e");
  const eleTex = facade(ELE.h, "#e4e8ec", "#24435d", "#2faa6e");
  const matTex = facade(MAT.h, "#ddd6cb", "#3b4651", "#d9742b");
  const roofTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#cfd3d6";
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(x, 0, 2, h);
      }
    },
    true
  );
  /** BESS container skin: ribbed white steel with a door pair at each end. */
  const containerTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#f1f3f4";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 7) {
      g.fillStyle = "rgba(0,0,0,0.08)";
      g.fillRect(x, 0, 2, h);
    }
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (const x of [0.18, 0.5, 0.82]) g.fillRect(w * x, h * 0.12, 2, h * 0.8);
    g.fillStyle = "#2faa6e";
    g.fillRect(0, h * 0.06, w, h * 0.05);
    g.fillStyle = "#e2b33a";
    g.fillRect(w * 0.9, h * 0.35, w * 0.05, h * 0.12);
  });
  const solarTex = tex(
    128,
    64,
    (g, w, h) => {
      g.fillStyle = "#1d2c4a";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(170,200,240,0.35)";
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
    },
    true
  );

  // ------------------------------------------------------------ materials
  const baseM = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbf7a, emissiveIntensity: 0.35 })),
    celFloor: L.add("base", std(0xffffff, 0.05, 0.4, { map: celFloorTex })),
    eleFloor: L.add("base", std(0xffffff, 0.05, 0.45, { map: eleFloorTex })),
    matFloor: L.add("base", std(0xffffff, 0.05, 0.8, { map: matFloorTex })),
    pipe: L.add("base", std(0x9aa4ad, 0.7, 0.35)),
    pipeGreen: L.add("base", std(0x2f8f5e, 0.4, 0.4)),
    rack: L.add("base", std(0x5c6b7a, 0.6, 0.45)),
  };
  const ctxM = {
    canopy: L.add("trees", std(0x4f8a3e, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    glass: L.add("ctx", std(0x1b2631, 0.6, 0.15)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    cabWhite: L.add("ctx", std(0xf4f6f8, 0.25, 0.35)),
    tanker: L.add("ctx", std(0xd6dbe0, 0.85, 0.25)),
    dark: L.add("ctx", std(0x2b3137, 0.4, 0.5)),
  };
  // Layer-0 systems (BESS yard, pack shed, EV bay): stay readable when ghosted.
  const l0 = {
    container: L.add("l0", std(0xffffff, 0.35, 0.45, { map: containerTex })),
    hvac: L.add("l0", std(0xb9c0c7, 0.5, 0.4)),
    fan: L.add("l0", std(0x30363d, 0.5, 0.45)),
    skid: L.add("l0", std(0x5c6b7a, 0.55, 0.45)),
    xfmr: L.add("l0", std(0x6f7c84, 0.6, 0.45)),
    bushing: L.add("l0", std(0x8a4b2c, 0.2, 0.5)),
    fence: L.add("l0", std(0xa3abb3, 0.7, 0.4)),
    steel: L.add("l0", std(0x5c6b7a, 0.6, 0.45)),
    roof: L.add("l0", std(0xb3bcc4, 0.55, 0.4, { side: DS })),
    pack: L.add("l0", std(0x24364f, 0.45, 0.4)),
    packLid: L.add("l0", std(0x8d97a1, 0.75, 0.3)),
    orange: L.add("l0", std(0xe0702a, 0.3, 0.45)),
    module: L.add("l0", std(0x3a6fa8, 0.4, 0.4)),
    belt: L.add("l0", std(0x23272b, 0.2, 0.8)),
    robot: L.add("l0", std(0xe8a524, 0.35, 0.4)),
    robotDark: L.add("l0", std(0x30363d, 0.5, 0.45)),
    tester: L.add("l0", std(0xe8ebee, 0.2, 0.4)),
    screen: L.add("l0", std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.0 })),
    greenLed: L.add("l0", std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    pallet: L.add("l0", std(0x9a7448, 0, 0.85)),
    crate: L.add("l0", std(0x2f8f5e, 0.2, 0.6)),
    carrier: L.add("l0", std(0x3a434c, 0.55, 0.4)),
    cab: L.add("l0", std(0x2b62c4, 0.45, 0.3)),
    evWhite: L.add("l0", std(0xeef1f3, 0.5, 0.3)),
    evTeal: L.add("l0", std(0x1f9e8f, 0.55, 0.3)),
    evRed: L.add("l0", std(0xc23b32, 0.55, 0.3)),
    evGrey: L.add("l0", std(0x6f7a85, 0.6, 0.3)),
    scooter: L.add("l0", std(0xf2f4f5, 0.3, 0.35)),
    scooterBlue: L.add("l0", std(0x2f6fd0, 0.35, 0.35)),
    charger: L.add("l0", std(0xeef1f3, 0.2, 0.4)),
    tyre: L.add("l0", std(0x17181a, 0.1, 0.85)),
    glass: L.add("l0", std(0x1b2631, 0.6, 0.15)),
    yellow: L.add("l0", std(0xe2b33a, 0.35, 0.45)),
  };
  /** Equipment palette for one layer bucket. */
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    black: L.add(bucket, std(0x141618, 0.2, 0.6)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    chrome: L.add(bucket, std(0xe4e8ec, 1.0, 0.12)),
    win: L.add(bucket, std(0x1c2a36, 0.6, 0.15)),
    glass: L.add(bucket, std(0xd5ebf3, 0.2, 0.05, { opacity: 0.28, side: DS })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.1 })),
    amberLed: L.add(bucket, std(0x332000, 0, 0.5, { emissive: 0xffb020, emissiveIntensity: 0.9 })),
    blueLed: L.add(bucket, std(0x001833, 0, 0.5, { emissive: 0x5fb4ff, emissiveIntensity: 0.6 })),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    teal: L.add(bucket, std(0x17a398, 0.25, 0.4)),
    green: L.add(bucket, std(0x2f8f5e, 0.3, 0.45)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    copper: L.add(bucket, std(0xc8763c, 0.9, 0.28)),
    alu: L.add(bucket, std(0xd8dde2, 0.95, 0.2)),
    film: L.add(bucket, std(0xf6f8f8, 0.0, 0.35, { opacity: 0.92 })),
    belt: L.add(bucket, std(0x23272b, 0.2, 0.8)),
    pallet: L.add(bucket, std(0x9a7448, 0, 0.85)),
    rack: L.add(bucket, std(0x4f6b8a, 0.55, 0.45)),
    cell: L.add(bucket, std(0xb6bec6, 0.85, 0.3)),
    cellWrap: L.add(bucket, std(0x2b62c4, 0.35, 0.4)),
    bag: L.add(bucket, std(0xf0ece2, 0, 0.85)),
  });
  const cE = eqMats("celEq");
  const eE = eqMats("eleEq");
  const mE = eqMats("matEq");
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    sky: L.add(bucket, std(0x2a3f52, 0.6, 0.15)),
    solar: L.add(bucket, std(0xffffff, 0.6, 0.25, { map: solarTex })),
    ss: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
  });

  // ------------------------------------------------------------ plinth + ground
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
    mesh(campusG, gg, baseM.ground);
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    mesh(campusG, pl, baseM.plinth);
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    mesh(campusG, lip, baseM.lip);
    const floor = (b: Box, m: T.Material) => {
      const g = new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0).rotateX(-Math.PI / 2);
      uvScale(g, (b.x1 - b.x0) / 3, (b.z1 - b.z0) / 3);
      g.translate((b.x0 + b.x1) / 2, FLOOR, (b.z0 + b.z1) / 2);
      put(campusG, m, g);
    };
    floor(CEL, baseM.celFloor);
    floor(ELE, baseM.eleFloor);
    floor(MAT, baseM.matFloor);
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Mesh; bucket: string };
  const peels: Peel[] = [];
  const capMat = std(0x343c45, 0.3, 0.6);
  const makePeel = (b: Box, map: T.Texture, roofBucket: string) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.h);
    const wm = std(0xffffff, 0.15, 0.55, { map, side: DS, clippingPlanes: [plane] });
    mesh(campusG, wallRing(b), wm);
    const roof = new THREE.Group();
    campusG.add(roof);
    const t = 0.03,
      hh = 0.02;
    const capG = mergeInto(THREE, [
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z0 - t / 2, b.z0 + t / 2),
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z1 - t / 2, b.z1 + t / 2),
      bb(b.x0 - t / 2, b.x0 + t / 2, -hh, 0, b.z0, b.z1),
      bb(b.x1 - t / 2, b.x1 + t / 2, -hh, 0, b.z0, b.z1),
    ]);
    const cap = mesh(campusG, capG, capMat);
    cap.position.y = b.h;
    peels.push({ b, plane, roof, cap, bucket: roofBucket });
    const R = roofMats(roofBucket);
    const P = putter(roof);
    P(R.mem, uvScale(bb(b.x0, b.x1, b.h - 0.03, b.h, b.z0, b.z1), (b.x1 - b.x0) / 1.5, (b.z1 - b.z0) / 1.5));
    const pt = 0.025,
      ph = 0.05;
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(R.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(R.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    return { P, R, plane };
  };
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55) =>
    std(color, metal, rough, { clippingPlanes: [plane], side: DS });
  /** Tilted rows of rooftop solar panels on stub legs. */
  const solarRows = (P: Put, R: ReturnType<typeof roofMats>, H: number, x0: number, x1: number, z0: number, rows: number, pw = 0.6) => {
    const n = Math.floor((x1 - x0) / (pw + 0.08));
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < n; k++) {
        const x = x0 + pw / 2 + k * (pw + 0.08),
          z = z0 + r * 0.27;
        P(R.solar, uvScale(new THREE.BoxGeometry(pw, 0.008, 0.2).rotateX(-0.3).translate(x, H + 0.07, z), pw / 0.25, 1));
        P(R.dark, bx(0.012, 0.05, 0.012, x - pw / 2 + 0.05, H, z + 0.03));
        P(R.dark, bx(0.012, 0.05, 0.012, x + pw / 2 - 0.05, H, z + 0.03));
      }
  };

  // ---- Cell hall: dry-room dehumidifiers + solar on the roof, dispatch doors to the front.
  {
    const { P, R, plane } = makePeel(CEL, celTex, "roofCel");
    const H = CEL.h;
    for (let i = 0; i < 2; i++) {
      const x = 1.45 + i * 0.75;
      P(R.unit, rb(0.55, 0.16, 0.34, 0.02, x, H, -2.25));
      for (const dx of [-0.15, 0.15]) P(R.dark, cyl(0.07, 0.014, x + dx, H + 0.16, -2.25, 18));
      P(R.ss, bb(x - 0.04, x + 0.04, H, H + 0.1, -2.08, -1.6)); // duct down into the dry room
    }
    solarRows(P, R, H, 1.12, 3.15, -1.3, 5, 0.55);
    for (let i = 0; i < 3; i++) P(R.sky, bb(2.45 + i * 0.22, 2.6 + i * 0.22, H + 0.002, H + 0.03, -2.6, -1.95));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    for (const x of [1.75, 2.25, 2.75]) put(campusG, doorM, bb(x - 0.16, x + 0.16, 0, 0.3, CEL.z1 + 0.002, CEL.z1 + 0.012));
    const sign = clipMat(0x2faa6e, plane, 0.3, 0.4);
    put(campusG, sign, bb(1.3, 2.95, 0.6, 0.66, CEL.z1 + 0.002, CEL.z1 + 0.01));
    put(campusG, doorM, bb(CEL.x1 + 0.002, CEL.x1 + 0.012, 0, 0.3, -2.2, -1.85));
  }
  // ---- Electrode hall: long solar arrays, oven exhaust stacks + NMP solvent recovery units.
  {
    const { P, R, plane } = makePeel(ELE, eleTex, "roofEle");
    const H = ELE.h;
    solarRows(P, R, H, -2.3, 0.9, -2.55, 3, 0.7);
    solarRows(P, R, H, -2.3, 0.9, -0.6, 3, 0.7);
    for (let i = 0; i < 4; i++) {
      const x = -1.3 + i * 0.55;
      for (const z of [-2.15, -0.85]) {
        P(R.ss, cyl(0.03, 0.22, x, H, z - 0.0, 12));
        P(R.dark, cyl(0.036, 0.016, x, H + 0.22, z, 12));
      }
    }
    for (const x of [-1.8, -0.4]) {
      P(R.unit, rb(0.6, 0.14, 0.34, 0.02, x, H, -1.5));
      for (const dx of [-0.17, 0, 0.17]) P(R.dark, cyl(0.055, 0.012, x + dx, H + 0.14, -1.5, 16));
    }
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    put(campusG, glassM, bb(-0.95, -0.25, 0.0, 0.4, ELE.z1 + 0.002, ELE.z1 + 0.012));
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    put(campusG, whiteM, bb(-1.02, -0.18, 0.4, 0.43, ELE.z1, ELE.z1 + 0.2));
    const sign = clipMat(0x2faa6e, plane, 0.3, 0.4);
    put(campusG, sign, bb(-2.1, 0.7, 0.7, 0.76, ELE.z1 + 0.002, ELE.z1 + 0.01));
  }
  // ---- Materials store: scrubber + vent stack (electrolyte solvents), roller door to the yard road.
  {
    const { P, R, plane } = makePeel(MAT, matTex, "roofMat");
    const H = MAT.h;
    P(R.unit, rb(0.6, 0.18, 0.4, 0.02, -3.6, H, -0.85));
    P(R.ss, cyl(0.04, 0.38, -3.15, H, -0.85, 12));
    P(R.dark, cyl(0.048, 0.02, -3.15, H + 0.38, -0.85, 12));
    for (let i = 0; i < 3; i++) P(R.sky, bb(-4.15 + i * 0.55, -3.85 + i * 0.55, H + 0.002, H + 0.03, -2.4, -1.8));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    put(campusG, doorM, bb(-4.05, -3.6, 0, 0.32, MAT.z1 + 0.002, MAT.z1 + 0.012));
    put(campusG, doorM, bb(MAT.x0 - 0.012, MAT.x0 - 0.002, 0, 0.3, -1.4, -1.0));
  }
  // ---- Pipe rack along the back: electrolyte + utilities from the store to the cell hall.
  {
    const P = putter(campusG);
    const z = -2.88,
      y = 0.5;
    for (let x = -3.9; x <= 2.7; x += 0.6) {
      P(baseM.rack, bb(x - 0.012, x + 0.012, 0, y + 0.06, z - 0.07, z - 0.05));
      P(baseM.rack, bb(x - 0.012, x + 0.012, 0, y + 0.06, z + 0.05, z + 0.07));
      P(baseM.rack, bb(x - 0.014, x + 0.014, y - 0.02, y, z - 0.08, z + 0.08));
    }
    P(baseM.pipe, cylX(0.014, 6.7, -0.6, y + 0.016, z - 0.035, 10));
    P(baseM.pipeGreen, cylX(0.014, 6.7, -0.6, y + 0.016, z + 0.0, 10));
    P(baseM.pipe, cylX(0.01, 6.7, -0.6, y + 0.012, z + 0.035, 10));
    for (const x of [-3.9, 2.7]) P(baseM.pipeGreen, bb(x - 0.012, x + 0.012, 0.3, y + 0.03, z + 0.08, z + 0.13));
  }

  // ============================================================ LAYER 0: DEMAND & STORAGE SITES
  {
    const P = putter(campusG);
    // ---- BESS yard: 12 battery containers with end HVAC units, inverter skids, a step-up transformer.
    {
      const cw = 0.52,
        ch = 0.2,
        cd = 0.22;
      const box = uvScale(new THREE.BoxGeometry(cw, ch, cd).translate(0, ch / 2, 0), 1, 1);
      const items: { p: Vec3 }[] = [];
      for (let c = 0; c < 3; c++)
        for (let r = 0; r < 4; r++) {
          const x = -3.98 + c * 0.66,
            z = 1.11 + r * 0.38;
          items.push({ p: [x, 0.012, z] });
          P(l0.hvac, bb(x + cw / 2, x + cw / 2 + 0.04, 0.03, 0.17, z - 0.07, z + 0.07)); // end HVAC
          P(l0.fan, cylX(0.03, 0.006, x + cw / 2 + 0.043, 0.1, z, 14));
          P(l0.skid, bb(x - 0.2, x + 0.2, 0.212, 0.222, z - 0.09, z + 0.09)); // roof rails
        }
      inst(campusG, box, l0.container, items);
      // Power conversion (inverter) skids between container pairs, with cable trench.
      for (let c = 0; c < 3; c++)
        for (let r = 0; r < 2; r++) {
          const x = -3.98 + c * 0.66,
            z = 1.3 + r * 0.76;
          P(l0.skid, rb(0.2, 0.1, 0.09, 0.01, x, 0.012, z));
          P(l0.greenLed, bb(x - 0.06, x - 0.03, 0.07, 0.085, z + 0.046, z + 0.048));
          P(l0.fan, cylZ(0.022, 0.006, x + 0.04, 0.07, z + 0.047, 12));
        }
      // Step-up transformer + bushings and a small switch bay at the yard's east end.
      {
        const x = -1.98,
          z = 1.35;
        P(l0.xfmr, rb(0.2, 0.18, 0.24, 0.015, x, 0.012, z));
        for (let k = 0; k < 6; k++) P(l0.fan, bb(x + 0.1, x + 0.115, 0.04, 0.17, z - 0.11 + k * 0.042, z - 0.09 + k * 0.042));
        for (const dz of [-0.07, 0, 0.07]) P(l0.bushing, cyl(0.012, 0.09, x - 0.04, 0.192, z + dz, 8, 0.007));
        P(l0.xfmr, cyl(0.035, 0.18, x + 0.04, 0.19, z - 0.07, 12)); // conservator
        for (const dz of [-0.07, 0, 0.07]) {
          P(l0.fence, bb(x - 0.005, x + 0.005, 0.012, 0.36, z + 0.45 + dz - 0.005, z + 0.45 + dz + 0.005));
          P(l0.bushing, cyl(0.01, 0.06, x, 0.36, z + 0.45 + dz, 8, 0.006));
        }
        P(l0.fence, bb(x - 0.005, x + 0.005, 0.4, 0.41, z + 0.36, z + 0.54));
      }
      // Perimeter fence.
      const fence: Vec3[] = [
        [YARD.x0 + 0.03, 0, YARD.z0 + 0.03],
        [YARD.x1 - 0.03, 0, YARD.z0 + 0.03],
        [YARD.x1 - 0.03, 0, YARD.z1 - 0.03],
        [YARD.x0 + 0.03, 0, YARD.z1 - 0.03],
        [YARD.x0 + 0.03, 0, YARD.z0 + 0.03],
      ];
      for (let i = 0; i < fence.length - 1; i++) {
        const a = fence[i],
          b = fence[i + 1];
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const n = Math.max(1, Math.round(len / 0.18));
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          const x = lerp(a[0], b[0], t),
            z = lerp(a[2], b[2], t);
          P(l0.fence, bb(x - 0.005, x + 0.005, 0, 0.1, z - 0.005, z + 0.005));
        }
        for (const y of [0.05, 0.095]) P(l0.fence, bar(THREE, [a[0], y, a[2]], [b[0], y, b[2]], 0.003, 4));
      }
    }

    // ---- Pack shed (east, beside the cell hall): open steel frame, gable roof;
    //      modules -> pack enclosure -> end-of-line test -> finished packs.
    {
      const S = SHED;
      for (const x of [S.x0, (S.x0 + S.x1) / 2, S.x1])
        for (const z of [S.z0, S.z1]) P(l0.steel, bx(0.03, S.h, 0.03, x, 0, z));
      for (const z of [S.z0, S.z1]) P(l0.steel, bb(S.x0, S.x1, S.h - 0.03, S.h, z - 0.015, z + 0.015));
      {
        const w = S.x1 - S.x0 + 0.12,
          d = S.z1 - S.z0 + 0.12;
        const xc = (S.x0 + S.x1) / 2,
          zc = (S.z0 + S.z1) / 2;
        const pitch = 0.16;
        for (const s of [-1, 1])
          P(l0.roof, new THREE.BoxGeometry(w, 0.012, d / 2 / Math.cos(pitch)).rotateX(s * pitch).translate(xc, S.h + Math.tan(pitch) * (d / 4), zc + (s * d) / 4));
      }
      // Main conveyor (west -> east) with packs at each station.
      const z = 1.62;
      P(l0.belt, bb(S.x0 + 0.08, S.x1 - 0.08, 0.09, 0.105, z - 0.09, z + 0.09));
      for (let i = 0; i < 6; i++) P(l0.steel, bx(0.02, 0.09, 0.16, S.x0 + 0.12 + i * 0.3, 0, z));
      const packAt = (x: number, mods: number, lid: boolean) => {
        P(l0.pack, rb(0.22, 0.035, 0.15, 0.008, x, 0.105, z));
        for (let k = 0; k < mods; k++) P(l0.module, rb(0.045, 0.03, 0.12, 0.004, x - 0.075 + k * 0.05, 0.14, z));
        if (lid) {
          P(l0.packLid, rb(0.22, 0.012, 0.15, 0.006, x, 0.17, z));
          P(l0.orange, bb(x + 0.09, x + 0.11, 0.12, 0.15, z + 0.075, z + 0.082)); // HV connector
        }
      };
      packAt(1.72, 1, false);
      packAt(2.04, 2, false);
      packAt(2.36, 4, false);
      packAt(2.68, 4, true);
      packAt(3.0, 4, true);
      // Module infeed: stacks of modules on pallets + two robot arms placing them.
      for (let s = 0; s < 2; s++) {
        const x = 1.72 + s * 0.42;
        P(l0.pallet, bb(x - 0.1, x + 0.1, 0, 0.015, 1.13, 1.31));
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) P(l0.module, rb(0.045, 0.03, 0.12, 0.004, x - 0.06 + k * 0.06, 0.015 + r * 0.032, 1.22));
      }
      for (const x of [1.9, 2.3]) {
        const bz = 1.38;
        P(l0.robotDark, cyl(0.04, 0.04, x, 0, bz, 16));
        P(l0.robot, cyl(0.03, 0.05, x, 0.04, bz, 14));
        P(l0.robot, bar(THREE, [x, 0.09, bz], [x + 0.03, 0.26, bz + 0.06], 0.018, 10));
        P(l0.robot, bar(THREE, [x + 0.03, 0.26, bz + 0.06], [x + 0.06, 0.22, bz + 0.2], 0.014, 10));
        P(l0.robotDark, cyl(0.01, 0.05, x + 0.06, 0.17, bz + 0.2, 8));
      }
      // BMS / end-of-line tester and finished packs on pallets.
      P(l0.tester, rb(0.2, 0.3, 0.14, 0.015, 3.02, 0, 1.95));
      P(l0.screen, bb(2.95, 3.09, 0.17, 0.25, 2.021, 2.024));
      P(l0.greenLed, bb(2.93, 2.99, 0.08, 0.09, 2.021, 2.024));
      for (let s = 0; s < 3; s++) {
        const x = 1.75 + s * 0.36,
          pz = 2.03;
        P(l0.pallet, bb(x - 0.13, x + 0.13, 0, 0.015, pz - 0.1, pz + 0.1));
        for (let k = 0; k < 2; k++) {
          P(l0.pack, rb(0.24, 0.045, 0.17, 0.008, x, 0.015 + k * 0.05, pz));
          P(l0.packLid, rb(0.24, 0.008, 0.17, 0.004, x, 0.058 + k * 0.05, pz));
        }
      }
    }

    // ---- Dispatch canopy in front of the cell hall: crates of cells for the pack shed and EV makers.
    {
      const c = { x0: 1.5, x1: 3.15, z0: 0.29, z1: 0.72, h: 0.34 };
      for (const x of [c.x0, (c.x0 + c.x1) / 2, c.x1]) P(l0.steel, bx(0.025, c.h, 0.025, x, 0, c.z1));
      P(l0.roof, bb(c.x0 - 0.03, c.x1 + 0.03, c.h, c.h + 0.014, c.z0, c.z1 + 0.04));
      P(l0.steel, bb(c.x0, c.x1, c.h - 0.025, c.h, c.z1 - 0.012, c.z1 + 0.012));
      for (let s = 0; s < 4; s++) {
        const x = 1.7 + s * 0.34;
        P(l0.pallet, bb(x - 0.1, x + 0.1, 0, 0.015, 0.42, 0.6));
        for (let k = 0; k < 2; k++) P(l0.crate, rb(0.18, 0.06, 0.16, 0.008, x, 0.015 + k * 0.063, 0.51));
      }
      // Forklift carrying a crate across to the pack shed.
      const Q = place(P, 3.3, 0, 0.88, Math.PI * 0.6);
      Q(l0.yellow, rb(0.12, 0.07, 0.07, 0.012, 0, 0.02, 0));
      Q(l0.robotDark, bx(0.05, 0.05, 0.06, -0.02, 0.09, 0));
      Q(l0.robotDark, bx(0.008, 0.2, 0.05, 0.065, 0.01, 0));
      Q(l0.crate, rb(0.1, 0.05, 0.08, 0.006, 0.12, 0.03, 0));
      for (const x of [-0.04, 0.04]) for (const zz of [-0.035, 0.035]) Q(l0.tyre, cylZ(0.018, 0.014, x, 0.018, zz, 10));
    }

    // ---- EV bay (middle of the front strip): car carrier loading EVs, EVs on chargers, two-wheelers.
    const ev = (Q: Put, body: T.Material, len = 0.2) => {
      Q(body, rb(len, 0.045, 0.095, 0.018, 0, 0.016, 0));
      Q(l0.glass, rb(len * 0.56, 0.034, 0.084, 0.014, -len * 0.04, 0.055, 0));
      for (const x of [-len * 0.32, len * 0.32]) Q(l0.tyre, cylZ(0.019, 0.098, x, 0.019, 0, 12));
    };
    {
      // Car carrier facing west, two decks.
      const Q = place(P, -0.1, 0, 1.22, 0);
      Q(l0.cab, rb(0.18, 0.17, 0.2, 0.03, -0.62, 0.05, 0));
      Q(ctxM.glass, bb(-0.715, -0.71, 0.14, 0.2, -0.08, 0.08));
      Q(l0.carrier, bb(-0.52, 0.62, 0.06, 0.09, -0.1, 0.1)); // chassis / lower deck
      Q(l0.carrier, bb(-0.5, 0.62, 0.21, 0.225, -0.1, 0.1)); // upper deck
      for (const x of [-0.48, 0.0, 0.6]) for (const zz of [-0.095, 0.095]) Q(l0.carrier, bb(x - 0.01, x + 0.01, 0.09, 0.31, zz - 0.006, zz + 0.006));
      for (const zz of [-0.095, 0.095]) Q(l0.carrier, bb(-0.48, 0.6, 0.3, 0.31, zz - 0.006, zz + 0.006));
      for (const x of [-0.62, -0.3, 0.38, 0.5]) for (const zz of [-0.1, 0.1]) Q(l0.tyre, cylZ(0.04, 0.03, x, 0.04, zz, 14));
      const cols = [l0.evWhite, l0.evTeal, l0.evRed, l0.evGrey, l0.evWhite];
      [-0.3, -0.05, 0.2, 0.45].forEach((x, i) => ev(place(Q, x, 0.09, 0), cols[i]));
      [-0.18, 0.1, 0.38].forEach((x, i) => ev(place(Q, x, 0.225, 0), cols[i + 1]));
    }
    {
      // EVs parked nose-in at chargers.
      const cols = [l0.evTeal, l0.evWhite, l0.evGrey, l0.evRed, l0.evWhite, l0.evTeal, l0.evGrey];
      [0, 1, 3, 4, 5, 7, 8].forEach((i, k) => {
        const x = EVX + 0.085 + i * 0.27;
        ev(place(P, x, 0, 1.97, Math.PI / 2), cols[k], 0.22);
      });
      for (let i = 0; i < 9; i++) {
        const x = EVX + 0.085 + i * 0.27;
        P(l0.charger, rb(0.05, 0.14, 0.035, 0.008, x, 0, 1.73));
        P(l0.greenLed, bb(x - 0.015, x + 0.015, 0.1, 0.12, 1.748, 1.75));
      }
      // Electric two-wheelers in a row along the boulevard.
      for (let i = 0; i < 11; i++) {
        const Q = place(P, EVX + 0.1 + i * 0.2, 0, 2.38, Math.PI / 2 + 0.25);
        const body = i % 3 === 1 ? l0.scooterBlue : l0.scooter;
        for (const x of [-0.035, 0.035]) Q(l0.tyre, cylZ(0.016, 0.012, x, 0.016, 0, 12));
        Q(l0.robotDark, bb(-0.03, 0.03, 0.022, 0.03, -0.012, 0.012)); // footboard
        Q(body, rb(0.045, 0.03, 0.03, 0.01, -0.025, 0.03, 0)); // rear body over the battery
        Q(body, bb(0.02, 0.032, 0.02, 0.07, -0.012, 0.012)); // front shield
        Q(l0.robotDark, cylZ(0.003, 0.05, 0.03, 0.075, 0, 6)); // handlebar
        Q(l0.robotDark, rb(0.04, 0.008, 0.024, 0.004, -0.025, 0.06, 0)); // seat
      }
    }

    // ---- Electrolyte tanker at the materials store; trees, lamps.
    {
      const Q = place(P, -3.25, 0, 0.55, 0);
      Q(ctxM.cabWhite, rb(0.18, 0.17, 0.2, 0.03, 0.55, 0.05, 0));
      Q(ctxM.glass, bb(0.638, 0.642, 0.14, 0.2, -0.08, 0.08));
      Q(ctxM.dark, bb(-0.55, 0.45, 0.05, 0.08, -0.08, 0.08));
      Q(ctxM.tanker, cylX(0.085, 0.92, -0.06, 0.17, 0, 20));
      for (const x of [-0.52, 0.4]) Q(ctxM.tanker, lathe(THREE, [[0, 0], [0.085, 0], [0.085, 0.001], [0.06, 0.02], [0, 0.03]], 20).rotateZ(x < 0 ? Math.PI / 2 : -Math.PI / 2).translate(x, 0.17, 0));
      for (const x of [-0.45, -0.32, 0.55]) for (const zz of [-0.09, 0.09]) Q(ctxM.tyre, cylZ(0.04, 0.03, x, 0.04, zz, 14));
    }
    for (const [x, z] of [
      [-3.4, 2.98],
      [-1.1, 2.98],
      [1.2, 2.98],
      [3.2, 2.98],
      [4.58, 0.4],
      [4.58, -1.6],
    ] as Vec2[]) {
      P(ctxM.pole, cyl(0.008, 0.32, x, 0, z, 6));
      P(ctxM.lamp, bx(0.05, 0.015, 0.03, x, 0.32, z));
    }
    {
      const crown = new THREE.IcosahedronGeometry(0.1, 1);
      const trunk = cyl(0.012, 0.1, 0, 0, 0, 6);
      const pts: Vec2[] = [];
      for (let i = 0; i < 12; i++) pts.push([-4.4 + i * 0.8, 3.06]);
      for (let i = 0; i < 6; i++) pts.push([4.62, -2.8 + i * 0.5]);
      for (let i = 0; i < 4; i++) pts.push([-1.54, 1.0 + i * 0.45]);
      const rnd = mulberry(5);
      const crowns = pts.map(([x, z]) => {
        const s = 0.75 + rnd() * 0.45;
        return { p: [x, 0.1 + 0.08 * s, z] as Vec3, s: [s, s * 1.1, s] as Vec3 };
      });
      inst(campusG, crown, ctxM.canopy, crowns);
      inst(campusG, trunk, ctxM.trunk, pts.map(([x, z]) => ({ p: [x, 0, z] as Vec3 })));
    }
  }

  // ============================================================ LAYER 1: CELL HALL
  {
    const P = putter(cellG);
    // Dry room: glass enclosure, blue-white light, stackers/winders and the electrolyte filler.
    const C = { x0: 1.12, x1: 2.22, z0: -2.62, z1: -0.95, h: 0.44 };
    P(cE.glass, wallRing(C, 1));
    P(cE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z0, C.z0 + 0.03));
    P(cE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z1 - 0.03, C.z1));
    P(cE.white, bb(C.x0, C.x0 + 0.03, C.h, C.h + 0.02, C.z0, C.z1));
    P(cE.white, bb(C.x1 - 0.03, C.x1, C.h, C.h + 0.02, C.z0, C.z1));
    for (let i = 0; i < 4; i++) P(cE.blueLed, bb(C.x0 + 0.03, C.x1 - 0.03, C.h + 0.004, C.h + 0.016, C.z0 + 0.15 + i * 0.42, C.z0 + 0.18 + i * 0.42));
    P(cE.blueLed, bb(C.x0 + 0.02, C.x1 - 0.02, 0.013, 0.0145, C.z0 + 0.02, C.z1 - 0.02));
    for (const z of [-2.35, -1.85]) {
      // Z-stacker (left) and jelly-roll winder (right).
      P(cE.white, rb(0.32, 0.22, 0.28, 0.02, 1.38, 0, z));
      P(cE.win, bb(1.25, 1.51, 0.1, 0.19, z + 0.141, z + 0.144));
      P(cE.dark, bb(1.3, 1.46, 0.22, 0.24, z - 0.08, z + 0.08));
      for (let k = 0; k < 4; k++) P(k % 2 ? cE.copper : cE.alu, bb(1.33, 1.43, 0.24 + k * 0.005, 0.244 + k * 0.005, z - 0.05, z + 0.05));
      P(cE.white, rb(0.3, 0.2, 0.28, 0.02, 1.9, 0, z));
      P(cE.alu, cylZ(0.045, 0.06, 1.82, 0.26, z + 0.06, 18)); // cathode reel
      P(cE.copper, cylZ(0.045, 0.06, 1.98, 0.26, z + 0.06, 18)); // anode reel
      P(cE.film, cylZ(0.035, 0.06, 1.9, 0.27, z - 0.06, 18)); // separator reel
      P(cE.screen, bb(2.05, 2.051, 0.12, 0.17, z - 0.05, z + 0.05));
    }
    // Electrolyte filling + sealing machine at the dry room exit.
    P(cE.ss, rb(0.5, 0.2, 0.22, 0.02, 1.67, 0, -1.3));
    for (let k = 0; k < 5; k++) P(cE.green, cyl(0.012, 0.08, 1.49 + k * 0.09, 0.2, -1.3, 10));
    P(cE.green, cylX(0.012, 0.5, 1.67, 0.29, -1.3, 10));
    P(cE.screen, bb(1.6, 1.74, 0.1, 0.16, -1.188, -1.185));
    // Formation & ageing racks: three long racks, five shelves of trays, green/amber channel LEDs.
    {
      const tray = rb(0.12, 0.05, 0.16, 0.01, 0, 0, 0);
      const trays: { p: Vec3; c: number }[] = [];
      const ledsG: { p: Vec3 }[] = [];
      const ledsA: { p: Vec3 }[] = [];
      const led = new THREE.BoxGeometry(0.004, 0.012, 0.03);
      const rnd = mulberry(21);
      for (let r = 0; r < 3; r++) {
        const x = 2.45 + r * 0.3;
        for (const dx of [-0.075, 0.075]) for (let k = 0; k <= 9; k++) P(cE.rack, bb(x + dx - 0.007, x + dx + 0.007, 0, 0.5, -2.6 + k * 0.19 - 0.007, -2.6 + k * 0.19 + 0.007));
        for (let s = 0; s < 5; s++) {
          const y = 0.04 + s * 0.095;
          P(cE.rack, bb(x - 0.08, x + 0.08, y - 0.006, y, -2.6, -0.89));
          for (let k = 0; k < 9; k++) {
            const zz = -2.505 + k * 0.19;
            trays.push({ p: [x, y, zz], c: rnd() < 0.5 ? 0x2a2f35 : 0x34404c });
            (rnd() < 0.72 ? ledsG : ledsA).push({ p: [x + 0.062, y + 0.03, zz] });
          }
        }
        P(cE.dark, rb(0.16, 0.06, 0.14, 0.01, x, 0.5, -0.82)); // charger cabinet head
        P(cE.dark, bb(x - 0.05, x + 0.05, 0.5, 0.52, -2.6, -0.89)); // cable tray
      }
      inst(cellG, tray, cE.white, trays);
      inst(cellG, led, cE.greenLed, ledsG);
      inst(cellG, led, cE.amberLed, ledsA);
    }
    // Cell conveyor to grading, and crated finished cells near the dispatch doors.
    {
      const z = -0.55;
      P(cE.belt, bb(1.15, 3.12, 0.09, 0.105, z - 0.06, z + 0.06));
      for (let i = 0; i < 8; i++) P(cE.grey, bx(0.02, 0.09, 0.1, 1.2 + i * 0.27, 0, z));
      const cellBody = rb(0.03, 0.05, 0.016, 0.003, 0, 0, 0);
      const cells: { p: Vec3 }[] = [];
      for (let k = 0; k < 30; k++) cells.push({ p: [1.2 + k * 0.064, 0.105, z] });
      inst(cellG, cellBody, cE.cellWrap, cells);
      P(cE.white, rb(0.3, 0.22, 0.24, 0.02, 2.85, 0, -0.25)); // grading / sorting
      P(cE.screen, bb(2.78, 2.92, 0.12, 0.18, -0.129, -0.126));
      P(cE.greenLed, bb(2.72, 2.98, 0.22, 0.23, -0.3, -0.2));
      for (let s = 0; s < 3; s++) {
        const x = 1.35 + s * 0.38;
        P(cE.pallet, bb(x - 0.12, x + 0.12, 0, 0.015, -0.3, -0.06));
        for (let k = 0; k < 2; k++) P(cE.green, rb(0.22, 0.06, 0.22, 0.008, x, 0.015 + k * 0.063, -0.18));
      }
    }
  }

  // ============================================================ LAYER 2: ELECTRODE HALL
  {
    const P = putter(eleG);
    /** One coating line along +X at depth z: mixers -> coater -> oven -> rewinder -> calender -> slitter. */
    const line = (z: number, foil: T.Material, accent: T.Material) => {
      // Planetary slurry mixers (pair) on frames, with motor heads.
      for (const dz of [-0.14, 0.14]) {
        const x = -2.12,
          zz = z + dz;
        for (const [ox, oz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) P(eE.grey, bb(x + ox - 0.008, x + ox + 0.008, 0, 0.12, zz + oz - 0.008, zz + oz + 0.008));
        P(eE.grey, bb(x - 0.09, x + 0.09, 0.115, 0.13, zz - 0.09, zz + 0.09));
        P(eE.ss, lathe(THREE, [[0, 0.09], [0.04, 0.09], [0.075, 0.12], [0.08, 0.22], [0.08, 0.24], [0, 0.24]], 24).translate(x, 0, zz));
        P(accent, cyl(0.083, 0.03, x, 0.24, zz, 24));
        P(accent, rb(0.07, 0.07, 0.07, 0.01, x, 0.27, zz)); // drive motor
        P(eE.ss, bar(THREE, [x + 0.08, 0.15, zz], [-1.92, 0.15, z], 0.008, 8)); // slurry line
      }
      // Slurry hold tank feeding the coater.
      P(eE.ss, lathe(THREE, [[0, 0], [0.06, 0], [0.06, 0.18], [0.035, 0.22], [0, 0.22]], 20).translate(-1.9, 0, z));
      P(accent, cyl(0.03, 0.04, -1.9, 0.22, z, 14));
      // Foil unwinder -> slot-die coater.
      P(eE.dark, bb(-1.8, -1.72, 0, 0.2, z - 0.13, z + 0.13));
      P(foil, cylZ(0.065, 0.2, -1.76, 0.17, z, 22));
      P(foil, bb(-1.76, -1.58, 0.16, 0.162, z - 0.09, z + 0.09)); // bare foil web
      P(eE.white, rb(0.14, 0.24, 0.26, 0.015, -1.55, 0, z)); // coater
      P(eE.black, bb(-1.6, -1.5, 0.16, 0.17, z - 0.1, z + 0.1)); // slot die
      P(eE.screen, bb(-1.58, -1.52, 0.18, 0.22, z + 0.131, z + 0.134));
      // Long drying oven on legs with a duct on top and exhaust stubs.
      const ox0 = -1.46,
        ox1 = 0.0;
      P(eE.white, rb(ox1 - ox0, 0.13, 0.24, 0.02, (ox0 + ox1) / 2, 0.08, z));
      for (let k = 0; k <= 6; k++) P(eE.grey, bx(0.02, 0.08, 0.2, ox0 + 0.05 + k * ((ox1 - ox0 - 0.1) / 6), 0, z));
      for (let k = 0; k < 6; k++) P(eE.dark, bb(ox0 + 0.08 + k * 0.24, ox0 + 0.1 + k * 0.24, 0.085, 0.205, z + 0.12, z + 0.122)); // zone seams
      for (let k = 0; k < 6; k++) P(eE.amberLed, bb(ox0 + 0.14 + k * 0.24, ox0 + 0.2 + k * 0.24, 0.17, 0.185, z + 0.121, z + 0.124)); // zone indicators
      P(eE.ss, cylX(0.035, ox1 - ox0 - 0.06, (ox0 + ox1) / 2, 0.25, z - 0.03, 14));
      for (let k = 0; k < 4; k++) P(eE.ss, cyl(0.018, 0.06, ox0 + 0.2 + k * 0.4, 0.21, z - 0.03, 10));
      // Coated web out of the oven -> rewinder (black coated roll).
      P(eE.black, bb(0.0, 0.17, 0.15, 0.152, z - 0.09, z + 0.09));
      P(eE.dark, bb(0.13, 0.21, 0, 0.18, z - 0.13, z + 0.13));
      P(eE.black, cylZ(0.07, 0.2, 0.17, 0.17, z, 22));
      P(foil, cylZ(0.072, 0.012, 0.17, 0.17, z + 0.1, 22));
      // Calender: two big steel rolls in a heavy stand, hydraulic cylinders on top.
      {
        const x = 0.45;
        for (const dz of [-0.14, 0.14]) P(eE.blue, bb(x - 0.08, x + 0.08, 0, 0.36, z + dz - 0.025, z + dz + 0.025));
        P(eE.blue, bb(x - 0.08, x + 0.08, 0.33, 0.37, z - 0.165, z + 0.165));
        P(eE.chrome, cylZ(0.065, 0.26, x, 0.1, z, 28));
        P(eE.chrome, cylZ(0.065, 0.26, x, 0.235, z, 28));
        for (const dz of [-0.14, 0.14]) P(eE.ss, cyl(0.018, 0.06, x, 0.37, z + dz, 10));
        P(eE.dark, rb(0.1, 0.1, 0.1, 0.01, x, 0, z + 0.22)); // drive
        P(eE.black, bb(0.22, x - 0.06, 0.165, 0.167, z - 0.09, z + 0.09));
      }
      // Slitter + slit pancakes.
      P(eE.white, rb(0.16, 0.2, 0.24, 0.015, 0.72, 0, z));
      for (let k = 0; k < 3; k++) P(eE.black, cylZ(0.04, 0.05, 0.72, 0.24, z - 0.07 + k * 0.07, 18));
      P(eE.yellow, bb(-2.25, 0.85, 0.002, 0.005, z + 0.2, z + 0.22)); // walkway line
    };
    line(-2.2, eE.alu, eE.teal); // cathode: aluminium foil, LFP/NMC slurry
    line(-0.7, eE.copper, eE.orange); // anode: copper foil, graphite slurry
    // Big-bag powder stations between the lines (cathode powder above, graphite below).
    for (const [z, bag] of [
      [-1.66, eE.bag],
      [-1.24, eE.black],
    ] as [number, T.Material][]) {
      for (let k = 0; k < 2; k++) {
        const x = -2.15 + k * 0.3;
        for (const [ox, oz] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]]) P(eE.yellow, bb(x + ox - 0.007, x + ox + 0.007, 0, 0.32, z + oz - 0.007, z + oz + 0.007));
        P(eE.yellow, bb(x - 0.09, x + 0.09, 0.3, 0.32, z - 0.09, z + 0.09));
        P(bag, rb(0.13, 0.12, 0.13, 0.03, x, 0.17, z));
        P(eE.ss, cyl(0.02, 0.1, x, 0.07, z, 14, 0.065));
      }
      P(eE.ss, bar(THREE, [-1.85, 0.14, z], [-1.35, 0.14, z], 0.012, 8));
    }
    // Quality lab benches / thickness gauge and spare rolls.
    P(eE.white, rb(0.34, 0.14, 0.18, 0.01, -0.9, 0, -1.5));
    P(eE.screen, bb(-1.0, -0.86, 0.14, 0.2, -1.55, -1.54));
    {
      const roll = cylZ(0.06, 0.18, 0, 0, 0, 20);
      const items: { p: Vec3; c: number }[] = [];
      for (let k = 0; k < 4; k++) items.push({ p: [-0.3 + k * 0.15, 0.075, -1.5], c: k < 2 ? 0xd8dde2 : 0xc8763c });
      P(eE.pallet, bb(-0.4, 0.22, 0, 0.015, -1.62, -1.38));
      inst(eleG, roll, eE.alu, items);
    }
  }

  // ============================================================ LAYER 3: MATERIALS STORE
  {
    const P = putter(matG);
    // Electrolyte tank farm at the back, in a bund: three storage tanks + a blending tank,
    // piped out to the rack that runs to the cell hall's filling machine.
    {
      const z = -2.2;
      P(mE.yellow, bb(-4.27, -2.58, 0, 0.05, z - 0.27, z - 0.25));
      P(mE.yellow, bb(-4.27, -2.58, 0, 0.05, z + 0.25, z + 0.27));
      P(mE.yellow, bb(-4.27, -4.25, 0, 0.05, z - 0.27, z + 0.27));
      P(mE.yellow, bb(-2.6, -2.58, 0, 0.05, z - 0.27, z + 0.27));
      for (let k = 0; k < 3; k++) {
        const x = -4.0 + k * 0.38;
        P(mE.ss, lathe(THREE, [[0, 0], [0.13, 0], [0.13, 0.3], [0.11, 0.35], [0.06, 0.375], [0, 0.38]], 28).translate(x, 0, z));
        P(mE.blue, cyl(0.131, 0.025, x, 0.2, z, 28));
        P(mE.ss, cyl(0.012, 0.04, x, 0.38, z, 8));
        P(mE.green, cylX(0.01, 0.2, x + 0.17, 0.08, z + 0.1, 8));
      }
      const bx0 = -2.88;
      P(mE.white, lathe(THREE, [[0, 0], [0.11, 0], [0.11, 0.26], [0.09, 0.3], [0, 0.31]], 24).translate(bx0, 0, z));
      P(mE.blue, rb(0.08, 0.08, 0.08, 0.01, bx0, 0.31, z));
      P(mE.green, bar(THREE, [-4.0, 0.42, z], [bx0, 0.42, z], 0.012, 8));
      P(mE.green, bar(THREE, [bx0, 0.42, z], [bx0, 0.42, MAT.z0 + 0.02], 0.012, 8)); // to the pipe rack
      for (let k = 0; k < 3; k++) P(mE.green, bar(THREE, [-4.0 + k * 0.38, 0.38, z], [-4.0 + k * 0.38, 0.42, z], 0.01, 8));
    }
    // Separator film rolls on a cradle rack (middle) + foil slitter-rewinder.
    {
      const zr = -1.4;
      const roll = cylX(0.05, 0.17, 0, 0, 0, 22);
      const items: { p: Vec3 }[] = [];
      for (let t = 0; t < 2; t++) for (let k = 0; k < 5; k++) items.push({ p: [-4.12 + k * 0.2, 0.07 + t * 0.12, zr] });
      inst(matG, roll, mE.film, items);
      for (const x of [-4.24, -3.24]) for (const dz of [-0.06, 0.06]) P(mE.rack, bb(x - 0.008, x + 0.008, 0, 0.26, zr + dz - 0.008, zr + dz + 0.008));
      for (const y of [0.012, 0.132]) P(mE.rack, bb(-4.24, -3.24, y, y + 0.008, zr - 0.07, zr + 0.07));
      P(mE.white, rb(0.3, 0.18, 0.2, 0.015, -2.85, 0, zr));
      P(mE.copper, cylZ(0.04, 0.12, -2.92, 0.22, zr, 16));
      P(mE.alu, cylZ(0.04, 0.12, -2.78, 0.22, zr, 16));
      P(mE.screen, bb(-2.8, -2.72, 0.1, 0.14, zr + 0.101, zr + 0.104));
    }
    // Foil racks at the front: copper (west) and aluminium (east), two tiers of rolls.
    {
      const zf = -0.62;
      const roll = cylX(0.055, 0.15, 0, 0, 0, 22);
      const cu: { p: Vec3 }[] = [];
      const al: { p: Vec3 }[] = [];
      for (let t = 0; t < 2; t++)
        for (let k = 0; k < 4; k++) {
          cu.push({ p: [-4.15 + k * 0.18, 0.08 + t * 0.14, zf] });
          al.push({ p: [-3.35 + k * 0.18, 0.08 + t * 0.14, zf] });
        }
      inst(matG, roll, mE.copper, cu);
      inst(matG, roll, mE.alu, al);
      for (const [x0, x1] of [[-4.26, -3.52], [-3.46, -2.72]]) {
        for (const x of [x0, x1]) for (const dz of [-0.07, 0.07]) P(mE.rack, bb(x - 0.008, x + 0.008, 0, 0.3, zf + dz - 0.008, zf + dz + 0.008));
        for (const y of [0.02, 0.16]) for (const dz of [-0.07, 0.07]) P(mE.rack, bb(x0, x1, y, y + 0.012, zf + dz - 0.01, zf + dz + 0.01));
      }
    }
    // Lithium-salt drums (blue), binder bags (white) and conductive-carbon bags (black) by the door.
    {
      const drum = cyl(0.04, 0.1, 0, 0, 0, 16);
      const drums: { p: Vec3 }[] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) drums.push({ p: [-3.3 + i * 0.09, 0.0, -0.17 + j * 0.09] });
      inst(matG, drum, mE.blue, drums);
      for (let i = 0; i < 2; i++) {
        const x = -2.92 + i * 0.25;
        P(mE.pallet, bb(x - 0.1, x + 0.1, 0, 0.015, -0.24, -0.02));
        P(i === 1 ? mE.black : mE.bag, rb(0.17, 0.15, 0.17, 0.035, x, 0.015, -0.13));
      }
      P(mE.white, rb(0.22, 0.2, 0.16, 0.015, -2.7, 0, -1.85)); // QC lab cabinet
      P(mE.screen, bb(-2.77, -2.63, 0.12, 0.16, -1.769, -1.766));
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
  const peel = (p: Peel, t: number) => {
    const e = ease(t);
    p.plane.constant = lerp(p.b.h, DADO, e);
    p.cap.position.y = p.plane.constant;
    p.roof.position.y = e * 0.6;
    L.set(p.bucket, 1 - smoothstep(t, 0.04, 0.55));
  };
  const [pCel, pEle, pMat] = peels;
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      peel(pCel, a);
      peel(pEle, b);
      peel(pMat, c);
      L.set("trees", lerp(1, 0.5, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("l0", lerp(1, 0.4, ease(a)));
      L.set("celEq", smoothstep(a, 0.15, 0.85) * lerp(1, 0.25, ease(b)));
      L.set("eleEq", smoothstep(b, 0.15, 0.85) * lerp(1, 0.25, ease(c)));
      L.set("matEq", smoothstep(c, 0.15, 0.85));
    },
  };
}
