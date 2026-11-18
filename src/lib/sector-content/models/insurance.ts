// Insurance: a miniature "insurance square" on a display plinth (generic, no real insurer's
// building, logo or colours).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Front street: a bank branch with an insurance desk inside (front left) and a broker pavilion
//     with a giant phone showing plan quotes (front right); a plaza with a red umbrella sculpture,
//     a clinic to the west and a car park to the east.
//   · In the middle, a wide podium with an insurer tower on its east half. The tower's four floors
//     are four kinds of insurer: bank-promoted life (top, the family-under-an-umbrella floor),
//     LIC-style life with its agents' training room, general (car on a turntable, house, cargo
//     box) and standalone health (hospital bed, red-cross wall) at the bottom.
//   · Podium ground floor: the claims hall (TPA desks, a dented car being surveyed, a cashless
//     desk) and the reinsurance room (world-map wall, globe, treaty table, vault door).
//   · Basement, sunk into the plinth under the podium: the holding companies' boardroom (group
//     chart wall) and the regulator's bench with the public data hub (racks, policy screen).
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Distribution            street, plaza, tower curtain wall and podium walls
//   1 Insurers                curtain wall + roof ghost -> the four insurer floors
//   2 Claims & Reinsurance    floors + podium roof ghost -> the podium hall
//   3 Capital & Regulation    hall + its slab ghost -> the basement
// The phone screen, the claims wall and the hub racks animate (animated: true).
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
const QX0 = -2.5,
  QX1 = 0.1,
  QZ0 = -2.3,
  QZ1 = -0.95; // basement pit under the podium's back-west quarter
const PH = 0.44; // podium ground-floor height
const DX0 = -2.6,
  DX1 = 2.4,
  DZ0 = -2.4,
  DZ1 = 0.7; // podium footprint
const TX0 = 0.25,
  TX1 = 2.15,
  TZ0 = -2.05,
  TZ1 = 0.15; // tower footprint
const FH = 0.36; // tower floor height
const F = [0, 1, 2, 3].map((i) => S + PH + 0.04 + i * FH); // floor levels, bottom up
const TOP = F[3] + FH; // tower roof

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/insurance.ts). The right rail reads the tower's
// floors top -> bottom (the markers sit on one screen diagonal, each further forward and east), the left rail
// runs back -> front through the podium hall's west end, the top rail runs west -> east across the
// basement and the bottom rail holds the two street-level sellers west -> east, so the markers keep the rails' order in every view
// (scripts/check-crossings.mjs).
export const INSURANCE_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: street
  bancassurance: { pos: [-0.95, S + 0.42, 2.27], side: "bottom" }, // bank branch fascia
  digital_brokers: { pos: [3.3, S + 0.46, 2.1], side: "bottom" }, // giant phone with plan quotes
  // layer 1: insurer floors (top -> bottom)
  life_bank: { pos: [1.05, F[3] + 0.2, -1.55], side: "right" }, // family-under-an-umbrella sculpture
  life_lic: { pos: [1.4, F[2] + 0.12, -1.2], side: "right" }, // agents' counter
  general: { pos: [1.75, F[1] + 0.1, -0.85], side: "right" }, // car on the turntable
  health: { pos: [2.0, F[0] + 0.12, -0.55], side: "right" }, // hospital bed
  // layer 2: podium hall
  reinsurance: { pos: [-2.1, S + 0.3, -0.6], side: "left" }, // globe in the reinsurance room
  tpa_claims: { pos: [-2.52, S + 0.22, 0.55], side: "left" }, // claims wall by the TPA desks
  // layer 3: basement
  holdcos: { pos: [-1.85, B0 + 0.14, -1.55], side: "top" }, // boardroom table
  regulator: { pos: [-0.5, B0 + 0.17, -1.8], side: "top" }, // regulator's bench and rule book
};

