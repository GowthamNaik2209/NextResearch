// Chemicals & Agrochem: a miniature chemical complex on a display plinth (generic, no real
// company's plant, logo or livery; signs use plain words).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Front: the farm-input strip - a crop field with a spraying drone and a crop-protection
//     store, a fertiliser plant (prilling tower, bag warehouse) and a seed greenhouse.
//   · West: the specialty plants - a multipurpose custom-synthesis block with glass-lined
//     reactors, fluorochemical spheres and refrigerant cylinders, and in the front-west
//     corner the big intermediates plant with its distillation columns.
//   · East, back -> front: adhesives and aroma chemicals (a giant glue tube), a carbon-black
//     plant with black silos and dye drums, and the chlor-alkali cell house by a soda-ash pile.
//   · Back row on the water: a cracker with its flare, the explosives magazines behind earth
//     berms, the feedstock tank farm and the jetty where a tanker unloads; a road-tanker
//     terminal stands by the road on the east.
//   · Between them: a pipe rack, cooling towers, a control room and a rail siding with wagons.
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Farm Inputs             the front strip
//   1 Specialty Chemicals     farm inputs ghost -> the specialty plants
//   2 Commodity Chemicals     specialty ghosts -> cracker, explosives, chlor-alkali
//   3 Feedstock & Logistics   commodity ghosts -> tank farm, jetty, road-tanker terminal
// The drone hovers, the flare flickers and steam rises from the cooling towers (animated: true).
import type * as T from "three";
import { type Three, type Vec3, bar, canvasTexture, clamp01, contactShadow, layerMats, lathe, lerp, mergeInto, roundedBox, tube } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// ------------------------------------------------------------------ key dims
const S = 0.42; // street level (top of the plinth)
const PX = 4.7,
  PZ = 3.4,
  PR = 0.4; // plinth half-sizes + corner radius

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/chemicals.ts). The bottom rail runs west -> east
// along the farm strip, the left rail back -> front through the specialty plants, the right rail
// back -> front down the east side to the road-tanker terminal and the top rail west -> east
// along the waterfront, so the
// markers keep the rails' order in every view (scripts/check-crossings.mjs).
export const CHEMICALS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: farm strip
  crop_protection: { pos: [-1.8, S + 0.32, 2.2], side: "bottom" }, // spraying drone over the field
  fertilisers: { pos: [-0.35, S + 0.3, 2.15], side: "bottom" }, // fertiliser bag stacks
  seeds: { pos: [1.3, S + 0.36, 2.2], side: "bottom" }, // seed greenhouse
  // layer 1: specialty plants
  custom_synthesis: { pos: [-3.72, S + 0.15, -1.59], side: "left" }, // custom synthesis office sign
  fluorochem: { pos: [-3.75, S + 0.45, -0.65], side: "left" }, // refrigerant sphere
  intermediates: { pos: [-3.75, S + 0.2, 2.36], side: "left" }, // intermediates plant sign
  consumer_specialty: { pos: [4.3, S + 0.36, -1.75], side: "right" }, // aroma-chemical still behind the adhesives plant
  carbon_colour: { pos: [3.75, S + 0.62, 0.0], side: "right" }, // carbon-black silos
  // layer 2: commodity
  chlor_alkali: { pos: [4.42, S + 0.26, 0.875], side: "right" }, // cell house east gable
  petchem: { pos: [0.0, S + 0.98, -2.3], side: "top" }, // cracker column
  explosives: { pos: [1.3, S + 0.26, -2.3], side: "top" }, // magazine berms
  // layer 3: feedstock and logistics
  feedstock: { pos: [3.7, S + 0.3, -3.0], side: "top" }, // tanker unloading at the jetty
  terminals: { pos: [4.35, S + 0.3, 1.85], side: "right" }, // terminal storage tank
};

