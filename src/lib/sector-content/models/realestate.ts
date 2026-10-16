// Real estate — a miniature mixed-use urban development diorama on a
// sectioned soil plinth (Indian city context).
//
// Plan (x east, z toward the default camera; ground top at local y = 0, the
// whole scene is lifted by G0 so the plinth base sits on the studio floor):
//   back-left   premium residential tower on a landscaped podium
//   back-centre residential tower under construction: RCC frame, core with
//               jump-form, deck formwork, rebar, safety screens, tower crane,
//               cement silo + batching, transit mixer, steel stockyard,
//               site hoarding; a glazed sales gallery on the avenue
//   back-right  Grade-A office tower + low wing (IT park / REIT asset)
//               with a landscaped plaza; a fenced vacant land parcel
//   front-left  Grade-A warehouse with dock doors and trailers
//   front-mid   a bank branch (portico) and its parking
//   front-right shopping mall with glass atrium drum and forecourt
//   an avenue with an elevated metro along the median, a cross street.
//
// Layers (contract with products.ts):
//   0 Skyline           finished facades, glazing, landscaping, roads
//   1 Construction      facades peel back to slabs/columns; the construction
//                       site, frame, crane, cement and steel come forward
//   2 Building Systems  plumbing risers + roof tanks, cable risers + trays,
//                       roof chillers/AHUs + ducts, lift cars, interior
//                       finishes (tiled floors, painted partitions, sanitaryware)
//   3 Land & Capital    the ground turns translucent: piles, rafts, basements,
//                       utility trench, survey grid + plot boundaries, pegs,
//                       the bank and its vault
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
  roundedBox,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// Soil depth below the street, and the lift that puts the plinth base on the floor.
const SOIL = 0.6;
const BASE_T = 0.07;
const G0 = SOIL + BASE_T;
const FH = 0.24; // floor-to-floor

const A = (x: number, y: number, z: number): Vec3 => [x, +(y + G0).toFixed(3), z];

// zone id -> 3D marker position + which rail its callout sits on.
export const REALESTATE_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0 — finished skyline
  residential: { pos: A(-2.86, 3.05, -1.58), side: "left" },
  office: { pos: A(2.98, 2.7, -1.72), side: "right" },
  retail: { pos: A(2.95, 0.92, 3.1), side: "right" },
  warehousing: { pos: A(-3.45, 0.5, 3.0), side: "bottom" },
  sales: { pos: A(-1.5, 0.26, 0.28), side: "bottom" },
  // layer 1 — construction
  epc: { pos: A(-0.38, 4.25, -2.95), side: "top" },
  cement: { pos: A(0.3, 1.02, -1.35), side: "top" },
  steel: { pos: A(-0.95, 2.42, -1.6), side: "left" },
  // layer 2 — building systems
  plumbing: { pos: A(-2.94, 1.55, -1.66), side: "left" },
  electricals: { pos: A(2.7, 2.9, -1.95), side: "top" },
  hvac_lifts: { pos: A(2.35, 3.9, -2.25), side: "top" },
  finishes: { pos: A(-3.45, 0.84, -1.62), side: "left" },
  // layer 3 — land & capital
  land: { pos: A(4.05, 0.17, -0.6), side: "right" },
  finance: { pos: A(0.5, 0.36, 2.94), side: "bottom" },
};

