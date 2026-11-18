// Hotels & Travel: a miniature travel town on a display plinth (generic, no real hotel's,
// airline's or airport's building, logo or livery).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Front row facing the road: a curved luxury hotel tower with a porte-cochère and a pool
//     garden behind it, a midscale business hotel, and a row of small budget stays.
//   · West side: an airport - a runway along the edge, an airliner parked at the gate, a glass
//     terminal with a food court, lounge and duty-free shop inside, and the control tower.
//   · East side: leisure - a tour coach by a row of holiday cottages, a heritage tourist train on
//     the track along the back, and a theme park with a turning Ferris wheel and a coaster loop.
//   · Back middle, sunk into the plinth under a garden terrace: the back office - a booking data
//     hall (racks, live booking wall), a visa & forex centre (counters, currency board, queue) and
//     the owners' room (a table of hotel models under a portfolio wall).
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Hotels & Stays        the hotel row and pool garden
//   1 Leisure & Holidays    hotels ghost -> the leisure side
//   2 Getting There         leisure ghosts, terminal roof thins -> the airport
//   3 Booking & Capital     airport + terrace ghost -> the back office below
// The Ferris wheel turns and the booking wall and currency board animate (animated: true).
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
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// ------------------------------------------------------------------ key dims
const S = 0.42; // street level (top of the plinth)
const B0 = 0.05; // basement floor
const PX = 4.7,
  PZ = 3.4,
  PR = 0.4; // plinth half-sizes + corner radius
const QX0 = -1.6,
  QX1 = 2.7,
  QZ0 = -2.8,
  QZ1 = -1.3; // back-office pit under the terrace
const WHEEL: Vec3 = [3.95, S + 0.62, -0.25]; // Ferris-wheel hub

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/hotels.ts). The bottom rail runs west -> east
// along the hotel row, the left rail back -> front through the airport, the right rail back ->
// front through the leisure side and the top rail west -> east through the back office, so the
// markers keep the rails' order in every view (scripts/check-crossings.mjs).
export const HOTELS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: hotel row
  luxury_chains: { pos: [-0.6, S + 0.3, 2.32], side: "bottom" }, // luxury hotel porte-cochère
  midscale_chains: { pos: [1.25, S + 0.5, 2.22], side: "bottom" }, // midscale hotel sign
  franchise_stays: { pos: [3.0, S + 0.34, 2.28], side: "bottom" }, // budget stays' shared sign
  // layer 1: leisure side
  holidays: { pos: [4.0, S + 0.2, -1.75], side: "right" }, // tour coach by the cottages
  parks: { pos: WHEEL, side: "right" }, // Ferris-wheel hub
  // layer 2: airport
  airlines: { pos: [-3.7, S + 0.24, -0.62], side: "left" }, // airliner's tail at the gate
  airports: { pos: [-1.94, S + 0.42, -0.9], side: "left" }, // terminal fascia sign
  airport_services: { pos: [-2.45, S + 0.28, 1.31], side: "left" }, // lounge and food-court sign
  // layer 3: back office
  distribution: { pos: [-0.9, B0 + 0.3, -2.2], side: "top" }, // booking data hall racks
  visa_forex: { pos: [0.5, B0 + 0.22, -1.9], side: "top" }, // visa & forex counters
  asset_owners: { pos: [1.7, B0 + 0.2, -2.0], side: "top" }, // owners' table of hotel models
};

