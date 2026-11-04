// Power Transmission & Grid: a miniature grid diorama on a display plinth - how
// electricity gets from a power station to a home, and who builds and runs each step.
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · A 400 kV double-circuit lattice line marches in from the north-west corner
//     (twin-bundle conductors, spacers, insulator strings, earth wire) and lands on
//     the line-entry gantry of a substation in the middle. Beside the second tower a
//     stringing crew pays new conductor off a drum through a tensioner.
//   · Substation yard (gravel, fenced): air-insulated bays with busbars and breakers,
//     two big interconnecting power transformers behind a firewall, a GIS hall
//     (gas-insulated switchgear bays inside), and an HVDC converter: a tall valve hall
//     with thyristor valve towers inside, converter transformers along its west face,
//     smoothing reactors and a bipole DC line leaving the plinth to the north.
//   · From the yard an open underground cable trench (two XLPE circuits on cleats)
//     runs east to a compact substation that feeds a low-voltage line along a row of
//     houses, each with a glowing smart meter by the door.
//   · Transformer factory at the back right: CRGO steel coils, a three-limb core being
//     stacked, copper rod coils and a winding machine, aluminium ingots, a finished
//     tank under the gantry crane; a low-loader on the east road hauls a transformer out.
//   · Grid control centre at the front left: a load-dispatch room with a curved video
//     wall of the national grid, operator desks, and a power-exchange screen showing
//     the day-ahead price curve; a microwave mast beside it.
//
// Layers: 0 Lines & Towers (everything outside), 1 Substation (GIS and valve halls
// section down, the yard comes forward), 2 Factories & Materials (factory sections
// down), 3 Operators & Markets (control centre sections down). Buildings peel with a
// moving world-space clipping plane like ecms.ts; earlier layers ghost, never vanish.
import type * as T from "three";
import {
  type Three,
  type Vec2,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  lathe,
  layerMats,
  lerp,
  mergeInto,
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on.
// Rails stack in the zones' array order (sectors/transmission.ts); sides, order and the exact
// spot on each part are set so no leader line crosses another or runs through another label,
// in every camera view on desktop and phone (scripts/check-crossings.mjs):
// left transcos, markets, transformers; right hvdc; top conductors, towers, switchgear;
// bottom cables, metering, materials.
export const TRANSMISSION_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: lines & towers
  towers: { pos: [-2.6, 1.3, -1.85], side: "top" }, // middle cross-arm of the second lattice tower
  conductors: { pos: [-3.25, 0.17, -0.95], side: "top" }, // conductor drum at the stringing site (east flange)
  cables: { pos: [0.7, -0.085, 1.48], side: "bottom" }, // XLPE cables in the open trench
  metering: { pos: [3.225, 0.116, 2.427], side: "bottom" }, // smart meter on a house wall
  // layer 1: substation
  transformers: { pos: [-0.3, 0.42, 0.6], side: "left" }, // power transformer bushings
  switchgear: { pos: [1.4, 0.26, 0.66], side: "top" }, // GIS circuit-breaker bay
  hvdc: { pos: [1.35, 0.42, -0.85], side: "right" }, // thyristor valve tower
  // layer 2: factories & materials
  materials: { pos: [2.85, 0.17, -2.3], side: "bottom" }, // CRGO steel coils
  // layer 3: operators & markets
  transcos: { pos: [-3.15, 0.36, 0.675], side: "left" }, // national-grid video wall
  markets: { pos: [-4.265, 0.36, 1.5], side: "left" }, // power-exchange price screen
};

export const TRANSMISSION_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.05, 0.1],
    narration:
      "Welcome to the power grid. Electricity made at a power station travels on tall lattice towers to a substation, where transformers change its voltage, then through underground cables and local lines to homes with smart meters. Peel the model layer by layer: the lines outside, the substation, the factories that make the equipment, and the operators and markets that run it all.",
  },
  {
    id: "lines",
    layer: 0,
    label: "Lines & Towers",
    pos: [0.6, 3.6, 2.6],
    target: [-2.75, 0.5, -1.6],
    narration:
      "A 400 kilovolt line on steel lattice towers, built by tower contractors like KEC and Kalpataru. Each tower carries two circuits of twin aluminium conductors hanging from glass insulator strings. At the foot of the second tower a crew is stringing new conductor off a drum - the wire made by companies like Apar.",
  },
  {
    id: "substation",
    layer: 1,
    label: "Substation",
    pos: [3.7, 3.3, 4.3],
    target: [0.4, 0.2, -0.25],
    narration:
      "The substation. Big power transformers step the voltage up or down, gas-insulated switchgear in the hall protects the circuits, and the tall valve hall converts AC to high-voltage DC for long-distance links. Hitachi Energy, Siemens Energy, GE Vernova T&D and Transformers & Rectifiers make this equipment.",
  },
  {
    id: "factory",
    layer: 2,
    label: "Factory",
    pos: [5.6, 3.1, 1.7],
    target: [3.3, 0.15, -1.7],
    narration:
      "Inside a transformer factory. Coils of grain-oriented electrical steel are cut and stacked into the core, copper is wound into coils around it, and aluminium goes into conductors. These metals, from companies like Hindalco and Hindustan Copper, are a large share of what a transformer costs.",
  },
  {
    id: "control",
    layer: 3,
    label: "Control Room",
    pos: [-0.8, 2.6, 4.7],
    target: [-3.15, 0.2, 1.45],
    narration:
      "The grid control room. Operators watch the national grid on the video wall and balance supply and demand minute by minute for the transmission utilities, led by Power Grid. On the side screen, the power exchange sets each hour's price - IEX runs India's largest one.",
  },
  {
    id: "homes",
    layer: 0,
    label: "Cables & Meters",
    pos: [4.5, 3.5, 5.5],
    target: [1.85, 0.0, 1.95],
    narration:
      "The last mile. In cities the power runs underground in thick insulated cables laid in trenches, made by KEI and Polycab. A small substation feeds the street line, and each home has a smart meter that reports usage to the utility - companies like Genus Power install them.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the tower line coming in from the north-west, the substation and its valve hall in the middle, the cable trench and homes at the front, the transformer factory at the back right and the grid control centre at the front left.",
  },
];

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Box = { x0: number; x1: number; z0: number; z1: number; h: number };