export const CHEMICALS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.4, 6.8, 9.4],
    target: [0, 0.8, 0],
    narration:
      "Welcome to the chemical complex. Crude-oil and gas feedstock arrives at the jetty at the back, commodity plants turn it into polymers, soda ash and nitrates, specialty plants make intermediates, refrigerants and custom molecules, and the farm inputs in front reach the fields. Peel it layer by layer, from the farm to the feedstock.",
  },
  {
    id: "farm",
    layer: 0,
    label: "Farm Inputs",
    pos: [1.0, 3.0, 7.4],
    target: [-0.4, 0.6, 1.6],
    narration:
      "The farm-input strip. A drone sprays the field with crop-protection chemicals from makers like UPL and PI Industries, the fertiliser plant prills urea and bags complex fertilisers like Chambal and Coromandel, and the greenhouse grows hybrid seed.",
  },
  {
    id: "specialty",
    layer: 1,
    label: "Specialty Chemicals",
    pos: [0.6, 7.6, 7.2],
    target: [0.0, 0.3, -0.3],
    narration:
      "The specialty plants. On the west, reactors make custom molecules for global innovators like Aether and Anupam Rasayan do, spheres hold refrigerants like SRF's and Navin Fluorine's, and the columns of an intermediates plant like Aarti's or Deepak's. On the east, adhesives and aroma chemicals like Pidilite's, and carbon black like PCBL's.",
  },
  {
    id: "commodity",
    layer: 2,
    label: "Commodity Chemicals",
    pos: [5.8, 4.6, 2.4],
    target: [1.8, 0.4, -1.4],
    narration:
      "Commodity chemicals. A cracker turns feedstock into polymers and solvents, the kind Reliance runs. Behind earth berms, explosives magazines store mining explosives like Solar Industries'. In front, a chlor-alkali cell house and a soda-ash pile like Tata Chemicals'.",
  },
  {
    id: "feedstock",
    layer: 3,
    label: "Feedstock & Logistics",
    pos: [6.8, 6.2, 6.8],
    target: [2.0, 0.3, -0.5],
    narration:
      "Feedstock and logistics. At the back, a tanker unloads at the jetty and the tank farm holds naphtha and gas from refiners and gas companies like IOC, BPCL and GAIL, piped to the plants on a long pipe rack. By the road, a tank terminal stores liquid chemicals and loads them into road tankers.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the farm strip along the front, the specialty plants on the west, adhesives, carbon black and chlor-alkali down the east, and the cracker, magazines, tank farm and jetty on the waterfront at the back.",
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

export function buildChemicals(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [agriG, specG, commG, feedG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const R = rng(20261122);

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
  const plantTex = windows(5, 2, "#e4e2dc", "#8fb3cf", "#4a6a88", 0.15, 10);
  const officeTex = windows(5, 3, "#eef0f2", "#6e8aa2", "#3d536b", 0.25, 8);
  const tCrop = sign("CROP CARE", "#1e7a5c", "#ffffff", 256, 64, 36);
  const tFert = sign("FERTILISER", "#1e7a5c", "#ffffff", 256, 64, 34);
  const tSeeds = sign("SEEDS", "#1e7a5c", "#ffffff", 256, 64, 40);
  const tCustom = sign("CUSTOM SYNTHESIS", "#93127f", "#ffffff", 512, 64, 36);
  const tFluoro = sign("FLUOROCHEMICALS", "#93127f", "#ffffff", 512, 64, 36);
  const tInter = sign("INTERMEDIATES", "#1e5f86", "#ffffff", 512, 64, 38);
  const tAdh = sign("ADHESIVES  •  AROMA", "#1e5f86", "#ffffff", 512, 64, 32);
  const tCarbon = sign("CARBON BLACK  •  COLOURS", "#1e5f86", "#ffffff", 512, 64, 28);
  const tChlor = sign("CHLOR-ALKALI  •  SODA ASH", "#b4561f", "#ffffff", 512, 64, 28);
  const tExpl = sign("EXPLOSIVES", "#b8382e", "#ffffff", 256, 64, 34);
  const tTerm = sign("TANK TERMINAL", "#3d5a80", "#ffffff", 256, 64, 30);
  const bagTex = tex(64, 64, (g, w, h) => {
    g.fillStyle = "#f1eee6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2f8f4a";
    g.fillRect(0, h * 0.35, w, h * 0.3);
  });

  // ---------------------------------------------------------------- materials
  const ag = {
    ...pal("agri"),
    plant: L.add("agri", std(0xffffff, 0.1, 0.6, { map: plantTex })),
    sCrop: signMat("agri", tCrop, 0.5),
    sFert: signMat("agri", tFert, 0.5),
    sSeeds: signMat("agri", tSeeds, 0.5),
    bag: L.add("agri", std(0xffffff, 0.05, 0.8, { map: bagTex })),
    crop: L.add("agri", std(0x5e9a3a, 0, 0.8)),
    mist: L.add("agri", std(0xd8f0ff, 0, 0.3, { opacity: 0.35, emissive: 0x9fd0ff, emissiveIntensity: 0.4, depthWrite: false })),
  };
  const sp = {
    ...pal("spec"),
    plant: L.add("spec", std(0xffffff, 0.1, 0.6, { map: plantTex })),
    office: L.add("spec", std(0xffffff, 0.1, 0.55, { map: officeTex })),
    sCustom: signMat("spec", tCustom, 0.5),
    sFluoro: signMat("spec", tFluoro, 0.5),
    sInter: signMat("spec", tInter, 0.5),
    sAdh: signMat("spec", tAdh, 0.5),
    sCarbon: signMat("spec", tCarbon, 0.5),
    reactor: L.add("spec", std(0x2f6fb0, 0.4, 0.3)),
    vessel: L.add("spec", std(0xdfe5ea, 0.85, 0.25)),
    teal: L.add("spec", std(0x2f9f9a, 0.4, 0.35)),
    black: L.add("spec", std(0x1a1b1e, 0.3, 0.7)),
    tubeWhite: L.add("spec", std(0xf4f4f0, 0.2, 0.35)),
    cap: L.add("spec", std(0xd96c2b, 0.3, 0.4)),
    smoke: L.add("spec", std(0x6a6d72, 0, 1, { opacity: 0.45, depthWrite: false })),
  };
  const cm = {
    ...pal("comm"),
    plant: L.add("comm", std(0xffffff, 0.1, 0.6, { map: plantTex })),
    sChlor: signMat("comm", tChlor, 0.5),
    sExpl: signMat("comm", tExpl, 0.5),
    ash: L.add("comm", std(0xf5f5f2, 0, 0.9)),
    berm: L.add("comm", std(0x6f8f4a, 0, 0.95)),
    column: L.add("comm", std(0xd5d9de, 0.8, 0.3)),
    flame: L.add("comm", std(0xffb040, 0, 0.4, { emissive: 0xff8a2a, emissiveIntensity: 1.6 })),
    silo: L.add("comm", std(0xf2f2ee, 0.3, 0.45)),
  };
  const fd = {
    ...pal("feed"),
    tank: L.add("feed", std(0xe9ecef, 0.5, 0.4)),
    sTerm: signMat("feed", tTerm, 0.5),
    hull: L.add("feed", std(0x8a2b2b, 0.3, 0.5)),
    deck: L.add("feed", std(0x3d5a3a, 0.2, 0.6)),
  };
  const ut = pal("util");
  ut.white.color.setHex(0xf2f2ee);
  ut.concrete.side = DS;

  // ================================================================ PLINTH + GROUND
  const lip = buildPlinth(baseG, 0x1f2731, 0x2f8fbf, ({ g, P, rect, GS: gs }) => {
    rect(-PX, -PZ, PX, PZ, "#b3b4ae");
    g.strokeStyle = "rgba(0,0,0,0.05)";
    for (let x = -PX; x <= PX; x += 0.2) {
      g.beginPath();
      g.moveTo(...P(x, -PZ));
      g.lineTo(...P(x, PZ));
      g.stroke();
    }
    // Water along the back east half, with a quay edge.
    rect(0.8, -PZ, PX, -2.85, "#3f7fa6");
    g.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 40; i++) {
      const [a, b] = P(0.9 + ((i * 0.37) % 3.7), -3.35 + ((i * 0.13) % 0.45));
      g.fillRect(a, b, 0.15 * gs, 2);
    }
    rect(0.8, -2.88, PX, -2.82, "#d8d9db");
    // Farm strip: crop rows on the west, earth by the greenhouse, field on the east.
    rect(-PX, 1.7, PX, 2.7, "#8a7356");
    g.fillStyle = "#6f8f3a";
    for (let z = 1.75; z < 2.65; z += 0.1) {
      for (const [x0, x1] of [
        [-2.55, -1.1],
      ]) {
        const [a, b] = P(x0, z);
        g.fillRect(a, b, (x1 - x0) * gs, 0.045 * gs);
      }
    }
    // Road along the front.
    rect(-PX, 2.78, PX, PZ, "#3b3e43");
    rect(-PX, 2.72, PX, 2.78, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.1);
      g.fillRect(a, b, 0.25 * gs, 3);
    }
    // Rail siding.
    rect(-2.8, 1.25, 2.9, 1.45, "#7a6e5e");
    g.fillStyle = "#4a4d52";
    for (const z of [1.31, 1.39]) {
      const [a, b] = P(-2.8, z);
      g.fillRect(a, b, 5.7 * gs, 2);
    }
    // Bunded plant pads.
    for (const [x0, z0, x1, z1] of [
      [-4.5, -3.1, -2.9, -1.5],
      [-4.5, -1.35, -2.9, 0.1],
      [-4.55, 0.3, -2.6, 2.65],
      [2.95, -1.65, 4.55, 1.55],
      [-0.75, -2.8, 2.95, -1.8],
    ])
      rect(x0, z0, x1, z1, "#a3a5a3");
  });

  // ---------------------------------------------------------------- plant kit
  /** Vertical vessel with a dome top. */
  const vessel = (r: number, h: number, x: number, y: number, z: number) => [cyl(r, h, x, y, z, 18), new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, y + h, z)];
  /** Column with platforms every `step`. */
  const column = (r: number, h: number, x: number, z: number, step = 0.22) => {
    const out = [...vessel(r, h, x, S, z)];
    const plat: T.BufferGeometry[] = [];
    for (let y = step; y < h - 0.05; y += step) plat.push(new THREE.CylinderGeometry(r + 0.03, r + 0.03, 0.008, 18).translate(x, S + y, z));
    return { shell: out, plat };
  };
  /** Sphere tank on four legs. */
  const sphereTank = (r: number, x: number, z: number) => {
    const legs: T.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      legs.push(cyl(0.008, r + 0.06, x + Math.cos(a) * r * 0.75, S, z + Math.sin(a) * r * 0.75, 6));
    }
    return { ball: new THREE.SphereGeometry(r, 20, 14).translate(x, S + r + 0.06, z), legs };
  };
  /** Open steel structure (posts + floors). */
  const structure = (x0: number, x1: number, z0: number, z1: number, levels: number, lh: number) => {
    const posts: T.BufferGeometry[] = [];
    const floors: T.BufferGeometry[] = [];
    for (const x of [x0, x1]) for (const z of [z0, z1]) posts.push(bx(x - 0.012, x + 0.012, S, S + levels * lh, z - 0.012, z + 0.012));
    for (let l = 1; l <= levels; l++) floors.push(bx(x0, x1, S + l * lh - 0.01, S + l * lh, z0, z1));
    return { posts, floors };
  };

  // ================================================================ LAYER 0: FARM STRIP
  const drone = new THREE.Group();
  {
    // ---- Crop field: crops, a crop-care store, the spraying drone.
    const plants: Item[] = [];
    for (let z = 1.78; z < 2.62; z += 0.1) for (let x = -2.45; x < -1.15; x += 0.1) plants.push({ p: [x + (R() - 0.5) * 0.03, S, z], s: [1, 0.7 + R() * 0.5, 1] });
    inst(agriG, new THREE.ConeGeometry(0.03, 0.07, 6).translate(0, 0.035, 0), ag.crop, plants);
    put(agriG, ag.plant, ...facadeShell(-2.45, -1.75, 1.0, 1.45, S, S + 0.24, 0.25, 0.24));
    put(agriG, ag.roof, gable(-2.45, -1.75, 1.0, 1.45, S + 0.24, 0.1));
    put(agriG, ag.sCrop, vPlane(0.5, 0.1, -2.1, S + 0.15, 1.455));
    {
      const arms: T.BufferGeometry[] = [];
      const rotors: T.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        arms.push(bar(THREE, [0, 0, 0], [Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1], 0.006, 4));
        rotors.push(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 14).translate(Math.cos(a) * 0.1, 0.012, Math.sin(a) * 0.1));
      }
      drone.add(new THREE.Mesh(mergeInto(THREE, [rb(0.08, 0.04, 0.08, 0.012, 0, -0.02, 0), ...arms, bx(-0.12, 0.12, -0.05, -0.045, -0.005, 0.005)]), ag.dark));
      drone.add(new THREE.Mesh(mergeInto(THREE, rotors), ag.glass));
      drone.add(new THREE.Mesh(cyl(0.025, 0.04, 0, -0.06, 0, 12), ag.white));
      drone.add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 16, 1, true).translate(0, -0.16, 0), ag.mist));
      drone.position.set(-1.8, S + 0.32, 2.2);
      agriG.add(drone);
    }
    people(agriG, ag, [
      [-2.3, S, 1.6, 0.6],
      [-1.3, S, 1.62, Math.PI],
    ], [0xe2b33a, 0xeef0f2]);
    // ---- Fertiliser plant: prilling tower, ammonia sphere, bag warehouse and stacks.
    put(agriG, ag.concrete, cyl(0.14, 0.95, -0.95, S, 1.0, 20));
    put(agriG, ag.grey, cyl(0.16, 0.06, -0.95, S + 0.95, 1.0, 20), bx(-1.02, -0.88, S + 1.01, S + 1.07, 0.93, 1.07));
    {
      const t = sphereTank(0.15, -1.5, 0.95);
      put(agriG, ag.white, t.ball);
      put(agriG, ag.steel, ...t.legs);
    }
    put(agriG, ag.plant, ...facadeShell(-0.7, 0.4, 1.5, 1.9, S, S + 0.22, 0.27, 0.22));
    put(agriG, ag.grey, gable(-0.7, 0.4, 1.5, 1.9, S + 0.22, 0.08));
    put(agriG, ag.sFert, vPlane(0.5, 0.09, -0.15, S + 0.15, 1.905));
    const bags: T.BufferGeometry[] = [];
    for (let l = 0; l < 3; l++)
      for (let i = 0; i < 6 - l; i++)
        for (let k = 0; k < 2; k++) bags.push(rb(0.07, 0.035, 0.045, 0.012, -0.55 + i * 0.075 + l * 0.037, S + l * 0.036, 2.08 + k * 0.05));
    put(agriG, ag.bag, ...bags);
    put(agriG, ag.wood, bx(-0.6, -0.05, S, S + 0.005, 2.03, 2.2));
    // ---- Seed greenhouse with seed sacks.
    put(agriG, ag.glass, ...facadeShell(1.25, 2.45, 1.85, 2.5, S, S + 0.2, 1, 1));
    put(agriG, ag.glass, gable(1.25, 2.45, 1.85, 2.5, S + 0.2, 0.16, 0));
    const ribs: T.BufferGeometry[] = [];
    for (let i = 0; i <= 6; i++) ribs.push(bx(1.25 + i * 0.2 - 0.006, 1.25 + i * 0.2 + 0.006, S, S + 0.2, 2.495, 2.505));
    put(agriG, ag.white, ...ribs, bx(1.25, 2.45, S + 0.2, S + 0.21, 2.49, 2.51));
    const sprouts: Item[] = [];
    for (let i = 0; i < 10; i++) for (let k = 0; k < 5; k++) sprouts.push({ p: [1.33 + i * 0.11, S, 1.93 + k * 0.12], s: [0.8, 0.8, 0.8] });
    inst(agriG, new THREE.ConeGeometry(0.03, 0.07, 6).translate(0, 0.035, 0), ag.crop, sprouts);
    put(agriG, ag.sSeeds, vPlane(0.36, 0.08, 1.85, S + 0.32, 2.48));
    put(agriG, ag.wood, bx(1.65, 2.05, S + 0.24, S + 0.4, 2.47, 2.475));
    put(agriG, ag.yellow, ...[2.6, 2.7, 2.8].map((x) => rb(0.07, 0.09, 0.05, 0.015, x, S, 2.2)));
    people(agriG, ag, [
      [2.65, S, 2.4, 2.0],
      [0.5, S, 2.2, -1.2],
    ]);
  }

  // ================================================================ LAYER 1: SPECIALTY PLANTS
  const smoke: T.Mesh[] = [];
  {
    // ---- Custom synthesis: a three-level structure of glass-lined reactors and a small office.
    {
      const s = structure(-4.35, -3.1, -2.95, -2.0, 3, 0.2);
      put(specG, sp.steel, ...s.posts);
      put(specG, sp.grey, ...s.floors);
      const rx: T.BufferGeometry[] = [];
      for (let l = 0; l < 3; l++) for (const x of [-4.1, -3.7, -3.35]) if (!(l === 2 && x === -4.1)) rx.push(...vessel(0.07, 0.1, x, S + l * 0.2, -2.45));
      put(specG, sp.reactor, ...rx);
      put(specG, sp.office, ...facadeShell(-4.35, -3.1, -1.95, -1.6, S, S + 0.22, 0.25, 0.22));
      put(specG, sp.grey, bx(-4.37, -3.08, S + 0.22, S + 0.25, -1.97, -1.58));
      put(specG, sp.sCustom, vPlane(0.9, 0.09, -3.72, S + 0.15, -1.595));
    }
    // ---- Fluorochemicals: two refrigerant spheres, a cylinder park, a plant building.
    for (const [x, z] of [
      [-3.75, -0.7],
      [-4.2, -0.95],
    ] as [number, number][]) {
      const t = sphereTank(0.15, x, z);
      put(specG, sp.white, t.ball);
      put(specG, sp.steel, ...t.legs);
    }
    const cyls: T.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) cyls.push(...vessel(0.025, 0.09, -3.35 + i * 0.065, S, -0.2 + k * 0.065));
    put(specG, sp.teal, ...cyls);
    put(specG, sp.plant, ...facadeShell(-4.4, -3.4, -0.4, -0.05, S, S + 0.2, 0.25, 0.2));
    put(specG, sp.grey, bx(-4.42, -3.38, S + 0.2, S + 0.23, -0.42, -0.03));
    put(specG, sp.sFluoro, vPlane(0.8, 0.08, -3.9, S + 0.13, -0.045));
    // ---- Intermediates (front-west corner): three distillation columns, reactors, exchangers,
    // plant block. Drawn round the old centre and shifted into place.
    const putI = (m: T.Material, ...gs: T.BufferGeometry[]) => put(specG, m, ...gs.map((g) => g.translate(-1.95, 0, 1.75)));
    {
      const c1 = column(0.08, 0.95, -1.75, -0.5),
        c2 = column(0.065, 0.78, -1.45, -0.75),
        c3 = column(0.055, 0.62, -2.05, -0.85);
      putI(sp.vessel, ...c1.shell, ...c2.shell, ...c3.shell);
      putI(sp.grey, ...c1.plat, ...c2.plat, ...c3.plat);
      putI(sp.steel, ...[-1.75, -1.45, -2.05].map((x, i) => tube(THREE, [[x, S + [0.9, 0.73, 0.57][i], [-0.5, -0.75, -0.85][i]], [x + 0.15, S + [0.95, 0.78, 0.62][i], [-0.5, -0.75, -0.85][i]], [x + 0.2, S + 0.3, [-0.5, -0.75, -0.85][i]]], 0.01, 5)));
      const rx: T.BufferGeometry[] = [];
      for (const x of [-2.45, -2.2, -1.1, -0.85]) rx.push(...vessel(0.08, 0.16, x, S, -0.1));
      putI(sp.vessel, ...rx);
      putI(sp.steel, hcyl(0.04, 0.35, -1.0, S + 0.08, -1.2, "x", 14), hcyl(0.04, 0.35, -1.0, S + 0.08, -1.32, "x", 14));
      putI(sp.plant, ...facadeShell(-2.6, -1.0, 0.2, 0.6, S, S + 0.24, 0.32, 0.24));
      putI(sp.grey, bx(-2.62, -0.98, S + 0.24, S + 0.27, 0.18, 0.62));
      putI(sp.sInter, vPlane(0.9, 0.09, -1.8, S + 0.16, 0.605));
    }
    // ---- Adhesives & aroma: a plant with a giant glue tube on the roof, drums.
    put(specG, sp.plant, ...facadeShell(3.05, 4.45, -1.55, -0.8, S, S + 0.26, 0.28, 0.26));
    put(specG, sp.grey, bx(3.03, 4.47, S + 0.26, S + 0.29, -1.57, -0.78));
    put(specG, sp.sAdh, vPlane(0.9, 0.09, 3.75, S + 0.19, -0.795));
    {
      // Tube: a flattened crimp at one end, a cone neck and cap at the other.
      const y = S + 0.4,
        z = -1.15;
      put(specG, sp.tubeWhite, hcyl(0.08, 0.42, 3.75, y, z, "x", 20), bx(3.48, 3.55, y - 0.012, y + 0.012, z - 0.09, z + 0.09));
      put(specG, sp.cap, new THREE.ConeGeometry(0.08, 0.08, 20).rotateZ(-Math.PI / 2).translate(4.0, y, z), hcyl(0.035, 0.07, 4.07, y, z, "x", 14));
      put(specG, sp.blue, hcyl(0.081, 0.12, 3.72, y, z, "x", 20));
      put(specG, sp.grey, bx(3.6, 3.66, S + 0.29, y - 0.07, z - 0.03, z + 0.03), bx(3.85, 3.91, S + 0.29, y - 0.07, z - 0.03, z + 0.03));
    }
    // Aroma still: a copper pot with its swan-neck condenser behind the plant.
    put(specG, sp.cap, ...vessel(0.09, 0.14, 4.3, S, -1.75), tube(THREE, [[4.3, S + 0.3, -1.75], [4.18, S + 0.34, -1.75], [4.05, S + 0.2, -1.75]], 0.012, 6));
    put(specG, sp.steel, cyl(0.04, 0.12, 4.02, S, -1.75, 12));
    const drums: Item[] = [];
    for (let i = 0; i < 5; i++) drums.push({ p: [3.15 + i * 0.09, S, -0.65], c: [0x2f5d9a, 0xe2b33a, 0x2f5d9a, 0xd96c2b, 0x2f5d9a][i] });
    // ---- Carbon black & colours: black silos, a reactor tube with stack, dye drums.
    for (const x of [3.3, 3.55, 3.8]) put(specG, sp.black, ...vessel(0.1, 0.42, x, S, 0.05));
    put(specG, sp.steel, ...[3.3, 3.55, 3.8].map((x) => cyl(0.03, 0.02, x, S + 0.52, 0.05, 10)));
    put(specG, sp.black, hcyl(0.07, 0.6, 3.75, S + 0.07, -0.3, "x", 16));
    put(specG, sp.grey, cyl(0.04, 0.75, 4.3, S, -0.1, 12, 0.03));
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), sp.smoke);
      m.position.set(4.3, S + 0.8 + i * 0.1, -0.1);
      specG.add(m);
      smoke.push(m);
    }
    put(specG, sp.sCarbon, vPlane(1.0, 0.08, 3.75, S + 0.06, 0.3));
    put(specG, sp.dark, bx(3.24, 4.26, S, S + 0.11, 0.29, 0.295));
    for (let i = 0; i < 6; i++) drums.push({ p: [3.15 + i * 0.09, S, 0.42], c: [0xc8352c, 0x2f5d9a, 0xe2b33a, 0x3d8a4a, 0x8a3ab0, 0xd96c2b][i] });
    inst(specG, cyl(0.035, 0.1, 0, 0, 0, 12), sp.paint, drums);
    people(specG, sp, [
      [-3.0, S, -1.75, 1.5],
      [-2.8, S, 1.25, 2.0],
      [3.1, S, -0.4, 0.4],
      [-3.3, S, -0.55, -2.0],
    ], [0xeef0f2, 0x2f5d9a, 0xe2b33a]);
  }

  // ================================================================ LAYER 2: COMMODITY
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 10).translate(0, 0.08, 0), cm.flame);
  {
    // ---- Chlor-alkali: a long cell house, a soda-ash pile on a conveyor, caustic tanks.
    put(commG, cm.plant, ...facadeShell(3.05, 4.45, 0.7, 1.05, S, S + 0.2, 0.28, 0.2));
    put(commG, cm.grey, gable(3.05, 4.45, 0.7, 1.05, S + 0.2, 0.08));
    put(commG, cm.sChlor, vPlane(1.0, 0.08, 3.75, S + 0.12, 1.055));
    put(commG, cm.ash, new THREE.ConeGeometry(0.22, 0.24, 24).translate(3.55, S + 0.12, 1.32));
    put(commG, cm.dark, bar(THREE, [3.95, S + 0.02, 1.3], [3.6, S + 0.3, 1.32], 0.015, 6));
    put(commG, cm.white, ...vessel(0.07, 0.18, 4.2, S, 1.3), ...vessel(0.07, 0.18, 4.38, S, 1.3));
    // ---- Cracker: furnace box, two columns, polymer silos and the flare.
    put(commG, cm.plant, ...facadeShell(-0.65, -0.15, -2.75, -2.35, S, S + 0.3, 0.25, 0.3));
    put(commG, cm.dark, bx(-0.65, -0.15, S + 0.3, S + 0.33, -2.75, -2.35));
    put(commG, cm.grey, ...[-0.55, -0.4, -0.25].map((x) => cyl(0.02, 0.25, x, S + 0.33, -2.55, 8)));
    {
      const c1 = column(0.08, 0.95, 0.0, -2.3),
        c2 = column(0.06, 0.72, 0.25, -2.55);
      put(commG, cm.column, ...c1.shell, ...c2.shell);
      put(commG, cm.grey, ...c1.plat, ...c2.plat);
    }
    put(commG, cm.silo, ...[0.45, 0.62].flatMap((x) => vessel(0.07, 0.32, x, S, -2.05)));
    put(commG, cm.steel, cyl(0.015, 1.05, 0.7, S, -2.7, 8));
    flame.position.set(0.7, S + 1.05, -2.7);
    commG.add(flame);
    // ---- Explosives: grassed earth berms round the magazines, a banded office.
    for (const [x, z] of [
      [1.1, -2.45],
      [1.5, -2.45],
    ] as [number, number][]) {
      put(commG, cm.berm, new THREE.CylinderGeometry(0.15, 0.15, 0.28, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(x, S, z));
      put(commG, cm.concrete, bx(x - 0.06, x + 0.06, S, S + 0.08, z + 0.13, z + 0.15));
      put(commG, cm.dark, bx(x - 0.04, x + 0.04, S, S + 0.06, z + 0.151, z + 0.155));
    }
    put(commG, cm.white, ...facadeShell(0.95, 1.65, -2.1, -1.88, S, S + 0.14, 1, 1));
    put(commG, cm.red, bx(0.94, 1.66, S + 0.14, S + 0.17, -2.11, -1.87));
    put(commG, cm.sExpl, vPlane(0.45, 0.08, 1.3, S + 0.08, -1.875));
  }

  // ================================================================ LAYER 3: FEEDSTOCK + TERMINALS
  {
    // ---- Tank farm: floating-roof tanks inside a bund wall.
    for (const [x, z, r] of [
      [2.1, -2.55, 0.17],
      [2.5, -2.55, 0.17],
      [2.1, -2.12, 0.15],
      [2.55, -2.12, 0.15],
    ] as [number, number, number][]) {
      put(feedG, fd.tank, cyl(r, 0.24, x, S, z, 28));
      put(feedG, fd.grey, cyl(r - 0.01, 0.005, x, S + 0.215, z, 28));
      put(feedG, fd.steel, tube(THREE, [[x + r * 0.7, S, z + r * 0.7], [x + r * 0.9, S + 0.12, z + r * 0.3], [x + r * 0.7, S + 0.24, z - r * 0.7]], 0.004, 4));
    }
    put(feedG, fd.concrete, bx(1.85, 2.85, S, S + 0.04, -2.79, -2.76), bx(1.85, 2.85, S, S + 0.04, -1.9, -1.87), bx(1.85, 1.88, S, S + 0.04, -2.79, -1.87), bx(2.82, 2.85, S, S + 0.04, -2.79, -1.87));
    // ---- Import jetty: small receiving tanks, the pier, loading arms and a tanker.
    for (const [x, z] of [
      [3.2, -2.45],
      [3.45, -2.45],
      [3.7, -2.45],
      [3.2, -2.15],
      [3.45, -2.15],
    ] as [number, number][])
      put(feedG, fd.white, ...vessel(0.09, 0.16, x, S, z));
    // ---- Road-tanker terminal by the road: storage tanks, a loading gantry, tank trucks.
    put(feedG, fd.concrete, bx(3.0, 4.55, S, S + 0.01, 1.62, 2.66));
    for (const x of [3.2, 3.48, 3.76, 4.35]) put(feedG, fd.white, ...vessel(0.1, 0.2, x, S + 0.01, 1.85));
    put(feedG, fd.steel, ...[3.55, 4.25].flatMap((x) => [bx(x - 0.015, x + 0.015, S, S + 0.3, 2.15, 2.18), bx(x - 0.015, x + 0.015, S, S + 0.3, 2.42, 2.45)]));
    put(feedG, fd.grey, bx(3.53, 4.27, S + 0.28, S + 0.32, 2.13, 2.47));
    put(feedG, fd.yellow, ...[3.75, 4.05].map((x) => bar(THREE, [x, S + 0.28, 2.3], [x + 0.03, S + 0.17, 2.3], 0.008, 6)));
    put(feedG, fd.sTerm, vPlane(0.5, 0.08, 3.9, S + 0.3, 2.471));
    for (const x of [3.75, 4.08]) {
      put(feedG, fd.blue, rb(0.11, 0.11, 0.12, 0.02, x + 0.13, S + 0.02, 2.3));
      put(feedG, fd.white, hcyl(0.055, 0.24, x - 0.04, S + 0.085, 2.3, "x", 14));
      put(feedG, fd.rubber, ...[x - 0.12, x + 0.04, x + 0.15].map((xx) => hcyl(0.025, 0.13, xx, S + 0.025, 2.3, "z", 10)));
    }
    put(feedG, fd.concrete, bx(3.55, 3.85, S - 0.03, S + 0.01, -3.0, -2.82), bx(3.0, 4.4, S - 0.03, S + 0.01, -3.05, -2.95));
    const arms: T.BufferGeometry[] = [];
    for (const x of [3.45, 3.7, 3.95]) arms.push(bar(THREE, [x, S, -2.97], [x, S + 0.24, -2.97], 0.01, 6), bar(THREE, [x, S + 0.24, -2.97], [x + 0.04, S + 0.12, -3.08], 0.008, 6));
    put(feedG, fd.yellow, ...arms);
    // Tanker: hull, deck, deckhouse at the stern, pipe manifold.
    {
      const sh = new THREE.Shape();
      sh.moveTo(-0.6, -0.1);
      sh.lineTo(0.5, -0.1);
      sh.quadraticCurveTo(0.68, -0.1, 0.72, 0);
      sh.quadraticCurveTo(0.68, 0.1, 0.5, 0.1);
      sh.lineTo(-0.6, 0.1);
      sh.lineTo(-0.6, -0.1);
      const hull = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
      hull.rotateX(-Math.PI / 2).translate(3.7, S - 0.08, -3.18);
      put(feedG, fd.hull, hull);
      put(feedG, fd.deck, bx(3.12, 4.3, S + 0.02, S + 0.025, -3.27, -3.09));
      put(feedG, fd.white, rb(0.16, 0.14, 0.17, 0.01, 3.2, S + 0.02, -3.18));
      put(feedG, fd.steel, hcyl(0.008, 0.9, 3.8, S + 0.04, -3.18, "x", 6));
    }
    people(feedG, fd, [
      [3.6, S, -2.88, 0],
      [3.85, S, -2.9, 2.0],
      [2.95, S, -2.0, 1.2],
    ], [0xd96c2b, 0xe2b33a]);
  }

  // ================================================================ STATIC: PIPE RACK, UTILITIES, RAIL
  const steam: T.Mesh[] = [];
  {
    // Pipe rack from the jetty along the back of the plants to the west block.
    const posts: T.BufferGeometry[] = [];
    for (let x = -2.7; x <= 2.9; x += 0.4) posts.push(bx(x - 0.01, x + 0.01, S, S + 0.2, -1.72, -1.7), bx(x - 0.01, x + 0.01, S, S + 0.2, -1.6, -1.58), bx(x - 0.01, x + 0.01, S + 0.19, S + 0.2, -1.72, -1.58));
    put(baseG, ut.grey, ...posts);
    put(baseG, ut.steel, ...[-1.69, -1.65, -1.61].map((z) => hcyl(0.012, 5.6, 0.1, S + 0.215, z, "x", 8)));
    put(baseG, ut.yellow, hcyl(0.015, 5.6, 0.1, S + 0.24, -1.65, "x", 8));
    // Control room and lab block.
    put(baseG, ut.white, ...facadeShell(0.2, 1.1, -1.2, -0.7, S, S + 0.2, 1, 1));
    put(baseG, ut.mon, vPlane(0.6, 0.1, 0.65, S + 0.11, -0.695));
    put(baseG, ut.grey, bx(0.18, 1.12, S + 0.2, S + 0.23, -1.22, -0.68));
    // Drum warehouse and a lab between the plants.
    put(baseG, ut.concrete, ...facadeShell(-2.4, -1.25, -1.25, -0.6, S, S + 0.2, 1, 1));
    put(baseG, ut.grey, gable(-2.4, -1.25, -1.25, -0.6, S + 0.2, 0.09));
    put(baseG, ut.blue, ...[-2.3, -2.2, -2.1, -2.0].map((x) => cyl(0.035, 0.1, x, S, -0.45, 12)));
    put(baseG, ut.white, ...facadeShell(-1.05, -0.6, -0.4, 0.1, S, S + 0.16, 1, 1));
    put(baseG, ut.mon, vPlane(0.3, 0.06, -0.825, S + 0.09, 0.105));
    put(baseG, ut.grey, bx(-1.07, -0.58, S + 0.16, S + 0.18, -0.42, 0.12));
    // Cooling towers with rising steam.
    for (const x of [1.65, 2.2]) {
      put(baseG, ut.concrete, lathe(THREE, [[0.15, 0], [0.11, 0.22], [0.1, 0.32], [0.115, 0.44]], 24).translate(x, S, -0.9));
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), ut.glass);
        m.position.set(x, S + 0.5 + i * 0.12, -0.9);
        baseG.add(m);
        steam.push(m);
      }
    }
    // Rail siding with tank wagons.
    for (let i = 0; i < 5; i++) {
      const x = -2.3 + i * 0.5;
      put(baseG, ut.white, hcyl(0.06, 0.4, x, S + 0.1, 1.35, "x", 14));
      put(baseG, ut.dark, bx(x - 0.22, x + 0.22, S + 0.02, S + 0.04, 1.29, 1.41));
    }
    // Road: a chemical tanker truck and a bag truck.
    put(baseG, ut.blue, rb(0.13, 0.13, 0.15, 0.02, -1.4, S + 0.03, 3.25), rb(0.13, 0.13, 0.15, 0.02, 2.6, S + 0.03, 2.95));
    put(baseG, ut.white, hcyl(0.07, 0.4, -1.67, S + 0.1, 3.25, "x", 14));
    put(baseG, ut.yellow, rb(0.34, 0.13, 0.16, 0.01, 2.33, S + 0.04, 2.95));
    put(baseG, ut.rubber, ...[-1.8, -1.55, -1.38].map((x) => hcyl(0.03, 0.17, x, S + 0.03, 3.25, "z", 10)), ...[2.2, 2.45, 2.62].map((x) => hcyl(0.03, 0.17, x, S + 0.03, 2.95, "z", 10)));
    for (const [x, z, s] of [
      [-0.5, 0.95, 0.8],
      [1.0, 0.8, 0.8],
      [2.7, 0.9, 0.7],
      [-2.75, -3.1, 0.8],
      [0.3, -0.2, 0.7],
    ] as [number, number, number][])
      tree(baseG, ut, x, z, s);
    people(baseG, ut, [
      [0.5, S, -0.5, 0],
      [1.0, S, 1.0, 1.0],
    ]);
  }

  flush();

  // ---------------------------------------------------------------- animation
  lip.onBeforeRender = () => {
    const t = performance.now() / 1000;
    drone.position.x = -1.8 + Math.sin(t * 0.5) * 0.3;
    drone.position.y = S + 0.32 + Math.sin(t * 1.7) * 0.015;
    const f = 1 + Math.sin(t * 9) * 0.12 + Math.sin(t * 13.7) * 0.08;
    flame.scale.set(1, f, 1);
    steam.forEach((m, i) => {
      const k = ((t * 0.15 + (i % 3) / 3) % 1 + 1) % 1;
      m.position.y = S + 0.48 + k * 0.4;
      m.scale.setScalar(0.6 + k * 0.9);
    });
    smoke.forEach((m, i) => {
      const k = ((t * 0.12 + i / 3) % 1 + 1) % 1;
      m.position.y = S + 0.78 + k * 0.35;
      m.position.x = 4.3 + k * 0.08;
      m.scale.setScalar(0.5 + k);
    });
  };

  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("util", pw(v, [[0, 1], [1, 1], [3, 0.6]]));
      L.set("agri", pw(v, [[0, 1], [1, 0.3], [2, 0.22], [3, 0.18]]));
      L.set("spec", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("comm", pw(v, [[0, 1], [2, 1], [2.7, 0.3], [3, 0.25]]));
      L.set("feed", 1);
    },
  };
}