export const HOTELS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.4, 6.8, 9.4],
    target: [0, 0.8, 0],
    narration:
      "Welcome to the travel town. Hotels line the road, holidays and theme parks fill the east side, the airport brings travellers in on the west, and the bookings, visas and owners' money sit in the back office below the terrace. Peel it layer by layer, from the hotel row to the back office.",
  },
  {
    id: "hotels",
    layer: 0,
    label: "Hotel Row",
    pos: [5.2, 2.9, 6.8],
    target: [1.5, 0.75, 1.3],
    narration:
      "The hotel row. The curved tower is a luxury chain hotel, the kind Indian Hotels and ITC Hotels run, with a pool garden behind it. Next door is a midscale business hotel, like Lemon Tree's, and at the end small budget stays that sign up to franchise and booking platforms.",
  },
  {
    id: "leisure",
    layer: 1,
    label: "Leisure",
    pos: [7.8, 3.8, 2.4],
    target: [3.5, 0.6, -1.0],
    narration:
      "The leisure side. A tour coach waits by holiday cottages, the business of tour operators and holiday-ownership clubs like Thomas Cook and Mahindra Holidays, and a heritage train runs rail tours like IRCTC's. In front, a theme park with its Ferris wheel and coaster, the model of Wonderla.",
  },
  {
    id: "airport",
    layer: 2,
    label: "Airport",
    pos: [-1.6, 4.2, 5.4],
    target: [-2.8, 0.45, -0.5],
    narration:
      "Getting there. An airliner sits at the gate, the business of airlines like IndiGo. The terminal and runway belong to airport operators like GMR and Adani, and inside, the food court, lounge and duty-free shops are run by airport service companies.",
  },
  {
    id: "backoffice",
    layer: 3,
    label: "Back Office",
    pos: [3.2, 5.6, 3.6],
    target: [0.5, 0.1, -2.0],
    narration:
      "Under the terrace sits the back office. On the left, a booking data hall where wholesale platforms sell rooms and seats to travel agents. In the middle, a visa and forex centre. On the right, the owners' room, where funds and real-estate firms own hotels that the chains run.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the hotel row along the road with the pool garden behind it, the airport down the west side, the leisure side and theme park on the east, and the terrace at the back over the back office.",
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

export function buildHotels(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [hotelG, leisureG, airG, coreG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const R = rng(20261120);

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

  // Ground: paving, road, runway and apron, pool garden, park lawns and the back track.
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
    rect(-PX, -PZ, PX, PZ, "#b3b4b2");
    g.strokeStyle = "rgba(0,0,0,0.06)";
    for (let x = -PX; x <= PX; x += 0.2) {
      g.beginPath();
      g.moveTo(...P(x, -PZ));
      g.lineTo(...P(x, PZ));
      g.stroke();
    }
    // Road along the front.
    rect(-PX, 2.66, PX, PZ, "#3b3e43");
    rect(-PX, 2.6, PX, 2.66, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.03);
      g.fillRect(a, b, 0.25 * GS, 3);
    }
    // Airport: grass, runway with centre line and threshold bars, apron.
    rect(-PX, -PZ, -1.85, 2.6, "#7c9a5e");
    rect(-4.55, -3.25, -3.95, 2.5, "#45484d");
    g.fillStyle = "#f2f0e8";
    for (let z = -3.0; z < 2.3; z += 0.36) {
      const [a, b] = P(-4.26, z);
      g.fillRect(a, b, 3, 0.18 * GS);
    }
    for (let i = 0; i < 6; i++) {
      const [a, b] = P(-4.5 + i * 0.09, 2.2);
      g.fillRect(a, b, 0.05 * GS, 0.22 * GS);
    }
    rect(-3.95, -1.4, -1.85, 1.5, "#8f9296");
    g.strokeStyle = "#e9c84a";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(...P(-3.95, -0.62));
    g.lineTo(...P(-3.2, -0.62));
    g.stroke();
    // Pool garden behind the hotel row.
    rect(-1.6, -1.1, 2.8, 0.95, "#86a865");
    rect(-1.3, -0.95, 1.1, 0.75, "#d8cdb6");
    // East side: park lawn and the cottages' green.
    rect(3.0, -3.0, PX, 1.05, "#7f9f5a");
    rect(3.1, -1.15, 4.6, 0.95, "#c8bea9");
    // Back track bed.
    rect(-1.85, -3.3, PX, -3.0, "#8a7c66");
  });

  // Facades.
  const luxTex = windows(5, 8, "#2c2a28", "#c9a86a", "#5d4a2c", 0.25, 5);
  const midTex = windows(4, 5, "#eef0f2", "#6e8aa2", "#3d536b", 0.15, 8);
  const budgetTex = windows(2, 2, "#f2e2c4", "#5f7d96", "#2f4559", 0.3, 12);
  const cottageTex = windows(2, 1, "#f0e6d2", "#5f7d96", "#2f4559", 0.4, 16);
  const tHotel = sign("GRAND HOTEL", "#1e1b18", "#e4c27a", 512, 64, 36);
  const tMid = sign("HOTEL", "#2e6fb0", "#ffffff", 256, 64, 40);
  const tStay = sign("STAYS", "#d8533a", "#ffffff", 256, 64, 40);
  const tAir = sign("AIRPORT", "#1d2b3c", "#f2f4f6", 256, 64, 40);
  const tLounge = sign("LOUNGE  •  FOOD  •  DUTY FREE", "#30254a", "#f3e6c8", 512, 64, 26);
  const tTours = sign("TOURS", "#2a7f62", "#ffffff", 256, 64, 40);
  const tPark = sign("THEME PARK", "#c8352c", "#fff3c8", 256, 64, 32);
  const tVisa = sign("VISA  •  FOREX", "#1f4a7a", "#ffffff", 512, 64, 36);
  const tOwners = sign("PORTFOLIO", "#3a2f55", "#f0ecfa", 256, 64, 34);
  const monTex = tex(64, 40, (g, w, h) => {
    g.fillStyle = "#10202e";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7fc8ff";
    g.fillRect(4, 4, w - 8, 4);
    g.fillStyle = "#3fd08a";
    for (let i = 0; i < 4; i++) g.fillRect(6, 12 + i * 6, 20 + ((i * 13) % 30), 3);
  });
  // Booking wall: rows of availability blocks that scroll (animated via offset).
  const bookTex = (() => {
    const t = tex(512, 128, (g, w, h) => {
      g.fillStyle = "#0b1622";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#cfe8ff";
      g.font = font(16);
      g.fillText("ROOMS  •  FLIGHTS  •  AGENTS", 10, 20);
      for (let i = 0; i < 20; i++)
        for (let k = 0; k < 4; k++) {
          g.fillStyle = (i * 3 + k) % 7 === 0 ? "#ff7a4a" : (i + k) % 3 === 0 ? "#3aa6ff" : "#2fe07a";
          g.fillRect(6 + i * 25, 32 + k * 23, 19, 15);
        }
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  })();
  // Currency board: generic codes with digits; offset.y flips between two frames.
  const fxTex = (() => {
    const t = tex(256, 256, (g, w, h) => {
      for (let f = 0; f < 2; f++) {
        const y0 = (f * h) / 2;
        g.fillStyle = "#101418";
        g.fillRect(0, y0, w, h / 2);
        g.font = font(18);
        ["USD", "EUR", "GBP", "AED", "SGD"].forEach((c, i) => {
          g.fillStyle = "#ffd36a";
          g.fillText(c, 14, y0 + 24 + i * 22);
          g.fillStyle = (i + f) % 2 ? "#5fe08a" : "#ff7a6a";
          g.fillText(((i * 37 + f * 3) % 90 + 10).toFixed(0) + "." + ((i * 17 + f * 11) % 90 + 10), 120, y0 + 24 + i * 22);
        });
      }
    });
    t.repeat.set(1, 0.5);
    return t;
  })();
  const folioTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = 12 + i * 61;
      g.fillStyle = ["#2c2a28", "#2e6fb0", "#d8533a", "#2a7f62"][i];
      const bh = 40 + ((i * 23) % 50);
      g.fillRect(x + 10, h - 20 - bh, 30, bh);
      g.fillStyle = "#c9a86a";
      for (let k = 0; k < bh / 10 - 1; k++) g.fillRect(x + 14, h - 16 - bh + k * 10, 22, 4);
    }
    g.fillStyle = "#5a4a2a";
    g.fillRect(0, h - 14, w, 3);
  });
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
  const ht = {
    ...pal("hotels"),
    lux: L.add("hotels", std(0xffffff, 0.35, 0.3, { map: luxTex })),
    mid: L.add("hotels", std(0xffffff, 0.1, 0.55, { map: midTex })),
    budget: L.add("hotels", std(0xffffff, 0.05, 0.7, { map: budgetTex })),
    hotelSign: signMat("hotels", tHotel, 0.55),
    midSign: signMat("hotels", tMid, 0.5),
    staySign: signMat("hotels", tStay, 0.5),
    bronze: L.add("hotels", std(0xb08a4a, 0.8, 0.3)),
    pool: L.add("hotels", std(0x4fb6d8, 0.1, 0.08, { emissive: 0x0e4b62, emissiveIntensity: 0.45 })),
    parasol: L.add("hotels", std(0xf4f1e8, 0.05, 0.6, { side: DS })),
    car: L.add("hotels", std(0xffffff, 0.5, 0.35)),
    carGlass: L.add("hotels", std(0x1b2631, 0.6, 0.15)),
    lamp: L.add("hotels", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    palm: L.add("hotels", std(0x3f8a3e, 0, 0.8, { side: DS })),
  };
  const le = {
    ...pal("leisure"),
    cottage: L.add("leisure", std(0xffffff, 0.05, 0.75, { map: cottageTex })),
    tours: signMat("leisure", tTours, 0.45),
    park: signMat("leisure", tPark, 0.5),
    coach: L.add("leisure", std(0x2a7f62, 0.35, 0.4)),
    train: L.add("leisure", std(0x7b2e2a, 0.35, 0.45)),
    cream: L.add("leisure", std(0xefe3c4, 0.1, 0.6)),
    rail: L.add("leisure", std(0x6b6f74, 0.8, 0.4)),
    track: L.add("leisure", std(0xd8533a, 0.4, 0.45)),
    rim: L.add("leisure", std(0xf2f4f6, 0.6, 0.3)),
    gondola: L.add("leisure", std(0xffffff, 0.3, 0.45)),
    slide: L.add("leisure", std(0xe2b33a, 0.2, 0.4)),
    water: L.add("leisure", std(0x4fb6d8, 0.1, 0.08, { emissive: 0x0e4b62, emissiveIntensity: 0.45 })),
  };
  const ar = {
    ...pal("air"),
    fuselage: L.add("air", std(0xf4f6f8, 0.35, 0.3)),
    tail: L.add("air", std(0x2f5d9a, 0.3, 0.4)),
    engine: L.add("air", std(0xbfc6cd, 0.7, 0.3)),
    window: L.add("air", std(0x1b2631, 0.5, 0.2)),
    airSign: signMat("air", tAir, 0.5),
    lounge: signMat("air", tLounge, 0.45),
    bridge: L.add("air", std(0xd5dadf, 0.4, 0.4)),
    beacon: L.add("air", std(0xffffff, 0, 0.4, { emissive: 0xff5a3a, emissiveIntensity: 1.2 })),
    sofa: L.add("air", std(0x30254a, 0.05, 0.8)),
  };
  const aRoof = {
    roof: L.add("airRoof", std(0xe9ecef, 0.3, 0.4, { side: DS })),
    rib: L.add("airRoof", std(0x8d97a1, 0.6, 0.35)),
  };
  const tr = {
    deck: L.add("terrace", std(0xd4ccbc, 0.05, 0.7)),
    lawn: L.add("terrace", std(0x6f9a52, 0, 0.9)),
    ...(() => {
      const p = pal("terrace");
      return { tGreen: p.green, tTrunk: p.trunk, tWood: p.wood, tBody: p.body, tSkin: p.skin, tPal: p };
    })(),
  };
  const co = {
    ...pal("core"),
    lining: L.add("core", std(0xb9b4ab, 0.05, 0.85)),
    floor: L.add("core", std(0xbfc5cb, 0.1, 0.55)),
    book: screen("core", bookTex, 1.1),
    fx: screen("core", fxTex, 1.0),
    visa: signMat("core", tVisa, 0.45),
    owners: signMat("core", tOwners, 0.4),
    folio: L.add("core", std(0xffffff, 0, 0.6, { map: folioTex, emissive: 0xffffff, emissiveMap: folioTex, emissiveIntensity: 0.25 })),
    rackSide: L.add("core", std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add("core", std(0x2b333d, 0.5, 0.4)),
    rackFront: L.add("core", std(0xffffff, 0.3, 0.4, { map: rackLed, emissive: 0xffffff, emissiveMap: rackLed, emissiveIntensity: 1.0 })),
    tray: L.add("core", std(0xe2b33a, 0.35, 0.45)),
    lux: L.add("core", std(0xffffff, 0.35, 0.3, { map: luxTex })),
    mid: L.add("core", std(0xffffff, 0.1, 0.55, { map: midTex })),
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

  /** A palm: curved trunk and a crown of drooping fronds. */
  const palm = (parent: T.Object3D, mats: { trunk: T.Material; leaf: T.Material }, x: number, z: number, h = 0.36, y = S) => {
    put(parent, mats.trunk, tube(THREE, [[x, y, z], [x + 0.02, y + h * 0.5, z + 0.01], [x + 0.05, y + h, z + 0.02]], 0.012, 5));
    const fr: T.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = new THREE.PlaneGeometry(0.2, 0.05).translate(0.1, 0, 0).rotateZ(-0.45).rotateY(a);
      fr.push(leaf.translate(x + 0.05, y + h, z + 0.02));
    }
    put(parent, mats.leaf, ...fr);
  };

  // ================================================================ LAYER 0: HOTEL ROW + POOL GARDEN
  {
    // ---- Luxury hotel: a curved tower on a podium, crown, porte-cochère with a car.
    const cx = -0.6,
      cz = 1.45;
    const curve = (r: number, h: number, y: number) => {
      // Front half-ellipse plan (convex to +z) + flat back, extruded up.
      const sh = new THREE.Shape();
      const n = 20;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI - (i / n) * Math.PI;
        const x = 0.85 * r * Math.cos(a),
          z = 0.5 * r * Math.sin(a);
        if (i === 0) sh.moveTo(x, -z);
        else sh.lineTo(x, -z);
      }
      sh.lineTo(0.85 * r, 0.25 * r);
      sh.lineTo(-0.85 * r, 0.25 * r);
      const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 4 });
      g.rotateX(-Math.PI / 2).translate(cx, y, cz);
      // uv: wrap around by angle so the window grid flows round the curve.
      const p = g.getAttribute("position") as T.BufferAttribute;
      const uv = g.getAttribute("uv") as T.BufferAttribute;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.atan2(p.getZ(i) - cz, p.getX(i) - cx) + Math.PI) * 2.2, (p.getY(i) - y) / 0.2);
      return g;
    };
    put(hotelG, ht.stone, rb(2.0, 0.26, 1.1, 0.04, cx, S, cz - 0.05));
    put(hotelG, ht.glass, vPlane(1.7, 0.2, cx, S + 0.12, cz + 0.505));
    put(hotelG, ht.lux, curve(1.0, 1.45, S + 0.26));
    put(hotelG, ht.dark, curve(1.03, 0.04, S + 1.71), curve(0.9, 0.12, S + 1.75));
    put(hotelG, ht.hotelSign, vPlane(0.9, 0.11, cx, S + 1.65, cz + 0.52));
    put(hotelG, ht.bronze, curve(1.04, 0.02, S + 0.26));
    // Porte-cochère: a cantilevered canopy on two bronze posts, with a guest car.
    put(hotelG, ht.bronze, rb(0.7, 0.03, 0.34, 0.03, cx, S + 0.26, cz + 0.72));
    put(hotelG, ht.bronze, bar(THREE, [cx - 0.3, S, cz + 0.85], [cx - 0.3, S + 0.26, cz + 0.85], 0.012), bar(THREE, [cx + 0.3, S, cz + 0.85], [cx + 0.3, S + 0.26, cz + 0.85], 0.012));
    cars.push({ p: [cx - 0.05, S, cz + 0.74], ry: 0, c: 0x1f2a36 });
    people(hotelG, ht, [
      [cx + 0.18, S, cz + 0.66, Math.PI],
      [cx - 0.25, S, cz + 0.62, 0.3],
      [cx + 0.32, S, cz + 0.98, 2.6],
    ], [0x1f2a36, 0xc9a86a, 0xd9d2c5, 0x8a2b2b]);

    // ---- Midscale business hotel: a white block with a vertical sign.
    const mx0 = 0.6,
      mx1 = 1.9,
      mz0 = 0.95,
      mz1 = 2.05;
    put(hotelG, ht.mid, ...facadeShell(mx0, mx1, mz0, mz1, S, S + 0.95, 0.325, 0.19));
    put(hotelG, ht.grey, bx(mx0 - 0.02, mx1 + 0.02, S + 0.95, S + 0.98, mz0 - 0.02, mz1 + 0.02));
    put(hotelG, ht.midSign, vPlane(0.5, 0.11, 1.25, S + 0.5, mz1 + 0.012));
    put(hotelG, ht.blue, bx(0.95, 1.55, S + 0.2, S + 0.23, mz1, mz1 + 0.16));
    put(hotelG, ht.grey, bx(0.9, 1.2, S + 0.98, S + 1.06, 1.2, 1.5));

    // ---- Budget stays: three small, brightly painted buildings under a shared sign.
    for (const [x, h, c] of [
      [2.3, 0.42, ht.budget],
      [3.0, 0.32, ht.budget],
      [3.7, 0.5, ht.budget],
    ] as [number, number, T.Material][]) {
      put(hotelG, c, ...facadeShell(x - 0.3, x + 0.3, 1.45, 2.1, S, S + h, 0.3, h / 2));
      put(hotelG, ht.roof, gable(x - 0.3, x + 0.3, 1.45, 2.1, S + h, 0.12));
    }
    put(hotelG, ht.staySign, vPlane(0.5, 0.1, 3.0, S + 0.37, 2.11));
    put(hotelG, ht.dark, bx(2.75, 3.25, S + 0.32, S + 0.42, 2.095, 2.105));
    people(hotelG, ht, [
      [2.6, S, 2.3, Math.PI],
      [3.35, S, 2.35, 0.4],
      [4.1, S, 2.2],
    ]);

    // ---- Pool garden: a pool, loungers and parasols, palms.
    put(hotelG, ht.white, bx(-1.15, 0.95, S, S + 0.03, -0.75, 0.55));
    put(hotelG, ht.pool, bx(-1.05, 0.85, S + 0.03, S + 0.032, -0.65, 0.45));
    const loungers: T.BufferGeometry[] = [];
    const paras: T.BufferGeometry[] = [];
    const poles: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const x = -1.0 + i * 0.35;
      loungers.push(bx(x - 0.05, x + 0.05, S + 0.03, S + 0.055, 0.62, 0.82));
      if (i % 2 === 0) {
        paras.push(new THREE.ConeGeometry(0.13, 0.05, 10, 1, true).translate(x + 0.17, S + 0.25, 0.75));
        poles.push(cyl(0.005, 0.22, x + 0.17, S, 0.75, 5));
      }
    }
    put(hotelG, ht.white, ...loungers, ...poles);
    put(hotelG, ht.parasol, ...paras);
    seated(hotelG, ht, [
      [-0.65, S + 0.03, 0.7, Math.PI],
      [0.4, S + 0.03, 0.7, Math.PI],
    ]);
    people(hotelG, ht, [
      [-0.4, S + 0.03, -0.1, 0.5],
      [0.5, S + 0.03, -0.3, 2.0],
    ], [0x4fb6d8, 0xd04f7a]);
    for (const [x, z] of [
      [-1.4, -0.9],
      [-1.4, 0.6],
      [1.2, -0.9],
      [1.2, 0.3],
      [2.3, -0.6],
      [2.6, 0.5],
    ] as [number, number][])
      palm(hotelG, { trunk: ht.trunk, leaf: ht.palm }, x, z);

    // Street lamps and traffic on the road.
    const lamps: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-2.6, -1.3, 0.3, 1.9, 3.3]) {
      lamps.push(cyl(0.008, 0.36, x, S, 2.5, 6));
      heads.push(rb(0.05, 0.015, 0.03, 0.006, x, S + 0.36, 2.5));
    }
    put(hotelG, ht.dark, ...lamps);
    put(hotelG, ht.lamp, ...heads);
    cars.push({ p: [-3.4, S, 2.86], ry: 0, c: 0xe2b33a }, { p: [-0.2, S, 3.18], ry: Math.PI, c: 0xeef0f2 }, { p: [2.2, S, 2.86], ry: 0, c: 0x2f5d9a }, { p: [4.0, S, 3.18], ry: Math.PI, c: 0xb8382e });
    cars.forEach((c) => carCab.push({ p: c.p, ry: c.ry }));
  }

  // ================================================================ LAYER 1: LEISURE SIDE
  const wheel = new THREE.Group();
  {
    // ---- Holiday cottages with a tour coach.
    for (const [x, z] of [
      [3.35, -2.6],
      [3.85, -2.6],
      [4.35, -2.6],
    ] as [number, number][]) {
      put(leisureG, le.cottage, ...facadeShell(x - 0.18, x + 0.18, z - 0.16, z + 0.16, S, S + 0.2, 0.18, 0.2));
      put(leisureG, le.roof, gable(x - 0.18, x + 0.18, z - 0.16, z + 0.16, S + 0.2, 0.12));
    }
    put(leisureG, le.tours, vPlane(0.5, 0.1, 3.3, S + 0.18, -1.55, Math.PI / 2));
    put(leisureG, le.wood, bx(3.24, 3.27, S, S + 0.23, -1.8, -1.3));
    // Coach: long rounded body, window band, wheels.
    const cx = 4.0,
      cz = -1.75;
    put(leisureG, le.coach, rb(0.62, 0.17, 0.16, 0.035, cx, S + 0.03, cz));
    put(leisureG, le.dark, bx(cx - 0.28, cx + 0.31, S + 0.12, S + 0.17, cz - 0.081, cz + 0.081));
    put(leisureG, le.dark, ...[-0.2, 0.2].flatMap((dx) => [-1, 1].map((sz) => new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12).rotateX(Math.PI / 2).translate(cx + dx, S + 0.035, cz + sz * 0.07))));
    people(leisureG, le, [
      [3.55, S, -1.65, 1.6],
      [3.6, S, -1.85, 1.4],
      [3.65, S, -1.5, 2.0],
    ], [0xe0b23a, 0x2fa38c, 0xd04f7a, 0x5c8fb8]);
    // ---- Heritage tourist train on the back track.
    const tz = -3.15;
    put(leisureG, le.rail, bx(-1.8, PX - 0.1, S, S + 0.012, tz - 0.06, tz - 0.045), bx(-1.8, PX - 0.1, S, S + 0.012, tz + 0.045, tz + 0.06));
    const sl: T.BufferGeometry[] = [];
    for (let x = -1.75; x < PX - 0.1; x += 0.09) sl.push(bx(x - 0.015, x + 0.015, S, S + 0.006, tz - 0.1, tz + 0.1));
    put(leisureG, le.wood, ...sl);
    for (const x of [2.6, 3.25, 3.9]) {
      put(leisureG, le.train, rb(0.58, 0.15, 0.15, 0.03, x, S + 0.03, tz));
      put(leisureG, le.cream, bx(x - 0.27, x + 0.27, S + 0.11, S + 0.15, tz - 0.077, tz + 0.077));
    }
    put(leisureG, le.dark, cyl(0.07, 0.42, 4.45, S + 0.04, tz, 14).rotateZ(Math.PI / 2).translate(4.45 + S + 0.11, -4.45 + S + 0.11, 0));
    put(leisureG, le.dark, cyl(0.025, 0.08, 4.55, S + 0.15, tz, 8));

    // ---- Theme park: Ferris wheel (turning), coaster loop, water slide, gate sign.
    const [hx, hy, hz] = WHEEL;
    put(leisureG, le.steel, bar(THREE, [hx - 0.25, S, hz - 0.12], [hx, hy, hz - 0.05], 0.014), bar(THREE, [hx + 0.25, S, hz - 0.12], [hx, hy, hz - 0.05], 0.014));
    put(leisureG, le.steel, bar(THREE, [hx - 0.25, S, hz + 0.12], [hx, hy, hz + 0.05], 0.014), bar(THREE, [hx + 0.25, S, hz + 0.12], [hx, hy, hz + 0.05], 0.014));
    wheel.position.set(hx, hy, hz);
    {
      const rr = 0.5;
      const rimG = mergeInto(THREE, [
        new THREE.TorusGeometry(rr, 0.008, 6, 48).translate(0, 0, -0.04),
        new THREE.TorusGeometry(rr, 0.008, 6, 48).translate(0, 0, 0.04),
        ...Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return bar(THREE, [0, 0, 0], [rr * Math.cos(a), rr * Math.sin(a), 0], 0.004, 4);
        }),
        new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12).rotateX(Math.PI / 2),
      ]);
      wheel.add(new THREE.Mesh(rimG, le.rim));
      const gond = mergeInto(
        THREE,
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return roundedBox(THREE, 0.06, 0.06, 0.08, 0.015).translate(rr * Math.cos(a), rr * Math.sin(a) - 0.04, 0);
        })
      );
      wheel.add(new THREE.Mesh(gond, le.gondola));
    }
    leisureG.add(wheel);
    // Coaster: a track with one loop, on posts.
    const pts: Vec3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = t * Math.PI * 2;
      pts.push([3.35 + 0.05 * Math.sin(a * 2), S + 0.25 + 0.2 * Math.sin(a), 0.55 - 0.2 * Math.cos(a) + (t - 0.5) * 0.6]);
    }
    put(leisureG, le.track, tube(THREE, [[3.35, S + 0.05, -0.6], [3.35, S + 0.2, -0.1], ...pts, [3.35, S + 0.15, 1.0]], 0.012, 6, false, 140));
    put(leisureG, le.steel, ...[-0.4, 0.0, 0.35, 0.75].map((z) => bar(THREE, [3.35, S, z], [3.35, S + 0.22, z], 0.006, 4)));
    // Water slide into a splash pool.
    put(leisureG, le.water, cyl(0.2, 0.02, 4.3, S, 0.6, 24));
    put(leisureG, le.slide, tube(THREE, [[4.45, S + 0.42, -0.2], [4.5, S + 0.3, 0.1], [4.38, S + 0.16, 0.35], [4.3, S + 0.04, 0.55]], 0.025, 8, false, 40));
    put(leisureG, le.steel, cyl(0.03, 0.42, 4.45, S, -0.22, 8));
    put(leisureG, le.park, vPlane(0.6, 0.12, 3.85, S + 0.32, 0.98));
    put(leisureG, le.dark, bar(THREE, [3.58, S, 0.98], [3.58, S + 0.38, 0.98], 0.008), bar(THREE, [4.12, S, 0.98], [4.12, S + 0.38, 0.98], 0.008));
    people(leisureG, le, [
      [3.7, S, 0.7],
      [3.9, S, 0.85],
      [4.05, S, 0.3],
      [3.6, S, 0.1],
      [4.2, S, -0.65],
      [3.25, S, 0.85, Math.PI],
    ]);
    // A palm or two round the park.
    palm(leisureG, { trunk: le.trunk, leaf: le.green }, 4.5, 0.9, 0.3);
    palm(leisureG, { trunk: le.trunk, leaf: le.green }, 3.15, -1.0, 0.3);
  }

  // ================================================================ LAYER 2: AIRPORT
  {
    // ---- Airliner at the gate, nose toward the terminal (+x).
    const px = -3.55,
      pz = -0.62,
      py = S + 0.1;
    const fus = lathe(THREE, [[0, -0.42], [0.03, -0.4], [0.055, -0.3], [0.06, -0.1], [0.06, 0.28], [0.05, 0.36], [0.025, 0.41], [0, 0.42]], 20)
      .rotateZ(-Math.PI / 2)
      .translate(px, py, pz);
    put(airG, ar.fuselage, fus);
    const wing = (sz: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(0.06, 0);
      sh.lineTo(-0.1, 0.42);
      sh.lineTo(-0.18, 0.42);
      sh.lineTo(-0.14, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
      g.rotateX(Math.PI / 2);
      if (sz < 0) g.scale(1, 1, -1);
      return g.translate(px, py - 0.02, pz);
    };
    put(airG, ar.fuselage, wing(1), wing(-1));
    const hs = (sz: number) => {
      const sh = new THREE.Shape();
      sh.moveTo(0.0, 0);
      sh.lineTo(-0.06, 0.14);
      sh.lineTo(-0.1, 0.14);
      sh.lineTo(-0.08, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false });
      g.rotateX(Math.PI / 2);
      if (sz < 0) g.scale(1, 1, -1);
      return g.translate(px - 0.3, py + 0.02, pz);
    };
    put(airG, ar.tail, hs(1), hs(-1));
    {
      const sh = new THREE.Shape();
      sh.moveTo(-0.24, 0);
      sh.lineTo(-0.38, 0.17);
      sh.lineTo(-0.43, 0.17);
      sh.lineTo(-0.41, 0);
      const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }).translate(px, py + 0.04, pz - 0.006);
      put(airG, ar.tail, fin);
    }
    put(airG, ar.engine, ...[-1, 1].map((sz) => new THREE.CylinderGeometry(0.03, 0.026, 0.12, 14).rotateZ(Math.PI / 2).translate(px - 0.02, py - 0.05, pz + sz * 0.16)));
    put(airG, ar.window, bx(px + 0.3, px + 0.34, py + 0.02, py + 0.04, pz - 0.035, pz + 0.035));
    const wins: T.BufferGeometry[] = [];
    for (let x = -0.3; x < 0.26; x += 0.035) for (const sz of [-1, 1]) wins.push(bx(px + x, px + x + 0.015, py + 0.015, py + 0.03, pz + sz * 0.059, pz + sz * 0.061));
    put(airG, ar.window, ...wins);
    put(airG, ar.dark, ...[[0.3, 0], [-0.03, 0.08], [-0.03, -0.08]].map(([dx, dz]) => bar(THREE, [px + dx, S, pz + dz], [px + dx, py - 0.04, pz + dz], 0.006, 5)));
    // Jet bridge from the terminal to the door.
    put(airG, ar.bridge, bx(-3.08, -2.42, S + 0.12, S + 0.2, pz + 0.04, pz + 0.12));
    put(airG, ar.dark, bar(THREE, [-2.9, S, pz + 0.08], [-2.9, S + 0.12, pz + 0.08], 0.01));
    // Ground vehicles.
    put(airG, ar.yellow, rb(0.1, 0.05, 0.06, 0.012, -3.3, S, -0.25), rb(0.1, 0.05, 0.06, 0.012, -3.75, S, -1.1));

    // ---- Terminal: glass walls, food court, lounge and duty-free inside; wavy roof (own bucket).
    const x0 = -2.95,
      x1 = -1.95,
      z0 = -1.25,
      z1 = 1.3,
      h = 0.36;
    put(airG, ar.glass, ...facadeShell(x0, x1, z0, z1, S, S + h, 0.3, h));
    const mul: T.BufferGeometry[] = [];
    for (let z = z0; z <= z1 + 1e-6; z += (z1 - z0) / 8) for (const x of [x0, x1]) mul.push(bx(x - 0.006, x + 0.006, S, S + h, z - 0.006, z + 0.006));
    put(airG, ar.frame, ...mul);
    put(airG, ar.airSign, vPlane(0.7, 0.13, x1 + 0.012, S + 0.42, -0.9, Math.PI / 2));
    put(airG, ar.dark, bx(x1 + 0.002, x1 + 0.01, S + 0.355, S + 0.485, -1.25, -0.55));
    put(airG, ar.lounge, vPlane(0.9, 0.1, -2.45, S + 0.28, 1.302));
    // Lounge sofas, food-court tables, duty-free shelves, travellers with bags.
    seated(airG, ar, [
      [-2.75, S, 0.75, Math.PI / 2],
      [-2.75, S, 0.95, Math.PI / 2],
      [-2.55, S, 0.6, 0],
    ]);
    put(airG, ar.sofa, bx(-2.85, -2.72, S, S + 0.05, 0.6, 1.1), bx(-2.7, -2.4, S, S + 0.05, 0.5, 0.6));
    const tables: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-2.3, 0.75],
      [-2.15, 1.05],
      [-2.35, 0.25],
      [-2.15, 0.45],
    ] as [number, number][])
      tables.push(cyl(0.05, 0.008, x, S + 0.07, z, 16), cyl(0.006, 0.07, x, S, z, 6));
    put(airG, ar.white, ...tables);
    put(airG, ar.wood, bx(-2.9, -2.6, S, S + 0.1, -0.25, -0.17), bx(-2.9, -2.6, S, S + 0.1, -0.05, 0.03));
    put(airG, ar.gold, bx(-2.88, -2.62, S + 0.1, S + 0.13, -0.24, -0.18), bx(-2.88, -2.62, S + 0.1, S + 0.13, -0.04, 0.02));
    people(airG, ar, [
      [-2.2, S, 0.6],
      [-2.4, S, -0.6],
      [-2.2, S, -0.9],
      [-2.6, S, -1.0],
      [-2.3, S, 0.05],
      [-2.05, S, 1.2, Math.PI],
    ]);
    // Wavy roof.
    {
      const seg = 24;
      const pos: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= seg; i++) {
        const z = lerp(z0 - 0.08, z1 + 0.08, i / seg);
        const y = S + h + 0.03 + 0.04 * Math.sin((i / seg) * Math.PI * 3);
        pos.push(x0 - 0.08, y, z, x1 + 0.08, y, z);
        if (i < seg) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
      }
      const g = new THREE.BufferGeometry();
      g.setIndex(idx);
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      put(airG, aRoof.roof, g);
      const ribs: T.BufferGeometry[] = [];
      for (let i = 0; i <= seg; i += 3) {
        const z = lerp(z0 - 0.08, z1 + 0.08, i / seg);
        const y = S + h + 0.035 + 0.04 * Math.sin((i / seg) * Math.PI * 3);
        ribs.push(bx(x0 - 0.08, x1 + 0.08, y, y + 0.01, z - 0.01, z + 0.01));
      }
      put(airG, aRoof.rib, ...ribs);
    }
    for (const [x, z] of [
      [-3.5, 2.1],
      [-3.0, 2.3],
      [-2.4, -2.9],
      [-2.0, -2.0],
      [-3.7, -1.7],
    ] as [number, number][])
      tree(airG, ar, x, z, 0.8);
    // ---- Control tower at the back of the apron.
    put(airG, ar.white, cyl(0.06, 0.8, -3.4, S, -2.4, 16, 0.045));
    put(airG, ar.glass, cyl(0.12, 0.1, -3.4, S + 0.8, -2.4, 16, 0.14));
    put(airG, ar.grey, cyl(0.15, 0.03, -3.4, S + 0.9, -2.4, 16), cyl(0.008, 0.12, -3.4, S + 0.93, -2.4, 6));
    put(airG, ar.beacon, new THREE.SphereGeometry(0.016, 8, 6).translate(-3.4, S + 1.06, -2.4));
    // Runway edge lights.
    const lights: T.BufferGeometry[] = [];
    for (let z = -3.1; z < 2.4; z += 0.3) for (const x of [-4.53, -3.97]) lights.push(new THREE.SphereGeometry(0.01, 6, 4).translate(x, S + 0.01, z));
    put(airG, ar.beacon, ...lights);
    // Taxis at the kerb.
    for (const [x, z] of [
      [-1.9, 1.75],
      [-2.3, 1.75],
    ] as [number, number][]) {
      const c = carParts(x, S, z, 0, 0.28);
      put(airG, ar.yellow, c.body);
      put(airG, ar.dark, c.cab, ...c.wheels);
    }
  }

  // ================================================================ LAYER 3: BACK OFFICE (under the terrace)
  {
    const y = B0;
    // Terrace over the pit (ghosts at layer 3): a deck with lawns, benches and a palm court.
    put(airG, tr.deck, bx(QX0, QX1, S - 0.05, S - 0.002, QZ0, QZ1));
    put(airG, tr.lawn, bx(QX0 + 0.1, QX0 + 1.3, S - 0.002, S + 0.006, QZ0 + 0.15, QZ1 - 0.15), bx(QX1 - 1.3, QX1 - 0.1, S - 0.002, S + 0.006, QZ0 + 0.15, QZ1 - 0.15));
    put(airG, tr.tWood, ...[-0.1, 0.5, 1.1].map((x) => bx(x - 0.15, x + 0.15, S, S + 0.05, -2.08, -2.0)));
    for (const [x, z] of [
      [-1.0, -2.4],
      [-0.6, -1.7],
      [1.6, -2.4],
      [2.1, -1.7],
    ] as [number, number][])
      palm(airG, { trunk: tr.tTrunk, leaf: tr.tGreen }, x, z, 0.32);
    people(airG, tr.tPal, [
      [0.2, S, -1.75],
      [0.8, S, -2.3],
    ]);

    put(coreG, co.lining, bx(QX0, QX1, 0, y, QZ0, QZ1), bx(QX0 - 0.02, QX0, y, S - 0.05, QZ0, QZ1), bx(QX1, QX1 + 0.02, y, S - 0.05, QZ0, QZ1), bx(QX0, QX1, y, S - 0.05, QZ0 - 0.02, QZ0));
    put(coreG, co.floor, floorPlane(QX0, QX1, QZ0, QZ1, y + 0.001));
    put(coreG, co.lining, bx(-0.2, -0.15, y, S - 0.08, QZ0, -1.8), bx(1.2, 1.25, y, S - 0.08, QZ0, -1.8));
    // ---- Booking data hall (west): racks, the live booking wall, agents' desks.
    put(coreG, co.book, vPlane(1.2, 0.24, -0.9, y + 0.2, QZ0 + 0.012));
    const rk: Item[] = [];
    for (let i = 0; i < 9; i++) rk.push({ p: [-1.45 + i * RW, y, -2.2], ry: 0 });
    racks(coreG, 0.28, rk);
    put(coreG, co.tray, bx(-1.5, -1.45 + 8.5 * RW, y + 0.285, y + 0.295, -2.23, -2.17));
    desks(coreG, co, [{ p: [-1.3, y, -1.7] }, { p: [-1.0, y, -1.7] }, { p: [-0.7, y, -1.7] }], 2, 0.24);
    people(coreG, co, [
      [-1.3, y - 0.03, -1.59, Math.PI],
      [-1.0, y - 0.03, -1.59, Math.PI],
      [-0.7, y - 0.03, -1.59, Math.PI],
    ]);
    // ---- Visa & forex centre (middle): counters with screens, a currency board, a queue.
    put(coreG, co.visa, vPlane(0.9, 0.1, 0.52, y + 0.28, QZ0 + 0.012));
    put(coreG, co.fx, vPlane(0.3, 0.2, 0.95, y + 0.16, QZ0 + 0.012));
    put(coreG, co.wood, bx(0.0, 0.85, y, y + 0.1, -2.05, -1.95));
    put(coreG, co.glass, vPlane(0.85, 0.08, 0.425, y + 0.14, -1.95));
    put(coreG, co.mon, ...[0.15, 0.42, 0.7].map((x) => vPlane(0.06, 0.04, x, y + 0.13, -2.0, Math.PI)));
    people(coreG, co, [
      [0.15, y, -2.2, 0],
      [0.42, y, -2.2, 0],
      [0.7, y, -2.2, 0],
      [0.15, y, -1.82, Math.PI],
      [0.42, y, -1.82, Math.PI],
      [0.42, y, -1.66, Math.PI],
      [0.42, y, -1.5, Math.PI],
    ]);
    put(coreG, co.blue, ...[0.15, 0.42].map((x) => bx(x - 0.02, x + 0.02, y + 0.1, y + 0.106, -1.99, -1.96)));
    // ---- Owners' room (east): table of hotel models under a portfolio wall.
    put(coreG, co.folio, vPlane(0.8, 0.26, 1.95, y + 0.2, QZ0 + 0.012));
    put(coreG, co.owners, vPlane(0.5, 0.08, 1.95, y + 0.36, QZ0 + 0.013));
    put(coreG, co.wood, rb(0.8, 0.025, 0.38, 0.03, 1.95, y + 0.08, -2.0), bx(1.6, 1.64, y, y + 0.08, -2.15, -1.85), bx(2.26, 2.3, y, y + 0.08, -2.15, -1.85));
    put(coreG, co.lux, ...facadeShell(1.7, 1.8, -2.08, -1.98, y + 0.105, y + 0.25, 0.1, 0.05));
    put(coreG, co.mid, ...facadeShell(1.9, 2.02, -2.05, -1.93, y + 0.105, y + 0.2, 0.1, 0.05), ...facadeShell(2.12, 2.2, -2.1, -2.0, y + 0.105, y + 0.17, 0.08, 0.05));
    const ch: [number, number, number, number][] = [];
    for (let i = 0; i < 4; i++) ch.push([1.7 + i * 0.17, y - 0.02, -1.73, Math.PI], [1.7 + i * 0.17, y - 0.02, -2.27, 0]);
    seated(coreG, co, ch, [0x1f2a36, 0x4a4a52, 0x2b4c7e, 0xd9d2c5]);
  }

  // ---------------------------------------------------------------- flush batches
  inst(hotelG, carGeo.body, ht.car, cars);
  inst(hotelG, carGeo.cab, ht.carGlass, carCab);
  inst(hotelG, carGeo.wheels, ht.dark, carCab);
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
  // The Ferris wheel turns, the booking wall scrolls, the currency board flips, racks blink.
  let lastBlink = -1,
    lastFx = -1;
  lipMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    wheel.rotation.z = -t * 0.25;
    bookTex.offset.x = (t * 0.03) % 1;
    const f = Math.floor(t / 0.4);
    if (f !== lastBlink) {
      lastBlink = f;
      rackLed.offset.y = (f % 4) * 0.25;
    }
    const k = Math.floor(t / 2.5);
    if (k !== lastFx) {
      lastFx = k;
      fxTex.offset.y = (k % 2) * 0.5;
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
      L.set("hotels", pw(v, [[0, 1], [1, 0.3], [2, 0.22], [3, 0.18]]));
      L.set("leisure", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("air", pw(v, [[0, 1], [2, 1], [2.7, 0.3], [3, 0.25]]));
      L.set("airRoof", pw(v, [[0, 1], [1.4, 0.9], [2, 0.25], [3, 0.15]]));
      L.set("terrace", pw(v, [[0, 1], [2, 1], [2.6, 0.08], [3, 0.05]]));
      L.set("core", 1);
    },
  };
}
