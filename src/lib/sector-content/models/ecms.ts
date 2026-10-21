// Electronic Components (ECMS): a miniature electronics-component campus on a
// display plinth - the kind of greenfield site Kaynes, Amber/Ascent or Syrma are
// building under the Electronics Component Manufacturing Scheme.
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Module & SMT hall at the front right: two SMT lines, a display-module
//     line and a glass camera-module clean room, finished goods by the east dock.
//   · PCB fab behind it (north): lamination presses, CNC drills, a long copper
//     plating line under a hoist, and an amber-lit HDI clean room (laser drills).
//   · Materials & passives block to the west: a laminate treater tower with
//     copper-foil and glass-cloth rolls, an MLCC kiln and film-capacitor winders,
//     and a Li-ion cell line beside electrolyte drums and carbon-black bags.
//   · Open-sided enclosure shed at the front left (aluminium extrusion press,
//     CNC cells, billet stacks), an east service road with a flatbed bringing
//     in a new machine tool, and a "hero" exploded circuit board on the plaza
//     that comes apart layer by layer as you go deeper.
//
// Layers: 0 Plant & Logistics (exteriors, shed, trucks), 1 Module & SMT Lines
// (module hall walls section down, roof lifts), 2 PCB Fab (fab sections down),
// 3 Materials & Passives (materials block sections down). Buildings peel with a
// moving world-space clipping plane, like the pharma campus.
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
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
export const ECMS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: plant & logistics
  enclosures: { pos: [-2.75, 0.2, 2.05], side: "left" }, // extruded profiles leaving the press in the open shed
  capgoods: { pos: [3.95, 0.46, 0.75], side: "bottom" }, // machine tool on the flatbed
  // layer 1: module & SMT lines
  ems: { pos: [0.55, 0.27, 0.95], side: "bottom" }, // SMT line
  display: { pos: [0.9, 0.24, 1.9], side: "left" }, // display-module line
  camera: { pos: [2.5, 0.3, 0.85], side: "bottom" }, // camera-module clean room
  // layer 2: PCB fab
  mlb: { pos: [0.75, 0.33, -1.15], side: "right" }, // copper plating line
  hdi: { pos: [2.42, 0.32, -1.75], side: "right" }, // HDI clean room
  // layer 3: materials & passives
  laminate: { pos: [-3.78, 0.5, -2.2], side: "left" }, // laminate treater + roll store
  passives: { pos: [-2.85, 0.27, -1.15], side: "top" }, // MLCC kiln
  cellmat: { pos: [-3.45, 0.24, -0.1], side: "top" }, // cell line + battery chemicals
};