// `layer` (optional): a view about one layer also peels the model to it (engine.ts flyTo),
// so e.g. the underground shot shows the foundations instead of the skyline from below.
export const REALESTATE_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [6.0, 7.0, 11.9],
    target: [0, 1.45, 0],
    narration:
      "One city block, end to end: finished homes, offices, a mall and a warehouse, a tower still going up, and the land and capital underneath it all.",
  },
  {
    id: "street",
    label: "Street",
    pos: [5.6, 1.15, 1.9],
    target: [-1.2, 1.9, -0.6],
    narration:
      "From the avenue: the metro line, the sales gallery where homes are sold off-plan, and the towers that set a micro-market's price per square foot.",
  },
  {
    id: "construction",
    layer: 1,
    label: "Construction site",
    pos: [3.3, 4.3, 2.4],
    target: [-0.9, 1.75, -1.9],
    narration:
      "The construction site: a concrete core climbs ahead of the slabs, rebar and formwork go in floor by floor, and the tower crane, silo and mixer trucks keep the cycle moving.",
  },
  {
    id: "systems",
    layer: 2,
    label: "Rooftop & systems",
    pos: [6.6, 7.2, 4.8],
    target: [-0.5, 2.4, -2.1],
    narration:
      "Inside and on top of the towers: chillers, ducts, lifts, pipes and cables - roughly a quarter to a third of what a building costs to finish.",
  },
  {
    id: "logistics",
    label: "Warehouse",
    pos: [-0.6, 2.0, 6.6],
    target: [-3.2, 0.9, 2.4],
    narration:
      "Grade-A warehousing: tall, wide-span sheds with dock levellers, leased to e-commerce, 3PL and manufacturing tenants on long contracts.",
  },
  {
    id: "foundations",
    layer: 3,
    label: "Underground",
    pos: [7.0, 3.4, 7.6],
    target: [0.2, 0.3, -0.2],
    narration:
      "Below the street: piles, rafts, basements and utility trenches, on land that had to be bought, titled and approved before anything could be built.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 13, 0.05],
    target: [0, G0, 0],
    narration: "From above, the block divides into plots - each one a separate land deal, approval and financing story.",
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

export function buildRealestate(ctx: Ctx) {
  const THREE = ctx.THREE;
  const L = layerMats();
  const R = rng(20261016);
  const DS = THREE.DoubleSide;

  // Each layer group gets a lifted inner group so local y = 0 is the street.
  const lift = (g: T.Group) => {
    const inner = new THREE.Group();
    inner.position.y = G0;
    g.add(inner);
    return inner;
  };
  const [g0, g1, g2, g3] = ctx.layerGroups.map(lift);
  const gS = lift(ctx.staticGroup);

  const std = (color: number, metalness = 0.1, roughness = 0.7, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, p?: Vec3, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  const merged = (parent: T.Object3D, geos: T.BufferGeometry[], mat: T.Material) =>
    geos.length ? mesh(parent, mergeInto(THREE, geos), mat) : null;
  /** Box from bounds. */
  const bb = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const t = canvasTexture(THREE, w, h, draw);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  // ---------------------------------------------------------------- plan geometry helpers
  /** Vertical walls around a plan polygon (x,z), UVs in world units / tile. */
  function walls(pts: Vec2[], y0: number, y1: number, tu = 1, tv = 1, vBase = y0, closed = true) {
    let P = pts;
    let area = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i],
        b = P[(i + 1) % P.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (closed && area < 0) P = [...P].reverse();
    const pos: number[] = [],
      nor: number[] = [],
      uv: number[] = [];
    let acc = 0;
    const n = closed ? P.length : P.length - 1;
    for (let i = 0; i < n; i++) {
      const a = P[i],
        b = P[(i + 1) % P.length];
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (len < 1e-6) continue;
      const nx = dz / len,
        nz = -dx / len;
      const u0 = acc / tu,
        u1 = (acc + len) / tu;
      acc += len;
      const v0 = (y0 - vBase) / tv,
        v1 = (y1 - vBase) / tv;
      pos.push(a[0], y0, a[1], a[0], y1, a[1], b[0], y0, b[1], b[0], y0, b[1], a[0], y1, a[1], b[0], y1, b[1]);
      uv.push(u0, v0, u0, v1, u1, v0, u1, v0, u0, v1, u1, v1);
      for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }
  /** Flat cap over a plan polygon at height y (facing up, or down). */
  function cap(pts: Vec2[], y: number, down = false, tile = 1) {
    const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], down ? p[1] : -p[1])));
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    g.translate(0, y, 0);
    if (tile !== 1) {
      const uv = g.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
    }
    return g;
  }
  const slab = (pts: Vec2[], y: number, t: number) =>
    mergeInto(THREE, [walls(pts, y - t, y), cap(pts, y), cap(pts, y - t, true)]);
  function roundRect(cx: number, cz: number, w: number, d: number, r: number, seg = 4): Vec2[] {
    const out: Vec2[] = [];
    const cs: [number, number, number][] = [
      [cx + w / 2 - r, cz + d / 2 - r, 0],
      [cx - w / 2 + r, cz + d / 2 - r, Math.PI / 2],
      [cx - w / 2 + r, cz - d / 2 + r, Math.PI],
      [cx + w / 2 - r, cz - d / 2 + r, (3 * Math.PI) / 2],
    ];
    for (const [x, z, a0] of cs)
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        out.push([x + r * Math.cos(a), z + r * Math.sin(a)]);
      }
    return out;
  }
  function chamferRect(cx: number, cz: number, w: number, d: number, c: number): Vec2[] {
    const x0 = cx - w / 2,
      x1 = cx + w / 2,
      z0 = cz - d / 2,
      z1 = cz + d / 2;
    return [
      [x0 + c, z0],
      [x1 - c, z0],
      [x1, z0 + c],
      [x1, z1 - c],
      [x1 - c, z1],
      [x0 + c, z1],
      [x0, z1 - c],
      [x0, z0 + c],
    ];
  }
  const rectPts = (x0: number, x1: number, z0: number, z1: number): Vec2[] => [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const inset = (pts: Vec2[], k: number, cx: number, cz: number): Vec2[] =>
    pts.map(([x, z]) => {
      const dx = x - cx,
        dz = z - cz;
      const l = Math.hypot(dx, dz) || 1;
      return [x - (dx / l) * k, z - (dz / l) * k] as Vec2;
    });
  type Inst = [number, number, number, number?, number?, number?]; // x,y,z, ry, scale, color
  function inst(parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, list: Inst[], sy?: (i: number) => number) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      col = new THREE.Color();
    list.forEach(([x, y, z, ry = 0, s = 1, c], i) => {
      q.setFromAxisAngle(up, ry);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (sy ? sy(i) : 1), s));
      im.setMatrixAt(i, m);
      if (c !== undefined) im.setColorAt(i, col.setHex(c));
    });
    im.count = list.length;
    parent.add(im);
    return im;
  }

  // ================================================================ textures
  const resTex = tex(512, 512, (g, w, h) => {
    g.fillStyle = "#ebe6dc";
    g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const x = c * 128,
          y = r * 128;
        g.fillStyle = "#d8d1c4";
        g.fillRect(x, y + 112, 128, 16);
        const lit = R() < 0.1;
        const grd = g.createLinearGradient(x, y + 20, x + 60, y + 110);
        grd.addColorStop(0, lit ? "#ecd29c" : "#8aa2b5");
        grd.addColorStop(1, lit ? "#b98c50" : "#31455a");
        g.fillStyle = grd;
        g.fillRect(x + 12, y + 20, 104, 90);
        if (R() < 0.4) {
          g.fillStyle = R() < 0.5 ? "rgba(238,230,212,0.85)" : "rgba(214,204,188,0.8)";
          g.fillRect(x + 12, y + 20, 26 + R() * 34, 90);
        }
        g.strokeStyle = "#c3cbd1";
        g.lineWidth = 5;
        g.strokeRect(x + 12, y + 20, 104, 90);
        g.fillStyle = "#c3cbd1";
        g.fillRect(x + 62, y + 20, 4, 90);
        g.fillRect(x + 12, y + 50, 104, 3);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x + 14, y + 22, 46, 26);
      }
  });
  const officeTex = tex(512, 512, (g, w, h) => {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 8; c++) {
        const x = c * 64,
          y = r * 128;
        const k = 0.85 + R() * 0.3;
        const grd = g.createLinearGradient(x, y, x + 64, y + 108);
        const c0 = new THREE.Color(0x6a9bb7).multiplyScalar(k),
          c1 = new THREE.Color(0x2a4c66).multiplyScalar(k);
        grd.addColorStop(0, "#" + c0.getHexString());
        grd.addColorStop(1, "#" + c1.getHexString());
        g.fillStyle = grd;
        g.fillRect(x, y, 64, 108);
        g.fillStyle = "#1e2e3b";
        g.fillRect(x, y + 108, 64, 20);
      }
    const sky = g.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, "rgba(255,255,255,0.2)");
    sky.addColorStop(0.5, "rgba(255,255,255,0.02)");
    sky.addColorStop(1, "rgba(255,255,255,0.12)");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#c9d2d9";
    for (let c = 0; c < 8; c++) g.fillRect(c * 64, 0, 4, h);
    for (let r = 0; r < 4; r++) g.fillRect(0, r * 128 + 106, w, 3);
  });
  const glassTex = tex(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#9fbccc");
    grd.addColorStop(1, "#4d6e84");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d4dbe0";
    for (let c = 0; c < 4; c++) g.fillRect(c * 64, 0, 3, h);
    g.fillRect(0, 0, w, 4);
  });
  const mallTex = tex(512, 256, (g, w, h) => {
    g.fillStyle = "#ddd7cd";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(120,110,100,0.35)";
    g.lineWidth = 2;
    for (let x = 0; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 180);
      g.stroke();
    }
    for (let y = 0; y < 180; y += 45) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = "#b8653d";
    g.fillRect(0, 22, w, 16);
    // vertical fins
    g.fillStyle = "rgba(255,255,255,0.45)";
    for (let x = 30; x < w; x += 128) g.fillRect(x, 40, 6, 140);
    // storefront band
    g.fillStyle = "#2c4652";
    g.fillRect(0, 184, w, 72);
    for (let x = 0; x < w; x += 64) {
      if (R() < 0.6) {
        g.fillStyle = R() < 0.5 ? "rgba(232,196,128,0.55)" : "rgba(210,226,236,0.4)";
        g.fillRect(x + 6, 200, 52, 56);
      }
      g.fillStyle = "#c8cfd4";
      g.fillRect(x, 184, 4, 72);
    }
    g.fillStyle = "#3a3f44";
    g.fillRect(0, 180, w, 8);
  });
  const whTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#c9cfd4";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = "rgba(70,80,90,0.22)";
      g.fillRect(x, 0, 3, h);
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(x + 5, 0, 2, h);
    }
    g.fillStyle = "#2f5d8a";
    g.fillRect(0, 18, w, 18);
    g.fillStyle = "#6c7680";
    g.fillRect(0, h - 26, w, 26);
  });
  const roofTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#a9b0b6";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(60,70,80,0.25)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(x + 3, 0, 1, h);
    }
  });
  const brickTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#cdbfae";
    g.fillRect(0, 0, w, h);
    const cols = ["#a65a3f", "#9b5039", "#b0654a", "#94503a"];
    for (let r = 0; r < 16; r++)
      for (let c = -1; c < 9; c++) {
        g.fillStyle = cols[(r * 7 + c * 3) % 4];
        g.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14);
      }
    g.fillStyle = "#2a2522";
    g.fillRect(84, 64, 88, 100);
    g.fillStyle = "#a8a49b";
    g.fillRect(0, h - 18, w, 18);
  });
  const concTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#bdb9b0";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(${R() > 0.5 ? "255,255,255" : "50,45,40"},${R() * 0.07})`;
      g.fillRect(R() * w, R() * h, 2, 2);
    }
    g.strokeStyle = "rgba(80,75,70,0.18)";
    for (let x = 0; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });
  const screenTex = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#e5702b";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) g.fillRect(x, y, 2, 2);
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 50, w, 22);
    g.fillStyle = "#6b3517";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
  });
  const hoardTex = tex(512, 64, (g, w, h) => {
    g.fillStyle = "#f2f1ec";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f6b4f";
    g.fillRect(0, h - 18, w, 18);
    g.fillStyle = "#c99a2e";
    g.fillRect(0, h - 22, w, 4);
    g.fillStyle = "#24364a";
    g.fillRect(0, 0, w, 8);
    g.fillStyle = "rgba(0,0,0,0.15)";
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
  });
  const louvreTex = tex(64, 64, (g, w, h) => {
    g.fillStyle = "#3b4752";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = "#b9c2ca";
      g.fillRect(0, y, w, 4);
    }
  });
  const tileTex = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#d8bf98";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = `rgba(150,130,110,${0.08 + R() * 0.1})`;
      g.beginPath();
      g.moveTo(R() * w, R() * h);
      g.bezierCurveTo(R() * w, R() * h, R() * w, R() * h, R() * w, R() * h);
      g.stroke();
    }
    g.strokeStyle = "#bfb39f";
    g.lineWidth = 2;
    for (let k = 0; k <= 4; k++) {
      g.beginPath();
      g.moveTo(k * 64, 0);
      g.lineTo(k * 64, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, k * 64);
      g.lineTo(w, k * 64);
      g.stroke();
    }
  });
  const strataTex = tex(64, 256, (g, w, h) => {
    const bands: [number, string][] = [
      [0, "#4a3b2c"],
      [0.07, "#7b6447"],
      [0.28, "#94805e"],
      [0.5, "#7a7062"],
      [0.72, "#5f5b55"],
      [0.88, "#4d4a46"],
    ];
    for (let i = 0; i < bands.length; i++) {
      const y0 = bands[i][0] * h,
        y1 = (i + 1 < bands.length ? bands[i + 1][0] : 1) * h;
      g.fillStyle = bands[i][1];
      g.fillRect(0, y0, w, y1 - y0);
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${R() > 0.5 ? "255,255,255" : "0,0,0"},${0.05 + R() * 0.08})`;
      g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2);
    }
  });
  strataTex.wrapT = THREE.ClampToEdgeWrapping;

  // ---- site plan painted on the ground (x -5..5, z -4..4; image row 0 = z -4)
  const GX = 10,
    GZ = 8,
    PPU = 200;
  const groundTex = canvasTexture(THREE, GX * PPU, GZ * PPU, (g) => {
    const P = (x: number, z: number): [number, number] => [(x + GX / 2) * PPU, (z + GZ / 2) * PPU];
    const rect = (x0: number, z0: number, x1: number, z1: number, c: string) => {
      const [a, b] = P(x0, z0);
      g.fillStyle = c;
      g.fillRect(a, b, (x1 - x0) * PPU, (z1 - z0) * PPU);
    };
    const noise = (x0: number, z0: number, x1: number, z1: number, cols: string[], n: number, sz: number) => {
      for (let i = 0; i < n; i++) {
        const [a, b] = P(lerp(x0, x1, R()), lerp(z0, z1, R()));
        g.fillStyle = cols[i % cols.length];
        g.fillRect(a, b, sz * (0.5 + R()), sz * (0.5 + R()));
      }
    };
    const paving = (x0: number, z0: number, x1: number, z1: number, c: string, joint = 0.1) => {
      rect(x0, z0, x1, z1, c);
      g.strokeStyle = "rgba(0,0,0,0.07)";
      g.lineWidth = 1;
      for (let x = x0; x <= x1; x += joint) {
        const [a, b] = P(x, z0);
        g.beginPath();
        g.moveTo(a, b);
        g.lineTo(a, b + (z1 - z0) * PPU);
        g.stroke();
      }
      for (let z = z0; z <= z1; z += joint) {
        const [a, b] = P(x0, z);
        g.beginPath();
        g.moveTo(a, b);
        g.lineTo(a + (x1 - x0) * PPU, b);
        g.stroke();
      }
    };
    const dashes = (x0: number, z0: number, x1: number, z1: number, len: number, gap: number, wpx: number, c: string) => {
      g.strokeStyle = c;
      g.lineWidth = wpx;
      g.setLineDash([len * PPU, gap * PPU]);
      const [a, b] = P(x0, z0),
        [cc, d] = P(x1, z1);
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(cc, d);
      g.stroke();
      g.setLineDash([]);
    };
    // lawn base
    rect(-5, -4, 5, 4, "#62784a");
    noise(-5, -4, 5, 4, ["#5c7145", "#68804f", "#57693f"], 40000, 4);
    // perimeter paving frame
    paving(-5, -4, 5, -3.88, "#c9c2b6");
    paving(-5, 3.88, 5, 4, "#c9c2b6");
    paving(-5, -4, -4.88, 4, "#c9c2b6");
    paving(4.88, -4, 5, 4, "#c9c2b6");
    // sidewalks + avenue (z 0.7..1.2) + cross street (x 0.85..1.25)
    paving(-5, 0.56, 5, 0.7, "#bdb6aa", 0.07);
    paving(-5, 1.2, 5, 1.34, "#bdb6aa", 0.07);
    paving(0.71, -4, 0.85, 0.7, "#bdb6aa", 0.07);
    paving(1.25, -4, 1.39, 0.7, "#bdb6aa", 0.07);
    rect(-5, 0.7, 5, 1.2, "#3b3f45");
    rect(0.85, -4, 1.25, 0.7, "#3b3f45");
    noise(-5, 0.7, 5, 1.2, ["#34383d", "#43474d"], 5000, 3);
    noise(0.85, -4, 1.25, 0.7, ["#34383d", "#43474d"], 1600, 3);
    dashes(-5, 0.83, 5, 0.83, 0.08, 0.08, 2, "rgba(240,240,235,0.7)");
    dashes(-5, 1.07, 5, 1.07, 0.08, 0.08, 2, "rgba(240,240,235,0.7)");
    dashes(-5, 0.725, 5, 0.725, 1, 0, 2, "rgba(240,240,235,0.55)");
    dashes(-5, 1.175, 5, 1.175, 1, 0, 2, "rgba(240,240,235,0.55)");
    dashes(1.05, -4, 1.05, 0.7, 0.08, 0.08, 2, "rgba(240,200,80,0.7)");
    // zebra crossings
    g.fillStyle = "rgba(245,245,240,0.85)";
    for (const xc of [0.55, 1.55, -2.2])
      for (let z = 0.73; z < 1.18; z += 0.05) {
        const [a, b] = P(xc - 0.1, z);
        g.fillRect(a, b, 0.2 * PPU, 0.025 * PPU);
      }
    for (let x = 0.88; x < 1.23; x += 0.05) {
      const [a, b] = P(x, 0.45);
      g.fillRect(a, b, 0.025 * PPU, 0.2 * PPU);
    }
    // residential plot: driveway + paved drop-off + garden paths
    paving(-4.45, -3.05, -2.35, -1.0, "#cbc4b8");
    rect(-3.7, -1.0, -3.3, 0.56, "#8d8a84");
    paving(-4.7, -0.55, -2.45, -0.4, "#d2cbbf");
    g.fillStyle = "#3f6f8a";
    {
      const [a, b] = P(-2.85, -0.25);
      g.beginPath();
      g.ellipse(a, b, 0.22 * PPU, 0.12 * PPU, 0, 0, Math.PI * 2);
      g.fill();
    }
    // construction plot: dirt and gravel
    rect(-2.1, -3.6, 0.6, -0.35, "#8a7457");
    noise(-2.1, -3.6, 0.6, -0.35, ["#7d684d", "#97815f", "#6f5c45", "#a08a68"], 9000, 4);
    rect(-0.15, -1.1, 0.6, -0.35, "#8f8c86");
    noise(-0.15, -1.1, 0.6, -0.35, ["#83817b", "#9b9993"], 800, 3);
    rect(-0.1, -3.55, 0.6, -2.6, "#8f8c86");
    // tyre tracks
    g.strokeStyle = "rgba(60,48,36,0.35)";
    g.lineWidth = 3;
    for (const o of [0, 0.06]) {
      const [a, b] = P(0.2 + o, -0.35);
      const [c2, d2] = P(-0.3 + o, -1.0);
      g.beginPath();
      g.moveTo(a, b);
      g.quadraticCurveTo(a, d2, c2, d2);
      g.stroke();
    }
    // sales gallery forecourt
    paving(-2.1, -0.32, -0.9, 0.56, "#d6cfc2", 0.08);
    // office plaza + wing
    paving(1.39, -3.75, 4.85, -1.85, "#cfc9bd", 0.12);
    paving(1.39, -1.85, 3.15, 0.56, "#d3cdc1", 0.12);
    rect(1.75, -1.3, 2.95, -0.75, "#6a7f50");
    noise(1.75, -1.3, 2.95, -0.75, ["#627748", "#71875a"], 1200, 3);
    g.fillStyle = "#3f7590";
    {
      const [a, b] = P(1.95, -0.3);
      g.fillRect(a, b, 0.8 * PPU, 0.22 * PPU);
    }
    // vacant land parcel: scraped soil
    rect(3.3, -1.7, 4.8, 0.45, "#93805f");
    noise(3.3, -1.7, 4.8, 0.45, ["#887656", "#9f8c69", "#6f7a48", "#7c6a4f"], 5000, 4);
    // warehouse plot: concrete yard + apron
    paving(-4.85, 1.34, -1.75, 3.88, "#a3a19b", 0.2);
    // bank plot: parking + plaza
    rect(-1.6, 1.4, -0.6, 3.0, "#45494f");
    g.strokeStyle = "rgba(240,240,235,0.75)";
    g.lineWidth = 2;
    for (let z = 1.5; z <= 2.95; z += 0.16) {
      for (const [x0, x1] of [
        [-1.58, -1.32],
        [-0.88, -0.62],
      ]) {
        const [a, b] = P(x0, z),
          [c2] = P(x1, z);
        g.beginPath();
        g.moveTo(a, b);
        g.lineTo(c2, b);
        g.stroke();
      }
    }
    paving(-0.55, 1.4, 1.1, 3.88, "#d4cdc0", 0.08);
    // mall: service lane + forecourt with a radial pattern
    rect(1.2, 1.36, 4.8, 1.52, "#4a4e54");
    paving(1.2, 3.0, 4.85, 3.88, "#d8d0c2", 0.1);
    {
      const [a, b] = P(2.95, 3.05);
      for (let r = 6; r >= 1; r--) {
        g.fillStyle = r % 2 ? "rgba(170,150,120,0.25)" : "rgba(255,255,255,0.18)";
        g.beginPath();
        g.arc(a, b, r * 0.12 * PPU, 0, Math.PI);
        g.fill();
      }
    }
    rect(1.35, 1.55, 4.55, 3.02, "#a19e98");
    rect(1.25, 3.55, 4.75, 3.75, "#4f5359");
    dashes(1.25, 3.65, 4.75, 3.65, 0.06, 0.06, 2, "rgba(240,240,235,0.6)");
  });
  groundTex.anisotropy = 8;

  // ---- land layer overlay: survey grid + plot boundaries + plot ids
  const plots: { id: string; r: [number, number, number, number] }[] = [
    { id: "PLOT 01", r: [-4.8, -2.3, -3.75, 0.45] },
    { id: "PLOT 02", r: [-2.15, 0.62, -3.75, 0.45] },
    { id: "PLOT 03", r: [1.45, 3.15, -3.75, 0.45] },
    { id: "PLOT 04", r: [3.3, 4.8, -3.75, -1.85] },
    { id: "PLOT 05", r: [3.3, 4.8, -1.7, 0.45] },
    { id: "PLOT 06", r: [-4.8, -1.75, 1.45, 3.85] },
    { id: "PLOT 07", r: [-1.6, 1.05, 1.45, 3.85] },
    { id: "PLOT 08", r: [1.2, 4.8, 1.45, 3.85] },
  ];
  const landTex = canvasTexture(THREE, 1500, 1200, (g, w, h) => {
    const s = w / GX;
    const P = (x: number, z: number): [number, number] => [(x + GX / 2) * s, (z + GZ / 2) * s];
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.32)";
    g.lineWidth = 1.2;
    for (let x = -5; x <= 5.001; x += 0.5) {
      const [a] = P(x, 0);
      g.beginPath();
      g.moveTo(a, 0);
      g.lineTo(a, h);
      g.stroke();
    }
    for (let z = -4; z <= 4.001; z += 0.5) {
      const [, b] = P(0, z);
      g.beginPath();
      g.moveTo(0, b);
      g.lineTo(w, b);
      g.stroke();
    }
    for (const p of plots) {
      const [x0, x1, z0, z1] = p.r;
      const [a, b] = P(x0, z0),
        [c, d] = P(x1, z1);
      g.fillStyle = p.id === "PLOT 05" ? "rgba(240,165,64,0.28)" : "rgba(240,165,64,0.1)";
      g.fillRect(a, b, c - a, d - b);
      g.strokeStyle = "#f0a540";
      g.lineWidth = 5;
      g.setLineDash([18, 10]);
      g.strokeRect(a, b, c - a, d - b);
      g.setLineDash([]);
      g.fillStyle = "rgba(255,240,210,0.95)";
      g.font = "bold 26px sans-serif";
      g.fillText(p.id, a + 10, d - 12);
    }
  });

  // ================================================================ materials
  // ground / plinth
  const groundMat = L.add("ground", std(0xffffff, 0, 0.92, { map: groundTex }));
  const kerbMat = L.add("ground", std(0xd8d2c6, 0, 0.85));
  const soilMat = L.add("soil", std(0xffffff, 0, 0.95, { map: strataTex }));
  const baseMat = std(0x1d232b, 0.55, 0.42);
  const baseTrim = std(0x8c7a5b, 0.7, 0.35);
  // shells (layer 0)
  const resFacade = L.add("shell", std(0xffffff, 0.05, 0.55, { map: resTex }));
  resTex.repeat.set(1, 1);
  const resWhite = L.add("shell", std(0xf2eee7, 0.05, 0.6, { side: DS }));
  const balGlass = L.add("shell", std(0x9cc3d6, 0.1, 0.1, { opacity: 0.45, envMapIntensity: 1.2 }));
  const offGlass = L.add("shell", std(0xffffff, 0.35, 0.18, { map: officeTex, envMapIntensity: 1.4 }));
  const lobbyGlass = L.add("shell", std(0xffffff, 0.2, 0.12, { map: glassTex, opacity: 0.75, envMapIntensity: 1.2 }));
  const finMat = L.add("shell", std(0xd7dde2, 0.7, 0.32));
  const louvreMat = L.add("shell", std(0xffffff, 0.5, 0.45, { map: louvreTex, side: DS }));
  const mallMat = L.add("shell", std(0xffffff, 0.08, 0.6, { map: mallTex }));
  const mallRoofMat = L.add("shell", std(0xb9bbb8, 0.1, 0.8));
  const drumGlass = L.add("shell", std(0xffffff, 0.3, 0.12, { map: glassTex, opacity: 0.82, side: DS, envMapIntensity: 1.3 }));
  const whMat = L.add("shell", std(0xffffff, 0.3, 0.55, { map: whTex }));
  const whRoof = L.add("shell", std(0xffffff, 0.45, 0.45, { map: roofTex, side: DS }));
  const darkTrim = L.add("shell", std(0x2c3238, 0.5, 0.5));
  const skyLight = L.add("shell", std(0xe9f2f6, 0.1, 0.2, { opacity: 0.7 }));
  const signMats = [0xb5179e, 0xd96c2b, 0x2e86ab].map((c) => L.add("shell", std(c, 0.1, 0.4, { emissive: c, emissiveIntensity: 0.25 })));
  const podMat = L.add("shell", std(0xcbbfae, 0.05, 0.7));
  // structure of finished buildings (revealed at layer 1)
  const slabMat = L.add("struct", std(0xd4d0c8, 0, 0.85, { map: concTex }));
  const colMat = L.add("struct", std(0xc9c5bc, 0, 0.8));
  const deckGreen = L.add("ctx", std(0x6f8a4f, 0, 0.9));
  const poolMat = L.add("ctx", std(0x4aa3c4, 0.1, 0.15, { envMapIntensity: 1.2 }));
  const coreMat = L.add("core", std(0xb2aea5, 0, 0.85, { map: concTex }));
  const rackUp = L.add("struct", std(0x2f5d8a, 0.5, 0.5));
  const rackBeam = L.add("struct", std(0xe0782a, 0.4, 0.5));
  const palletMat = L.add("struct", std(0xc9a77a, 0, 0.85));
  const portalMat = L.add("struct", std(0x6f7a85, 0.6, 0.45));
  // construction site (layer 1, visible on the skyline too)
  const cConc = L.add("site", std(0xffffff, 0, 0.88, { map: concTex }));
  const cCol = L.add("site", std(0xb9b5ac, 0, 0.85));
  const brickMat = L.add("site", std(0xffffff, 0, 0.9, { map: brickTex }));
  const formMat = L.add("site", std(0xb8773a, 0, 0.75));
  const jumpMat = L.add("site", std(0xf2b417, 0.3, 0.5));
  const rebarMat = L.add("site", std(0x5b6f9e, 0.6, 0.45));
  const propMat = L.add("site", std(0x9aa2a8, 0.6, 0.4));
  const screenMat = L.add("site", std(0xffffff, 0.1, 0.7, { map: screenTex, side: DS, opacity: 0.92 }));
  const craneMat = L.add("site", std(0xf2b417, 0.35, 0.45));
  const craneDark = L.add("site", std(0x2f3438, 0.5, 0.5));
  const cweightMat = L.add("site", std(0x8e8b84, 0, 0.9));
  const cabGlass = L.add("site", std(0x7fa6bd, 0.3, 0.15));
  const siloMat = L.add("site", std(0xd9dcdf, 0.45, 0.4));
  const siloBand = L.add("site", std(0xd96c2b, 0.2, 0.5));
  const hoardMat = L.add("site", std(0xffffff, 0.05, 0.7, { map: hoardTex, side: DS }));
  const cabinMat = L.add("site", std(0xe8ebee, 0.2, 0.6));
  const cabinBlue = L.add("site", std(0x2d5f8f, 0.3, 0.55));
  const steelStock = L.add("site", std(0x56657d, 0.65, 0.45));
  const timberMat = L.add("site", std(0x7a5a3a, 0, 0.9));
  const mixerDrum = L.add("site", std(0xe9e6df, 0.3, 0.45));
  const truckCab = L.add("site", std(0xd96c2b, 0.3, 0.45));
  // context (trees, cars, metro, street furniture, small pavilions)
  const canopyMat = L.add("ctx", std(0xffffff, 0, 0.85));
  const trunkMat = L.add("ctx", std(0x5d4634, 0, 0.9));
  const palmMat = L.add("ctx", std(0xffffff, 0, 0.8, { side: DS }));
  const carMat = L.add("ctx", std(0xffffff, 0.45, 0.35));
  const carGlass = L.add("ctx", std(0x1d2730, 0.4, 0.2));
  const darkMat = L.add("ctx", std(0x25292e, 0.3, 0.6));
  const trailerMat = L.add("ctx", std(0xf1f1ee, 0.2, 0.5));
  const poleMat = L.add("ctx", std(0x5d656d, 0.6, 0.45));
  const lampMat = L.add("ctx", std(0xfff4d6, 0, 0.4, { emissive: 0xffe3a3, emissiveIntensity: 0.6 }));
  const metroConc = L.add("ctx", std(0xcfccc5, 0, 0.8));
  const metroBody = L.add("ctx", std(0xeef0f2, 0.4, 0.3));
  const metroBand = L.add("ctx", std(0x7a3fa0, 0.3, 0.35));
  const fenceMat = L.add("ctx", std(0x7c8590, 0.6, 0.45));
  const salesGlass = L.add("ctx", std(0xffffff, 0.2, 0.12, { map: glassTex, opacity: 0.8, envMapIntensity: 1.3 }));
  const salesRoof = L.add("ctx", std(0xf4f2ee, 0.05, 0.55));
  const salesWood = L.add("ctx", std(0x9a6a40, 0, 0.7));
  const salesGold = L.add("ctx", std(0xc99a2e, 0.6, 0.35, { emissive: 0xc99a2e, emissiveIntensity: 0.15 }));
  const waterMat = L.add("ctx", std(0x6fb6d0, 0.1, 0.1, { opacity: 0.85, envMapIntensity: 1.3 }));
  // building systems (layer 2)
  const pipeBlue = L.add("sys", std(0x2e86ab, 0.3, 0.4, { emissive: 0x1e9e76, emissiveIntensity: 0 }));
  const pipeGrey = L.add("sys", std(0x8d969e, 0.3, 0.5));
  const pipeRed = L.add("sys", std(0xc6403d, 0.3, 0.45));
  const tankMat = L.add("sys", std(0x1f2427, 0.1, 0.6));
  const cableMat = L.add("sys", std(0xc6403d, 0.2, 0.5, { emissive: 0xc6403d, emissiveIntensity: 0 }));
  const trayMat = L.add("sys", std(0xa9b1b8, 0.75, 0.35));
  const busMat = L.add("sys", std(0x5c6670, 0.6, 0.4));
  const ductMat = L.add("sys", std(0xcfd6dc, 0.85, 0.3));
  const liftMat = L.add("sys", std(0x7a5cc7, 0.5, 0.35, { emissive: 0x7a5cc7, emissiveIntensity: 0 }));
  const railMat = L.add("sys", std(0x6c737b, 0.7, 0.4));
  const floorTile = L.add("sys", std(0xffffff, 0, 0.35, { map: tileTex }));
  tileTex.repeat.set(1, 1);
  const paintA = L.add("sys", std(0xd9895f, 0, 0.9));
  const paintB = L.add("sys", std(0x7fab98, 0, 0.9));
  const ceramic = L.add("sys", std(0xf8f8f6, 0.05, 0.2));
  const granite = L.add("sys", std(0x3b3632, 0.2, 0.3));
  const fabric = L.add("sys", std(0x8a6f9e, 0, 0.9));
  const carpet = L.add("sys", std(0x46566a, 0, 0.95, { emissive: 0xe0a458, emissiveIntensity: 0 }));
  const deskMat = L.add("sys", std(0x7a5a3e, 0.05, 0.6));
  const wood = L.add("sys", std(0x8b6342, 0, 0.7));
  // roof plant (visible on the skyline, focus at layer 2)
  const plantMat = L.add("roofp", std(0xd5dadf, 0.5, 0.45));
  const plantDark = L.add("roofp", std(0x3a4148, 0.5, 0.5));
  const fanMat = L.add("roofp", std(0x23282d, 0.4, 0.5));
  const roofDuct = L.add("roofp", std(0xc4ccd3, 0.85, 0.3));
  const solarMat = L.add("roofp", std(0x1f3558, 0.4, 0.25));
  // land & capital (layer 3)
  const pileMat = L.add("found", std(0xd2c8b6, 0, 0.8, { emissive: 0x9c6b30, emissiveIntensity: 0 }));
  const raftMat = L.add("found", std(0xe0dbd0, 0, 0.85, { map: concTex }));
  const baseWall = L.add("found", std(0xc4c0b7, 0, 0.85, { side: DS }));
  const trenchMat = L.add("found", std(0x8f8b83, 0, 0.9, { side: DS }));
  const uWater = L.add("found", std(0x2e86ab, 0.3, 0.4));
  const uSewer = L.add("found", std(0x7a5a3d, 0.2, 0.6));
  const uPower = L.add("found", std(0xe0782a, 0.2, 0.5));
  const uGas = L.add("found", std(0xe3c23a, 0.3, 0.45));
  const vaultMat = L.add("found", std(0x8a8f96, 0.85, 0.3));
  const vaultDoor = L.add("found", std(0xc9a75a, 0.9, 0.28, { emissive: 0x2a9d8f, emissiveIntensity: 0 }));
  const landMat = L.add(
    "land",
    new THREE.MeshBasicMaterial({ map: landTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    0.99
  );
  const pegMat = L.add("land", std(0xf3f1ec, 0, 0.6));
  const pegCap = L.add("land", std(0xd2453a, 0.1, 0.5, { emissive: 0xd2453a, emissiveIntensity: 0.25 }));
  const surveyMat = L.add("land", std(0xf2b417, 0.3, 0.45));
  const bankStone = L.add("bank", std(0xdcc9a3, 0.02, 0.7, { emissive: 0x2a9d8f, emissiveIntensity: 0 }));
  const bankDark = L.add("bank", std(0x2b3338, 0.3, 0.4));
  const bankTeal = L.add("bank", std(0x2a9d8f, 0.3, 0.4, { emissive: 0x2a9d8f, emissiveIntensity: 0.2 }));

  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusCrane = focus([craneMat, jumpMat], 0xd96c2b);
  const focusSteel = focus([rebarMat, steelStock], 0x4c6ef5);
  const focusCement = focus([siloMat, mixerDrum], 0x8a8f98);
  const focusPlumb = focus([pipeBlue], 0x1e9e76);
  const focusElec = focus([cableMat, busMat], 0xc6403d);
  const focusLift = focus([liftMat, plantMat], 0x7a5cc7);
  const focusBank = focus([bankStone], 0x2a9d8f);
  const focusVault = focus([vaultDoor], 0x2a9d8f);
  const focusPile = focus([pileMat], 0x9c6b30);
  const focusTile = focus([floorTile, carpet], 0xe0a458);

  // ================================================================ plinth, ground, kerbs
  {
    mesh(gS, roundedBox(THREE, GX + 0.3, BASE_T, GZ + 0.3, 0.035), baseMat, [0, -SOIL - BASE_T / 2, 0]);
    mesh(gS, roundedBox(THREE, GX + 0.18, 0.012, GZ + 0.18, 0.006), baseTrim, [0, -SOIL + 0.006, 0]);
    const plane = new THREE.PlaneGeometry(GX, GZ);
    plane.rotateX(-Math.PI / 2);
    const gm = mesh(g0, plane, groundMat);
    gm.renderOrder = 0;
    mesh(g0, walls(rectPts(-GX / 2, GX / 2, -GZ / 2, GZ / 2), -SOIL, 0, 1.2, SOIL, -SOIL), soilMat);
    // Kerbs along the avenue and the cross street.
    const k: T.BufferGeometry[] = [];
    for (const z of [0.7, 1.2]) k.push(bb(-5, z === 0.7 ? 0.85 : 5, 0, 0.012, z - 0.008, z + 0.008));
    k.push(bb(1.25, 5, 0, 0.012, 0.692, 0.708));
    for (const x of [0.85, 1.25]) k.push(bb(x - 0.008, x + 0.008, 0, 0.012, -4, 0.7));
    merged(g0, k, kerbMat);
  }

  // Contact shadows (manual opacity — they rely on alpha and must stay transparent).
  const shadows: { m: T.MeshBasicMaterial; base: number }[] = [];
  const shade = (x: number, z: number, sx: number, sz: number, op: number) => {
    const s = contactShadow(THREE, sx, sz, op, 0.003);
    s.position.x = x;
    s.position.z = z;
    g0.add(s);
    shadows.push({ m: s.material as T.MeshBasicMaterial, base: op });
  };

  // ================================================================ residential tower (finished)
  const RX = -3.4,
    RZ = -2.05,
    RW = 1.15,
    RD = 1.0,
    RPOD = 0.3,
    RFL = 15;
  const RTOP = RPOD + RFL * FH;
  {
    const podPts = roundRect(-3.4, -1.95, 1.9, 1.6, 0.1, 3);
    mesh(g0, walls(podPts, 0, RPOD, 0.6, RPOD), podMat);
    // podium glazing band
    mesh(g0, walls(inset(podPts, -0.003, -3.4, -1.95), 0.03, 0.2, 0.6, 0.17, 0.03), lobbyGlass);
    merged(g1, [slab(podPts, RPOD, 0.03), slab(podPts, 0.02, 0.02)], slabMat);
    // podium deck: lawn, pool, deck trees placed later
    const deck = cap(inset(podPts, 0.06, -3.4, -1.95), RPOD + 0.002);
    mesh(g0, deck, deckGreen);
    mesh(g0, bb(-4.2, -3.98, RPOD, RPOD + 0.006, -1.5, -1.25), poolMat);

    const plan = roundRect(RX, RZ, RW, RD, 0.12, 4);
    resTex.repeat.set(1, 1);
    mesh(g0, walls(plan, RPOD, RTOP, 0.96, 0.96, RPOD), resFacade);
    // floor slabs + perimeter columns (structure)
    const sl: T.BufferGeometry[] = [];
    const inner = inset(plan, 0.012, RX, RZ);
    for (let k = 1; k <= RFL; k++) sl.push(slab(inner, RPOD + k * FH, 0.026));
    // Balconies on the two faces the camera sees (+z, +x): slabs (structure) + glass (shell).
    const balS: T.BufferGeometry[] = [];
    const balG: T.BufferGeometry[] = [];
    for (let k = 1; k <= RFL; k++) {
      const y = RPOD + k * FH - FH + 0.004;
      if (k === 1) continue;
      const off = k % 2 ? 0.08 : -0.06;
      const bz0 = RZ + RD / 2,
        bx0 = RX - 0.38 + off,
        bx1 = RX + 0.3 + off;
      balS.push(bb(bx0, bx1, y - 0.022, y, bz0 - 0.01, bz0 + 0.09));
      balG.push(bb(bx0, bx1, y, y + 0.05, bz0 + 0.083, bz0 + 0.09));
      const bx = RX + RW / 2,
        z0 = RZ - 0.32 - off,
        z1 = RZ + 0.26 - off;
      balS.push(bb(bx - 0.01, bx + 0.09, y - 0.022, y, z0, z1));
      balG.push(bb(bx + 0.083, bx + 0.09, y, y + 0.05, z0, z1));
    }
    sl.push(...balS);
    merged(g1, sl, slabMat);
    merged(g0, balG, balGlass);
    const cols: T.BufferGeometry[] = [];
    for (const [dx, dz] of [
      [-0.45, -0.38],
      [0, -0.38],
      [0.45, -0.38],
      [-0.45, 0.38],
      [0, 0.38],
      [0.45, 0.38],
      [-0.45, 0],
      [0.45, 0],
    ])
      cols.push(bb(RX + dx - 0.025, RX + dx + 0.025, RPOD, RTOP, RZ + dz - 0.025, RZ + dz + 0.025));
    merged(g1, cols, colMat);
    // core walls (two lift shafts + stair)
    const cx = RX - 0.12,
      cz = RZ - 0.08;
    merged(
      g1,
      [
        bb(cx - 0.2, cx + 0.2, 0, RTOP + 0.18, cz - 0.16, cz - 0.14),
        bb(cx - 0.2, cx + 0.2, 0, RTOP + 0.18, cz + 0.14, cz + 0.16),
        bb(cx - 0.2, cx - 0.18, 0, RTOP + 0.18, cz - 0.16, cz + 0.16),
        bb(cx + 0.18, cx + 0.2, 0, RTOP + 0.18, cz - 0.16, cz + 0.16),
        bb(cx - 0.01, cx + 0.01, 0, RTOP + 0.18, cz - 0.16, cz + 0.16),
        bb(cx - 0.2, cx + 0.2, RTOP + 0.16, RTOP + 0.19, cz - 0.16, cz + 0.16),
      ],
      coreMat
    );
    // crown: white frame and fins rising past the roof
    const crownPts = inset(plan, -0.012, RX, RZ);
    const crown: T.BufferGeometry[] = [walls(crownPts, RTOP + 0.24, RTOP + 0.32, 1, 1)];
    for (let i = 0; i < crownPts.length; i += 2) {
      const [x, z] = crownPts[i];
      crown.push(bb(x - 0.012, x + 0.012, RTOP - 0.1, RTOP + 0.32, z - 0.012, z + 0.012));
    }
    crown.push(walls(crownPts, RTOP - 0.02, RTOP + 0.05, 1, 1));
    merged(g0, crown, resWhite);
    shade(RX, RZ + 0.1, 3.0, 2.6, 0.5);
  }

  // ================================================================ office tower + wing (finished)
  const OX = 2.35,
    OZ = -2.2,
    OW = 1.3,
    OD = 1.05,
    OLOB = 0.36,
    OFL = 14;
  const OTOP = OLOB + OFL * FH;
  {
    const plan = chamferRect(OX, OZ, OW, OD, 0.18);
    officeTex.repeat.set(1, 1);
    mesh(g0, walls(plan, OLOB, OTOP, 1.2, 0.96, OLOB), offGlass);
    const lob = inset(plan, 0.07, OX, OZ);
    mesh(g0, walls(lob, 0, OLOB, 0.6, OLOB), lobbyGlass);
    // vertical fins on the +z / +x faces
    const fins: T.BufferGeometry[] = [];
    for (let x = OX - OW / 2 + 0.3; x <= OX + OW / 2 - 0.25; x += 0.15)
      fins.push(bb(x - 0.006, x + 0.006, OLOB, OTOP + 0.05, OZ + OD / 2, OZ + OD / 2 + 0.045));
    for (let z = OZ - OD / 2 + 0.3; z <= OZ + OD / 2 - 0.25; z += 0.15)
      fins.push(bb(OX + OW / 2, OX + OW / 2 + 0.045, OLOB, OTOP + 0.05, z - 0.006, z + 0.006));
    // entrance canopy
    fins.push(bb(OX - 0.4, OX + 0.3, OLOB - 0.03, OLOB - 0.005, OZ + OD / 2, OZ + OD / 2 + 0.24));
    merged(g0, fins, finMat);
    // louvred crown screening the roof plant
    mesh(g0, walls(inset(plan, 0.02, OX, OZ), OTOP, OTOP + 0.3, 0.25, 0.3, OTOP), louvreMat);
    // structure
    const sl: T.BufferGeometry[] = [slab(plan, 0.02, 0.02)];
    const inner = inset(plan, 0.012, OX, OZ);
    for (let k = 0; k <= OFL; k++) sl.push(slab(inner, OLOB + k * FH, 0.026));
    merged(g1, sl, slabMat);
    const cols: T.BufferGeometry[] = [];
    for (const dx of [-0.5, -0.17, 0.17, 0.5])
      for (const dz of [-0.4, 0.4]) cols.push(bb(OX + dx - 0.025, OX + dx + 0.025, 0, OTOP, OZ + dz - 0.025, OZ + dz + 0.025));
    for (const dz of [-0.13, 0.13])
      for (const dx of [-0.58, 0.58]) cols.push(bb(OX + dx - 0.025, OX + dx + 0.025, 0, OTOP, OZ + dz - 0.025, OZ + dz + 0.025));
    merged(g1, cols, colMat);
    // core: three lift shafts in a row + service shaft
    const cx = OX - 0.05,
      cz = OZ - 0.08;
    merged(
      g1,
      [
        bb(cx - 0.25, cx + 0.25, 0, OTOP + 0.2, cz - 0.15, cz - 0.13),
        bb(cx - 0.25, cx + 0.25, 0, OTOP + 0.2, cz + 0.13, cz + 0.15),
        bb(cx - 0.25, cx - 0.23, 0, OTOP + 0.2, cz - 0.15, cz + 0.15),
        bb(cx + 0.23, cx + 0.25, 0, OTOP + 0.2, cz - 0.15, cz + 0.15),
        bb(cx - 0.25, cx + 0.25, OTOP + 0.18, OTOP + 0.21, cz - 0.15, cz + 0.15),
      ],
      coreMat
    );
    shade(OX, OZ + 0.1, 3.2, 2.6, 0.5);

    // wing
    const WX = 4.1,
      WZ = -2.6;
    const wplan = chamferRect(WX, WZ, 1.2, 1.0, 0.12);
    const WTOP = OLOB + 6 * FH;
    mesh(g0, walls(wplan, OLOB, WTOP, 1.2, 0.96, OLOB), offGlass);
    mesh(g0, walls(inset(wplan, 0.06, WX, WZ), 0, OLOB, 0.6, OLOB), lobbyGlass);
    const wsl: T.BufferGeometry[] = [slab(wplan, 0.02, 0.02)];
    for (let k = 0; k <= 6; k++) wsl.push(slab(inset(wplan, 0.012, WX, WZ), OLOB + k * FH, 0.026));
    merged(g1, wsl, slabMat);
    const wcol: T.BufferGeometry[] = [];
    for (const dx of [-0.45, 0, 0.45])
      for (const dz of [-0.38, 0.38]) wcol.push(bb(WX + dx - 0.025, WX + dx + 0.025, 0, WTOP, WZ + dz - 0.025, WZ + dz + 0.025));
    merged(g1, wcol, colMat);
    mesh(g0, walls(inset(wplan, -0.005, WX, WZ), WTOP, WTOP + 0.06, 1, 1), finMat);
    // rooftop solar on the wing
    const pv: T.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const g = new THREE.BoxGeometry(0.2, 0.008, 0.14);
        g.rotateX(-0.25);
        g.translate(WX - 0.36 + i * 0.24, WTOP + 0.04, WZ - 0.28 + j * 0.24);
        pv.push(g);
      }
    merged(g2, pv, solarMat);
    // ground-level link canopy between tower and wing
    merged(g0, [bb(3.0, 3.5, 0.26, 0.29, -2.45, -2.25)], finMat);
    shade(WX, WZ, 2.2, 1.9, 0.4);
  }

  // ================================================================ tower under construction
  const CX = -1.15,
    CZ = -2.05,
    CFL = 9;
  const CTOP = CFL * FH; // top completed slab
  {
    const x0 = CX - 0.5,
      x1 = CX + 0.5,
      z0 = CZ - 0.5,
      z1 = CZ + 0.5;
    const plan = rectPts(x0, x1, z0, z1);
    const sl: T.BufferGeometry[] = [slab(plan, 0.02, 0.02)];
    for (let k = 1; k <= CFL; k++) sl.push(slab(plan, k * FH, 0.026));
    merged(g1, sl, cConc);
    const grid = [-0.45, -0.15, 0.15, 0.45];
    const cols: T.BufferGeometry[] = [];
    const starters: T.BufferGeometry[] = [];
    for (const dx of grid)
      for (const dz of grid) {
        const x = CX + dx,
          z = CZ + dz;
        const castNext = dx < 0; // the -x half has the next storey's columns cast
        cols.push(bb(x - 0.026, x + 0.026, 0, CTOP + (castNext ? FH : 0), z - 0.026, z + 0.026));
        if (!castNext) {
          // rebar cage starters: 4 bars + 2 ties
          for (const [ox, oz] of [
            [-0.016, -0.016],
            [0.016, -0.016],
            [-0.016, 0.016],
            [0.016, 0.016],
          ])
            starters.push(bar(THREE, [x + ox, CTOP, z + oz], [x + ox, CTOP + 0.2, z + oz], 0.0035, 4));
          for (const ty of [0.06, 0.13]) starters.push(bb(x - 0.02, x + 0.02, CTOP + ty, CTOP + ty + 0.004, z - 0.02, z + 0.02));
        }
      }
    merged(g1, cols, cCol);
    // deck formwork over the -x half at the next level, with props below and a rebar mat on top
    const fy = CTOP + FH;
    const form: T.BufferGeometry[] = [bb(x0 - 0.02, CX + 0.02, fy - 0.03, fy - 0.012, z0 - 0.02, z1 + 0.02)];
    const props: T.BufferGeometry[] = [];
    for (let px = x0 + 0.08; px < CX; px += 0.13)
      for (let pz = z0 + 0.08; pz < z1; pz += 0.13) props.push(bar(THREE, [px, CTOP, pz], [px, fy - 0.03, pz], 0.004, 4));
    merged(g1, form, formMat);
    merged(g1, props, propMat);
    for (let x = x0; x <= CX + 0.001; x += 0.05) starters.push(bb(x - 0.0025, x + 0.0025, fy - 0.012, fy - 0.006, z0, z1));
    for (let z = z0; z <= z1 + 0.001; z += 0.05) starters.push(bb(x0, CX, fy - 0.006, fy, z - 0.0025, z + 0.0025));
    merged(g1, starters, rebarMat);
    // blockwork infill on the lower floors
    const inf = inset(plan, 0.03, CX, CZ);
    mesh(g1, walls(inf, 0.02, 5 * FH, 0.3333, FH, 0), brickMat);
    // concrete core leading the frame, with yellow jump-form at its head
    const kx = CX - 0.05,
      kz = CZ - 0.02;
    const CORE = CTOP + 0.5;
    const kp = rectPts(kx - 0.16, kx + 0.16, kz - 0.16, kz + 0.16);
    merged(g1, [walls(kp, 0, CORE, 0.32, 0.24, 0), walls(inset(kp, 0.02, kx, kz), 0, CORE), cap(kp, CORE)], cConc);
    const jf = inset(kp, -0.035, kx, kz);
    merged(
      g1,
      [
        walls(jf, CORE - 0.14, CORE + 0.04, 1, 1),
        walls(inset(jf, -0.025, kx, kz), CORE - 0.19, CORE - 0.17, 1, 1),
        cap(inset(jf, -0.025, kx, kz), CORE - 0.17),
      ],
      jumpMat
    );
    // perimeter safety screens at the working floors
    mesh(g1, walls(inset(plan, -0.04, CX, CZ), CTOP - 0.34, CTOP + 0.04, 0.25, 0.38, CTOP - 0.34), screenMat);
    // rack-and-pinion material hoist on the +x face
    const hoist: T.BufferGeometry[] = [];
    const hx = x1 + 0.09,
      hz = CZ + 0.2;
    for (const [ox, oz] of [
      [-0.03, -0.03],
      [0.03, -0.03],
      [-0.03, 0.03],
      [0.03, 0.03],
    ])
      hoist.push(bar(THREE, [hx + ox, 0, hz + oz], [hx + ox, CTOP + 0.3, hz + oz], 0.004, 4));
    for (let y = 0.1; y < CTOP + 0.3; y += 0.12) hoist.push(bb(hx - 0.032, hx + 0.032, y, y + 0.006, hz - 0.032, hz + 0.032));
    merged(g1, hoist, propMat);
    merged(g1, [bb(hx + 0.035, hx + 0.13, 1.15, 1.27, hz - 0.08, hz + 0.08)], cabinBlue);
    shade(CX, CZ + 0.1, 2.4, 2.2, 0.4);

    // site hoarding with a gate gap for the mixer trucks
    const hoardPts: Vec2[] = [
      [-0.05, -0.35],
      [-2.1, -0.35],
      [-2.1, -3.6],
      [0.6, -3.6],
      [0.6, -0.35],
      [0.4, -0.35],
    ];
    mesh(g1, walls(hoardPts, 0, 0.09, 0.8, 0.09, 0, false), hoardMat);

    // ---- tower crane
    const MX = -0.38,
      MZ = -2.95,
      MH = 4.0,
      S = 0.065;
    const lat: T.BufferGeometry[] = [];
    const r = 0.0055;
    const corners: Vec2[] = [
      [-S, -S],
      [S, -S],
      [S, S],
      [-S, S],
    ];
    for (const [ox, oz] of corners) lat.push(bar(THREE, [MX + ox, 0.05, MZ + oz], [MX + ox, MH, MZ + oz], r, 4));
    const step = 0.13;
    for (let y = 0.05; y < MH - 0.01; y += step) {
      for (let i = 0; i < 4; i++) {
        const a = corners[i],
          b = corners[(i + 1) % 4];
        lat.push(bar(THREE, [MX + a[0], y, MZ + a[1]], [MX + b[0], y, MZ + b[1]], r * 0.8, 4));
        lat.push(bar(THREE, [MX + a[0], y, MZ + a[1]], [MX + b[0], Math.min(MH, y + step), MZ + b[1]], r * 0.7, 4));
      }
    }
    merged(g1, lat, craneMat);
    merged(g1, [bb(MX - 0.13, MX + 0.13, 0, 0.06, MZ - 0.13, MZ + 0.13)], cConc);
    // slewing assembly, rotated so the jib reaches over the tower
    const top = new THREE.Group();
    top.position.set(MX, MH, MZ);
    const jibDir = new THREE.Vector2(CX + 0.05 - MX, CZ + 0.25 - MZ).normalize();
    top.rotation.y = Math.atan2(-jibDir.y, jibDir.x);
    g1.add(top);
    const jib: T.BufferGeometry[] = [];
    const JL = 2.35,
      CJ = 0.85,
      jw = 0.045,
      jh = 0.1;
    // jib: two bottom chords + top chord, triangulated
    for (const zz of [-jw, jw]) jib.push(bar(THREE, [0.05, 0.06, zz], [JL, 0.06, zz], r, 4));
    jib.push(bar(THREE, [0.05, 0.06 + jh, 0], [JL - 0.05, 0.06 + jh * 0.5, 0], r, 4));
    for (let x = 0.05; x < JL - 0.1; x += 0.12) {
      const yt = 0.06 + jh * (1 - (0.5 * x) / JL);
      for (const zz of [-jw, jw]) {
        jib.push(bar(THREE, [x, 0.06, zz], [x + 0.06, yt, 0], r * 0.7, 3));
        jib.push(bar(THREE, [x + 0.06, yt, 0], [x + 0.12, 0.06, zz], r * 0.7, 3));
      }
      jib.push(bar(THREE, [x, 0.06, -jw], [x, 0.06, jw], r * 0.6, 3));
    }
    // counter-jib
    for (const zz of [-jw * 1.4, jw * 1.4]) jib.push(bar(THREE, [0.02, 0.06, zz], [-CJ, 0.06, zz], r * 1.3, 4));
    for (let x = -0.05; x > -CJ; x -= 0.15) jib.push(bar(THREE, [x, 0.06, -jw * 1.4], [x, 0.06, jw * 1.4], r, 3));
    // cat-head (A-frame) and pendant ties
    const apex: Vec3 = [0, 0.5, 0];
    for (const [ox, oz] of corners) jib.push(bar(THREE, [ox * 0.9, 0.06, oz * 0.9], apex, r * 1.1, 4));
    jib.push(bar(THREE, apex, [JL * 0.62, 0.06 + jh * 0.7, 0], 0.003, 3));
    jib.push(bar(THREE, apex, [-CJ + 0.08, 0.07, 0], 0.003, 3));
    // slewing ring
    jib.push(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12).translate(0, 0.03, 0));
    merged(top, jib, craneMat);
    const cw: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) cw.push(roundedBox(THREE, 0.07, 0.14, 0.13, 0.008).translate(-CJ + 0.06 + i * 0.075, 0.0, 0));
    merged(top, cw, cweightMat);
    merged(top, [bb(-CJ * 0.65, -0.05, 0.05, 0.065, -0.05, 0.05)], craneDark); // walkway / machinery deck
    merged(top, [roundedBox(THREE, 0.1, 0.09, 0.08, 0.012).translate(0.09, 0.0, 0.1)], cabGlass);
    // trolley, hoist line, hook block and a rebar bundle on the hook
    const TR = 1.45;
    const hookY = CTOP + FH + 0.42 - MH; // local
    merged(top, [bb(TR - 0.04, TR + 0.04, 0.03, 0.05, -0.04, 0.04)], craneDark);
    merged(top, [bar(THREE, [TR - 0.01, 0.04, 0], [TR - 0.01, hookY + 0.04, 0], 0.0018, 3), bar(THREE, [TR + 0.01, 0.04, 0], [TR + 0.01, hookY + 0.04, 0], 0.0018, 3)], craneDark);
    merged(top, [roundedBox(THREE, 0.04, 0.05, 0.03, 0.008).translate(TR, hookY + 0.03, 0)], craneMat);
    const bundle: T.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const oy = (i % 3) * 0.009,
        oz = Math.floor(i / 3) * 0.009 - 0.009;
      bundle.push(bar(THREE, [TR - 0.28, hookY - 0.06 + oy, oz], [TR + 0.28, hookY - 0.06 + oy, oz], 0.004, 4));
    }
    bundle.push(bar(THREE, [TR, hookY + 0.01, 0], [TR - 0.18, hookY - 0.05, 0], 0.0015, 3));
    bundle.push(bar(THREE, [TR, hookY + 0.01, 0], [TR + 0.18, hookY - 0.05, 0], 0.0015, 3));
    merged(top, bundle, rebarMat);

    // ---- cement: silo + batching hopper + screw conveyor, transit mixer
    const SX = 0.3,
      SZ = -1.35;
    const silo = lathe(
      THREE,
      [
        [0, 0.34],
        [0.03, 0.34],
        [0.13, 0.5],
        [0.13, 1.0],
        [0.11, 1.04],
        [0.03, 1.07],
        [0, 1.07],
      ],
      24
    );
    mesh(g1, silo, siloMat, [SX, 0, SZ]);
    merged(g1, [new THREE.CylinderGeometry(0.132, 0.132, 0.05, 24, 1, true).translate(SX, 0.88, SZ)], siloBand);
    const legs: T.BufferGeometry[] = [];
    for (const [ox, oz] of corners)
      legs.push(bar(THREE, [SX + ox * 1.6, 0, SZ + oz * 1.6], [SX + ox * 1.4, 0.5, SZ + oz * 1.4], 0.008, 4));
    legs.push(bar(THREE, [SX, 0.36, SZ], [SX - 0.05, 0.18, SZ + 0.32], 0.012, 6)); // screw conveyor
    // railing ring on the silo top
    legs.push(new THREE.TorusGeometry(0.12, 0.003, 4, 24).rotateX(Math.PI / 2).translate(SX, 1.1, SZ));
    merged(g1, legs, propMat);
    merged(g1, [bb(SX - 0.14, SX + 0.06, 0, 0.2, SZ + 0.28, SZ + 0.46)], cabinMat); // batching plant
    merged(g1, [bb(SX - 0.12, SX + 0.04, 0.2, 0.26, SZ + 0.3, SZ + 0.44)], siloBand);
    // transit mixer, heading into the gate
    {
      const T0 = new THREE.Group();
      T0.position.set(0.15, 0, -0.62);
      T0.rotation.y = -Math.PI / 2 + 0.25;
      g1.add(T0);
      merged(T0, [bb(-0.2, 0.2, 0.025, 0.05, -0.05, 0.05)], craneDark);
      merged(T0, [roundedBox(THREE, 0.09, 0.09, 0.1, 0.015).translate(0.22, 0.085, 0)], truckCab);
      const drum = lathe(
        THREE,
        [
          [0, -0.17],
          [0.03, -0.17],
          [0.065, -0.07],
          [0.065, 0.06],
          [0.03, 0.17],
          [0, 0.17],
        ],
        16
      );
      drum.rotateZ(Math.PI / 2 - 0.2);
      drum.translate(-0.04, 0.12, 0);
      merged(T0, [drum], mixerDrum);
      const wh: T.BufferGeometry[] = [];
      for (const x of [-0.14, -0.05, 0.2])
        for (const z of [-0.05, 0.05]) wh.push(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10).rotateX(Math.PI / 2).translate(x, 0.025, z));
      merged(T0, wh, craneDark);
    }
    // ---- steel stockyard: rebar bundles on sleepers + I-beam stack
    const steel: T.BufferGeometry[] = [];
    const sleepers: T.BufferGeometry[] = [];
    for (let b = 0; b < 3; b++) {
      const zc = -3.4 + b * 0.11;
      for (let i = 0; i < 8; i++) {
        const oy = Math.floor(i / 4) * 0.009,
          oz = (i % 4) * 0.009 - 0.014;
        steel.push(bar(THREE, [-0.05, 0.03 + oy, zc + oz], [0.5, 0.03 + oy, zc + oz], 0.004, 4));
      }
    }
    for (const x of [0.0, 0.22, 0.44]) sleepers.push(bb(x - 0.015, x + 0.015, 0, 0.025, -3.47, -3.12));
    const ibeam = (x0: number, x1: number, y: number, z: number) => {
      const h = 0.035,
        fw = 0.025,
        t = 0.005;
      steel.push(bb(x0, x1, y, y + t, z - fw / 2, z + fw / 2));
      steel.push(bb(x0, x1, y + h - t, y + h, z - fw / 2, z + fw / 2));
      steel.push(bb(x0, x1, y + t, y + h - t, z - t / 2, z + t / 2));
    };
    for (let l = 0; l < 3; l++) for (let i = 0; i < 4 - l; i++) ibeam(-0.05, 0.5, 0.025 + l * 0.036, -2.95 + i * 0.03 + l * 0.015);
    for (const x of [0.0, 0.44]) sleepers.push(bb(x - 0.015, x + 0.015, 0, 0.025, -3.0, -2.8));
    merged(g1, steel, steelStock);
    merged(g1, sleepers, timberMat);
    // site office: stacked porta-cabins
    merged(g1, [bb(-2.0, -1.6, 0, 0.12, -3.5, -3.3), bb(-2.0, -1.6, 0.12, 0.24, -3.5, -3.3)], cabinMat);
    merged(g1, [bb(-2.0, -1.6, 0.115, 0.125, -3.505, -3.295), bb(-1.98, -1.62, 0.04, 0.09, -3.297, -3.292), bb(-1.98, -1.62, 0.16, 0.21, -3.297, -3.292)], cabinBlue);
  }

  // ================================================================ sales gallery
  {
    const x0 = -2.0,
      x1 = -1.05,
      z0 = -0.18,
      z1 = 0.3;
    mesh(g0, walls(rectPts(x0 + 0.05, x1 - 0.05, z0 + 0.04, z1 - 0.04), 0, 0.2, 0.3, 0.2), salesGlass);
    merged(g0, [bb(x0 - 0.06, x1 + 0.08, 0.2, 0.225, z0 - 0.04, z1 + 0.1), bb(x0 + 0.05, x1 - 0.05, 0, 0.012, z0 + 0.04, z1 - 0.04)], salesRoof);
    const fins: T.BufferGeometry[] = [];
    for (let x = x0 + 0.02; x < x0 + 0.34; x += 0.035) fins.push(bb(x, x + 0.012, 0.012, 0.2, z1 + 0.02, z1 + 0.05));
    merged(g0, fins, salesWood);
    // model table with a miniature tower inside
    merged(g0, [bb(-1.62, -1.38, 0.0, 0.07, 0.0, 0.14), bb(-1.53, -1.47, 0.07, 0.16, 0.04, 0.1)], salesRoof);
    // totem + flags
    merged(g0, [bb(-0.98, -0.94, 0, 0.28, 0.28, 0.36)], salesGold);
    const poles: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) poles.push(bar(THREE, [-2.05 + i * 0.1, 0, 0.42], [-2.05 + i * 0.1, 0.36, 0.42], 0.003, 4));
    merged(g0, poles, poleMat);
    const flagGeo = (i: number) => new THREE.PlaneGeometry(0.07, 0.045).translate(-2.05 + i * 0.1 + 0.035, 0.33, 0.42);
    merged(g0, [flagGeo(0), flagGeo(2)], salesGold);
    merged(g0, [flagGeo(1)], hoardMat);
    shade(-1.52, 0.06, 1.4, 0.9, 0.35);
  }

  // ================================================================ warehouse
  const WH = { x0: -4.7, x1: -2.2, z0: 1.6, z1: 3.2, eave: 0.45, ridge: 0.53 };
  {
    const { x0, x1, z0, z1, eave, ridge } = WH;
    const zm = (z0 + z1) / 2;
    mesh(g0, walls(rectPts(x0, x1, z0, z1), 0, eave, 0.6, eave), whMat);
    // gables
    const gable = new THREE.BufferGeometry();
    gable.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([x0, eave, z0, x0, eave, z1, x0, ridge, zm, x1, eave, z1, x1, eave, z0, x1, ridge, zm], 3)
    );
    gable.computeVertexNormals();
    // roof: two shallow pitches + skylight strips
    const roof = (za: number, zb: number) => {
      const g = new THREE.PlaneGeometry(x1 - x0 + 0.06, Math.hypot(zb - za, ridge - eave) + 0.04);
      const ang = Math.atan2(ridge - eave, Math.abs(zb - za));
      g.rotateX(-Math.PI / 2);
      g.rotateX(za < zb ? -ang : ang);
      g.translate((x0 + x1) / 2, (eave + ridge) / 2 + 0.003, (za + zb) / 2);
      const uv = g.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 16, uv.getY(i) * 2);
      return g;
    };
    merged(g0, [roof(z1 + 0.02, zm), roof(z0 - 0.02, zm)], whRoof);
    merged(g0, [gable], whMat);
    const sk: T.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const x = x0 + 0.3 + i * 0.47;
      for (const s of [-1, 1]) {
        const g = new THREE.PlaneGeometry(0.14, 0.32);
        g.rotateX(-Math.PI / 2);
        g.rotateX(s > 0 ? -0.1 : 0.1);
        g.translate(x, (eave + ridge) / 2 + 0.008, zm + s * 0.4);
        sk.push(g);
      }
    }
    merged(g0, sk, skyLight);
    // dock doors, bumpers, canopy on the +z face
    const docks: T.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const x = x0 + 0.25 + i * 0.33;
      docks.push(bb(x - 0.1, x + 0.1, 0.06, 0.28, z1, z1 + 0.006));
      docks.push(bb(x - 0.12, x + 0.12, 0.0, 0.06, z1, z1 + 0.05));
    }
    docks.push(bb(x0, x1, 0.32, 0.335, z1, z1 + 0.18));
    merged(g0, docks, darkTrim);
    // office annexe on the +x end
    mesh(g0, walls(rectPts(x1, x1 + 0.34, 2.45, 3.2), 0, 0.3, 0.3, 0.15), offGlass);
    merged(g0, [bb(x1 - 0.005, x1 + 0.35, 0.3, 0.33, 2.44, 3.21)], finMat);
    // structure: portal frames + pallet racking
    const portals: T.BufferGeometry[] = [];
    for (let x = x0 + 0.05; x <= x1; x += 0.42) {
      portals.push(bb(x - 0.012, x + 0.012, 0, eave, z0 + 0.01, z0 + 0.035));
      portals.push(bb(x - 0.012, x + 0.012, 0, eave, z1 - 0.035, z1 - 0.01));
      portals.push(bar(THREE, [x, eave, z0 + 0.02], [x, ridge - 0.01, zm], 0.012, 4));
      portals.push(bar(THREE, [x, eave, z1 - 0.02], [x, ridge - 0.01, zm], 0.012, 4));
    }
    merged(g1, portals, portalMat);
    merged(g1, [slab(rectPts(x0, x1, z0, z1), 0.012, 0.012)], slabMat);
    const ups: T.BufferGeometry[] = [],
      beams: T.BufferGeometry[] = [],
      pals: T.BufferGeometry[] = [];
    for (let row = 0; row < 4; row++) {
      const zc = z0 + 0.28 + row * 0.33;
      for (let x = x0 + 0.15; x < x1 - 0.15; x += 0.2) {
        for (const dz of [-0.05, 0.05]) ups.push(bb(x - 0.004, x + 0.004, 0, 0.36, zc + dz - 0.004, zc + dz + 0.004));
      }
      for (const y of [0.1, 0.2, 0.3]) {
        beams.push(bb(x0 + 0.15, x1 - 0.35, y, y + 0.01, zc - 0.056, zc - 0.046));
        beams.push(bb(x0 + 0.15, x1 - 0.35, y, y + 0.01, zc + 0.046, zc + 0.056));
        for (let x = x0 + 0.2; x < x1 - 0.4; x += 0.1)
          if (R() < 0.8) pals.push(bb(x, x + 0.08, y + 0.01, y + 0.01 + 0.05 + R() * 0.025, zc - 0.045, zc + 0.045));
      }
      for (const y of [0.0]) for (let x = x0 + 0.2; x < x1 - 0.4; x += 0.1) pals.push(bb(x, x + 0.08, y, y + 0.06, zc - 0.045, zc + 0.045));
    }
    merged(g1, ups, rackUp);
    merged(g1, beams, rackBeam);
    merged(g1, pals, palletMat);
    shade((x0 + x1) / 2, zm + 0.2, 3.4, 2.4, 0.4);
  }

  // ================================================================ mall
  const MALL = { x0: 1.35, x1: 4.55, z0: 1.58, z1: 3.02, h: 0.72 };
  {
    const { x0, x1, z0, z1, h } = MALL;
    const plan = roundRect((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.22, 4);
    const pc: [number, number] = [(x0 + x1) / 2, (z0 + z1) / 2];
    mesh(g0, walls(plan, 0, h, 1.2, h, 0), mallMat);
    // parapet cap + skylight vault
    mesh(g0, walls(inset(plan, -0.004, pc[0], pc[1]), h - 0.02, h + 0.04, 1, 1), mallRoofMat);
    const vault = new THREE.CylinderGeometry(0.16, 0.16, 2.2, 16, 1, true, -Math.PI / 2, Math.PI);
    vault.rotateZ(Math.PI / 2);
    vault.translate(pc[0] - 0.2, h, pc[1] - 0.15);
    merged(g0, [vault], skyLight);
    // atrium drum at the forecourt
    const DX = 2.95,
      DZ = z1;
    const drum = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 40, 1, true, -Math.PI * 0.05, Math.PI * 1.1);
    drum.rotateY(-Math.PI / 2);
    drum.translate(DX, 0.45, DZ);
    merged(g0, [drum], drumGlass);
    const ring: T.BufferGeometry[] = [];
    ring.push(new THREE.CylinderGeometry(0.47, 0.47, 0.035, 40, 1, false, -Math.PI * 0.05, Math.PI * 1.1).rotateY(-Math.PI / 2).translate(DX, 0.915, DZ));
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.55 + (i / 10) * Math.PI * 1.1;
      const x = DX + Math.sin(a) * 0.425,
        z = DZ + Math.cos(a) * 0.425;
      if (z < DZ - 0.01) continue;
      ring.push(bb(x - 0.008, x + 0.008, 0, 0.9, z - 0.008, z + 0.008));
    }
    ring.push(bb(DX - 0.3, DX + 0.3, 0.2, 0.22, DZ + 0.42, DZ + 0.62)); // entrance canopy
    merged(g0, ring, finMat);
    // anchor-store signage blocks
    merged(g0, [bb(1.65, 2.15, 0.48, 0.6, z1 + 0.0, z1 + 0.02)], signMats[0]);
    merged(g0, [bb(3.75, 4.25, 0.48, 0.6, z1 + 0.0, z1 + 0.02)], signMats[1]);
    merged(g0, [bb(x1, x1 + 0.02, 0.48, 0.6, 2.0, 2.6)], signMats[2]);
    // structure: column grid, mezzanine + roof slab
    const cols: T.BufferGeometry[] = [];
    for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.45)
      for (let z = z0 + 0.25; z < z1 - 0.1; z += 0.45) cols.push(bb(x - 0.02, x + 0.02, 0, h, z - 0.02, z + 0.02));
    merged(g1, cols, colMat);
    const inner = inset(plan, 0.012, pc[0], pc[1]);
    merged(g1, [slab(inner, 0.02, 0.02), slab(inner, 0.36, 0.025), slab(inner, h - 0.02, 0.025)], slabMat);
    // roof plant: AHUs + ducts
    const ahu: T.BufferGeometry[] = [];
    const fans: T.BufferGeometry[] = [];
    const ducts: T.BufferGeometry[] = [];
    for (const [ax, az] of [
      [1.85, 2.55],
      [4.05, 2.55],
      [1.85, 1.95],
      [4.05, 1.95],
    ]) {
      ahu.push(roundedBox(THREE, 0.32, 0.1, 0.18, 0.01).translate(ax, h + 0.05, az));
      for (const o of [-0.08, 0.08]) fans.push(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14).translate(ax + o, h + 0.104, az));
      ducts.push(bb(ax - 0.035, ax + 0.035, h + 0.012, h + 0.06, Math.min(az, 2.25), Math.max(az, 2.25)));
    }
    ducts.push(bb(1.85, 4.05, h + 0.012, h + 0.06, 2.22, 2.28));
    merged(g2, ahu, plantMat);
    merged(g2, fans, fanMat);
    merged(g2, ducts, roofDuct);
    shade(pc[0], pc[1] + 0.2, 4.2, 2.6, 0.4);
    // forecourt fountain
    const basin = lathe(THREE, [
      [0, 0.0],
      [0.2, 0.0],
      [0.2, 0.035],
      [0.18, 0.035],
      [0.18, 0.01],
      [0, 0.01],
    ], 28);
    merged(g0, [basin.translate(2.2, 0, 3.45), lathe(THREE, [[0, 0.0], [0.2, 0.0], [0.2, 0.035], [0.18, 0.035], [0.18, 0.01], [0, 0.01]], 28).translate(3.75, 0, 3.45)], kerbMat);
    merged(g0, [new THREE.CylinderGeometry(0.18, 0.18, 0.004, 28).translate(2.2, 0.026, 3.45), new THREE.CylinderGeometry(0.18, 0.18, 0.004, 28).translate(3.75, 0.026, 3.45)], waterMat);
  }

  // ================================================================ bank branch (finance)
  {
    const bx = 0.25,
      bz0 = 1.9,
      bz1 = 2.65,
      hw = 0.4,
      bh = 0.4;
    merged(g3, [bb(bx - hw, bx + hw, 0, bh, bz0, bz1), bb(bx - hw - 0.02, bx + hw + 0.02, bh, bh + 0.035, bz0 - 0.02, bz1 + 0.02)], bankStone);
    // portico: stepped plinth, columns, entablature, pediment
    const por: T.BufferGeometry[] = [
      bb(bx - hw - 0.04, bx + hw + 0.04, 0, 0.02, bz1, bz1 + 0.32),
      bb(bx - hw - 0.02, bx + hw + 0.02, 0.02, 0.04, bz1, bz1 + 0.28),
      bb(bx - hw - 0.02, bx + hw + 0.02, 0.33, 0.37, bz1, bz1 + 0.28),
    ];
    for (let i = 0; i < 4; i++) {
      const x = bx - 0.3 + i * 0.2;
      por.push(lathe(THREE, [[0, 0.04], [0.032, 0.04], [0.032, 0.055], [0.024, 0.06], [0.021, 0.31], [0.03, 0.32], [0.03, 0.33], [0, 0.33]], 14).translate(x, 0, bz1 + 0.22));
    }
    const ped = new THREE.BufferGeometry();
    const pz0 = bz1 - 0.02,
      pz1 = bz1 + 0.28,
      pl = bx - hw - 0.02,
      pr = bx + hw + 0.02,
      py = 0.37,
      pt = 0.47;
    ped.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          pl, py, pz1, pr, py, pz1, bx, pt, pz1,
          // roof slopes
          pl, py, pz1, bx, pt, pz1, bx, pt, pz0,
          pl, py, pz1, bx, pt, pz0, pl, py, pz0,
          pr, py, pz1, pr, py, pz0, bx, pt, pz0,
          pr, py, pz1, bx, pt, pz0, bx, pt, pz1,
        ],
        3
      )
    );
    ped.computeVertexNormals();
    por.push(ped);
    merged(g3, por, bankStone);
    merged(g3, [bb(bx - hw - 0.021, bx + hw + 0.021, 0.3, 0.33, bz1 + 0.001, bz1 + 0.281)], bankTeal);
    // windows + door
    const win: T.BufferGeometry[] = [bb(bx - 0.07, bx + 0.07, 0.04, 0.26, bz1, bz1 + 0.004)];
    for (const z of [2.05, 2.3, 2.52]) {
      win.push(bb(bx + hw, bx + hw + 0.004, 0.1, 0.3, z - 0.05, z + 0.05));
      win.push(bb(bx - hw - 0.004, bx - hw, 0.1, 0.3, z - 0.05, z + 0.05));
    }
    merged(g3, win, bankDark);
    // ATM kiosk
    merged(g3, [bb(bx + 0.5, bx + 0.64, 0, 0.18, 2.6, 2.74)], bankTeal);
    shade(bx, 2.4, 1.3, 1.4, 0.35);
    // vault below the bank (land & capital layer)
    const vz0 = 2.0,
      vz1 = 2.5,
      vy0 = -0.42,
      vy1 = -0.14;
    merged(g3, [bb(bx - 0.25, bx + 0.25, vy0, vy1, vz0, vz1)], vaultMat);
    const door = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 28).rotateX(Math.PI / 2).translate(bx, (vy0 + vy1) / 2, vz1 + 0.015);
    const spokes: T.BufferGeometry[] = [door];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      spokes.push(bar(THREE, [bx - Math.cos(a) * 0.06, (vy0 + vy1) / 2 - Math.sin(a) * 0.06, vz1 + 0.035], [bx + Math.cos(a) * 0.06, (vy0 + vy1) / 2 + Math.sin(a) * 0.06, vz1 + 0.035], 0.005, 5));
    }
    merged(g3, spokes, vaultDoor);
  }

  // ================================================================ vacant land parcel (fence + scrub)
  {
    const [x0, x1, z0, z1] = [3.3, 4.8, -1.7, 0.45];
    const posts: T.BufferGeometry[] = [];
    const ring: Vec2[] = rectPts(x0, x1, z0, z1);
    for (let i = 0; i < 4; i++) {
      const a = ring[i],
        b = ring[(i + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.round(len / 0.18);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const x = lerp(a[0], b[0], t),
          z = lerp(a[1], b[1], t);
        posts.push(bb(x - 0.005, x + 0.005, 0, 0.08, z - 0.005, z + 0.005));
      }
      for (const y of [0.035, 0.075]) posts.push(bar(THREE, [a[0], y, a[1]], [b[0], y, b[1]], 0.0025, 3));
    }
    merged(g0, posts, fenceMat);
    // site board
    merged(g0, [bb(3.4, 3.42, 0, 0.16, 0.36, 0.38), bb(3.62, 3.64, 0, 0.16, 0.36, 0.38)], poleMat);
    merged(g0, [bb(3.38, 3.66, 0.1, 0.22, 0.38, 0.39)], hoardMat);
  }

  // ================================================================ metro viaduct along the avenue median
  {
    const MZ = 0.95,
      MY = 0.44;
    const piers: T.BufferGeometry[] = [];
    for (let x = -4.4; x <= 4.6; x += 1.5) {
      piers.push(roundedBox(THREE, 0.06, MY - 0.04, 0.09, 0.02).translate(x, (MY - 0.04) / 2, MZ));
      piers.push(bb(x - 0.05, x + 0.05, MY - 0.06, MY - 0.02, MZ - 0.11, MZ + 0.11));
    }
    piers.push(bb(-5, 5, MY - 0.02, MY + 0.02, MZ - 0.1, MZ + 0.1));
    piers.push(bb(-5, 5, MY + 0.02, MY + 0.045, MZ - 0.1, MZ - 0.09));
    piers.push(bb(-5, 5, MY + 0.02, MY + 0.045, MZ + 0.09, MZ + 0.1));
    merged(g0, piers, metroConc);
    const body: T.BufferGeometry[] = [],
      band: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const x = -0.6 + i * 0.41;
      body.push(roundedBox(THREE, 0.39, 0.075, 0.09, 0.02).translate(x, MY + 0.06, MZ - 0.04));
      band.push(bb(x - 0.19, x + 0.19, MY + 0.065, MY + 0.085, MZ - 0.0865, MZ + 0.0065));
    }
    merged(g0, body, metroBody);
    merged(g0, band, metroBand);
  }

  // ================================================================ trees, cars, trucks, streetlights
  {
    const broadC = new THREE.IcosahedronGeometry(0.075, 1).scale(1, 0.92, 1).translate(0, 0.14, 0);
    const broadT = new THREE.CylinderGeometry(0.007, 0.01, 0.1, 5).translate(0, 0.05, 0);
    const colC = lathe(THREE, [[0, 0.05], [0.028, 0.065], [0.038, 0.12], [0.03, 0.2], [0.014, 0.25], [0, 0.27]], 7);
    const colT = new THREE.CylinderGeometry(0.005, 0.007, 0.06, 4).translate(0, 0.03, 0);
    const palmT = new THREE.CylinderGeometry(0.0045, 0.007, 0.24, 5).translate(0, 0.12, 0);
    const fr: T.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.ConeGeometry(0.018, 0.12, 3, 1);
      g.scale(1, 1, 0.25);
      g.translate(0, 0.06, 0);
      g.rotateZ(-1.15);
      g.rotateY((i / 7) * Math.PI * 2);
      g.translate(0, 0.235, 0);
      fr.push(g);
    }
    const palmF = mergeInto(THREE, fr);

    const broad: Inst[] = [],
      columnar: Inst[] = [],
      palms: Inst[] = [];
    const greens = [0x4f6b3a, 0x5d7a40, 0x6b8a48, 0x47613a, 0x7a8f4c];
    const gc = () => greens[Math.floor(R() * greens.length)];
    const add = (list: Inst[], x: number, z: number, s: number, y = 0) => list.push([x, y, z, R() * 6.28, s * (0.85 + R() * 0.3), gc()]);
    // avenue sidewalks
    for (let x = -4.75; x <= 4.8; x += 0.42) {
      if (x > 0.5 && x < 1.6) continue;
      if (!(x > -3.75 && x < -3.25)) add(broad, x, 0.63, 0.85);
      if (!(x > -2.4 && x < -1.6) && !(x > -1.75 && x < -0.5)) add(broad, x + 0.2, 1.27, 0.85);
    }
    // cross-street avenue of columnar Ashoka trees
    for (let z = -3.7; z <= 0.4; z += 0.32) {
      add(columnar, 0.78, z, 1);
      add(columnar, 1.32, z, 1);
    }
    // back edge + left edge screening
    for (let x = -4.85; x <= 4.85; x += 0.26) if (x < -2.15 || x > 0.65) add(columnar, x, -3.86, 1.1);
    for (let z = -3.4; z <= 0.4; z += 0.28) add(columnar, -4.9, z, 1.05);
    for (let z = 1.5; z <= 3.8; z += 0.3) add(broad, -4.9, z, 0.8);
    // residential garden
    for (let i = 0; i < 14; i++) {
      const x = lerp(-4.7, -2.45, R()),
        z = lerp(-0.95, 0.4, R());
      if (x > -3.75 && x < -3.25) continue;
      if (Math.hypot(x + 2.85, z + 0.25) < 0.28) continue;
      add(broad, x, z, 0.9 + R() * 0.3);
    }
    // podium deck
    for (const [x, z] of [
      [-4.2, -2.75],
      [-4.25, -2.3],
      [-2.6, -2.75],
      [-2.6, -1.3],
      [-3.0, -1.3],
    ])
      add(broad, x, z, 0.65, 0.3);
    // office plaza: double row
    for (let x = 1.6; x <= 3.05; x += 0.3) {
      add(broad, x, -1.45, 0.8);
      add(columnar, x, 0.38, 0.9);
    }
    for (let x = 3.55; x <= 4.7; x += 0.3) add(broad, x, -1.88, 0.7);
    // vacant plot scrub
    for (let i = 0; i < 12; i++) add(broad, lerp(3.4, 4.7, R()), lerp(-1.6, 0.3, R()), 0.35 + R() * 0.25);
    // mall forecourt palms, bank plaza palms
    for (let x = 1.4; x <= 4.6; x += 0.4) if (Math.abs(x - 2.95) > 0.5) add(palms, x, 3.82, 1);
    for (const x of [1.6, 4.3]) add(palms, x, 3.2, 1);
    for (const x of [-0.45, 0.95]) add(palms, x, 3.6, 0.95);
    add(palms, -0.45, 2.0, 0.9);
    // warehouse yard edge
    for (let x = -4.6; x <= -2.0; x += 0.3) add(broad, x, 1.43, 0.6);

    inst(g0, broadC, canopyMat, broad);
    inst(g0, broadT, trunkMat, broad.map(([x, y, z, ry, s]) => [x, y, z, ry, s] as Inst));
    inst(g0, colC, canopyMat, columnar.map(([x, y, z, ry, s]) => [x, y, z, ry, s, [0x3f5a34, 0x48653a, 0x52703e][Math.floor(R() * 3)]] as Inst));
    inst(g0, colT, trunkMat, columnar.map(([x, y, z, ry, s]) => [x, y, z, ry, s] as Inst));
    inst(g0, palmT, trunkMat, palms.map(([x, y, z, ry, s]) => [x, y, z, ry, s] as Inst));
    inst(g0, palmF, palmMat, palms.map(([x, y, z, ry, s]) => [x, y, z, ry, s, [0x5f8a3e, 0x6e9446][Math.floor(R() * 2)]] as Inst));

    // cars
    const carBody = roundedBox(THREE, 0.13, 0.034, 0.06, 0.012).translate(0, 0.024, 0);
    const carTop = roundedBox(THREE, 0.068, 0.028, 0.054, 0.011).translate(-0.008, 0.05, 0);
    const pal = [0xf2f2f0, 0xc9ccd0, 0x8c9198, 0x2b2f35, 0xa83a32, 0x2f5d8a, 0xf2f2f0, 0xb8b1a4];
    const cars: Inst[] = [];
    const car = (x: number, z: number, ry: number) => cars.push([x, 0, z, ry, 1, pal[Math.floor(R() * pal.length)]]);
    for (const [z, dir] of [
      [0.78, 0],
      [0.87, 0],
      [1.03, Math.PI],
      [1.12, Math.PI],
    ] as [number, number][]) {
      let x = -4.8 + R() * 0.5;
      while (x < 4.8) {
        if (Math.abs(x - 1.05) > 0.3) car(x, z, dir);
        x += 0.45 + R() * 1.0;
      }
    }
    for (let z = -3.6; z < 0.5; z += 0.6 + R() * 0.6) car(R() < 0.5 ? 0.96 : 1.14, z, R() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    for (let z = 1.55; z < 2.95; z += 0.16) {
      if (R() < 0.75) car(-1.45, z, 0);
      if (R() < 0.75) car(-0.75, z, Math.PI);
    }
    for (let x = 1.4; x < 4.7; x += 0.2) if (R() < 0.55) car(x, 3.6 + (R() < 0.5 ? -0.03 : 0.03), R() < 0.5 ? 0 : Math.PI);
    car(-3.5, -0.75, Math.PI / 2);
    car(-1.25, 0.45, 0);
    car(-1.65, 0.45, 0);
    car(2.2, -1.65, 0);
    inst(g0, carBody, carMat, cars);
    inst(g0, carTop, carGlass, cars.map(([x, y, z, ry]) => [x, y, z, ry] as Inst));

    // trucks at the docks + one on the avenue
    const trailer = roundedBox(THREE, 0.115, 0.13, 0.46, 0.01).translate(0, 0.095, 0);
    const cabG = roundedBox(THREE, 0.11, 0.11, 0.1, 0.018).translate(0, 0.075, 0.3);
    const chassis = mergeInto(THREE, [
      bb(-0.05, 0.05, 0.012, 0.03, -0.23, 0.35),
      ...[-0.17, -0.08, 0.3].flatMap((z) => [-0.05, 0.05].map((x) => new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8).rotateZ(Math.PI / 2).translate(x, 0.02, z))),
    ]);
    const trucks: Inst[] = [];
    const tc = [0x2f5d8a, 0xd96c2b, 0xf2f2f0, 0x1e9e76];
    for (const [i, k] of [
      [0, 0],
      [2, 1],
      [3, 2],
      [5, 3],
    ])
      trucks.push([WH.x0 + 0.25 + i * 0.33, 0, WH.z1 + 0.29, 0, 1, tc[k]]);
    trucks.push([-2.6, 0, 1.05, -Math.PI / 2, 1, 0xd96c2b]);
    inst(g0, trailer, trailerMat, trucks.map(([x, y, z, ry]) => [x, y, z, ry] as Inst));
    inst(g0, cabG, carMat, trucks);
    inst(g0, chassis, darkMat, trucks.map(([x, y, z, ry]) => [x, y, z, ry] as Inst));

    // streetlights
    const pole = mergeInto(THREE, [bar(THREE, [0, 0, 0], [0, 0.26, 0], 0.0035, 5), bar(THREE, [0, 0.26, 0], [0, 0.27, 0.05], 0.003, 4)]);
    const lamp = bb(-0.012, 0.012, 0.262, 0.272, 0.04, 0.07);
    const lights: Inst[] = [];
    for (let x = -4.5; x <= 4.6; x += 0.85) {
      if (Math.abs(x - 1.05) < 0.35) continue;
      lights.push([x, 0, 0.66, 0]);
      lights.push([x + 0.42, 0, 1.24, Math.PI]);
    }
    for (let z = -3.4; z <= 0.3; z += 0.85) lights.push([1.3, 0, z, -Math.PI / 2]);
    inst(g0, pole, poleMat, lights);
    inst(g0, lamp, lampMat, lights);
  }

  // ================================================================ building systems (layer 2)
  {
    // ---- residential: plumbing risers, roof tanks, finishes, lifts
    const px = RX + RW / 2 - 0.14,
      pz = RZ + RD / 2 - 0.14;
    const blue: T.BufferGeometry[] = [],
      grey: T.BufferGeometry[] = [],
      red: T.BufferGeometry[] = [];
    blue.push(bar(THREE, [px, -0.3, pz], [px, RTOP + 0.12, pz], 0.017, 8));
    grey.push(bar(THREE, [px + 0.045, -0.3, pz], [px + 0.045, RTOP + 0.05, pz], 0.02, 8));
    red.push(bar(THREE, [px, -0.3, pz - 0.05], [px, RTOP, pz - 0.05], 0.013, 8));
    for (let k = 1; k <= RFL; k++) {
      const y = RPOD + (k - 1) * FH + 0.045;
      blue.push(bar(THREE, [px, y + 0.02, pz], [px - 0.3, y + 0.02, pz], 0.005, 5));
      blue.push(bar(THREE, [px, y + 0.02, pz], [px, y + 0.02, pz - 0.28], 0.005, 5));
      grey.push(bar(THREE, [px + 0.04, y, pz], [px - 0.25, y - 0.01, pz + 0.04], 0.007, 5));
    }
    // overhead tanks on the roof (black rotomoulded) + header pipe
    const tanks: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const tx = RX - 0.25 + i * 0.2,
        tz = RZ + 0.25;
      tanks.push(lathe(THREE, [[0, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.13], [0.06, 0.15], [0.02, 0.16], [0, 0.16]], 16).translate(tx, RTOP, tz));
    }
    merged(g2, tanks, tankMat);
    blue.push(bar(THREE, [RX - 0.25, RTOP + 0.08, RZ + 0.25], [px, RTOP + 0.08, RZ + 0.25], 0.008, 6));
    blue.push(bar(THREE, [px, RTOP + 0.08, RZ + 0.25], [px, RTOP + 0.12, pz], 0.008, 6));
    merged(g2, blue, pipeBlue);
    merged(g2, grey, pipeGrey);
    merged(g2, red, pipeRed);
    // finishes on floors 5–9: tiled floors, painted partitions, sanitaryware, kitchen, furniture
    const plan = roundRect(RX, RZ, RW - 0.06, RD - 0.06, 0.09, 4);
    const tiles: T.BufferGeometry[] = [],
      pA: T.BufferGeometry[] = [],
      pB: T.BufferGeometry[] = [],
      cer: T.BufferGeometry[] = [],
      gra: T.BufferGeometry[] = [],
      fab: T.BufferGeometry[] = [],
      wd: T.BufferGeometry[] = [];
    for (let k = 0; k < RFL; k++) {
      const y = RPOD + k * FH;
      tiles.push(cap(plan, y + 0.002, false, 0.12));
      const wh = FH - 0.035;
      const P = k % 2 ? pA : pB;
      P.push(bb(RX - 0.5, RX + 0.5, y, y + wh, RZ + 0.08, RZ + 0.092)); // spine wall
      P.push(bb(RX + 0.12, RX + 0.132, y, y + wh, RZ + 0.092, RZ + 0.45)); // bathroom wall
      P.push(bb(RX - 0.2, RX - 0.188, y, y + wh, RZ + 0.092, RZ + 0.45));
      // bathroom: WC + basin + shower tray
      cer.push(roundedBox(THREE, 0.035, 0.03, 0.05, 0.01).translate(px - 0.06, y + 0.017, pz + 0.04));
      cer.push(roundedBox(THREE, 0.045, 0.015, 0.03, 0.006).translate(px - 0.14, y + 0.07, pz + 0.07));
      cer.push(bb(px - 0.12, px - 0.02, y + 0.002, y + 0.008, pz - 0.12, pz - 0.04));
      // kitchen counter
      gra.push(bb(RX - 0.18, RX + 0.1, y, y + 0.04, RZ + 0.38, RZ + 0.43));
      // sofa + bed
      fab.push(roundedBox(THREE, 0.18, 0.035, 0.06, 0.012).translate(RX - 0.35, y + 0.02, RZ + 0.3));
      cer.push(roundedBox(THREE, 0.16, 0.03, 0.2, 0.01).translate(RX + 0.28, y + 0.017, RZ - 0.25));
      fab.push(bb(RX + 0.2, RX + 0.36, y + 0.032, y + 0.036, RZ - 0.3, RZ - 0.16));
      wd.push(bb(RX - 0.42, RX - 0.28, y, y + 0.03, RZ + 0.15, RZ + 0.22));
    }
    merged(g2, tiles, floorTile);
    merged(g2, pA, paintA);
    merged(g2, pB, paintB);
    merged(g2, cer, ceramic);
    merged(g2, gra, granite);
    merged(g2, fab, fabric);
    merged(g2, wd, wood);
    // lifts in the residential core
    const lifts: T.BufferGeometry[] = [];
    const rails: T.BufferGeometry[] = [];
    const rcx = RX - 0.12,
      rcz = RZ - 0.08;
    for (const [dx, y] of [
      [-0.095, 1.25],
      [0.095, 2.85],
    ]) {
      lifts.push(roundedBox(THREE, 0.14, 0.17, 0.24, 0.01).translate(rcx + dx, y, rcz));
      for (const s of [-1, 1]) rails.push(bb(rcx + dx + s * 0.075, rcx + dx + s * 0.075 + 0.004, 0, RTOP + 0.15, rcz - 0.002, rcz + 0.002));
    }
    // ---- office: lifts, electrical riser + trays, HVAC ducts, roof plant
    const ocx = OX - 0.05,
      ocz = OZ - 0.08;
    for (const [dx, y] of [
      [-0.155, 0.9],
      [0, 2.3],
      [0.155, 3.3],
    ]) {
      lifts.push(roundedBox(THREE, 0.13, 0.17, 0.22, 0.01).translate(ocx + dx, y, ocz));
      for (const s of [-1, 1]) rails.push(bb(ocx + dx + s * 0.07, ocx + dx + s * 0.07 + 0.004, 0, OTOP + 0.18, ocz - 0.002, ocz + 0.002));
    }
    // lift machine on the cores
    lifts.push(bb(ocx - 0.2, ocx + 0.2, OTOP + 0.21, OTOP + 0.27, ocz - 0.1, ocz + 0.1));
    merged(g2, lifts, liftMat);
    merged(g2, rails, railMat);
    const ex = OX + 0.32,
      ez = OZ + 0.22;
    const cables: T.BufferGeometry[] = [],
      trays: T.BufferGeometry[] = [],
      bus: T.BufferGeometry[] = [];
    trays.push(bb(ex - 0.04, ex + 0.04, -0.2, OTOP, ez - 0.004, ez));
    for (const [o, r] of [
      [-0.024, 0.011],
      [0, 0.012],
      [0.024, 0.011],
    ])
      cables.push(bar(THREE, [ex + o, -0.2, ez + 0.009], [ex + o, OTOP, ez + 0.009], r, 6));
    bus.push(bb(ex + 0.06, ex + 0.09, -0.2, OTOP, ez - 0.015, ez + 0.015));
    for (let k = 0; k < OFL; k++) {
      const y = OLOB + (k + 1) * FH - 0.04;
      trays.push(bb(OX - 0.55, ex + 0.05, y, y + 0.006, ez + 0.03, ez + 0.09));
      cables.push(bb(OX - 0.55, ex + 0.05, y + 0.006, y + 0.014, ez + 0.04, ez + 0.08));
      // tap-off box on the busduct
      bus.push(bb(ex + 0.055, ex + 0.1, y - 0.06, y - 0.02, ez + 0.015, ez + 0.035));
    }
    merged(g2, cables, cableMat);
    merged(g2, trays, trayMat);
    merged(g2, bus, busMat);
    // HVAC: riser duct + floor ducts with diffusers
    const dx0 = OX - 0.42,
      dz0 = OZ - 0.3;
    const ducts: T.BufferGeometry[] = [bb(dx0 - 0.045, dx0 + 0.045, 0.2, OTOP + 0.05, dz0 - 0.045, dz0 + 0.045)];
    for (let k = 0; k < OFL; k++) {
      const y = OLOB + (k + 1) * FH - 0.055;
      ducts.push(bb(dx0, OX + 0.55, y, y + 0.03, dz0 - 0.03, dz0 + 0.03));
      ducts.push(bb(dx0 - 0.03, dx0 + 0.03, y, y + 0.03, dz0, OZ + 0.42));
    }
    merged(g2, ducts, ductMat);
    // office fit-out: carpet tiles + workstation rows on every floor
    const carp: T.BufferGeometry[] = [],
      desks: T.BufferGeometry[] = [];
    const oplan = inset(chamferRect(OX, OZ, OW, OD, 0.18), 0.03, OX, OZ);
    for (let k = 0; k < OFL; k++) {
      const y = OLOB + k * FH;
      carp.push(cap(oplan, y + 0.002));
      for (const dz of [0.3, -0.42])
        for (const dx of [-0.42, -0.14, 0.14, 0.42]) {
          if (dz < 0 && dx < 0) continue;
          desks.push(bb(OX + dx - 0.1, OX + dx + 0.1, y + 0.03, y + 0.036, OZ + dz - 0.06, OZ + dz + 0.06));
          desks.push(bb(OX + dx - 0.004, OX + dx + 0.004, y, y + 0.03, OZ + dz - 0.004, OZ + dz + 0.004));
        }
    }
    merged(g2, carp, carpet);
    merged(g2, desks, deskMat);
    // roof plant: air-cooled chillers, cooling tower, AHU, rooftop duct
    const plant: T.BufferGeometry[] = [],
      pdark: T.BufferGeometry[] = [],
      fans: T.BufferGeometry[] = [];
    for (const dz of [-0.27, 0.0]) {
      plant.push(roundedBox(THREE, 0.5, 0.12, 0.2, 0.01).translate(OX + 0.18, OTOP + 0.06, OZ + dz + 0.06));
      for (let i = 0; i < 4; i++) fans.push(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14).translate(OX - 0.03 + i * 0.13, OTOP + 0.126, OZ + dz + 0.06));
    }
    pdark.push(bb(OX - 0.5, OX - 0.28, OTOP, OTOP + 0.17, OZ + 0.1, OZ + 0.35)); // cooling tower
    fans.push(new THREE.CylinderGeometry(0.075, 0.08, 0.04, 16).translate(OX - 0.39, OTOP + 0.19, OZ + 0.225));
    plant.push(roundedBox(THREE, 0.24, 0.1, 0.14, 0.01).translate(OX - 0.38, OTOP + 0.05, OZ - 0.3)); // AHU
    merged(g2, plant, plantMat);
    merged(g2, pdark, plantDark);
    merged(g2, fans, fanMat);
    merged(g2, [bb(dx0 - 0.045, OX - 0.26, OTOP + 0.02, OTOP + 0.07, dz0 - 0.045, dz0 + 0.045)], roofDuct);
    // residential lift machine room (part of the roof skyline)
    merged(g2, [bb(rcx - 0.2, rcx + 0.2, RTOP + 0.19, RTOP + 0.24, rcz - 0.16, rcz + 0.16)], plantDark);
  }

  // ================================================================ land & capital (layer 3)
  {
    // Survey overlay + pegs at plot corners + a total station on the vacant plot.
    const ov = new THREE.PlaneGeometry(GX, GZ);
    ov.rotateX(-Math.PI / 2);
    const om = mesh(g3, ov, landMat, [0, 0.006, 0]);
    om.renderOrder = 2;
    const pegs: T.BufferGeometry[] = [],
      caps: T.BufferGeometry[] = [];
    const seen = new Set<string>();
    for (const p of plots) {
      const [x0, x1, z0, z1] = p.r;
      for (const [x, z] of [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ]) {
        const key = `${x.toFixed(2)},${z.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pegs.push(bb(x - 0.012, x + 0.012, 0, 0.06, z - 0.012, z + 0.012));
        caps.push(bb(x - 0.014, x + 0.014, 0.06, 0.075, z - 0.014, z + 0.014));
      }
    }
    merged(g3, pegs, pegMat);
    merged(g3, caps, pegCap);
    const ts: T.BufferGeometry[] = [];
    const tx = 4.05,
      tz = -0.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ts.push(bar(THREE, [tx + Math.cos(a) * 0.06, 0, tz + Math.sin(a) * 0.06], [tx, 0.13, tz], 0.0035, 4));
    }
    ts.push(roundedBox(THREE, 0.035, 0.04, 0.03, 0.006).translate(tx, 0.15, tz));
    merged(g3, ts, surveyMat);

    // Foundations: piles, rafts, basements.
    const piles: T.BufferGeometry[] = [];
    const rafts: T.BufferGeometry[] = [];
    const bwalls: T.BufferGeometry[] = [];
    const pileGrid = (x0: number, x1: number, z0: number, z1: number, nx: number, nz: number, top: number, bottom: number, r = 0.028) => {
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const x = lerp(x0, x1, nx === 1 ? 0.5 : i / (nx - 1)),
            z = lerp(z0, z1, nz === 1 ? 0.5 : j / (nz - 1));
          piles.push(new THREE.CylinderGeometry(r, r * 0.9, top - bottom, 8).translate(x, (top + bottom) / 2, z));
        }
    };
    const basement = (x0: number, x1: number, z0: number, z1: number, depth: number) => {
      const p = rectPts(x0, x1, z0, z1);
      bwalls.push(walls(p, -depth, -0.005, 1, 1));
      rafts.push(slab(inset(p, -0.04, (x0 + x1) / 2, (z0 + z1) / 2), -depth, 0.06));
      rafts.push(slab(inset(p, 0.01, (x0 + x1) / 2, (z0 + z1) / 2), -depth / 2, 0.02));
    };
    // residential: two-level basement under the podium, piled raft
    basement(-4.25, -2.55, -2.8, -1.15, 0.3);
    pileGrid(-4.1, -2.7, -2.65, -1.3, 5, 5, -0.36, -SOIL + 0.04);
    // office + wing
    basement(1.65, 3.05, -2.8, -1.6, 0.3);
    pileGrid(1.75, 2.95, -2.7, -1.7, 5, 4, -0.36, -SOIL + 0.04);
    rafts.push(bb(3.5, 4.7, -0.12, -0.02, -3.1, -2.1));
    pileGrid(3.6, 4.6, -3.0, -2.2, 3, 3, -0.12, -SOIL + 0.06);
    // tower under construction: piled raft + crane base piles
    rafts.push(bb(CX - 0.56, CX + 0.56, -0.13, -0.02, CZ - 0.56, CZ + 0.56));
    pileGrid(CX - 0.45, CX + 0.45, CZ - 0.45, CZ + 0.45, 4, 4, -0.13, -SOIL + 0.04);
    rafts.push(bb(-0.52, -0.24, -0.1, -0.01, -3.09, -2.81));
    pileGrid(-0.47, -0.29, -3.04, -2.86, 2, 2, -0.1, -0.45, 0.02);
    // mall: isolated pad footings under the column grid
    for (let x = MALL.x0 + 0.25; x < MALL.x1 - 0.1; x += 0.45)
      for (let z = MALL.z0 + 0.25; z < MALL.z1 - 0.1; z += 0.45) {
        rafts.push(bb(x - 0.07, x + 0.07, -0.24, -0.19, z - 0.07, z + 0.07));
        piles.push(bb(x - 0.022, x + 0.022, -0.19, -0.01, z - 0.022, z + 0.022));
      }
    // warehouse: pad footings under the portal columns + ground-bearing slab
    for (let x = WH.x0 + 0.05; x <= WH.x1; x += 0.42)
      for (const z of [WH.z0 + 0.02, WH.z1 - 0.02]) rafts.push(bb(x - 0.06, x + 0.06, -0.14, -0.1, z - 0.06, z + 0.06));
    rafts.push(bb(WH.x0, WH.x1, -0.05, -0.012, WH.z0, WH.z1));
    // metro piers: pile caps + piles
    for (let x = -4.4; x <= 4.6; x += 1.5) {
      rafts.push(bb(x - 0.08, x + 0.08, -0.1, -0.01, 0.95 - 0.1, 0.95 + 0.1));
      pileGrid(x - 0.05, x + 0.05, 0.89, 1.01, 2, 2, -0.1, -0.5, 0.018);
    }
    merged(g3, piles, pileMat);
    merged(g3, rafts, raftMat);
    merged(g3, bwalls, baseWall);

    // Utility trench under the avenue's north sidewalk, with service branches.
    const TZ = 0.6,
      TY0 = -0.28;
    merged(
      g3,
      [
        bb(-5, 5, TY0, TY0 + 0.02, TZ - 0.13, TZ + 0.13),
        bb(-5, 5, TY0, -0.01, TZ - 0.13, TZ - 0.11),
        bb(-5, 5, TY0, -0.01, TZ + 0.11, TZ + 0.13),
      ],
      trenchMat
    );
    const wP: T.BufferGeometry[] = [bar(THREE, [-5, TY0 + 0.08, TZ - 0.06], [5, TY0 + 0.08, TZ - 0.06], 0.03, 10)];
    const sP: T.BufferGeometry[] = [bar(THREE, [-5, TY0 + 0.07, TZ + 0.045], [5, TY0 + 0.07, TZ + 0.045], 0.045, 10)];
    const pP: T.BufferGeometry[] = [];
    for (const o of [-0.03, 0, 0.03]) pP.push(bar(THREE, [-5, TY0 + 0.17, TZ + o], [5, TY0 + 0.17, TZ + o], 0.012, 6));
    const gP: T.BufferGeometry[] = [bar(THREE, [-5, TY0 + 0.15, TZ - 0.08], [5, TY0 + 0.15, TZ - 0.08], 0.013, 6)];
    for (const [x, dir, end] of [
      [-3.3, -1, -1.15],
      [-1.5, -1, -0.18],
      [-0.9, -1, -1.6],
      [2.2, -1, -1.6],
      [-3.2, 1, 1.6],
      [0.25, 1, 1.9],
      [3.0, 1, 1.6],
    ] as [number, number, number][]) {
      const z0 = TZ + dir * 0.13;
      wP.push(bar(THREE, [x, TY0 + 0.08, z0], [x, TY0 + 0.08, end], 0.012, 6));
      pP.push(bar(THREE, [x + 0.05, TY0 + 0.17, z0], [x + 0.05, TY0 + 0.17, end], 0.01, 6));
      sP.push(bar(THREE, [x - 0.05, TY0 + 0.05, end], [x - 0.05, TY0 + 0.07, z0], 0.016, 6));
    }
    // manholes
    for (const x of [-3.8, -0.4, 2.6]) wP.push(new THREE.CylinderGeometry(0.035, 0.035, -TY0, 10, 1, true).translate(x, TY0 / 2, TZ));
    merged(g3, wP, uWater);
    merged(g3, sP, uSewer);
    merged(g3, pP, uPower);
    merged(g3, gP, uGas);
  }

  // ================================================================ levels
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  const pw = (v: number, keys: [number, number][]) => {
    if (v <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, va] = keys[i],
        [b, vb] = keys[i + 1];
      if (v <= b) return lerp(va, vb, (v - a) / (b - a));
    }
    return keys[keys.length - 1][1];
  };
  return {
    applyLevel(v: number) {
      L.set("shell", pw(v, [[0, 1], [0.75, 0.12], [1, 0.08], [2, 0.05], [3, 0.04]]));
      L.set("struct", pw(v, [[0, 1], [1, 1], [1.6, 0.18], [2, 0.14], [3, 0.08]]));
      L.set("core", pw(v, [[0, 1], [1, 1], [1.7, 0.16], [3, 0.1]]));
      L.set("site", pw(v, [[0, 1], [1, 1], [1.8, 0.16], [3, 0.1]]));
      L.set("ctx", pw(v, [[0, 1], [1, 0.75], [2, 0.3], [3, 0.12]]));
      L.set("sys", pw(v, [[0, 0], [1, 0], [1.6, 0.85], [2, 1], [2.5, 0.35], [3, 0.08]]));
      L.set("roofp", pw(v, [[0, 1], [1, 0.45], [2, 1], [3, 0.1]]));
      L.set("found", pw(v, [[0, 0], [2.15, 0], [2.75, 1], [3, 1]]));
      L.set("soil", pw(v, [[0, 1], [2, 1], [3, 0.36]]));
      L.set("ground", pw(v, [[0, 1], [2, 1], [3, 0.3]]));
      L.set("land", pw(v, [[0, 0], [2.2, 0], [3, 1]]));
      L.set("bank", pw(v, [[0, 1], [1, 0.7], [2, 0.4], [3, 1]]));
      const gnd = pw(v, [[0, 1], [2, 1], [3, 0.25]]);
      for (const s of shadows) {
        s.m.opacity = s.base * gnd;
        s.m.visible = s.m.opacity > 0.01;
      }
      const f1 = tri(v, 1),
        f2 = tri(v, 2),
        f3 = clamp01(v - 2);
      focusCrane(f1 * 0.28);
      focusSteel(f1 * 0.45);
      focusCement(f1 * 0.25);
      focusPlumb(f2 * 0.5);
      focusElec(f2 * 0.45);
      focusLift(f2 * 0.3);
      focusTile(f2 * 0.12);
      focusBank(f3 * 0.28);
      focusVault(f3 * 0.35);
      focusPile(f3 * 0.18);
    },
  };
}
