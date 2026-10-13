// Electric 4-wheeler — a Tesla Model 3–proportioned fastback sedan.
//
// Units are metres; +X is the nose, Y is up, the car is centred on the
// origin. Real Model 3 dimensions drive the layout (4.69 m long, 2.875 m
// wheelbase, 1.44 m tall, 235/40R19 tyres), so the zone anchors in
// products.ts land on the parts they describe.
//
// Layers: 0 = body shell (paint, glass, lights, interior), 1 = body-in-white
// "exoskeleton", 2 = technology (compute, screens, sensors, harness,
// thermal), 3 = powertrain (skateboard pack, drive units). Wheels are static.
import type * as T from "three";
import {
  type Three,
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
  loftLine,
  loftPatch,
  profile,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Def = { shellMaxOpacity: number; exoBaseOpacity: number };

export function buildEv4w(ctx: Ctx, def: Def) {
  const THREE = ctx.THREE;
  const [bodyG, structG, techG, powerG] = ctx.layerGroups;
  const staticG = ctx.staticGroup;
  const L = layerMats();
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };

  // ---------------------------------------------------------------- key dims
  const XF = 2.345,
    XR = -2.345;
  const FA = 1.47,
    RA = -1.43; // axle stations
  const WR = 0.335; // tyre radius
  const TRACK = 0.79; // wheel-centre z
  const ARCH = 0.415; // wheel-arch opening radius

  // ---------------------------------------------------------------- materials
  const paint = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({
      color: 0xeef1f4,
      metalness: 0.05,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.FrontSide,
    }),
    def.shellMaxOpacity
  );
  const glass = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({
      color: 0x0b0f15,
      metalness: 0.2,
      roughness: 0.03,
      clearcoat: 1,
      opacity: 0.9,
      envMapIntensity: 0.18,
      side: THREE.FrontSide,
    })
  );
  const trim = L.add("shell", new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.3, roughness: 0.3 }));
  const lamp = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({ color: 0x0d1116, metalness: 0.7, roughness: 0.06, clearcoat: 1 })
  );
  const drl = L.add(
    "shell",
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f6ff, emissiveIntensity: 2.4 })
  );
  const tail = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({
      color: 0x2a0306,
      emissive: 0xc0101c,
      emissiveIntensity: 1.1,
      roughness: 0.08,
      clearcoat: 1,
    })
  );
  const seatMat = L.add("shell", new THREE.MeshStandardMaterial({ color: 0xe9e5dd, roughness: 0.65 }));
  const cabinDark = L.add("shell", new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.6 }));
  const woodMat = L.add("shell", new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.45 }));
  const under = L.add(
    "shell",
    new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, metalness: 0, side: THREE.DoubleSide })
  );

  const alu = L.add("struct", new THREE.MeshStandardMaterial({ color: 0xc3ccd6, metalness: 0.85, roughness: 0.32 }));
  const aluDark = L.add(
    "struct",
    new THREE.MeshStandardMaterial({ color: 0x6b7682, metalness: 0.8, roughness: 0.4 })
  );
  const hotStamp = L.add(
    "struct",
    new THREE.MeshStandardMaterial({ color: 0x8d9aab, metalness: 0.75, roughness: 0.35 })
  );

  const techMat = L.add("tech", new THREE.MeshStandardMaterial({ color: 0x2b3342, metalness: 0.5, roughness: 0.45 }));
  const techFin = L.add("tech", new THREE.MeshStandardMaterial({ color: 0x9aa6b5, metalness: 0.9, roughness: 0.3 }));
  const harnessMat = L.add(
    "tech",
    new THREE.MeshStandardMaterial({ color: 0xe0715f, emissive: 0x4a1a12, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  const thermalMat = L.add(
    "tech",
    new THREE.MeshStandardMaterial({ color: 0x4c6ef5, metalness: 0.55, roughness: 0.35 })
  );
  const sensorGlass = L.add(
    "tech",
    new THREE.MeshPhysicalMaterial({ color: 0x0b0e14, metalness: 0.3, roughness: 0.05, clearcoat: 1 })
  );
  const uiTex = canvasTexture(THREE, 512, 320, (g, w, h) => {
    // A Tesla-style split UI: vehicle visualisation left, navigation right.
    g.fillStyle = "#0b0f15";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#121a24";
    g.fillRect(w * 0.36, 0, w * 0.64, h);
    g.strokeStyle = "#1f2b3a";
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.moveTo(w * 0.36, (i * h) / 13);
      g.lineTo(w, (i * h) / 13 + 30);
      g.stroke();
      g.beginPath();
      g.moveTo(w * 0.36 + (i * w) / 18, 0);
      g.lineTo(w * 0.36 + (i * w) / 18 - 20, h);
      g.stroke();
    }
    g.strokeStyle = "#3aa6ff";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(w * 0.5, h * 0.95);
    g.bezierCurveTo(w * 0.55, h * 0.6, w * 0.8, h * 0.6, w * 0.85, h * 0.12);
    g.stroke();
    g.fillStyle = "#e8edf3";
    g.beginPath();
    g.ellipse(w * 0.18, h * 0.55, w * 0.06, h * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#9aa4ae";
    g.font = "bold 44px Arial";
    g.fillText("72", w * 0.04, h * 0.17);
    g.font = "16px Arial";
    g.fillText("km/h", w * 0.04, h * 0.25);
  });
  const screenMat = L.add(
    "tech",
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: uiTex, emissiveIntensity: 1.1 })
  );

  const batteryMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0x2e86ab, metalness: 0.55, roughness: 0.35 })
  );
  const batteryLid = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0x245f7c, metalness: 0.6, roughness: 0.4 })
  );
  const moduleMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0x3aa0c9, metalness: 0.4, roughness: 0.35 })
  );
  const motorMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0xd96c2b, metalness: 0.55, roughness: 0.32 })
  );
  const castMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0xa9b1ba, metalness: 0.8, roughness: 0.42 })
  );
  const magnetMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0x9c6b30, metalness: 0.7, roughness: 0.3 })
  );
  const hvMat = L.add(
    "power",
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0x4a1d00, emissiveIntensity: 0.4, roughness: 0.45 })
  );
  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x8fd8ea,
    metalness: 0.5,
    roughness: 0.3,
    emissive: 0x123844,
    emissiveIntensity: 0.4,
  });

  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.92 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x2e3238, metalness: 0.85, roughness: 0.28 });
  const rimFace = new THREE.MeshStandardMaterial({ color: 0x8b939c, metalness: 0.95, roughness: 0.18 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x8e959c, metalness: 0.9, roughness: 0.38 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, metalness: 0.3, roughness: 0.35 });

  // ---------------------------------------------------------------- body surface
  // Side-view top centreline (bumper -> hood -> windscreen -> roof -> fastback -> tail).
  const yTop = profile([
    [XF, 0.48],
    [2.3, 0.6],
    [2.2, 0.68],
    [2.0, 0.745],
    [1.6, 0.825],
    [1.2, 0.88],
    [0.93, 0.92],
    [0.6, 1.13],
    [0.3, 1.31],
    [0.0, 1.405],
    [-0.3, 1.44],
    [-0.65, 1.42],
    [-1.0, 1.335],
    [-1.4, 1.2],
    [-1.75, 1.09],
    [-1.98, 1.035],
    [-2.15, 1.015],
    [-2.26, 0.975],
    [-2.32, 0.9],
    [XR, 0.82],
  ]);
  // Shoulder / beltline.
  const yBelt = profile([
    [XF, 0.46],
    [2.25, 0.6],
    [2.0, 0.705],
    [1.5, 0.79],
    [1.0, 0.855],
    [0.5, 0.895],
    [-0.5, 0.93],
    [-1.5, 0.965],
    [-2.0, 0.985],
    [-2.25, 0.95],
    [XR, 0.8],
  ]);
  // Plan-view half width (rounded nose, slight rear "hips").
  const wPlan = profile([
    [XF, 0.0],
    [2.338, 0.3],
    [2.315, 0.5],
    [2.25, 0.665],
    [2.12, 0.785],
    [1.9, 0.865],
    [1.6, 0.905],
    [1.2, 0.915],
    [0.0, 0.92],
    [-1.4, 0.93],
    [-1.8, 0.912],
    [-2.1, 0.85],
    [-2.25, 0.76],
    [-2.32, 0.6],
    [-2.34, 0.4],
    [XR, 0.0],
  ]);
  const yBase = profile([
    [XR, 0.3],
    [-2.2, 0.26],
    [-1.95, 0.19],
    [-1.0, 0.17],
    [1.0, 0.165],
    [1.95, 0.165],
    [2.2, 0.19],
    [XF, 0.24],
  ]);
  const archY = (x: number) => {
    let y = -1;
    for (const c of [FA, RA]) {
      const dx = x - c;
      if (Math.abs(dx) < ARCH) y = Math.max(y, WR + Math.sqrt(ARCH * ARCH - dx * dx));
    }
    return y;
  };
  const archAmt = (x: number) =>
    Math.max(...[FA, RA].map((c) => smoothstep(ARCH + 0.06 - Math.abs(x - c), 0, 0.08)));
  const yLow = (x: number) => Math.max(yBase(x), archY(x));
  const greenhouse = (x: number) => smoothstep(yTop(x) - yBelt(x), 0.07, 0.34);

  const section = (x: number): [number, number][] => {
    const l = yLow(x),
      b = yBelt(x),
      r = yTop(x),
      w = wPlan(x),
      hgt = r - b;
    const s = greenhouse(x);
    const a = archAmt(x);
    return [
      [w * lerp(0.9, 0.985, a), l],
      [w, lerp(l, b, 0.42)],
      [w * 0.975, b],
      [w * (0.955 - 0.1 * s), b + 0.45 * hgt],
      [w * (0.79 - 0.1 * s), b + 0.9 * hgt],
      [0, r],
    ];
  };
  // Rake the nose and tail in side view so they're curved, not a vertical seam.
  const warp = (p: T.Vector3) => {
    const kf = smoothstep(p.x, 1.85, XF);
    if (kf > 0) p.x -= kf * 0.11 * Math.min(1.6, ((p.y - 0.37) / 0.36) ** 2);
    const kr = smoothstep(-p.x, 1.9, -XR);
    if (kr > 0) p.x += kr * 0.045 * Math.min(1.6, ((p.y - 0.62) / 0.35) ** 2);
  };
  const GLASS_H = 0.455; // h above which the greenhouse is glazed
  const isGlass = (x: number, h: number) => h > GLASS_H && yTop(x) - yBelt(x) > 0.11;
  const body = loft(THREE, {
    x0: XR,
    x1: XF,
    section,
    stations: 150,
    perSegment: 9,
    endBias: 0.55,
    breaks: [FA - ARCH, FA + ARCH, RA - ARCH, RA + ARCH],
    warp,
    groups: 2,
    group: (x, h) => (isGlass(x, h) ? 1 : 0),
  });
  mesh(bodyG, body.geometry, [paint, glass]).renderOrder = 2;

  // Glass x-extent (windscreen base -> rear-window base), found numerically.
  let gx0 = 0,
    gx1 = 0;
  for (let x = XF; x > XR; x -= 0.005) if (yTop(x) - yBelt(x) > 0.11) {
      gx1 = x;
      break;
    }
  for (let x = XR; x < XF; x += 0.005) if (yTop(x) - yBelt(x) > 0.11) {
      gx0 = x;
      break;
    }

  for (const side of [1, -1]) {
    // Black belt moulding + glass surround.
    mesh(bodyG, loftLine(THREE, body, [[gx0 + 0.02, GLASS_H], [-0.4, GLASS_H], [0.4, GLASS_H], [gx1 - 0.02, GLASS_H]], side, 0.006), trim);
    // Panel shut lines: front-door leading edge, B-pillar, rear-door trailing edge, sill.
    const shut = (pts: [number, number][]) => mesh(bodyG, loftLine(THREE, body, pts, side, 0.0028, 0.001, 32), trim);
    shut([[0.97, 0.03], [0.96, 0.2], [0.92, GLASS_H - 0.01]]);
    shut([[-0.14, 0.03], [-0.13, 0.2], [-0.12, GLASS_H - 0.01]]);
    shut([[-0.99, 0.08], [-0.98, 0.25], [-0.93, GLASS_H - 0.01]]);
    shut([[0.97, 0.035], [0.0, 0.035], [-0.99, 0.035]]);
    // Hood and boot shut lines along the fender tops.
    shut([[0.93, 0.52], [1.6, 0.53], [2.18, 0.56]]);
    shut([[-1.99, 0.52], [-2.15, 0.53], [-2.26, 0.56]]);
    // Flush door handles.
    for (const hx of [0.55, -0.55]) {
      mesh(bodyG, loftPatch(THREE, body, hx - 0.06, hx + 0.06, () => [0.36, 0.375], side, 0.002, 6, 2), trim);
    }

    // Swept headlamp: thin dark lens tapering back from the front corner, with
    // an LED signature along its upper edge.
    // Defined by target heights (hAtY) so the lamp runs level around the corner.
    const hlR = (x: number): [number, number] | null => {
      const s = clamp01((x - 2.0) / (2.325 - 2.0));
      const top = lerp(0.655, 0.585, s);
      const thick = lerp(0.03, 0.07, Math.sin(Math.min(1, s * 2.2) * Math.PI * 0.5)) * lerp(1, 0.45, smoothstep(s, 0.6, 1));
      return [body.hAtY(x, top - thick), body.hAtY(x, top)];
    };
    mesh(bodyG, loftPatch(THREE, body, 2.0, 2.325, hlR, side, 0.003, 28, 6), lamp);
    mesh(
      bodyG,
      loftPatch(THREE, body, 2.03, 2.3, (x) => {
        const r = hlR(x)!;
        return [r[1] - (r[1] - r[0]) * 0.3, r[1] - (r[1] - r[0]) * 0.12];
      }, side, 0.0045, 24, 2),
      drl
    );
    // Wrap-around tail lamp (side -> boot lid).
    const tlR = (x: number): [number, number] => {
      const s = clamp01((x + 2.335) / (2.335 - 2.0)); // 0 = centre of tail, 1 = side
      const top = lerp(0.925, 0.945, s);
      const thick = lerp(0.035, 0.085, smoothstep(s, 0.0, 0.5)) * lerp(1, 0.35, smoothstep(s, 0.75, 1));
      return [body.hAtY(x, top - thick, 0.75), body.hAtY(x, top, 0.75)];
    };
    mesh(bodyG, loftPatch(THREE, body, -2.335, -2.0, tlR, side, 0.003, 28, 6), tail);
    // Boot-lid shut line across the tail and a lower reflector line.
    shut([[-2.06, body.hAtY(-2.06, 0.80)], [-2.25, body.hAtY(-2.25, 0.80)], [XR + 0.002, body.hAtY(XR + 0.002, 0.8)]]);
    // Lower front intake and rear diffuser band.
    mesh(bodyG, loftPatch(THREE, body, 2.1, XF, (x) => [0.0, body.hAtY(x, 0.3)], side, 0.003, 20, 5), trim);
    mesh(bodyG, loftPatch(THREE, body, XR, -2.1, (x) => [0.0, body.hAtY(x, 0.43)], side, 0.003, 14, 4), trim);
    // Rear bumper crease just above the diffuser.
    shut([[-2.1, body.hAtY(-2.1, 0.5)], [-2.25, body.hAtY(-2.25, 0.5)], [XR, body.hAtY(XR, 0.5)]]);

    // Door mirror on a short stalk.
    const mirror = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), paint);
    cap.scale.set(0.75, 0.48, 0.9);
    mirror.add(cap);
    const mGlass = new THREE.Mesh(new THREE.CircleGeometry(0.068, 20), trim);
    mGlass.scale.set(1.0, 0.62, 1);
    mGlass.rotation.y = -Math.PI / 2;
    mGlass.position.x = -0.068;
    mirror.add(mGlass);
    mirror.position.set(0.79, 0.985, side * 0.98);
    bodyG.add(mirror);
    mesh(bodyG, bar(THREE, [0.81, 0.955, side * 0.86], [0.79, 0.975, side * 0.93], 0.018), trim);

    // Wheel-well liners so the arches read as deep openings.
    for (const ax of [FA, RA]) {
      // Upper half-cylinder (theta pi/2..3pi/2 maps to +y once the axis is turned to z).
      const liner = new THREE.CylinderGeometry(ARCH - 0.01, ARCH - 0.01, 0.34, 32, 1, true, Math.PI / 2, Math.PI);
      liner.rotateX(Math.PI / 2);
      const m = mesh(bodyG, liner, under, [ax, WR, side * 0.74]);
      m.renderOrder = -1;
    }
  }
  // Rear "T"-style badge and front emblem.
  mesh(bodyG, roundedBox(THREE, 0.09, 0.012, 0.004, 0.003), trim, [XF - 0.035, 0.53, 0]).rotation.set(0, Math.PI / 2, 0);
  // Flat undertray.
  const tray = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.55), under);
  tray.rotation.x = Math.PI / 2;
  tray.position.set(0.0, 0.175, 0);
  bodyG.add(tray);

  // ---------------------------------------------------------------- interior
  const seat = (x: number, z: number, w = 0.5) => {
    const g = new THREE.Group();
    const cushion = new THREE.Mesh(roundedBox(THREE, 0.5, 0.13, w, 0.05), seatMat);
    cushion.position.set(0, 0.4, 0);
    g.add(cushion);
    const back = new THREE.Mesh(roundedBox(THREE, 0.12, 0.62, w * 0.94, 0.05), seatMat);
    back.position.set(-0.25, 0.72, 0);
    back.rotation.z = 0.2;
    g.add(back);
    const head = new THREE.Mesh(roundedBox(THREE, 0.1, 0.16, w * 0.55, 0.04), seatMat);
    head.position.set(-0.33, 1.1, 0);
    head.rotation.z = 0.2;
    g.add(head);
    g.position.set(x, 0, z);
    bodyG.add(g);
  };
  seat(0.12, 0.38);
  seat(0.12, -0.38);
  seat(-0.86, 0.0, 1.32);
  // Minimalist dash: one horizontal slab with a wood band, no cluster.
  mesh(bodyG, roundedBox(THREE, 0.3, 0.16, 1.5, 0.06), cabinDark, [0.72, 0.8, 0]);
  mesh(bodyG, roundedBox(THREE, 0.04, 0.05, 1.48, 0.015), woodMat, [0.57, 0.8, 0]);
  mesh(bodyG, roundedBox(THREE, 0.9, 0.12, 0.26, 0.04), cabinDark, [0.15, 0.48, 0]); // centre console
  // Steering wheel.
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 36), cabinDark);
  wheel.position.set(0.55, 0.92, 0.38);
  wheel.rotation.set(0, Math.PI / 2, -0.4);
  bodyG.add(wheel);
  mesh(bodyG, bar(THREE, [0.55, 0.92, 0.38], [0.7, 0.88, 0.38], 0.025), cabinDark);

  // ---------------------------------------------------------------- wheels (static)
  const buildWheel = (x: number, side: number) => {
    const g = new THREE.Group();
    // Tyre: lathed section with sidewall bulge, axis -> Z.
    const tyre = lathe(
      THREE,
      [
        [0.243, -0.104],
        [0.285, -0.116],
        [0.318, -0.113],
        [0.332, -0.096],
        [0.336, -0.06],
        [0.336, 0.06],
        [0.332, 0.096],
        [0.318, 0.113],
        [0.285, 0.116],
        [0.243, 0.104],
      ],
      48
    );
    tyre.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(tyre, tyreMat));
    // Rim barrel + lip.
    const barrel = new THREE.CylinderGeometry(0.236, 0.236, 0.2, 40, 1, true);
    barrel.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(barrel, new THREE.MeshStandardMaterial({ color: 0x24272c, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide })));
    const lip = new THREE.TorusGeometry(0.236, 0.008, 6, 48);
    lip.translate(0, 0, 0.1);
    g.add(new THREE.Mesh(lip, rimFace));
    // Five twin spokes (19" Sport-style), slightly dished.
    for (let i = 0; i < 5; i++) {
      for (const d of [-1, 1]) {
        const sp = extrude(
          THREE,
          [
            [-0.017, 0.05],
            [0.017, 0.05],
            [0.012, 0.232],
            [-0.012, 0.232],
          ],
          0.026,
          0.004
        );
        sp.rotateX(-0.14);
        sp.rotateZ(((i * 2 * Math.PI) / 5) + d * 0.13);
        sp.translate(0, 0, 0.078);
        g.add(new THREE.Mesh(sp, rimMat));
      }
    }
    const hub = new THREE.CylinderGeometry(0.062, 0.07, 0.04, 24);
    hub.rotateX(Math.PI / 2);
    hub.translate(0, 0, 0.085);
    g.add(new THREE.Mesh(hub, rimMat));
    const capG = new THREE.CircleGeometry(0.03, 20);
    capG.translate(0, 0, 0.106);
    g.add(new THREE.Mesh(capG, rimFace));
    // Brake disc + caliper behind the spokes.
    const disc = new THREE.CylinderGeometry(0.175, 0.175, 0.026, 40);
    disc.rotateX(Math.PI / 2);
    disc.translate(0, 0, 0.0);
    g.add(new THREE.Mesh(disc, discMat));
    const cal = roundedBox(THREE, 0.13, 0.07, 0.07, 0.02);
    cal.translate(0, 0.16, 0.02);
    const calM = new THREE.Mesh(cal, caliperMat);
    calM.rotation.z = side > 0 ? 0.6 : 0.6;
    g.add(calM);
    g.position.set(x, WR, side * TRACK);
    if (side < 0) g.rotation.y = Math.PI;
    staticG.add(g);
  };
  for (const ax of [FA, RA]) for (const s of [1, -1]) buildWheel(ax, s);
  staticG.add(contactShadow(THREE, 5.6, 2.5, 0.65));

  // ---------------------------------------------------------------- body-in-white
  for (const side of [1, -1]) {
    const rail = (pts: [number, number][], r: number, m = alu) => mesh(structG, loftLine(THREE, body, pts, side, r, -0.03, 64), m);
    // Greenhouse ring: A-pillar -> roof rail -> C-pillar.
    rail([[gx1 - 0.02, 0.5], [0.5, 0.8], [0.0, 0.84], [-0.7, 0.84], [-1.4, 0.8], [gx0 + 0.03, 0.55]], 0.026);
    rail([[0.95, GLASS_H], [0.0, GLASS_H], [-1.0, GLASS_H], [-1.95, GLASS_H]], 0.02); // belt
    rail([[1.0, 0.04], [0.0, 0.04], [-1.0, 0.04]], 0.04, hotStamp); // sill
    rail([[-0.13, 0.04], [-0.13, 0.4], [-0.13, 0.84]], 0.03, hotStamp); // B-pillar
    rail([[0.94, 0.04], [0.93, 0.3], [gx1 - 0.02, 0.5]], 0.026, hotStamp); // hinge pillar
    rail([[-1.0, 0.1], [-1.05, 0.4], [-1.25, 0.82]], 0.024); // C-pillar inner
    // Front and rear longitudinal crash rails.
    mesh(structG, bar(THREE, [0.9, 0.4, side * 0.45], [2.18, 0.4, side * 0.45], 0.04), aluDark);
    mesh(structG, bar(THREE, [-0.95, 0.42, side * 0.5], [-2.15, 0.44, side * 0.5], 0.04), aluDark);
    // Shock towers.
    mesh(structG, lathe(THREE, [[0.16, 0], [0.13, 0.18], [0.09, 0.3], [0.0, 0.31]], 20), aluDark, [FA, 0.45, side * 0.6]);
    mesh(structG, lathe(THREE, [[0.15, 0], [0.12, 0.16], [0.08, 0.27], [0.0, 0.28]], 20), aluDark, [RA, 0.45, side * 0.62]);
    // Coil springs.
    for (const ax of [FA, RA]) {
      const coilPts: Vec3[] = [];
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2 * 5;
        coilPts.push([ax + Math.cos(a) * 0.065, 0.38 + (i / 60) * 0.3, side * 0.6 + Math.sin(a) * 0.065]);
      }
      mesh(structG, tube(THREE, coilPts, 0.011, 6, false, 240), hotStamp);
    }
  }
  // Roof bows, windscreen header, cross members.
  const bow = (x: number, h: number, r: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) pts.push([x, lerp(h, 1, i / 8)]);
    mesh(structG, loftLine(THREE, body, pts, 1, r, -0.03, 16), alu);
    mesh(structG, loftLine(THREE, body, pts, -1, r, -0.03, 16), alu);
  };
  bow(0.12, 0.84, 0.024);
  bow(-0.6, 0.84, 0.018);
  bow(-1.3, 0.81, 0.022);
  mesh(structG, bar(THREE, [2.22, 0.4, -0.62], [2.22, 0.4, 0.62], 0.035), alu); // front bumper beam
  mesh(structG, bar(THREE, [-2.2, 0.44, -0.62], [-2.2, 0.44, 0.62], 0.035), alu);
  for (const x of [0.95, 0.3, -0.5, -1.0])
    mesh(structG, bar(THREE, [x, 0.22, -0.84], [x, 0.22, 0.84], 0.03), hotStamp);
  mesh(structG, roundedBox(THREE, 0.08, 0.38, 1.62, 0.03), aluDark, [0.94, 0.55, 0]); // firewall cross-car beam
  // Rear underbody mega-casting.
  mesh(structG, roundedBox(THREE, 0.9, 0.12, 1.3, 0.05), aluDark, [-1.75, 0.3, 0]);
  // Front cast subframe.
  mesh(structG, roundedBox(THREE, 0.6, 0.08, 1.25, 0.04), aluDark, [1.55, 0.2, 0]);

  // ---------------------------------------------------------------- technology
  // Central compute (autopilot/infotainment computer) with cooling fins.
  mesh(techG, roundedBox(THREE, 0.24, 0.07, 0.32, 0.015), techMat, [0.3, 0.34, 0]);
  for (let i = 0; i < 9; i++) mesh(techG, new THREE.BoxGeometry(0.22, 0.03, 0.006), techFin, [0.3, 0.39, -0.12 + i * 0.03]);
  // 15" landscape centre display floating above the dash.
  const scr = new THREE.Group();
  scr.add(new THREE.Mesh(roundedBox(THREE, 0.02, 0.22, 0.38, 0.012), techMat));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), screenMat);
  face.rotation.y = Math.PI / 2;
  face.position.x = 0.011;
  scr.add(face);
  scr.position.set(1.05, 1.0, 0);
  scr.rotation.z = 0.28;
  techG.add(scr);
  mesh(techG, bar(THREE, [0.84, 0.94, 0], [0.73, 0.97, 0], 0.012), techMat);
  // Camera cluster behind the windscreen, B-pillar and repeater cameras, bumper radar.
  mesh(techG, roundedBox(THREE, 0.08, 0.05, 0.16, 0.015), sensorGlass, [0.15, 1.34, 0]);
  for (const s of [1, -1]) {
    mesh(techG, roundedBox(THREE, 0.04, 0.05, 0.02, 0.008), sensorGlass, [-0.12, 0.98, s * 0.88]);
    mesh(techG, roundedBox(THREE, 0.05, 0.025, 0.02, 0.008), sensorGlass, [1.3, 0.7, s * 0.9]);
    mesh(techG, new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20).rotateX(Math.PI / 2), techMat, [0.6, 0.55, s * 0.83]); // speakers
  }
  mesh(techG, roundedBox(THREE, 0.04, 0.07, 0.14, 0.015), techMat, [2.27, 0.33, 0]);
  // Low-voltage harness looms.
  const loom = (pts: Vec3[], r: number) => mesh(techG, tube(THREE, pts, r, 6), harnessMat);
  loom([[-1.5, 0.24, 0], [-0.4, 0.26, 0.3], [0.3, 0.32, 0.2], [0.9, 0.55, 0.1], [1.05, 0.9, 0]], 0.014);
  loom([[0.3, 0.32, 0], [0.3, 0.33, 0.7], [0.55, 0.6, 0.84], [0.9, 0.85, 0.8]], 0.011);
  loom([[0.3, 0.32, 0], [-0.8, 0.3, -0.6], [-1.7, 0.42, -0.6], [-2.15, 0.5, -0.55]], 0.011);
  loom([[0.95, 0.6, 0.2], [1.5, 0.55, 0.5], [2.1, 0.45, 0.55]], 0.01);
  loom([[-0.12, 0.3, 0.75], [-0.12, 0.9, 0.86]], 0.009);
  // Thermal: front heat exchanger + "octovalve" manifold, coolant lines to pack.
  mesh(techG, roundedBox(THREE, 0.06, 0.32, 1.0, 0.02), thermalMat, [2.08, 0.42, 0]);
  for (let i = 0; i < 14; i++) mesh(techG, new THREE.BoxGeometry(0.065, 0.3, 0.006), techFin, [2.08, 0.42, -0.46 + i * 0.07]);
  mesh(techG, roundedBox(THREE, 0.18, 0.16, 0.22, 0.04), thermalMat, [1.75, 0.55, 0.42]);
  mesh(techG, tube(THREE, [[1.75, 0.5, 0.35], [1.4, 0.35, 0.3], [0.9, 0.25, 0.32]], 0.016, 8), thermalMat);
  mesh(techG, tube(THREE, [[1.75, 0.5, 0.5], [2.0, 0.45, 0.45]], 0.016, 8), thermalMat);

  // ---------------------------------------------------------------- powertrain
  // Skateboard pack: one structural tray between the axles (deep-dive stage 0).
  const batteryPack = new THREE.Group();
  batteryPack.add(new THREE.Mesh(roundedBox(THREE, 3.05, 0.16, 1.65, 0.05), batteryMat));
  for (let i = 0; i < 11; i++)
    batteryPack.add(new THREE.Mesh(roundedBox(THREE, 0.05, 0.012, 1.5, 0.005), batteryLid).translateX(-1.35 + i * 0.27).translateY(0.084));
  batteryPack.add(new THREE.Mesh(roundedBox(THREE, 0.22, 0.09, 0.4, 0.03), hvMat).translateX(1.3).translateY(0.11)); // HV junction
  batteryPack.position.set(-0.15, 0.13, 0);
  powerG.add(batteryPack);

  const modulesGroup = new THREE.Group();
  modulesGroup.visible = false;
  const MODULE_COUNT = 8;
  const moduleMeshes: T.Mesh[] = [];
  for (let i = 0; i < MODULE_COUNT; i++) {
    const mg = new THREE.Mesh(roundedBox(THREE, 0.32, 0.14, 1.5, 0.025), moduleMat);
    mg.userData.baseX = -1.5 + i * 0.38 + 0.19;
    mg.position.set(mg.userData.baseX, 0.13, 0);
    modulesGroup.add(mg);
    moduleMeshes.push(mg);
  }
  powerG.add(modulesGroup);
  const CELLS_PER_MODULE = 12;
  const cellInstances = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.2, 12),
    cellMat,
    MODULE_COUNT * CELLS_PER_MODULE
  );
  cellInstances.visible = false;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let mi = 0; mi < MODULE_COUNT; mi++)
    for (let ci = 0; ci < CELLS_PER_MODULE; ci++) {
      const row = ci % 4;
      dummy.position.set(-1.5 + mi * 0.38 + 0.19, 0.13, -0.55 + row * 0.37);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      cellInstances.setMatrixAt(idx++, dummy.matrix);
    }
  powerG.add(cellInstances);

  // Drive units: motor (stator housing + exposed rotor magnets), gearbox
  // casting and inverter, with half-shafts out to each wheel.
  const driveUnit = (x: number, scale: number, invDir: number) => {
    const g = new THREE.Group();
    const housing = lathe(THREE, [[0.0, -0.21], [0.2, -0.21], [0.22, -0.19], [0.22, 0.12], [0.2, 0.14], [0.0, 0.14]], 32);
    housing.rotateX(Math.PI / 2);
    g.add(new THREE.Mesh(housing, motorMat));
    for (let i = 0; i < 10; i++) {
      const rib = new THREE.TorusGeometry(0.222, 0.008, 6, 32);
      rib.translate(0, 0, -0.17 + i * 0.03);
      g.add(new THREE.Mesh(rib, motorMat));
    }
    const rotor = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 20);
    rotor.rotateX(Math.PI / 2);
    rotor.translate(0, 0, -0.235);
    g.add(new THREE.Mesh(rotor, magnetMat));
    g.add(new THREE.Mesh(roundedBox(THREE, 0.34, 0.3, 0.2, 0.06), castMat).translateZ(0.24).translateY(-0.02)); // gearbox
    g.add(new THREE.Mesh(roundedBox(THREE, 0.26, 0.1, 0.28, 0.025), motorMat).translateY(0.24).translateX(invDir * 0.04)); // inverter
    g.scale.setScalar(scale);
    g.position.set(x, WR, 0);
    powerG.add(g);
    for (const s of [1, -1]) {
      mesh(powerG, bar(THREE, [x, WR, s * 0.22], [x, WR, s * (TRACK - 0.1)], 0.022), castMat);
      mesh(powerG, lathe(THREE, [[0.0, -0.05], [0.045, -0.04], [0.035, -0.01], [0.045, 0.02], [0.03, 0.05], [0, 0.05]], 16).rotateX(Math.PI / 2), hvMat, [x, WR, s * 0.28]);
    }
  };
  driveUnit(RA, 1.0, -1);
  driveUnit(FA, 0.82, 1);
  // Power electronics boxes kept where the zone anchors expect them.
  mesh(powerG, roundedBox(THREE, 0.24, 0.16, 0.24, 0.04), motorMat, [-1.05, 0.62, 0.45]);
  mesh(powerG, roundedBox(THREE, 0.24, 0.16, 0.24, 0.04), motorMat, [1.05, 0.62, 0.45]);
  mesh(powerG, roundedBox(THREE, 0.22, 0.13, 0.2, 0.04), motorMat, [-1.75, 0.5, 0.5]); // onboard charger
  // Orange high-voltage cabling.
  const hv = (pts: Vec3[]) => mesh(powerG, tube(THREE, pts, 0.016, 8), hvMat);
  hv([[1.15, 0.24, 0.1], [1.25, 0.4, 0.3], [1.05, 0.55, 0.45]]);
  hv([[1.15, 0.24, -0.1], [1.4, 0.45, -0.05], [FA, 0.58, 0]]);
  hv([[-1.6, 0.22, 0.2], [-1.4, 0.45, 0.35], [-1.05, 0.55, 0.45]]);
  hv([[-1.6, 0.22, -0.1], [-1.5, 0.5, -0.05], [RA, 0.6, 0]]);
  hv([[-1.6, 0.22, 0.5], [-1.75, 0.45, 0.5], [-2.0, 0.55, 0.8]]); // to the charge port

  // ---------------------------------------------------------------- levels
  const SHELL = 1,
    EXO_BASE = def.exoBaseOpacity;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    spreadMeshes: moduleMeshes,
    deep: { batteryPack, modulesGroup, cellInstances, moduleMeshes },
    applyLevel(v: number) {
      const bodyOp = clamp01(1 - v) * SHELL;
      // The frame only shows once the shell starts to peel (a solid Tesla
      // shell hides it), then follows the shared 0 -> 1 -> 2 crossfade.
      const structOp = v <= 1 ? smoothstep(v, 0.05, 0.9) * (EXO_BASE + (1 - EXO_BASE) * v) : tri(v, 1);
      const powerOp = clamp01(v - 2);
      L.set("shell", bodyOp);
      L.set("struct", Math.max(structOp, powerOp * 0.15));
      L.set("tech", tri(v, 2));
      L.set("power", powerOp);
    },
  };
}
