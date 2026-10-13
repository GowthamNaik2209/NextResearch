// Naval shipbuilding — a Project 15B / 17A–style Indian stealth destroyer
// sitting on keel blocks in a graving dock, under a Goliath gantry crane.
//
// +X is the bow. The hull is a lofted surface (flared stealth topsides,
// fine V entry, flat run aft, transom stern, bow sonar dome) painted haze
// grey over red antifouling with a black boot-top. Superstructure is built
// from flat raked "stealth" facets.
//
// Layers are systems rather than nested shells: level 0 shows the whole
// ship in its dock; levels 1-3 each bring one system forward (machinery,
// weapons, superstructure/sensors) and ghost the rest of the ship.
import type * as T from "three";
import {
  type Three,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  contactShadow,
  lerp,
  loft,
  mergeInto,
  layerMats,
  prism,
  profile,
  railing,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

export function buildNaval(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [dockG, propG, combatG, superG] = ctx.layerGroups;
  const L = layerMats();
  const mesh = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material | T.Material[], p?: Vec3) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    parent.add(m);
    return m;
  };
  const std = (color: number, metalness = 0.3, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // ---------------------------------------------------------------- dims
  const XS = -4.0; // transom
  const XB = 4.4; // stem at the waterline station (raked further forward up top)
  const KEEL = 0.14;
  const WL = 0.39;

  // ---------------------------------------------------------------- materials
  const concrete = L.add("dock", std(0x5e646b, 0, 0.92));
  const concreteDark = L.add("dock", std(0x484d54, 0, 0.95));
  const timber = L.add("dock", std(0x6b4f35, 0, 0.85));
  const steelDock = L.add("dock", std(0x4c5560, 0.6, 0.5));
  const craneYellow = L.add("dock", std(0xe0a526, 0.4, 0.45));
  const craneRed = L.add("dock", std(0xb5322a, 0.35, 0.5));
  const cable = L.add("dock", std(0x1d1f22, 0.7, 0.4));

  const hullGrey = L.add("hull", std(0x8b949c, 0.35, 0.5));
  const antifoul = L.add("hull", std(0x8a2a22, 0.1, 0.7));
  const bootTop = L.add("hull", std(0x16181b, 0.2, 0.6));
  const deckMat = L.add("hull", std(0x50565c, 0.2, 0.85));
  const railMat = L.add("hull", std(0xb9c0c7, 0.6, 0.4));
  const darkMetal = L.add("hull", std(0x25292e, 0.6, 0.45));

  const machine = L.add("prop", std(0x7a5cc7, 0.55, 0.35));
  const machineGrey = L.add("prop", std(0x9aa3ad, 0.75, 0.35));
  const bronze = L.add("prop", std(0xc59a5a, 0.95, 0.25));
  const shaftMat = L.add("prop", std(0xc7ccd4, 0.85, 0.25));
  const compMat = L.add("prop", std(0xc99a2e, 0.5, 0.4));

  const weaponGrey = L.add("combat", std(0x9aa2aa, 0.4, 0.45));
  const weaponDark = L.add("combat", std(0x3a3f45, 0.5, 0.45));

  const superGrey = L.add("super", std(0xa3abb3, 0.3, 0.5));
  const superDark = L.add("super", std(0x2b3036, 0.4, 0.5));
  const bridgeGlass = L.add(
    "super",
    new THREE.MeshPhysicalMaterial({ color: 0x0b1118, metalness: 0.6, roughness: 0.08, clearcoat: 1 })
  );
  const radarFace = L.add("super", std(0x34463f, 0.5, 0.35));
  const heloMat = L.add("super", std(0x6f7a84, 0.4, 0.5));

  // Emissive "focus" tint for the system that the current layer is about.
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusCombat = focus([weaponGrey, weaponDark], 0xc9315c);
  const focusSuper = focus([radarFace], 0x1e9e76);

  // ---------------------------------------------------------------- hull
  const yKeel = profile([
    [XS, 0.4],
    [-3.5, 0.27],
    [-2.7, KEEL],
    [2.9, KEEL],
    [3.7, 0.18],
    [4.15, 0.28],
    [XB, 0.42],
  ]);
  const yDeck = profile([
    [XS, 0.66],
    [-2.0, 0.66],
    [0.5, 0.68],
    [2.5, 0.74],
    [3.8, 0.82],
    [XB, 0.86],
  ]);
  const halfBeam = profile([
    [XS, 0.42],
    [-3.0, 0.5],
    [-1.5, 0.53],
    [0.8, 0.53],
    [2.2, 0.47],
    [3.2, 0.33],
    [3.9, 0.16],
    [4.25, 0.05],
    [XB, 0.0],
  ]);
  const section = (x: number): [number, number][] => {
    const k = yKeel(x),
      d = yDeck(x),
      w = halfBeam(x);
    const f = smoothstep(x, 1.0, 4.0); // V-shaped entry forward
    const a = smoothstep(-x, 2.4, 4.0); // flat, wide run aft
    const wl = Math.max(WL, k + 0.05);
    return [
      [0, k],
      [w * lerp(lerp(0.8, 0.94, a), 0.22, f), k + lerp(0.03, 0.14, f)],
      [w * lerp(0.965, 0.72, f), wl],
      [w * 1.0, d - 0.012],
      [w * 0.995, d],
      [w * 0.5, d + 0.012],
      [0, d + 0.016],
    ];
  };
  // Raked stem: the bow leans forward as it rises.
  const warp = (p: T.Vector3) => {
    const k = smoothstep(p.x, 3.0, XB);
    if (k > 0) p.x += k * Math.max(0, p.y - 0.15) * 0.42;
  };
  const H_WL = 2 / 6,
    H_DECK = 4 / 6;
  const hull = loft(THREE, {
    x0: XS,
    x1: XB,
    section,
    stations: 120,
    perSegment: 8,
    endBias: 0.25,
    warp,
    groups: 4,
    group: (_x, h) => (h < H_WL - 0.025 ? 0 : h < H_WL + 0.012 ? 1 : h < H_DECK ? 2 : 3),
  });
  mesh(dockG, hull.geometry, [antifoul, bootTop, hullGrey, deckMat]);

  // Transom cap.
  const tSec = section(XS);
  const tShape = new THREE.Shape();
  const loop = [...tSec, ...tSec.slice(0, -1).reverse().map(([z, y]) => [-z, y] as [number, number])];
  loop.forEach(([z, y], i) => (i ? tShape.lineTo(z, y) : tShape.moveTo(z, y)));
  const transom = new THREE.ShapeGeometry(tShape);
  transom.rotateY(-Math.PI / 2);
  transom.translate(XS, 0, 0);
  mesh(dockG, transom, hullGrey);

  // Bow sonar dome + bilge keels.
  const dome = new THREE.SphereGeometry(1, 28, 16);
  dome.scale(0.62, 0.07, 0.075);
  mesh(dockG, dome, antifoul, [3.72, 0.2, 0]);
  for (const s of [1, -1]) {
    const pts: Vec3[] = [];
    for (let x = -1.4; x <= 1.2; x += 0.2) {
      const p = hull.at(x, 0.2, s, 0.0);
      pts.push([p.x, p.y - 0.01, p.z * 1.04]);
    }
    mesh(dockG, tube(THREE, pts, 0.008, 4), antifoul);
  }

  // Deck-edge railings, bow to transom.
  for (const s of [1, -1]) {
    const pts: Vec3[] = [];
    for (let x = XS + 0.05; x <= XB - 0.05; x += 0.2) {
      const p = hull.at(x, H_DECK, s, -0.012);
      pts.push([p.x, p.y, p.z]);
    }
    mesh(dockG, railing(THREE, pts, 0.045, 0.003, 0.13), railMat);
  }

  // Pennant number on each bow.
  const pennantTex = canvasTexture(THREE, 256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = "bold 96px Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillText("D66", w / 2 + 4, h / 2 + 4);
    g.fillStyle = "#f2f4f6";
    g.fillText("D66", w / 2, h / 2);
  });
  const pennantMat = L.add("hull", new THREE.MeshStandardMaterial({ map: pennantTex, alphaTest: 0.35, roughness: 0.6 }));
  for (const s of [1, -1]) {
    const hp = hull.hAtY(3.25, 0.6, 0.6);
    const p = hull.at(3.25, hp, s, 0.006);
    const n = hull.normal(3.25, hp, s);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), pennantMat);
    pl.position.copy(p);
    pl.lookAt(p.clone().add(n));
    dockG.add(pl);
  }
  // Anchors in their hawse pockets.
  for (const s of [1, -1]) {
    const hp = hull.hAtY(3.95, 0.66, 0.66);
    const p = hull.at(3.95, hp, s, 0.004);
    mesh(dockG, roundedBox(THREE, 0.1, 0.07, 0.02, 0.01), darkMetal, [p.x, p.y, p.z]).lookAt(p.clone().add(hull.normal(3.95, hp, s)));
  }

  // ---------------------------------------------------------------- graving dock
  const DOCK_L = 11.2,
    DOCK_HW = 1.25; // inner half-width at floor
  mesh(dockG, new THREE.BoxGeometry(DOCK_L, 0.06, 2 * DOCK_HW + 0.2), concrete, [0, -0.03, 0]);
  // Stepped side walls (altars) and the quay apron.
  for (const s of [1, -1]) {
    const steps = [
      [DOCK_HW, 0.17],
      [DOCK_HW + 0.18, 0.34],
      [DOCK_HW + 0.36, 0.52],
    ];
    steps.forEach(([z, y], i) => {
      mesh(dockG, new THREE.BoxGeometry(DOCK_L, y, 0.18 + (i === 2 ? 1.2 : 0)), i % 2 ? concreteDark : concrete, [
        0,
        y / 2,
        s * (z + 0.09 + (i === 2 ? 0.6 : 0)),
      ]);
    });
    // Bollards and quay-edge kerb.
    for (let x = -4.5; x <= 4.6; x += 1.5) {
      mesh(dockG, new THREE.CylinderGeometry(0.035, 0.045, 0.08, 12), darkMetal, [x, 0.56, s * (DOCK_HW + 0.5)]);
    }
    // Timber side shores bracing the hull from the altars.
    for (const x of [-2.4, -1.2, 0.0, 1.2, 2.3]) {
      const hp = hull.hAtY(x, 0.5, 0.6);
      const p = hull.at(x, hp, s, 0.01);
      mesh(dockG, bar(THREE, [p.x, p.y, p.z], [x, 0.34, s * (DOCK_HW + 0.2)], 0.018, 6), timber);
    }
  }
  // Head wall and the steel caisson gate at the stern end.
  mesh(dockG, new THREE.BoxGeometry(0.3, 0.52, 2 * DOCK_HW + 1.3), concrete, [DOCK_L / 2 + 0.15, 0.26, 0]);
  mesh(dockG, new THREE.BoxGeometry(0.22, 0.56, 2 * DOCK_HW + 1.3), steelDock, [-DOCK_L / 2 - 0.11, 0.28, 0]);
  for (let i = 0; i < 6; i++)
    mesh(dockG, new THREE.BoxGeometry(0.04, 0.5, 0.05), darkMetal, [-DOCK_L / 2 - 0.0, 0.28, -1.5 + i * 0.6]);
  // Keel and bilge blocks.
  for (let x = -2.6; x <= 2.9; x += 0.42) {
    const k = yKeel(x);
    mesh(dockG, new THREE.BoxGeometry(0.16, k, 0.32), timber, [x, k / 2, 0]);
    for (const s of [1, -1]) {
      const p = hull.at(x, 0.15, s);
      if (p.y > 0.05) mesh(dockG, new THREE.BoxGeometry(0.14, p.y - 0.005, 0.14), concreteDark, [x, (p.y - 0.005) / 2, s * p.z * 0.95]);
    }
  }
  // Goliath gantry crane straddling the dock aft of amidships.
  const CX = -1.7,
    CZ = DOCK_HW + 0.95,
    CH = 3.0;
  for (const s of [1, -1]) {
    for (const dx of [-0.32, 0.32]) mesh(dockG, bar(THREE, [CX + dx, 0.52, s * CZ], [CX + dx * 0.35, CH - 0.1, s * CZ], 0.05, 8), craneYellow);
    mesh(dockG, roundedBox(THREE, 0.9, 0.12, 0.3, 0.03), craneYellow, [CX, 0.6, s * CZ]); // bogie
    mesh(dockG, bar(THREE, [CX - 0.25, 1.2, s * CZ], [CX + 0.25, 1.9, s * CZ], 0.02, 6), craneYellow);
  }
  mesh(dockG, roundedBox(THREE, 0.34, 0.3, 2 * CZ + 0.6, 0.04), craneRed, [CX, CH, 0]); // girder
  mesh(dockG, roundedBox(THREE, 0.3, 0.12, 0.3, 0.03), craneYellow, [CX, CH - 0.21, 0.3]); // trolley
  mesh(dockG, roundedBox(THREE, 0.3, 0.28, 0.32, 0.03), craneYellow, [CX, CH + 0.04, CZ + 0.05]); // cab
  for (const dz of [-0.04, 0.04]) mesh(dockG, bar(THREE, [CX, CH - 0.25, 0.3 + dz], [CX, 1.75, 0.3 + dz], 0.006, 4), cable);
  mesh(dockG, roundedBox(THREE, 0.1, 0.12, 0.12, 0.02), craneRed, [CX, 1.7, 0.3]);
  // Luffing jib crane on the far quay.
  {
    const bx = 2.6,
      bz = -(DOCK_HW + 0.95);
    mesh(dockG, new THREE.CylinderGeometry(0.09, 0.12, 1.6, 12), craneYellow, [bx, 1.32, bz]);
    mesh(dockG, roundedBox(THREE, 0.42, 0.26, 0.3, 0.04), craneYellow, [bx - 0.05, 2.2, bz]);
    mesh(dockG, bar(THREE, [bx + 0.1, 2.2, bz], [bx + 1.5, 3.05, bz + 0.7], 0.035, 6), craneRed);
    mesh(dockG, bar(THREE, [bx + 1.5, 3.05, bz + 0.7], [bx + 1.5, 1.6, bz + 0.7], 0.005, 4), cable);
  }
  dockG.add(contactShadow(THREE, 9.5, 1.9, 0.5, 0.004));

  // ---------------------------------------------------------------- machinery (layer 1)
  for (const s of [1, -1]) {
    const z = s * 0.22;
    // Shaft line: gearbox -> stern tube -> propeller.
    mesh(propG, bar(THREE, [-1.75, 0.27, z], [-3.62, 0.19, z], 0.018, 10), shaftMat);
    // A-bracket legs.
    for (const dz of [-0.06, 0.06]) mesh(propG, bar(THREE, [-3.45, 0.19, z], [-3.35, yKeel(-3.35) + 0.04, z * 0.6 + dz], 0.012, 6), machineGrey);
    // Five-bladed controllable-pitch propeller.
    const prop = new THREE.Group();
    prop.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12).scale(1.4, 1, 1), bronze));
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.SphereGeometry(1, 16, 8);
      blade.scale(0.035, 0.12, 0.008);
      blade.translate(0, 0.1, 0);
      blade.rotateY(0.5);
      blade.rotateX((i * 2 * Math.PI) / 5);
      prop.add(new THREE.Mesh(blade, bronze));
    }
    prop.position.set(-3.65, 0.19, z);
    propG.add(prop);
    // Spade rudder.
    const rud = roundedBox(THREE, 0.22, 0.24, 0.025, 0.02);
    mesh(propG, rud, machineGrey, [-3.88, 0.37, z]);
    // Gas turbine module (enclosure + intake plenum) and diesel.
    mesh(propG, roundedBox(THREE, 0.7, 0.2, 0.22, 0.04), machine, [-0.45, 0.32, z]);
    mesh(propG, new THREE.CylinderGeometry(0.07, 0.08, 0.5, 18).rotateZ(Math.PI / 2), machineGrey, [-0.45, 0.32, z]);
    mesh(propG, roundedBox(THREE, 0.5, 0.18, 0.2, 0.04), machine, [-1.25, 0.3, z]);
    for (let i = 0; i < 4; i++) mesh(propG, new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), machineGrey, [-1.42 + i * 0.11, 0.41, z]);
    // Uptake trunk to the funnel.
    mesh(propG, bar(THREE, [-0.45, 0.42, z], [-0.62, 0.95, z * 0.5], 0.05, 10), machineGrey);
  }
  // Combining reduction gearbox and diesel generator sets.
  mesh(propG, roundedBox(THREE, 0.32, 0.26, 0.6, 0.05), machine, [-1.85, 0.3, 0]);
  for (const x of [0.5, 0.85]) for (const s of [1, -1]) mesh(propG, roundedBox(THREE, 0.28, 0.15, 0.16, 0.03), machine, [x, 0.3, s * 0.24]);
  // Specialty components: pumps, valves, battery banks.
  for (let i = 0; i < 4; i++) {
    mesh(propG, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 14), compMat, [-1.2 + i * 0.16, 0.28, -0.33]);
  }
  for (let i = 0; i < 3; i++) mesh(propG, roundedBox(THREE, 0.12, 0.1, 0.1, 0.015), compMat, [-0.9 + i * 0.14, 0.26, 0.38]);
  mesh(propG, tube(THREE, [[-1.25, 0.34, -0.33], [-0.8, 0.4, -0.25], [-0.45, 0.4, 0.0], [0.5, 0.4, 0.1]], 0.012, 6), compMat);

  // ---------------------------------------------------------------- weapons (layer 2)
  // 127 mm main gun in a faceted stealth turret.
  {
    const y = yDeck(3.25) + 0.01;
    mesh(combatG, prism(THREE, [3.02, 3.48, 0.17, y], [3.1, 3.33, 0.115, y + 0.15]), weaponGrey);
    mesh(combatG, bar(THREE, [3.34, y + 0.08, 0], [4.0, y + 0.12, 0], 0.014, 10), weaponGrey);
    mesh(combatG, bar(THREE, [3.96, y + 0.118, 0], [4.02, y + 0.122, 0], 0.02, 10), weaponDark);
    mesh(combatG, new THREE.CylinderGeometry(0.2, 0.22, 0.02, 24), weaponDark, [3.25, y, 0]);
  }
  // Vertical-launch cells: BrahMos (forward) and Barak-8 (aft of the gun).
  const vlsTex = (cols: number, rows: number) =>
    canvasTexture(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = "#7f878f";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#2a2e33";
      g.lineWidth = 5;
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const cw = w / cols,
            ch = h / rows;
          g.strokeRect(i * cw + 6, j * ch + 6, cw - 12, ch - 12);
          g.fillStyle = "#6d757d";
          g.fillRect(i * cw + 12, j * ch + 12, cw - 24, ch - 24);
        }
    });
  const vlsA = L.add("combat", new THREE.MeshStandardMaterial({ map: vlsTex(4, 2), metalness: 0.4, roughness: 0.5 }));
  const vlsB = L.add("combat", new THREE.MeshStandardMaterial({ map: vlsTex(8, 4), metalness: 0.4, roughness: 0.5 }));
  const vlsPlate = (x: number, w: number, d: number, mat: T.Material) => {
    const y = yDeck(x) + 0.014;
    const g = new THREE.BoxGeometry(w, 0.02, d);
    const m = new THREE.Mesh(g, [weaponDark, weaponDark, mat, weaponDark, weaponDark, weaponDark]);
    m.position.set(x, y, 0);
    combatG.add(m);
  };
  vlsPlate(2.62, 0.3, 0.36, vlsA);
  vlsPlate(2.2, 0.32, 0.5, vlsB);
  // RBU-6000 anti-submarine rocket launchers ahead of the bridge.
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 14), weaponDark));
    const tubes: T.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 1.6 - Math.PI * 0.3;
      const t = new THREE.CylinderGeometry(0.009, 0.009, 0.14, 6);
      t.rotateZ(Math.PI / 2 - 0.5);
      t.translate(0.0, 0.08 + Math.sin(a) * 0.03, Math.cos(a) * 0.04);
      tubes.push(t);
    }
    g.add(new THREE.Mesh(mergeInto(THREE, tubes), weaponGrey));
    g.position.set(1.98, 1.03, s * 0.17);
    combatG.add(g);
  }
  // AK-630 close-in weapon systems either side of the funnel.
  for (const s of [1, -1]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.06, 16), weaponDark));
    const tur = new THREE.Mesh(roundedBox(THREE, 0.14, 0.09, 0.11, 0.035), weaponGrey);
    tur.position.y = 0.075;
    g.add(tur);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8).rotateZ(Math.PI / 2 - 0.25).translate(0.1, 0.1, 0), weaponDark));
    g.position.set(0.0, 0.98, s * 0.36);
    combatG.add(g);
  }
  // Twin torpedo tubes and Kavach decoy launchers.
  for (const s of [1, -1]) {
    for (const dz of [-0.035, 0.035]) mesh(combatG, bar(THREE, [-1.0, 0.72, s * (0.3 + dz)], [-1.45, 0.72, s * (0.42 + dz)], 0.022, 10), weaponGrey);
    mesh(combatG, roundedBox(THREE, 0.1, 0.06, 0.08, 0.015), weaponDark, [1.0, 1.06, s * 0.4]).rotation.set(0, 0, 0.5);
  }

  // ---------------------------------------------------------------- superstructure & sensors (layer 3)
  const blk = (b: [number, number, number, number], t: [number, number, number, number], m: T.Material = superGrey) =>
    mesh(superG, prism(THREE, b, t), m);
  // Forward block, bridge level, integrated mast.
  blk([0.15, 1.98, 0.5, 0.64], [0.28, 1.84, 0.44, 1.03]);
  blk([0.55, 1.78, 0.42, 1.02], [0.68, 1.64, 0.36, 1.31]);
  // Wrap-around bridge windows on the raked front/side faces.
  {
    const xf = (y: number) => 1.78 - ((y - 1.02) / 0.29) * 0.14 + 0.006;
    const zf = (y: number) => 0.42 - ((y - 1.02) / 0.29) * 0.06 + 0.006;
    blk([1.15, xf(1.16), zf(1.16), 1.16], [1.15, xf(1.25), zf(1.25), 1.25], bridgeGlass);
    for (const s of [1, -1]) mesh(superG, prism(THREE, [1.3, 1.62, 0.07, 1.18], [1.34, 1.6, 0.06, 1.21], s * 0.5), superGrey); // bridge wings
  }
  blk([0.82, 1.48, 0.3, 1.3], [0.98, 1.32, 0.17, 2.46]);
  // MF-STAR: four octagonal AESA faces round the mast.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), radarFace);
    const r = 0.232;
    face.position.set(1.15 + Math.cos(a) * r, 2.12, Math.sin(a) * r);
    face.lookAt(1.15 + Math.cos(a) * 2, 2.12 + 0.25, Math.sin(a) * 2);
    face.rotateZ(Math.PI / 8);
    superG.add(face);
  }
  // Pole mast, yards, ESM radomes.
  mesh(superG, bar(THREE, [1.15, 2.45, 0], [1.15, 3.05, 0], 0.025, 8), superGrey);
  mesh(superG, bar(THREE, [1.15, 2.72, -0.22], [1.15, 2.72, 0.22], 0.012, 6), superGrey);
  mesh(superG, new THREE.SphereGeometry(0.06, 16, 12), radarFace, [1.15, 2.95, 0]);
  for (const s of [1, -1]) mesh(superG, new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), radarFace, [1.15, 2.76, s * 0.2]);
  // Midships deckhouse, stealth funnel with exhaust cap.
  blk([-1.95, 0.2, 0.47, 0.64], [-1.88, 0.15, 0.41, 0.95]);
  blk([-0.98, -0.24, 0.33, 0.94], [-0.88, -0.4, 0.24, 1.46]);
  blk([-0.89, -0.4, 0.245, 1.46], [-0.87, -0.42, 0.23, 1.5], superDark);
  // Aft superstructure: hangar, aft mast with rotating air-search radar.
  blk([-3.02, -1.88, 0.5, 0.64], [-2.96, -1.94, 0.44, 1.1]);
  mesh(superG, new THREE.PlaneGeometry(0.7, 0.36).rotateY(-Math.PI / 2), superDark, [-2.975, 0.86, 0]); // hangar door
  blk([-2.5, -2.1, 0.16, 1.09], [-2.42, -2.18, 0.1, 1.62]);
  mesh(superG, roundedBox(THREE, 0.06, 0.12, 0.5, 0.02), radarFace, [-2.3, 1.72, 0]);
  // Flight deck with markings.
  const fdTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#4d5359";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e9ecef";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#e5c33a";
    g.beginPath();
    g.moveTo(w * 0.5, 0);
    g.lineTo(w * 0.5, h);
    g.stroke();
    g.strokeStyle = "#e9ecef";
    g.strokeRect(6, 6, w - 12, h - 12);
  });
  const fdMat = L.add("super", new THREE.MeshStandardMaterial({ map: fdTex, roughness: 0.85 }));
  const fd = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.82).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), fdMat);
  fd.position.set(-3.5, yDeck(-3.5) + 0.02, 0);
  superG.add(fd);
  // Embarked helicopter on deck.
  {
    const h = new THREE.Group();
    const fus = new THREE.SphereGeometry(1, 20, 14);
    fus.scale(0.22, 0.07, 0.07);
    h.add(new THREE.Mesh(fus, heloMat));
    h.add(new THREE.Mesh(bar(THREE, [-0.15, 0.02, 0], [-0.45, 0.05, 0], 0.018, 8), heloMat));
    h.add(new THREE.Mesh(roundedBox(THREE, 0.05, 0.08, 0.01, 0.005), heloMat).translateX(-0.45).translateY(0.08));
    for (let i = 0; i < 4; i++) {
      const b = new THREE.BoxGeometry(0.3, 0.004, 0.022);
      b.translate(0.15, 0, 0);
      b.rotateY((i * Math.PI) / 2 + 0.3);
      b.translate(0, 0.09, 0);
      h.add(new THREE.Mesh(b, superDark));
    }
    h.position.set(-3.45, yDeck(-3.45) + 0.1, 0);
    h.rotation.y = Math.PI;
    superG.add(h);
  }
  // Rigid inflatable boats in their davits.
  for (const s of [1, -1]) {
    const boat = new THREE.SphereGeometry(1, 16, 10);
    boat.scale(0.2, 0.045, 0.07);
    mesh(superG, boat, superDark, [-1.35, 0.98, s * 0.44]);
    mesh(superG, bar(THREE, [-1.5, 0.95, s * 0.4], [-1.5, 1.08, s * 0.47], 0.008, 4), superGrey);
    mesh(superG, bar(THREE, [-1.2, 0.95, s * 0.4], [-1.2, 1.08, s * 0.47], 0.008, 4), superGrey);
  }

  // ---------------------------------------------------------------- levels
  const GHOST = 0.2;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const full = clamp01(1 - v);
      L.set("dock", lerp(1, 0.14, clamp01(v)));
      L.set("hull", Math.max(full, 0.24 + 0.1 * clamp01(v - 1)));
      L.set("prop", Math.max(tri(v, 1), v > 1 ? GHOST : 0));
      L.set("combat", Math.max(full, tri(v, 2), GHOST));
      L.set("super", Math.max(full, clamp01(v - 2), GHOST));
      focusCombat(tri(v, 2) * 0.45);
      focusSuper(clamp01(v - 2) * 0.6);
    },
  };
}
