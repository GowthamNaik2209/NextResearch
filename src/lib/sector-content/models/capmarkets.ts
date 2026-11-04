// Capital Markets: a miniature financial-district block on a display plinth.
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · A raised podium block. At street level: a front plaza with a fountain,
//     benches and investors on their phones; a glass asset-manager tower with
//     its podium NAV screen (front left) and an older fund-house block behind
//     it; a glazed fund & insurance distribution pavilion with kiosks (front
//     right); parked cars to the east and a road along the front.
//   · In the middle, a generic two-storey "market house" (no real exchange's
//     building or logo): curtain-wall facade with a scrolling LED ticker band.
//       - Upper floor: an investment-bank deal room (west), a retail-broker
//         trading floor of multi-screen desks under a big order-book wall
//         (centre) and a wealth-management lounge (east).
//       - Ground floor: the exchange hall - a curved, animated ticker wall in
//         front of arcs of market-operations desks, a glass matching-engine
//         room of server racks (east) and a ratings office with its rating
//         scale board and report shelves (west).
//       - Basement, sunk into the podium behind a round vault door: the
//         depository data hall (rows of blinking racks under cable trays) and
//         the registrar & fund-admin hall (archive shelving, racks, scanning).
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Investors & AMCs        street, plaza, AMC tower, distribution pavilion, shell
//   1 Brokers & Wealth        shell + roof ghost away -> upper floor
//   2 Exchanges & Ratings     upper floor + its slab ghost -> exchange hall
//   3 Market Infrastructure   hall + ground slab ghost -> basement vault halls
// The ticker wall, facade band and rack LEDs animate (animated: true).
import type * as T from "three";
import {
  type Three,
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

// ------------------------------------------------------------------ key dims
const S = 0.5; // street level (top of the podium)
const H1 = 0.95; // exchange-hall height
const U = S + H1; // underside of the upper floor slab
const UF = U + 0.03; // upper floor level
const RF = 2.26; // roof slab underside
const B0 = 0.06; // basement floor
const BX0 = -2.2,
  BX1 = 2.4,
  BZ0 = -2.5,
  BZ1 = 0.7; // main building footprint
const QX0 = -2.1,
  QX1 = 2.3,
  QZ0 = -2.4,
  QZ1 = 0.6; // basement pit
const PX = 4.7,
  PZ = 3.5,
  PR = 0.4; // plinth half-sizes + corner radius

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/capmarkets.ts); sides, order and the exact
// spot on each part are set so no leader line crosses another or runs through another label,
// in every camera view on desktop and phone (scripts/check-crossings.mjs):
// left ibanking, amc, registrars, depositories; right exchanges, wealth; top ratings,
// brokers; bottom distribution.
export const CAPMARKETS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: street
  amc: { pos: [-3.55, S + 0.25, 1.62], side: "left" }, // AMC tower podium sign
  distribution: { pos: [3.58, S + 0.37, 2.72], side: "bottom" }, // distribution pavilion fascia
  // layer 1: upper floor
  ibanking: { pos: [-1.55, UF + 0.12, -1.3], side: "left" }, // deal-room table
  brokers: { pos: [0.3, UF + 0.25, -1.45], side: "top" }, // trading desks (second row)
  wealth: { pos: [1.8, UF + 0.1, -0.9], side: "right" }, // lounge sofa
  // layer 2: exchange hall
  exchanges: { pos: [1.0, S + 0.65, -2.109], side: "right" }, // ticker wall (just in front of its curve)
  ratings: { pos: [-1.83, S + 0.4, -2.4], side: "top" }, // rating-scale board
  // layer 3: basement
  depositories: { pos: [1.25, B0 + 0.36, -1.35], side: "left" }, // depository racks
  registrars: { pos: [-1.05, B0 + 0.31, -1.65], side: "left" }, // archive shelving
};

