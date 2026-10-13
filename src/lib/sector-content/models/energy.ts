// Energy generation — a miniature "energy landscape" diorama on a round,
// sectioned terrain plinth: a coal/gas thermal station (boiler house, turbine
// hall, ESP, chimney, hyperbolic cooling towers with vapour), a utility-scale
// PV farm, a wind farm of three-blade turbines on rolling ground, an arch dam
// with reservoir, penstocks and powerhouse in a mountain valley, and a
// container BESS yard — all tied by double-circuit lattice transmission lines
// into a central EHV substation, with an export line leaving the plinth.
//
// Layers are systems: level 0 shows the whole diorama; level 1 brings the
// generating plants forward (each tinted in its zone colour) and ghosts the
// grid; level 2 brings transmission, substation and storage forward and
// ghosts the plants. Terrain/context fades down from level 1 on.
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  extrude,
  lathe,
  layerMats,
  lerp,
  liftingSurface,
  mergeInto,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

export function buildEnergy(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [siteG, genG, gridG] = ctx.layerGroups;
  const L = layerMats();
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  const std = (color: number, metalness = 0.2, roughness = 0.7, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // Deterministic RNG so the scatter is identical on every load.
  let seed = 1337;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ================================================================ terrain field
  const RAD = 8;
  const BASE = 0.015;
  const SKIRT = -0.38;
  const WATER = 0.8;
  const CREST = 0.9;

  // Hydro valley frame: origin at the dam, u = upstream (away from centre),
  // w = across the valley.
  const DX = 4.6,
    DZ = -2.4;
  const nl = Math.hypot(0.35, 1);
  const N0 = 0.35 / nl,
    N1 = -1 / nl;
  const L0 = -N1,
    L1 = N0;
  const toLocal = (x: number, z: number): Vec2 => {
    const rx = x - DX,
      rz = z - DZ;
    return [rx * N0 + rz * N1, rx * L0 + rz * L1];
  };
  const toWorld = (u: number, w: number): Vec2 => [DX + u * N0 + w * L0, DZ + u * N1 + w * L1];
  const damC = (w: number) => 0.22 * (1 - Math.min(1, (w / 1.2) ** 2));
  const damThick = (y: number) => 0.06 + 0.2 * Math.pow(clamp01(1 - y / CREST), 1.6);

  const basinE = (u: number, w: number) => ((u - 1.1) / 1.15) ** 2 + (w / 1.25) ** 2;
  const hydroH = (u: number, w: number) => {
    const aw = Math.abs(w);
    const m = smoothstep(u, -1.9, -0.35) * (1 - smoothstep(aw, 1.6, 3.1));
    if (m <= 0) return 0;
    const n = 0.2 * Math.sin(u * 2.1 + w * 1.6) * Math.sin(w * 2.7 - u * 1.3) + 0.06 * Math.sin(u * 5.3 + w * 3.1 + 1.3);
    const hm = Math.pow(m, 1.3) * (1.08 + n);
    const valley = (1 - smoothstep(aw, 0.55, 1.15)) * (1 - smoothstep(u, 0.15, 0.5));
    const Eb = basinE(u, w);
    const basin = 1 - smoothstep(Eb, 0.45, 1.25);
    const carve = Math.max(valley, basin);
    const bf = 0.5 - 0.2 * clamp01(1 - Eb);
    const floor = lerp(BASE, bf, basin / (basin + valley + 1e-6));
    return lerp(hm, floor, carve);
  };
  const bump = (x: number, z: number, cx: number, cz: number, r: number) => {
    const d = Math.hypot(x - cx, z - cz) / r;
    return d >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * d));
  };
  const MOUNDS: [number, number, number, number][] = [
    [5.8, 4.0, 1.5, 0.32],
    [-6.2, -2.9, 1.9, 0.5],
    [-0.9, 6.9, 1.4, 0.3],
    [-6.5, 4.8, 1.3, 0.35],
    [2.7, -7.0, 1.4, 0.28],
    [-3.6, 6.3, 1.2, 0.22],
  ];
  const H = (x: number, z: number) => {
    const [u, w] = toLocal(x, z);
    let h = Math.max(BASE, hydroH(u, w));
    for (const [cx, cz, r, a] of MOUNDS) h += a * bump(x, z, cx, cz, r) * (1 + 0.15 * Math.sin(x * 4.1 + z * 3.3));
    return h;
  };

  // ================================================================ materials
  // --- site / context. Ground stays solid and dims with the level (a ghosted
  // terrain would expose the floor grid and buried footings); trees ghost.
  const groundMats: { m: T.MeshStandardMaterial; base: T.Color }[] = [];
  const G = (m: T.MeshStandardMaterial) => {
    groundMats.push({ m, base: m.color.clone() });
    return m;
  };
  const terrainMat = G( std(0xffffff, 0, 0.95, { vertexColors: true }));
  const strataTex = canvasTexture(THREE, 64, 256, (g, w, h) => {
    const bands: [number, string][] = [
      [0.0, "#3a2d22"],
      [0.025, "#5b4835"],
      [0.08, "#6e5c46"],
      [0.16, "#5f564b"],
      [0.27, "#77705f"],
      [0.38, "#5c574e"],
      [0.52, "#6c665a"],
      [0.66, "#4f4b45"],
      [0.82, "#5e5950"],
    ];
    for (let i = 0; i < bands.length; i++) {
      const y0 = bands[i][0] * h,
        y1 = (i + 1 < bands.length ? bands[i + 1][0] : 1) * h;
      g.fillStyle = bands[i][1];
      g.fillRect(0, y0, w, y1 - y0);
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "0,0,0"},${0.05 + rnd() * 0.07})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1);
    }
  });
  strataTex.wrapS = THREE.RepeatWrapping;
  const skirtMat = G( std(0xffffff, 0, 0.95, { map: strataTex, side: THREE.DoubleSide }));
  const plinthMat = G( std(0x1b2129, 0.55, 0.45));
  const waterMat = G(
    std(0x2d6579, 0, 0.6, { opacity: 0.92, transparent: true, envMapIntensity: 0.3 })
  );
  const riverMat = G( std(0x3a7a8e, 0, 0.6, { opacity: 0.92, transparent: true, envMapIntensity: 0.3 }));
  const roadMat = G( std(0x3d4146, 0, 0.9));
  const padMat = G( std(0x8f8d86, 0, 0.92));
  const gravelMat = G( std(0x6f6c66, 0, 0.98));
  const coniferMat = L.add("trees", std(0xffffff, 0, 0.9));
  const broadMat = L.add("trees", std(0xffffff, 0, 0.9));

  // --- generation
  const cladTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#c5cbd1";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 10) {
      g.fillStyle = "rgba(60,70,80,0.18)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(x + 3, 0, 1, h);
    }
    g.fillStyle = "#26323d";
    g.fillRect(0, 40, w, 34);
    g.fillStyle = "#8c96a0";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 40, 3, 34);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, 40, w, 5);
  });
  cladTex.wrapS = cladTex.wrapT = THREE.RepeatWrapping;
  const cladMat = L.add("gen", std(0xffffff, 0.25, 0.6, { map: cladTex }));
  const cladAccent = L.add("gen", std(0xb8673a, 0.3, 0.55)); // boiler-house band / thermal accent
  const roofMat = L.add("gen", std(0x56616c, 0.5, 0.5));
  const steelMat = L.add("gen", std(0x868f98, 0.6, 0.45));
  const darkSteel = L.add("gen", std(0x3a4148, 0.6, 0.5));
  const coolTowerMat = L.add("gen", std(0xb3aea4, 0, 0.88, { side: THREE.DoubleSide }));
  const coolInnerMat = L.add("gen", std(0x3a3a38, 0, 0.95));
  const chimTex = canvasTexture(THREE, 32, 256, (g, w, h) => {
    g.fillStyle = "#b5afa5";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`;
      g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 6);
    }
    const bandH = h * 0.045;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 === 0 ? "#b2322b" : "#e8e6e1";
      g.fillRect(0, i * bandH, w, bandH);
    }
    g.fillStyle = "#2a2522";
    g.fillRect(0, 0, w, 3);
  });
  const chimneyMat = L.add("gen", std(0xffffff, 0, 0.85, { map: chimTex }));
  const coalMat = L.add("gen", std(0x1f2124, 0, 1));
  const transfMat = L.add("gen", std(0x59645c, 0.45, 0.55));
  const porcelain = L.add("gen", std(0x7d4f38, 0.1, 0.4));

  const cellsTex = canvasTexture(THREE, 512, 128, (g, w, h) => {
    const mw = w / 8,
      mh = h / 2;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 2; j++) {
        const x = i * mw,
          y = j * mh;
        const grd = g.createLinearGradient(x, y, x + mw, y + mh);
        grd.addColorStop(0, "#1f3558");
        grd.addColorStop(1, "#14223c");
        g.fillStyle = grd;
        g.fillRect(x, y, mw, mh);
        g.strokeStyle = "rgba(120,150,200,0.28)";
        g.lineWidth = 1;
        for (let k = 1; k < 6; k++) {
          g.beginPath();
          g.moveTo(x + (k * mw) / 6, y);
          g.lineTo(x + (k * mw) / 6, y + mh);
          g.stroke();
        }
        for (let k = 1; k < 10; k++) {
          g.beginPath();
          g.moveTo(x, y + (k * mh) / 10);
          g.lineTo(x + mw, y + (k * mh) / 10);
          g.stroke();
        }
        g.strokeStyle = "#b9c2cb";
        g.lineWidth = 3;
        g.strokeRect(x + 1.5, y + 1.5, mw - 3, mh - 3);
      }
  });
  const pvMat = L.add("gen", std(0xffffff, 0.4, 0.22, { map: cellsTex, envMapIntensity: 1.3 }));
  const aluMat = L.add("gen", std(0xb4bcc4, 0.8, 0.35));
  const pvFrameMat = L.add("gen", std(0x8e979f, 0.7, 0.45));

  const windWhite = L.add("gen", std(0xeef1f3, 0.15, 0.38));
  const windGrey = L.add("gen", std(0xc9cfd4, 0.3, 0.45));

  const concreteTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#aaa69c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "40,35,30"},${rnd() * 0.06})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    g.strokeStyle = "rgba(60,55,50,0.28)";
    g.lineWidth = 1.5;
    for (let y = 0; y < h; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    for (let x = 0; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    // weathering streaks
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(50,45,40,${0.03 + rnd() * 0.05})`;
      g.fillRect(rnd() * w, 0, 2 + rnd() * 3, h);
    }
  });
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  const damMat = L.add("gen", std(0xffffff, 0, 0.85, { map: concreteTex, side: THREE.DoubleSide }));
  const penstockMat = L.add("gen", std(0x5d6a72, 0.6, 0.45));
  const foamMat = L.add("gen", std(0xe6f0f2, 0, 0.4, { opacity: 0.85 }));

  // vapour plumes (soft sprites), part of the plants
  const puffTex = canvasTexture(THREE, 128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,0.95)");
    grd.addColorStop(0.45, "rgba(245,248,250,0.55)");
    grd.addColorStop(1, "rgba(240,244,248,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const vapourMat = L.add(
    "vapour",
    new THREE.SpriteMaterial({ map: puffTex, color: 0xeef2f5, opacity: 0.42, depthWrite: false, fog: true })
  );
  const smokeMat = L.add(
    "vapour",
    new THREE.SpriteMaterial({ map: puffTex, color: 0x9da4aa, opacity: 0.3, depthWrite: false, fog: true })
  );

  // --- grid & storage
  const latticeMat = L.add("grid", std(0xaab2ba, 0.75, 0.38));
  const insulMat = L.add("grid", std(0x8fb4a8, 0.2, 0.25));
  const wireMat = L.add("grid", std(0x2b2f33, 0.7, 0.4));
  const subSteel = L.add("grid", std(0x9ba4ad, 0.7, 0.4));
  const subTransf = L.add("grid", std(0x5b675f, 0.45, 0.55));
  const subPorc = L.add("grid", std(0x8a5a40, 0.1, 0.4));
  const subBldg = L.add("grid", std(0xd3d0c8, 0.05, 0.75));
  const subRoof = L.add("grid", std(0x4c565f, 0.4, 0.55));
  const fenceMat = L.add("grid", std(0x8a939b, 0.6, 0.5));
  const contTex = canvasTexture(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = "#e3e6e8";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "rgba(90,100,110,0.22)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(x + 3, 0, 2, h);
    }
  });
  contTex.wrapS = contTex.wrapT = THREE.RepeatWrapping;
  const bessMat = L.add("grid", std(0xffffff, 0.3, 0.5, { map: contTex }));
  const bessDark = L.add("grid", std(0x2f353c, 0.5, 0.5));
  const bessAccent = L.add("grid", std(0x7a5cc7, 0.35, 0.45));

  // Emissive focus tints (zone colours).
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusThermal = focus([cladAccent, coolTowerMat, chimneyMat], 0xd96c2b);
  const focusSolar = focus([pvFrameMat, aluMat], 0xc99a2e);
  const focusWind = focus([windWhite], 0x2e86ab);
  const focusHydro = focus([damMat, penstockMat], 0x1e9e76);
  const focusBess = focus([bessMat, bessAccent], 0x7a5cc7);
  const focusLines = focus([latticeMat, insulMat, subSteel], 0x49d4c9);

  // ---------------------------------------------------------------- helpers
  /** Box whose UVs are scaled by face size, so a repeating texture keeps one density. */
  const tiledBox = (w: number, h: number, d: number, tile = 0.3) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute("uv");
    const dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
      }
    return g;
  };
  /** Indexed grid surface from a parametric function (s,t in [0,1]). */
  const gridSurf = (ns: number, nt: number, f: (s: number, t: number) => Vec3, uvf?: (s: number, t: number) => Vec2) => {
    const pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= ns; i++)
      for (let j = 0; j <= nt; j++) {
        const s = i / ns,
          t = j / nt;
        pos.push(...f(s, t));
        uv.push(...(uvf ? uvf(s, t) : [s, t]));
      }
    for (let i = 0; i < ns; i++)
      for (let j = 0; j < nt; j++) {
        const a = i * (nt + 1) + j,
          b = (i + 1) * (nt + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  /** Flat ribbon draped over the terrain along a smooth path (roads, rivers). */
  const ribbon = (pts: Vec2[], width: (t: number) => number, lift: number, samples = 80) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p[0], 0, p[1])),
      false,
      "centripetal"
    );
    return gridSurf(
      samples,
      1,
      (s, t) => {
        const p = curve.getPointAt(s);
        const tg = curve.getTangentAt(s);
        const hw = width(s) / 2;
        const x = p.x + -tg.z * hw * (t * 2 - 1),
          z = p.z + tg.x * hw * (t * 2 - 1);
        return [x, H(x, z) + lift, z];
      },
      (s, t) => [s * 20, t]
    );
  };

  // ================================================================ site (layer 0)
  // Terrain: polar grid so the rim is a true circle.
  {
    const NR = 130,
      NS = 340;
    const pos: number[] = [];
    for (let i = 0; i <= NR; i++) {
      const r = RAD * Math.pow(i / NR, 0.92);
      for (let j = 0; j < NS; j++) {
        const a = (j / NS) * Math.PI * 2;
        const x = r * Math.cos(a),
          z = r * Math.sin(a);
        pos.push(x, H(x, z), z);
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < NR; i++)
      for (let j = 0; j < NS; j++) {
        const a = i * NS + j,
          b = i * NS + ((j + 1) % NS),
          c = (i + 1) * NS + ((j + 1) % NS),
          d = (i + 1) * NS + j;
        idx.push(a, b, d, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const nrm = g.getAttribute("normal");
    const col: number[] = [];
    const cGrass = new THREE.Color(0x667a4b),
      cGrass2 = new THREE.Color(0x56693f),
      cDry = new THREE.Color(0x8b8a62),
      cForest = new THREE.Color(0x4a5d3c),
      cRock = new THREE.Color(0x77705f),
      cBed = new THREE.Color(0x4f5a55),
      tmp = new THREE.Color();
    for (let v = 0; v < pos.length / 3; v++) {
      const x = pos[v * 3],
        y = pos[v * 3 + 1],
        z = pos[v * 3 + 2];
      const ny = nrm.getY(v);
      const n1 = 0.5 + 0.5 * Math.sin(x * 1.7 + Math.sin(z * 1.3) * 2) * Math.cos(z * 1.9 - x * 0.7);
      const n2 = 0.5 + 0.5 * Math.sin(x * 3.1 + Math.sin(z * 2.3) * 1.5) * Math.sin(z * 2.7 + Math.cos(x * 1.9) * 1.5);
      tmp.copy(cGrass).lerp(cGrass2, n1 * 0.8).lerp(cDry, smoothstep(n2 * n1, 0.45, 0.9) * 0.45);
      tmp.lerp(cForest, smoothstep(y, 0.2, 0.75) * 0.85);
      tmp.lerp(cRock, smoothstep(1 - ny, 0.28, 0.55) * 0.85);
      const [u, w] = toLocal(x, z);
      if (y < WATER + 0.02 && basinE(u, w) < 1.3 && u > -0.1) tmp.lerp(cBed, 0.85);
      col.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    mesh(siteG, g, terrainMat);

    // Sectioned skirt (soil strata follow the surface) + display plinth.
    const NSk = NS;
    const depths = [0, 0.03, 0.09, 0.2, 0.4, 0.7, 1.1, 1.6];
    const sp: number[] = [],
      su: number[] = [],
      si: number[] = [];
    const rows = depths.length + 1;
    for (let j = 0; j <= NSk; j++) {
      const a = (j / NSk) * Math.PI * 2;
      const x = RAD * Math.cos(a),
        z = RAD * Math.sin(a);
      const yt = H(x, z);
      for (let k = 0; k < rows; k++) {
        const y = k < depths.length ? Math.max(SKIRT, yt - depths[k]) : SKIRT;
        sp.push(x, y, z);
        su.push((j / NSk) * 40, 1 - (yt - y) / 1.8);
      }
    }
    for (let j = 0; j < NSk; j++)
      for (let k = 0; k < rows - 1; k++) {
        const a = j * rows + k,
          b = (j + 1) * rows + k;
        si.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const sg = new THREE.BufferGeometry();
    sg.setIndex(si);
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute("uv", new THREE.Float32BufferAttribute(su, 2));
    sg.computeVertexNormals();
    mesh(siteG, sg, skirtMat);
    const plinth = lathe(
      THREE,
      [
        [0, SKIRT - 0.12],
        [RAD + 0.16, SKIRT - 0.12],
        [RAD + 0.2, SKIRT - 0.09],
        [RAD + 0.2, SKIRT - 0.03],
        [RAD + 0.14, SKIRT],
        [0, SKIRT],
      ],
      128
    );
    mesh(siteG, plinth, plinthMat);
  }

  // Reservoir: water sheet clipped to the dam's upstream face, shoreline is
  // wherever the terrain rises through it.
  {
    const g = gridSurf(60, 18, (s, t) => {
      const w = lerp(-1.42, 1.42, s);
      const k = Math.sqrt(Math.max(0, 1 - (w / 1.42) ** 2));
      const u0 = Math.max(damC(w) + 0.03, 1.1 - 1.32 * k);
      const u1 = Math.max(u0, 1.1 + 1.32 * k);
      const [x, z] = toWorld(lerp(u0, u1, t), w);
      return [x, WATER, z];
    });
    mesh(siteG, g, waterMat);
  }
  // River below the dam, swinging out across the plain to the plinth edge.
  const riverPts: Vec2[] = (
    [
      [-0.28, -0.4],
      [-0.6, -0.25],
      [-1.0, 0.05],
      [-1.35, 0.55],
      [-1.65, 1.3],
      [-1.85, 2.3],
      [-1.95, 3.3],
      [-2.0, 4.4],
    ] as Vec2[]
  ).map(([u, w]) => toWorld(u, w));
  mesh(siteG, ribbon(riverPts, (s) => lerp(0.16, 0.3, s), 0.012, 90), riverMat);

  // Roads.
  const roads: Vec2[][] = [
    [
      [-3.25, 0.05],
      [-2.4, -0.35],
      [-1.5, -0.65],
      [-0.85, -1.0],
    ],
    [
      [0.35, -0.12],
      [0.45, 1.0],
      [0.85, 2.05],
      [1.8, 3.0],
      [3.2, 2.85],
      [4.4, 1.6],
    ],
    [
      [0.05, -1.9],
      [-0.7, -2.6],
      [-1.4, -3.3],
      [-2.2, -3.62],
    ],
    [
      [1.45, -1.0],
      [2.4, -0.55],
      [3.4, -0.75],
      toWorld(-1.0, 0.25),
      toWorld(-0.62, 0.32),
    ],
  ];
  {
    const rg = roads.map((r) => ribbon(r, () => 0.09, 0.008, 60));
    mesh(siteG, mergeInto(THREE, rg), roadMat);
  }

  // Hard-standing pads.
  const pad = (x0: number, x1: number, z0: number, z1: number, mat: T.Material, t = 0.025) => {
    const g = roundedBox(THREE, x1 - x0, t, z1 - z0, 0.01, 1);
    mesh(siteG, g, mat, [(x0 + x1) / 2, BASE + t / 2 - 0.008, (z0 + z1) / 2]);
    return BASE + t - 0.008;
  };
  const thermalY = pad(-5.6, -3.15, -0.15, 3.6, padMat);
  const subY = pad(-0.8, 1.4, -1.85, -0.15, gravelMat);
  const bessY = pad(-4.35, -1.45, -5.55, -3.65, gravelMat);

  // ================================================================ thermal station
  {
    const TX = -4.7;
    // Turbine hall with a vaulted roof.
    const hallH = 0.5;
    mesh(genG, tiledBox(1.34, hallH, 0.52, 0.28), cladMat, [TX, thermalY + hallH / 2, 3.1]);
    const arch: Vec2[] = [[-0.27, 0]];
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (i / 10);
      arch.push([-0.27 * Math.cos(a), 0.065 * Math.sin(a)]);
    }
    arch.push([0.27, 0]);
    const roof = extrude(THREE, arch, 1.36);
    roof.rotateY(Math.PI / 2);
    mesh(genG, roof, roofMat, [TX, thermalY + hallH, 3.1]);
    // Boiler house: tall clad block with an accent band, penthouse and steel frame.
    const bh = 1.18;
    mesh(genG, tiledBox(0.82, bh, 0.68, 0.28), cladMat, [TX, thermalY + bh / 2, 2.48]);
    mesh(genG, new THREE.BoxGeometry(0.84, 0.1, 0.7), cladAccent, [TX, thermalY + bh - 0.12, 2.48]);
    mesh(genG, tiledBox(0.5, 0.16, 0.42, 0.28), cladMat, [TX + 0.05, thermalY + bh + 0.08, 2.48]);
    mesh(genG, new THREE.BoxGeometry(0.86, 0.02, 0.72), roofMat, [TX, thermalY + bh + 0.005, 2.48]);
    {
      const fr: T.BufferGeometry[] = [];
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const x = TX + sx * 0.425,
            z = 2.48 + sz * 0.355;
          fr.push(bar(THREE, [x, thermalY, z], [x, thermalY + bh + 0.02, z], 0.012, 6));
        }
      for (const y of [0.3, 0.62, 0.94])
        for (const sz of [-1, 1])
          fr.push(bar(THREE, [TX - 0.43, thermalY + y, 2.48 + sz * 0.36], [TX + 0.43, thermalY + y, 2.48 + sz * 0.36], 0.007, 4));
      mesh(genG, mergeInto(THREE, fr), darkSteel);
    }
    // Flue duct boiler -> ESP -> chimney.
    mesh(genG, new THREE.BoxGeometry(0.36, 0.18, 0.3), steelMat, [TX, thermalY + 0.68, 2.0]);
    // Electrostatic precipitator on hoppers.
    {
      const ez = 1.6;
      mesh(genG, tiledBox(0.78, 0.42, 0.5, 0.2), steelMat, [TX, thermalY + 0.56, ez]);
      mesh(genG, new THREE.BoxGeometry(0.8, 0.04, 0.52), roofMat, [TX, thermalY + 0.79, ez]);
      const hop: T.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 2; k++) {
          const g = new THREE.CylinderGeometry(0.13, 0.025, 0.2, 4, 1);
          g.rotateY(Math.PI / 4);
          g.translate(TX - 0.26 + i * 0.26, thermalY + 0.25, ez - 0.125 + k * 0.25);
          hop.push(g);
        }
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          hop.push(bar(THREE, [TX + sx * 0.37, thermalY, ez + sz * 0.23], [TX + sx * 0.37, thermalY + 0.36, ez + sz * 0.23], 0.012, 4));
      mesh(genG, mergeInto(THREE, hop), darkSteel);
    }
    mesh(genG, new THREE.BoxGeometry(0.2, 0.16, 0.42), steelMat, [TX, thermalY + 0.32, 1.12]);
    // Chimney (banded RCC stack with platforms).
    const CZ = 0.78,
      CH = 2.45;
    const chimPts: Vec2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      chimPts.push([lerp(0.13, 0.072, t), thermalY + t * CH]);
    }
    chimPts.push([0.06, thermalY + CH]);
    mesh(genG, lathe(THREE, chimPts, 28), chimneyMat, [TX, 0, CZ]);
    {
      const pl: T.BufferGeometry[] = [];
      for (const t of [0.62, 0.86]) {
        const r = lerp(0.13, 0.072, t) + 0.025;
        const ring = new THREE.TorusGeometry(r, 0.008, 4, 28);
        ring.rotateX(Math.PI / 2);
        ring.translate(TX, thermalY + t * CH, CZ);
        pl.push(ring);
      }
      mesh(genG, mergeInto(THREE, pl), darkSteel);
    }
    // Coal yard: stockpiles + inclined conveyor gallery to the boiler.
    for (const [x, z, s] of [
      [-3.62, 0.4, 1],
      [-3.62, 1.12, 0.85],
    ] as Vec3[]) {
      const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(0.24 * s, 0.13 * s, 0.32 * s);
      mesh(genG, g, coalMat, [x, thermalY - 0.005, z]);
    }
    {
      const cv: T.BufferGeometry[] = [];
      const a: Vec3 = [-3.62, thermalY + 0.05, 1.55],
        b: Vec3 = [TX + 0.42, thermalY + 0.95, 2.25];
      const gal = bar(THREE, a, b, 0.032, 4);
      cv.push(gal);
      for (const t of [0.3, 0.6]) {
        const p: Vec3 = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
        cv.push(bar(THREE, [p[0], thermalY, p[2]], p, 0.012, 4));
      }
      mesh(genG, mergeInto(THREE, cv), steelMat);
    }
    // Generator step-up transformers at the hall's east end.
    for (const z of [2.95, 3.27]) {
      mesh(genG, roundedBox(THREE, 0.16, 0.13, 0.13, 0.01), transfMat, [-3.82, thermalY + 0.065, z]);
      const fins: T.BufferGeometry[] = [];
      for (let i = 0; i < 4; i++) fins.push(new THREE.BoxGeometry(0.004, 0.09, 0.03).translate(-3.74 + 0.002, thermalY + 0.06, z - 0.045 + i * 0.03));
      for (let i = 0; i < 3; i++)
        fins.push(new THREE.CylinderGeometry(0.006, 0.01, 0.07, 6).translate(-3.82, thermalY + 0.165, z - 0.04 + i * 0.04));
      mesh(genG, mergeInto(THREE, fins), porcelain);
    }
    // Hyperbolic natural-draught cooling towers.
    const towerProfile = (): Vec2[] => {
      const yt = 1.08,
        r0 = 0.36,
        b = 0.75;
      const rAt = (y: number) => r0 * Math.sqrt(1 + ((y - yt) / b) ** 2);
      const pts: Vec2[] = [];
      const y0 = 0.11,
        y1 = 1.48;
      for (let i = 0; i <= 20; i++) {
        const y = lerp(y0, y1, i / 20);
        pts.push([rAt(y), y]);
      }
      pts.push([rAt(y1) - 0.018, y1]);
      for (let i = 20; i >= 0; i--) {
        const y = lerp(y0, y1, i / 20);
        pts.push([rAt(y) - 0.018, y]);
      }
      pts.push([rAt(y0), y0]);
      return pts;
    };
    const tp = towerProfile();
    for (const [x, z] of [
      [-6.3, 2.55],
      [-6.25, 1.0],
    ] as Vec2[]) {
      const y = H(x, z);
      mesh(genG, lathe(THREE, tp, 56), coolTowerMat, [x, y, z]);
      // Diagonal raker columns under the shell.
      const legs: T.BufferGeometry[] = [];
      const rb = 0.58;
      for (let i = 0; i < 28; i++) {
        const a0 = (i / 28) * Math.PI * 2,
          a1 = a0 + Math.PI / 28;
        legs.push(bar(THREE, [x + rb * Math.cos(a0), y, z + rb * Math.sin(a0)], [x + (rb - 0.01) * Math.cos(a1), y + 0.115, z + (rb - 0.01) * Math.sin(a1)], 0.008, 4));
        legs.push(bar(THREE, [x + rb * Math.cos(a0 + Math.PI / 14), y, z + rb * Math.sin(a0 + Math.PI / 14)], [x + (rb - 0.01) * Math.cos(a1), y + 0.115, z + (rb - 0.01) * Math.sin(a1)], 0.008, 4));
      }
      const basin = new THREE.TorusGeometry(0.62, 0.02, 6, 48);
      basin.rotateX(Math.PI / 2);
      basin.translate(x, y + 0.01, z);
      legs.push(basin);
      mesh(genG, mergeInto(THREE, legs), coolTowerMat);
      const fill = new THREE.CircleGeometry(0.56, 40);
      fill.rotateX(-Math.PI / 2);
      mesh(genG, fill, coolInnerMat, [x, y + 0.2, z]);
      // Vapour plume drifting downwind.
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Sprite(vapourMat);
        const sz = 0.55 + k * 0.17;
        s.scale.set(sz, sz * 0.8, 1);
        s.position.set(x + k * 0.16 + (rnd() - 0.5) * 0.06, y + 1.6 + k * 0.17, z - k * 0.05);
        genG.add(s);
      }
    }
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Sprite(smokeMat);
      const sz = 0.18 + k * 0.1;
      s.scale.set(sz, sz, 1);
      s.position.set(TX + k * 0.1, thermalY + CH + 0.1 + k * 0.1, CZ - k * 0.03);
      genG.add(s);
    }
  }

  // ================================================================ solar PV farm
  {
    const tilt = 0.42;
    const panel = new THREE.BoxGeometry(0.64, 0.012, 0.25);
    panel.rotateX(tilt);
    panel.translate(0, 0.15, 0);
    const fr: T.BufferGeometry[] = [];
    for (const x of [-0.24, 0, 0.24]) {
      fr.push(bar(THREE, [x, 0, 0.06], [x, 0.15 - 0.06 * Math.sin(tilt) - 0.008, 0.06], 0.006, 4));
      fr.push(bar(THREE, [x, 0, -0.06], [x, 0.15 + 0.06 * Math.sin(tilt) - 0.008, -0.06], 0.006, 4));
    }
    for (const zz of [0.06, -0.06]) {
      const y = 0.15 - zz * Math.sin(tilt) - 0.012;
      fr.push(new THREE.BoxGeometry(0.62, 0.008, 0.01).translate(0, y, zz));
    }
    const frame = mergeInto(THREE, fr);
    const xs = [-2.25, -1.55, -0.85, -0.15];
    const zs: number[] = [];
    for (let i = 0; i < 9; i++) zs.push(2.55 + i * 0.34);
    const n = xs.length * zs.length;
    const pv = new THREE.InstancedMesh(panel, [aluMat, aluMat, pvMat, pvFrameMat, aluMat, aluMat], n);
    const pf = new THREE.InstancedMesh(frame, pvFrameMat, n);
    const m4 = new THREE.Matrix4();
    let i = 0;
    for (const z of zs)
      for (const x of xs) {
        m4.makeTranslation(x, H(x, z), z);
        pv.setMatrixAt(i, m4);
        pf.setMatrixAt(i, m4);
        i++;
      }
    genG.add(pv, pf);
    // Inverter / MV skid at the field edge.
    mesh(genG, tiledBox(0.3, 0.14, 0.13, 0.1), bessMat, [-1.2, BASE + 0.07, 2.12]);
    mesh(genG, roundedBox(THREE, 0.12, 0.12, 0.11, 0.01), transfMat, [-0.95, BASE + 0.06, 2.12]);
  }

  // ================================================================ wind farm
  const windHubs: Vec3[] = [];
  {
    const HH = 1.5;
    const towerG = lathe(
      THREE,
      [
        [0, 0],
        [0.058, 0],
        [0.054, 0.04],
        [0.05, 0.3],
        [0.028, HH],
        [0, HH],
      ],
      24
    );
    const nacelle = roundedBox(THREE, 0.085, 0.085, 0.26, 0.03, 3);
    nacelle.translate(0, HH + 0.045, -0.02);
    const spinner = lathe(
      THREE,
      [
        [0, 0],
        [0.036, 0],
        [0.034, 0.03],
        [0.022, 0.07],
        [0, 0.095],
      ],
      20
    );
    spinner.rotateX(Math.PI / 2);
    const blade = (() => {
      const st: { r: number; c: number; t: number }[] = [
        { r: 0.025, c: 0.04, t: 0.95 },
        { r: 0.07, c: 0.062, t: 0.5 },
        { r: 0.16, c: 0.074, t: 0.3 },
        { r: 0.32, c: 0.06, t: 0.21 },
        { r: 0.5, c: 0.044, t: 0.17 },
        { r: 0.66, c: 0.03, t: 0.14 },
        { r: 0.78, c: 0.012, t: 0.12 },
      ];
      const g = liftingSurface(
        THREE,
        st.map((s) => ({ le: [s.c * 0.3, s.r * 0.9, 0] as Vec3, chord: s.c * 0.92, t: s.t, camber: 0.04 })),
        [0, 0, 1],
        14
      );
      g.rotateY(0.28); // blade pitch
      return g;
    })();
    const rotorGeo = mergeInto(THREE, [0, 1, 2].map((k) => blade.clone().rotateZ((k * Math.PI * 2) / 3)));
    const face = Math.atan2(0.55, 1);
    const sites: Vec2[] = [
      [2.3, 4.6],
      [3.75, 3.55],
      [5.0, 2.35],
      [5.65, 4.15],
      [1.15, 5.95],
    ];
    sites.forEach(([x, z], k) => {
      const g = new THREE.Group();
      g.position.set(x, H(x, z) - 0.01, z);
      g.rotation.y = face;
      genG.add(g);
      g.add(new THREE.Mesh(towerG, windWhite));
      g.add(new THREE.Mesh(nacelle, windWhite));
      const base = new THREE.CylinderGeometry(0.09, 0.1, 0.03, 16);
      g.add(new THREE.Mesh(base, padMat).translateY(0.012));
      const rotor = new THREE.Group();
      rotor.position.set(0, HH + 0.045, 0.12);
      rotor.rotation.x = -0.08; // shaft tilt
      g.add(rotor);
      const sp = new THREE.Mesh(spinner, windGrey);
      rotor.add(sp);
      const spin = new THREE.Group();
      spin.rotation.z = k * 0.7;
      rotor.add(spin);
      spin.add(new THREE.Mesh(rotorGeo, windWhite));
      const t0 = k * 1.3;
      sp.onBeforeRender = () => {
        spin.rotation.z = t0 - (performance.now() / 1000) * 0.9;
      };
      // Pad-mount transformer at the tower foot.
      const pmt = new THREE.Mesh(roundedBox(THREE, 0.07, 0.06, 0.05, 0.006), windGrey);
      pmt.position.set(0.16, 0.03, 0.02);
      g.add(pmt);
      windHubs.push([x, H(x, z) + HH + 0.045, z]);
    });
  }

  // ================================================================ hydro: arch dam, penstocks, powerhouse
  {
    const hg = new THREE.Group();
    hg.position.set(DX, 0, DZ);
    hg.rotation.y = Math.atan2(-L1, L0);
    genG.add(hg);
    // group-local: x = w, z = -u
    // Span the dam abutment to abutment: until the valley wall rises past the crest.
    let W0 = -1.25,
      W1 = 1.25;
    for (let w = 0; w > -1.4; w -= 0.01) if (H(...toWorld(damC(w), w)) > CREST + 0.06) { W0 = w; break; }
    for (let w = 0; w < 1.4; w += 0.01) if (H(...toWorld(damC(w), w)) > CREST + 0.06) { W1 = w; break; }
    const upU = (w: number) => damC(w) + 0.04;
    const dnU = (w: number, y: number) => upU(w) - damThick(y);
    const Y0 = -0.02;
    // Dam bottom follows the valley floor so no buried wall shows when the
    // terrain is ghosted.
    const ground = (w: number) => H(...toWorld(damC(w) - 0.04, w));
    const yAt = (w: number, t: number) => {
      const yb = Math.min(CREST, Math.max(Y0, ground(w) - 0.07));
      return lerp(yb, CREST, t);
    };
    const up = gridSurf(
      96,
      10,
      (s, t) => {
        const w = lerp(W0, W1, s),
          y = yAt(w, t);
        return [w, y, -upU(w)];
      },
      (s, t) => [s * 8, t * 3.5]
    );
    const dn = gridSurf(
      96,
      14,
      (s, t) => {
        const w = lerp(W0, W1, s),
          y = yAt(w, t);
        return [w, y, -dnU(w, y)];
      },
      (s, t) => [s * 8, t * 3.5]
    );
    const crest = gridSurf(
      96,
      1,
      (s, t) => {
        const w = lerp(W0, W1, s);
        return [w, CREST, -lerp(upU(w), dnU(w, CREST), t)];
      },
      (s, t) => [s * 8, t * 0.3]
    );
    mesh(hg, mergeInto(THREE, [up, dn, crest]), damMat);
    // Parapets + spillway piers on the crest.
    {
      const pp: T.BufferGeometry[] = [];
      for (const off of [0.004, -0.004]) {
        const pts: Vec3[] = [];
        for (let i = 0; i <= 24; i++) {
          const w = lerp(W0 + 0.08, W1 - 0.08, i / 24);
          const u = off > 0 ? upU(w) - 0.004 : dnU(w, CREST) + 0.004;
          pts.push([w, CREST + 0.015, -u]);
        }
        pp.push(tube(THREE, pts, 0.008, 4, false, 48));
      }
      for (let i = 0; i < 5; i++) {
        const w = -0.62 + i * 0.09;
        const u = (upU(w) + dnU(w, CREST)) / 2;
        pp.push(new THREE.BoxGeometry(0.022, 0.07, 0.085).translate(w, CREST + 0.035, -u));
      }
      mesh(hg, mergeInto(THREE, pp), damMat);
    }
    // Spillway sheet of white water down the downstream face + stilling foam.
    {
      const sw = gridSurf(6, 16, (s, t) => {
        const w = lerp(-0.6, -0.3, s),
          y = lerp(CREST - 0.01, 0.02, t);
        return [w, y, -(dnU(w, y) - 0.012)];
      });
      mesh(hg, sw, foamMat);
      const foam = new THREE.CircleGeometry(0.2, 24);
      foam.rotateX(-Math.PI / 2);
      foam.scale(1.1, 1, 0.7);
      const fu = dnU(-0.45, 0) - 0.12;
      mesh(hg, foam, foamMat, [-0.45, BASE + 0.016, -fu]);
    }
    // Powerhouse at the toe.
    const phU = dnU(0.14, 0) - 0.16,
      phW = 0.16;
    const phY = H(...toWorld(phU, phW));
    mesh(hg, tiledBox(0.52, 0.22, 0.22, 0.2), cladMat, [phW, phY + 0.11, -phU]);
    mesh(hg, new THREE.BoxGeometry(0.56, 0.025, 0.26), roofMat, [phW, phY + 0.232, -phU]);
    mesh(hg, new THREE.BoxGeometry(0.5, 0.05, 0.05), darkSteel, [phW, phY + 0.03, -phU + 0.13]); // draft-tube outlets
    // Penstocks: from intakes on the dam face down to the powerhouse.
    {
      const ps: T.BufferGeometry[] = [];
      for (const w of [0.02, 0.16, 0.3]) {
        const yA = 0.5;
        const pts: Vec3[] = [
          [w, yA, -(dnU(w, yA) + 0.03)],
          [w, yA - 0.04, -(dnU(w, yA - 0.04) - 0.02)],
          [w, 0.2, -(dnU(w, 0.2) - 0.03)],
          [w, phY + 0.12, -(phU + 0.1)],
        ];
        ps.push(tube(THREE, pts, 0.022, 10, false, 32));
        ps.push(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10).rotateX(Math.PI / 2).translate(w, yA - 0.04, -(dnU(w, yA - 0.04) - 0.01)));
      }
      mesh(hg, mergeInto(THREE, ps), penstockMat);
    }
    // Switchyard transformers beside the powerhouse.
    for (const w of [0.0, 0.3]) mesh(hg, roundedBox(THREE, 0.1, 0.09, 0.08, 0.008), transfMat, [w, phY + 0.045, -(phU - 0.24)]);
  }

  // ================================================================ grid: lines, substation
  {
    const ARM_Y = [0.86, 1.0, 1.14],
      ARM_W = [0.2, 0.26, 0.2];
    const GANT_X = [0.18, 0.27, 0.09],
      GANT_Y = 0.66;
    const hwAt = (y: number) =>
      y <= 0.8 ? lerp(0.1, 0.038, y / 0.8) : y <= 1.2 ? lerp(0.038, 0.03, (y - 0.8) / 0.4) : lerp(0.03, 0.004, (y - 1.2) / 0.08);
    // ---- lattice pylon template (double circuit, three cross-arms each side)
    const pyLat: T.BufferGeometry[] = [];
    const pyIns: T.BufferGeometry[] = [];
    const corners: Vec2[] = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const lv = [0, 0.27, 0.52, 0.8, 0.93, 1.07, 1.2];
    const cp = (c: Vec2, y: number): Vec3 => [c[0] * hwAt(y), y, c[1] * hwAt(y)];
    for (const c of corners) {
      for (let k = 0; k < lv.length - 1; k++) pyLat.push(bar(THREE, cp(c, lv[k]), cp(c, lv[k + 1]), 0.0065, 4));
      pyLat.push(bar(THREE, cp(c, 1.2), [0, 1.285, 0], 0.005, 4));
    }
    for (let f = 0; f < 4; f++) {
      const c1 = corners[f],
        c2 = corners[(f + 1) % 4];
      for (let k = 0; k < lv.length - 1; k++) {
        pyLat.push(bar(THREE, cp(c1, lv[k]), cp(c2, lv[k + 1]), 0.0032, 3));
        pyLat.push(bar(THREE, cp(c2, lv[k]), cp(c1, lv[k + 1]), 0.0032, 3));
        if (k > 0) pyLat.push(bar(THREE, cp(c1, lv[k]), cp(c2, lv[k]), 0.0032, 3));
      }
    }
    const pyAttach: Vec3[] = [];
    for (let i = 0; i < 3; i++)
      for (const s of [-1, 1]) {
        const y = ARM_Y[i],
          W = ARM_W[i],
          hw = hwAt(y);
        const tip: Vec3 = [s * W, y, 0];
        pyLat.push(bar(THREE, [s * hw, y, hw], tip, 0.0045, 4));
        pyLat.push(bar(THREE, [s * hw, y, -hw], tip, 0.0045, 4));
        pyLat.push(bar(THREE, [s * hw, y + 0.075, hw], tip, 0.0035, 3));
        pyLat.push(bar(THREE, [s * hw, y + 0.075, -hw], tip, 0.0035, 3));
        pyIns.push(new THREE.CylinderGeometry(0.0085, 0.0085, 0.06, 6).translate(s * W, y - 0.032, 0));
        pyAttach.push([s * W, y - 0.066, 0]);
      }
    const pylonLat = mergeInto(THREE, pyLat);
    const pylonIns = mergeInto(THREE, pyIns);
    // ---- substation line-entry gantry template
    const gLat: T.BufferGeometry[] = [];
    const gIns: T.BufferGeometry[] = [];
    for (const px of [-0.34, 0.34]) {
      for (const [a, b] of [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ])
        gLat.push(bar(THREE, [px + a * 0.022, 0, b * 0.022], [px + a * 0.016, GANT_Y + 0.08, b * 0.016], 0.005, 4));
      for (let k = 0; k < 4; k++) {
        const y0 = (k * (GANT_Y + 0.08)) / 4,
          y1 = ((k + 1) * (GANT_Y + 0.08)) / 4;
        gLat.push(bar(THREE, [px - 0.02, y0, 0.02], [px + 0.02, y1, 0.02], 0.0025, 3));
        gLat.push(bar(THREE, [px - 0.02, y0, -0.02], [px + 0.02, y1, -0.02], 0.0025, 3));
      }
      gLat.push(bar(THREE, [px, GANT_Y + 0.08, 0], [px, GANT_Y + 0.17, 0], 0.004, 4));
    }
    for (const y of [GANT_Y + 0.025, GANT_Y + 0.075])
      for (const z of [-0.016, 0.016]) gLat.push(bar(THREE, [-0.35, y, z], [0.35, y, z], 0.0045, 4));
    for (let k = 0; k < 8; k++) gLat.push(bar(THREE, [-0.32 + k * 0.08, GANT_Y + 0.025, 0], [-0.28 + k * 0.08, GANT_Y + 0.075, 0], 0.0025, 3));
    const gAttach: Vec3[] = [];
    for (let i = 0; i < 3; i++)
      for (const s of [-1, 1]) {
        gIns.push(new THREE.CylinderGeometry(0.008, 0.008, 0.045, 6).translate(s * GANT_X[i], GANT_Y, 0));
        gAttach.push([s * GANT_X[i], GANT_Y - 0.025, 0]);
      }
    const gantLat = mergeInto(THREE, gLat);
    const gantIns = mergeInto(THREE, gIns);

    type Node = { x: number; z: number; g?: boolean };
    const routes: Node[][] = [
      [{ x: -3.15, z: 3.5 }, { x: -2.95, z: 1.6 }, { x: -1.8, z: 0.2 }, { x: -0.6, z: -0.72, g: true }],
      [{ x: -0.62, z: 2.05 }, { x: -0.28, z: 0.85 }, { x: 0.05, z: -0.3, g: true }],
      [{ x: 3.25, z: 1.95 }, { x: 2.05, z: 0.8 }, { x: 0.85, z: -0.3, g: true }],
      [
        { x: toWorld(-0.85, -0.95)[0], z: toWorld(-0.85, -0.95)[1] },
        { x: 2.5, z: -1.3 },
        { x: 1.25, z: -1.05, g: true },
      ],
      [{ x: -1.95, z: -3.35 }, { x: -1.15, z: -2.3 }, { x: -0.6, z: -1.5, g: true }],
      [{ x: 0.55, z: -1.72, g: true }, { x: 0.95, z: -2.95 }, { x: 1.55, z: -4.6 }, { x: 2.15, z: -6.35 }],
    ];
    const latGeos: T.BufferGeometry[] = [];
    const insGeos: T.BufferGeometry[] = [];
    const wireGeos: T.BufferGeometry[] = [];
    const m4 = new THREE.Matrix4();
    const v3 = new THREE.Vector3();
    const span = (a: Vec3, b: Vec3, sagK = 0.035) => {
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const sag = sagK * len;
      const pts: Vec3[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - 4 * sag * t * (1 - t), lerp(a[2], b[2], t)]);
      }
      wireGeos.push(tube(THREE, pts, 0.0042, 4, false, 22));
    };
    for (const route of routes) {
      const world: { attach: Vec3[]; peak: Vec3 }[] = [];
      route.forEach((nd, i) => {
        const prev = route[Math.max(0, i - 1)],
          next = route[Math.min(route.length - 1, i + 1)];
        const dx = next.x - prev.x,
          dz = next.z - prev.z;
        const phi = Math.atan2(dx, dz);
        const y = H(nd.x, nd.z) - 0.005;
        m4.makeRotationY(phi).setPosition(nd.x, y, nd.z);
        latGeos.push((nd.g ? gantLat : pylonLat).clone().applyMatrix4(m4));
        insGeos.push((nd.g ? gantIns : pylonIns).clone().applyMatrix4(m4));
        const at = (nd.g ? gAttach : pyAttach).map((p) => v3.set(p[0], p[1], p[2]).applyMatrix4(m4).toArray() as Vec3);
        const peak = v3.set(0, nd.g ? GANT_Y + 0.08 : 1.285, 0).applyMatrix4(m4).toArray() as Vec3;
        world.push({ attach: at, peak });
      });
      for (let i = 0; i < world.length - 1; i++) {
        for (let k = 0; k < 6; k++) span(world[i].attach[k], world[i + 1].attach[k]);
        span(world[i].peak, world[i + 1].peak, 0.02);
      }
    }
    mesh(gridG, mergeInto(THREE, latGeos), latticeMat);
    mesh(gridG, mergeInto(THREE, insGeos), insulMat);
    mesh(gridG, mergeInto(THREE, wireGeos), wireMat);

    // ---- substation equipment
    const st: T.BufferGeometry[] = [];
    const por: T.BufferGeometry[] = [];
    // Two power transformers with radiators, conservators and bushings.
    for (const x of [-0.05, 0.55]) {
      const z = -1.0;
      mesh(gridG, roundedBox(THREE, 0.26, 0.2, 0.17, 0.012), subTransf, [x, subY + 0.1, z]);
      const rad: T.BufferGeometry[] = [];
      for (const s of [-1, 1])
        for (let i = 0; i < 6; i++) rad.push(new THREE.BoxGeometry(0.035, 0.15, 0.005).translate(x - 0.1 + i * 0.04, subY + 0.09, z + s * 0.1));
      rad.push(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 14).rotateZ(Math.PI / 2).translate(x, subY + 0.255, z + 0.055));
      for (const s of [-1, 1]) rad.push(bar(THREE, [x + s * 0.08, subY + 0.2, z + 0.055], [x + s * 0.08, subY + 0.23, z + 0.055], 0.008, 4));
      mesh(gridG, mergeInto(THREE, rad), subTransf);
      for (let i = 0; i < 3; i++) {
        const bx = x - 0.07 + i * 0.07;
        por.push(new THREE.CylinderGeometry(0.008, 0.016, 0.14, 8).translate(bx, subY + 0.27, z - 0.035));
      }
    }
    // Busbars on post insulators + breaker/isolator bays.
    for (const z of [-0.6, -1.42]) {
      st.push(bar(THREE, [-0.5, subY + 0.42, z], [1.1, subY + 0.42, z], 0.008, 6));
      for (let i = 0; i <= 8; i++) {
        const x = -0.5 + i * 0.2;
        por.push(new THREE.CylinderGeometry(0.009, 0.012, 0.16, 8).translate(x, subY + 0.34, z));
        st.push(bar(THREE, [x, subY, z], [x, subY + 0.26, z], 0.012, 4));
      }
    }
    for (const x of [-0.35, -0.05, 0.25, 0.55, 0.85])
      for (const z of [-0.78, -1.24]) {
        st.push(new THREE.BoxGeometry(0.04, 0.12, 0.04).translate(x, subY + 0.06, z));
        por.push(new THREE.CylinderGeometry(0.01, 0.014, 0.12, 8).translate(x, subY + 0.18, z));
      }
    mesh(gridG, mergeInto(THREE, st), subSteel);
    mesh(gridG, mergeInto(THREE, por), subPorc);
    // Control building.
    mesh(gridG, tiledBox(0.3, 0.16, 0.2, 0.15), subBldg, [1.08, subY + 0.08, -1.55]);
    mesh(gridG, new THREE.BoxGeometry(0.33, 0.02, 0.23), subRoof, [1.08, subY + 0.17, -1.55]);
    // Perimeter fence.
    {
      const fp: T.BufferGeometry[] = [];
      const rect = (x0: number, x1: number, z0: number, z1: number, y0: number) => {
        const c: Vec2[] = [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
          [x0, z0],
        ];
        for (let i = 0; i < 4; i++) {
          const [ax, az] = c[i],
            [bx, bz] = c[i + 1];
          const len = Math.hypot(bx - ax, bz - az);
          const n = Math.max(1, Math.round(len / 0.14));
          for (let k = 0; k < n; k++) {
            const t = k / n;
            const x = lerp(ax, bx, t),
              z = lerp(az, bz, t);
            fp.push(bar(THREE, [x, y0, z], [x, y0 + 0.07, z], 0.0035, 3));
          }
          for (const h of [0.035, 0.068]) fp.push(bar(THREE, [ax, y0 + h, az], [bx, y0 + h, bz], 0.0022, 3));
        }
      };
      rect(-0.76, 1.36, -1.81, -0.19, subY);
      rect(-4.3, -1.5, -5.5, -3.7, bessY);
      mesh(gridG, mergeInto(THREE, fp), fenceMat);
    }
  }

  // ================================================================ battery storage (BESS)
  {
    const body: T.BufferGeometry[] = [];
    const dark: T.BufferGeometry[] = [];
    const accent: T.BufferGeometry[] = [];
    const mvt: T.BufferGeometry[] = [];
    const CW = 0.44,
      CHh = 0.2,
      CD = 0.18;
    for (const z of [-4.2, -5.02])
      for (let i = 0; i < 5; i++) {
        const x = -3.95 + i * 0.5;
        body.push(tiledBox(CW, CHh, CD, 0.12).translate(x, bessY + 0.02 + CHh / 2, z));
        dark.push(new THREE.BoxGeometry(CW + 0.01, 0.02, CD + 0.01).translate(x, bessY + 0.01, z));
        // HVAC units on the gable ends and an accent stripe.
        for (const s of [-1, 1]) dark.push(new THREE.BoxGeometry(0.02, 0.09, 0.12).translate(x + s * (CW / 2 + 0.01), bessY + 0.1, z));
        accent.push(new THREE.BoxGeometry(CW + 0.004, 0.018, CD + 0.004).translate(x, bessY + 0.02 + CHh - 0.03, z));
        // Doors on the aisle side.
        const zs = z > -4.6 ? -1 : 1;
        for (let d = 0; d < 3; d++) dark.push(new THREE.BoxGeometry(0.1, 0.13, 0.004).translate(x - 0.13 + d * 0.13, bessY + 0.1, z + zs * (CD / 2 + 0.002)));
      }
    // PCS / inverter skids and MV transformers along the central aisle.
    for (let i = 0; i < 5; i++) {
      const x = -3.95 + i * 0.5;
      body.push(tiledBox(0.16, 0.13, 0.11, 0.12).translate(x - 0.08, bessY + 0.065, -4.61));
      mvt.push(roundedBox(THREE, 0.1, 0.1, 0.1, 0.008).translate(x + 0.1, bessY + 0.05, -4.61));
    }
    mesh(gridG, mergeInto(THREE, body), bessMat);
    mesh(gridG, mergeInto(THREE, dark), bessDark);
    mesh(gridG, mergeInto(THREE, accent), bessAccent);
    mesh(gridG, mergeInto(THREE, mvt), subTransf);
  }

  // ================================================================ trees
  {
    const segDist = (px: number, pz: number, a: Vec2, b: Vec2) => {
      const vx = b[0] - a[0],
        vz = b[1] - a[1];
      const t = clamp01(((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz));
      return Math.hypot(px - a[0] - t * vx, pz - a[1] - t * vz);
    };
    const nearPath = (x: number, z: number, pts: Vec2[], d: number) => {
      for (let i = 0; i < pts.length - 1; i++) if (segDist(x, z, pts[i], pts[i + 1]) < d) return true;
      return false;
    };
    const rects: [number, number, number, number][] = [
      [-5.75, -2.95, -0.3, 3.75],
      [-2.75, 0.45, 1.85, 5.65],
      [-0.9, 1.5, -2.0, -0.05],
      [-4.5, -1.3, -5.7, -3.5],
    ];
    const circles: [number, number, number][] = [
      [-6.3, 2.55, 0.75],
      [-6.25, 1.0, 0.75],
      [2.3, 4.6, 0.3],
      [3.75, 3.55, 0.3],
      [5.0, 2.35, 0.3],
      [5.65, 4.15, 0.3],
      [1.15, 5.95, 0.3],
    ];
    const lineCorridors: Vec2[][] = [
      [[-3.15, 3.5], [-2.95, 1.6], [-1.8, 0.2], [-0.6, -0.72]],
      [[-0.62, 2.05], [0.05, -0.3]],
      [[3.25, 1.95], [2.05, 0.8], [0.85, -0.3]],
      [toWorld(-0.85, -0.95), [2.5, -1.3], [1.25, -1.05]],
      [[-1.95, -3.35], [-1.15, -2.3], [-0.6, -1.5]],
      [[0.55, -1.72], [0.95, -2.95], [1.55, -4.6], [2.15, -6.35]],
    ];
    const blocked = (x: number, z: number) => {
      if (Math.hypot(x, z) > RAD - 0.25) return true;
      for (const [x0, x1, z0, z1] of rects) if (x > x0 && x < x1 && z > z0 && z < z1) return true;
      for (const [cx, cz, r] of circles) if (Math.hypot(x - cx, z - cz) < r) return true;
      const [u, w] = toLocal(x, z);
      if (u > -0.15 && basinE(u, w) < 1.35) return true;
      if (u > -1.15 && u < 0.45 && Math.abs(w) < 0.85) return true;
      for (const r of roads) if (nearPath(x, z, r, 0.12)) return true;
      if (nearPath(x, z, riverPts, 0.25)) return true;
      for (const c of lineCorridors) if (nearPath(x, z, c, 0.2)) return true;
      return false;
    };
    const conifer = new THREE.ConeGeometry(0.055, 0.2, 7, 1);
    conifer.translate(0, 0.1, 0);
    const broad = mergeInto(THREE, [
      new THREE.IcosahedronGeometry(0.075, 1).scale(1, 0.95, 1).translate(0, 0.12, 0),
      new THREE.CylinderGeometry(0.01, 0.012, 0.06, 5).translate(0, 0.03, 0),
    ]);
    const cm: [number, number, number, number][] = [];
    const bm: [number, number, number, number][] = [];
    for (let i = 0; i < 9000 && (cm.length < 340 || bm.length < 150); i++) {
      const a = rnd() * Math.PI * 2,
        r = Math.sqrt(rnd()) * RAD;
      const x = r * Math.cos(a),
        z = r * Math.sin(a);
      if (blocked(x, z)) continue;
      const y = H(x, z);
      const hill = smoothstep(y, 0.08, 0.5);
      const clump = 0.5 + 0.5 * Math.sin(x * 2.3 + 1.1) * Math.cos(z * 2.1 - 0.4);
      if (hill > 0.2) {
        if (rnd() < 0.15 + 0.85 * hill && cm.length < 340) cm.push([x, y, z, 0.75 + rnd() * 0.6]);
      } else if (rnd() < 0.08 * clump * clump && bm.length < 150) bm.push([x, y, z, 0.7 + rnd() * 0.6]);
    }
    const fill = (geo: T.BufferGeometry, mat: T.Material, list: [number, number, number, number][], c0: number, c1: number) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      const m = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        col = new THREE.Color(),
        a = new THREE.Color(c0),
        b = new THREE.Color(c1);
      list.forEach(([x, y, z, s], i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
        m.compose(new THREE.Vector3(x, y - 0.01, z), q, new THREE.Vector3(s, s * (0.85 + rnd() * 0.4), s));
        im.setMatrixAt(i, m);
        im.setColorAt(i, col.copy(a).lerp(b, rnd()));
      });
      siteG.add(im);
    };
    fill(conifer, coniferMat, cm, 0x2f4a33, 0x4a6440);
    fill(broad, broadMat, bm, 0x4f6b3a, 0x7a8a4a);
  }

  // ================================================================ levels
  const GHOST = 0.16;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const genOp = Math.max(1 - clamp01(v - 1), GHOST);
      const gridOp = Math.max(1 - clamp01(v), clamp01(v - 1), GHOST);
      const dim = lerp(1, 0.36, clamp01(v));
      for (const g of groundMats) g.m.color.copy(g.base).multiplyScalar(dim);
      L.set("trees", lerp(1, 0.25, clamp01(v)));
      L.set("gen", genOp);
      L.set("vapour", Math.max(1 - clamp01(v - 1), 0));
      L.set("grid", gridOp);
      const g = tri(v, 1);
      focusThermal(g * 0.22);
      focusSolar(g * 0.5);
      focusWind(g * 0.25);
      focusHydro(g * 0.25);
      focusBess(clamp01(v - 1) * 0.35);
      focusLines(clamp01(v - 1) * 0.3);
    },
  };
}