export const INSURANCE_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.4, 6.8, 9.4],
    target: [0, 0.9, 0],
    narration:
      "Welcome to the insurance square. Banks and brokers sell policies on the street, insurers write them in the tower, claims are paid and risk is passed on to reinsurers in the hall below, and the owners and the regulator sit in the basement. Peel it layer by layer, from the street to the basement.",
  },
  {
    id: "street",
    layer: 0,
    label: "Street",
    pos: [5.2, 3.0, 8.8],
    target: [0.2, 0.6, 1.4],
    narration:
      "Most policies are sold, not bought. Left of the plaza, a bank branch sells its partner insurer's plans at the counter, the way SBI and HDFC Bank do. On the right, an online marketplace lets you compare plans on your phone, the business of PB Fintech's PolicyBazaar.",
  },
  {
    id: "tower",
    layer: 1,
    label: "Insurer Tower",
    pos: [6.6, 4.4, 4.0],
    target: [1.2, 1.25, -0.9],
    narration:
      "Each floor of the tower is a kind of insurer. At the top, life insurers owned by banks, like HDFC Life and SBI Life. Below, LIC-style insurers with large agent forces. Then general insurers covering cars, homes and cargo, like ICICI Lombard, and at the bottom the standalone health insurers, like Star Health.",
  },
  {
    id: "claims",
    layer: 2,
    label: "Claims Hall",
    pos: [1.6, 4.6, 5.4],
    target: [-1.5, 0.45, -0.2],
    narration:
      "The podium hall is where promises are kept. At the front, claims desks and third-party administrators like Medi Assist check hospital bills and survey damaged cars. At the back, insurers pass part of their risk to reinsurers, led in India by GIC Re.",
  },
  {
    id: "capital",
    layer: 3,
    label: "Capital Vault",
    pos: [2.0, 5.0, 3.8],
    target: [-1.1, 0.1, -1.6],
    narration:
      "Under the back of the podium: the owners and the rules. On the left, the boardroom of the holding companies and promoters that fund insurers with capital. On the right, the regulator's bench and the public data hub that links policies and hospital claims.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the street and plaza along the front, the bank branch on the left and the broker pavilion on the right, and the podium in the middle with the insurer tower on its east half and the basement under its back-west corner.",
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

export function buildInsurance(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [streetG, floorG, hallG, coreG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const R = rng(20261119);

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

  // Ground: paving, road, plaza, car park and lawns, drawn to the plinth's plan.
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
    rect(-PX, -PZ, PX, PZ, "#b0b2b4");
    g.strokeStyle = "rgba(0,0,0,0.07)";
    for (let x = -PX; x <= PX; x += 0.2) {
      g.beginPath();
      g.moveTo(...P(x, -PZ));
      g.lineTo(...P(x, PZ));
      g.stroke();
    }
    for (let z = -PZ; z <= PZ; z += 0.2) {
      g.beginPath();
      g.moveTo(...P(-PX, z));
      g.lineTo(...P(PX, z));
      g.stroke();
    }
    rect(-PX, -PZ, PX, -2.95, "#5f7d4a");
    rect(-PX, 2.66, PX, PZ, "#3b3e43");
    rect(-PX, 2.6, PX, 2.66, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.03);
      g.fillRect(a, b, 0.25 * GS, 3);
    }
    for (let x = -0.5; x < 0.05; x += 0.11) {
      const [a, b] = P(x, 2.68);
      g.fillRect(a, b, 0.055 * GS, 0.66 * GS);
    }
    // Plaza: warm stone with rings round the umbrella sculpture.
    rect(-2.6, 0.8, 2.4, 2.55, "#d3cabb");
    const [fx, fz] = P(0.9, 1.55);
    g.strokeStyle = "rgba(120,96,70,0.35)";
    g.lineWidth = 3;
    for (let r = 0.3; r < 0.95; r += 0.18) {
      g.beginPath();
      g.arc(fx, fz, r * GS, 0, Math.PI * 2);
      g.stroke();
    }
    // Car park east of the tower.
    rect(2.6, -2.9, 4.55, 0.95, "#55595e");
    g.strokeStyle = "#e8e8e8";
    g.lineWidth = 2;
    for (let z = -2.8; z <= 0.9; z += 0.34)
      for (const x of [2.7, 3.75]) {
        g.beginPath();
        g.moveTo(...P(x, z));
        g.lineTo(...P(x + 0.6, z));
        g.stroke();
      }
    // Clinic garden to the west.
    rect(-4.55, -2.9, -2.8, 0.95, "#6f8f55");
    rect(-4.2, -2.5, -3.0, -0.9, "#c9c4bb");
  });

  // Facades and screens.
  const curtainTex = (() => {
    const t = tex(256, 256, (g, w, h) => {
      g.fillStyle = "#24384c";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#8fb2cc");
        gr.addColorStop(1, "#3e6283");
        g.fillStyle = gr;
        g.fillRect(i * 64 + 3, 22, 58, h - 26);
        g.fillStyle = "rgba(255,255,255,0.13)";
        g.beginPath();
        g.moveTo(i * 64 + 6, 22);
        g.lineTo(i * 64 + 30, 22);
        g.lineTo(i * 64 + 10, h - 4);
        g.lineTo(i * 64 + 6, h - 4);
        g.fill();
      }
      g.fillStyle = "#d9dde1";
      g.fillRect(0, 0, w, 18); // floor band
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const podTex = windows(3, 1, "#e2ddd3", "#7b98b0", "#3f5a74", 0.15, 10);
  const shopTex = windows(2, 1, "#e6e0d4", "#5f7d96", "#2f4559", 0.4, 10);
  const clinicTex = windows(3, 2, "#f2f2ef", "#7b98b0", "#3f5a74", 0.15, 12);
  const tBank = sign("BANK", "#1d2b3c", "#f2f4f6", 256, 64, 40);
  const tInsDesk = sign("INSURANCE", "#b8382e", "#ffffff", 256, 64, 36);
  const tBroker = sign("COMPARE & BUY", "#1f7a6d", "#ffffff", 256, 64, 30);
  const tTower = sign("INSURANCE", "#1d2b3c", "#f2f4f6", 512, 96, 54);
  const tClinic = sign("+ CLINIC", "#ffffff", "#c0392b", 256, 64, 36);
  const tCross = tex(128, 128, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d33a32";
    g.fillRect(w * 0.38, h * 0.14, w * 0.24, h * 0.72);
    g.fillRect(w * 0.14, h * 0.38, w * 0.72, h * 0.24);
  });
  // Giant phone: plan cards; offset.y flips between two frames.
  const phoneTex = (() => {
    const t = tex(128, 512, (g, w, h) => {
      for (let f = 0; f < 2; f++) {
        const y0 = (f * h) / 2;
        g.fillStyle = "#f4f7fb";
        g.fillRect(0, y0, w, h / 2);
        g.fillStyle = "#1f7a6d";
        g.fillRect(0, y0, w, 30);
        g.fillStyle = "#ffffff";
        g.font = font(13);
        g.fillText("COMPARE PLANS", 10, y0 + 20);
        for (let k = 0; k < 4; k++) {
          const yy = y0 + 42 + k * 52;
          g.fillStyle = (k + f) % 4 === 0 ? "#e2f4ef" : "#ffffff";
          g.fillRect(8, yy, w - 16, 44);
          g.strokeStyle = "#c9d3dc";
          g.strokeRect(8, yy, w - 16, 44);
          g.fillStyle = "#2f5d9a";
          g.fillRect(14, yy + 8, 40, 8);
          g.fillStyle = "#9aa6b2";
          g.fillRect(14, yy + 24, 60, 5);
          g.fillStyle = "#e07a2a";
          g.fillRect(w - 44, yy + 14, 30, 16);
        }
      }
    });
    t.repeat.set(1, 0.5);
    return t;
  })();
  const monTex = tex(64, 40, (g, w, h) => {
    g.fillStyle = "#10202e";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7fc8ff";
    g.fillRect(4, 4, w - 8, 4);
    g.fillStyle = "#3fd08a";
    for (let i = 0; i < 4; i++) g.fillRect(6, 12 + i * 6, 20 + ((i * 13) % 30), 3);
  });
  const mapTex = tex(512, 256, (g, w, h) => {
    g.fillStyle = "#123049";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2f6e8f";
    // Rough, generic continents as blobs.
    for (const [x, y, rx, ry] of [
      [110, 90, 70, 45],
      [150, 180, 35, 55],
      [265, 85, 55, 35],
      [280, 165, 40, 55],
      [370, 95, 80, 45],
      [430, 195, 35, 20],
    ] as [number, number, number, number][]) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "rgba(255,207,63,0.8)";
    g.lineWidth = 2;
    const hub: [number, number] = [345, 120];
    for (const [x, y] of [
      [110, 90],
      [265, 85],
      [430, 195],
      [150, 180],
      [400, 90],
    ] as [number, number][]) {
      g.beginPath();
      g.moveTo(...hub);
      g.quadraticCurveTo((hub[0] + x) / 2, Math.min(hub[1], y) - 40, x, y);
      g.stroke();
    }
    g.fillStyle = "#ffcf3f";
    g.beginPath();
    g.arc(hub[0], hub[1], 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#cfe8ff";
    g.font = font(20);
    g.fillText("REINSURANCE TREATIES", 16, 28);
  });
  const globeTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#2f7fb0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6fae5a";
    for (const [x, y, rx, ry] of [
      [50, 45, 30, 20],
      [70, 90, 15, 25],
      [130, 40, 25, 15],
      [140, 80, 18, 25],
      [190, 45, 35, 18],
    ] as [number, number, number, number][]) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  // Claims wall: rows of claim cards; status lights scroll (animated via offset).
  const claimsTex = (() => {
    const t = tex(512, 128, (g, w, h) => {
      g.fillStyle = "#0e1a26";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#cfe8ff";
      g.font = font(16);
      g.fillText("CLAIMS  •  CASHLESS  •  SURVEY", 10, 20);
      for (let i = 0; i < 16; i++) {
        const x = 8 + i * 31;
        for (let k = 0; k < 3; k++) {
          g.fillStyle = (i + k) % 5 === 0 ? "#ffb020" : (i * k) % 7 === 3 ? "#ff5a4a" : "#2fe07a";
          g.fillRect(x, 34 + k * 30, 24, 20);
        }
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  })();
  const orgTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#5a4a2a";
    g.lineWidth = 3;
    const box = (x: number, y: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(x - 26, y - 12, 52, 24);
    };
    g.beginPath();
    g.moveTo(128, 30);
    g.lineTo(128, 60);
    g.moveTo(48, 60);
    g.lineTo(208, 60);
    for (const x of [48, 128, 208]) {
      g.moveTo(x, 60);
      g.lineTo(x, 90);
    }
    g.stroke();
    box(128, 24, "#3a2f55");
    box(48, 96, "#b8382e");
    box(128, 96, "#1f7a6d");
    box(208, 96, "#2f5d9a");
    g.fillStyle = "#5a4a2a";
    g.font = font(13);
    g.fillText("GROUP", 106, 120);
  });
  const hubTex = sign("POLICY & CLAIMS HUB", "#07131f", "#9fe6ff", 512, 96, 40);
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
  const st = {
    ...pal("street"),
    shop: L.add("street", std(0xffffff, 0.1, 0.6, { map: shopTex })),
    clinic: L.add("street", std(0xffffff, 0.05, 0.7, { map: clinicTex })),
    bank: signMat("street", tBank, 0.5),
    insDesk: signMat("street", tInsDesk, 0.45),
    broker: signMat("street", tBroker, 0.45),
    clinicSign: signMat("street", tClinic, 0.3),
    phone: screen("street", phoneTex, 1.0),
    umbrella: L.add("street", std(0xc8352c, 0.1, 0.5, { side: DS })),
    car: L.add("street", std(0xffffff, 0.5, 0.35)),
    carGlass: L.add("street", std(0x1b2631, 0.6, 0.15)),
    lamp: L.add("street", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    water: L.add("street", std(0x6fb7d6, 0.1, 0.08, { emissive: 0x0e3b52, emissiveIntensity: 0.4 })),
  };
  const sh = {
    curtain: L.add("shell", std(0xffffff, 0.35, 0.22, { map: curtainTex, side: DS })),
    pod: L.add("shell", std(0xffffff, 0.1, 0.55, { map: podTex, side: DS })),
    stone: L.add("shell", std(0xd9dde1, 0.05, 0.6)),
    dark: L.add("shell", std(0x2a3138, 0.4, 0.45)),
  };
  const rf = {
    slab: L.add("roof", std(0xb8bec4, 0.1, 0.8)),
    unit: L.add("roof", std(0xd5dadf, 0.4, 0.4)),
    sign: signMat("roof", tTower, 0.55),
    crown: L.add("roof", std(0xdfe4e8, 0.6, 0.3)),
  };
  const fl = {
    ...pal("floors"),
    slab: L.add("floors", std(0xe6e8ea, 0.05, 0.8)),
    carpet: L.add("floors", std(0x4c5866, 0.05, 0.85)),
    cross: L.add("floors", std(0xffffff, 0, 0.6, { map: tCross, emissive: 0xffffff, emissiveMap: tCross, emissiveIntensity: 0.3 })),
    umbrella: L.add("floors", std(0x1f7a6d, 0.1, 0.5, { side: DS })),
    sheet: L.add("floors", std(0xf4f6f7, 0, 0.8)),
    flame: L.add("floors", std(0xff8a2a, 0, 0.5, { emissive: 0xff6a1a, emissiveIntensity: 0.6 })),
    container: L.add("floors", std(0x2f6fb0, 0.4, 0.5)),
    board: screen("floors", monTex, 0.9),
  };
  const pr = {
    slab: L.add("podRoof", std(0xd8dcdf, 0.05, 0.75)),
    garden: L.add("podRoof", std(0x5f8f4a, 0, 0.9)),
  };
  const hl = {
    ...pal("hall"),
    map: screen("hall", mapTex, 0.8),
    globe: L.add("hall", std(0xffffff, 0.1, 0.4, { map: globeTex })),
    claims: screen("hall", claimsTex, 1.1),
    vault: L.add("hall", std(0xc7ccd1, 0.92, 0.22)),
    vaultDark: L.add("hall", std(0x6b737c, 0.85, 0.3)),
    car: L.add("hall", std(0xd9dfe6, 0.5, 0.35)),
    carGlass: L.add("hall", std(0x1b2631, 0.6, 0.15)),
    floor: L.add("hall", std(0xddd8ce, 0.05, 0.6)),
  };
  const s0 = {
    slab: L.add("slab0", std(0xd4d0c8, 0.05, 0.6)),
  };
  const co = {
    ...pal("core"),
    lining: L.add("core", std(0xb9b4ab, 0.05, 0.85)),
    floor: L.add("core", std(0xbfc5cb, 0.1, 0.55)),
    org: L.add("core", std(0xffffff, 0, 0.6, { map: orgTex, emissive: 0xffffff, emissiveMap: orgTex, emissiveIntensity: 0.25 })),
    hub: screen("core", hubTex, 1.0),
    rackSide: L.add("core", std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add("core", std(0x2b333d, 0.5, 0.4)),
    rackFront: L.add("core", std(0xffffff, 0.3, 0.4, { map: rackLed, emissive: 0xffffff, emissiveMap: rackLed, emissiveIntensity: 1.0 })),
    tray: L.add("core", std(0xe2b33a, 0.35, 0.45)),
    leather: L.add("core", std(0x6b3a2a, 0.1, 0.6)),
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

  // ================================================================ LAYER 0: STREET
  {
    // ---- Bank branch with an insurance desk (front left).
    const x0 = -2.25,
      x1 = -0.85,
      z0 = 1.2,
      z1 = 2.25,
      h = 0.48;
    put(streetG, st.shop, ...facadeShell(x0, x1, z0, z1, S, S + h, 0.5, h, "new"));
    put(streetG, st.glass, vPlane(x1 - x0, h - 0.12, (x0 + x1) / 2, S + (h - 0.12) / 2, z1));
    const mul: T.BufferGeometry[] = [];
    for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 5) mul.push(bx(x - 0.006, x + 0.006, S, S + h - 0.12, z1 - 0.006, z1 + 0.006));
    put(streetG, st.frame, ...mul);
    put(streetG, st.stone, bx(x0 - 0.03, x1 + 0.03, S + h - 0.12, S + h + 0.03, z0 - 0.03, z1 + 0.03));
    put(streetG, st.bank, vPlane(0.7, 0.1, -1.2, S + h - 0.05, z1 + 0.034));
    // Inside: a counter, the insurance desk with its standing sign, customers.
    put(streetG, st.wood, bx(x0 + 0.1, x1 - 0.1, S, S + 0.09, 1.5, 1.58));
    put(streetG, st.insDesk, vPlane(0.26, 0.065, -1.2, S + 0.16, 1.7));
    put(streetG, st.dark, bx(-1.33, -1.07, S + 0.09, S + 0.13, 1.68, 1.695));
    people(streetG, st, [
      [-2.0, S, 1.4, 0],
      [-1.6, S, 1.4, 0],
      [-1.2, S, 1.4, 0],
      [-1.2, S, 1.85, Math.PI],
      [-1.9, S, 1.9, Math.PI],
    ]);
    // ATM by the door.
    put(streetG, st.grey, bx(-1.02, -0.92, S, S + 0.17, z1 + 0.01, z1 + 0.06));
    put(streetG, st.mon, vPlane(0.05, 0.035, -0.97, S + 0.13, z1 + 0.062));
  }
  {
    // ---- Broker pavilion and a giant phone comparing plans (front right).
    const x0 = 2.55,
      x1 = 4.25,
      z0 = 1.2,
      z1 = 1.85;
    put(streetG, st.glass, ...facadeShell(x0, x1, z0, z1, S, S + 0.3, 0.3, 0.3));
    const fr: T.BufferGeometry[] = [];
    for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 6) fr.push(bx(x - 0.006, x + 0.006, S, S + 0.3, z1 - 0.006, z1 + 0.006));
    put(streetG, st.frame, ...fr);
    put(streetG, st.white, rb(x1 - x0 + 0.2, 0.03, z1 - z0 + 0.2, 0.012, (x0 + x1) / 2, S + 0.3, (z0 + z1) / 2));
    put(streetG, st.broker, vPlane(0.8, 0.1, 3.75, S + 0.39, z1 + 0.105));
    put(streetG, st.dark, bx(3.35, 4.15, S + 0.33, S + 0.44, z1 + 0.09, z1 + 0.1));
    desks(streetG, st, [{ p: [3.0, S, 1.45] }, { p: [3.4, S, 1.45] }, { p: [3.8, S, 1.45] }], 2, 0.24);
    people(streetG, st, [
      [3.0, S - 0.03, 1.56, Math.PI],
      [3.8, S - 0.03, 1.56, Math.PI],
    ]);
    // The giant phone on a plinth.
    put(streetG, st.dark, rb(0.34, 0.6, 0.05, 0.05, 3.3, S + 0.12, 2.07));
    put(streetG, st.phone, vPlane(0.29, 0.52, 3.3, S + 0.42, 2.097));
    put(streetG, st.stone, rb(0.44, 0.12, 0.2, 0.02, 3.3, S, 2.07));
    people(
      streetG,
      st,
      [
        [2.95, S, 2.3, 0.4],
        [3.65, S, 2.35, -0.3],
        [3.9, S, 2.1, -1.2],
      ],
    );
  }
  {
    // ---- Plaza: umbrella sculpture, trees, benches, lamps, people; clinic west, cars east.
    const ux = 0.9,
      uz = 1.55;
    put(streetG, st.stone, lathe(THREE, [[0, 0], [0.4, 0], [0.42, 0.05], [0.38, 0.06], [0, 0.06]], 40).translate(ux, S, uz));
    put(streetG, st.water, new THREE.CircleGeometry(0.37, 40).rotateX(-Math.PI / 2).translate(ux, S + 0.045, uz));
    put(streetG, st.steel, cyl(0.012, 0.62, ux, S, uz, 8), new THREE.TorusGeometry(0.05, 0.01, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(ux, S + 0.05, uz + 0.05));
    put(streetG, st.umbrella, new THREE.ConeGeometry(0.36, 0.16, 8, 1, true).translate(ux, S + 0.6, uz));
    const ribs: T.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      ribs.push(bar(THREE, [ux, S + 0.68, uz], [ux + 0.36 * Math.cos(a), S + 0.52, uz + 0.36 * Math.sin(a)], 0.005, 4));
    }
    put(streetG, st.white, ...ribs);
    for (const [x, z] of [
      [-2.6, 1.0],
      [-3.3, 2.2],
      [-0.4, 1.0],
      [2.1, 1.0],
      [-4.4, 0.7],
      [-2.95, 0.6],
      [-4.4, -2.75],
      [-2.95, -2.75],
      [4.45, 1.05],
    ] as [number, number][])
      tree(streetG, st, x, z, 0.85);
    const bench: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [0.1, 1.15],
      [1.75, 1.15],
      [0.1, 2.05],
      [1.75, 2.05],
    ] as [number, number][])
      bench.push(bx(x - 0.16, x + 0.16, S + 0.05, S + 0.065, z - 0.04, z + 0.04), bx(x - 0.15, x - 0.13, S, S + 0.05, z - 0.035, z + 0.035), bx(x + 0.13, x + 0.15, S, S + 0.05, z - 0.035, z + 0.035));
    put(streetG, st.wood, ...bench);
    const lamps: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-2.4, -1.2, 0.8, 2.0]) {
      lamps.push(cyl(0.008, 0.36, x, S, 2.48, 6));
      heads.push(rb(0.05, 0.015, 0.03, 0.006, x, S + 0.36, 2.48));
    }
    put(streetG, st.dark, ...lamps);
    put(streetG, st.lamp, ...heads);
    people(streetG, st, [
      [-3.4, S, 1.3],
      [-0.3, S, 1.6],
      [0.4, S, 1.3],
      [1.4, S, 1.85],
      [-0.6, S, 2.4],
      [0.3, S, 2.45],
      [1.6, S, 0.95],
      [-2.6, S, 2.42, 0],
      [-3.8, S, 1.7],
    ]);
    // Clinic in the west garden.
    put(streetG, st.clinic, ...facadeShell(-4.2, -3.0, -2.5, -0.9, S, S + 0.5, 0.4, 0.25));
    put(streetG, st.stone, bx(-4.23, -2.97, S + 0.5, S + 0.53, -2.53, -0.87));
    put(streetG, st.clinicSign, vPlane(0.55, 0.12, -2.995, S + 0.42, -1.7, Math.PI / 2));
    // Car park and road traffic.
    for (const [x, z, ry, c] of [
      [3.0, -2.6, 0, 0xd9dfe6],
      [3.0, -1.6, 0, 0x2f5d9a],
      [3.0, -0.6, 0, 0xb8382e],
      [4.05, -2.25, Math.PI, 0x3a3e44],
      [4.05, -1.25, Math.PI, 0xeef0f2],
      [4.05, 0.4, Math.PI, 0xe2b33a],
      [-3.4, 2.86, 0, 0xb8382e],
      [-0.8, 3.18, Math.PI, 0xeef0f2],
      [1.6, 2.86, 0, 0x2f5d9a],
      [3.9, 3.18, Math.PI, 0x3a3e44],
    ] as [number, number, number, number][]) {
      cars.push({ p: [x, S, z], ry, c });
      carCab.push({ p: [x, S, z], ry });
    }
  }

  // ================================================================ PODIUM + TOWER SHELL (layer 0 bucket "shell")
  {
    // Podium walls (with a recessed entrance on the south) and the tower's curtain wall.
    put(streetG, sh.pod, ...facadeShell(DX0, DX1, DZ0, DZ1, S, S + PH, 0.5, PH));
    put(streetG, sh.dark, bx(-0.55, 0.15, S, S + 0.3, DZ1, DZ1 + 0.01));
    put(streetG, sh.stone, bx(-0.7, 0.3, S + 0.3, S + 0.33, DZ1, DZ1 + 0.25));
    put(streetG, sh.curtain, ...facadeShell(TX0, TX1, TZ0, TZ1, F[0], TOP, 0.475, FH));
    // Vertical fins at the tower corners.
    const fins: T.BufferGeometry[] = [];
    for (const x of [TX0, TX1]) for (const z of [TZ0, TZ1]) fins.push(bx(x - 0.02, x + 0.02, F[0], TOP + 0.08, z - 0.02, z + 0.02));
    put(streetG, sh.stone, ...fins);
    // Roof: slab, crown ring, plant and the rooftop sign; podium roof garden on the west half.
    put(streetG, rf.slab, bx(TX0, TX1, TOP, TOP + 0.03, TZ0, TZ1));
    put(streetG, rf.crown, bx(TX0 - 0.02, TX1 + 0.02, TOP + 0.08, TOP + 0.11, TZ0 - 0.02, TZ1 + 0.02));
    put(streetG, rf.unit, bx(0.6, 1.1, TOP + 0.03, TOP + 0.14, -1.4, -0.9), bx(1.3, 1.8, TOP + 0.03, TOP + 0.1, -1.6, -1.2));
    put(streetG, rf.sign, vPlane(1.1, 0.2, (TX0 + TX1) / 2, TOP + 0.24, TZ1 - 0.05));
    put(streetG, rf.unit, bx(0.65, 1.75, TOP + 0.03, TOP + 0.14, TZ1 - 0.07, TZ1 - 0.06));
  }

  // ================================================================ LAYER 1: INSURER FLOORS
  {
    put(floorG, pr.slab, bx(DX0, DX1, S + PH, F[0], DZ0, DZ1));
    put(floorG, pr.garden, bx(-2.4, -0.1, F[0], F[0] + 0.01, -2.2, 0.5));
    for (const [x, z] of [
      [-2.0, -1.8],
      [-1.0, -1.9],
      [-1.6, -0.6],
      [-0.5, -0.3],
      [-2.1, 0.2],
    ] as [number, number][])
      tree(floorG, fl, x, z, 0.7, F[0] + 0.01);
    for (let i = 1; i < 4; i++) put(floorG, fl.slab, bx(TX0 + 0.01, TX1 - 0.01, F[i] - 0.025, F[i], TZ0 + 0.01, TZ1 - 0.01));
    // Service core (lifts) in the north-west corner of every floor.
    put(floorG, fl.grey, bx(TX0 + 0.05, TX0 + 0.45, F[0], TOP, TZ0 + 0.05, TZ0 + 0.45));
    const workDesks = (y: number, rows: [number, number][]) => {
      desks(floorG, fl, rows.map(([x, z]) => ({ p: [x, y, z] })), 2, 0.24);
      people(floorG, fl, rows.map(([x, z]) => [x, y - 0.03, z + 0.11, Math.PI] as [number, number, number, number]));
    };
    // Floor props sit on one screen diagonal (x - z = 2.6) so the four markers stack straight down.
    // F1 - standalone health insurers: hospital bed + drip, red-cross wall, nurses' desks.
    {
      const y = F[0],
        bx0 = 1.95,
        bz0 = -0.55;
      put(floorG, fl.cross, vPlane(0.3, 0.3, 1.25, y + 0.18, TZ0 + 0.012));
      put(floorG, fl.white, rb(0.26, 0.06, 0.12, 0.015, bx0, y + 0.04, bz0));
      put(floorG, fl.sheet, rb(0.24, 0.02, 0.11, 0.01, bx0, y + 0.1, bz0));
      put(floorG, fl.steel, ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => bar(THREE, [bx0 + sx * 0.11, y, bz0 + sz * 0.045], [bx0 + sx * 0.11, y + 0.05, bz0 + sz * 0.045], 0.006, 4))));
      put(floorG, fl.steel, bar(THREE, [bx0, y, bz0 + 0.17], [bx0, y + 0.22, bz0 + 0.17], 0.005, 4));
      put(floorG, fl.glass, rb(0.03, 0.05, 0.02, 0.008, bx0, y + 0.17, bz0 + 0.19));
      people(floorG, fl, [[bx0 - 0.25, y, bz0 - 0.1, 0.4]], [0xffffff, 0xd9eef5]);
      workDesks(y, [
        [0.85, -0.6],
        [1.15, -0.6],
        [0.85, -1.1],
        [1.15, -1.1],
      ]);
    }
    // F2 - general insurers: a car on a turntable, a small house, a cargo container.
    {
      const y = F[1];
      put(floorG, fl.steel, cyl(0.18, 0.015, 1.75, y, -0.85, 28));
      const c = carParts(1.75, y + 0.015, -0.85, 0.5, 0.32);
      put(floorG, fl.red, c.body);
      put(floorG, fl.dark, c.cab, ...c.wheels);
      put(floorG, fl.white, ...facadeShell(0.75, 1.0, -0.5, -0.28, y, y + 0.14, 0.25, 0.14));
      put(floorG, fl.roof, gable(0.75, 1.0, -0.5, -0.28, y + 0.14, 0.08));
      put(floorG, fl.flame, new THREE.ConeGeometry(0.035, 0.09, 8).translate(0.8, y + 0.27, -0.39));
      put(floorG, fl.container, bx(1.55, 1.95, y, y + 0.13, -1.85, -1.7));
      workDesks(y, [
        [0.85, -1.35],
        [1.15, -1.35],
      ]);
    }
    // F3 - LIC-style life insurers: an agents' training room and a long policy counter.
    {
      const y = F[2];
      put(floorG, fl.board, vPlane(0.5, 0.18, 0.85, y + 0.17, TZ0 + 0.012));
      const seats: [number, number, number, number][] = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) seats.push([0.7 + c * 0.14, y, -1.6 + r * 0.17, Math.PI]);
      seated(floorG, fl, seats, [0xe0b23a, 0xd9d2c5, 0x2b4c7e, 0xc77d2e, 0x8a2b2b]);
      put(floorG, fl.wood, bx(1.31, 1.49, y, y + 0.09, -1.65, -0.75));
      const books: T.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) books.push(bx(1.36, 1.44, y + 0.09, y + 0.11 + (i % 3) * 0.01, -1.58 + i * 0.14, -1.52 + i * 0.14));
      put(floorG, fl.red, ...books);
      people(floorG, fl, [
        [1.6, y, -1.4, -Math.PI / 2],
        [1.6, y, -1.0, -Math.PI / 2],
        [1.2, y, -0.9, Math.PI / 2],
        [0.85, y, -2.0, 0],
      ]);
    }
    // F4 - bank-promoted life insurers: a family under an umbrella, advisors' desks.
    {
      const y = F[3],
        ux = 1.05,
        uz = -1.55;
      put(floorG, fl.stone, cyl(0.16, 0.03, ux, y, uz, 24));
      put(floorG, fl.steel, cyl(0.008, 0.28, ux, y + 0.03, uz, 6));
      put(floorG, fl.umbrella, new THREE.ConeGeometry(0.2, 0.08, 8, 1, true).translate(ux, y + 0.3, uz));
      people(floorG, fl, [
        [ux - 0.06, y + 0.03, uz, 0.6],
        [ux + 0.06, y + 0.03, uz + 0.03, -0.4],
      ]);
      inst(floorG, bodyGeo, fl.body, [{ p: [ux, y + 0.03, uz + 0.09], s: [0.6, 0.6, 0.6], c: 0xe0b23a }]);
      inst(floorG, headGeo, fl.skin, [{ p: [ux, y + 0.03, uz + 0.09], s: [0.6, 0.6, 0.6] }]);
      workDesks(y, [
        [0.85, -0.6],
        [1.15, -0.6],
        [1.45, -0.6],
        [1.75, -1.1],
      ]);
    }
  }

  // ================================================================ LAYER 2: PODIUM HALL
  {
    const y = S;
    put(hallG, hl.floor, bx(DX0 + 0.01, DX1 - 0.01, y - 0.002, y + 0.004, DZ0 + 0.01, DZ1 - 0.01));
    // Glass partition between the reinsurance room (west middle) and the claims hall (front).
    put(hallG, hl.glass, vPlane(1.3, 0.3, -1.9, y + 0.15, 0.0));
    put(hallG, hl.frame, bx(-2.55, -1.25, y + 0.3, y + 0.31, -0.005, 0.005));
    // ---- Reinsurance room: treaty map wall, a big globe, the treaty table, a vault door.
    put(hallG, hl.map, vPlane(1.1, 0.24, DX0 + 0.012, y + 0.2, -0.45, Math.PI / 2));
    put(hallG, hl.wood, cyl(0.07, 0.04, -2.1, y, -0.6, 16), cyl(0.008, 0.12, -2.1, y + 0.04, -0.6, 6));
    put(hallG, hl.globe, new THREE.SphereGeometry(0.11, 24, 16).rotateZ(0.4).translate(-2.1, y + 0.27, -0.6));
    put(hallG, hl.steel, new THREE.TorusGeometry(0.125, 0.006, 6, 32).rotateZ(0.4).translate(-2.1, y + 0.27, -0.6));
    put(hallG, hl.wood, rb(0.24, 0.03, 0.6, 0.04, -1.55, y + 0.08, -0.5), bx(-1.58, -1.52, y, y + 0.08, -0.75, -0.25));
    const ch: [number, number, number, number][] = [];
    for (let i = 0; i < 3; i++) ch.push([-1.72, y - 0.03, -0.7 + i * 0.2, -Math.PI / 2], [-1.38, y - 0.03, -0.7 + i * 0.2, Math.PI / 2]);
    seated(hallG, hl, ch);
    put(hallG, hl.vault, lathe(THREE, [[0, -0.01], [0.13, -0.01], [0.135, 0.0], [0.13, 0.02], [0.1, 0.026], [0, 0.026]], 32).rotateX(Math.PI / 2).translate(-1.9, y + 0.18, DZ0 + 0.02));
    put(hallG, hl.vaultDark, new THREE.TorusGeometry(0.14, 0.01, 8, 32).translate(-1.9, y + 0.18, DZ0 + 0.02));
    // ---- Claims hall (front west): the claims wall, TPA desks, a cashless queue.
    put(hallG, hl.claims, vPlane(0.6, 0.2, DX0 + 0.012, y + 0.2, 0.38, Math.PI / 2));
    desks(hallG, hl, [{ p: [-1.9, y, 0.25] }, { p: [-1.6, y, 0.25] }, { p: [-1.3, y, 0.25] }, { p: [-1.0, y, 0.25] }], 2, 0.24);
    people(hallG, hl, [
      [-1.9, y - 0.03, 0.36, Math.PI],
      [-1.6, y - 0.03, 0.36, Math.PI],
      [-1.3, y - 0.03, 0.36, Math.PI],
      [-1.0, y - 0.03, 0.36, Math.PI],
      [-1.6, y, 0.08, 0],
      [-1.0, y, 0.1, 0],
      [-2.3, y, 0.55, 2.0],
    ]);
    // ---- Survey bay (back middle): a dented car being inspected.
    {
      const c = carParts(-0.6, y, -1.5, 0.3, 0.34);
      put(hallG, hl.car, c.body);
      put(hallG, hl.carGlass, c.cab);
      put(hallG, hl.dark, ...c.wheels);
      put(hallG, hl.dark, new THREE.SphereGeometry(0.03, 8, 6).scale(1, 0.6, 0.5).translate(-0.45, y + 0.07, -1.42));
      put(hallG, hl.yellow, new THREE.ConeGeometry(0.02, 0.06, 8).translate(-0.3, y + 0.03, -1.25));
      people(hallG, hl, [[-0.35, y, -1.62, -2.2]], [0xe2b33a]);
    }
    // ---- Lobby under the tower: reception desk and visitors.
    put(hallG, hl.wood, rb(0.6, 0.1, 0.12, 0.03, 0.9, y, 0.3));
    people(hallG, hl, [
      [0.75, y, 0.18, 0],
      [1.05, y, 0.18, 0],
      [0.9, y, 0.5, Math.PI],
      [1.6, y, -0.4],
      [2.0, y, -1.2],
    ]);
    put(hallG, hl.grey, bx(TX0 + 0.05, TX0 + 0.45, y, y + PH, TZ0 + 0.05, TZ0 + 0.45));
  }

  // ================================================================ LAYER 3: BASEMENT (back west)
  {
    const y = B0;
    // Ground slab over the pit (ghosts at layer 3) and the pit lining.
    put(hallG, s0.slab, bx(QX0, QX1, S - 0.05, S - 0.003, QZ0, QZ1));
    put(coreG, co.lining, bx(QX0, QX1, 0, y, QZ0, QZ1), bx(QX0 - 0.02, QX0, y, S - 0.05, QZ0, QZ1), bx(QX1, QX1 + 0.02, y, S - 0.05, QZ0, QZ1), bx(QX0, QX1, y, S - 0.05, QZ0 - 0.02, QZ0));
    put(coreG, co.floor, floorPlane(QX0, QX1, QZ0, QZ1, y + 0.001));
    put(coreG, co.lining, bx(-1.2, -1.15, y, S - 0.08, QZ0, -1.55));
    // ---- Holding companies' boardroom (west): long table, chairs, group chart, capital safes.
    put(coreG, co.org, vPlane(0.7, 0.26, -1.85, y + 0.18, QZ0 + 0.012));
    put(coreG, co.wood, rb(0.8, 0.025, 0.3, 0.03, -1.85, y + 0.08, -1.55), bx(-2.2, -1.5, y, y + 0.08, -1.58, -1.52));
    const chairs: [number, number, number, number][] = [];
    for (let i = 0; i < 4; i++) chairs.push([-2.12 + i * 0.18, y - 0.02, -1.36, Math.PI], [-2.12 + i * 0.18, y - 0.02, -1.74, 0]);
    seated(coreG, co, chairs, [0x1f2a36, 0x4a4a52, 0x2b4c7e, 0xd9d2c5]);
    put(coreG, co.leather, ...chairs.map(([x, , z]) => bx(x - 0.035, x + 0.035, y, y + 0.05, z - 0.035, z + 0.035)));
    put(coreG, co.steel, ...[0, 1].map((i) => rb(0.16, 0.22, 0.12, 0.015, -2.38, y, -1.95 + i * 0.6).rotateY(0)));
    // ---- Regulator's bench (east): a raised dais, three seats, the rule book; the public data hub.
    put(coreG, co.wood, bx(-0.9, -0.1, y, y + 0.05, -2.2, -1.85));
    put(coreG, co.wood, bx(-0.85, -0.15, y, y + 0.14, -1.85, -1.78));
    seated(coreG, co, [
      [-0.75, y + 0.05, -2.0, 0],
      [-0.5, y + 0.05, -2.0, 0],
      [-0.25, y + 0.05, -2.0, 0],
    ], [0x1f2a36, 0x22344c]);
    put(coreG, co.red, bx(-0.55, -0.45, y + 0.14, y + 0.165, -1.84, -1.79));
    put(coreG, co.hub, vPlane(0.7, 0.13, -0.5, y + 0.27, QZ0 + 0.012));
    const rk: Item[] = [];
    for (let i = 0; i < 7; i++) rk.push({ p: [-0.95 + i * RW, y, -1.15], ry: 0 });
    racks(coreG, 0.24, rk);
    put(coreG, co.tray, bx(-1.0, -0.95 + 6.5 * RW, y + 0.245, y + 0.255, -1.18, -1.12));
    people(coreG, co, [
      [-0.5, y, -1.5, 2.0],
      [-1.4, y, -1.2, 0.5],
    ]);
  }

  // ---------------------------------------------------------------- flush batches
  inst(streetG, carGeo.body, st.car, cars);
  inst(streetG, carGeo.cab, st.carGlass, carCab);
  inst(streetG, carGeo.wheels, st.dark, carCab);
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
  // The phone flips between quote screens, the claims wall scrolls, hub racks blink.
  let lastBlink = -1,
    lastPhone = -1;
  lipMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    claimsTex.offset.x = (t * 0.03) % 1;
    const f = Math.floor(t / 0.4);
    if (f !== lastBlink) {
      lastBlink = f;
      rackLed.offset.y = (f % 4) * 0.25;
    }
    const p = Math.floor(t / 2.2);
    if (p !== lastPhone) {
      lastPhone = p;
      phoneTex.offset.y = (p % 2) * 0.5;
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
      L.set("street", pw(v, [[0, 1], [1, 0.4], [2, 0.3], [3, 0.25]]));
      L.set("shell", pw(v, [[0, 1], [0.7, 0.12], [1, 0.08], [3, 0.05]]));
      L.set("roof", pw(v, [[0, 1], [0.5, 0.08], [1, 0.04], [3, 0.03]]));
      L.set("floors", pw(v, [[0, 1], [1, 1], [1.7, 0.12], [2, 0.08], [3, 0.05]]));
      L.set("podRoof", pw(v, [[0, 1], [1, 1], [1.6, 0.08], [2, 0.05], [3, 0.04]]));
      // The hall shows through the ghosted podium walls at layer 1, so it dims there too.
      L.set("hall", pw(v, [[0, 1], [0.6, 0.35], [1.3, 0.35], [2, 1], [2.7, 0.14], [3, 0.1]]));
      L.set("slab0", pw(v, [[0, 1], [2, 1], [2.6, 0.08], [3, 0.05]]));
      L.set("core", 1);
    },
  };
}
