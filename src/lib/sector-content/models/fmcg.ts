// FMCG: "from the field to the kirana". One winding road carries the chain from the farm
// terraces at the back, past the mills and factory lines, down to an Indian kirana (general
// store) on the bazaar street in front, the hero of the scene. Generic: no real company's
// building, pack, logo or livery; signs use plain words and only label parts that already read
// by their shape.
//
// Plan (+X east, +Z south/front; the default camera looks up the road from the south-south-west):
//   · Back, on a raised earth terrace of fields: a paddy field and mustard strip with a rice mill,
//     rice sacks, oil tins and a giant bottle of cooking oil (staples); a cane field, cane trucks
//     queuing at a sugar mill with a tall brick chimney, a bagasse heap and ethanol tanks (sugar);
//     a milk-chilling silo with a milk tanker and cows, a poultry shed and shrimp ponds with
//     paddle-wheel aerators (dairy, poultry, seafood).
//   · Middle, west: a biscuit line (tunnel oven, conveyor of biscuits, a giant cream biscuit, a
//     chips pillow pack); then a beauty and grooming yard (giant shampoo bottle, lipstick, razor,
//     soap bars); then flavour and fragrance kettles in copper with a still.
//   · Middle, east: a bottling hall with a rotary filler, crates of bottles, a contour bottle,
//     tea bushes and a steaming cup of chai; then home care (a detergent spray-drying tower, a
//     detergent carton, giant pencils, a mosquito coil); then packaging (laminate film rolls on a
//     printing press, collapsible tubes, glass and PET bottles, label rolls).
//   · Front, the bazaar street: a paan-and-cigarette kiosk with a giant cigarette pack (tobacco),
//     the kirana with its shutter rolled up, shelves packed to the ceiling, sachet garlands,
//     candy jars, a visi-cooler and sacks on the step (the FMCG majors), and on the east a
//     distributor's mini-truck at a cash-and-carry, a small supermarket and a delivery rider.
//
// Layers peel by crossfading (ghosting, never hiding):
//   0 Farm & Staples          the terrace
//   1 Food & Drink Brands     farm ghosts -> biscuit line, bottling, kiosk
//   2 Home & Personal Care    food ghosts -> beauty yard, home-care tower, the kirana
//   3 Packs & Shelf           ghosts all but ingredients, packaging and distribution (the
//                             kirana stays half-visible as the shelf they all serve)
// Animated: smoke from the chimney, biscuits on the belt, the filler turns, aerators spin, chai
// steams, sachet strips sway and the delivery rider rides the bazaar street.
import type * as T from "three";
import { type Three, type Vec2, type Vec3, bar, canvasTexture, clamp01, contactShadow, lathe, layerMats, lerp, mergeInto, roundedBox, smoothShape, tube } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// ------------------------------------------------------------------ key dims
const S = 0.3; // lower ground (factory belt + bazaar)
const ST = 0.46; // farm terrace top
const KX = -0.05,
  KZ = 1.8,
  KR = -0.2,
  KS = 1.3; // kirana position, yaw (turned to face the default camera) and scale (the hero)
/** Kirana local -> world (x, z). */
const kw = (lx: number, lz: number): [number, number] => [KX + KS * (lx * Math.cos(KR) + lz * Math.sin(KR)), KZ + KS * (-lx * Math.sin(KR) + lz * Math.cos(KR))];
const KA = kw(0.05, -0.15);

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/fmcg.ts): the top rail runs west -> east along
// the farm terrace, the left rail back -> front down the west side (biscuits, beauty, kettles),
// the right rail back -> front down the east side (bottling, home care, packaging) and the bottom
// rail west -> east along the bazaar street (kiosk, kirana, distributor), so markers keep each
// rail's order from the overview, the layer views and the top (scripts/check-crossings.mjs).
export const FMCG_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: farm terrace
  staples: { pos: [-3.25, ST + 0.52, -2.55], side: "top" }, // giant cooking-oil bottle by the rice mill
  sugar: { pos: [-0.35, ST + 0.55, -2.95], side: "top" }, // sugar mill shed under the chimney
  dairy_protein: { pos: [2.25, ST + 0.78, -2.8], side: "top" }, // milk-chilling silo
  // layer 1: food and drink
  foods: { pos: [-3.0, S + 0.3, -0.85], side: "left" }, // giant cream biscuit at the end of the line
  beverages: { pos: [3.0, S + 0.3, -1.1], side: "right" }, // rotary filler in the bottling hall
  tobacco: { pos: [-2.6, S + 0.78, 2.75], side: "bottom" }, // giant cigarette pack on the kiosk
  // layer 2: home and personal care
  majors: { pos: [KA[0], S + 0.66 * KS, KA[1]], side: "bottom" }, // inside the kirana, before its packed shelves
  personal_care: { pos: [-3.15, S + 0.52, 0.55], side: "left" }, // giant shampoo bottle
  home_care: { pos: [3.05, S + 0.95, 0.55], side: "right" }, // detergent spray-drying tower
  // layer 3: packs and shelf
  ingredients: { pos: [-3.45, S + 0.36, 1.85], side: "left" }, // copper flavour kettles
  packaging: { pos: [3.45, S + 0.34, 1.75], side: "right" }, // laminate film roll on the press
  distribution: { pos: [2.6, S + 0.3, 2.75], side: "bottom" }, // distributor's mini-truck
};

export const FMCG_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [-1.8, 6.3, 10.2],
    target: [0.2, 0.5, -0.4],
    narration:
      "Welcome to FMCG, from the field to the kirana. Rice, oil, cane and milk come off the farm terrace at the back, mills and factory lines turn them into biscuits, drinks, soaps and detergents, and the road brings every pack down to the corner shop in front. Peel it layer by layer.",
  },
  {
    id: "farm",
    layer: 0,
    label: "Farm & Staples",
    pos: [-0.4, 9.0, -1.55],
    target: [-0.4, 0.4, -2.2],
    narration:
      "The farm terrace. On the west, paddy and mustard feed a rice mill and an oil refinery's bottles and tins, the business of AWL Agri Business, Patanjali Foods and LT Foods. In the middle, cane trucks queue at a sugar mill whose chimney also feeds ethanol tanks, as at Balrampur Chini and EID Parry. On the east, a chilling silo and milk tanker, a poultry shed and shrimp ponds fed by makers like Avanti Feeds.",
  },
  {
    id: "food",
    layer: 1,
    label: "Food & Drink Brands",
    pos: [0.4, 9.6, 6.4],
    target: [0.0, 0.3, 0.0],
    narration:
      "Food and drink. On the west, a tunnel oven bakes biscuits for makers like Britannia and Nestle. On the east, a filler bottles soft drinks into crates for bottlers like Varun Beverages, beside tea bushes and a cup of chai for Tata Consumer and CCL. On the street, the paan kiosk sells cigarettes made by ITC and Godfrey Phillips.",
  },
  {
    id: "hpc",
    layer: 2,
    label: "Home & Personal Care",
    pos: [-1.3, 4.8, 9.4],
    target: [0.0, 0.6, 0.9],
    narration:
      "Home and personal care, and the kirana that sells it all. The FMCG majors, Hindustan Unilever, Dabur, Marico, Godrej Consumer and Colgate, fill its shelves and sachet garlands. On the west, shampoo, lipstick and razors for Emami, Honasa and Gillette; on the east, a detergent tower and pencils for home care and stationery makers like DOMS.",
  },
  {
    id: "shelf",
    layer: 3,
    label: "Packs & Shelf",
    pos: [0.4, 9.2, 7.2],
    target: [0.1, 0.3, 0.6],
    narration:
      "Packs and shelf. On the west, copper kettles blend flavours and fragrances and contract makers fill packs for the brands. On the east, laminate film, tubes, glass and PET bottles and labels from packaging makers. In front, a distributor's mini-truck loads at a cash-and-carry, a supermarket and a delivery rider reach the buyer too.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.0, 12.5, 0.6],
    target: [0, 0, 0],
    narration:
      "From above: the farm terrace along the back, the biscuit, beauty and fragrance yards down the west, bottling, home care and packaging down the east, and the bazaar street with the kirana in front, all joined by one road.",
  },
];

// Deterministic PRNG so the model is identical on every load.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Item = { p: Vec3; ry?: number; rx?: number; rz?: number; s?: Vec3; c?: number };

// Outline of the whole site (x, z) and of the raised farm terrace at the back.
const SITE: Vec2[] = [
  [-4.75, -2.3], [-4.45, -3.45], [-3.0, -3.95], [-0.8, -3.75], [1.2, -4.0], [3.4, -3.75], [4.65, -3.05],
  [4.85, -1.2], [4.55, 0.6], [4.75, 2.2], [4.2, 3.45], [2.4, 3.8], [0.6, 3.65], [-1.0, 3.85], [-2.8, 3.6],
  [-4.25, 3.05], [-4.8, 1.4], [-4.55, -0.4],
];
const TERRACE: Vec2[] = [
  [-4.45, -2.05], [-4.2, -3.25], [-3.0, -3.65], [-0.8, -3.45], [1.2, -3.7], [3.4, -3.45], [4.4, -2.85],
  [4.5, -1.95], [3.1, -1.95], [1.5, -1.8], [0.2, -2.05], [-1.5, -1.85], [-3.0, -2.05],
];

