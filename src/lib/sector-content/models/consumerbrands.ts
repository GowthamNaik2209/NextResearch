// Retail & Consumer Brands: a curved shopping arcade cut open like a doll's house (generic, no real
// company's store, logo or livery; signs use plain words).
//
// Plan (+X east, +Z south/front; the overview looks in from the front, a little west, low):
//   · A fan-shaped plaza. Round its back curve stands a three-floor arcade with its whole front
//     cut away, so every floor reads from the plaza:
//       ground  - fashion (mannequins, racks), a shoe wall with a giant sneaker, the department
//                 store's double-height hall (escalator to a mezzanine) and a jewellery showroom of
//                 glowing display cases with a watch counter and a giant wall watch;
//       first   - appliances (split ACs, fridges with one door open, front-load washers), fans,
//                 lights and kitchen appliances (spinning ceiling fans, pressure cookers,
//                 mixer-grinders) and home & sleep (bed, mattress stack, sofa, linen);
//       top     - a food court (pizza oven, fried-chicken counter, burger counter, tables) and a
//                 cinema whose curved screen follows the back wall over raked red seats, with a
//                 popcorn counter; a glass roof lets the screen show from above.
//   · Front-west corner: the supply side for clothes - a twin barrel-vault textile mill with a
//     brick chimney, a ring-spinning frame, a loom with its warp shed, yarn cones and cotton bales.
//   · Front-east corner: a distillery and brewery - copper pot stills, a pagoda-roofed still
//     house with a back-lit bar shelf, steel fermenters and a pyramid of oak casks.
//   · In the plaza: a giant shopping bag in front of the department store, a fountain, shoppers
//     with bags; delivery scooters wait on the curved street in front.
//
// Layers peel by crossfading (ghosting, never hiding):
//   0 Home & Appliances     the first floor
//   1 Wear & Adorn          first floor ghosts -> ground-floor fashion, shoes, jewellery + the mill
//   2 Stores & Eating Out   wear ghosts -> department store + food court
//   3 Drinks & Leisure      stores ghost -> cinema + distillery
// Ceiling fans spin, the loom's shuttle runs, the fountain plays, the screen flickers and a
// delivery scooter rides the street (animated: true).
import type * as T from "three";
import {
  type Three,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  contactShadow,
  layerMats,
  lathe,
  lerp,
  mergeInto,
  roundedBox,
  smoothShape,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// ------------------------------------------------------------------ key dims
const G = 0.12; // plaza level (top of the base)
const CZ = 3.6; // centre of the arcade's curve (in the plaza, toward the street)
const RI = 3.4; // open front edge of the floors
const RO = 4.45; // inner face of the back wall
const FL = [0.2, 0.98, 1.76]; // floor tops: ground, first, top
const SLAB = 0.06;
const ROOF = 2.58;
const D2R = Math.PI / 180;
// Polar placement round the arcade: phi in degrees (0 = straight back, + = east), r from the centre.
const px = (phi: number, r: number) => r * Math.sin(phi * D2R);
const pz = (phi: number, r: number) => CZ - r * Math.cos(phi * D2R);
const r2 = (v: number) => Math.round(v * 100) / 100;
const AP = (phi: number, r: number, y: number): Vec3 => [r2(px(phi, r)), r2(y), r2(pz(phi, r))];

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/consumerbrands.ts). Left rail top -> bottom:
// appliances (first floor, west end), fashion (ground, west), the mill (front-west corner). Right
// rail: fans (first floor), home & sleep (first floor, east end), jewellery (ground, east), the
// distillery (front-east corner). Top rail west -> east: food court, cinema (top floor). Bottom rail
// west -> east: the giant sneaker, the giant shopping bag. scripts/check-crossings.mjs checks it.
export const CONSUMERBRANDS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: first floor
  large_appliances: { pos: AP(-45, 4.12, FL[1] + 0.3), side: "left" }, // fridge with its door open
  small_appliances: { pos: AP(21.5, 3.9, FL[2] - SLAB - 0.12), side: "right" }, // big spinning ceiling fan
  home_living: { pos: AP(38, 4.12, FL[1] + 0.17), side: "right" }, // bed and mattress
  // layer 1: ground floor + mill
  apparel_brands: { pos: AP(-42, 3.62, FL[0] + 0.3), side: "left" }, // mannequin in a kurta
  textile_makers: { pos: [-3.8, r2(G + 0.16), 2.68], side: "left" }, // yarn-cone pyramid by the loom shed
  footwear: { pos: AP(-21.5, 3.6, FL[0] + 0.2), side: "bottom" }, // giant sneaker before the shoe wall
  jewellery: { pos: AP(38.5, 3.8, FL[0] + 0.2), side: "right" }, // glowing display case
  // layer 2: stores and eating out
  retail_chains: { pos: AP(6, 2.55, G + 0.34), side: "bottom" }, // giant shopping bag at the store
  qsr: { pos: AP(-28, 4.24, FL[2] + 0.22), side: "top" }, // pizza oven
  // layer 3: drinks and leisure
  alcobev: { pos: [4.0, r2(G + 0.25), 2.47], side: "right" }, // copper pot still (east one)
  cinemas: { pos: AP(14, RO - 0.05, FL[2] + 0.48), side: "top" }, // curved cinema screen (west half)
};

