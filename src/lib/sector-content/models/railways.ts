// Railways — an Indian Railways Vande Bharat semi-high-speed train set
// (driving trailer car + pantograph coach + motor coach) standing at a
// platform on ballasted broad-gauge track under 25 kV overhead equipment.
//
// Scale ≈ 1 : 3.85 across the section (car body 0.84 wide ≈ 3.24 m, roof
// 1.04 above rail ≈ 4.0 m, 1676 mm broad gauge). Car lengths are compressed
// (≈ 3.5 instead of 6) so the whole consist fits the stage. -X is the front:
// the driving trailer's aerodynamic nose points toward -X.
//
// Every car body is a lofted surface; the nose blends the coach section into
// a rounded ellipse toward the tip, with the livery, windscreen mask, doors
// and headlamp housings painted per-pixel into a texture laid out on the
// loft's own (x, h) parameterisation, so the livery follows the surface.
//
// Layers: 0 track & corridor + the complete train, 1 underframe & bogies,
// 2 traction (pantograph -> transformer -> converters -> motors) & braking,
// 3 coach body & cab electronics (cab desk, Kavach, saloon seating).
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  contactShadow,
  extrude,
  lathe,
  layerMats,
  lerp,
  loft,
  loftPatch,
  mergeInto,
  profile,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

