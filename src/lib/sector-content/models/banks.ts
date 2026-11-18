// Banks & NBFCs: a miniature "credit street" block on a display plinth (generic, no real bank's
// building, logo or colours).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Front row facing the road: four bank buildings - a slim glass tower with an ATM lobby
//     (large bank), a columned stone hall (public-sector bank), a mid-rise teal-glass office
//     (mid-size private bank) and a one-storey branch with an awning (small finance bank).
//   · Side lanes, the outer ring of the block: on the west a phone & electronics store with a
//     credit-card sign, a vehicle-finance yard (truck, tractor, car) and a gold-loan shop; on the
//     east a village microfinance group meeting under a tree, a small workshop with the owner's
//     house above it, and a row of small houses being built.
//   · Back row: a finance group's headquarters, a housing-finance office with a show house, and
//     a state lender's stone office with a power pylon, solar panels and a rail wagon.
//   · Under the front row, sunk into the plinth: the central bank's vault (round door, cash and
//     gold shelves, refinance desks) and the payments switch room (racks, network wall, bureau
//     desks).
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Specialist Lenders      side lanes + courtyard
//   1 Banks                   lanes ghost -> the bank row
//   2 Groups & State Lenders  bank row ghosts -> the back row
//   3 Rails & Regulators      bank row + its ground slab ghost -> the basement vault and switch room
// ATM screens, the network wall and rack LEDs animate (animated: true).
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
const S = 0.42; // street level (top of the plinth)
const B0 = 0.05; // basement floor
const PX = 4.7,
  PZ = 3.4,
  PR = 0.4; // plinth half-sizes + corner radius
const QX0 = -2.8,
  QX1 = 3.15,
  QZ0 = 0.42,
  QZ1 = 2.22; // basement pit under the bank row

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/banks.ts). Left and right rails run back -> front
// down each side lane (and on into the basement), the bottom rail runs west -> east along the bank
// row and the top rail west -> east along the back row, so the markers keep the rails' order in
// every view (scripts/check-crossings.mjs).
export const BANKS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: side lanes
  consumer_credit: { pos: [-4.3, S + 0.47, -1.6], side: "left" }, // phone & EMI store roof, by its card sign
  vehicle_finance: { pos: [-3.72, S + 0.3, -0.62], side: "left" }, // truck cab in the vehicle yard
  gold_loans: { pos: [-3.37, S + 0.36, 0.7], side: "left" }, // gold-loan shop fascia
  microfinance: { pos: [3.92, S + 0.16, -2.0], side: "right" }, // group meeting on the mat
  msme_lending: { pos: [4.43, S + 0.33, -0.62], side: "right" }, // workshop sign
  affordable_housing: { pos: [3.62, S + 0.36, 0.42], side: "right" }, // first small-house roof
  // layer 1: bank row
  large_banks: { pos: [-2.12, S + 0.42, 2.13], side: "bottom" }, // tower entrance canopy
  psu_banks: { pos: [-0.4, S + 0.73, 2.12], side: "bottom" }, // columned hall's frieze
  midsize_private: { pos: [1.1, S + 0.37, 2.12], side: "bottom" }, // mid-rise entrance sign
  sfb: { pos: [2.3, S + 0.34, 2.12], side: "bottom" }, // small branch awning sign
  // layer 2: back row
  diversified_nbfc: { pos: [-1.5, S + 1.06, -1.83], side: "top" }, // group HQ roof sign (east end)
  prime_housing: { pos: [0.0, S + 0.8, -1.83], side: "top" }, // housing-finance office sign
  infra_lenders: { pos: [1.82, S + 0.78, -2.45], side: "top" }, // solar roof of the state lender
  // layer 3: basement
  oversight: { pos: [-2.62, B0 + 0.2, 1.35], side: "left" }, // central-bank vault door
  credit_rails: { pos: [2.84, B0 + 0.31, 1.52], side: "right" }, // payment-switch racks
};

