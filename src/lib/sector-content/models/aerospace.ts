// Aerospace components & MRO — an A320neo-class narrow-body on jacks in a
// cutaway MRO hangar (open roof trusses, one clad wall, maintenance docks,
// a spare engine on its transport stand).
//
// Scale ≈ 1 : 6.6 (fuselage 0.6 diameter ≈ 3.95 m, 5.7 long ≈ 37.6 m, span
// 5.4 ≈ 35.8 m). +X is the nose. The fuselage is lofted; wings, tailplane,
// fin and sharklets are true airfoil lifting surfaces; LEAP-1A-style
// nacelles are lathed.
//
// Layers: 0 hangar + aircraft, 1 primary structure (frames, stringers,
// spars, ribs, forgings), 2 engines (cutaway core) + landing gear,
// 3 avionics & cabin. Higher layers ghost the skin.
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
  liftingSurface,
  loft,
  loftLine,
  loftPatch,
  mergeInto,
  profile,
  railing,
  roundedBox,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

export function buildAerospace(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [hangarG, structG, engineG, avioG] = ctx.layerGroups;
  const L = layerMats();
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };
  const std = (color: number, metalness = 0.3, roughness = 0.5, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const DS = THREE.DoubleSide;

  // ---------------------------------------------------------------- materials
  const floorTex = canvasTexture(THREE, 1024, 768, (g, w, h) => {
    g.fillStyle = "#3b4047";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.05)";
    g.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      g.beginPath();
      g.moveTo((i * w) / 24, 0);
      g.lineTo((i * w) / 24, h);
      g.stroke();
    }
    g.strokeStyle = "#e3b23c";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    g.setLineDash([26, 18]);
    g.strokeRect(w * 0.08, h * 0.12, w * 0.84, h * 0.76);
  });
  const floorMat = L.add("hangar", new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.05 }));
  const cladTex = canvasTexture(THREE, 512, 256, (g, w, h) => {
    for (let i = 0; i < 64; i++) {
      g.fillStyle = i % 2 ? "#8a939c" : "#7c858e";
      g.fillRect((i * w) / 64, 0, w / 64 + 1, h);
    }
    g.fillStyle = "#c9315c";
    g.fillRect(0, h * 0.86, w, h * 0.04);
  });
  // FrontSide: the walls face inward, so they vanish when orbiting outside them.
  const cladMat = L.add("hangar", new THREE.MeshStandardMaterial({ map: cladTex, roughness: 0.6, metalness: 0.4 }));
  const steel = L.add("hangar", std(0x59626c, 0.7, 0.4));
  const dockYellow = L.add("hangar", std(0xe2a92a, 0.35, 0.45));
  const toolRed = L.add("hangar", std(0xc9315c, 0.3, 0.45));
  const lampMat = L.add("hangar", std(0xffffff, 0, 0.4, { emissive: 0xfff3dc, emissiveIntensity: 1.6 }));

  const skin = L.add("skin", std(0xf3f5f7, 0.15, 0.32, { side: DS }));
  const belly = L.add("skin", std(0xb9c1c9, 0.3, 0.4, { side: DS }));
  const radomeMat = L.add("skin", std(0xd9dde1, 0.05, 0.45, { side: DS }));
  const finMat = L.add("skin", std(0x1f2c5c, 0.25, 0.35, { side: DS }));
  const winGlass = L.add("skin", std(0x111820, 0.6, 0.12));
  const lineMat = L.add("skin", std(0x8d969f, 0.3, 0.5));
  const cowl = L.add("skin", std(0xeef1f4, 0.2, 0.3, { side: DS }));
  const lipMat = L.add("skin", std(0xc8ced5, 0.95, 0.18, { side: DS }));
  const pylonMat = L.add("skin", std(0xdfe3e7, 0.2, 0.35));

  const frameMat = L.add("struct", std(0xbcc6d0, 0.85, 0.3));
  const sparMat = L.add("struct", std(0x4c6ef5, 0.6, 0.35));
  const forging = L.add("struct", std(0x8b5e34, 0.8, 0.35));

  const fanMat = L.add("engine", std(0x2b2f35, 0.9, 0.25, { side: DS }));
  const spinner = L.add("engine", std(0x1a1d21, 0.6, 0.3));
  const coreMat = L.add("core", std(0x7a5cc7, 0.7, 0.3));
  const hotMat = L.add("core", std(0xd9622b, 0.6, 0.35, { emissive: 0x5a1a00, emissiveIntensity: 0.6 }));
  const compMat = L.add("core", std(0xb8c0c8, 0.9, 0.25));

  const gearMat = L.add("gear", std(0xc7cdd3, 0.9, 0.25));
  const tyreMat = L.add("gear", std(0x161719, 0.1, 0.9));
  const hubMat = L.add("gear", std(0x9aa3ad, 0.8, 0.3));
  const gearAccent = L.add("gear", std(0xc99a2e, 0.6, 0.35));

  const avioMat = L.add("avio", std(0x23302c, 0.5, 0.4, { emissive: 0x1e9e76, emissiveIntensity: 0.35 }));
  const avioDish = L.add("avio", std(0x9aa3ad, 0.8, 0.3));
  const harness = L.add("avio", std(0x1e9e76, 0.3, 0.5, { emissive: 0x0b3a2b, emissiveIntensity: 0.5 }));
  const seatMat = L.add("cabin", std(0x34406a, 0.1, 0.7));
  const screenMat = L.add("avio", std(0x000000, 0, 0.4, { emissive: 0x6fd3ff, emissiveIntensity: 1.2 }));

  // ---------------------------------------------------------------- fuselage
  const XN = 2.85,
    XT = -2.85;
  const rad = profile([
    [XN, 0.0],
    [2.84, 0.06],
    [2.8, 0.11],
    [2.72, 0.17],
    [2.6, 0.225],
    [2.42, 0.268],
    [2.2, 0.29],
    [1.95, 0.3],
    [-1.3, 0.3],
    [-1.8, 0.272],
    [-2.3, 0.195],
    [-2.65, 0.115],
    [-2.82, 0.055],
    [XT, 0.0],
  ]);
  const yc = profile([
    [XN, 0.56],
    [2.55, 0.6],
    [2.2, 0.62],
    [-1.3, 0.62],
    [-2.0, 0.665],
    [-2.5, 0.74],
    [XT, 0.81],
  ]);
  const fusSection = (x: number): [number, number][] => {
    const r = rad(x),
      c = yc(x);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 6; i++) {
      const th = (i / 6) * Math.PI;
      // Nose: the crown drops faster than the chin (cockpit brow).
      const topK = x > 2.1 && th > Math.PI / 2 ? lerp(1, 0.9, (x - 2.1) / 0.75) : 1;
      pts.push([r * Math.sin(th), c - r * 1.03 * Math.cos(th) * topK]);
    }
    return pts;
  };
  const fus = loft(THREE, {
    x0: XT,
    x1: XN,
    section: fusSection,
    stations: 140,
    perSegment: 6,
    endBias: 0.45,
    groups: 3,
    group: (x, h) => (x > 2.76 ? 2 : h < 0.22 ? 1 : 0),
  });
  mesh(hangarG, fus.geometry, [skin, belly, radomeMat]);

  // Cabin windows, cockpit glazing, door outlines.
  const winGeos: T.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    for (let x = -1.95; x <= 1.8; x += 0.118) {
      if (Math.abs(x - 0.2) < 0.06) continue; // overwing exit frame gap
      const hc = fus.hAtY(x, yc(x) + 0.075, 1);
      winGeos.push(loftPatch(THREE, fus, x - 0.021, x + 0.021, () => [hc - 0.03, hc + 0.03], s, 0.0025, 3, 3));
    }
    winGeos.push(
      loftPatch(
        THREE,
        fus,
        2.42,
        2.64,
        (x) => {
          // Thin glazing band whose sill dips slightly toward the nose.
          const t = (x - 2.42) / 0.22;
          return [fus.hAtY(x, lerp(0.705, 0.69, t), 1), fus.hAtY(x, lerp(0.755, 0.745, t), 1)];
        },
        s,
        0.003,
        10,
        4
      )
    );
    // Cockpit window mullions.
    for (const mx of [2.5, 2.585])
      mesh(hangarG, loftLine(THREE, fus, [[mx, fus.hAtY(mx, 0.69, 1)], [mx + 0.01, fus.hAtY(mx + 0.01, 0.758, 1)]], s, 0.004, 0.004, 6), lineMat);
    const door = (x0: number, x1: number) => {
      const h0 = fus.hAtY(x0, yc(x0) - 0.1, 1),
        h1 = fus.hAtY(x0, yc(x0) + 0.14, 1);
      mesh(hangarG, loftLine(THREE, fus, [[x0, h0], [x1, h0], [x1, h1], [x0, h1], [x0, h0]], s, 0.0028, 0.002, 40), lineMat);
    };
    door(2.12, 2.27);
    door(-2.05, -1.9);
    door(0.14, 0.26);
  }
  mesh(hangarG, mergeInto(THREE, winGeos), winGlass);
  // Wing-to-body fairing.
  mesh(hangarG, new THREE.SphereGeometry(1, 32, 16).scale(1.15, 0.14, 0.33), belly, [0.0, 0.42, 0]);

  // ---------------------------------------------------------------- wings & tail
  const wingY = (z: number) => 0.44 + Math.max(0, Math.abs(z) - 0.3) * 0.09;
  const wingLE = profile([
    [0, 0.62],
    [0.3, 0.55],
    [1.0, 0.18],
    [2.6, -0.66],
  ]);
  const wingChord = profile([
    [0, 1.05],
    [0.3, 1.0],
    [1.0, 0.6],
    [2.6, 0.24],
  ]);
  for (const s of [1, -1]) {
    const st = [0.0, 0.3, 0.65, 1.0, 1.5, 2.0, 2.6].map((z) => ({
      le: [wingLE(z), wingY(z), s * z] as Vec3,
      chord: wingChord(z),
      t: lerp(0.15, 0.1, z / 2.6),
    }));
    mesh(hangarG, liftingSurface(THREE, st), skin);
    // Sharklet.
    mesh(
      hangarG,
      liftingSurface(
        THREE,
        [
          { le: [-0.655, wingY(2.6) - 0.005, s * 2.595], chord: 0.235, t: 0.1 },
          { le: [-0.7, wingY(2.6) + 0.05, s * 2.64], chord: 0.2, t: 0.09 },
          { le: [-0.83, wingY(2.6) + 0.26, s * 2.68], chord: 0.11, t: 0.08 },
        ],
        [0, 0, 1],
        12
      ),
      finMat
    );
    // Flap-track fairings.
    for (const z of [0.7, 1.35, 1.95]) {
      const te = wingLE(z) - wingChord(z);
      mesh(hangarG, new THREE.SphereGeometry(1, 14, 8).scale(0.24, 0.032, 0.028), belly, [te + 0.05, wingY(z) - 0.035, s * z]);
    }
    // Horizontal stabiliser.
    mesh(
      hangarG,
      liftingSurface(THREE, [
        { le: [-2.08, 0.73, 0], chord: 0.64, t: 0.1, camber: 0 },
        { le: [-2.18, 0.745, s * 0.25], chord: 0.58, t: 0.1, camber: 0 },
        { le: [-2.66, 0.83, s * 1.0], chord: 0.25, t: 0.09, camber: 0 },
      ]),
      skin
    );
  }
  // Fin (navy livery) with a subtle highlight stripe.
  mesh(
    hangarG,
    liftingSurface(
      THREE,
      [
        { le: [-1.66, 0.84, 0], chord: 1.08, t: 0.11, camber: 0 },
        { le: [-1.95, 1.18, 0], chord: 0.82, t: 0.11, camber: 0 },
        { le: [-2.47, 1.8, 0], chord: 0.42, t: 0.1, camber: 0 },
      ],
      [0, 0, 1]
    ),
    finMat
  );
  mesh(hangarG, bar(THREE, [-1.75, 0.98, 0], [-2.38, 1.73, 0], 0.004, 4), lipMat);
  mesh(hangarG, new THREE.CylinderGeometry(0.018, 0.012, 0.05, 10).rotateZ(Math.PI / 2), lineMat, [-2.86, 0.81, 0]); // APU exhaust

  // ---------------------------------------------------------------- engines (LEAP-1A style)
  const ENG_Z = 1.1;
  const engY = wingY(ENG_Z) - 0.2;
  const buildEngine = (parent: T.Object3D, withCowlBucket: boolean) => {
    const g = new THREE.Group();
    const along = (geo: T.BufferGeometry) => geo.rotateZ(Math.PI / 2); // lathe axis Y -> -X
    g.add(new THREE.Mesh(along(lathe(THREE, [[0.165, 0.12], [0.17, 0.03], [0.181, 0.0], [0.193, 0.018], [0.2, 0.12], [0.198, 0.3], [0.18, 0.48], [0.142, 0.62]], 48)), withCowlBucket ? cowl : compMat));
    g.add(new THREE.Mesh(along(lathe(THREE, [[0.168, -0.004], [0.183, -0.002], [0.192, 0.016]], 48)), lipMat));
    g.add(new THREE.Mesh(along(lathe(THREE, [[0.115, 0.58], [0.112, 0.7], [0.085, 0.8], [0.05, 0.82]], 32)), withCowlBucket ? cowl : compMat));
    g.add(new THREE.Mesh(along(lathe(THREE, [[0.05, 0.8], [0.04, 0.86], [0.0, 0.92]], 24)), lipMat));
    // Fan: spinner + 18 wide-chord blades.
    g.add(new THREE.Mesh(along(lathe(THREE, [[0.0, 0.04], [0.035, 0.08], [0.055, 0.13], [0.058, 0.15]], 24)), spinner));
    const blades: T.BufferGeometry[] = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.BoxGeometry(0.004, 0.11, 0.045);
      b.translate(0, 0.11, 0);
      b.rotateY(0.55);
      b.rotateX((i / 18) * Math.PI * 2);
      b.translate(-0.15, 0, 0);
      blades.push(b);
    }
    g.add(new THREE.Mesh(mergeInto(THREE, blades), fanMat));
    return g;
  };
  for (const s of [1, -1]) {
    const eng = buildEngine(engineG, true);
    eng.position.set(0.58, engY, s * ENG_Z);
    engineG.add(eng);
    // Pylon.
    const pyl = new THREE.Shape();
    [[0.5, 0.17], [0.05, 0.215], [-0.2, 0.235], [-0.32, 0.2], [-0.12, 0.15], [0.42, 0.14]].forEach(([x, y], i) =>
      i ? pyl.lineTo(x, y) : pyl.moveTo(x, y)
    );
    const pg = new THREE.ExtrudeGeometry(pyl, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    pg.translate(0, 0, -0.025);
    mesh(engineG, pg, pylonMat, [0.3, engY, s * ENG_Z]);
    // Cutaway core: compressor stages -> combustor -> turbine.
    for (let i = 0; i < 10; i++) {
      const r = lerp(0.12, 0.07, i / 9);
      mesh(engineG, new THREE.CylinderGeometry(r, r, 0.018, 24).rotateZ(Math.PI / 2), compMat, [0.58 - 0.2 - i * 0.025, engY, s * ENG_Z]);
    }
    mesh(engineG, new THREE.TorusGeometry(0.085, 0.022, 10, 28).rotateY(Math.PI / 2), hotMat, [0.58 - 0.47, engY, s * ENG_Z]);
    for (let i = 0; i < 5; i++) {
      const r = lerp(0.08, 0.1, i / 4);
      mesh(engineG, new THREE.CylinderGeometry(r, r, 0.016, 24).rotateZ(Math.PI / 2), coreMat, [0.58 - 0.53 - i * 0.03, engY, s * ENG_Z]);
    }
    mesh(engineG, bar(THREE, [0.58 - 0.15, engY, s * ENG_Z], [0.58 - 0.7, engY, s * ENG_Z], 0.012), compMat);
  }

  // ---------------------------------------------------------------- landing gear
  const MAIN_X = -0.1,
    MAIN_Z = 0.57,
    WR = 0.09;
  for (const s of [1, -1]) {
    mesh(engineG, bar(THREE, [MAIN_X + 0.02, wingY(MAIN_Z) - 0.02, s * MAIN_Z], [MAIN_X, WR + 0.03, s * MAIN_Z], 0.016, 12), gearMat);
    mesh(engineG, bar(THREE, [MAIN_X, 0.3, s * MAIN_Z], [MAIN_X, 0.42, s * 0.35], 0.009, 8), gearAccent); // side brace
    mesh(engineG, bar(THREE, [MAIN_X - 0.03, 0.2, s * MAIN_Z], [MAIN_X - 0.03, 0.14, s * MAIN_Z], 0.006, 6), gearAccent); // torque link
    mesh(engineG, bar(THREE, [MAIN_X, WR, s * (MAIN_Z - 0.08)], [MAIN_X, WR, s * (MAIN_Z + 0.08)], 0.01, 8), gearMat);
    for (const dz of [-0.055, 0.055]) {
      const tyre = new THREE.TorusGeometry(WR - 0.022, 0.024, 12, 32).scale(1, 1, 1.4);
      mesh(engineG, tyre, tyreMat, [MAIN_X, WR, s * (MAIN_Z + dz)]);
      mesh(engineG, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20).rotateX(Math.PI / 2), hubMat, [MAIN_X, WR, s * (MAIN_Z + dz)]);
    }
    mesh(engineG, roundedBox(THREE, 0.3, 0.14, 0.008, 0.01), belly, [MAIN_X - 0.02, 0.34, s * (MAIN_Z - 0.08)]); // gear door
  }
  {
    const NX = 2.12,
      NR = 0.055;
    mesh(engineG, bar(THREE, [NX - 0.02, yc(NX) - 0.26, 0], [NX, NR + 0.02, 0], 0.012, 10), gearMat);
    mesh(engineG, bar(THREE, [NX, NR, -0.05], [NX, NR, 0.05], 0.008, 8), gearMat);
    for (const dz of [-0.033, 0.033]) {
      mesh(engineG, new THREE.TorusGeometry(NR - 0.016, 0.017, 10, 24).scale(1, 1, 1.3), tyreMat, [NX, NR, dz]);
      mesh(engineG, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16).rotateX(Math.PI / 2), hubMat, [NX, NR, dz]);
    }
  }
  // Maintenance jacks under the wings and nose (it's in for a check).
  for (const p of [[0.2, 1.4], [0.2, -1.4], [2.3, 0]] as [number, number][]) {
    const top = p[1] === 0 ? yc(2.3) - 0.3 : wingY(Math.abs(p[1])) - 0.03;
    mesh(hangarG, new THREE.CylinderGeometry(0.06, 0.1, 0.06, 4), dockYellow, [p[0], 0.03, p[1]]);
    mesh(hangarG, bar(THREE, [p[0], 0.05, p[1]], [p[0], top, p[1]], 0.014, 8), steel);
  }

  // ---------------------------------------------------------------- primary structure (layer 1)
  const ringGeos: T.BufferGeometry[] = [];
  for (let x = -2.45; x <= 2.55; x += 0.2) {
    const r = rad(x) - 0.012;
    if (r < 0.05) continue;
    const ring = new THREE.TorusGeometry(r, 0.008, 6, 40);
    ring.scale(1, 1.03, 1);
    ring.rotateY(Math.PI / 2);
    ring.translate(x, yc(x), 0);
    ringGeos.push(ring);
  }
  mesh(structG, mergeInto(THREE, ringGeos), frameMat);
  const strGeos: T.BufferGeometry[] = [];
  for (const s of [1, -1]) for (const h of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) strGeos.push(loftLine(THREE, fus, [[-2.5, h], [2.55, h]], s, 0.005, -0.014, 80));
  mesh(structG, mergeInto(THREE, strGeos), frameMat);
  mesh(structG, roundedBox(THREE, 4.6, 0.012, 0.52, 0.004), frameMat, [0.0, 0.5, 0]); // cabin floor grid
  mesh(structG, roundedBox(THREE, 1.0, 0.12, 0.5, 0.02), forging, [0.1, 0.43, 0]); // centre wing box
  for (const s of [1, -1]) {
    for (const f of [0.15, 0.62]) {
      const pts: Vec3[] = [0.3, 1.0, 1.6, 2.2, 2.55].map((z) => [wingLE(z) - f * wingChord(z), wingY(z), s * z]);
      mesh(structG, tube(THREE, pts, 0.012, 6), sparMat);
    }
    for (let z = 0.35; z <= 2.5; z += 0.22) {
      mesh(structG, bar(THREE, [wingLE(z) - 0.12 * wingChord(z), wingY(z), s * z], [wingLE(z) - 0.7 * wingChord(z), wingY(z), s * z], 0.007, 4), sparMat);
    }
    // Forged gear trunnion and engine-mount fittings.
    mesh(structG, roundedBox(THREE, 0.14, 0.06, 0.08, 0.015), forging, [MAIN_X + 0.02, wingY(MAIN_Z) - 0.02, s * MAIN_Z]);
    mesh(structG, roundedBox(THREE, 0.12, 0.05, 0.06, 0.012), forging, [0.42, wingY(ENG_Z) - 0.03, s * ENG_Z]);
  }
  // Tail spars.
  mesh(structG, tube(THREE, [[-1.9, 0.86, 0], [-2.1, 1.2, 0], [-2.55, 1.75, 0]], 0.01, 6), sparMat);

  // ---------------------------------------------------------------- avionics & cabin (layer 3)
  // Weather radar antenna behind the radome, E&E bay racks, cockpit displays.
  mesh(avioG, new THREE.CylinderGeometry(0.12, 0.12, 0.012, 32).rotateZ(Math.PI / 2), avioDish, [2.74, 0.58, 0]);
  for (let i = 0; i < 4; i++) mesh(avioG, roundedBox(THREE, 0.1, 0.12, 0.08, 0.01), avioMat, [2.05 + i * 0.12, 0.42, 0.08 * (i % 2 ? 1 : -1)]);
  for (let i = 0; i < 6; i++)
    mesh(avioG, new THREE.PlaneGeometry(0.05, 0.04).rotateY(Math.PI / 2 + 0.0), screenMat, [2.56, 0.62, -0.13 + i * 0.052]).rotation.z = -0.25;
  // Cabin: 3-3 economy rows (instanced).
  const seatGeo = roundedBox(THREE, 0.05, 0.08, 0.06, 0.012);
  const rows: number[] = [];
  for (let x = -1.9; x <= 1.75; x += 0.118) rows.push(x);
  const seats = new THREE.InstancedMesh(seatGeo, seatMat, rows.length * 6);
  const d = new THREE.Object3D();
  let k = 0;
  for (const x of rows)
    for (const z of [-0.2, -0.135, -0.07, 0.07, 0.135, 0.2]) {
      d.position.set(x, 0.55, z);
      d.updateMatrix();
      seats.setMatrixAt(k++, d.matrix);
    }
  avioG.add(seats);
  // Crown wiring loom and antennas.
  mesh(avioG, tube(THREE, [[2.4, 0.84, 0.05], [1.0, 0.88, 0.05], [-1.0, 0.88, 0.05], [-2.2, 0.85, 0.05]], 0.01, 6), harness);
  mesh(avioG, tube(THREE, [[2.3, 0.45, -0.05], [1.0, 0.36, -0.12], [0.1, 0.4, 0]], 0.009, 6), harness);
  for (const [x, top] of [[1.3, true], [0.3, true], [1.6, false]] as [number, boolean][]) {
    const y = top ? yc(x) + 0.3 : yc(x) - 0.3;
    mesh(avioG, roundedBox(THREE, 0.08, 0.06, 0.012, 0.006), avioMat, [x, y + (top ? 0.03 : -0.03), 0]).rotation.z = top ? -0.4 : 0.4;
  }

  // ---------------------------------------------------------------- MRO hangar (cutaway)
  const HX0 = -3.75,
    HX1 = 3.6,
    HZ = 3.4,
    HH = 2.9;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX1 - HX0 + 1.0, 2 * HZ + 0.6), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((HX0 + HX1) / 2 + 0.3, 0.002, 0);
  hangarG.add(floor);
  // Clad back wall + far side wall.
  mesh(hangarG, new THREE.PlaneGeometry(2 * HZ, HH).rotateY(Math.PI / 2), cladMat, [HX0, HH / 2, 0]);
  mesh(hangarG, new THREE.PlaneGeometry(HX1 - HX0, HH), cladMat, [(HX0 + HX1) / 2, HH / 2, -HZ]);
  // Columns + roof trusses spanning the bay.
  const trussGeos: T.BufferGeometry[] = [];
  for (let x = HX0 + 0.05; x <= HX1; x += 1.22) {
    // Cutaway: the near (+z) side keeps only its back-corner column so nothing
    // stands between the default cameras and the aircraft.
    const backCorner = x < HX0 + 0.1;
    for (const z of backCorner ? [-HZ, HZ] : [-HZ]) trussGeos.push(bar(THREE, [x, 0, z], [x, HH, z], 0.04, 6));
    trussGeos.push(bar(THREE, [x, HH, -HZ], [x, HH, HZ], 0.025, 6));
    trussGeos.push(bar(THREE, [x, HH + 0.35, -HZ], [x, HH + 0.35, HZ], 0.025, 6));
    for (let i = 0; i < 10; i++) {
      const z0 = -HZ + (i * 2 * HZ) / 10,
        z1 = -HZ + ((i + 1) * 2 * HZ) / 10;
      trussGeos.push(bar(THREE, [x, HH, z0], [x, HH + 0.35, z1], 0.012, 4));
      trussGeos.push(bar(THREE, [x, HH + 0.35, z1], [x, HH, z1], 0.012, 4));
    }
  }
  trussGeos.push(bar(THREE, [HX0, HH + 0.35, 0], [HX1, HH + 0.35, 0], 0.02, 6));
  mesh(hangarG, mergeInto(THREE, trussGeos), steel);
  for (let x = HX0 + 0.66; x < HX1; x += 1.22)
    for (const z of [-1.7, 1.7]) mesh(hangarG, roundedBox(THREE, 0.24, 0.04, 0.24, 0.01), lampMat, [x, HH - 0.06, z]);
  // Engine maintenance dock (platform, stairs, railing) beside the near engine.
  {
    const pz = ENG_Z + 0.5,
      py = 0.32;
    mesh(hangarG, roundedBox(THREE, 0.9, 0.03, 0.4, 0.01), dockYellow, [0.4, py, pz]);
    for (const dx of [-0.42, 0.42]) for (const dz of [-0.18, 0.18]) mesh(hangarG, bar(THREE, [0.4 + dx, 0, pz + dz], [0.4 + dx, py, pz + dz], 0.012, 6), dockYellow);
    mesh(hangarG, railing(THREE, [[-0.05, py, pz + 0.2], [0.85, py, pz + 0.2]], 0.16, 0.006, 0.18), dockYellow);
    for (let i = 0; i < 5; i++) mesh(hangarG, new THREE.BoxGeometry(0.16, 0.015, 0.08), dockYellow, [0.95 + i * 0.07, py - (i + 1) * 0.06, pz]);
  }
  // Nose dock.
  mesh(hangarG, roundedBox(THREE, 0.5, 0.03, 0.9, 0.01), dockYellow, [3.15, 0.45, 0]);
  for (const dz of [-0.4, 0.4]) mesh(hangarG, bar(THREE, [3.3, 0, dz], [3.3, 0.45, dz], 0.012, 6), dockYellow);
  mesh(hangarG, railing(THREE, [[2.92, 0.45, 0.45], [3.38, 0.45, 0.45], [3.38, 0.45, -0.45], [2.92, 0.45, -0.45]], 0.14, 0.006, 0.18), dockYellow);
  // Spare engine on its transport stand by the back wall (the engine shop).
  {
    const spare = buildEngine(hangarG, false);
    spare.position.set(-2.75, 0.42, -2.3);
    spare.rotation.y = 0.35;
    hangarG.add(spare);
    mesh(hangarG, roundedBox(THREE, 0.9, 0.08, 0.5, 0.02), dockYellow, [-2.85, 0.12, -2.35]).rotation.y = 0.35;
    for (const dx of [-0.25, 0.2]) mesh(hangarG, bar(THREE, [-2.85 + dx, 0.15, -2.35], [-2.8 + dx * 0.9, 0.3, -2.3], 0.02, 6), dockYellow);
  }
  // Tool carts and parts racks.
  for (let i = 0; i < 3; i++) mesh(hangarG, roundedBox(THREE, 0.32, 0.38, 0.22, 0.02), toolRed, [-3.4 + i * 0.4, 0.19, -3.15]);
  mesh(hangarG, roundedBox(THREE, 0.2, 0.9, 1.4, 0.02), steel, [HX0 + 0.15, 0.45, 1.8]);
  hangarG.add(contactShadow(THREE, 6.2, 5.8, 0.4, 0.006));

  // ---------------------------------------------------------------- levels
  const GHOST = 0.14;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const full = clamp01(1 - v);
      L.set("hangar", lerp(1, 0.22, clamp01(v)));
      L.set("skin", Math.max(full, GHOST));
      L.set("struct", Math.max(tri(v, 1), v > 1 ? 0.12 : 0));
      L.set("engine", Math.max(full, tri(v, 2), GHOST));
      L.set("core", Math.max(tri(v, 2), v > 2 ? GHOST : 0));
      L.set("gear", Math.max(full, tri(v, 2), GHOST + 0.1));
      L.set("avio", clamp01(v - 2));
      L.set("cabin", clamp01(v - 2) * 0.9);
    },
  };
}