export const ECMS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.05, 0.1],
    narration:
      "Welcome to the electronic components campus. The Electronics Component Manufacturing Scheme pays companies to make in India the parts that go inside a phone or a laptop: enclosures, camera and display modules, circuit boards, passives and the materials beneath them. Peel the campus layer by layer, from the trucks outside to the chemistry inside.",
  },
  {
    id: "lines",
    layer: 1,
    label: "Module Lines",
    pos: [3.6, 3.4, 5.4],
    target: [1.2, 0.15, 1.2],
    narration:
      "The module hall. Two surface-mount lines print solder paste, place components and reflow them onto boards - this is what contract manufacturers like Dixon, Kaynes and Syrma do every day. Behind the glass, camera modules are assembled in a clean room, and at the front display panels are laminated into finished display modules.",
  },
  {
    id: "fab",
    layer: 2,
    label: "PCB Fab",
    // Far enough back that the whole fab hall - presses and drills, the plating line and the
    // HDI clean room at its east end - fits a portrait stage.
    pos: [4.25, 5.0, 3.7],
    target: [0.75, 0.15, -1.6],
    narration:
      "The circuit-board fab. Copper-clad cores are imaged, stacked and pressed into multi-layer boards, drilled, then copper-plated in a long line of chemical tanks. In the yellow-lit clean room, lasers drill micro-holes for high-density boards like the ones in phones.",
  },
  {
    id: "materials",
    layer: 3,
    label: "Materials",
    pos: [-0.9, 3.5, 2.7],
    target: [-3.2, 0.15, -1.1],
    narration:
      "The innermost layer is materials and passives. A treater tower soaks glass cloth in resin and bonds it to copper foil to make laminate, the base of every board. Next door a kiln fires multi-layer ceramic capacitors, and a small line makes lithium-ion cells using electrolyte and conductive carbon made in India.",
  },
  {
    id: "board",
    layer: 3,
    label: "Exploded Board",
    pos: [0.66, 1.95, 4.65],
    target: [-1.32, 0.78, 1.45],
    narration:
      "This is what the campus builds, taken apart. On top sit the components and modules; below them the solder mask, copper layers and the glass-and-resin laminate cores. Each slice is a different ECMS target segment.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the module hall at the front, the circuit-board fab behind it, materials and passives to the west, and the enclosure shed by the gate. On the east road a flatbed brings in a new machine tool, because ECMS also pays for capital equipment made in India.",
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

export function buildEcms(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [campusG, lineG, fabG, matG] = ctx.layerGroups;
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
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: { p: Vec3; ry?: number; s?: Vec3; c?: number }[]) => {
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
  const MOD: Box = { x0: -0.6, x1: 3.0, z0: 0.25, z1: 2.3, h: 0.7 };
  const FAB: Box = { x0: -1.7, x1: 3.0, z0: -2.75, z1: -0.45, h: 0.85 };
  const MAT: Box = { x0: -4.35, x1: -2.05, z0: -2.75, z1: 0.35, h: 0.74 };
  const SHED: Box = { x0: -4.35, x1: -2.05, z0: 0.85, z1: 2.45, h: 0.44 };
  const HX = -1.26,
    HZ = 1.72; // hero board plaza
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
    // Paving.
    g.fillStyle = "#c4c7c1";
    g.fillRect(0, 0, w, h);
    const rnd = mulberry(3);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + rnd() * 0.04})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    // Lawns.
    const lawn = (x0: number, x1: number, z0: number, z1: number) => {
      g.fillStyle = "#6f9a56";
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
      g.fillStyle = "rgba(40,70,30,0.25)";
      for (let i = 0; i < 200; i++) g.fillRect(X(x0) + rnd() * (x1 - x0) * sx, Z(z0) + rnd() * (z1 - z0) * sx, 2, 2);
    };
    lawn(-4.75, 4.75, 2.96, 3.15);
    lawn(-1.95, -0.7, 2.0, 2.5);
    lawn(-4.75, -4.45, -3.15, 2.5);
    // Roads (asphalt with a dashed centre line).
    const road = (x0: number, z0: number, x1: number, z1: number) => {
      g.fillStyle = "#3e4348";
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
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
    road(-4.75, 2.55, 4.75, 2.92);
    road(3.35, -3.15, 4.5, 2.92);
    road(-1.95, -0.4, 3.35, 0.2);
    // Parking bays along the boulevard.
    g.strokeStyle = "rgba(240,240,230,0.8)";
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const x = -0.5 + i * 0.36;
      g.beginPath();
      g.moveTo(X(x), Z(2.35));
      g.lineTo(X(x), Z(2.55));
      g.stroke();
    }
    // Hazard hatching at the docks.
    g.fillStyle = "rgba(226,179,58,0.85)";
    for (let i = 0; i < 8; i++) g.fillRect(X(3.03), Z(0.35 + i * 0.16), 0.22 * sx, 0.05 * sx);
    for (let i = 0; i < 8; i++) g.fillRect(X(3.03), Z(-2.55 + i * 0.16), 0.22 * sx, 0.05 * sx);
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
  const modFloorTex = floorTex("#d9e2e6", "rgba(0,0,0,0.07)");
  const fabFloorTex = floorTex("#cfd6cf", "rgba(0,0,0,0.08)");
  const matFloorTex = floorTex("#c9c3b8", "rgba(0,0,0,0.08)", 48);
  for (const t of [modFloorTex, fabFloorTex, matFloorTex]) t.repeat.set(3, 3);

  /** Façade: ribbed cladding, a window band and a coloured base course. */
  const facade = (H: number, base: string, band: string, accent: string) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) {
        g.fillStyle = "rgba(0,0,0,0.09)";
        g.fillRect(x, 0, 3, h);
        g.fillStyle = "rgba(255,255,255,0.2)";
        g.fillRect(x + 3, 0, 1, h);
      }
      // Window band at ~55-75% height.
      const y0 = h * 0.25,
        y1 = h * 0.42;
      g.fillStyle = band;
      g.fillRect(0, y0, w, y1 - y0);
      g.fillStyle = "rgba(255,255,255,0.25)";
      for (let x = 0; x < w; x += 32) g.fillRect(x, y0, 2, y1 - y0);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(0, y0, w, 3);
      // Accent stripe + base course.
      g.fillStyle = accent;
      g.fillRect(0, h * 0.1, w, h * 0.03);
      g.fillStyle = "#59616a";
      g.fillRect(0, h * 0.9, w, h * 0.1);
    });
  const modTex = facade(MOD.h, "#e9eef2", "#2b4a63", "#1f9e8f");
  const fabTex = facade(FAB.h, "#dfe4e8", "#24435d", "#2e6fc0");
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
  // Circuit-board textures for the hero board.
  const traceTex = (bg: string, trace: string, pads: string, seed: number) =>
    canvasTexture(THREE, 512, 340, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      const rnd = mulberry(seed);
      g.strokeStyle = trace;
      g.lineCap = "round";
      for (let i = 0; i < 90; i++) {
        let x = rnd() * w,
          y = rnd() * h;
        g.lineWidth = 1.5 + rnd() * 2.5;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          const horiz = rnd() < 0.5;
          const len = 20 + rnd() * 90;
          if (horiz) x += rnd() < 0.5 ? len : -len;
          else y += rnd() < 0.5 ? len : -len;
          if (rnd() < 0.4) {
            x += 14;
            y += 14;
          }
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.fillStyle = pads;
      for (let i = 0; i < 160; i++) {
        const x = rnd() * w,
          y = rnd() * h;
        g.beginPath();
        g.arc(x, y, 2 + rnd() * 2.5, 0, Math.PI * 2);
        g.fill();
      }
    });
  const maskTex = traceTex("#0f5b33", "rgba(120,200,140,0.35)", "#d9b46a", 11);
  const cuTex = traceTex("#2b1f14", "#d38a4a", "#f0b070", 12);
  const cu2Tex = traceTex("#2b1f14", "#c98044", "#e8a868", 13);

  // ------------------------------------------------------------ materials
  const baseM = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.35 })),
    modFloor: L.add("base", std(0xffffff, 0.05, 0.4, { map: modFloorTex })),
    fabFloor: L.add("base", std(0xffffff, 0.05, 0.45, { map: fabFloorTex })),
    matFloor: L.add("base", std(0xffffff, 0.05, 0.8, { map: matFloorTex })),
  };
  const ctxM = {
    canopy: L.add("trees", std(0x4f8a3e, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    hedge: L.add("trees", std(0x3f6a37, 0, 0.9)),
    car: L.add("ctx", std(0xffffff, 0.5, 0.35)),
    glass: L.add("ctx", std(0x1b2631, 0.6, 0.15)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    dark: L.add("ctx", std(0x2b3137, 0.4, 0.5)),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    truckBody: L.add("ctx", std(0xf4f6f8, 0.25, 0.35)),
    cabBlue: L.add("ctx", std(0x2b62c4, 0.45, 0.3)),
    gate: L.add("ctx", std(0x8b949c, 0.6, 0.4)),
    boom: L.add("ctx", std(0xd8453a, 0.3, 0.45)),
  };
  // Layer-0 systems (enclosure shed, machine-tool delivery): stay readable when ghosted.
  const l0 = {
    steel: L.add("l0", std(0x5c6b7a, 0.6, 0.45)),
    roof: L.add("l0", std(0xb3bcc4, 0.55, 0.4, { side: DS })),
    alu: L.add("l0", std(0xd6dbe0, 0.92, 0.22)),
    aluDark: L.add("l0", std(0x9aa3ac, 0.9, 0.3)),
    press: L.add("l0", std(0x2f6fb0, 0.45, 0.4)),
    pressDark: L.add("l0", std(0x30363d, 0.5, 0.45)),
    cnc: L.add("l0", std(0xe8ebee, 0.2, 0.4)),
    cncDoor: L.add("l0", std(0x1f2a36, 0.5, 0.15, { opacity: 0.85 })),
    yellow: L.add("l0", std(0xe2b33a, 0.35, 0.45)),
    orange: L.add("l0", std(0xd9742b, 0.3, 0.45)),
    glow: L.add("l0", std(0x331100, 0, 0.5, { emissive: 0xff7a2a, emissiveIntensity: 1.3 })),
    pallet: L.add("l0", std(0x9a7448, 0, 0.85)),
    flatbed: L.add("l0", std(0x3a434c, 0.5, 0.45)),
    cab: L.add("l0", std(0xc23b32, 0.45, 0.3)),
    tyre: L.add("l0", std(0x17181a, 0.1, 0.85)),
    machine: L.add("l0", std(0xeef1f3, 0.2, 0.4)),
    machineBlue: L.add("l0", std(0x2b62c4, 0.4, 0.35)),
    screen: L.add("l0", std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.0 })),
    crate: L.add("l0", std(0xb38a55, 0, 0.8)),
  };
  /** Equipment palette for one layer bucket. */
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    win: L.add(bucket, std(0x1c2a36, 0.6, 0.15)),
    glass: L.add(bucket, std(0xd5ebf3, 0.2, 0.05, { opacity: 0.28, side: DS })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    green: L.add(bucket, std(0x0f6a3b, 0.25, 0.45)),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    amberLed: L.add(bucket, std(0x332000, 0, 0.5, { emissive: 0xffb020, emissiveIntensity: 0.9 })),
    red: L.add(bucket, std(0xc23b32, 0.35, 0.45)),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    teal: L.add(bucket, std(0x17a398, 0.25, 0.4)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    copper: L.add(bucket, std(0xc8763c, 0.9, 0.3)),
    belt: L.add(bucket, std(0x23272b, 0.2, 0.8)),
    pallet: L.add(bucket, std(0x9a7448, 0, 0.85)),
    carton: L.add(bucket, std(0xc8a271, 0, 0.85)),
  });
  const mE = eqMats("modEq");
  const fE = eqMats("fabEq");
  const tE = eqMats("matEq");
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    sky: L.add(bucket, std(0x2a3f52, 0.6, 0.15)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
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
    // Interior floors.
    const floor = (b: Box, m: T.Material) => {
      const g = new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0).rotateX(-Math.PI / 2);
      uvScale(g, (b.x1 - b.x0) / 3, (b.z1 - b.z0) / 3);
      g.translate((b.x0 + b.x1) / 2, FLOOR, (b.z0 + b.z1) / 2);
      put(campusG, m, g);
    };
    floor(MOD, baseM.modFloor);
    floor(FAB, baseM.fabFloor);
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
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55) => std(color, metal, rough, { clippingPlanes: [plane], side: DS });

  // ---- Module & SMT hall: rooftop solar + AHUs, glazed entrance, east dock doors.
  {
    const { P, R, plane } = makePeel(MOD, modTex, "roofMod");
    const H = MOD.h;
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) {
        P(R.solar, new THREE.BoxGeometry(0.62, 0.008, 0.2).rotateX(-0.3).translate(-0.15 + k * 0.72, H + 0.07, 1.25 + r * 0.26));
        P(R.dark, bx(0.012, 0.05, 0.012, -0.4 + k * 0.72, H, 1.28 + r * 0.26));
        P(R.dark, bx(0.012, 0.05, 0.012, 0.1 + k * 0.72, H, 1.28 + r * 0.26));
      }
    for (let i = 0; i < 3; i++) {
      const x = 0.1 + i * 1.0;
      P(R.unit, rb(0.42, 0.12, 0.24, 0.02, x, H, 0.62));
      for (const dx of [-0.11, 0.11]) P(R.dark, cyl(0.05, 0.012, x + dx, H + 0.12, 0.62, 16));
    }
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    put(campusG, glassM, bb(-0.3, 0.4, 0.0, 0.42, MOD.z1 + 0.002, MOD.z1 + 0.012));
    put(campusG, whiteM, bb(-0.38, 0.48, 0.42, 0.45, MOD.z1, MOD.z1 + 0.22));
    for (const x of [-0.34, 0.44]) put(campusG, whiteM, cyl(0.01, 0.42, x, 0, MOD.z1 + 0.2, 8));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    const canM = clipMat(0x9aa4ad, plane, 0.5, 0.45);
    for (const z of [0.7, 1.1, 1.5]) {
      put(campusG, doorM, bb(MOD.x1 + 0.002, MOD.x1 + 0.012, 0, 0.27, z - 0.13, z + 0.13));
      put(campusG, canM, bb(MOD.x1, MOD.x1 + 0.16, 0.31, 0.33, z - 0.16, z + 0.16));
    }
  }
  // ---- PCB fab: exhaust scrubbers + stacks on the roof (wet process), dock on the east.
  {
    const { P, R, plane } = makePeel(FAB, fabTex, "roofFab");
    const H = FAB.h;
    for (let i = 0; i < 3; i++) {
      const x = -0.9 + i * 0.75;
      P(R.unit, rb(0.5, 0.14, 0.3, 0.02, x, H, -2.25));
      P(R.ss, cyl(0.035, 0.32, x + 0.3, H, -2.25, 12));
      P(R.dark, cyl(0.042, 0.02, x + 0.3, H + 0.32, -2.25, 12));
    }
    for (let i = 0; i < 2; i++) {
      P(R.unit, rb(0.7, 0.1, 0.34, 0.02, 1.3 + i * 0.9, H, -1.0));
      for (const dx of [-0.2, 0, 0.2]) P(R.dark, cyl(0.06, 0.012, 1.3 + i * 0.9 + dx, H + 0.1, -1.0, 16));
    }
    for (let i = 0; i < 5; i++) P(R.sky, bb(-1.4 + i * 0.5, -1.2 + i * 0.5, H + 0.002, H + 0.03, -1.6, -1.2));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    for (const z of [-2.3, -1.85]) put(campusG, doorM, bb(FAB.x1 + 0.002, FAB.x1 + 0.012, 0, 0.3, z - 0.14, z + 0.14));
    const sign = clipMat(0x2e6fc0, plane, 0.3, 0.4);
    put(campusG, sign, bb(0.2, 1.8, 0.62, 0.7, FAB.z1 + 0.002, FAB.z1 + 0.01));
  }
  // ---- Materials & passives block: tall treater penthouse + kiln stack.
  {
    const { P, R, plane } = makePeel(MAT, matTex, "roofMat");
    const H = MAT.h;
    P(R.unit, rb(0.7, 0.2, 0.6, 0.02, -3.75, H, -2.2));
    P(R.ss, cyl(0.04, 0.4, -2.6, H, -1.2, 12));
    P(R.dark, cyl(0.048, 0.02, -2.6, H + 0.4, -1.2, 12));
    P(R.ss, cyl(0.03, 0.3, -2.4, H, -0.4, 12));
    for (let i = 0; i < 3; i++) P(R.sky, bb(-4.1 + i * 0.6, -3.8 + i * 0.6, H + 0.002, H + 0.03, -0.8, -0.3));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    put(campusG, doorM, bb(-3.5, -3.1, 0, 0.3, MAT.z1 + 0.002, MAT.z1 + 0.012));
    // Pipe bridge from the materials block to the fab.
    const pipeM = std(0x9aa4ad, 0.7, 0.35);
    const pipeY = 0.5;
    put(campusG, pipeM, cylX(0.018, 0.36, -1.875, pipeY, -1.4));
    put(campusG, pipeM, cylX(0.018, 0.36, -1.875, pipeY + 0.05, -1.4));
    put(campusG, pipeM, bb(-1.9, -1.86, 0, pipeY + 0.08, -1.42, -1.38));
  }

  // ============================================================ LAYER 0: PLANT & LOGISTICS
  {
    const P = putter(campusG);
    // Enclosure shed: open-sided steel frame with a shallow gable roof.
    const S = SHED;
    for (const x of [S.x0, (S.x0 + S.x1) / 2, S.x1])
      for (const z of [S.z0, (S.z0 + S.z1) / 2, S.z1]) P(l0.steel, bx(0.03, S.h, 0.03, x, 0, z));
    P(l0.steel, bb(S.x0, S.x1, S.h - 0.03, S.h, S.z0 - 0.015, S.z0 + 0.015));
    P(l0.steel, bb(S.x0, S.x1, S.h - 0.03, S.h, S.z1 - 0.015, S.z1 + 0.015));
    {
      const w = S.x1 - S.x0 + 0.12,
        d = S.z1 - S.z0 + 0.12;
      const xc = (S.x0 + S.x1) / 2,
        zc = (S.z0 + S.z1) / 2;
      const pitch = 0.16;
      for (const s of [-1, 1])
        P(l0.roof, new THREE.BoxGeometry(w, 0.012, d / 2 / Math.cos(pitch)).rotateX(s * pitch).translate(xc, S.h + Math.tan(pitch) * (d / 4), zc + (s * d) / 4));
    }
    // Aluminium extrusion press (horizontal: container + ram cylinder + platen) with run-out table.
    {
      const z = 2.05,
        y = 0.0;
      P(l0.pressDark, bb(-4.2, -2.75, y, y + 0.06, z - 0.12, z + 0.12)); // bed
      P(l0.press, cylX(0.075, 0.42, -3.95, y + 0.16, z, 20)); // main cylinder
      P(l0.press, bb(-3.72, -3.62, y + 0.06, y + 0.3, z - 0.11, z + 0.11)); // moving crosshead
      P(l0.pressDark, cylX(0.05, 0.28, -3.48, y + 0.16, z, 16)); // container
      P(l0.press, bb(-3.32, -3.22, y + 0.06, y + 0.32, z - 0.12, z + 0.12)); // platen
      for (const dz of [-0.09, 0.09]) for (const dy of [0.09, 0.25]) P(l0.aluDark, cylX(0.012, 0.66, -3.6, y + dy, z + dz, 8)); // tie rods
      P(l0.glow, bb(-3.22, -3.18, y + 0.12, y + 0.2, z - 0.03, z + 0.03)); // hot extrudate at the die
      P(l0.steel, bb(-3.18, -2.2, y + 0.1, y + 0.12, z - 0.07, z + 0.07)); // run-out table
      for (let i = 0; i < 6; i++) P(l0.steel, bx(0.02, 0.1, 0.02, -3.1 + i * 0.17, y, z));
      for (const dz of [-0.035, 0, 0.035]) P(l0.alu, bb(-3.18, -2.25, y + 0.12, y + 0.135, z + dz - 0.012, z + dz + 0.012)); // profiles
      P(l0.screen, bb(-4.05, -3.95, 0.2, 0.26, z + 0.125, z + 0.13));
      P(l0.yellow, bb(-4.2, -2.75, 0.002, 0.006, z + 0.13, z + 0.16)); // safety line
    }
    // CNC machining cells (unibody frames) + trays of machined frames.
    for (let i = 0; i < 4; i++) {
      const x = -4.05 + i * 0.5,
        z = 1.25;
      P(l0.cnc, rb(0.3, 0.26, 0.24, 0.02, x, 0, z));
      P(l0.cncDoor, bb(x - 0.1, x + 0.06, 0.08, 0.22, z + 0.121, z + 0.126));
      P(l0.screen, bb(x + 0.08, x + 0.13, 0.15, 0.2, z + 0.121, z + 0.126));
      P(l0.orange, cyl(0.008, 0.05, x + 0.12, 0.26, z - 0.08, 8));
    }
    {
      const frame = rb(0.06, 0.008, 0.12, 0.012, 0, 0, 0);
      const items: { p: Vec3 }[] = [];
      for (let t = 0; t < 4; t++)
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) items.push({ p: [-4.12 + t * 0.5 + i * 0.07, 0.055, 1.6 + j * 0.14] });
      for (let t = 0; t < 4; t++) P(l0.pallet, bb(-4.17 + t * 0.5, -3.93 + t * 0.5, 0, 0.05, 1.52, 1.76));
      inst(campusG, frame, l0.alu, items);
    }
    // Billet stacks in the yard between shed and materials block.
    {
      const billet = cylX(0.03, 0.42, 0, 0, 0, 14);
      const items: { p: Vec3 }[] = [];
      for (let s = 0; s < 3; s++) {
        const x = -3.95 + s * 0.6;
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) items.push({ p: [x, 0.035 + r * 0.052, 0.48 + (k + r * 0.5) * 0.062] });
        P(l0.pallet, bb(x - 0.22, x + 0.22, 0, 0.012, 0.44, 0.74));
      }
      inst(campusG, billet, l0.aluDark, items);
    }

    // Flatbed delivering a machine tool (capital equipment) on the east road.
    {
      const Q = place(P, 3.95, 0, 0.75, 0);
      Q(l0.cab, rb(0.24, 0.2, 0.2, 0.03, 0, 0.06, -0.58));
      Q(ctxM.glass, bb(-0.1, 0.1, 0.16, 0.24, -0.48, -0.475));
      Q(l0.flatbed, bb(-0.13, 0.13, 0.08, 0.12, -0.47, 0.48));
      for (const z of [-0.58, -0.2, 0.3, 0.42]) for (const x of [-0.115, 0.115]) Q(l0.tyre, cylX(0.045, 0.035, x, 0.045, z, 14));
      // The machine: a vertical machining centre on skids.
      Q(l0.crate, bb(-0.12, 0.12, 0.12, 0.14, -0.3, 0.3));
      Q(l0.machine, rb(0.22, 0.26, 0.42, 0.025, 0, 0.14, 0));
      Q(l0.machineBlue, bb(-0.112, -0.108, 0.18, 0.36, -0.15, 0.12));
      Q(l0.cncDoor, bb(-0.114, -0.111, 0.2, 0.34, -0.12, 0.09));
      Q(l0.screen, bb(-0.114, -0.111, 0.3, 0.36, 0.13, 0.18));
      Q(l0.machine, rb(0.14, 0.1, 0.14, 0.02, 0.02, 0.4, -0.08)); // spindle head
      Q(l0.yellow, bb(-0.13, 0.13, 0.14, 0.15, -0.31, -0.3));
    }
    // Forklift + crated equipment at the module-hall dock.
    {
      const Q = place(P, 3.3, 0, 1.45, -Math.PI / 2);
      Q(l0.yellow, rb(0.12, 0.07, 0.07, 0.012, 0, 0.02, 0));
      Q(l0.pressDark, bx(0.05, 0.05, 0.06, -0.02, 0.09, 0));
      Q(l0.pressDark, bx(0.008, 0.2, 0.05, 0.065, 0.01, 0));
      Q(l0.steel, bx(0.06, 0.004, 0.012, 0.1, 0.02, -0.02));
      Q(l0.steel, bx(0.06, 0.004, 0.012, 0.1, 0.02, 0.02));
      for (const x of [-0.04, 0.04]) for (const z of [-0.035, 0.035]) Q(l0.tyre, cylZ(0.018, 0.014, x, 0.018, z, 10));
      for (let i = 0; i < 3; i++) P(l0.crate, bx(0.16, 0.12, 0.16, 3.2 + i * 0.02, 0, 1.95 + i * 0.0 - i * 0.2));
    }
    // Container truck at the fab dock.
    {
      const Q = place(putter(campusG), 3.95, 0, -1.7, 0);
      Q(ctxM.cabBlue, rb(0.24, 0.2, 0.2, 0.03, 0, 0.06, 0.6));
      Q(ctxM.glass, bb(-0.1, 0.1, 0.16, 0.24, 0.5, 0.505));
      Q(ctxM.truckBody, rb(0.26, 0.28, 0.95, 0.015, 0, 0.08, -0.05));
      Q(ctxM.dark, bb(-0.13, 0.13, 0.06, 0.08, -0.52, 0.7));
      for (const z of [0.6, 0.2, -0.35, -0.45]) for (const x of [-0.12, 0.12]) Q(ctxM.tyre, cylX(0.045, 0.035, x, 0.045, z, 14));
    }
    // Cars in the bays along the boulevard.
    {
      const carGeo = rb(0.15, 0.07, 0.27, 0.03, 0, 0.02, 0);
      const cab = rb(0.12, 0.05, 0.14, 0.02, 0, 0.08, -0.01);
      const cols = [0xeef1f3, 0x2b62c4, 0x8b949c, 0xc23b32, 0x1d1f22, 0xeef1f3, 0x6f7a85];
      const items: { p: Vec3; c: number }[] = [];
      const cabs: { p: Vec3 }[] = [];
      [0, 1, 3, 4, 6, 7].forEach((i, k) => {
        const x = -0.32 + i * 0.36;
        items.push({ p: [x, 0, 2.43], c: cols[k % cols.length] });
        cabs.push({ p: [x, 0, 2.43] });
      });
      inst(campusG, carGeo, ctxM.car, items);
      inst(campusG, cab, ctxM.glass, cabs);
    }
    // Gatehouse + boom barrier on the east road.
    P(ctxM.gate, rb(0.22, 0.2, 0.2, 0.02, 4.6, 0, 2.4));
    P(ctxM.glass, bb(4.49, 4.495, 0.08, 0.17, 2.32, 2.48));
    P(ctxM.boom, bb(3.45, 4.42, 0.12, 0.135, 2.26, 2.275));
    P(ctxM.gate, bb(4.42, 4.47, 0, 0.16, 2.24, 2.3)); // boom pillar
    for (let i = 0; i < 5; i++) P(ctxM.lamp, bb(3.55 + i * 0.18, 3.62 + i * 0.18, 0.121, 0.136, 2.259, 2.276)); // reflective bands
    // Street lamps.
    for (const [x, z] of [
      [-3.2, 2.98],
      [-0.9, 2.98],
      [1.4, 2.98],
      [3.2, 2.98],
      [4.58, 0.0],
      [4.58, -2.0],
    ] as Vec2[]) {
      P(ctxM.pole, cyl(0.008, 0.32, x, 0, z, 6));
      P(ctxM.lamp, bx(0.05, 0.015, 0.03, x, 0.32, z));
    }
    // Trees: west strip, front lawn by the plaza.
    {
      const crown = new THREE.IcosahedronGeometry(0.1, 1);
      const trunk = cyl(0.012, 0.1, 0, 0, 0, 6);
      const pts: Vec2[] = [
        [-4.6, -2.6],
        [-4.6, -1.8],
        [-4.6, -1.0],
        [-4.6, -0.2],
        [-4.6, 0.6],
        [-4.6, 1.4],
        [-4.6, 2.2],
        [-1.8, 2.25],
        [-0.85, 2.3],
        [-4.0, 3.05],
        [-2.4, 3.05],
        [0.2, 3.05],
        [2.0, 3.05],
        [3.8, 3.05],
      ];
      const rnd = mulberry(9);
      inst(
        campusG,
        crown,
        ctxM.canopy,
        pts.map(([x, z]) => {
          const s = 0.75 + rnd() * 0.35;
          return { p: [x, 0.16 * s + 0.05, z] as Vec3, s: [s, s * 1.15, s] as Vec3, c: [0x4f8a3e, 0x5d9645, 0x467c38][Math.floor(rnd() * 3)] };
        })
      );
      inst(
        campusG,
        trunk,
        ctxM.trunk,
        pts.map(([x, z]) => ({ p: [x, 0, z] as Vec3 }))
      );
      P(ctxM.hedge, rb(1.0, 0.05, 0.06, 0.02, -1.3, 0, 2.52));
    }
  }

  // ============================================================ HERO: EXPLODED CIRCUIT BOARD
  const hero = new THREE.Group();
  campusG.add(hero);
  type Slab = { g: T.Object3D; rest: number; lift: number };
  const slabs: Slab[] = [];
  {
    const BW = 0.74,
      BD = 0.5,
      Y0 = 0.26;
    const heroM = {
      ped: L.add("hero", std(0x2a3540, 0.5, 0.35)),
      pedLip: L.add("hero", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.5 })),
      mask: L.add("hero", std(0xffffff, 0.15, 0.4, { map: maskTex })),
      maskEdge: L.add("hero", std(0x0f5b33, 0.15, 0.45)),
      cu: L.add("hero", std(0xffffff, 0.85, 0.3, { map: cuTex })),
      cu2: L.add("hero", std(0xffffff, 0.85, 0.3, { map: cu2Tex })),
      cuEdge: L.add("hero", std(0xc8763c, 0.9, 0.3)),
      core: L.add("hero", std(0xd8cf8e, 0.05, 0.55, { opacity: 0.92 })),
      prepreg: L.add("hero", std(0xeae2c0, 0.05, 0.6, { opacity: 0.9 })),
      chip: L.add("hero", std(0x1d2024, 0.4, 0.4)),
      shield: L.add("hero", std(0xc9d0d6, 0.9, 0.22)),
      gold: L.add("hero", std(0xd9b04a, 0.95, 0.25)),
      cap: L.add("hero", std(0xb0855a, 0.2, 0.55)),
      lens: L.add("hero", std(0x0a0d12, 0.8, 0.08)),
      lensRing: L.add("hero", std(0x3a4552, 0.9, 0.2)),
      flex: L.add("hero", std(0xc9781d, 0.3, 0.45)),
      cell: L.add("hero", std(0xd5d9de, 0.85, 0.3)),
    };
    // Pedestal.
    put(hero, heroM.ped, lathe(THREE, [[0, 0], [0.42, 0], [0.44, 0.02], [0.42, 0.12], [0.35, 0.14], [0, 0.14]], 40).translate(HX, 0, HZ));
    put(hero, heroM.pedLip, cyl(0.425, 0.012, HX, 0.06, HZ, 40));
    put(hero, heroM.ped, cyl(0.025, Y0 - 0.14, HX, 0.14, HZ, 12));
    // Board slabs, bottom -> top: mask, Cu, core, Cu, prepreg, Cu, core, Cu, mask.
    const spec: { m: T.Material; edge: T.Material; t: number }[] = [
      { m: heroM.mask, edge: heroM.maskEdge, t: 0.012 },
      { m: heroM.cu2, edge: heroM.cuEdge, t: 0.006 },
      { m: heroM.core, edge: heroM.core, t: 0.028 },
      { m: heroM.cu, edge: heroM.cuEdge, t: 0.006 },
      { m: heroM.prepreg, edge: heroM.prepreg, t: 0.02 },
      { m: heroM.cu2, edge: heroM.cuEdge, t: 0.006 },
      { m: heroM.core, edge: heroM.core, t: 0.028 },
      { m: heroM.cu, edge: heroM.cuEdge, t: 0.006 },
      { m: heroM.mask, edge: heroM.maskEdge, t: 0.012 },
    ];
    let y = Y0;
    spec.forEach((s, i) => {
      const g = new THREE.Group();
      g.position.set(HX, 0, HZ);
      hero.add(g);
      // Box face order: +x, -x, +y, -y, +z, -z -> textured top only.
      const geo = new THREE.BoxGeometry(BW, s.t, BD).translate(0, y + s.t / 2, 0);
      mesh(g, geo, [s.edge, s.edge, s.m, s.edge, s.edge, s.edge]);
      slabs.push({ g, rest: 0, lift: i * 0.075 });
      y += s.t;
    });
    // Components on top (one group).
    const comp = new THREE.Group();
    comp.position.set(HX, 0, HZ);
    hero.add(comp);
    const CP = putter(comp);
    const top = y;
    CP(heroM.shield, rb(0.22, 0.03, 0.18, 0.006, -0.18, top, -0.06)); // RF shield can
    CP(heroM.chip, rb(0.14, 0.022, 0.14, 0.006, 0.08, top, -0.1)); // SoC
    CP(heroM.chip, rb(0.1, 0.018, 0.07, 0.004, 0.08, top, 0.06)); // memory
    CP(heroM.chip, rb(0.07, 0.014, 0.07, 0.004, -0.02, top, 0.16));
    // Camera module: cube + lens barrel.
    CP(heroM.chip, rb(0.11, 0.07, 0.11, 0.01, 0.3, top, -0.16));
    CP(heroM.lensRing, cyl(0.04, 0.03, 0.3, top + 0.07, -0.16, 24));
    CP(heroM.lens, cyl(0.03, 0.032, 0.3, top + 0.07, -0.16, 24));
    // Display FPC connector + flex tail.
    CP(heroM.gold, bb(0.22, 0.38, top, top + 0.012, 0.12, 0.16));
    CP(heroM.flex, bb(0.24, 0.36, top + 0.012, top + 0.016, 0.14, 0.27));
    // Battery connector.
    CP(heroM.gold, bb(-0.38, -0.3, top, top + 0.014, 0.14, 0.2));
    // Passives: rows of tiny capacitors.
    {
      const capGeo = new THREE.BoxGeometry(0.018, 0.01, 0.01);
      const items: { p: Vec3; ry?: number }[] = [];
      const rnd = mulberry(21);
      for (let i = 0; i < 46; i++) {
        let x = -0.38 + rnd() * 0.74,
          z = -0.24 + rnd() * 0.48;
        if (Math.abs(x - 0.08) < 0.1 && Math.abs(z + 0.02) < 0.15) x += 0.2;
        if (x > 0.24 && z < -0.08) z += 0.2;
        items.push({ p: [x, top + 0.005, z], ry: rnd() < 0.5 ? 0 : Math.PI / 2 });
      }
      const im = new THREE.InstancedMesh(capGeo, heroM.cap, items.length);
      const o = new THREE.Object3D();
      items.forEach((it, i) => {
        o.position.set(...it.p);
        o.rotation.set(0, it.ry ?? 0, 0);
        o.updateMatrix();
        im.setMatrixAt(i, o.matrix);
      });
      comp.add(im);
    }
    // A small Li-ion pouch cell floating beside the board (the "cells" segment).
    CP(heroM.cell, rb(0.22, 0.02, 0.3, 0.01, -0.62, top - 0.02, 0.0));
    CP(heroM.gold, bb(-0.66, -0.58, top - 0.01, top - 0.006, -0.17, -0.15));
    slabs.push({ g: comp, rest: 0, lift: spec.length * 0.075 + 0.1 });
  }

  // ============================================================ LAYER 1: MODULE & SMT LINES
  {
    const P = putter(lineG);
    const rnd = mulberry(31);
    // Two SMT lines (west -> east): loader, printer, 3 placers, reflow oven, AOI, unloader.
    const boards: { p: Vec3 }[] = [];
    for (const z of [0.62, 1.2]) {
      P(mE.belt, bb(-0.45, 1.85, 0.12, 0.135, z - 0.05, z + 0.05));
      let x = -0.4;
      const unit = (w: number, h: number, body: T.Material, extra?: (cx: number) => void) => {
        const cx = x + w / 2;
        P(body, rb(w, h, 0.26, 0.02, cx, 0, z));
        if (extra) extra(cx);
        x += w + 0.035;
      };
      unit(0.14, 0.2, mE.grey); // magazine loader
      unit(0.22, 0.24, mE.white, (cx) => {
        P(mE.win, bb(cx - 0.08, cx + 0.08, 0.13, 0.21, z + 0.13, z + 0.133));
        P(mE.screen, bb(cx + 0.03, cx + 0.09, 0.1, 0.14, z + 0.131, z + 0.134));
      }); // solder-paste printer
      for (let k = 0; k < 3; k++)
        unit(0.24, 0.26, mE.white, (cx) => {
          P(mE.win, bb(cx - 0.1, cx + 0.1, 0.14, 0.24, z + 0.13, z + 0.133));
          P(mE.dark, bb(cx - 0.1, cx + 0.1, 0.26, 0.27, z - 0.1, z + 0.1));
          P(mE.amberLed, cyl(0.01, 0.04, cx + 0.09, 0.27, z - 0.09, 8));
          P(mE.greenLed, cyl(0.01, 0.02, cx + 0.09, 0.31, z - 0.09, 8));
          for (let f = 0; f < 6; f++) P(mE.blue, bb(cx - 0.1 + f * 0.035, cx - 0.075 + f * 0.035, 0.04, 0.13, z - 0.17, z - 0.13)); // feeder bank
        }); // pick-and-place
      unit(0.5, 0.2, mE.grey, (cx) => {
        P(mE.red, bb(cx - 0.25, cx + 0.25, 0.15, 0.17, z + 0.131, z + 0.133));
        P(mE.dark, bb(cx - 0.2, cx + 0.2, 0.2, 0.22, z - 0.08, z + 0.08));
      }); // reflow oven
      unit(0.16, 0.22, mE.white, (cx) => P(mE.screen, bb(cx - 0.05, cx + 0.05, 0.12, 0.17, z + 0.131, z + 0.134))); // AOI
      unit(0.14, 0.2, mE.grey); // unloader
      for (let k = 0; k < 7; k++) boards.push({ p: [-0.38 + k * 0.33 + rnd() * 0.04, 0.137, z] });
    }
    inst(lineG, new THREE.BoxGeometry(0.08, 0.006, 0.06), mE.green, boards);

    // Display-module line along the front: panel stocker, lamination, bonding, test.
    {
      const z = 1.9;
      P(mE.belt, bb(-0.45, 1.95, 0.1, 0.115, z - 0.09, z + 0.09));
      for (let k = 0; k < 8; k++) P(mE.win, rb(0.17, 0.006, 0.12, 0.005, -0.32 + k * 0.3, 0.115, z));
      for (let k = 0; k < 8; k++) P(mE.screen, bb(-0.38 + k * 0.3, -0.26 + k * 0.3, 0.122, 0.123, z - 0.045, z + 0.045));
      P(mE.white, rb(0.3, 0.26, 0.28, 0.02, -0.25, 0, z - 0.25)); // panel stocker
      P(mE.white, rb(0.34, 0.2, 0.3, 0.02, 0.45, 0, z)); // optical bonding (vacuum laminator)
      P(mE.glass, bb(0.3, 0.6, 0.2, 0.28, z - 0.13, z + 0.13));
      P(mE.teal, bb(0.28, 0.62, 0.2, 0.21, z - 0.15, z + 0.15));
      P(mE.white, rb(0.26, 0.18, 0.26, 0.02, 1.15, 0, z)); // FPC bonding
      P(mE.yellow, bb(1.05, 1.25, 0.18, 0.19, z - 0.1, z + 0.1));
      P(mE.dark, rb(0.3, 0.32, 0.22, 0.02, 1.75, 0, z - 0.2)); // test cabinet
      P(mE.screen, bb(1.62, 1.88, 0.18, 0.28, z - 0.089, z - 0.086));
    }
    // Camera-module clean room: glazed box with ISO-class stations and lens trays.
    {
      const C = { x0: 2.08, x1: 2.92, z0: 0.38, z1: 1.42, h: 0.4 };
      P(mE.glass, wallRing(C, 1));
      // Ceiling frame + open light bars (no solid ceiling, so the stations read from above).
      P(mE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z0, C.z0 + 0.03));
      P(mE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z1 - 0.03, C.z1));
      P(mE.white, bb(C.x0, C.x0 + 0.03, C.h, C.h + 0.02, C.z0, C.z1));
      P(mE.white, bb(C.x1 - 0.03, C.x1, C.h, C.h + 0.02, C.z0, C.z1));
      for (let i = 0; i < 3; i++) P(mE.screen, bb(C.x0 + 0.03, C.x1 - 0.03, C.h + 0.005, C.h + 0.018, C.z0 + 0.2 + i * 0.32, C.z0 + 0.22 + i * 0.32));
      P(mE.white, bb(C.x0 - 0.01, C.x1 + 0.01, 0, 0.012, C.z0 - 0.01, C.z1 + 0.01));
      for (let r = 0; r < 3; r++) {
        const z = C.z0 + 0.2 + r * 0.32;
        P(mE.white, rb(0.6, 0.12, 0.14, 0.015, 2.5, 0, z)); // bench
        for (let k = 0; k < 3; k++) {
          const x = 2.3 + k * 0.2;
          P(mE.grey, rb(0.09, 0.1, 0.08, 0.01, x, 0.12, z - 0.02)); // active-alignment station
          P(mE.dark, cyl(0.012, 0.04, x, 0.22, z - 0.02, 10)); // optics head
        }
      }
      // Finished camera modules on trays (small black cubes with lens dots).
      const cube = new THREE.BoxGeometry(0.018, 0.012, 0.018);
      const items: { p: Vec3 }[] = [];
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 8; i++) items.push({ p: [2.24 + i * 0.04, 0.127, C.z0 + 0.24 + r * 0.32] });
      inst(lineG, cube, mE.dark, items);
      // Air shower + gowning at the door.
      P(mE.ss, rb(0.12, 0.3, 0.12, 0.01, C.x0 + 0.08, 0, C.z1 + 0.08));
    }
    // Finished goods: pallets of cartons by the east dock.
    for (let i = 0; i < 4; i++) {
      const x = 2.25 + (i % 2) * 0.32,
        z = 1.65 + Math.floor(i / 2) * 0.32;
      P(mE.pallet, bb(x - 0.12, x + 0.12, 0, 0.02, z - 0.12, z + 0.12));
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) P(mE.carton, bx(0.11, 0.08, 0.11, x - 0.057 + a * 0.114, 0.02, z - 0.057 + b * 0.114));
      P(mE.carton, bx(0.11, 0.08, 0.11, x, 0.1, z));
    }
  }

  // ============================================================ LAYER 2: PCB FAB
  {
    const P = putter(fabG);
    // Inner-layer: lamination presses (multi-opening hydraulic) at the west end.
    for (let i = 0; i < 3; i++) {
      const x = -1.45 + i * 0.36,
        z = -2.25;
      P(fE.blue, rb(0.28, 0.42, 0.3, 0.02, x, 0, z));
      for (let k = 0; k < 5; k++) P(fE.ss, bb(x - 0.12, x + 0.12, 0.1 + k * 0.05, 0.12 + k * 0.05, z - 0.13, z + 0.152));
      P(fE.dark, bb(x - 0.12, x + 0.12, 0.38, 0.42, z + 0.15, z + 0.152));
      P(fE.amberLed, cyl(0.01, 0.03, x + 0.1, 0.42, z - 0.1, 8));
    }
    // Panel racks (inner-layer cores waiting for lay-up).
    {
      const panel = new THREE.BoxGeometry(0.004, 0.16, 0.22);
      const items: { p: Vec3; c?: number }[] = [];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 14; k++) items.push({ p: [-1.55 + k * 0.022 + r * 0.45, 0.02 + 0.08, -0.85], c: k % 3 === 0 ? 0xc8763c : 0xb88a4a });
      inst(fabG, panel, fE.copper, items);
      for (let r = 0; r < 2; r++) P(fE.grey, bb(-1.58 + r * 0.45, -1.22 + r * 0.45, 0, 0.02, -0.98, -0.72));
    }
    // CNC drilling row (granite bed + gantry + spindles).
    for (let i = 0; i < 5; i++) {
      const x = -0.25 + i * 0.3,
        z = -2.3;
      P(fE.dark, rb(0.24, 0.12, 0.3, 0.015, x, 0, z)); // granite
      P(fE.white, bb(x - 0.12, x - 0.1, 0.12, 0.3, z - 0.02, z + 0.02));
      P(fE.white, bb(x + 0.1, x + 0.12, 0.12, 0.3, z - 0.02, z + 0.02));
      P(fE.white, bb(x - 0.12, x + 0.12, 0.27, 0.31, z - 0.03, z + 0.03)); // gantry
      for (const dx of [-0.05, 0.05]) P(fE.ss, cyl(0.012, 0.08, x + dx, 0.2, z + 0.03, 10));
      P(fE.green, bb(x - 0.1, x + 0.1, 0.12, 0.125, z - 0.12, z + 0.12));
      P(fE.screen, bb(x + 0.06, x + 0.11, 0.06, 0.1, z + 0.151, z + 0.154));
    }
    // Copper plating line: ten tanks under an overhead hoist, a rack of panels dipping.
    {
      const z = -1.15,
        x0 = -0.35,
        n = 10,
        tw = 0.2;
      const liquid = [0x2c7da0, 0x2c7da0, 0x6aa7b8, 0x1a5f7a, 0xc8763c, 0xc8763c, 0x6aa7b8, 0x2c7da0, 0x1f9e8f, 0x6aa7b8];
      const liqMat = L.add("fabEq", std(0xffffff, 0.2, 0.15, { envMapIntensity: 0.8 }));
      const items: { p: Vec3; c: number }[] = [];
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (tw + 0.02) + tw / 2;
        P(fE.grey, bb(x - tw / 2, x + tw / 2, 0, 0.2, z - 0.16, z + 0.16));
        items.push({ p: [x, 0.19, z], c: liquid[i] });
      }
      inst(fabG, new THREE.BoxGeometry(tw - 0.03, 0.006, 0.29), liqMat, items);
      const x1 = x0 + n * (tw + 0.02);
      for (const x of [x0 - 0.04, x1 + 0.02]) for (const dz of [-0.2, 0.2]) P(fE.yellow, bb(x, x + 0.03, 0, 0.5, z + dz - 0.015, z + dz + 0.015));
      for (const dz of [-0.2, 0.2]) P(fE.yellow, bb(x0 - 0.04, x1 + 0.05, 0.47, 0.5, z + dz - 0.015, z + dz + 0.015));
      // Hoist carriage with a flight bar of panels lifted above tank 5.
      const hx = x0 + 4 * (tw + 0.02) + tw / 2;
      P(fE.dark, bb(hx - 0.07, hx + 0.07, 0.44, 0.5, z - 0.23, z + 0.23));
      P(fE.ss, bb(hx - 0.004, hx + 0.004, 0.32, 0.44, z - 0.004, z + 0.004));
      P(fE.ss, bb(hx - 0.01, hx + 0.01, 0.31, 0.33, z - 0.17, z + 0.17));
      for (let k = 0; k < 5; k++) P(fE.copper, bb(hx - 0.003, hx + 0.003, 0.2, 0.31, z - 0.14 + k * 0.07, z - 0.09 + k * 0.07));
      P(fE.screen, bb(x1 + 0.06, x1 + 0.12, 0.2, 0.28, z - 0.05, z + 0.05));
      // Solder-mask coater + green panels downstream.
      P(fE.white, rb(0.34, 0.2, 0.26, 0.02, 0.5, 0, -0.68));
      P(fE.green, bb(0.36, 0.64, 0.2, 0.21, -0.78, -0.58));
      P(fE.white, rb(0.34, 0.2, 0.26, 0.02, 1.0, 0, -0.68));
      P(fE.belt, bb(0.65, 0.85, 0.1, 0.115, -0.72, -0.64));
    }
    // Electrical test (flying-probe testers) + finished boards awaiting dispatch.
    for (let i = 0; i < 2; i++) {
      const x = 1.25 + i * 0.4,
        z = -2.3;
      P(fE.white, rb(0.3, 0.24, 0.3, 0.02, x, 0, z));
      P(fE.win, bb(x - 0.12, x + 0.12, 0.13, 0.21, z + 0.151, z + 0.154));
      P(fE.green, bb(x - 0.1, x + 0.1, 0.24, 0.245, z - 0.1, z + 0.1));
      P(fE.screen, bb(x + 0.152, x + 0.155, 0.12, 0.18, z - 0.05, z + 0.05));
    }
    for (let i = 0; i < 3; i++) {
      const x = 1.2 + i * 0.25,
        z = -1.75;
      P(fE.pallet, bb(x - 0.1, x + 0.1, 0, 0.015, z - 0.12, z + 0.12));
      for (let k = 0; k < 5; k++) P(k % 2 ? fE.green : fE.dark, bb(x - 0.09, x + 0.09, 0.015 + k * 0.014, 0.027 + k * 0.014, z - 0.11, z + 0.11));
    }
    // HDI clean room: yellow-lit glass box with laser drills and LDI (direct imaging).
    {
      const C = { x0: 1.98, x1: 2.88, z0: -2.6, z1: -0.65, h: 0.48 };
      P(fE.glass, wallRing(C, 1));
      P(fE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z0, C.z0 + 0.03));
      P(fE.white, bb(C.x0, C.x1, C.h, C.h + 0.02, C.z1 - 0.03, C.z1));
      P(fE.white, bb(C.x0, C.x0 + 0.03, C.h, C.h + 0.02, C.z0, C.z1));
      P(fE.white, bb(C.x1 - 0.03, C.x1, C.h, C.h + 0.02, C.z0, C.z1));
      for (let i = 0; i < 5; i++) P(fE.amberLed, bb(C.x0 + 0.03, C.x1 - 0.03, C.h + 0.004, C.h + 0.016, C.z0 + 0.12 + i * 0.42, C.z0 + 0.15 + i * 0.42));
      // Amber floor wash: the yellow-light zone that protects photoresist.
      P(fE.amberLed, bb(C.x0 + 0.02, C.x1 - 0.02, 0.013, 0.015, C.z0 + 0.02, C.z1 - 0.02));
      for (let i = 0; i < 3; i++) {
        const z = C.z0 + 0.32 + i * 0.5;
        P(fE.white, rb(0.32, 0.26, 0.3, 0.02, 2.25, 0, z)); // laser drill
        P(fE.dark, bb(2.12, 2.38, 0.26, 0.3, z - 0.08, z + 0.08));
        P(fE.red, cyl(0.02, 0.06, 2.25, 0.3, z, 12));
        P(fE.screen, bb(2.42, 2.43, 0.12, 0.2, z - 0.06, z + 0.06));
        P(fE.grey, rb(0.22, 0.2, 0.26, 0.02, 2.66, 0, z)); // LDI / AOI
        P(fE.win, bb(2.56, 2.76, 0.12, 0.18, z + 0.131, z + 0.134));
      }
    }
  }

  // ============================================================ LAYER 3: MATERIALS & PASSIVES
  {
    const P = putter(matG);
    // Laminate: vertical treater tower (glass cloth -> resin bath -> oven), roll store, pressed sheets.
    {
      const x = -3.95,
        z = -2.25;
      P(tE.grey, bb(x - 0.18, x + 0.18, 0, 0.62, z - 0.14, z + 0.14)); // tower oven
      P(tE.orange, bb(x - 0.18, x + 0.18, 0.5, 0.53, z + 0.141, z + 0.143));
      P(tE.dark, bb(x - 0.12, x + 0.12, 0.08, 0.5, z + 0.141, z + 0.143));
      P(tE.ss, rb(0.24, 0.08, 0.16, 0.02, x + 0.34, 0, z)); // resin bath
      P(tE.amberLed, bb(x + 0.24, x + 0.44, 0.08, 0.082, z - 0.06, z + 0.06));
      P(tE.white, cylZ(0.06, 0.24, x + 0.62, 0.1, z, 18)); // glass-cloth unwind
      P(tE.white, bb(x + 0.06, x + 0.58, 0.18, 0.183, z - 0.1, z + 0.1)); // web
      // Copper-foil and glass-cloth rolls on racks.
      const roll = cylZ(0.05, 0.2, 0, 0, 0, 18);
      const cu: { p: Vec3 }[] = [];
      const gl: { p: Vec3 }[] = [];
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 4; k++) {
          cu.push({ p: [-4.18 + k * 0.12, 0.06 + r * 0.11, -1.72] });
          gl.push({ p: [-3.66 + k * 0.12, 0.06 + r * 0.11, -1.72] });
        }
      inst(matG, roll, tE.copper, cu);
      inst(matG, roll, tE.white, gl);
      P(tE.yellow, bb(-4.26, -3.2, 0.0, 0.01, -1.85, -1.6));
      // Stacks of finished copper-clad laminate sheets.
      for (let s = 0; s < 3; s++) {
        const sx = -3.0 + s * 0.28,
          sz = -2.45;
        P(tE.pallet, bb(sx - 0.11, sx + 0.11, 0, 0.02, sz - 0.14, sz + 0.14));
        for (let k = 0; k < 6; k++) P(k % 2 ? tE.copper : tE.yellow, bb(sx - 0.1, sx + 0.1, 0.02 + k * 0.012, 0.031 + k * 0.012, sz - 0.13, sz + 0.13));
      }
    }
    // Passives: MLCC tape caster -> stacker -> tunnel kiln; film-capacitor winders; reels.
    {
      const z = -1.15;
      P(tE.white, rb(0.34, 0.14, 0.2, 0.02, -3.95, 0, z)); // tape caster
      P(tE.ss, bb(-4.1, -3.8, 0.14, 0.145, z - 0.08, z + 0.08));
      P(tE.white, rb(0.22, 0.2, 0.2, 0.02, -3.6, 0, z)); // screen-print + stacker
      P(tE.screen, bb(-3.66, -3.54, 0.12, 0.17, z + 0.101, z + 0.104));
      // Tunnel kiln with glowing ports.
      P(tE.grey, rb(0.95, 0.18, 0.24, 0.02, -2.85, 0, z));
      for (let k = 0; k < 5; k++) P(tE.amberLed, bb(-3.22 + k * 0.18, -3.14 + k * 0.18, 0.06, 0.12, z + 0.121, z + 0.124));
      P(tE.dark, bb(-3.3, -2.4, 0.18, 0.2, z - 0.08, z + 0.08));
      P(tE.ss, cyl(0.025, 0.2, -2.45, 0.18, z, 10));
      // Film-capacitor winders (SRF-type BOPP film feeds them).
      for (let k = 0; k < 4; k++) {
        const x = -4.05 + k * 0.28,
          wz = -0.68;
        P(tE.white, rb(0.2, 0.14, 0.16, 0.015, x, 0, wz));
        P(tE.ss, cylZ(0.035, 0.1, x - 0.04, 0.2, wz, 16));
        P(tE.copper, cylZ(0.022, 0.1, x + 0.05, 0.19, wz, 14));
      }
      // Component reels on a rack.
      const reel = cylZ(0.045, 0.012, 0, 0, 0, 20);
      const items: { p: Vec3; c: number }[] = [];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) items.push({ p: [-2.95 + k * 0.1, 0.06 + r * 0.1, -0.7], c: [0x2a2f35, 0x1f4f8a, 0x2a2f35, 0xd9b04a][(k + r) % 4] });
      inst(matG, reel, tE.dark, items);
      P(tE.grey, bb(-3.02, -2.26, 0, 0.012, -0.76, -0.64));
      P(tE.grey, bb(-3.02, -2.26, 0.0, 0.2, -0.76, -0.755));
    }
    // Cells & battery chemicals: stacking/winding line with pouch cells, drums and bulk bags.
    {
      const z = -0.08;
      P(tE.belt, bb(-4.2, -2.85, 0.1, 0.115, z - 0.06, z + 0.06));
      P(tE.white, rb(0.26, 0.22, 0.24, 0.02, -4.05, 0, z - 0.02)); // electrode coater/stacker
      P(tE.white, rb(0.22, 0.22, 0.24, 0.02, -3.0, 0, z - 0.02)); // electrolyte fill + formation
      P(tE.screen, bb(-3.06, -2.94, 0.12, 0.17, z + 0.101, z + 0.104));
      const cell = rb(0.05, 0.008, 0.07, 0.006, 0, 0, 0);
      const items: { p: Vec3 }[] = [];
      for (let k = 0; k < 9; k++) items.push({ p: [-3.85 + k * 0.095, 0.115, z] });
      inst(matG, cell, tE.ss, items);
      // Electrolyte drums (blue) and acetylene-black bulk bags (black).
      const drum = cyl(0.035, 0.09, 0, 0, 0, 14);
      const drums: { p: Vec3 }[] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) drums.push({ p: [-2.6 + i * 0.08, 0.0, -0.3 + j * 0.08] });
      inst(matG, drum, tE.blue, drums);
      for (let i = 0; i < 2; i++) {
        P(tE.pallet, bb(-2.65 + i * 0.22 - 0.09, -2.65 + i * 0.22 + 0.09, 0, 0.015, 0.08, 0.25));
        P(tE.dark, rb(0.15, 0.13, 0.15, 0.03, -2.65 + i * 0.22, 0.015, 0.165));
      }
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
  const [pMod, pFab, pMat] = peels;
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      L.set("hero", 1);
      peel(pMod, a);
      peel(pFab, b);
      peel(pMat, c);
      L.set("trees", lerp(1, 0.5, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("l0", lerp(1, 0.4, ease(a)));
      L.set("modEq", smoothstep(a, 0.15, 0.85) * lerp(1, 0.22, ease(b)));
      L.set("fabEq", smoothstep(b, 0.15, 0.85) * lerp(1, 0.22, ease(c)));
      L.set("matEq", smoothstep(c, 0.15, 0.85));
      // The hero board comes apart as you go deeper: components lift first, then the copper/laminate stack.
      const ex = smoothstep(v, 0.2, 2.6);
      for (const s of slabs) s.g.position.y = s.lift * ex;
    },
  };
}
