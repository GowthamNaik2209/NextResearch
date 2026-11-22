// Automobiles: a miniature vehicle plant on a display plinth (generic, no real maker's
// building, badge or livery; signs use plain words).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Middle: the car assembly hall under a see-through sawtooth roof - a body line with welding
//     robots and a final line where painted cars roll towards the exit door.
//   · Front yards on the road, west -> east: two-wheelers, finished cars, trucks and buses,
//     tractors by a strip of field; a car carrier waits on the road.
//   · West side, back -> front: the systems suppliers feeding the hall - lighting and switches
//     (a giant headlamp), brakes and suspension (a brake disc and a coil spring), modules and
//     interiors (a seat and a windscreen rack).
//   · East side, back -> front: engine and driveline shops - pistons and a crankshaft, fuel
//     injection and a catalytic converter, gears, a bearing and a chain.
//   · Back row: the aftermarket - a tyre plant with stacked tyres, a battery and lubricant depot,
//     and a dealer showroom with a used-car lot.
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Vehicle Makers        the hall and the front yards
//   1 Systems & Modules     vehicles ghost -> the west suppliers
//   2 Engine & Driveline    suppliers ghost -> the east shops
//   3 Tyres & Aftermarket   shops ghost -> the back row
// Cars move down the assembly lines and the gears turn (animated: true).
import type * as T from "three";
import { type Three, type Vec3, bar, canvasTexture, clamp01, contactShadow, layerMats, lerp, mergeInto, roundedBox, tube } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// ------------------------------------------------------------------ key dims
const S = 0.42; // street level (top of the plinth)
const PX = 4.7,
  PZ = 3.4,
  PR = 0.4; // plinth half-sizes + corner radius

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/autos.ts). The bottom rail runs west -> east
// along the front yards, the left rail back -> front down the suppliers, the right rail back ->
// front down the engine shops and the top rail west -> east along the aftermarket row, so the
// markers keep the rails' order in every view (scripts/check-crossings.mjs).
export const AUTOS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: vehicle makers
  two_wheelers: { pos: [-3.5, S + 0.14, 2.05], side: "bottom" }, // rows of scooters and motorcycles
  passenger_vehicles: { pos: [-0.9, S + 0.16, 1.32], side: "bottom" }, // car leaving the assembly hall
  commercial_vehicles: { pos: [1.05, S + 0.3, 2.0], side: "bottom" }, // truck cab in the CV yard
  tractors: { pos: [3.35, S + 0.22, 2.0], side: "bottom" }, // tractor in the farm yard
  // layer 1: systems suppliers (west)
  body_electricals: { pos: [-3.55, S + 0.3, -1.64], side: "left" }, // lighting unit front, under the giant headlamp
  chassis_systems: { pos: [-3.6, S + 0.67, -0.85], side: "left" }, // brake disc and caliper
  modules_interiors: { pos: [-2.65, S + 0.22, 1.9], side: "left" }, // truck delivering seats and glass to the line
  // layer 2: engine and driveline (east)
  engine_parts: { pos: [3.6, S + 0.55, -2.2], side: "right" }, // piston and crankshaft
  emissions_fuel: { pos: [3.6, S + 0.48, -0.85], side: "right" }, // catalytic converter
  driveline: { pos: [3.6, S + 0.55, 0.5], side: "right" }, // gear pair
  // layer 3: aftermarket row
  tyres: { pos: [-1.6, S + 0.55, -2.5], side: "top" }, // giant tyre on the tyre plant
  replacement: { pos: [0.0, S + 0.45, -2.45], side: "top" }, // battery on the depot
  dealers: { pos: [1.65, S + 0.38, -2.2], side: "top" }, // showroom sign
};

