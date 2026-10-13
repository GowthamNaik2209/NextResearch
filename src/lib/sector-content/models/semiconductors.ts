// Semiconductors (Fab + ATMP) — a greenfield Indian fab campus in the spirit
// of the Dholera 300 mm fab / Sanand ATMP builds.
//
// Plan (+X east, +Z south/front):
//   · Main fab (x ±3, z ±1.5): dark louvred sub-fab plinth, a white
//     windowless cleanroom volume with a blue reveal, a louvred interstitial
//     (FFU plenum) band, parapet roof crowded with make-up air units.
//   · CUB (central utility building) welded to the fab's north face with a
//     row of induced-draft cooling-tower cells on its roof.
//   · Glazed office block on the fab's south face, ATMP annex to the east
//     (glazed link bridge), EMS plant with a saw-tooth roof to the west.
//   · Utility yard north of the CUB: chemical tank farm in a bund, UPW plant,
//     bulk-gas yard (cryogenic N2/O2/Ar tanks, vaporisers, tube trailers),
//     a 220 kV substation; pipe racks into the sub-fab; roof scrubbers/stacks.
//   · Inside the fab: raised-floor ballroom cleanroom with bays + chases,
//     FFU ceiling (cut away over the front so you can look in), an OHT/AMHS
//     rail network with vehicles and FOUPs, stockers, sub-fab pumps.
//   · Process tools: EUV + DUV scanners (EUV source in the sub-fab), etch and
//     deposition cluster tools, wet benches, furnaces, CMP, metrology; ATMP
//     back-end line (dicing, die attach, wire bond, mould, test) and SMT lines.
//
// Layers: 0 the whole campus, 1 utility yard, 2 cleanroom, 3 process tools.
import type * as T from "three";
import {
  type Three,
  type Vec2,
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
type Put = (m: T.Material, g: T.BufferGeometry) => void;

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSemiconductors(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [siteG, yardG, cleanG, procG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };

  // ------------------------------------------------------------ merge batches
  // Everything small is baked into one geometry per (group, material).
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);
  /** Transform a local tool frame (front = +Z, floor = y 0) into place. */
  const place = (P: Put, x: number, y: number, z: number, ry = 0, s = 1): Put => (m, g) => {
    if (s !== 1) g.scale(s, s, s);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    P(m, g);
  };

  // Geometry shorthands (base at y).
  const bx = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const bb = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    bx(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2);
  const rb = (w: number, h: number, d: number, r: number, x: number, y: number, z: number) =>
    roundedBox(THREE, w, h, d, r, 2).translate(x, y + h / 2, z);
  const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 16, rTop?: number) =>
    new THREE.CylinderGeometry(rTop ?? r, r, h, seg, 1).translate(x, y + h / 2, z);
  const cylX = (r: number, len: number, x: number, y: number, z: number, seg = 16) =>
    new THREE.CylinderGeometry(r, r, len, seg, 1).rotateZ(Math.PI / 2).translate(x, y, z);
  const cylZ = (r: number, len: number, x: number, y: number, z: number, seg = 16) =>
    new THREE.CylinderGeometry(r, r, len, seg, 1).rotateX(Math.PI / 2).translate(x, y, z);
  /** Domed vertical tank (lathed), base at y. */
  const tankGeo = (r: number, h: number, x: number, y: number, z: number, dome = 0.45, seg = 28) => {
    const pts: Vec2[] = [
      [0, 0],
      [r * 0.97, 0],
      [r, r * 0.04],
      [r, h],
    ];
    for (let i = 1; i <= 6; i++) {
      const t = (i / 6) * (Math.PI / 2);
      pts.push([Math.max(1e-3, r * Math.cos(t)), h + r * dome * Math.sin(t)]);
    }
    return lathe(THREE, pts, seg).translate(x, y, z);
  };
  /** Box whose side UVs repeat once per `tile` world units horizontally (roof UVs both ways). */
  const uvBox = (w: number, h: number, d: number, tile = 1) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    const faceU = [d, d, w, w, w, w];
    for (let f = 0; f < 6; f++)
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setX(i, uv.getX(i) * (faceU[f] / tile));
        if (f === 2 || f === 3) uv.setY(i, uv.getY(i) * (d / tile));
      }
    return g;
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrapT = false) => {
    const t = canvasTexture(THREE, w, h, draw);
    t.wrapS = THREE.RepeatWrapping;
    if (wrapT) t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  // ------------------------------------------------------------ textures
  const ribbed = (base: string, dark: string, lite: string, pitch: number) => (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += pitch) {
      g.fillStyle = dark;
      g.fillRect(x, 0, 3, h);
      g.fillStyle = lite;
      g.fillRect(x + 3, 0, 1, h);
    }
  };
  const louvres = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line: string, step = 5) => {
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
    g.fillStyle = line;
    for (let yy = y + 2; yy < y + h - 1; yy += step) g.fillRect(x, yy, w, 1.6);
  };
  // Fab cleanroom + interstitial volume: 1 unit wide x 0.84 tall per tile.
  const fabUpperTex = tex(256, 216, (g, w, h) => {
    g.fillStyle = "#e3e7eb";
    g.fillRect(0, 0, w, h);
    louvres(g, 0, 10, w, 66, "#9ba5af", "#6c7782", 5);
    g.fillStyle = "#cfd5da";
    g.fillRect(0, 0, w, 6);
    g.fillStyle = "#2b5fae";
    g.fillRect(0, 80, w, 8);
    g.fillStyle = "#c6ccd2";
    g.fillRect(0, 150, w, 1.5);
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = "#b9c0c7";
      g.fillRect(x, 88, 2, h - 88);
      g.fillStyle = "#59636d";
      g.fillRect(x, 10, 2, 66);
    }
    g.fillStyle = "#a9b0b7";
    g.fillRect(0, h - 5, w, 5);
  });
  // Sub-fab plinth: louvres + pilasters (1 x 0.46).
  const fabLowerTex = tex(256, 118, (g, w, h) => {
    g.fillStyle = "#535b64";
    g.fillRect(0, 0, w, h);
    louvres(g, 16, 16, 224, 78, "#3a4149", "#5b646d", 4);
    g.fillStyle = "#6a737d";
    g.fillRect(0, 0, 8, h);
    g.fillRect(0, 0, w, 6);
  });
  const cubTex = tex(256, 200, (g, w, h) => {
    ribbed("#a5adb4", "#8c949c", "#c3c9ce", 16)(g, w, h);
    louvres(g, 0, 36, w, 46, "#5f6872", "#8a939c", 5);
    g.fillStyle = "#4a5159";
    g.fillRect(0, h - 10, w, 10);
    g.fillStyle = "#c6403d";
    g.fillRect(0, 26, w, 4);
  });
  const bandTex = (accent: string, glassBand: [number, number]) =>
    tex(256, 240, (g, w, h) => {
      g.fillStyle = "#e4e7ea";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c9ced3";
      for (let y = 0; y < h; y += 30) g.fillRect(0, y, w, 1.5);
      g.fillStyle = "#1c2833";
      g.fillRect(0, glassBand[0], w, glassBand[1] - glassBand[0]);
      g.fillStyle = "#334a5e";
      g.fillRect(0, glassBand[0] + 4, w, (glassBand[1] - glassBand[0]) * 0.35);
      g.fillStyle = "#8b949d";
      for (let x = 0; x < w; x += 32) g.fillRect(x, glassBand[0], 2.5, glassBand[1] - glassBand[0]);
      g.fillStyle = accent;
      g.fillRect(0, 14, w, 8);
      g.fillStyle = "#5c646c";
      g.fillRect(0, h - 8, w, 8);
    });
  const annexTex = bandTex("#d96c2b", [92, 146]);
  const emsTex = bandTex("#c99a2e", [70, 112]);
  const officeTex = tex(256, 240, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2b4258");
    gr.addColorStop(1, "#1a2836");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let f = 0; f < 4; f++) {
      const y0 = (f * h) / 4;
      g.fillStyle = "rgba(170,200,225,0.18)";
      g.fillRect(0, y0 + 10, w, 16);
      g.fillStyle = "#93a0ab";
      g.fillRect(0, y0 + 38, w, 1.5);
    }
    g.fillStyle = "#a3aeb8";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2.5, h);
  });
  const roofTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#b4b9be";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#a6abb1";
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1.5);
      g.fillStyle = "#c9cdd1";
      g.fillRect(0, 120, w, 16);
    },
    true
  );
  const ffuTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#aab3bb";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          g.fillStyle = "#f3f6f8";
          g.fillRect(i * 128 + 7, j * 128 + 7, 114, 114);
          g.fillStyle = "#d9e0e5";
          for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) g.fillRect(i * 128 + 14 + a * 12, j * 128 + 14 + b * 12, 3, 3);
        }
    },
    true
  );
  const tileTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#c9d0d6";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          g.fillStyle = "#9aa3ab";
          g.fillRect(i * 64, j * 64, 64, 2);
          g.fillRect(i * 64, j * 64, 2, 64);
          g.fillStyle = "#b2bac1";
          for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) g.fillRect(i * 64 + 8 + a * 9, j * 64 + 8 + b * 9, 3, 3);
        }
    },
    true
  );

  // Site plan painted onto one ground texture.
  const GX0 = -6.6,
    GX1 = 6.6,
    GZ0 = -5.0,
    GZ1 = 4.6;
  const GW = 2048,
    GH = Math.round((2048 * (GZ1 - GZ0)) / (GX1 - GX0));
  const groundTex = canvasTexture(THREE, GW, GH, (g) => {
    const sx = GW / (GX1 - GX0);
    const X = (x: number) => (x - GX0) * sx;
    const Z = (z: number) => (z - GZ0) * sx;
    const rect = (x0: number, x1: number, z0: number, z1: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    };
    const rnd = mulberry(7);
    g.fillStyle = "#4a6340";
    g.fillRect(0, 0, GW, GH);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = rnd() > 0.5 ? "rgba(255,255,220,0.035)" : "rgba(0,20,0,0.05)";
      g.beginPath();
      g.arc(rnd() * GW, rnd() * GH, 10 + rnd() * 50, 0, Math.PI * 2);
      g.fill();
    }
    // Roads: perimeter ring + spurs.
    const road = (pts: Vec2[], wd = 0.36) => {
      g.strokeStyle = "#30353b";
      g.lineWidth = wd * sx;
      g.lineJoin = "round";
      g.lineCap = "round";
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
      g.stroke();
      g.strokeStyle = "rgba(240,240,230,0.7)";
      g.lineWidth = 2;
      g.setLineDash([18, 16]);
      g.stroke();
      g.setLineDash([]);
    };
    // Concrete aprons & pads.
    rect(-3.35, 3.35, -2.7, 1.75, "#8c9095");
    rect(3.0, 5.25, -1.35, 1.35, "#8c9095");
    rect(-5.65, -3.1, -0.85, 1.85, "#8c9095");
    rect(1.3, 3.5, -2.72, -4.45, "#8a8d90");
    rect(-3.35, -1.05, -2.72, -4.42, "#7b7f84");
    rect(-1.0, 1.2, -2.72, -4.42, "#8a8d90");
    rect(3.65, 5.5, -2.55, -4.4, "#6e6a63");
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = rnd() > 0.5 ? "#7d786f" : "#5f5b55";
      g.fillRect(X(3.65 + rnd() * 1.85), Z(-4.4 + rnd() * 1.85), 3, 3);
    }
    // Office forecourt plaza.
    rect(-2.8, -0.05, 1.75, 3.15, "#a19d93");
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 1.5;
    for (let x = -2.8; x < -0.05; x += 0.2) {
      g.beginPath();
      g.moveTo(X(x), Z(1.75));
      g.lineTo(X(x), Z(3.15));
      g.stroke();
    }
    // Car park.
    rect(0.2, 3.7, 1.95, 3.75, "#353a40");
    g.strokeStyle = "rgba(235,235,225,0.75)";
    g.lineWidth = 2;
    for (const zr of [2.05, 2.62, 3.05, 3.62]) {
      for (let x = 0.32; x <= 3.6; x += 0.16) {
        g.beginPath();
        g.moveTo(X(x), Z(zr));
        g.lineTo(X(x), Z(zr + (zr === 2.05 || zr === 3.05 ? 0.25 : -0.25)));
        g.stroke();
      }
    }
    road([
      [-6.1, -4.72],
      [6.1, -4.72],
      [6.1, 4.1],
      [-6.1, 4.1],
      [-6.1, -4.72],
    ]);
    road([
      [-6.1, 2.25],
      [-3.0, 2.25],
    ]);
    road([
      [-1.4, 4.1],
      [-1.4, 3.2],
    ]);
    road([
      [5.65, 0.0],
      [6.1, 0.0],
    ]);
    road([
      [1.95, 4.1],
      [1.95, 3.75],
    ]);
    road([
      [-3.55, -4.72],
      [-3.55, -2.75],
    ], 0.28);
    // Retention pond + footpaths.
    g.fillStyle = "#3d5560";
    g.beginPath();
    g.ellipse(X(-4.6), Z(3.15), 0.95 * sx, 0.55 * sx, 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#24404f";
    g.beginPath();
    g.ellipse(X(-4.6), Z(3.15), 0.86 * sx, 0.47 * sx, 0.1, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#a8a294";
    g.lineWidth = 0.07 * sx;
    g.beginPath();
    g.moveTo(X(-2.8), Z(2.7));
    g.bezierCurveTo(X(-3.4), Z(2.7), X(-3.4), Z(3.85), X(-4.6), Z(3.85));
    g.stroke();
    g.beginPath();
    g.moveTo(X(-0.05), Z(2.5));
    g.lineTo(X(0.2), Z(2.5));
    g.stroke();
  });
  groundTex.anisotropy = 8;

  // ------------------------------------------------------------ materials
  const groundMat = L.add("ground", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 }));
  const ctxMat = {
    canopy: L.add("ctx", std(0xffffff, 0, 0.9)),
    trunk: L.add("ctx", std(0x5a4632, 0, 0.9)),
    car: L.add("ctx", std(0xffffff, 0.5, 0.35)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    fence: L.add("ctx", std(0x7c858d, 0.6, 0.45)),
  };
  const sh = {
    fabUp: L.add("shell", std(0xffffff, 0.12, 0.5, { map: fabUpperTex })),
    fabLow: L.add("shell", std(0xffffff, 0.3, 0.6, { map: fabLowerTex })),
    soffit: L.add("shell", std(0x3c434b, 0.2, 0.7)),
    cub: L.add("shell", std(0xffffff, 0.45, 0.45, { map: cubTex })),
    annex: L.add("shell", std(0xffffff, 0.15, 0.45, { map: annexTex })),
    ems: L.add("shell", std(0xffffff, 0.15, 0.45, { map: emsTex })),
    white: L.add("shell", std(0xe9ecef, 0.1, 0.45)),
    grey: L.add("shell", std(0x7e8790, 0.4, 0.5)),
    dark: L.add("shell", std(0x2c3238, 0.4, 0.5)),
  };
  const glass = L.add("glass", std(0xffffff, 0.55, 0.12, { map: officeTex, envMapIntensity: 1.3 }));
  const glassLink = L.add("glass", std(0x30485e, 0.6, 0.1, { envMapIntensity: 1.3 }));
  const roof = {
    mem: L.add("roof", std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add("roof", std(0xc9cfd4, 0.35, 0.45)),
    unitDark: L.add("roof", std(0x4a525a, 0.4, 0.5)),
    saw: L.add("roof", std(0x9da5ad, 0.45, 0.5)),
    sawGlass: L.add("roof", std(0x2a3f52, 0.6, 0.15)),
  };
  const yd = {
    tank: L.add("yard", std(0xeef1f3, 0.15, 0.35, { side: DS })),
    ss: L.add("yard", std(0xc2c9d0, 0.85, 0.28, { side: DS })),
    hdpe: L.add("yard", std(0xd8dfe6, 0.05, 0.5, { side: DS })),
    hdpeBlue: L.add("yard", std(0x8fb4cf, 0.05, 0.5, { side: DS })),
    frpBlue: L.add("yard", std(0x3a6fb0, 0.1, 0.45, { side: DS })),
    frost: L.add("yard", std(0xe6ecef, 0.4, 0.45)),
    steel: L.add("yard", std(0x67707a, 0.65, 0.45)),
    yellow: L.add("yard", std(0xd9a531, 0.4, 0.45)),
    pipeBlue: L.add("yard", std(0x3a78c2, 0.5, 0.4)),
    pipeGreen: L.add("yard", std(0x3a9d6e, 0.45, 0.4)),
    pipeRed: L.add("yard", std(0xb8443a, 0.4, 0.45)),
    concrete: L.add("yard", std(0x9a9ea2, 0, 0.9)),
    ct: L.add("yard", std(0x9fb2b5, 0.1, 0.55)),
    ctDark: L.add("yard", std(0x262b30, 0.4, 0.5, { side: DS })),
    louvre: L.add("yard", std(0x56616b, 0.3, 0.6)),
    xfmr: L.add("yard", std(0x7a858d, 0.5, 0.5)),
    insul: L.add("yard", std(0x8a4b2f, 0.1, 0.4)),
    chiller: L.add("yard", std(0x2f7fa8, 0.45, 0.4)),
    tyre: L.add("yard", std(0x18191b, 0.1, 0.9)),
    upw: L.add("yard", std(0xffffff, 0.45, 0.45, { map: cubTex })),
    bldg: L.add("yard", std(0xd7dbdf, 0.2, 0.5)),
  };
  const cl = {
    tile: L.add("cfloor", std(0xffffff, 0.2, 0.55, { map: tileTex })),
    slab: L.add("cfloor", std(0x8e959c, 0.1, 0.8)),
    aisle: L.add("cfloor", std(0x9fb0c6, 0.2, 0.5)),
    ffu: L.add("clean", std(0xffffff, 0.1, 0.5, { map: ffuTex, emissive: 0xffffff, emissiveMap: ffuTex, emissiveIntensity: 0.35, side: DS })),
    ffuBox: L.add("clean", std(0xb6bec5, 0.4, 0.45)),
    grid: L.add("clean", std(0xd5dbe0, 0.6, 0.35)),
    chase: L.add("clean", std(0xf4f6f8, 0.05, 0.3, { opacity: 0.42, side: DS })),
    chaseFrame: L.add("clean", std(0xaab3bb, 0.6, 0.35)),
    rail: L.add("clean", std(0xc9d1d8, 0.85, 0.25)),
    oht: L.add("clean", std(0xf0f3f5, 0.2, 0.35)),
    foup: L.add("clean", std(0xd9dfe4, 0.1, 0.4)),
    foupDark: L.add("clean", std(0x2c3138, 0.3, 0.5)),
    stocker: L.add("clean", std(0xe2e7eb, 0.2, 0.4)),
    stockerWin: L.add("clean", std(0x22313e, 0.6, 0.15)),
    col: L.add("clean", std(0x7b838c, 0.1, 0.8)),
    pump: L.add("clean", std(0x3d454e, 0.5, 0.45)),
    pumpTop: L.add("clean", std(0x2f7fa8, 0.4, 0.45)),
    duct: L.add("clean", std(0xaab3bb, 0.8, 0.3)),
  };
  const toolMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.15, 0.38)),
    grey: L.add(bucket, std(0x8d97a1, 0.55, 0.4)),
    dark: L.add(bucket, std(0x2e343b, 0.5, 0.42)),
    chamber: L.add(bucket, std(0xbfc7cf, 0.9, 0.24)),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    orange: L.add(bucket, std(0xd96c2b, 0.3, 0.45)),
    glass: L.add(bucket, std(0x9fc3d8, 0.3, 0.1, { opacity: 0.45 })),
    win: L.add(bucket, std(0x1c2a36, 0.6, 0.15)),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.1 })),
    red: L.add(bucket, std(0x330000, 0, 0.5, { emissive: 0xff3b30, emissiveIntensity: 1.0 })),
    amber: L.add(bucket, std(0x332000, 0, 0.5, { emissive: 0xffb020, emissiveIntensity: 0.9 })),
    green: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    foup: L.add(bucket, std(0xd9dfe4, 0.1, 0.4)),
    foupDark: L.add(bucket, std(0x2c3138, 0.3, 0.5)),
    pcb: L.add(bucket, std(0x1f7a4a, 0.2, 0.5)),
  });
  const tm = toolMats("proc");
  const am = toolMats("aux");

  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusGas = focus([yd.tank, yd.frost], 0x1e9e76);
  const focusChem = focus([yd.hdpe, yd.hdpeBlue, yd.ss], 0x7a5cc7);
  const focusUtil = focus([yd.ct, yd.frpBlue, yd.chiller, yd.upw], 0xc6403d);
  const focusClean = focus([cl.rail, cl.oht, cl.grid], 0x49d4c9);
  const focusProc = focus([tm.white, tm.chamber, am.white], 0x4c6ef5);

  // ------------------------------------------------------------ dims
  const FX = 3.0,
    FZ = 1.5,
    H_SUB = 0.46,
    H_CEIL = 0.98,
    H_TOP = 1.3;
  const S = putter(siteG),
    Y = putter(yardG),
    C = putter(cleanG),
    Pp = putter(procG);

  // ============================================================ SITE (layer 0)
  {
    const gp = new THREE.PlaneGeometry(GX1 - GX0, GZ1 - GZ0).rotateX(-Math.PI / 2);
    mesh(siteG, gp, groundMat, [(GX0 + GX1) / 2, 0.004, (GZ0 + GZ1) / 2]);
    const edge = L.add("ground", std(0x2f3a2c, 0, 0.95));
    mesh(siteG, new THREE.BoxGeometry(GX1 - GX0, 0.06, GZ1 - GZ0), edge, [(GX0 + GX1) / 2, -0.027, (GZ0 + GZ1) / 2]);
  }
  for (const [sx, sz, x, z, o] of [
    [7.2, 5.2, 0, -0.4, 0.55],
    [2.5, 2.8, 4.15, 0, 0.45],
    [2.4, 2.6, -4.4, 0.5, 0.45],
    [2.6, 1.5, -1.4, 2.05, 0.4],
  ] as number[][]) {
    const cs = contactShadow(THREE, sx, sz, o, 0.008);
    cs.position.x = x;
    cs.position.z = z;
    L.add("ground", cs.material as T.Material);
    siteG.add(cs);
  }

  // ---- Main fab shell: louvred sub-fab plinth + overhanging cleanroom volume.
  {
    const low = uvBox(2 * FX - 0.08, H_SUB, 2 * FZ - 0.08);
    mesh(siteG, low, [sh.fabLow, sh.fabLow, sh.soffit, sh.soffit, sh.fabLow, sh.fabLow], [0, H_SUB / 2, 0]);
    const up = uvBox(2 * FX, H_TOP - H_SUB, 2 * FZ);
    mesh(siteG, up, [sh.fabUp, sh.fabUp, roof.mem, sh.soffit, sh.fabUp, sh.fabUp], [0, (H_SUB + H_TOP) / 2, 0]);
    // Parapet + coping.
    const pt = 0.03,
      ph = 0.07;
    S(sh.white, bb(-FX, FX, H_TOP, H_TOP + ph, FZ - pt, FZ));
    S(sh.white, bb(-FX, FX, H_TOP, H_TOP + ph, -FZ, -FZ + pt));
    S(sh.white, bb(-FX, -FX + pt, H_TOP, H_TOP + ph, -FZ, FZ));
    S(sh.white, bb(FX - pt, FX, H_TOP, H_TOP + ph, -FZ, FZ));
    // Stair / riser towers at the corners, slightly proud and taller.
    for (const [x, z] of [
      [-FX + 0.35, FZ + 0.06],
      [FX - 0.35, FZ + 0.06],
      [-FX - 0.06, -0.6],
      [FX + 0.06, 0.6],
    ]) {
      const alongX = Math.abs(z) > FZ;
      const w = alongX ? 0.26 : 0.16,
        d = alongX ? 0.16 : 0.26;
      S(sh.white, bx(w, H_TOP + 0.14, d, x, 0, z));
      // Glazed slot.
      const gl = alongX
        ? new THREE.PlaneGeometry(0.08, H_TOP - 0.1).translate(x, (H_TOP + 0.1) / 2 + 0.02, z + 0.081)
        : new THREE.PlaneGeometry(0.08, H_TOP - 0.1).rotateY(Math.sign(x) * Math.PI / 2).translate(x + Math.sign(x) * 0.081, (H_TOP + 0.1) / 2 + 0.02, z);
      S(glassLink, gl);
    }
    // Loading docks with roller shutters on the east end of the sub-fab.
    for (const z of [-1.0, -0.5]) {
      S(sh.dark, bx(0.01, 0.2, 0.3, FX - 0.035, 0.0, z));
      S(sh.grey, bx(0.12, 0.015, 0.36, FX + 0.02, 0.24, z));
    }
    // Roof: walkways and two rows of make-up air units (MAUs).
    for (let i = 0; i < 7; i++) {
      const x = -2.55 + i * 0.85;
      for (const z of [0.75, -0.15]) {
        S(roof.unit, rb(0.62, 0.16, 0.3, 0.02, x, H_TOP, z));
        S(roof.unitDark, bx(0.6, 0.015, 0.26, x, H_TOP + 0.16, z));
        for (const dx of [-0.16, 0.16]) {
          S(roof.unit, cyl(0.07, 0.04, x + dx, H_TOP + 0.17, z, 16));
          S(roof.unitDark, cyl(0.058, 0.005, x + dx, H_TOP + 0.211, z, 16));
        }
        // Supply duct dropping into the roof.
        S(roof.unit, bx(0.12, 0.05, 0.12, x, H_TOP, z + (z > 0 ? -0.2 : 0.2)));
      }
    }
    S(roof.unitDark, bb(-2.9, 2.9, H_TOP + 0.002, H_TOP + 0.006, 0.28, 0.4));
  }

  // ---- CUB welded to the north face.
  const CUB = { x0: -2.6, x1: 2.6, z0: -2.3, z1: -1.5, h: 0.78 };
  {
    const g = uvBox(CUB.x1 - CUB.x0, CUB.h, CUB.z1 - CUB.z0);
    mesh(siteG, g, [sh.cub, sh.cub, roof.mem, sh.soffit, sh.cub, sh.cub], [0, CUB.h / 2, (CUB.z0 + CUB.z1) / 2]);
    S(sh.grey, bb(CUB.x0, CUB.x1, CUB.h, CUB.h + 0.04, CUB.z0, CUB.z0 + 0.025));
    for (const x of [-1.9, -0.3, 1.3]) S(sh.dark, bx(0.22, 0.24, 0.01, x, 0, CUB.z0 - 0.003));
  }

  // ---- Office block (4 storeys of curtain wall) on the south face.
  const OF = { x0: -2.5, x1: -0.3, z0: FZ, z1: 2.55, h: 0.92 };
  {
    const w = OF.x1 - OF.x0,
      d = OF.z1 - OF.z0;
    const g = uvBox(w, OF.h, d);
    mesh(siteG, g, [glass, glass, roof.mem, sh.soffit, glass, glass], [(OF.x0 + OF.x1) / 2, OF.h / 2, (OF.z0 + OF.z1) / 2]);
    for (let f = 1; f <= 4; f++) {
      const y = (f * OF.h) / 4 - 0.012;
      S(sh.white, bb(OF.x0 - 0.02, OF.x1 + 0.02, y, y + 0.022, OF.z0 + 0.01, OF.z1 + 0.02));
    }
    // Vertical fins on the south facade.
    for (let x = OF.x0 + 0.1; x < OF.x1; x += 0.2) S(sh.white, bb(x - 0.006, x + 0.006, 0.0, OF.h, OF.z1, OF.z1 + 0.05));
    // Entrance canopy + columns.
    S(sh.white, bb(-1.75, -1.05, 0.26, 0.29, OF.z1, OF.z1 + 0.42));
    for (const x of [-1.7, -1.1]) S(sh.grey, cyl(0.012, 0.26, x, 0, OF.z1 + 0.38, 8));
    // Roof plant + parapet.
    S(roof.unit, rb(0.5, 0.12, 0.35, 0.02, -1.0, OF.h, 2.0));
    S(sh.white, bb(OF.x0, OF.x1, OF.h, OF.h + 0.05, OF.z1 - 0.025, OF.z1));
    S(sh.white, bb(OF.x0, OF.x0 + 0.025, OF.h, OF.h + 0.05, OF.z0, OF.z1));
    S(sh.white, bb(OF.x1 - 0.025, OF.x1, OF.h, OF.h + 0.05, OF.z0, OF.z1));
  }

  // ---- ATMP annex (east) + glazed link bridge.
  const AX = { x0: 3.3, x1: 5.0, z0: -1.1, z1: 1.1, h: 0.95 };
  {
    const g = uvBox(AX.x1 - AX.x0, AX.h, AX.z1 - AX.z0);
    mesh(siteG, g, [sh.annex, sh.annex, roof.mem, sh.soffit, sh.annex, sh.annex], [(AX.x0 + AX.x1) / 2, AX.h / 2, 0]);
    S(sh.white, bb(AX.x0, AX.x1, AX.h, AX.h + 0.05, AX.z1 - 0.025, AX.z1));
    S(sh.white, bb(AX.x0, AX.x1, AX.h, AX.h + 0.05, AX.z0, AX.z0 + 0.025));
    S(sh.white, bb(AX.x1 - 0.025, AX.x1, AX.h, AX.h + 0.05, AX.z0, AX.z1));
    S(glassLink, bb(FX, AX.x0, 0.5, 0.74, -0.16, 0.16));
    S(sh.white, bb(FX, AX.x0, 0.74, 0.77, -0.18, 0.18));
    S(sh.white, bb(FX, AX.x0, 0.47, 0.5, -0.18, 0.18));
    for (const z of [-0.6, 0.6]) {
      S(roof.unit, rb(0.5, 0.14, 0.28, 0.02, 4.15, AX.h, z));
      S(roof.unitDark, cyl(0.06, 0.02, 4.0, AX.h + 0.14, z, 14));
      S(roof.unitDark, cyl(0.06, 0.02, 4.3, AX.h + 0.14, z, 14));
    }
    // Truck docks on the east face.
    for (const z of [-0.6, -0.2, 0.2]) {
      S(sh.dark, bx(0.01, 0.2, 0.26, AX.x1 + 0.004, 0, z));
      S(sh.grey, bx(0.14, 0.015, 0.32, AX.x1 + 0.07, 0.23, z));
    }
  }

  // ---- EMS plant (west) with a north-light saw-tooth roof.
  const EM = { x0: -5.4, x1: -3.4, z0: -0.6, z1: 1.6, h: 0.72 };
  {
    const g = uvBox(EM.x1 - EM.x0, EM.h, EM.z1 - EM.z0);
    mesh(siteG, g, [sh.ems, sh.ems, roof.mem, sh.soffit, sh.ems, sh.ems], [(EM.x0 + EM.x1) / 2, EM.h / 2, (EM.z0 + EM.z1) / 2]);
    const teeth = 5,
      tw = (EM.x1 - EM.x0) / teeth,
      th = 0.2;
    const shape = new THREE.Shape();
    shape.moveTo(EM.x0, 0);
    for (let i = 0; i < teeth; i++) {
      const x = EM.x0 + i * tw;
      shape.lineTo(x, th);
      shape.lineTo(x + tw, 0);
    }
    shape.lineTo(EM.x0, 0);
    const saw = new THREE.ExtrudeGeometry(shape, { depth: EM.z1 - EM.z0 - 0.04, bevelEnabled: false });
    saw.translate(0, EM.h, EM.z0 + 0.02);
    mesh(siteG, saw, roof.saw);
    for (let i = 0; i < teeth; i++) {
      const x = EM.x0 + i * tw - 0.004;
      S(roof.sawGlass, new THREE.PlaneGeometry(EM.z1 - EM.z0 - 0.06, th * 0.8).rotateY(-Math.PI / 2).translate(x, EM.h + th * 0.45, (EM.z0 + EM.z1) / 2));
    }
  }

  // ---- Landscaping: trees, cars, street lights, perimeter fence.
  {
    const rnd = mulberry(42);
    const trees: [number, number, number][] = [];
    for (let x = -5.8; x <= 5.8; x += 0.55) {
      trees.push([x, 4.42, 0.8 + rnd() * 0.4]);
      trees.push([x, -4.38 - (Math.abs(x) < 3.6 ? 0 : 0), 0.8 + rnd() * 0.4]);
    }
    for (let z = -4.0; z <= 3.8; z += 0.55) {
      trees.push([-6.42, z, 0.8 + rnd() * 0.4]);
      trees.push([6.42, z, 0.8 + rnd() * 0.4]);
    }
    for (let i = 0; i < 26; i++) {
      const x = -3.0 + rnd() * 2.6,
        z = 3.35 + rnd() * 0.5;
      if (Math.abs(x + 1.4) > 0.3) trees.push([x, z, 0.7 + rnd() * 0.5]);
    }
    for (let i = 0; i < 18; i++) {
      const a = rnd() * Math.PI * 2;
      trees.push([-4.6 + Math.cos(a) * 1.15, 3.15 + Math.sin(a) * 0.72, 0.7 + rnd() * 0.5]);
    }
    for (let i = 0; i < 16; i++) trees.push([5.35 + rnd() * 0.5, -2.2 + rnd() * 4.2, 0.7 + rnd() * 0.5]);
    for (let i = 0; i < 12; i++) trees.push([-5.6 + rnd() * 1.9, -1.2 - rnd() * 1.2, 0.7 + rnd() * 0.5]);
    for (let i = 0; i < 8; i++) trees.push([0.3 + rnd() * 3.3, 3.85 + rnd() * 0.08, 0.6 + rnd() * 0.3]);
    const canopyGeo = new THREE.IcosahedronGeometry(0.14, 1).scale(1, 1.15, 1).translate(0, 0.27, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.16, 6).translate(0, 0.08, 0);
    const can = new THREE.InstancedMesh(canopyGeo, ctxMat.canopy, trees.length);
    const tr = new THREE.InstancedMesh(trunkGeo, ctxMat.trunk, trees.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    trees.forEach(([x, z, s], i) => {
      o.position.set(x, 0, z);
      o.scale.set(s, s * (0.9 + rnd() * 0.3), s);
      o.rotation.y = rnd() * 6;
      o.updateMatrix();
      can.setMatrixAt(i, o.matrix);
      tr.setMatrixAt(i, o.matrix);
      col.setHSL(0.24 + rnd() * 0.08, 0.32 + rnd() * 0.16, 0.2 + rnd() * 0.08, THREE.SRGBColorSpace);
      can.setColorAt(i, col);
    });
    siteG.add(can, tr);

    // Cars in the car park.
    const carGeo = mergeInto(THREE, [rb(0.09, 0.045, 0.2, 0.018, 0, 0.012, 0), rb(0.08, 0.04, 0.11, 0.018, 0, 0.045, -0.01)]);
    const spots: [number, number][] = [];
    for (const zr of [2.2, 2.48, 3.2, 3.48]) for (let x = 0.4; x <= 3.55; x += 0.16) if (rnd() < 0.72) spots.push([x, zr]);
    const cars = new THREE.InstancedMesh(carGeo, ctxMat.car, spots.length);
    const palette = [0xe8eaec, 0x2b2f35, 0x8e969e, 0xb7bcc2, 0x7a1f22, 0x24476f, 0xd0d3d6];
    spots.forEach(([x, z], i) => {
      o.position.set(x, 0.004, z);
      o.scale.set(1, 1, 1);
      o.rotation.y = rnd() < 0.5 ? 0 : Math.PI;
      o.updateMatrix();
      cars.setMatrixAt(i, o.matrix);
      cars.setColorAt(i, col.setHex(palette[Math.floor(rnd() * palette.length)]));
    });
    siteG.add(cars);

    // Street lights along the ring road.
    const lights: Vec2[] = [];
    for (let x = -5.5; x <= 5.6; x += 1.4) lights.push([x, 3.88], [x, -4.5]);
    for (let z = -3.6; z <= 3.0; z += 1.4) lights.push([5.88, z], [-5.88, z]);
    for (const [x, z] of lights) {
      S(ctxMat.pole, cyl(0.008, 0.42, x, 0, z, 6));
      S(ctxMat.lamp, bx(0.06, 0.012, 0.025, x, 0.42, z));
    }
    // Perimeter fence.
    const fencePts: Vec3[] = [
      [GX0 + 0.08, 0, GZ0 + 0.08],
      [GX1 - 0.08, 0, GZ0 + 0.08],
      [GX1 - 0.08, 0, GZ1 - 0.08],
      [GX0 + 0.08, 0, GZ1 - 0.08],
      [GX0 + 0.08, 0, GZ0 + 0.08],
    ];
    for (let i = 0; i < 4; i++) {
      const a = fencePts[i],
        b = fencePts[i + 1];
      for (const yy of [0.06, 0.12]) S(ctxMat.fence, bar(THREE, [a[0], yy, a[2]], [b[0], yy, b[2]], 0.004, 4));
      const n = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.4);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const x = lerp(a[0], b[0], t),
          z = lerp(a[2], b[2], t);
        S(ctxMat.fence, bx(0.008, 0.13, 0.008, x, 0, z));
      }
    }
  }

  // ============================================================ UTILITY YARD (layer 1)
  // ---- Cooling-tower cells on the CUB roof.
  {
    const yb = CUB.h;
    const cz = (CUB.z0 + CUB.z1) / 2;
    for (let i = 0; i < 8; i++) {
      const x = -2.27 + i * 0.65;
      Y(yd.ct, bx(0.6, 0.26, 0.66, x, yb, cz));
      // Air-inlet louvres on the long faces.
      for (const s of [1, -1]) Y(yd.louvre, bx(0.56, 0.12, 0.01, x, yb + 0.03, cz + s * 0.333));
      // Fan stack (open cylinder) + fan.
      const stack = new THREE.CylinderGeometry(0.22, 0.2, 0.12, 24, 1, true).translate(x, yb + 0.32, cz);
      Y(yd.ct, stack);
      Y(yd.ctDark, new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2).translate(x, yb + 0.33, cz));
      for (let k = 0; k < 6; k++) {
        const bl = new THREE.BoxGeometry(0.18, 0.006, 0.045).translate(0.1, 0, 0).rotateY((k * Math.PI) / 3 + i).translate(x, yb + 0.345, cz);
        Y(yd.steel, bl);
      }
      Y(yd.steel, cyl(0.025, 0.02, x, yb + 0.34, cz, 10));
    }
    // Chillers, pumps and boilers inside the CUB (seen when it ghosts).
    for (let i = 0; i < 5; i++) {
      const x = -2.1 + i * 0.85;
      Y(yd.steel, bx(0.52, 0.03, 0.26, x, 0.0, -1.95));
      Y(yd.chiller, cylX(0.065, 0.5, x, 0.1, -2.02, 18));
      Y(yd.chiller, cylX(0.065, 0.5, x, 0.1, -1.88, 18));
      Y(yd.steel, rb(0.16, 0.12, 0.14, 0.02, x - 0.1, 0.17, -1.95));
      for (let k = 0; k < 3; k++) Y(yd.pipeBlue, cyl(0.03, 0.08, x - 0.15 + k * 0.15, 0, -1.68, 12));
    }
  }

  // ---- Pipe rack: CUB/yard spine with bridges into the sub-fab at both ends.
  {
    const RZ = -2.55,
      RY = 0.42;
    const bentGeos: T.BufferGeometry[] = [];
    for (let x = -2.8; x <= 2.81; x += 0.56) {
      for (const dz of [-0.11, 0.11]) bentGeos.push(bx(0.025, RY, 0.025, x, 0, RZ + dz));
      bentGeos.push(bx(0.03, 0.025, 0.28, x, RY - 0.025, RZ));
      bentGeos.push(bx(0.03, 0.02, 0.28, x, RY - 0.17, RZ));
    }
    for (const x of [-2.8, 2.8])
      for (const z of [-2.1, -1.75]) {
        for (const dx of [-0.11, 0.11]) bentGeos.push(bx(0.025, RY, 0.025, x + dx, 0, z));
        bentGeos.push(bx(0.28, 0.025, 0.03, x, RY - 0.025, z));
      }
    Y(yd.steel, mergeInto(THREE, bentGeos));
    const pipes: [T.MeshStandardMaterial, number, number, number][] = [
      [yd.ss, 0.022, -0.07, 0],
      [yd.pipeBlue, 0.026, -0.01, 0],
      [yd.pipeGreen, 0.03, 0.055, 0],
      [yd.yellow, 0.015, -0.07, -0.145],
      [yd.pipeRed, 0.02, 0.0, -0.145],
      [yd.ss, 0.018, 0.06, -0.145],
    ];
    for (const [m, r, off, dy] of pipes) {
      const y = RY + r + dy;
      const xE = 2.8 + off,
        xW = -2.8 - off;
      const pts: Vec3[] = [
        [xW, y, -1.46],
        [xW, y, RZ + 0.05 + off * 0.0],
        [xW + 0.08, y, RZ + off],
        [xE - 0.08, y, RZ + off],
        [xE, y, RZ + 0.05],
        [xE, y, -1.46],
      ];
      Y(m, tube(THREE, pts, r, 10, false, 160));
    }
  }

  // ---- Roof scrubbers + exhaust stacks along the fab's north edge.
  {
    const z = -1.18;
    for (let i = 0; i < 7; i++) {
      const x = -2.55 + i * 0.85;
      Y(yd.hdpe, tankGeo(0.085, 0.26, x, H_TOP, z, 0.5, 20));
      Y(yd.steel, cyl(0.03, 0.55, x + 0.12, H_TOP, z - 0.05, 12));
      Y(yd.steel, cyl(0.036, 0.03, x + 0.12, H_TOP + 0.55, z - 0.05, 12));
      Y(yd.hdpe, rb(0.13, 0.1, 0.1, 0.015, x - 0.15, H_TOP, z));
    }
    Y(yd.hdpe, tube(THREE, [[-2.9, H_TOP + 0.33, z + 0.12], [2.9, H_TOP + 0.33, z + 0.12]], 0.035, 12, false, 8));
    for (let i = 0; i < 7; i++) Y(yd.hdpe, bar(THREE, [-2.55 + i * 0.85, H_TOP + 0.3, z], [-2.55 + i * 0.85, H_TOP + 0.33, z + 0.12], 0.025, 10));
  }

  // ---- Chemical tank farm in a bund (west of the yard).
  {
    const x0 = -3.3,
      x1 = -1.1,
      z0 = -4.35,
      z1 = -2.78,
      bh = 0.08,
      t = 0.03;
    Y(yd.concrete, bb(x0, x1, 0, bh, z1 - t, z1));
    Y(yd.concrete, bb(x0, x1, 0, bh, z0, z0 + t));
    Y(yd.concrete, bb(x0, x0 + t, 0, bh, z0, z1));
    Y(yd.concrete, bb(x1 - t, x1, 0, bh, z0, z1));
    const mats = [yd.hdpe, yd.ss, yd.hdpeBlue];
    let k = 0;
    for (const z of [-3.2, -3.92])
      for (const x of [-2.9, -2.2, -1.5]) {
        const m = mats[k++ % 3];
        const h = 0.48 + (k % 2) * 0.1;
        Y(m, tankGeo(0.21, h, x, 0.01, z, 0.22, 28));
        Y(yd.steel, cyl(0.04, 0.035, x, h + 0.05, z, 10));
        // Nozzle to the header.
        Y(yd.ss, bar(THREE, [x + 0.1, h + 0.03, z], [x + 0.1, 0.78, z], 0.008, 6));
      }
    for (const z of [-3.2, -3.92]) Y(yd.ss, bar(THREE, [-3.0, 0.78, z], [-1.2, 0.78, z], 0.012, 8));
    Y(yd.ss, bar(THREE, [-1.2, 0.78, -3.92], [-1.2, 0.78, -2.62], 0.012, 8));
    Y(yd.ss, bar(THREE, [-1.2, 0.79, -2.62], [-1.2, 0.46, -2.62], 0.012, 8));
    for (const x of [-3.0, -1.2]) for (const z of [-3.2, -3.92]) Y(yd.steel, bx(0.02, 0.78, 0.02, x, 0, z));
    // Unloading canopy beside the bund.
    Y(yd.bldg, bb(-3.3, -2.5, 0.38, 0.41, -4.62 + 0.18, -4.37));
  }

  // ---- UPW plant: building, filter vessels, storage tanks, RO skids.
  {
    const w = 1.15,
      d = 0.85;
    const g = uvBox(w, 0.45, d);
    mesh(yardG, g, [yd.upw, yd.upw, yd.bldg, yd.bldg, yd.upw, yd.upw], [-0.95 + w / 2, 0.225, -3.5 - d / 2]);
    Y(yd.steel, rb(0.3, 0.08, 0.2, 0.02, -0.5, 0.45, -3.9));
    for (let i = 0; i < 4; i++) Y(yd.frpBlue, tankGeo(0.075, 0.3, -0.8 + i * 0.24, 0.01, -3.12, 0.6, 20));
    for (const x of [0.45, 0.92]) {
      Y(yd.ss, tankGeo(0.2, 0.68, x, 0.01, -3.12, 0.3, 32));
      Y(yd.steel, cyl(0.035, 0.03, x, 0.75, -3.12, 10));
    }
    // RO skid: frame + stacked horizontal pressure vessels.
    const sx0 = 0.32,
      sx1 = 1.1;
    for (const x of [sx0, sx1]) for (const z of [-3.58, -4.28]) Y(yd.steel, bx(0.02, 0.36, 0.02, x, 0, z));
    for (const yy of [0.1, 0.36])
      for (const z of [-3.58, -4.28]) Y(yd.steel, bb(sx0, sx1, yy, yy + 0.015, z - 0.01, z + 0.01));
    for (let lv = 0; lv < 3; lv++) for (let r = 0; r < 5; r++) Y(yd.hdpe, cylX(0.03, 0.74, (sx0 + sx1) / 2, 0.14 + lv * 0.075, -3.65 - r * 0.14, 12));
  }

  // ---- Bulk-gas yard: cryogenic tanks, ambient vaporisers, tube trailers.
  {
    const cryo = (x: number, z: number, r: number, h: number) => {
      Y(yd.tank, tankGeo(r, h, x, 0.14, z, 0.5, 32));
      Y(yd.tank, new THREE.SphereGeometry(r, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.4, 1).translate(x, 0.14, z));
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        Y(yd.steel, bx(0.025, 0.16, 0.025, x + Math.cos(a) * r * 0.8, 0, z + Math.sin(a) * r * 0.8));
      }
      // Ladder + top platform rail.
      Y(yd.steel, bb(x + r + 0.005, x + r + 0.02, 0, h + 0.14, z - 0.03, z - 0.02));
      Y(yd.steel, bb(x + r + 0.005, x + r + 0.02, 0, h + 0.14, z + 0.02, z + 0.03));
      for (let yy = 0.1; yy < h + 0.1; yy += 0.06) Y(yd.steel, bb(x + r + 0.008, x + r + 0.016, yy, yy + 0.006, z - 0.03, z + 0.03));
      Y(yd.steel, cyl(0.012, 0.3, x, 0.14 + h + r * 0.5 - 0.02, z, 6));
    };
    cryo(1.72, -3.2, 0.22, 1.05);
    cryo(2.27, -3.15, 0.17, 0.82);
    cryo(2.73, -3.15, 0.17, 0.82);
    // Ambient-air vaporiser banks (finned columns).
    const finGeos: T.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++) {
        const x = 3.08 + j * 0.12,
          z = -2.9 - i * 0.12;
        finGeos.push(bx(0.09, 0.62, 0.008, x, 0.02, z), bx(0.008, 0.62, 0.09, x, 0.02, z));
      }
    Y(yd.frost, mergeInto(THREE, finGeos));
    Y(yd.steel, bb(3.0, 3.32, 0, 0.02, -3.4, -2.82));
    Y(yd.ss, tube(THREE, [[3.0, 0.5, -3.15], [2.9, 0.44, -2.62]], 0.012, 6, false, 8));
    // Tube trailers.
    for (const [z, rot] of [
      [-3.86, 0],
      [-4.2, 0],
    ]) {
      const x0 = 1.95;
      void rot;
      Y(yd.steel, bx(1.0, 0.03, 0.24, x0, 0.07, z));
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 3; b++) Y(yd.ss, cylX(0.036, 0.82, x0 - 0.02, 0.15 + a * 0.075, z - 0.075 + b * 0.075, 14));
      for (const dx of [-0.44, 0.4]) Y(yd.yellow, bx(0.04, 0.26, 0.24, x0 + dx, 0.1, z));
      for (const ax of [0.25, 0.37])
        for (const s of [1, -1]) Y(yd.tyre, cylZ(0.04, 0.035, x0 + ax, 0.04, z + s * 0.11, 14));
      Y(yd.steel, bx(0.02, 0.07, 0.15, x0 - 0.42, 0, z));
    }
    // Specialty-gas bunker.
    Y(yd.bldg, bb(2.85, 3.42, 0, 0.3, -4.4, -3.75));
    for (let i = 0; i < 4; i++) Y(yd.louvre, bb(2.88 + i * 0.13, 2.98 + i * 0.13, 0.03, 0.25, -3.746, -3.744));
    Y(yd.yellow, bb(1.3, 3.48, 0.004, 0.009, -2.74, -2.72));
  }

  // ---- 220 kV substation.
  {
    const xf = (x: number, z: number) => {
      Y(yd.xfmr, rb(0.32, 0.26, 0.24, 0.015, x, 0.04, z));
      Y(yd.concrete, bx(0.42, 0.04, 0.34, x, 0, z));
      for (const s of [1, -1])
        for (let k = 0; k < 7; k++) Y(yd.xfmr, bx(0.004, 0.2, 0.09, x - 0.12 + k * 0.04, 0.06, z + s * 0.17));
      for (let k = 0; k < 3; k++) {
        Y(yd.insul, cyl(0.014, 0.12, x - 0.08 + k * 0.08, 0.3, z - 0.05, 8));
        Y(yd.steel, cyl(0.004, 0.02, x - 0.08 + k * 0.08, 0.42, z - 0.05, 6));
      }
      Y(yd.xfmr, cylX(0.045, 0.24, x, 0.37, z + 0.07, 14));
    };
    xf(4.15, -3.6);
    xf(4.95, -3.6);
    // Gantry.
    for (const x of [3.85, 5.25]) {
      for (const dz of [-0.05, 0.05]) for (const dx of [-0.05, 0.05]) Y(yd.steel, bx(0.012, 0.8, 0.012, x + dx, 0, -2.85 + dz));
      for (let yy = 0.1; yy < 0.8; yy += 0.12) Y(yd.steel, bx(0.11, 0.008, 0.11, x, yy, -2.85));
    }
    Y(yd.steel, bb(3.8, 5.3, 0.74, 0.78, -2.9, -2.8));
    for (let k = 0; k < 3; k++) {
      const z = -2.85;
      for (const x of [4.15, 4.95]) {
        Y(yd.insul, cyl(0.01, 0.07, x - 0.08 + k * 0.08, 0.67, z, 6));
        Y(yd.steel, tube(THREE, [[x - 0.08 + k * 0.08, 0.67, z], [x - 0.08 + k * 0.08, 0.55, z - 0.4], [x - 0.08 + k * 0.08, 0.43, -3.65]], 0.003, 4, false, 12));
      }
    }
    Y(yd.bldg, bb(3.8, 5.3, 0, 0.28, -4.33, -4.02));
    for (let i = 0; i < 6; i++) Y(yd.louvre, bb(3.9 + i * 0.24, 4.05 + i * 0.24, 0.05, 0.22, -4.017, -4.015));
    Y(
      yd.steel,
      railing(THREE, [
        [3.68, 0, -2.58],
        [5.47, 0, -2.58],
        [5.47, 0, -4.38],
        [3.68, 0, -4.38],
        [3.68, 0, -2.58],
      ], 0.1, 0.003, 0.18)
    );
  }

  // ============================================================ CLEANROOM (layer 2)
  const IX = FX - 0.08,
    IZ = FZ - 0.08;
  const BAYS = 6,
    BW = (2 * IX) / BAYS;
  const bayX = (i: number) => -IX + BW * (i + 0.5);
  const FLOOR = H_SUB + 0.006;
  {
    // Raised-floor slab + perforated tiles, blue-grey main aisle.
    C(cl.slab, bb(-IX, IX, H_SUB - 0.035, H_SUB - 0.005, -IZ, IZ));
    const tiles = uvScale(new THREE.PlaneGeometry(2 * IX, 2 * IZ), (2 * IX) / 0.48, (2 * IZ) / 0.48).rotateX(-Math.PI / 2).translate(0, FLOOR, 0);
    C(cl.tile, tiles);
    C(cl.aisle, new THREE.PlaneGeometry(2 * IX - 0.2, 0.34).rotateX(-Math.PI / 2).translate(0, FLOOR + 0.002, 0));
    // Sub-fab: waffle-slab columns, vacuum pumps / abatement, exhaust headers.
    for (let x = -2.7; x <= 2.71; x += 0.6) for (const z of [-1.2, -0.6, 0, 0.6, 1.2]) C(cl.col, bx(0.04, H_SUB - 0.04, 0.04, x, 0.005, z));
    for (let x = -2.75; x <= 2.75; x += 0.22)
      for (const z of [-1.05, -0.55, 0.55, 1.05]) {
        C(cl.pump, rb(0.12, 0.09, 0.15, 0.015, x, 0.005, z));
        C(cl.pumpTop, bx(0.1, 0.01, 0.06, x, 0.095, z));
      }
    for (const z of [-0.8, 0.8]) C(cl.duct, cylX(0.03, 2 * IX - 0.1, 0, 0.33, z, 12));
    for (const z of [-1.3, 1.3]) C(cl.duct, cylX(0.02, 2 * IX - 0.1, 0, 0.38, z, 10));
    // Chases between bays (translucent wall panels with frames).
    for (let k = 1; k < BAYS; k++) {
      const x = -IX + k * BW;
      for (const s of [1, -1]) {
        const za = s * 0.3,
          zb = s * IZ;
        C(cl.chase, new THREE.PlaneGeometry(Math.abs(zb - za), H_CEIL - FLOOR).rotateY(Math.PI / 2).translate(x, (FLOOR + H_CEIL) / 2, (za + zb) / 2));
        C(cl.chaseFrame, bb(x - 0.008, x + 0.008, FLOOR, H_CEIL, za - 0.008, za + 0.008));
        C(cl.chaseFrame, bb(x - 0.006, x + 0.006, H_CEIL - 0.015, H_CEIL, Math.min(za, zb), Math.max(za, zb)));
      }
    }
    // FFU ceiling: solid over the back third, open T-bar grid over the front.
    const zc = -0.62;
    const ffu = uvScale(new THREE.PlaneGeometry(2 * IX, zc + IZ), (2 * IX) / 0.48, (zc + IZ) / 0.48).rotateX(Math.PI / 2).translate(0, H_CEIL, (zc - IZ) / 2);
    C(cl.ffu, ffu);
    for (let x = -IX + 0.12; x < IX; x += 0.24) for (let z = -IZ + 0.12; z < zc; z += 0.24) C(cl.ffuBox, bx(0.17, 0.05, 0.17, x, H_CEIL + 0.002, z));
    const gridGeos: T.BufferGeometry[] = [];
    for (let z = zc; z <= IZ + 0.001; z += 0.24) gridGeos.push(bb(-IX, IX, H_CEIL - 0.006, H_CEIL, z - 0.006, z + 0.006));
    for (let x = -IX; x <= IX + 0.001; x += 0.24) gridGeos.push(bb(x - 0.006, x + 0.006, H_CEIL - 0.006, H_CEIL, zc, IZ));
    C(cl.grid, mergeInto(THREE, gridGeos));
    // Stockers at the head of the spine.
    for (const s of [1, -1]) {
      const x = s * (IX - 0.12);
      C(cl.stocker, bx(0.18, 0.48, 0.5, x, FLOOR, 0));
      for (let k = 0; k < 3; k++) C(cl.stockerWin, bx(0.005, 0.1, 0.4, x - s * 0.091, FLOOR + 0.08 + k * 0.13, 0));
    }

    // AMHS: interbay loop down the spine + an intrabay U-loop into every bay.
    const RY = 0.905;
    const railPaths: Vec3[][] = [];
    const ring: Vec3[] = [];
    const xe = IX - 0.32;
    for (let i = 0; i <= 12; i++) ring.push([xe + 0.1 * Math.sin((i / 12) * Math.PI), RY, 0.1 * Math.cos((i / 12) * Math.PI)]);
    for (let i = 0; i <= 12; i++) ring.push([-xe - 0.1 * Math.sin((i / 12) * Math.PI), RY, -0.1 * Math.cos((i / 12) * Math.PI)]);
    ring.push(ring[0]);
    railPaths.push(ring);
    const vehicles: [number, number, boolean][] = [];
    const rnd = mulberry(5);
    for (let i = 0; i < BAYS; i++)
      for (const s of [1, -1]) {
        const xc = bayX(i);
        const zEnd = s * (IZ - 0.14);
        const p: Vec3[] = [[xc - 0.15, RY, s * 0.1], [xc - 0.08, RY, s * 0.2], [xc - 0.08, RY, zEnd]];
        for (let k = 1; k < 8; k++) {
          const a = (k / 8) * Math.PI;
          p.push([xc - 0.08 * Math.cos(a), RY, zEnd + s * 0.08 * Math.sin(a)]);
        }
        p.push([xc + 0.08, RY, zEnd], [xc + 0.08, RY, s * 0.2], [xc + 0.15, RY, s * 0.1]);
        railPaths.push(p);
        for (let v = 0; v < 2; v++) vehicles.push([xc + (v ? 0.08 : -0.08), s * (0.35 + rnd() * (IZ - 0.55)), false]);
      }
    for (let v = 0; v < 10; v++) vehicles.push([-xe + rnd() * 2 * xe, rnd() < 0.5 ? 0.1 : -0.1, true]);
    const railGeos: T.BufferGeometry[] = railPaths.map((p) => tube(THREE, p, 0.008, 4, false, p.length * 6));
    // Hanger rods.
    for (let i = 0; i < BAYS; i++)
      for (const s of [1, -1])
        for (let z = 0.35; z < IZ - 0.1; z += 0.3)
          for (const dx of [-0.08, 0.08]) railGeos.push(bb(bayX(i) + dx - 0.003, bayX(i) + dx + 0.003, RY, H_CEIL, s * z - 0.003, s * z + 0.003));
    for (let x = -xe; x <= xe; x += 0.4) for (const z of [-0.1, 0.1]) railGeos.push(bb(x - 0.003, x + 0.003, RY, H_CEIL, z - 0.003, z + 0.003));
    C(cl.rail, mergeInto(THREE, railGeos));
    for (const [x, z, alongX] of vehicles) {
      const w = alongX ? 0.07 : 0.045,
        d = alongX ? 0.045 : 0.07;
      C(cl.oht, rb(w, 0.035, d, 0.008, x, RY - 0.04, z));
      C(cl.foupDark, bx(0.012, 0.03, 0.012, x, RY - 0.07, z));
      C(cl.foup, rb(0.05, 0.05, 0.05, 0.008, x, RY - 0.12, z));
    }
  }

  // ============================================================ PROCESS TOOLS (layer 3)
  const T_ = tm;
  const signal = (P: Put, x: number, y: number, z: number, M = T_) => {
    P(M.grey, cyl(0.004, 0.03, x, y, z, 6));
    P(M.green, cyl(0.008, 0.012, x, y + 0.03, z, 10));
    P(M.amber, cyl(0.008, 0.012, x, y + 0.042, z, 10));
    P(M.red, cyl(0.008, 0.012, x, y + 0.054, z, 10));
  };
  const foup = (P: Put, x: number, y: number, z: number, M = T_) => {
    P(M.foup, rb(0.052, 0.055, 0.056, 0.008, x, y, z));
    P(M.foupDark, bx(0.044, 0.044, 0.004, x, y + 0.005, z + 0.028));
    P(M.foupDark, bx(0.026, 0.008, 0.016, x, y + 0.055, z));
  };
  const loadPort = (P: Put, x: number, z: number, withFoup = true) => {
    P(T_.grey, bx(0.064, 0.012, 0.066, x, 0.1, z));
    if (withFoup) foup(P, x, 0.112, z);
  };
  const screen = (P: Put, x: number, y: number, z: number) => {
    P(T_.dark, bx(0.008, 0.06, 0.008, x, y, z));
    P(T_.dark, bx(0.064, 0.044, 0.008, x, y + 0.055, z + 0.006));
    P(T_.screen, bx(0.056, 0.036, 0.002, x, y + 0.059, z + 0.011));
  };

  /** Etch / deposition cluster tool: EFEM + load ports, hex transfer chamber, radial process chambers. */
  const clusterTool = (P: Put, chambers: number, lid: T.Material) => {
    P(T_.dark, bx(0.36, 0.02, 0.46, 0, 0, -0.03));
    P(T_.white, rb(0.34, 0.2, 0.1, 0.012, 0, 0.0, 0.14));
    P(T_.grey, bx(0.3, 0.014, 0.08, 0, 0.2, 0.14));
    for (const x of [-0.1, 0, 0.1]) loadPort(P, x, 0.225);
    for (const x of [-0.05, 0.05]) P(T_.chamber, bx(0.07, 0.07, 0.07, x, 0.06, 0.055));
    P(T_.chamber, cyl(0.085, 0.075, 0, 0.06, -0.07, 6));
    P(T_.grey, cyl(0.088, 0.012, 0, 0.135, -0.07, 6));
    const angs = chambers === 5 ? [-180, -135, -90, -45, 0] : [-160, -110, -70, -20];
    for (const deg of angs) {
      const a = (deg * Math.PI) / 180;
      const x = Math.cos(a) * 0.15,
        z = -0.07 + Math.sin(a) * 0.15;
      P(T_.dark, bx(0.09, 0.05, 0.09, x, 0, z));
      P(T_.chamber, cyl(0.052, 0.08, x, 0.05, z, 20));
      P(lid, cyl(0.056, 0.022, x, 0.13, z, 20));
      P(T_.grey, bx(0.04, 0.03, 0.04, x, 0.152, z));
    }
    signal(P, 0.15, 0.2, 0.17);
    screen(P, -0.19, 0.11, 0.15);
  };
  /** EUV scanner (long along local Z, wafer handler at +Z) with its source in the sub-fab. */
  const euv = (P: Put) => {
    P(T_.dark, bx(0.4, 0.02, 0.92, 0, 0, -0.02));
    P(T_.white, rb(0.38, 0.32, 0.62, 0.025, 0, 0.02, -0.1));
    P(T_.white, rb(0.3, 0.09, 0.36, 0.02, 0, 0.34, -0.04));
    P(T_.blue, bx(0.384, 0.022, 0.6, 0, 0.24, -0.1));
    P(T_.blue, bx(0.304, 0.014, 0.34, 0, 0.4, -0.04));
    for (let k = 0; k < 4; k++) for (const s of [1, -1]) P(T_.grey, bx(0.004, 0.2, 0.004, s * 0.191, 0.03, -0.34 + k * 0.16));
    P(T_.white, rb(0.3, 0.22, 0.17, 0.015, 0, 0.02, 0.3));
    for (const x of [-0.07, 0.07]) {
      P(T_.grey, bx(0.064, 0.012, 0.066, x, 0.1, 0.42));
      foup(P, x, 0.112, 0.42);
    }
    signal(P, 0.13, 0.24, 0.35);
    screen(P, 0.2, 0.12, 0.3);
    // Sub-fab: EUV source vessel, CO2 drive-laser cabinets, beam transport.
    const yb = -(H_SUB - 0.01);
    P(T_.grey, rb(0.36, 0.26, 0.34, 0.02, 0, yb, -0.22));
    P(T_.chamber, new THREE.SphereGeometry(0.11, 24, 16).translate(0, yb + 0.3, -0.22));
    P(T_.chamber, cyl(0.03, 0.17, 0, yb + 0.29, -0.22, 14));
    for (let k = 0; k < 3; k++) P(T_.dark, rb(0.12, 0.3, 0.14, 0.012, -0.12 + k * 0.12, yb, 0.16));
  };
  /** DUV immersion scanner + coat/develop track, in line. */
  const duv = (P: Put) => {
    P(T_.dark, bx(0.36, 0.02, 1.0, 0, 0, -0.05));
    P(T_.white, rb(0.34, 0.28, 0.48, 0.02, 0, 0.02, -0.28));
    P(T_.grey, bx(0.344, 0.02, 0.46, 0, 0.21, -0.28));
    P(T_.white, rb(0.26, 0.06, 0.26, 0.015, 0, 0.3, -0.3));
    P(T_.white, rb(0.3, 0.22, 0.48, 0.015, 0, 0.02, 0.2));
    for (let k = 0; k < 4; k++) P(T_.win, bx(0.004, 0.06, 0.08, 0.151, 0.12, 0.04 + k * 0.1));
    P(T_.grey, bx(0.28, 0.03, 0.46, 0, 0.24, 0.2));
    for (const x of [-0.08, 0, 0.08]) {
      P(T_.grey, bx(0.064, 0.012, 0.066, x, 0.1, 0.48));
      foup(P, x, 0.112, 0.48);
    }
    signal(P, 0.12, 0.24, 0.42);
  };
  /** Wet bench: long along local X, sash at the front. */
  const wetBench = (P: Put) => {
    P(T_.white, bx(0.9, 0.18, 0.28, 0, 0, 0));
    for (let k = 0; k < 5; k++) P(T_.win, bx(0.13, 0.004, 0.15, -0.3 + k * 0.15, 0.18, -0.01));
    for (const x of [-0.44, 0.44]) P(T_.white, bx(0.02, 0.15, 0.28, x, 0.18, 0));
    P(T_.white, bx(0.9, 0.06, 0.28, 0, 0.33, 0));
    P(T_.glass, bx(0.86, 0.13, 0.004, 0, 0.19, 0.13));
    P(T_.grey, cyl(0.022, 0.12, 0.25, 0.39, -0.08, 12));
    P(T_.grey, cyl(0.022, 0.12, -0.25, 0.39, -0.08, 12));
    loadPort(P, 0.36, 0.17);
    signal(P, -0.4, 0.39, 0.1);
  };
  /** Vertical diffusion furnace pair. */
  const furnace = (P: Put) => {
    for (const x of [-0.07, 0.07]) {
      P(T_.white, rb(0.13, 0.46, 0.24, 0.012, x, 0, -0.05));
      P(T_.grey, bx(0.11, 0.02, 0.004, x, 0.38, 0.072));
    }
    P(T_.white, rb(0.28, 0.2, 0.12, 0.012, 0, 0, 0.12));
    for (const x of [-0.06, 0.06]) loadPort(P, x, 0.21);
    P(T_.orange, bx(0.284, 0.012, 0.24, 0, 0.43, -0.05));
    signal(P, 0.11, 0.46, 0.05);
  };
  const metrology = (P: Put) => {
    P(T_.white, rb(0.24, 0.21, 0.24, 0.015, 0, 0, -0.02));
    P(T_.win, bx(0.16, 0.004, 0.14, 0, 0.21, -0.03));
    loadPort(P, 0, 0.14);
    screen(P, 0.14, 0.12, 0.08);
    signal(P, -0.1, 0.21, 0.06);
  };
  const cmp = (P: Put) => {
    P(T_.white, rb(0.34, 0.2, 0.36, 0.015, 0, 0, -0.04));
    P(T_.glass, bx(0.3, 0.004, 0.24, 0, 0.2, -0.08));
    for (const x of [-0.09, 0.0, 0.09]) P(T_.chamber, cyl(0.04, 0.005, x, 0.2, -0.08, 20));
    for (const x of [-0.06, 0.06]) loadPort(P, x, 0.17);
    signal(P, 0.15, 0.2, 0.12);
  };

  {
    const at = (xc: number, z: number, side: number, fn: (P: Put) => void, s = 1) => {
      // side -1: tool on the west of the bay facing +X; +1: east side facing -X.
      const x = xc + side * 0.27;
      fn(place(Pp, x, FLOOR, z, side < 0 ? Math.PI / 2 : -Math.PI / 2, s));
    };
    const zs = [0.5, 0.85, 1.18];
    const row = (i: number, s: number, side: number, fn: (P: Put) => void, sc = 0.85) => {
      for (const z of zs) at(bayX(i), s * z, side, fn, sc);
    };
    const etchLid = T_.blue,
      depLid = T_.orange;
    const etch = (P: Put) => clusterTool(P, 4, etchLid);
    const dep = (P: Put) => clusterTool(P, 5, depLid);
    // Front bays (z > 0).
    row(0, 1, -1, metrology, 1);
    row(0, 1, 1, cmp, 0.9);
    for (const side of [-1, 1]) at(bayX(1), 0.84, side, wetBench, 0.95);
    row(2, 1, -1, dep);
    row(2, 1, 1, dep);
    row(3, 1, -1, etch);
    row(3, 1, 1, etch);
    // Litho bay: EUV on the west side, DUV + track on the east.
    euv(place(Pp, bayX(4) - 0.25, FLOOR, 0.82, Math.PI));
    duv(place(Pp, bayX(4) + 0.25, FLOOR, 0.82, Math.PI));
    row(5, 1, -1, furnace, 1);
    row(5, 1, 1, furnace, 1);
    // Rear bays (z < 0).
    row(0, -1, -1, furnace, 1);
    row(0, -1, 1, furnace, 1);
    row(1, -1, -1, etch);
    row(1, -1, 1, dep);
    euv(place(Pp, bayX(2) - 0.25, FLOOR, -0.82, 0));
    duv(place(Pp, bayX(2) + 0.25, FLOOR, -0.82, 0));
    row(3, -1, -1, dep);
    row(3, -1, 1, etch);
    for (const side of [-1, 1]) at(bayX(4), -0.84, side, wetBench, 0.95);
    row(5, -1, -1, cmp, 0.9);
    row(5, -1, 1, metrology, 1);
  }

  // ---- ATMP back-end lines (annex) and SMT lines (EMS) — "aux" bucket.
  {
    const A = putter(procG);
    const fy = 0.012;
    const machine = (x: number, z: number, w: number, h: number, d: number, top: T.Material = am.win) => {
      A(am.white, rb(w, h, d, 0.012, x, fy, z));
      A(top, bx(w * 0.7, 0.004, d * 0.6, x, fy + h, z));
      signal(A, x + w / 2 - 0.02, fy + h, z - d / 2 + 0.02, am);
    };
    for (const z of [-0.5, 0.5]) {
      A(am.dark, bb(3.42, 4.9, fy, fy + 0.07, z - 0.025, z + 0.025));
      A(am.grey, bb(3.42, 4.9, fy + 0.07, fy + 0.076, z - 0.03, z + 0.03));
      machine(3.52, z, 0.14, 0.17, 0.2);
      machine(3.72, z, 0.18, 0.2, 0.24); // dicing saw
      machine(3.95, z, 0.18, 0.19, 0.22); // die attach
      for (let k = 0; k < 3; k++) machine(4.12 + k * 0.09, z, 0.075, 0.15, 0.13, am.dark); // wire bonders
      // Mould press: base, columns, platen, head.
      const mx = 4.5;
      A(am.white, rb(0.2, 0.1, 0.22, 0.012, mx, fy, z));
      for (const dx of [-0.07, 0.07]) for (const dz of [-0.07, 0.07]) A(am.chamber, cyl(0.01, 0.16, mx + dx, fy + 0.1, z + dz, 8));
      A(am.grey, bx(0.18, 0.025, 0.2, mx, fy + 0.16, z));
      A(am.white, rb(0.2, 0.06, 0.22, 0.012, mx, fy + 0.26, z));
      A(am.orange, bx(0.204, 0.012, 0.224, mx, fy + 0.29, z));
      // Test handler + tester head on its manipulator.
      A(am.white, rb(0.2, 0.2, 0.24, 0.012, 4.78, fy, z));
      A(am.dark, rb(0.1, 0.22, 0.16, 0.012, 4.78, fy, z + (z > 0 ? -0.2 : 0.2)));
      A(am.grey, rb(0.12, 0.05, 0.1, 0.01, 4.78, fy + 0.2, z + (z > 0 ? -0.08 : 0.08)));
      signal(A, 4.7, fy + 0.2, z - 0.1, am);
    }
    for (const z of [-0.5, 0.5]) for (let k = 0; k < 4; k++) A(am.screen, bx(0.05, 0.03, 0.004, 3.6 + k * 0.35, fy + 0.12, z + (z > 0 ? -0.13 : 0.13)));

    // SMT lines in the EMS plant.
    for (const z of [0.05, 0.95]) {
      A(am.dark, bb(-5.3, -3.5, fy, fy + 0.07, z - 0.02, z + 0.02));
      A(am.white, rb(0.12, 0.2, 0.2, 0.012, -5.2, fy, z));
      A(am.white, rb(0.18, 0.16, 0.24, 0.012, -4.98, fy, z));
      A(am.win, bx(0.12, 0.004, 0.16, -4.98, fy + 0.16, z));
      for (let k = 0; k < 3; k++) {
        const x = -4.72 + k * 0.24;
        A(am.white, rb(0.2, 0.13, 0.26, 0.012, x, fy, z));
        A(am.glass, rb(0.18, 0.06, 0.22, 0.03, x, fy + 0.13, z));
        A(am.dark, bx(0.14, 0.012, 0.03, x, fy + 0.16, z));
        signal(A, x + 0.08, fy + 0.13, z - 0.1, am);
      }
      // Reflow oven.
      A(am.white, rb(0.5, 0.13, 0.22, 0.012, -3.86, fy, z));
      A(am.grey, bx(0.48, 0.01, 0.16, -3.86, fy + 0.13, z));
      for (const dx of [-0.12, 0.12]) A(am.chamber, cyl(0.018, 0.08, -3.86 + dx, fy + 0.13, z, 10));
      A(am.white, rb(0.1, 0.18, 0.2, 0.012, -3.54, fy, z));
      for (let k = 0; k < 7; k++) A(am.pcb, bx(0.05, 0.004, 0.06, -5.1 + k * 0.25, fy + 0.074, z));
    }
  }

  // ------------------------------------------------------------ flush batches
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ------------------------------------------------------------ levels
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("ground", lerp(1, 0.9, a));
      groundMat.depthWrite = true;
      L.set("cfloor", v <= 1 ? 0.12 * a : v <= 2 ? lerp(0.12, 1, b) : lerp(1, 0.7, c));
      L.set("ctx", lerp(1, 0.14, a));
      L.set("shell", lerp(lerp(1, 0.2, a), 0.1, b));
      L.set("glass", lerp(lerp(1, 0.2, a), 0.1, b));
      L.set("roof", lerp(lerp(1, 0.16, a), 0.035, b));
      L.set("yard", v <= 1 ? 1 : lerp(1, 0.2, b));
      L.set("clean", v <= 1 ? 0.12 * a : v <= 2 ? lerp(0.12, 1, b) : lerp(1, 0.22, c));
      L.set("proc", v <= 1 ? 0.1 * a : v <= 2 ? lerp(0.1, 1, b) : 1);
      L.set("aux", v <= 2 ? 0.1 * a : lerp(0.1, 1, c));
      const fy = tri(v, 1) * 0.16;
      focusGas(fy);
      focusChem(fy);
      focusUtil(fy);
      focusClean(tri(v, 2) * 0.5);
      focusProc(c * 0.07);
    },
  };
}
