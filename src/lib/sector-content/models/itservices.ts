// IT Services & GCCs: a miniature tech park on a display plinth (generic, no real company's
// building, logo or livery; signs use plain words).
//
// Plan (+X east, +Z south/front; the default camera looks in from the SE):
//   · Front row on the road: the large IT services campus (two glass towers joined by a
//     skybridge), a mid-tier firm's tower, and a data & AI pavilion with a glowing network
//     sculpture on its roof.
//   · East side, back -> front: the network operations centre (glass data hall with racks, a
//     network-map wall and a telecom mast), the software-products studio under its "cloud", and
//     three global capability centre blocks round a globe.
//   · West side, back -> front: the engineering R&D lab with a car on a test rig, a drone and a
//     robot arm, the BPM centre with a giant headset on its roof, and the healthcare claims office.
//   · Back row: the talent pipeline - a hiring pavilion, a flexible office building and a
//     training academy whose graduates walk across the campus green to the towers.
//
// Layers peel outside -> inside by crossfading (ghosting, never hiding):
//   0 Services Firms          the front row and the network centre
//   1 Engineering & Products  services ghost -> the R&D lab and the products studio
//   2 Operations & GCCs       engineering ghosts -> BPM, healthcare and GCC blocks
//   3 Talent & Workspace      operations ghost -> hiring, flex offices, academy
// The drone hovers, the robot arm swings, and the data wall, network map and racks animate.
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
// Rails stack in the zones' array order (sectors/itservices.ts). The bottom rail runs west -> east
// along the front row, the left rail back -> front down the west side, the right rail back ->
// front down the east side and the top rail west -> east along the back row, so the markers keep
// the rails' order in every view (scripts/check-crossings.mjs).
export const ITSERVICES_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: front row + network centre
  tier1: { pos: [-1.45, S + 0.92, 1.5], side: "bottom" }, // skybridge between the campus towers
  midtier: { pos: [0.15, S + 0.75, 1.96], side: "bottom" }, // mid-tier tower's sign
  data_ai: { pos: [1.75, S + 0.72, 1.68], side: "bottom" }, // network sculpture on the AI pavilion
  infra_services: { pos: [4.25, S + 0.78, -1.95], side: "right" }, // telecom mast dish
  // layer 1: R&D lab + products studio
  erd: { pos: [-3.85, S + 0.2, -1.85], side: "left" }, // car on the test rig
  saas_products: { pos: [3.75, S + 0.78, -0.7], side: "right" }, // the studio's cloud
  // layer 2: operations + GCCs
  bpm: { pos: [-3.6, S + 0.8, -0.45], side: "left" }, // headset on the BPM centre
  healthcare_ops: { pos: [-3.3, S + 0.32, 2.15], side: "left" }, // claims screen outside the office
  gccs: { pos: [3.72, S + 0.55, 1.45], side: "right" }, // globe between the GCC blocks
  // layer 3: talent row
  staffing: { pos: [-2.0, S + 0.36, -2.25], side: "top" }, // hiring pavilion
  flex_workspace: { pos: [0.85, S + 0.5, -1.82], side: "top" }, // flex office facade
  skilling: { pos: [1.95, S + 0.5, -1.92], side: "top" }, // academy front
};

