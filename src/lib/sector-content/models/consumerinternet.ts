// Consumer Internet: a miniature "app city" block on a display plinth - what sits
// behind a tap on a food, shopping or travel app in India.
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Front street: four storefronts facing the road - a restaurant, a shop, a
//     travel agency (little plane on the roof) and a classifieds office under a
//     listings billboard - each with its app tile as the roof sign. A gaming
//     arcade with neon trim sits in the back-right corner.
//   · A giant smartphone stands like a tower at the back of the block, its
//     screen showing the same app tiles, an order tracker and an ad banner.
//   · Behind the shops: a dark store (west) - shelving racks of totes, a cold
//     room, packing benches and a line of delivery scooters - and a parcel
//     sorting hub (east) with a conveyor loop, scanner arch, roll cages and vans
//     at the dock. A battery-swap lot for the scooters fills the back-left corner.
//   · The plaza in the middle: a glass payments switch room (racks + a live
//     transactions wall) with a scan-to-pay QR totem and card terminal in front.
//     Glowing payment rails run from every shop to the switch.
//   · The core: the phone stands on a data-centre podium - rows of blinking
//     server racks for the ad, messaging and SaaS stack - flanked by two signal
//     towers, with chat bubbles and ad cards floating above it at the deepest layer.
//
// Layers: 0 Apps & Storefronts (shops, arcade, phone), 1 Dark Stores & Delivery
// (dark store and hub roofs/walls ghost away, scooters and vans), 2 Payments
// (switch room glass ghosts, rails brighten), 3 Ad & Messaging Tech (podium
// walls and roof ghost, racks, towers, floating bubbles). Outer layers ghost
// instead of vanishing so the city stays as context.
import type * as T from "three";
import {
  type Three,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  lathe,
  layerMats,
  lerp,
  mergeInto,
  roundedBox,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on.
export const CONSUMERINTERNET_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: apps & storefronts (each on its shop's roof sign)
  foodtech: { pos: [-3.65, 0.76, 2.23], side: "left" }, // restaurant
  ecommerce: { pos: [-2.0, 0.76, 2.23], side: "left" }, // shop
  travel: { pos: [2.0, 0.76, 2.23], side: "left" }, // travel agency
  classifieds: { pos: [3.65, 0.76, 2.23], side: "bottom" }, // classifieds office
  gaming: { pos: [3.6, 0.78, -1.88], side: "right" }, // arcade
  // layer 1: dark stores & delivery
  quickcommerce: { pos: [-3.0, 0.38, -0.45], side: "top" }, // dark-store racks
  logistics: { pos: [2.7, 0.17, -0.9], side: "right" }, // parcels on the conveyor loop
  // layer 2: payments
  payments: { pos: [0.0, 0.5, 0.88], side: "top" }, // QR totem in front of the switch room
  // layer 3: ad & messaging tech
  adtech: { pos: [0.55, 0.33, -2.2], side: "top" }, // server racks in the podium
};

export const CONSUMERINTERNET_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.4, -0.1],
    narration:
      "Welcome to the app city. Every tap on a food, shopping or travel app sets off a chain of real-world work: a storefront takes the order, a dark store or sorting hub fulfils it, a payment clears, and servers decide which ad or message you see next. Peel the block layer by layer, from the apps on the street to the tech at its core.",
  },
  {
    id: "apps",
    layer: 0,
    label: "Storefronts",
    pos: [2.0, 4.3, 9.8],
    target: [0, 0.5, 1.1],
    narration:
      "The front street is what users see. The restaurant stands for food delivery apps like Zomato and Swiggy, the shop for marketplaces like Nykaa and Meesho, the travel agency for booking apps like ixigo and Yatra, and the office under the billboard for classifieds and jobs like Naukri and Just Dial. The giant phone behind shows the same tiles, with a gaming arcade in the corner.",
  },
  {
    id: "delivery",
    layer: 1,
    label: "Delivery",
    pos: [1.6, 7.8, 7.8],
    target: [0, 0, -0.3],
    narration:
      "Behind the shops, the roofs lift off. On the left a dark store keeps thousands of items in totes on racks so a rider can leave within minutes - the quick-commerce model of Blinkit and Instamart. On the right a sorting hub routes parcels along a conveyor into cages and vans, the job of logistics firms like Delhivery.",
  },
  {
    id: "payments",
    layer: 2,
    label: "Payments",
    pos: [2.5, 2.9, 4.3],
    target: [0, 0.25, -0.05],
    narration:
      "In the plaza sits the payments switch. Glowing rails carry every order's payment from the shops into the glass room, where racks clear transactions in real time. Out front, the scan-to-pay QR totem and card terminal stand for wallets and payment apps like Paytm and MobiKwik.",
  },
  {
    id: "core",
    layer: 3,
    label: "Ad & Messaging Core",
    pos: [2.6, 2.7, 1.1],
    target: [0, 0.35, -2.2],
    narration:
      "At the core, the phone stands on a data centre. Rows of server racks run the ad networks, messaging and travel software behind the apps - the business of Affle, Tanla, Route Mobile and RateGain. Signal towers on either side send the texts, alerts and ads back out to millions of phones.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: storefronts along the road, the dark store and sorting hub behind them, the payments switch in the central plaza, and the phone on its data-centre podium at the back, flanked by signal towers.",
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

// App-tile palette (generic, not any company's brand colours).
const ICON_BG = ["#ef7d2d", "#7657d4", "#2a93d8", "#17a37c", "#d4448a", "#2f5bcc"];
const ICON_LABEL = ["Food", "Shop", "Travel", "Jobs", "Play", "Pay"];

export function buildConsumerinternet(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [appG, delG, payG, coreG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, p?: Vec3) => {
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

  const bx = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const bb = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    bx(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r, 2).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop?: number) =>
    new THREE.CylinderGeometry(rTop ?? r, r, h, seg, 1).translate(x, y + h / 2, z);
  const uvRect = (g: T.BufferGeometry, u0: number, u1: number, v0: number, v1: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i)));
    return g;
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => uvRect(g, 0, su, 0, sv);
  /** Upright plane facing +Z (rotated by ry), centre at (x, y, z). */
  const panel = (w: number, h: number, x: number, y: number, z: number, ry = 0) => {
    const g = new THREE.PlaneGeometry(w, h);
    if (ry) g.rotateY(ry);
    return g.translate(x, y, z);
  };
  /** Flat plane on the ground. */
  const flat = (x0: number, x1: number, z0: number, z1: number, y: number) =>
    new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  /** Quad through four corners (a, b, c, d counter-clockwise from the front), UVs (0,1)(1,1)(1,0)(0,0). */
  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, v0 = 0, v1 = 1) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, v1, 1, v1, 1, v0, 0, v0], 2));
    g.setIndex([0, 3, 2, 0, 2, 1]);
    g.computeVertexNormals();
    return g;
  };
  /** Four outward-facing wall planes; UV u repeats per `tile` units. */
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
  type Item = { p: Vec3; ry?: number; s?: Vec3; c?: number };
  /** Instanced copies of one geometry (one draw call). */
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: Item[]) => {
    if (!items.length) return null;
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
    return im;
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrap = false) => {
    const t = canvasTexture(THREE, w, h, draw);
    t.wrapS = THREE.RepeatWrapping;
    if (wrap) t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  };

  // ------------------------------------------------------------ site plan
  const PX = 4.7,
    PZ = 3.15,
    PR = 0.4;
  const SHOP_Z0 = 1.5,
    SHOP_Z1 = 2.3,
    SHOP_H = 0.55;
  const SHOPS = [
    { cx: -3.65, w: 1.4 }, // restaurant
    { cx: -2.0, w: 1.4 }, // shop
    { cx: 2.0, w: 1.4 }, // travel agency
    { cx: 3.65, w: 1.4 }, // classifieds office
  ];
  const ARC: Box = { x0: 2.85, x1: 4.35, z0: -2.85, z1: -1.85, h: 0.55 };
  const DARK: Box = { x0: -4.35, x1: -1.6, z0: -1.3, z1: 0.85, h: 0.5 };
  const HUB: Box = { x0: 1.6, x1: 3.75, z0: -1.3, z1: 0.85, h: 0.55 };
  const PAV: Box = { x0: -0.95, x1: 0.95, z0: -0.95, z1: 0.45, h: 0.42 };
  const POD: Box = { x0: -1.8, x1: 1.8, z0: -2.85, z1: -1.6, h: 0.5 };
  const PHONE = { x: 0, z: -2.2, ry: 0.42 };
  const TOWERS: [number, number][] = [
    [-2.3, -2.3],
    [2.32, -2.3],
  ];

  // ------------------------------------------------------------ textures
  const groundTex = canvasTexture(THREE, 1024, 686, (g, w, h) => {
    const X = (x: number) => ((x + PX) / (2 * PX)) * w;
    const Z = (z: number) => ((z + PZ) / (2 * PZ)) * h;
    const sx = w / (2 * PX);
    const rect = (x0: number, x1: number, z0: number, z1: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    };
    const rnd = mulberry(7);
    // Paving.
    g.fillStyle = "#c9ccc5";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + rnd() * 0.04})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    // Lawns: back edge, around the towers, front verge.
    const lawn = (x0: number, x1: number, z0: number, z1: number) => {
      rect(x0, x1, z0, z1, "#6f9a56");
      g.fillStyle = "rgba(40,70,30,0.25)";
      for (let i = 0; i < 160; i++) g.fillRect(X(x0) + rnd() * (x1 - x0) * sx, Z(z0) + rnd() * (z1 - z0) * sx, 2, 2);
    };
    lawn(-PX, PX, -PZ, -2.95);
    lawn(-PX, PX, 3.0, PZ);
    lawn(-2.75, -1.88, -2.95, -1.7);
    lawn(1.88, 2.8, -2.95, -1.7);
    // Front road with a dashed centre line and a zebra crossing.
    rect(-PX, PX, 2.5, 3.0, "#3e4348");
    g.strokeStyle = "rgba(235,235,225,0.8)";
    g.lineWidth = 2;
    g.setLineDash([12, 10]);
    g.beginPath();
    g.moveTo(0, Z(2.75));
    g.lineTo(w, Z(2.75));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "rgba(240,240,232,0.9)";
    for (let i = 0; i < 7; i++) g.fillRect(X(-0.42 + i * 0.13), Z(2.53), 0.07 * sx, 0.44 * sx);
    // Sidewalk kerb.
    rect(-PX, PX, 2.32, 2.5, "#dcdcd5");
    rect(-PX, PX, 2.48, 2.5, "#9a9d98");
    // Service lane behind the shops, and the hub's yard.
    rect(-PX, -1.35, 0.9, 1.45, "#4d535a");
    rect(1.35, PX, 0.9, 1.45, "#4d535a");
    rect(3.8, PX, -1.45, 0.9, "#4d535a");
    // Scooter bays in front of the dark store.
    g.strokeStyle = "rgba(240,240,230,0.75)";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath();
      g.moveTo(X(-4.1 + i * 0.25), Z(0.95));
      g.lineTo(X(-4.1 + i * 0.25), Z(1.22));
      g.stroke();
    }
    // Van bays at the hub dock.
    for (let i = 0; i <= 3; i++) {
      g.beginPath();
      g.moveTo(X(3.85), Z(-1.3 + i * 0.4));
      g.lineTo(X(4.55), Z(-1.3 + i * 0.4));
      g.stroke();
    }
    // Battery-swap lot (back left).
    rect(-4.5, -2.8, -2.95, -1.7, "#4d535a");
    for (let i = 0; i <= 6; i++) {
      g.beginPath();
      g.moveTo(X(-3.65 + i * 0.22), Z(-2.25));
      g.lineTo(X(-3.65 + i * 0.22), Z(-1.85));
      g.stroke();
    }
    // Central plaza: warm tiles with a ring.
    rect(-1.35, 1.35, -1.55, 1.5, "#d9ccb4");
    g.strokeStyle = "rgba(120,95,60,0.18)";
    g.lineWidth = 1;
    for (let x = -1.35; x <= 1.35; x += 0.15) {
      g.beginPath();
      g.moveTo(X(x), Z(-1.55));
      g.lineTo(X(x), Z(1.5));
      g.stroke();
    }
    for (let z = -1.55; z <= 1.5; z += 0.15) {
      g.beginPath();
      g.moveTo(X(-1.35), Z(z));
      g.lineTo(X(1.35), Z(z));
      g.stroke();
    }
    g.strokeStyle = "rgba(150,110,60,0.45)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(X(0), Z(0.95), 0.42 * sx, 0, Math.PI * 2);
    g.stroke();
    // Hazard hatching at the hub dock.
    g.fillStyle = "rgba(226,179,58,0.85)";
    for (let i = 0; i < 9; i++) g.fillRect(X(3.76), Z(-1.25 + i * 0.22), 0.06 * sx, 0.1 * sx);
  });
  groundTex.anisotropy = 8;

  // App-tile icon atlas: 6 cells (food, shop, travel, jobs, play, pay).
  const drawIcon = (g: CanvasRenderingContext2D, idx: number, x: number, y: number, s: number) => {
    g.fillStyle = ICON_BG[idx];
    rr(g, x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * 0.22);
    g.fill();
    const grd = g.createLinearGradient(0, y, 0, y + s);
    grd.addColorStop(0, "rgba(255,255,255,0.22)");
    grd.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = grd;
    rr(g, x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * 0.22);
    g.fill();
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#ffffff";
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = s * 0.06;
    const cx = x + s / 2,
      cy = y + s / 2;
    if (idx === 0) {
      // Bowl, steam and chopsticks.
      g.beginPath();
      g.arc(cx, cy + s * 0.02, s * 0.26, 0, Math.PI);
      g.closePath();
      g.fill();
      g.fillRect(cx - s * 0.3, cy - s * 0.01, s * 0.6, s * 0.05);
      for (const dx of [-0.1, 0, 0.1]) {
        g.beginPath();
        g.moveTo(cx + dx * s, cy - s * 0.08);
        g.quadraticCurveTo(cx + (dx + 0.05) * s, cy - s * 0.15, cx + dx * s, cy - s * 0.22);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(cx + s * 0.12, cy - s * 0.04);
      g.lineTo(cx + s * 0.32, cy - s * 0.3);
      g.stroke();
    } else if (idx === 1) {
      // Shopping bag.
      rr(g, cx - s * 0.22, cy - s * 0.1, s * 0.44, s * 0.38, s * 0.04);
      g.fill();
      g.beginPath();
      g.arc(cx, cy - s * 0.1, s * 0.12, Math.PI, 0);
      g.stroke();
    } else if (idx === 2) {
      // Plane, nose up-right.
      g.save();
      g.translate(cx, cy);
      g.rotate(Math.PI / 4);
      g.scale(s, s);
      g.beginPath();
      const p: [number, number][] = [
        [0, -0.34], [0.045, -0.28], [0.045, -0.12], [0.34, 0.04], [0.34, 0.1], [0.045, 0.02], [0.045, 0.2], [0.13, 0.27],
        [0.13, 0.32], [0, 0.28], [-0.13, 0.32], [-0.13, 0.27], [-0.045, 0.2], [-0.045, 0.02], [-0.34, 0.1], [-0.34, 0.04],
        [-0.045, -0.12], [-0.045, -0.28],
      ];
      p.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
      g.closePath();
      g.fill();
      g.restore();
    } else if (idx === 3) {
      // Briefcase (jobs / listings).
      rr(g, cx - s * 0.27, cy - s * 0.12, s * 0.54, s * 0.36, s * 0.05);
      g.fill();
      g.lineWidth = s * 0.05;
      rr(g, cx - s * 0.1, cy - s * 0.22, s * 0.2, s * 0.12, s * 0.03);
      g.stroke();
      g.fillStyle = ICON_BG[idx];
      g.fillRect(cx - s * 0.27, cy + s * 0.02, s * 0.54, s * 0.03);
    } else if (idx === 4) {
      // Gamepad.
      rr(g, cx - s * 0.32, cy - s * 0.14, s * 0.64, s * 0.3, s * 0.14);
      g.fill();
      g.fillStyle = ICON_BG[idx];
      g.fillRect(cx - s * 0.22, cy - s * 0.02, s * 0.14, s * 0.04);
      g.fillRect(cx - s * 0.17, cy - s * 0.07, s * 0.04, s * 0.14);
      for (const [dx, dy] of [
        [0.13, -0.03],
        [0.2, 0.04],
      ]) {
        g.beginPath();
        g.arc(cx + dx * s, cy + dy * s, s * 0.035, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // QR-style pay mark.
      const q = s * 0.13;
      for (const [dx, dy] of [
        [-0.24, -0.24],
        [0.11, -0.24],
        [-0.24, 0.11],
      ]) {
        g.fillRect(cx + dx * s, cy + dy * s, q, q);
        g.fillStyle = ICON_BG[idx];
        g.fillRect(cx + dx * s + q * 0.25, cy + dy * s + q * 0.25, q * 0.5, q * 0.5);
        g.fillStyle = "#ffffff";
      }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) g.fillRect(cx + (0.08 + i * 0.06) * s, cy + (0.08 + j * 0.06) * s, s * 0.05, s * 0.05);
    }
  };
  const atlas = canvasTexture(THREE, 768, 128, (g) => {
    g.clearRect(0, 0, 768, 128);
    for (let i = 0; i < 6; i++) drawIcon(g, i, i * 128, 0, 128);
  });
  /** Map a plane's UVs onto atlas cell i. */
  const cell = (g: T.BufferGeometry, i: number) => uvRect(g, i / 6 + 0.002, (i + 1) / 6 - 0.002, 0, 1);

  // Phone wallpaper: status bar, search, tile labels, an order tracker, an ad banner and the dock.
  const SCR_W = 1.33,
    SCR_H = 2.63,
    SCR_Y0 = 0.11; // local y of the screen's bottom edge (phone base at 0)
  const TILE_X = [-0.4, 0, 0.4];
  const TILE_Y = [2.15, 1.72];
  const screenTex = canvasTexture(THREE, 512, 1024, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#1b2a60");
    bg.addColorStop(0.55, "#3b3485");
    bg.addColorStop(1, "#5a3a7e");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Soft blobs.
    for (const [x, y, r, c] of [
      [90, 330, 220, "rgba(80,200,255,0.18)"],
      [430, 640, 260, "rgba(255,120,200,0.14)"],
    ] as [number, number, number, string][]) {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, c);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
    }
    // Status bar.
    g.fillStyle = "#ffffff";
    g.font = "600 26px system-ui, sans-serif";
    g.fillText("12:30", 34, 46);
    for (let i = 0; i < 4; i++) g.fillRect(392 + i * 10, 44 - i * 6 - 8, 6, i * 6 + 8);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    rr(g, 438, 26, 42, 20, 5);
    g.stroke();
    g.fillRect(442, 30, 28, 12);
    // Search pill.
    g.fillStyle = "rgba(255,255,255,0.18)";
    rr(g, 34, 78, w - 68, 50, 25);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(68, 102, 10, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(75, 110);
    g.lineTo(84, 118);
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.65)";
    g.font = "22px system-ui, sans-serif";
    g.fillText("Search food, stays, deals...", 98, 110);
    // Tile labels under the 3D tiles.
    g.fillStyle = "#ffffff";
    g.font = "600 22px system-ui, sans-serif";
    g.textAlign = "center";
    TILE_Y.forEach((yl, r) =>
      TILE_X.forEach((xl, c) => {
        const px = ((xl + SCR_W / 2) / SCR_W) * w;
        const py = ((SCR_Y0 + SCR_H - yl) / SCR_H) * h;
        g.fillText(ICON_LABEL[r * 3 + c], px, py + 84);
      })
    );
    g.textAlign = "left";
    // Order tracker card with a mini map.
    g.fillStyle = "rgba(255,255,255,0.95)";
    rr(g, 34, 520, w - 68, 220, 22);
    g.fill();
    g.fillStyle = "#e4e8ec";
    rr(g, 50, 536, w - 100, 130, 14);
    g.fill();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 9;
    for (const [a, b, c, d] of [
      [50, 600, 462, 590],
      [180, 536, 200, 666],
      [340, 536, 320, 666],
    ]) {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c, d);
      g.stroke();
    }
    g.strokeStyle = "#ef7d2d";
    g.lineWidth = 5;
    g.setLineDash([10, 7]);
    g.beginPath();
    g.moveTo(110, 640);
    g.lineTo(190, 600);
    g.lineTo(330, 596);
    g.lineTo(400, 560);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#ef7d2d";
    g.beginPath();
    g.arc(260, 598, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#17a37c";
    g.beginPath();
    g.arc(400, 560, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1d2433";
    g.font = "700 26px system-ui, sans-serif";
    g.fillText("Arriving in 9 min", 56, 704);
    g.fillStyle = "#6b7482";
    g.font = "20px system-ui, sans-serif";
    g.fillText("Rider picked up your order", 56, 728);
    // Ad banner.
    const ad = g.createLinearGradient(34, 0, w - 34, 0);
    ad.addColorStop(0, "#ffb347");
    ad.addColorStop(1, "#ff5e7e");
    g.fillStyle = ad;
    rr(g, 34, 768, w - 68, 112, 20);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "800 40px system-ui, sans-serif";
    g.fillText("SALE 50%", 60, 830);
    g.font = "600 20px system-ui, sans-serif";
    g.fillText("Sponsored", 62, 858);
    g.fillStyle = "rgba(255,255,255,0.85)";
    rr(g, 340, 796, 120, 56, 28);
    g.fill();
    g.fillStyle = "#ff5e7e";
    g.font = "700 22px system-ui, sans-serif";
    g.fillText("Shop", 374, 832);
    // Dock.
    g.fillStyle = "rgba(255,255,255,0.18)";
    rr(g, 34, 904, w - 68, 84, 30);
    g.fill();
    const dockC = ["#4fc3f7", "#81c784", "#ffd54f", "#f48fb1"];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = dockC[i];
      rr(g, 70 + i * 104, 918, 60, 56, 16);
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.75)";
    rr(g, w / 2 - 70, 1002, 140, 8, 4);
    g.fill();
  });

  /** Storefront facade: upper floor windows, an awning band, a glass shopfront. */
  const AWN_V0 = 0.44,
    AWN_V1 = 0.56; // the awning band in texture v (1 = top)
  const facadeTex = (accent: string, wall: string, interior: string) =>
    canvasTexture(THREE, 320, 128, (g, w, h) => {
      g.fillStyle = wall;
      g.fillRect(0, 0, w, h);
      // Upper-floor windows.
      for (let i = 0; i < 5; i++) {
        const x = 14 + i * 61;
        g.fillStyle = "#2b3b48";
        g.fillRect(x, 12, 44, 30);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x + 3, 14, 12, 26);
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(x - 2, 42, 48, 3);
      }
      // Awning stripes (also sampled by the 3D awning).
      const a0 = h * (1 - AWN_V1),
        a1 = h * (1 - AWN_V0);
      for (let x = 0; x < w; x += 20) {
        g.fillStyle = (x / 20) % 2 ? "#f5f2ea" : accent;
        g.fillRect(x, a0, 20, a1 - a0);
      }
      // Shopfront glass with a warm interior and a door.
      const s0 = a1 + 2;
      const gl = g.createLinearGradient(0, s0, 0, h);
      gl.addColorStop(0, "#22333f");
      gl.addColorStop(1, interior);
      g.fillStyle = gl;
      g.fillRect(6, s0, w - 12, h - s0 - 8);
      g.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < 6; i++) g.fillRect(20 + i * 52, s0 + 2, 10, h - s0 - 12);
      g.fillStyle = "#3a434c";
      for (let i = 1; i < 5; i++) g.fillRect(i * (w / 5), s0, 3, h - s0 - 8);
      g.fillStyle = "#1a2229";
      g.fillRect(w / 2 - 20, s0 + 4, 40, h - s0 - 12);
      g.fillStyle = accent;
      g.fillRect(0, h - 8, w, 8);
    });
  const shopTex = [
    facadeTex("#ef7d2d", "#efe6d6", "#a8642c"),
    facadeTex("#7657d4", "#e8e6ef", "#8a74b8"),
    facadeTex("#2a93d8", "#e3ebf0", "#5f8fb0"),
    facadeTex("#17a37c", "#e6ece6", "#5d9a80"),
  ];
  const arcadeTex = canvasTexture(THREE, 320, 128, (g, w, h) => {
    g.fillStyle = "#2a2140";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < w; x += 12) g.fillRect(x, 0, 2, h);
    g.fillStyle = "#130f22";
    g.fillRect(14, 60, w - 28, 60);
    const nc = ["#ff4fb0", "#41e0ff", "#ffd84a", "#7cff6b"];
    for (let i = 0; i < 7; i++) {
      g.fillStyle = nc[i % 4];
      g.fillRect(26 + i * 40, 74, 26, 34);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(30 + i * 40, 78, 18, 14);
    }
    g.fillStyle = "#ff4fb0";
    g.font = "800 30px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("ARCADE", w / 2, 44);
  });
  const arcadeEm = canvasTexture(THREE, 320, 128, (g, w) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 320, 128);
    const nc = ["#ff4fb0", "#41e0ff", "#ffd84a", "#7cff6b"];
    for (let i = 0; i < 7; i++) {
      g.fillStyle = nc[i % 4];
      g.fillRect(26 + i * 40, 74, 26, 34);
    }
    g.fillStyle = "#ff4fb0";
    g.font = "800 30px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("ARCADE", w / 2, 44);
  });
  const listingTex = canvasTexture(THREE, 384, 128, (g, w, h) => {
    g.fillStyle = "#f7f5ef";
    g.fillRect(0, 0, w, h);
    const cards: [string, string][] = [
      ["#4f8fc9", "HOMES"],
      ["#e08a3c", "CARS"],
      ["#17a37c", "JOBS"],
    ];
    cards.forEach(([c, t], i) => {
      const x = 12 + i * 124;
      g.fillStyle = "#ffffff";
      g.fillRect(x, 12, 112, 104);
      g.fillStyle = c;
      g.fillRect(x + 6, 18, 100, 54);
      g.fillStyle = "rgba(255,255,255,0.85)";
      if (i === 0) {
        g.beginPath();
        g.moveTo(x + 56, 26);
        g.lineTo(x + 84, 48);
        g.lineTo(x + 28, 48);
        g.fill();
        g.fillRect(x + 34, 48, 44, 18);
      } else if (i === 1) {
        rr(g, x + 22, 40, 68, 18, 6);
        g.fill();
        g.fillRect(x + 36, 30, 38, 14);
      } else {
        g.fillRect(x + 32, 34, 48, 28);
        g.fillRect(x + 46, 28, 20, 8);
      }
      g.fillStyle = "#1d2433";
      g.font = "800 22px system-ui, sans-serif";
      g.fillText(t, x + 8, 98);
      g.fillStyle = "#9aa1ab";
      g.fillRect(x + 8, 104, 70, 5);
    });
    void h;
  });
  const sheetTex = (base: string, band: string, shutter: string) =>
    tex(256, 96, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = "rgba(0,0,0,0.1)";
        g.fillRect(x, 0, 2, h);
        g.fillStyle = "rgba(255,255,255,0.12)";
        g.fillRect(x + 2, 0, 1, h);
      }
      g.fillStyle = band;
      g.fillRect(0, 8, w, 9);
      // Two roller shutters per tile.
      for (const x of [34, 154]) {
        g.fillStyle = shutter;
        g.fillRect(x, 40, 68, h - 40);
        g.fillStyle = "rgba(0,0,0,0.18)";
        for (let y = 42; y < h; y += 5) g.fillRect(x, y, 68, 1);
      }
    });
  const darkTex = sheetTex("#3d4a57", "#e2b33a", "#5d6976");
  const hubTex = sheetTex("#d5d9dc", "#e0702c", "#9aa3ab");
  const signTex = (text: string, bg: string, fg: string) =>
    canvasTexture(THREE, 256, 48, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fg;
      g.font = "800 28px system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(text, w / 2, 34);
      void h;
    });
  const podTex = tex(256, 128, (g, w, h) => {
    g.fillStyle = "#1e2a36";
    g.fillRect(0, 0, w, h);
    const gl = g.createLinearGradient(0, 0, 0, h);
    gl.addColorStop(0, "rgba(120,170,210,0.35)");
    gl.addColorStop(1, "rgba(20,30,40,0.2)");
    g.fillStyle = gl;
    g.fillRect(0, 14, w, h - 28);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = "#4a5866";
      g.fillRect(x, 0, 5, h);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x + 5, 0, 1, h);
    }
    g.fillStyle = "#3a4652";
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 14, w, 14);
    g.fillStyle = "#2fbfb0";
    g.fillRect(0, h - 16, w, 2);
  });
  // Server-rack fronts: albedo + two LED patterns that blink out of phase.
  const rackAlbedo = canvasTexture(THREE, 64, 128, (g, w, h) => {
    g.fillStyle = "#181d22";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 3 === 0 ? "#2b333b" : "#232a31";
      g.fillRect(4, 6 + i * 10, w - 8, 8);
      g.fillStyle = "rgba(0,0,0,0.5)";
      for (let k = 0; k < 6; k++) g.fillRect(8 + k * 6, 8 + i * 10, 3, 4);
    }
    g.strokeStyle = "#3b444d";
    g.lineWidth = 3;
    g.strokeRect(1, 1, w - 2, h - 2);
  });
  const rackLeds = (seed: number) =>
    canvasTexture(THREE, 64, 128, (g, w, h) => {
      const rnd = mulberry(seed);
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++)
        for (let k = 0; k < 3; k++) {
          if (rnd() < 0.45) continue;
          g.fillStyle = rnd() < 0.7 ? "#3dff9a" : rnd() < 0.5 ? "#4fb6ff" : "#ffb340";
          g.fillRect(44 + k * 5, 8 + i * 10, 3, 3);
        }
      void h;
    });
  const ledA = rackLeds(11),
    ledB = rackLeds(23);
  const wallTex = canvasTexture(THREE, 512, 192, (g, w, h) => {
    g.fillStyle = "#0b1622";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3dd6c0";
    g.font = "700 24px system-ui, sans-serif";
    g.fillText("TRANSACTIONS / SEC", 18, 34);
    g.fillStyle = "#ffffff";
    g.font = "800 44px system-ui, sans-serif";
    g.fillText("18,420", 18, 84);
    g.fillStyle = "#7fe8a0";
    g.font = "600 22px system-ui, sans-serif";
    g.fillText("success 99.6%", 200, 80);
    const rnd = mulberry(5);
    for (let i = 0; i < 40; i++) {
      const v = 30 + rnd() * 60 + Math.sin(i / 4) * 15;
      g.fillStyle = i > 34 ? "#ffcf4a" : "#2fa6ff";
      g.fillRect(18 + i * 12, h - 14 - v, 8, v);
    }
    g.strokeStyle = "#3dd6c0";
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const x = 370 + i * 11,
        y = 60 - Math.sin(i * 0.9) * 14 - i * 1.5;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  });
  const qrTex = canvasTexture(THREE, 128, 256, (g, w, h) => {
    g.fillStyle = "#2f5bcc";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.font = "800 20px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("SCAN & PAY", w / 2, 34);
    g.fillRect(14, 50, 100, 100);
    const rnd = mulberry(9);
    g.fillStyle = "#111";
    const c = 100 / 21;
    for (let i = 0; i < 21; i++)
      for (let j = 0; j < 21; j++) {
        const inFinder = (a: number, b: number) => a < 7 && b < 7;
        if (inFinder(i, j) || inFinder(20 - i, j) || inFinder(i, 20 - j)) continue;
        if (rnd() < 0.5) g.fillRect(14 + i * c, 50 + j * c, c + 0.5, c + 0.5);
      }
    for (const [i, j] of [
      [0, 0],
      [14, 0],
      [0, 14],
    ]) {
      g.fillStyle = "#111";
      g.fillRect(14 + i * c, 50 + j * c, 7 * c, 7 * c);
      g.fillStyle = "#fff";
      g.fillRect(14 + (i + 1) * c, 50 + (j + 1) * c, 5 * c, 5 * c);
      g.fillStyle = "#111";
      g.fillRect(14 + (i + 2) * c, 50 + (j + 2) * c, 3 * c, 3 * c);
    }
    g.fillStyle = "#ffffff";
    g.font = "600 15px system-ui, sans-serif";
    g.fillText("Any app · Any bank", w / 2, 178);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.fillRect(14, 196, 100, 3);
    void h;
  });
  const railTex = tex(128, 16, (g, w, h) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "rgba(61,214,192,0)");
    gr.addColorStop(0.7, "rgba(61,214,192,1)");
    gr.addColorStop(1, "rgba(220,255,250,1)");
    g.fillStyle = gr;
    g.fillRect(0, 3, w, h - 6);
  });
  const bubbleTex = canvasTexture(THREE, 256, 128, (g, w, h) => {
    // Left half: chat bubble face (three dots); right half: ad card.
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 128, h);
    g.fillStyle = "#2a93d8";
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(34 + i * 30, 64, 11, 0, Math.PI * 2);
      g.fill();
    }
    const ad = g.createLinearGradient(128, 0, w, 0);
    ad.addColorStop(0, "#ffb347");
    ad.addColorStop(1, "#ff5e7e");
    g.fillStyle = ad;
    g.fillRect(128, 0, 128, h);
    g.fillStyle = "#ffffff";
    g.font = "900 46px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("AD", 192, 74);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.fillRect(156, 92, 72, 12);
  });

  // ------------------------------------------------------------ materials
  const baseM = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.35 })),
    floor: L.add("base", std(0xd9dee2, 0.05, 0.6)),
    floorDark: L.add("base", std(0x59636d, 0.2, 0.6)),
  };
  const streetM = {
    canopy: L.add("street", std(0x4f8a3e, 0, 0.9)),
    trunk: L.add("street", std(0x5a4632, 0, 0.9)),
    pole: L.add("street", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("street", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.1 })),
    car: L.add("street", std(0xb8c4cf, 0.55, 0.32)),
    glass: L.add("street", std(0x1b2631, 0.6, 0.15)),
    tyre: L.add("street", std(0x17181a, 0.1, 0.85)),
    bench: L.add("street", std(0x8a6a48, 0, 0.8)),
  };
  const shopM = {
    facade: shopTex.map((t) => L.add("shops", std(0xffffff, 0.05, 0.55, { map: t, side: DS }))),
    wall: L.add("shops", std(0xe9e4da, 0.05, 0.75)),
    roof: L.add("shops", std(0x8e959c, 0.2, 0.8)),
    coping: L.add("shops", std(0xf2f0ea, 0.1, 0.5)),
    unit: L.add("shops", std(0xc9cfd4, 0.4, 0.45)),
    dark: L.add("shops", std(0x3e464e, 0.4, 0.5)),
    white: L.add("shops", std(0xf4f6f8, 0.3, 0.35)),
    blue: L.add("shops", std(0x2a6fb8, 0.3, 0.4)),
    listing: L.add("shops", std(0xffffff, 0, 0.5, { map: listingTex, emissive: 0xffffff, emissiveMap: listingTex, emissiveIntensity: 0.2 })),
    arcade: L.add("shops", std(0xffffff, 0.1, 0.5, { map: arcadeTex, emissive: 0xffffff, emissiveMap: arcadeEm, emissiveIntensity: 0.9 })),
    arcWall: L.add("shops", std(0x2a2140, 0.2, 0.6)),
    neonPink: L.add("shops", std(0x330018, 0, 0.4, { emissive: 0xff4fb0, emissiveIntensity: 1.6 })),
    neonCyan: L.add("shops", std(0x002630, 0, 0.4, { emissive: 0x41e0ff, emissiveIntensity: 1.5 })),
  };
  const signM = {
    face: L.add("signs", std(0xffffff, 0, 0.45, { map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.3, alphaTest: 0.2 })),
    back: L.add("signs", std(0x2e343b, 0.5, 0.45)),
  };
  const phoneM = {
    body: L.add("phone", std(0x2a2f36, 0.85, 0.28)),
    frame: L.add("phone", std(0xb9c0c7, 0.95, 0.2)),
    lens: L.add("phone", std(0x0b0d10, 0.4, 0.1)),
    stand: L.add("phone", std(0x3a434c, 0.6, 0.4)),
    screen: L.add("phoneScreen", std(0x000000, 0, 0.18, { map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.85 })),
    tile: L.add("phoneScreen", std(0xffffff, 0, 0.3, { map: atlas, emissive: 0xffffff, emissiveMap: atlas, emissiveIntensity: 0.45, alphaTest: 0.2 })),
  };
  const l1Shell = {
    dark: L.add("l1shell", std(0xffffff, 0.3, 0.6, { map: darkTex, side: DS })),
    hub: L.add("l1shell", std(0xffffff, 0.3, 0.55, { map: hubTex, side: DS })),
    roof: L.add("l1shell", std(0xa9b0b6, 0.4, 0.6, { side: DS })),
    coping: L.add("l1shell", std(0xe2e6e9, 0.15, 0.5)),
    unit: L.add("l1shell", std(0xc9cfd4, 0.35, 0.45)),
    solar: L.add("l1shell", std(0x1d2c4a, 0.6, 0.2)),
    darkSign: L.add("l1shell", std(0xffffff, 0, 0.5, { map: signTex("DARK STORE", "#e2b33a", "#1d2433") })),
    hubSign: L.add("l1shell", std(0xffffff, 0, 0.5, { map: signTex("SORTING HUB", "#e0702c", "#ffffff") })),
  };
  const l1 = {
    rack: L.add("l1eq", std(0x2f6fd0, 0.5, 0.4)),
    shelf: L.add("l1eq", std(0xb9c0c7, 0.7, 0.35)),
    tote: L.add("l1eq", std(0xffffff, 0.05, 0.55)),
    cold: L.add("l1eq", std(0xe6f1f6, 0.2, 0.3)),
    coldGlass: L.add("l1eq", std(0x9fd3ea, 0.2, 0.1, { opacity: 0.55, side: DS })),
    bench: L.add("l1eq", std(0xeef1f3, 0.15, 0.4)),
    dark: L.add("l1eq", std(0x2e343b, 0.45, 0.45)),
    belt: L.add("l1eq", std(0x23272b, 0.2, 0.8)),
    steel: L.add("l1eq", std(0x9aa3ac, 0.85, 0.3)),
    yellow: L.add("l1eq", std(0xe2b33a, 0.35, 0.45)),
    laser: L.add("l1eq", std(0x330000, 0, 0.4, { emissive: 0xff3b3b, emissiveIntensity: 1.6 })),
    parcel: L.add("l1eq", std(0xffffff, 0, 0.85)),
    cage: L.add("l1eq", std(0xc9d0d6, 0.8, 0.3, { opacity: 0.8 })),
    screen: L.add("l1eq", std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.0 })),
    green: L.add("l1eq", std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    // Scooters and vans (instanced, per-instance colour where it varies).
    scBody: L.add("l1eq", std(0xffffff, 0.35, 0.35)),
    scBox: L.add("l1eq", std(0xffffff, 0.1, 0.55)),
    scDark: L.add("l1eq", std(0x1d2024, 0.3, 0.6)),
    van: L.add("l1eq", std(0xf2f4f6, 0.3, 0.35)),
    vanStripe: L.add("l1eq", std(0xffffff, 0.3, 0.4)),
    vanGlass: L.add("l1eq", std(0x1b2631, 0.6, 0.15)),
  };
  const l2Shell = {
    glass: L.add("l2shell", std(0xbfe3f0, 0.3, 0.06, { opacity: 0.32, side: DS })),
    frame: L.add("l2shell", std(0xe8ecef, 0.6, 0.35)),
    roof: L.add("l2shell", std(0xf0f3f5, 0.2, 0.5, { side: DS })),
    trim: L.add("l2shell", std(0x2f5bcc, 0.3, 0.4)),
  };
  const l2 = {
    rackBody: L.add("l2eq", std(0x1b2026, 0.6, 0.4)),
    rackA: L.add("l2eq", std(0xffffff, 0.3, 0.5, { map: rackAlbedo, emissive: 0xffffff, emissiveMap: ledA, emissiveIntensity: 1.4 })),
    rackB: L.add("l2eq", std(0xffffff, 0.3, 0.5, { map: rackAlbedo, emissive: 0xffffff, emissiveMap: ledB, emissiveIntensity: 1.4 })),
    wall: L.add("l2eq", std(0x000000, 0, 0.35, { map: wallTex, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.95 })),
    desk: L.add("l2eq", std(0xeef1f3, 0.15, 0.4)),
    dark: L.add("l2eq", std(0x2e343b, 0.45, 0.45)),
    screen: L.add("l2eq", std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.0 })),
    qr: L.add("l2eq", std(0xffffff, 0, 0.45, { map: qrTex, emissive: 0xffffff, emissiveMap: qrTex, emissiveIntensity: 0.35 })),
    totem: L.add("l2eq", std(0x2f5bcc, 0.35, 0.4)),
    pos: L.add("l2eq", std(0x2a2f36, 0.5, 0.4)),
    posScreen: L.add("l2eq", std(0x000000, 0, 0.4, { emissive: 0x7fe8a0, emissiveIntensity: 1.1 })),
    sticker: L.add("l2eq", std(0xffffff, 0, 0.5, { map: qrTex })),
  };
  const railM = L.add(
    "rails",
    new THREE.MeshBasicMaterial({ color: 0xffffff, map: railTex, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  railTex.repeat.set(1, 1);
  const l3Shell = {
    facade: L.add("l3shell", std(0xffffff, 0.5, 0.3, { map: podTex, side: DS })),
    roof: L.add("l3shell", std(0xcfd4d8, 0.15, 0.65, { side: DS })),
    edge: L.add("l3shell", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.4 })),
    glass: L.add("l3shell", std(0x1c2a36, 0.6, 0.12)),
  };
  const l3 = {
    rackBody: L.add("l3eq", std(0x1b2026, 0.6, 0.4)),
    rackA: L.add("l3eq", std(0xffffff, 0.3, 0.5, { map: rackAlbedo, emissive: 0xffffff, emissiveMap: ledA, emissiveIntensity: 1.5 })),
    rackB: L.add("l3eq", std(0xffffff, 0.3, 0.5, { map: rackAlbedo, emissive: 0xffffff, emissiveMap: ledB, emissiveIntensity: 1.5 })),
    crah: L.add("l3eq", std(0xe8ebee, 0.2, 0.4)),
    tray: L.add("l3eq", std(0xe2b33a, 0.5, 0.4)),
    lattice: L.add("l3eq", std(0xc4cad0, 0.8, 0.35)),
    antenna: L.add("l3eq", std(0xf2f4f6, 0.2, 0.4)),
    dish: L.add("l3eq", std(0xe6e9ec, 0.3, 0.4, { side: DS })),
    beacon: L.add("l3eq", std(0x330000, 0, 0.4, { emissive: 0xff3030, emissiveIntensity: 2.0 })),
    cabinet: L.add("l3eq", std(0x9aa3ac, 0.6, 0.4)),
  };
  const fxM = {
    bubble: L.add("l3fx", std(0xffffff, 0.05, 0.35, { emissive: 0xffffff, emissiveIntensity: 0.25 })),
    face: L.add("l3fx", std(0xffffff, 0, 0.4, { map: bubbleTex, emissive: 0xffffff, emissiveMap: bubbleTex, emissiveIntensity: 0.6, side: DS })),
  };
  // Battery-swap lot (delivery layer).
  const swapM = {
    cab: L.add("l1eq", std(0x17a37c, 0.3, 0.4)),
    slot: L.add("l1eq", std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 0.9 })),
    canopy: L.add("l1eq", std(0xe8ecef, 0.4, 0.4, { side: DS })),
  };

  // ------------------------------------------------------------ plinth + ground
  let groundMesh: T.Mesh;
  {
    const sh = new THREE.Shape();
    const x0 = -PX,
      x1 = PX,
      z0 = -PZ,
      z1 = PZ;
    sh.moveTo(x0 + PR, -z0);
    sh.lineTo(x1 - PR, -z0);
    sh.quadraticCurveTo(x1, -z0, x1, -z0 - PR);
    sh.lineTo(x1, -z1 + PR);
    sh.quadraticCurveTo(x1, -z1, x1 - PR, -z1);
    sh.lineTo(x0 + PR, -z1);
    sh.quadraticCurveTo(x0, -z1, x0, -z1 + PR);
    sh.lineTo(x0, -z0 - PR);
    sh.quadraticCurveTo(x0, -z0, x0 + PR, -z0);
    const gg = new THREE.ShapeGeometry(sh, 12).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PX) / (2 * PX), 1 - (p.getZ(i) + PZ) / (2 * PZ));
    gg.translate(0, 0.004, 0);
    groundMesh = mesh(appG, gg, baseM.ground);
    groundMesh.frustumCulled = false;
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    mesh(appG, pl, baseM.plinth);
    const lip = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    mesh(appG, lip, baseM.lip);
    for (const b of [DARK, HUB, PAV]) put(appG, baseM.floor, flat(b.x0, b.x1, b.z0, b.z1, 0.01));
    put(appG, baseM.floorDark, flat(POD.x0, POD.x1, POD.z0, POD.z1, 0.01));
  }

  // ------------------------------------------------------------ street context
  {
    const P = putter(appG);
    const trees: [number, number, number][] = [
      [-1.15, 2.42, 1],
      [1.15, 2.42, 1],
      [-4.5, 2.42, 0.9],
      [4.5, 2.42, 0.9],
      [-1.15, 1.3, 0.85],
      [1.15, 1.3, 0.85],
      [-2.2, -3.02, 0.8],
      [2.6, -3.02, 0.8],
      [-1.2, -1.4, 0.75],
      [1.2, -1.4, 0.75],
    ];
    for (const [x, z, s] of trees) {
      P(streetM.trunk, cyl(0.018 * s, 0.14 * s, x, 0, z, 6));
      P(streetM.canopy, new THREE.IcosahedronGeometry(0.13 * s, 1).scale(1, 1.1, 1).translate(x, 0.22 * s, z));
      P(streetM.canopy, new THREE.IcosahedronGeometry(0.09 * s, 1).translate(x + 0.06 * s, 0.3 * s, z - 0.03 * s));
    }
    // Street lamps along the kerb.
    for (const x of [-3.0, -0.75, 0.75, 3.0]) {
      P(streetM.pole, cyl(0.008, 0.42, x, 0, 2.46, 6));
      P(streetM.pole, bb(x - 0.005, x + 0.005, 0.41, 0.42, 2.38, 2.46));
      P(streetM.lamp, bb(x - 0.018, x + 0.018, 0.395, 0.41, 2.36, 2.4));
    }
    // Plaza benches.
    for (const x of [-0.6, 0.6]) P(streetM.bench, bb(x - 0.12, x + 0.12, 0.03, 0.045, 1.25, 1.3));
    // A car on the front road.
    const car = (x: number, z: number) => {
      P(streetM.car, rb(0.36, 0.07, 0.17, 0.03, x, 0.03, z));
      P(streetM.car, rb(0.2, 0.06, 0.15, 0.03, x - 0.02, 0.09, z));
      P(streetM.glass, bb(x - 0.11, x + 0.07, 0.1, 0.14, z - 0.077, z + 0.077));
      for (const dx of [-0.11, 0.11]) for (const dz of [-0.08, 0.08]) P(streetM.tyre, new THREE.CylinderGeometry(0.032, 0.032, 0.025, 12).rotateX(Math.PI / 2).translate(x + dx, 0.032, z + dz));
    };
    car(-1.0, 2.86);
    car(3.1, 2.64);
  }

  // ------------------------------------------------------------ layer 0: storefronts
  {
    const P = putter(appG);
    const H = SHOP_H;
    SHOPS.forEach((s, i) => {
      const x0 = s.cx - s.w / 2,
        x1 = s.cx + s.w / 2;
      P(shopM.wall, bb(x0, x1, 0, H, SHOP_Z0, SHOP_Z1));
      P(shopM.facade[i], panel(s.w, H, s.cx, H / 2, SHOP_Z1 + 0.003));
      // Sloped awning, sampling the facade's stripe band.
      const yt = H * AWN_V1,
        yb = H * AWN_V0 - 0.01;
      P(shopM.facade[i], quad([x0 + 0.03, yb, SHOP_Z1 + 0.13], [x1 - 0.03, yb, SHOP_Z1 + 0.13], [x1 - 0.03, yt, SHOP_Z1 + 0.004], [x0 + 0.03, yt, SHOP_Z1 + 0.004], AWN_V0, AWN_V1));
      // Roof, coping, rooftop units.
      P(shopM.roof, bb(x0 + 0.02, x1 - 0.02, H, H + 0.005, SHOP_Z0 + 0.02, SHOP_Z1 - 0.02));
      P(shopM.coping, bb(x0, x1, H, H + 0.035, SHOP_Z1 - 0.025, SHOP_Z1));
      P(shopM.coping, bb(x0, x1, H, H + 0.035, SHOP_Z0, SHOP_Z0 + 0.025));
      P(shopM.coping, bb(x0, x0 + 0.025, H, H + 0.035, SHOP_Z0, SHOP_Z1));
      P(shopM.coping, bb(x1 - 0.025, x1, H, H + 0.035, SHOP_Z0, SHOP_Z1));
      // Roof sign: the app tile on a dark back plate.
      const sz = 0.34;
      P(signM.back, rb(sz + 0.04, sz + 0.04, 0.03, 0.06, s.cx, H + 0.02, SHOP_Z1 - 0.1));
      P(signM.face, cell(panel(sz, sz, s.cx, H + 0.04 + sz / 2, SHOP_Z1 - 0.083), i));
      for (const dx of [-0.1, 0.1]) P(signM.back, bb(s.cx + dx - 0.01, s.cx + dx + 0.01, H, H + 0.04, SHOP_Z1 - 0.13, SHOP_Z1 - 0.07));
      // Rooftop AC units (except where the plane / billboard sit).
      if (i < 2) {
        P(shopM.unit, rb(0.22, 0.08, 0.16, 0.015, s.cx + 0.45, H, SHOP_Z0 + 0.18));
        P(shopM.dark, cyl(0.045, 0.01, s.cx + 0.45, H + 0.08, SHOP_Z0 + 0.18, 14));
      }
      // Side walls between neighbours read as party walls: a thin darker pier.
      P(shopM.dark, bb(x0, x0 + 0.02, 0, H, SHOP_Z1, SHOP_Z1 + 0.01));
      P(shopM.dark, bb(x1 - 0.02, x1, 0, H, SHOP_Z1, SHOP_Z1 + 0.01));
    });
    // Restaurant: kitchen exhaust stack.
    {
      const s = SHOPS[0];
      P(shopM.unit, cyl(0.035, 0.24, s.cx - 0.48, H, SHOP_Z0 + 0.2, 12));
      P(shopM.dark, cyl(0.05, 0.03, s.cx - 0.48, H + 0.24, SHOP_Z0 + 0.2, 12));
    }
    // Shop: parcels stacked by the door.
    {
      const s = SHOPS[1];
      P(l1.parcel, bb(s.cx + 0.3, s.cx + 0.42, 0, 0.08, SHOP_Z1 + 0.02, SHOP_Z1 + 0.12));
      P(l1.parcel, bb(s.cx + 0.32, s.cx + 0.41, 0.08, 0.14, SHOP_Z1 + 0.03, SHOP_Z1 + 0.11));
    }
    // Travel agency: a little airliner on a pylon and a globe.
    {
      const s = SHOPS[2];
      const px = s.cx + 0.38,
        py = H + 0.34,
        pz = SHOP_Z0 + 0.3;
      P(shopM.dark, cyl(0.012, py - H - 0.02, px, H, pz, 8));
      const plane: T.BufferGeometry[] = [
        new THREE.CapsuleGeometry(0.035, 0.32, 6, 12).rotateZ(Math.PI / 2),
        new THREE.BoxGeometry(0.06, 0.008, 0.42).translate(0.02, -0.005, 0),
        new THREE.BoxGeometry(0.04, 0.006, 0.14).translate(-0.17, 0.01, 0),
        new THREE.BoxGeometry(0.05, 0.08, 0.006).translate(-0.18, 0.045, 0),
      ];
      const pg = mergeInto(THREE, plane).rotateY(0.5).rotateZ(0.12).translate(px, py, pz);
      P(shopM.white, pg);
      P(shopM.blue, new THREE.CylinderGeometry(0.036, 0.036, 0.04, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.3).rotateY(0.5).translate(px - 0.02, py + 0.004, pz + 0.01));
      P(shopM.blue, new THREE.SphereGeometry(0.1, 20, 14).translate(s.cx - 0.45, H + 0.14, SHOP_Z0 + 0.25));
      P(shopM.dark, cyl(0.01, 0.04, s.cx - 0.45, H, SHOP_Z0 + 0.25, 8));
      P(shopM.coping, new THREE.TorusGeometry(0.11, 0.006, 6, 28).rotateY(0.4).translate(s.cx - 0.45, H + 0.14, SHOP_Z0 + 0.25));
    }
    // Classifieds office: a listings billboard over the roof.
    {
      const s = SHOPS[3];
      const bz = SHOP_Z0 + 0.22;
      for (const dx of [-0.42, 0.42]) P(shopM.dark, bb(s.cx + dx - 0.015, s.cx + dx + 0.015, H, H + 0.5, bz - 0.015, bz + 0.015));
      P(shopM.dark, bb(s.cx - 0.56, s.cx + 0.56, H + 0.42, H + 0.8, bz - 0.03, bz - 0.01));
      P(shopM.listing, panel(1.08, 0.36, s.cx, H + 0.61, bz));
    }
    // Gaming arcade (back right): dark facade, neon trim, gamepad sign.
    {
      const b = ARC;
      const cx = (b.x0 + b.x1) / 2;
      P(shopM.arcWall, bb(b.x0, b.x1, 0, b.h, b.z0, b.z1));
      P(shopM.arcade, panel(b.x1 - b.x0, b.h, cx, b.h / 2, b.z1 + 0.003));
      P(shopM.roof, bb(b.x0 + 0.02, b.x1 - 0.02, b.h, b.h + 0.005, b.z0 + 0.02, b.z1 - 0.02));
      for (const z of [b.z1 + 0.004, b.z0 - 0.004]) P(shopM.neonPink, bb(b.x0, b.x1, b.h - 0.02, b.h, z - 0.006, z + 0.006));
      for (const x of [b.x0 - 0.004, b.x1 + 0.004]) P(shopM.neonPink, bb(x - 0.006, x + 0.006, b.h - 0.02, b.h, b.z0, b.z1));
      for (const x of [b.x0 + 0.01, b.x1 - 0.01]) P(shopM.neonCyan, bb(x - 0.008, x + 0.008, 0.02, b.h - 0.03, b.z1, b.z1 + 0.012));
      const sz = 0.34,
        sx = 3.6,
        szz = b.z1 - 0.06;
      P(signM.back, rb(sz + 0.04, sz + 0.04, 0.03, 0.06, sx, b.h + 0.02, szz - 0.017));
      P(signM.face, cell(panel(sz, sz, sx, b.h + 0.04 + sz / 2, szz), 4));
      P(shopM.unit, rb(0.24, 0.08, 0.18, 0.015, 3.05, b.h, b.z0 + 0.2));
    }
  }

  // ------------------------------------------------------------ layer 0: the phone tower
  {
    const phoneG = new THREE.Group();
    phoneG.position.set(PHONE.x, POD.h, PHONE.z);
    phoneG.rotation.y = PHONE.ry;
    appG.add(phoneG);
    const P = putter(phoneG);
    const W = 1.45,
      Hh = 2.75,
      D = 0.16,
      y0 = 0.06;
    P(phoneM.stand, rb(1.0, 0.06, 0.5, 0.03, 0, 0, 0));
    P(phoneM.body, roundedBox(THREE, W, Hh, D, 0.17, 3).translate(0, y0 + Hh / 2, 0));
    P(phoneM.frame, roundedBox(THREE, W + 0.012, Hh + 0.012, D * 0.55, 0.175, 3).translate(0, y0 + Hh / 2, 0));
    // Screen (rounded rect, UVs normalised to the rect).
    {
      const w = SCR_W,
        h = SCR_H,
        r = 0.12;
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, 0);
      s.lineTo(w / 2 - r, 0);
      s.quadraticCurveTo(w / 2, 0, w / 2, r);
      s.lineTo(w / 2, h - r);
      s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
      s.lineTo(-w / 2 + r, h);
      s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
      s.lineTo(-w / 2, r);
      s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
      const g = new THREE.ShapeGeometry(s, 8);
      const p = g.getAttribute("position") as T.BufferAttribute;
      const uv = g.getAttribute("uv") as T.BufferAttribute;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h);
      g.translate(0, SCR_Y0, D / 2 + 0.003);
      P(phoneM.screen, g);
    }
    // Punch-hole camera, side buttons, rear camera island.
    P(phoneM.lens, new THREE.CircleGeometry(0.028, 16).translate(0, SCR_Y0 + SCR_H - 0.07, D / 2 + 0.005));
    P(phoneM.frame, bb(W / 2, W / 2 + 0.012, 1.95, 2.25, -0.03, 0.03));
    P(phoneM.frame, bb(W / 2, W / 2 + 0.012, 1.6, 1.8, -0.03, 0.03));
    P(phoneM.body, rb(0.42, 0.42, 0.04, 0.1, -0.38, 2.2, -D / 2 - 0.01));
    for (const [dx, dy] of [
      [-0.48, 2.5],
      [-0.28, 2.5],
      [-0.48, 2.3],
    ])
      P(phoneM.lens, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 18).rotateX(Math.PI / 2).translate(dx, dy, -D / 2 - 0.035));
    // 3D app tiles standing proud of the screen.
    TILE_Y.forEach((y, r) =>
      TILE_X.forEach((x, c) => {
        P(phoneM.tile, cell(panel(0.3, 0.3, x, y, D / 2 + 0.035), r * 3 + c));
      })
    );
  }

  // ------------------------------------------------------------ scooters & vans (instanced)
  const scooters: Item[] = [];
  const BOX_C = [0xef7d2d, 0xd94848, 0x17a37c, 0xe2b33a, 0x7657d4, 0x2a93d8];
  const BODY_C = [0x2e343b, 0xe9ecef, 0x2e343b, 0xb9c0c7];
  {
    let k = 0;
    const add = (x: number, z: number, ry: number) => {
      scooters.push({ p: [x, 0, z], ry, c: k++ });
    };
    for (let i = 0; i < 8; i++) add(-3.98 + i * 0.25, 1.08, 0); // dark-store fleet bays
    for (let i = 0; i < 3; i++) add(-4.2 + i * 0.3, 2.42, Math.PI / 2); // waiting at the restaurant
    add(-2.4, 2.64, Math.PI / 2); // riding along the road
    add(1.9, 2.86, -Math.PI / 2);
    add(-0.2, 1.15, Math.PI / 2); // crossing the lane
    for (let i = 0; i < 5; i++) add(-3.54 + i * 0.22, -2.05, 0); // battery-swap lot
  }
  {
    // One scooter, authored facing +Z, ~0.26 long.
    const body = mergeInto(THREE, [
      rb(0.06, 0.04, 0.18, 0.015, 0, 0.035, 0.0),
      rb(0.07, 0.11, 0.035, 0.015, 0, 0.04, 0.085),
      rb(0.06, 0.045, 0.1, 0.02, 0, 0.065, -0.06),
    ]);
    const box = rb(0.11, 0.1, 0.1, 0.012, 0, 0.115, -0.085);
    const dark = mergeInto(THREE, [
      new THREE.CylinderGeometry(0.032, 0.032, 0.026, 14).rotateZ(Math.PI / 2).translate(0, 0.032, 0.095),
      new THREE.CylinderGeometry(0.032, 0.032, 0.026, 14).rotateZ(Math.PI / 2).translate(0, 0.032, -0.09),
      bb(-0.026, 0.026, 0.105, 0.12, -0.04, 0.03),
      bar(THREE, [0, 0.15, 0.1], [0, 0.07, 0.11], 0.006, 6),
      bar(THREE, [-0.05, 0.155, 0.1], [0.05, 0.155, 0.1], 0.006, 6),
    ]);
    const bodyItems = scooters.map((s) => ({ ...s, c: BODY_C[(s.c ?? 0) % BODY_C.length] }));
    const boxItems = scooters.map((s) => ({ ...s, c: BOX_C[(s.c ?? 0) % BOX_C.length] }));
    inst(delG, body, l1.scBody, bodyItems);
    inst(delG, box, l1.scBox, boxItems);
    inst(delG, dark, l1.scDark, scooters.map((s) => ({ p: s.p, ry: s.ry })));
  }
  {
    // Delivery van, authored facing +Z.
    const vans: Item[] = [
      { p: [4.2, 0, -1.1], ry: Math.PI, c: 0xef7d2d },
      { p: [4.2, 0, -0.7], ry: Math.PI, c: 0x17a37c },
      { p: [4.2, 0, -0.3], ry: Math.PI, c: 0x2a93d8 },
      { p: [0.9, 0, 2.64], ry: Math.PI / 2, c: 0xe2b33a },
    ];
    // Vans at the dock face away from it (nose +X): rotate their frame so +Z (nose) points east.
    vans.slice(0, 3).forEach((v) => (v.ry = Math.PI / 2));
    const body = mergeInto(THREE, [rb(0.19, 0.17, 0.32, 0.03, 0, 0.035, -0.04), rb(0.19, 0.11, 0.12, 0.035, 0, 0.035, 0.16)]);
    const stripe = bb(-0.097, 0.097, 0.1, 0.13, -0.19, 0.12);
    const glass = mergeInto(THREE, [
      new THREE.BoxGeometry(0.17, 0.05, 0.01).rotateX(-0.5).translate(0, 0.165, 0.205),
      bb(-0.098, 0.098, 0.12, 0.17, 0.12, 0.2),
    ]);
    const tyres = mergeInto(
      THREE,
      [-0.13, 0.15].flatMap((z) => [-0.09, 0.09].map((x) => new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14).rotateZ(Math.PI / 2).translate(x, 0.035, z)))
    );
    inst(delG, body, l1.van, vans.map((v) => ({ p: v.p, ry: v.ry })));
    inst(delG, stripe, l1.vanStripe, vans);
    inst(delG, glass, l1.vanGlass, vans.map((v) => ({ p: v.p, ry: v.ry })));
    inst(delG, tyres, l1.scDark, vans.map((v) => ({ p: v.p, ry: v.ry })));
  }

  // ------------------------------------------------------------ layer 1: shells (dark store + hub)
  const shell = (b: Box, wallM: T.Material, signM2: T.Material, signX: number) => {
    const P = putter(delG);
    P(wallM, wallRing(b, 0.7));
    P(l1Shell.roof, bb(b.x0, b.x1, b.h - 0.02, b.h, b.z0, b.z1));
    const pt = 0.025,
      ph = 0.04;
    P(l1Shell.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(l1Shell.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(l1Shell.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(l1Shell.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    P(signM2, panel(0.9, 0.17, signX, b.h - 0.12, b.z1 + 0.005));
    // Rooftop: solar rows and two AC units.
    const w = b.x1 - b.x0;
    for (let r = 0; r < 3; r++)
      P(l1Shell.solar, new THREE.BoxGeometry(w - 0.5, 0.008, 0.22).rotateX(-0.3).translate((b.x0 + b.x1) / 2 - 0.1, b.h + 0.06, b.z0 + 0.35 + r * 0.42));
    for (const dx of [0.3, w - 0.3]) {
      P(l1Shell.unit, rb(0.26, 0.09, 0.2, 0.015, b.x0 + dx, b.h, b.z1 - 0.3));
    }
  };
  shell(DARK, l1Shell.dark, l1Shell.darkSign, -2.98);
  shell(HUB, l1Shell.hub, l1Shell.hubSign, 2.68);

  // ------------------------------------------------------------ layer 1: dark store interior
  {
    const P = putter(delG);
    const totes: Item[] = [];
    const TOTE_C = [0xe2b33a, 0x2a93d8, 0x17a37c, 0xd94848, 0xeef1f3, 0xef7d2d];
    const rnd = mulberry(31);
    const rowsZ = [-1.05, -0.62, -0.19];
    const RX0 = -4.1,
      RX1 = -2.1,
      RH = 0.36,
      RD = 0.16;
    for (const z of rowsZ) {
      for (let x = RX0; x <= RX1 + 1e-6; x += 0.4) P(l1.rack, bb(x - 0.01, x + 0.01, 0, RH, z - RD / 2, z + RD / 2));
      for (const y of [0.04, 0.13, 0.22, 0.31]) {
        P(l1.shelf, bb(RX0, RX1, y - 0.008, y, z - RD / 2, z + RD / 2));
        for (let x = RX0 + 0.05; x < RX1 - 0.03; x += 0.09) {
          if (rnd() < 0.12) continue;
          totes.push({ p: [x, y, z], c: TOTE_C[Math.floor(rnd() * TOTE_C.length)] });
        }
      }
    }
    inst(delG, bb(-0.038, 0.038, 0, 0.065, -0.07, 0.07), l1.tote, totes);
    // Cold room on the east end (fresh produce, dairy, ice cream).
    P(l1.cold, bb(-1.95, -1.66, 0, 0.36, -1.22, -0.25));
    P(l1.coldGlass, bb(-1.96, -1.95, 0.04, 0.32, -1.18, -0.29));
    P(l1.screen, bb(-1.962, -1.958, 0.3, 0.34, -0.85, -0.65));
    // Packing benches and a dispatch counter by the front door.
    for (const x of [-3.9, -3.4, -2.9]) {
      P(l1.bench, bb(x - 0.18, x + 0.18, 0.1, 0.12, 0.42, 0.6));
      P(l1.dark, bb(x - 0.17, x + 0.17, 0, 0.1, 0.44, 0.58));
      P(l1.screen, panel(0.08, 0.05, x + 0.1, 0.17, 0.5, 0).rotateX(0));
      P(l1.parcel, bb(x - 0.12, x - 0.03, 0.12, 0.18, 0.46, 0.54));
    }
    P(l1.yellow, bb(-2.4, -1.75, 0, 0.12, 0.55, 0.72));
    P(l1.green, bb(-2.38, -1.77, 0.12, 0.125, 0.56, 0.71));
    // Picking carts in the aisles.
    for (const [x, z] of [
      [-3.3, -0.83],
      [-2.6, -0.4],
      [-3.8, 0.04],
    ]) {
      P(l1.steel, bb(x - 0.07, x + 0.07, 0.03, 0.1, z - 0.045, z + 0.045));
      P(l1.tote, bb(x - 0.06, x + 0.06, 0.1, 0.14, z - 0.04, z + 0.04));
      P(l1.dark, bar(THREE, [x + 0.07, 0.03, z - 0.04], [x + 0.07, 0.18, z - 0.04], 0.005, 5));
    }
  }

  // ------------------------------------------------------------ layer 1: sorting hub interior
  {
    const P = putter(delG);
    const by = 0.13; // belt height
    const loop: [number, number, number, number][] = [
      [1.95, 3.4, 0.25, 0.35], // front run
      [1.95, 3.4, -0.95, -0.85], // back run
      [1.95, 2.05, -0.85, 0.25], // west run
      [3.3, 3.4, -0.85, 0.25], // east run
    ];
    for (const [x0, x1, z0, z1] of loop) {
      P(l1.belt, bb(x0, x1, by - 0.012, by, z0, z1));
      P(l1.steel, bb(x0, x1, by - 0.03, by - 0.012, z0 - 0.008, z0));
      P(l1.steel, bb(x0, x1, by - 0.03, by - 0.012, z1, z1 + 0.008));
      const len = Math.max(x1 - x0, z1 - z0);
      const n = Math.max(2, Math.round(len / 0.3));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = x1 - x0 > z1 - z0 ? lerp(x0 + 0.03, x1 - 0.03, t) : (x0 + x1) / 2;
        const z = x1 - x0 > z1 - z0 ? (z0 + z1) / 2 : lerp(z0 + 0.03, z1 - 0.03, t);
        P(l1.steel, bb(x - 0.008, x + 0.008, 0, by - 0.03, z - 0.04, z + 0.04));
      }
    }
    // Parcels riding the loop.
    const rnd = mulberry(41);
    const PARCEL_C = [0xc8a271, 0xb88e5c, 0xd6b585, 0xeef1f3, 0xc8a271];
    const parcels: Item[] = [];
    for (let x = 2.05; x < 3.35; x += 0.17) {
      parcels.push({ p: [x, by, 0.3], ry: rnd() * 0.4, s: [1, 0.7 + rnd() * 0.6, 1], c: PARCEL_C[Math.floor(rnd() * 5)] });
      parcels.push({ p: [x + 0.08, by, -0.9], ry: rnd() * 0.4, s: [1, 0.7 + rnd() * 0.6, 1], c: PARCEL_C[Math.floor(rnd() * 5)] });
    }
    for (let z = -0.75; z < 0.2; z += 0.2) {
      parcels.push({ p: [2.0, by, z], ry: rnd() * 0.4, c: PARCEL_C[Math.floor(rnd() * 5)] });
      parcels.push({ p: [3.35, by, z + 0.1], ry: rnd() * 0.4, c: PARCEL_C[Math.floor(rnd() * 5)] });
    }
    // Roll cages along the west wall and behind the loop, filled with parcels.
    const cageAt: [number, number][] = [];
    for (let i = 0; i < 5; i++) cageAt.push([1.75, -1.1 + i * 0.36]);
    for (let i = 0; i < 4; i++) cageAt.push([2.2 + i * 0.32, -1.18]);
    for (const [x, z] of cageAt) {
      P(l1.cage, bb(x - 0.07, x + 0.07, 0.01, 0.2, z - 0.07, z - 0.065));
      P(l1.cage, bb(x - 0.07, x + 0.07, 0.01, 0.2, z + 0.065, z + 0.07));
      P(l1.cage, bb(x - 0.07, x - 0.065, 0.01, 0.2, z - 0.07, z + 0.07));
      P(l1.cage, bb(x - 0.07, x + 0.07, 0.01, 0.02, z - 0.07, z + 0.07));
      for (let k = 0; k < 3; k++) parcels.push({ p: [x + (k - 1) * 0.035, 0.02 + (k % 2) * 0.06, z], s: [0.7, 0.8, 1.3], c: PARCEL_C[Math.floor(rnd() * 5)] });
    }
    inst(delG, bb(-0.04, 0.04, 0, 0.06, -0.035, 0.035), l1.parcel, parcels);
    // Sort chutes from the west run down to the cages.
    for (let i = 0; i < 4; i++) {
      const z = -0.92 + i * 0.36;
      P(l1.steel, quad([1.82, 0.12, z - 0.05], [1.82, 0.12, z + 0.05], [1.95, by, z + 0.05], [1.95, by, z - 0.05]));
    }
    // Scanner arch over the front run, induction table by the east dock.
    const ax = 2.65;
    P(l1.yellow, bb(ax - 0.04, ax - 0.02, 0, 0.28, 0.2, 0.4));
    P(l1.yellow, bb(ax + 0.02, ax + 0.04, 0, 0.28, 0.2, 0.4));
    P(l1.yellow, bb(ax - 0.04, ax + 0.04, 0.26, 0.29, 0.18, 0.42));
    P(l1.laser, bb(ax - 0.003, ax + 0.003, by, 0.26, 0.22, 0.38));
    P(l1.screen, panel(0.08, 0.06, ax + 0.1, 0.33, 0.42));
    P(l1.dark, bb(ax + 0.08, ax + 0.12, 0.29, 0.36, 0.41, 0.415));
    P(l1.bench, bb(3.48, 3.7, 0.1, 0.12, -0.6, 0.1));
    P(l1.dark, bb(3.5, 3.68, 0, 0.1, -0.58, 0.08));
    // Dock doors on the east wall (open, vans backed up to them).
    for (const z of [-1.1, -0.7, -0.3]) P(l1.dark, bb(HUB.x1 + 0.001, HUB.x1 + 0.006, 0, 0.26, z - 0.13, z + 0.13));
  }

  // ------------------------------------------------------------ layer 1: battery-swap lot
  {
    const P = putter(delG);
    P(swapM.cab, rb(0.42, 0.34, 0.18, 0.02, -4.05, 0, -2.35));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) P(swapM.slot, bb(-4.24 + c * 0.1, -4.17 + c * 0.1, 0.04 + r * 0.09, 0.1 + r * 0.09, -2.258, -2.255));
    P(l1.screen, bb(-3.95, -3.86, 0.29, 0.32, -2.258, -2.255));
    P(swapM.canopy, bb(-4.4, -2.95, 0.42, 0.43, -2.55, -1.8));
    for (const x of [-4.35, -3.0]) for (const z of [-2.5, -1.85]) P(l1.steel, cyl(0.01, 0.42, x, 0, z, 6));
  }

  // ------------------------------------------------------------ layer 2: payments switch room
  {
    const b = PAV;
    const P = putter(payG);
    P(l2Shell.glass, wallRing(b, 1));
    for (const x of [b.x0, -0.475, 0, 0.475, b.x1]) for (const z of [b.z0, b.z1]) P(l2Shell.frame, bb(x - 0.012, x + 0.012, 0, b.h, z - 0.012, z + 0.012));
    for (const z of [-0.6, -0.25, 0.1]) for (const x of [b.x0, b.x1]) P(l2Shell.frame, bb(x - 0.012, x + 0.012, 0, b.h, z - 0.012, z + 0.012));
    P(l2Shell.roof, bb(b.x0 - 0.05, b.x1 + 0.05, b.h, b.h + 0.04, b.z0 - 0.05, b.z1 + 0.05));
    P(l2Shell.trim, bb(b.x0 - 0.052, b.x1 + 0.052, b.h + 0.005, b.h + 0.03, b.z1 + 0.048, b.z1 + 0.054));
    P(l2Shell.roof, rb(0.36, 0.08, 0.3, 0.02, 0.45, b.h + 0.04, -0.4));
    const Q = putter(payG);
    // Two rows of switch racks (blinking), the transactions wall, operator desks.
    const racks: Item[] = [];
    for (const z of [-0.62, -0.28]) for (let i = 0; i < 5; i++) racks.push({ p: [-0.6 + i * 0.15, 0, z], ry: z < -0.5 ? 0 : Math.PI });
    rackSet(payG, l2, racks, 0.3);
    Q(l2.wall, panel(1.0, 0.3, 0.1, 0.24, b.z0 + 0.03));
    Q(l2.dark, bb(-0.42, 0.62, 0.08, 0.4, b.z0 + 0.01, b.z0 + 0.025));
    for (const x of [-0.45, 0.0, 0.45]) {
      Q(l2.desk, bb(x - 0.15, x + 0.15, 0.08, 0.1, 0.06, 0.2));
      Q(l2.dark, bb(x - 0.14, x + 0.14, 0, 0.08, 0.08, 0.18));
      Q(l2.screen, panel(0.1, 0.065, x - 0.05, 0.15, 0.1, Math.PI));
      Q(l2.screen, panel(0.1, 0.065, x + 0.07, 0.15, 0.1, Math.PI));
    }
    // Scan-to-pay totem and a card terminal on a stand in front.
    const tz = 0.88;
    Q(l2.totem, rb(0.3, 0.72, 0.06, 0.03, 0, 0.02, tz - 0.035));
    Q(l2.totem, rb(0.36, 0.02, 0.16, 0.01, 0, 0, tz - 0.035));
    Q(l2.qr, panel(0.26, 0.52, 0, 0.42, tz - 0.003));
    Q(l2.pos, cyl(0.012, 0.22, 0.36, 0, tz - 0.03, 8));
    Q(l2.pos, rb(0.09, 0.03, 0.13, 0.012, 0.36, 0.22, tz - 0.03));
    Q(l2.posScreen, new THREE.PlaneGeometry(0.06, 0.05).rotateX(-Math.PI / 2 + 0.1).translate(0.36, 0.252, tz - 0.06));
    // QR stickers on every shop door + a card terminal on each counter.
    for (const s of SHOPS) Q(l2.sticker, panel(0.06, 0.1, s.cx + 0.09, 0.15, SHOP_Z1 + 0.006));
    Q(l2.sticker, panel(0.06, 0.1, 3.3, 0.15, ARC.z1 + 0.006));
    Q(l2.sticker, panel(0.06, 0.1, -2.1, 0.17, 0.722));
  }

  // Payment rails: glowing dashes flowing from the shops to the switch, then to the core.
  {
    const segs: [number, number, number, number][] = [];
    for (const sgn of [-1, 1]) {
      segs.push([sgn * 3.65, 1.47, sgn * 3.65, 1.2]);
      segs.push([sgn * 2.0, 1.47, sgn * 2.0, 1.2]);
      segs.push([sgn * 3.65, 1.2, sgn * 0.35, 1.2]);
      segs.push([sgn * 0.35, 1.2, sgn * 0.35, PAV.z1 + 0.02]);
    }
    segs.push([0, PAV.z0 - 0.02, 0, POD.z1 + 0.02]);
    for (const [x, z] of TOWERS) segs.push([Math.sign(x) * (POD.x1 + 0.02), z, x - Math.sign(x) * 0.13, z]);
    const geos = segs
      .filter(([x0, z0, x1, z1]) => Math.hypot(x1 - x0, z1 - z0) > 0.05)
      .map(([x0, z0, x1, z1]) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const g = new THREE.PlaneGeometry(len, 0.045).rotateX(-Math.PI / 2);
        uvScale(g, len / 0.32, 1);
        g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
        return g.translate((x0 + x1) / 2, 0.009, (z0 + z1) / 2);
      });
    const rails = mesh(payG, mergeInto(THREE, geos), railM);
    rails.renderOrder = 2;
  }

  // ------------------------------------------------------------ layer 3: data-centre podium
  {
    const b = POD;
    const P = putter(coreG);
    P(l3Shell.facade, wallRing(b, 0.9));
    P(l3Shell.roof, bb(b.x0 - 0.03, b.x1 + 0.03, b.h - 0.03, b.h, b.z0 - 0.03, b.z1 + 0.03));
    P(l3Shell.edge, bb(b.x0 - 0.035, b.x1 + 0.035, b.h - 0.05, b.h - 0.03, b.z1 + 0.02, b.z1 + 0.035));
    P(l3Shell.glass, bb(-0.25, 0.25, 0, 0.26, b.z1 + 0.002, b.z1 + 0.01)); // entrance
    P(l3Shell.roof, bb(-0.32, 0.32, 0.26, 0.28, b.z1, b.z1 + 0.16));
    // Three rack rows (hot/cold aisles), CRAH units at the ends, yellow cable trays overhead.
    const racks: Item[] = [];
    for (const [z, ry] of [
      [-2.62, 0],
      [-2.2, Math.PI],
      [-1.95, 0],
    ] as [number, number][])
      for (let i = 0; i < 16; i++) racks.push({ p: [-1.27 + i * 0.17, 0, z], ry });
    rackSet(coreG, l3, racks, 0.32);
    for (const x of [-1.62, 1.62]) for (const z of [-2.55, -2.05]) P(l3.crah, rb(0.16, 0.34, 0.3, 0.015, x, 0, z));
    for (const z of [-2.62, -2.2, -1.95]) {
      P(l3.tray, bb(-1.4, 1.4, 0.39, 0.4, z - 0.05, z + 0.05));
      P(l3.tray, bb(-1.4, 1.4, 0.4, 0.42, z - 0.05, z - 0.045));
      P(l3.tray, bb(-1.4, 1.4, 0.4, 0.42, z + 0.045, z + 0.05));
    }
  }

  // ------------------------------------------------------------ layer 3: signal towers
  const beaconMats: T.MeshStandardMaterial[] = [l3.beacon];
  {
    const P = putter(coreG);
    for (const [tx, tz] of TOWERS) {
      const Hh = 1.9;
      const spread = (y: number) => lerp(0.13, 0.035, y / Hh);
      const corners = (y: number): Vec3[] => {
        const s = spread(y);
        return [
          [tx - s, y, tz - s],
          [tx + s, y, tz - s],
          [tx + s, y, tz + s],
          [tx - s, y, tz + s],
        ];
      };
      const levels = 9;
      for (let k = 0; k < 4; k++) P(l3.lattice, bar(THREE, corners(0)[k], corners(Hh)[k], 0.008, 5));
      for (let l = 0; l < levels; l++) {
        const ya = (l / levels) * Hh,
          yb = ((l + 1) / levels) * Hh;
        const A = corners(ya),
          B = corners(yb);
        for (let k = 0; k < 4; k++) {
          P(l3.lattice, bar(THREE, B[k], B[(k + 1) % 4], 0.004, 4));
          P(l3.lattice, bar(THREE, A[k], B[(k + 1) % 4], 0.003, 4));
        }
      }
      P(l3.cabinet, bb(tx - 0.12, tx + 0.12, 0, 0.012, tz - 0.12, tz + 0.12));
      P(l3.cabinet, rb(0.12, 0.16, 0.1, 0.01, tx + 0.22 * Math.sign(-tx), 0, tz + 0.15));
      // Sector antenna panels and microwave dishes near the top.
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.4;
        const r = 0.07;
        P(l3.antenna, new THREE.BoxGeometry(0.035, 0.2, 0.014).rotateY(-a).translate(tx + Math.cos(a) * r, Hh - 0.15, tz + Math.sin(a) * r));
      }
      for (const [y, a] of [
        [Hh - 0.42, 0.8],
        [Hh - 0.62, -2.2],
      ]) {
        const dish = lathe(THREE, [[0, 0], [0.04, 0.008], [0.065, 0.025], [0.07, 0.03]], 18)
          .rotateX(Math.PI / 2)
          .rotateY(a)
          .translate(tx + Math.cos(a) * 0.08, y, tz - Math.sin(a) * 0.08);
        P(l3.dish, dish);
      }
      P(l3.lattice, cyl(0.006, 0.18, tx, Hh, tz, 6));
      P(l3.beacon, new THREE.SphereGeometry(0.018, 10, 8).translate(tx, Hh + 0.19, tz));
      P(l3.beacon, new THREE.SphereGeometry(0.012, 8, 6).translate(tx, Hh * 0.55, tz + spread(Hh * 0.55)));
    }
  }

  // ------------------------------------------------------------ layer 3: floating chat bubbles and ad cards
  const fxG = new THREE.Group();
  coreG.add(fxG);
  {
    const P = putter(fxG);
    const bubbles: [number, number, number, number, number][] = [
      // x, y, z, ry, kind (0 chat, 1 ad)
      [-1.05, 1.15, -2.0, 0.5, 0],
      [1.0, 1.4, -2.3, 0.3, 1],
      [-0.55, 1.75, -2.6, 0.45, 1],
      [0.75, 2.05, -1.95, 0.4, 0],
      [-1.35, 2.3, -2.45, 0.6, 0],
    ];
    for (const [x, y, z, ry, kind] of bubbles) {
      const w = kind ? 0.34 : 0.3,
        h = kind ? 0.22 : 0.18;
      const body = rb(w, h, 0.04, 0.06, 0, -h / 2, 0);
      const parts = [body];
      if (!kind) parts.push(new THREE.ConeGeometry(0.035, 0.07, 4).rotateZ(Math.PI * 0.8).translate(-w / 2 + 0.06, -h / 2 - 0.02, 0));
      P(fxM.bubble, mergeInto(THREE, parts).rotateY(ry).translate(x, y, z));
      const face = new THREE.PlaneGeometry(w - 0.04, h - 0.04);
      uvRect(face, kind ? 0.5 : 0, kind ? 1 : 0.5, 0, 1);
      P(fxM.face, face.translate(0, 0, 0.022).rotateY(ry).translate(x, y, z));
    }
  }

  // ------------------------------------------------------------ rack helper (hoisted)
  function rackSet(parent: T.Object3D, M: { rackBody: T.Material; rackA: T.Material; rackB: T.Material }, items: Item[], h: number) {
    const w = 0.15,
      d = 0.2;
    inst(parent, bb(-w / 2 + 0.004, w / 2 - 0.004, 0, h, -d / 2, d / 2), M.rackBody, items);
    const front = new THREE.PlaneGeometry(w - 0.012, h - 0.01).translate(0, h / 2, d / 2 + 0.002);
    inst(parent, front, M.rackA, items.filter((_, i) => i % 2 === 0));
    inst(parent, front, M.rackB, items.filter((_, i) => i % 2 === 1));
  }

  // ------------------------------------------------------------ flush batches
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ------------------------------------------------------------ animation
  // Rack LEDs blink out of phase, tower beacons pulse, payment rails flow and the
  // floating bubbles bob - all driven from the ground mesh, which is always drawn.
  const rackPairs = [
    [l2.rackA, l2.rackB],
    [l3.rackA, l3.rackB],
  ] as T.MeshStandardMaterial[][];
  groundMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    railTex.offset.x = -(t * 0.9) % 1;
    const ph = Math.floor(t * 2.2) % 2;
    for (const [a, b] of rackPairs) {
      a.emissiveIntensity = ph ? 1.6 : 0.6;
      b.emissiveIntensity = ph ? 0.6 : 1.6;
    }
    const beat = 0.5 + 0.5 * Math.sin(t * 3.2);
    for (const m of beaconMats) m.emissiveIntensity = 0.5 + 2.2 * beat * beat;
    fxG.position.y = Math.sin(t * 1.3) * 0.04;
  };

  // ------------------------------------------------------------ levels
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
    animated: true,
    applyLevel(v: number) {
      const x = clamp01(v / 3) * 3;
      L.set("base", 1);
      L.set("street", pw(x, [[0, 1], [1, 0.55], [2, 0.4], [3, 0.35]]));
      L.set("shops", pw(x, [[0, 1], [0.8, 0.24], [1, 0.22], [3, 0.15]]));
      L.set("signs", pw(x, [[0, 1], [1, 0.5], [2, 0.35], [3, 0.3]]));
      L.set("phone", pw(x, [[0, 1], [0.7, 0.1], [1, 0.08], [3, 0.05]]));
      L.set("phoneScreen", pw(x, [[0, 1], [0.7, 0.14], [1, 0.1], [3, 0.07]]));
      L.set("l1shell", pw(x, [[0, 1], [0.3, 1], [0.9, 0.1], [1, 0.08], [3, 0.05]]));
      L.set("l1eq", pw(x, [[0, 1], [1, 1], [1.8, 0.25], [3, 0.18]]));
      L.set("l2shell", pw(x, [[0, 1], [1.2, 1], [1.85, 0.12], [2, 0.1], [3, 0.06]]));
      L.set("l2eq", pw(x, [[0, 1], [0.6, 0.35], [1, 0.3], [1.7, 1], [2, 1], [2.6, 0.25], [3, 0.22]]));
      L.set("rails", pw(x, [[0, 0.55], [1, 0.3], [2, 1], [3, 0.75]]));
      L.set("l3shell", pw(x, [[0, 1], [2.2, 1], [2.85, 0.1], [3, 0.08]]));
      L.set("l3eq", pw(x, [[0, 1], [1, 0.3], [2, 0.3], [2.6, 1], [3, 1]]));
      L.set("l3fx", pw(x, [[0, 0], [2.3, 0], [3, 1]]));
    },
  };
}