export const AUTOS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [5.4, 7.4, 11.0],
    target: [0, 0.6, 0.2],
    narration:
      "Welcome to the vehicle plant. Cars come off the assembly line in the middle, two-wheelers, trucks and tractors fill the yards in front, parts suppliers feed the line from both sides, and tyres, batteries and dealers wait at the back for the vehicles already on the road. Peel it layer by layer, from the vehicle makers to the aftermarket.",
  },
  {
    id: "makers",
    layer: 0,
    label: "Vehicle Makers",
    pos: [2.2, 5.0, 8.8],
    target: [-0.2, 0.4, 1.0],
    narration:
      "The vehicle makers. In the hall, bodies are welded by robots and painted cars roll off the final line, the business of carmakers like Maruti Suzuki, Mahindra and Hyundai. In the yards in front: scooters and motorcycles from makers like Hero MotoCorp and Bajaj Auto, trucks and buses like Ashok Leyland's, and tractors like Escorts'.",
  },
  {
    id: "systems",
    layer: 1,
    label: "Systems & Modules",
    pos: [-0.6, 3.8, 4.8],
    target: [-3.4, 0.45, -0.8],
    narration:
      "The systems suppliers along the west side. Lighting and switches from makers like Uno Minda, brakes, suspension and steering like Endurance's, and seats, interior modules and glass like Motherson's, all trucked into the hall just in time for the line.",
  },
  {
    id: "powertrain",
    layer: 2,
    label: "Engine & Driveline",
    pos: [8.4, 4.6, 3.6],
    target: [3.2, 0.4, -0.8],
    narration:
      "The engine and driveline shops on the east side. Pistons, rings and crankshafts from makers like Shriram Pistons and Bharat Forge, fuel injection and exhaust after-treatment like Bosch's, and gears, bearings and chains like Schaeffler's and Tube Investments'.",
  },
  {
    id: "aftermarket",
    layer: 3,
    label: "Tyres & Aftermarket",
    pos: [3.6, 4.8, 3.9],
    target: [0.4, 0.35, -2.3],
    narration:
      "The aftermarket row, which earns from every vehicle already on the road. A tyre plant with stacked tyres from makers like MRF and Apollo Tyres, a depot of replacement batteries and engine oil like Exide's, and a dealer showroom with a used-car lot.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the assembly hall in the middle, the vehicle yards along the road, the systems suppliers on the west, the engine and driveline shops on the east, and the aftermarket row at the back.",
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

export function buildAutos(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [vehG, sysG, pwrG, aftG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const R = rng(20261121);

  // ================================================================ HELPER BLOCK
  // Shared by the Wave 2 models (itservices, autos, chemicals). Copied, not imported, so each
  // sector keeps its own browser chunk.
  const L = layerMats();
  const DS = THREE.DoubleSide;

  // ---------------------------------------------------------------- geometry helpers
  const std = (color: number, metalness = 0.2, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const bx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop = r) =>
    new THREE.CylinderGeometry(rTop, r, h, seg).translate(x, y + h / 2, z);
  /** Horizontal cylinder along x (axis = "x") or z centred at (x, y, z). */
  const hcyl = (r: number, len: number, x: number, y: number, z: number, axis: "x" | "z" = "x", seg = 16) => {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else g.rotateX(Math.PI / 2);
    return g.translate(x, y, z);
  };
  const vPlane = (w: number, h: number, x: number, y: number, z: number, ry = 0) =>
    new THREE.PlaneGeometry(w, h).rotateY(ry).translate(x, y, z);
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
  /** Sawtooth factory roof (teeth along x, ridges running along z). */
  const sawtooth = (x0: number, x1: number, z0: number, z1: number, y: number, n: number, rise: number) => {
    const out: T.BufferGeometry[] = [];
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(w, 0);
      sh.lineTo(w, rise);
      sh.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false });
      g.translate(x0 + i * w, y, z0);
      g.computeVertexNormals();
      out.push(g);
    }
    return out;
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
  const windows = (cols: number, rows: number, wall: string, glassA: string, glassB: string, lit: number, frame = 6) => {
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
  };
  const monTex = tex(64, 40, (g, w, h) => {
    g.fillStyle = "#10202e";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7fc8ff";
    g.fillRect(4, 4, w - 8, 4);
    g.fillStyle = "#3fd08a";
    for (let i = 0; i < 4; i++) g.fillRect(6, 12 + i * 6, 20 + ((i * 13) % 30), 3);
  });
  // Rack fronts: four LED frames stacked; offset.y steps through them (animated).
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
    glass: L.add(bucket, std(0xcfe6f2, 0.1, 0.05, { opacity: 0.3, side: DS, depthWrite: false })),
    frame: L.add(bucket, std(0x59626c, 0.7, 0.35)),
    mon: screen(bucket, monTex, 1.0),
    body: L.add(bucket, std(0xffffff, 0.05, 0.75)),
    skin: L.add(bucket, std(0xc89878, 0.05, 0.7)),
    green: L.add(bucket, std(0x4a8a3e, 0, 0.85)),
    trunk: L.add(bucket, std(0x5a4632, 0, 0.9)),
    red: L.add(bucket, std(0xb8382e, 0.3, 0.45)),
    blue: L.add(bucket, std(0x2f5d9a, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.3, 0.45)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    roof: L.add(bucket, std(0x9a4b35, 0.05, 0.75)),
    concrete: L.add(bucket, std(0xd4d0c8, 0.05, 0.8)),
    paint: L.add(bucket, std(0xffffff, 0.3, 0.5)),
    rubber: L.add(bucket, std(0x1c1d20, 0.1, 0.85)),
    lamp: L.add(bucket, std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    rackSide: L.add(bucket, std(0x1b2129, 0.5, 0.4)),
    rackTop: L.add(bucket, std(0x2b333d, 0.5, 0.4)),
    rackFront: L.add(bucket, std(0xffffff, 0.3, 0.4, { map: rackLed, emissive: 0xffffff, emissiveMap: rackLed, emissiveIntensity: 1.0 })),
    carGlass: L.add(bucket, std(0x1b2631, 0.6, 0.15)),
  });
  type Pal = ReturnType<typeof pal>;

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
  const treeTrunk = cyl(0.018, 0.16, 0, 0, 0, 6, 0.012);
  const treeTop = new THREE.IcosahedronGeometry(0.12, 1).scale(1, 1.1, 1).translate(0, 0.24, 0);
  const trees = new Map<string, { parent: T.Object3D; P: Pal; items: Item[] }>();
  const tree = (parent: T.Object3D, P: Pal, x: number, z: number, s = 1, y = S) => {
    const k = parent.uuid + "|" + P.green.uuid;
    if (!trees.has(k)) trees.set(k, { parent, P, items: [] });
    trees.get(k)!.items.push({ p: [x, y, z], s: [s, s * (0.9 + R() * 0.25), s], ry: R() * 6 });
  };
  // Cars: an instance-coloured body + glass cab + wheels, facing +x; len 0.3 at scale 1.
  const carGeo = (() => {
    const len = 0.3,
      w = len * 0.46;
    const wheels: T.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheels.push(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 12).rotateX(Math.PI / 2).translate(sx * len * 0.32, 0.028, sz * w * 0.45));
    return {
      body: rb(len, 0.07, w, 0.025, 0, 0.025, 0),
      cab: rb(len * 0.55, 0.06, w * 0.86, 0.022, -len * 0.04, 0.085, 0),
      wheels: mergeInto(THREE, wheels),
    };
  })();
  const carLists = new Map<string, { parent: T.Object3D; P: Pal; items: Item[] }>();
  const car = (parent: T.Object3D, P: Pal, x: number, z: number, ry: number, c: number, y = S, s = 1) => {
    const k = parent.uuid + "|" + P.body.uuid;
    if (!carLists.has(k)) carLists.set(k, { parent, P, items: [] });
    carLists.get(k)!.items.push({ p: [x, y, z], ry, c, s: [s, s, s] });
  };

  // ---------------------------------------------------------------- plinth + ground
  // A rounded slab with the scene's painted ground on top and the accent lip round its edge.
  const GX = 2 * PX,
    GZ = 2 * PZ,
    GS = 110;
  type Painter = {
    g: CanvasRenderingContext2D;
    P: (x: number, z: number) => [number, number];
    rect: (x0: number, z0: number, x1: number, z1: number, c: string) => void;
    GS: number;
  };
  const roundedRect = (k: number) => {
    const pts: [number, number][] = [];
    const r = PR + k;
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
    return pts;
  };
  const buildPlinth = (baseG: T.Object3D, plinthColor: number, lipGlow: number, paint: (p: Painter) => void) => {
    const groundTex = tex(GX * GS, GZ * GS, (g) => {
      const P = (x: number, z: number): [number, number] => [(x + PX) * GS, (z + PZ) * GS];
      const rect = (x0: number, z0: number, x1: number, z1: number, c: string) => {
        const [a, b] = P(x0, z0);
        g.fillStyle = c;
        g.fillRect(a, b, (x1 - x0) * GS, (z1 - z0) * GS);
      };
      paint({ g, P, rect, GS });
    });
    const mPlinth = L.add("base", std(plinthColor, 0.5, 0.45));
    const mLip = L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: lipGlow, emissiveIntensity: 0.4 }));
    const mGround = L.add("base", std(0xffffff, 0, 0.9, { map: groundTex }));
    const shape = new THREE.Shape();
    roundedRect(0).forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    const bev = 0.03;
    const pl = new THREE.ExtrudeGeometry(shape, { depth: S - 2 * bev - 0.004, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
    pl.rotateX(-Math.PI / 2).translate(0, bev, 0);
    put(baseG, mPlinth, pl);
    const gg = new THREE.ShapeGeometry(shape, 6).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PX) / GX, 1 - (p.getZ(i) + PZ) / GZ);
    gg.translate(0, S + 0.002, 0);
    put(baseG, mGround, gg);
    baseG.add(contactShadow(THREE, 2 * PX + 1.6, 2 * PZ + 1.6, 0.5));
    // The accent lip carries the animation driver (always visible).
    const outer = new THREE.Shape();
    const inner = new THREE.Path();
    roundedRect(0.045).forEach(([x, z], i) => (i ? outer.lineTo(x, -z) : outer.moveTo(x, -z)));
    roundedRect(0).forEach(([x, z], i) => (i ? inner.lineTo(x, -z) : inner.moveTo(x, -z)));
    outer.holes.push(inner);
    const lg = new THREE.ExtrudeGeometry(outer, { depth: 0.02, bevelEnabled: false, curveSegments: 6 });
    lg.rotateX(-Math.PI / 2).translate(0, 0.14, 0);
    const lip = new THREE.Mesh(lg, mLip);
    lip.frustumCulled = false;
    baseG.add(lip);
    return lip;
  };

  // ---------------------------------------------------------------- flush + levels
  const flush = () => {
    for (const { parent, P, items } of carLists.values()) {
      inst(parent, carGeo.body, P.paint, items);
      inst(parent, carGeo.cab, P.carGlass, items.map((i) => ({ p: i.p, ry: i.ry, s: i.s })));
      inst(parent, carGeo.wheels, P.rubber, items.map((i) => ({ p: i.p, ry: i.ry, s: i.s })));
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
  // ================================================================ END HELPER BLOCK

  // ---------------------------------------------------------------- scene textures
  const shedTex = windows(6, 2, "#dfe3e6", "#8fb3cf", "#4a6a88", 0.1, 10);
  const unitTex = windows(5, 2, "#e9e4da", "#8fb3cf", "#4a6a88", 0.15, 10);
  const shopTex = windows(5, 2, "#d9dee4", "#8fb3cf", "#4a6a88", 0.15, 10);
  const showTex = windows(4, 1, "#f2f2f2", "#bfe0f2", "#5f8fb0", 0.0, 4);
  const tAssembly = sign("ASSEMBLY", "#1d3b5a", "#ffffff", 256, 64, 38);
  const t2w = sign("TWO-WHEELERS", "#2e86ab", "#ffffff", 256, 64, 30);
  const tCv = sign("TRUCKS  •  BUSES", "#2e86ab", "#ffffff", 256, 64, 28);
  const tTractor = sign("TRACTORS", "#2e86ab", "#ffffff", 256, 64, 36);
  const tLight = sign("LIGHTING  •  SWITCHES", "#1e7a5c", "#ffffff", 512, 64, 32);
  const tChassis = sign("BRAKES  •  SUSPENSION", "#1e7a5c", "#ffffff", 512, 64, 32);
  const tModules = sign("SEATS  •  GLASS  •  MODULES", "#1e7a5c", "#ffffff", 512, 64, 28);
  const tEngine = sign("ENGINE PARTS", "#b4561f", "#ffffff", 256, 64, 34);
  const tFuel = sign("FUEL  •  EXHAUST", "#b4561f", "#ffffff", 256, 64, 30);
  const tDrive = sign("GEARS  •  BEARINGS", "#b4561f", "#ffffff", 256, 64, 28);
  const tTyres = sign("TYRES", "#3d5a80", "#ffffff", 256, 64, 40);
  const tParts = sign("BATTERIES  •  OIL", "#3d5a80", "#ffffff", 256, 64, 30);
  const tDealer = sign("SHOWROOM", "#3d5a80", "#ffffff", 256, 64, 36);
  const tUsed = sign("USED CARS", "#b5179e", "#ffffff", 256, 64, 36);
  // Tyre tread for the sidewalls of the giant tyre and the stacks.
  const treadTex = (() => {
    const t = tex(256, 32, (g, w, h) => {
      g.fillStyle = "#1c1d20";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#33363b";
      for (let x = 0; x < w; x += 16) {
        g.fillRect(x, 4, 8, 10);
        g.fillRect(x + 8, 18, 8, 10);
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(8, 1);
    return t;
  })();

  // ---------------------------------------------------------------- materials
  const ve = {
    ...pal("veh"),
    shed: L.add("veh", std(0xffffff, 0.1, 0.6, { map: shedTex })),
    assembly: signMat("veh", tAssembly, 0.5),
    s2w: signMat("veh", t2w, 0.5),
    scv: signMat("veh", tCv, 0.5),
    sTr: signMat("veh", tTractor, 0.5),
    robot: L.add("veh", std(0xe8a33a, 0.4, 0.4)),
    spark: L.add("veh", std(0xffffff, 0, 0.4, { emissive: 0xffd36a, emissiveIntensity: 1.5 })),
    biw: L.add("veh", std(0xb9c0c8, 0.7, 0.35)),
    conveyor: L.add("veh", std(0x3a4048, 0.6, 0.4)),
    field: L.add("veh", std(0x7d9a45, 0, 0.9)),
  };
  const hr = {
    roof: L.add("hallRoof", std(0xdfe6ec, 0.2, 0.3, { opacity: 0.5, side: DS, depthWrite: false })),
    truss: L.add("hallRoof", std(0x6d7782, 0.7, 0.35)),
  };
  const sy = {
    ...pal("sys"),
    unit: L.add("sys", std(0xffffff, 0.1, 0.6, { map: unitTex })),
    sLight: signMat("sys", tLight, 0.5),
    sChassis: signMat("sys", tChassis, 0.5),
    sModules: signMat("sys", tModules, 0.5),
    lens: L.add("sys", std(0xeaf6ff, 0.1, 0.05, { emissive: 0xcfe8ff, emissiveIntensity: 0.9 })),
    chrome: L.add("sys", std(0xdfe5ea, 0.95, 0.15)),
    disc: L.add("sys", std(0xa9b0b7, 0.85, 0.3)),
    caliper: L.add("sys", std(0xc8352c, 0.4, 0.35)),
    spring: L.add("sys", std(0x2f8f6a, 0.5, 0.35)),
    seat: L.add("sys", std(0x2c3440, 0.1, 0.8)),
    windscreen: L.add("sys", std(0x9fd2ee, 0.2, 0.05, { opacity: 0.6, side: DS })),
    truck: L.add("sys", std(0x1e9e76, 0.3, 0.45)),
  };
  const pw2 = {
    ...pal("pwr"),
    shop: L.add("pwr", std(0xffffff, 0.1, 0.6, { map: shopTex })),
    sEngine: signMat("pwr", tEngine, 0.5),
    sFuel: signMat("pwr", tFuel, 0.5),
    sDrive: signMat("pwr", tDrive, 0.5),
    alu: L.add("pwr", std(0xd5d9de, 0.85, 0.3)),
    forged: L.add("pwr", std(0x6b7178, 0.85, 0.35)),
    gear: L.add("pwr", std(0xd9a441, 0.8, 0.3)),
    cat: L.add("pwr", std(0xcfd4d9, 0.9, 0.2)),
  };
  const af = {
    ...pal("aft"),
    shed: L.add("aft", std(0xffffff, 0.1, 0.6, { map: shedTex })),
    show: L.add("aft", std(0xffffff, 0.2, 0.2, { map: showTex })),
    sTyres: signMat("aft", tTyres, 0.5),
    sParts: signMat("aft", tParts, 0.5),
    sDealer: signMat("aft", tDealer, 0.5),
    sUsed: signMat("aft", tUsed, 0.5),
    tread: L.add("aft", std(0xffffff, 0.1, 0.85, { map: treadTex })),
    battery: L.add("aft", std(0x2b2f36, 0.2, 0.5)),
    batteryTop: L.add("aft", std(0x3d5a80, 0.3, 0.45)),
    oil: L.add("aft", std(0x2f8f6a, 0.3, 0.45)),
  };
  const yd = pal("yard");

  // ================================================================ PLINTH + GROUND
  const lip = buildPlinth(baseG, 0x1f2731, 0x2f8fbf, ({ g, P, rect, GS: gs }) => {
    rect(-PX, -PZ, PX, PZ, "#b5b7b4");
    g.strokeStyle = "rgba(0,0,0,0.06)";
    for (let x = -PX; x <= PX; x += 0.2) {
      g.beginPath();
      g.moveTo(...P(x, -PZ));
      g.lineTo(...P(x, PZ));
      g.stroke();
    }
    // Road along the front.
    rect(-PX, 2.75, PX, PZ, "#3b3e43");
    rect(-PX, 2.69, PX, 2.75, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.08);
      g.fillRect(a, b, 0.25 * gs, 3);
    }
    // Yards: asphalt with parking bays.
    rect(-4.55, 1.25, 2.55, 2.65, "#5b5f65");
    g.strokeStyle = "#e8e6df";
    g.lineWidth = 2;
    for (let x = -4.5; x < 2.5; x += 0.22) {
      g.beginPath();
      g.moveTo(...P(x, 1.75));
      g.lineTo(...P(x, 2.0));
      g.stroke();
    }
    // Hall floor and the internal roads round it.
    rect(-2.45, -1.65, 2.45, 1.1, "#9ea4aa");
    rect(-2.6, -1.8, -2.45, 1.25, "#6e7378");
    rect(2.45, -1.8, 2.6, 1.25, "#6e7378");
    // Supplier and shop forecourts.
    rect(-4.55, -3.0, -2.6, 1.1, "#a9aca9");
    rect(2.6, -3.0, 4.55, 1.1, "#a9aca9");
    // Back row and the used-car lot.
    rect(-2.45, -3.3, 2.45, -1.8, "#c2bcae");
    rect(2.0, -2.0, 2.45, -1.8, "#5b5f65");
    // Tractor yard: earth and a strip of crop rows.
    rect(2.6, 1.25, 4.55, 2.65, "#8a7356");
    g.fillStyle = "#6f8f3a";
    for (let z = 1.3; z < 2.6; z += 0.12) {
      const [a, b] = P(4.0, z);
      g.fillRect(a, b, 0.5 * gs, 0.05 * gs);
    }
  });

  // ---------------------------------------------------------------- vehicle kits (instanced)
  // Two-wheeler (facing +x): two wheels, a body and seat, handlebar.
  const bikeBody = mergeInto(THREE, [
    rb(0.09, 0.035, 0.03, 0.012, 0, 0.03, 0),
    rb(0.05, 0.015, 0.026, 0.006, -0.015, 0.065, 0),
    bar(THREE, [0.04, 0.04, 0], [0.05, 0.09, 0], 0.004, 4),
    bar(THREE, [0.05, 0.09, -0.025], [0.05, 0.09, 0.025], 0.004, 4),
  ]);
  const bikeWheels = mergeInto(THREE, [hcyl(0.025, 0.012, 0.045, 0.025, 0, "z", 12), hcyl(0.025, 0.012, -0.045, 0.025, 0, "z", 12)]);
  // Truck (facing +x): cab + cargo box; bus: one long body with a window band.
  const truckCab = rb(0.13, 0.15, 0.15, 0.02, 0.17, 0.03, 0);
  const truckBox = rb(0.32, 0.17, 0.16, 0.01, -0.07, 0.04, 0);
  const truckWheels = mergeInto(THREE, [-0.17, -0.02, 0.18].flatMap((x) => [hcyl(0.035, 0.03, x, 0.035, -0.065, "z", 12), hcyl(0.035, 0.03, x, 0.035, 0.065, "z", 12)]));
  const busBody = rb(0.5, 0.16, 0.15, 0.03, 0, 0.03, 0);
  const busGlass = bx(-0.24, 0.25, 0.11, 0.16, -0.077, 0.077);
  const busWheels = mergeInto(THREE, [-0.16, 0.16].flatMap((x) => [hcyl(0.035, 0.03, x, 0.035, -0.06, "z", 12), hcyl(0.035, 0.03, x, 0.035, 0.06, "z", 12)]));
  // Tractor (facing +x): big rear wheels, small front wheels, bonnet, cab frame.
  const tracBody = mergeInto(THREE, [rb(0.16, 0.06, 0.07, 0.015, 0.03, 0.05, 0), rb(0.07, 0.03, 0.09, 0.01, -0.05, 0.1, 0)]);
  const tracFrame = mergeInto(THREE, [
    ...[
      [-0.08, -0.04],
      [-0.08, 0.04],
      [-0.02, -0.04],
      [-0.02, 0.04],
    ].map(([x, z]) => bar(THREE, [x, 0.12, z], [x, 0.22, z], 0.004, 4)),
    bx(-0.09, -0.01, 0.22, 0.23, -0.05, 0.05),
  ]);
  const tracWheels = mergeInto(THREE, [hcyl(0.055, 0.03, -0.05, 0.055, -0.065, "z", 14), hcyl(0.055, 0.03, -0.05, 0.055, 0.065, "z", 14), hcyl(0.03, 0.02, 0.09, 0.03, -0.05, "z", 12), hcyl(0.03, 0.02, 0.09, 0.03, 0.05, "z", 12)]);

  // ================================================================ LAYER 0: ASSEMBLY HALL + FRONT YARDS
  const lineCars: { im: T.InstancedMesh | null; cab: T.InstancedMesh | null; z: number; y: number; x0: number; x1: number; n: number; speed: number }[] = [];
  {
    // ---- Hall: back and west walls, a see-through sawtooth roof on trusses, the exit door.
    put(vehG, ve.shed, ...facadeShell(-2.4, 2.4, -1.6, 1.05, S, S + 0.5, 0.8, 0.5, "nw"));
    put(vehG, ve.shed, ...facadeShell(-2.4, 2.4, -1.6, 1.05, S + 0.3, S + 0.5, 0.8, 0.5, "se"));
    put(vehG, ve.grey, ...[-2.4, -1.2, 0, 1.2, 2.4].flatMap((x) => [bx(x - 0.03, x + 0.03, S, S + 0.3, 1.02, 1.08)]));
    put(vehG, ve.grey, ...[-1.6, -0.3, 1.05].flatMap((z) => [bx(2.37, 2.43, S, S + 0.3, z - 0.03, z + 0.03)]));
    put(vehG, ve.assembly, vPlane(0.7, 0.13, 0.6, S + 0.42, 1.056));
    put(vehG, hr.roof, ...sawtooth(-2.4, 2.4, -1.6, 1.05, S + 0.5, 6, 0.18));
    const truss: T.BufferGeometry[] = [];
    for (let i = 0; i <= 6; i++) truss.push(bx(-2.4 + i * 0.8 - 0.012, -2.4 + i * 0.8 + 0.012, S + 0.5, S + 0.52, -1.6, 1.05));
    for (const z of [-1.6, -0.7, 0.2, 1.05]) truss.push(bx(-2.4, 2.4, S + 0.5, S + 0.52, z - 0.012, z + 0.012));
    put(vehG, hr.truss, ...truss);
    // Body line (back): conveyor, welding robots, bodies-in-white.
    put(vehG, ve.conveyor, bx(-2.2, 2.2, S, S + 0.05, -1.0, -0.8), bx(-2.2, 2.2, S, S + 0.05, 0.05, 0.25));
    const robots: T.BufferGeometry[] = [];
    const sparks: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const x = -1.8 + i * 0.7,
        z = i % 2 ? -1.2 : -0.6;
      const dz = i % 2 ? 1 : -1;
      robots.push(cyl(0.04, 0.04, x, S, z, 12), bar(THREE, [x, S + 0.04, z], [x, S + 0.2, z], 0.016, 6), bar(THREE, [x, S + 0.2, z], [x + 0.06, S + 0.16, z + dz * 0.16], 0.012, 6));
      sparks.push(new THREE.SphereGeometry(0.014, 6, 5).translate(x + 0.06, S + 0.13, z + dz * 0.19));
    }
    put(vehG, ve.robot, ...robots);
    put(vehG, ve.spark, ...sparks);
    // Final line (front): painted cars; both lines' cars move (animated below).
    const biw: Item[] = [];
    for (let i = 0; i < 7; i++) biw.push({ p: [0, 0, 0] });
    lineCars.push({ im: inst(vehG, carGeo.body, ve.biw, biw), cab: inst(vehG, carGeo.cab, ve.biw, biw), z: -0.9, y: S + 0.05, x0: -2.1, x1: 2.1, n: 7, speed: 0.08 });
    const COLS = [0xb8382e, 0xeef0f2, 0x2f5d9a, 0x1f2a36, 0xd8a93a, 0x8d97a1, 0x3d6b4f];
    const fin: Item[] = COLS.map((c) => ({ p: [0, 0, 0], c }));
    lineCars.push({ im: inst(vehG, carGeo.body, ve.paint, fin), cab: inst(vehG, carGeo.cab, ve.carGlass, fin.map(() => ({ p: [0, 0, 0] as Vec3 }))), z: 0.15, y: S + 0.05, x0: -2.1, x1: 2.1, n: 7, speed: 0.08 });
    people(vehG, ve, [
      [-1.5, S, -0.45, 0],
      [-0.2, S, -0.45, 0.5],
      [0.9, S, 0.5, Math.PI],
      [1.8, S, 0.5, 2.6],
      [-1.0, S, 0.5, 3.0],
    ], [0x2f5d9a, 0x2f5d9a, 0xe2b33a]);
    // The car leaving by the exit door.
    car(vehG, ve, -0.9, 1.32, Math.PI / 2, 0xd04f7a, S, 1.05);

    // ---- Two-wheeler yard: a plant shed and rows of scooters and motorcycles.
    put(vehG, ve.shed, ...facadeShell(-4.4, -2.85, 1.15, 1.55, S, S + 0.28, 0.26, 0.28));
    put(vehG, ve.roof, gable(-4.4, -2.85, 1.15, 1.55, S + 0.28, 0.1));
    put(vehG, ve.s2w, vPlane(0.6, 0.1, -3.62, S + 0.17, 1.555));
    const bikes: Item[] = [];
    const BC = [0xb8382e, 0x1f2a36, 0xeef0f2, 0x2f5d9a, 0xe2b33a];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) bikes.push({ p: [-4.35 + i * 0.17, S, 1.75 + r * 0.2], ry: -Math.PI / 2, c: BC[(i + r * 2) % BC.length], s: [1.2, 1.2, 1.2] });
    inst(vehG, bikeBody, ve.paint, bikes);
    inst(vehG, bikeWheels, ve.rubber, bikes.map((b) => ({ p: b.p, ry: b.ry, s: b.s })));
    // ---- Finished-car yard in front of the hall.
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 6; i++) car(vehG, ve, -2.25 + i * 0.22, 1.85 + r * 0.42, -Math.PI / 2, [0xeef0f2, 0x1f2a36, 0xb8382e, 0x8d97a1, 0x2f5d9a][(i + r * 3) % 5], S, 0.95);
    // ---- CV yard: trucks and a bus.
    put(vehG, ve.scv, vPlane(0.6, 0.1, 1.3, S + 0.18, 1.556));
    put(vehG, ve.grey, bx(1.0, 1.6, S, S + 0.24, 1.3, 1.55));
    const trucks: Item[] = [
      { p: [0.45, S, 2.0], ry: -Math.PI / 2, c: 0x2f5d9a },
      { p: [1.05, S, 2.05], ry: -Math.PI / 2, c: 0xe2b33a },
    ];
    inst(vehG, truckCab, ve.paint, trucks);
    inst(vehG, truckBox, ve.white, trucks.map((t) => ({ p: t.p, ry: t.ry })));
    inst(vehG, truckWheels, ve.rubber, trucks.map((t) => ({ p: t.p, ry: t.ry })));
    const buses: Item[] = [{ p: [1.85, S, 2.15], ry: -Math.PI / 2, c: 0xd96c2b }];
    inst(vehG, busBody, ve.paint, buses);
    inst(vehG, busGlass, ve.carGlass, buses.map((t) => ({ p: t.p, ry: t.ry })));
    inst(vehG, busWheels, ve.rubber, buses.map((t) => ({ p: t.p, ry: t.ry })));
    // ---- Tractor yard by the field.
    put(vehG, ve.shed, ...facadeShell(2.75, 3.85, 1.15, 1.5, S, S + 0.26, 0.26, 0.26));
    put(vehG, ve.roof, gable(2.75, 3.85, 1.15, 1.5, S + 0.26, 0.1));
    put(vehG, ve.sTr, vPlane(0.5, 0.1, 3.3, S + 0.16, 1.505));
    const tracs: Item[] = [
      { p: [2.95, S, 1.95], ry: -Math.PI / 2, c: 0xb8382e, s: [1.3, 1.3, 1.3] },
      { p: [3.35, S, 1.95], ry: -Math.PI / 2, c: 0x2f7d3a, s: [1.3, 1.3, 1.3] },
      { p: [3.15, S, 2.4], ry: -Math.PI / 2, c: 0x2f5d9a, s: [1.3, 1.3, 1.3] },
      { p: [4.25, S, 1.7], ry: Math.PI / 2, c: 0xb8382e, s: [1.3, 1.3, 1.3] },
    ];
    inst(vehG, tracBody, ve.paint, tracs);
    inst(vehG, tracFrame, ve.dark, tracs.map((t) => ({ p: t.p, ry: t.ry, s: t.s })));
    inst(vehG, tracWheels, ve.rubber, tracs.map((t) => ({ p: t.p, ry: t.ry, s: t.s })));
  }

  // ================================================================ LAYER 1: SYSTEMS SUPPLIERS (WEST)
  {
    const unit = (z0: number, z1: number, mat: T.Material) => {
      put(sysG, sy.unit, ...facadeShell(-4.45, -2.75, z0, z1, S, S + 0.3, 0.34, 0.3));
      put(sysG, sy.grey, bx(-4.47, -2.73, S + 0.3, S + 0.33, z0 - 0.02, z1 + 0.02));
      put(sysG, mat, vPlane(0.95, 0.09, -2.745, S + 0.22, (z0 + z1) / 2, Math.PI / 2));
    };
    // ---- Lighting & switches: a giant headlamp on the roof.
    unit(-2.85, -1.65, sy.sLight);
    put(sysG, sy.dark, rb(0.5, 0.2, 0.22, 0.06, -3.55, S + 0.33, -2.25));
    put(sysG, sy.chrome, new THREE.SphereGeometry(0.075, 18, 12, 0, Math.PI).translate(-3.67, S + 0.45, -2.14), new THREE.SphereGeometry(0.06, 18, 12, 0, Math.PI).translate(-3.45, S + 0.45, -2.14));
    put(sysG, sy.lens, rb(0.46, 0.16, 0.02, 0.05, -3.55, S + 0.35, -2.13));
    put(sysG, sy.orange, bx(-3.33, -3.27, S + 0.38, S + 0.42, -2.135, -2.12));
    // ---- Brakes & suspension: a brake disc with its caliper and a coil spring.
    unit(-1.45, -0.3, sy.sChassis);
    put(sysG, sy.disc, hcyl(0.17, 0.03, -3.6, S + 0.5, -0.85, "z", 32));
    put(sysG, sy.dark, hcyl(0.06, 0.035, -3.6, S + 0.5, -0.85, "z", 16));
    put(sysG, sy.caliper, rb(0.1, 0.09, 0.06, 0.02, -3.47, S + 0.55, -0.85));
    put(sysG, sy.grey, bx(-3.64, -3.56, S + 0.33, S + 0.36, -0.9, -0.8));
    {
      const pts: Vec3[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2 * 5;
        pts.push([-3.05 + 0.05 * Math.cos(a), S + 0.36 + (i / 64) * 0.24, -0.85 + 0.05 * Math.sin(a)]);
      }
      put(sysG, sy.spring, tube(THREE, pts, 0.008, 5, false, 128));
      put(sysG, sy.chrome, cyl(0.015, 0.28, -3.05, S + 0.33, -0.85, 8));
    }
    // ---- Seats, glass & modules: a seat module and a windscreen rack.
    unit(-0.1, 1.0, sy.sModules);
    put(sysG, sy.seat, rb(0.2, 0.06, 0.2, 0.03, -3.55, S + 0.33, 0.5), rb(0.2, 0.22, 0.05, 0.025, -3.55, S + 0.36, 0.38), rb(0.12, 0.06, 0.04, 0.02, -3.55, S + 0.58, 0.38));
    put(sysG, sy.steel, bx(-3.2, -2.9, S + 0.33, S + 0.35, 0.3, 0.75));
    put(sysG, sy.windscreen, ...[0, 1, 2].map((i) => new THREE.PlaneGeometry(0.28, 0.13).rotateX(-0.35).translate(-3.05, S + 0.42, 0.42 + i * 0.12)));
    // Parts trucks running into the hall.
    for (const [x, z] of [
      [-2.55, -2.0],
      [-2.55, 0.3],
    ] as [number, number][]) {
      put(sysG, sy.truck, rb(0.12, 0.12, 0.13, 0.02, x, S + 0.02, z + 0.18));
      put(sysG, sy.white, rb(0.14, 0.14, 0.26, 0.01, x, S + 0.03, z - 0.04));
      put(sysG, sy.rubber, hcyl(0.03, 0.15, x, S + 0.03, z + 0.15, "x", 10), hcyl(0.03, 0.15, x, S + 0.03, z - 0.1, "x", 10));
    }
    // A modules truck in the front yard delivering seats and windscreens to the line.
    {
      const x = -2.65,
        z = 1.9;
      put(sysG, sy.truck, rb(0.13, 0.12, 0.12, 0.02, x, S + 0.02, z - 0.2));
      put(sysG, sy.grey, bx(x - 0.07, x + 0.07, S + 0.05, S + 0.07, z - 0.14, z + 0.18));
      put(sysG, sy.seat, ...[0, 1].map((k) => rb(0.07, 0.05, 0.07, 0.015, x, S + 0.07, z - 0.06 + k * 0.12)), ...[0, 1].map((k) => rb(0.07, 0.08, 0.02, 0.01, x, S + 0.1, z - 0.09 + k * 0.12)));
      put(sysG, sy.windscreen, new THREE.PlaneGeometry(0.12, 0.08).rotateY(Math.PI / 2).rotateZ(0.3).translate(x + 0.05, S + 0.13, z + 0.1));
      put(sysG, sy.rubber, hcyl(0.025, 0.13, x, S + 0.025, z - 0.2, "x", 10), hcyl(0.025, 0.13, x, S + 0.025, z + 0.12, "x", 10));
    }
    people(sysG, sy, [
      [-2.65, S, -1.2, 1.5],
      [-2.65, S, -0.6, 1.5],
      [-4.2, S, 1.08],
    ], [0x1e9e76, 0x2f5d9a]);
  }

  // ================================================================ LAYER 2: ENGINE + DRIVELINE (EAST)
  const gears = new THREE.Group();
  {
    const shop = (z0: number, z1: number, mat: T.Material) => {
      put(pwrG, pw2.shop, ...facadeShell(2.75, 4.45, z0, z1, S, S + 0.3, 0.34, 0.3));
      put(pwrG, pw2.grey, bx(2.73, 4.47, S + 0.3, S + 0.33, z0 - 0.02, z1 + 0.02));
      put(pwrG, mat, vPlane(0.7, 0.1, 3.6, S + 0.22, z1 + 0.006));
    };
    // ---- Engine parts: a giant piston and a crankshaft.
    shop(-2.85, -1.65, pw2.sEngine);
    put(pwrG, pw2.alu, cyl(0.1, 0.16, 3.4, S + 0.4, -2.25, 24));
    put(pwrG, pw2.dark, ...[0.035, 0.06, 0.085].map((h) => cyl(0.102, 0.008, 3.4, S + 0.4 + 0.16 - h, -2.25, 24)));
    put(pwrG, pw2.forged, bar(THREE, [3.4, S + 0.33, -2.25], [3.4, S + 0.42, -2.25], 0.03, 8));
    {
      const crank: T.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) {
        const x = 3.65 + i * 0.12;
        const up = i % 2 ? 1 : -1;
        crank.push(hcyl(0.018, 0.05, x - 0.03, S + 0.43, -2.25, "x", 10));
        crank.push(bx(x, x + 0.02, S + 0.38 + (up > 0 ? 0.04 : -0.0), S + 0.48 + (up > 0 ? 0.04 : 0), -2.29, -2.21));
        crank.push(hcyl(0.016, 0.06, x + 0.05, S + 0.43 + up * 0.04, -2.25, "x", 10));
      }
      put(pwrG, pw2.forged, ...crank);
      put(pwrG, pw2.grey, bx(3.6, 4.15, S + 0.33, S + 0.36, -2.32, -2.18));
    }
    // ---- Fuel & exhaust: a catalytic converter with pipes, and a fuel injector.
    shop(-1.45, -0.3, pw2.sFuel);
    put(pwrG, pw2.cat, hcyl(0.09, 0.3, 3.6, S + 0.45, -0.85, "x", 24));
    put(pwrG, pw2.steel, hcyl(0.03, 0.18, 3.33, S + 0.45, -0.85, "x", 12), hcyl(0.03, 0.18, 3.87, S + 0.45, -0.85, "x", 12));
    put(pwrG, pw2.grey, bx(3.45, 3.5, S + 0.33, S + 0.37, -0.9, -0.8), bx(3.7, 3.75, S + 0.33, S + 0.37, -0.9, -0.8));
    put(pwrG, pw2.dark, cyl(0.025, 0.2, 4.15, S + 0.33, -0.6, 12), new THREE.ConeGeometry(0.025, 0.05, 12).rotateX(Math.PI).translate(4.15, S + 0.31, -0.6));
    put(pwrG, pw2.orange, cyl(0.03, 0.05, 4.15, S + 0.53, -0.6, 12));
    // ---- Gears, bearings & chains: a turning gear pair, a bearing ring, a chain loop.
    shop(-0.1, 1.0, pw2.sDrive);
    const gearGeo = (r: number, teeth: number, w: number) => {
      const sh = new THREE.Shape();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rr = i % 2 ? r : r * 0.86;
        const a2 = a + Math.PI / (teeth * 2);
        if (i === 0) sh.moveTo(rr * Math.cos(a), rr * Math.sin(a));
        else sh.lineTo(rr * Math.cos(a), rr * Math.sin(a));
        sh.lineTo(rr * Math.cos(a2), rr * Math.sin(a2));
      }
      const hole = new THREE.Path();
      hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
      sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, curveSegments: 8 });
      g.translate(0, 0, -w / 2);
      return g;
    };
    // The pair stands on the roof turned towards the SE camera.
    const gA = new THREE.Mesh(gearGeo(0.16, 14, 0.04), pw2.gear);
    gA.position.set(-0.13, 0.52, 0);
    const gB = new THREE.Mesh(gearGeo(0.1, 9, 0.04), pw2.gear);
    gB.position.set(0.13, 0.48, 0);
    gears.add(gA, gB);
    gears.position.set(3.58, S, 0.5);
    gears.rotation.y = 0.75;
    pwrG.add(gears);
    put(pwrG, pw2.grey, bx(3.5, 3.66, S + 0.33, S + 0.37, 0.44, 0.56));
    put(pwrG, pw2.steel, new THREE.TorusGeometry(0.08, 0.025, 10, 28).rotateX(Math.PI / 2).translate(4.1, S + 0.36, 0.3), new THREE.TorusGeometry(0.05, 0.012, 8, 24).rotateX(Math.PI / 2).translate(4.1, S + 0.36, 0.3));
    {
      const links: T.BufferGeometry[] = [];
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        links.push(rb(0.025, 0.012, 0.012, 0.004, 4.1 + 0.18 * Math.cos(a) * 0.6, S + 0.34, 0.75 + 0.08 * Math.sin(a)).rotateY(0));
      }
      put(pwrG, pw2.dark, ...links);
    }
    // Forklifts and crates heading to the hall.
    put(pwrG, pw2.yellow, rb(0.1, 0.07, 0.07, 0.015, 2.55, S + 0.02, -1.0), rb(0.1, 0.07, 0.07, 0.015, 2.55, S + 0.02, 0.6));
    put(pwrG, pw2.wood, bx(2.48, 2.62, S + 0.09, S + 0.16, -1.04, -0.96), bx(2.48, 2.62, S + 0.09, S + 0.16, 0.56, 0.64));
    people(pwrG, pw2, [
      [3.1, S, -1.55, 0.2],
      [4.2, S, 1.1, 2.5],
      [3.2, S, -0.15, 0],
    ], [0xd96c2b, 0x2f5d9a]);
  }

  // ================================================================ LAYER 3: AFTERMARKET ROW (BACK)
  {
    // ---- Tyre plant: a shed with a giant tyre on the roof and stacks of tyres in front.
    put(aftG, af.shed, ...facadeShell(-2.35, -0.85, -3.15, -2.45, S, S + 0.3, 0.3, 0.3));
    put(aftG, af.grey, bx(-2.37, -0.83, S + 0.3, S + 0.33, -3.17, -2.43));
    put(aftG, af.sTyres, vPlane(0.5, 0.1, -1.95, S + 0.2, -2.444));
    const tyre = (x: number, y: number, z: number, r: number, w: number, axis: "x" | "z" | "y") => {
      const g = new THREE.TorusGeometry(r, w, 12, 32);
      if (axis === "y") g.rotateX(Math.PI / 2);
      if (axis === "x") g.rotateY(Math.PI / 2);
      return g.translate(x, y, z);
    };
    put(aftG, af.rubber, tyre(-1.6, S + 0.52, -2.75, 0.17, 0.06, "z"));
    put(aftG, af.steel, new THREE.CircleGeometry(0.12, 24).translate(-1.6, S + 0.52, -2.745));
    put(aftG, af.grey, bx(-1.66, -1.54, S + 0.33, S + 0.36, -2.8, -2.7));
    const stacks: T.BufferGeometry[] = [];
    for (const [x, z, n] of [
      [-2.2, -2.2, 5],
      [-1.95, -2.2, 4],
      [-1.7, -2.15, 6],
      [-1.2, -2.2, 3],
      [-1.0, -2.05, 5],
    ] as [number, number, number][])
      for (let k = 0; k < n; k++) stacks.push(tyre(x, S + 0.018 + k * 0.036, z, 0.06, 0.018, "y"));
    put(aftG, af.rubber, ...stacks);
    // ---- Battery & lubricant depot: a giant battery on the roof, drums and cans.
    put(aftG, af.shed, ...facadeShell(-0.65, 0.65, -3.15, -2.5, S, S + 0.28, 0.3, 0.28));
    put(aftG, af.grey, bx(-0.67, 0.67, S + 0.28, S + 0.31, -3.17, -2.48));
    put(aftG, af.sParts, vPlane(0.6, 0.1, 0.0, S + 0.19, -2.494));
    put(aftG, af.battery, rb(0.36, 0.17, 0.22, 0.02, 0.0, S + 0.31, -2.8));
    put(aftG, af.batteryTop, rb(0.37, 0.03, 0.23, 0.01, 0.0, S + 0.48, -2.8));
    put(aftG, af.red, cyl(0.025, 0.04, -0.1, S + 0.51, -2.8, 12));
    put(aftG, af.dark, cyl(0.025, 0.04, 0.1, S + 0.51, -2.8, 12));
    const drums: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) drums.push(cyl(0.04, 0.11, -0.5 + (i % 3) * 0.09, S, -2.3 - Math.floor(i / 3) * 0.09, 12));
    put(aftG, af.oil, ...drums);
    put(aftG, af.yellow, ...[0.3, 0.4, 0.5].map((x) => rb(0.06, 0.08, 0.04, 0.01, x, S, -2.3)));
    // ---- Dealer showroom: glass front with cars inside, and a used-car lot beside it.
    put(aftG, af.show, ...facadeShell(0.9, 2.4, -3.15, -2.25, S, S + 0.3, 0.375, 0.3, "se"));
    put(aftG, af.white, ...facadeShell(0.9, 2.4, -3.15, -2.25, S, S + 0.3, 1, 1, "nw"));
    put(aftG, af.dark, bx(0.88, 2.42, S + 0.3, S + 0.34, -3.17, -2.23));
    put(aftG, af.sDealer, vPlane(0.6, 0.1, 1.65, S + 0.38, -2.23));
    put(aftG, af.dark, bx(1.33, 1.97, S + 0.33, S + 0.43, -2.24, -2.235));
    car(aftG, af, 1.3, -2.7, 0.4, 0xb8382e, S, 1.0);
    car(aftG, af, 1.95, -2.75, -0.4, 0xeef0f2, S, 1.0);
    put(aftG, af.sUsed, vPlane(0.4, 0.08, 2.25, S + 0.2, -1.83));
    put(aftG, af.dark, bx(2.08, 2.1, S, S + 0.2, -1.84, -1.82), bx(2.4, 2.42, S, S + 0.2, -1.84, -1.82));
    for (let i = 0; i < 3; i++) car(aftG, af, 2.5 + i * 0.6, -2.1, 0, [0x8d97a1, 0x2f5d9a, 0x3d6b4f][i], S, 0.95);
    people(aftG, af, [
      [1.2, S, -2.1, 0],
      [1.5, S, -2.05, -2.5],
      [-1.4, S, -2.0, 0.5],
      [0.2, S, -2.15, 2.0],
    ]);
  }

  // ================================================================ STATIC: ROAD + TREES
  {
    for (const [x, z, s] of [
      [-4.4, -3.15, 0.9],
      [4.4, -3.15, 0.9],
      [-4.5, 0.95, 0.7],
      [4.5, 1.05, 0.7],
      [-2.55, 2.55, 0.7],
      [2.6, 2.55, 0.7],
    ] as [number, number, number][])
      tree(baseG, yd, x, z, s);
    // A car carrier on the road with cars on its decks.
    put(baseG, yd.blue, rb(0.2, 0.16, 0.16, 0.02, 1.8, S + 0.03, 3.25));
    put(baseG, yd.grey, bx(0.4, 1.68, S + 0.06, S + 0.08, 3.17, 3.33), bx(0.4, 1.68, S + 0.2, S + 0.22, 3.17, 3.33));
    put(baseG, yd.rubber, ...[0.5, 0.75, 1.5, 1.85].map((x) => hcyl(0.035, 0.17, x, S + 0.035, 3.25, "z", 12)));
    for (let i = 0; i < 4; i++) car(baseG, yd, 0.55 + (i % 2) * 0.55, 3.25, Math.PI, [0xeef0f2, 0xb8382e, 0x1f2a36, 0x8d97a1][i], S + (i < 2 ? 0.08 : 0.22), 0.8);
    car(baseG, yd, -3.0, 2.95, 0, 0xe2b33a);
    car(baseG, yd, -1.2, 3.22, Math.PI, 0x2f5d9a);
    car(baseG, yd, 3.4, 2.95, 0, 0x8a2b2b);
    const lamps: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-3.9, -2.0, 0.0, 2.0, 3.9]) {
      lamps.push(cyl(0.008, 0.36, x, S, 2.7, 6));
      heads.push(rb(0.05, 0.015, 0.03, 0.006, x, S + 0.36, 2.7));
    }
    put(baseG, yd.dark, ...lamps);
    put(baseG, yd.lamp, ...heads);
  }

  flush();

  // ---------------------------------------------------------------- animation
  // Cars move down both lines (wrapping round) and the gears turn.
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  lip.onBeforeRender = () => {
    const t = performance.now() / 1000;
    for (const ln of lineCars) {
      const span = ln.x1 - ln.x0;
      for (let i = 0; i < ln.n; i++) {
        const x = ln.x0 + ((((t * ln.speed + (i * span) / ln.n) % span) + span) % span);
        pos.set(x, ln.y, ln.z);
        m4.compose(pos, q, one);
        ln.im?.setMatrixAt(i, m4);
        ln.cab?.setMatrixAt(i, m4);
      }
      if (ln.im) ln.im.instanceMatrix.needsUpdate = true;
      if (ln.cab) ln.cab.instanceMatrix.needsUpdate = true;
    }
    const [gA, gB] = gears.children;
    gA.rotation.z = t * 0.5;
    gB.rotation.z = -t * 0.5 * (14 / 9) + 0.2;
  };

  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("yard", 1);
      L.set("veh", pw(v, [[0, 1], [1, 0.3], [2, 0.22], [3, 0.18]]));
      L.set("hallRoof", pw(v, [[0, 0.75], [0.6, 0.5], [1, 0.3], [3, 0.2]]));
      L.set("sys", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("pwr", pw(v, [[0, 1], [2, 1], [2.7, 0.3], [3, 0.25]]));
      L.set("aft", 1);
    },
  };
}