export const BANKS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.4, 6.6, 9.4],
    target: [0, 0.8, 0],
    narration:
      "Welcome to the credit street. Specialist lenders work the side lanes, banks face the road, finance groups and state lenders sit at the back, and the central bank's vault and the payment rails run underneath. Peel it layer by layer, from the lanes to the vault.",
  },
  {
    id: "lanes",
    layer: 0,
    label: "Side Lanes",
    pos: [0.2, 7.8, 7.8],
    target: [0, 0.4, -0.4],
    narration:
      "The side lanes are where non-bank lenders meet borrowers. On the left: phone EMIs and credit cards, a vehicle-finance yard and a gold-loan shop. On the right: a microfinance group meeting, a workshop borrowing against the owner's house, and small homes being built on affordable home loans.",
  },
  {
    id: "bankrow",
    layer: 1,
    label: "Bank Row",
    pos: [1.0, 2.5, 7.8],
    target: [0.2, 0.9, 1.2],
    narration:
      "The bank row faces the road. The glass tower is a large private bank, the columned hall a public-sector bank, the teal office a mid-size private bank and the small branch a small finance bank. Each takes in deposits and lends them on, including to the lenders in the lanes.",
  },
  {
    id: "backrow",
    layer: 2,
    label: "Groups & State",
    pos: [3.6, 5.2, 5.0],
    target: [0, 0.6, -2.0],
    narration:
      "At the back sit the bigger balance sheets: a finance group's headquarters with lending, insurance and fund arms, a housing-finance office with its show house, and a state lender that funds power lines, solar farms and railways at near-government rates.",
  },
  {
    id: "vault",
    layer: 3,
    label: "Vault & Rails",
    pos: [5.6, 8.4, 7.4],
    target: [0.3, 0.1, 0.7],
    narration:
      "Under the bank row run the rules and the rails. On the left, the central bank's vault and refinance desks set and fund the system. On the right, the switch room carries card and UPI payments, credit-bureau scores and the software every loan runs on.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the bank row along the road, the lenders' lanes down both sides, the courtyard in the middle and the groups and state lenders along the back, with the vault and switch room under the bank row.",
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

export function buildBanks(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [laneG, bankG, backG, coreG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const R = rng(20261118);

  // ---------------------------------------------------------------- geometry helpers
  const std = (color: number, metalness = 0.2, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop = r) =>
    new THREE.CylinderGeometry(rTop, r, h, seg).translate(x, y + h / 2, z);
  const vPlane = (w: number, h: number, x: number, y: number, z: number, ry = 0) =>
    new THREE.PlaneGeometry(w, h).rotateY(ry).translate(x, y, z);
  const floorPlane = (x0: number, x1: number, z0: number, z1: number, y: number) =>
    new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** Four facade planes (no top) with the texture tiled tw x th world units per repeat. */
  const facadeShell = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, tw: number, th: number, faces = "nsew") => {
    const h = y1 - y0,
      yc = (y0 + y1) / 2,
      w = x1 - x0,
      d = z1 - z0;
    const out: T.BufferGeometry[] = [];
    if (faces.includes("s")) out.push(uvScale(vPlane(w, h, (x0 + x1) / 2, yc, z1), w / tw, h / th));
    if (faces.includes("n")) out.push(uvScale(vPlane(w, h, (x0 + x1) / 2, yc, z0, Math.PI), w / tw, h / th));
    if (faces.includes("e")) out.push(uvScale(vPlane(d, h, x1, yc, (z0 + z1) / 2, Math.PI / 2), d / tw, h / th));
    if (faces.includes("w")) out.push(uvScale(vPlane(d, h, x0, yc, (z0 + z1) / 2, -Math.PI / 2), d / tw, h / th));
    return out;
  };
  /** Gable roof (ridge along x) over [x0,x1]x[z0,z1] from eave height y to y + rise. */
  const gable = (x0: number, x1: number, z0: number, z1: number, y: number, rise: number, over = 0.03) => {
    const zc = (z0 + z1) / 2,
      hw = (z1 - z0) / 2 + over;
    const shape = new THREE.Shape();
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(0, rise);
    shape.lineTo(-hw, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0 + 2 * over, bevelEnabled: false });
    g.rotateY(Math.PI / 2).translate(x0 - over, y, zc);
    g.computeVertexNormals();
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
    if (!items.length) return null;
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
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => canvasTexture(THREE, w, h, draw);
  const sign = (text: string, bg: string, fg: string, w = 256, h = 64, px = 34, sub?: string) =>
    tex(w, h, (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = font(px);
      g.fillText(text, W / 2, sub ? H * 0.38 : H / 2 + 2);
      if (sub) {
        g.font = font(Math.round(px * 0.5), "600");
        g.fillText(sub, W / 2, H * 0.76);
      }
    });
  /** Window grid: cols x rows per repeat, some lit. */
  const windows = (cols: number, rows: number, wall: string, glassA: string, glassB: string, lit: number, frame = 6) =>
    (() => {
      const t = tex(256, 256, (g, w, h) => {
        g.fillStyle = wall;
        g.fillRect(0, 0, w, h);
        const cw = w / cols,
          rh = h / rows;
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++) {
            const on = R() < lit;
            const gr = g.createLinearGradient(0, j * rh, 0, (j + 1) * rh);
            gr.addColorStop(0, on ? "#f1e3b6" : glassA);
            gr.addColorStop(1, on ? "#d2bf88" : glassB);
            g.fillStyle = gr;
            g.fillRect(i * cw + frame, j * rh + frame + 2, cw - 2 * frame, rh - 2 * frame - 2);
          }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })();

  // Ground: paving, road, lanes, courtyard and lawn, drawn to the plinth's plan.
  const GX = 2 * PX,
    GZ = 2 * PZ,
    GS = 120;
  const groundTex = tex(GX * GS, GZ * GS, (g) => {
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
    rect(-PX, -PZ, PX, PZ, "#aeb1b4");
    grid(-PX, -PZ, PX, PZ, 0.2, "rgba(0,0,0,0.07)");
    // Back lawn strip.
    rect(-PX, -PZ, PX, -3.05, "#5f7d4a");
    // Road along the front: lanes, kerb and a zebra crossing.
    rect(-PX, 2.66, PX, PZ, "#3b3e43");
    rect(-PX, 2.6, PX, 2.66, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.03);
      g.fillRect(a, b, 0.25 * GS, 3);
    }
    for (let x = 0.2; x < 0.75; x += 0.11) {
      const [a, b] = P(x, 2.68);
      g.fillRect(a, b, 0.055 * GS, 0.66 * GS);
    }
    // Courtyard: warm stone with a lighter path grid.
    rect(-3.0, -1.72, 3.1, 0.36, "#cdc5b7");
    grid(-3.0, -1.72, 3.1, 0.36, 0.34, "rgba(90,70,50,0.13)");
    // West lane: worn tarmac for the vehicle yard, paving for the shops.
    rect(-4.5, -1.28, -3.2, -0.02, "#6b6e72");
    g.strokeStyle = "#e7e3d6";
    g.lineWidth = 2;
    for (let z = -1.2; z < 0; z += 0.4) {
      g.beginPath();
      g.moveTo(...P(-4.45, z));
      g.lineTo(...P(-3.3, z));
      g.stroke();
    }
    // East lane: packed earth and grass for the village meeting, plots for the houses.
    rect(3.3, -2.85, 4.6, -1.3, "#9c8a62");
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = i % 3 ? "#7f9a52" : "#8a7a55";
      const [a, b] = P(lerp(3.3, 4.6, R()), lerp(-2.85, -1.3, R()));
      g.fillRect(a, b, 3, 3);
    }
    rect(3.3, 0.15, 4.6, 2.3, "#a99c80");
    grid(3.3, 0.15, 4.6, 2.3, 0.5, "rgba(70,55,35,0.25)");
  });

  // Facades.
  const towerTex = windows(4, 6, "#3a4a5a", "#7d9cb6", "#3b5a78", 0.1, 4);
  const midTex = windows(3, 4, "#1f4a4f", "#6fb3b0", "#2d6a6c", 0.08, 4);
  const stoneTex = windows(3, 2, "#e1d6bf", "#6f8296", "#3e4e60", 0.1, 14);
  const hqTex = windows(5, 5, "#c7c9cc", "#6b88a2", "#3c556d", 0.12, 6);
  const officeTex = windows(4, 3, "#e8e1d4", "#7d97ad", "#4b6279", 0.12, 9);
  const stateTex = windows(3, 3, "#d8c9a8", "#5a6e82", "#34465a", 0.1, 12);
  const shopTex = windows(2, 1, "#e6e0d4", "#5f7d96", "#2f4559", 0.6, 10);
  const houseTex = windows(2, 2, "#e9d9bd", "#4e6478", "#2c3d4e", 0.25, 18);

  // Signs (generic words only).
  const tBank = sign("BANK", "#1d2b3c", "#f2f4f6", 256, 64, 40);
  const tPsu = sign("PUBLIC SECTOR BANK", "#e1d6bf", "#5b4a2a", 512, 64, 30);
  const tMid = sign("BANK", "#0f3b3f", "#e9fbf8", 128, 256, 34);
  const tSfb = sign("SMALL FINANCE BANK", "#7a2e5c", "#ffffff", 512, 64, 30);
  const tCard = tex(256, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#3a5bd9");
    gr.addColorStop(1, "#7b3fc4");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8c768";
    g.fillRect(26, 50, 44, 34);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = font(20, "600");
    g.fillText("4512  ••••  ••••  2026", 26, 116);
    g.font = font(18);
    g.fillText("EMI  •  CREDIT", 26, 30);
  });
  const tPhone = sign("PHONES & EMI", "#c0392b", "#ffffff", 256, 64, 30);
  const tVehicle = sign("VEHICLE LOANS", "#2e6fb0", "#ffffff", 256, 64, 28);
  const tGold = sign("GOLD LOAN", "#b8860b", "#fff7d6", 256, 64, 36);
  const tWork = sign("WORKSHOP", "#3b6b3a", "#f3f7ea", 256, 64, 32);
  const tGroup = sign("GROUP HQ", "#3a2f55", "#f0ecfa", 256, 64, 36);
  const tHome = sign("HOME LOANS", "#1f6f99", "#ffffff", 256, 64, 34);
  const tState = sign("INFRA FINANCE", "#5a4a2a", "#f8f0d8", 256, 64, 30);
  const tAtm = tex(64, 64, (g, w, h) => {
    g.fillStyle = "#0b2742";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4fc3ff";
    g.fillRect(6, 8, w - 12, 10);
    g.fillStyle = "#a8e3ff";
    for (let i = 0; i < 3; i++) g.fillRect(10, 26 + i * 11, w - 20, 5);
  });
  // Network wall: nodes and links on a dark field; dots scroll along them (animated via offset).
  const netTex = tex(512, 256, (g, w, h) => {
    g.fillStyle = "#07131f";
    g.fillRect(0, 0, w, h);
    const nodes: [number, number][] = [];
    for (let i = 0; i < 22; i++) nodes.push([20 + R() * (w - 40), 20 + R() * (h - 40)]);
    g.strokeStyle = "rgba(80,200,255,0.45)";
    g.lineWidth = 2;
    nodes.forEach(([x, y], i) => {
      for (let k = 1; k <= 2; k++) {
        const [x2, y2] = nodes[(i + k * 5) % nodes.length];
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x2, y2);
        g.stroke();
      }
    });
    nodes.forEach(([x, y], i) => {
      g.fillStyle = i % 4 ? "#3fd0ff" : "#ffcf3f";
      g.beginPath();
      g.arc(x, y, i % 4 ? 5 : 8, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = "#9fe6ff";
    g.font = font(22);
    g.fillText("PAYMENTS SWITCH", 18, 30);
  });
  netTex.wrapS = THREE.RepeatWrapping;
  // Bureau / score dashboard on monitors.
  const monTex = tex(64, 40, (g, w, h) => {
    g.fillStyle = "#10202e";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3fd08a";
    for (let i = 0; i < 6; i++) g.fillRect(6 + i * 9, h - 6 - ((i * 7) % 22) - 6, 6, ((i * 7) % 22) + 6);
    g.fillStyle = "#7fc8ff";
    g.fillRect(4, 4, w - 8, 4);
  });
  // Rack fronts: LED columns; offset.y steps through 4 frames to blink.
  const rackLed = (() => {
    const t = tex(64, 256, (g, w, h) => {
      for (let f = 0; f < 4; f++) {
        const y0 = (f * h) / 4;
        g.fillStyle = "#111820";
        g.fillRect(0, y0, w, h / 4);
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < 3; c++) {
            const on = (r * 3 + c + f * 5) % 4 !== 0;
            g.fillStyle = on ? (c === 2 ? "#3aa6ff" : "#2fe07a") : "#22303a";
            g.fillRect(8 + c * 18, y0 + 6 + r * 6.4, 10, 3);
          }
      }
    });
    t.repeat.set(1, 0.25);
    return t;
  })();

  // ---------------------------------------------------------------- materials
  const screen = (bucket: string, map: T.Texture, intensity = 1) =>
    L.add(bucket, std(0x0a0d12, 0, 0.35, { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: intensity }));
  const signMat = (bucket: string, map: T.Texture, glow = 0.35) =>
    L.add(bucket, std(0xffffff, 0.05, 0.55, { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow }));
  /** Interior/equipment palette for one layer bucket. */
  const pal = (bucket: string) => ({
    white: L.add(bucket, std(0xeef0f2, 0.1, 0.45)),
    grey: L.add(bucket, std(0x8d97a1, 0.4, 0.45)),
    dark: L.add(bucket, std(0x262c33, 0.4, 0.45)),
    steel: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
    wood: L.add(bucket, std(0x9a7450, 0.05, 0.55)),
    desk: L.add(bucket, std(0xe7e3dc, 0.05, 0.5)),
    chair: L.add(bucket, std(0x2c3440, 0.2, 0.6)),
    glass: L.add(bucket, std(0xcfe6f2, 0.1, 0.05, { opacity: 0.25, side: DS, depthWrite: false })),
    frame: L.add(bucket, std(0x59626c, 0.7, 0.35)),
    mon: screen(bucket, monTex, 1.0),
    body: L.add(bucket, std(0xffffff, 0.05, 0.75)),
    skin: L.add(bucket, std(0xc89878, 0.05, 0.7)),
    green: L.add(bucket, std(0x4a8a3e, 0, 0.85)),
    trunk: L.add(bucket, std(0x5a4632, 0, 0.9)),
    gold: L.add(bucket, std(0xd8a93a, 0.85, 0.28)),
    red: L.add(bucket, std(0xb8382e, 0.3, 0.45)),
    blue: L.add(bucket, std(0x2f5d9a, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.3, 0.45)),
    roof: L.add(bucket, std(0x9a4b35, 0.05, 0.75)),
    stone: L.add(bucket, std(0xe4dccb, 0.05, 0.7)),
    paint: L.add(bucket, std(0xffffff, 0, 0.8)),
  });
  type Pal = ReturnType<typeof pal>;
  const mBase = {
    plinth: L.add("base", std(0x1f2731, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2f8fbf, emissiveIntensity: 0.4 })),
    ground: L.add("base", std(0xffffff, 0, 0.9, { map: groundTex })),
  };
  const ln = {
    ...pal("lane"),
    shop: L.add("lane", std(0xffffff, 0.1, 0.6, { map: shopTex })),
    house: L.add("lane", std(0xffffff, 0.05, 0.75, { map: houseTex })),
    card: signMat("lane", tCard, 0.45),
    phone: signMat("lane", tPhone),
    vehicle: signMat("lane", tVehicle),
    goldSign: signMat("lane", tGold, 0.5),
    work: signMat("lane", tWork),
    shutter: L.add("lane", std(0x9aa3ab, 0.6, 0.4)),
    mat: L.add("lane", std(0xc0552f, 0, 0.9)),
    brick: L.add("lane", std(0xb5653f, 0.02, 0.85)),
    scaffold: L.add("lane", std(0xd6a23a, 0.4, 0.5)),
    truck: L.add("lane", std(0xd65f2a, 0.35, 0.45)),
    tractor: L.add("lane", std(0x3f8a3a, 0.3, 0.5)),
    tyre: L.add("lane", std(0x1c1e21, 0.1, 0.85)),
    carGlass: L.add("lane", std(0x1b2631, 0.6, 0.15)),
  };
  const yd = {
    ...pal("yard"),
    car: L.add("yard", std(0xffffff, 0.5, 0.35)),
    carGlass: L.add("yard", std(0x1b2631, 0.6, 0.15)),
    lamp: L.add("yard", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    van: L.add("yard", std(0xf2f2ee, 0.4, 0.4)),
  };
  const bk = {
    ...pal("bank"),
    tower: L.add("bank", std(0xffffff, 0.4, 0.25, { map: towerTex })),
    mid: L.add("bank", std(0xffffff, 0.35, 0.25, { map: midTex })),
    stoneWin: L.add("bank", std(0xffffff, 0.05, 0.7, { map: stoneTex })),
    shopWin: L.add("bank", std(0xffffff, 0.1, 0.6, { map: shopTex })),
    roofSlab: L.add("bank", std(0xaab1b8, 0.2, 0.7)),
    bankSign: signMat("bank", tBank, 0.5),
    psuSign: signMat("bank", tPsu, 0.25),
    midSign: signMat("bank", tMid, 0.5),
    sfbSign: signMat("bank", tSfb, 0.45),
    awning: L.add("bank", std(0x7a2e5c, 0.1, 0.6)),
    atm: screen("bank", tAtm, 1.1),
    teal: L.add("bank", std(0x1f5e63, 0.4, 0.35)),
  };
  const deck = {
    slab: L.add("deck", std(0xd4d0c8, 0.05, 0.6)),
    floor: L.add("deck", std(0xcfc9bd, 0.1, 0.5)),
  };
  const bkIn = pal("bankIn");
  const br = {
    ...pal("back"),
    hq: L.add("back", std(0xffffff, 0.3, 0.35, { map: hqTex })),
    office: L.add("back", std(0xffffff, 0.1, 0.6, { map: officeTex })),
    state: L.add("back", std(0xffffff, 0.05, 0.7, { map: stateTex })),
    house: L.add("back", std(0xffffff, 0.05, 0.75, { map: houseTex })),
    group: signMat("back", tGroup, 0.45),
    home: signMat("back", tHome, 0.45),
    stateSign: signMat("back", tState, 0.35),
    solar: L.add("back", std(0x1d3557, 0.6, 0.2)),
    pylon: L.add("back", std(0x8f979e, 0.8, 0.35)),
    wagon: L.add("back", std(0x7b3b2a, 0.4, 0.5)),
    rail: L.add("back", std(0x6b6f74, 0.8, 0.4)),
    lawn: L.add("back", std(0x5f8f4a, 0, 0.9)),
    roofSlab: L.add("back", std(0xa9b0b6, 0.2, 0.7)),
  };
  const co = {
    ...pal("core"),
    lining: L.add("core", std(0xb9b4ab, 0.05, 0.85)),
    floor: L.add("core", std(0xbfc5cb, 0.1, 0.55)),
    vault: L.add("core", std(0xc7ccd1, 0.92, 0.22)),
    vaultDark: L.add("core", std(0x6b737c, 0.85, 0.3)),
    cash: L.add("core", std(0x7fae7a, 0.05, 0.7)),
    rackSide: L.add("core", std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add("core", std(0x2b333d, 0.5, 0.4)),
    rackFront: L.add("core", std(0xffffff, 0.3, 0.4, { map: rackLed, emissive: 0xffffff, emissiveMap: rackLed, emissiveIntensity: 1.0 })),
    net: screen("core", netTex, 1.15),
    tray: L.add("core", std(0xe2b33a, 0.35, 0.45)),
  };

  // ---------------------------------------------------------------- shared kit
  // People: capsule body (instance-coloured clothes) + head.
  const bodyGeo = new THREE.CapsuleGeometry(0.024, 0.085, 3, 8).translate(0, 0.067, 0);
  const headGeo = new THREE.SphereGeometry(0.021, 10, 8).translate(0, 0.158, 0);
  const sitBody = new THREE.CapsuleGeometry(0.024, 0.05, 3, 8).translate(0, 0.05, 0);
  const sitHead = new THREE.SphereGeometry(0.021, 10, 8).translate(0, 0.122, 0);
  const CLOTHES = [0x2b4c7e, 0x8a2b2b, 0x3d6b4f, 0xd9d2c5, 0x4a4a52, 0xc77d2e, 0x6b4f8a, 0x1f2a36, 0x5c8fb8, 0xd04f7a, 0xe0b23a];
  const crowds = new Map<string, { parent: T.Object3D; P: Pal; items: Item[]; sit: Item[] }>();
  const crowd = (parent: T.Object3D, P: Pal) => {
    const k = parent.uuid + "|" + P.body.uuid;
    if (!crowds.has(k)) crowds.set(k, { parent, P, items: [], sit: [] });
    return crowds.get(k)!;
  };
  const people = (parent: T.Object3D, P: Pal, pts: [number, number, number, number?][], colors = CLOTHES) => {
    const c = crowd(parent, P);
    for (const [x, y, z, ry] of pts) c.items.push({ p: [x, y, z], ry: ry ?? R() * Math.PI * 2, c: colors[Math.floor(R() * colors.length)] });
  };
  const seated = (parent: T.Object3D, P: Pal, pts: [number, number, number, number?][], colors = CLOTHES) => {
    const c = crowd(parent, P);
    for (const [x, y, z, ry] of pts) c.sit.push({ p: [x, y, z], ry: ry ?? 0, c: colors[Math.floor(R() * colors.length)] });
  };
  /** Desks facing local -z (the person sits on +z), n monitors facing the person. */
  const desks = (parent: T.Object3D, P: Pal, items: Item[], n = 2, w = 0.24) => {
    if (!items.length) return;
    const top = mergeInto(THREE, [bx(-w / 2, w / 2, 0.09, 0.1, -0.06, 0.06), bx(-w / 2 + 0.01, -w / 2 + 0.03, 0, 0.09, -0.05, 0.05), bx(w / 2 - 0.03, w / 2 - 0.01, 0, 0.09, -0.05, 0.05)]);
    const bez: T.BufferGeometry[] = [];
    const scr: T.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 0.075;
      const a = (k - (n - 1) / 2) * 0.25;
      bez.push(bx(-0.034, 0.034, -0.023, 0.023, -0.004, 0).rotateY(-a).translate(x, 0.145, -0.03), bx(x - 0.004, x + 0.004, 0.1, 0.125, -0.036, -0.03));
      scr.push(vPlane(0.062, 0.04, 0, 0, 0.0005, 0).rotateY(-a).translate(x, 0.145, -0.03));
    }
    const chair = mergeInto(THREE, [bx(-0.03, 0.03, 0.05, 0.06, 0.07, 0.13), bx(-0.03, 0.03, 0.06, 0.13, 0.125, 0.135), bx(-0.004, 0.004, 0, 0.05, 0.096, 0.104)]);
    inst(parent, top, P.desk, items);
    inst(parent, mergeInto(THREE, bez), P.dark, items);
    inst(parent, mergeInto(THREE, scr), P.mon, items);
    inst(parent, chair, P.chair, items);
  };
  const RW = 0.11,
    RD = 0.17;
  const racks = (parent: T.Object3D, rh: number, items: Item[]) => {
    const g = new THREE.BoxGeometry(RW * 0.95, rh, RD).translate(0, rh / 2, 0);
    inst(parent, g, [co.rackSide, co.rackSide, co.rackTop, co.rackSide, co.rackFront, co.rackSide], items);
  };
  const treeTrunk = cyl(0.018, 0.16, 0, 0, 0, 6, 0.012);
  const treeTop = new THREE.IcosahedronGeometry(0.12, 1).scale(1, 1.1, 1).translate(0, 0.24, 0);
  const trees = new Map<string, { parent: T.Object3D; P: Pal; items: Item[] }>();
  const tree = (parent: T.Object3D, P: Pal, x: number, z: number, s = 1, y = S) => {
    const k = parent.uuid + "|" + P.green.uuid;
    if (!trees.has(k)) trees.set(k, { parent, P, items: [] });
    trees.get(k)!.items.push({ p: [x, y, z], s: [s, s * (0.9 + R() * 0.25), s], ry: R() * 6 });
  };
  /** A small car (body + glass), facing +x, on the ground at (x, y, z). */
  const carParts = (x: number, y: number, z: number, ry: number, len = 0.3) => {
    const w = len * 0.46;
    const body = rb(len, 0.07, w, 0.025, 0, 0.025, 0);
    const cab = rb(len * 0.55, 0.06, w * 0.86, 0.022, -len * 0.04, 0.085, 0);
    const wheels: T.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheels.push(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 12).rotateX(Math.PI / 2).translate(sx * len * 0.32, 0.028, sz * w * 0.45));
    const tr = (g: T.BufferGeometry) => g.rotateY(ry).translate(x, y, z);
    return { body: tr(body), cab: tr(cab), wheels: wheels.map(tr) };
  };
  const cars: Item[] = [];
  const carCab: Item[] = [];
  const carGeo = (() => {
    const c = carParts(0, 0, 0, 0);
    return { body: c.body, cab: c.cab, wheels: mergeInto(THREE, c.wheels) };
  })();

  // ================================================================ PLINTH + GROUND
  const plinthShape = (() => {
    const s = new THREE.Shape();
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
    g.rotateX(-Math.PI / 2).translate(0, 0.14, 0);
    const m = new THREE.Mesh(g, mBase.lip);
    m.frustumCulled = false;
    baseG.add(m);
    return m;
  })();

  // ================================================================ LAYER 0: SIDE LANES + COURTYARD
  // ---- West lane: phone & EMI store with a credit-card sign.
  {
    const x0 = -4.42,
      x1 = -3.42,
      z0 = -2.62,
      z1 = -1.42,
      h = 0.44;
    put(laneG, ln.shop, ...facadeShell(x0, x1, z0, z1, S, S + h, 0.5, h));
    put(laneG, ln.stone, bx(x0 - 0.02, x1 + 0.02, S + h, S + h + 0.03, z0 - 0.02, z1 + 0.02));
    put(laneG, ln.phone, vPlane(0.62, 0.11, x1 + 0.006, S + h - 0.08, (z0 + z1) / 2, Math.PI / 2));
    // Standing credit card on the roof, turned to face the lane.
    put(laneG, ln.card, vPlane(0.42, 0.26, -3.86, S + h + 0.2, -2.0, Math.PI / 2 - 0.35));
    put(laneG, ln.dark, roundedBox(THREE, 0.44, 0.28, 0.02, 0.02).rotateY(Math.PI / 2 - 0.35).translate(-3.875, S + h + 0.2, -2.0 - 0.01));
    put(laneG, ln.steel, bar(THREE, [-3.9, S + h, -2.12], [-3.9, S + h + 0.08, -2.12], 0.008), bar(THREE, [-3.9, S + h, -1.88], [-3.9, S + h + 0.08, -1.88], 0.008));
    // Display tables with phones/TVs in front.
    put(laneG, ln.desk, bx(-3.35, -3.2, S, S + 0.08, -2.4, -1.7));
    put(laneG, ln.dark, bx(-3.32, -3.24, S + 0.08, S + 0.1, -2.35, -1.75));
    people(laneG, ln, [
      [-3.12, S, -2.2, -Math.PI / 2],
      [-3.1, S, -1.85, -Math.PI / 2],
      [-3.28, S, -1.55, 0.4],
    ]);
  }
  // ---- West lane: vehicle-finance yard (truck, tractor, car) and its cabin.
  {
    // Finance cabin at the back of the yard.
    put(laneG, ln.shop, ...facadeShell(-4.45, -4.1, -1.2, -0.75, S, S + 0.3, 0.35, 0.3));
    put(laneG, ln.stone, bx(-4.47, -4.08, S + 0.3, S + 0.325, -1.22, -0.73));
    put(laneG, ln.vehicle, vPlane(0.42, 0.1, -4.09, S + 0.24, -0.975, Math.PI / 2));
    // Truck: cab + cargo box, facing +z.
    const tx = -3.72,
      tz = -0.55;
    put(laneG, ln.truck, rb(0.17, 0.17, 0.15, 0.02, tx, S + 0.05, tz + 0.18));
    put(laneG, ln.carGlass, bx(tx - 0.07, tx + 0.07, S + 0.15, S + 0.205, tz + 0.255, tz + 0.258));
    put(laneG, ln.white, bx(tx - 0.09, tx + 0.09, S + 0.05, S + 0.27, tz - 0.32, tz + 0.09));
    put(laneG, ln.blue, bx(tx - 0.092, tx + 0.092, S + 0.2, S + 0.22, tz - 0.31, tz + 0.08));
    const tyres: T.BufferGeometry[] = [];
    for (const z of [tz + 0.17, tz - 0.05, tz - 0.25]) for (const sx of [-1, 1]) tyres.push(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14).rotateZ(Math.PI / 2).translate(tx + sx * 0.08, S + 0.04, z));
    // Tractor: big rear wheels, small front, bonnet + cab frame, facing +z.
    const kx = -4.2,
      kz = -0.35;
    tyres.push(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16).rotateZ(Math.PI / 2).translate(kx - 0.07, S + 0.065, kz - 0.06));
    tyres.push(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16).rotateZ(Math.PI / 2).translate(kx + 0.07, S + 0.065, kz - 0.06));
    tyres.push(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12).rotateZ(Math.PI / 2).translate(kx - 0.055, S + 0.035, kz + 0.13));
    tyres.push(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12).rotateZ(Math.PI / 2).translate(kx + 0.055, S + 0.035, kz + 0.13));
    put(laneG, ln.tyre, ...tyres);
    put(laneG, ln.tractor, rb(0.08, 0.07, 0.2, 0.02, kx, S + 0.05, kz + 0.06), rb(0.1, 0.05, 0.1, 0.015, kx, S + 0.08, kz - 0.06));
    put(laneG, ln.dark, bar(THREE, [kx - 0.045, S + 0.13, kz - 0.1], [kx - 0.045, S + 0.24, kz - 0.1], 0.006), bar(THREE, [kx + 0.045, S + 0.13, kz - 0.1], [kx + 0.045, S + 0.24, kz - 0.1], 0.006), bx(kx - 0.06, kx + 0.06, S + 0.24, S + 0.25, kz - 0.14, kz - 0.0));
    // A car for sale.
    cars.push({ p: [-3.55, S, -1.05], ry: 0.2, c: 0xd9dfe6 });
    people(laneG, ln, [
      [-3.95, S, -0.95, 1.2],
      [-3.45, S, -0.2, 2.6],
    ]);
  }
  // ---- West lane: gold-loan shop (fascia faces the courtyard).
  {
    const x0 = -4.4,
      x1 = -3.4,
      z0 = 0.18,
      z1 = 1.22,
      h = 0.42;
    put(laneG, ln.shop, ...facadeShell(x0, x1, z0, z1, S, S + h, 0.52, h));
    put(laneG, ln.stone, bx(x0 - 0.02, x1 + 0.02, S + h, S + h + 0.03, z0 - 0.02, z1 + 0.02));
    put(laneG, ln.goldSign, vPlane(0.7, 0.13, x1 + 0.008, S + h - 0.07, 0.7, Math.PI / 2));
    put(laneG, ln.gold, bx(x1 + 0.002, x1 + 0.012, S + h - 0.15, S + h - 0.135, z0 + 0.1, z1 - 0.1));
    // Steps, a guard and a customer with a jewellery box.
    put(laneG, ln.stone, bx(x1, x1 + 0.12, S, S + 0.025, 0.45, 0.95));
    people(laneG, ln, [
      [-3.2, S, 0.38, -Math.PI / 2],
      [-3.25, S, 0.95, -1.2],
      [-3.08, S, 0.75, -1.9],
    ]);
    put(laneG, ln.gold, rb(0.04, 0.025, 0.03, 0.006, -3.15, S + 0.1, 0.75));
  }
  // ---- East lane: a microfinance group meeting under a big tree, a loan officer's scooter, a hut.
  {
    const cx = 3.92,
      cz = -2.0;
    put(laneG, ln.mat, new THREE.CircleGeometry(0.3, 28).rotateX(-Math.PI / 2).translate(cx, S + 0.006, cz));
    const ring: [number, number, number, number][] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      ring.push([cx + 0.23 * Math.cos(a), S, cz + 0.23 * Math.sin(a), -a - Math.PI / 2]);
    }
    seated(laneG, ln, ring, [0xd04f7a, 0xe0b23a, 0x2fa38c, 0x8a2b8a, 0xe06a2a, 0x4a7fd0]);
    people(laneG, ln, [[cx + 0.02, S, cz + 0.4, Math.PI]], [0x2b4c7e]);
    // Ledger on a low stool by the officer.
    put(laneG, ln.wood, bx(cx - 0.05, cx + 0.05, S, S + 0.05, cz + 0.27, cz + 0.33));
    put(laneG, ln.white, bx(cx - 0.035, cx + 0.035, S + 0.05, S + 0.056, cz + 0.28, cz + 0.32));
    // Big shade tree.
    put(laneG, ln.trunk, cyl(0.05, 0.42, 4.32, S, -2.42, 8, 0.03));
    put(laneG, ln.green, new THREE.IcosahedronGeometry(0.34, 1).scale(1.2, 0.7, 1.1).translate(4.25, S + 0.55, -2.25));
    // Scooter.
    put(laneG, ln.red, rb(0.16, 0.05, 0.05, 0.015, 3.5, S + 0.04, -1.55));
    put(laneG, ln.tyre, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2).translate(3.44, S + 0.03, -1.55), new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2).translate(3.57, S + 0.03, -1.55));
    put(laneG, ln.dark, bar(THREE, [3.58, S + 0.07, -1.55], [3.6, S + 0.16, -1.55], 0.006));
    // Village hut with a thatched roof.
    put(laneG, ln.stone, cyl(0.17, 0.2, 3.62, S, -2.55, 18));
    put(laneG, ln.yellow, new THREE.ConeGeometry(0.22, 0.18, 18).translate(3.62, S + 0.29, -2.55));
  }
  // ---- East lane: small workshop with the owner's house above (loan against property).
  {
    const x0 = 3.45,
      x1 = 4.45,
      z0 = -1.22,
      z1 = -0.02;
    put(laneG, ln.shop, ...facadeShell(x0, x1, z0, z1, S, S + 0.3, 0.5, 0.3, "nsw"));
    put(laneG, ln.shutter, vPlane(z1 - z0 - 0.1, 0.26, x1, S + 0.13, (z0 + z1) / 2, Math.PI / 2));
    const ribs: T.BufferGeometry[] = [];
    for (let y = S + 0.02; y < S + 0.26; y += 0.025) ribs.push(bx(x1, x1 + 0.006, y, y + 0.006, z0 + 0.05, z1 - 0.05));
    put(laneG, ln.dark, ...ribs);
    put(laneG, ln.work, vPlane(0.6, 0.1, x1 + 0.008, S + 0.33, -0.62, Math.PI / 2));
    put(laneG, ln.house, ...facadeShell(x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05, S + 0.38, S + 0.62, 0.45, 0.24));
    put(laneG, ln.stone, bx(x0, x1, S + 0.3, S + 0.38, z0, z1));
    put(laneG, ln.roof, gable(x0 + 0.02, x1 - 0.02, z0 + 0.02, z1 - 0.02, S + 0.62, 0.16));
    // Work bench and a customer's bike outside.
    put(laneG, ln.wood, bx(4.48, 4.6, S, S + 0.07, -1.05, -0.8));
    people(laneG, ln, [
      [4.56, S, -0.35, Math.PI / 2],
      [3.3, S, -0.75, 0.3],
    ]);
  }
  // ---- East lane: a row of small houses, one still being built.
  {
    const lots: [number, number, boolean][] = [
      [0.42, 3.62, false],
      [0.82, 4.15, false],
      [1.32, 3.62, false],
      [1.82, 4.15, true],
    ];
    for (const [z, x, building] of lots) {
      const w = 0.38,
        d = 0.32,
        h = 0.26;
      if (building) {
        // Brick walls half up, scaffold round it.
        put(laneG, ln.brick, ...facadeShell(x - w / 2, x + w / 2, z - d / 2, z + d / 2, S, S + 0.16, 0.2, 0.16));
        const sc: T.BufferGeometry[] = [];
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) sc.push(bar(THREE, [x + sx * (w / 2 + 0.04), S, z + sz * (d / 2 + 0.04)], [x + sx * (w / 2 + 0.04), S + 0.32, z + sz * (d / 2 + 0.04)], 0.006));
        for (const y of [0.12, 0.24, 0.32]) {
          sc.push(bar(THREE, [x - w / 2 - 0.04, S + y, z + d / 2 + 0.04], [x + w / 2 + 0.04, S + y, z + d / 2 + 0.04], 0.005));
          sc.push(bar(THREE, [x + w / 2 + 0.04, S + y, z - d / 2 - 0.04], [x + w / 2 + 0.04, S + y, z + d / 2 + 0.04], 0.005));
        }
        put(laneG, ln.scaffold, ...sc);
        put(laneG, ln.brick, bx(x + 0.25, x + 0.35, S, S + 0.06, z - 0.05, z + 0.05));
        people(laneG, ln, [[x - 0.26, S, z + 0.1, 0.6]], [0xe0b23a, 0xe06a2a]);
      } else {
        put(laneG, ln.house, ...facadeShell(x - w / 2, x + w / 2, z - d / 2, z + d / 2, S, S + h, 0.19, h));
        put(laneG, ln.roof, gable(x - w / 2, x + w / 2, z - d / 2, z + d / 2, S + h, 0.15));
        put(laneG, ln.wood, bx(x + w / 2, x + w / 2 + 0.003, S, S + 0.13, z - 0.04, z + 0.04));
      }
    }
    tree(laneG, ln, 4.45, 2.05, 0.7);
    tree(laneG, ln, 3.4, 2.1, 0.6);
  }
  // ---- Courtyard: trees, benches, an ATM kiosk, a cash van and people; cars on the road.
  {
    for (const [x, z] of [
      [-2.6, -1.4],
      [-1.1, -1.45],
      [1.0, -1.45],
      [2.6, -1.4],
      [-2.7, 0.05],
      [2.85, 0.05],
    ] as [number, number][])
      tree(laneG, yd, x, z, 0.85);
    const bench: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-1.8, -0.4],
      [-0.4, -0.4],
      [1.2, -0.4],
    ] as [number, number][])
      bench.push(bx(x - 0.16, x + 0.16, S + 0.05, S + 0.065, z - 0.04, z + 0.04), bx(x - 0.15, x - 0.13, S, S + 0.05, z - 0.035, z + 0.035), bx(x + 0.13, x + 0.15, S, S + 0.05, z - 0.035, z + 0.035));
    put(laneG, yd.wood, ...bench);
    // Cash-in-transit van by the bank row.
    put(laneG, yd.van, rb(0.3, 0.15, 0.15, 0.03, 0.3, S + 0.03, 0.12));
    put(laneG, yd.carGlass, bx(0.43, 0.455, S + 0.11, S + 0.16, 0.06, 0.18));
    put(laneG, yd.blue, bx(0.15, 0.45, S + 0.1, S + 0.115, 0.044, 0.046), bx(0.15, 0.45, S + 0.1, S + 0.115, 0.194, 0.196));
    put(
      laneG,
      ln.tyre,
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2).translate(0.3 + sx * 0.1, S + 0.03, 0.12 + sz * 0.075)))
    );
    // Lamp posts.
    const lamps: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-3.0, -1.5, 0.0, 1.5, 3.0]) {
      lamps.push(cyl(0.008, 0.36, x, S, 2.48, 6));
      heads.push(rb(0.05, 0.015, 0.03, 0.006, x, S + 0.36, 2.48));
    }
    put(laneG, yd.dark, ...lamps);
    put(laneG, yd.lamp, ...heads);
    people(laneG, yd, [
      [-2.0, S, -0.9],
      [-1.4, S, -0.1],
      [-0.2, S, -1.0],
      [0.7, S, -0.6],
      [1.8, S, -0.95],
      [2.2, S, -0.2],
      [-2.3, S, 2.4, 0],
      [-0.9, S, 2.42, Math.PI],
      [1.7, S, 2.4, 0],
      [2.9, S, 2.42, Math.PI / 2],
    ]);
    cars.push({ p: [-3.6, S, 2.86], ry: 0, c: 0xb8382e }, { p: [-1.2, S, 3.18], ry: Math.PI, c: 0xeef0f2 }, { p: [1.8, S, 2.86], ry: 0, c: 0x2f5d9a }, { p: [3.7, S, 3.18], ry: Math.PI, c: 0x3a3e44 });
    cars.forEach((c) => carCab.push({ p: c.p, ry: c.ry }));
  }

  // ================================================================ LAYER 1: BANK ROW (over the basement)
  {
    // Ground slab over the basement pit (it ghosts away at layer 3).
    put(bankG, deck.slab, bx(QX0, QX1, S - 0.05, S - 0.002, QZ0, QZ1));
    put(bankG, deck.floor, floorPlane(QX0 + 0.02, QX1 - 0.02, QZ0 + 0.02, QZ1 - 0.02, S + 0.001));
    // Pavement strip in front of the row.
    put(bankG, deck.slab, bx(QX0, QX1, S, S + 0.012, 2.05, QZ1));

    /** Ground-floor banking hall: glass front, solid sides/back, counters, tellers and customers. */
    const hall = (x0: number, x1: number, z0: number, z1: number, h: number, walls: T.Material) => {
      put(bankG, walls, ...facadeShell(x0, x1, z0, z1, S, S + h, 0.4, h, "new"));
      put(bankG, bk.glass, vPlane(x1 - x0, h, (x0 + x1) / 2, S + h / 2, z1));
      const mul: T.BufferGeometry[] = [];
      for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 4) mul.push(bx(x - 0.006, x + 0.006, S, S + h, z1 - 0.006, z1 + 0.006));
      mul.push(bx(x0, x1, S + h - 0.012, S + h, z1 - 0.008, z1 + 0.008));
      put(bankG, bk.frame, ...mul);
      // Counter with glass screen, tellers behind, customers in front.
      const cz = (z0 + z1) / 2 - 0.05;
      put(bankG, bkIn.wood, bx(x0 + 0.08, x1 - 0.08, S, S + 0.09, cz - 0.04, cz + 0.04));
      put(bankG, bkIn.glass, vPlane(x1 - x0 - 0.16, 0.07, (x0 + x1) / 2, S + 0.125, cz));
      const n = Math.max(2, Math.round((x1 - x0) / 0.35));
      const tellers: [number, number, number, number][] = [];
      const customers: [number, number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const x = lerp(x0 + 0.18, x1 - 0.18, n === 1 ? 0.5 : i / (n - 1));
        tellers.push([x, S, cz - 0.12, 0]);
        if (R() < 0.75) customers.push([x + (R() - 0.5) * 0.06, S, cz + 0.13 + R() * 0.08, Math.PI]);
      }
      people(bankG, bkIn, tellers, [0x2b4c7e, 0x1f2a36, 0xd9d2c5]);
      people(bankG, bkIn, customers);
    };

    // ---- Large bank: slim glass tower on a glazed podium with an ATM lobby and canopy.
    {
      const x0 = -2.62,
        x1 = -1.28,
        z0 = 0.62,
        z1 = 2.02;
      hall(x0, x1, z0, z1, 0.34, bk.stone);
      put(bankG, bk.roofSlab, bx(x0 - 0.02, x1 + 0.02, S + 0.34, S + 0.38, z0 - 0.02, z1 + 0.02));
      const tx0 = -2.5,
        tx1 = -1.4,
        tz0 = 0.74,
        tz1 = 1.82,
        top = S + 2.2;
      put(bankG, bk.tower, ...facadeShell(tx0, tx1, tz0, tz1, S + 0.38, top, 0.275, 0.3));
      put(bankG, bk.roofSlab, bx(tx0, tx1, top, top + 0.03, tz0, tz1));
      // Corner fins and a crown.
      const fins: T.BufferGeometry[] = [];
      for (const x of [tx0, tx1]) for (const z of [tz0, tz1]) fins.push(bx(x - 0.015, x + 0.015, S + 0.38, top + 0.12, z - 0.015, z + 0.015));
      fins.push(bx(tx0 - 0.015, tx1 + 0.015, top + 0.1, top + 0.13, tz0 - 0.015, tz0 + 0.015), bx(tx0 - 0.015, tx1 + 0.015, top + 0.1, top + 0.13, tz1 - 0.015, tz1 + 0.015));
      fins.push(bx(tx0 - 0.015, tx0 + 0.015, top + 0.1, top + 0.13, tz0, tz1), bx(tx1 - 0.015, tx1 + 0.015, top + 0.1, top + 0.13, tz0, tz1));
      put(bankG, bk.steel, ...fins);
      put(bankG, bk.bankSign, vPlane(0.6, 0.15, (tx0 + tx1) / 2, top - 0.12, tz1 + 0.004));
      put(bankG, bk.dark, bx(-2.1, -1.8, top + 0.03, top + 0.12, 1.05, 1.45));
      // Entrance canopy (anchor) and an ATM lobby with two machines on the east end.
      put(bankG, bk.steel, bx(-2.25, -1.65, S + 0.38, S + 0.405, z1, z1 + 0.18));
      put(bankG, bk.bankSign, vPlane(0.3, 0.06, -1.95, S + 0.44, z1 + 0.02));
      put(bankG, bk.dark, bar(THREE, [-2.22, S, z1 + 0.16], [-2.22, S + 0.38, z1 + 0.16], 0.008), bar(THREE, [-1.68, S, z1 + 0.16], [-1.68, S + 0.38, z1 + 0.16], 0.008));
      for (const x of [-1.5, -1.38]) {
        put(bankG, bk.grey, bx(x - 0.04, x + 0.04, S, S + 0.17, z1 - 0.07, z1 - 0.01));
        put(bankG, bk.atm, vPlane(0.05, 0.05, x, S + 0.13, z1 - 0.005));
      }
    }
    // ---- Public-sector bank: columned stone hall with a pediment and a flag.
    {
      const x0 = -1.12,
        x1 = 0.32,
        z0 = 0.72,
        z1 = 1.86,
        h = 0.62;
      hall(x0, x1, z0, z1 - 0.12, h, bk.stoneWin);
      // Steps.
      for (let i = 0; i < 3; i++) put(bankG, bk.stone, bx(x0 - 0.02, x1 + 0.02, S, S + 0.025 * (3 - i), z1 - 0.12 + i * 0.05, z1 + 0.05 + i * 0.05));
      // Columns along the front portico.
      const cols: T.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) {
        const x = lerp(x0 + 0.1, x1 - 0.1, i / 5);
        cols.push(cyl(0.035, h - 0.08, x, S + 0.075, z1 + 0.0, 14, 0.03));
        cols.push(bx(x - 0.045, x + 0.045, S + h - 0.02, S + h, z1 - 0.045, z1 + 0.045));
      }
      put(bankG, bk.white, ...cols);
      // Entablature with the frieze sign (anchor) and the pediment.
      put(bankG, bk.stone, bx(x0 - 0.02, x1 + 0.02, S + h, S + h + 0.14, z0 - 0.02, z1 + 0.06));
      put(bankG, bk.psuSign, vPlane(1.1, 0.09, (x0 + x1) / 2, S + h + 0.07, z1 + 0.064));
      {
        const shape = new THREE.Shape();
        const hw = (x1 - x0) / 2 + 0.03;
        shape.moveTo(-hw, 0);
        shape.lineTo(hw, 0);
        shape.lineTo(0, 0.17);
        shape.lineTo(-hw, 0);
        const ped = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 + 0.08, bevelEnabled: false });
        ped.translate((x0 + x1) / 2, S + h + 0.14, z0 - 0.02);
        put(bankG, bk.roofSlab, ped);
      }
      put(bankG, bk.white, cyl(0.006, 0.4, x1 - 0.08, S + h + 0.14, z0 + 0.15, 6));
      put(bankG, bk.awning, bx(x1 - 0.074, x1 + 0.04, S + h + 0.46, S + h + 0.53, z0 + 0.149, z0 + 0.151));
    }
    // ---- Mid-size private bank: four-storey teal-glass office with a blade sign.
    {
      const x0 = 0.52,
        x1 = 1.72,
        z0 = 0.62,
        z1 = 1.98;
      hall(x0, x1, z0, z1, 0.3, bk.teal);
      put(bankG, bk.mid, ...facadeShell(x0, x1, z0, z1, S + 0.3, S + 1.34, 0.4, 0.26));
      put(bankG, bk.roofSlab, bx(x0 - 0.02, x1 + 0.02, S + 1.34, S + 1.37, z0 - 0.02, z1 + 0.02));
      put(bankG, bk.teal, bx(x0 - 0.02, x1 + 0.02, S + 0.3, S + 0.33, z0, z1 + 0.12));
      put(bankG, bk.midSign, vPlane(0.12, 0.5, x1 + 0.065, S + 0.95, z1 - 0.1, Math.PI / 2));
      put(bankG, bk.dark, bx(x1 + 0.01, x1 + 0.06, S + 0.68, S + 1.22, z1 - 0.12, z1 - 0.08));
      put(bankG, bk.bankSign, vPlane(0.34, 0.07, 1.1, S + 0.37, z1 + 0.122));
      // Rooftop plant.
      put(bankG, bk.grey, bx(0.7, 1.0, S + 1.37, S + 1.47, 0.9, 1.2), bx(1.2, 1.5, S + 1.37, S + 1.44, 1.3, 1.7));
    }
    // ---- Small finance bank: one-storey branch with an awning, an ATM and a queue.
    {
      const x0 = 1.92,
        x1 = 3.02,
        z0 = 1.0,
        z1 = 1.98;
      hall(x0, x1, z0, z1, 0.32, bk.shopWin);
      put(bankG, bk.roofSlab, bx(x0 - 0.02, x1 + 0.02, S + 0.32, S + 0.35, z0 - 0.02, z1 + 0.02));
      put(bankG, bk.sfbSign, vPlane(0.9, 0.08, 2.47, S + 0.34, z1 + 0.115));
      const aw = new THREE.PlaneGeometry(1.0, 0.16).rotateX(-Math.PI / 2 + 0.45).translate(2.47, S + 0.27, z1 + 0.07);
      put(bankG, bk.awning, aw);
      put(bankG, bk.grey, bx(2.88, 2.98, S, S + 0.17, z1 + 0.01, z1 + 0.07));
      put(bankG, bk.atm, vPlane(0.05, 0.05, 2.93, S + 0.13, z1 + 0.072));
      people(bankG, bkIn, [
        [2.93, S, 2.14, Math.PI],
        [2.93, S, 2.24, Math.PI],
        [2.1, S, 2.15, 0.4],
      ]);
      // A scooter parked outside.
      put(bankG, bk.blue, rb(0.15, 0.045, 0.045, 0.012, 2.3, S + 0.04, 2.33));
    }
  }

  // ================================================================ LAYER 2: BACK ROW
  {
    put(backG, br.lawn, bx(-PX + 0.05, PX - 0.05, S, S + 0.008, -PZ + 0.05, -3.06));
    // ---- Finance group HQ: a main block and a lower wing joined by a glass bridge.
    {
      const x0 = -3.02,
        x1 = -1.42,
        z0 = -2.98,
        z1 = -1.9;
      put(backG, br.hq, ...facadeShell(x0 + 0.5, x1, z0, z1, S, S + 0.98, 0.32, 0.196));
      put(backG, br.roofSlab, bx(x0 + 0.48, x1 + 0.02, S + 0.98, S + 1.0, z0 - 0.02, z1 + 0.02));
      put(backG, br.hq, ...facadeShell(x0, x0 + 0.42, z0 + 0.1, z1 - 0.2, S, S + 0.58, 0.32, 0.196));
      put(backG, br.roofSlab, bx(x0 - 0.02, x0 + 0.44, S + 0.58, S + 0.6, z0 + 0.08, z1 - 0.18));
      put(backG, br.glass, ...facadeShell(x0 + 0.42, x0 + 0.5, z0 + 0.3, z1 - 0.4, S + 0.3, S + 0.5, 0.1, 0.2, "ns"));
      // Rooftop sign (anchor) on short legs.
      put(backG, br.group, vPlane(0.6, 0.14, -1.75, S + 1.07, -1.95));
      put(backG, br.dark, bx(-2.05, -1.45, S + 1.0, S + 1.14, -1.97, -1.955));
      // Entrance plaza with a sculpture.
      put(backG, br.steel, new THREE.TorusKnotGeometry(0.05, 0.012, 48, 6).translate(-1.75, S + 0.12, -1.75));
      put(backG, br.stone, cyl(0.06, 0.05, -1.75, S, -1.75, 16));
    }
    // ---- Housing-finance office with a show house in front.
    {
      const x0 = -0.82,
        x1 = 0.82,
        z0 = -2.95,
        z1 = -1.9;
      put(backG, br.office, ...facadeShell(x0, x1, z0, z1, S, S + 0.72, 0.41, 0.24));
      put(backG, br.roofSlab, bx(x0 - 0.02, x1 + 0.02, S + 0.72, S + 0.75, z0 - 0.02, z1 + 0.02));
      put(backG, br.home, vPlane(0.7, 0.15, 0, S + 0.8, z1 - 0.06));
      put(backG, br.dark, bx(-0.36, 0.36, S + 0.72, S + 0.73, z1 - 0.07, z1 - 0.05));
      // Show house.
      put(backG, br.house, ...facadeShell(0.35, 0.75, -1.85, -1.55, S, S + 0.22, 0.2, 0.22));
      put(backG, br.roofSlab, gable(0.35, 0.75, -1.85, -1.55, S + 0.22, 0.13));
      put(backG, br.green, rb(0.4, 0.06, 0.06, 0.02, 0.55, S, -1.5));
      people(backG, br, [
        [0.2, S, -1.6, 0.5],
        [0.27, S, -1.5, -2.6],
      ]);
    }
    // ---- State infrastructure lender: stone office, rooftop solar, a pylon and a rail wagon.
    {
      const x0 = 1.22,
        x1 = 2.42,
        z0 = -2.95,
        z1 = -1.95;
      put(backG, br.state, ...facadeShell(x0, x1, z0, z1, S, S + 0.62, 0.4, 0.31));
      put(backG, br.stone, bx(x0 - 0.03, x1 + 0.03, S + 0.62, S + 0.67, z0 - 0.03, z1 + 0.03));
      put(backG, br.stateSign, vPlane(0.7, 0.12, (x0 + x1) / 2, S + 0.5, z1 + 0.004));
      // Solar rows on the roof.
      const pv: T.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) pv.push(new THREE.BoxGeometry(0.22, 0.01, 0.16).rotateX(-0.35).translate(x0 + 0.18 + i * 0.27, S + 0.72, z0 + 0.2 + j * 0.27));
      put(backG, br.solar, ...pv);
      // Flagpole.
      put(backG, br.white, cyl(0.006, 0.42, x0 + 0.1, S + 0.67, z1 - 0.1, 6));
      put(backG, br.yellow, bx(x0 + 0.106, x0 + 0.2, S + 1.0, S + 1.07, z1 - 0.101, z1 - 0.099));
      // Transmission pylon (lattice) east of the office.
      const px = 2.72,
        pz = -2.45,
        ph = 1.12;
      const lat: T.BufferGeometry[] = [];
      const leg = (sx: number, sz: number) => bar(THREE, [px + sx * 0.14, S, pz + sz * 0.14], [px + sx * 0.03, S + ph, pz + sz * 0.03], 0.008, 5);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) lat.push(leg(sx, sz));
      for (let k = 0; k < 4; k++) {
        const y0 = S + k * 0.25,
          y1 = S + (k + 1) * 0.25;
        const w0 = lerp(0.14, 0.03, (y0 - S) / ph),
          w1 = lerp(0.14, 0.03, (y1 - S) / ph);
        for (const sz of [-1, 1]) lat.push(bar(THREE, [px - w0, y0, pz + sz * w0], [px + w1, y1, pz + sz * w1], 0.004, 4), bar(THREE, [px + w0, y0, pz + sz * w0], [px - w1, y1, pz + sz * w1], 0.004, 4));
      }
      for (const [y, a] of [
        [S + 0.82, 0.28],
        [S + 1.0, 0.2],
      ] as [number, number][])
        lat.push(bar(THREE, [px - a, y, pz], [px + a, y, pz], 0.007, 4));
      put(backG, br.pylon, ...lat);
      const ins: T.BufferGeometry[] = [];
      for (const [x, y] of [
        [px - 0.26, S + 0.82],
        [px + 0.26, S + 0.82],
        [px - 0.18, S + 1.0],
        [px + 0.18, S + 1.0],
      ] as [number, number][])
        ins.push(cyl(0.008, 0.05, x, y - 0.05, pz, 6));
      put(backG, br.white, ...ins);
      // Rail wagon on a short track in front of the office.
      put(backG, br.rail, bx(1.15, 2.5, S, S + 0.01, -1.72, -1.7), bx(1.15, 2.5, S, S + 0.01, -1.6, -1.58));
      const sl: T.BufferGeometry[] = [];
      for (let x = 1.2; x < 2.5; x += 0.08) sl.push(bx(x - 0.015, x + 0.015, S, S + 0.006, -1.76, -1.54));
      put(backG, br.wood, ...sl);
      put(backG, br.wagon, rb(0.5, 0.12, 0.13, 0.015, 1.75, S + 0.035, -1.65));
      put(backG, br.dark, bx(1.52, 1.98, S + 0.012, S + 0.035, -1.7, -1.6));
    }
    tree(backG, br, -1.15, -2.7, 0.9);
    tree(backG, br, 1.0, -2.75, 0.85);
    tree(backG, br, 3.2, -2.85, 0.8);
    tree(backG, br, -3.5, -3.0, 0.75);
  }

  // ================================================================ LAYER 3: BASEMENT (vault + switch room)
  {
    const y = B0;
    // Pit lining, floor and a dividing wall.
    const lin: T.BufferGeometry[] = [];
    lin.push(bx(QX0, QX1, 0.0, y, QZ0, QZ1));
    lin.push(bx(QX0 - 0.02, QX0, y, S - 0.05, QZ0, QZ1), bx(QX1, QX1 + 0.02, y, S - 0.05, QZ0, QZ1));
    lin.push(bx(QX0, QX1, y, S - 0.05, QZ0 - 0.02, QZ0));
    put(coreG, co.lining, ...lin);
    put(coreG, co.floor, floorPlane(QX0, QX1, QZ0, QZ1, y + 0.001));
    put(coreG, co.lining, bx(0.18, 0.24, y, S - 0.07, QZ0, 1.55));
    put(coreG, co.tray, bx(QX0, QX1, y + 0.002, y + 0.004, QZ1 - 0.08, QZ1 - 0.06));

    // ---- Central-bank vault (west): a round vault door on the west wall, cash and gold shelves,
    // refinance desks and a resolution (bad-loan) file room.
    const vx = QX0 + 0.04,
      vz = 1.35;
    put(coreG, co.vault, lathe(THREE, [[0, -0.012], [0.16, -0.012], [0.165, 0.0], [0.16, 0.022], [0.12, 0.03], [0, 0.03]], 40).rotateZ(-Math.PI / 2).translate(vx, y + 0.2, vz));
    put(coreG, co.vaultDark, new THREE.TorusGeometry(0.17, 0.012, 8, 40).rotateY(Math.PI / 2).translate(vx, y + 0.2, vz));
    const spokes: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spokes.push(bar(THREE, [vx + 0.035, y + 0.2, vz], [vx + 0.035, y + 0.2 + 0.08 * Math.sin(a), vz + 0.08 * Math.cos(a)], 0.006, 5));
    }
    spokes.push(cyl(0.02, 0.02, 0, 0, 0, 12).rotateZ(Math.PI / 2).translate(vx + 0.045, y + 0.2, vz));
    put(coreG, co.steel, ...spokes);
    // Cash bricks and gold bars on steel shelving along the back wall.
    const shelf: T.BufferGeometry[] = [];
    const cash: Item[] = [];
    const gold: Item[] = [];
    for (const [sx0, sx1] of [
      [-2.6, -1.7],
      [-1.5, -0.6],
    ] as [number, number][]) {
      for (let k = 0; k <= 3; k++) shelf.push(bx(sx0, sx1, y + 0.005 + k * 0.075, y + 0.012 + k * 0.075, QZ0 + 0.02, QZ0 + 0.16));
      for (let x = sx0; x <= sx1 + 1e-6; x += (sx1 - sx0) / 4) shelf.push(bx(x - 0.006, x + 0.006, y, y + 0.24, QZ0 + 0.02, QZ0 + 0.16));
      for (let k = 0; k < 3; k++)
        for (let i = 0; i < 9; i++) {
          if (R() < 0.15) continue;
          const p: Vec3 = [lerp(sx0 + 0.05, sx1 - 0.05, i / 8), y + 0.012 + k * 0.075, QZ0 + 0.09];
          if (sx0 < -2 && k === 0) gold.push({ p });
          else cash.push({ p, ry: (R() - 0.5) * 0.2 });
        }
    }
    put(coreG, co.steel, ...shelf);
    inst(coreG, bx(-0.04, 0.04, 0, 0.045, -0.05, 0.05), co.cash, cash);
    inst(coreG, mergeInto(THREE, [bx(-0.04, 0.04, 0, 0.02, -0.02, 0.02), bx(-0.03, 0.03, 0.02, 0.035, -0.015, 0.015)]), co.gold, gold);
    // Pallet of gold bars on the floor by the door.
    const pal1: Item[] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) pal1.push({ p: [-2.4 + i * 0.05, y + 0.03 + k * 0.022, 1.85 + j * 0.03] });
    put(coreG, co.wood, bx(-2.45, -2.2, y, y + 0.03, 1.8, 1.95));
    inst(coreG, bx(-0.022, 0.022, 0, 0.02, -0.013, 0.013), co.gold, pal1);
    // Refinance desks and officers.
    desks(coreG, co, [{ p: [-1.6, y, 1.5] }, { p: [-1.25, y, 1.5] }, { p: [-0.9, y, 1.5] }], 2, 0.26);
    people(coreG, co, [
      [-1.6, y - 0.03, 1.61, Math.PI],
      [-1.25, y - 0.03, 1.61, Math.PI],
      [-0.9, y - 0.03, 1.61, Math.PI],
      [-2.1, y, 1.2, 1.4],
      [-0.4, y, 1.0, -1.2],
    ]);
    // Resolution file room: filing cabinets with folders.
    const cab: T.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) cab.push(bx(-0.5 + i * 0.12 - 0.05, -0.5 + i * 0.12 + 0.05, y, y + 0.2, 1.9, 2.08));
    put(coreG, co.grey, ...cab);
    put(coreG, co.yellow, ...Array.from({ length: 5 }, (_, i) => bx(-0.5 + i * 0.12 - 0.03, -0.5 + i * 0.12 + 0.03, y + 0.15, y + 0.17, 1.895, 1.9)));

    // ---- Payments switch room (east): rack rows, a network wall on the back wall, bureau desks.
    put(coreG, co.net, vPlane(1.9, 0.26, 1.55, y + 0.17, QZ0 + 0.004));
    const rk: Item[] = [];
    for (const z of [1.15, 1.52])
      for (let i = 0; i < 11; i++) rk.push({ p: [1.65 + i * RW, y, z], ry: z > 1.3 ? 0 : Math.PI });
    racks(coreG, 0.28, rk);
    const trays: T.BufferGeometry[] = [];
    for (const z of [1.15, 1.52]) trays.push(bx(1.6, 1.65 + 10.5 * RW, y + 0.285, y + 0.295, z - 0.03, z + 0.03));
    put(coreG, co.tray, ...trays);
    desks(coreG, co, [{ p: [0.55, y, 1.2] }, { p: [0.85, y, 1.2] }, { p: [0.55, y, 1.75] }, { p: [0.85, y, 1.75] }], 2, 0.24);
    people(coreG, co, [
      [0.55, y - 0.03, 1.31, Math.PI],
      [0.85, y - 0.03, 1.31, Math.PI],
      [0.55, y - 0.03, 1.86, Math.PI],
      [1.4, y, 0.8, 0.6],
      [2.4, y, 1.95, -0.4],
    ]);
  }

  // ---------------------------------------------------------------- flush batches
  {
    const P = yd;
    inst(laneG, carGeo.body, P.car, cars);
    inst(laneG, carGeo.cab, P.carGlass, carCab);
    inst(laneG, carGeo.wheels, P.dark, carCab);
  }
  for (const { parent, P, items, sit } of crowds.values()) {
    inst(parent, bodyGeo, P.body, items);
    inst(parent, headGeo, P.skin, items.map((i) => ({ p: i.p, ry: i.ry })));
    inst(parent, sitBody, P.body, sit);
    inst(parent, sitHead, P.skin, sit.map((i) => ({ p: i.p, ry: i.ry })));
  }
  for (const { parent, P, items } of trees.values()) {
    inst(parent, treeTrunk, P.trunk, items);
    inst(parent, treeTop, P.green, items);
  }
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ---------------------------------------------------------------- animation
  // The network wall scrolls, rack LEDs blink, ATM screens pulse.
  let lastBlink = -1;
  lipMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    netTex.offset.x = (t * 0.02) % 1;
    const f = Math.floor(t / 0.4);
    if (f !== lastBlink) {
      lastBlink = f;
      rackLed.offset.y = (f % 4) * 0.25;
    }
    bk.atm.emissiveIntensity = 0.9 + 0.3 * Math.sin(t * 2.2);
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
      L.set("lane", pw(v, [[0, 1], [1, 0.3], [2, 0.22], [3, 0.18]]));
      L.set("yard", pw(v, [[0, 1], [1, 0.45], [3, 0.3]]));
      L.set("bank", pw(v, [[0, 1], [1, 1], [1.7, 0.14], [2, 0.1], [3, 0.06]]));
      L.set("bankIn", pw(v, [[0, 1], [1, 1], [1.8, 0.2], [3, 0.08]]));
      L.set("deck", pw(v, [[0, 1], [2, 1], [2.6, 0.08], [3, 0.05]]));
      L.set("back", pw(v, [[0, 1], [2, 1], [2.7, 0.25], [3, 0.2]]));
      L.set("core", 1);
    },
  };
}