export const CONSUMERBRANDS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [-1.8, 3.7, 11.0],
    target: [0.1, 1.15, 0.8],
    narration:
      "Welcome to the high street. A shopping arcade cut open floor by floor: clothes, shoes and jewellery at street level, appliances and home goods above, a food court and a cinema on top, and the department store in the middle. A textile mill and a distillery stand at the corners. Peel it layer by layer.",
  },
  {
    id: "home",
    layer: 0,
    label: "Home & Appliances",
    pos: [-0.3, 2.7, 9.0],
    target: [0.0, 1.25, 0.5],
    narration:
      "The first floor sells the home. Split ACs, refrigerators and front-load washers from makers like LG Electronics, Whirlpool, Voltas and Blue Star; ceiling fans, lights, pressure cookers and mixer-grinders from brands like Crompton and Havells; and mattresses, bed linen and towels from makers like Welspun Living.",
  },
  {
    id: "wear",
    layer: 1,
    label: "Wear & Adorn",
    pos: [-2.9, 2.9, 11.4],
    target: [-1.35, 0.55, 1.35],
    narration:
      "Street level dresses people. Mannequins and racks for apparel and innerwear brands like Page Industries, a shoe wall for footwear like Bata, and a jewellery showroom of gold display cases and a watch counter like Titan's and Kalyan's. In the corner, a mill spins yarn and weaves fabric, the kind KPR Mill, Trident and Vardhman run.",
  },
  {
    id: "stores",
    layer: 2,
    label: "Stores & Eating Out",
    pos: [-1.3, 3.5, 8.4],
    target: [-0.9, 1.25, 0.9],
    narration:
      "Store chains and restaurants. The department store's double-height hall and the giant bag outside stand for fashion and value chains like Trent and Vishal Mega Mart. Upstairs, the food court's pizza oven, fried-chicken and burger counters are the quick-service chains run by Jubilant FoodWorks and Devyani, with delivery scooters waiting below.",
  },
  {
    id: "leisure",
    layer: 3,
    label: "Drinks & Leisure",
    pos: [3.6, 3.5, 8.4],
    target: [2.0, 1.2, 1.1],
    narration:
      "Drinks and leisure. On the top floor, a cinema's curved screen over rows of red seats and a popcorn counter, the business PVR INOX runs. In the corner, copper pot stills, oak casks, beer fermenters and a bar shelf for spirits and beer makers like United Spirits, United Breweries and Radico Khaitan.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0, 12.5, 2.2],
    target: [0, 0, 1.2],
    narration:
      "From above: the arcade's curve round the plaza, the cinema and food court under the glass roof, the textile mill in the west corner, the distillery in the east and the street along the front.",
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

export function buildConsumerbrands(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [homeG, wearG, storeG, leisG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const R = rng(20261120);
  const L = layerMats();
  const DS = THREE.DoubleSide;

  // ================================================================ helpers
  const std = (color: number, metalness = 0.1, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const M = (bucket: string, color: number, metalness = 0.1, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    L.add(bucket, std(color, metalness, roughness, extra));
  const glow = (bucket: string, color: number, emissive: number, intensity = 1, extra: T.MeshStandardMaterialParameters = {}) =>
    L.add(bucket, std(color, 0, 0.4, { emissive, emissiveIntensity: intensity, ...extra }));
  const glass = (bucket: string, color: number, opacity: number) =>
    L.add(bucket, std(color, 0.1, 0.05, { opacity, side: DS, depthWrite: false }));

  const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) =>
    roundedBox(THREE, w, h, d, r).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x = 0, y = 0, z = 0, seg = 16, rTop = r) =>
    new THREE.CylinderGeometry(rTop, r, h, seg).translate(x, y + h / 2, z);
  /** Horizontal cylinder along x or z centred at (x, y, z). */
  const hcyl = (r: number, len: number, x: number, y: number, z: number, axis: "x" | "z" = "x", seg = 16) => {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else g.rotateX(Math.PI / 2);
    return g.translate(x, y, z);
  };
  /** Disc facing +z (a clock face, a porthole). */
  const disc = (r: number, x: number, y: number, z: number, seg = 20) => new THREE.CircleGeometry(r, seg).translate(x, y, z);
  const vPlane = (w: number, h: number, x: number, y: number, z: number) => new THREE.PlaneGeometry(w, h).translate(x, y, z);

  // Local frame on the arcade: origin at (phi, r, y), +x along the curve (east), +z toward the plaza.
  const mtx = (phi: number, r: number, y: number, ry = 0) =>
    new THREE.Matrix4().makeRotationY(-phi * D2R + ry).setPosition(px(phi, r), y, pz(phi, r));
  const at = (g: T.BufferGeometry, phi: number, r: number, y: number, ry = 0) => g.applyMatrix4(mtx(phi, r, y, ry));
  const wpt = (phi: number, r: number, y: number, lx = 0, ly = 0, lz = 0): Vec3 => {
    const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(mtx(phi, r, y));
    return [v.x, v.y, v.z];
  };
  /** A solid ring sector between radii r0..r1 and angles f0..f1 (degrees), from y0 to y1. */
  const arcSlab = (r0: number, r1: number, f0: number, f1: number, y0: number, y1: number) => {
    const n = Math.max(2, Math.ceil(Math.abs(f1 - f0) / 2));
    const pts: T.Vector2[] = [];
    for (let i = 0; i <= n; i++) {
      const f = f0 + ((f1 - f0) * i) / n;
      pts.push(new THREE.Vector2(px(f, r1), -pz(f, r1)));
    }
    for (let i = n; i >= 0; i--) {
      const f = f0 + ((f1 - f0) * i) / n;
      pts.push(new THREE.Vector2(px(f, r0), -pz(f, r0)));
    }
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: y1 - y0, bevelEnabled: false });
    g.rotateX(-Math.PI / 2).translate(0, y0, 0);
    return g;
  };
  /** A curved surface at radius r facing the plaza (for screens and lit walls). */
  const arcSurf = (r: number, f0: number, f1: number, y0: number, y1: number) =>
    new THREE.CylinderGeometry(r, r, y1 - y0, Math.max(4, Math.ceil((f1 - f0) / 2)), 1, true, Math.PI - f1 * D2R, (f1 - f0) * D2R).translate(0, (y0 + y1) / 2, CZ);

  // ---------------------------------------------------------------- batching
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
  const flush = () => {
    for (const b of batches.values()) b.parent.add(new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat));
  };
  /** Piecewise-linear opacity over the level v. */
  const pw = (v: number, keys: [number, number][]) => {
    if (v <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, va] = keys[i],
        [b, vb] = keys[i + 1];
      if (v <= b) return lerp(va, vb, clamp01((v - a) / (b - a)));
    }
    return keys[keys.length - 1][1];
  };

  // ---------------------------------------------------------------- textures
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => canvasTexture(THREE, w, h, draw);
  const font = (size: number, w = "bold") => `${w} ${size}px Arial, Helvetica, sans-serif`;
  const sign = (text: string, bg: string, fg: string, w = 256, h = 48, size = 30) =>
    tex(w, h, (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = font(size);
      g.fillText(text, W / 2, H / 2 + 2);
    });
  const signMat = (bucket: string, map: T.Texture, glowAmt = 0.45) =>
    L.add(bucket, std(0xffffff, 0.05, 0.55, { map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glowAmt }));
  const stripes = (a: string, b: string, n: number, vertical = true) =>
    tex(64, 64, (g, w, h) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = i % 2 ? b : a;
        if (vertical) g.fillRect((i * w) / n, 0, w / n + 1, h);
        else g.fillRect(0, (i * h) / n, w, h / n + 1);
      }
    });

  // ---------------------------------------------------------------- people
  const bodyGeo = new THREE.CapsuleGeometry(0.022, 0.08, 3, 8).translate(0, 0.062, 0);
  const headGeo = new THREE.SphereGeometry(0.02, 10, 8).translate(0, 0.148, 0);
  const sitBody = new THREE.CapsuleGeometry(0.022, 0.045, 3, 8).translate(0, 0.07, 0);
  const sitHead = new THREE.SphereGeometry(0.02, 10, 8).translate(0, 0.135, 0);
  const CLOTHES = [0x2b4c7e, 0xb5179e, 0x3d6b4f, 0xe8902a, 0x4a4a52, 0xd04f7a, 0x6b4f8a, 0x1f2a36, 0x5c8fb8, 0xe0b23a, 0xc0392b];
  const crowds = new Map<string, { parent: T.Object3D; bucket: string; items: Item[]; sit: Item[] }>();
  const people = (parent: T.Object3D, bucket: string, pts: Vec3[], sit = false) => {
    const k = parent.uuid + "|" + bucket;
    if (!crowds.has(k)) crowds.set(k, { parent, bucket, items: [], sit: [] });
    const c = crowds.get(k)!;
    for (const p of pts) (sit ? c.sit : c.items).push({ p, ry: R() * Math.PI * 2, c: CLOTHES[Math.floor(R() * CLOTHES.length)] });
  };
  const flushPeople = () => {
    for (const { parent, bucket, items, sit } of crowds.values()) {
      const body = M(bucket, 0xffffff, 0.05, 0.75);
      const skin = M(bucket, 0xb9805c, 0.05, 0.7);
      inst(parent, bodyGeo, body, items);
      inst(parent, headGeo, skin, items.map((i) => ({ p: i.p, ry: i.ry })));
      inst(parent, sitBody, body, sit);
      inst(parent, sitHead, skin, sit.map((i) => ({ p: i.p, ry: i.ry })));
    }
  };

  // ================================================================ BASE: fan-shaped plaza
  const ground = (() => {
    const X0 = -5.12,
      Z0 = -1.6,
      S = 100;
    const t = tex(1024, 576, (g) => {
      const P = (x: number, z: number): [number, number] => [(x - X0) * S, (z - Z0) * S];
      g.fillStyle = "#e7d3ab";
      g.fillRect(0, 0, 1024, 576);
      const [cx, cz] = P(0, CZ);
      // Concentric paving rings and spokes round the arcade's centre.
      g.strokeStyle = "#d4b98a";
      g.lineWidth = 2;
      for (let r = 0.5; r < 6; r += 0.34) {
        g.beginPath();
        g.arc(cx, cz, r * S, 0, Math.PI * 2);
        g.stroke();
      }
      for (let f = -60; f <= 60; f += 10) {
        const [ax, az] = P(px(f, 0.6), pz(f, 0.6));
        const [bx2, bz] = P(px(f, RI), pz(f, RI));
        g.beginPath();
        g.moveTo(ax, az);
        g.lineTo(bx2, bz);
        g.stroke();
      }
      // Granite band along the arcade's front.
      g.strokeStyle = "#a35a43";
      g.lineWidth = 0.18 * S;
      g.beginPath();
      g.arc(cx, cz, (RI - 0.38) * S, -Math.PI / 2 - 54 * D2R, -Math.PI / 2 + 54 * D2R);
      g.stroke();
      // Fountain inlay.
      const [fx, fz] = P(0, 2.05);
      g.fillStyle = "#a35a43";
      g.beginPath();
      g.arc(fx, fz, 0.62 * S, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#d9bf8c";
      g.beginPath();
      g.arc(fx, fz, 0.52 * S, 0, Math.PI * 2);
      g.fill();
      // Mill yard (concrete) and distillery yard (cobbles).
      g.fillStyle = "#c9c4ba";
      g.fillRect(...P(-4.95, 1.2), 1.95 * S, 2.1 * S);
      g.fillStyle = "#b99a78";
      g.fillRect(...P(3.0, 1.2), 1.95 * S, 2.1 * S);
      g.fillStyle = "#a6865f";
      for (let i = 0; i < 260; i++) {
        const [a, b] = P(3.0 + R() * 1.95, 1.2 + R() * 2.1);
        g.fillRect(a, b, 5, 4);
      }
      // The curved street along the front.
      const street: [number, number][] = [
        [-5.2, 2.4],
        [-4.4, 2.95],
        [-2.4, 3.32],
        [0, 3.45],
        [2.4, 3.32],
        [4.4, 2.95],
        [5.2, 2.4],
      ];
      const path = () => {
        g.beginPath();
        street.forEach(([x, z], i) => {
          const [a, b] = P(x, z);
          if (i) g.lineTo(a, b);
          else g.moveTo(a, b);
        });
      };
      g.lineJoin = "round";
      g.strokeStyle = "#cdbf9f";
      g.lineWidth = 0.56 * S;
      path();
      g.stroke();
      g.strokeStyle = "#50555d";
      g.lineWidth = 0.44 * S;
      path();
      g.stroke();
      g.strokeStyle = "#f2efe6";
      g.lineWidth = 3;
      g.setLineDash([18, 14]);
      path();
      g.stroke();
      g.setLineDash([]);
    });
    return { t, X0, Z0, W: 10.24, D: 5.76 };
  })();
  const outline: [number, number][] = [];
  for (let f = -64; f <= 64; f += 16) outline.push([px(f, 4.95), -pz(f, 4.95)]);
  outline.push([4.98, -2.3], [4.55, -3.05], [2.4, -3.55], [0, -3.68], [-2.4, -3.55], [-4.55, -3.05], [-4.98, -2.3]);
  const baseShape = smoothShape(THREE, outline, 8, true);
  const mBase = M("base", 0xa4553a, 0.1, 0.7);
  const mGround = M("base", 0xffffff, 0, 0.9, { map: ground.t });
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: G - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.03, bevelSegments: 2, curveSegments: 6 });
  baseGeo.rotateX(-Math.PI / 2).translate(0, 0.015, 0);
  // The base is its own mesh: it carries the animation driver (always drawn).
  const driver = new THREE.Mesh(baseGeo, mBase);
  driver.frustumCulled = false;
  baseG.add(driver);
  {
    const gg = new THREE.ShapeGeometry(baseShape, 8).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - ground.X0) / ground.W, 1 - (p.getZ(i) - ground.Z0) / ground.D);
    gg.translate(0, G + 0.002, 0);
    put(baseG, mGround, gg);
    baseG.add(contactShadow(THREE, 11.5, 7.2, 0.45));
  }

  // ================================================================ MALL: the cut-open arcade
  const mall = {
    stone: M("mall", 0xf1e7d3, 0.05, 0.55),
    sand: M("mall", 0xd9b98a, 0.05, 0.7),
    gold: M("mall", 0xc8a046, 0.75, 0.3),
    ivory: M("mall", 0xfaf5ea, 0.05, 0.45),
    under: M("mall", 0xe9dfcc, 0.05, 0.6),
    roofGlass: glass("mall", 0x9fd3d6, 0.22),
    rail: glass("mall", 0xcfe8ee, 0.28),
    water: glass("mall", 0x5fb7d6, 0.6),
    dark: M("mall", 0x2a2d33, 0.3, 0.5),
    green: M("mall", 0x4f8a3e, 0, 0.85),
    trunk: M("mall", 0x6a4b33, 0, 0.9),
    lamp: glow("mall", 0xfff3d6, 0xffe2a8, 1.2),
  };
  {
    // Podium with a front step.
    put(baseG, mall.stone, arcSlab(RI - 0.28, RO + 0.14, -52.5, 52.5, G, FL[0]));
    put(baseG, mall.sand, arcSlab(RI - 0.42, RI - 0.28, -50, 50, G, G + 0.04));
    // Floor slabs: first floor has a void over the department store (mezzanine at the back only).
    for (const [f0, f1] of [
      [-52.5, -12],
      [12, 52.5],
    ])
      put(baseG, mall.under, arcSlab(RI, RO + 0.14, f0, f1, FL[1] - SLAB, FL[1]));
    put(baseG, mall.under, arcSlab(3.95, RO + 0.14, -12, 12, FL[1] - SLAB, FL[1]));
    put(baseG, mall.under, arcSlab(3.72, 3.95, 5, 9, FL[1] - SLAB, FL[1])); // escalator landing
    put(baseG, mall.under, arcSlab(RI, RO + 0.14, -52.5, 52.5, FL[2] - SLAB, FL[2]));
    // Gold fascias on the slab edges.
    for (const [f0, f1] of [
      [-52.5, -12],
      [12, 52.5],
    ])
      put(baseG, mall.gold, arcSlab(RI - 0.015, RI, f0, f1, FL[1] - SLAB - 0.01, FL[1] + 0.004));
    put(baseG, mall.gold, arcSlab(RI - 0.015, RI, -52.5, 52.5, FL[2] - SLAB - 0.01, FL[2] + 0.004));
    put(baseG, mall.gold, arcSlab(3.935, 3.95, -12, 5, FL[1] - SLAB - 0.01, FL[1] + 0.004));
    // Glass balustrades + handrails.
    for (const [r, f0, f1, y] of [
      [RI + 0.01, -50, -12, FL[1]],
      [RI + 0.01, 12, 50, FL[1]],
      [3.96, -12, 5, FL[1]],
      [RI + 0.01, -50, 50, FL[2]],
    ] as [number, number, number, number][]) {
      put(baseG, mall.rail, arcSlab(r, r + 0.008, f0, f1, y, y + 0.1));
      put(baseG, mall.gold, arcSlab(r - 0.004, r + 0.012, f0, f1, y + 0.1, y + 0.11));
    }
    // Back wall, end walls, roof.
    put(baseG, mall.sand, arcSlab(RO, RO + 0.14, -52.5, 52.5, FL[0], ROOF));
    for (const [f0, f1] of [
      [-52.5, -50],
      [50, 52.5],
    ])
      put(baseG, mall.stone, arcSlab(RI - 0.06, RO + 0.14, f0, f1, FL[0], ROOF + 0.12));
    put(baseG, mall.roofGlass, arcSlab(RI - 0.04, RO + 0.14, -50, 50, ROOF - 0.03, ROOF));
    for (let f = -48; f <= 48; f += 8) put(baseG, mall.gold, arcSlab(RI - 0.04, RO + 0.14, f - 0.25, f + 0.25, ROOF - 0.03, ROOF + 0.015));
    put(baseG, mall.stone, arcSlab(RO + 0.02, RO + 0.14, -50, 50, ROOF, ROOF + 0.12));
    put(baseG, mall.ivory, arcSlab(RI - 0.08, RI + 0.02, -50, 50, ROOF, ROOF + 0.12));
    put(baseG, mall.gold, arcSlab(RI - 0.085, RI + 0.025, -50, 50, ROOF + 0.12, ROOF + 0.135));
    // Shop partitions (radial walls) per floor.
    for (const [f, k] of [
      [-31, 0],
      [-12, 0],
      [12, 0],
      [-12, 1],
      [12, 1],
      [31, 1],
      [-8, 2],
    ] as [number, number][]) {
      const top = k === 2 ? ROOF - 0.03 : FL[k + 1] - SLAB;
      put(baseG, mall.ivory, arcSlab(RI + 0.04, RO, f - 0.35, f + 0.35, FL[k], top));
    }
    // Slim gold columns along the open front.
    const cols: T.BufferGeometry[] = [];
    for (const f of [-50, -31, 31, 50]) cols.push(cyl(0.03, ROOF - FL[0], px(f, RI + 0.03), FL[0], pz(f, RI + 0.03), 12));
    for (const f of [-12, 12]) cols.push(cyl(0.045, FL[2] - SLAB - FL[0], px(f, RI - 0.02), FL[0], pz(f, RI - 0.02), 14));
    for (const f of [-8]) cols.push(cyl(0.03, ROOF - FL[2], px(f, RI + 0.03), FL[2], pz(f, RI + 0.03), 12));
    put(baseG, mall.gold, ...cols);
    // Shopfront banners on the arcade's two end walls, one per floor (plain words).
    {
      const banner = (text: string, bg: string, fg: string, f: number, k: number, west: boolean) => {
        const y0 = k === 2 ? FL[2] : FL[k],
          y1 = k === 2 ? ROOF : FL[k + 1] - SLAB;
        const m = L.add("mall", std(0xffffff, 0.05, 0.55, { map: sign(text, bg, fg, 512, 192, 64), emissive: 0xffffff, emissiveMap: sign(text, bg, fg, 512, 192, 64), emissiveIntensity: 0.35 }));
        const g = new THREE.PlaneGeometry(1.0, (y1 - y0) * 0.78).rotateY(west ? -Math.PI / 2 : Math.PI / 2).translate(west ? -0.012 : 0.012, (y1 - y0) / 2, 0);
        put(baseG, m, at(g, f, (RI + RO) / 2 + 0.02, y0));
        put(baseG, mall.gold, at(new THREE.BoxGeometry(0.01, (y1 - y0) * 0.84, 1.06).translate(west ? -0.006 : 0.006, (y1 - y0) / 2, 0), f, (RI + RO) / 2 + 0.02, y0));
      };
      banner("FASHION · SHOES", "#93127f", "#ffffff", -52.5, 0, true);
      banner("APPLIANCES", "#1e5f86", "#ffffff", -52.5, 1, true);
      banner("FOOD COURT", "#d96c2b", "#ffffff", -52.5, 2, true);
      banner("GOLD · WATCHES", "#1d2440", "#e8c56a", 52.5, 0, false);
      banner("HOME & SLEEP", "#2a7f7a", "#ffffff", 52.5, 1, false);
      banner("NOW SHOWING", "#9c1f2e", "#ffe6a8", 52.5, 2, false);
    }

    // Plaza: fountain, trees in round planters, lamps, benches.
    put(baseG, mall.stone, lathe(THREE, [[0, 0], [0.46, 0], [0.48, 0.07], [0.43, 0.08], [0.41, 0.03], [0, 0.03]], 40).translate(0, G, 2.05));
    put(baseG, mall.water, cyl(0.41, 0.012, 0, G + 0.04, 2.05, 40));
    put(baseG, mall.stone, cyl(0.04, 0.2, 0, G, 2.05, 12), lathe(THREE, [[0, 0], [0.13, 0], [0.15, 0.04], [0, 0.03]], 24).translate(0, G + 0.2, 2.05));
    for (const [x, z] of [
      [-1.75, 2.75],
      [1.75, 2.75],
      [2.55, 2.45],
    ]) {
      put(baseG, mall.stone, cyl(0.13, 0.07, x, G, z, 20));
      put(baseG, mall.trunk, cyl(0.016, 0.18, x, G + 0.07, z, 6));
      put(baseG, mall.green, new THREE.IcosahedronGeometry(0.13, 1).scale(1, 1.15, 1).translate(x, G + 0.3, z));
    }
    for (const [x, z] of [
      [-1.0, 2.9],
      [1.0, 2.9],
      [-2.95, 2.62],
      [2.95, 2.62],
    ]) {
      put(baseG, mall.dark, cyl(0.008, 0.36, x, G, z, 6));
      put(baseG, mall.lamp, new THREE.SphereGeometry(0.03, 10, 8).translate(x, G + 0.38, z));
    }
    for (const [x, z, ry] of [
      [-0.9, 2.2, 0.2],
      [0.95, 2.25, -0.2],
    ])
      put(baseG, mall.trunk, rb(0.26, 0.035, 0.07, 0.01).rotateY(ry).translate(x, G + 0.05, z));
  }
  // Fountain jet (animated).
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 12, 1, true).translate(0, 0.15, 0), mall.water);
  jet.position.set(0, G + 0.24, 2.05);
  baseG.add(jet);
  // Plaza shoppers.
  people(baseG, "mall", [
    [-0.6, G, 1.5],
    [-0.45, G, 1.58],
    [0.65, G, 1.45],
    [1.3, G, 2.0],
    [-1.4, G, 1.9],
    [-2.0, G, 2.4],
    [2.1, G, 2.4],
    [0.4, G, 2.75],
    [-0.3, G, 2.85],
    [1.6, G, 1.3],
    [-1.2, G, 1.15],
    [2.3, G, 1.1],
  ]);
  // Shoppers' bags (colours of the fashion-store bags).
  {
    const bagG = rb(0.04, 0.05, 0.015, 0.004);
    const bags: Item[] = [
      [-0.57, 1.52],
      [0.69, 1.47],
      [1.34, 2.02],
      [-1.36, 1.92],
      [0.44, 2.77],
      [-1.17, 1.17],
      [2.33, 1.12],
    ].map(([x, z]) => ({ p: [x + 0.02, G + 0.02, z] as Vec3, ry: R() * 3, c: [0xc2185b, 0xe8902a, 0x2e86ab, 0x1f2a36][Math.floor(R() * 4)] }));
    inst(baseG, bagG, M("mall", 0xffffff, 0.05, 0.6), bags);
  }

  // ================================================================ LAYER 0: first floor (home)
  const H = {
    white: M("home", 0xf4f4f1, 0.15, 0.35),
    steel: M("home", 0xc6ccd2, 0.85, 0.25),
    maroon: M("home", 0x7a2433, 0.4, 0.35),
    dark: M("home", 0x23262b, 0.3, 0.45),
    grey: M("home", 0x8d97a1, 0.4, 0.45),
    porthole: glass("home", 0x1d3c5a, 0.75),
    led: glow("home", 0x3fe08a, 0x3fe08a, 1.2),
    inside: glow("home", 0xf4fbff, 0xdff2ff, 0.7),
    shelf: glass("home", 0xdfefff, 0.5),
    wood: M("home", 0xa57a4f, 0.05, 0.55),
    blade: M("home", 0x4a2e1a, 0.1, 0.45),
    bulb: glow("home", 0xfff4d8, 0xffc560, 2.4),
    teal: M("home", 0x2a7f7a, 0.05, 0.7),
    mustard: M("home", 0xd9a22b, 0.05, 0.8, { side: DS }),
    linen: M("home", 0xfbf8f2, 0.02, 0.85),
    blueMat: M("home", 0x5a83b8, 0.02, 0.85),
    sofa: M("home", 0xc8643b, 0.05, 0.8),
    red: M("home", 0xc23a32, 0.3, 0.4),
    jar: glass("home", 0xd7e3ea, 0.55),
    liner1: M("home", 0xdfe8ef, 0.05, 0.6),
    liner2: M("home", 0xf3efe6, 0.05, 0.6),
    liner3: M("home", 0xe6d4bc, 0.05, 0.7),
    floor: M("home", 0xece7de, 0.05, 0.5),
  };
  const fy = FL[1];
  put(homeG, H.floor, arcSlab(RI, RO, -50, -12, fy, fy + 0.004), arcSlab(RI, RO, 12, 50, fy, fy + 0.004));
  put(homeG, H.liner1, arcSlab(RO - 0.012, RO, -50, -12, fy, FL[2] - SLAB));
  put(homeG, H.liner2, arcSlab(RO - 0.012, RO, 12, 31, fy, FL[2] - SLAB));
  put(homeG, H.liner3, arcSlab(RO - 0.012, RO, 31, 50, fy, FL[2] - SLAB));
  // --- Large appliances: fridges (one open), split ACs, front-load washers, an outdoor unit.
  {
    // Open fridge at the west end: cabinet, lit inside, shelves with bottles, door swung out.
    const f = -45,
      r = 4.12;
    put(homeG, H.steel, at(bx(-0.1, 0.1, 0, 0.44, -0.08, -0.06), f, r, fy), at(bx(-0.1, -0.085, 0, 0.44, -0.08, 0.08), f, r, fy), at(bx(0.085, 0.1, 0, 0.44, -0.08, 0.08), f, r, fy), at(bx(-0.1, 0.1, 0.42, 0.44, -0.08, 0.08), f, r, fy), at(bx(-0.1, 0.1, 0, 0.03, -0.08, 0.08), f, r, fy));
    put(homeG, H.inside, at(vPlane(0.17, 0.39, 0, 0.225, -0.058), f, r, fy));
    put(homeG, H.shelf, ...[0.13, 0.23, 0.33].map((y) => at(bx(-0.085, 0.085, y, y + 0.006, -0.06, 0.07), f, r, fy)));
    put(homeG, H.steel, at(bx(0.1, 0.122, 0.0, 0.44, 0.08, 0.26), f, r, fy));
    const bottles: Item[] = [];
    for (const y of [0.136, 0.236, 0.336]) for (let i = 0; i < 5; i++) bottles.push({ p: wpt(f, r, fy, -0.065 + i * 0.032, y, 0.0), c: [0xd94f3a, 0x3fa34d, 0xf2c14e, 0xf4f4f1, 0x2e86ab][(i + Math.round(y * 10)) % 5] });
    inst(homeG, cyl(0.011, 0.055, 0, 0, 0, 8), M("home", 0xffffff, 0.1, 0.4), bottles);
    // Closed double-door fridges.
    for (const [ff, mat] of [
      [-39.5, H.steel],
      [-34.5, H.maroon],
    ] as [number, T.Material][]) {
      put(homeG, mat, at(rb(0.2, 0.44, 0.16, 0.02), ff, r, fy));
      put(homeG, H.dark, at(bx(-0.002, 0.002, 0.02, 0.43, 0.079, 0.083), ff, r, fy));
      put(homeG, H.grey, at(bar(THREE, [-0.012, 0.2, 0.09], [-0.012, 0.33, 0.09], 0.005, 6), ff, r, fy), at(bar(THREE, [0.012, 0.2, 0.09], [0.012, 0.33, 0.09], 0.005, 6), ff, r, fy));
    }
    // Split ACs on the back wall.
    for (const ff of [-29, -23, -17]) {
      put(homeG, H.white, at(rb(0.34, 0.1, 0.085, 0.03), ff, RO - 0.05, fy + 0.3));
      put(homeG, H.dark, at(bx(-0.15, 0.15, 0.008, 0.02, 0.035, 0.045), ff, RO - 0.05, fy + 0.3));
      put(homeG, H.led, at(bx(0.12, 0.135, 0.06, 0.068, 0.04, 0.045), ff, RO - 0.05, fy + 0.3));
    }
    // Front-load washing machines.
    for (const ff of [-31.5, -27, -22.5, -18]) {
      put(homeG, H.white, at(rb(0.17, 0.19, 0.16, 0.015), ff, 3.66, fy));
      put(homeG, H.grey, at(new THREE.TorusGeometry(0.052, 0.01, 8, 24).translate(0, 0.09, 0.08), ff, 3.66, fy));
      put(homeG, H.porthole, at(disc(0.045, 0, 0.09, 0.082), ff, 3.66, fy));
      put(homeG, H.dark, at(bx(-0.07, 0.07, 0.16, 0.175, 0.078, 0.082), ff, 3.66, fy));
    }
    // Outdoor AC unit with its fan grille.
    put(homeG, H.white, at(rb(0.2, 0.15, 0.09, 0.01), -14.5, 4.25, fy));
    put(homeG, H.dark, at(disc(0.055, -0.03, 0.075, 0.046), -14.5, 4.25, fy));
    people(homeG, "home", [wpt(-41, 3.75, fy), wpt(-25, 3.9, fy), wpt(-37, 3.6, fy)]);
  }
  // --- Fans, lights, kitchen appliances.
  const fans: T.Group[] = [];
  {
    const ceil = FL[2] - SLAB;
    for (const f of [21.5]) {
      const [x, , z] = wpt(f, 3.9, 0);
      put(homeG, H.white, bar(THREE, [x, ceil, z], [x, ceil - 0.09, z], 0.006, 6));
      const fan = new THREE.Group();
      fan.position.set(x, ceil - 0.11, z);
      fan.add(new THREE.Mesh(cyl(0.04, 0.035, 0, -0.01, 0, 18), H.white));
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(rb(0.3, 0.012, 0.08, 0.006, 0.19, 0.006, 0), H.blade);
        b.rotation.y = (i * 2 * Math.PI) / 3;
        fan.add(b);
      }
      homeG.add(fan);
      fans.push(fan);
    }
    // Pendant lamps with glowing shades along the front, bulbs and a lit wall of lamps at the back.
    for (const f of [17.5, 25]) {
      const [x, , z] = wpt(f, 3.6, 0);
      put(homeG, H.dark, bar(THREE, [x, ceil, z], [x, ceil - 0.16, z], 0.003, 4));
      put(homeG, H.mustard, new THREE.ConeGeometry(0.06, 0.06, 18, 1, true).translate(x, ceil - 0.19, z));
      put(homeG, H.bulb, new THREE.SphereGeometry(0.03, 12, 10).translate(x, ceil - 0.22, z));
    }
    for (const f of [14, 18.5, 23, 27.5]) {
      const [x, , z] = wpt(f, 4.28, 0);
      put(homeG, H.dark, bar(THREE, [x, ceil, z], [x, ceil - 0.14, z], 0.003, 4));
      put(homeG, H.bulb, new THREE.SphereGeometry(0.028, 10, 8).translate(x, ceil - 0.16, z));
    }
    const lampWall = tex(256, 64, (g, w, h) => {
      g.fillStyle = "#3a3632";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++)
        for (let j = 0; j < 4; j++) {
          const gr = g.createRadialGradient(8 + i * 16, 8 + j * 16, 1, 8 + i * 16, 8 + j * 16, 7);
          gr.addColorStop(0, "#fffbe8");
          gr.addColorStop(1, (i + j) % 3 ? "#f0c060" : "#9ad0ff");
          g.fillStyle = gr;
          g.beginPath();
          g.arc(8 + i * 16, 8 + j * 16, 5, 0, Math.PI * 2);
          g.fill();
        }
    });
    lampWall.wrapS = THREE.RepeatWrapping;
    lampWall.repeat.set(-1, 1);
    lampWall.offset.set(1, 0);
    put(homeG, L.add("home", std(0xffffff, 0, 0.5, { map: lampWall, emissive: 0xffffff, emissiveMap: lampWall, emissiveIntensity: 0.9, side: DS })), arcSurf(RO - 0.02, 13, 30, fy + 0.14, fy + 0.34));
    // Display counter with pressure cookers and mixer-grinders.
    put(homeG, H.wood, arcSlab(3.6, 3.78, 14, 28, fy, fy + 0.15));
    for (const f of [15.5, 18.5, 21.5]) {
      put(homeG, H.steel, at(lathe(THREE, [[0, 0], [0.042, 0], [0.047, 0.01], [0.047, 0.055], [0.04, 0.066], [0, 0.066]], 20), f, 3.69, fy + 0.15));
      put(homeG, H.dark, at(bx(0, 0.085, 0.066, 0.076, -0.008, 0.008), f, 3.69, fy + 0.15), at(cyl(0.008, 0.018, 0, 0.066, 0, 8), f, 3.69, fy + 0.15));
    }
    for (const [f, mat] of [
      [24.5, H.red],
      [27, H.white],
    ] as [number, T.Material][]) {
      put(homeG, mat, at(rb(0.065, 0.055, 0.065, 0.01), f, 3.69, fy + 0.15));
      put(homeG, H.jar, at(cyl(0.024, 0.075, 0, 0.055, 0, 14, 0.03), f, 3.69, fy + 0.15));
      put(homeG, H.dark, at(cyl(0.031, 0.012, 0, 0.13, 0, 14), f, 3.69, fy + 0.15));
    }
    // Two big pedestal fans at the front of the floor, caged faces to the plaza.
    for (const [f, ry] of [
      [13.9, 0.45],
      [29.4, -0.45],
    ]) {
      const r = 3.52;
      put(homeG, H.white, at(cyl(0.06, 0.012, 0, 0, 0, 18), f, r, fy), at(bar(THREE, [0, 0, 0], [0, 0.3, 0], 0.008, 6), f, r, fy), at(cyl(0.035, 0.05, 0, 0.32, -0.035, 12).rotateX(Math.PI / 2).translate(0, 0.0, 0), f, r, fy, ry));
      put(homeG, H.grey, at(new THREE.TorusGeometry(0.095, 0.006, 6, 28).translate(0, 0.36, 0.02), f, r, fy, ry));
      const spokes: T.BufferGeometry[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        spokes.push(at(bar(THREE, [0, 0.36, 0.022], [Math.cos(a) * 0.095, 0.36 + Math.sin(a) * 0.095, 0.022], 0.0025, 3), f, r, fy, ry));
      }
      put(homeG, H.grey, ...spokes);
      const blades: T.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) blades.push(at(new THREE.CircleGeometry(0.075, 12, (i * 2 * Math.PI) / 3, 1.2).translate(0, 0.36, 0.012), f, r, fy, ry));
      put(homeG, H.blueMat, ...blades);
    }
    people(homeG, "home", [wpt(19, 3.55, fy), wpt(25, 4.05, fy)]);
  }
  // --- Home textiles, mattresses, furniture.
  {
    const f = 38,
      r = 4.12;
    put(homeG, H.teal, at(rb(0.46, 0.26, 0.04, 0.015, 0, 0, -0.28), f, r, fy));
    put(homeG, H.wood, at(rb(0.46, 0.07, 0.56, 0.015), f, r, fy));
    put(homeG, H.linen, at(rb(0.44, 0.075, 0.54, 0.025, 0, 0.065, 0), f, r, fy));
    put(homeG, H.mustard, at(rb(0.45, 0.022, 0.3, 0.008, 0, 0.13, 0.12), f, r, fy));
    put(homeG, H.linen, at(rb(0.17, 0.045, 0.09, 0.02, -0.1, 0.135, -0.2), f, r, fy), at(rb(0.17, 0.045, 0.09, 0.02, 0.1, 0.135, -0.2), f, r, fy));
    // Mattress stack.
    for (let i = 0; i < 4; i++) put(homeG, i % 2 ? H.blueMat : H.linen, at(rb(0.3, 0.055, 0.4, 0.02, 0, i * 0.057, 0), 32.8, 4.1, fy, 0.08 * (i - 1.5)));
    // L-shaped sofa with cushions.
    {
      const sf = 45.5,
        sr = 3.72;
      put(homeG, H.sofa, at(rb(0.42, 0.07, 0.17, 0.025), sf, sr, fy), at(rb(0.42, 0.11, 0.05, 0.02, 0, 0.06, -0.075), sf, sr, fy), at(rb(0.05, 0.1, 0.17, 0.02, -0.21, 0.04, 0), sf, sr, fy), at(rb(0.16, 0.07, 0.2, 0.025, 0.14, 0, 0.17), sf, sr, fy));
      put(homeG, H.mustard, at(rb(0.08, 0.07, 0.03, 0.012, -0.1, 0.08, -0.04), sf, sr, fy, 0.2));
      put(homeG, H.teal, at(rb(0.08, 0.07, 0.03, 0.012, 0.08, 0.08, -0.04), sf, sr, fy, -0.2));
    }
    // Linen and towel shelves.
    {
      const sf = 47.5,
        sr = RO - 0.1;
      put(homeG, H.wood, ...[0, 0.12, 0.24, 0.36].map((y) => at(bx(-0.17, 0.17, y, y + 0.012, -0.08, 0.08), sf, sr, fy)));
      const towels: Item[] = [];
      for (const y of [0.012, 0.132, 0.252])
        for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) towels.push({ p: wpt(sf, sr, fy, -0.12 + i * 0.08, y + k * 0.03, 0), ry: -sf * D2R, c: [0xd04f7a, 0x2e86ab, 0xf2c14e, 0xfaf5ea, 0x3d6b4f, 0xe8902a][(i + k * 2) % 6] });
      inst(homeG, rb(0.07, 0.028, 0.13, 0.008), M("home", 0xffffff, 0.02, 0.85), towels);
    }
    put(homeG, H.bulb, at(new THREE.SphereGeometry(0.03, 10, 8).translate(0.3, 0.2, -0.2), 38, 4.12, fy));
    people(homeG, "home", [wpt(42, 3.6, fy)]);
  }
  // Signs.
  {
    const ys = FL[2] - SLAB - 0.06;
    put(homeG, signMat("home", sign("APPLIANCES", "#1e5f86", "#ffffff", 256, 48, 28)), at(vPlane(0.62, 0.1, 0, 0, 0), -31, RI + 0.03, ys));
    put(homeG, signMat("home", sign("FANS · LIGHTS · KITCHEN", "#1e5f86", "#ffffff", 384, 48, 26)), at(vPlane(0.7, 0.09, 0, 0, 0), 21.5, RI + 0.03, ys));
    put(homeG, signMat("home", sign("HOME & SLEEP", "#1e5f86", "#ffffff", 256, 48, 28)), at(vPlane(0.55, 0.09, 0, 0, 0), 40.5, RI + 0.03, ys));
  }

  // ================================================================ LAYER 1: ground floor (wear) + mill
  const W = {
    mannequin: M("wear", 0xf2efe9, 0.05, 0.45),
    magenta: M("wear", 0xb5179e, 0.05, 0.7),
    saffron: M("wear", 0xe8902a, 0.05, 0.7),
    indigo: M("wear", 0x2d3f8c, 0.05, 0.7),
    chrome: M("wear", 0xc6ccd2, 0.85, 0.25),
    wood: M("wear", 0xb98c5e, 0.05, 0.55),
    walnut: M("wear", 0x6b4a32, 0.05, 0.6),
    teal: M("wear", 0x2a7f7a, 0.05, 0.6),
    orange: M("wear", 0xe0702a, 0.1, 0.6),
    white: M("wear", 0xf6f4ef, 0.05, 0.5),
    red: M("wear", 0xd1343a, 0.1, 0.45),
    navy: M("wear", 0x1d2440, 0.05, 0.75),
    gold: M("wear", 0xd8ad45, 0.9, 0.22, { emissive: 0x6a4a10, emissiveIntensity: 0.4 }),
    darkWood: M("wear", 0x3b2417, 0.1, 0.5),
    caseGlow: L.add("wear", std(0xfff3d6, 0, 0.2, { emissive: 0xffd68a, emissiveIntensity: 0.85, opacity: 0.55, side: DS, depthWrite: false })),
    vitrine: glow("wear", 0xfff0d0, 0xffd27a, 0.9),
    crystal: glow("wear", 0xffffff, 0xfff1c8, 1.5),
    face: glow("wear", 0xffffff, 0xf4f4f4, 0.35),
    dark: M("wear", 0x1c1d20, 0.2, 0.5),
    blush: M("wear", 0xf2d7d5, 0.05, 0.7),
    floorA: M("wear", 0xf6eeea, 0.05, 0.5),
    floorS: M("wear", 0xe7dccb, 0.05, 0.6),
    floorJ: M("wear", 0x3a2f2a, 0.3, 0.3),
    brick: M("wear", 0xa64b32, 0.05, 0.85),
    vault: M("wear", 0x8f9aa3, 0.5, 0.45, { side: DS }),
    machine: M("wear", 0x4f7f6a, 0.3, 0.45),
    bobbin: M("wear", 0xfaf7ef, 0.05, 0.7),
    cotton: M("wear", 0xf4f1ea, 0.02, 0.95),
    strap: M("wear", 0x7a6a55, 0.1, 0.6),
    concrete: M("wear", 0xd9d4ca, 0.05, 0.8),
  };
  const gy = FL[0];
  const gCeil = FL[1] - SLAB;
  put(wearG, W.floorA, arcSlab(RI, RO, -50, -31, gy, gy + 0.004));
  put(wearG, W.floorS, arcSlab(RI, RO, -31, -12, gy, gy + 0.004));
  put(wearG, W.floorJ, arcSlab(RI, RO, 12, 50, gy, gy + 0.004));
  put(wearG, W.blush, arcSlab(RO - 0.012, RO, -50, -31, gy, gCeil));
  put(wearG, W.walnut, arcSlab(RO - 0.012, RO, -31, -12, gy, gCeil));
  put(wearG, W.navy, arcSlab(RO - 0.012, RO, 12, 50, gy, gCeil));
  put(wearG, W.gold, arcSlab(RO - 0.02, RO - 0.01, 12, 50, gCeil - 0.06, gCeil - 0.05));
  // --- Apparel: mannequins, racks, innerwear wall.
  const mannequin = (parent: T.Object3D, f: number, r: number, y: number, dress: T.Material, body: T.Material) => {
    put(parent, body, at(cyl(0.05, 0.01, 0, 0, 0, 16), f, r, y), at(bar(THREE, [0, 0, 0], [0, 0.09, 0], 0.005, 6), f, r, y));
    put(parent, dress, at(lathe(THREE, [[0, 0.08], [0.066, 0.08], [0.05, 0.21], [0.04, 0.25], [0.05, 0.32], [0.05, 0.35], [0.02, 0.37], [0, 0.372]], 18), f, r, y));
    put(parent, body, at(new THREE.SphereGeometry(0.025, 12, 10).translate(0, 0.41, 0), f, r, y), at(bar(THREE, [0, 0.36, 0], [0, 0.39, 0], 0.01, 6), f, r, y));
    put(parent, dress, at(bar(THREE, [-0.05, 0.34, 0], [-0.07, 0.22, 0.01], 0.011, 6), f, r, y), at(bar(THREE, [0.05, 0.34, 0], [0.07, 0.22, 0.01], 0.011, 6), f, r, y));
  };
  mannequin(wearG, -46.5, 3.64, gy, W.saffron, W.mannequin);
  mannequin(wearG, -42, 3.62, gy, W.magenta, W.mannequin);
  mannequin(wearG, -37.5, 3.64, gy, W.indigo, W.mannequin);
  const garmentGeo = bx(-0.004, 0.004, -0.17, 0, -0.05, 0.05);
  const garments: Item[] = [];
  const GARMENT = [0xb5179e, 0x2d3f8c, 0xe8902a, 0xf6f4ef, 0x3d6b4f, 0xd04f7a, 0x1f2a36, 0x5c8fb8, 0xc0392b];
  const rack = (parent: T.Object3D, mat: T.Material, f: number, r: number, y: number, n = 9, half = 0.2) => {
    put(parent, mat, at(bar(THREE, [-half, 0.32, 0], [half, 0.32, 0], 0.006, 6), f, r, y), at(bar(THREE, [-half, 0, 0], [-half, 0.32, 0], 0.006, 6), f, r, y), at(bar(THREE, [half, 0, 0], [half, 0.32, 0], 0.006, 6), f, r, y));
    for (let i = 0; i < n; i++) garments.push({ p: wpt(f, r, y, -half + 0.03 + (i * (2 * half - 0.06)) / (n - 1), 0.315, 0), ry: -f * D2R, c: GARMENT[Math.floor(R() * GARMENT.length)] });
  };
  rack(wearG, W.chrome, -46, 4.12, gy);
  rack(wearG, W.chrome, -36, 4.12, gy);
  {
    // Innerwear wall: shelves of folded packs.
    const f = -41,
      r = RO - 0.06;
    put(wearG, W.wood, ...[0.06, 0.18, 0.3, 0.42].map((y) => at(bx(-0.15, 0.15, y, y + 0.01, -0.05, 0.05), f, r, gy)));
    const packs: Item[] = [];
    for (const y of [0.07, 0.19, 0.31, 0.43]) for (let i = 0; i < 6; i++) packs.push({ p: wpt(f, r, gy, -0.125 + i * 0.05, y, 0), ry: -f * D2R, c: [0xf6f4ef, 0x1f2a36, 0xd04f7a, 0x5c8fb8, 0x4a4a52, 0xe0b23a][(i + Math.round(y * 10)) % 6] });
    inst(wearG, rb(0.042, 0.05, 0.07, 0.006), M("wear", 0xffffff, 0.02, 0.8), packs);
  }
  people(wearG, "wear", [wpt(-44, 3.85, gy), wpt(-39, 4.0, gy)]);
  // --- Footwear: shoe wall, benches, box stacks, a giant sneaker.
  const shoeGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-0.045, 0);
    s.lineTo(0.045, 0);
    s.quadraticCurveTo(0.054, 0.012, 0.04, 0.02);
    s.lineTo(0.012, 0.028);
    s.lineTo(-0.018, 0.042);
    s.lineTo(-0.044, 0.042);
    s.quadraticCurveTo(-0.05, 0.02, -0.045, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -0.014);
    g.computeVertexNormals();
    return g;
  })();
  {
    const shelves: T.BufferGeometry[] = [];
    const shoes: Item[] = [];
    const SHOE = [0x1f2a36, 0xd1343a, 0xf6f4ef, 0x8a5a33, 0x2e86ab, 0xe0b23a, 0x3d6b4f, 0x4a4a52, 0xd04f7a];
    for (const y of [0.06, 0.15, 0.24, 0.33, 0.42]) {
      shelves.push(arcSlab(RO - 0.11, RO - 0.012, -29.5, -13.5, gy + y, gy + y + 0.008));
      for (let f = -28.6; f <= -14.2; f += 1.6) shoes.push({ p: wpt(f, RO - 0.065, gy + y + 0.008), ry: -f * D2R, c: SHOE[Math.floor(R() * SHOE.length)], s: [0.8, 0.8, 0.8] });
    }
    put(wearG, W.wood, ...shelves);
    inst(wearG, shoeGeo, M("wear", 0xffffff, 0.05, 0.55), shoes);
    put(wearG, W.teal, at(rb(0.24, 0.05, 0.09, 0.015), -27, 3.92, gy), at(rb(0.24, 0.05, 0.09, 0.015), -16, 3.92, gy));
    put(wearG, W.orange, ...[0, 1, 2, 3].map((i) => at(rb(0.1, 0.044, 0.065, 0.004, 0, i * 0.046, 0), -14.3, 3.72, gy, 0.15 * (i % 2))));
    // Giant sneaker on a round plinth, shown side-on.
    const f = -21.5,
      r = 3.6;
    put(wearG, W.white, at(cyl(0.13, 0.05, 0, 0, 0, 24), f, r, gy));
    put(wearG, W.red, at(shoeGeo.clone().scale(3.2, 3.2, 3.2).translate(0, 0.075, 0), f, r, gy, 0.25));
    put(wearG, W.white, at(bx(-0.15, 0.155, 0.05, 0.075, -0.055, 0.055), f, r, gy, 0.25));
    put(wearG, W.white, at(bar(THREE, [-0.02, 0.15, 0.058], [0.05, 0.12, 0.058], 0.006, 4), f, r, gy, 0.25), at(bar(THREE, [-0.03, 0.17, 0.058], [0.03, 0.14, 0.058], 0.006, 4), f, r, gy, 0.25));
    people(wearG, "wear", [wpt(-25, 4.05, gy), wpt(-18, 3.95, gy)]);
  }
  // --- Jewellery & watches: lit counters, wall vitrines, chandelier, watch counter, giant wall watch.
  {
    for (const f of [18, 25, 32, 38.5]) {
      put(wearG, W.darkWood, at(rb(0.3, 0.13, 0.13, 0.012), f, 3.8, gy));
      put(wearG, W.gold, at(bx(-0.152, 0.152, 0.13, 0.136, -0.067, 0.067), f, 3.8, gy));
      put(wearG, W.caseGlow, at(bx(-0.145, 0.145, 0.136, 0.2, -0.06, 0.06), f, 3.8, gy));
      put(wearG, W.gold, ...[-0.09, -0.03, 0.03, 0.09].map((x) => at(new THREE.TorusGeometry(0.02, 0.004, 6, 16).rotateX(-Math.PI / 2.6).translate(x, 0.155, 0), f, 3.8, gy)));
    }
    for (const f of [16.5, 23, 29.5, 36]) {
      put(wearG, W.darkWood, at(bx(-0.16, 0.16, 0.12, 0.46, -0.03, -0.022), f, RO - 0.03, gy));
      put(wearG, W.vitrine, at(vPlane(0.28, 0.3, 0, 0.29, -0.02), f, RO - 0.03, gy));
      put(wearG, W.gold, at(new THREE.TorusGeometry(0.07, 0.006, 6, 24, Math.PI).rotateZ(Math.PI).translate(0, 0.38, -0.012), f, RO - 0.03, gy), at(new THREE.TorusGeometry(0.05, 0.005, 6, 20, Math.PI).rotateZ(Math.PI).translate(0, 0.25, -0.012), f, RO - 0.03, gy));
    }
    // Chandelier.
    {
      const [x, , z] = wpt(27, 4.0, 0);
      put(wearG, W.gold, bar(THREE, [x, gCeil, z], [x, gCeil - 0.08, z], 0.004, 4), new THREE.TorusGeometry(0.09, 0.006, 6, 24).rotateX(Math.PI / 2).translate(x, gCeil - 0.09, z));
      const drops: T.BufferGeometry[] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        drops.push(new THREE.SphereGeometry(0.014, 8, 6).translate(x + Math.cos(a) * 0.09, gCeil - 0.105, z + Math.sin(a) * 0.09));
      }
      drops.push(new THREE.ConeGeometry(0.035, 0.08, 10).rotateX(Math.PI).translate(x, gCeil - 0.13, z));
      put(wearG, W.crystal, ...drops);
    }
    // Watch counter: a round glass drum with watches on a stand.
    {
      const f = 43.5,
        r = 3.98;
      put(wearG, W.darkWood, at(cyl(0.12, 0.13, 0, 0, 0, 24), f, r, gy));
      put(wearG, W.caseGlow, at(cyl(0.11, 0.07, 0, 0.13, 0, 24), f, r, gy));
      put(wearG, W.gold, at(cyl(0.122, 0.006, 0, 0.2, 0, 24), f, r, gy));
      const faces: T.BufferGeometry[] = [];
      const straps: T.BufferGeometry[] = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const cx = Math.cos(a) * 0.065,
          cz = Math.sin(a) * 0.065;
        faces.push(at(cyl(0.016, 0.006, cx, 0.165, cz, 14), f, r, gy));
        straps.push(at(bx(cx - 0.006, cx + 0.006, 0.155, 0.163, cz - 0.03, cz + 0.03), f, r, gy));
      }
      put(wearG, W.face, ...faces);
      put(wearG, W.dark, ...straps);
    }
    // Giant wristwatch standing at the showroom front, face to the plaza.
    {
      const f = 47.5,
        r = 3.6;
      put(wearG, W.darkWood, at(cyl(0.1, 0.04, 0, 0, 0, 24), f, r, gy));
      put(wearG, W.walnut, at(rb(0.08, 0.4, 0.025, 0.01, 0, 0.04, 0), f, r, gy, -0.35));
      put(wearG, W.gold, at(cyl(0.1, 0.035, 0, 0, 0, 32).rotateX(Math.PI / 2).translate(0, 0.24, 0.025), f, r, gy, -0.35), at(cyl(0.015, 0.03, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(0.115, 0.24, 0.025), f, r, gy, -0.35));
      put(wearG, W.face, at(disc(0.085, 0, 0.24, 0.044, 32), f, r, gy, -0.35));
      put(wearG, W.dark, at(bx(-0.005, 0.005, 0.24, 0.31, 0.046, 0.05), f, r, gy, -0.35), at(bx(0, 0.055, 0.236, 0.244, 0.046, 0.05), f, r, gy, -0.35));
      const ticks: T.BufferGeometry[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ticks.push(at(bx(-0.004, 0.004, -0.01, 0.01, 0.045, 0.048).rotateZ(-a).translate(Math.sin(a) * 0.072, 0.24 + Math.cos(a) * 0.072, 0), f, r, gy, -0.35));
      }
      put(wearG, W.gold, ...ticks);
    }
    // Giant watch on the back wall.
    {
      const f = 44.5,
        r = RO - 0.03,
        y = gy + 0.32;
      put(wearG, W.walnut, at(bx(-0.04, 0.04, -0.24, 0.24, -0.01, 0.0), f, r, y));
      put(wearG, W.face, at(disc(0.11, 0, 0, 0.012, 32), f, r, y));
      put(wearG, W.gold, at(new THREE.TorusGeometry(0.115, 0.012, 8, 36).translate(0, 0, 0.01), f, r, y));
      put(wearG, W.dark, at(bx(-0.004, 0.004, 0, 0.085, 0.014, 0.018), f, r, y), at(bx(0, 0.065, -0.004, 0.004, 0.014, 0.018), f, r, y, 0));
      const ticks: T.BufferGeometry[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ticks.push(at(bx(-0.004, 0.004, -0.012, 0.012, 0.013, 0.016).rotateZ(-a).translate(Math.sin(a) * 0.092, Math.cos(a) * 0.092, 0), f, r, y));
      }
      put(wearG, W.gold, ...ticks);
    }
    people(wearG, "wear", [wpt(21, 3.6, gy), wpt(28.5, 3.62, gy), wpt(35, 4.1, gy), wpt(42, 3.6, gy)]);
  }
  // Ground-floor signs.
  {
    const ys = gCeil - 0.06;
    put(wearG, signMat("wear", sign("FASHION", "#93127f", "#ffffff", 256, 48, 30)), at(vPlane(0.5, 0.09, 0, 0, 0), -40.5, RI + 0.03, ys));
    put(wearG, signMat("wear", sign("FOOTWEAR", "#93127f", "#ffffff", 256, 48, 30)), at(vPlane(0.5, 0.09, 0, 0, 0), -21.5, RI + 0.03, ys));
    put(wearG, signMat("wear", sign("JEWELLERY & WATCHES", "#1d2440", "#e8c56a", 384, 48, 28)), at(vPlane(0.9, 0.1, 0, 0, 0), 31, RI + 0.03, ys));
  }
  // --- Textile mill (front-west corner): twin barrel vaults, chimney, spinning frame, loom, yarn.
  let shuttle: T.Mesh | null = null;
  let convoy: T.Group | null = null;
  {
    const z0 = 1.45,
      z1 = 2.45,
      wallH = 0.26;
    const bays: [number, number][] = [
      [-4.72, -4.02],
      [-3.98, -3.28],
    ];
    put(wearG, W.concrete, bx(-4.76, -3.24, G, G + 0.02, z0, z1));
    put(wearG, W.brick, bx(-4.76, -3.24, G, G + wallH + 0.34, z0 - 0.06, z0), bx(-4.76, -4.7, G, G + wallH, z0, z1), bx(-3.3, -3.24, G, G + wallH, z0, z1 - 0.55));
    for (const [x0, x1] of bays) {
      const rad = (x1 - x0) / 2;
      const v = new THREE.CylinderGeometry(rad, rad, z1 - z0, 20, 1, true, -Math.PI / 2, Math.PI);
      v.rotateX(Math.PI / 2).translate((x0 + x1) / 2, G + wallH, (z0 + z1) / 2);
      put(wearG, W.vault, v);
      // Front arch rib.
      put(wearG, W.brick, new THREE.TorusGeometry(rad, 0.018, 6, 20, Math.PI).translate((x0 + x1) / 2, G + wallH, z1));
      put(wearG, W.brick, bx(x0, x0 + 0.04, G, G + wallH, z1 - 0.04, z1), bx(x1 - 0.04, x1, G, G + wallH, z1 - 0.04, z1));
    }
    // Chimney.
    put(wearG, W.brick, lathe(THREE, [[0.11, 0], [0.09, 0.9], [0.075, 1.5], [0.09, 1.52], [0.09, 1.58], [0.07, 1.58]], 16).translate(-4.55, G, 1.3));
    put(wearG, W.dark, cyl(0.072, 0.02, -4.55, G + 1.56, 1.3, 16));
    // Ring-spinning frame in the west vault: a long frame with rows of spindles and white bobbins.
    put(wearG, W.machine, bx(-4.47, -4.27, G + 0.02, G + 0.13, 1.6, 2.38));
    put(wearG, W.chrome, bx(-4.5, -4.24, G + 0.13, G + 0.14, 1.6, 2.38), bx(-4.5, -4.24, G + 0.29, G + 0.3, 1.6, 2.38));
    const bob: T.BufferGeometry[] = [];
    for (let i = 0; i < 11; i++)
      for (const sx of [-4.46, -4.28]) {
        const z = 1.64 + i * 0.07;
        bob.push(lathe(THREE, [[0.004, 0], [0.02, 0.012], [0.024, 0.08], [0.009, 0.115], [0.004, 0.13]], 10).translate(sx, G + 0.14, z));
      }
    put(wearG, W.bobbin, ...bob);
    // Loom in the east vault: warp beam, the warp shed opening in a V, cloth roll, a shuttle.
    {
      const x0 = -3.85,
        x1 = -3.41,
        yb = G + 0.18,
        zb = 1.65,
        zf = 2.3;
      const frame: T.BufferGeometry[] = [];
      for (const x of [x0 - 0.02, x1 + 0.02])
        for (const z of [zb - 0.04, zf + 0.04]) frame.push(bx(x - 0.012, x + 0.012, G + 0.02, G + 0.3, z - 0.012, z + 0.012));
      frame.push(bx(x0 - 0.035, x1 + 0.035, G + 0.28, G + 0.31, zb + 0.18, zb + 0.22)); // heddle beam
      put(wearG, W.walnut, ...frame);
      put(wearG, W.chrome, hcyl(0.045, x1 - x0 + 0.04, (x0 + x1) / 2, yb, zb, "x", 14));
      const cloth = tex(64, 64, (g, w, h) => {
        const cs = ["#b5179e", "#2d3f8c", "#e8902a", "#f6f4ef"];
        for (let i = 0; i < 16; i++) {
          g.fillStyle = cs[i % 4];
          g.fillRect(0, (i * h) / 16, w, h / 16 + 1);
        }
        g.fillStyle = "rgba(255,255,255,0.25)";
        for (let i = 0; i < 8; i++) g.fillRect((i * w) / 8, 0, 2, h);
      });
      put(wearG, L.add("wear", std(0xffffff, 0.02, 0.85, { map: cloth })), hcyl(0.07, x1 - x0, (x0 + x1) / 2, yb - 0.02, zf + 0.02, "x", 18));
      // Warp threads: upper and lower sheds meet at the cloth (fell) and part at the heddles.
      const warp: T.BufferGeometry[] = [];
      const warpB: T.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) {
        const x = x0 + 0.02 + (i * (x1 - x0 - 0.04)) / 13;
        const up = i % 2 === 0;
        const midY = up ? yb + 0.06 : yb - 0.02;
        const pts: Vec3[] = [
          [x, yb + 0.03, zb],
          [x, midY, zb + 0.2],
          [x, yb + 0.03, zf - 0.08],
          [x, yb + 0.03, zf - 0.04],
        ];
        (up ? warp : warpB).push(tube(THREE, pts, 0.004, 4, false, 12));
      }
      put(wearG, W.magenta, ...warp);
      put(wearG, W.bobbin, ...warpB);
      const sh = new THREE.Mesh(lathe(THREE, [[0, -0.05], [0.012, -0.03], [0.014, 0], [0.012, 0.03], [0, 0.05]], 10).rotateZ(Math.PI / 2), W.orange);
      sh.position.set((x0 + x1) / 2, yb + 0.03, zb + 0.2);
      wearG.add(sh);
      shuttle = sh;
    }
    // Yarn-cone pyramids on pallets and cotton bales in the yard.
    const coneGeo = lathe(THREE, [[0.008, 0], [0.034, 0], [0.03, 0.02], [0.016, 0.075], [0.008, 0.08]], 12);
    const cones: Item[] = [];
    const YARN = [0xb5179e, 0xe8b02a, 0x2a9d8f, 0xd1343a, 0x2d3f8c, 0xf6f4ef, 0xe8702a];
    for (const [cx, cz] of [
      [-3.8, 2.68],
      [-3.35, 2.6],
    ]) {
      put(wearG, W.wood, bx(cx - 0.2, cx + 0.2, G, G + 0.03, cz - 0.12, cz + 0.12));
      for (let lvl = 0; lvl < 3; lvl++) {
        const n = 5 - lvl;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < 3 - (lvl > 1 ? 1 : 0); j++)
            cones.push({ p: [cx - ((n - 1) * 0.07) / 2 + i * 0.07, G + 0.03 + lvl * 0.075, cz - 0.07 + j * 0.07 + lvl * 0.02], c: YARN[(i + j * 2 + lvl) % YARN.length] });
      }
    }
    inst(wearG, coneGeo, M("wear", 0xffffff, 0.05, 0.75), cones);
    for (const [x, z, ry] of [
      [-4.5, 2.6, 0.1],
      [-4.48, 2.82, -0.15],
      [-4.22, 2.75, 0.3],
    ]) {
      put(wearG, W.cotton, rb(0.2, 0.15, 0.14, 0.02).rotateY(ry).translate(x, G, z));
      put(wearG, W.strap, ...[-0.06, 0, 0.06].map((d) => bx(-0.005, 0.005, 0, 0.152, -0.072, 0.072).translate(d, 0, 0).rotateY(ry).translate(x, G, z)));
    }
    // Fabric on its way to the arcade: a cart of fabric bolts and a wheeled garment rack (animated).
    {
      const g = new THREE.Group();
      const deck = [rb(0.34, 0.025, 0.18, 0.006, 0, 0.035, 0), bar(THREE, [-0.17, 0.06, -0.09], [-0.17, 0.2, -0.09], 0.006, 4), bar(THREE, [-0.17, 0.06, 0.09], [-0.17, 0.2, 0.09], 0.006, 4), bar(THREE, [-0.17, 0.2, -0.09], [-0.17, 0.2, 0.09], 0.006, 4)];
      g.add(new THREE.Mesh(mergeInto(THREE, deck), W.walnut));
      const wheels: T.BufferGeometry[] = [];
      for (const [wx, wz] of [[0.12, 0.08], [0.12, -0.08], [-0.12, 0.08], [-0.12, -0.08], [-0.42, 0.07], [-0.42, -0.07], [-0.62, 0.07], [-0.62, -0.07]]) wheels.push(hcyl(0.02, 0.012, wx, 0.02, wz, "z", 10));
      g.add(new THREE.Mesh(mergeInto(THREE, wheels), W.dark));
      const bolts: Item[] = [];
      const BOLT = [0xb5179e, 0xe8b02a, 0x2a9d8f, 0xd1343a, 0x2d3f8c];
      for (let i = 0; i < 5; i++) bolts.push({ p: [-0.11 + (i % 3) * 0.075 + (i > 2 ? 0.037 : 0), 0.08 + (i > 2 ? 0.065 : 0), 0], c: BOLT[i] });
      inst(g, hcyl(0.035, 0.17, 0, 0, 0, "z", 14), M("wear", 0xffffff, 0.02, 0.8), bolts);
      // Rack behind the cart.
      g.add(new THREE.Mesh(mergeInto(THREE, [bar(THREE, [-0.68, 0.04, 0], [-0.68, 0.3, 0], 0.006, 4), bar(THREE, [-0.36, 0.04, 0], [-0.36, 0.3, 0], 0.006, 4), bar(THREE, [-0.68, 0.3, 0], [-0.36, 0.3, 0], 0.006, 4), bar(THREE, [-0.68, 0.04, -0.07], [-0.68, 0.04, 0.07], 0.006, 4), bar(THREE, [-0.36, 0.04, -0.07], [-0.36, 0.04, 0.07], 0.006, 4)]), W.chrome));
      const hung: Item[] = [];
      for (let i = 0; i < 7; i++) hung.push({ p: [-0.65 + i * 0.045, 0.295, 0], ry: Math.PI / 2, c: GARMENT[i % GARMENT.length] });
      inst(g, bx(-0.004, 0.004, -0.17, 0, -0.05, 0.05), M("wear", 0xffffff, 0.02, 0.8), hung);
      g.position.set(-2.85, G, 2.25);
      g.rotation.y = 0.75;
      wearG.add(g);
      convoy = g;
    }
    put(wearG, signMat("wear", sign("TEXTILE MILL", "#7a2f1f", "#ffffff", 256, 48, 30)), vPlane(0.6, 0.11, -4.0, G + 0.45, z0 - 0.055));
    people(wearG, "wear", [[-4.2, G, 2.0], [-3.5, G, 2.55], [-3.95, G, 2.65]]);
  }

  // ================================================================ LAYER 2: department store + food court
  const S = {
    cream: M("stores", 0xf5efe4, 0.05, 0.6),
    marble: M("stores", 0xf0ebe3, 0.15, 0.3),
    chrome: M("stores", 0xc6ccd2, 0.85, 0.25),
    steel: M("stores", 0x7d8791, 0.6, 0.35),
    step: M("stores", 0x3b4048, 0.5, 0.4),
    glassS: glass("stores", 0xcfe8ee, 0.35),
    black: M("stores", 0x1c1d20, 0.2, 0.5),
    magenta: M("stores", 0xc2185b, 0.1, 0.5),
    orange: M("stores", 0xe8702a, 0.1, 0.5),
    teal: M("stores", 0x2a9d8f, 0.1, 0.5),
    white: M("stores", 0xfaf8f3, 0.1, 0.4),
    mannequin: M("stores", 0xf2efe9, 0.05, 0.45),
    gown: M("stores", 0x1f6f78, 0.05, 0.7),
    suit: M("stores", 0x2b2f3a, 0.05, 0.7),
    counterGlow: glow("stores", 0xfff6ea, 0xfff0d8, 0.7),
    brickRed: M("stores", 0x9c3b2a, 0.05, 0.8),
    tile: M("stores", 0xe9c9a0, 0.05, 0.6),
    fire: glow("stores", 0xffb040, 0xff7a1a, 2.0),
    redS: M("stores", 0xc0392b, 0.1, 0.5),
    yellow: M("stores", 0xf2c14e, 0.1, 0.5),
    bun: M("stores", 0xd59a4a, 0.05, 0.6),
    patty: M("stores", 0x5a3420, 0.05, 0.7),
    lettuce: M("stores", 0x5fa83a, 0.05, 0.7),
    table: M("stores", 0xf4f1ea, 0.1, 0.4),
    stool: M("stores", 0xe8702a, 0.1, 0.5),
    floorF: M("stores", 0xe3d8c6, 0.05, 0.6),
    linerF: M("stores", 0xf0dcc2, 0.05, 0.6),
    rubber: M("stores", 0x1c1d20, 0.1, 0.85),
  };
  // --- Department store: double-height hall, escalator to a mezzanine, racks, cosmetics, window
  // mannequins, the giant bag outside.
  put(storeG, S.marble, arcSlab(RI, RO, -12, 12, gy, gy + 0.004));
  put(storeG, S.cream, arcSlab(RO - 0.012, RO, -12, 12, gy, FL[2] - SLAB));
  put(storeG, S.marble, arcSlab(3.95, RO, -12, 12, FL[1], FL[1] + 0.004));
  mannequin(storeG, -9, 3.56, gy, S.gown, S.mannequin);
  mannequin(storeG, 9.5, 3.56, gy, S.suit, S.mannequin);
  rack(storeG, S.chrome, -6, 4.18, gy, 9, 0.2);
  rack(storeG, S.chrome, -6, 4.2, FL[1], 8, 0.18);
  rack(storeG, S.chrome, 4, 4.2, FL[1], 8, 0.18);
  {
    // Cosmetics counter.
    const f = 5,
      r = 4.12;
    put(storeG, S.white, at(rb(0.34, 0.13, 0.12, 0.015), f, r, gy));
    put(storeG, S.counterGlow, at(bx(-0.16, 0.16, 0.13, 0.14, -0.05, 0.05), f, r, gy));
    const bottles: Item[] = [];
    for (let i = 0; i < 7; i++) bottles.push({ p: wpt(f, r, gy, -0.13 + i * 0.043, 0.14, 0), c: [0xc2185b, 0xf2c14e, 0x1f2a36, 0xe8702a, 0xd04f7a][i % 5] });
    inst(storeG, cyl(0.009, 0.04, 0, 0, 0, 8), M("stores", 0xffffff, 0.3, 0.3), bottles);
  }
  {
    // Escalator along the curve from the ground floor up to the mezzanine landing.
    const f = -2,
      r = 3.8,
      rise = FL[1] - gy;
    const truss = new THREE.Shape([
      new THREE.Vector2(-0.62, 0),
      new THREE.Vector2(-0.44, 0),
      new THREE.Vector2(0.62, rise - 0.06),
      new THREE.Vector2(0.62, rise),
      new THREE.Vector2(0.44, rise),
      new THREE.Vector2(-0.62, 0.06),
    ]);
    const tg = new THREE.ExtrudeGeometry(truss, { depth: 0.11, bevelEnabled: false });
    tg.translate(0, 0, -0.055);
    put(storeG, S.steel, at(tg, f, r, gy));
    const sideG = (z: number) => {
      const s = new THREE.Shape([new THREE.Vector2(-0.6, 0.06), new THREE.Vector2(0.48, rise + 0.01), new THREE.Vector2(0.48, rise + 0.13), new THREE.Vector2(-0.6, 0.18)]);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false });
      return at(g.translate(0, 0, z), f, r, gy);
    };
    put(storeG, S.glassS, sideG(0.05), sideG(-0.055));
    put(storeG, S.black, at(tube(THREE, [[-0.62, 0.18, 0.055], [-0.5, 0.18, 0.055], [0.48, rise + 0.13, 0.055], [0.6, rise + 0.13, 0.055]], 0.007, 6, false, 30), f, r, gy), at(tube(THREE, [[-0.62, 0.18, -0.055], [-0.5, 0.18, -0.055], [0.48, rise + 0.13, -0.055], [0.6, rise + 0.13, -0.055]], 0.007, 6, false, 30), f, r, gy));
    const steps: T.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = lerp(-0.44, 0.48, t),
        y = lerp(0.06, rise, t);
      steps.push(at(bx(x - 0.03, x + 0.03, y, y + 0.012, -0.045, 0.045), f, r, gy));
    }
    put(storeG, S.step, ...steps);
  }
  // Shopping bags pile at the door and the giant bag sculpture outside.
  {
    const pile: Item[] = [];
    for (let i = 0; i < 6; i++) pile.push({ p: wpt(-4 + i * 1.4, 3.45, gy, 0, 0, 0), ry: R() * 3, c: [0xc2185b, 0xe8702a, 0x2a9d8f][i % 3] });
    inst(storeG, rb(0.05, 0.06, 0.02, 0.004), M("stores", 0xffffff, 0.05, 0.6), pile);
    const f = 6,
      r = 2.55;
    put(storeG, S.magenta, at(rb(0.27, 0.32, 0.12, 0.012), f, r, G, 0.25));
    put(storeG, S.white, at(bx(-0.136, 0.136, 0.22, 0.25, -0.062, 0.062), f, r, G, 0.25));
    put(storeG, S.black, at(new THREE.TorusGeometry(0.06, 0.008, 6, 18, Math.PI).translate(-0.0, 0.32, 0.04), f, r, G, 0.25), at(new THREE.TorusGeometry(0.06, 0.008, 6, 18, Math.PI).translate(0, 0.32, -0.04), f, r, G, 0.25));
    put(storeG, S.orange, at(rb(0.16, 0.2, 0.08, 0.01).rotateZ(0.12), f + 3.2, r + 0.05, G, 0.6));
    put(storeG, S.teal, at(rb(0.13, 0.16, 0.07, 0.01).rotateZ(-0.1), f - 2.6, r - 0.02, G, -0.3));
  }
  // Store signs.
  put(storeG, signMat("stores", sign("DEPARTMENT STORE", "#c2185b", "#ffffff", 512, 64, 40), 0.55), at(vPlane(1.15, 0.13, 0, 0, 0), 0, RI - 0.04, FL[2] - SLAB - 0.08));
  put(storeG, signMat("stores", sign("SALE", "#d1343a", "#ffffff", 128, 48, 32), 0.6), at(vPlane(0.22, 0.08, 0, 0, 0), -4, 3.94, FL[1] + 0.06));
  people(storeG, "stores", [wpt(-3, 3.62, gy), wpt(2, 3.95, gy), wpt(8, 3.8, gy), wpt(-7, 4.05, FL[1]), wpt(2, 4.1, FL[1])]);

  // --- Food court on the top floor (west): fried chicken, pizza oven, burger counter, tables.
  const ty = FL[2];
  const tCeil = ROOF - 0.03;
  put(storeG, S.floorF, arcSlab(RI, RO, -50, -8, ty, ty + 0.004));
  put(storeG, S.linerF, arcSlab(RO - 0.012, RO, -50, -8, ty, tCeil));
  {
    // Fried-chicken counter: red-and-white stripes, buckets, a lit menu board.
    const f = -43.5,
      r = 4.22;
    const st = stripes("#c0392b", "#f6f4ef", 8);
    put(storeG, L.add("stores", std(0xffffff, 0.05, 0.55, { map: st })), at(rb(0.56, 0.15, 0.14, 0.01), f, r, ty));
    const bucket = lathe(THREE, [[0, 0], [0.026, 0], [0.034, 0.06], [0, 0.06]], 14);
    const bucketMat = L.add("stores", std(0xffffff, 0.05, 0.55, { map: stripes("#c0392b", "#ffffff", 10) }));
    put(storeG, bucketMat, ...[-0.17, -0.06, 0.05, 0.16].map((x) => at(bucket.clone().translate(x, 0.15, 0.02), f, r, ty)));
    put(storeG, S.bun, ...[-0.17, -0.06, 0.05, 0.16].map((x) => at(new THREE.SphereGeometry(0.026, 8, 6).scale(1, 0.55, 1).translate(x, 0.212, 0.02), f, r, ty)));
    put(storeG, S.steel, at(rb(0.2, 0.12, 0.1, 0.01, 0.1, 0, -0.12), f, r, ty));
    const menu = tex(256, 96, (g, w, h) => {
      g.fillStyle = "#c0392b";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff";
      g.font = font(26);
      g.textAlign = "center";
      g.fillText("FRIED CHICKEN", w / 2, 30);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = "#f6e7c8";
        g.fillRect(14 + i * 60, 46, 48, 38);
        g.fillStyle = "#c0392b";
        g.beginPath();
        g.moveTo(24 + i * 60, 52);
        g.lineTo(52 + i * 60, 52);
        g.lineTo(48 + i * 60, 80);
        g.lineTo(28 + i * 60, 80);
        g.fill();
      }
    });
    put(storeG, signMat("stores", menu, 0.8), at(vPlane(0.54, 0.2, 0, 0.45, -0.17), f, r, ty));
  }
  {
    // Pizza counter: a domed wood-fired oven with a glowing mouth and its flue.
    const f = -28,
      r = 4.24;
    put(storeG, S.tile, at(rb(0.6, 0.12, 0.22, 0.01), f, r, ty));
    put(storeG, S.brickRed, at(lathe(THREE, [[0, 0], [0.15, 0], [0.15, 0.03], [0.135, 0.09], [0.09, 0.14], [0.04, 0.165], [0, 0.17]], 24), f, r, ty + 0.12));
    put(storeG, S.fire, at(new THREE.CircleGeometry(0.06, 16, 0, Math.PI).translate(0, 0.005, 0.147), f, r, ty + 0.12));
    put(storeG, S.brickRed, at(new THREE.TorusGeometry(0.065, 0.014, 6, 16, Math.PI).translate(0, 0.005, 0.145), f, r, ty + 0.12));
    put(storeG, S.steel, at(cyl(0.022, tCeil - ty - 0.28, 0, 0.16, -0.03, 10), f, r, ty + 0.12));
    const pz2 = tex(64, 64, (g, w, h) => {
      g.fillStyle = "#e3b062";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c8432b";
      g.beginPath();
      g.arc(w / 2, h / 2, w * 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f6e7b0";
      for (let i = 0; i < 14; i++) g.fillRect(10 + R() * 40, 10 + R() * 40, 6, 6);
      g.fillStyle = "#3d6b2f";
      for (let i = 0; i < 6; i++) g.fillRect(12 + R() * 38, 12 + R() * 38, 4, 4);
    });
    const pizzaMat = L.add("stores", std(0xffffff, 0.02, 0.8, { map: pz2 }));
    put(storeG, pizzaMat, at(cyl(0.07, 0.008, 0.2, 0.12, 0.05, 20), f, r, ty), at(cyl(0.06, 0.008, -0.21, 0.12, 0.06, 20), f, r, ty));
    put(storeG, signMat("stores", sign("WOOD-FIRED PIZZA", "#2f5d3a", "#ffffff", 384, 64, 34), 0.7), at(vPlane(0.5, 0.085, 0, 0.6, -0.2), f, r, ty));
  }
  {
    // Burger counter with a stacked burger on show.
    const f = -14.5,
      r = 4.22;
    put(storeG, S.yellow, at(rb(0.5, 0.15, 0.14, 0.01), f, r, ty));
    const bx0 = 0.12;
    put(storeG, S.bun, at(cyl(0.05, 0.022, bx0, 0.15, 0.0, 18), f, r, ty), at(new THREE.SphereGeometry(0.052, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(bx0, 0.215, 0), f, r, ty));
    put(storeG, S.patty, at(cyl(0.053, 0.02, bx0, 0.172, 0, 18), f, r, ty));
    put(storeG, S.lettuce, at(cyl(0.056, 0.007, bx0, 0.192, 0, 18), f, r, ty));
    put(storeG, S.yellow, at(cyl(0.054, 0.006, bx0, 0.199, 0, 4), f, r, ty, 0.4));
    put(storeG, signMat("stores", sign("BURGERS · COFFEE", "#e8702a", "#ffffff", 384, 64, 34), 0.7), at(vPlane(0.5, 0.085, 0, 0.6, -0.2), f, r, ty));
  }
  {
    // Tables and stools with diners.
    const tables: T.BufferGeometry[] = [];
    const stools: Item[] = [];
    const diners: Vec3[] = [];
    for (const [f, r] of [
      [-46, 3.68],
      [-38.5, 3.78],
      [-33, 3.62],
      [-22, 3.7],
      [-17, 3.82],
      [-11.5, 3.62],
    ]) {
      tables.push(at(cyl(0.065, 0.008, 0, 0.12, 0, 18), f, r, ty), at(cyl(0.008, 0.12, 0, 0, 0, 6), f, r, ty));
      for (const a of [0, 2.1, 4.2]) {
        const lx = Math.cos(a) * 0.1,
          lz = Math.sin(a) * 0.1;
        stools.push({ p: wpt(f, r, ty, lx, 0, lz) });
        if (a !== 4.2) diners.push(wpt(f, r, ty + 0.0, lx, 0, lz));
      }
    }
    put(storeG, S.table, ...tables);
    inst(storeG, cyl(0.022, 0.07, 0, 0, 0, 10), S.stool, stools);
    people(storeG, "stores", diners, true);
  }
  put(storeG, signMat("stores", sign("FOOD COURT", "#d96c2b", "#ffffff", 256, 48, 30), 0.6), at(vPlane(0.6, 0.1, 0, 0, 0), -29, RI - 0.09, ROOF + 0.06));
  // Delivery scooters on the street in front (parked + one riding the curve).
  const scooterGeo = (() => {
    const body = [rb(0.11, 0.035, 0.04, 0.012, 0, 0.03, 0), bx(0.045, 0.06, 0.03, 0.1, -0.015, 0.015), rb(0.05, 0.015, 0.035, 0.006, -0.02, 0.065, 0)];
    const bars = [bar(THREE, [0.055, 0.1, -0.03], [0.055, 0.1, 0.03], 0.004, 4)];
    const wheels = [hcyl(0.022, 0.015, 0.05, 0.022, 0, "z", 12), hcyl(0.022, 0.015, -0.05, 0.022, 0, "z", 12)];
    return { body: mergeInto(THREE, body), bars: mergeInto(THREE, bars), wheels: mergeInto(THREE, wheels), box: rb(0.055, 0.055, 0.05, 0.006, -0.04, 0.075, 0) };
  })();
  const scooterParts: [T.BufferGeometry, T.Material][] = [
    [scooterGeo.body, S.white],
    [scooterGeo.bars, S.black],
    [scooterGeo.wheels, S.rubber],
    [scooterGeo.box, S.redS],
  ];
  for (const [x, z, ry] of [
    [-3.3, 2.95, 0.4],
    [-3.05, 3.02, 0.35],
    [-2.8, 3.08, 0.3],
  ])
    for (const [g, m] of scooterParts) put(storeG, m, g.clone().rotateY(ry).translate(x, G, z));
  const rider = new THREE.Group();
  for (const [g, m] of scooterParts) rider.add(new THREE.Mesh(g, m));
  storeG.add(rider);
  const STREET: [number, number][] = [
    [-5.0, 2.55],
    [-4.4, 2.93],
    [-2.4, 3.3],
    [0, 3.43],
    [2.4, 3.3],
    [4.4, 2.93],
    [5.0, 2.55],
  ];

  // ================================================================ LAYER 3: cinema + distillery
  const C = {
    hall: M("leisure", 0x2a1a24, 0.05, 0.8),
    carpet: M("leisure", 0x4a1f2c, 0.05, 0.9),
    tier: M("leisure", 0x3a2530, 0.05, 0.8),
    seat: M("leisure", 0xb3202e, 0.05, 0.6),
    frame: M("leisure", 0x111114, 0.2, 0.5),
    counter: M("leisure", 0xf6f4ef, 0.05, 0.5),
    corn: M("leisure", 0xf6e3a1, 0.02, 0.8),
    bulbs: glow("leisure", 0xfff3c8, 0xffd27a, 1.8),
    copper: M("leisure", 0xc0743e, 0.9, 0.28),
    copperDark: M("leisure", 0x8c5530, 0.85, 0.35),
    steel: M("leisure", 0xd5dbe0, 0.9, 0.22),
    oak: M("leisure", 0x8a5a33, 0.05, 0.7),
    hoop: M("leisure", 0x2a2d33, 0.6, 0.4),
    brick: M("leisure", 0xa65a3c, 0.05, 0.85),
    slate: M("leisure", 0x3d3f45, 0.2, 0.6),
    timber: M("leisure", 0x5a3d28, 0.05, 0.7),
    barBack: glow("leisure", 0x3a2a18, 0xffb35a, 0.7),
    crate: M("leisure", 0x2f6b3a, 0.1, 0.6),
    stone: M("leisure", 0xd9cdb8, 0.05, 0.8),
  };
  // --- Cinema: dark hall, curved screen on the back wall, raked red seats, popcorn counter.
  put(leisG, C.carpet, arcSlab(RI, RO, -8, 50, ty, ty + 0.004));
  put(leisG, C.hall, arcSlab(RO - 0.012, RO, -8, 50, ty, tCeil));
  const filmTex = tex(512, 128, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#1b2a6b");
    sky.addColorStop(0.55, "#e76f51");
    sky.addColorStop(1, "#f4a261");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffe8a3";
    g.beginPath();
    g.arc(w * 0.62, h * 0.62, 18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2b1d3a";
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.72 - 0.12 * Math.sin(x / 40) - 0.08 * Math.sin(x / 13)));
    g.lineTo(w, h);
    g.fill();
    g.fillStyle = "#120c18";
    g.fillRect(w * 0.3, h * 0.42, 10, h * 0.4);
    g.beginPath();
    g.arc(w * 0.3 + 5, h * 0.38, 8, 0, Math.PI * 2);
    g.fill();
  });
  filmTex.wrapS = THREE.RepeatWrapping;
  filmTex.repeat.set(-1, 1);
  filmTex.offset.set(1, 0);
  const screenMat = L.add("leisure", std(0x000000, 0, 0.5, { map: filmTex, emissive: 0xffffff, emissiveMap: filmTex, emissiveIntensity: 1.1, side: DS }));
  put(leisG, C.frame, arcSlab(RO - 0.04, RO - 0.012, 1, 47, ty + 0.2, ty + 0.68));
  put(leisG, screenMat, arcSurf(RO - 0.045, 2, 46, ty + 0.23, ty + 0.65));
  {
    const seatGeo = mergeInto(THREE, [bx(-0.028, 0.028, 0.03, 0.05, -0.028, 0.028), bx(-0.028, 0.028, 0.03, 0.11, 0.024, 0.038), bx(-0.03, -0.026, 0, 0.07, -0.03, 0.03), bx(0.026, 0.03, 0, 0.07, -0.03, 0.03)]);
    const seats: Item[] = [];
    const audience: Vec3[] = [];
    [4.05, 3.89, 3.73, 3.57].forEach((r, i) => {
      const h = 0.035 * i;
      if (h > 0) put(leisG, C.tier, arcSlab(r - 0.08, r + 0.08, 1, 47, ty, ty + h));
      for (let f = 4; f <= 44.1; f += 2.2) {
        seats.push({ p: wpt(f, r, ty + h), ry: -f * D2R });
        if (R() < 0.3) audience.push(wpt(f, r, ty + h, 0, 0.005, 0.005));
      }
    });
    inst(leisG, seatGeo, C.seat, seats);
    people(leisG, "leisure", audience, true);
  }
  {
    // Popcorn counter with a giant striped tub.
    const st = stripes("#c0392b", "#f6f4ef", 10);
    const tubMat = L.add("leisure", std(0xffffff, 0.05, 0.5, { map: st }));
    put(leisG, tubMat, at(rb(0.34, 0.14, 0.13, 0.01), -4, 4.2, ty));
    put(leisG, tubMat, at(lathe(THREE, [[0, 0], [0.06, 0], [0.085, 0.2], [0, 0.2]], 20), -3.5, 3.66, ty));
    const corn: Item[] = [];
    for (let i = 0; i < 22; i++) {
      const a = R() * Math.PI * 2,
        rr = Math.sqrt(R()) * 0.075;
      corn.push({ p: wpt(-3.5, 3.66, ty, Math.cos(a) * rr, 0.2 + R() * 0.035 + (0.075 - rr) * 0.4, Math.sin(a) * rr), ry: R() * 3 });
    }
    inst(leisG, new THREE.IcosahedronGeometry(0.018, 0), C.corn, corn);
    put(leisG, C.corn, ...[-0.1, -0.03, 0.05, 0.12].map((x) => at(cyl(0.02, 0.04, x, 0.14, 0, 10, 0.026), -4, 4.2, ty)));
    put(leisG, signMat("leisure", sign("NOW SHOWING", "#1c1d20", "#ffd27a", 256, 48, 28), 0.8), at(vPlane(0.34, 0.07, 0, 0.5, -0.12), -4, 4.2, ty));
  }
  // Cinema sign and marquee bulbs on the roof fascia.
  put(leisG, signMat("leisure", sign("CINEMA", "#9c1f2e", "#ffe6a8", 256, 48, 32), 0.7), at(vPlane(0.55, 0.1, 0, 0, 0), 24, RI - 0.09, ROOF + 0.06));
  {
    const bulbs: T.BufferGeometry[] = [];
    for (let f = 2; f <= 46; f += 1.6) if (Math.abs(f - 24) > 4.6) bulbs.push(new THREE.SphereGeometry(0.012, 6, 5).translate(px(f, RI - 0.09), ROOF + 0.06, pz(f, RI - 0.09)));
    put(leisG, C.bulbs, ...bulbs);
  }
  people(leisG, "leisure", [wpt(-5.5, 3.7, ty), wpt(-1.5, 3.85, ty)]);
  // --- Distillery & brewery (front-east corner).
  // Built in its own group, scaled up 15% about the yard and pulled in from the plaza edge.
  const distG = new THREE.Group();
  {
    const sc = 1.15;
    distG.scale.setScalar(sc);
    distG.position.set(3.85 - 3.95 * sc, G - G * sc, 1.95 - 1.95 * sc);
    leisG.add(distG);
  }
  {
    // Still house: brick, open front, with a pagoda-roofed kiln tower and a back-lit bar shelf.
    const x0 = 3.35,
      x1 = 4.45,
      z0 = 1.4,
      z1 = 1.95,
      h = 0.42;
    put(distG, C.stone, bx(x0, x1, G, G + 0.02, z0, z1));
    put(distG, C.brick, bx(x0, x1, G, G + h, z0, z0 + 0.05), bx(x0, x0 + 0.05, G, G + h, z0, z1), bx(x1 - 0.05, x1, G, G + h, z0, z1));
    put(distG, C.slate, bx(x0 - 0.03, x1 + 0.03, G + h, G + h + 0.03, z0 - 0.03, z1 + 0.03));
    put(distG, C.brick, bx(4.0, 4.4, G + h, G + h + 0.28, z0 + 0.04, z0 + 0.44));
    put(distG, C.slate, lathe(THREE, [[0.34, 0], [0.22, 0.07], [0.13, 0.17], [0.07, 0.27], [0, 0.29]], 4).rotateY(Math.PI / 4).translate(4.2, G + h + 0.28, z0 + 0.24));
    put(distG, C.slate, lathe(THREE, [[0.09, 0], [0.05, 0.04], [0, 0.07]], 4).rotateY(Math.PI / 4).translate(4.2, G + h + 0.6, z0 + 0.24), cyl(0.04, 0.05, 4.2, G + h + 0.55, z0 + 0.24, 4));
    // Bar: counter and a glowing shelf of bottles on the back wall.
    put(distG, C.timber, bx(3.85, 4.4, G, G + 0.13, 1.72, 1.82));
    put(distG, C.barBack, bx(3.85, 4.4, G + 0.12, G + 0.38, z0 + 0.05, z0 + 0.07));
    put(distG, C.timber, ...[0.18, 0.27, 0.36].map((y) => bx(3.85, 4.4, G + y, G + y + 0.008, z0 + 0.05, z0 + 0.12)));
    const bottles: Item[] = [];
    const bottleGeo = lathe(THREE, [[0, 0], [0.013, 0], [0.013, 0.04], [0.005, 0.055], [0.005, 0.07], [0, 0.07]], 8);
    for (const y of [0.188, 0.278]) for (let i = 0; i < 12; i++) bottles.push({ p: [3.89 + i * 0.043, G + y, z0 + 0.09], c: [0xb5651d, 0x2f6b3a, 0xe8e0c8, 0x7a2f1f, 0xd9a22b][(i + Math.round(y * 100)) % 5] });
    inst(distG, bottleGeo, M("leisure", 0xffffff, 0.2, 0.15), bottles);
    // Copper pot stills in front: onion pot, neck, lyne arm into a condenser.
    for (const [x, s] of [
      [3.7, 1],
      [4.08, 0.85],
    ]) {
      const z = 2.4;
      put(distG, C.brick, cyl(0.16 * s, 0.05, x, G, z, 16));
      put(distG, C.copper, lathe(THREE, [[0, 0], [0.12, 0], [0.155, 0.07], [0.15, 0.15], [0.1, 0.21], [0.05, 0.25], [0.035, 0.34], [0.045, 0.36], [0, 0.37]], 24).scale(s, s, s).translate(x, G + 0.05, z));
      put(distG, C.copper, tube(THREE, [[x, G + 0.05 + 0.36 * s, z], [x + 0.02, G + 0.05 + 0.4 * s, z - 0.06], [x + 0.08, G + 0.38 * s, z - 0.22], [x + 0.12, G + 0.3, z - 0.3]], 0.012, 8, false, 24));
      put(distG, C.copperDark, cyl(0.045, 0.3, x + 0.13, G, z - 0.33, 14));
    }
    // Steel beer fermenters: conical bottom, legs, domed top.
    for (const [x, z, hh] of [
      [3.12, 1.62, 0.5],
      [3.12, 2.02, 0.42],
    ]) {
      put(distG, C.steel, lathe(THREE, [[0, 0], [0.1, 0.08], [0.1, hh], [0.07, hh + 0.04], [0, hh + 0.05]], 20).translate(x, G + 0.08, z));
      put(distG, C.steel, ...[0, 1, 2].map((i) => bar(THREE, [x + Math.cos(i * 2.1) * 0.08, G, z + Math.sin(i * 2.1) * 0.08], [x + Math.cos(i * 2.1) * 0.08, G + 0.13, z + Math.sin(i * 2.1) * 0.08], 0.006, 4)));
    }
    // Oak casks in a pyramid on a rack, ends to the front.
    const caskGeo = lathe(THREE, [[0, -0.07], [0.048, -0.07], [0.057, 0], [0.048, 0.07], [0, 0.07]], 16).rotateX(Math.PI / 2);
    const hoopGeo = mergeInto(THREE, [-0.05, 0, 0.05].map((zz) => new THREE.TorusGeometry(zz ? 0.054 : 0.058, 0.004, 4, 18).translate(0, 0, zz)));
    const casks: Item[] = [];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) casks.push({ p: [4.12 + row * 0.058 + i * 0.116, G + 0.06 + row * 0.1, 2.48] });
    casks.push({ p: [4.62, G + 0.06, 2.12] }, { p: [4.62, G + 0.06, 2.26] });
    inst(distG, caskGeo, C.oak, casks);
    inst(distG, hoopGeo, C.hoop, casks);
    put(distG, C.timber, bx(4.04, 4.6, G, G + 0.012, 2.4, 2.56));
    // Beer crates with bottle tops.
    for (const [x, z, k] of [
      [3.25, 2.58, 2],
      [3.4, 2.64, 1],
    ]) {
      for (let j = 0; j < k; j++) put(distG, C.crate, rb(0.13, 0.06, 0.09, 0.006, x, G + j * 0.062, z));
    }
    put(distG, signMat("leisure", sign("DISTILLERY & BREWERY", "#5a3d28", "#ffe6a8", 384, 48, 28), 0.6), vPlane(0.7, 0.09, 3.9, G + h - 0.06, z1 + 0.035));
    people(distG, "leisure", [[4.1, G, 1.62], [3.5, G, 2.12], [3.95, G, 1.92]]);
  }

  flushPeople();
  inst(wearG, garmentGeo, M("wear", 0xffffff, 0.02, 0.8), garments.filter((g) => g.p[1] < FL[1] - SLAB && g.p[0] < -1.3));
  inst(storeG, garmentGeo, M("stores", 0xffffff, 0.02, 0.8), garments.filter((g) => !(g.p[1] < FL[1] - SLAB && g.p[0] < -1.3)));
  flush();

  // ---------------------------------------------------------------- animation
  const streetAt = (t: number): [number, number, number] => {
    const n = STREET.length - 1;
    const u = clamp01(t) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const k = u - i;
    const [ax, az] = STREET[i],
      [bx2, bz] = STREET[i + 1];
    return [lerp(ax, bx2, k), lerp(az, bz, k), Math.atan2(-(bz - az), bx2 - ax)];
  };
  driver.onBeforeRender = () => {
    const t = performance.now() / 1000;
    fans.forEach((f, i) => (f.rotation.y = t * (5 + i * 0.4)));
    if (shuttle) shuttle.position.x = -3.63 + Math.sin(t * 2.2) * 0.2;
    if (convoy) {
      // Rolls from the mill yard toward the arcade's west end and back, slowly.
      const k = 0.5 - 0.5 * Math.cos(t * 0.35);
      convoy.position.set(lerp(-2.85, -2.45, k), G, lerp(2.25, 1.95, k));
    }
    jet.scale.set(1, 0.85 + Math.sin(t * 3.1) * 0.15, 1);
    screenMat.emissiveIntensity = 1.05 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 2.1) * 0.05;
    const [x, z, a] = streetAt(((t * 0.03) % 1 + 1) % 1);
    rider.position.set(x, G, z);
    rider.rotation.y = a;
  };

  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("mall", 1);
      L.set("home", pw(v, [[0, 1], [1, 0.3], [3, 0.2]]));
      L.set("wear", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("stores", pw(v, [[0, 1], [2, 1], [3, 0.3]]));
      L.set("leisure", 1);
    },
  };
}