export function buildRailways(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [trackG, underG, tracG, bodyG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };
  const std = (color: number, metalness = 0.3, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const at = (g: T.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
  const cylX = (r: number, len: number, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
  const cylZ = (r: number, len: number, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
  /** Pile of geometries per material, merged into one mesh at the end. */
  const bins = new Map<T.Material, { parent: T.Object3D; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, g: T.BufferGeometry) => {
    if (!bins.has(mat)) bins.set(mat, { parent, geos: [] });
    bins.get(mat)!.geos.push(g);
  };

  // ---------------------------------------------------------------- dims
  const RT = 0.145; // rail top
  const GZ = 0.218; // rail centre (half gauge)
  const WR = 0.12; // wheel radius
  const AY = RT + WR; // axle centre height
  const YB = 0.4; // car body underside
  const YR = 1.18; // roof crown
  const BW = 0.422; // body half-width
  // Consist: driving trailer (nose at XT), pantograph coach, motor coach.
  const XT = -4.6;
  const NL = 1.5; // nose length (tip -> full section)
  const CARS: { x0: number; x1: number; bogies: number[]; motor: boolean }[] = [
    { x0: XT, x1: -0.95, bogies: [-2.95, -1.5], motor: false },
    { x0: -0.87, x1: 2.53, bogies: [-0.37, 2.03], motor: false },
    { x0: 2.61, x1: 6.01, bogies: [3.11, 5.51], motor: true },
  ];
  const PANTO_X = 0.1;
  const OHE_Y = 1.58; // contact wire height
  const MASTS = [-6.0, -2.8, 0.4, 3.6, 6.8];
  const MAST_Z = 1.05;
  const TRACK_X0 = -7.6,
    TRACK_X1 = 7.6;

  // ---------------------------------------------------------------- materials
  // Site / corridor
  const gravelTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#6c675f";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 70 + Math.random() * 90;
      g.fillStyle = `rgb(${v},${v * 0.96},${v * 0.9})`;
      const r = 1 + Math.random() * 3.2;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, r, r * (0.6 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  gravelTex.wrapS = gravelTex.wrapT = THREE.RepeatWrapping;
  gravelTex.repeat.set(3, 3);
  const ballast = L.add("track", std(0xffffff, 0.05, 0.95, { map: gravelTex }));
  const formation = L.add("site", std(0x7a6a55, 0, 0.97));
  const sleeperMat = L.add("track", std(0x9a968e, 0.05, 0.85));
  const railMat = L.add("track", std(0x8e949b, 0.85, 0.32));
  const clipMat = L.add("track", std(0x2a2d31, 0.5, 0.5));
  const galv = L.add("site", std(0x8d959e, 0.75, 0.42));
  const copper = L.add("site", std(0x9b6a3c, 0.85, 0.35));
  const porcelain = L.add("site", std(0x6b4a33, 0.2, 0.35));
  const concrete = L.add("site", std(0xa9a49b, 0, 0.9));
  const concreteDark = L.add("site", std(0x77736c, 0, 0.92));
  const signalBlack = L.add("site", std(0x16181b, 0.3, 0.6));
  const signalGreen = L.add("site", std(0x28ff8a, 0, 0.3, { emissive: 0x22ff88, emissiveIntensity: 2.2 }));
  const signalOff = L.add("site", std(0x2a1414, 0.2, 0.3));
  const canopyMat = L.add("site", std(0xc5c9ce, 0.4, 0.5, { side: DS }));
  const kavachTagMat = L.add("track", std(0xf2c230, 0.2, 0.5));

  // Train body
  const glass = L.add(
    "body",
    new THREE.MeshPhysicalMaterial({ color: 0x0c1219, metalness: 0.4, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05 })
  );
  const whitePaint = L.add("body", new THREE.MeshPhysicalMaterial({ color: 0xf1f3f5, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, side: DS }));
  const skirtMat = L.add("body", std(0x3a3f46, 0.35, 0.55, { side: DS }));
  const rubber = L.add("body", std(0x1b1d20, 0.1, 0.8));
  const roofGrey = L.add("body", std(0xb9bec4, 0.4, 0.45));
  const headLamp = L.add("body", std(0xffffff, 0.2, 0.15, { emissive: 0xfff4dc, emissiveIntensity: 1.6 }));
  const tailLamp = L.add("body", std(0xff3b30, 0.2, 0.3, { emissive: 0xff2a1f, emissiveIntensity: 0.9 }));

  // Underframe & bogies
  const frameMat = L.add("under", std(0x2c3138, 0.55, 0.5));
  const wheelMat = L.add("under", std(0x9aa0a8, 0.9, 0.3));
  const axleBoxMat = L.add("under", std(0x40464f, 0.6, 0.45));
  const springMat = L.add("under", std(0x1f5fa8, 0.5, 0.4));
  const airSpringMat = L.add("under", std(0x141518, 0.05, 0.75));
  const damperMat = L.add("under", std(0xd8a92a, 0.4, 0.45));
  const equipMat = L.add("under", std(0x3b4048, 0.5, 0.55));

  // Traction & braking
  const tracMat = L.add("trac", std(0x50555e, 0.55, 0.42));
  const tracDark = L.add("trac", std(0x2b2f35, 0.5, 0.5));
  const motorMat = L.add("trac", std(0x5e6470, 0.7, 0.35));
  const pantoMat = L.add("trac", std(0xc6ccd3, 0.85, 0.28));
  const insulMat = L.add("trac", std(0x8a5a3a, 0.15, 0.35));
  const carbonMat = L.add("trac", std(0x1a1b1d, 0.3, 0.6));
  const hvMat = L.add("trac", std(0xb87333, 0.8, 0.3));
  const discMat = L.add("trac", std(0xa7adb5, 0.95, 0.22));
  const brakeMat = L.add("trac", std(0x8f2b3c, 0.5, 0.45));
  const resMat = L.add("trac", std(0x5a6068, 0.6, 0.4));

  // Body & cab electronics
  const kavExt = L.add("elecExt", std(0xe9ecef, 0.3, 0.45));
  const kavDark = L.add("elecExt", std(0x2a2e33, 0.4, 0.5));
  const deskMat = L.add("elec", std(0x3c4148, 0.3, 0.6));
  const cabWall = L.add("elec", std(0x8a9096, 0.2, 0.7, { side: DS }));
  const screenMat = L.add("elec", std(0x0b1a2a, 0.2, 0.3, { emissive: 0x2f7fd8, emissiveIntensity: 0.9 }));
  const dmiMat = L.add("elec", std(0x0b2a1f, 0.2, 0.3, { emissive: 0x1ec98a, emissiveIntensity: 1.0 }));
  const kavCab = L.add("elec", std(0x46505a, 0.5, 0.45));
  const floorMat = L.add("elec", std(0x5d6168, 0.1, 0.85, { side: DS }));
  const seatMat = L.add("elec", std(0x2f4f86, 0.05, 0.85));
  const seatShell = L.add("elec", std(0x9aa1a9, 0.3, 0.5));
  const ceilLight = L.add("elec", std(0xffffff, 0, 0.5, { emissive: 0xeaf2ff, emissiveIntensity: 0.8 }));

  // Emissive focus tints for the system the current level is about.
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusUnder = focus([frameMat, axleBoxMat], 0xd96c2b);
  const focusTrac = focus([tracMat, motorMat, hvMat], 0x7a5cc7);
  const focusBrake = focus([brakeMat, resMat], 0xc9315c);
  const focusKavach = focus([kavCab, kavExt], 0x1e9e76);

  // ---------------------------------------------------------------- car body loft
  // Right half-section [z, y], bottom centre -> roof crown (M = 9 segments).
  // Index 4..5 bound the continuous window band.
  const BASE: Vec2[] = [
    [0, YB],
    [0.33, YB],
    [0.405, 0.43],
    [0.42, 0.52],
    [BW, 0.76],
    [BW, 0.95],
    [0.41, 1.04],
    [0.365, 1.12],
    [0.22, 1.168],
    [0, YR],
  ];
  const M = BASE.length - 1;
  const H_WIN0 = 4 / M,
    H_WIN1 = 5 / M;
  const baseN = BASE.map(([z, y]) => [z / BW, (y - YB) / (YR - YB)] as Vec2);
  const ell = BASE.map((_, i) => {
    const th = -Math.PI / 2 + (Math.PI * i) / M;
    return [Math.cos(th), 0.5 + 0.5 * Math.sin(th)] as Vec2;
  });
  // Nose: s = 0 at the tip, 1 where the full coach section begins.
  const nW = profile([
    [0, 0.0],
    [0.015, 0.14],
    [0.05, 0.24],
    [0.12, 0.31],
    [0.25, 0.37],
    [0.45, 0.405],
    [0.65, 0.418],
    [0.85, BW],
    [1, BW],
  ]);
  const nTop = profile([
    [0, 0.49],
    [0.02, 0.55],
    [0.07, 0.61],
    [0.2, 0.69],
    [0.38, 0.77],
    [0.5, 0.85],
    [0.66, 1.0],
    [0.84, 1.14],
    [1, YR],
  ]);
  const nBot = profile([
    [0, 0.47],
    [0.025, 0.37],
    [0.08, 0.32],
    [0.25, 0.315],
    [0.6, 0.35],
    [0.85, YB],
    [1, YB],
  ]);
  const endRound = (x: number, x0: number, x1: number, nose: boolean) => {
    const d = nose ? x1 - x : Math.min(x - x0, x1 - x);
    return 1 - 0.035 * (1 - smoothstep(d, 0, 0.07));
  };
  const carSection = (car: { x0: number; x1: number }, nose: boolean) => (x: number): Vec2[] => {
    const k = endRound(x, car.x0, car.x1, nose);
    const s = nose ? (x - XT) / NL : 2;
    if (s >= 1) return BASE.map(([z, y]) => [z * k, YB + (y - YB) * (0.985 + 0.015 * k)] as Vec2);
    const r = 1 - smoothstep(s, 0.08, 0.92);
    const w = nW(s),
      yt = nTop(s),
      yb = nBot(s);
    return baseN.map(([zn, yn], i) => {
      const z = lerp(zn, ell[i][0], r);
      const y = lerp(yn, ell[i][1], r);
      return [z * w, yb + y * (yt - yb)] as Vec2;
    });
  };

  // Livery painted on the loft's (x, h) layout. Classic white / blue.
  type RGB = [number, number, number];
  const WHITE: RGB = [241, 243, 245],
    BLUE: RGB = [28, 76, 156],
    GREY: RGB = [58, 63, 70],
    BLACK: RGB = [14, 16, 20],
    SEAM: RGB = [120, 126, 134],
    SEAM_L: RGB = [196, 200, 206],
    DOORWIN: RGB = [24, 30, 40];
  const doorsOf = (car: { x0: number; x1: number }, i: number) =>
    i === 0 ? [XT + NL + 0.24, car.x1 - 0.3] : [car.x0 + 0.3, car.x1 - 0.3];
  const DW = 0.19; // door width
  const maskLo = profile([
    [0.36, 1],
    [0.4, 0.72],
    [0.46, 0.62],
    [0.62, 0.575],
    [0.78, 0.52],
    [0.9, H_WIN0],
    [1.2, H_WIN0],
  ]);
  const maskHi = profile([
    [0.78, 1],
    [0.85, 0.74],
    [0.92, H_WIN1],
    [1.2, H_WIN1],
  ]);
  const livery = (car: { x0: number; x1: number }, i: number) => {
    const doors = doorsOf(car, i);
    return (x: number, h: number): RGB => {
      const s = i === 0 ? (x - XT) / NL : 9;
      // Nose: windscreen mask, headlamp housings, coupler-cover seam.
      if (s < 1.25) {
        if (s >= 0.36 && s <= 1.02 && h >= maskLo(s) && h <= maskHi(s)) return BLACK;
        const hl = 0.39 - (0.27 - s) * 0.35;
        if (s > 0.11 && s < 0.27 && h > hl && h < hl + 0.06) return BLACK;
        if (Math.abs(s - 0.075) < 0.003 && h < 0.5) return SEAM_L;
      }
      if (h < 0.2) return GREY;
      for (const xd of doors) {
        const dx = Math.abs(x - xd);
        if (dx < DW / 2 + 0.003 && h > 0.2 && h < 0.61) {
          if (Math.abs(dx - DW / 2) < 0.003 || Math.abs(h - 0.605) < 0.004) return SEAM;
          if (dx < 0.05 && h > H_WIN0 + 0.01 && h < H_WIN1 - 0.01) return DOORWIN;
          if (Math.abs(dx) < 0.0018) return SEAM;
        }
      }
      if (h > 0.25 && h < 0.38) return BLUE;
      if (h > 0.402 && h < 0.414) return BLUE;
      return WHITE;
    };
  };
  const paintTex = (x0: number, x1: number, W: number, H: number, fn: (x: number, h: number) => RGB) =>
    canvasTexture(THREE, W, H, (g) => {
      const img = g.createImageData(W, H);
      const d = img.data;
      for (let py = 0; py < H; py++)
        for (let px = 0; px < W; px++) {
          let r = 0,
            gg = 0,
            b = 0;
          for (const [ox, oy] of [
            [0.25, 0.25],
            [0.75, 0.25],
            [0.25, 0.75],
            [0.75, 0.75],
          ]) {
            const x = x0 + ((px + ox) / W) * (x1 - x0);
            const v = 1 - (py + oy) / H;
            const h = v <= 0.5 ? 2 * v : 2 * (1 - v);
            const c = fn(x, h);
            r += c[0];
            gg += c[1];
            b += c[2];
          }
          const o = (py * W + px) * 4;
          d[o] = r / 4;
          d[o + 1] = gg / 4;
          d[o + 2] = b / 4;
          d[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
    });

  type Car = (typeof CARS)[number];
  const bodies: ReturnType<typeof loft>[] = [];
  CARS.forEach((car: Car, i) => {
    const nose = i === 0;
    const section = carSection(car, nose);
    const doors = doorsOf(car, i);
    const glassStart = nose ? XT + NL * 0.98 : car.x0 + 0.08;
    const body = loft(THREE, {
      x0: car.x0,
      x1: car.x1,
      section,
      stations: nose ? 110 : 44,
      perSegment: 5,
      endBias: nose ? 0.55 : 0.7,
      groups: 2,
      group: (x, h) => {
        if (h < H_WIN0 || h > H_WIN1) return 0;
        if (x < glassStart || x > car.x1 - 0.08) return 0;
        for (const xd of doors) if (Math.abs(x - xd) < DW / 2 + 0.004) return 0;
        return 1;
      },
    });
    bodies.push(body);
    const tex = paintTex(car.x0, car.x1, nose ? 2048 : 1024, 512, livery(car, i));
    const paint = L.add(
      "body",
      new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.12, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 })
    );
    mesh(bodyG, body.geometry, [paint, glass]);

    // End caps (gangway ends) — painted white with a dark gangway door.
    const caps = nose ? [car.x1] : [car.x0, car.x1];
    for (const xe of caps) {
      const sec = section(xe);
      const loop = [...sec, ...sec.slice(0, -1).reverse().map(([z, y]) => [-z, y] as Vec2)];
      const sh = new THREE.Shape();
      loop.forEach(([z, y], k) => (k ? sh.lineTo(z, y) : sh.moveTo(z, y)));
      put(bodyG, whitePaint, new THREE.ShapeGeometry(sh).rotateY(Math.PI / 2).translate(xe, 0, 0));
    }

    // Window pillars across the glass band.
    const pillars: T.BufferGeometry[] = [];
    for (const side of [1, -1]) {
      for (let x = glassStart + 0.33; x < car.x1 - 0.12; x += 0.36) {
        if (doors.some((xd) => Math.abs(x - xd) < DW / 2 + 0.03)) continue;
        pillars.push(loftPatch(THREE, body, x - 0.014, x + 0.014, () => [H_WIN0 - 0.004, H_WIN1 + 0.004], side, 0.0025, 2, 6));
      }
    }
    if (pillars.length) put(bodyG, whitePaint, mergeInto(THREE, pillars));

    // Side skirts between the bogies.
    const bx = car.bogies;
    const sk0 = bx[0] + 0.5,
      sk1 = bx[1] - 0.5;
    const skProf: Vec2[] = [
      [0.405, YB + 0.01],
      [0.412, YB - 0.04],
      [0.395, YB - 0.09],
      [0.383, YB - 0.095],
      [0.392, YB - 0.04],
      [0.392, YB + 0.01],
    ];
    for (const s of [1, -1]) {
      const g = extrude(THREE, skProf.map(([z, y]) => [z * s, y] as Vec2), sk1 - sk0);
      g.rotateY(Math.PI / 2).translate((sk0 + sk1) / 2, 0, 0);
      put(bodyG, skirtMat, g);
    }

    // Roof-mounted AC package units with fan grilles.
    const acXs = i === 0 ? [-1.95] : i === 1 ? [2.0] : [3.3, 5.3];
    for (const ax of acXs) {
      put(bodyG, roofGrey, at(roundedBox(THREE, 0.64, 0.08, 0.5, 0.035), ax, YR - 0.005, 0));
    }

    // Tail / marker lamp on the trailing end of the last car.
    if (i === CARS.length - 1) {
      for (const s of [1, -1]) put(bodyG, tailLamp, at(cylX(0.022, 0.01), car.x1 + 0.004, 0.5, s * 0.28));
    }
  });
  const dtc = bodies[0];

  // Fan grilles on the AC units.
  const fanTex = canvasTexture(THREE, 256, 128, (g, w, h) => {
    g.fillStyle = "#aeb3b9";
    g.fillRect(0, 0, w, h);
    for (const cx of [w * 0.28, w * 0.72]) {
      g.fillStyle = "#2b2f34";
      g.beginPath();
      g.arc(cx, h / 2, h * 0.38, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#8d939a";
      g.lineWidth = 3;
      for (let r = 8; r < h * 0.38; r += 8) {
        g.beginPath();
        g.arc(cx, h / 2, r, 0, Math.PI * 2);
        g.stroke();
      }
    }
  });
  const fanMat = L.add("body", std(0xffffff, 0.4, 0.5, { map: fanTex }));
  for (const ax of [-1.95, 2.0, 3.3, 5.3]) {
    mesh(bodyG, new THREE.PlaneGeometry(0.56, 0.3).rotateX(-Math.PI / 2), fanMat, [ax, YR + 0.0365, 0]);
  }

  // Windscreen glass and headlamp lenses on the nose.
  {
    const xa = XT + NL * 0.405,
      xb = XT + NL * 0.8;
    for (const s of [1, -1]) {
      mesh(
        bodyG,
        loftPatch(THREE, dtc, xa, xb, (x) => {
          const sv = (x - XT) / NL;
          return [Math.min(0.995, maskLo(sv) + 0.03), 1];
        }, s, 0.004, 48, 16),
        glass
      );
      const lens = loftPatch(
        THREE,
        dtc,
        XT + NL * 0.125,
        XT + NL * 0.255,
        (x) => {
          const sv = (x - XT) / NL;
          const hl = 0.39 - (0.27 - sv) * 0.35;
          return [hl + 0.016, hl + 0.044];
        },
        s,
        0.003,
        16,
        6
      );
      put(bodyG, headLamp, lens);
    }
  }

  // Gangway bellows between cars + semi-permanent couplers.
  for (let i = 0; i < CARS.length - 1; i++) {
    const xg = (CARS[i].x1 + CARS[i + 1].x0) / 2;
    const gap = CARS[i + 1].x0 - CARS[i].x1;
    const ribs: T.BufferGeometry[] = [at(roundedBox(THREE, gap + 0.02, 0.66, 0.66, 0.08), xg, 0.79, 0)];
    for (let k = -1; k <= 1; k++) ribs.push(at(roundedBox(THREE, 0.012, 0.68, 0.68, 0.08), xg + k * gap * 0.3, 0.79, 0));
    put(bodyG, rubber, mergeInto(THREE, ribs));
    put(underG, equipMat, at(cylX(0.026, gap + 0.3), xg, 0.36, 0));
    put(underG, frameMat, at(roundedBox(THREE, 0.07, 0.07, 0.09, 0.015), xg, 0.36, 0));
  }

  // ---------------------------------------------------------------- track & corridor (layer 0)
  const TL = TRACK_X1 - TRACK_X0,
    TXC = (TRACK_X0 + TRACK_X1) / 2;
  const alongX = (g: T.BufferGeometry, z = 0) => g.rotateY(Math.PI / 2).translate(TXC, 0, z);
  mesh(trackG, alongX(extrude(THREE, [[-1.7, 0], [1.7, 0], [1.2, 0.035], [-1.2, 0.035]], TL)), formation);
  mesh(trackG, alongX(extrude(THREE, [[-1.05, 0.034], [1.05, 0.034], [0.66, 0.092], [-0.66, 0.092]], TL)), ballast);
  const railProf: Vec2[] = [
    [-0.019, 0.1],
    [0.019, 0.1],
    [0.019, 0.104],
    [0.004, 0.108],
    [0.0035, 0.128],
    [0.0094, 0.132],
    [0.0094, RT],
    [-0.0094, RT],
    [-0.0094, 0.132],
    [-0.0035, 0.128],
    [-0.004, 0.108],
    [-0.019, 0.104],
  ];
  for (const s of [1, -1]) mesh(trackG, alongX(extrude(THREE, railProf, TL), s * GZ), railMat);
  // PSC sleepers + elastic rail clips (instanced).
  {
    const n = Math.floor(TL / 0.156);
    const slGeo = mergeInto(THREE, [
      at(new THREE.BoxGeometry(0.06, 0.04, 0.3), 0, 0, 0.21),
      at(new THREE.BoxGeometry(0.06, 0.04, 0.3), 0, 0, -0.21),
      at(new THREE.BoxGeometry(0.05, 0.03, 0.14), 0, -0.005, 0),
    ]);
    const sl = new THREE.InstancedMesh(slGeo, sleeperMat, n);
    const clipGeo = new THREE.BoxGeometry(0.03, 0.012, 0.012);
    const clips = new THREE.InstancedMesh(clipGeo, clipMat, n * 4);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const x = TRACK_X0 + 0.08 + i * 0.156;
      sl.setMatrixAt(i, m4.makeTranslation(x, 0.08, 0));
      let k = 0;
      for (const s of [1, -1]) for (const d of [-0.026, 0.026]) clips.setMatrixAt(i * 4 + k++, m4.makeTranslation(x, 0.106, s * GZ + d));
    }
    trackG.add(sl, clips);
  }
  // Kavach RFID tags on the sleepers ahead of the signal.
  for (const x of [-5.55, -5.4]) mesh(trackG, new THREE.BoxGeometry(0.05, 0.012, 0.11), kavachTagMat, [x, 0.106, 0]);
  const shadow = contactShadow(THREE, 11.2, 1.25, 0.5, 0.096);
  shadow.position.x = 0.7;
  L.add("track", shadow.material as T.Material);
  trackG.add(shadow);

  // Overhead equipment: masts, cantilevers, catenary + contact wire.
  const insulator = (len: number, r: number) => {
    const pts: Vec2[] = [[0.001, 0]];
    const n = 6;
    for (let k = 0; k <= n; k++) {
      const y = (k / n) * len;
      pts.push([r * 0.55, y], [r, y + len / n / 3], [r * 0.55, y + len / n / 1.5]);
    }
    pts.push([0.001, len]);
    return lathe(THREE, pts.filter((p) => p[1] <= len), 14);
  };
  const stagger = (x: number) => {
    // zig-zag between masts: +0.055 / -0.055
    for (let i = 0; i < MASTS.length - 1; i++) {
      const a = MASTS[i],
        b = MASTS[i + 1];
      if (x >= a && x <= b) {
        const za = i % 2 ? -0.055 : 0.055,
          zb = i % 2 ? 0.055 : -0.055;
        return lerp(za, zb, (x - a) / (b - a));
      }
    }
    return x < MASTS[0] ? 0.055 : MASTS.length % 2 ? 0.055 : -0.055;
  };
  const msgY = (x: number) => {
    for (let i = 0; i < MASTS.length - 1; i++) {
      const a = MASTS[i],
        b = MASTS[i + 1];
      if (x >= a && x <= b) return 1.87 - 0.07 * Math.sin((Math.PI * (x - a)) / (b - a));
    }
    return 1.87;
  };
  {
    const ibeam = extrude(
      THREE,
      [
        [-0.04, -0.035],
        [0.04, -0.035],
        [0.04, -0.025],
        [0.006, -0.025],
        [0.006, 0.025],
        [0.04, 0.025],
        [0.04, 0.035],
        [-0.04, 0.035],
        [-0.04, 0.025],
        [-0.006, 0.025],
        [-0.006, -0.025],
        [-0.04, -0.025],
      ],
      2.06
    );
    ibeam.rotateX(-Math.PI / 2); // depth along +y
    const steel: T.BufferGeometry[] = [];
    const ins: T.BufferGeometry[] = [];
    const conc: T.BufferGeometry[] = [];
    for (let i = 0; i < MASTS.length; i++) {
      const xm = MASTS[i];
      const zc = stagger(xm);
      steel.push(ibeam.clone().translate(xm, 1.03 + 0.0, MAST_Z));
      conc.push(at(new THREE.BoxGeometry(0.2, 0.08, 0.2), xm, 0.04, MAST_Z));
      // Bracket (top tube) carrying the catenary, registration tube below.
      steel.push(bar(THREE, [xm, 1.97, MAST_Z - 0.04], [xm, 1.9, zc - 0.06], 0.012, 8));
      steel.push(bar(THREE, [xm, 1.68, MAST_Z - 0.04], [xm, 1.64, zc + 0.26], 0.011, 8));
      steel.push(bar(THREE, [xm, 1.68, MAST_Z - 0.2], [xm, 1.94, 0.35], 0.008, 6)); // diagonal stay
      steel.push(bar(THREE, [xm, 1.64, zc + 0.26], [xm, OHE_Y + 0.006, zc], 0.006, 6)); // steady arm
      steel.push(bar(THREE, [xm, 1.9, zc - 0.03], [xm, msgY(xm) + 0.01, zc], 0.008, 6)); // messenger clamp
      steel.push(at(new THREE.BoxGeometry(0.05, 0.04, 0.04), xm, 2.07, MAST_Z)); // mast cap
      for (const y of [1.97, 1.68]) {
        const g = insulator(0.16, 0.026);
        g.rotateX(-Math.PI / 2).translate(xm, y - (y > 1.8 ? 0.004 : 0.002), MAST_Z - 0.06);
        ins.push(g);
      }
    }
    mesh(trackG, mergeInto(THREE, steel), galv);
    mesh(trackG, mergeInto(THREE, ins), porcelain);
    mesh(trackG, mergeInto(THREE, conc), concreteDark);
    // Messenger, contact wire, droppers, earth wire.
    const xs: number[] = [];
    for (let x = TRACK_X0; x <= TRACK_X1 + 1e-6; x += 0.1) xs.push(x);
    const wires: T.BufferGeometry[] = [];
    wires.push(tube(THREE, xs.map((x) => [x, msgY(x), stagger(x)] as Vec3), 0.006, 5, false, xs.length * 2));
    wires.push(tube(THREE, xs.map((x) => [x, OHE_Y, stagger(x)] as Vec3), 0.007, 6, false, xs.length * 2));
    wires.push(tube(THREE, xs.map((x) => [x, 2.06, MAST_Z + 0.06] as Vec3), 0.005, 5, false, xs.length));
    for (let x = TRACK_X0 + 0.2; x < TRACK_X1; x += 0.4) {
      if (MASTS.some((m) => Math.abs(m - x) < 0.15)) continue;
      wires.push(bar(THREE, [x, msgY(x), stagger(x)], [x, OHE_Y, stagger(x)], 0.0025, 4));
    }
    mesh(trackG, mergeInto(THREE, wires), copper);
  }

  // Colour-light signal ahead of the train, showing green.
  {
    const sx = -6.45,
      sz = 0.95;
    const g: T.BufferGeometry[] = [
      at(new THREE.CylinderGeometry(0.022, 0.028, 1.32, 12), sx, 0.66, sz),
      at(new THREE.BoxGeometry(0.12, 0.05, 0.12), sx, 0.025, sz),
      at(roundedBox(THREE, 0.08, 0.36, 0.11, 0.02), sx + 0.01, 1.2, sz),
      at(roundedBox(THREE, 0.012, 0.42, 0.2, 0.03), sx - 0.035, 1.2, sz),
    ];
    for (let k = 0; k < 4; k++) {
      const hood = new THREE.CylinderGeometry(0.03, 0.03, 0.045, 14, 1, true, 0, Math.PI);
      hood.rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
      g.push(at(hood, sx + 0.07, 1.335 - k * 0.08, sz));
    }
    mesh(trackG, mergeInto(THREE, g), signalBlack);
    mesh(trackG, cylX(0.024, 0.01), signalGreen, [sx + 0.052, 1.3, sz]);
    for (let k = 1; k < 4; k++) put(trackG, signalOff, at(cylX(0.024, 0.01), sx + 0.052, 1.3 - k * 0.08, sz));
  }

  // Platform with coping, yellow safety line, canopy and the station board.
  {
    const PX0 = 0.9,
      PX1 = 7.4,
      PZ0 = -0.5,
      PZ1 = -2.9,
      PY = 0.37;
    const platTex = canvasTexture(THREE, 1024, 512, (g, w, h) => {
      g.fillStyle = "#a7a39b";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(0,0,0,0.08)";
      g.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        g.beginPath();
        g.moveTo((i * w) / 40, 0);
        g.lineTo((i * w) / 40, h);
        g.stroke();
      }
      for (let j = 0; j < 20; j++) {
        g.beginPath();
        g.moveTo(0, (j * h) / 20);
        g.lineTo(w, (j * h) / 20);
        g.stroke();
      }
      // edge at the top of the texture (v = 1 -> z = PZ0)
      g.fillStyle = "#d6d3cc";
      g.fillRect(0, 0, w, h * 0.03);
      g.fillStyle = "#e9b923";
      g.fillRect(0, h * 0.06, w, h * 0.022);
      g.fillStyle = "#c9a43a";
      for (let x = 0; x < w; x += 6) for (let y = h * 0.1; y < h * 0.14; y += 6) g.fillRect(x, y, 3, 3);
    });
    const platTop = L.add("site", std(0xffffff, 0, 0.85, { map: platTex }));
    const top = new THREE.PlaneGeometry(PX1 - PX0, PZ0 - PZ1).rotateX(-Math.PI / 2);
    mesh(trackG, top, platTop, [(PX0 + PX1) / 2, PY + 0.001, (PZ0 + PZ1) / 2]);
    put(trackG, concrete, at(new THREE.BoxGeometry(PX1 - PX0, PY, PZ0 - PZ1), (PX0 + PX1) / 2, PY / 2, (PZ0 + PZ1) / 2));
    put(trackG, concreteDark, at(new THREE.BoxGeometry(PX1 - PX0, 0.03, 0.05), (PX0 + PX1) / 2, PY - 0.015, PZ0 + 0.02));
    // ramp at the open end
    const ramp = extrude(THREE, [[0, 0], [0, PY], [-0.7, 0]], PZ0 - PZ1);
    put(trackG, concrete, ramp.translate(PX0, 0, (PZ0 + PZ1) / 2));
    // canopy
    const cy = 1.78;
    for (let x = 1.9; x <= 7.0; x += 1.7) {
      put(trackG, canopyMat, at(new THREE.CylinderGeometry(0.025, 0.025, cy - PY, 10), x, (cy + PY) / 2, -2.25));
      put(trackG, canopyMat, bar(THREE, [x, cy - 0.04, -2.85], [x, cy + 0.04, -0.98], 0.016, 6));
    }
    const roof = new THREE.BoxGeometry(5.6, 0.025, 1.95);
    roof.rotateX(-0.04);
    put(trackG, canopyMat, at(roof, 4.45, cy + 0.05, -1.92));
    // Station name board (yellow, Indian Railways style).
    const boardTex = canvasTexture(THREE, 512, 160, (g, w, h) => {
      g.fillStyle = "#f2c21b";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#111";
      g.lineWidth = 8;
      g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = "#111";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "bold 52px 'Noto Sans Devanagari', 'Kohinoor Devanagari', sans-serif";
      g.fillText("नई दिल्ली", w / 2, h * 0.34);
      g.font = "bold 50px Arial, sans-serif";
      g.fillText("NEW DELHI", w / 2, h * 0.74);
    });
    const boardMat = L.add("site", std(0xffffff, 0.1, 0.6, { map: boardTex }));
    const bx = 4.6,
      bz = -1.6;
    mesh(trackG, new THREE.PlaneGeometry(0.8, 0.25), boardMat, [bx, 1.0, bz + 0.012]);
    put(trackG, signalBlack, at(new THREE.BoxGeometry(0.84, 0.29, 0.02), bx, 1.0, bz));
    for (const dx of [-0.36, 0.36]) put(trackG, signalBlack, at(new THREE.CylinderGeometry(0.014, 0.014, 0.72, 8), bx + dx, PY + 0.36, bz - 0.015));
  }

  // ---------------------------------------------------------------- bogies & underframe (layer 1) + brakes / motors (layer 2)
  const wheelProf: Vec2[] = [
    [0.024, -0.02],
    [0.036, -0.02],
    [0.042, -0.008],
    [0.1, -0.008],
    [0.106, -0.0175],
    [WR, -0.0175],
    [WR + 0.001, 0.0135],
    [0.132, 0.0175],
    [0.132, 0.0215],
    [0.118, 0.0215],
    [0.1, 0.012],
    [0.042, 0.012],
    [0.036, 0.02],
    [0.024, 0.02],
    [0.024, -0.02],
  ];
  const wheelBase = lathe(THREE, wheelProf, 36);
  const sideFrame = extrude(
    THREE,
    [
      [-0.46, 0.335],
      [-0.25, 0.335],
      [-0.18, 0.29],
      [0.18, 0.29],
      [0.25, 0.335],
      [0.46, 0.335],
      [0.46, 0.375],
      [0.24, 0.375],
      [0.17, 0.34],
      [-0.17, 0.34],
      [-0.24, 0.375],
      [-0.46, 0.375],
    ],
    0.045,
    0.005
  );
  const helix = (x: number, y0: number, y1: number, z: number, r: number) => {
    const pts: Vec3[] = [];
    const turns = 4;
    for (let k = 0; k <= turns * 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      pts.push([x + Math.cos(a) * r, lerp(y0, y1, k / (turns * 12)), z + Math.sin(a) * r]);
    }
    return tube(THREE, pts, 0.0045, 5, false, pts.length * 2);
  };
  const airSpring = lathe(
    THREE,
    [
      [0.001, 0],
      [0.04, 0],
      [0.05, 0.012],
      [0.052, 0.028],
      [0.046, 0.042],
      [0.042, 0.05],
      [0.001, 0.05],
    ],
    24
  );
  CARS.forEach((car) => {
    for (const bx of car.bogies) {
      const axles = [bx - 0.31, bx + 0.31];
      for (const s of [1, -1]) {
        put(underG, frameMat, sideFrame.clone().translate(bx, 0, s * 0.27));
        put(underG, airSpringMat, airSpring.clone().translate(bx, 0.345, s * 0.27));
        // dampers: yaw (horizontal) and secondary vertical
        put(underG, damperMat, bar(THREE, [bx + 0.08, 0.37, s * 0.318], [bx + 0.4, 0.375, s * 0.318], 0.011, 8));
        put(underG, frameMat, bar(THREE, [bx + 0.4, 0.375, s * 0.318], [bx + 0.44, 0.395, s * 0.318], 0.008, 6));
        put(underG, damperMat, bar(THREE, [bx - 0.12, 0.32, s * 0.31], [bx - 0.14, 0.398, s * 0.33], 0.01, 8));
      }
      // Transom tubes.
      for (const dx of [-0.07, 0.07]) put(underG, frameMat, at(cylZ(0.026, 0.54, 12), bx + dx, 0.315, 0));
      for (const ax of axles) {
        // Wheelset.
        for (const s of [1, -1]) {
          const w = wheelBase.clone().rotateX(s > 0 ? -Math.PI / 2 : Math.PI / 2);
          put(underG, wheelMat, w.translate(ax, AY, s * GZ));
          put(underG, axleBoxMat, at(cylZ(0.037, 0.06, 18), ax, AY, s * 0.272));
          put(underG, axleBoxMat, at(cylZ(0.028, 0.012, 18), ax, AY, s * 0.307));
          put(underG, frameMat, bar(THREE, [ax, AY, s * 0.272], [ax + (ax < bx ? 0.13 : -0.13), 0.33, s * 0.272], 0.012, 6));
          put(underG, springMat, helix(ax, AY + 0.036, 0.335, s * 0.272, 0.019));
        }
        put(underG, wheelMat, at(cylZ(0.021, 0.62, 14), ax, AY, 0));
        const dir = ax < bx ? 1 : -1; // toward the bogie centre
        if (!car.motor) {
          // Axle-mounted ventilated brake discs + calipers.
          for (const zd of [-0.085, 0.085]) {
            put(tracG, discMat, at(cylZ(0.085, 0.018, 32), ax, AY, zd));
            put(tracG, carbonMat, at(cylZ(0.035, 0.024, 16), ax, AY, zd));
            put(tracG, brakeMat, at(roundedBox(THREE, 0.05, 0.06, 0.05, 0.012), ax + dir * 0.075, AY + 0.04, zd));
            put(tracG, brakeMat, bar(THREE, [ax + dir * 0.075, AY + 0.04, zd], [bx - dir * 0.07, 0.315, zd], 0.009, 6));
          }
        } else {
          // Wheel-mounted disc calipers + gearbox on the axle.
          for (const s of [1, -1]) put(tracG, brakeMat, at(roundedBox(THREE, 0.045, 0.06, 0.07, 0.012), ax + dir * 0.115, AY + 0.04, s * GZ));
          put(tracG, motorMat, at(roundedBox(THREE, 0.14, 0.1, 0.06, 0.02), ax + dir * 0.03, AY + 0.005, 0.135));
        }
      }
      if (car.motor) {
        // Frame-mounted traction motors (one per axle) + flexible couplings.
        for (const ax of axles) {
          const dir = ax < bx ? 1 : -1;
          const mx = ax + dir * 0.165;
          put(tracG, tracMat, at(cylZ(0.056, 0.22, 24), mx, 0.282, -0.02));
          for (let k = -2; k <= 2; k++) put(tracG, tracDark, at(cylZ(0.059, 0.012, 24), mx, 0.282, -0.02 + k * 0.04));
          put(tracG, motorMat, at(cylZ(0.03, 0.03, 16), mx, 0.282, 0.1));
          put(tracG, tracDark, bar(THREE, [mx, 0.282, 0.1], [ax + dir * 0.03, AY + 0.005, 0.12], 0.016, 8));
          put(tracG, hvMat, tube(THREE, [[mx, 0.32, -0.08], [mx - dir * 0.05, 0.37, -0.12], [mx - dir * 0.12, 0.395, -0.2]], 0.007, 6));
        }
      }
    }
  });

  // Underslung equipment: battery & brake panels under the DTC, plus generic boxes.
  put(underG, equipMat, at(roundedBox(THREE, 0.42, 0.09, 0.3, 0.015), -2.22, 0.35, -0.2));
  put(underG, equipMat, at(roundedBox(THREE, 0.32, 0.08, 0.26, 0.015), 4.05, 0.355, 0.22));
  put(underG, equipMat, at(roundedBox(THREE, 0.3, 0.08, 0.28, 0.015), 1.85, 0.355, 0.2));
  // Underframe sole bars + cross-bearers (the ladder the equipment hangs from).
  CARS.forEach((car, i) => {
    const xa = i === 0 ? XT + NL * 0.75 : car.x0 + 0.04,
      xb = car.x1 - 0.04;
    for (const s of [1, -1]) put(underG, equipMat, at(new THREE.BoxGeometry(xb - xa, 0.035, 0.03), (xa + xb) / 2, YB - 0.018, s * 0.36));
    for (let x = xa + 0.1; x < xb; x += 0.42) put(underG, equipMat, at(new THREE.BoxGeometry(0.03, 0.025, 0.7), x, YB - 0.014, 0));
  });

  // ---------------------------------------------------------------- traction & braking (layer 2)
  // Pantograph (single-arm) on the pantograph coach roof.
  {
    const px = PANTO_X;
    const by = YR + 0.075;
    const g: T.BufferGeometry[] = [];
    const ins: T.BufferGeometry[] = [];
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.14, 0.14]) ins.push(insulator(0.08, 0.022).translate(px + dx, YR - 0.01, dz));
    // base frame
    for (const dz of [-0.14, 0.14]) g.push(bar(THREE, [px - 0.24, by, dz], [px + 0.24, by, dz], 0.012, 8));
    for (const dx of [-0.2, 0.2]) g.push(bar(THREE, [px + dx, by, -0.16], [px + dx, by, 0.16], 0.012, 8));
    // lower arm (hinge -> knee), drive air-spring, upper arm (knee -> head)
    const hinge: Vec3 = [px + 0.2, by + 0.02, 0];
    const knee: Vec3 = [px - 0.22, OHE_Y - 0.17, 0];
    const head: Vec3 = [px, OHE_Y - 0.03, 0];
    g.push(bar(THREE, [hinge[0], hinge[1], -0.1], [hinge[0], hinge[1], 0.1], 0.014, 10));
    for (const dz of [-0.06, 0.06]) g.push(bar(THREE, [hinge[0], hinge[1], dz], [knee[0], knee[1], dz * 0.3], 0.013, 10));
    g.push(bar(THREE, [hinge[0] - 0.02, by + 0.01, 0.12], [px + 0.02, by + 0.07, 0.04], 0.008, 6));
    for (const dz of [-0.05, 0.05]) g.push(bar(THREE, [knee[0], knee[1], dz * 0.3], [head[0], head[1], dz], 0.008, 8));
    g.push(bar(THREE, [px + 0.12, by + 0.02, 0], [knee[0] + 0.08, knee[1] - 0.01, 0], 0.005, 6)); // tie rod
    g.push(bar(THREE, [head[0], head[1], -0.06], [head[0], head[1], 0.06], 0.008, 6));
    // collector head: two carbon strips with curled horns
    const strips: T.BufferGeometry[] = [];
    for (const dx of [-0.035, 0.035]) {
      g.push(bar(THREE, [px + dx, OHE_Y - 0.018, -0.2], [px + dx, OHE_Y - 0.018, 0.2], 0.007, 6));
      strips.push(at(new THREE.BoxGeometry(0.014, 0.01, 0.36), px + dx, OHE_Y - 0.007, 0));
      for (const s of [1, -1])
        g.push(tube(THREE, [[px + dx, OHE_Y - 0.018, s * 0.2], [px + dx, OHE_Y - 0.025, s * 0.25], [px + dx, OHE_Y - 0.06, s * 0.28]], 0.006, 6));
      g.push(bar(THREE, [head[0], head[1], 0], [px + dx, OHE_Y - 0.02, 0], 0.006, 6));
    }
    put(tracG, pantoMat, mergeInto(THREE, g));
    put(tracG, insulMat, mergeInto(THREE, ins));
    put(tracG, carbonMat, mergeInto(THREE, strips));
    // Roof HV path: pantograph -> VCB -> surge arrester -> roof bushing -> cable to transformer.
    const vcbX = px + 0.5;
    put(tracG, insulMat, insulator(0.1, 0.026).translate(vcbX, YR - 0.01, 0));
    put(tracG, tracMat, at(roundedBox(THREE, 0.12, 0.06, 0.1, 0.02), vcbX, YR + 0.12, 0));
    put(tracG, insulMat, insulator(0.09, 0.02).translate(vcbX + 0.22, YR - 0.01, 0.12));
    put(tracG, hvMat, tube(THREE, [[px + 0.24, by, 0], [vcbX - 0.06, YR + 0.12, 0], [vcbX + 0.06, YR + 0.12, 0], [vcbX + 0.2, YR + 0.06, 0], [vcbX + 0.32, YR + 0.05, 0]], 0.008, 6));
    put(tracG, insulMat, insulator(0.06, 0.03).translate(vcbX + 0.34, YR - 0.01, 0));
    put(tracG, hvMat, tube(THREE, [[vcbX + 0.34, YR, 0], [vcbX + 0.36, YR - 0.15, 0.12], [vcbX + 0.36, 0.7, 0.3], [vcbX + 0.36, 0.43, 0.3], [vcbX + 0.36, 0.38, 0.25]], 0.009, 6));
  }
  // Main transformer + oil cooler under the pantograph coach.
  {
    const tx0 = 0.12,
      tx1 = 1.2;
    const tg: T.BufferGeometry[] = [at(roundedBox(THREE, tx1 - tx0, 0.11, 0.64, 0.02), (tx0 + tx1) / 2, 0.34, 0)];
    for (let x = tx0 + 0.06; x < tx1 - 0.04; x += 0.045)
      for (const s of [1, -1]) tg.push(at(new THREE.BoxGeometry(0.008, 0.09, 0.03), x, 0.335, s * 0.33));
    put(tracG, tracMat, mergeInto(THREE, tg));
    put(tracG, tracDark, at(cylX(0.035, 0.5, 18), 0.66, 0.37, -0.26)); // conservator
    put(tracG, tracDark, at(roundedBox(THREE, 0.3, 0.1, 0.6, 0.02), 1.42, 0.345, 0)); // cooler
    for (const s of [1, -1]) put(tracG, carbonMat, at(new THREE.CircleGeometry(0.075, 24).rotateX(Math.PI / 2), 1.42, 0.2945, s * 0.15));
    put(tracG, hvMat, tube(THREE, [[1.2, 0.33, 0.2], [1.6, 0.36, 0.22], [2.6, 0.38, 0.24], [3.6, 0.36, 0.24]], 0.009, 6)); // to converters
  }
  // Traction converter / inverter boxes under the motor coach; aux converter under the DTC.
  {
    const conv = (x0: number, x1: number) => {
      const g: T.BufferGeometry[] = [at(roundedBox(THREE, x1 - x0, 0.1, 0.66, 0.02), (x0 + x1) / 2, 0.345, 0)];
      for (let x = x0 + 0.04; x < x1 - 0.03; x += 0.03) for (const s of [1, -1]) g.push(at(new THREE.BoxGeometry(0.012, 0.06, 0.004), x, 0.345, s * 0.332));
      return mergeInto(THREE, g);
    };
    put(tracG, tracMat, conv(3.62, 4.42));
    put(tracG, tracMat, conv(4.5, 5.04));
    put(tracG, tracMat, conv(-2.5, -1.98));
  }
  // Brake equipment: main / auxiliary reservoirs, brake control panel, brake pipe.
  for (const [x, z] of [
    [-2.25, 0.24],
    [-2.25, 0.12],
    [1.75, -0.22],
  ] as [number, number][]) {
    put(tracG, resMat, at(cylX(0.045, 0.4, 20), x, 0.345, z));
    for (const e of [-0.2, 0.2]) put(tracG, resMat, at(new THREE.SphereGeometry(0.045, 16, 10).scale(0.5, 1, 1), x + e, 0.345, z));
  }
  put(tracG, brakeMat, at(roundedBox(THREE, 0.22, 0.08, 0.14, 0.015), 1.52, 0.355, -0.24));
  put(tracG, brakeMat, tube(THREE, [[XT + NL, 0.36, -0.33], [2.0, 0.37, -0.33], [6.0, 0.37, -0.33]], 0.006, 5, false, 40));

  // ---------------------------------------------------------------- body & cab electronics (layer 3)
  // Kavach: roof radio antenna + GPS on the DTC, RFID reader under the cab.
  {
    const kx = -2.7;
    put(bodyG, kavExt, at(new THREE.SphereGeometry(0.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.5, 0.7, 1), kx, YR, 0));
    put(bodyG, kavExt, at(new THREE.CylinderGeometry(0.006, 0.01, 0.2, 8), kx + 0.25, YR + 0.1, 0.08));
    put(bodyG, kavExt, at(new THREE.CylinderGeometry(0.03, 0.035, 0.02, 16), kx + 0.25, YR + 0.005, -0.1));
    put(bodyG, kavDark, at(roundedBox(THREE, 0.14, 0.04, 0.16, 0.012), XT + NL * 0.82, 0.355, 0));
    put(bodyG, kavExt, at(roundedBox(THREE, 0.1, 0.012, 0.12, 0.004), XT + NL * 0.82, 0.33, 0));
  }
  // Cab: floor, driver's desk with displays, Kavach DMI, seat, rear bulkhead, Kavach cabinet.
  {
    const cabX0 = XT + NL * 0.5,
      cabX1 = XT + NL * 1.08;
    const fy = 0.5;
    put(bodyG, floorMat, at(new THREE.BoxGeometry(cabX1 - cabX0, 0.01, 0.7), (cabX0 + cabX1) / 2, fy, 0));
    const dx0 = XT + NL * 0.6,
      dx1 = dx0 + 0.24;
    const desk = extrude(
      THREE,
      [
        [dx0, fy],
        [dx0 - 0.02, 0.7],
        [dx0 + 0.02, 0.74],
        [dx1, 0.79],
        [dx1 + 0.03, 0.76],
        [dx1, fy],
      ],
      0.66,
      0.008
    );
    put(bodyG, deskMat, desk);
    // displays laid on the desk slope
    const screenAt = (z: number, w: number, mat: T.Material) => {
      const g = new THREE.PlaneGeometry(w, 0.085);
      g.rotateX(-Math.PI / 2 + 0.75); // tilt toward the driver (+x)
      g.rotateY(-Math.PI / 2);
      mesh(bodyG, g, mat, [dx0 + 0.15, 0.81, z]);
    };
    screenAt(0.24, 0.12, dmiMat); // Kavach DMI on the driver's (left, +z) side
    screenAt(0.09, 0.14, screenMat);
    screenAt(-0.07, 0.14, screenMat);
    screenAt(-0.22, 0.12, screenMat);
    // master controller + brake handle
    put(bodyG, deskMat, bar(THREE, [dx1 - 0.02, 0.79, 0.12], [dx1 - 0.0, 0.84, 0.12], 0.006, 6));
    put(bodyG, deskMat, bar(THREE, [dx1 - 0.02, 0.79, 0.3], [dx1 - 0.0, 0.84, 0.3], 0.006, 6));
    // driver + co-driver seats
    for (const z of [0.18, -0.18]) {
      put(bodyG, seatMat, at(roundedBox(THREE, 0.12, 0.03, 0.12, 0.012), dx1 + 0.17, 0.64, z));
      put(bodyG, seatMat, at(roundedBox(THREE, 0.03, 0.18, 0.12, 0.012), dx1 + 0.24, 0.74, z));
      put(bodyG, seatShell, at(new THREE.CylinderGeometry(0.012, 0.02, 0.13, 8), dx1 + 0.17, 0.57, z));
    }
    // rear cab bulkhead with door opening
    const bh = cabX1;
    put(bodyG, cabWall, at(new THREE.BoxGeometry(0.015, 0.6, 0.3), bh, 0.8, 0.24));
    put(bodyG, cabWall, at(new THREE.BoxGeometry(0.015, 0.6, 0.3), bh, 0.8, -0.24));
    put(bodyG, cabWall, at(new THREE.BoxGeometry(0.015, 0.14, 0.2), bh, 1.03, 0));
    // Kavach / TCAS cabinet with status LEDs, behind the driver
    const kc: T.BufferGeometry[] = [at(roundedBox(THREE, 0.09, 0.3, 0.12, 0.01), bh - 0.06, 0.66, 0.3)];
    put(bodyG, kavCab, mergeInto(THREE, kc));
    for (let k = 0; k < 4; k++) put(bodyG, dmiMat, at(new THREE.BoxGeometry(0.004, 0.012, 0.02), bh - 0.107, 0.76 - k * 0.04, 0.27 + (k % 2) * 0.04));
  }
  // Saloon interiors: floor, 2+3 seating, luggage racks, ceiling light lines.
  {
    const seatGeo = mergeInto(THREE, [
      at(roundedBox(THREE, 0.1, 0.03, 0.1, 0.012), 0, 0.6, 0),
      at(roundedBox(THREE, 0.025, 0.2, 0.1, 0.01).rotateZ(-0.12), 0.052, 0.71, 0),
      at(new THREE.BoxGeometry(0.02, 0.1, 0.02), 0, 0.54, 0),
    ]);
    const spots: [number, number][] = [];
    const zs = [-0.32, -0.21, -0.1, 0.17, 0.29];
    CARS.forEach((car, i) => {
      const xa = i === 0 ? XT + NL * 1.08 + 0.14 : car.x0 + 0.48;
      const xb = car.x1 - 0.48;
      put(bodyG, floorMat, at(new THREE.BoxGeometry(car.x1 - car.x0 - (i === 0 ? NL + 0.1 : 0.1), 0.01, 0.78), (car.x1 + (i === 0 ? XT + NL + 0.1 : car.x0)) / 2, 0.48, 0));
      for (let x = xa; x <= xb; x += 0.235) for (const z of zs) spots.push([x, z]);
      for (const s of [1, -1]) put(bodyG, seatShell, at(new THREE.BoxGeometry(xb - xa + 0.1, 0.008, 0.12), (xa + xb) / 2, 0.98, s * 0.33));
      put(bodyG, ceilLight, at(new THREE.BoxGeometry(xb - xa + 0.2, 0.006, 0.03), (xa + xb) / 2, 1.1, 0.05));
    });
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z], k) => seats.setMatrixAt(k, m4.makeTranslation(x, 0, z)));
    bodyG.add(seats);
  }

  // Flush the geometry bins into one mesh per material.
  bins.forEach(({ parent, geos }, mat) => mesh(parent, geos.length === 1 ? geos[0] : mergeInto(THREE, geos), mat));

  // ---------------------------------------------------------------- levels
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const full = clamp01(1 - v);
      L.set("site", lerp(1, 0.2, clamp01(v)));
      L.set("track", v <= 1 ? 1 - 0.3 * v : lerp(0.7, 0.32, clamp01(v - 1)));
      L.set("body", Math.max(full, 0.15 + 0.2 * clamp01(v - 2)));
      L.set("under", Math.max(full, tri(v, 1), v > 1 ? 0.2 : 0));
      L.set("trac", Math.max(full, tri(v, 2), 0.18));
      L.set("elecExt", Math.max(full, clamp01(v - 2), 0.18));
      L.set("elec", clamp01(v - 2));
      focusUnder(tri(v, 1) * 0.22);
      focusTrac(tri(v, 2) * 0.55);
      focusBrake(tri(v, 2) * 0.5);
      focusKavach(clamp01(v - 2) * 0.6);
    },
  };
}
