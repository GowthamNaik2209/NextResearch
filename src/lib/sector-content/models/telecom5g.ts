// 5G/6G telecom — an Indian urban ground-based macro cell site of the kind
// Indus Towers / Jio / Airtel roll out: a tapered four-leg galvanised lattice
// tower (angle-section legs, X-bracing, gusset plates, climbing ladder and
// cable ladder inside the lattice, two platforms with handrails, lightning
// arrestor and aviation obstruction lights), three sectors of 5G massive-MIMO
// AAUs + 4G panel antennas with RRUs and jumpers, microwave backhaul dishes,
// and the fenced compound at its base: an outdoor BBU/BTS cabinet row on a
// plinth fed over an ice bridge, battery + IPMS cabinets, a DG set, a PUF
// shelter with a rooftop solar array — plus the street, a neighbouring G+3
// building, and a cut-away OFC trench (orange HDPE ducts on sand bedding,
// a handhole and a footpath manhole with slack fibre coils).
//
// Scale ≈ 1 : 8 (tower ≈ 33 m to the arrestor tip); ground-level equipment
// is drawn ~1.5x so it stays legible next to the tower. +X is the street.
//
// Layers: 0 complete site (ground, fence, trench and ducts are context),
// 1 tower steel, 2 active equipment (AAU/RRU/BBU/cabinets/ODUs + feeders),
// 3 antennas & power (4G panels, MW dishes, GPS, batteries, IPMS, DG, solar).
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
  railing,
  roundedBox,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Rect = [number, number, number, number]; // x0, x1, z0, z1