export const CAPMARKETS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.2, 6.6, 9.2],
    target: [0, 0.9, 0.05],
    narration:
      "Welcome to the capital markets block. Money flows inward: savers on the plaza buy funds from asset managers and distributors, brokers and wealth managers route their orders, the exchange matches them, and in the vault below depositories and registrars keep the record of who owns what. Peel the building layer by layer, from the street to the vault.",
  },
  {
    id: "street",
    layer: 0,
    label: "Street",
    pos: [0.6, 3.9, 10.6],
    target: [-0.1, 0.8, 1.0],
    narration:
      "Street level is where savings enter the market. The glass tower on the left is an asset manager, like HDFC AMC or Nippon Life, running mutual funds; on the right a distribution pavilion sells funds and insurance, the business of Prudent Corporate and PolicyBazaar. Investors on the plaza mostly do it all from their phones.",
  },
  {
    id: "floor",
    layer: 1,
    label: "Broker Floor",
    pos: [4.6, 6.6, 5.4],
    target: [0.1, UF, -0.9],
    narration:
      "Up on the first floor sit the intermediaries. The centre is a retail broker's trading floor under a big order-book screen - Angel One, Groww and Motilal Oswal earn from these orders. On the right is a wealth lounge, the world of 360 ONE and Anand Rathi, and on the left an investment bank's deal room where firms like JM Financial take companies public.",
  },
  {
    id: "hall",
    layer: 2,
    label: "Exchange Hall",
    pos: [3.6, 4.0, 4.4],
    target: [0.1, S + 0.35, -1.3],
    narration:
      "The ground floor is the exchange hall. A curved ticker wall faces arcs of market-operations desks, and behind the glass on the right the matching-engine racks pair every buy with a sell - this is what NSE, BSE and MCX run. In the office on the left, rating agencies such as CRISIL, ICRA and CARE grade the bonds that list here.",
  },
  {
    id: "vault",
    layer: 3,
    label: "Vault",
    pos: [3.2, 4.4, 3.6],
    target: [0.1, B0 + 0.1, -0.9],
    narration:
      "Below the hall, behind the vault door, is the plumbing every trade depends on. On the right, the depository data hall holds investors' shares in electronic form, the business of CDSL and NSDL. On the left, registrars like CAMS and KFin Technologies keep the records of fund and share holders, with archive shelves, servers and scanning desks.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the plaza and road along the front, the asset-manager tower and fund house on the left, the distribution pavilion and parking on the right, and the market house in the middle, with its broker floor, exchange hall and vault stacked one above the other.",
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

type Item = { p: Vec3; ry?: number; s?: Vec3; c?: number };

export function buildCapmarkets(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [streetG, upG, hallG, coreG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const R = rng(20261103);

  const std = (color: number, metalness = 0.2, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop = r) =>
    new THREE.CylinderGeometry(rTop, r, h, seg).translate(x, y + h / 2, z);
  /** Horizontal plane (floor) over [x0,x1]x[z0,z1] at y, uv 0..1 with v=1 at the north edge. */
  const floorPlane = (x0: number, x1: number, z0: number, z1: number, y: number) =>
    new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  /** Vertical plane facing +z (ry rotates it), centred at (x, y, z). */
  const vPlane = (w: number, h: number, x: number, y: number, z: number, ry = 0) =>
    new THREE.PlaneGeometry(w, h).rotateY(ry).translate(x, y, z);
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };

  // ---------------------------------------------------------------- batching
  // Every (group, material) pair becomes one merged mesh -> few draw calls.
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, ...geos: T.BufferGeometry[]) => {
    const k = parent.uuid + "|" + mat.uuid;
    if (!batches.has(k)) batches.set(k, { parent, mat, geos: [] });
    batches.get(k)!.geos.push(...geos);
  };
  const dummy = new THREE.Object3D();
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], items: Item[]) => {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const col = new THREE.Color();
    items.forEach((it, i) => {
      dummy.position.set(it.p[0], it.p[1], it.p[2]);
      dummy.rotation.set(0, it.ry ?? 0, 0);
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

  // ---------------------------------------------------------------- textures
  const font = (px: number, w = "bold") => `${w} ${px}px Arial, Helvetica, sans-serif`;
  const SECTORS = ["BANKS", "IT", "AUTO", "PHARMA", "METALS", "FMCG", "ENERGY", "INFRA", "REALTY", "MEDIA", "PSU", "CHEM"];

  // Ground: paving, plaza, road, parking and planting, drawn to the plinth's plan.
  const GX = 2 * PX,
    GZ = 2 * PZ,
    GS = 160;
  const groundTex = canvasTexture(THREE, GX * GS, GZ * GS, (g) => {
    const P = (x: number, z: number): [number, number] => [(x + PX) * GS, (z + PZ) * GS];
    const rect = (x0: number, z0: number, x1: number, z1: number, c: string) => {
      const [a, b] = P(x0, z0);
      g.fillStyle = c;
      g.fillRect(a, b, (x1 - x0) * GS, (z1 - z0) * GS);
    };
    const grid = (x0: number, z0: number, x1: number, z1: number, step: number, c: string) => {
      g.strokeStyle = c;
      g.lineWidth = 1;
      for (let x = x0; x <= x1 + 1e-6; x += step) {
        g.beginPath();
        g.moveTo(...P(x, z0));
        g.lineTo(...P(x, z1));
        g.stroke();
      }
      for (let z = z0; z <= z1 + 1e-6; z += step) {
        g.beginPath();
        g.moveTo(...P(x0, z));
        g.lineTo(...P(x1, z));
        g.stroke();
      }
    };
    rect(-PX, -PZ, PX, PZ, "#a9adb1"); // sidewalk paving
    grid(-PX, -PZ, PX, PZ, 0.2, "rgba(0,0,0,0.08)");
    // Planted strip along the back.
    rect(-PX, -PZ, PX, -2.72, "#5d7a48");
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = i % 2 ? "#587443" : "#64824e";
      const [a, b] = P(lerp(-PX, PX, R()), lerp(-PZ, -2.72, R()));
      g.fillRect(a, b, 3, 3);
    }
    // Front road with lane markings and a zebra crossing.
    rect(-PX, 2.78, PX, PZ, "#3a3d42");
    g.fillStyle = "#e9e6dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.13);
      g.fillRect(a, b, 0.25 * GS, 3);
    }
    for (let x = -0.35; x < 0.45; x += 0.12) {
      const [a, b] = P(x, 2.8);
      g.fillRect(a, b, 0.06 * GS, 0.62 * GS);
    }
    rect(-PX, 2.72, PX, 2.78, "#d6d8da"); // kerb
    // Plaza: lighter stone with a radial pattern round the fountain.
    rect(-2.6, 0.72, 2.75, 2.66, "#cfc8bb");
    grid(-2.6, 0.72, 2.75, 2.66, 0.3, "rgba(80,60,40,0.12)");
    const [fx, fz] = P(0.15, 1.75);
    for (let r = 0.3; r < 1.0; r += 0.18) {
      g.strokeStyle = "rgba(120,96,70,0.35)";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(fx, fz, r * GS, 0, Math.PI * 2);
      g.stroke();
    }
    // Parking to the east with stall lines.
    rect(2.85, -3.4 + 0.68, PX - 0.1, 0.72, "#55595e");
    g.strokeStyle = "#e8e8e8";
    g.lineWidth = 2;
    for (let z = -2.6; z <= 0.6; z += 0.32) {
      for (const x of [2.95, 3.95]) {
        g.beginPath();
        g.moveTo(...P(x, z));
        g.lineTo(...P(x + 0.55, z));
        g.stroke();
      }
    }
    // Forecourts at the tower and pavilion.
    rect(-4.45, -0.45, -2.6, 2.66, "#bfc2c4");
    rect(2.8, 0.85, 4.4, 2.66, "#c5c0b6");
  });
  const ruleTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) =>
    canvasTexture(THREE, w, h, draw);

  // Exchange-hall floor: stone, ops carpet arc, ratings-office timber, engine-room tiles.
  const hallFloorTex = ruleTex(920, 640, (g, w, h) => {
    const sx = w / (BX1 - BX0),
      sz = h / (BZ1 - BZ0);
    const P = (x: number, z: number): [number, number] => [(x - BX0) * sx, (z - BZ0) * sz];
    g.fillStyle = "#ddd8ce";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,80,60,0.14)";
    for (let x = 0; x < w; x += 40) g.strokeRect(x, 0, 40, h);
    for (let y = 0; y < h; y += 40) g.strokeRect(0, y, w, 40);
    // Ops carpet: an annulus round the ticker wall's centre.
    const [cx, cz] = P(0.15, 0.7);
    g.fillStyle = "#2f3b4c";
    g.beginPath();
    g.arc(cx, cz, 2.55 * sx, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
    g.arc(cx, cz, 1.55 * sx, -Math.PI / 2 + 0.42, -Math.PI / 2 - 0.42, true);
    g.closePath();
    g.fill();
    const rr = (x0: number, z0: number, x1: number, z1: number, c: string) => {
      const [a, b] = P(x0, z0),
        [c2, d] = P(x1, z1);
      g.fillStyle = c;
      g.fillRect(a, b, c2 - a, d - b);
    };
    rr(-2.2, -2.5, -1.0, -0.95, "#9b7650");
    g.strokeStyle = "rgba(60,40,20,0.25)";
    for (let i = 0; i < 30; i++) {
      const [a, b] = P(-2.2, -2.5 + i * 0.052);
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(a + 1.2 * sx, b);
      g.stroke();
    }
    rr(1.3, -2.5, 2.4, -0.95, "#c3c8ce");
    g.strokeStyle = "rgba(40,50,60,0.3)";
    for (let x = 1.3; x < 2.4; x += 0.1) {
      const [a, b] = P(x, -2.5);
      g.strokeRect(a, b, 0.1 * sx, 1.55 * sz);
    }
    for (let z = -2.5; z < -0.95; z += 0.1) {
      const [a, b] = P(1.3, z);
      g.strokeRect(a, b, 1.1 * sx, 0.1 * sz);
    }
    rr(-0.4, 0.42, 0.7, 0.7, "#3b3f45"); // entrance mat
  });
  // Upper floor: deal-room timber, trading carpet, lounge carpet + rug.
  const upFloorTex = ruleTex(920, 640, (g, w, h) => {
    const sx = w / (BX1 - BX0),
      sz = h / (BZ1 - BZ0);
    const rr = (x0: number, z0: number, x1: number, z1: number, c: string) => {
      g.fillStyle = c;
      g.fillRect((x0 - BX0) * sx, (z0 - BZ0) * sz, (x1 - x0) * sx, (z1 - z0) * sz);
    };
    rr(BX0, BZ0, BX1, BZ1, "#c9c4bb");
    rr(BX0, BZ0, -0.95, -0.1, "#8d6a48");
    rr(-0.9, BZ0, 1.33, BZ1, "#4c5866");
    g.strokeStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < w; x += 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    rr(1.37, BZ0, BX1, BZ1, "#b59f84");
    rr(1.5, -1.3, 2.25, -0.45, "#7a4b3a");
    rr(1.55, -1.25, 2.2, -0.5, "#94604a");
  });
  // Basement: raised-floor tiles (depository), vinyl (registrar), yellow safety lines.
  const coreFloorTex = ruleTex(880, 600, (g, w, h) => {
    const sx = w / (QX1 - QX0);
    g.fillStyle = "#bfc5cb";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(30,40,50,0.28)";
    for (let x = 0; x < w; x += 20) g.strokeRect(x, 0, 20, h);
    for (let y = 0; y < h; y += 20) g.strokeRect(0, y, w, 20);
    g.fillStyle = "#9aa0a6";
    g.fillRect(0, 0, (0.1 - QX0) * sx, h);
    g.strokeStyle = "#e2b33a";
    g.lineWidth = 4;
    g.strokeRect((0.25 - QX0) * sx, 6, (QX1 - 0.3) * sx, h - 12);
  });
  // Main facade: one bay, full height (S .. RF + 0.08): stone base, tall
  // ground-floor glazing, dark spandrel (the ticker band sits on it), upper glazing, parapet.
  const FH = RF + 0.08 - S;
  const facadeTex = ruleTex(128, 512, (g, w, h) => {
    const py = (y: number) => (1 - (y - S) / FH) * h;
    g.fillStyle = "#d9dde1";
    g.fillRect(0, 0, w, h);
    const glass = (y0: number, y1: number) => {
      const gr = g.createLinearGradient(0, py(y1), 0, py(y0));
      gr.addColorStop(0, "#5f7c96");
      gr.addColorStop(1, "#22364a");
      g.fillStyle = gr;
      g.fillRect(6, py(y1), w - 12, py(y0) - py(y1));
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.beginPath();
      g.moveTo(10, py(y1));
      g.lineTo(46, py(y1));
      g.lineTo(18, py(y0));
      g.lineTo(10, py(y0));
      g.fill();
    };
    glass(S + 0.05, U - 0.1);
    g.fillStyle = "#c8ced4";
    g.fillRect(0, py(S + 0.62), w, 4); // transom
    g.fillRect(w / 2 - 2, py(U - 0.1), 4, py(S + 0.05) - py(U - 0.1));
    g.fillStyle = "#1c232b";
    g.fillRect(0, py(UF + 0.04), w, py(U - 0.1) - py(UF + 0.04)); // spandrel
    glass(UF + 0.06, RF - 0.02);
    g.fillStyle = "#c8ced4";
    g.fillRect(w / 2 - 2, py(RF - 0.02), 4, py(UF + 0.06) - py(RF - 0.02));
  });
  facadeTex.wrapS = THREE.RepeatWrapping;
  // AMC tower: 4 bays x 8 floors, random lit offices.
  const towerTex = ruleTex(512, 512, (g, w, h) => {
    g.fillStyle = "#2c3e50";
    g.fillRect(0, 0, w, h);
    const bw = w / 4,
      fh = h / 8;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 8; j++) {
        const lit = R() < 0.35;
        const gr = g.createLinearGradient(0, j * fh, 0, (j + 1) * fh);
        gr.addColorStop(0, lit ? "#e9dcb0" : "#5b7894");
        gr.addColorStop(1, lit ? "#c9b98a" : "#2f4660");
        g.fillStyle = gr;
        g.fillRect(i * bw + 4, j * fh + 10, bw - 8, fh - 14);
      }
    g.fillStyle = "#b8c2cc";
    for (let j = 0; j <= 8; j++) g.fillRect(0, j * fh, w, 8);
    for (let i = 0; i <= 4; i++) g.fillRect(i * bw - 2, 0, 4, h);
  });
  towerTex.wrapS = towerTex.wrapT = THREE.RepeatWrapping;
  // Fund-house block: stone with punched windows, 2 bays x 4 floors.
  const blockTex = ruleTex(256, 256, (g, w, h) => {
    g.fillStyle = "#cdbfa8";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 4; j++) {
        g.fillStyle = R() < 0.3 ? "#e6d7a8" : "#3a4c5e";
        g.fillRect(i * 128 + 24, j * 64 + 14, 80, 40);
        g.fillStyle = "#b3a58e";
        g.fillRect(i * 128 + 20, j * 64 + 54, 88, 6);
      }
  });
  blockTex.wrapS = blockTex.wrapT = THREE.RepeatWrapping;

  // Ticker wall: two frames stacked in one atlas (tiles flip colour between them).
  const wallTex = ruleTex(2048, 1152, (g, w) => {
    for (let f = 0; f < 2; f++) {
      const y0 = f * 576;
      const fr = rng(77 + f);
      g.fillStyle = "#050b14";
      g.fillRect(0, y0, w, 576);
      g.fillStyle = "#0d1a2b";
      g.fillRect(0, y0, w, 52);
      g.fillStyle = "#9fb3c8";
      g.font = font(30);
      g.fillText("MARKET WATCH", 26, y0 + 36);
      g.fillText("10:42:" + (f ? "18" : "17") + " IST", w - 230, y0 + 36);
      // Index chart (left).
      const cx0 = 30,
        cx1 = 760,
        cy0 = y0 + 150,
        cy1 = y0 + 540;
      g.strokeStyle = "rgba(120,150,180,0.18)";
      g.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.moveTo(cx0, lerp(cy0, cy1, k / 5));
        g.lineTo(cx1, lerp(cy0, cy1, k / 5));
        g.stroke();
      }
      const pts: [number, number][] = [];
      let v = 0.55;
      const cr = rng(5);
      for (let i = 0; i <= 80; i++) {
        v = Math.max(0.12, Math.min(0.92, v + (cr() - 0.45) * 0.07));
        pts.push([lerp(cx0, cx1, i / 80), lerp(cy1, cy0, v)]);
      }
      if (f) pts[pts.length - 1][1] -= 8;
      g.fillStyle = "rgba(47,224,122,0.16)";
      g.beginPath();
      g.moveTo(cx0, cy1);
      for (const p of pts) g.lineTo(p[0], p[1]);
      g.lineTo(cx1, cy1);
      g.fill();
      g.strokeStyle = "#2fe07a";
      g.lineWidth = 5;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.stroke();
      g.fillStyle = "#e8eef5";
      g.font = font(44);
      g.fillText("MARKET INDEX", cx0, y0 + 102);
      g.fillStyle = "#2fe07a";
      g.fillText(f ? "24,816.05  ▲ 0.64%" : "24,812.40  ▲ 0.62%", cx0 + 330, y0 + 102);
      // Sector tiles (right): 4 x 3.
      const tx0 = 810,
        tw = (w - tx0 - 20) / 4,
        th = 160;
      SECTORS.forEach((name, i) => {
        const cxi = tx0 + (i % 4) * tw,
          cyi = y0 + 70 + Math.floor(i / 4) * (th + 8);
        const ch = (fr() - 0.4) * 3;
        const up = ch >= 0;
        g.fillStyle = up ? (ch > 1.2 ? "#127a43" : "#0e5a35") : ch < -0.8 ? "#8e1f26" : "#5e1a20";
        g.fillRect(cxi + 4, cyi, tw - 8, th);
        g.fillStyle = "#ffffff";
        g.font = font(38);
        g.fillText(name, cxi + 22, cyi + 58);
        g.font = font(50);
        g.fillText((up ? "▲ " : "▼ ") + Math.abs(ch).toFixed(2) + "%", cxi + 22, cyi + 128);
      });
    }
  });
  wallTex.repeat.set(1, 0.5);
  // Scrolling ticker strip (shared canvas for the hall strip and the facade band).
  const stripCanvas = document.createElement("canvas");
  stripCanvas.width = 2048;
  stripCanvas.height = 64;
  {
    const g = stripCanvas.getContext("2d")!;
    g.fillStyle = "#03070c";
    g.fillRect(0, 0, 2048, 64);
    g.font = font(36);
    let x = 16;
    const sr = rng(11);
    for (const name of [...SECTORS, ...SECTORS.slice(0, 4)]) {
      const ch = (sr() - 0.42) * 3;
      g.fillStyle = "#f3f5f7";
      g.fillText(name, x, 46);
      x += g.measureText(name).width + 12;
      g.fillStyle = ch >= 0 ? "#2fe07a" : "#ff5a5f";
      const t = (ch >= 0 ? "▲" : "▼") + Math.abs(ch).toFixed(2);
      g.fillText(t, x, 46);
      x += g.measureText(t).width + 44;
      if (x > 2000) break;
    }
  }
  const stripTex = (rep: number) => {
    const t = new THREE.CanvasTexture(stripCanvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(rep, 1);
    return t;
  };
  const stripHall = stripTex(1);
  const stripFacade = stripTex(2);
  // Trading-desk monitor: candlesticks.
  const monTex = ruleTex(128, 80, (g, w, h) => {
    g.fillStyle = "#07101c";
    g.fillRect(0, 0, w, h);
    let v = 40;
    for (let i = 0; i < 16; i++) {
      const o = v,
        c = v + (R() - 0.48) * 14;
      v = c;
      g.fillStyle = c < o ? "#2fe07a" : "#ff5a5f";
      g.fillRect(6 + i * 7.3, Math.min(o, c), 4, Math.max(2, Math.abs(c - o)));
      g.fillRect(7.5 + i * 7.3, Math.min(o, c) - 4, 1, Math.abs(c - o) + 8);
    }
    g.fillStyle = "#16324f";
    g.fillRect(0, h - 14, w, 14);
  });
  // Broker floor wall: order book + chart + app-style order ticket.
  const bookTex = ruleTex(1024, 256, (g, w, h) => {
    g.fillStyle = "#06101c";
    g.fillRect(0, 0, w, h);
    g.font = font(22);
    g.fillStyle = "#9fb3c8";
    g.fillText("ORDER BOOK", 20, 32);
    for (let i = 0; i < 6; i++) {
      const bw = 40 + R() * 150,
        aw = 40 + R() * 150;
      g.fillStyle = "rgba(47,224,122,0.55)";
      g.fillRect(200 - bw, 48 + i * 32, bw, 24);
      g.fillStyle = "rgba(255,90,95,0.55)";
      g.fillRect(210, 48 + i * 32, aw, 24);
    }
    g.strokeStyle = "#3aa6ff";
    g.lineWidth = 4;
    g.beginPath();
    let v = 150;
    for (let i = 0; i <= 60; i++) {
      v = Math.max(50, Math.min(230, v + (R() - 0.52) * 18));
      const x = 440 + i * 6.5;
      if (i) g.lineTo(x, v);
      else g.moveTo(x, v);
    }
    g.stroke();
    // App-style order ticket.
    g.fillStyle = "#0f2238";
    g.fillRect(860, 20, 140, 216);
    g.fillStyle = "#2fe07a";
    g.fillRect(872, 170, 56, 44);
    g.fillStyle = "#ff5a5f";
    g.fillRect(934, 170, 56, 44);
    g.fillStyle = "#e8eef5";
    g.font = font(20);
    g.fillText("BUY", 880, 199);
    g.fillText("SELL", 938, 199);
    g.fillRect(872, 50, 116, 10);
    g.fillRect(872, 80, 80, 10);
    g.fillRect(872, 110, 100, 10);
  });
  const dealTex = ruleTex(256, 128, (g, w, h) => {
    g.fillStyle = "#0b1626";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8eef5";
    g.font = font(16);
    g.fillText("DEAL PIPELINE", 12, 22);
    const cols = ["#3aa6ff", "#2fe07a", "#e2b33a", "#c084fc"];
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i % 4];
      const bh = 20 + R() * 70;
      g.fillRect(16 + i * 38, h - 12 - bh, 26, bh);
    }
  });
  const navTex = ruleTex(256, 128, (g, w, h) => {
    g.fillStyle = "#081424";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8eef5";
    g.font = font(18);
    g.fillText("FUND NAV", 12, 24);
    g.strokeStyle = "#2fe07a";
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i <= 20; i++) {
      const y = 108 - i * 3.6 + Math.sin(i * 1.3) * 6;
      if (i) g.lineTo(12 + i * 11.5, y);
      else g.moveTo(12, y);
    }
    g.stroke();
  });
  const ratingTex = ruleTex(512, 256, (g, w) => {
    g.fillStyle = "#f4f1ea";
    g.fillRect(0, 0, w, 256);
    g.fillStyle = "#1f2a36";
    g.font = font(30);
    g.fillText("RATING SCALE", 24, 44);
    const grades = ["AAA", "AA", "A", "BBB", "BB", "B", "C", "D"];
    const cols = ["#0f7a43", "#2a9a52", "#6db33f", "#b8c23a", "#e2b33a", "#e07b2a", "#cf4a2a", "#9b1c22"];
    grades.forEach((gr, i) => {
      const x = 24 + (i % 4) * 118,
        y = 70 + Math.floor(i / 4) * 92;
      g.fillStyle = cols[i];
      g.fillRect(x, y, 106, 80);
      g.fillStyle = "#ffffff";
      g.font = font(38);
      g.fillText(gr, x + 53 - g.measureText(gr).width / 2, y + 54);
    });
  });
  const spinesTex = ruleTex(256, 128, (g, w, h) => {
    g.fillStyle = "#5a4632";
    g.fillRect(0, 0, w, h);
    const cols = ["#1f4e79", "#7a2b2b", "#2e6b4a", "#c9c2b0", "#3d3d48", "#a87c2e"];
    for (let r = 0; r < 3; r++)
      for (let x = 4; x < w - 8; ) {
        const bw = 6 + R() * 8;
        g.fillStyle = cols[Math.floor(R() * cols.length)];
        g.fillRect(x, r * 42 + 6, bw, 34);
        x += bw + 1;
      }
  });
  const sign = (text: string, w: number, h: number, fg: string, bg: string) =>
    ruleTex(w, h, (g) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = font(Math.round(h * 0.52));
      const tw = g.measureText(text).width;
      g.fillText(text, (w - tw) / 2, h * 0.7);
    });
  const amcSignTex = sign("ASSET MANAGEMENT", 512, 64, "#ffffff", "#14324f");
  const fundSignTex = sign("INVESTMENTS", 256, 48, "#f4efe4", "#5b4632");
  const distSignTex = sign("FUNDS  ·  INSURANCE  ·  SIP", 512, 48, "#14324f", "#f2c94c");
  const houseSignTex = sign("MARKET HOUSE", 512, 64, "#e8eef5", "#1c232b");
  // Rack fronts: LED atlas of 4 frames, scrolled to blink.
  const rackFront = (base: string, leds: string[], seed: number) => {
    const t = ruleTex(64, 512, (g) => {
      const fr = rng(seed);
      for (let f = 0; f < 4; f++) {
        const y0 = f * 128;
        g.fillStyle = base;
        g.fillRect(0, y0, 64, 128);
        g.fillStyle = "rgba(255,255,255,0.05)";
        for (let u = 0; u < 12; u++) g.fillRect(4, y0 + 6 + u * 10, 56, 7);
        for (let u = 0; u < 12; u++)
          for (let k = 0; k < 3; k++) {
            if (fr() < 0.45) continue;
            g.fillStyle = leds[Math.floor(fr() * leds.length)];
            g.fillRect(40 + k * 7, y0 + 8 + u * 10, 4, 3);
          }
      }
      g.fillStyle = "#000";
    });
    t.repeat.set(1, 0.25);
    return t;
  };
  const engineLed = rackFront("#141a22", ["#2fe07a", "#ffb020", "#2fe07a"], 3);
  const depoLed = rackFront("#10161e", ["#2fe07a", "#3aa6ff", "#3aa6ff"], 4);
  const regLed = rackFront("#151b22", ["#3aa6ff", "#2fe07a"], 5);
  const blinkers = [engineLed, depoLed, regLed];

  // ---------------------------------------------------------------- materials
  const screenMat = (bucket: string, tex: T.Texture | null, intensity = 1, color = 0xffffff) =>
    L.add(
      bucket,
      std(0x0a0d12, 0, 0.35, {
        map: tex ?? undefined,
        emissive: color,
        emissiveMap: tex ?? undefined,
        emissiveIntensity: intensity,
      })
    );
  /** Interior/equipment palette for one layer bucket. */
  const pal = (bucket: string) => ({
    white: L.add(bucket, std(0xeef0f2, 0.1, 0.45)),
    grey: L.add(bucket, std(0x8d97a1, 0.4, 0.45)),
    dark: L.add(bucket, std(0x23292f, 0.4, 0.45)),
    steel: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
    wood: L.add(bucket, std(0x9a7450, 0.05, 0.55)),
    desk: L.add(bucket, std(0xe7e3dc, 0.05, 0.5)),
    chair: L.add(bucket, std(0x2c3440, 0.2, 0.6)),
    glass: L.add(bucket, std(0xcfe6f2, 0.1, 0.05, { opacity: 0.22, side: DS, depthWrite: false })),
    frame: L.add(bucket, std(0x5a636d, 0.7, 0.35)),
    mon: screenMat(bucket, monTex, 1.0),
    body: L.add(bucket, std(0xffffff, 0.05, 0.75)),
    skin: L.add(bucket, std(0xc89878, 0.05, 0.7)),
    green: L.add(bucket, std(0x3f7a3a, 0, 0.85)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    navy: L.add(bucket, std(0x22344c, 0.2, 0.55)),
  });
  const mBase = {
    plinth: L.add("base", std(0x1f2731, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2f8fbf, emissiveIntensity: 0.4 })),
    ground: L.add("base", std(0xffffff, 0, 0.9, { map: groundTex })),
  };
  const st = { ...pal("street"), trunk: L.add("street", std(0x5a4632, 0, 0.9)), canopy: L.add("street", std(0x4f8a3e, 0, 0.85)) };
  const stCar = L.add("street", std(0xffffff, 0.5, 0.35));
  const stCarGlass = L.add("street", std(0x1b2631, 0.6, 0.15));
  const stWater = L.add("street", std(0x6fb7d6, 0.1, 0.08, { emissive: 0x0e3b52, emissiveIntensity: 0.4 }));
  const stStone = L.add("street", std(0xb9b2a5, 0.05, 0.7));
  const stLamp = L.add("street", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 }));
  const stPhone = L.add("street", std(0x000000, 0, 0.4, { emissive: 0x7fd3ff, emissiveIntensity: 1.6 }));
  const am = {
    ...pal("amc"),
    tower: L.add("amc", std(0xffffff, 0.35, 0.25, { map: towerTex })),
    block: L.add("amc", std(0xffffff, 0.05, 0.8, { map: blockTex })),
    roof: L.add("amc", std(0x9aa3ac, 0.4, 0.55)),
    crown: L.add("amc", std(0xdfe4e8, 0.5, 0.35)),
    podGlass: L.add("amc", std(0x3f5f7a, 0.6, 0.12)),
    amcSign: screenMat("amc", amcSignTex, 0.9),
    fundSign: screenMat("amc", fundSignTex, 0.6),
    distSign: screenMat("amc", distSignTex, 0.8),
    nav: screenMat("amc", navTex, 1.1),
    canopy: L.add("amc", std(0xf4f6f7, 0.15, 0.4)),
    accent: L.add("amc", std(0xf2c94c, 0.2, 0.45)),
  };
  const sh = {
    facade: L.add("shell", std(0xffffff, 0.25, 0.35, { map: facadeTex, side: DS })),
    stone: L.add("shell", std(0xd9dde1, 0.05, 0.6)),
    dark: L.add("shell", std(0x2a3138, 0.4, 0.45)),
    band: screenMat("shell", stripFacade, 1.2),
    houseSign: screenMat("shell", houseSignTex, 0.8),
  };
  const rf = {
    slab: L.add("roof", std(0xb8bec4, 0.1, 0.8)),
    unit: L.add("roof", std(0xd5dadf, 0.4, 0.4)),
    dark: L.add("roof", std(0x3e464e, 0.4, 0.5)),
    dish: L.add("roof", std(0xeef0f2, 0.3, 0.4, { side: DS })),
  };
  const up = {
    ...pal("up"),
    book: screenMat("up", bookTex, 1.1),
    deal: screenMat("up", dealTex, 1.0),
    sofa: L.add("up", std(0x2f4a6b, 0.05, 0.8)),
    sofa2: L.add("up", std(0xc9b79c, 0.05, 0.8)),
    gold: L.add("up", std(0xc8a250, 0.8, 0.3)),
  };
  const upSlab = {
    slab: L.add("upSlab", std(0xe6e8ea, 0.05, 0.8)),
    floor: L.add("upSlab", std(0xffffff, 0.05, 0.75, { map: upFloorTex })),
  };
  const hl = {
    ...pal("hall"),
    wall: screenMat("hall", wallTex, 1.15),
    strip: screenMat("hall", stripHall, 1.3),
    rating: L.add("hall", std(0xffffff, 0, 0.6, { map: ratingTex, emissive: 0xffffff, emissiveMap: ratingTex, emissiveIntensity: 0.25 })),
    spines: L.add("hall", std(0xffffff, 0, 0.8, { map: spinesTex })),
    rackSide: L.add("hall", std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add("hall", std(0x2b333d, 0.5, 0.4)),
    rackFront: L.add("hall", std(0xffffff, 0.3, 0.4, { map: engineLed, emissive: 0xffffff, emissiveMap: engineLed, emissiveIntensity: 1.0 })),
  };
  const s0 = {
    slab: L.add("slab0", std(0xd4d0c8, 0.05, 0.6)),
    floor: L.add("slab0", std(0xffffff, 0.1, 0.4, { map: hallFloorTex })),
  };
  const co = {
    ...pal("core"),
    lining: L.add("core", std(0xb6b2aa, 0.05, 0.85)),
    floor: L.add("core", std(0xffffff, 0.05, 0.6, { map: coreFloorTex })),
    vault: L.add("core", std(0xc7ccd1, 0.92, 0.22)),
    vaultDark: L.add("core", std(0x6b737c, 0.85, 0.3)),
    rackSide: L.add("core", std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add("core", std(0x2b333d, 0.5, 0.4)),
    depoFront: L.add("core", std(0xffffff, 0.3, 0.4, { map: depoLed, emissive: 0xffffff, emissiveMap: depoLed, emissiveIntensity: 1.0 })),
    regFront: L.add("core", std(0xffffff, 0.3, 0.4, { map: regLed, emissive: 0xffffff, emissiveMap: regLed, emissiveIntensity: 1.0 })),
    shelf: L.add("core", std(0x7d8792, 0.7, 0.4)),
    box: L.add("core", std(0xffffff, 0, 0.8)),
    noc: screenMat("core", monTex, 1.0),
  };

  // ---------------------------------------------------------------- shared kit
  type Pal = ReturnType<typeof pal>;
  /** Desks facing local -z (the person sits on +z), n monitors facing the person. */
  const desks = (parent: T.Object3D, P: Pal, items: Item[], n = 2, w = 0.24) => {
    if (!items.length) return;
    const top = mergeInto(THREE, [bx(-w / 2, w / 2, 0.09, 0.1, -0.06, 0.06), bx(-w / 2 + 0.01, -w / 2 + 0.03, 0, 0.09, -0.05, 0.05), bx(w / 2 - 0.03, w / 2 - 0.01, 0, 0.09, -0.05, 0.05)]);
    const bez: T.BufferGeometry[] = [];
    const scr: T.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.075;
      const a = (k - (n - 1) / 2) * 0.25;
      const b = bx(-0.034, 0.034, -0.023, 0.023, -0.004, 0).rotateY(-a).translate(x, 0.145, -0.03);
      bez.push(b, bx(x - 0.004, x + 0.004, 0.1, 0.125, -0.036, -0.03));
      scr.push(vPlane(0.062, 0.04, 0, 0, 0.0005, 0).rotateY(-a).translate(x, 0.145, -0.03));
    }
    const chair = mergeInto(THREE, [bx(-0.03, 0.03, 0.05, 0.06, 0.07, 0.13), bx(-0.03, 0.03, 0.06, 0.13, 0.125, 0.135), bx(-0.004, 0.004, 0, 0.05, 0.096, 0.104)]);
    inst(parent, top, P.desk, items);
    inst(parent, mergeInto(THREE, bez), P.dark, items);
    inst(parent, mergeInto(THREE, scr), P.mon, items);
    inst(parent, chair, P.chair, items);
  };
  // People: capsule body (instance-coloured clothes) + head; optional phone.
  const bodyGeo = new THREE.CapsuleGeometry(0.024, 0.085, 3, 8).translate(0, 0.067, 0);
  const headGeo = new THREE.SphereGeometry(0.021, 10, 8).translate(0, 0.158, 0);
  const phoneGeo = bx(-0.008, 0.008, 0.112, 0.138, 0.03, 0.034).rotateX(-0.5);
  const CLOTHES = [0x2b4c7e, 0x8a2b2b, 0x3d6b4f, 0xd9d2c5, 0x4a4a52, 0xc77d2e, 0x6b4f8a, 0x1f2a36, 0x5c8fb8];
  // Collected per (group, palette) and instanced once at the end -> 2-3 draw calls per group.
  const crowds = new Map<string, { parent: T.Object3D; P: Pal; items: Item[]; phone?: T.Material }>();
  const people = (parent: T.Object3D, P: Pal, pts: [number, number, number, number?][], phone?: T.Material) => {
    const k = parent.uuid + "|" + P.body.uuid;
    if (!crowds.has(k)) crowds.set(k, { parent, P, items: [] });
    const c = crowds.get(k)!;
    if (phone) c.phone = phone;
    for (const [x, y, z, ry] of pts) c.items.push({ p: [x, y, z], ry: ry ?? R() * Math.PI * 2, c: CLOTHES[Math.floor(R() * CLOTHES.length)] });
  };
  const RW = 0.11,
    RD = 0.17;
  const racks = (parent: T.Object3D, side: T.Material, topM: T.Material, front: T.Material, rh: number, items: Item[]) => {
    const g = new THREE.BoxGeometry(RW * 0.95, rh, RD).translate(0, rh / 2, 0);
    inst(parent, g, [side, side, topM, side, front, side], items);
  };
  const glassBox = (parent: T.Object3D, P: Pal, x0: number, x1: number, z0: number, z1: number, y0: number, h: number, sides: ("n" | "s" | "e" | "w")[]) => {
    const pan: T.BufferGeometry[] = [];
    const fr: T.BufferGeometry[] = [];
    const t = 0.008;
    for (const sd of sides) {
      if (sd === "n" || sd === "s") {
        const z = sd === "n" ? z0 : z1;
        pan.push(vPlane(x1 - x0, h, (x0 + x1) / 2, y0 + h / 2, z));
        fr.push(bx(x0, x1, y0 + h - t, y0 + h, z - t, z + t));
        for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 0.3))) fr.push(bx(x - t / 2, x + t / 2, y0, y0 + h, z - t / 2, z + t / 2));
      } else {
        const x = sd === "w" ? x0 : x1;
        pan.push(vPlane(z1 - z0, h, x, y0 + h / 2, (z0 + z1) / 2, Math.PI / 2));
        fr.push(bx(x - t, x + t, y0 + h - t, y0 + h, z0, z1));
        for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / Math.max(1, Math.round((z1 - z0) / 0.3))) fr.push(bx(x - t / 2, x + t / 2, y0, y0 + h, z - t / 2, z + t / 2));
      }
    }
    put(parent, P.glass, ...pan);
    put(parent, P.frame, ...fr);
  };
  /** Four facade planes (no top) with uv tiled to tile size per face. */
  const facadeShell = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, tw: number, th: number) => {
    const h = y1 - y0,
      yc = (y0 + y1) / 2;
    const w = x1 - x0,
      d = z1 - z0;
    return [
      uvScale(vPlane(w, h, (x0 + x1) / 2, yc, z1), w / tw, h / th),
      uvScale(vPlane(w, h, (x0 + x1) / 2, yc, z0, Math.PI), w / tw, h / th),
      uvScale(vPlane(d, h, x1, yc, (z0 + z1) / 2, Math.PI / 2), d / tw, h / th),
      uvScale(vPlane(d, h, x0, yc, (z0 + z1) / 2, -Math.PI / 2), d / tw, h / th),
    ];
  };
  /** Curved strip (concave toward +z) on a circle centred (cx, cz). */
  const arcStrip = (cx: number, cz: number, rad: number, a0: number, a1: number, y0: number, y1: number, n = 32) => {
    const pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      const x = cx + rad * Math.sin(a),
        z = cz - rad * Math.cos(a);
      pos.push(x, y0, z, x, y1, z);
      uv.push(i / n, 0, i / n, 1);
      if (i < n) {
        const b = 2 * i;
        idx.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  const tree = (items: Item[], x: number, z: number, s = 1) => items.push({ p: [x, S, z], s: [s, s * (0.9 + R() * 0.25), s], ry: R() * 6 });

  // ================================================================ PLINTH + GROUND
  const plinthShape = (() => {
    const s = new THREE.Shape();
    // Shape (x, y) -> world (x, -z) after rotateX(-PI/2) maps back to (x, z).
    const pts: [number, number][] = [];
    const corner = (cx: number, cz: number, a0: number) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + (i / 6) * (Math.PI / 2);
        pts.push([cx + PR * Math.cos(a), cz + PR * Math.sin(a)]);
      }
    };
    corner(PX - PR, PZ - PR, 0);
    corner(-PX + PR, PZ - PR, Math.PI / 2);
    corner(-PX + PR, -PZ + PR, Math.PI);
    corner(PX - PR, -PZ + PR, (3 * Math.PI) / 2);
    pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    const hole = new THREE.Path();
    hole.moveTo(QX0, -QZ0);
    hole.lineTo(QX0, -QZ1);
    hole.lineTo(QX1, -QZ1);
    hole.lineTo(QX1, -QZ0);
    hole.lineTo(QX0, -QZ0);
    s.holes.push(hole);
    return s;
  })();
  {
    const bev = 0.03;
    const pl = new THREE.ExtrudeGeometry(plinthShape, { depth: S - 2 * bev - 0.004, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
    pl.rotateX(-Math.PI / 2).translate(0, bev, 0);
    put(baseG, mBase.plinth, pl);
    const gg = new THREE.ShapeGeometry(plinthShape, 6).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PX) / GX, 1 - (p.getZ(i) + PZ) / GZ);
    gg.translate(0, S + 0.002, 0);
    put(baseG, mBase.ground, gg);
    baseG.add(contactShadow(THREE, 2 * PX + 1.6, 2 * PZ + 1.6, 0.5));
  }
  // The accent lip carries the animation driver (always visible).
  const lipMesh = (() => {
    const outer = new THREE.Shape();
    const inner = new THREE.Path();
    const ring = (o: T.Shape | T.Path, k: number) => {
      const r = PR + k;
      const pts: [number, number][] = [];
      for (const [cx, cz, a0] of [
        [PX - PR, PZ - PR, 0],
        [-PX + PR, PZ - PR, Math.PI / 2],
        [-PX + PR, -PZ + PR, Math.PI],
        [PX - PR, -PZ + PR, (3 * Math.PI) / 2],
      ] as [number, number, number][])
        for (let i = 0; i <= 6; i++) {
          const a = a0 + (i / 6) * (Math.PI / 2);
          pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
        }
      pts.forEach(([x, z], i) => (i ? o.lineTo(x, -z) : o.moveTo(x, -z)));
    };
    ring(outer, 0.045);
    ring(inner, 0.0);
    outer.holes.push(inner);
    const g = new THREE.ExtrudeGeometry(outer, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
    g.rotateX(-Math.PI / 2).translate(0, 0.16, 0);
    const m = new THREE.Mesh(g, mBase.lip);
    m.frustumCulled = false;
    baseG.add(m);
    return m;
  })();

  // ================================================================ LAYER 0: STREET
  {
    // Plaza fountain.
    put(streetG, st.steel, lathe(THREE, [[0, 0], [0.42, 0], [0.44, 0.06], [0.4, 0.07], [0.38, 0.03], [0, 0.03]], 40).translate(0.15, S, 1.75));
    put(streetG, stWater, new THREE.CircleGeometry(0.385, 40).rotateX(-Math.PI / 2).translate(0.15, S + 0.05, 1.75));
    put(streetG, stStone, cyl(0.06, 0.16, 0.15, S, 1.75, 16, 0.04), lathe(THREE, [[0, 0], [0.13, 0], [0.12, 0.03], [0, 0.04]], 24).translate(0.15, S + 0.16, 1.75));
    put(streetG, stWater, cyl(0.012, 0.09, 0.15, S + 0.18, 1.75, 8, 0.004));
    // Benches and planters.
    const bench: T.BufferGeometry[] = [];
    const benchLegs: T.BufferGeometry[] = [];
    for (const [x, z, ry] of [
      [-1.2, 1.3, 0],
      [-1.2, 2.25, 0],
      [1.55, 1.3, 0],
      [1.55, 2.25, 0],
      [-0.75, 1.0, Math.PI / 2],
      [1.05, 1.0, Math.PI / 2],
    ] as [number, number, number][]) {
      bench.push(bx(-0.16, 0.16, 0.05, 0.065, -0.04, 0.04).rotateY(ry).translate(x, S, z));
      benchLegs.push(bx(-0.14, -0.12, 0, 0.05, -0.035, 0.035).rotateY(ry).translate(x, S, z), bx(0.12, 0.14, 0, 0.05, -0.035, 0.035).rotateY(ry).translate(x, S, z));
    }
    put(streetG, st.wood, ...bench);
    put(streetG, st.dark, ...benchLegs);
    const planters: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-2.25, 1.0],
      [-2.25, 2.35],
      [2.45, 1.0],
      [2.45, 2.35],
    ])
      planters.push(rb(0.3, 0.07, 0.3, 0.02, x, S, z));
    put(streetG, stStone, ...planters);
    // Trees: planters, back strip, front sidewalk, parking.
    const trees: Item[] = [];
    for (const [x, z] of [
      [-2.25, 1.0],
      [-2.25, 2.35],
      [2.45, 1.0],
      [2.45, 2.35],
    ])
      tree(trees, x, z, 1.05);
    for (let x = -4.2; x <= 4.3; x += 0.62) tree(trees, x + (R() - 0.5) * 0.1, -3.05 + (R() - 0.5) * 0.12, 0.9 + R() * 0.25);
    for (const x of [-4.3, -2.0, 2.6, 4.4]) tree(trees, x, 2.6, 0.85);
    for (const z of [-2.3, -1.0, 0.3]) tree(trees, 3.72, z, 0.8);
    const trunk = cyl(0.016, 0.16, 0, 0, 0, 6, 0.012);
    const canopy = new THREE.IcosahedronGeometry(0.13, 1).scale(1, 1.15, 1).translate(0, 0.25, 0);
    inst(streetG, trunk, st.trunk, trees);
    inst(streetG, canopy, st.canopy, trees);
    // Street lamps along the front sidewalk.
    const poles: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-3.6, -1.6, 0.9, 2.2, 3.9]) {
      poles.push(cyl(0.008, 0.42, x, S, 2.62, 6), bar(THREE, [x, S + 0.42, 2.62], [x, S + 0.42, 2.72], 0.006, 4));
      heads.push(bx(x - 0.025, x + 0.025, S + 0.405, S + 0.415, 2.69, 2.75));
    }
    put(streetG, st.dark, ...poles);
    put(streetG, stLamp, ...heads);
    // Cars: front road and parking.
    const cars: Item[] = [];
    const CAR = [0xd8dde2, 0x2b4c7e, 0x8a2b2b, 0x1f2a36, 0xe9e9e9, 0x6b7682, 0xc77d2e];
    for (const [x, z, ry] of [
      [-3.4, 2.96, Math.PI / 2],
      [-1.1, 2.96, Math.PI / 2],
      [1.9, 3.3, -Math.PI / 2],
      [3.6, 2.96, Math.PI / 2],
      [-2.6, 3.3, -Math.PI / 2],
    ] as [number, number, number][])
      cars.push({ p: [x, S, z], ry, c: CAR[Math.floor(R() * CAR.length)] });
    for (let i = 0; i < 10; i++) {
      if (R() < 0.25) continue;
      const col = i % 2,
        row = Math.floor(i / 2);
      cars.push({ p: [col ? 4.23 : 3.22, S, -2.45 + row * 0.64], ry: col ? Math.PI : 0, c: CAR[Math.floor(R() * CAR.length)] });
    }
    const carBody = rb(0.13, 0.05, 0.3, 0.02, 0, 0.015, 0);
    const carCab = rb(0.11, 0.045, 0.16, 0.02, 0, 0.06, -0.01);
    const wheels = mergeInto(THREE, [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10).rotateZ(Math.PI / 2).translate(sx * 0.058, 0.022, sz * 0.09))));
    inst(streetG, carBody, stCar, cars);
    inst(streetG, carCab, stCarGlass, cars.map((c) => ({ p: c.p, ry: c.ry })));
    inst(streetG, wheels, st.dark, cars.map((c) => ({ p: c.p, ry: c.ry })));
    // Investors on their phones: plaza, pavilion queue, tower forecourt.
    const pts: [number, number, number, number?][] = [];
    const free = (x: number, z: number) => Math.hypot(x - 0.15, z - 1.75) > 0.55;
    for (let i = 0; pts.length < 22 && i < 200; i++) {
      const x = lerp(-2.0, 2.2, R()),
        z = lerp(0.95, 2.5, R());
      if (free(x, z)) pts.push([x, S, z]);
    }
    for (let i = 0; i < 4; i++) pts.push([3.0 + i * 0.17, S, 2.68, Math.PI]);
    for (let i = 0; i < 4; i++) pts.push([lerp(-4.2, -2.9, R()), S, lerp(1.75, 2.5, R())]);
    people(streetG, st, pts, stPhone);
  }
  {
    // ---- AMC tower (front left): glass podium + tower + crown with sign.
    const tx0 = -4.25,
      tx1 = -2.75,
      tz0 = -0.25,
      tz1 = 1.45;
    const pod = 0.3,
      top = S + 2.5;
    put(streetG, am.podGlass, ...facadeShell(-4.35, -2.65, -0.35, 1.58, S, S + pod, 1, 1));
    put(streetG, am.canopy, bx(-4.4, -2.6, S + pod, S + pod + 0.035, -0.4, 1.65));
    put(streetG, am.amcSign, vPlane(1.1, 0.12, -3.5, S + 0.2, 1.585));
    put(streetG, am.nav, vPlane(0.5, 0.25, -2.645, S + 0.15, 0.55, Math.PI / 2));
    put(streetG, am.tower, ...facadeShell(tx0, tx1, tz0, tz1, S + pod + 0.035, top, 1.5, 1.76));
    put(streetG, am.roof, bx(tx0, tx1, top - 0.01, top + 0.02, tz0, tz1));
    // Crown: setback fins + a slim mast.
    const fins: T.BufferGeometry[] = [];
    for (let i = 0; i <= 6; i++) {
      const x = lerp(tx0 + 0.05, tx1 - 0.05, i / 6);
      fins.push(bx(x - 0.012, x + 0.012, top, top + 0.22, tz1 - 0.04, tz1 + 0.01));
      fins.push(bx(x - 0.012, x + 0.012, top, top + 0.22, tz0 - 0.01, tz0 + 0.04));
    }
    for (let i = 0; i <= 6; i++) {
      const z = lerp(tz0 + 0.05, tz1 - 0.05, i / 6);
      fins.push(bx(tx1 - 0.04, tx1 + 0.01, top, top + 0.22, z - 0.012, z + 0.012));
    }
    fins.push(cyl(0.01, 0.35, -3.5, top, 0.6, 6, 0.004));
    put(streetG, am.crown, ...fins);
    put(streetG, am.dark, rb(0.5, 0.12, 0.6, 0.02, -3.5, top, 0.6));
    // Vertical mullion fins on the camera-facing faces.
    const mull: T.BufferGeometry[] = [];
    for (let i = 1; i < 4; i++) mull.push(bx(lerp(tx0, tx1, i / 4) - 0.008, lerp(tx0, tx1, i / 4) + 0.008, S + pod, top, tz1, tz1 + 0.03));
    for (let i = 1; i < 4; i++) mull.push(bx(tx1, tx1 + 0.03, S + pod, top, lerp(tz0, tz1, i / 4) - 0.008, lerp(tz0, tz1, i / 4) + 0.008));
    put(streetG, am.crown, ...mull);

    // ---- Fund-house block (back left).
    const fx0 = -4.25,
      fx1 = -2.75,
      fz0 = -3.15 + 0.5,
      fz1 = -0.75;
    const fTop = S + 1.3;
    put(streetG, am.block, ...facadeShell(fx0, fx1, fz0, fz1, S, fTop, 0.75, 0.44));
    put(streetG, am.roof, bx(fx0 - 0.02, fx1 + 0.02, fTop, fTop + 0.05, fz0 - 0.02, fz1 + 0.02));
    put(streetG, am.fundSign, vPlane(0.6, 0.11, fx1 + 0.003, fTop - 0.12, (fz0 + fz1) / 2, Math.PI / 2));
    put(streetG, am.dark, rb(0.4, 0.1, 0.5, 0.02, -3.5, fTop + 0.05, -1.7));

    // ---- Distribution pavilion (front right).
    const px0 = 2.9,
      px1 = 4.25,
      pz0 = 0.95,
      pz1 = 2.55;
    glassBox(streetG, am, px0, px1, pz0, pz1, S, 0.3, ["n", "s", "e", "w"]);
    put(streetG, am.canopy, bx(px0 - 0.12, px1 + 0.12, S + 0.3, S + 0.33, pz0 - 0.12, pz1 + 0.15));
    put(streetG, am.accent, bx(px0 - 0.12, px1 + 0.12, S + 0.33, S + 0.41, pz1 + 0.13, pz1 + 0.155));
    put(streetG, am.distSign, vPlane(1.3, 0.07, (px0 + px1) / 2, S + 0.37, pz1 + 0.157));
    // Kiosk counters with screens + a digital totem outside.
    const kiosk: Item[] = [
      { p: [3.25, S, 1.35] },
      { p: [3.6, S, 1.35] },
      { p: [3.95, S, 1.35] },
    ];
    desks(streetG, am, kiosk, 1, 0.2);
    put(streetG, am.accent, rb(0.06, 0.32, 0.03, 0.01, 2.75, S, 2.4));
    put(streetG, am.nav, vPlane(0.045, 0.2, 2.75, S + 0.18, 2.417));
    people(streetG, am, [
      [3.25, S, 1.55, Math.PI],
      [3.95, S, 1.55, Math.PI],
      [3.5, S, 2.1],
    ]);
  }

  // ================================================================ SHELL (layer 0 -> ghost)
  {
    put(streetG, sh.facade, ...facadeShell(BX0, BX1, BZ0, BZ1, S, RF + 0.08, 0.46, FH));
    // Ticker band on the spandrel (south + east faces).
    const by0 = U - 0.085,
      by1 = UF + 0.035;
    put(streetG, sh.band, uvScale(vPlane(BX1 - BX0, by1 - by0, (BX0 + BX1) / 2, (by0 + by1) / 2, BZ1 + 0.004), 1, 1));
    put(streetG, sh.band, uvScale(vPlane(BZ1 - BZ0, by1 - by0, BX1 + 0.004, (by0 + by1) / 2, (BZ0 + BZ1) / 2, Math.PI / 2), 0.7, 1));
    // Entrance: canopy on two posts, steps, name sign.
    put(streetG, sh.stone, bx(-0.5, 0.8, S + 0.42, S + 0.46, BZ1, BZ1 + 0.4), bx(-0.55, 0.85, S, S + 0.02, BZ1, BZ1 + 0.2), bx(-0.5, 0.8, S + 0.02, S + 0.035, BZ1, BZ1 + 0.1));
    put(streetG, sh.dark, cyl(0.014, 0.42, -0.45, S, BZ1 + 0.36, 8), cyl(0.014, 0.42, 0.75, S, BZ1 + 0.36, 8));
    put(streetG, sh.houseSign, vPlane(0.9, 0.11, 0.15, S + 0.53, BZ1 + 0.005));
    // Corner piers.
    put(streetG, sh.stone, bx(BX0 - 0.03, BX0 + 0.04, S, RF + 0.1, BZ1 - 0.04, BZ1 + 0.03), bx(BX1 - 0.04, BX1 + 0.03, S, RF + 0.1, BZ1 - 0.04, BZ1 + 0.03), bx(BX1 - 0.04, BX1 + 0.03, S, RF + 0.1, BZ0 - 0.03, BZ0 + 0.04), bx(BX0 - 0.03, BX0 + 0.04, S, RF + 0.1, BZ0 - 0.03, BZ0 + 0.04));
  }
  {
    // Roof: slab, parapet coping, HVAC units, market-data dishes and a mast.
    put(streetG, rf.slab, bx(BX0, BX1, RF, RF + 0.04, BZ0, BZ1));
    const units: T.BufferGeometry[] = [];
    const dark: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-1.2, -1.6],
      [-0.4, -1.6],
      [0.4, -1.6],
    ]) {
      units.push(rb(0.55, 0.14, 0.4, 0.02, x, RF + 0.04, z));
      for (const dx of [-0.13, 0.13]) dark.push(new THREE.CircleGeometry(0.09, 16).rotateX(-Math.PI / 2).translate(x + dx, RF + 0.181, z));
    }
    units.push(rb(0.4, 0.22, 0.4, 0.02, 1.6, RF + 0.04, -1.9));
    dark.push(bx(1.42, 1.78, RF + 0.07, RF + 0.2, -1.69, -1.68));
    put(streetG, rf.unit, ...units);
    put(streetG, rf.dark, ...dark, cyl(0.012, 0.6, 1.95, RF + 0.04, -0.4, 6, 0.005));
    const dishes: T.BufferGeometry[] = [];
    for (const [x, z, ry] of [
      [1.2, -0.2, 0.6],
      [1.65, -0.5, 0.9],
      [0.8, -0.6, 0.3],
    ] as [number, number, number][]) {
      dishes.push(lathe(THREE, [[0, 0], [0.06, 0.012], [0.11, 0.04], [0.115, 0.045]], 20).rotateX(1.0).rotateY(ry).translate(x, RF + 0.2, z));
      dark.push(cyl(0.01, 0.17, x, RF + 0.04, z, 6));
    }
    put(streetG, rf.dish, ...dishes);
    put(streetG, rf.dark, ...dark.splice(dark.length - 3, 3));
  }

  // ================================================================ LAYER 1: UPPER FLOOR
  {
    put(upG, upSlab.slab, bx(BX0 + 0.005, BX1 - 0.005, U, UF, BZ0 + 0.005, BZ1 - 0.005));
    put(upG, upSlab.floor, floorPlane(BX0 + 0.01, BX1 - 0.01, BZ0 + 0.01, BZ1 - 0.01, UF + 0.002));
    const y = UF;
    // Investment-bank deal room (west): boardroom table, chairs, wall screen, tombstone shelf.
    glassBox(upG, up, -2.16, -0.95, -2.46, -0.1, y, 0.45, ["e", "s"]);
    put(upG, up.wood, rb(0.34, 0.016, 0.95, 0.02, -1.55, y + 0.09, -1.3));
    put(upG, up.dark, bx(-1.6, -1.5, y, y + 0.09, -1.65, -1.55), bx(-1.6, -1.5, y, y + 0.09, -1.05, -0.95));
    const chairs: Item[] = [];
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) chairs.push({ p: [-1.55 + s * 0.24, y, -1.66 + i * 0.18], ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
    inst(upG, mergeInto(THREE, [bx(-0.035, 0.035, 0.05, 0.062, -0.035, 0.035), bx(-0.035, 0.035, 0.062, 0.14, 0.03, 0.04), bx(-0.005, 0.005, 0, 0.05, -0.005, 0.005)]), up.chair, chairs);
    put(upG, up.dark, bx(-2.155, -2.135, y + 0.18, y + 0.58, -1.7, -0.9));
    put(upG, up.deal, vPlane(0.76, 0.36, -2.132, y + 0.38, -1.3, Math.PI / 2));
    put(upG, up.wood, bx(-2.1, -1.0, y, y + 0.1, -2.44, -2.34));
    const tomb: T.BufferGeometry[] = [];
    const tombBase: T.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      tomb.push(bx(-2.0 + i * 0.12, -1.96 + i * 0.12, y + 0.11, y + 0.16 + (i % 3) * 0.015, -2.41, -2.37));
      tombBase.push(bx(-2.005 + i * 0.12, -1.955 + i * 0.12, y + 0.1, y + 0.11, -2.415, -2.365));
    }
    put(upG, up.glass, ...tomb);
    put(upG, up.gold, ...tombBase);
    people(upG, up, [
      [-1.83, y, -1.0, Math.PI / 2],
      [-1.3, y, -1.5, -Math.PI / 2],
      [-1.75, y, -0.55, 0.3],
    ]);

    // Retail-broker trading floor (centre): 4 rows of 3-screen desks, order-book wall.
    const items: Item[] = [];
    for (const z of [-2.0, -1.45, -0.9, -0.35])
      for (const x of [-0.66, -0.37, 0.07, 0.36, 0.8, 1.09]) items.push({ p: [x, y, z] });
    desks(upG, up, items, 3, 0.28);
    put(upG, up.dark, bx(-0.75, 1.2, y + 0.18, y + 0.62, -2.465, -2.445));
    put(upG, up.book, vPlane(1.9, 0.4, 0.225, y + 0.4, -2.443));
    const seated: [number, number, number, number?][] = [];
    for (const it of items) if (R() < 0.55) seated.push([it.p[0], y - 0.03, it.p[2] + 0.11, Math.PI]);
    people(upG, up, seated);

    // Wealth lounge (east): sofas round a coffee table, armchairs, plants, meeting pod, art wall.
    glassBox(upG, up, 1.35, 2.36, -2.46, 0.66, y, 0.45, ["w"]);
    put(upG, up.sofa, rb(0.5, 0.06, 0.16, 0.025, 1.875, y, -1.17), rb(0.5, 0.09, 0.04, 0.02, 1.875, y + 0.04, -1.25), rb(0.16, 0.06, 0.4, 0.025, 2.2, y, -0.85), rb(0.04, 0.09, 0.4, 0.02, 2.27, y + 0.04, -0.85));
    put(upG, up.sofa2, rb(0.14, 0.06, 0.14, 0.03, 1.6, y, -0.65), rb(0.14, 0.06, 0.14, 0.03, 1.85, y, -0.5));
    put(upG, up.wood, cyl(0.1, 0.05, 1.85, y, -0.85, 24));
    put(upG, up.gold, cyl(0.02, 0.012, 1.85, y + 0.05, -0.85, 10));
    const pots: T.BufferGeometry[] = [];
    const leaves: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [1.48, -1.35],
      [2.25, -0.3],
      [1.48, 0.5],
      [2.25, 0.5],
    ]) {
      pots.push(cyl(0.04, 0.07, x, y, z, 12, 0.05));
      leaves.push(new THREE.IcosahedronGeometry(0.075, 1).translate(x, y + 0.15, z));
    }
    put(upG, up.white, ...pots);
    put(upG, up.green, ...leaves);
    glassBox(upG, up, 1.55, 2.25, -2.4, -1.65, y, 0.36, ["n", "s", "e", "w"]);
    put(upG, up.wood, cyl(0.13, 0.012, 1.9, y + 0.085, -2.02, 24));
    put(upG, up.dark, cyl(0.015, 0.085, 1.9, y, -2.02, 8));
    const podChairs: Item[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      podChairs.push({ p: [1.9 + Math.cos(a) * 0.2, y, -2.02 + Math.sin(a) * 0.2], ry: -a - Math.PI / 2 });
    }
    inst(upG, rb(0.07, 0.07, 0.07, 0.02, 0, 0, 0), up.sofa2, podChairs);
    put(upG, up.navy, bx(2.34, 2.355, y + 0.15, y + 0.5, -0.4, 0.3));
    put(upG, up.gold, bx(2.33, 2.336, y + 0.2, y + 0.45, -0.3, 0.2));
    people(upG, up, [
      [1.95, y, -0.62, Math.PI * 0.9],
      [1.62, y, -0.95, Math.PI / 2],
    ]);
  }

  // ================================================================ LAYER 2: EXCHANGE HALL
  {
    put(hallG, s0.slab, bx(BX0 + 0.005, BX1 - 0.005, S - 0.04, S, BZ0 + 0.005, BZ1 - 0.005));
    put(hallG, s0.floor, floorPlane(BX0 + 0.01, BX1 - 0.01, BZ0 + 0.01, BZ1 - 0.01, S + 0.002));
    const y = S + 0.003;
    // Curved ticker wall + scrolling strip + dark backing frame.
    const WC = 0.15,
      WZ = 0.7,
      WR = 3.0,
      WA = 0.355;
    put(hallG, hl.wall, arcStrip(WC, WZ, WR, -WA, WA, y + 0.24, y + 0.84, 40));
    put(hallG, hl.strip, arcStrip(WC, WZ, WR, -WA, WA, y + 0.15, y + 0.215, 40));
    const back = arcStrip(WC, WZ, WR + 0.025, -WA - 0.012, WA + 0.012, y, y + 0.88, 40);
    put(hallG, hl.dark, back);
    // Backing thickness: cap the top edge.
    const capPts: Vec3[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = lerp(-WA - 0.012, WA + 0.012, i / 20);
      capPts.push([WC + (WR + 0.012) * Math.sin(a), y + 0.88, WZ - (WR + 0.012) * Math.cos(a)]);
    }
    for (let i = 0; i < 20; i++) put(hallG, hl.dark, bar(THREE, capPts[i], capPts[i + 1], 0.016, 4));
    // Market-operations desks on two arcs facing the wall.
    const ops: Item[] = [];
    for (const [rad, n, span] of [
      [2.2, 6, 0.3],
      [1.78, 5, 0.3],
    ] as [number, number, number][])
      for (let i = 0; i < n; i++) {
        const a = lerp(-span, span, n === 1 ? 0.5 : i / (n - 1));
        ops.push({ p: [WC + rad * Math.sin(a), y, WZ - rad * Math.cos(a)], ry: -a });
      }
    people(hallG, hl, [
      ...ops.filter((_, i) => i % 2 === 0).map((o) => [o.p[0] + 0.0, y - 0.03, o.p[2] + 0.11, Math.PI - (o.ry ?? 0)] as [number, number, number, number]),
      [-0.4, y, 0.15],
      [0.6, y, 0.3],
      [0.9, y, -0.4],
    ]);
    // Lobby: reception desk, turnstiles, columns.
    put(hallG, hl.white, rb(0.5, 0.11, 0.12, 0.03, -0.9, y, 0.35));
    const posts: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) posts.push(rb(0.03, 0.1, 0.12, 0.01, -0.25 + i * 0.16, y, 0.2));
    put(hallG, hl.steel, ...posts);
    const cols: T.BufferGeometry[] = [];
    for (const x of [-1.55, -0.95, 1.25, 1.85]) cols.push(cyl(0.035, H1 - 0.005, x, y, -0.15, 16));
    put(hallG, hl.white, ...cols);

    // Matching-engine room (east): glass box, two rows of racks, cable trays.
    const ex0 = 1.3,
      ex1 = 2.36,
      ez0 = -2.46,
      ez1 = -0.95;
    glassBox(hallG, hl, ex0, ex1, ez0, ez1, y, 0.62, ["w", "s"]);
    const eng: Item[] = [];
    for (let i = 0; i < 8; i++) {
      eng.push({ p: [ex0 + 0.12 + i * RW, y, -2.2], ry: 0 });
      eng.push({ p: [ex0 + 0.12 + i * RW, y, -1.55], ry: Math.PI });
    }
    racks(hallG, hl.rackSide, hl.rackTop, hl.rackFront, 0.42, eng);
    const tray: T.BufferGeometry[] = [];
    for (const z of [-2.2, -1.55]) tray.push(bx(ex0 + 0.06, ex0 + 0.12 + 7.5 * RW, y + 0.47, y + 0.485, z - 0.04, z + 0.04));
    tray.push(bx(ex0 + 0.5, ex0 + 0.58, y + 0.47, y + 0.485, -2.2, -1.55));
    put(hallG, hl.yellow, ...tray);
    // Ratings office (west): rating-scale board, desks, report shelves, meeting table.
    const rx0 = -2.16,
      rx1 = -1.0,
      rz0 = -2.46,
      rz1 = -0.95;
    glassBox(hallG, hl, rx0, rx1, rz0, rz1, y, 0.62, ["e", "s"]);
    put(hallG, hl.dark, bx(-2.0, -1.16, y + 0.23, y + 0.67, -2.462, -2.445));
    put(hallG, hl.rating, vPlane(0.8, 0.4, -1.58, y + 0.45, -2.443));
    desks(hallG, hl, [
      ...ops,
      { p: [-1.85, y, -1.85] },
      { p: [-1.35, y, -1.85] },
      { p: [-1.85, y, -1.35] },
      { p: [-1.35, y, -1.35] },
    ], 2, 0.24);
    put(hallG, hl.wood, bx(-2.155, -2.06, y, y + 0.36, -2.3, -1.2));
    put(hallG, hl.spines, vPlane(1.0, 0.3, -2.058, y + 0.18, -1.75, Math.PI / 2));
    people(hallG, hl, [
      [-1.85, y - 0.03, -1.24, Math.PI],
      [-1.35, y - 0.03, -1.74, Math.PI],
      [-1.6, y, -2.15, 0.3],
    ]);
  }

  // ================================================================ LAYER 3: BASEMENT
  {
    const y = B0;
    put(coreG, co.lining, bx(QX0, QX1, 0.0, B0, QZ0, QZ1));
    put(coreG, co.floor, floorPlane(QX0, QX1, QZ0, QZ1, B0 + 0.002));
    const t = 0.02;
    put(coreG, co.lining, bx(QX0, QX1, B0, S - 0.005, QZ0, QZ0 + t), bx(QX0, QX0 + t, B0, S - 0.005, QZ0, QZ1), bx(QX1 - t, QX1, B0, S - 0.005, QZ0, QZ1), bx(QX0, QX1, B0, S - 0.005, QZ1 - t, QZ1));
    // Vault door on the north wall (between the two halls).
    const vx = 0.1,
      vy = y + 0.2,
      vz = QZ0 + t;
    put(coreG, co.vaultDark, new THREE.TorusGeometry(0.17, 0.025, 10, 40).translate(vx, vy, vz + 0.005));
    put(coreG, co.vault, new THREE.CylinderGeometry(0.152, 0.152, 0.035, 40).rotateX(Math.PI / 2).translate(vx, vy, vz + 0.018));
    const handle: T.BufferGeometry[] = [new THREE.TorusGeometry(0.06, 0.007, 6, 24).translate(vx, vy, vz + 0.05)];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      handle.push(bar(THREE, [vx - Math.cos(a) * 0.06, vy - Math.sin(a) * 0.06, vz + 0.05], [vx + Math.cos(a) * 0.06, vy + Math.sin(a) * 0.06, vz + 0.05], 0.005, 5));
    }
    handle.push(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12).rotateX(Math.PI / 2).translate(vx, vy, vz + 0.045));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      handle.push(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8).rotateX(Math.PI / 2).translate(vx + Math.cos(a) * 0.125, vy + Math.sin(a) * 0.125, vz + 0.04));
    }
    put(coreG, co.vaultDark, ...handle);
    // Divider between the halls.
    glassBox(coreG, co, vx - 0.002, vx + 0.002, QZ0 + 0.45, QZ1 - 0.02, y, 0.36, ["e"]);

    // Depository data hall (east): 4 rows of racks, cable trays, NOC desk.
    const dep: Item[] = [];
    const rows: [number, number][] = [
      [-1.95, 0],
      [-1.45, Math.PI],
      [-0.85, 0],
      [-0.35, Math.PI],
    ];
    for (const [z, ry] of rows) for (let i = 0; i < 15; i++) dep.push({ p: [0.4 + i * RW, y, z], ry });
    racks(coreG, co.rackSide, co.rackTop, co.depoFront, 0.33, dep);
    const trays: T.BufferGeometry[] = [];
    for (const [z] of rows) trays.push(bx(0.34, 0.4 + 14.5 * RW, y + 0.36, y + 0.372, z - 0.035, z + 0.035));
    for (const x of [0.6, 1.3, 2.0]) trays.push(bx(x - 0.03, x + 0.03, y + 0.36, y + 0.372, -1.95, -0.35));
    put(coreG, co.yellow, ...trays);
    desks(coreG, co, [{ p: [1.0, y, 0.3] }, { p: [1.3, y, 0.3] }, { p: [1.6, y, 0.3] }], 3, 0.28);
    people(coreG, co, [
      [1.0, y - 0.03, 0.41, Math.PI],
      [1.6, y - 0.03, 0.41, Math.PI],
      [0.5, y, -1.15, 1.2],
    ]);

    // Registrar & fund-admin hall (west): archive shelving, a rack row, scanning desks.
    const shelfFr: T.BufferGeometry[] = [];
    const boxes: Item[] = [];
    const BOX = [0x3d6b9a, 0xd9cfb8, 0x8a5a3a, 0xe2b33a, 0x5c7a4a, 0xbfc5cb];
    for (const z of [-2.05, -1.55]) {
      const x0 = -1.95,
        x1 = -0.2;
      for (let k = 0; k <= 4; k++) shelfFr.push(bx(x0, x1, y + 0.005 + k * 0.08, y + 0.013 + k * 0.08, z - 0.07, z + 0.07));
      for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 5) shelfFr.push(bx(x - 0.006, x + 0.006, y, y + 0.34, z - 0.07, z + 0.07));
      for (let k = 0; k < 4; k++)
        for (let i = 0; i < 16; i++) {
          if (R() < 0.12) continue;
          for (const sz of [-1, 1]) boxes.push({ p: [lerp(x0 + 0.06, x1 - 0.06, i / 15), y + 0.013 + k * 0.08, z + sz * 0.035], c: BOX[Math.floor(R() * BOX.length)] });
        }
    }
    put(coreG, co.shelf, ...shelfFr);
    inst(coreG, bx(-0.045, 0.045, 0, 0.06, -0.03, 0.03), co.box, boxes);
    const reg: Item[] = [];
    for (let i = 0; i < 15; i++) reg.push({ p: [-1.92 + i * RW, y, -0.85], ry: 0 });
    racks(coreG, co.rackSide, co.rackTop, co.regFront, 0.33, reg);
    put(coreG, co.yellow, bx(-1.98, -1.92 + 14.5 * RW, y + 0.36, y + 0.372, -0.885, -0.815));
    desks(coreG, co, [{ p: [-1.6, y, 0.05] }, { p: [-1.2, y, 0.05] }, { p: [-0.8, y, 0.05] }], 2, 0.24);
    // Scanner / mail sorter.
    put(coreG, co.white, rb(0.3, 0.12, 0.16, 0.02, -0.35, y, 0.25));
    put(coreG, co.dark, bx(-0.48, -0.22, y + 0.12, y + 0.135, 0.19, 0.31));
    people(coreG, co, [
      [-1.6, y - 0.03, 0.16, Math.PI],
      [-0.8, y - 0.03, 0.16, Math.PI],
      [-0.35, y, 0.42, Math.PI],
      [-1.1, y, -1.8, 1.6],
    ]);
  }

  // ---------------------------------------------------------------- flush batches
  for (const { parent, P, items, phone } of crowds.values()) {
    inst(parent, bodyGeo, P.body, items);
    inst(parent, headGeo, P.skin, items.map((i) => ({ p: i.p, ry: i.ry })));
    if (phone) inst(parent, phoneGeo, phone, items.map((i) => ({ p: i.p, ry: i.ry })));
  }
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ---------------------------------------------------------------- animation
  // Ticker strips scroll, the ticker wall flips frames, rack LEDs blink.
  let lastBlink = -1,
    lastWall = -1;
  lipMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    stripHall.offset.x = (t * 0.04) % 1;
    stripFacade.offset.x = (t * 0.03) % 1;
    const f = Math.floor(t / 0.4);
    if (f !== lastBlink) {
      lastBlink = f;
      blinkers.forEach((tx, i) => (tx.offset.y = ((f + i) % 4) * 0.25));
    }
    const w = Math.floor(t / 1.8);
    if (w !== lastWall) {
      lastWall = w;
      wallTex.offset.y = (w % 2) * 0.5;
    }
  };

  // ---------------------------------------------------------------- levels
  const pw = (v: number, keys: [number, number][]) => {
    if (v <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, va] = keys[i],
        [b, vb] = keys[i + 1];
      if (v <= b) return lerp(va, vb, clamp01((v - a) / (b - a)));
    }
    return keys[keys.length - 1][1];
  };
  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("street", pw(v, [[0, 1], [1, 0.55], [3, 0.4]]));
      L.set("amc", pw(v, [[0, 1], [1, 0.35], [2, 0.25], [3, 0.2]]));
      L.set("shell", pw(v, [[0, 1], [0.7, 0.12], [1, 0.08], [3, 0.05]]));
      L.set("roof", pw(v, [[0, 1], [0.5, 0.06], [1, 0.03], [3, 0.02]]));
      L.set("up", pw(v, [[0, 1], [1, 1], [1.7, 0.14], [2, 0.1], [3, 0.05]]));
      L.set("upSlab", pw(v, [[0, 1], [1, 1], [1.6, 0.1], [2, 0.06], [3, 0.04]]));
      // The hall shows through the ghosted facade at layer 1, so it dims there too.
      L.set("hall", pw(v, [[0, 1], [0.6, 0.3], [1.3, 0.3], [2, 1], [2.7, 0.14], [3, 0.1]]));
      L.set("slab0", pw(v, [[0, 1], [2, 1], [2.6, 0.08], [3, 0.05]]));
      L.set("core", 1);
    },
  };
}