export const ITSERVICES_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [5.4, 7.4, 11.0],
    target: [0, 0.6, 0.2],
    narration:
      "Welcome to the tech park. The services firms line the road, engineering labs and software studios sit behind them, operations centres and global capability centres fill the sides, and the hiring hall, flexible offices and academy at the back feed people into all of it. Peel it layer by layer, from the services firms to the talent behind them.",
  },
  {
    id: "services",
    layer: 0,
    label: "Services Firms",
    pos: [1.3, 4.6, 9.5],
    target: [-0.6, 0.7, 1.0],
    narration:
      "The services row. The twin towers are a large IT services campus, the kind TCS, Infosys, HCLTech and Wipro run, building and running software for global clients. Next door, a mid-tier firm like Persistent or Coforge, then a data and AI pavilion. At the back on the right, a network operations centre runs clients' networks and data centres.",
  },
  {
    id: "engineering",
    layer: 1,
    label: "Engineering & Products",
    pos: [0.4, 9.6, 8.6],
    target: [0, 0.2, -0.9],
    narration:
      "Engineering and products. On the left, an engineering R&D lab tests a car, a drone and a robot arm for carmakers, aircraft and device makers, the work of L&T Technology Services, Tata Technologies and KPIT. On the right, a software studio sells its own products as licences and subscriptions.",
  },
  {
    id: "operations",
    layer: 2,
    label: "Operations & GCCs",
    pos: [0.2, 8.8, 11.0],
    target: [0, 0.2, 0.6],
    narration:
      "Operations and capability centres. On the left, a BPM centre handles customer care and finance work, and a claims office codes and bills for US hospitals. On the right, global companies run their own capability centres in India, both rivals and customers of the listed firms.",
  },
  {
    id: "talent",
    layer: 3,
    label: "Talent & Workspace",
    pos: [3.6, 5.0, 4.6],
    target: [0.3, 0.3, -2.2],
    narration:
      "The talent row. A hiring pavilion where staffing firms and job platforms match people to roles, a flexible office building that operators fit out and lease to GCCs and services firms, and an academy whose graduates walk across the green to the towers.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the services row along the road, the R&D lab, BPM centre and claims office down the west side, the network centre, software studio and GCC blocks down the east, and the talent row across the back.",
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

export function buildItservices(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [svcG, engG, opsG, talG] = ctx.layerGroups;
  const baseG = ctx.staticGroup;
  const R = rng(20261119);

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
  const racks = (parent: T.Object3D, P: Pal, rh: number, items: Item[]) => {
    const g = new THREE.BoxGeometry(RW * 0.95, rh, RD).translate(0, rh / 2, 0);
    inst(parent, g, [P.rackSide, P.rackSide, P.rackTop, P.rackSide, P.rackFront, P.rackSide], items);
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
  const towerTex = windows(6, 10, "#1c2a38", "#86b8dc", "#2c4f73", 0.18, 3);
  const midTex = windows(5, 8, "#1d3b3a", "#7fcfc2", "#24585a", 0.15, 3);
  const pavTex = windows(4, 2, "#e8ecef", "#a8d0ea", "#3b6d93", 0.2, 6);
  const officeTex = windows(6, 4, "#eef0f2", "#6e8aa2", "#3d536b", 0.25, 6);
  const opsTex = windows(6, 4, "#f0e4d6", "#6e8aa2", "#3d536b", 0.3, 6);
  const brickTex = windows(4, 3, "#b5654a", "#6e8aa2", "#3d536b", 0.3, 10);
  const labTex = windows(3, 1, "#d9dde2", "#9cc8e6", "#3b6d93", 0.1, 10);
  const gccTex = windows(5, 6, "#2a3b52", "#9cc8e6", "#3b6d93", 0.25, 4);
  const tSvc = sign("IT SERVICES", "#1e4f7a", "#ffffff", 512, 64, 40);
  const tDigital = sign("DIGITAL", "#16756b", "#ffffff", 256, 64, 38);
  const tData = sign("DATA  •  AI", "#4b2a86", "#ffffff", 256, 64, 34);
  const tNoc = sign("NETWORK OPS", "#203040", "#9fe0ff", 256, 64, 32);
  const tErd = sign("ENGINEERING R&D", "#1e7a5c", "#ffffff", 512, 64, 38);
  const tSaas = sign("SOFTWARE PRODUCTS", "#1e7a5c", "#ffffff", 512, 64, 36);
  const tBpm = sign("CUSTOMER CARE  •  BPM", "#b4561f", "#ffffff", 512, 64, 32);
  const tHealth = sign("HEALTH CLAIMS", "#b4561f", "#ffffff", 512, 64, 40);
  const tGcc = ["BANK GCC", "TECH GCC", "RETAIL GCC"].map((s) => sign(s, "#3d5a80", "#ffffff", 256, 64, 34));
  const tHiring = sign("HIRING", "#93127f", "#ffffff", 256, 64, 40);
  const tFlex = sign("FLEX OFFICES", "#93127f", "#ffffff", 256, 64, 32);
  const tAcademy = sign("ACADEMY", "#93127f", "#ffffff", 256, 64, 38);
  // Data wall: rolling charts (offset.x scrolls).
  const dataTex = (() => {
    const t = tex(512, 128, (g, w, h) => {
      g.fillStyle = "#120c22";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 32; i++) {
        const bh = 20 + ((i * 37) % 70);
        g.fillStyle = i % 3 ? "#8a6cff" : "#3fd0c8";
        g.fillRect(6 + i * 16, h - 10 - bh, 10, bh);
      }
      g.strokeStyle = "#ffd36a";
      g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, 40 + 20 * Math.sin(x / 40));
      g.stroke();
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  })();
  // Network map: nodes and links; two frames (offset.y flips) so links blink.
  const nocTex = (() => {
    const t = tex(256, 256, (g, w, h) => {
      const nodes: [number, number][] = [];
      for (let i = 0; i < 14; i++) nodes.push([20 + ((i * 71) % 216), 14 + ((i * 43) % 100)]);
      for (let f = 0; f < 2; f++) {
        const y0 = (f * h) / 2;
        g.fillStyle = "#081620";
        g.fillRect(0, y0, w, h / 2);
        for (let i = 0; i < nodes.length; i++) {
          const [ax, ay] = nodes[i],
            [bx2, by] = nodes[(i * 5 + 3) % nodes.length];
          g.strokeStyle = (i + f) % 3 === 0 ? "#ff7a4a" : "#2fe07a";
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(ax, y0 + ay);
          g.lineTo(bx2, y0 + by);
          g.stroke();
        }
        g.fillStyle = "#9fe0ff";
        for (const [x, y] of nodes) g.fillRect(x - 3, y0 + y - 3, 6, 6);
      }
    });
    t.repeat.set(1, 0.5);
    return t;
  })();
  const dashTex = tex(256, 160, (g, w, h) => {
    g.fillStyle = "#f4f7fb";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1e7a5c";
    g.fillRect(0, 0, w, 22);
    g.fillStyle = "#ffffff";
    g.font = font(14);
    g.fillText("SUBSCRIPTIONS", 10, 16);
    g.fillStyle = "#dfe7ef";
    g.fillRect(10, 32, 70, h - 42);
    g.fillStyle = "#2e86ab";
    for (let i = 0; i < 6; i++) g.fillRect(96 + i * 25, h - 14 - (14 + i * 14), 16, 14 + i * 14);
    g.fillStyle = "#1e9e76";
    for (let i = 0; i < 5; i++) g.fillRect(16, 40 + i * 20, 40 + ((i * 17) % 20), 8);
  });
  const claimsTex = tex(256, 160, (g, w, h) => {
    g.fillStyle = "#0e1c24";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3fe08a";
    g.lineWidth = 3;
    g.beginPath();
    const pts = [0, 0, 0, -30, 26, -6, 0, 0, 0, 0, -22, 30, 0, 0];
    for (let i = 0; i <= 32; i++) g.lineTo(i * 8, 40 + (pts[i % pts.length] ?? 0));
    g.stroke();
    g.fillStyle = "#cfe8ff";
    for (let i = 0; i < 4; i++) {
      g.fillRect(14, 80 + i * 18, 120, 8);
      g.fillStyle = i % 2 ? "#ffd36a" : "#3fe08a";
      g.fillRect(150, 80 + i * 18, 60, 8);
      g.fillStyle = "#cfe8ff";
    }
  });
  const jobsTex = tex(256, 160, (g, w, h) => {
    g.fillStyle = "#1b0f22";
    g.fillRect(0, 0, w, h);
    g.font = font(18);
    ["CLOUD", "DATA", "JAVA", "SAP", "TESTING", "SECURITY"].forEach((s, i) => {
      g.fillStyle = "#ffd6f5";
      g.fillText(s, 12, 24 + i * 24);
      g.fillStyle = i % 2 ? "#ff7ad9" : "#7affc4";
      g.fillRect(150, 12 + i * 24, 30 + ((i * 29) % 70), 12);
    });
  });

  // ---------------------------------------------------------------- materials
  const sv = {
    ...pal("svc"),
    tower: L.add("svc", std(0xffffff, 0.35, 0.25, { map: towerTex })),
    mid: L.add("svc", std(0xffffff, 0.3, 0.3, { map: midTex })),
    pav: L.add("svc", std(0xffffff, 0.2, 0.3, { map: pavTex })),
    svcSign: signMat("svc", tSvc, 0.5),
    digital: signMat("svc", tDigital, 0.5),
    dataSign: signMat("svc", tData, 0.5),
    noc: signMat("svc", tNoc, 0.5),
    data: screen("svc", dataTex, 1.0),
    map: screen("svc", nocTex, 1.0),
    node: L.add("svc", std(0xb59cff, 0.2, 0.3, { emissive: 0x7b4dff, emissiveIntensity: 0.9 })),
    link: L.add("svc", std(0xd9ccff, 0.4, 0.3, { emissive: 0x4a2fb0, emissiveIntensity: 0.5 })),
    solar: L.add("svc", std(0x1d2c4a, 0.6, 0.2)),
    stone: L.add("svc", std(0xe4dccb, 0.05, 0.7)),
  };
  const en = {
    ...pal("eng"),
    lab: L.add("eng", std(0xffffff, 0.1, 0.55, { map: labTex })),
    erdSign: signMat("eng", tErd, 0.5),
    saasSign: signMat("eng", tSaas, 0.5),
    dash: screen("eng", dashTex, 0.8),
    cloud: L.add("eng", std(0xf4f8ff, 0.05, 0.5, { emissive: 0x6fb6ff, emissiveIntensity: 0.25 })),
    teal: L.add("eng", std(0x1e9e76, 0.3, 0.4)),
    arm: L.add("eng", std(0xe8a33a, 0.4, 0.4)),
  };
  const op = {
    ...pal("ops"),
    ops: L.add("ops", std(0xffffff, 0.1, 0.6, { map: opsTex })),
    gcc: L.add("ops", std(0xffffff, 0.3, 0.3, { map: gccTex })),
    bpmSign: signMat("ops", tBpm, 0.5),
    healthSign: signMat("ops", tHealth, 0.5),
    gccSign: tGcc.map((t) => signMat("ops", t, 0.5)),
    claims: screen("ops", claimsTex, 0.9),
    headset: L.add("ops", std(0xd96c2b, 0.3, 0.4)),
    globe: L.add("ops", std(0x3d7fc0, 0.2, 0.35, { emissive: 0x123a66, emissiveIntensity: 0.4 })),
    land: L.add("ops", std(0x6fbf73, 0.1, 0.5)),
  };
  const ta = {
    ...pal("tal"),
    office: L.add("tal", std(0xffffff, 0.1, 0.55, { map: officeTex })),
    brick: L.add("tal", std(0xffffff, 0.05, 0.75, { map: brickTex })),
    hiring: signMat("tal", tHiring, 0.5),
    flex: signMat("tal", tFlex, 0.5),
    academy: signMat("tal", tAcademy, 0.5),
    jobs: screen("tal", jobsTex, 0.9),
    canopy: L.add("tal", std(0xf3e9f2, 0.05, 0.6, { side: DS })),
    magenta: L.add("tal", std(0xb5179e, 0.3, 0.45)),
    cap: L.add("tal", std(0x1a1a22, 0.1, 0.6)),
    bus: L.add("tal", std(0xe2b33a, 0.35, 0.4)),
  };
  const pz = pal("plaza");

  // ================================================================ PLINTH + GROUND
  const lip = buildPlinth(baseG, 0x1f2731, 0x2f8fbf, ({ g, P, rect, GS: gs }) => {
    rect(-PX, -PZ, PX, PZ, "#b7b9b6");
    g.strokeStyle = "rgba(0,0,0,0.06)";
    for (let x = -PX; x <= PX; x += 0.2) {
      g.beginPath();
      g.moveTo(...P(x, -PZ));
      g.lineTo(...P(x, PZ));
      g.stroke();
    }
    // Road along the front.
    rect(-PX, 2.7, PX, PZ, "#3b3e43");
    rect(-PX, 2.64, PX, 2.7, "#d8d9db");
    g.fillStyle = "#ece8dc";
    for (let x = -PX; x < PX; x += 0.5) {
      const [a, b] = P(x, 3.05);
      g.fillRect(a, b, 0.25 * gs, 3);
    }
    // Campus green with a cross of paths (the talent walk runs north -> south).
    rect(-2.35, -1.35, 2.75, 0.95, "#86a865");
    rect(-2.35, -0.32, 2.75, -0.12, "#d8cdb6");
    rect(0.12, -1.45, 0.32, 0.95, "#d8cdb6");
    // Back row forecourt.
    rect(-2.4, -3.3, 2.8, -1.45, "#cac4b4");
    // R&D test yard with lane markings and a drone pad.
    rect(-4.55, -2.25, -2.6, -1.4, "#8f9296");
    g.strokeStyle = "#e9c84a";
    g.lineWidth = 3;
    g.strokeRect(...P(-4.4, -2.15), 1.0 * gs, 0.6 * gs);
    g.beginPath();
    g.arc(...P(-2.95, -1.8), 0.22 * gs, 0, Math.PI * 2);
    g.stroke();
    // Plazas in front of the GCC blocks and the claims office.
    rect(2.95, 0.5, 4.55, 2.55, "#c9c2b0");
    rect(-4.55, 0.5, -2.65, 2.55, "#c9c2b0");
    rect(2.95, -3.3, 4.55, -1.45, "#a6aab0");
  });

  // ================================================================ LAYER 0: SERVICES ROW + NETWORK CENTRE
  {
    // ---- Large IT services campus: two glass towers on a podium, joined by a skybridge.
    put(svcG, sv.stone, rb(1.9, 0.18, 1.0, 0.04, -1.5, S, 1.55));
    put(svcG, sv.glass, vPlane(1.6, 0.12, -1.5, S + 0.08, 2.055));
    put(svcG, sv.svcSign, vPlane(0.9, 0.11, -1.5, S + 0.13, 2.06));
    put(svcG, sv.tower, ...facadeShell(-2.25, -1.62, 1.15, 1.85, S + 0.18, S + 1.55, 0.21, 0.14));
    put(svcG, sv.tower, ...facadeShell(-1.28, -0.72, 1.2, 1.8, S + 0.18, S + 1.2, 0.19, 0.14));
    put(svcG, sv.dark, bx(-2.28, -1.59, S + 1.55, S + 1.6, 1.12, 1.88), bx(-1.31, -0.69, S + 1.2, S + 1.25, 1.17, 1.83));
    put(svcG, sv.grey, bx(-2.1, -1.8, S + 1.6, S + 1.7, 1.3, 1.6), bx(-1.15, -0.9, S + 1.25, S + 1.32, 1.35, 1.6));
    put(svcG, sv.frame, bx(-1.62, -1.28, S + 0.84, S + 0.86, 1.4, 1.6), bx(-1.62, -1.28, S + 0.98, S + 1.0, 1.4, 1.6));
    put(svcG, sv.glass, bx(-1.62, -1.28, S + 0.86, S + 0.98, 1.41, 1.59));
    people(svcG, sv, [
      [-1.9, S, 2.2, 0.4],
      [-1.4, S, 2.25, Math.PI],
      [-1.05, S, 2.2, 2.2],
      [-0.6, S, 2.3],
    ]);
    // ---- Mid-tier firm: a teal tower with solar panels on the roof.
    put(svcG, sv.mid, ...facadeShell(-0.3, 0.6, 1.2, 1.95, S, S + 0.9, 0.18, 0.11));
    put(svcG, sv.dark, bx(-0.32, 0.62, S + 0.9, S + 0.93, 1.18, 1.97));
    put(svcG, sv.digital, vPlane(0.5, 0.12, 0.15, S + 0.75, 1.956));
    const panels: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) panels.push(bx(-0.22 + i * 0.26, -0.02 + i * 0.26, S + 0.95, S + 0.965, 1.3 + k * 0.28, 1.5 + k * 0.28).rotateX(0));
    put(svcG, sv.solar, ...panels);
    // ---- Data & AI pavilion: a low glass box with a glowing network sculpture on the roof.
    put(svcG, sv.pav, ...facadeShell(1.0, 2.5, 1.3, 2.05, S, S + 0.4, 0.37, 0.2));
    put(svcG, sv.white, bx(0.97, 2.53, S + 0.4, S + 0.44, 1.27, 2.08));
    put(svcG, sv.dataSign, vPlane(0.5, 0.1, 1.35, S + 0.33, 2.056));
    put(svcG, sv.data, vPlane(0.75, 0.2, 2.05, S + 0.2, 2.056));
    const nodes: Vec3[] = [];
    for (let l = 0; l < 3; l++)
      for (let i = 0; i < 3; i++) nodes.push([1.45 + l * 0.3, S + 0.52 + (l === 1 ? 0.12 : 0.04) + i * 0.08, 1.55 + (i - 1) * 0.16]);
    const links: T.BufferGeometry[] = [];
    for (let l = 0; l < 2; l++) for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) links.push(bar(THREE, nodes[l * 3 + i], nodes[(l + 1) * 3 + k], 0.005, 4));
    put(svcG, sv.link, ...links, cyl(0.012, 0.12, 1.75, S + 0.44, 1.55, 6));
    put(svcG, sv.node, ...nodes.map((p) => new THREE.SphereGeometry(0.03, 10, 8).translate(...p)));
    // ---- Network operations centre: a glass data hall with racks, the map wall, a mast.
    put(svcG, sv.concrete, bx(3.05, 3.9, S, S + 0.02, -3.05, -2.0));
    const rk: Item[] = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) rk.push({ p: [3.2 + i * RW, S + 0.02, -2.75 + r * 0.38] });
    racks(svcG, sv, 0.24, rk);
    put(svcG, sv.glass, ...facadeShell(3.05, 3.9, -3.05, -2.0, S, S + 0.3, 1, 1, "se"));
    put(svcG, sv.frame, bx(3.04, 3.91, S + 0.3, S + 0.34, -3.06, -1.99));
    put(svcG, sv.noc, vPlane(0.5, 0.09, 3.48, S + 0.32, -1.985));
    put(svcG, sv.grey, bx(3.05, 3.08, S, S + 0.3, -3.05, -2.0), bx(3.05, 3.9, S, S + 0.3, -3.08, -3.05));
    put(svcG, sv.white, ...facadeShell(3.98, 4.5, -3.05, -2.45, S, S + 0.32, 1, 1));
    put(svcG, sv.dark, bx(3.96, 4.52, S + 0.32, S + 0.35, -3.07, -2.43));
    put(svcG, sv.map, vPlane(0.46, 0.22, 4.24, S + 0.16, -2.445));
    put(svcG, sv.grey, ...[3.3, 3.6].map((x) => bx(x - 0.1, x + 0.1, S + 0.34, S + 0.4, -2.8, -2.3)));
    // Mast with dishes.
    put(svcG, sv.steel, cyl(0.025, 0.85, 4.25, S, -1.95, 8, 0.015));
    put(svcG, sv.white, ...[0.55, 0.72].map((h, i) => new THREE.CylinderGeometry(0.07, 0.04, 0.03, 16).rotateX(Math.PI / 2).rotateY(i ? 0.6 : 2.2).translate(4.25 + (i ? 0.05 : -0.05), S + h, -1.95 + (i ? 0.04 : 0.02))));
    put(svcG, sv.red, cyl(0.012, 0.03, 4.25, S + 0.85, -1.95, 6));
    people(svcG, sv, [
      [3.45, S + 0.02, -2.15, 0],
      [4.1, S, -2.25, Math.PI / 2],
    ]);
  }

  // ================================================================ LAYER 1: R&D LAB + PRODUCTS STUDIO
  const drone = new THREE.Group();
  const robotArm = new THREE.Group();
  {
    // ---- Engineering R&D lab: a sawtooth-roofed lab and its open test yard.
    put(engG, en.lab, ...facadeShell(-4.5, -3.2, -3.1, -2.3, S, S + 0.38, 0.43, 0.38));
    put(engG, en.white, ...sawtooth(-4.5, -3.2, -3.1, -2.3, S + 0.38, 4, 0.1));
    put(engG, en.erdSign, vPlane(0.9, 0.11, -3.85, S + 0.3, -2.295));
    // Car on a rolling-road test rig under a sensor gantry.
    put(engG, en.dark, bx(-4.2, -3.5, S, S + 0.03, -2.0, -1.7));
    put(engG, en.steel, hcyl(0.025, 0.2, -4.0, S + 0.035, -1.85, "z", 10), hcyl(0.025, 0.2, -3.7, S + 0.035, -1.85, "z", 10));
    car(engG, en, -3.85, -1.85, 0, 0xe8ecef, S + 0.03, 1.15);
    put(engG, en.yellow, bar(THREE, [-4.15, S, -2.05], [-4.15, S + 0.32, -2.05], 0.01, 6), bar(THREE, [-3.55, S, -2.05], [-3.55, S + 0.32, -2.05], 0.01, 6), bar(THREE, [-4.15, S + 0.32, -2.05], [-3.55, S + 0.32, -2.05], 0.01, 6));
    put(engG, en.dark, rb(0.08, 0.05, 0.05, 0.01, -3.85, S + 0.27, -2.05));
    put(engG, en.desk, bx(-4.45, -4.25, S, S + 0.09, -1.65, -1.5));
    put(engG, en.mon, vPlane(0.12, 0.07, -4.35, S + 0.14, -1.49));
    people(engG, en, [
      [-4.35, S, -1.42, Math.PI],
      [-3.35, S, -1.6, -2.4],
    ], [0xeef0f2, 0x1e9e76]);
    // Drone over the pad (hovers).
    {
      const arms: T.BufferGeometry[] = [];
      const rotors: T.BufferGeometry[] = [];
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        arms.push(bar(THREE, [0, 0, 0], [sx * 0.07, 0, sz * 0.07], 0.006, 4));
        rotors.push(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 14).translate(sx * 0.07, 0.012, sz * 0.07));
      }
      drone.add(new THREE.Mesh(mergeInto(THREE, [rb(0.07, 0.03, 0.07, 0.01, 0, -0.015, 0), ...arms]), en.dark));
      drone.add(new THREE.Mesh(mergeInto(THREE, rotors), en.glass));
      drone.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6).translate(0, -0.03, 0.03), en.teal));
      drone.position.set(-2.95, S + 0.38, -1.8);
      engG.add(drone);
    }
    // Robot arm by the lab door (swings), with a jet-engine on a stand beside it.
    put(engG, en.dark, cyl(0.05, 0.04, -3.05, S, -2.7, 14));
    robotArm.position.set(-3.05, S + 0.04, -2.7);
    {
      const a = [bar(THREE, [0, 0, 0], [0, 0.18, 0], 0.018, 8), bar(THREE, [0, 0.18, 0], [0.14, 0.26, 0], 0.014, 8), new THREE.SphereGeometry(0.024, 10, 8).translate(0, 0.18, 0)];
      robotArm.add(new THREE.Mesh(mergeInto(THREE, a), en.arm));
      robotArm.add(new THREE.Mesh(rb(0.04, 0.03, 0.03, 0.006, 0.15, 0.24, 0), en.dark));
    }
    engG.add(robotArm);
    put(engG, en.steel, hcyl(0.07, 0.22, -2.85, S + 0.14, -2.45, "x", 18), new THREE.ConeGeometry(0.05, 0.08, 14).rotateZ(-Math.PI / 2).translate(-2.7, S + 0.14, -2.45));
    put(engG, en.dark, new THREE.CircleGeometry(0.066, 18).rotateY(-Math.PI / 2).translate(-2.961, S + 0.14, -2.45));
    put(engG, en.grey, bx(-2.95, -2.75, S, S + 0.07, -2.5, -2.4));

    // ---- Software products studio: a white studio, a dashboard screen and its "cloud".
    put(engG, en.white, ...facadeShell(3.1, 4.4, -1.2, -0.25, S, S + 0.34, 1, 1));
    put(engG, en.glass, vPlane(1.2, 0.18, 3.75, S + 0.12, -0.245));
    put(engG, en.teal, bx(3.08, 4.42, S + 0.34, S + 0.37, -1.22, -0.23));
    put(engG, en.saasSign, vPlane(0.9, 0.08, 3.75, S + 0.28, -0.244));
    put(engG, en.dash, vPlane(0.5, 0.32, 3.3, S + 0.6, -0.55, 0.5));
    put(engG, en.dark, bx(3.27, 3.33, S + 0.37, S + 0.44, -0.58, -0.52));
    const puffs: T.BufferGeometry[] = [];
    for (const [dx, dy, r] of [
      [-0.12, 0, 0.08],
      [0, 0.04, 0.11],
      [0.12, 0, 0.08],
      [0.05, -0.02, 0.07],
    ] as [number, number, number][])
      puffs.push(new THREE.SphereGeometry(r, 14, 10).translate(3.75 + dx, S + 0.74 + dy, -0.7));
    put(engG, en.cloud, ...puffs);
    put(engG, en.steel, ...[3.62, 3.88].map((x) => bar(THREE, [x, S + 0.37, -0.7], [x, S + 0.68, -0.7], 0.006, 5)));
    desks(engG, en, [{ p: [3.4, S, -0.95] }, { p: [3.7, S, -0.95] }, { p: [4.0, S, -0.95] }], 2, 0.24);
    seated(engG, en, [
      [3.4, S - 0.03, -0.84, Math.PI],
      [3.7, S - 0.03, -0.84, Math.PI],
      [4.0, S - 0.03, -0.84, Math.PI],
    ]);
  }

  // ================================================================ LAYER 2: OPERATIONS + GCCs
  {
    // ---- BPM centre: a warm office block with a giant headset on its roof.
    put(opsG, op.ops, ...facadeShell(-4.45, -2.75, -1.15, 0.2, S, S + 0.5, 0.28, 0.25));
    put(opsG, op.grey, bx(-4.47, -2.73, S + 0.5, S + 0.53, -1.17, 0.22));
    put(opsG, op.bpmSign, vPlane(1.0, 0.1, -3.6, S + 0.42, 0.205));
    {
      const hx = -3.6,
        hy = S + 0.55,
        hz = -0.45;
      const band = new THREE.TorusGeometry(0.2, 0.025, 8, 24, Math.PI).translate(0, 0.02, 0).translate(hx, hy, hz);
      const cups = [hcyl(0.07, 0.06, hx - 0.2, hy + 0.02, hz, "x", 18), hcyl(0.07, 0.06, hx + 0.2, hy + 0.02, hz, "x", 18)];
      const mic = tube(THREE, [[hx - 0.2, hy - 0.02, hz + 0.03], [hx - 0.15, hy - 0.1, hz + 0.12], [hx - 0.04, hy - 0.11, hz + 0.16]], 0.008, 6);
      put(opsG, op.headset, band, mic);
      put(opsG, op.dark, ...cups, new THREE.SphereGeometry(0.02, 8, 6).translate(hx - 0.04, hy - 0.11, hz + 0.16));
    }
    desks(opsG, op, [-4.1, -3.8, -3.5, -3.2].map((x) => ({ p: [x, S, 0.45] as Vec3 })), 1, 0.2);
    seated(opsG, op, [-4.1, -3.8, -3.5, -3.2].map((x) => [x, S - 0.03, 0.56, Math.PI] as [number, number, number, number]));
    // ---- Healthcare claims office: white block, medical cross, claims screen outside.
    put(opsG, op.white, ...facadeShell(-4.4, -2.85, 0.75, 1.7, S, S + 0.42, 1, 1));
    put(opsG, op.ops, ...facadeShell(-4.39, -2.86, 0.76, 1.69, S + 0.1, S + 0.36, 0.26, 0.26, "se"));
    put(opsG, op.grey, bx(-4.42, -2.83, S + 0.42, S + 0.45, 0.73, 1.72));
    put(opsG, op.healthSign, vPlane(0.8, 0.09, -3.62, S + 0.05, 1.705));
    put(opsG, op.white, cyl(0.12, 0.03, -3.6, S + 0.45, 1.2, 20));
    put(opsG, op.red, bx(-3.67, -3.53, S + 0.48, S + 0.5, 1.15, 1.25).translate(0, 0.0, 0), bx(-3.7, -3.5, S + 0.48, S + 0.5, 1.17, 1.23));
    put(opsG, op.red, bx(-3.62, -3.58, S + 0.5, S + 0.66, 1.18, 1.22), bx(-3.68, -3.52, S + 0.56, S + 0.6, 1.18, 1.22));
    put(opsG, op.claims, vPlane(0.42, 0.26, -3.3, S + 0.3, 2.15));
    put(opsG, op.dark, bx(-3.32, -3.28, S, S + 0.17, 2.13, 2.15), bx(-3.53, -3.07, S + 0.16, S + 0.17, 2.13, 2.15));
    people(opsG, op, [
      [-3.8, S, 2.0, 0.3],
      [-3.0, S, 2.3, -2.4],
      [-4.1, S, 1.9],
    ]);
    // ---- Global capability centres: three captive blocks round a globe.
    const blocks: [number, number, number, number][] = [
      [3.25, 1.0, 0.55, 0],
      [4.15, 1.0, 0.68, 1],
      [3.7, 2.05, 0.45, 2],
    ];
    for (const [x, z, h, k] of blocks) {
      put(opsG, op.gcc, ...facadeShell(x - 0.27, x + 0.27, z - 0.25, z + 0.25, S, S + h, 0.18, 0.14));
      put(opsG, op.dark, bx(x - 0.29, x + 0.29, S + h, S + h + 0.03, z - 0.27, z + 0.27));
      put(opsG, op.gccSign[k], vPlane(0.4, 0.1, x, S + h - 0.08, z + 0.256));
    }
    put(opsG, op.concrete, cyl(0.1, 0.25, 3.72, S, 1.45, 18));
    put(opsG, op.globe, new THREE.SphereGeometry(0.14, 24, 16).translate(3.72, S + 0.39, 1.45));
    const meridians: T.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) meridians.push(new THREE.TorusGeometry(0.143, 0.005, 6, 32).rotateY((i * Math.PI) / 3).translate(3.72, S + 0.39, 1.45));
    meridians.push(new THREE.TorusGeometry(0.143, 0.005, 6, 32).rotateX(Math.PI / 2).translate(3.72, S + 0.39, 1.45));
    put(opsG, op.land, ...meridians);
    people(opsG, op, [
      [3.4, S, 1.55, 1.2],
      [4.05, S, 1.6, -1.5],
      [3.9, S, 2.45],
      [3.1, S, 2.4, 0.6],
    ]);
  }

  // ================================================================ LAYER 3: TALENT ROW
  {
    // ---- Hiring pavilion: slatted canopy over booths, a queue, the jobs board.
    put(talG, ta.jobs, vPlane(0.6, 0.3, -1.6, S + 0.2, -2.85));
    put(talG, ta.dark, bx(-1.92, -1.28, S + 0.04, S + 0.05, -2.87, -2.86), bx(-1.62, -1.58, S, S + 0.05, -2.88, -2.86));
    const posts: T.BufferGeometry[] = [];
    for (const x of [-2.25, -0.95]) for (const z of [-2.85, -1.75]) posts.push(cyl(0.012, 0.32, x, S, z, 6));
    put(talG, ta.steel, ...posts);
    const slats: T.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) slats.push(bx(-2.28, -0.92, S + 0.32, S + 0.335, -2.85 + i * 0.137, -2.8 + i * 0.137));
    put(talG, ta.canopy, ...slats);
    put(talG, ta.magenta, bx(-2.28, -0.92, S + 0.3, S + 0.32, -1.77, -1.73));
    put(talG, ta.hiring, vPlane(0.5, 0.1, -1.6, S + 0.25, -1.725));
    desks(talG, ta, [-2.0, -1.6, -1.2].map((x) => ({ p: [x, S, -2.45] as Vec3 })), 1, 0.22);
    seated(talG, ta, [-2.0, -1.6, -1.2].map((x) => [x, S - 0.03, -2.6, 0] as [number, number, number, number]), [0x1f2a36, 0x4a4a52]);
    people(talG, ta, [
      [-2.0, S, -2.3, Math.PI],
      [-1.6, S, -2.3, Math.PI],
      [-1.2, S, -2.3, Math.PI],
      [-1.6, S, -2.12, Math.PI],
      [-1.6, S, -1.96, Math.PI],
      [-1.2, S, -2.12, Math.PI],
      [-2.0, S, -2.14, Math.PI],
    ]);
    // ---- Flex offices: a two-storey glazed building with a planted terrace.
    put(talG, ta.office, ...facadeShell(-0.6, 1.0, -3.0, -1.85, S + 0.27, S + 0.55, 0.27, 0.28));
    put(talG, ta.glass, ...facadeShell(-0.6, 1.0, -3.0, -1.85, S, S + 0.26, 1, 1, "se"));
    put(talG, ta.white, bx(-0.6, 1.0, S + 0.255, S + 0.275, -3.0, -1.85), bx(-0.62, 1.02, S + 0.55, S + 0.58, -3.02, -1.83), bx(-0.6, 1.0, S, S + 0.26, -3.0, -2.98), bx(-0.6, -0.58, S, S + 0.26, -3.0, -1.85));
    put(talG, ta.flex, vPlane(0.6, 0.1, 0.2, S + 0.47, -1.844));
    put(talG, ta.green, ...[-0.4, 0.0, 0.4, 0.8].map((x) => rb(0.25, 0.05, 0.1, 0.02, x, S + 0.58, -1.95)));
    desks(talG, ta, [-0.35, -0.05, 0.25, 0.55, 0.85].map((x) => ({ p: [x, S, -2.35] as Vec3 })), 1, 0.2);
    seated(talG, ta, [-0.35, 0.25, 0.85, -0.05].map((x) => [x, S - 0.03, -2.24, Math.PI] as [number, number, number, number]));
    desks(talG, ta, [-0.2, 0.4].map((x) => ({ p: [x, S, -2.75] as Vec3 })), 2, 0.26);
    // ---- Academy: brick building with a gable roof, graduates on the lawn, the shuttle.
    put(talG, ta.brick, ...facadeShell(1.25, 2.7, -3.0, -2.05, S, S + 0.36, 0.36, 0.18));
    put(talG, ta.roof, gable(1.25, 2.7, -3.0, -2.05, S + 0.36, 0.18));
    put(talG, ta.white, bx(1.8, 2.1, S, S + 0.3, -2.06, -1.98), bx(1.78, 2.12, S + 0.3, S + 0.34, -2.08, -1.96));
    put(talG, ta.academy, vPlane(0.42, 0.09, 1.95, S + 0.44, -2.035));
    const grads: [number, number, number, number][] = [
      [1.45, S, -1.75, 0.4],
      [1.6, S, -1.62, 2.4],
      [2.3, S, -1.7, -0.6],
      [2.45, S, -1.58, 3.3],
      [0.22, S, -1.2, 0],
      [0.22, S, -0.75, 0],
      [0.2, S, -0.2, 0],
      [0.25, S, 0.45, 0],
    ];
    people(talG, ta, grads, [0x1a1a22, 0x2b4c7e]);
    put(talG, ta.cap, ...grads.map(([x, y, z, r]) => bx(-0.025, 0.025, 0.178, 0.186, -0.025, 0.025).rotateY(r).translate(x, y, z)));
    // Shuttle bus by the academy (people movers between campuses).
    put(talG, ta.bus, rb(0.42, 0.13, 0.14, 0.03, 2.95, S + 0.03, -1.65));
    put(talG, ta.carGlass, bx(2.77, 3.13, S + 0.09, S + 0.14, -1.725, -1.575));
    put(talG, ta.rubber, ...[2.82, 3.08].flatMap((x) => [hcyl(0.03, 0.15, x, S + 0.03, -1.65, "z", 12)]));
  }

  // ================================================================ STATIC: CAMPUS GREEN, ROAD
  {
    for (const [x, z, s] of [
      [-2.0, -1.0, 1],
      [-1.0, -0.9, 0.9],
      [1.2, -1.0, 1],
      [2.3, -0.9, 0.9],
      [-1.8, 0.6, 0.9],
      [1.1, 0.55, 1],
      [2.4, 0.5, 0.8],
      [-4.3, 2.4, 0.8],
      [4.4, 0.4, 0.8],
      [-2.7, -0.9, 0.8],
      [2.8, -1.3, 0.7],
    ] as [number, number, number][])
      tree(baseG, pz, x, z, s);
    // Food kiosk and tables on the green.
    put(baseG, pz.white, rb(0.4, 0.16, 0.24, 0.03, -0.9, S, 0.25));
    put(baseG, pz.orange, bx(-1.12, -0.68, S + 0.16, S + 0.19, 0.11, 0.39));
    const tables: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-1.35, 0.55],
      [-0.55, 0.6],
      [-1.4, -0.0],
      [-0.4, -0.55],
    ])
      tables.push(cyl(0.06, 0.012, x, S + 0.07, z, 14), cyl(0.008, 0.07, x, S, z, 6));
    put(baseG, pz.white, ...tables);
    seated(baseG, pz, [
      [-1.35, S - 0.03, 0.66, Math.PI],
      [-0.55, S - 0.03, 0.49, 0],
      [-1.4, S - 0.03, 0.11, Math.PI],
    ]);
    people(baseG, pz, [
      [1.5, S, -0.22, -1.6],
      [2.2, S, -0.2, 1.6],
      [-1.8, S, -0.22, 1.6],
      [0.9, S, 0.7],
    ]);
    // Street lamps and traffic on the road.
    const lamps: T.BufferGeometry[] = [];
    const heads: T.BufferGeometry[] = [];
    for (const x of [-3.6, -2.0, -0.4, 1.2, 2.8, 4.2]) {
      lamps.push(cyl(0.008, 0.36, x, S, 2.55, 6));
      heads.push(rb(0.05, 0.015, 0.03, 0.006, x, S + 0.36, 2.55));
    }
    put(baseG, pz.dark, ...lamps);
    put(baseG, pz.lamp, ...heads);
    car(baseG, pz, -3.2, 2.88, 0, 0xe2b33a);
    car(baseG, pz, -0.6, 3.2, Math.PI, 0xeef0f2);
    car(baseG, pz, 2.1, 2.88, 0, 0x2f5d9a);
    car(baseG, pz, 3.9, 3.2, Math.PI, 0xb8382e);
    // Company shuttle on the road.
    put(baseG, pz.blue, rb(0.5, 0.15, 0.16, 0.03, 0.9, S + 0.03, 3.2));
    put(baseG, pz.carGlass, bx(0.66, 1.14, S + 0.1, S + 0.16, 3.115, 3.285));
    put(baseG, pz.rubber, ...[0.72, 1.08].map((x) => hcyl(0.03, 0.17, x, S + 0.03, 3.2, "z", 12)));
  }

  flush();

  // ---------------------------------------------------------------- animation
  // The drone hovers, the robot arm swings, the data wall scrolls, the network map and racks blink.
  let lastBlink = -1,
    lastMap = -1;
  lip.onBeforeRender = () => {
    const t = performance.now() / 1000;
    drone.position.y = S + 0.38 + Math.sin(t * 1.6) * 0.03;
    drone.rotation.y = t * 0.4;
    robotArm.rotation.y = Math.sin(t * 0.7) * 1.1;
    dataTex.offset.x = (t * 0.03) % 1;
    const f = Math.floor(t / 0.4);
    if (f !== lastBlink) {
      lastBlink = f;
      rackLed.offset.y = (f % 4) * 0.25;
    }
    const k = Math.floor(t / 1.2);
    if (k !== lastMap) {
      lastMap = k;
      nocTex.offset.y = (k % 2) * 0.5;
    }
  };

  return {
    animated: true,
    applyLevel(v: number) {
      L.set("base", 1);
      L.set("plaza", 1);
      L.set("svc", pw(v, [[0, 1], [1, 0.25], [2, 0.18], [3, 0.15]]));
      L.set("eng", pw(v, [[0, 1], [1, 1], [2, 0.3], [3, 0.22]]));
      L.set("ops", pw(v, [[0, 1], [2, 1], [2.7, 0.3], [3, 0.25]]));
      L.set("tal", 1);
    },
  };
}