export function buildTransmission(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [lineG, subG, facG, ccG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const rnd = mulberry(7);

  // ------------------------------------------------------------ merge batches
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);

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
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** A ring (washer / coil with an eye) standing on its face, base at y. */
  const ring = (rIn: number, rOut: number, h: number, x: number, y: number, z: number, seg = 24) =>
    lathe(
      THREE,
      [
        [rIn, 0],
        [rOut, 0],
        [rOut, h],
        [rIn, h],
        [rIn, 0],
      ],
      seg
    ).translate(x, y, z);
  /** Four outward-facing wall planes; UV u repeats per `tile` units, v spans 0..h. */
  const wallRing = (b: Box, tile = 1) => {
    const geos: T.BufferGeometry[] = [];
    const side = (len: number, cx: number, cz: number, ry: number) => {
      const g = new THREE.PlaneGeometry(len, b.h);
      uvScale(g, len / tile, 1);
      g.rotateY(ry);
      g.translate(cx, b.h / 2, cz);
      geos.push(g);
    };
    const w = b.x1 - b.x0,
      d = b.z1 - b.z0;
    side(w, (b.x0 + b.x1) / 2, b.z1, 0);
    side(w, (b.x0 + b.x1) / 2, b.z0, Math.PI);
    side(d, b.x1, (b.z0 + b.z1) / 2, Math.PI / 2);
    side(d, b.x0, (b.z0 + b.z1) / 2, -Math.PI / 2);
    return mergeInto(THREE, geos);
  };
  const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, wrap = false) => {
    const t = canvasTexture(THREE, w, h, draw);
    if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    else t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  /** Instanced copies of one geometry (one draw call). */
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: { p: Vec3; ry?: number; s?: Vec3; c?: number }[]) => {
    if (!items.length) return;
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(0, it.ry ?? 0, 0);
      o.scale.set(...(it.s ?? ([1, 1, 1] as Vec3)));
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      if (it.c !== undefined) {
        col.setHex(it.c);
        im.setColorAt(i, col);
      }
    });
    parent.add(im);
  };

  // ------------------------------------------------------------ site plan
  const DADO = 0.1;
  const PX = 4.7,
    PZ = 3.2,
    PR = 0.4;
  const YARD = { x0: -1.45, x1: 2.2, z0: -1.95, z1: 1.3 };
  const GIS: Box = { x0: 0.75, x1: 2.05, z0: 0.15, z1: 1.05, h: 0.42 };
  const VALVE: Box = { x0: 0.62, x1: 2.0, z0: -1.5, z1: -0.58, h: 0.62 };
  const FAC: Box = { x0: 2.45, x1: 4.2, z0: -2.85, z1: -0.6, h: 0.7 };
  const CC: Box = { x0: -4.35, x1: -1.95, z0: 0.55, z1: 2.45, h: 0.6 };
  const TR = { x0: -0.75, x1: 2.3, z0: 1.38, z1: 1.74, y: -0.15 }; // cable trench (open, below ground)
  const ROAD_Z: Vec2 = [2.66, 2.96];
  const ROAD_X: Vec2 = [4.3, 4.58];

  // ------------------------------------------------------------ textures
  const groundTex = canvasTexture(THREE, 1024, Math.round((1024 * PZ) / PX), (g, w, h) => {
    const X = (x: number) => ((x + PX) / (2 * PX)) * w;
    const Z = (z: number) => ((z + PZ) / (2 * PZ)) * h;
    const sx = w / (2 * PX);
    const rect = (x0: number, x1: number, z0: number, z1: number) => g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    // Grass.
    g.fillStyle = "#7f9c5c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "30,50,20" : "200,220,150"},${0.05 + rnd() * 0.07})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    // Dry patches.
    for (let i = 0; i < 26; i++) {
      const cx = rnd() * w,
        cy = rnd() * h,
        r = 20 + rnd() * 50;
      const grd = g.createRadialGradient(cx, cy, 2, cx, cy, r);
      grd.addColorStop(0, "rgba(170,160,110,0.35)");
      grd.addColorStop(1, "rgba(170,160,110,0)");
      g.fillStyle = grd;
      g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    // Substation gravel.
    g.fillStyle = "#a19d93";
    rect(YARD.x0, YARD.x1, YARD.z0, YARD.z1);
    for (let i = 0; i < 4500; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "60,55,50" : "235,230,220"},${0.1 + rnd() * 0.15})`;
      g.fillRect(X(lerp(YARD.x0, YARD.x1, rnd())), Z(lerp(YARD.z0, YARD.z1, rnd())), 1.5, 1.5);
    }
    // Concrete aprons + yard roads.
    g.fillStyle = "#c2c3bd";
    rect(FAC.x0 - 0.08, FAC.x1 + 0.08, FAC.z0 - 0.08, FAC.z1 + 0.12);
    rect(CC.x0 - 0.08, CC.x1 + 0.1, CC.z0 - 0.1, ROAD_Z[0]);
    rect(GIS.x0 - 0.05, GIS.x1 + 0.05, GIS.z0 - 0.05, GIS.z1 + 0.05);
    rect(VALVE.x0 - 0.05, VALVE.x1 + 0.05, VALVE.z0 - 0.05, VALVE.z1 + 0.05);
    g.fillStyle = "#8b8a84";
    rect(-1.4, 2.15, -0.2, -0.05);
    rect(2.15, ROAD_X[0], -0.2, -0.05);
    // Roads.
    const road = (x0: number, x1: number, z0: number, z1: number) => {
      g.fillStyle = "#3e4348";
      rect(x0, x1, z0, z1);
      g.strokeStyle = "rgba(235,235,225,0.75)";
      g.lineWidth = 2;
      g.setLineDash([10, 9]);
      g.beginPath();
      if (x1 - x0 > z1 - z0) {
        g.moveTo(X(x0), Z((z0 + z1) / 2));
        g.lineTo(X(x1), Z((z0 + z1) / 2));
      } else {
        g.moveTo(X((x0 + x1) / 2), Z(z0));
        g.lineTo(X((x0 + x1) / 2), Z(z1));
      }
      g.stroke();
      g.setLineDash([]);
    };
    road(-PX, PX, ROAD_Z[0], ROAD_Z[1]);
    road(ROAD_X[0], ROAD_X[1], -PZ, ROAD_Z[0]);
    // Footpaths to the houses and the trench spoil strip.
    g.fillStyle = "#b9b4a6";
    for (let i = 0; i < 4; i++) rect(2.83 + i * 0.4, 2.91 + i * 0.4, 2.41, ROAD_Z[0]);
    g.fillStyle = "#8a7356";
    rect(TR.x0 - 0.04, TR.x1 + 0.04, TR.z1, TR.z1 + 0.08);
    // Tower-line right of way (mown strip).
    g.strokeStyle = "rgba(160,170,110,0.35)";
    g.lineWidth = 0.5 * sx;
    g.beginPath();
    g.moveTo(X(-PX), Z(-2.95));
    g.lineTo(X(-4.1), Z(-2.55));
    g.lineTo(X(-2.6), Z(-1.85));
    g.lineTo(X(-1.3), Z(-0.95));
    g.stroke();
  });
  groundTex.anisotropy = 8;

  /** Façade: ribbed cladding, a window band and a coloured base course. */
  const facade = (H: number, base: string, band: string, accent: string, bandAt: Vec2 = [0.25, 0.42]) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) {
        g.fillStyle = "rgba(0,0,0,0.09)";
        g.fillRect(x, 0, 3, h);
        g.fillStyle = "rgba(255,255,255,0.2)";
        g.fillRect(x + 3, 0, 1, h);
      }
      const y0 = h * bandAt[0],
        y1 = h * bandAt[1];
      g.fillStyle = band;
      g.fillRect(0, y0, w, y1 - y0);
      g.fillStyle = "rgba(255,255,255,0.25)";
      for (let x = 0; x < w; x += 32) g.fillRect(x, y0, 2, y1 - y0);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(0, y0, w, 3);
      g.fillStyle = accent;
      g.fillRect(0, h * 0.1, w, h * 0.03);
      g.fillStyle = "#59616a";
      g.fillRect(0, h * 0.9, w, h * 0.1);
    });
  const facTex = facade(FAC.h, "#dfe4e8", "#24435d", "#d9742b");
  const gisTex = facade(GIS.h, "#ddd6c8", "#34495b", "#2e86ab", [0.3, 0.48]);
  const valveTex = facade(VALVE.h, "#cfd6dc", "#3a4a58", "#6a4fc0", [0.12, 0.2]);
  // Control centre: glass curtain wall with light mullions over a stone base.
  const ccTex = tex(256, Math.round(256 * CC.h), (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#2c4e6b");
    grd.addColorStop(1, "#1a3248");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 6; i++) g.fillRect(i * 50 + 10, 0, 18, h);
    g.fillStyle = "#d9dde0";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
    for (const f of [0.0, 0.33, 0.66]) g.fillRect(0, h * f, w, 5);
    g.fillStyle = "#c9c2b4";
    g.fillRect(0, h * 0.86, w, h * 0.14);
  });
  const roofTex = tex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#cfd3d6";
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(x, 0, 2, h);
      }
    },
    true
  );
  const floorTex = (base: string, line: string, cell = 32) => {
    const t = tex(
      256,
      256,
      (g, w, h) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);
        g.fillStyle = line;
        for (let x = 0; x < w; x += cell) g.fillRect(x, 0, 1, h);
        for (let y = 0; y < h; y += cell) g.fillRect(0, y, w, 1);
      },
      true
    );
    return t;
  };
  const facFloorTex = floorTex("#c9cbc6", "rgba(0,0,0,0.08)", 48);
  const ccFloorTex = floorTex("#3b4550", "rgba(255,255,255,0.06)", 32);
  const hallFloorTex = floorTex("#d6dadb", "rgba(0,0,0,0.07)", 32);
  // Video wall: regional flows | national grid map | frequency trend.
  const gridTex = canvasTexture(THREE, 1536, 512, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#081627");
    bg.addColorStop(1, "#0b1f36");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,150,210,0.4)";
    g.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      g.beginPath();
      g.moveTo((w * i) / 3, 0);
      g.lineTo((w * i) / 3, h);
      g.stroke();
    }
    g.fillStyle = "#11314f";
    g.fillRect(0, 0, w, 42);
    g.fillStyle = "#cfe6ff";
    g.font = "bold 26px sans-serif";
    g.fillText("NATIONAL GRID", 20, 30);
    g.fillText("FREQ 50.00 Hz", w / 3 + 20, 30);
    g.fillText("INTER-REGIONAL FLOWS", (2 * w) / 3 + 20, 30);
    // Centre: rough India outline with a meshed network.
    const ox = w / 3 + 60,
      oy = 55,
      sw = w / 3 - 120,
      sh = h - 75;
    const outline: Vec2[] = [
      [0.32, 0.0], [0.45, 0.05], [0.42, 0.16], [0.55, 0.24], [0.72, 0.26], [0.85, 0.2], [1.0, 0.28], [0.9, 0.38],
      [0.78, 0.4], [0.7, 0.52], [0.6, 0.62], [0.55, 0.8], [0.47, 1.0], [0.4, 0.86], [0.33, 0.64], [0.27, 0.5],
      [0.1, 0.46], [0.0, 0.36], [0.14, 0.3], [0.22, 0.18],
    ];
    const P = (p: Vec2): Vec2 => [ox + p[0] * sw, oy + p[1] * sh];
    g.beginPath();
    outline.forEach((p, i) => (i ? g.lineTo(...P(p)) : g.moveTo(...P(p))));
    g.closePath();
    g.fillStyle = "#10304c";
    g.fill();
    g.strokeStyle = "#3d7fb5";
    g.lineWidth = 3;
    g.stroke();
    const inside = (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const [xi, yi] = outline[i],
          [xj, yj] = outline[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const nodes: Vec2[] = [];
    for (let i = 0; i < 4000 && nodes.length < 46; i++) {
      const x = rnd(),
        y = rnd();
      if (inside(x, y) && nodes.every((n) => Math.hypot(n[0] - x, n[1] - y) > 0.07)) nodes.push([x, y]);
    }
    const cols = ["#ff5a4e", "#ffc04a", "#4ac0ff"];
    nodes.forEach((n, i) => {
      const near = nodes
        .map((m, j) => ({ j, d: Math.hypot(m[0] - n[0], m[1] - n[1]) }))
        .filter((e) => e.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const e of near) {
        if (e.d > 0.22) continue;
        g.strokeStyle = cols[(i + e.j) % 3];
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(...P(n));
        g.lineTo(...P(nodes[e.j]));
        g.stroke();
      }
    });
    g.strokeStyle = "#c08cff";
    g.lineWidth = 4;
    g.setLineDash([12, 8]);
    for (let k = 0; k < 4; k++) {
      const a = nodes[(k * 7) % nodes.length],
        b = nodes[(k * 11 + 20) % nodes.length];
      g.beginPath();
      g.moveTo(...P(a));
      g.lineTo(...P(b));
      g.stroke();
    }
    g.setLineDash([]);
    for (const n of nodes) {
      g.fillStyle = "#e9fff4";
      g.beginPath();
      g.arc(...P(n), 6, 0, Math.PI * 2);
      g.fill();
    }
    // Left: regional bars.
    const regions = ["NR", "WR", "SR", "ER", "NER"];
    regions.forEach((r, i) => {
      const y = 80 + i * 82;
      g.fillStyle = "#9cc3e6";
      g.font = "bold 28px sans-serif";
      g.fillText(r, 24, y + 30);
      g.fillStyle = "#1c3a58";
      g.fillRect(100, y + 6, 360, 34);
      g.fillStyle = ["#2fd28a", "#2fd28a", "#ffc04a", "#2fd28a", "#4ac0ff"][i];
      g.fillRect(100, y + 6, 360 * (0.45 + 0.5 * rnd()), 34);
    });
    // Right: frequency / demand trend.
    const rx = (2 * w) / 3 + 30,
      rw = w / 3 - 60;
    g.strokeStyle = "rgba(120,170,220,0.25)";
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(rx, 90 + i * 70);
      g.lineTo(rx + rw, 90 + i * 70);
      g.stroke();
    }
    const curve = (col: string, f: (t: number) => number) => {
      g.strokeStyle = col;
      g.lineWidth = 5;
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const y = 90 + 350 * (1 - f(t));
        if (i) g.lineTo(rx + t * rw, y);
        else g.moveTo(rx, y);
      }
      g.stroke();
    };
    curve("#2fd28a", (t) => 0.35 + 0.25 * Math.sin(t * Math.PI * 1.1 + 0.4) + 0.2 * smoothstep(t, 0.7, 0.85));
    curve("#ffc04a", (t) => 0.5 + 0.04 * Math.sin(t * 40) + 0.03 * Math.sin(t * 13));
  });
  gridTex.anisotropy = 8;
  // Power exchange: day-ahead price blocks by hour.
  const pxTex = canvasTexture(THREE, 768, 384, (g, w, h) => {
    g.fillStyle = "#06150f";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#0f2e22";
    g.fillRect(0, 0, w, 48);
    g.fillStyle = "#c8ffe4";
    g.font = "bold 28px sans-serif";
    g.fillText("POWER EXCHANGE  ·  DAY-AHEAD PRICE", 20, 34);
    const x0 = 60,
      x1 = w - 30,
      y0 = 70,
      y1 = h - 40;
    g.strokeStyle = "rgba(160,255,210,0.18)";
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const y = lerp(y0, y1, i / 4);
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x1, y);
      g.stroke();
    }
    const bw = (x1 - x0) / 24;
    for (let i = 0; i < 24; i++) {
      const t = i / 23;
      const p = 0.32 + 0.18 * Math.exp(-((t - 0.3) ** 2) / 0.01) - 0.15 * Math.exp(-((t - 0.52) ** 2) / 0.012) + 0.55 * Math.exp(-((t - 0.85) ** 2) / 0.006);
      const bh = (y1 - y0) * Math.min(0.95, p);
      g.fillStyle = p > 0.7 ? "#ff8a4a" : p < 0.3 ? "#4ac0ff" : "#2fd28a";
      g.fillRect(x0 + i * bw + 3, y1 - bh, bw - 6, bh);
    }
    g.fillStyle = "#8fd9b6";
    g.font = "22px sans-serif";
    ["00", "06", "12", "18", "24"].forEach((s, i) => g.fillText(s, x0 + i * ((x1 - x0) / 4) - 12, h - 10));
  });
  const consoleTex = canvasTexture(THREE, 256, 64, (g, w, h) => {
    for (let k = 0; k < 3; k++) {
      const x = (k * w) / 3;
      g.fillStyle = "#0a1a2c";
      g.fillRect(x + 2, 2, w / 3 - 4, h - 4);
      g.strokeStyle = ["#2fd28a", "#ffc04a", "#4ac0ff"][k];
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i <= 20; i++) {
        const y = h * (0.6 - 0.25 * Math.sin(i * 0.6 + k * 2) * rnd());
        if (i) g.lineTo(x + 6 + (i * (w / 3 - 12)) / 20, y);
        else g.moveTo(x + 6, y);
      }
      g.stroke();
    }
  });
  const woodTex = tex(64, 64, (g, w, h) => {
    g.fillStyle = "#8a6440";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(50,30,15,${0.1 + rnd() * 0.15})`;
      g.fillRect(0, rnd() * h, w, 1 + rnd() * 2);
    }
  });
  const wireTex = tex(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = "#a9b0b6";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = "rgba(40,45,50,0.35)";
        g.fillRect(0, y, w, 1);
      }
    },
    true
  );
  wireTex.repeat.set(6, 3);

  // ------------------------------------------------------------ materials
  const baseM = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.35 })),
    trench: L.add("base", std(0x8d8b85, 0, 0.9)),
    trenchFloor: L.add("base", std(0x5a554d, 0, 0.95)),
    facFloor: L.add("base", std(0xffffff, 0.05, 0.6, { map: facFloorTex })),
    ccFloor: L.add("base", std(0xffffff, 0.05, 0.6, { map: ccFloorTex })),
    hallFloor: L.add("base", std(0xffffff, 0.05, 0.5, { map: hallFloorTex })),
  };
  for (const t of [facFloorTex, ccFloorTex, hallFloorTex]) t.repeat.set(4, 4);
  const ctxM = {
    canopy: L.add("trees", std(0xffffff, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    car: L.add("ctx", std(0xffffff, 0.5, 0.35)),
    glass: L.add("ctx", std(0x1b2631, 0.6, 0.15)),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    dark: L.add("ctx", std(0x2b3137, 0.4, 0.5)),
    cab: L.add("ctx", std(0xe2b33a, 0.35, 0.4)),
    trailer: L.add("ctx", std(0x3a434c, 0.5, 0.45)),
    fence: L.add("ctx", std(0x8a939b, 0.6, 0.5)),
  };
  // Layer 0: lines, cables, homes.
  const l0 = {
    lattice: L.add("l0", std(0xaab2ba, 0.75, 0.38)),
    insul: L.add("l0", std(0x8fb4a8, 0.2, 0.25)),
    wire: L.add("l0", std(0x3a3f44, 0.7, 0.4)),
    footing: L.add("l0", std(0xa9a69e, 0, 0.9)),
    drumWood: L.add("l0", std(0xffffff, 0, 0.85, { map: woodTex })),
    drumWire: L.add("l0", std(0xffffff, 0.8, 0.35, { map: wireTex })),
    yellow: L.add("l0", std(0xe2b33a, 0.35, 0.45)),
    dark: L.add("l0", std(0x2e343b, 0.45, 0.45)),
    tyre: L.add("l0", std(0x17181a, 0.1, 0.85)),
    cable: L.add("l0", std(0x15171a, 0.2, 0.55)),
    cableRed: L.add("l0", std(0xb23a2e, 0.2, 0.5)),
    cleat: L.add("l0", std(0x9aa3ab, 0.7, 0.4)),
    slab: L.add("l0", std(0xb3b0a8, 0, 0.9)),
    wallCream: L.add("l0", std(0xe9dcc4, 0, 0.8)),
    wallPeach: L.add("l0", std(0xe0b48f, 0, 0.8)),
    wallBlue: L.add("l0", std(0xb9cbd6, 0, 0.8)),
    roofRed: L.add("l0", std(0xa34a34, 0.05, 0.7, { side: DS })),
    roofGrey: L.add("l0", std(0x5d6670, 0.2, 0.6, { side: DS })),
    window: L.add("l0", std(0x1f2d3a, 0.5, 0.2)),
    door: L.add("l0", std(0x6b4a33, 0, 0.7)),
    meter: L.add("l0", std(0xf2f3f0, 0.1, 0.4)),
    meterLcd: L.add("l0", std(0x002a14, 0, 0.5, { emissive: 0x3dff9a, emissiveIntensity: 1.3 })),
    pole: L.add("l0", std(0x9a9890, 0.1, 0.8)),
    solar: L.add("l0", std(0x1d2c4a, 0.6, 0.2)),
    green: L.add("l0", std(0x4b6b52, 0.4, 0.5)),
  };
  // Layer 1: substation yard (outdoor).
  const yd = {
    steel: L.add("yard", std(0x9ba4ad, 0.7, 0.4)),
    tank: L.add("yard", std(0x6b7a72, 0.45, 0.5)),
    tankDark: L.add("yard", std(0x56635c, 0.45, 0.55)),
    porc: L.add("yard", std(0x8a5a40, 0.1, 0.4)),
    polymer: L.add("yard", std(0x9aa0a4, 0.1, 0.5)),
    bus: L.add("yard", std(0xc6ccd1, 0.85, 0.3)),
    wall: L.add("yard", std(0xb9b5ac, 0, 0.9)),
    gis: L.add("yard", std(0xb8bfc6, 0.6, 0.35)),
    reactor: L.add("yard", std(0x3c4a57, 0.4, 0.5)),
    oil: L.add("yard", std(0x2e343b, 0.3, 0.6)),
  };
  /** Equipment palette for one interior bucket. */
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.38)),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    steel: L.add(bucket, std(0xb8c0c8, 0.85, 0.3)),
    crgo: L.add(bucket, std(0x9aa4b0, 0.9, 0.28)),
    copper: L.add(bucket, std(0xc8763c, 0.9, 0.3)),
    alu: L.add(bucket, std(0xd6dbe0, 0.92, 0.25)),
    paper: L.add(bucket, std(0xc9b38a, 0, 0.8)),
    tank: L.add(bucket, std(0x6b7a72, 0.45, 0.5)),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    yellow: L.add(bucket, std(0xe2b33a, 0.35, 0.45)),
    porc: L.add(bucket, std(0x8a5a40, 0.1, 0.4)),
    gis: L.add(bucket, std(0xb8bfc6, 0.6, 0.35)),
    valve: L.add(bucket, std(0xdfe3e6, 0.3, 0.4)),
    valveDark: L.add(bucket, std(0x3f4a55, 0.4, 0.45)),
    ringAlu: L.add(bucket, std(0xd0d6db, 0.95, 0.2)),
    pallet: L.add(bucket, std(0x9a7448, 0, 0.85)),
    desk: L.add(bucket, std(0xe7e2d9, 0.05, 0.5)),
    chair: L.add(bucket, std(0x23272b, 0.2, 0.7)),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.0 })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0xffffff, emissiveIntensity: 1.0, emissiveMap: consoleTex })),
  });
  const hE = eqMats("l1in");
  const fE = eqMats("l2in");
  const cE = eqMats("l3in");
  const gridWallMat = L.add("l3in", std(0x000000, 0, 0.35, { emissive: 0xffffff, emissiveIntensity: 1.05, emissiveMap: gridTex }));
  const pxMat = L.add("l3in", std(0x000000, 0, 0.35, { emissive: 0xffffff, emissiveIntensity: 1.05, emissiveMap: pxTex }));

  // ------------------------------------------------------------ plinth + ground (trench cut out)
  {
    const rr = new THREE.Shape();
    const x0 = -PX,
      x1 = PX,
      z0 = -PZ,
      z1 = PZ;
    // Shape lives in XY with y = -z (it is rotated down onto the ground).
    rr.moveTo(x0 + PR, -z0);
    rr.lineTo(x1 - PR, -z0);
    rr.quadraticCurveTo(x1, -z0, x1, -z0 - PR);
    rr.lineTo(x1, -z1 + PR);
    rr.quadraticCurveTo(x1, -z1, x1 - PR, -z1);
    rr.lineTo(x0 + PR, -z1);
    rr.quadraticCurveTo(x0, -z1, x0, -z1 + PR);
    rr.lineTo(x0, -z0 - PR);
    rr.quadraticCurveTo(x0, -z0, x0 + PR, -z0);
    const hole = new THREE.Path();
    hole.moveTo(TR.x0, -TR.z0);
    hole.lineTo(TR.x0, -TR.z1);
    hole.lineTo(TR.x1, -TR.z1);
    hole.lineTo(TR.x1, -TR.z0);
    hole.lineTo(TR.x0, -TR.z0);
    rr.holes.push(hole);
    const gg = new THREE.ShapeGeometry(rr, 12).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PX) / (2 * PX), 1 - (p.getZ(i) + PZ) / (2 * PZ));
    gg.translate(0, 0.004, 0);
    put(lineG, baseM.ground, gg);
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    put(lineG, baseM.plinth, pl);
    const lipShape = new THREE.Shape(rr.getPoints(12));
    const lip = new THREE.ExtrudeGeometry(lipShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    put(lineG, baseM.lip, lip);
    // Trench lining (thick enough to swallow the plinth's bevel inside the hole).
    const t = 0.045;
    put(lineG, baseM.trenchFloor, bb(TR.x0, TR.x1, TR.y, TR.y + 0.01, TR.z0, TR.z1));
    put(lineG, baseM.trench, bb(TR.x0, TR.x1, TR.y, 0.012, TR.z0, TR.z0 + t));
    put(lineG, baseM.trench, bb(TR.x0, TR.x1, TR.y, 0.012, TR.z1 - t, TR.z1));
    put(lineG, baseM.trench, bb(TR.x0, TR.x0 + t, TR.y, 0.012, TR.z0, TR.z1));
    put(lineG, baseM.trench, bb(TR.x1 - t, TR.x1, TR.y, 0.012, TR.z0, TR.z1));
    // Building floors.
    const floor = (b: Box, m: T.Material, rep: number) => {
      const g = new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0).rotateX(-Math.PI / 2);
      uvScale(g, (b.x1 - b.x0) / rep, (b.z1 - b.z0) / rep);
      g.translate((b.x0 + b.x1) / 2, 0.008, (b.z0 + b.z1) / 2);
      put(lineG, m, g);
    };
    floor(FAC, baseM.facFloor, 2);
    floor(CC, baseM.ccFloor, 1.5);
    floor(GIS, baseM.hallFloor, 1.2);
    floor(VALVE, baseM.hallFloor, 1.2);
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Mesh; bucket: string };
  const peels: Peel[] = [];
  const capMat = std(0x343c45, 0.3, 0.6);
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
  });
  const makePeel = (parent: T.Object3D, b: Box, map: T.Texture, roofBucket: string) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.h);
    const wm = std(0xffffff, 0.15, 0.55, { map, side: DS, clippingPlanes: [plane] });
    put(parent, wm, wallRing(b));
    const roof = new THREE.Group();
    parent.add(roof);
    const t = 0.03,
      hh = 0.02;
    const capG = mergeInto(THREE, [
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z0 - t / 2, b.z0 + t / 2),
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z1 - t / 2, b.z1 + t / 2),
      bb(b.x0 - t / 2, b.x0 + t / 2, -hh, 0, b.z0, b.z1),
      bb(b.x1 - t / 2, b.x1 + t / 2, -hh, 0, b.z0, b.z1),
    ]);
    const cap = new THREE.Mesh(capG, capMat);
    cap.position.y = b.h;
    parent.add(cap);
    peels.push({ b, plane, roof, cap, bucket: roofBucket });
    const R = roofMats(roofBucket);
    const P = putter(roof);
    P(R.mem, uvScale(bb(b.x0, b.x1, b.h - 0.03, b.h, b.z0, b.z1), (b.x1 - b.x0) / 1.5, (b.z1 - b.z0) / 1.5));
    const pt = 0.025,
      ph = 0.04;
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z1 - pt, b.z1));
    P(R.coping, bb(b.x0, b.x1, b.h, b.h + ph, b.z0, b.z0 + pt));
    P(R.coping, bb(b.x0, b.x0 + pt, b.h, b.h + ph, b.z0, b.z1));
    P(R.coping, bb(b.x1 - pt, b.x1, b.h, b.h + ph, b.z0, b.z1));
    return { P, R };
  };

  // ============================================================ LAYER 0: LINES & TOWERS
  const P0 = putter(lineG);
  // ---- lattice tower templates (local: line runs along +Z, cross-arms along X)
  type Tpl = { lat: T.BufferGeometry; ins: T.BufferGeometry; attach: Vec3[]; peak: Vec3[] };
  const towerTpl = (arms: { y: number; w: number }[], waistY: number, peakY: number, baseHW: number, earth: number[]): Tpl => {
    const topArm = arms[arms.length - 1].y;
    const hwAt = (y: number) =>
      y <= waistY ? lerp(baseHW, 0.04, y / waistY) : y <= topArm + 0.02 ? lerp(0.04, 0.032, (y - waistY) / (topArm + 0.02 - waistY)) : lerp(0.032, 0.006, clamp01((y - topArm - 0.02) / (peakY - topArm - 0.02)));
    const lat: T.BufferGeometry[] = [];
    const ins: T.BufferGeometry[] = [];
    const corners: Vec2[] = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ];
    const lv = [0, waistY * 0.3, waistY * 0.6, waistY, ...arms.map((a) => a.y), topArm + 0.075, peakY - 0.02].filter(
      (y, i, a) => i === 0 || y - a[i - 1] > 0.02
    );
    const cp = (c: Vec2, y: number): Vec3 => [c[0] * hwAt(y), y, c[1] * hwAt(y)];
    for (const c of corners) for (let k = 0; k < lv.length - 1; k++) lat.push(bar(THREE, cp(c, lv[k]), cp(c, lv[k + 1]), 0.0068, 4));
    for (let f = 0; f < 4; f++) {
      const c1 = corners[f],
        c2 = corners[(f + 1) % 4];
      for (let k = 0; k < lv.length - 1; k++) {
        lat.push(bar(THREE, cp(c1, lv[k]), cp(c2, lv[k + 1]), 0.0032, 3));
        lat.push(bar(THREE, cp(c2, lv[k]), cp(c1, lv[k + 1]), 0.0032, 3));
        if (k > 0) lat.push(bar(THREE, cp(c1, lv[k]), cp(c2, lv[k]), 0.0032, 3));
      }
    }
    const attach: Vec3[] = [];
    for (const a of arms)
      for (const s of [-1, 1]) {
        const hw = hwAt(a.y);
        const tip: Vec3 = [s * a.w, a.y, 0];
        lat.push(bar(THREE, [s * hw, a.y, hw], tip, 0.0045, 4));
        lat.push(bar(THREE, [s * hw, a.y, -hw], tip, 0.0045, 4));
        lat.push(bar(THREE, [s * hw, a.y + 0.075, hw], tip, 0.0035, 3));
        lat.push(bar(THREE, [s * hw, a.y + 0.075, -hw], tip, 0.0035, 3));
        // Insulator string: a stack of glass discs.
        for (let d = 0; d < 6; d++) ins.push(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 8).translate(s * a.w, a.y - 0.012 - d * 0.011, 0));
        ins.push(new THREE.CylinderGeometry(0.0025, 0.0025, 0.075, 4).translate(s * a.w, a.y - 0.037, 0));
        attach.push([s * a.w, a.y - 0.078, 0]);
      }
    const peak: Vec3[] = [];
    for (const ex of earth) {
      const top: Vec3 = [ex, peakY, 0];
      if (ex !== 0) {
        lat.push(bar(THREE, [-0.03, peakY - 0.05, 0], top, 0.004, 4));
        lat.push(bar(THREE, [0.03, peakY - 0.05, 0], top, 0.004, 4));
      } else for (const c of corners) lat.push(bar(THREE, cp(c, peakY - 0.02), top, 0.005, 4));
      peak.push(top);
    }
    return { lat: mergeInto(THREE, lat), ins: mergeInto(THREE, ins), attach, peak };
  };
  const acTpl = towerTpl(
    [
      { y: 1.0, w: 0.22 },
      { y: 1.16, w: 0.3 },
      { y: 1.32, w: 0.22 },
    ],
    0.93,
    1.48,
    0.12,
    [0]
  );
  const dcTpl = towerTpl([{ y: 1.12, w: 0.3 }], 1.02, 1.32, 0.11, [-0.16, 0.16]);
  // ---- line-entry gantry template
  const GANT_Y = 0.64;
  const gantTpl = (() => {
    const lat: T.BufferGeometry[] = [];
    const ins: T.BufferGeometry[] = [];
    for (const px of [-0.36, 0.36]) {
      for (const [a, b] of [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1],
      ])
        lat.push(bar(THREE, [px + a * 0.024, 0, b * 0.024], [px + a * 0.016, GANT_Y + 0.08, b * 0.016], 0.005, 4));
      for (let k = 0; k < 4; k++) {
        const y0 = (k * (GANT_Y + 0.08)) / 4,
          y1 = ((k + 1) * (GANT_Y + 0.08)) / 4;
        lat.push(bar(THREE, [px - 0.02, y0, 0.02], [px + 0.02, y1, 0.02], 0.0025, 3));
        lat.push(bar(THREE, [px - 0.02, y0, -0.02], [px + 0.02, y1, -0.02], 0.0025, 3));
      }
      lat.push(bar(THREE, [px, GANT_Y + 0.08, 0], [px, GANT_Y + 0.2, 0], 0.004, 4));
    }
    for (const y of [GANT_Y + 0.025, GANT_Y + 0.075])
      for (const z of [-0.016, 0.016]) lat.push(bar(THREE, [-0.37, y, z], [0.37, y, z], 0.0045, 4));
    for (let k = 0; k < 9; k++) lat.push(bar(THREE, [-0.34 + k * 0.08, GANT_Y + 0.025, 0], [-0.3 + k * 0.08, GANT_Y + 0.075, 0], 0.0025, 3));
    const attach: Vec3[] = [];
    for (const x of [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]) {
      ins.push(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 6).rotateX(Math.PI / 2).translate(x, GANT_Y + 0.02, 0.03));
      attach.push([x, GANT_Y + 0.02, 0.055]);
    }
    return { lat: mergeInto(THREE, lat), ins: mergeInto(THREE, ins), attach, peak: [[-0.36, GANT_Y + 0.2, 0], [0.36, GANT_Y + 0.2, 0]] as Vec3[] };
  })();

  const span = (a: Vec3, b: Vec3, sagK = 0.04, twin = true, r = 0.0034) => {
    const dx = b[0] - a[0],
      dz = b[2] - a[2];
    const len = Math.hypot(dx, dz);
    const px = -dz / len,
      pz = dx / len;
    const sag = sagK * len;
    const at = (t: number, o: number): Vec3 => [lerp(a[0], b[0], t) + px * o, lerp(a[1], b[1], t) - 4 * sag * t * (1 - t), lerp(a[2], b[2], t) + pz * o];
    const offs = twin ? [-0.011, 0.011] : [0];
    for (const o of offs) {
      const pts: Vec3[] = [];
      for (let i = 0; i <= 12; i++) pts.push(at(i / 12, o));
      P0(l0.wire, tube(THREE, pts, r, 4, false, 24));
    }
    if (twin) for (const t of [0.2, 0.4, 0.6, 0.8]) P0(l0.cleat, bar(THREE, at(t, -0.013), at(t, 0.013), 0.0025, 3));
  };
  type Node = { x: number; z: number; tpl: Tpl; ry?: number };
  const placeNodes = (nodes: Node[]) =>
    nodes.map((nd, i) => {
      const prev = nodes[Math.max(0, i - 1)],
        next = nodes[Math.min(nodes.length - 1, i + 1)];
      const phi = nd.ry ?? Math.atan2(next.x - prev.x, next.z - prev.z);
      const m4 = new THREE.Matrix4().makeRotationY(phi).setPosition(nd.x, 0, nd.z);
      P0(l0.lattice, nd.tpl.lat.clone().applyMatrix4(m4));
      P0(l0.insul, nd.tpl.ins.clone().applyMatrix4(m4));
      const v = new THREE.Vector3();
      const w = (p: Vec3) => v.set(p[0], p[1], p[2]).applyMatrix4(m4).toArray() as Vec3;
      // Concrete chimney footings at the four legs.
      if (nd.tpl !== gantTpl) {
        const hw = nd.tpl === acTpl ? 0.12 : 0.11;
        for (const [a, b] of [
          [1, 1],
          [1, -1],
          [-1, -1],
          [-1, 1],
        ]) {
          const c = w([a * hw, 0, b * hw]);
          P0(l0.footing, bx(0.04, 0.025, 0.04, c[0], 0, c[2]));
        }
      }
      return { attach: nd.tpl.attach.map(w), peak: nd.tpl.peak.map(w), phi };
    });
  // ---- 400 kV double-circuit line from the north-west into the yard gantry.
  const acNodes = placeNodes([
    { x: -4.1, z: -2.55, tpl: acTpl },
    { x: -2.6, z: -1.85, tpl: acTpl },
    { x: -1.3, z: -0.95, tpl: gantTpl },
  ]);
  {
    // From the plinth edge into the first tower (the line comes from off-stage).
    const t0 = acNodes[0];
    const dirx = Math.sin(t0.phi),
      dirz = Math.cos(t0.phi);
    const back = (p: Vec3): Vec3 => {
      const k = (p[0] + PX - 0.02) / Math.max(0.2, dirx);
      return [p[0] - dirx * k, p[1] - 0.12, p[2] - dirz * k];
    };
    for (const a of t0.attach) span(back(a), a, 0.03);
    for (const pk of t0.peak) span(back(pk), pk, 0.02, false, 0.0022);
    for (let i = 0; i < acNodes.length - 1; i++) {
      const A = acNodes[i],
        B = acNodes[i + 1];
      // Gantry phases are ordered west->east; match each tower side to its nearest gantry phase.
      const used = new Set<number>();
      for (const a of A.attach) {
        let best = 0,
          bd = 1e9;
        B.attach.forEach((b, j) => {
          if (used.has(j)) return;
          const d = Math.hypot(b[0] - a[0], b[2] - a[2]) + Math.abs(b[1] - a[1]) * 0.2;
          if (d < bd) {
            bd = d;
            best = j;
          }
        });
        used.add(best);
        span(a, B.attach[best], i === acNodes.length - 2 ? 0.02 : 0.04);
      }
      span(A.peak[0], B.peak[0], 0.02, false, 0.0022);
      if (B.peak[1]) span(A.peak[0], B.peak[1], 0.02, false, 0.0022);
    }
  }
  // ---- stringing site at the foot of tower 2: drum trailer, tensioner, pilot line up to the arm.
  {
    const dz0 = -0.95;
    // Drum on a trailer (axis along X).
    const dx = -3.3;
    P0(l0.drumWood, cylX(0.12, 0.016, dx - 0.058, 0.17, dz0, 24));
    P0(l0.drumWood, cylX(0.12, 0.016, dx + 0.058, 0.17, dz0, 24));
    P0(l0.drumWire, cylX(0.092, 0.1, dx, 0.17, dz0, 24));
    P0(l0.dark, bb(dx - 0.11, dx + 0.11, 0.035, 0.05, dz0 - 0.14, dz0 + 0.14));
    for (const s of [-1, 1]) {
      P0(l0.dark, bar(THREE, [dx + s * 0.075, 0.05, dz0 - 0.08], [dx + s * 0.075, 0.17, dz0], 0.008, 4));
      P0(l0.dark, bar(THREE, [dx + s * 0.075, 0.05, dz0 + 0.08], [dx + s * 0.075, 0.17, dz0], 0.008, 4));
      P0(l0.tyre, cylX(0.032, 0.025, dx + s * 0.1, 0.032, dz0 + 0.07, 14));
      P0(l0.tyre, cylX(0.032, 0.025, dx + s * 0.1, 0.032, dz0 - 0.07, 14));
    }
    // A second full drum waiting on the ground.
    P0(l0.drumWood, cylZ(0.1, 0.014, -3.72, 0.1, -0.62 - 0.048, 24));
    P0(l0.drumWood, cylZ(0.1, 0.014, -3.72, 0.1, -0.62 + 0.048, 24));
    P0(l0.drumWire, cylZ(0.078, 0.085, -3.72, 0.1, -0.62, 24));
    // Tensioner: yellow chassis with two bull-wheels.
    const tx = -2.98,
      tz = -1.12;
    P0(l0.yellow, rb(0.2, 0.08, 0.12, 0.012, tx, 0.04, tz));
    P0(l0.dark, bb(tx - 0.11, tx + 0.11, 0.0, 0.045, tz - 0.065, tz + 0.065));
    for (const ox of [-0.05, 0.05]) P0(l0.dark, cylZ(0.045, 0.02, tx + ox, 0.165, tz, 20));
    P0(l0.yellow, bb(tx + 0.07, tx + 0.11, 0.12, 0.17, tz - 0.05, tz + 0.05));
    for (const s of [-1, 1]) P0(l0.tyre, cylZ(0.03, 0.02, tx + s * 0.07, 0.03, tz + s * 0.0 + 0.07, 12));
    // Conductor: drum -> tensioner -> stringing block under the nearest low arm of tower 2.
    const t2 = acNodes[1];
    const tip = t2.attach.filter((a) => a[1] < 1.0).sort((a, b) => Math.hypot(a[0] - tx, a[2] - tz) - Math.hypot(b[0] - tx, b[2] - tz))[0];
    P0(l0.wire, tube(THREE, [[dx, 0.26, dz0], [tx - 0.05, 0.21, tz], [tx + 0.05, 0.21, tz]], 0.003, 4, false, 16));
    const ptsUp: Vec3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      ptsUp.push([lerp(tx + 0.05, tip[0], t), lerp(0.2, tip[1] - 0.02, t) - 0.08 * t * (1 - t), lerp(tz, tip[2], t)]);
    }
    P0(l0.wire, tube(THREE, ptsUp, 0.003, 4, false, 20));
    P0(l0.yellow, cylZ(0.016, 0.012, tip[0], tip[1] - 0.02, tip[2], 12)); // stringing block
  }
  // ---- HVDC bipole line north out of the valve hall.
  const dcNodes = placeNodes([{ x: 1.31, z: -2.5, tpl: dcTpl, ry: Math.PI }]);
  {
    const [B] = dcNodes;
    for (let k = 0; k < 2; k++) {
      const a = B.attach[k];
      const edge: Vec3 = [a[0], a[1] - 0.12, -PZ + 0.02];
      span(a, edge, 0.03, true);
      // From the smoothing reactor up to the tower (pole conductor).
      span([a[0], 0.3, VALVE.z0 - 0.26], a, 0.02, true);
    }
    for (const pk of B.peak) span(pk, [pk[0], pk[1] - 0.1, -PZ + 0.02], 0.02, false, 0.0022);
  }

  // ---- cable trench: two XLPE circuits in trefoil on cleats, cover slabs, a joint bay, a drum.
  {
    const cy = TR.y + 0.035;
    for (const zc of [TR.z0 + 0.1, TR.z1 - 0.1]) {
      const tre: Vec2[] = [
        [0, 0.022],
        [-0.02, 0],
        [0.02, 0],
      ];
      for (const [oz, oy] of tre) {
        const pts: Vec3[] = [
          [TR.x0 + 0.05, cy + oy, zc + oz],
          [TR.x1 - 0.05, cy + oy, zc + oz],
        ];
        P0(l0.cable, tube(THREE, pts, 0.012, 8, false, 4));
      }
      for (let x = TR.x0 + 0.15; x < TR.x1 - 0.1; x += 0.22) {
        P0(l0.cleat, bb(x - 0.008, x + 0.008, cy - 0.016, cy + 0.03, zc - 0.03, zc + 0.03));
        P0(l0.cleat, bb(x - 0.01, x + 0.01, TR.y + 0.01, cy - 0.015, zc - 0.012, zc + 0.012));
      }
    }
    // Red warning tiles along the far wall and cover slabs over the east end.
    P0(l0.cableRed, bb(TR.x0 + 0.05, TR.x1 - 0.05, TR.y + 0.01, TR.y + 0.016, TR.z0 + 0.045, TR.z0 + 0.06));
    for (let x = 1.65; x < TR.x1 - 0.05; x += 0.13) P0(l0.slab, bb(x, x + 0.12, 0.004, 0.022, TR.z0 - 0.01, TR.z1 + 0.01));
    for (let k = 0; k < 4; k++) P0(l0.slab, bb(1.0 + k * 0.004, 1.12 + k * 0.004, 0.004 + k * 0.018, 0.02 + k * 0.018, TR.z1 + 0.08, TR.z1 + 0.27));
    // Joint bay marker posts.
    for (const x of [0.2, 0.9]) P0(l0.yellow, cyl(0.008, 0.07, x, 0, TR.z1 + 0.05, 6));
    // West end: cables rise to the yard's sealing ends.
    for (let k = 0; k < 3; k++) {
      const x = -0.68 + k * 0.05;
      P0(l0.cable, tube(THREE, [[x + 0.04, cy, TR.z0 + 0.1], [x, 0.0, TR.z0 + 0.03], [x, 0.04, 1.2], [x, 0.2, 1.17]], 0.008, 6, false, 16));
    }
    // Cable drum on jacks at the trench's west end.
    P0(l0.drumWood, cylZ(0.13, 0.018, -1.08, 0.15, 1.56 - 0.068, 24));
    P0(l0.drumWood, cylZ(0.13, 0.018, -1.08, 0.15, 1.56 + 0.068, 24));
    P0(l0.cable, cylZ(0.105, 0.12, -1.08, 0.15, 1.56, 24));
    P0(l0.yellow, bar(THREE, [-1.08, 0.15, 1.38], [-1.08, 0.15, 1.74], 0.008, 6));
    for (const z of [1.4, 1.72]) P0(l0.dark, bb(-1.12, -1.04, 0, 0.15, z - 0.015, z + 0.015));
    // Compact substation (RMU + distribution transformer) at the east end.
    P0(l0.green, rb(0.2, 0.15, 0.16, 0.01, 2.5, 0, 1.56));
    P0(l0.dark, bb(2.4, 2.6, 0.15, 0.162, 1.47, 1.65));
    for (let i = 0; i < 4; i++) P0(l0.dark, bb(2.42 + i * 0.045, 2.45 + i * 0.045, 0.04, 0.12, 1.643, 1.645));
  }

  // ---- homes with smart meters on a low-voltage street line.
  {
    const walls = [l0.wallCream, l0.wallPeach, l0.wallBlue, l0.wallCream];
    const roofs = [l0.roofRed, l0.roofGrey, l0.roofRed, l0.roofRed];
    const zc = 2.25,
      d = 0.32,
      w = 0.3,
      hh = 0.17;
    const zf = zc + d / 2;
    for (let i = 0; i < 4; i++) {
      const x = 2.85 + i * 0.4;
      P0(walls[i], bx(w, hh, d, x, 0, zc));
      // Gable roof (prism along Z) with eaves.
      const ov = 0.025;
      const shape = new THREE.Shape([
        new THREE.Vector2(-w / 2 - ov, hh - 0.008),
        new THREE.Vector2(w / 2 + ov, hh - 0.008),
        new THREE.Vector2(0, hh + 0.11),
      ]);
      const rg = new THREE.ExtrudeGeometry(shape, { depth: d + 2 * ov, bevelEnabled: false }).translate(x, 0, zc - d / 2 - ov);
      rg.computeVertexNormals();
      P0(roofs[i], rg);
      // Door, windows.
      P0(l0.door, bb(x - 0.11, x - 0.06, 0, 0.11, zf, zf + 0.004));
      P0(l0.window, bb(x + 0.01, x + 0.11, 0.07, 0.13, zf, zf + 0.004));
      P0(l0.window, bb(x + w / 2, x + w / 2 + 0.004, 0.07, 0.13, zc - 0.08, zc + 0.06));
      // Smart meter beside the door: white box with a green display.
      const mx = x - 0.025;
      P0(l0.meter, bb(mx - 0.016, mx + 0.016, 0.085, 0.13, zf, zf + 0.014));
      P0(l0.meterLcd, bb(mx - 0.011, mx + 0.011, 0.11, 0.123, zf + 0.014, zf + 0.016));
      // Rooftop solar on two of them.
      if (i % 2 === 1) {
        const pg = new THREE.BoxGeometry(0.13, 0.006, d * 0.75).rotateZ(-0.6).translate(x + 0.08, hh + 0.068, zc);
        P0(l0.solar, pg);
      }
    }
    // LT street line: concrete poles along the footpath, four wires, service drops to each meter.
    const poles = [2.62, 3.45, 4.25];
    const pz = 2.55,
      ph = 0.34;
    for (const x of poles) {
      P0(l0.pole, cyl(0.009, ph, x, 0, pz, 8, 0.006));
      P0(l0.pole, bb(x - 0.06, x + 0.06, ph - 0.03, ph - 0.02, pz - 0.006, pz + 0.006));
    }
    const lv = [-0.05, -0.017, 0.017, 0.05];
    for (let i = 0; i < poles.length - 1; i++)
      for (const o of lv) span([poles[i] + o, ph - 0.018, pz], [poles[i + 1] + o, ph - 0.018, pz], 0.025, false, 0.0016);
    for (let i = 0; i < 4; i++) {
      const mx = 2.85 + i * 0.4 - 0.025;
      const px = poles.reduce((a, b) => (Math.abs(b - mx) < Math.abs(a - mx) ? b : a));
      P0(l0.wire, tube(THREE, [[px, ph - 0.02, pz], [lerp(px, mx, 0.5), ph - 0.07, lerp(pz, zf, 0.5)], [mx, 0.135, zf + 0.008]], 0.0016, 3, false, 12));
    }
    // Feeder from the compact substation up the first pole.
    P0(l0.wire, tube(THREE, [[2.5, 0.15, 1.64], [2.56, 0.2, 2.1], [2.62, ph - 0.02, pz]], 0.002, 4, false, 12));
  }

  // ============================================================ LAYER 1: SUBSTATION
  const P1 = putter(subG);
  {
    // Air-insulated bays: two busbars on post insulators, breakers and isolators.
    const st: T.BufferGeometry[] = [];
    const por: T.BufferGeometry[] = [];
    const bus: T.BufferGeometry[] = [];
    const xs = [-1.2, 0.15];
    for (const z of [-1.2, -0.62]) {
      bus.push(bar(THREE, [xs[0], 0.44, z], [xs[1], 0.44, z], 0.008, 6));
      for (let i = 0; i <= 6; i++) {
        const x = lerp(xs[0], xs[1], i / 6);
        st.push(bar(THREE, [x, 0, z], [x, 0.28, z], 0.012, 4));
        por.push(new THREE.CylinderGeometry(0.009, 0.013, 0.15, 8).translate(x, 0.355, z));
      }
    }
    for (const x of [-1.0, -0.6, -0.2])
      for (const z of [-0.95, -0.38]) {
        st.push(bx(0.045, 0.13, 0.045, x, 0, z));
        por.push(new THREE.CylinderGeometry(0.011, 0.015, 0.13, 8).translate(x, 0.195, z));
        st.push(bx(0.03, 0.03, 0.03, x, 0.26, z));
        // Droppers from the bus to the breaker head.
        bus.push(bar(THREE, [x, 0.29, z], [x, 0.44, z < -0.7 ? -1.2 : -0.62], 0.004, 4));
      }
    // Gantry phases come down to the first bay.
    {
      const G = acNodes[2];
      const sx = Math.sin(G.phi),
        sz = Math.cos(G.phi);
      for (const a of G.attach) {
        const e: Vec3 = [a[0] + sx * 0.16, 0.24, a[2] + sz * 0.16];
        bus.push(tube(THREE, [a, [a[0] + sx * 0.08, a[1] - 0.12, a[2] + sz * 0.08], [e[0], e[1] + 0.04, e[2]]], 0.0035, 4, false, 12));
        st.push(bar(THREE, [e[0], 0, e[2]], [e[0], 0.17, e[2]], 0.009, 4));
        por.push(new THREE.CylinderGeometry(0.007, 0.011, 0.1, 8).translate(e[0], 0.22, e[2]));
      }
    }
    // Bus to the transformers' HV bushings.
    for (const x of [-0.95, -0.3]) bus.push(tube(THREE, [[x, 0.44, -0.62], [x, 0.5, -0.1], [x, 0.43, 0.59]], 0.004, 4, false, 16));
    put(subG, yd.steel, mergeInto(THREE, st));
    put(subG, yd.porc, mergeInto(THREE, por));
    put(subG, yd.bus, mergeInto(THREE, bus));

    // Two interconnecting power transformers on oil pits with a firewall between.
    for (const x of [-0.95, -0.3]) {
      const z = 0.6;
      P1(yd.oil, bb(x - 0.24, x + 0.24, 0, 0.012, z - 0.2, z + 0.2));
      P1(yd.tank, rb(0.32, 0.24, 0.2, 0.014, x, 0.012, z));
      P1(yd.tankDark, bb(x - 0.17, x + 0.17, 0.25, 0.262, z - 0.105, z + 0.105));
      // Radiator banks on both long sides.
      for (const s of [-1, 1])
        for (let i = 0; i < 7; i++) P1(yd.tankDark, bb(x - 0.14 + i * 0.045 - 0.015, x - 0.14 + i * 0.045 + 0.015, 0.03, 0.21, z + s * 0.11 - 0.003, z + s * 0.11 + s * 0.05));
      // Conservator tank + pipe.
      P1(yd.tank, cylX(0.032, 0.24, x, 0.33, z - 0.07, 16));
      P1(yd.steel, bar(THREE, [x + 0.1, 0.262, z - 0.07], [x + 0.1, 0.3, z - 0.07], 0.008, 4));
      // HV and LV bushings.
      for (let i = 0; i < 3; i++) {
        P1(yd.porc, cyl(0.016, 0.17, x - 0.08 + i * 0.08, 0.262, z - 0.01, 10, 0.008));
        P1(yd.porc, cyl(0.011, 0.07, x - 0.06 + i * 0.06, 0.262, z + 0.07, 8, 0.006));
      }
      // Cooling fans on the radiators.
      for (const s of [-1, 1]) P1(yd.steel, cylZ(0.025, 0.01, x + 0.08, 0.13, z + s * 0.165, 14));
    }
    P1(yd.wall, bb(-0.645, -0.605, 0, 0.36, 0.36, 0.84));
    // Shunt reactor and cable sealing-end structure by the south fence.
    P1(yd.reactor, cyl(0.06, 0.16, 0.25, 0, 0.62, 18));
    for (let i = 0; i < 3; i++) P1(yd.porc, cyl(0.009, 0.08, 0.21 + i * 0.04, 0.16, 0.62, 8, 0.006));
    P1(yd.steel, bb(-0.72, -0.53, 0, 0.18, 1.12, 1.2));
    for (let k = 0; k < 3; k++) P1(yd.porc, cyl(0.012, 0.1, -0.68 + k * 0.05, 0.18, 1.16, 8, 0.007));
    // Air-to-SF6 bushings feeding the GIS hall from the busbars.
    for (let k = 0; k < 3; k++) {
      const x = 0.95 + k * 0.08;
      P1(yd.polymer, cyl(0.013, 0.42, x, 0.0, 0.06, 10, 0.008));
      P1(yd.gis, cylZ(0.022, 0.12, x, 0.06, 0.12, 12));
      P1(yd.bus, tube(THREE, [[0.15, 0.44, -0.62], [0.55, 0.47, -0.3], [x, 0.43, 0.06]], 0.0035, 4, false, 16));
    }
    // Converter transformers along the valve hall's west face, bushings into the wall.
    for (let i = 0; i < 3; i++) {
      const z = -1.32 + i * 0.36;
      const x = 0.42;
      P1(yd.oil, bb(x - 0.13, x + 0.13, 0, 0.01, z - 0.16, z + 0.16));
      P1(yd.tank, rb(0.2, 0.2, 0.26, 0.012, x, 0.01, z));
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) P1(yd.tankDark, bb(x - 0.08 + k * 0.04 - 0.012, x - 0.08 + k * 0.04 + 0.012, 0.03, 0.18, z + s * 0.13, z + s * 0.17));
      P1(yd.tank, cylZ(0.026, 0.2, x - 0.05, 0.25, z, 14));
      for (const dz of [-0.06, 0.06]) P1(yd.porc, bar(THREE, [x + 0.04, 0.2, z + dz], [VALVE.x0 + 0.01, 0.36, z + dz], 0.013, 8));
    }
    // DC wall bushings + smoothing reactors on the north side.
    for (const x of [1.01, 1.61]) {
      P1(yd.polymer, bar(THREE, [x, 0.36, VALVE.z0 + 0.02], [x, 0.36, VALVE.z0 - 0.18], 0.014, 10));
      P1(yd.reactor, cyl(0.05, 0.1, x, 0.18, VALVE.z0 - 0.26, 18));
      for (let k = 0; k < 2; k++) P1(yd.porc, cyl(0.008, 0.18, x + (k ? 0.03 : -0.03), 0, VALVE.z0 - 0.26, 8));
    }
    // Yard fence.
    const fp: T.BufferGeometry[] = [];
    const c: Vec2[] = [
      [YARD.x0, YARD.z0],
      [YARD.x1, YARD.z0],
      [YARD.x1, YARD.z1],
      [YARD.x0, YARD.z1],
      [YARD.x0, YARD.z0],
    ];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i],
        [bxx, bz] = c[i + 1];
      const len = Math.hypot(bxx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 0.14));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const x = lerp(ax, bxx, t),
          z = lerp(az, bz, t);
        fp.push(bar(THREE, [x, 0, z], [x, 0.07, z], 0.0035, 3));
      }
      for (const h of [0.035, 0.068]) fp.push(bar(THREE, [ax, h, az], [bxx, h, bz], 0.0022, 3));
    }
    put(subG, ctxM.fence, mergeInto(THREE, fp));
  }
  // GIS hall: switchgear bays inside.
  {
    const { P, R } = makePeel(subG, GIS, gisTex, "roofGis");
    for (let i = 0; i < 3; i++) P(R.unit, rb(0.14, 0.05, 0.1, 0.01, 1.05 + i * 0.4, GIS.h, 0.6));
    const I = putter(subG);
    const x0 = GIS.x0 + 0.12,
      x1 = GIS.x1 - 0.12;
    for (const [z, y] of [
      [0.36, 0.1],
      [0.46, 0.1],
    ] as Vec2[])
      I(hE.gis, cylX(0.026, x1 - x0, (x0 + x1) / 2, y, z, 14));
    for (let i = 0; i < 5; i++) {
      const x = lerp(x0 + 0.04, x1 - 0.04, i / 4);
      I(hE.gis, cyl(0.036, 0.22, x, 0.03, 0.66, 16));
      I(hE.gis, cylZ(0.022, 0.26, x, 0.14, 0.5, 12));
      I(hE.dark, bb(x - 0.03, x + 0.03, 0.03, 0.09, 0.7, 0.75));
      I(hE.steel, cyl(0.042, 0.02, x, 0.25, 0.66, 16));
      I(hE.white, bb(x - 0.045, x + 0.045, 0.0, 0.2, 0.86, 0.94));
      I(hE.greenLed, bb(x - 0.02, x + 0.02, 0.15, 0.17, 0.859, 0.861));
      I(hE.dark, bb(x - 0.05, x + 0.05, 0.0, 0.03, 0.56, 0.78));
    }
    // Overhead crane rail.
    I(hE.yellow, bb(GIS.x0 + 0.05, GIS.x1 - 0.05, 0.34, 0.36, 0.58, 0.62));
  }
  // HVDC valve hall: six thyristor valve towers on post insulators.
  {
    const { P, R } = makePeel(subG, VALVE, valveTex, "roofValve");
    for (let i = 0; i < 4; i++) P(R.unit, rb(0.12, 0.05, 0.12, 0.01, 0.8 + i * 0.33, VALVE.h, -1.04));
    const I = putter(subG);
    for (const z of [-1.24, -0.85])
      for (const x of [1.0, 1.35, 1.7]) {
        for (const ox of [-0.04, 0.04]) for (const oz of [-0.04, 0.04]) I(hE.porc, cyl(0.007, 0.07, x + ox, 0, z + oz, 8));
        for (let k = 0; k < 5; k++) {
          const y = 0.075 + k * 0.075;
          I(hE.valve, bx(0.13, 0.055, 0.13, x, y, z));
          I(hE.valveDark, bx(0.135, 0.012, 0.135, x, y + 0.055, z));
        }
        const tor = new THREE.TorusGeometry(0.075, 0.009, 8, 24).rotateX(Math.PI / 2);
        I(hE.ringAlu, tor.clone().translate(x, 0.47, z));
        I(hE.ringAlu, tor.translate(x, 0.075, z));
      }
    // Cooling pipes and a maintenance platform.
    I(hE.white, cylX(0.01, 0.9, 1.35, 0.52, -1.05, 8));
    I(hE.yellow, bb(0.75, 0.85, 0.0, 0.25, -0.75, -0.65));
  }

  // ============================================================ LAYER 2: TRANSFORMER FACTORY
  {
    const { P, R } = makePeel(facG, FAC, facTex, "roofFac");
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++) P(R.solar, new THREE.BoxGeometry(0.46, 0.008, 0.18).rotateX(-0.3).translate(2.85 + k * 0.56, FAC.h + 0.06, -2.4 + r * 0.55));
    // Dock door on the east face.
    put(facG, ctxM.dark, bb(FAC.x1, FAC.x1 + 0.006, 0, 0.32, -1.5, -1.1));
    const I = putter(facG);
    // CRGO steel coils on pallets (eye vertical), two-high.
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) {
        const x = 2.68 + i * 0.2,
          z = -2.55 + j * 0.24;
        I(fE.pallet, bb(x - 0.09, x + 0.09, 0, 0.02, z - 0.09, z + 0.09));
        I(fE.crgo, ring(0.035, 0.085, 0.065, x, 0.02, z));
        if ((i + j) % 2 === 0) I(fE.crgo, ring(0.035, 0.085, 0.065, x, 0.09, z));
        I(fE.dark, ring(0.0855, 0.087, 0.012, x, 0.045, z, 24));
      }
    // Slitting line feeding the core-stacking table.
    I(fE.blue, rb(0.28, 0.1, 0.12, 0.01, 3.0, 0, -1.95));
    I(fE.crgo, cylZ(0.05, 0.08, 2.84, 0.15, -1.95, 18));
    I(fE.crgo, bb(3.14, 3.3, 0.098, 0.102, -1.98, -1.92));
    // Three-limb core being stacked on its table.
    {
      const cx = 3.52,
        cz = -2.25;
      I(fE.dark, bb(cx - 0.22, cx + 0.22, 0, 0.05, cz - 0.1, cz + 0.1));
      for (const ox of [-0.16, 0, 0.16]) I(fE.crgo, bx(0.06, 0.32, 0.07, cx + ox, 0.08, cz));
      I(fE.crgo, bx(0.4, 0.06, 0.07, cx, 0.05, cz));
      I(fE.crgo, bx(0.4, 0.05, 0.07, cx, 0.4, cz - 0.0)); // top yoke (being laid)
      // Finished copper coils waiting to be lowered over the limbs.
      for (let k = 0; k < 3; k++) {
        const x = 3.32 + k * 0.2;
        I(fE.copper, ring(0.045, 0.075, 0.24, x, 0, -1.72, 24));
        for (const y of [0.05, 0.12, 0.19]) I(fE.paper, ring(0.0755, 0.078, 0.015, x, y, -1.72, 24));
      }
    }
    // Copper rod coils + conductor drums.
    for (let i = 0; i < 3; i++) {
      const x = 2.7 + i * 0.2,
        z = -1.45;
      I(fE.pallet, bb(x - 0.08, x + 0.08, 0, 0.02, z - 0.08, z + 0.08));
      I(fE.copper, new THREE.TorusGeometry(0.055, 0.022, 10, 24).rotateX(Math.PI / 2).translate(x, 0.045, z));
      I(fE.copper, new THREE.TorusGeometry(0.055, 0.022, 10, 24).rotateX(Math.PI / 2).translate(x, 0.085, z));
    }
    // Winding machine: headstock, mandrel with a disc winding, tailstock, pay-off drum.
    {
      const z = -1.15,
        y = 0.16;
      I(fE.blue, rb(0.1, 0.22, 0.14, 0.012, 3.15, 0, z));
      I(fE.blue, rb(0.06, 0.2, 0.1, 0.01, 3.62, 0, z));
      I(fE.steel, cylX(0.012, 0.42, 3.38, y, z, 10));
      I(fE.copper, cylX(0.07, 0.2, 3.38, y, z, 24));
      for (let k = 0; k < 5; k++) I(fE.paper, cylX(0.072, 0.006, 3.3 + k * 0.04, y, z, 24));
      I(fE.dark, bb(3.08, 3.68, 0, 0.02, z - 0.08, z + 0.08));
      I(fE.copper, cylZ(0.06, 0.07, 3.38, 0.06, z + 0.25, 20));
      I(fE.dark, cylZ(0.072, 0.008, 3.38, 0.06, z + 0.21, 20));
      I(fE.dark, cylZ(0.072, 0.008, 3.38, 0.06, z + 0.29, 20));
      I(fE.copper, bar(THREE, [3.38, 0.12, z + 0.25], [3.38, y + 0.06, z + 0.02], 0.003, 4));
    }
    // Aluminium ingot stacks (criss-cross) by the west wall.
    for (let s = 0; s < 2; s++) {
      const x = 2.68,
        z = -0.98 + s * 0.2;
      for (let l = 0; l < 5; l++)
        for (let k = 0; k < 3; k++) {
          const along = l % 2 === 0;
          const o = (k - 1) * 0.04;
          I(fE.alu, along ? bx(0.13, 0.024, 0.035, x, l * 0.025, z + o) : bx(0.035, 0.024, 0.13, x + o, l * 0.025, z));
        }
    }
    // Finished transformer in the test bay under the gantry crane.
    {
      const x = 3.92,
        z = -1.3;
      I(fE.tank, rb(0.26, 0.24, 0.2, 0.014, x, 0.02, z));
      I(fE.dark, bb(x - 0.15, x + 0.15, 0, 0.02, z - 0.12, z + 0.12));
      for (let i = 0; i < 3; i++) I(fE.porc, cyl(0.013, 0.14, x - 0.07 + i * 0.07, 0.26, z, 10, 0.007));
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) I(fE.tank, bb(x - 0.1 + i * 0.05 - 0.014, x - 0.1 + i * 0.05 + 0.014, 0.05, 0.22, z + s * 0.1, z + s * 0.14));
      // Gantry crane: runway beams along Z, bridge along X, hook block.
      for (const rx of [FAC.x0 + 0.06, FAC.x1 - 0.06]) I(fE.yellow, bb(rx - 0.015, rx + 0.015, 0.53, 0.56, FAC.z0 + 0.06, FAC.z1 - 0.06));
      I(fE.yellow, bb(FAC.x0 + 0.06, FAC.x1 - 0.06, 0.56, 0.6, z - 0.03, z + 0.03));
      for (const rx of [FAC.x0 + 0.06, FAC.x1 - 0.06])
        for (const cz of [FAC.z0 + 0.1, (FAC.z0 + FAC.z1) / 2, FAC.z1 - 0.1]) I(fE.yellow, bb(rx - 0.014, rx + 0.014, 0, 0.53, cz - 0.014, cz + 0.014));
      I(fE.dark, bx(0.06, 0.05, 0.08, x, 0.5, z));
      I(fE.steel, bar(THREE, [x, 0.5, z], [x, 0.4, z], 0.003, 4));
    }
  }
  // Low-loader on the east road hauling a transformer out to site.
  {
    const x = (ROAD_X[0] + ROAD_X[1]) / 2,
      z = 0.4;
    const C = putter(facG);
    C(ctxM.trailer, bb(x - 0.08, x + 0.08, 0.03, 0.05, z - 0.42, z + 0.22));
    C(ctxM.cab, rb(0.15, 0.11, 0.13, 0.015, x, 0.03, z - 0.5));
    C(ctxM.glass, bb(x - 0.065, x + 0.065, 0.09, 0.13, z - 0.568, z - 0.564));
    const wheel = cylX(0.022, 0.03, 0, 0.022, 0, 12);
    const items: { p: Vec3 }[] = [];
    for (const s of [-1, 1]) for (const wz of [-0.5, -0.3, -0.2, 0.0, 0.1, 0.2]) items.push({ p: [x + s * 0.07, 0, z + wz] });
    inst(facG, wheel, ctxM.tyre, items);
    C(l0.green, rb(0.13, 0.15, 0.2, 0.012, x, 0.05, z - 0.05));
    for (let i = 0; i < 3; i++) C(ctxM.dark, cyl(0.009, 0.05, x - 0.04 + i * 0.04, 0.2, z - 0.05, 8));
  }

  // ============================================================ LAYER 3: GRID CONTROL CENTRE
  {
    const { P, R } = makePeel(ccG, CC, ccTex, "roofCc");
    for (let i = 0; i < 2; i++) P(R.unit, rb(0.2, 0.06, 0.16, 0.01, -3.7 + i * 0.5, CC.h, 2.0));
    const I = putter(ccG);
    // Curved video wall: three panels on a frame, one wide texture split across them.
    {
      const W = 0.62,
        H = 0.34,
        y = 0.2,
        zw = CC.z0 + 0.12;
      const panel = (k: number, cx: number, cz: number, ry: number) => {
        const g = new THREE.PlaneGeometry(W, H);
        const uv = g.getAttribute("uv") as T.BufferAttribute;
        for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + k) / 3);
        g.rotateY(ry).translate(cx, y + H / 2, cz);
        I(gridWallMat, g);
        const fr = new THREE.BoxGeometry(W + 0.02, H + 0.02, 0.012).rotateY(ry).translate(cx - Math.sin(ry) * 0.008, y + H / 2, cz - Math.cos(ry) * 0.008);
        I(cE.dark, fr);
      };
      const ang = 0.38;
      panel(1, -3.15, zw, 0);
      panel(0, -3.15 - W / 2 - (Math.cos(ang) * W) / 2, zw + (Math.sin(ang) * W) / 2, ang);
      panel(2, -3.15 + W / 2 + (Math.cos(ang) * W) / 2, zw + (Math.sin(ang) * W) / 2, -ang);
      I(cE.dark, bb(-4.1, -2.2, 0, y, zw - 0.03, zw + 0.02));
    }
    // Operator desks in three curved rows facing the wall.
    {
      const desk = new THREE.BoxGeometry(0.2, 0.012, 0.08);
      for (let r = 0; r < 3; r++) {
        const z = 1.28 + r * 0.32;
        const n = 5 - (r === 0 ? 1 : 0);
        for (let k = 0; k < n; k++) {
          const t = (k - (n - 1) / 2) * 0.22;
          const x = -3.15 + t;
          const dz = z + (t * t) * 0.6;
          const ry = -t * 0.9;
          I(cE.desk, desk.clone().rotateY(ry).translate(x, 0.075, dz));
          I(cE.dark, new THREE.BoxGeometry(0.18, 0.07, 0.01).rotateY(ry).translate(x + Math.sin(ry) * 0.035, 0.035, dz + Math.cos(ry) * 0.035));
          const sg = new THREE.PlaneGeometry(0.17, 0.045);
          const sb = new THREE.BoxGeometry(0.175, 0.05, 0.006);
          const lx = x - Math.sin(ry) * 0.025,
            lz = dz - Math.cos(ry) * 0.025;
          I(cE.dark, sb.rotateY(ry).translate(lx, 0.11, lz));
          I(cE.screen, sg.rotateY(ry).translate(lx + Math.sin(ry) * 0.0035, 0.11, lz + Math.cos(ry) * 0.0035));
          I(cE.chair, cyl(0.022, 0.05, x + Math.sin(ry) * 0.08, 0, dz + Math.cos(ry) * 0.08, 10));
          I(cE.chair, bx(0.04, 0.045, 0.008, x + Math.sin(ry) * 0.1, 0.05, dz + Math.cos(ry) * 0.1));
        }
      }
    }
    // Power-exchange screen on the west wall + a trading desk.
    {
      const zc = 1.55;
      const g = new THREE.PlaneGeometry(0.72, 0.34).rotateY(Math.PI / 2).translate(CC.x0 + 0.08, 0.36, zc);
      I(pxMat, g);
      I(cE.dark, bb(CC.x0 + 0.06, CC.x0 + 0.075, 0.18, 0.54, zc - 0.37, zc + 0.37));
      I(cE.dark, bb(CC.x0 + 0.05, CC.x0 + 0.08, 0, 0.18, zc - 0.05, zc + 0.05));
      for (let k = 0; k < 3; k++) {
        const z = zc - 0.22 + k * 0.22;
        I(cE.desk, bb(-4.05, -3.95, 0.07, 0.082, z - 0.09, z + 0.09));
        I(cE.dark, bb(-4.0, -3.997, 0.09, 0.14, z - 0.07, z + 0.07));
        I(cE.screen, new THREE.PlaneGeometry(0.13, 0.045).rotateY(-Math.PI / 2).translate(-4.003, 0.115, z));
        I(cE.chair, cyl(0.022, 0.05, -4.11, 0, z, 10));
      }
    }
    // Server racks / UPS room in the north-east corner.
    for (let k = 0; k < 4; k++) {
      I(cE.dark, bx(0.08, 0.26, 0.1, -2.12, 0, 0.75 + k * 0.11));
      I(cE.greenLed, bb(-2.163, -2.161, 0.05, 0.22, 0.72 + k * 0.11, 0.73 + k * 0.11));
    }
    // Microwave / OPGW communication mast on the roof (lifts away with it), with two dishes.
    {
      const mx = -4.05,
        mz = 2.15,
        y0 = CC.h;
      const lat: T.BufferGeometry[] = [];
      const Hm = 0.55;
      const cs: Vec2[] = [
        [0, 1],
        [0.866, -0.5],
        [-0.866, -0.5],
      ];
      const r = (y: number) => lerp(0.035, 0.015, y / Hm);
      for (const c of cs) lat.push(bar(THREE, [mx + c[0] * r(0), y0, mz + c[1] * r(0)], [mx + c[0] * r(Hm), y0 + Hm, mz + c[1] * r(Hm)], 0.0035, 4));
      for (let k = 0; k < 6; k++) {
        const ya = (k * Hm) / 6,
          yb = ((k + 1) * Hm) / 6;
        for (let f = 0; f < 3; f++) {
          const a = cs[f],
            b = cs[(f + 1) % 3];
          lat.push(bar(THREE, [mx + a[0] * r(ya), y0 + ya, mz + a[1] * r(ya)], [mx + b[0] * r(yb), y0 + yb, mz + b[1] * r(yb)], 0.002, 3));
        }
      }
      P(R.dark, mergeInto(THREE, lat));
      const dish = new THREE.SphereGeometry(0.045, 16, 8, 0, Math.PI * 2, 0, 0.9).rotateX(-Math.PI / 2);
      P(R.unit, dish.clone().rotateY(Math.PI * 0.75).translate(mx + 0.03, y0 + 0.45, mz + 0.03));
      P(R.unit, dish.rotateY(-Math.PI * 0.6).translate(mx - 0.03, y0 + 0.32, mz - 0.02));
    }
  }

  // ------------------------------------------------------------ context: trees and cars
  {
    type R4 = [number, number, number, number];
    const rects: R4[] = [
      [YARD.x0 - 0.15, YARD.x1 + 0.15, YARD.z0 - 0.15, YARD.z1 + 0.15],
      [FAC.x0 - 0.2, PX, FAC.z0 - 0.2, FAC.z1 + 0.2],
      [CC.x0 - 0.15, CC.x1 + 0.3, CC.z0 - 0.25, PZ],
      [TR.x0 - 0.5, TR.x1 + 0.35, TR.z0 - 0.15, TR.z1 + 0.35],
      [2.5, PX, 1.9, PZ],
      [-PX, PX, ROAD_Z[0] - 0.08, PZ],
      [ROAD_X[0] - 0.1, PX, -PZ, PZ],
      [-3.95, -2.75, -1.35, -0.45], // stringing site
      [0.9, 1.75, -PZ, YARD.z0], // DC line corridor
    ];
    const segDist = (px: number, pz: number, a: Vec2, b: Vec2) => {
      const vx = b[0] - a[0],
        vz = b[1] - a[1];
      const t = clamp01(((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz));
      return Math.hypot(px - a[0] - t * vx, pz - a[1] - t * vz);
    };
    const corridor: Vec2[] = [
      [-PX, -2.95],
      [-4.1, -2.55],
      [-2.6, -1.85],
      [-1.3, -0.95],
    ];
    const blocked = (x: number, z: number) => {
      if (Math.abs(x) > PX - 0.15 || Math.abs(z) > PZ - 0.15) return true;
      for (const [x0, x1, z0, z1] of rects) if (x > x0 && x < x1 && z > z0 && z < z1) return true;
      for (let i = 0; i < corridor.length - 1; i++) if (segDist(x, z, corridor[i], corridor[i + 1]) < 0.38) return true;
      return false;
    };
    const crown = new THREE.IcosahedronGeometry(0.075, 1).scale(1, 1.05, 1).translate(0, 0.13, 0);
    const conifer = new THREE.ConeGeometry(0.06, 0.22, 7, 1).translate(0, 0.13, 0);
    const trunk = new THREE.CylinderGeometry(0.009, 0.012, 0.07, 5).translate(0, 0.035, 0);
    const a: { p: Vec3; ry: number; s: Vec3; c: number }[] = [];
    const b: typeof a = [];
    const tr: { p: Vec3; s: Vec3 }[] = [];
    const tint = (c0: number, c1: number) => new THREE.Color(c0).lerp(new THREE.Color(c1), rnd()).getHex();
    for (let i = 0; i < 6000 && a.length + b.length < 120; i++) {
      const x = (rnd() * 2 - 1) * PX,
        z = (rnd() * 2 - 1) * PZ;
      if (blocked(x, z)) continue;
      if ([...a, ...b].some((t) => Math.hypot(t.p[0] - x, t.p[2] - z) < 0.16)) continue;
      const s = 0.75 + rnd() * 0.6;
      const it = { p: [x, 0, z] as Vec3, ry: rnd() * 6.28, s: [s, s * (0.85 + rnd() * 0.35), s] as Vec3, c: 0 };
      if (rnd() < 0.35) {
        it.c = tint(0x2f4a33, 0x4a6440);
        b.push(it);
      } else {
        it.c = tint(0x4f6b3a, 0x7a8a4a);
        a.push(it);
        tr.push({ p: it.p, s: it.s });
      }
    }
    inst(lineG, crown, ctxM.canopy, a);
    inst(lineG, conifer, ctxM.canopy, b);
    inst(lineG, trunk, ctxM.trunk, tr);
    // Parked cars outside the control centre.
    const car = mergeInto(THREE, [rb(0.15, 0.045, 0.075, 0.015, 0, 0.012, 0), rb(0.085, 0.035, 0.068, 0.014, -0.01, 0.05, 0)]);
    const cars: { p: Vec3; c: number }[] = [];
    const cc = [0xd8dde2, 0x2b62c4, 0xb23a2e, 0x3a3f44, 0xeef1f3];
    for (let k = 0; k < 5; k++) cars.push({ p: [-3.95 + k * 0.42, 0, 2.56], c: cc[k] });
    inst(ccG, car, ctxM.car, cars.map((c) => ({ ...c, ry: Math.PI / 2 })));
  }

  // ------------------------------------------------------------ flush batches
  for (const b of batches.values()) {
    const m = new THREE.Mesh(b.geos.length === 1 ? b.geos[0] : mergeInto(THREE, b.geos), b.mat);
    b.parent.add(m);
  }

  // ------------------------------------------------------------ levels
  const ease = (x: number) => {
    const t = clamp01(x);
    return t * t * (3 - 2 * t);
  };
  const peel = (p: Peel, t: number) => {
    const e = ease(t);
    p.plane.constant = lerp(p.b.h, DADO, e);
    p.cap.position.y = p.plane.constant;
    p.roof.position.y = e * 0.6;
    L.set(p.bucket, 1 - smoothstep(t, 0.04, 0.55));
  };
  const [pGis, pValve, pFac, pCc] = peels;
  const GHOST = 0.28;
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      peel(pGis, a);
      peel(pValve, a);
      peel(pFac, b);
      peel(pCc, c);
      L.set("trees", lerp(1, 0.4, ease(a)));
      L.set("ctx", lerp(1, 0.45, ease(a)));
      L.set("l0", lerp(1, GHOST, ease(a)));
      L.set("yard", lerp(1, GHOST, ease(b)));
      L.set("l1in", smoothstep(a, 0.15, 0.85) * lerp(1, GHOST, ease(b)));
      L.set("l2in", smoothstep(b, 0.15, 0.85) * lerp(1, GHOST + 0.07, ease(c)));
      L.set("l3in", smoothstep(c, 0.15, 0.85));
    },
  };
}