export function buildFmcg(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [farmG, foodG, hpcG, shelfG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const R = rng(20261120);
  const L = layerMats();
  const DS = THREE.DoubleSide;
  // Animated parts, filled by the layer blocks below.
  let animFarm: { aerators: T.Group[] } | null = null;
  let animFood: { belt: T.Texture; filler: T.Group; steam: T.Mesh[] } | null = null;
  let animHpc: { strips: T.Mesh[] } | null = null;

  // ---------------------------------------------------------------- geometry helpers
  const std = (color: number, metalness = 0.1, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const mats = new Map<string, T.MeshStandardMaterial>();
  /** One shared material per (bucket, colour, finish). */
  const M = (bucket: string, color: number, metal = 0.1, rough = 0.6, extra: T.MeshStandardMaterialParameters = {}, key = "") => {
    const k = `${bucket}|${color}|${metal}|${rough}|${key}`;
    let m = mats.get(k);
    if (!m) mats.set(k, (m = L.add(bucket, std(color, metal, rough, extra))));
    return m;
  };
  const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) => roundedBox(THREE, w, h, d, r).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, seg).translate(x, y + h / 2, z);
  const hcyl = (r: number, len: number, x: number, y: number, z: number, axis: "x" | "z" = "x", seg = 16) => {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else g.rotateX(Math.PI / 2);
    return g.translate(x, y, z);
  };
  const sph = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 16) => new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)).scale(sx, sy, sz).translate(x, y, z);
  const vPlane = (w: number, h: number, x: number, y: number, z: number, ry = 0) => new THREE.PlaneGeometry(w, h).rotateY(ry).translate(x, y, z);
  const hPlane = (w: number, d: number, x: number, y: number, z: number) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, y, z);
  /** Gable roof, ridge along x, over [x0,x1]x[z0,z1] from eave y up by rise. */
  const gable = (x0: number, x1: number, z0: number, z1: number, y: number, rise: number, over = 0.03) => {
    const hw = (z1 - z0) / 2 + over;
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0);
    sh.lineTo(hw, 0);
    sh.lineTo(0, rise);
    sh.lineTo(-hw, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0 + 2 * over, bevelEnabled: false });
    g.rotateY(Math.PI / 2).translate(x0 - over, y, (z0 + z1) / 2);
    g.computeVertexNormals();
    return g;
  };
  /** Half-cylinder (barrel) roof, axis along x. */
  const barrel = (x0: number, x1: number, z0: number, z1: number, y: number, rise = 1) => {
    const r = (z1 - z0) / 2;
    const g = new THREE.CylinderGeometry(r, r, x1 - x0, 20, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2).rotateX(Math.PI / 2);
    g.rotateX(-Math.PI / 2);
    g.scale(1, rise, 1);
    return g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  };
  /** Gable end walls (triangles) for a gable or barrel shed. */
  const walls = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) => [
    vPlane(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, z1),
    vPlane(x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, z0, Math.PI),
    vPlane(z1 - z0, y1 - y0, x1, (y0 + y1) / 2, (z0 + z1) / 2, Math.PI / 2),
    vPlane(z1 - z0, y1 - y0, x0, (y0 + y1) / 2, (z0 + z1) / 2, -Math.PI / 2),
  ];
  const gableEnds = (x0: number, x1: number, z0: number, z1: number, y: number, rise: number) => {
    const hw = (z1 - z0) / 2;
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0);
    sh.lineTo(hw, 0);
    sh.lineTo(0, rise);
    sh.lineTo(-hw, 0);
    const a = new THREE.ShapeGeometry(sh).rotateY(Math.PI / 2).translate(x1, y, (z0 + z1) / 2);
    const b = new THREE.ShapeGeometry(sh).rotateY(-Math.PI / 2).translate(x0, y, (z0 + z1) / 2);
    return [a, b];
  };
  const group = (parent: T.Object3D, x: number, y: number, z: number, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    return g;
  };

  // ---------------------------------------------------------------- batching + instancing
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, ...geos: T.BufferGeometry[]) => {
    const k = parent.uuid + "|" + mat.uuid;
    if (!batches.has(k)) batches.set(k, { parent, mat, geos: [] });
    batches.get(k)!.geos.push(...geos);
  };
  const dummy = new THREE.Object3D();
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: Item[]) => {
    if (!items.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const col = new THREE.Color();
    items.forEach((it, i) => {
      dummy.position.set(it.p[0], it.p[1], it.p[2]);
      dummy.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      dummy.scale.set(...(it.s ?? ([1, 1, 1] as Vec3)));
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      if (it.c !== undefined) im.setColorAt(i, col.setHex(it.c));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    parent.add(im);
    return im;
  };
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material) => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };

  // ---------------------------------------------------------------- textures
  const font = (px: number, w = "bold") => `${w} ${px}px Arial, Helvetica, sans-serif`;
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => canvasTexture(THREE, w, h, draw);
  const sign = (text: string, bg: string, fg: string, w = 256, h = 64, px = 34, sub?: string, border?: string) =>
    tex(w, h, (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      if (border) {
        g.strokeStyle = border;
        g.lineWidth = 6;
        g.strokeRect(5, 5, W - 10, H - 10);
      }
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = font(px);
      g.fillText(text, W / 2, sub ? H * 0.4 : H / 2 + 2);
      if (sub) {
        g.font = font(Math.round(px * 0.42), "600");
        g.fillText(sub, W / 2, H * 0.78);
      }
    });
  const texMat = (bucket: string, map: T.Texture, glow = 0.15, extra: T.MeshStandardMaterialParameters = {}) =>
    L.add(bucket, std(0xffffff, 0.05, 0.55, { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow, ...extra }));
  const repeat = (t: T.Texture) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const corrugated = (base: string, line: string) =>
    repeat(
      tex(64, 64, (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        g.fillStyle = line;
        for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 3, h);
      })
    );
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  // Pack faces: greyscale so per-instance colours tint them (a label band and a highlight).
  const packTex = tex(32, 48, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d8d8d8";
    g.fillRect(0, 0, w, 6);
    g.fillStyle = "#f6f6f6";
    g.beginPath();
    g.ellipse(w / 2, h * 0.55, w * 0.32, h * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#a8a8a8";
    g.fillRect(4, h - 10, w - 8, 4);
  });
  // A strip of sachets (shampoo, coffee, detergent) as they hang in a kirana.
  const sachetTex = (cols: string[]) =>
    tex(32, 256, (g, w, h) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const y0 = (i * h) / n;
        const c = cols[i % cols.length];
        g.fillStyle = c;
        g.fillRect(0, y0, w, h / n);
        g.fillStyle = "rgba(255,255,255,0.55)";
        g.beginPath();
        g.ellipse(w / 2, y0 + h / n / 2, w * 0.28, h / n / 4, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(2, y0 + 2, 4, h / n - 4);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(0, y0, w, 2);
      }
    });

  // ================================================================ GROUND: SITE + TERRACE
  const GW = 10,
    GD = 8,
    K = 100;
  const groundTex = tex(GW * K, GD * K, (g) => {
    const P = (x: number, z: number): [number, number] => [(x + GW / 2) * K, (z + GD / 2) * K];
    const poly = (pts: Vec2[], c: string) => {
      g.fillStyle = c;
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(...P(x, z)) : g.moveTo(...P(x, z))));
      g.closePath();
      g.fill();
    };
    // Dry red-brown earth with grassy mottling.
    g.fillStyle = "#cfae80";
    g.fillRect(0, 0, GW * K, GD * K);
    for (let i = 0; i < 900; i++) {
      const [x, y] = P(-5 + R() * 10, -4 + R() * 8);
      g.fillStyle = R() < 0.6 ? "rgba(150,160,90,0.18)" : "rgba(180,120,80,0.16)";
      g.beginPath();
      g.ellipse(x, y, 8 + R() * 30, 5 + R() * 16, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // Bazaar street front: worn stone, darker kerb strip in front of the shops.
    poly([[-4.6, 2.35], [4.6, 2.35], [4.6, 4], [-4.6, 4]], "#d8c7aa");
    for (let i = 0; i < 400; i++) {
      const [x, y] = P(-4.6 + R() * 9.2, 2.35 + R() * 1.6);
      g.fillStyle = R() < 0.5 ? "rgba(120,100,80,0.10)" : "rgba(255,255,255,0.12)";
      g.fillRect(x, y, 6 + R() * 20, 3 + R() * 6);
    }
    // Factory yards: packed earth under the plants.
    for (const [x0, z0, x1, z1] of [
      [-4.45, -1.75, -2.35, -0.45],
      [2.35, -1.75, 4.5, -0.55],
      [-4.4, 0.1, -2.5, 1.1],
      [2.4, 0.05, 3.9, 1.15],
      [-4.4, 1.3, -2.7, 2.3],
      [2.8, 1.2, 4.45, 2.3],
    ] as [number, number, number, number][]) {
      g.fillStyle = "#c2a882";
      g.beginPath();
      const [a, b] = P(x0, z0);
      const [c, d] = P(x1, z1);
      g.ellipse((a + c) / 2, (b + d) / 2, (c - a) / 2 + 10, (d - b) / 2 + 10, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Terrace fields with bunds between them.
    const field = (pts: Vec2[], c: string, row: string, step: number, ang: number) => {
      poly(pts, c);
      g.save();
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(...P(x, z)) : g.moveTo(...P(x, z))));
      g.closePath();
      g.clip();
      g.strokeStyle = row;
      g.lineWidth = 3;
      const [cx, cy] = P(pts[0][0], pts[0][1]);
      for (let k = -60; k < 60; k++) {
        g.beginPath();
        const o = k * step;
        g.moveTo(cx - 400 * Math.cos(ang) + o * Math.sin(ang), cy - 400 * Math.sin(ang) - o * Math.cos(ang));
        g.lineTo(cx + 400 * Math.cos(ang) + o * Math.sin(ang), cy + 400 * Math.sin(ang) - o * Math.cos(ang));
        g.stroke();
      }
      g.restore();
      g.strokeStyle = "#8a6a44";
      g.lineWidth = 5;
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(...P(x, z)) : g.moveTo(...P(x, z))));
      g.closePath();
      g.stroke();
    };
    field([[-4.35, -3.2], [-3.55, -3.55], [-3.6, -2.95], [-4.4, -2.75]], "#7cc24a", "#5ea33a", 9, 0.1); // paddy
    field([[-4.4, -2.7], [-3.6, -2.9], [-3.7, -2.2], [-4.4, -2.1]], "#8fcf5a", "#6bb045", 9, 0.1); // paddy
    field([[-2.45, -3.5], [-1.75, -3.45], [-1.7, -2.6], [-2.4, -2.5]], "#e8c53a", "#c9a52a", 8, 1.45); // mustard
    field([[-1.7, -3.45], [-1.0, -3.4], [-1.05, -2.15], [-1.7, -2.3]], "#4c8a3c", "#3a6e2e", 7, 1.5); // cane
    field([[1.35, -3.55], [1.95, -3.6], [1.95, -3.15], [1.3, -3.1]], "#a8c86e", "#93b45c", 12, 0.3); // pasture
    // Tea bushes along the east edge (rows of rounded hedges sit on top).
    poly([[4.0, -1.7], [4.55, -1.7], [4.6, -0.6], [4.05, -0.6]], "#6f8f4a");
    // Cane yard, mill yard and dairy yard on the terrace.
    poly([[-0.95, -2.5], [1.3, -2.55], [1.35, -2.0], [-0.9, -1.95]], "#b99a70");
    poly([[1.35, -3.05], [2.8, -3.1], [2.8, -2.0], [1.4, -1.95]], "#bfa27a");
  });
  const groundMat = L.add("base", std(0xffffff, 0, 0.92, { map: groundTex }));
  const groundGeo = (pts: Vec2[], y: number) => {
    const sh = smoothShape(THREE, pts.map(([x, z]) => [x, -z] as Vec2), 10);
    const g = new THREE.ShapeGeometry(sh, 4).rotateX(-Math.PI / 2);
    const p = g.getAttribute("position") as T.BufferAttribute;
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + GW / 2) / GW, 1 - (p.getZ(i) + GD / 2) / GD);
    return g.translate(0, y, 0);
  };
  const slab = (pts: Vec2[], y0: number, y1: number, grow = 0) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
      cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const sh = smoothShape(
      THREE,
      pts.map(([x, z]) => {
        const d = Math.hypot(x - cx, z - cz) || 1;
        return [x + ((x - cx) / d) * grow, -(z + ((z - cz) / d) * grow)] as Vec2;
      }),
      10
    );
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 });
    return g.rotateX(-Math.PI / 2).translate(0, y0, 0);
  };
  // Earth strata: dark soil under a laterite band (the site reads as a slice of land, not a plinth).
  const soil = L.add("base", std(0x5b3f2c, 0, 0.95));
  const laterite = L.add("base", std(0xa8573a, 0, 0.9));
  const ochre = L.add("base", std(0xb98a52, 0, 0.92));
  const bed = new THREE.Mesh(slab(SITE, 0, 0.14, 0.06), soil);
  bed.frustumCulled = false; // carries the animation driver
  baseG.add(bed);
  put(baseG, laterite, slab(SITE, 0.14, S - 0.004));
  put(baseG, groundMat, groundGeo(SITE, S));
  put(baseG, ochre, slab(TERRACE, S - 0.01, ST - 0.004));
  put(baseG, groundMat, groundGeo(TERRACE, ST));
  baseG.add(contactShadow(THREE, 10.4, 8.6, 0.45));

  // ================================================================ THE ROAD
  // One road from the mill yard down the terrace ramp, past the factories, to the bazaar street;
  // a branch runs west to the biscuit and beauty yards.
  const roadTex = repeat(
    tex(64, 128, (g, w, h) => {
      g.fillStyle = "#4b4d52";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = R() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
        g.fillRect(R() * w, R() * h, 3, 3);
      }
      g.fillStyle = "#e9e4d6";
      g.fillRect(3, 0, 3, h);
      g.fillRect(w - 6, 0, 3, h);
      g.fillStyle = "#f2c230";
      g.fillRect(w / 2 - 2, 10, 4, 44);
      g.fillRect(w / 2 - 2, 74, 4, 44);
    })
  );
  const roadMat = L.add("base", std(0xffffff, 0, 0.85, { map: roadTex }));
  const shoulder = L.add("base", std(0x9a7a56, 0, 0.95));
  const ribbon = (pts: Vec3[], w: number) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    const n = Math.ceil(curve.getLength() * 14);
    const top: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    const skirts: T.BufferGeometry[] = [];
    const len = curve.getLength();
    let prev: [T.Vector3, T.Vector3] | null = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = curve.getPointAt(t);
      const d = curve.getTangentAt(t);
      const nx = -d.z,
        nz = d.x;
      const k = 1 / Math.hypot(nx, nz);
      const a = new THREE.Vector3(p.x + nx * k * w / 2, p.y + 0.006, p.z + nz * k * w / 2);
      const b = new THREE.Vector3(p.x - nx * k * w / 2, p.y + 0.006, p.z - nz * k * w / 2);
      top.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uv.push(0, (t * len) / (w * 2), 1, (t * len) / (w * 2));
      if (i) idx.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, i * 2, i * 2 + 1, (i - 1) * 2 + 1);
      if (prev) for (const [q0, q1] of [[prev[0], a], [prev[1], b]] as [T.Vector3, T.Vector3][]) {
        const sk = new THREE.BufferGeometry();
        sk.setAttribute("position", new THREE.Float32BufferAttribute([q0.x, q0.y, q0.z, q1.x, q1.y, q1.z, q1.x, S - 0.01, q1.z, q0.x, S - 0.01, q0.z], 3));
        sk.setIndex([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
        sk.computeVertexNormals();
        skirts.push(sk);
      }
      prev = [a, b];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(top, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (g.getAttribute("normal").getY(0) < 0) {
      for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      g.setIndex(idx);
      g.computeVertexNormals();
    }
    put(baseG, roadMat, g);
    put(baseG, shoulder, ...skirts);
    return curve;
  };
  ribbon(
    [
      [-0.3, ST, -2.3],
      [-0.1, ST, -2.05],
      [0.25, S + 0.04, -1.45],
      [1.0, S, -0.75],
      [1.85, S, -0.05],
      [2.25, S, 0.9],
      [2.2, S, 1.9],
      [1.95, S, 2.85],
      [1.0, S, 3.38],
      [-0.7, S, 3.35],
      [-2.0, S, 3.22],
      [-3.3, S, 3.0],
      [-4.2, S, 2.75],
    ],
    0.34
  );
  ribbon(
    [
      [0.55, S, -1.15],
      [-0.6, S, -0.55],
      [-1.7, S, -0.35],
      [-2.35, S, 0.1],
    ],
    0.26
  );

  // ---------------------------------------------------------------- shared props
  const CLOTHES = [0x2b4c7e, 0xb8382e, 0x3d6b4f, 0xe7d9b8, 0x4a4a52, 0xe08a2e, 0x6b4f8a, 0xd04f7a, 0xe0b23a, 0x2f9c95];
  const bodyGeo = new THREE.CapsuleGeometry(0.024, 0.085, 3, 8).translate(0, 0.067, 0);
  const headGeo = new THREE.SphereGeometry(0.021, 10, 8).translate(0, 0.158, 0);
  const crowd = new Map<string, { parent: T.Object3D; bucket: string; items: Item[] }>();
  const people = (parent: T.Object3D, bucket: string, pts: [number, number, number, number?][]) => {
    const k = parent.uuid + bucket;
    if (!crowd.has(k)) crowd.set(k, { parent, bucket, items: [] });
    for (const [x, y, z, ry] of pts) crowd.get(k)!.items.push({ p: [x, y, z], ry: ry ?? R() * 6, c: CLOTHES[Math.floor(R() * CLOTHES.length)] });
  };
  const crown = new THREE.IcosahedronGeometry(0.1, 1);
  const trunkGeo = cyl(0.016, 0.16, 0, 0, 0, 6, 0.011);
  const treeItems: Item[] = [],
    trunkItems: Item[] = [];
  /** A neem-like tree: a trunk and three lumpy crowns. */
  const tree = (x: number, z: number, s = 1, y = S) => {
    trunkItems.push({ p: [x, y, z], s: [s, s, s] });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + R();
      treeItems.push({ p: [x + Math.cos(a) * 0.06 * s, y + (0.2 + R() * 0.05) * s, z + Math.sin(a) * 0.06 * s], s: [s * (0.9 + R() * 0.3), s * 0.85, s * (0.9 + R() * 0.3)], c: [0x4f8a3a, 0x5d9a40, 0x467d36][i] });
    }
  };
  /** Indian lorry: cab at +x, facing +x, wheels; returns its local group (y = 0 on the road). */
  const lorry = (parent: T.Object3D, bucket: string, x: number, y: number, z: number, ry: number, cab: number, len = 0.55) => {
    const g = group(parent, x, y, z, ry);
    const h = len / 2;
    put(g, M(bucket, cab, 0.3, 0.45), rb(0.15, 0.14, 0.17, 0.035, h - 0.075, 0.05, 0));
    put(g, M(bucket, 0x1b2631, 0.6, 0.15), bx(h - 0.004, h + 0.002, 0.13, 0.18, -0.065, 0.065));
    put(g, M(bucket, 0x2a2a2a, 0.3, 0.6), bx(-h, h - 0.02, 0.045, 0.07, -0.08, 0.08));
    put(g, M(bucket, 0xf2c230, 0.2, 0.5), bx(h - 0.01, h + 0.004, 0.06, 0.08, -0.08, 0.08)); // painted bumper
    put(g, M(bucket, 0x1c1d20, 0.1, 0.85), ...[-h + 0.1, -h + 0.2, h - 0.09].map((wx) => hcyl(0.042, 0.19, wx, 0.042, 0, "z", 12)));
    return g;
  };

  // ================================================================ LAYER 0: FARM TERRACE
  {
    const F = "farm";
    // ---- staples: rice mill, rice sacks, oil tins, giant oil bottle
    const millWall = texMat(F, corrugated("#e6dccb", "#cfc3ad"), 0.05);
    put(farmG, millWall, ...walls(-4.05, -3.55, -3.5, -3.1, ST, ST + 0.32).map((g) => uvScale(g, 3, 2)));
    put(farmG, M(F, 0x6f7f8a, 0.4, 0.5), gable(-4.05, -3.55, -3.5, -3.1, ST + 0.32, 0.12));
    put(farmG, M(F, 0xe6dccb), ...gableEnds(-4.05, -3.55, -3.5, -3.1, ST + 0.32, 0.12));
    // Bucket elevator, husk cyclone and parboiling tanks.
    put(farmG, M(F, 0xb8b9b4, 0.6, 0.35), bx(-3.5, -3.44, ST, ST + 0.72, -3.32, -3.26), bx(-3.53, -3.41, ST + 0.72, ST + 0.8, -3.35, -3.23));
    put(farmG, M(F, 0xb8b9b4, 0.6, 0.35), bar(THREE, [-3.47, ST + 0.76, -3.29], [-3.75, ST + 0.5, -3.3], 0.018, 8));
    put(farmG, M(F, 0xd7d9d6, 0.6, 0.3), lathe(THREE, [[0.0, 0.0], [0.03, 0.0], [0.08, 0.14], [0.08, 0.26], [0.0, 0.27]], 20).translate(-3.3, ST + 0.28, -3.05));
    put(farmG, M(F, 0x8d8f91, 0.5, 0.4), ...[[-3.3, -3.05], [-3.22, -3.11], [-3.38, -3.11]].map(([x, z]) => bar(THREE, [x, ST, z], [-3.3, ST + 0.29, -3.05], 0.006, 4)));
    for (const [x, z] of [[-4.15, -2.95], [-3.95, -2.95]] as [number, number][]) {
      put(farmG, M(F, 0xd7d9d6, 0.7, 0.3), cyl(0.08, 0.3, x, ST, z, 18), sph(0.08, x, ST + 0.3, z, 1, 0.5, 1));
    }
    // Rice sacks: a pyramid of pillowy white sacks with a green stripe.
    const sackGeo = roundedBox(THREE, 0.15, 0.06, 0.1, 0.028);
    const sacks: Item[] = [];
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4 - row; i++)
        for (let j = 0; j < 2; j++) sacks.push({ p: [-3.85 + i * 0.155 + row * 0.077, ST + 0.03 + row * 0.058, -2.55 + j * 0.105], ry: (R() - 0.5) * 0.15, c: 0xf2efe6 });
    inst(farmG, sackGeo, M(F, 0xffffff, 0, 0.85), sacks);
    put(farmG, M(F, 0x3b8a4a, 0, 0.7), ...sacks.map((s) => bx(s.p[0] - 0.075, s.p[0] + 0.075, s.p[1] - 0.004, s.p[1] + 0.008, s.p[2] + 0.051, s.p[2] + 0.053)));
    // 15-litre oil tins (square, silver, yellow label) stacked by the bottle.
    const tinLabel = texMat(F, sign("OIL", "#f2c230", "#b8382e", 64, 64, 22), 0.1);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2 - Math.floor(i / 2); j++) {
        const x = -2.9 + i * 0.095,
          y = ST + j * 0.13;
        put(farmG, M(F, 0xcfd3d6, 0.85, 0.25), bx(x - 0.045, x + 0.045, y, y + 0.125, -2.42, -2.33));
        put(farmG, tinLabel, vPlane(0.08, 0.07, x, y + 0.06, -2.329));
      }
    // The giant 1-litre bottle of cooking oil (golden PET with a handle grip and a red cap).
    const oil = L.add(F, std(0xe9b522, 0.05, 0.08, { opacity: 0.82, emissive: 0x6b4a00, emissiveIntensity: 0.25 }));
    put(farmG, oil, lathe(THREE, [[0, 0], [0.105, 0], [0.115, 0.02], [0.115, 0.26], [0.1, 0.33], [0.06, 0.38], [0.045, 0.41], [0, 0.41]], 28).translate(-3.25, ST, -2.6));
    put(farmG, M(F, 0xc62f28, 0.2, 0.4), cyl(0.05, 0.05, -3.25, ST + 0.405, -2.6, 18));
    put(farmG, texMat(F, sign("COOKING OIL", "#2f8a3e", "#fff6cf", 256, 64, 30), 0.15), cyl(0.118, 0.11, -3.25, ST + 0.1, -2.6, 28).translate(0, 0, 0));
    // ---- sugar: cane field, cane trucks, mill, chimney, bagasse, ethanol tanks
    const cane: Item[] = [],
      caneTop: Item[] = [];
    for (let i = 0; i < 160; i++) {
      const x = -1.65 + R() * 0.6,
        z = -3.35 + R() * 1.1;
      const h = 0.22 + R() * 0.08;
      cane.push({ p: [x, ST, z], s: [1, h / 0.25, 1], c: R() < 0.5 ? 0x8a9a4a : 0x6f8a3a });
      caneTop.push({ p: [x, ST + h, z], ry: R() * 6, s: [1, 0.8 + R() * 0.4, 1], c: R() < 0.5 ? 0x4c9a3a : 0x3f8a34 });
    }
    inst(farmG, cyl(0.008, 0.25, 0, 0, 0, 5), M(F, 0xffffff, 0, 0.8), cane);
    inst(farmG, new THREE.ConeGeometry(0.045, 0.1, 5).translate(0, 0.03, 0), M(F, 0xffffff, 0, 0.8, {}, "leaf"), caneTop);
    // Mill shed (corrugated, gable) with a boiler house and the cane carrier ramping into it.
    const shed = texMat(F, corrugated("#d9d2c2", "#bdb5a2"), 0.05);
    put(farmG, shed, ...walls(-0.9, 0.25, -3.4, -2.95, ST, ST + 0.42).map((g) => uvScale(g, 6, 2)));
    put(farmG, M(F, 0x9a4b35, 0.1, 0.7), gable(-0.9, 0.25, -3.4, -2.95, ST + 0.42, 0.14));
    put(farmG, M(F, 0xd9d2c2), ...gableEnds(-0.9, 0.25, -3.4, -2.95, ST + 0.42, 0.14));
    put(farmG, M(F, 0xb8b0a0), bx(0.25, 0.55, ST, ST + 0.55, -3.45, -3.05));
    put(farmG, texMat(F, sign("SUGAR MILL", "#2b4c7e", "#ffffff", 256, 48, 28), 0.2), vPlane(0.5, 0.09, -0.33, ST + 0.34, -2.945));
    put(farmG, M(F, 0x5a5048, 0.4, 0.5), bar(THREE, [-0.75, ST + 0.02, -2.45], [-0.6, ST + 0.3, -2.95], 0.04, 4));
    // Brick chimney with a soot band.
    put(farmG, M(F, 0xa04a32, 0, 0.85), lathe(THREE, [[0.1, 0], [0.085, 0.2], [0.055, 1.25], [0, 1.25]], 20).translate(0.42, ST + 0.55, -3.25));
    put(farmG, M(F, 0x2a2420, 0, 0.9), cyl(0.06, 0.08, 0.42, ST + 1.75, -3.25, 20, 0.062));
    put(farmG, M(F, 0xd9c08a, 0, 0.95), lathe(THREE, [[0, 0.28], [0.12, 0.24], [0.3, 0.06], [0.36, 0]], 18).scale(1, 1, 0.75).translate(-1.05, ST, -3.25)); // bagasse heap
    // Ethanol tanks (a pair with domed roofs, a stair and a pipe to the mill).
    for (const x of [0.85, 1.18]) {
      put(farmG, M(F, 0xdfe3e6, 0.8, 0.25), cyl(0.14, 0.42, x, ST, -3.2, 24), sph(0.14, x, ST + 0.42, -3.2, 1, 0.35, 1, 24));
      put(farmG, M(F, 0x2f9c95, 0.2, 0.5), cyl(0.142, 0.03, x, ST + 0.28, -3.2, 24));
    }
    put(farmG, M(F, 0x8d8f91, 0.5, 0.4), hcyl(0.012, 0.65, 0.88, ST + 0.38, -3.0, "x", 8));
    put(farmG, texMat(F, sign("ETHANOL", "#2f9c95", "#ffffff", 128, 32, 20), 0.2), vPlane(0.2, 0.05, 1.015, ST + 0.18, -3.05));
    // Cane trucks queuing in the yard, loaded high with cane.
    const caneLoad = cyl(0.011, 0.36, 0, -0.18, 0, 5).rotateZ(Math.PI / 2);
    for (const [x, z, ry, c] of [
      [0.1, -2.35, Math.PI + 0.1, 0xe08a2e],
      [0.85, -2.3, Math.PI - 0.05, 0x2f9c95],
    ] as [number, number, number, number][]) {
      const t = lorry(farmG, F, x, ST, z, ry, c);
      const stalks: Item[] = [];
      for (let k = 0; k < 70; k++) {
        const lz = (R() - 0.5) * 0.16,
          ly = 0.08 + R() * 0.1 * (1 - Math.abs(lz) * 4);
        stalks.push({ p: [-0.08 + R() * 0.03, ly, lz], rz: (R() - 0.5) * 0.1, c: R() < 0.6 ? 0x8a9a4a : 0x6b7f3a });
      }
      inst(t, caneLoad, M(F, 0xffffff, 0, 0.8, {}, "cane"), stalks);
    }
    people(farmG, F, [[-0.55, ST, -2.5], [0.5, ST, -2.6], [-1.2, ST, -2.8]]);
    // ---- dairy, poultry, seafood
    // Milk-chilling silo (stainless, insulated, ladder) and the collection shed.
    put(farmG, M(F, 0xe3e7ea, 0.85, 0.22), cyl(0.2, 0.68, 2.25, ST + 0.06, -2.8, 28), lathe(THREE, [[0.2, 0], [0.12, 0.08], [0, 0.1]], 28).translate(2.25, ST + 0.74, -2.8));
    put(farmG, M(F, 0x8d8f91, 0.5, 0.4), ...[0, 1, 2, 3].map((i) => cyl(0.012, 0.06, 2.25 + Math.cos(i * 1.57 + 0.78) * 0.15, ST, -2.8 + Math.sin(i * 1.57 + 0.78) * 0.15, 6)));
    put(farmG, M(F, 0x8d8f91, 0.5, 0.4), bx(2.44, 2.452, ST + 0.06, ST + 0.74, -2.83, -2.77));
    put(farmG, texMat(F, sign("MILK", "#ffffff", "#2b6cb0", 128, 48, 30), 0.2), cyl(0.203, 0.1, 2.25, ST + 0.4, -2.8, 28));
    put(farmG, M(F, 0xf1ece0), ...walls(1.5, 2.0, -2.95, -2.6, ST, ST + 0.2));
    put(farmG, M(F, 0x2b6cb0, 0.2, 0.6), gable(1.5, 2.0, -2.95, -2.6, ST + 0.2, 0.08));
    put(farmG, M(F, 0xf1ece0), ...gableEnds(1.5, 2.0, -2.95, -2.6, ST + 0.2, 0.08));
    // Milk cans by the shed.
    put(farmG, M(F, 0xd7dadd, 0.85, 0.25), ...[1.58, 1.66, 1.74].map((x) => lathe(THREE, [[0, 0], [0.03, 0], [0.032, 0.06], [0.02, 0.08], [0.02, 0.095], [0, 0.095]], 14).translate(x, ST, -2.52)));
    // Milk tanker: cab + an elliptical stainless tank.
    const tk = lorry(farmG, F, 2.05, ST, -2.25, Math.PI, 0xf1ece0, 0.6);
    put(tk, M(F, 0xe3e7ea, 0.85, 0.22), hcyl(0.085, 0.4, -0.08, 0.15, 0, "x", 20).scale(1, 0.85, 1).translate(0, 0.02, 0));
    put(tk, texMat(F, sign("MILK", "#2b6cb0", "#ffffff", 128, 32, 22), 0.2), vPlane(0.2, 0.045, -0.08, 0.15, 0.087), vPlane(0.2, 0.045, -0.08, 0.15, -0.087, Math.PI));
    // Cows grazing on the pasture.
    for (const [x, z, ry] of [
      [1.5, -3.35, 0.4],
      [1.75, -3.25, 2.2],
      [1.62, -3.48, -0.6],
    ] as [number, number, number][]) {
      const c = group(farmG, x, ST, z, ry);
      put(c, M(F, 0xf4f1ea, 0, 0.8), rb(0.14, 0.065, 0.06, 0.025, 0, 0.06, 0), rb(0.05, 0.04, 0.035, 0.012, 0.085, 0.09, 0));
      put(c, M(F, 0x2a2420, 0, 0.8), sph(0.022, -0.02, 0.105, 0.02, 1.4, 0.6, 0.6), sph(0.018, 0.03, 0.1, -0.025, 1.2, 0.6, 0.6));
      put(c, M(F, 0x6b5a4a, 0, 0.8), ...[[-0.05, -0.02], [-0.05, 0.02], [0.05, -0.02], [0.05, 0.02]].map(([lx, lz]) => cyl(0.009, 0.06, lx, 0, lz, 6)));
    }
    // Poultry shed: long, low, curtain sides, curved roof.
    put(farmG, M(F, 0x6fb06a, 0, 0.8, { side: DS }), ...walls(3.0, 4.25, -3.55, -3.3, ST, ST + 0.12));
    put(farmG, M(F, 0xc9ccce, 0.6, 0.35, { side: DS }), barrel(2.97, 4.28, -3.57, -3.28, ST + 0.12, 0.45));
    put(farmG, M(F, 0xf1ece0), bx(2.98, 3.0, ST, ST + 0.18, -3.56, -3.29));
    const hens: Item[] = [];
    for (let i = 0; i < 10; i++) hens.push({ p: [2.92 - R() * 0.25, ST + 0.025, -3.15 - R() * 0.15], ry: R() * 6, c: i % 3 ? 0xf6f1e7 : 0xa0522d });
    inst(farmG, sph(0.022, 0, 0, 0, 1.3, 1, 0.9, 10), M(F, 0xffffff, 0, 0.8, {}, "hen"), hens);
    // Shrimp ponds with bunds and spinning paddle-wheel aerators.
    const water = L.add(F, std(0x3f8fa8, 0.2, 0.15, { emissive: 0x0b3040, emissiveIntensity: 0.3 }));
    const bund = M(F, 0x9a7a56, 0, 0.95);
    const aerators: T.Group[] = [];
    for (const [x0, x1, z0, z1] of [
      [3.05, 3.65, -3.05, -2.55],
      [3.75, 4.35, -3.05, -2.55],
      [3.05, 3.65, -2.45, -2.05],
      [3.75, 4.35, -2.45, -2.05],
    ] as [number, number, number, number][]) {
      put(farmG, water, hPlane(x1 - x0, z1 - z0, (x0 + x1) / 2, ST + 0.012, (z0 + z1) / 2));
      put(farmG, bund, bx(x0 - 0.03, x1 + 0.03, ST, ST + 0.03, z0 - 0.03, z0), bx(x0 - 0.03, x1 + 0.03, ST, ST + 0.03, z1, z1 + 0.03), bx(x0 - 0.03, x0, ST, ST + 0.03, z0, z1), bx(x1, x1 + 0.03, ST, ST + 0.03, z0, z1));
      const a = group(farmG, (x0 + x1) / 2 + 0.1, ST + 0.03, (z0 + z1) / 2, 0.3);
      put(a, M(F, 0xf2c230, 0.2, 0.5), hcyl(0.018, 0.18, 0, 0, 0, "x", 10));
      const wheel = new THREE.Group();
      a.add(wheel);
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        mesh(wheel, bx(-0.06, 0.06, -0.006, 0.006, -0.045, 0.045).rotateX(ang).translate(0, Math.sin(ang) * 0.02, Math.cos(ang) * 0.02), M(F, 0x2f5d9a, 0.2, 0.5));
      }
      wheel.position.set(0, 0.03, 0.06);
      aerators.push(wheel);
    }
    animFarm = { aerators };
  }

  // ================================================================ LAYER 1: FOOD & DRINK
  {
    const F = "food";
    // ---- foods: biscuit hall, tunnel oven, belt of biscuits, packets, a giant cream biscuit, a chips pack
    const hall = texMat(F, corrugated("#f4ead6", "#e2d4b8"), 0.05);
    put(foodG, hall, ...walls(-4.35, -2.75, -1.75, -1.35, S, S + 0.34).map((g) => uvScale(g, 8, 2)));
    // Sawtooth north-light roof.
    for (let i = 0; i < 4; i++) {
      const x0 = -4.35 + i * 0.4;
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.4, 0);
      sh.lineTo(0, 0.15);
      sh.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.44, bevelEnabled: false });
      g.translate(x0, S + 0.34, -1.77);
      put(foodG, M(F, 0xc0392b, 0.1, 0.6), g);
      put(foodG, M(F, 0x9fc7dc, 0.3, 0.1), vPlane(0.44, 0.14, x0 - 0.001, S + 0.41, -1.55, -Math.PI / 2));
    }
    put(foodG, texMat(F, sign("BISCUITS", "#c0392b", "#fff2c6", 256, 64, 36), 0.2), vPlane(0.6, 0.12, -3.55, S + 0.24, -1.348));
    // Tunnel oven: long, stainless, glowing mouth.
    put(foodG, M(F, 0xc9ced3, 0.8, 0.3), rb(1.25, 0.14, 0.2, 0.05, -3.55, S, -1.08));
    put(foodG, M(F, 0x8d97a1, 0.6, 0.4), ...[-4.0, -3.7, -3.4, -3.1].map((x) => cyl(0.025, 0.06, x, S + 0.14, -1.08, 10)));
    put(foodG, L.add(F, std(0xffa040, 0, 0.4, { emissive: 0xff7a1a, emissiveIntensity: 1.6 })), vPlane(0.16, 0.08, -2.925, S + 0.07, -1.08, Math.PI / 2));
    // The belt out of the oven, biscuits riding on it (texture scrolls).
    const beltTex = repeat(
      tex(256, 64, (g, w, h) => {
        g.fillStyle = "#e8e6e1";
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 2; j++) {
            const cx = 32 + i * 64 + (j ? 32 : 0),
              cy = 16 + j * 32;
            g.fillStyle = "#c98a3e";
            g.beginPath();
            g.arc(cx, cy, 12, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#8a5a24";
            for (let k = 0; k < 5; k++) g.fillRect(cx - 6 + (k % 3) * 5, cy - 4 + Math.floor(k / 3) * 7, 2, 2);
          }
      })
    );
    beltTex.repeat.set(4, 1);
    put(foodG, M(F, 0x8d97a1, 0.6, 0.4), bx(-2.93, -2.25, S, S + 0.08, -1.17, -0.99));
    const belt = new THREE.Mesh(hPlane(0.68, 0.16, -2.59, S + 0.082, -1.08), L.add(F, std(0xffffff, 0, 0.6, { map: beltTex })));
    foodG.add(belt);
    // Biscuit packets stacked at the end of the line (red, yellow, blue).
    const packet = texMat(F, tex(64, 32, (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c98a3e";
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(14 + i * 18, h / 2, 7, 0, Math.PI * 2);
        g.fill();
      }
    }), 0.05);
    const packs: Item[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) packs.push({ p: [-2.15 + j * 0.09, S + 0.02 + i * 0.04, -1.22], ry: 0, c: [0xd8352a, 0xf2c230, 0x2f6fc0][j] });
    inst(foodG, roundedBox(THREE, 0.085, 0.035, 0.05, 0.012), packet, packs);
    // A giant cream biscuit standing on its edge (two baked discs, cream between, docker holes).
    const bisc = texMat(F, tex(128, 128, (g, w, h) => {
      g.fillStyle = "#b8722e";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c98a3e";
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#6b3f14";
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 5) {
        g.beginPath();
        g.arc(w / 2 + i * 18, h / 2 + j * 18, 3.5, 0, Math.PI * 2);
        g.fill();
      }
    }), 0.08);
    const biscGeo = (z: number) => new THREE.CylinderGeometry(0.2, 0.2, 0.04, 36).rotateX(Math.PI / 2).translate(-3.0, S + 0.2, z);
    put(foodG, bisc, biscGeo(-0.83), biscGeo(-0.7));
    put(foodG, M(F, 0xfaf3e3, 0, 0.7), new THREE.CylinderGeometry(0.19, 0.19, 0.05, 36).rotateX(Math.PI / 2).translate(-3.0, S + 0.2, -0.765));
    // A puffed chips pillow pack with crimped ends.
    const chips = texMat(F, tex(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "#1f4fb0");
      gr.addColorStop(0.5, "#3b7be0");
      gr.addColorStop(1, "#1f4fb0");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f2c230";
      g.beginPath();
      g.arc(w / 2, h * 0.58, 18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.fillRect(8, 24, w - 16, 10);
    }), 0.12, { metalness: 0.4, roughness: 0.3 });
    put(foodG, chips, sph(0.12, -3.85, S + 0.24, -0.7, 1, 1.75, 0.45, 20));
    put(foodG, M(F, 0x1f4fb0, 0.4, 0.3), bx(-3.97, -3.73, S + 0.43, S + 0.45, -0.72, -0.68), bx(-3.97, -3.73, S + 0.03, S + 0.05, -0.72, -0.68));
    people(foodG, F, [[-2.4, S, -0.85], [-3.3, S, -1.35]]);

    // ---- beverages: bottling canopy, rotary filler, bottle conveyor, crates, contour bottle, tea + chai
    const posts: T.BufferGeometry[] = [];
    for (const x of [2.55, 3.15, 3.75]) for (const z of [-1.62, -0.72]) posts.push(cyl(0.015, 0.32, x, S, z, 8));
    put(foodG, M(F, 0x59626c, 0.6, 0.4), ...posts);
    put(foodG, M(F, 0xd8352a, 0.1, 0.55, { side: DS }), barrel(2.5, 3.8, -1.68, -0.66, S + 0.32, 0.35));
    put(foodG, M(F, 0xc9ced3, 0.6, 0.35), bx(2.5, 3.8, S + 0.3, S + 0.32, -1.68, -0.66).translate(0, 0, 0));
    // Rotary filler: a turret with bottles round its rim; the group turns.
    put(foodG, M(F, 0xc9ced3, 0.85, 0.25), cyl(0.16, 0.1, 3.0, S, -1.1, 28), cyl(0.05, 0.12, 3.0, S + 0.1, -1.1, 16), cyl(0.13, 0.03, 3.0, S + 0.22, -1.1, 24));
    const filler = group(foodG, 3.0, S + 0.1, -1.1);
    const bottleGeo = lathe(THREE, [[0, 0], [0.018, 0], [0.019, 0.04], [0.01, 0.065], [0.008, 0.08], [0, 0.08]], 10);
    const capGeo = cyl(0.009, 0.01, 0, 0.078, 0, 8);
    const ring: Item[] = [];
    for (let k = 0; k < 14; k++) ring.push({ p: [Math.cos((k / 14) * 6.283) * 0.13, 0, Math.sin((k / 14) * 6.283) * 0.13], c: k % 2 ? 0x3a1c10 : 0xe07a1f });
    const glassMat = M(F, 0xffffff, 0.2, 0.12, { opacity: 0.92 }, "bottle");
    inst(filler, bottleGeo, glassMat, ring);
    inst(filler, capGeo, M(F, 0xd8352a, 0.3, 0.4), ring.map((r) => ({ p: r.p })));
    // Conveyor of filled bottles out to the crate stacks.
    put(foodG, M(F, 0x8d97a1, 0.6, 0.4), bx(3.12, 3.95, S, S + 0.07, -1.13, -1.07));
    const line: Item[] = [];
    for (let k = 0; k < 18; k++) line.push({ p: [3.15 + k * 0.045, S + 0.07, -1.1], c: k % 2 ? 0x3a1c10 : 0xe07a1f });
    inst(foodG, bottleGeo, glassMat, line);
    inst(foodG, capGeo, M(F, 0xd8352a, 0.3, 0.4), line.map((r) => ({ p: r.p })));
    // Plastic crates of bottles, stacked.
    const crateGeo = mergeInto(THREE, [bx(-0.06, 0.06, 0, 0.012, -0.045, 0.045), bx(-0.06, 0.06, 0.012, 0.07, 0.04, 0.045), bx(-0.06, 0.06, 0.012, 0.07, -0.045, -0.04), bx(0.055, 0.06, 0.012, 0.07, -0.045, 0.045), bx(-0.06, -0.055, 0.012, 0.07, -0.045, 0.045)]);
    const crates: Item[] = [],
      crateTops: Item[] = [];
    const crateAt = (x: number, z: number, n: number, c: number) => {
      for (let k = 0; k < n; k++) {
        crates.push({ p: [x, S + k * 0.07, z], c });
        if (k === n - 1) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) crateTops.push({ p: [x - 0.04 + i * 0.027, S + k * 0.07 + 0.012, z - 0.027 + j * 0.027], c: 0x3a1c10, s: [0.9, 0.8, 0.9] });
      }
    };
    crateAt(3.95, -1.35, 4, 0xd8352a);
    crateAt(4.08, -1.35, 3, 0xd8352a);
    crateAt(3.95, -1.45, 3, 0xf2c230);
    crateAt(4.08, -1.45, 2, 0xd8352a);
    crateAt(4.2, -1.4, 3, 0x2f9c95);
    inst(foodG, crateGeo, M(F, 0xffffff, 0.1, 0.5, {}, "crate"), crates);
    inst(foodG, bottleGeo, glassMat, crateTops);
    // A giant contour-style soft-drink bottle with a red label band.
    put(foodG, M(F, 0x3a1c10, 0.2, 0.08, { opacity: 0.9 }), lathe(THREE, [[0, 0], [0.07, 0], [0.085, 0.06], [0.07, 0.14], [0.085, 0.22], [0.075, 0.28], [0.04, 0.38], [0.032, 0.48], [0, 0.48]], 28).translate(3.6, S, -0.82));
    put(foodG, M(F, 0xd8352a, 0.3, 0.4), cyl(0.034, 0.03, 3.6, S + 0.475, -0.82, 16), cyl(0.0855, 0.06, 3.6, S + 0.04, -0.82, 28));
    // Tea bushes (rounded hedges in rows) and a giant steaming cup of chai.
    const bushes: Item[] = [];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) bushes.push({ p: [4.1 + r * 0.1, S + 0.03, -1.6 + k * 0.27], s: [1, 1, 2.2], c: R() < 0.5 ? 0x3f7f3a : 0x4c8a3c });
    inst(foodG, sph(0.045, 0, 0, 0, 1, 0.8, 1, 10), M(F, 0xffffff, 0, 0.85, {}, "tea"), bushes);
    put(foodG, M(F, 0xf4f1ea, 0.05, 0.35), lathe(THREE, [[0, 0], [0.08, 0], [0.1, 0.06], [0.115, 0.17], [0.105, 0.17], [0.09, 0.07], [0, 0.07]], 28).translate(3.6, S + 0.02, -0.25), cyl(0.15, 0.02, 3.6, S, -0.25, 28));
    put(foodG, M(F, 0xf4f1ea, 0.05, 0.35), new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI * 1.2).rotateZ(-Math.PI * 0.6).translate(3.72, S + 0.12, -0.25));
    put(foodG, M(F, 0xb06a2e, 0, 0.3), cyl(0.1, 0.005, 3.6, S + 0.14, -0.25, 24));
    const steam: T.Mesh[] = [];
    const steamMat = L.add(F, std(0xffffff, 0, 0.9, { opacity: 0.45, depthWrite: false }), 0.6);
    for (let i = 0; i < 3; i++) steam.push(mesh(foodG, sph(0.04, 0, 0, 0, 1, 1.3, 1, 10), steamMat));
    people(foodG, F, [[2.8, S, -0.85], [3.4, S, -1.45]]);

    // ---- tobacco: paan-and-cigarette kiosk with a giant cigarette pack on its roof
    const kx = -2.6,
      kz = 2.75;
    const kiosk = group(foodG, kx, S, kz, 0.2);
    put(kiosk, M(F, 0x7a4a2a, 0, 0.7), ...[[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]].map(([x, z]) => cyl(0.012, 0.16, x, 0, z, 6)));
    put(kiosk, M(F, 0x2f9c95, 0.05, 0.6), bx(-0.23, 0.23, 0.16, 0.2, -0.15, 0.15), bx(-0.23, 0.23, 0.2, 0.5, -0.15, -0.12), bx(-0.23, -0.2, 0.2, 0.5, -0.15, 0.15), bx(0.2, 0.23, 0.2, 0.5, -0.15, 0.15));
    const cigShelf = texMat(F, tex(128, 96, (g, w, h) => {
      g.fillStyle = "#5a3a22";
      g.fillRect(0, 0, w, h);
      const cols = ["#ffffff", "#c62f28", "#f2c230", "#2f6fc0", "#1f7a3e", "#ffffff"];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        g.fillStyle = cols[(r * 3 + c) % cols.length];
        g.fillRect(4 + c * 15.5, 4 + r * 23, 13, 19);
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(4 + c * 15.5, 4 + r * 23, 13, 5);
      }
    }), 0.25);
    put(kiosk, cigShelf, vPlane(0.4, 0.29, 0, 0.35, -0.118));
    put(kiosk, M(F, 0x9a8a7a, 0.6, 0.4, { side: DS }), new THREE.PlaneGeometry(0.56, 0.4).rotateX(-Math.PI / 2 - 0.25).translate(0, 0.54, 0.02));
    // Hanging paan-masala strips and a lit rope lighter.
    for (let i = 0; i < 5; i++) put(kiosk, texMat(F, sachetTex(["#1f7a3e", "#f2c230", "#c62f28"]), 0.15, { side: DS }), vPlane(0.035, 0.16, -0.17 + i * 0.085, 0.42, 0.15));
    put(kiosk, M(F, 0xc0b090, 0, 0.9), tube(THREE, [[0.22, 0.48, 0.14], [0.25, 0.38, 0.16], [0.24, 0.3, 0.17]], 0.006, 6));
    put(kiosk, L.add(F, std(0xff6a1a, 0, 0.4, { emissive: 0xff4a00, emissiveIntensity: 2 })), sph(0.01, 0.24, 0.3, 0.17));
    // The giant flip-top pack, lid open, cigarettes standing up.
    const pack = texMat(F, tex(64, 96, (g, w, h) => {
      g.fillStyle = "#f6f3ec";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c62f28";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      g.lineTo(w, 30);
      g.lineTo(w / 2, 46);
      g.lineTo(0, 30);
      g.closePath();
      g.fill();
      g.fillStyle = "#3a3a3a";
      g.fillRect(6, h - 22, w - 12, 14);
    }), 0.15);
    put(kiosk, pack, bx(-0.1, 0.1, 0.6, 0.86, -0.04, 0.04));
    put(kiosk, M(F, 0xc62f28, 0.1, 0.5), bx(-0.1, 0.1, 0.86, 0.87, -0.04, 0.04).rotateX(-0.9).translate(0, 0.05, -0.08));
    for (let i = 0; i < 5; i++) {
      const x = -0.07 + i * 0.035,
        top = 0.93 + (i % 2) * 0.03;
      put(kiosk, M(F, 0xfaf8f2, 0, 0.7), cyl(0.013, top - 0.86 - 0.025, x, 0.86, 0.0, 10));
      put(kiosk, M(F, 0xd98a3a, 0, 0.7), cyl(0.0132, 0.025, x, top - 0.025, 0.0, 10));
    }
    put(kiosk, M(F, 0x7a4a2a, 0, 0.7), bx(-0.03, 0.03, 0.52, 0.6, -0.02, 0.02));
    people(foodG, F, [[kx + 0.05, S, kz + 0.35], [kx - 0.25, S, kz + 0.3]]);
    animFood = { belt: beltTex, filler, steam };
  }

  // ================================================================ LAYER 2: HOME & PERSONAL CARE + THE KIRANA
  {
    const F = "hpc";
    // ---- personal care: a pink beauty-and-grooming plant with its giant products in the yard
    put(hpcG, M(F, 0xf3d6dc, 0.05, 0.6), ...walls(-4.3, -3.55, 0.2, 0.55, S, S + 0.26));
    put(hpcG, M(F, 0xd04f7a, 0.1, 0.5, { side: DS }), barrel(-4.33, -3.52, 0.17, 0.58, S + 0.26, 0.5));
    put(hpcG, M(F, 0x9fc7dc, 0.3, 0.1), vPlane(0.5, 0.12, -3.92, S + 0.13, 0.553));
    put(hpcG, M(F, 0xe3e7ea, 0.85, 0.25), cyl(0.09, 0.22, -4.35, S + 0.08, 0.85, 20), lathe(THREE, [[0.09, 0], [0.0, 0.08]], 20).translate(-4.35, S + 0.3, 0.85), ...[0, 1, 2].map((i) => cyl(0.008, 0.08, -4.35 + Math.cos(i * 2.1) * 0.07, S, 0.85 + Math.sin(i * 2.1) * 0.07, 6)));
    // Giant shampoo bottle: soft rounded flat bottle, flip cap, pearly label.
    const shampoo = texMat(F, tex(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#5aa0e0");
      gr.addColorStop(1, "#2f6fc0");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.ellipse(w / 2, h * 0.55, w * 0.34, h * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2f6fc0";
      g.fillRect(w * 0.25, h * 0.52, w * 0.5, 5);
    }), 0.12, { roughness: 0.25 });
    put(hpcG, shampoo, roundedBox(THREE, 0.22, 0.42, 0.1, 0.05).translate(-3.15, S + 0.21, 0.55));
    put(hpcG, M(F, 0xf4f1ea, 0.1, 0.35), cyl(0.045, 0.06, -3.15, S + 0.42, 0.55, 16), rb(0.03, 0.02, 0.05, 0.008, -3.15, S + 0.48, 0.55));
    // Lipstick: gold case, red bullet.
    put(hpcG, M(F, 0xd4a843, 0.9, 0.25), cyl(0.045, 0.15, -2.8, S, 0.85, 20), cyl(0.038, 0.04, -2.8, S + 0.15, 0.85, 20));
    put(hpcG, M(F, 0xc0182a, 0.1, 0.3), cyl(0.032, 0.08, -2.8, S + 0.19, 0.85, 20), sph(0.032, -2.8, S + 0.27, 0.85, 1, 0.8, 1).rotateZ(0));
    // Razor: handle and twin-blade head.
    put(hpcG, M(F, 0x2a2f36, 0.3, 0.4), bar(THREE, [-3.5, S + 0.02, 0.98], [-3.45, S + 0.32, 0.9], 0.018, 10));
    put(hpcG, M(F, 0x2f6fc0, 0.3, 0.4), rb(0.12, 0.04, 0.035, 0.012, -3.45, S + 0.31, 0.9));
    put(hpcG, M(F, 0xd8dde2, 0.9, 0.2), bx(-3.5, -3.4, S + 0.33, S + 0.34, 0.917, 0.92));
    // Soap bars and a toothpaste tube.
    put(hpcG, M(F, 0xf4a6c0, 0.05, 0.45), rb(0.14, 0.05, 0.09, 0.03, -2.55, S, 0.45));
    put(hpcG, M(F, 0x8fd18a, 0.05, 0.45), rb(0.14, 0.05, 0.09, 0.03, -2.55, S + 0.05, 0.47).rotateY(0));
    put(hpcG, M(F, 0xf4f1ea, 0.05, 0.4), cyl(0.04, 0.25, 0, 0, 0, 16, 0.03).scale(1, 1, 0.45).rotateZ(Math.PI / 2).translate(-2.62, S + 0.04, 0.72));
    put(hpcG, M(F, 0xd8352a, 0.2, 0.4), cyl(0.02, 0.03, 0, 0, 0, 12).rotateZ(Math.PI / 2).translate(-2.48, S + 0.04, 0.72));
    people(hpcG, F, [[-3.6, S, 0.75], [-2.9, S, 0.25]]);

    // ---- home care + stationery: detergent spray-drying tower, carton, pencils, mosquito coil
    const tx = 2.95,
      tz = 0.5;
    put(hpcG, M(F, 0xeceff1, 0.5, 0.35), cyl(0.15, 0.55, tx, S + 0.3, tz, 24), lathe(THREE, [[0.15, 0], [0.03, -0.16], [0.03, -0.2]], 24).translate(tx, S + 0.3, tz), sph(0.15, tx, S + 0.85, tz, 1, 0.3, 1, 24));
    put(hpcG, M(F, 0x59626c, 0.6, 0.4), ...[0, 1, 2, 3].map((i) => bar(THREE, [tx + Math.cos(i * 1.571 + 0.785) * 0.17, S, tz + Math.sin(i * 1.571 + 0.785) * 0.17], [tx + Math.cos(i * 1.571 + 0.785) * 0.13, S + 0.32, tz + Math.sin(i * 1.571 + 0.785) * 0.13], 0.01, 6)));
    put(hpcG, M(F, 0x2f6fc0, 0.2, 0.5), cyl(0.152, 0.05, tx, S + 0.62, tz, 24));
    put(hpcG, M(F, 0xc9ced3, 0.7, 0.3), lathe(THREE, [[0.0, 0], [0.05, 0.0], [0.06, 0.12], [0.06, 0.2], [0, 0.2]], 16).rotateX(Math.PI).translate(tx + 0.3, S + 0.5, tz - 0.05), bar(THREE, [tx + 0.13, S + 0.78, tz], [tx + 0.3, S + 0.52, tz - 0.05], 0.015, 6));
    // The detergent carton with a handle.
    const det = texMat(F, tex(96, 128, (g, w, h) => {
      g.fillStyle = "#2f6fc0";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f28c1e";
      g.beginPath();
      g.arc(w / 2, h * 0.45, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = font(20);
      g.textAlign = "center";
      g.fillText("WASH", w / 2, h * 0.49);
      g.fillStyle = "#e8f3ff";
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(12 + i * 15, h - 18 - (i % 2) * 6, 5, 0, Math.PI * 2);
        g.fill();
      }
    }), 0.12);
    put(hpcG, det, bx(3.35, 3.6, S, S + 0.32, 0.72, 0.84));
    put(hpcG, M(F, 0x2f6fc0, 0.2, 0.5), new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI).translate(3.475, S + 0.32, 0.78));
    // Giant pencils: hexagonal yellow barrels, sharpened tips, pink erasers, in a fan.
    for (const [x, z, a] of [
      [2.65, 0.85, 0.0],
      [2.72, 0.86, 0.25],
      [2.58, 0.86, -0.25],
    ] as [number, number, number][]) {
      const p = group(hpcG, x, S + 0.02, z, 0);
      p.rotation.z = a;
      put(p, M(F, 0xf2c230, 0.05, 0.5), new THREE.CylinderGeometry(0.022, 0.022, 0.4, 6).translate(0, 0.2, 0));
      put(p, M(F, 0xe7c9a0, 0, 0.7), new THREE.ConeGeometry(0.022, 0.06, 6).translate(0, 0.43, 0));
      put(p, M(F, 0x2a2a2a, 0.3, 0.5), new THREE.ConeGeometry(0.008, 0.022, 6).translate(0, 0.468, 0));
      put(p, M(F, 0xc9ced3, 0.8, 0.3), cyl(0.023, 0.025, 0, -0.025, 0, 10));
      put(p, M(F, 0xf08aa0, 0, 0.7), cyl(0.021, 0.025, 0, -0.05, 0, 10));
    }
    // Mosquito coil on its stand, a thin wisp rising.
    const coil: Vec3[] = [];
    for (let k = 0; k <= 80; k++) {
      const a = k * 0.2,
        r = 0.02 + k * 0.0012;
      coil.push([3.45 + Math.cos(a) * r, S + 0.012, 0.25 + Math.sin(a) * r]);
    }
    put(hpcG, M(F, 0x2f7a3a, 0, 0.8), tube(THREE, coil, 0.006, 5, false, 160));
    put(hpcG, M(F, 0xc9ced3, 0.7, 0.3), cyl(0.012, 0.012, 3.45, S, 0.25, 8));
    people(hpcG, F, [[3.2, S, 0.3], [2.75, S, 0.15]]);

    // ---- THE KIRANA (FMCG majors): shutter rolled up, shelves packed to the ceiling
    const K2 = "kirana";
    const kg = group(hpcG, KX, S, KZ, KR);
    kg.scale.setScalar(KS);
    const W = 1.3,
      D = 0.62,
      H = 1.05;
    // Plinth with two front steps.
    put(kg, M(K2, 0xd8d2c4, 0, 0.8), bx(-W - 0.05, W + 0.05, 0, 0.06, -D - 0.03, D + 0.06), bx(-W + 0.1, W - 0.1, 0, 0.03, D + 0.06, D + 0.16));
    // Walls: turquoise outside, warm yellow inside, a red dado.
    const wallOut = M(K2, 0x2fa79a, 0.05, 0.7);
    put(kg, wallOut, bx(-W, W, 0.06, H, -D, -D + 0.05), bx(-W, -W + 0.06, 0.06, H, -D, D), bx(W - 0.06, W, 0.06, H, -D, D));
    put(kg, M(K2, 0xf3e3b0, 0, 0.75), vPlane(2 * W - 0.12, H - 0.06, 0, (H + 0.06) / 2, -D + 0.051), vPlane(2 * D - 0.05, H - 0.06, -W + 0.061, (H + 0.06) / 2, 0.025, Math.PI / 2), vPlane(2 * D - 0.05, H - 0.06, W - 0.061, (H + 0.06) / 2, 0.025, -Math.PI / 2));
    put(kg, M(K2, 0xb8382e, 0.05, 0.6), bx(-W - 0.005, -W + 0.065, 0.06, 0.22, D - 0.005, D + 0.005), bx(W - 0.065, W + 0.005, 0.06, 0.22, D - 0.005, D + 0.005));
    // Signboard band and roof slab, a water tank and a dish on the roof.
    const board = texMat(K2, tex(512, 96, (g, w, h) => {
      g.fillStyle = "#f2c230";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c62f28";
      g.fillRect(0, 0, w, 10);
      g.fillRect(0, h - 10, w, 10);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#b8282a";
      g.font = font(46);
      g.fillText("GENERAL STORE", w / 2, h * 0.42);
      g.fillStyle = "#1f4f8a";
      g.font = font(18, "600");
      g.fillText("KIRANA  •  DAIRY  •  COLD DRINKS  •  STATIONERY", w / 2, h * 0.8);
    }), 0.3);
    put(kg, wallOut, bx(-W, W, H, H + 0.26, -D, D - 0.02));
    put(kg, board, vPlane(2 * W - 0.04, 0.24, 0, H + 0.13, D + 0.001));
    put(kg, M(K2, 0xc9b79a, 0, 0.85), bx(-W - 0.06, W + 0.06, H + 0.26, H + 0.31, -D - 0.06, D + 0.08));
    // Roof terrace: a parapet, a clothes line with the wash out, spare crates and potted tulsi.
    const RY = H + 0.31;
    put(kg, wallOut, bx(-W - 0.06, W + 0.06, RY, RY + 0.07, -D - 0.06, -D - 0.02), bx(-W - 0.06, -W - 0.02, RY, RY + 0.07, -D - 0.06, D + 0.08), bx(W + 0.02, W + 0.06, RY, RY + 0.07, -D - 0.06, D + 0.08));
    put(kg, M(K2, 0x8d8f91, 0.5, 0.4), cyl(0.006, 0.22, -0.2, RY, 0.1, 6), cyl(0.006, 0.22, 0.55, RY, 0.1, 6), hcyl(0.003, 0.75, 0.175, RY + 0.21, 0.1, "x", 4));
    const wash: Item[] = [];
    for (let i = 0; i < 6; i++) wash.push({ p: [-0.12 + i * 0.12, RY + 0.21, 0.1], s: [0.9 + R() * 0.4, 0.8 + R() * 0.6, 1], c: [0xd8352a, 0xf2c230, 0x2f6fc0, 0xd04f7a, 0x3a9a4a, 0xf4f1ea][i] });
    inst(kg, new THREE.PlaneGeometry(0.09, 0.12).translate(0, -0.06, 0), M(K2, 0xffffff, 0, 0.9, { side: DS }, "wash"), wash);
    put(kg, M(K2, 0xc49a6c, 0, 0.8), bx(0.95, 1.15, RY, RY + 0.08, -0.5, -0.3), bx(0.98, 1.12, RY + 0.08, RY + 0.15, -0.48, -0.33));
    put(kg, M(K2, 0xa04a32, 0, 0.85), ...[[-1.1, 0.55], [-0.95, 0.6]].map(([x, z]) => cyl(0.04, 0.06, x, RY, z, 10, 0.05)));
    put(kg, M(K2, 0x4f8a3a, 0, 0.85), ...[[-1.1, 0.55], [-0.95, 0.6]].map(([x, z]) => sph(0.05, x, RY + 0.1, z)));
    put(kg, M(K2, 0x1c1d20, 0.1, 0.6), ...[0, 1, 2, 3, 4].map((i) => cyl(0.13 + (i % 2) * 0.005, 0.06, -0.85, H + 0.31 + i * 0.06, -0.3, 24)), cyl(0.07, 0.03, -0.85, H + 0.61, -0.3, 20));
    put(kg, M(K2, 0xd8dde2, 0.5, 0.4), sph(0.07, 0.75, H + 0.42, -0.3, 1, 1, 0.35).rotateX(0.6), bar(THREE, [0.75, H + 0.31, -0.33], [0.75, H + 0.4, -0.3], 0.008, 6));
    // The rolled-up shutter under the board, and its guide rails down the pillars.
    const shutter = texMat(K2, repeat(corrugated("#a9adb1", "#7f8489")), 0.02, { metalness: 0.6, roughness: 0.4 });
    put(kg, shutter, uvScale(hcyl(0.065, 2 * W - 0.08, 0, H - 0.04, D + 0.04, "x", 18), 1, 30));
    put(kg, M(K2, 0x7f8489, 0.6, 0.4), bx(-W + 0.06, -W + 0.08, 0.06, H - 0.06, D, D + 0.03), bx(W - 0.08, W - 0.06, 0.06, H - 0.06, D, D + 0.03));
    // Shelves: back wall floor to ceiling, and both side walls.
    const wood = M(K2, 0x8a5a34, 0.05, 0.6);
    const shelfY = [0.14, 0.31, 0.48, 0.65, 0.82];
    put(kg, wood, ...shelfY.map((y) => bx(-W + 0.06, W - 0.06, y - 0.012, y, -D + 0.05, -D + 0.24)));
    put(kg, wood, ...shelfY.flatMap((y) => [bx(-W + 0.06, -W + 0.22, y - 0.012, y, -D + 0.25, D - 0.12), bx(W - 0.22, W - 0.06, y - 0.012, y, -D + 0.25, D - 0.25)]));
    const COLS = [0xd8352a, 0xf2c230, 0x2f6fc0, 0x3a9a4a, 0xe07a1f, 0x7b3fa0, 0xf4f1ea, 0xd04f7a, 0x2fa7c9, 0x8a2b2b, 0x1f4f8a, 0xf28c1e];
    const boxes: Item[] = [],
      bottles: Item[] = [],
      jarsI: Item[] = [];
    const fillRow = (x0: number, x1: number, y: number, z: number, along: "x" | "z", depth: number) => {
      let p = x0;
      while (p < x1 - 0.04) {
        const w = 0.04 + R() * 0.05;
        const h = 0.07 + R() * 0.07;
        const kind = R();
        const c = COLS[Math.floor(R() * COLS.length)];
        const cx = p + w / 2;
        const pos: Vec3 = along === "x" ? [cx, y, z] : [z, y, cx];
        if (kind < 0.18) {
          // a short run of bottles (shampoo, oil, ketchup)
          for (let k = 0; k < 3 && p < x1 - 0.03; k++) {
            const bp: Vec3 = along === "x" ? [p + 0.015, y, z] : [z, y, p + 0.015];
            bottles.push({ p: bp, c, s: [1, 0.8 + R() * 0.5, 1] });
            p += 0.032;
          }
          continue;
        }
        if (kind < 0.26) jarsI.push({ p: pos, c });
        else boxes.push({ p: pos, ry: along === "x" ? 0 : Math.PI / 2, s: [w / 0.05, h / 0.1, depth / 0.05], c });
        p += w + 0.004;
      }
    };
    for (const y of [0.06, ...shelfY.slice(0, 4)].map((v, i) => (i === 0 ? 0.07 : v))) fillRow(-W + 0.08, W - 0.08, y, -D + 0.15, "x", 0.12);
    for (const y of [0.07, ...shelfY.slice(0, 4)].map((v, i) => (i === 0 ? 0.07 : v))) {
      fillRow(-D + 0.27, D - 0.14, y, -W + 0.14, "z", 0.11);
      fillRow(-D + 0.27, D - 0.27, y, W - 0.14, "z", 0.11);
    }
    // Top shelf: cartons stacked to the ceiling.
    for (let x = -W + 0.1; x < W - 0.12; x += 0.13) boxes.push({ p: [x + 0.06, 0.82, -D + 0.15], s: [2.4, 1.4, 2.4], c: R() < 0.5 ? 0xc49a6c : 0xb58a5c });
    inst(kg, new THREE.BoxGeometry(0.05, 0.1, 0.05).translate(0, 0.05, 0), texMat(K2, packTex, 0.1), boxes);
    inst(kg, lathe(THREE, [[0, 0], [0.014, 0], [0.015, 0.06], [0.008, 0.08], [0.007, 0.095], [0, 0.095]], 8), M(K2, 0xffffff, 0.1, 0.3, {}, "shelfbottle"), bottles);
    inst(kg, cyl(0.025, 0.08, 0, 0, 0, 10), M(K2, 0xffffff, 0.2, 0.2, { opacity: 0.85 }, "jar"), jarsI);
    // Counter with a glass front, candy jars and a weighing scale; the shopkeeper behind it.
    put(kg, M(K2, 0x8a5a34, 0.05, 0.6), bx(-1.05, 0.35, 0.06, 0.4, 0.18, 0.36), bx(-1.08, 0.38, 0.4, 0.43, 0.15, 0.4));
    put(kg, M(K2, 0xcfe6f2, 0.1, 0.05, { opacity: 0.35, side: DS, depthWrite: false }), vPlane(1.3, 0.26, -0.35, 0.25, 0.362));
    const jars: Item[] = [];
    const jarCandy: Item[] = [];
    for (let i = 0; i < 7; i++) {
      const x = -0.98 + i * 0.13;
      jars.push({ p: [x, 0.43, 0.3] });
      jarCandy.push({ p: [x, 0.435, 0.3], c: [0xd8352a, 0xf2c230, 0x3a9a4a, 0xe07a1f, 0xd04f7a, 0x7b3fa0, 0x2fa7c9][i] });
    }
    inst(kg, lathe(THREE, [[0, 0], [0.045, 0], [0.05, 0.03], [0.05, 0.12], [0.035, 0.14], [0, 0.14]], 14), M(K2, 0xe6f2f7, 0.1, 0.05, { opacity: 0.4, depthWrite: false }, "candyjar"), jars);
    inst(kg, cyl(0.044, 0.08, 0, 0, 0, 12), M(K2, 0xffffff, 0, 0.4, {}, "candy"), jarCandy);
    put(kg, M(K2, 0x2fa7c9, 0.3, 0.4), ...jars.map((j) => cyl(0.03, 0.02, j.p[0], 0.57, j.p[2], 12)));
    put(kg, M(K2, 0xd8dde2, 0.7, 0.3), rb(0.14, 0.05, 0.1, 0.015, 0.22, 0.43, 0.28));
    put(kg, M(K2, 0x2a2f36, 0.3, 0.4), vPlane(0.08, 0.03, 0.22, 0.465, 0.331));
    people(kg, K2, [[-0.4, 0.06, 0.02, 0.2]]);
    // Visi-cooler: red header, glass door full of bottles.
    const cooler = texMat(K2, tex(64, 128, (g, w, h) => {
      g.fillStyle = "#0c1a24";
      g.fillRect(0, 0, w, h);
      const c = ["#3a1c10", "#e07a1f", "#3a9a4a", "#3a1c10"];
      for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
        g.fillStyle = c[(r + k) % 4];
        g.fillRect(6 + k * 11, 8 + r * 30, 8, 24);
      }
      g.fillStyle = "rgba(200,235,255,0.25)";
      g.fillRect(0, 0, w, h);
    }), 0.6);
    put(kg, M(K2, 0xd8352a, 0.2, 0.4), bx(0.6, 0.95, 0.06, 0.85, 0.0, 0.28));
    put(kg, cooler, vPlane(0.3, 0.62, 0.775, 0.42, 0.281));
    put(kg, M(K2, 0xffffff, 0.1, 0.4), vPlane(0.3, 0.1, 0.775, 0.79, 0.281));
    // Sachet garlands hanging across the opening (shampoo, coffee, detergent, ketchup strips).
    const sachetSets = [
      ["#1c1c1c", "#d04f7a", "#1c1c1c"],
      ["#3a9a4a", "#f4f1ea", "#3a9a4a"],
      ["#7b3fa0", "#f2c230", "#7b3fa0"],
      ["#2f6fc0", "#e8f3ff", "#2f6fc0"],
      ["#d8352a", "#f2c230", "#d8352a"],
    ].map((c) => texMat(K2, sachetTex(c), 0.2, { side: DS }));
    const strips: T.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const x = -W + 0.16 + i * ((2 * W - 0.32) / 17);
      const len = 0.28 + (i % 3) * 0.06;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.06, len).translate(0, -len / 2, 0), sachetSets[i % sachetSets.length]);
      s.position.set(x, H - 0.08, D + 0.08);
      kg.add(s);
      strips.push(s);
    }
    put(kg, M(K2, 0x7f8489, 0.6, 0.4), hcyl(0.004, 2 * W - 0.2, 0, H - 0.08, D + 0.08, "x", 4));
    // A string of chips packets hanging on the left pillar.
    const pill = sph(0.04, 0, 0, 0, 0.75, 1.1, 0.3, 10);
    inst(kg, pill, M(K2, 0xffffff, 0.4, 0.3, {}, "chipsstring"), [0, 1, 2, 3].map((i) => ({ p: [-W - 0.05, 0.85 - i * 0.1, D + 0.02] as Vec3, c: [0xf2c230, 0x3a9a4a, 0x2f6fc0, 0xd8352a][i] })));
    // Sacks of rice, atta and dal on the step, mouths rolled open.
    for (const [x, c] of [
      [-0.95, 0xf4f1ea],
      [-0.75, 0xe8c56a],
      [-0.55, 0xe0a030],
    ] as [number, number][]) {
      put(kg, M(K2, 0xd9c79a, 0, 0.95), cyl(0.08, 0.14, x, 0.06, D + 0.1, 14, 0.085));
      put(kg, M(K2, c, 0, 0.9), cyl(0.08, 0.01, x, 0.2, D + 0.1, 14));
    }
    // Crates of soft drinks stacked outside on the right.
    const kcr: Item[] = [],
      kcrTop: Item[] = [];
    for (let k = 0; k < 3; k++) kcr.push({ p: [W + 0.14, k * 0.07, D - 0.05], c: 0xd8352a });
    for (let k = 0; k < 2; k++) kcr.push({ p: [W + 0.14, k * 0.07, D - 0.17], c: 0xf2c230 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) kcrTop.push({ p: [W + 0.1 + i * 0.027, 0.222, D - 0.077 + j * 0.027], c: 0x3a1c10, s: [0.9, 0.8, 0.9] });
    const crateG2 = mergeInto(THREE, [bx(-0.06, 0.06, 0, 0.012, -0.045, 0.045), bx(-0.06, 0.06, 0.012, 0.07, 0.04, 0.045), bx(-0.06, 0.06, 0.012, 0.07, -0.045, -0.04), bx(0.055, 0.06, 0.012, 0.07, -0.045, 0.045), bx(-0.06, -0.055, 0.012, 0.07, -0.045, 0.045)]);
    inst(kg, crateG2, M(K2, 0xffffff, 0.1, 0.5, {}, "kcrate"), kcr);
    inst(kg, lathe(THREE, [[0, 0], [0.018, 0], [0.019, 0.04], [0.01, 0.065], [0.008, 0.08], [0, 0.08]], 10), M(K2, 0xffffff, 0.2, 0.12, {}, "kbottle"), kcrTop);
    // Tube light and a calendar on the back wall.
    put(kg, L.add(K2, std(0xffffff, 0, 0.4, { emissive: 0xf4fbff, emissiveIntensity: 1.4 })), hcyl(0.01, 0.6, 0, H - 0.05, -D + 0.08, "x", 8));
    // Customers at the step.
    people(hpcG, F, [[kw(-0.2, D + 0.35)[0], S, kw(-0.2, D + 0.35)[1], Math.PI], [kw(0.3, D + 0.4)[0], S, kw(0.3, D + 0.4)[1], 2.6]]);
    animHpc = { strips };
  }

  // ================================================================ LAYER 3: PACKS & SHELF
  {
    const F = "shelf";
    // ---- ingredients: copper flavour/fragrance kettles on a deck, a swan-neck still, drums, a contract-maker shed
    put(shelfG, M(F, 0x8d97a1, 0.6, 0.4), bx(-4.05, -2.95, S + 0.12, S + 0.14, 1.6, 2.1));
    put(shelfG, M(F, 0x59626c, 0.6, 0.4), ...[[-4.0, 1.65], [-3.0, 1.65], [-4.0, 2.05], [-3.0, 2.05]].map(([x, z]) => cyl(0.012, 0.12, x, S, z, 6)));
    put(shelfG, M(F, 0xf2c230, 0.2, 0.5), railing_(-4.05, -2.95, 2.1, S + 0.14));
    const copper = M(F, 0xc0703a, 0.85, 0.3);
    for (const x of [-3.8, -3.45, -3.1]) {
      put(shelfG, copper, lathe(THREE, [[0, 0], [0.11, 0.01], [0.14, 0.08], [0.14, 0.16], [0.1, 0.2], [0.03, 0.22], [0, 0.22]], 26).translate(x, S + 0.14, 1.85));
      put(shelfG, M(F, 0x59626c, 0.6, 0.4), cyl(0.025, 0.05, x, S + 0.36, 1.85, 10), cyl(0.04, 0.035, x, S + 0.41, 1.85, 12));
    }
    put(shelfG, copper, hcyl(0.015, 0.7, -3.45, S + 0.3, 1.72, "x", 8));
    // Swan-neck still (fragrance distillation) with a coil condenser.
    put(shelfG, copper, lathe(THREE, [[0, 0], [0.09, 0], [0.11, 0.08], [0.08, 0.16], [0.03, 0.2], [0.03, 0.26], [0, 0.26]], 22).translate(-4.2, S, 2.35));
    put(shelfG, copper, tube(THREE, [[-4.2, S + 0.26, 2.35], [-4.15, S + 0.34, 2.3], [-4.0, S + 0.33, 2.28], [-3.88, S + 0.22, 2.3]], 0.012, 8));
    const cl: Vec3[] = [];
    for (let k = 0; k <= 40; k++) cl.push([-3.85 + Math.cos(k * 0.6) * 0.05, S + 0.2 - k * 0.0042, 2.32 + Math.sin(k * 0.6) * 0.05]);
    put(shelfG, copper, tube(THREE, cl, 0.008, 6, false, 120));
    put(shelfG, M(F, 0xcfe6f2, 0.1, 0.1, { opacity: 0.5, depthWrite: false }), cyl(0.07, 0.22, -3.85, S, 2.32, 16));
    // Amber essence bottles and blue drums.
    const amber: Item[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) amber.push({ p: [-3.55 + i * 0.05, S, 2.3 + j * 0.05] });
    inst(shelfG, lathe(THREE, [[0, 0], [0.018, 0], [0.018, 0.05], [0.007, 0.07], [0, 0.07]], 10), M(F, 0xa8601a, 0.2, 0.15, { opacity: 0.9 }), amber);
    put(shelfG, M(F, 0x2f5d9a, 0.3, 0.45), ...[[-3.2, 2.32], [-3.1, 2.38], [-3.05, 2.27]].map(([x, z]) => cyl(0.04, 0.12, x, S, z, 14)));
    // Contract-maker shed: filling line for the brands, mixed cartons on a pallet.
    put(shelfG, M(F, 0xe8e2d4), ...walls(-4.35, -3.75, 1.05, 1.4, S, S + 0.2));
    put(shelfG, M(F, 0x3d5a80, 0.2, 0.6), gable(-4.35, -3.75, 1.05, 1.4, S + 0.2, 0.08));
    put(shelfG, M(F, 0xe8e2d4), ...gableEnds(-4.35, -3.75, 1.05, 1.4, S + 0.2, 0.08));
    put(shelfG, texMat(F, sign("CONTRACT PACKING", "#3d5a80", "#ffffff", 256, 40, 22), 0.2), vPlane(0.5, 0.07, -4.05, S + 0.15, 1.402));
    put(shelfG, M(F, 0x9a7450, 0.05, 0.6), bx(-3.6, -3.4, S, S + 0.02, 1.2, 1.36));
    const cart: Item[] = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) cart.push({ p: [-3.565 + i * 0.065, S + 0.02 + j * 0.055, 1.28], c: COLS2[(i + j * 3) % COLS2.length] });
    inst(shelfG, new THREE.BoxGeometry(0.06, 0.05, 0.14).translate(0, 0.025, 0), texMat(F, packTex, 0.1), cart);
    people(shelfG, F, [[-3.3, S + 0.14, 1.95], [-3.9, S, 1.55]]);

    // ---- packaging: a printing press with laminate rolls and a film web, tubes, bottles, labels
    const film = repeat(tex(128, 64, (g, w, h) => {
      const c = ["#d8352a", "#f2c230", "#2f6fc0", "#3a9a4a", "#d04f7a", "#f4f1ea"];
      for (let i = 0; i < 12; i++) {
        g.fillStyle = c[i % c.length];
        g.fillRect((i * w) / 12, 0, w / 12 + 1, h);
      }
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(0, h * 0.3, w, 4);
    }));
    const filmMat = texMat(F, film, 0.15, { metalness: 0.35, roughness: 0.3 });
    // Two big rolls on the floor (axis x), steel cores showing.
    for (const [x, z, r] of [
      [3.45, 1.75, 0.17],
      [3.95, 1.85, 0.13],
    ] as [number, number, number][]) {
      put(shelfG, filmMat, uvScale(hcyl(r, 0.32, x, S + r, z, "x", 28), 1, 3));
      put(shelfG, M(F, 0xc9ced3, 0.8, 0.3), hcyl(0.035, 0.36, x, S + r, z, "x", 12));
    }
    // The press: two side frames, a stack of rollers, the printed web running over them.
    const pressX0 = 3.1,
      pressX1 = 3.5,
      pz = 1.3;
    put(shelfG, M(F, 0x3d5a80, 0.4, 0.45), bx(pressX0 - 0.03, pressX0, S, S + 0.42, pz - 0.18, pz + 0.18), bx(pressX1, pressX1 + 0.03, S, S + 0.42, pz - 0.18, pz + 0.18));
    const rolls: Vec3[] = [
      [0, S + 0.08, pz + 0.12],
      [0, S + 0.36, pz + 0.08],
      [0, S + 0.12, pz],
      [0, S + 0.38, pz - 0.06],
      [0, S + 0.1, pz - 0.13],
    ];
    put(shelfG, M(F, 0xc9ced3, 0.8, 0.3), ...rolls.map((p) => hcyl(0.03, pressX1 - pressX0, (pressX0 + pressX1) / 2, p[1], p[2], "x", 12)));
    const web: T.BufferGeometry[] = [];
    for (let i = 0; i < rolls.length - 1; i++) {
      const a = rolls[i],
        b = rolls[i + 1];
      const len = Math.hypot(b[1] - a[1], b[2] - a[2]);
      const ang = Math.atan2(b[1] - a[1], b[2] - a[2]);
      web.push(uvScale(new THREE.PlaneGeometry(pressX1 - pressX0 - 0.04, len).rotateX(-Math.PI / 2).rotateX(ang).translate((pressX0 + pressX1) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), 1, 1));
    }
    put(shelfG, L.add(F, std(0xffffff, 0.3, 0.3, { map: film, side: DS })), ...web);
    // Collapsible tubes standing in a tray (white with coloured shoulders), PET bottles, glass bottles, label rolls.
    const tubes: Item[] = [],
      caps: Item[] = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      tubes.push({ p: [3.85 + i * 0.045, S + 0.02, 1.25 + j * 0.045] });
      caps.push({ p: [3.85 + i * 0.045, S + 0.02, 1.25 + j * 0.045], c: [0xd8352a, 0x2f6fc0, 0x3a9a4a][j] });
    }
    put(shelfG, M(F, 0x9a7450, 0.05, 0.6), bx(3.82, 4.1, S, S + 0.02, 1.22, 1.37));
    inst(shelfG, cyl(0.018, 0.12, 0, 0, 0, 10, 0.016), M(F, 0xf6f6f2, 0.1, 0.4), tubes);
    inst(shelfG, cyl(0.011, 0.025, 0, 0.12, 0, 10), M(F, 0xffffff, 0.2, 0.4, {}, "tubecap"), caps);
    const pet: Item[] = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) pet.push({ p: [4.25 + j * 0.05, S, 1.3 + i * 0.05], c: j ? 0x7fc0d8 : 0x2a8a4a });
    inst(shelfG, lathe(THREE, [[0, 0], [0.02, 0], [0.021, 0.07], [0.009, 0.1], [0, 0.1]], 10), M(F, 0xffffff, 0.2, 0.08, { opacity: 0.75 }, "pet"), pet);
    put(shelfG, M(F, 0xf4f1ea, 0, 0.7), ...[0, 1, 2].map((i) => hcyl(0.035, 0.05, 4.2, S + 0.035 + i * 0.07, 2.05, "z", 16)));
    put(shelfG, M(F, 0x8a5a34, 0, 0.7), ...[0, 1, 2].map((i) => hcyl(0.012, 0.052, 4.2, S + 0.035 + i * 0.07, 2.05, "z", 10)));
    // Converter shed behind, a sawtooth roof.
    put(shelfG, texMat(F, corrugated("#e1e6ea", "#c8cfd5"), 0.05), ...walls(3.0, 4.4, 0.95, 1.15, S, S + 0.24).map((g) => uvScale(g, 6, 1)));
    for (let i = 0; i < 4; i++) {
      const x0 = 3.0 + i * 0.35;
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.35, 0);
      sh.lineTo(0, 0.12);
      sh.lineTo(0, 0);
      put(shelfG, M(F, 0x3d5a80, 0.2, 0.55), new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }).translate(x0, S + 0.24, 0.94));
    }
    people(shelfG, F, [[3.3, S, 1.6], [3.7, S, 1.4]]);

    // ---- distribution: cash-and-carry hall, distributor's mini-truck, a small supermarket, a delivery rider
    // Cash-and-carry: barrel-roofed warehouse, front open to pallet racks of cartons.
    const cx0 = 3.1,
      cx1 = 4.4,
      cz0 = 2.45,
      cz1 = 3.2;
    put(shelfG, M(F, 0xe6dccb, 0.05, 0.7), vPlane(cx1 - cx0, 0.28, (cx0 + cx1) / 2, S + 0.14, cz0, Math.PI), vPlane(cz1 - cz0, 0.28, cx1, S + 0.14, (cz0 + cz1) / 2, Math.PI / 2), vPlane(cz1 - cz0, 0.28, cx0, S + 0.14, (cz0 + cz1) / 2, -Math.PI / 2));
    put(shelfG, M(F, 0x3d5a80, 0.4, 0.4, { side: DS }), barrel(cx0 - 0.02, cx1 + 0.02, cz0 - 0.02, cz1 + 0.02, S + 0.28, 0.4));
    put(shelfG, texMat(F, sign("CASH & CARRY", "#3d5a80", "#f2c230", 256, 48, 30), 0.3), vPlane(0.7, 0.11, (cx0 + cx1) / 2, S + 0.33, cz1 + 0.01));
    put(shelfG, M(F, 0xe07a1f, 0.4, 0.4), ...[3.3, 3.75, 4.2].flatMap((x) => [bx(x - 0.01, x + 0.01, S, S + 0.26, 2.55, 2.57), bx(x - 0.01, x + 0.01, S, S + 0.26, 2.75, 2.77)]));
    put(shelfG, M(F, 0x2f6fc0, 0.4, 0.4), ...[0.09, 0.18].map((y) => bx(3.28, 4.22, S + y, S + y + 0.012, 2.55, 2.77)));
    const ctn: Item[] = [];
    for (let lv = 0; lv < 3; lv++) for (let i = 0; i < 12; i++) ctn.push({ p: [3.33 + i * 0.075, S + 0.012 + lv * 0.09, 2.66], s: [1, 0.85 + R() * 0.15, 1], c: R() < 0.5 ? 0xc49a6c : 0xb58a5c });
    inst(shelfG, roundedBox(THREE, 0.065, 0.065, 0.16, 0.006).translate(0, 0.0325, 0), M(F, 0xffffff, 0, 0.8, {}, "ctn"), ctn);
    // Distributor's mini-truck at the kirana side, open bed piled with cartons.
    const van = group(shelfG, 2.6, S, 2.75, Math.PI - 0.2);
    put(van, M(F, 0xf4f1ea, 0.3, 0.45), rb(0.13, 0.13, 0.17, 0.035, 0.15, 0.04, 0));
    put(van, M(F, 0x1b2631, 0.6, 0.15), bx(0.214, 0.218, 0.11, 0.16, -0.065, 0.065));
    put(van, M(F, 0x2f6fc0, 0.3, 0.45), bx(-0.24, 0.08, 0.05, 0.07, -0.09, 0.09), bx(-0.24, 0.08, 0.07, 0.11, 0.085, 0.09), bx(-0.24, 0.08, 0.07, 0.11, -0.09, -0.085), bx(-0.245, -0.24, 0.07, 0.11, -0.09, 0.09));
    put(van, M(F, 0x1c1d20, 0.1, 0.85), ...[-0.16, 0.14].map((x) => hcyl(0.035, 0.19, x, 0.035, 0, "z", 12)));
    const vc: Item[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2 + ((i + j) % 2); k++) vc.push({ p: [-0.2 + i * 0.075, 0.07 + k * 0.055, -0.04 + j * 0.08], s: [1.1, 0.8, 0.45], c: [0xc49a6c, 0xd8352a, 0xf2c230, 0x2f6fc0][(i + k) % 4] });
    inst(van, roundedBox(THREE, 0.065, 0.065, 0.16, 0.006).translate(0, 0.0325, 0), M(F, 0xffffff, 0, 0.8, {}, "vanctn"), vc);
    people(shelfG, F, [[2.9, S, 2.55, 1.2], [2.95, S, 2.9]]);
    // A three-wheeler cargo carrier by the warehouse.
    const auto3 = group(shelfG, 3.85, S, 3.4, Math.PI);
    put(auto3, M(F, 0xf2c230, 0.2, 0.5), rb(0.1, 0.11, 0.11, 0.04, 0.1, 0.03, 0));
    put(auto3, M(F, 0x2a7a4a, 0.2, 0.5), rb(0.1, 0.03, 0.11, 0.01, 0.1, 0.14, 0), bx(-0.12, 0.05, 0.04, 0.12, -0.065, 0.065));
    put(auto3, M(F, 0x1c1d20, 0.1, 0.85), hcyl(0.028, 0.03, 0.17, 0.028, 0, "z", 10), hcyl(0.028, 0.15, -0.07, 0.028, 0, "z", 10));
    // Small supermarket: glass front, red fascia, trolleys outside.
    // (kept tight to the east edge, between home care and the packaging yard)
    const mart = group(shelfG, 4.3, S, -0.05, -Math.PI / 2 + 0.15);
    put(mart, M(F, 0xf4f1ea, 0.05, 0.6), bx(-0.3, 0.3, 0, 0.26, -0.2, -0.17), bx(-0.3, -0.27, 0, 0.26, -0.2, 0.15), bx(0.27, 0.3, 0, 0.26, -0.2, 0.15), bx(-0.31, 0.31, 0.26, 0.28, -0.21, 0.17));
    put(mart, M(F, 0xcfe6f2, 0.1, 0.05, { opacity: 0.4, side: DS, depthWrite: false }), vPlane(0.54, 0.2, 0, 0.1, 0.15));
    put(mart, texMat(F, sign("SUPERMARKET", "#d8352a", "#ffffff", 256, 40, 26), 0.35), vPlane(0.6, 0.06, 0, 0.23, 0.155));
    const aisle: Item[] = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) aisle.push({ p: [-0.2 + i * 0.2, 0.0, -0.12 + k * 0.042], s: [0.8, 1.2, 0.7], c: COLS2[(i + k) % COLS2.length] });
    inst(mart, new THREE.BoxGeometry(0.05, 0.1, 0.05).translate(0, 0.05, 0), texMat(F, packTex, 0.1), aisle);
    put(mart, M(F, 0xc9ced3, 0.8, 0.3), ...[-0.15, -0.08].map((x) => bx(x - 0.025, x + 0.025, 0.03, 0.07, 0.2, 0.26)));
  }

  // ================================================================ STATIC: STREET LIFE, TREES, POLES
  // The delivery rider runs the bazaar street (scooter + rider + insulated box).
  const rider = new THREE.Group();
  baseG.add(rider);
  {
    const B = "street";
    put(rider, M(B, 0x2a2f36, 0.3, 0.45), rb(0.14, 0.04, 0.04, 0.015, 0, 0.03, 0));
    put(rider, M(B, 0x1c1d20, 0.1, 0.85), hcyl(0.025, 0.02, 0.06, 0.025, 0, "z", 10), hcyl(0.025, 0.02, -0.06, 0.025, 0, "z", 10));
    put(rider, M(B, 0x3a9a4a, 0.1, 0.6), rb(0.07, 0.07, 0.07, 0.01, -0.05, 0.08, 0));
    put(rider, M(B, 0x3a9a4a, 0.1, 0.6), new THREE.CapsuleGeometry(0.02, 0.06, 3, 8).translate(0.01, 0.12, 0));
    put(rider, M(B, 0xc89878, 0.05, 0.7), sph(0.019, 0.01, 0.185, 0));
    put(rider, M(B, 0x2a2f36, 0.3, 0.45), bar(THREE, [0.07, 0.04, 0], [0.06, 0.13, 0], 0.006, 6));
    const tr: [number, number, number][] = [
      [-2.6, 3.3, 0.9],
      [-0.4, 0.1, 1.3],
      [-1.6, -0.8, 0.8],
      [0.7, -0.4, 0.8],
      [1.2, 0.5, 0.9],
      [-4.35, -1.7, 0.8],
      [4.5, 3.0, 0.8],
      [-4.5, 2.6, 0.9],
      [-1.9, 1.3, 0.9],
      [-2.3, -1.6, 0.8],
      [4.55, -2.3, 0.7],
    ];
    for (const [x, z, s] of tr) tree(x, z, s, z < -1.95 && x > -4.3 && x < 4.4 ? ST : S);
    inst(baseG, trunkGeo, M(B, 0x5a4632, 0, 0.9), trunkItems);
    inst(baseG, crown, M(B, 0xffffff, 0, 0.85, {}, "crown"), treeItems);
    // Electric poles with sagging wires along the road.
    const poles: [number, number][] = [
      [2.65, -0.35],
      [2.75, 1.35],
      [2.62, 2.35],
      [1.15, 3.05],
    ];
    put(baseG, M(B, 0xbfb7a8, 0, 0.8), ...poles.map(([x, z]) => cyl(0.014, 0.62, x, S, z, 6, 0.009)));
    put(baseG, M(B, 0x59626c, 0.5, 0.5), ...poles.map(([x, z]) => bx(x - 0.07, x + 0.07, S + 0.57, S + 0.585, z - 0.008, z + 0.008)));
    const wireMat = M(B, 0x2a2a2a, 0.2, 0.7);
    for (let i = 0; i < poles.length - 1; i++)
      for (const off of [-0.06, 0.06]) {
        const [ax, az] = poles[i],
          [bx2, bz] = poles[i + 1];
        put(baseG, wireMat, tube(THREE, [[ax + off, S + 0.585, az], [(ax + bx2) / 2 + off, S + 0.5, (az + bz) / 2], [bx2 + off, S + 0.585, bz]], 0.003, 4, false, 16));
      }
    // A goods lorry on the road to the bazaar and a cow resting on the street.
    const gl = lorry(baseG, B, 1.35, S, -0.45, -0.85, 0xe08a2e, 0.6);
    put(gl, M(B, 0x2f6fc0, 0.2, 0.5), rb(0.36, 0.16, 0.18, 0.02, -0.08, 0.07, 0));
    put(gl, texMat(B, sign("GOODS CARRIER", "#2f6fc0", "#f2c230", 256, 48, 26), 0.2), vPlane(0.3, 0.06, -0.08, 0.15, 0.092));
    const cow = group(baseG, -1.25, S, 3.05, 0.4);
    put(cow, M(B, 0xf1ece0, 0, 0.8), rb(0.14, 0.05, 0.065, 0.025, 0, 0.0, 0), rb(0.05, 0.04, 0.035, 0.012, 0.085, 0.02, 0));
    put(cow, M(B, 0x7a5a3a, 0, 0.8), new THREE.ConeGeometry(0.008, 0.035, 6).rotateZ(-0.6).translate(0.1, 0.07, 0.015), new THREE.ConeGeometry(0.008, 0.035, 6).rotateZ(-0.6).translate(0.1, 0.07, -0.015));
    people(baseG, B, [[-0.9, S, 3.6], [0.4, S, 3.6], [-3.0, S, 3.35], [-1.9, S, 2.9]]);
  }

  // ---------------------------------------------------------------- flush
  for (const { parent, bucket, items } of crowd.values()) {
    inst(parent, bodyGeo, M(bucket, 0xffffff, 0.05, 0.75, {}, "body"), items);
    inst(parent, headGeo, M(bucket, 0xc89878, 0.05, 0.7), items.map((i) => ({ p: i.p, ry: i.ry })));
  }
  for (const b of batches.values()) b.parent.add(new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat));

  // ---------------------------------------------------------------- animation
  // The bazaar street the rider follows (west -> east, then back).
  const street = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.6, S + 0.006, 3.06),
    new THREE.Vector3(-2.0, S + 0.006, 3.28),
    new THREE.Vector3(-0.7, S + 0.006, 3.42),
    new THREE.Vector3(1.0, S + 0.006, 3.42),
    new THREE.Vector3(1.9, S + 0.006, 2.9),
    new THREE.Vector3(2.2, S + 0.006, 2.0),
  ]);
  const tmp = new THREE.Vector3();
  const smoke: T.Mesh[] = [];
  const smokeMat = L.add("farm", std(0xd9d6d0, 0, 1, { opacity: 0.55, depthWrite: false }), 0.8);
  for (let i = 0; i < 4; i++) smoke.push(mesh(farmG, sph(0.07, 0, 0, 0, 1, 1, 1, 10), smokeMat));
  bed.onBeforeRender = () => {
    const t = performance.now() / 1000;
    smoke.forEach((m, i) => {
      const k = (((t * 0.12 + i / 4) % 1) + 1) % 1;
      m.position.set(0.42 + k * 0.35, ST + 1.85 + k * 0.5, -3.25 - k * 0.1);
      m.scale.setScalar(0.6 + k * 1.3);
    });
    if (animFarm) animFarm.aerators.forEach((a, i) => (a.rotation.x = t * 3 + i));
    if (animFood) {
      animFood.belt.offset.x = -t * 0.25;
      animFood.filler.rotation.y = t * 0.8;
      animFood.steam.forEach((m, i) => {
        const k = (((t * 0.25 + i / 3) % 1) + 1) % 1;
        m.position.set(3.6 + Math.sin(t + i) * 0.02, S + 0.2 + k * 0.3, -0.25);
        m.scale.setScalar(0.5 + k);
      });
    }
    if (animHpc) animHpc.strips.forEach((s, i) => (s.rotation.x = Math.sin(t * 1.3 + i * 0.7) * 0.08));
    const u = (((t * 0.045) % 2) + 2) % 2;
    const f = u < 1 ? u : 2 - u;
    street.getPointAt(f, rider.position);
    street.getTangentAt(f, tmp);
    if (u >= 1) tmp.negate();
    rider.rotation.y = Math.atan2(-tmp.z, tmp.x);
  };

  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("street", pw(v, [[0, 1], [2, 1], [3, 0.7]]));
      L.set("farm", pw(v, [[0, 1], [1, 0.3], [2, 0.22], [3, 0.18]]));
      L.set("food", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("hpc", pw(v, [[0, 1], [2, 1], [2.7, 0.3], [3, 0.25]]));
      L.set("kirana", pw(v, [[0, 1], [2, 1], [3, 0.32]]));
      L.set("shelf", 1);
    },
  };

  // ---------------------------------------------------------------- local helpers (hoisted)
  function railing_(x0: number, x1: number, z: number, y: number) {
    const g: T.BufferGeometry[] = [hcyl(0.005, x1 - x0, (x0 + x1) / 2, y + 0.08, z, "x", 6)];
    for (let x = x0; x <= x1 + 1e-6; x += 0.11) g.push(cyl(0.004, 0.08, x, y, z, 4));
    return mergeInto(THREE, g);
  }
  function pw(v: number, keys: [number, number][]) {
    if (v <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, va] = keys[i],
        [b, vb] = keys[i + 1];
      if (v <= b) return lerp(va, vb, clamp01((v - a) / (b - a)));
    }
    return keys[keys.length - 1][1];
  }
}

const COLS2 = [0xd8352a, 0xf2c230, 0x2f6fc0, 0x3a9a4a, 0xe07a1f, 0x7b3fa0, 0xd04f7a];