export function buildTelecom5g(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [groundG, towerG, activeG, antG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // Geometry is collected per material and merged once at the end, so the
  // whole site is a few dozen draw calls.
  const bins = new Map<T.Material, { g: T.Group; geos: T.BufferGeometry[]; order?: number }>();
  const put = (g: T.Group, mat: T.Material, geo: T.BufferGeometry) => {
    if (!bins.has(mat)) bins.set(mat, { g, geos: [] });
    bins.get(mat)!.geos.push(geo);
    return geo;
  };
  const xf = (geo: T.BufferGeometry, p: Vec3 = [0, 0, 0], r: Vec3 = [0, 0, 0], s: Vec3 = [1, 1, 1]) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(p[0], p[1], p[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], "YXZ")),
      new THREE.Vector3(s[0], s[1], s[2])
    );
    geo.applyMatrix4(m);
    return geo;
  };
  const box = (w: number, h: number, d: number, p: Vec3, r?: Vec3) => xf(new THREE.BoxGeometry(w, h, d), p, r);
  const rbox = (w: number, h: number, d: number, rad: number, p: Vec3, r?: Vec3) =>
    xf(roundedBox(THREE, w, h, d, rad), p, r);
  const cyl = (rt: number, rb: number, h: number, p: Vec3, r?: Vec3, seg = 16, open = false) =>
    xf(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), p, r);
  // World-planar UVs so tiled textures stay continuous across merged pieces.
  const planarUV = (geo: T.BufferGeometry, f: (x: number, y: number, z: number) => [number, number]) => {
    const p = geo.getAttribute("position");
    const uv: number[] = [];
    for (let i = 0; i < p.count; i++) uv.push(...f(p.getX(i), p.getY(i), p.getZ(i)));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return geo;
  };
  // Flat member (strip of steel) from a to b, `w` wide in the plane whose
  // normal is ~n, `t` thick along n.
  const V = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);
  const strut = (a: Vec3, b: Vec3, w: number, t: number, n: Vec3) => {
    const va = V(a),
      vb = V(b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    dir.normalize();
    const wd = new THREE.Vector3().crossVectors(dir, V(n)).normalize();
    const nn = new THREE.Vector3().crossVectors(wd, dir).normalize();
    const g = new THREE.BoxGeometry(w, len, t);
    const m = new THREE.Matrix4().makeBasis(wd, dir, nn);
    m.setPosition(va.add(vb).multiplyScalar(0.5));
    g.applyMatrix4(m);
    return g;
  };
  const heading = (d: T.Vector3) => Math.atan2(d.x, d.z); // Y-rotation that turns +Z to d
  const dirOf = (th: number) => new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
  const tanOf = (th: number) => new THREE.Vector3(-Math.sin(th), 0, Math.cos(th));
  const v3 = (v: T.Vector3): Vec3 => [v.x, v.y, v.z];

  // Rectangle minus holes -> rectangles (coordinate-compressed grid, merged by rows).
  const rectMinus = (R: Rect, holes: Rect[]): Rect[] => {
    const xs = new Set<number>([R[0], R[1]]),
      zs = new Set<number>([R[2], R[3]]);
    for (const h of holes) {
      for (const x of [h[0], h[1]]) if (x > R[0] && x < R[1]) xs.add(x);
      for (const z of [h[2], h[3]]) if (z > R[2] && z < R[3]) zs.add(z);
    }
    const X = [...xs].sort((a, b) => a - b),
      Z = [...zs].sort((a, b) => a - b);
    const out: Rect[] = [];
    for (let j = 0; j < Z.length - 1; j++) {
      let run: Rect | null = null;
      for (let i = 0; i < X.length - 1; i++) {
        const cx = (X[i] + X[i + 1]) / 2,
          cz = (Z[j] + Z[j + 1]) / 2;
        const inHole = holes.some((h) => cx > h[0] && cx < h[1] && cz > h[2] && cz < h[3]);
        if (!inHole) {
          if (run && run[1] === X[i]) run[1] = X[i + 1];
          else {
            run = [X[i], X[i + 1], Z[j], Z[j + 1]];
            out.push(run);
          }
        } else run = null;
      }
    }
    return out;
  };
  const slab = (R: Rect, y0: number, y1: number) =>
    box(R[1] - R[0], y1 - y0, R[3] - R[2], [(R[0] + R[1]) / 2, (y0 + y1) / 2, (R[2] + R[3]) / 2]);

  // ---------------------------------------------------------------- textures
  const noiseTex = (base: string, dots: string[], n: number, size = 256, rep = 1) => {
    const t = canvasTexture(THREE, size, size, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        g.fillStyle = dots[i % dots.length];
        const r = 0.6 + Math.random() * 2.2;
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
        g.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    return t;
  };
  const gravelTex = noiseTex("#77736c", ["#8e8a82", "#5f5b55", "#a29d93", "#6b665e"], 2600);
  const earthTex = noiseTex("#5b5843", ["#676348", "#4c4a37", "#6f6a50", "#545a3c"], 1800);
  const soilTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#6a4e34");
    grd.addColorStop(1, "#4d3725");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = ["#7a5b3e", "#3f2c1d", "#86684a"][i % 3];
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
  });
  soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping;
  const asphaltTex = canvasTexture(THREE, 256, 512, (g, w, h) => {
    g.fillStyle = "#2c2f33";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = ["#383b40", "#25282c", "#41454a"][i % 3];
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    g.fillStyle = "#d9d4c4";
    g.fillRect(w * 0.49, 0, w * 0.025, h * 0.5); // dashed centre line
    g.fillStyle = "#cfcab9";
    g.fillRect(w * 0.035, 0, w * 0.012, h); // edge line
  });
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  const paverTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#8d8780";
    g.fillRect(0, 0, w, h);
    const n = 8;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const off = j % 2 ? w / n / 2 : 0;
        g.fillStyle = (i + j) % 5 === 0 ? "#9a7468" : (i * 7 + j) % 3 === 0 ? "#958f87" : "#86807a";
        g.fillRect(i * (w / n) + off + 2, j * (h / n) + 2, w / n - 4, h / n - 4);
      }
  });
  paverTex.wrapS = paverTex.wrapT = THREE.RepeatWrapping;
  const kerbTex = canvasTexture(THREE, 128, 32, (g, w, h) => {
    g.fillStyle = "#e6e2d6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c1d1f";
    g.fillRect(0, 0, w / 2, h);
  });
  kerbTex.wrapS = kerbTex.wrapT = THREE.RepeatWrapping;
  const chainTex = canvasTexture(THREE, 64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#cfd5da";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w / 2, 0);
    g.lineTo(w, h / 2);
    g.lineTo(w / 2, h);
    g.closePath();
    g.stroke();
  });
  chainTex.wrapS = chainTex.wrapT = THREE.RepeatWrapping;
  const facadeTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#d9cdb4";
    g.fillRect(0, 0, w, h);
    // one floor x two bays per tile: window with grille + sunshade shadow
    for (const bx of [0.08, 0.58]) {
      g.fillStyle = "#3c3a36";
      g.fillRect(bx * w, h * 0.3, w * 0.34, h * 0.42);
      g.fillStyle = "#2a3743";
      g.fillRect(bx * w + 4, h * 0.3 + 4, w * 0.34 - 8, h * 0.42 - 8);
      g.strokeStyle = "rgba(200,200,190,0.55)";
      g.lineWidth = 2;
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.moveTo(bx * w + (k * w * 0.34) / 4, h * 0.3);
        g.lineTo(bx * w + (k * w * 0.34) / 4, h * 0.72);
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(bx * w - 4, h * 0.22, w * 0.34 + 8, h * 0.08);
    }
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(0, h * 0.96, w, h * 0.04);
  });
  facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  const louvreTex = canvasTexture(THREE, 64, 64, (g, w, h) => {
    g.fillStyle = "#8aa392";
    g.fillRect(0, 0, w, h);
    for (let y = 2; y < h; y += 8) {
      g.fillStyle = "#5d7466";
      g.fillRect(0, y, w, 3);
    }
  });
  louvreTex.wrapS = louvreTex.wrapT = THREE.RepeatWrapping;
  const pufTex = canvasTexture(THREE, 128, 64, (g, w, h) => {
    g.fillStyle = "#e3e1da";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b9b7b0";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
  });
  pufTex.wrapS = pufTex.wrapT = THREE.RepeatWrapping;
  const solarTex = canvasTexture(THREE, 128, 192, (g, w, h) => {
    g.fillStyle = "#c9ced3";
    g.fillRect(0, 0, w, h);
    const cols = 6,
      rows = 10;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        g.fillStyle = (i + j) % 2 ? "#1d2f52" : "#203559";
        g.fillRect(4 + i * ((w - 8) / cols) + 1, 4 + j * ((h - 8) / rows) + 1, (w - 8) / cols - 2, (h - 8) / rows - 2);
      }
  });
  const gratingTex = canvasTexture(THREE, 64, 64, (g, w, h) => {
    g.fillStyle = "#6f767c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3d4247";
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 4, h);
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
  });
  gratingTex.wrapS = gratingTex.wrapT = THREE.RepeatWrapping;

  // ---------------------------------------------------------------- materials
  // site context (fades out after level 0)
  const earth = L.add("site", std(0xffffff, 0, 0.95, { map: earthTex }));
  const gravel = L.add("site", std(0xffffff, 0, 0.95, { map: gravelTex }));
  const asphalt = L.add("site", std(0xffffff, 0, 0.9, { map: asphaltTex }));
  const pavers = L.add("site", std(0xffffff, 0, 0.9, { map: paverTex }));
  const kerb = L.add("site", std(0xffffff, 0, 0.8, { map: kerbTex }));
  const concrete = L.add("site", std(0xa7a49c, 0, 0.92));
  const fenceSteel = L.add("site", std(0x9aa1a7, 0.75, 0.4));
  const chain = L.add("site", std(0xffffff, 0.6, 0.45, { map: chainTex, alphaTest: 0.5, side: DS }));
  const barbed = L.add("site", std(0x7d8389, 0.7, 0.45));
  const facade = L.add("site", std(0xffffff, 0, 0.85, { map: facadeTex }));
  const roofSlab = L.add("site", std(0xbab3a3, 0, 0.9));
  const plaster = L.add("site", std(0xcfc2a6, 0, 0.88));
  const blackTank = L.add("site", std(0x1b1c1e, 0.1, 0.55));
  const puf = L.add("site", std(0xffffff, 0.1, 0.6, { map: pufTex }));
  const darkTrim = L.add("site", std(0x2b2f33, 0.4, 0.55));
  const foliage = L.add("site", std(0x4d6b3a, 0, 0.85, { flatShading: true }));
  const bark = L.add("site", std(0x4b3a2b, 0, 0.9));
  const poleConcrete = L.add("site", std(0x9c9a94, 0, 0.85));
  const lampGlow = L.add("site", std(0xfff1c8, 0, 0.4, { emissive: 0xffe2a0, emissiveIntensity: 0.6 }));
  // underground (stays readable as a ghost)
  const soil = L.add("soil", std(0xffffff, 0, 1, { map: soilTex, side: DS }));
  const sand = L.add("soil", std(0xc9ad7c, 0, 0.95));
  const ductOrange = L.add("duct", std(0xe57a1e, 0.05, 0.42));
  const ductRed = L.add("duct", std(0xc8501c, 0.05, 0.45));
  const chamberConc = L.add("duct", std(0x8f8c86, 0, 0.9));
  const castIron = L.add("duct", std(0x2c2d2f, 0.6, 0.5));
  const fibre = L.add("duct", std(0xe8c13a, 0.1, 0.45, { emissive: 0xc99a2e, emissiveIntensity: 0.35 }));
  const markerOrange = L.add("duct", std(0xe0682a, 0.1, 0.6));
  // tower steel
  const galv = L.add("tower", std(0xa7aeb4, 0.7, 0.42));
  const galvDark = L.add("tower", std(0x7f878e, 0.8, 0.42));
  const grating = L.add("tower", std(0xffffff, 0.7, 0.5, { map: gratingTex }));
  const footing = L.add("tower", std(0x9d9a92, 0, 0.9));
  const obstruction = L.add("tower", std(0xff3326, 0.1, 0.3, { emissive: 0xff2010, emissiveIntensity: 1.4 }));
  // active equipment
  const aauBody = L.add("active", std(0xdfe2e4, 0.25, 0.42));
  const aauFins = L.add("active", std(0x8e959b, 0.75, 0.4));
  const rruBody = L.add("active", std(0x5d646b, 0.6, 0.42));
  const cabActive = L.add("active", std(0xcdd1d3, 0.35, 0.45));
  const cabTrimA = L.add("active", std(0x32373c, 0.4, 0.5));
  const rackDark = L.add("active", std(0x1e2226, 0.5, 0.5));
  const bbuFace = L.add("active", std(0x3d434a, 0.6, 0.4));
  const ledGreen = L.add("active", std(0x40ff8a, 0, 0.4, { emissive: 0x2bff6e, emissiveIntensity: 1.2 }));
  const feeder = L.add("active", std(0x15171a, 0.2, 0.55));
  const odu = L.add("active", std(0xd4d7d9, 0.35, 0.45));
  // antennas & power
  const radome = L.add("ant", std(0xeceeee, 0.05, 0.5));
  const radomeCap = L.add("ant", std(0x9ba2a8, 0.5, 0.45));
  const dishMetal = L.add("ant", std(0xc4c9cd, 0.6, 0.38, { side: DS }));
  const dishRadome = L.add("ant", std(0xf1f1ef, 0.02, 0.6));
  const cabPower = L.add("ant", std(0xcdd1d3, 0.35, 0.45));
  const cabTrimP = L.add("ant", std(0x32373c, 0.4, 0.5));
  const battery = L.add("ant", std(0x26292d, 0.2, 0.55));
  const termRed = L.add("ant", std(0xc8312a, 0.2, 0.45));
  const rectifier = L.add("ant", std(0xa8aeb3, 0.6, 0.4));
  const dgCanopy = L.add("ant", std(0xffffff, 0.3, 0.55, { map: louvreTex }));
  const dgBody = L.add("ant", std(0x7f9a86, 0.35, 0.5));
  const exhaust = L.add("ant", std(0x55585b, 0.75, 0.45));
  const solar = L.add("ant", std(0xffffff, 0.5, 0.25, { map: solarTex }));
  const solarFrame = L.add("ant", std(0x9ea6ad, 0.8, 0.35));
  const ebBox = L.add("ant", std(0x8c9298, 0.5, 0.5));

  // Emissive focus tints for the system the current layer is about.
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusTower = focus([galv, galvDark], 0x4c6ef5);
  const focusActive = focus([aauBody, rruBody, cabActive, odu], 0x7a5cc7);
  const focusAnt = focus([radome, dishRadome], 0x1e9e76);
  const focusPower = focus([cabPower, dgBody, battery], 0xd96c2b);

  // ================================================================ GROUND
  // Plan (x = street side, z = toward the default camera):
  const FENCE: Rect = [-1.8, 2.4, -1.6, 2.0];
  const FOOT_X0 = 3.15,
    KERB_X = 3.75,
    ROAD_X1 = 4.9;
  const Z0 = -4.6,
    Z1 = 4.6;
  // Cut-away OFC trench: street manhole (in the footpath) -> handhole inside
  // the compound -> north run to the cabinet plinth.
  const TR_Z = -1.0;
  const MANHOLE: Rect = [3.23, 3.71, -1.24, -0.76];
  const HANDHOLE: Rect = [1.36, 1.84, -1.24, -0.76];
  const TRENCH_A: Rect = [1.84, 3.23, TR_Z - 0.2, TR_Z + 0.2];
  const TRENCH_B: Rect = [1.42, 1.78, -0.76, 1.0];
  const HOLES = [MANHOLE, HANDHOLE, TRENCH_A, TRENCH_B];
  const FLOOR_Y = -0.24;

  const topUV = (k: number) => (x: number, y: number, z: number): [number, number] => [(x + y * 0.7) * k, (z + y * 0.7) * k];
  for (const r of rectMinus([-4.6, FOOT_X0, Z0, Z1], HOLES)) put(groundG, earth, planarUV(slab(r, -0.05, 0.02), topUV(0.9)));
  for (const r of rectMinus([FENCE[0] - 0.05, FENCE[1] + 0.05, FENCE[2] - 0.05, FENCE[3] + 0.05], HOLES))
    put(groundG, gravel, planarUV(slab(r, 0.0, 0.034), topUV(1.1)));
  for (const r of rectMinus([FOOT_X0, KERB_X - 0.03, Z0, Z1], HOLES)) put(groundG, pavers, planarUV(slab(r, -0.05, 0.06), topUV(1.6)));
  put(groundG, kerb, planarUV(box(0.07, 0.15, Z1 - Z0, [KERB_X, 0.0, 0]), (x, y, z) => [z * 1.6, y]));
  put(groundG, asphalt, planarUV(slab([KERB_X + 0.035, ROAD_X1, Z0, Z1], -0.05, 0.012), (x, _y, z) => [(x - KERB_X) / (ROAD_X1 - KERB_X), z * 0.9]));
  // Driveway from the gate to the footpath.
  put(groundG, concrete, slab([FENCE[1], FOOT_X0, -0.38, 0.58], 0.0, 0.03));

  // Trench walls: a thin skin of soil hugging each cut (only the cut faces
  // show at level 0; ghosted it reads as a clean trench outline).
  for (const h of HOLES) {
    const m = 0.035;
    const ring = rectMinus([h[0] - m, h[1] + m, h[2] - m, h[3] + m], HOLES);
    for (const r of ring)
      put(groundG, soil, planarUV(slab(r, FLOOR_Y - 0.02, -0.045), (x, y, z) => [(x + z) * 2.5, y * 2.5]));
    put(groundG, soil, slab(h, FLOOR_Y - 0.03, FLOOR_Y));
  }
  for (const h of [TRENCH_A, TRENCH_B]) put(groundG, sand, slab(h, FLOOR_Y, -0.185));
  // Precast chambers (walls just inside the cut) with their covers set aside.
  const chamber = (h: Rect, top: number) => {
    const t = 0.028;
    put(groundG, chamberConc, slab([h[0], h[1], h[2], h[2] + t], FLOOR_Y, top));
    put(groundG, chamberConc, slab([h[0], h[1], h[3] - t, h[3]], FLOOR_Y, top));
    put(groundG, chamberConc, slab([h[0], h[0] + t, h[2], h[3]], FLOOR_Y, top));
    put(groundG, chamberConc, slab([h[1] - t, h[1], h[2], h[3]], FLOOR_Y, top));
  };
  chamber(MANHOLE, 0.062);
  chamber(HANDHOLE, 0.045);
  // Manhole: cast-iron frame cover slid onto the footpath.
  put(groundG, castIron, cyl(0.17, 0.17, 0.018, [3.47, 0.07, -0.42]));
  put(groundG, castIron, xf(new THREE.TorusGeometry(0.12, 0.008, 6, 24), [3.47, 0.08, -0.42], [Math.PI / 2, 0, 0]));
  // Handhole: precast lid leaning on the gravel.
  put(groundG, chamberConc, box(0.4, 0.03, 0.26, [1.6, 0.05, -1.4], [0, 0.08, 0]));
  put(groundG, castIron, box(0.1, 0.012, 0.02, [1.6, 0.07, -1.4], [0, 0.08, 0]));
  // HDPE ducts on sand bedding.
  const DY = -0.15;
  [-0.08, 0, 0.08].forEach((dz, i) => {
    const m = i === 1 ? ductRed : ductOrange;
    put(groundG, m, bar(THREE, [MANHOLE[0] + 0.02, DY, TR_Z + dz], [HANDHOLE[1] - 0.02, DY, TR_Z + dz], 0.034, 12));
  });
  [-0.08, 0, 0.08].forEach((dx, i) => {
    const m = i === 1 ? ductRed : ductOrange;
    const x = 1.6 + dx;
    put(groundG, m, tube(THREE, [[x, DY, HANDHOLE[3] - 0.02], [x, DY, 0.7], [x, DY + 0.04, 0.92], [x, DY + 0.1, 1.1]], 0.034, 12));
  });
  // Ducts continuing under the road out of the manhole (seen in the cut).
  [-0.08, 0, 0.08].forEach((dz) => put(groundG, ductOrange, bar(THREE, [MANHOLE[1] - 0.02, DY, TR_Z + dz], [MANHOLE[1] + 0.02, DY, TR_Z + dz], 0.034, 12)));
  // Fibre: out of the duct mouths into slack coils on the chamber floors.
  const coil = (cx: number, cz: number, r: number, y: number) => {
    put(groundG, fibre, xf(new THREE.TorusGeometry(r, 0.009, 6, 32), [cx, y, cz], [Math.PI / 2, 0, 0]));
    put(groundG, fibre, xf(new THREE.TorusGeometry(r * 0.9, 0.009, 6, 32), [cx, y + 0.02, cz], [Math.PI / 2, 0, 0.2]));
  };
  coil(3.47, TR_Z, 0.11, FLOOR_Y + 0.02);
  coil(1.6, TR_Z, 0.1, FLOOR_Y + 0.02);
  put(groundG, fibre, tube(THREE, [[MANHOLE[0] + 0.03, DY, TR_Z], [3.36, DY - 0.05, TR_Z + 0.04], [3.4, FLOOR_Y + 0.03, TR_Z + 0.1]], 0.009, 6));
  put(groundG, fibre, tube(THREE, [[HANDHOLE[1] - 0.03, DY, TR_Z], [1.7, DY - 0.05, TR_Z + 0.03], [1.68, FLOOR_Y + 0.03, TR_Z + 0.07]], 0.009, 6));
  put(groundG, fibre, tube(THREE, [[1.6, FLOOR_Y + 0.04, TR_Z + 0.1], [1.6, DY - 0.03, -0.9], [1.6, DY, HANDHOLE[3] - 0.03]], 0.009, 6));
  // OFC route markers.
  for (const [x, z] of [[2.85, -0.66], [2.1, -1.36]] as [number, number][]) {
    put(groundG, chamberConc, box(0.05, 0.12, 0.05, [x, 0.08, z]));
    put(groundG, markerOrange, box(0.052, 0.03, 0.052, [x, 0.155, z]));
  }

  // Concrete plinths for the equipment.
  const PLINTH_Y = 0.1;
  const CAB_PLINTH: Rect = [0.85, 2.25, 1.08, 1.6];
  put(groundG, concrete, slab(CAB_PLINTH, 0.0, PLINTH_Y));
  put(groundG, concrete, slab([-1.6, -0.72, 1.12, 1.62], 0.0, 0.08)); // DG
  put(groundG, concrete, slab([-1.68, -0.82, -1.42, -0.62], 0.0, 0.07)); // shelter

  // Perimeter fence: posts, chain-link fabric, barbed-wire outriggers, gate.
  {
    const H = 0.34,
      G0 = -0.36,
      G1 = 0.56; // gate opening on the street side
    const runs: [Vec3, Vec3][] = [
      [[FENCE[0], 0, FENCE[2]], [FENCE[1], 0, FENCE[2]]],
      [[FENCE[1], 0, FENCE[2]], [FENCE[1], 0, G0]],
      [[FENCE[1], 0, G1], [FENCE[1], 0, FENCE[3]]],
      [[FENCE[1], 0, FENCE[3]], [FENCE[0], 0, FENCE[3]]],
      [[FENCE[0], 0, FENCE[3]], [FENCE[0], 0, FENCE[2]]],
    ];
    const cx = (FENCE[0] + FENCE[1]) / 2,
      cz = (FENCE[2] + FENCE[3]) / 2;
    for (const [a, b] of runs) {
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const n = Math.max(1, Math.round(len / 0.5));
      const ox = Math.abs(a[0] - b[0]) < 1e-6 ? Math.sign(a[0] - cx) : 0;
      const oz = Math.abs(a[2] - b[2]) < 1e-6 ? Math.sign(a[2] - cz) : 0;
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = lerp(a[0], b[0], t),
          z = lerp(a[2], b[2], t);
        put(groundG, fenceSteel, cyl(0.012, 0.012, H + 0.03, [x, (H + 0.03) / 2, z], undefined, 8));
        // barbed-wire outrigger leaning outward
        put(groundG, fenceSteel, bar(THREE, [x, H + 0.02, z], [x + ox * 0.06, H + 0.09, z + oz * 0.06], 0.006, 4));
      }
      // fabric
      const plane = new THREE.PlaneGeometry(len, H - 0.03);
      const mid: Vec3 = [(a[0] + b[0]) / 2, (H - 0.03) / 2 + 0.03, (a[2] + b[2]) / 2];
      xf(plane, mid, [0, Math.abs(a[0] - b[0]) < 1e-6 ? Math.PI / 2 : 0, 0]);
      put(groundG, chain, planarUV(plane, (x, y, z) => [(x + z) * 16, y * 16]));
      // top/bottom rails and barbed strands
      put(groundG, fenceSteel, bar(THREE, [a[0], H, a[2]], [b[0], H, b[2]], 0.008, 6));
      put(groundG, fenceSteel, bar(THREE, [a[0], 0.04, a[2]], [b[0], 0.04, b[2]], 0.005, 4));
      const dx = ox,
        dz = oz;
      for (const k of [0.33, 0.66, 1]) {
        const o = 0.06 * k,
          y = H + 0.02 + 0.07 * k;
        put(groundG, barbed, bar(THREE, [a[0] + dx * o, y, a[2] + dz * o], [b[0] + dx * o, y, b[2] + dz * o], 0.0028, 3));
      }
    }
    // Swing gate, one leaf ajar.
    const leaf = (z0: number, z1: number, open: number) => {
      const w = Math.abs(z1 - z0);
      const g: T.BufferGeometry[] = [];
      g.push(box(0.016, 0.016, w, [0, 0.31, w / 2]));
      g.push(box(0.016, 0.016, w, [0, 0.05, w / 2]));
      g.push(box(0.016, 0.28, 0.016, [0, 0.18, 0.008]));
      g.push(box(0.016, 0.28, 0.016, [0, 0.18, w - 0.008]));
      g.push(strut([0, 0.06, 0.02], [0, 0.3, w - 0.02], 0.012, 0.012, [1, 0, 0]));
      const fab = new THREE.PlaneGeometry(w, 0.25);
      fab.rotateY(Math.PI / 2);
      fab.translate(0, 0.18, w / 2);
      const sgn = z1 > z0 ? 1 : -1;
      for (const gg of [...g, fab]) {
        gg.scale(1, 1, sgn);
        gg.rotateY(open * sgn);
        gg.translate(FENCE[1], 0, z0);
      }
      put(groundG, fenceSteel, mergeInto(THREE, g));
      put(groundG, chain, planarUV(fab, (x, y, z) => [(x + z) * 16, y * 16]));
    };
    leaf(G0, (G0 + G1) / 2 - 0.01, 0);
    leaf(G1, (G0 + G1) / 2 + 0.01, -0.9);
    for (const z of [G0, G1]) put(groundG, fenceSteel, cyl(0.02, 0.02, 0.4, [FENCE[1], 0.2, z], undefined, 10));
  }

  // PUF shelter (now mostly a battery/ODF room on outdoor sites) with split-AC.
  {
    const [x0, x1, z0, z1] = [-1.62, -0.88, -1.36, -0.68];
    const h = 0.4,
      y0 = 0.07;
    put(groundG, puf, planarUV(box(x1 - x0, h, z1 - z0, [(x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2]), (x, y, z) => [(x + z) * 3, y * 3]));
    put(groundG, plaster, box(x1 - x0 + 0.06, 0.03, z1 - z0 + 0.06, [(x0 + x1) / 2, y0 + h + 0.015, (z0 + z1) / 2]));
    put(groundG, darkTrim, box(0.16, 0.3, 0.01, [-1.05, y0 + 0.15, z1 + 0.005])); // door
    put(groundG, fenceSteel, box(0.01, 0.04, 0.012, [-1.0, y0 + 0.15, z1 + 0.014]));
    // split AC outdoor unit on the side wall
    put(groundG, plaster, box(0.06, 0.13, 0.19, [x1 + 0.045, y0 + 0.2, -1.05]));
    put(groundG, darkTrim, xf(new THREE.CircleGeometry(0.05, 20), [x1 + 0.076, y0 + 0.2, -1.07], [0, Math.PI / 2, 0]));
    put(groundG, darkTrim, tube(THREE, [[x1 + 0.02, y0 + 0.27, -0.98], [x1 + 0.03, y0 + 0.34, -0.96], [x1 + 0.005, y0 + 0.37, -0.94]], 0.007, 5));
  }

  // Neighbouring G+3 building with parapet, sunshades, rooftop Sintex tank.
  {
    const [x0, x1, z0, z1] = [-4.35, -2.45, -3.25, -1.45];
    const floors = 4,
      FH = 0.34;
    const H = floors * FH;
    put(groundG, facade, planarUV(box(x1 - x0, H, z1 - z0, [(x0 + x1) / 2, H / 2, (z0 + z1) / 2]), (x, y, z) => [(x + z) / 0.9, y / FH]));
    put(groundG, roofSlab, box(x1 - x0 + 0.02, 0.03, z1 - z0 + 0.02, [(x0 + x1) / 2, H + 0.015, (z0 + z1) / 2]));
    // parapet
    const p = 0.025,
      ph = 0.1;
    put(groundG, plaster, slab([x0, x1, z0, z0 + p], H, H + ph));
    put(groundG, plaster, slab([x0, x1, z1 - p, z1], H, H + ph));
    put(groundG, plaster, slab([x0, x0 + p, z0, z1], H, H + ph));
    put(groundG, plaster, slab([x1 - p, x1, z0, z1], H, H + ph));
    // sunshade (chajja) bands
    for (let f = 0; f < floors; f++) {
      const y = f * FH + FH * 0.76;
      put(groundG, plaster, slab([x0 - 0.05, x1 + 0.05, z1, z1 + 0.06], y, y + 0.015));
      put(groundG, plaster, slab([x1, x1 + 0.06, z0 - 0.05, z1 + 0.05], y, y + 0.015));
    }
    // stair head-room + water tank on its own stand
    put(groundG, plaster, box(0.4, 0.26, 0.36, [-4.0, H + 0.13, -2.95]));
    put(groundG, fenceSteel, box(0.34, 0.08, 0.34, [-3.0, H + 0.04, -1.8]));
    put(groundG, blackTank, cyl(0.13, 0.14, 0.24, [-3.0, H + 0.2, -1.8], undefined, 20));
    put(groundG, blackTank, cyl(0.06, 0.13, 0.04, [-3.0, H + 0.34, -1.8], undefined, 20));
    groundG.add(contactShadow(THREE, 2.6, 2.6, 0.45, 0.024));
    groundG.children[groundG.children.length - 1].position.set((x0 + x1) / 2, 0.024, (z0 + z1) / 2);
  }

  // Trees (neem) and the street-light / LT pole that feeds the EB meter.
  const tree = (x: number, z: number, s: number) => {
    put(groundG, bark, cyl(0.025 * s, 0.04 * s, 0.6 * s, [x, 0.3 * s, z], undefined, 8));
    const blobs: [number, number, number, number][] = [
      [0, 0.78, 0, 0.3],
      [0.17, 0.66, 0.05, 0.22],
      [-0.15, 0.7, -0.06, 0.23],
      [0.02, 0.92, -0.1, 0.2],
      [-0.05, 0.64, 0.17, 0.2],
    ];
    for (const [dx, dy, dz, r] of blobs)
      put(groundG, foliage, xf(new THREE.IcosahedronGeometry(r * s, 1), [x + dx * s, dy * s, z + dz * s]));
  };
  tree(-2.7, 2.6, 1.1);
  tree(-3.7, 0.5, 0.95);
  tree(-0.5, -2.8, 1.0);
  {
    const px = 3.45,
      pz = -2.3;
    put(groundG, poleConcrete, cyl(0.025, 0.04, 1.75, [px, 0.875, pz], undefined, 8));
    put(groundG, poleConcrete, bar(THREE, [px, 1.6, pz], [px + 0.42, 1.68, pz], 0.012, 6));
    put(groundG, lampGlow, box(0.12, 0.025, 0.05, [px + 0.42, 1.665, pz]));
    put(groundG, fenceSteel, box(0.02, 0.02, 0.4, [px, 1.7, pz]));
    for (const dz of [-0.17, 0.0, 0.17]) put(groundG, plaster, cyl(0.012, 0.016, 0.04, [px, 1.73, pz + dz], undefined, 8));
    // service drop to the EB meter box on the gate post
    put(groundG, darkTrim, tube(THREE, [[px, 1.55, pz], [3.1, 1.05, -1.2], [2.65, 0.8, 0.0], [FENCE[1] + 0.02, 0.46, 0.62]], 0.006, 4));
  }
  groundG.add(contactShadow(THREE, 5.5, 5.0, 0.35, 0.036));

  // ================================================================ TOWER
  const Y0 = 0.14,
    YT = 3.0,
    TOP = 4.12;
  const HB = 0.52,
    HT = 0.17;
  const half = (y: number) => (y >= YT ? HT : lerp(HB, HT, (y - Y0) / (YT - Y0)));
  const LV = [Y0, 0.64, 1.09, 1.49, 1.85, 2.17, 2.45, 2.72, 3.0, 3.38, 3.76, TOP];
  type Face = { n: Vec3; pt: (y: number, t: number, inset?: number) => Vec3 };
  const faces: Face[] = [];
  for (const s of [1, -1]) {
    faces.push({ n: [s, 0, 0], pt: (y, t, i = 0) => [s * (half(y) - i), y, t * (half(y) - i)] });
    faces.push({ n: [0, 0, s], pt: (y, t, i = 0) => [t * (half(y) - i), y, s * (half(y) - i)] });
  }
  const steel: T.BufferGeometry[] = [];
  const steelDark: T.BufferGeometry[] = [];
  // Legs: equal-angle sections whose flanges lie in the two adjacent faces.
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      for (let i = 0; i < LV.length - 1; i++) {
        const ya = LV[i],
          yb = LV[i + 1];
        const fw = lerp(0.055, 0.034, i / (LV.length - 2));
        const A: Vec3 = [sx * half(ya), ya, sz * half(ya)];
        const B: Vec3 = [sx * half(yb), yb, sz * half(yb)];
        const off = (dx: number, dz: number): [Vec3, Vec3] => [
          [A[0] + dx, A[1], A[2] + dz],
          [B[0] + dx, B[1], B[2] + dz],
        ];
        const [a1, b1] = off(0, -sz * fw * 0.5);
        steel.push(strut(a1, b1, fw, 0.008, [sx, 0, 0]));
        const [a2, b2] = off(-sx * fw * 0.5, 0);
        steel.push(strut(a2, b2, fw, 0.008, [0, 0, sz]));
      }
    }
  // Bracing: horizontals, X-diagonals, and secondary members in the wide bays.
  faces.forEach((f) => {
    for (let i = 0; i < LV.length - 1; i++) {
      const ya = LV[i],
        yb = LV[i + 1];
      const I = 0.012;
      const w = lerp(0.03, 0.02, i / (LV.length - 2));
      steel.push(strut(f.pt(ya, -1, I), f.pt(ya, 1, I), w, 0.006, f.n));
      steel.push(strut(f.pt(ya, -1, I), f.pt(yb, 1, I), w * 0.85, 0.006, f.n));
      steel.push(strut(f.pt(ya, 1, I + 0.006), f.pt(yb, -1, I + 0.006), w * 0.85, 0.006, f.n));
      if (i < 4) {
        const ym = (ya + yb) / 2;
        steel.push(strut(f.pt(ym, -1, I), f.pt(ym, 1, I), w * 0.6, 0.005, f.n));
        steel.push(strut(f.pt(ym, 0, I), f.pt(ya, 0, I), w * 0.55, 0.005, f.n));
      }
      // gusset plates where bracing meets the legs
      for (const t of [-1, 1]) {
        const p = f.pt(ya, t * 0.86, I + 0.004);
        steelDark.push(strut([p[0], ya - 0.03, p[2]], [p[0], ya + 0.04, p[2]], 0.05, 0.004, f.n));
      }
    }
    steel.push(strut(f.pt(TOP, -1, 0.012), f.pt(TOP, 1, 0.012), 0.03, 0.006, f.n));
  });
  // Plan bracing at the taper break and under the platforms.
  for (const y of [YT, 3.76, 1.49]) {
    const h = half(y) - 0.02;
    steel.push(bar(THREE, [-h, y, -h], [h, y, h], 0.007, 4));
    steel.push(bar(THREE, [h, y, -h], [-h, y, h], 0.007, 4));
  }
  // Concrete chimney footings + base plates.
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      const x = sx * HB,
        z = sz * HB;
      put(towerG, footing, box(0.2, Y0 + 0.03, 0.2, [x, (Y0 - 0.03) / 2 + 0.0, z]));
      steelDark.push(box(0.13, 0.012, 0.13, [x, Y0 + 0.006, z]));
    }
  // Climbing ladder and cable ladder inside the lattice (+z face).
  const LZ = 0.115;
  for (const x of [0.03, 0.14]) steel.push(bar(THREE, [x, Y0, LZ], [x, 3.76, LZ], 0.006, 5));
  for (let y = Y0 + 0.08; y < 3.74; y += 0.075) steel.push(bar(THREE, [0.03, y, LZ], [0.14, y, LZ], 0.0035, 4));
  for (const x of [-0.035, -0.145]) steel.push(box(0.008, 3.76 - 0.6, 0.02, [x, (3.76 + 0.6) / 2, LZ]));
  for (let y = 0.66; y < 3.74; y += 0.14) steel.push(box(0.11, 0.008, 0.02, [-0.09, y, LZ]));
  // Ice bridge from the cabinet plinth to the tower.
  const IB_A = new THREE.Vector3(1.12, 0.64, 1.06),
    IB_B = new THREE.Vector3(-0.09, 0.64, 0.14);
  {
    const d = IB_B.clone().sub(IB_A);
    const len = d.length();
    const u = d.clone().normalize();
    const side = new THREE.Vector3(-u.z, 0, u.x).multiplyScalar(0.06);
    for (const s of [1, -1])
      steel.push(bar(THREE, v3(IB_A.clone().addScaledVector(side, s)), v3(IB_B.clone().addScaledVector(side, s)), 0.006, 4));
    for (let k = 0; k <= Math.floor(len / 0.1); k++) {
      const p = IB_A.clone().addScaledVector(u, k * 0.1);
      steel.push(bar(THREE, v3(p.clone().add(side)), v3(p.clone().sub(side)), 0.004, 4));
    }
    for (const t of [0.12, 0.62]) {
      const p = IB_A.clone().lerp(IB_B, t);
      steel.push(bar(THREE, [p.x, 0.03, p.z], [p.x, 0.64, p.z], 0.012, 8));
      steel.push(bar(THREE, v3(p.clone().add(side.clone().multiplyScalar(1.3))), v3(p.clone().sub(side.clone().multiplyScalar(1.3))), 0.007, 4));
    }
  }
  // Platforms: grating ring + handrail + knee braces.
  const platform = (y: number, ho: number) => {
    const hi = half(y);
    const ring: [number, number, number, number][] = [
      [-ho, ho, hi, ho],
      [-ho, ho, -ho, -hi],
      [hi, ho, -hi, hi],
      [-ho, -hi, -hi, hi],
    ];
    for (const [x0, x1, z0, z1] of ring)
      put(towerG, grating, planarUV(box(x1 - x0, 0.016, z1 - z0, [(x0 + x1) / 2, y, (z0 + z1) / 2]), (x, _y, z) => [x * 14, z * 3.5]));
    const pts: Vec3[] = [
      [-ho, y + 0.008, -ho],
      [ho, y + 0.008, -ho],
      [ho, y + 0.008, ho],
      [-ho, y + 0.008, ho],
      [-ho, y + 0.008, -ho],
    ];
    steel.push(railing(THREE, pts, 0.12, 0.005, 0.16));
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0]]) steelDark.push(bar(THREE, pts[a], pts[b], 0.008, 4)); // toe board edge
    for (const sx of [1, -1])
      for (const sz of [1, -1]) steel.push(bar(THREE, [sx * half(y - 0.3), y - 0.3, sz * half(y - 0.3)], [sx * ho, y - 0.006, sz * ho], 0.007, 4));
  };
  platform(3.76, 0.5);
  platform(3.0, 0.36);
  // Top plate, lightning arrestor (multi-spike finial) and obstruction lights.
  steelDark.push(box(0.42, 0.016, 0.42, [0, TOP + 0.008, 0]));
  steel.push(bar(THREE, [0, TOP, 0], [0, TOP + 0.58, 0], 0.016, 8));
  steel.push(cyl(0.004, 0.012, 0.12, [0, TOP + 0.64, 0], undefined, 6));
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    steel.push(bar(THREE, [0, TOP + 0.56, 0], [Math.cos(a) * 0.05, TOP + 0.64, Math.sin(a) * 0.05], 0.004, 4));
  }
  const obsLight = (p: Vec3) => {
    put(towerG, galvDark, cyl(0.016, 0.016, 0.016, [p[0], p[1] - 0.008, p[2]], undefined, 10));
    put(towerG, obstruction, xf(lathe(THREE, [[0, 0.032], [0.008, 0.03], [0.014, 0.018], [0.015, 0]], 14), p));
  };
  obsLight([0, TOP + 0.5, 0.0]);
  obsLight([0.48, 3.76 + 0.13, 0.48]);
  obsLight([-0.48, 3.76 + 0.13, -0.48]);

  // Sector antenna mounts: boom to a tangential head pipe carrying two
  // vertical mounting pipes (AAU + 4G panel).
  const SECTORS = [Math.PI / 4, Math.PI / 4 + (2 * Math.PI) / 3, Math.PI / 4 + (4 * Math.PI) / 3];
  const R_POLE = 0.64;
  const POLE_OFF = { aau: -0.13, panel: 0.14 };
  for (const th of SECTORS) {
    const d = dirOf(th),
      t = tanOf(th);
    const c = d.clone().multiplyScalar(R_POLE);
    for (const y of [3.7, 4.06]) {
      steel.push(bar(THREE, v3(d.clone().multiplyScalar(0.12).setY(y)), v3(c.clone().setY(y)), 0.011, 8));
      steel.push(bar(THREE, v3(c.clone().addScaledVector(t, -0.2).setY(y)), v3(c.clone().addScaledVector(t, 0.21).setY(y)), 0.01, 8));
    }
    steel.push(bar(THREE, v3(d.clone().multiplyScalar(0.3).setY(3.77)), v3(c.clone().setY(4.06)), 0.007, 6));
    for (const o of [POLE_OFF.aau, POLE_OFF.panel]) {
      const p = c.clone().addScaledVector(t, o);
      steel.push(bar(THREE, [p.x, 3.48, p.z], [p.x, 4.2, p.z], 0.012, 10));
    }
  }
  // Microwave dish mounting pipes on standoff arms.
  const DISHES: { th: number; y: number; r: number }[] = [
    { th: -0.55 * Math.PI, y: 3.28, r: 0.15 },
    { th: 0.92 * Math.PI, y: 3.24, r: 0.13 },
    { th: -0.08 * Math.PI, y: 2.62, r: 0.12 },
  ];
  for (const D of DISHES) {
    const d = dirOf(D.th);
    const p = d.clone().multiplyScalar(half(D.y) + 0.17);
    steel.push(bar(THREE, [p.x, D.y - 0.22, p.z], [p.x, D.y + 0.2, p.z], 0.011, 8));
    for (const y of [D.y - 0.15, D.y + 0.14]) {
      const h = half(y);
      const corner = new THREE.Vector3(Math.sign(d.x) * h, y, Math.sign(d.z) * h);
      const corner2 = new THREE.Vector3(Math.abs(d.x) > Math.abs(d.z) ? Math.sign(d.x) * h : -Math.sign(d.x) * h, y, Math.abs(d.x) > Math.abs(d.z) ? -Math.sign(d.z) * h : Math.sign(d.z) * h);
      steel.push(bar(THREE, v3(corner), [p.x, y, p.z], 0.007, 6));
      steel.push(bar(THREE, v3(corner2), [p.x, y, p.z], 0.007, 6));
    }
  }
  put(towerG, galv, mergeInto(THREE, steel));
  put(towerG, galvDark, mergeInto(THREE, steelDark));
  towerG.add(contactShadow(THREE, 1.9, 1.9, 0.6, 0.04));

  // ================================================================ ACTIVE EQUIPMENT
  const aauG: T.BufferGeometry[] = [],
    finG: T.BufferGeometry[] = [],
    rruG: T.BufferGeometry[] = [],
    feedG: T.BufferGeometry[] = [];
  const panelG: T.BufferGeometry[] = [],
    capG: T.BufferGeometry[] = [];
  const TILT = 0.07;
  SECTORS.forEach((th, si) => {
    const d = dirOf(th),
      t = tanOf(th);
    const c = d.clone().multiplyScalar(R_POLE);
    const hd = heading(d);
    // 5G massive-MIMO AAU (64T64R): squat radome with a finned heat-sink back.
    {
      const p = c.clone().addScaledVector(t, POLE_OFF.aau).addScaledVector(d, 0.055);
      const y = 3.94;
      aauG.push(rbox(0.2, 0.34, 0.06, 0.018, [p.x, y, p.z], [TILT, hd, 0]));
      for (let k = -4; k <= 4; k++) {
        const g = new THREE.BoxGeometry(0.004, 0.3, 0.026);
        g.translate(k * 0.021, 0, -0.04);
        xf(g, [p.x, y, p.z], [TILT, hd, 0]);
        finG.push(g);
      }
      const br = c.clone().addScaledVector(t, POLE_OFF.aau);
      for (const yy of [3.83, 4.06]) finG.push(bar(THREE, [br.x, yy, br.z], v3(p.clone().addScaledVector(d, -0.03).setY(yy)), 0.006, 4));
    }
    // 4G FDD panel antenna (multi-band radome) + its RRU behind on the pipe.
    {
      const pp = c.clone().addScaledVector(t, POLE_OFF.panel);
      const p = pp.clone().addScaledVector(d, 0.045);
      const y = 3.86;
      panelG.push(rbox(0.13, 0.6, 0.05, 0.022, [p.x, y, p.z], [TILT * 0.8, hd, 0]));
      capG.push(rbox(0.134, 0.03, 0.054, 0.01, [p.x, y + 0.3, p.z], [TILT * 0.8, hd, 0]));
      capG.push(rbox(0.134, 0.03, 0.054, 0.01, [p.x, y - 0.3, p.z], [TILT * 0.8, hd, 0]));
      for (const yy of [3.62, 4.1]) capG.push(bar(THREE, [pp.x, yy, pp.z], v3(p.clone().addScaledVector(d, -0.02).setY(yy)), 0.006, 4));
      // RRU: finned box on the back of the same pipe
      const r = pp.clone().addScaledVector(d, -0.05);
      rruG.push(rbox(0.1, 0.17, 0.065, 0.01, [r.x, 3.66, r.z], [0, hd, 0]));
      for (let k = -2; k <= 2; k++) {
        const g = new THREE.BoxGeometry(0.004, 0.15, 0.02);
        g.translate(k * 0.02, 0, -0.04);
        xf(g, [r.x, 3.66, r.z], [0, hd, 0]);
        finG.push(g);
      }
      // jumpers: RRU bottom ports -> antenna bottom connectors
      for (const o of [-0.03, 0.03]) {
        const a = r.clone().addScaledVector(t, o * 0.8).setY(3.575);
        const b = p.clone().addScaledVector(t, o).addScaledVector(d, -0.01).setY(3.545);
        const m = a.clone().lerp(b, 0.5).setY(3.47);
        feedG.push(tube(THREE, [v3(a), v3(m), v3(b)], 0.0065, 5, false, 16));
      }
      // hybrid fibre/DC cable from the cable ladder to RRU and AAU
      const x0 = -0.05 - si * 0.03;
      for (const [tgt, ty] of [[r, 3.75], [c.clone().addScaledVector(t, POLE_OFF.aau).addScaledVector(d, -0.01), 3.77]] as [T.Vector3, number][]) {
        feedG.push(
          tube(THREE, [
            [x0, 3.55, LZ + 0.02],
            [x0, 3.72, LZ + 0.02],
            v3(d.clone().multiplyScalar(0.25).setY(3.73)),
            v3(tgt.clone().addScaledVector(d, -0.04).setY(3.73)),
            v3(tgt.clone().setY(ty)),
          ], 0.006, 5, false, 30)
        );
      }
    }
  });
  // Feeder bundle: BBU cabinet -> ice bridge -> up the cable ladder.
  for (let k = 0; k < 4; k++) {
    const x = -0.05 - k * 0.025;
    const off = (k - 1.5) * 0.022;
    const u = IB_B.clone().sub(IB_A).normalize();
    const side = new THREE.Vector3(-u.z, 0, u.x);
    const a = IB_A.clone().addScaledVector(side, off).setY(0.66);
    const b = IB_B.clone().addScaledVector(side, off).setY(0.66);
    feedG.push(
      tube(THREE, [
        [1.05 + off, 0.56, 1.3],
        [1.08 + off, 0.64, 1.16],
        v3(a),
        v3(b.clone().lerp(a, 0.08)),
        [x, 0.72, LZ + 0.02],
        [x, 2.0, LZ + 0.02],
        [x, 3.6, LZ + 0.02],
      ], 0.0075, 5, false, 90)
    );
  }
  // Microwave ODUs behind the dishes + IF cables.
  const dishG: T.BufferGeometry[] = [],
    domeG: T.BufferGeometry[] = [],
    oduG: T.BufferGeometry[] = [];
  for (const D of DISHES) {
    const d = dirOf(D.th);
    const pipe = d.clone().multiplyScalar(half(D.y) + 0.17);
    const ctr = pipe.clone().addScaledVector(d, 0.07).setY(D.y);
    const hd = heading(d);
    const f = D.r * 0.9;
    const prof: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const r = (D.r * i) / 10;
      prof.push([r, (r * r) / (4 * f)]);
    }
    const dish = lathe(THREE, prof, 28);
    dish.rotateX(Math.PI / 2);
    const depth = (D.r * D.r) / (4 * f);
    dish.translate(0, 0, -depth);
    dishG.push(xf(dish, v3(ctr), [0, hd, 0]));
    dishG.push(xf(new THREE.CylinderGeometry(D.r, D.r, 0.07, 28, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.035), v3(ctr), [0, hd, 0]));
    const cap = new THREE.SphereGeometry(D.r * 3.2, 28, 6, 0, Math.PI * 2, 0, Math.asin(1 / 3.2));
    cap.rotateX(Math.PI / 2);
    cap.translate(0, 0, 0.07 - D.r * 3.2 * Math.cos(Math.asin(1 / 3.2)));
    domeG.push(xf(cap, v3(ctr), [0, hd, 0]));
    const o = ctr.clone().addScaledVector(d, -depth - 0.05);
    oduG.push(rbox(0.09, 0.09, 0.06, 0.012, v3(o), [0, hd, 0]));
    feedG.push(tube(THREE, [v3(o.clone().setY(D.y - 0.05)), v3(pipe.clone().setY(D.y - 0.2)), [-0.06, D.y - 0.35, LZ + 0.02], [-0.06, D.y - 0.6, LZ + 0.02]], 0.005, 5, false, 24));
  }

  // Outdoor cabinets on the plinth (doors face +z, toward the street-side view).
  const CAB_Z = 1.32,
    CW = 0.3,
    CH = 0.46,
    CD = 0.3;
  const cabG = { active: [] as T.BufferGeometry[], power: [] as T.BufferGeometry[] };
  const trimG = { active: [] as T.BufferGeometry[], power: [] as T.BufferGeometry[] };
  const cabinet = (x: number, kind: "active" | "power", open: boolean, interior?: (x: number, y0: number, zf: number) => void) => {
    const y0 = PLINTH_Y + 0.03;
    const body = cabG[kind],
      trim = trimG[kind];
    const zf = CAB_Z + CD / 2;
    trim.push(box(CW - 0.02, 0.03, CD - 0.02, [x, PLINTH_Y + 0.015, CAB_Z]));
    body.push(rbox(CW + 0.03, 0.025, CD + 0.05, 0.008, [x, y0 + CH + 0.012, CAB_Z + 0.01])); // rain hood
    if (!open) {
      body.push(rbox(CW, CH, CD, 0.01, [x, y0 + CH / 2, CAB_Z]));
      // door outline, handle, louvres
      const e = zf + 0.002;
      trim.push(box(CW - 0.04, 0.004, 0.003, [x, y0 + CH - 0.02, e]));
      trim.push(box(CW - 0.04, 0.004, 0.003, [x, y0 + 0.02, e]));
      trim.push(box(0.004, CH - 0.04, 0.003, [x - CW / 2 + 0.02, y0 + CH / 2, e]));
      trim.push(box(0.004, CH - 0.04, 0.003, [x + CW / 2 - 0.02, y0 + CH / 2, e]));
      trim.push(box(0.012, 0.06, 0.012, [x + CW / 2 - 0.045, y0 + CH * 0.55, e + 0.005]));
      for (let k = 0; k < 6; k++) trim.push(box(CW * 0.5, 0.005, 0.006, [x - 0.03, y0 + 0.05 + k * 0.016, e + 0.001]));
    } else {
      const t = 0.012;
      body.push(box(CW, CH, t, [x, y0 + CH / 2, CAB_Z - CD / 2 + t / 2]));
      body.push(box(t, CH, CD, [x - CW / 2 + t / 2, y0 + CH / 2, CAB_Z]));
      body.push(box(t, CH, CD, [x + CW / 2 - t / 2, y0 + CH / 2, CAB_Z]));
      body.push(box(CW, t, CD, [x, y0 + CH - t / 2, CAB_Z]));
      body.push(box(CW, t, CD, [x, y0 + t / 2, CAB_Z]));
      trim.push(box(CW - 2 * t, CH - 2 * t, 0.004, [x, y0 + CH / 2, CAB_Z - CD / 2 + t + 0.002]));
      // door swung open on its left hinge
      const door = new THREE.BoxGeometry(CW, CH, 0.012);
      door.translate(CW / 2, 0, 0.006);
      door.rotateY(-1.85);
      door.translate(x - CW / 2, y0 + CH / 2, zf);
      body.push(door);
      const inner = new THREE.BoxGeometry(CW - 0.04, CH - 0.04, 0.004);
      inner.translate(CW / 2, 0, -0.002);
      inner.rotateY(-1.85);
      inner.translate(x - CW / 2, y0 + CH / 2, zf);
      trim.push(inner);
      // 19" rack rails
      for (const s of [-1, 1]) trim.push(box(0.01, CH - 0.04, 0.01, [x + s * (CW / 2 - 0.035), y0 + CH / 2, zf - 0.05]));
      interior?.(x, y0, zf);
    }
  };
  // 5G BBU / baseband cabinet — open, showing BBU subracks, switch and ODF.
  const ledG: T.BufferGeometry[] = [],
    bbuG: T.BufferGeometry[] = [],
    rackG: T.BufferGeometry[] = [];
  cabinet(1.03, "active", true, (x, y0, zf) => {
    const units: [number, number][] = [
      [0.36, 0.06],
      [0.28, 0.06],
      [0.2, 0.03],
      [0.13, 0.05],
    ];
    for (const [yy, hh] of units) {
      bbuG.push(box(CW - 0.08, hh, 0.2, [x, y0 + yy, zf - 0.13]));
      for (let k = 0; k < 6; k++) ledG.push(box(0.008, 0.006, 0.004, [x - 0.08 + k * 0.022, y0 + yy + hh * 0.25, zf - 0.028]));
      for (let k = 0; k < 4; k++) rackG.push(box(0.016, hh * 0.5, 0.004, [x - 0.02 + k * 0.024, y0 + yy - hh * 0.1, zf - 0.029]));
    }
    rackG.push(box(CW - 0.08, 0.05, 0.16, [x, y0 + 0.06, zf - 0.13])); // DCDU
    for (let k = 0; k < 5; k++) feedG.push(tube(THREE, [[x - 0.05 + k * 0.02, y0 + 0.37, zf - 0.03], [x - 0.04 + k * 0.02, y0 + 0.42, zf - 0.07], [x - 0.03 + k * 0.015, y0 + CH - 0.02, zf - 0.2]], 0.0035, 4, false, 10));
  });
  cabinet(1.37, "active", false); // 4G BTS + transmission (IP-RAN router)
  // IPMS (rectifier + controller) and battery cabinet — the power system.
  cabinet(1.71, "power", false);
  const batG: T.BufferGeometry[] = [],
    termG: T.BufferGeometry[] = [];
  cabinet(2.05, "power", true, (x, y0, zf) => {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const bx = x - 0.08 + c * 0.08,
          by = y0 + 0.07 + r * 0.13;
        batG.push(rbox(0.07, 0.1, 0.18, 0.006, [bx, by, zf - 0.13]));
        termG.push(box(0.012, 0.012, 0.012, [bx - 0.02, by + 0.055, zf - 0.06]));
        batG.push(box(0.012, 0.012, 0.012, [bx + 0.02, by + 0.055, zf - 0.06]));
      }
    for (let r = 0; r < 3; r++) cabG.power.push(box(CW - 0.04, 0.006, 0.22, [x, y0 + 0.016 + r * 0.13, zf - 0.13]));
  });
  // Rectifier modules visible through a small window on the IPMS door.
  for (let k = 0; k < 4; k++) put(antG, rectifier, box(0.045, 0.1, 0.004, [1.71 - 0.075 + k * 0.05, PLINTH_Y + 0.03 + 0.32, CAB_Z + CD / 2 + 0.004]));
  // Power interface unit + EB meter box on the gate post.
  put(antG, ebBox, rbox(0.12, 0.16, 0.06, 0.008, [FENCE[1] - 0.05, 0.42, 0.66]));
  put(antG, ebBox, rbox(0.1, 0.14, 0.05, 0.008, [2.2, 0.36, 1.66]));
  put(antG, cabTrimP, tube(THREE, [[2.2, 0.29, 1.66], [2.22, 0.2, 1.62], [2.15, 0.14, 1.48]], 0.006, 4));
  put(antG, cabTrimP, tube(THREE, [[FENCE[1] - 0.05, 0.34, 0.66], [2.32, 0.08, 0.9], [2.22, 0.12, 1.4]], 0.006, 4));

  // DG set in its acoustic canopy, with silencer and exhaust stack.
  {
    const x = -1.16,
      z = 1.37;
    put(antG, dgBody, box(0.74, 0.05, 0.4, [x, 0.105, z])); // base-frame fuel tank
    put(antG, dgCanopy, planarUV(rbox(0.7, 0.32, 0.36, 0.02, [x, 0.29, z]), (px, y, pz) => [(px + pz) * 4, y * 8]));
    put(antG, dgBody, box(0.72, 0.03, 0.38, [x, 0.46, z]));
    put(antG, cabTrimP, box(0.12, 0.09, 0.004, [x + 0.2, 0.32, z + 0.182])); // control panel window
    put(antG, exhaust, cyl(0.03, 0.03, 0.16, [x - 0.18, 0.52, z], [0, 0, Math.PI / 2], 14));
    put(antG, exhaust, tube(THREE, [[x - 0.26, 0.52, z], [x - 0.3, 0.55, z], [x - 0.31, 0.62, z], [x - 0.31, 0.78, z]], 0.012, 8));
  }
  // Solar array on the shelter roof.
  {
    const cx = -1.25,
      cz = -1.02,
      y = 0.07 + 0.43;
    for (const dx of [-0.17, 0.17]) {
      const g = new THREE.BoxGeometry(0.3, 0.012, 0.46);
      g.rotateX(0.32);
      g.translate(cx + dx, y + 0.1, cz);
      put(antG, solar, g);
    }
    for (const dx of [-0.3, 0.0, 0.3]) {
      put(antG, solarFrame, bar(THREE, [cx + dx, y, cz - 0.2], [cx + dx, y + 0.17, cz - 0.2], 0.008, 4));
      put(antG, solarFrame, bar(THREE, [cx + dx, y, cz + 0.2], [cx + dx, y + 0.03, cz + 0.2], 0.008, 4));
    }
  }
  // GPS antenna on the top platform rail.
  put(antG, radome, lathe(THREE, [[0, 0.04], [0.018, 0.036], [0.026, 0.02], [0.026, 0]], 14).translate(0.42, 3.9, -0.12));

  put(activeG, aauBody, mergeInto(THREE, aauG));
  put(activeG, aauFins, mergeInto(THREE, finG));
  put(activeG, rruBody, mergeInto(THREE, rruG));
  put(activeG, feeder, mergeInto(THREE, feedG));
  put(activeG, odu, mergeInto(THREE, oduG));
  put(activeG, cabActive, mergeInto(THREE, cabG.active));
  put(activeG, cabTrimA, mergeInto(THREE, trimG.active));
  put(activeG, bbuFace, mergeInto(THREE, bbuG));
  put(activeG, rackDark, mergeInto(THREE, rackG));
  put(activeG, ledGreen, mergeInto(THREE, ledG));
  put(antG, radome, mergeInto(THREE, panelG));
  put(antG, radomeCap, mergeInto(THREE, capG));
  put(antG, dishMetal, mergeInto(THREE, dishG));
  put(antG, dishRadome, mergeInto(THREE, domeG));
  put(antG, cabPower, mergeInto(THREE, cabG.power));
  put(antG, cabTrimP, mergeInto(THREE, trimG.power));
  put(antG, battery, mergeInto(THREE, batG));
  put(antG, termRed, mergeInto(THREE, termG));
  const shadowCab = contactShadow(THREE, 1.7, 0.8, 0.45, PLINTH_Y + 0.003);
  shadowCab.position.x = 1.55;
  shadowCab.position.z = CAB_Z;
  activeG.add(shadowCab);

  // ---------------------------------------------------------------- emit merged meshes
  for (const [mat, { g, geos }] of bins) {
    const geo = geos.length === 1 ? geos[0] : mergeInto(THREE, geos);
    g.add(new THREE.Mesh(geo, mat));
  }

  // ---------------------------------------------------------------- levels
  const GHOST = 0.18;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const full = clamp01(1 - v);
      L.set("site", lerp(1, 0.12, clamp01(v)));
      L.set("duct", lerp(1, 0.42, clamp01(v)));
      L.set("soil", lerp(1, 0.16, clamp01(v)));
      L.set("tower", Math.max(full, tri(v, 1), GHOST + 0.04));
      L.set("active", Math.max(full, tri(v, 2), GHOST));
      L.set("ant", Math.max(full, clamp01(v - 2), GHOST));
      focusTower(tri(v, 1) * 0.35);
      focusActive(tri(v, 2) * 0.45);
      focusAnt(clamp01(v - 2) * 0.45);
      focusPower(clamp01(v - 2) * 0.35);
    },
  };
}
