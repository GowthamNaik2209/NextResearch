// Data centre / AI infrastructure — a hyperscale AI data-centre campus.
//
// A long low-rise data hall wrapped in anthracite vertical fins over light
// cladding, a glazed three-storey office / NOC block on its east end, rooftop
// air-cooled chillers and exhaust-fan arrays, all inside a fenced, landscaped
// site with a perimeter road. Around it: a containerised diesel-genset yard
// with bulk fuel tanks (NW), an HV substation with gantries, power
// transformers and an MV switch-house fed from an overhead line (SW), and a
// cooling yard of induced-draft cooling towers and dry coolers (NE).
//
// +X runs east along the hall. Layers are systems:
//   0 Building            site, landscaping, hall shell, office block
//   1 Site Infrastructure gensets, fuel, substation, cooling plant, rooftop
//                         chillers, UPS / battery rooms inside the west bay
//   2 White Space         raised floor, CRAH galleries, cold-aisle containment,
//                         overhead busways and cable trays, lighting
//   3 Racks & Compute     instanced server / GPU / network racks with blinking
//                         LED fronts, liquid-cooling CDUs and manifolds
// Level 0 shows the complete solid campus; deeper levels ghost the roof and
// walls away and bring each system forward.
import type * as T from "three";
import {
  type Three,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  contactShadow,
  lerp,
  mergeInto,
  layerMats,
  roundedBox,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

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

export function buildDatacenter(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [bldgG, siteG, wsG, rackG] = ctx.layerGroups;
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
  /** Box geometry centred at (x, y, z) — for merging. */
  const bx = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    return g;
  };
  const R = rng(20251014);

  // ---------------------------------------------------------------- dims
  const HX0 = -2.5,
    HX1 = 2.5,
    HZ = 1.5; // hall outer footprint
  const WT = 0.04; // wall thickness
  const ROOF = 1.0; // roof slab underside
  const PAD = 0.025; // yard slab top
  const FL = 0.06; // raised-floor top
  const EB = -1.8; // electrical-bay partition
  const RW = 0.085,
    RH = 0.34,
    RD = 0.17; // rack width / height / depth
  const RTOP = FL + RH;

  // ---------------------------------------------------------------- textures
  // Site plan painted onto one ground plane: grass, perimeter road, aprons,
  // yards, parking.
  const GX = 16,
    GZ = 12;
  const siteTex = canvasTexture(THREE, 2048, 1536, (g, w, h) => {
    const s = w / GX;
    const P = (x: number, z: number): [number, number] => [(x + GX / 2) * s, (z + GZ / 2) * s];
    const rect = (x0: number, z0: number, x1: number, z1: number, c: string) => {
      const [a, b] = P(x0, z0);
      g.fillStyle = c;
      g.fillRect(a, b, (x1 - x0) * s, (z1 - z0) * s);
    };
    const noise = (x0: number, z0: number, x1: number, z1: number, cols: string[], n: number, sz: number) => {
      for (let i = 0; i < n; i++) {
        const [a, b] = P(lerp(x0, x1, R()), lerp(z0, z1, R()));
        g.fillStyle = cols[i % cols.length];
        g.fillRect(a, b, sz * (0.5 + R()), sz * (0.5 + R()));
      }
    };
    g.fillStyle = "#435238";
    g.fillRect(0, 0, w, h);
    noise(-8, -6, 8, 6, ["#405036", "#46553b"], 30000, 4);
    // Mown landscape bands and darker planting beds inside the fence.
    rect(-5.55, -3.8, 5.55, 3.8, "#4c5c3e");
    noise(-5.55, -3.8, 5.55, 3.8, ["#495a3c", "#4f6040"], 12000, 3);
    // Perimeter ring road (outer edge) + gate road + office spur.
    const road = "#34373b";
    const ringO = 5.45,
      ringI = 4.95,
      rzO = 3.65,
      rzI = 3.15;
    rect(-ringO, -rzO, ringO, rzO, road);
    rect(-ringI, -rzI, ringI, rzI, "#4c5c3e");
    noise(-ringI, -rzI, ringI, rzI, ["#495a3c", "#4f6040"], 8000, 3);
    rect(3.9, rzO - 0.1, 4.5, 6, road); // gate road to the public road
    rect(-8, 5.0, 8, 5.6, road); // public road along the south edge
    noise(-8, 5.0, 8, 5.6, ["#2f3236", "#393c40"], 1500, 4);
    // Concrete aprons and yards.
    rect(-2.95, -1.95, 2.95, 1.95, "#6b6e72");
    rect(-0.35, -rzI, 0.35, -1.9, "#5d6064"); // service road north
    rect(-2.95, 1.9, -2.6, rzI, "#5d6064");
    rect(2.6, -0.9, 3.95, 0.35, "#5d6064");
    rect(-4.8, -3.08, -2.66, -0.72, "#727477"); // genset yard
    rect(2.66, -3.08, 4.82, -0.8, "#727477"); // cooling yard
    rect(-4.9, 0.5, -2.66, 3.08, "#6a675f"); // substation gravel
    noise(-4.9, 0.5, -2.66, 3.08, ["#5f5c55", "#79756c", "#827d73"], 7000, 3);
    // Office forecourt + parking with stall lines.
    rect(3.85, 0.3, 4.92, 3.15, road);
    rect(2.5, 2.7, 3.85, 3.15, "#7c7f83"); // entrance plaza
    g.strokeStyle = "#c9ccd0";
    g.lineWidth = 2;
    for (const xl of [3.95, 4.82]) {
      for (let z = 0.45; z <= 2.95; z += 0.16) {
        const [a, b] = P(xl, z);
        g.beginPath();
        g.moveTo(a, b);
        g.lineTo(a + (xl < 4.4 ? 0.28 : -0.28) * s, b);
        g.stroke();
      }
    }
    // Road centre dashes.
    g.strokeStyle = "#d8d2b8";
    g.lineWidth = 3;
    g.setLineDash([22, 22]);
    const rc = (ringO + ringI) / 2,
      rzc = (rzO + rzI) / 2;
    g.beginPath();
    const c0 = P(-rc, -rzc),
      c1 = P(rc, rzc);
    g.rect(c0[0], c0[1], c1[0] - c0[0], c1[1] - c0[1]);
    g.stroke();
    g.setLineDash([]);
    // Yard markings.
    g.strokeStyle = "#c9a23a";
    g.lineWidth = 3;
    for (const [x0, z0, x1, z1] of [
      [-4.75, -3.03, -2.71, -0.77],
      [2.71, -3.03, 4.77, -0.85],
    ]) {
      const a = P(x0, z0),
        b = P(x1, z1);
      g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    }
    // Hall slab edge shadow line.
    g.fillStyle = "rgba(0,0,0,0.25)";
    const a = P(HX0 - 0.06, HZ + 0.02);
    g.fillRect(a[0], a[1], (HX1 - HX0 + 0.12) * s, 0.06 * s);
  });

  const cladTex = canvasTexture(THREE, 512, 256, (g, w, h) => {
    g.fillStyle = "#d4d8dc";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = "#b9bec4";
      g.fillRect(0, y, w, 2);
    }
    for (let x = 0; x < w; x += 128) {
      g.fillStyle = "#c3c8cd";
      g.fillRect(x, 0, 2, h);
    }
  });
  cladTex.wrapS = cladTex.wrapT = THREE.RepeatWrapping;
  cladTex.repeat.set(6, 3);

  const roofTex = canvasTexture(THREE, 512, 512, (g, w, h) => {
    g.fillStyle = "#a3a9af";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = R() > 0.5 ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)";
      g.fillRect(R() * w, R() * h, 3 + R() * 8, 3 + R() * 8);
    }
    g.fillStyle = "#8f959b";
    for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 2);
  });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
  roofTex.repeat.set(5, 3);

  const louvreTex = (bg: string, slat: string, step: number) =>
    canvasTexture(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = slat;
      for (let y = 10; y < h - 10; y += step) g.fillRect(8, y, w - 16, step * 0.45);
      g.strokeStyle = "#3a4047";
      g.lineWidth = 6;
      g.strokeRect(3, 3, w - 6, h - 6);
    });
  const towerTex = louvreTex("#8a9299", "#4c535b", 12);

  const coilTex = canvasTexture(THREE, 512, 64, (g, w, h) => {
    g.fillStyle = "#8e959c";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) {
      g.fillStyle = x % 6 ? "#5b6269" : "#737a81";
      g.fillRect(x, 6, 2, h - 12);
    }
    g.fillStyle = "#9da4ab";
    for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 6, h);
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
  });

  const fanTex = canvasTexture(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = "#15181c";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#717880";
    g.lineWidth = 2;
    // Five swept blades under the guard rings. Everything here is round except the blades, so
    // turning the whole texture (see the chiller fans' onBeforeRender) reads as the fans spinning.
    g.fillStyle = "#3b4148";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.moveTo(w / 2, h / 2);
      g.arc(w / 2, h / 2, 58, a, a + 0.7);
      g.closePath();
      g.fill();
    }
    for (let r = 18; r < 64; r += 12) {
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = "#5a6168";
    g.beginPath();
    g.arc(w / 2, h / 2, 10, 0, Math.PI * 2);
    g.fill();
  });

  const gensetTex = canvasTexture(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = "#d8d5cc";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = "#c6c3ba";
      g.fillRect(x, 0, 3, h);
    }
    g.fillStyle = "#3d4248"; // radiator louvres at one end, intake at the other
    for (let y = 14; y < h - 26; y += 9) {
      g.fillRect(12, y, 70, 5);
      g.fillRect(w - 82, y, 70, 5);
    }
    g.strokeStyle = "#8c8a83";
    g.lineWidth = 3;
    for (const x of [150, 250, 350]) g.strokeRect(x, 14, 90, h - 40);
    g.fillStyle = "#d96c2b";
    g.fillRect(0, h - 20, w, 10);
  });

  const crahTex = canvasTexture(THREE, 128, 256, (g, w, h) => {
    g.fillStyle = "#cfd3d8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6c737b";
    for (let y = 120; y < h - 14; y += 7) g.fillRect(12, y, w - 24, 3);
    for (let y = 16; y < 100; y += 7) g.fillRect(12, y, w - 24, 2);
    g.fillStyle = "#1d3a5c";
    g.fillRect(w - 44, 104, 30, 12);
    g.strokeStyle = "#9aa1a8";
    g.lineWidth = 3;
    g.strokeRect(2, 2, w - 4, h - 4);
  });

  // Raised floor: 600 mm tiles, perforated tiles down every cold aisle.
  const WS0 = EB + 0.02,
    WS1 = HX1 - WT - 0.005;
  const WZ = HZ - WT - 0.005;
  const PODS = [-0.75, 0, 0.75];
  const SEGS: [number, number][] = [
    [-1.3, 17],
    [0.42, 22],
  ];
  const floorTex = canvasTexture(THREE, 2048, 1408, (g, w, h) => {
    const sx = w / (WS1 - WS0),
      sz = h / (2 * WZ);
    g.fillStyle = "#b3b9bf";
    g.fillRect(0, 0, w, h);
    for (const zc of PODS)
      for (const [x0, n] of SEGS) {
        const px = (x0 - WS0) * sx,
          pz = (zc - 0.09 + WZ) * sz;
        g.fillStyle = "#98a0a8";
        g.fillRect(px, pz, n * RW * sx, 0.18 * sz);
        g.fillStyle = "#6f777f";
        for (let x = px + 4; x < px + n * RW * sx; x += 7)
          for (let z = pz + 4; z < pz + 0.18 * sz - 2; z += 7) g.fillRect(x, z, 3, 3);
      }
    g.strokeStyle = "#8a9097";
    g.lineWidth = 2;
    for (let x = 0; x < w; x += RW * sx) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let z = 0; z < h; z += RW * sz) {
      g.beginPath();
      g.moveTo(0, z);
      g.lineTo(w, z);
      g.stroke();
    }
  });

  // Rack fronts: an albedo map plus a 4-frame LED atlas (emissive) that is
  // scrolled over time so the activity LEDs blink.
  type RackKind = "cpu" | "gpu" | "net" | "cdu";
  const rackTex = (kind: RackKind) => {
    const W = 128,
      H = 512;
    const leds: { x: number; y: number; c: string; steady: boolean }[] = [];
    const map = canvasTexture(THREE, W, H, (g) => {
      g.fillStyle = kind === "cdu" ? "#d3d7dc" : "#0c0e11";
      g.fillRect(0, 0, W, H);
      if (kind === "cdu") {
        g.fillStyle = "#2457a8";
        g.fillRect(0, 30, W, 14);
        g.fillStyle = "#101418";
        g.fillRect(28, 70, 72, 46);
        g.fillStyle = "#7f868e";
        for (let y = 150; y < H - 30; y += 8) g.fillRect(14, y, W - 28, 3);
        leds.push({ x: 40, y: 84, c: "#49d4c9", steady: true }, { x: 60, y: 84, c: "#3dff8a", steady: true });
        leds.push({ x: 80, y: 100, c: "#49d4c9", steady: false });
        return;
      }
      let y = 14;
      while (y < H - 18) {
        let u = kind === "gpu" ? (R() < 0.18 ? 1 : 4) : kind === "net" ? 1 : R() < 0.55 ? 1 : 2;
        if (kind === "gpu" && y > 220 && y < 290) u = 1; // NVLink switch trays mid-rack
        const hh = u * 11.4;
        if (y + hh > H - 14) break;
        const blank = kind === "cpu" && R() < 0.12;
        g.fillStyle = blank ? "#111316" : kind === "gpu" ? (u > 1 ? "#1d2024" : "#2a2f36") : "#20242a";
        g.fillRect(9, y + 1, W - 18, hh - 2);
        if (!blank) {
          if (kind === "gpu" && u > 1) {
            g.fillStyle = "#5c4a1f";
            g.fillRect(11, y + 3, 4, hh - 6);
            g.fillStyle = "#30353c";
            for (let x = 22; x < W - 20; x += 6) g.fillRect(x, y + 4, 3, hh - 8);
            leds.push({ x: 13, y: y + hh / 2, c: "#49d4c9", steady: true });
            leds.push({ x: W - 16, y: y + 5, c: "#3dff8a", steady: false });
          } else if (kind === "net") {
            g.fillStyle = "#9aa1a8";
            for (let x = 16; x < W - 14; x += 6) {
              g.fillRect(x, y + 2, 4, 3);
              g.fillRect(x, y + 6, 4, 3);
              if (R() < 0.75) leds.push({ x: x + 2, y: y + 1, c: R() < 0.85 ? "#3dff8a" : "#ffb020", steady: false });
            }
            g.strokeStyle = R() < 0.5 ? "#e0b52c" : "#3fa6d9";
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(20 + R() * 80, y + 8);
            g.quadraticCurveTo(W - 8, y + 16, W - 6, y + 30);
            g.stroke();
          } else {
            g.fillStyle = "#3a4049";
            for (let x = 16; x < 70; x += 9) g.fillRect(x, y + 3, 7, hh - 6);
            g.fillStyle = "#2c3138";
            g.fillRect(76, y + 3, 34, hh - 6);
            leds.push({ x: 114, y: y + hh / 2, c: "#4aa8ff", steady: true });
            leds.push({ x: 118, y: y + hh / 2, c: R() < 0.9 ? "#3dff8a" : "#ffb020", steady: false });
          }
        }
        y += hh;
      }
      g.strokeStyle = "#2b3037";
      g.lineWidth = 8;
      g.strokeRect(4, 4, W - 8, H - 8);
    });
    const led = canvasTexture(THREE, W, H * 4, (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H * 4);
      for (let f = 0; f < 4; f++)
        for (const l of leds) {
          if (!l.steady && R() < 0.45) continue;
          g.fillStyle = l.c;
          g.fillRect(l.x - 1.5, f * H + l.y - 1.5, 3, 3);
        }
    });
    led.repeat.set(1, 0.25);
    return { map, led };
  };
  const rearTex = canvasTexture(THREE, 128, 512, (g, w, h) => {
    g.fillStyle = "#121418";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = ["#1f3550", "#24282d", "#30353b", "#3d3520"][i % 4];
      g.fillRect(34 + i * 7, 10, 4, h - 20);
    }
    g.fillStyle = "#5a3020";
    g.fillRect(16, 20, 5, h - 40);
    g.fillRect(w - 21, 20, 5, h - 40);
    g.fillStyle = "rgba(0,0,0,0.55)"; // perforated rear door
    for (let y = 8; y < h - 8; y += 5) for (let x = 8 + ((y / 5) % 2) * 2; x < w - 8; x += 5) g.fillRect(x, y, 2.5, 2.5);
    g.strokeStyle = "#2b3037";
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  });

  // ---------------------------------------------------------------- materials
  const groundMat = L.add("ground", new THREE.MeshStandardMaterial({ map: siteTex, roughness: 0.95 }));
  const padMat = L.add("ground", std(0x76797c, 0, 0.9));
  const gravelMat = L.add("ground", std(0x6e6a62, 0, 1));
  const fencePost = L.add("ground", std(0x4b5259, 0.6, 0.45));
  const fenceFab = L.add("ground", std(0x2c3138, 0.5, 0.6, { side: DS, opacity: 0.45 }));
  const trunkMat = L.add("ground", std(0x4a3a2c, 0, 0.9));
  const leafMat = L.add("ground", std(0xffffff, 0, 0.85, { flatShading: true }));
  const carMat = L.add("ground", std(0xffffff, 0.6, 0.35));
  const carGlass = L.add("ground", std(0x161b22, 0.6, 0.15));
  const guardMat = L.add("ground", std(0xd3d6d9, 0.1, 0.6));
  const lampMat = L.add("ground", std(0x5a6168, 0.6, 0.4));

  const wallMat = L.add("shell", new THREE.MeshStandardMaterial({ map: cladTex, roughness: 0.55, metalness: 0.2, side: DS }));
  const finMat = L.add("shell", std(0x2b3036, 0.65, 0.35));
  const plinthMat = L.add("shell", std(0x4d5258, 0.1, 0.8));
  const doorMat = L.add("shell", std(0x8b939b, 0.6, 0.45));
  const roofMat = L.add("roof", new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85, side: DS }));
  const parapetMat = L.add("roof", std(0xc9ced3, 0.2, 0.55, { side: DS }));
  const roofFanMat = L.add("roof", std(0x9aa1a8, 0.7, 0.35));

  const glassMat = L.add(
    "office",
    new THREE.MeshPhysicalMaterial({ color: 0x223448, metalness: 0.4, roughness: 0.06, clearcoat: 1, side: DS })
  );
  const mullion = L.add("office", std(0xb7bec5, 0.85, 0.3));
  const slabMat = L.add("office", std(0xe6e8ea, 0.05, 0.55));
  const lobbyLight = L.add("office", std(0xfff1d6, 0, 0.5, { emissive: 0xffe2b0, emissiveIntensity: 0.55 }));
  const signTex = canvasTexture(THREE, 512, 96, (g, w, h) => {
    g.fillStyle = "#1a1f26";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#49d4c9";
    g.fillRect(24, 28, 40, 40);
    g.fillStyle = "#eef1f4";
    g.font = "bold 46px Arial";
    g.textBaseline = "middle";
    g.fillText("AI CAMPUS  DC-01", 84, h / 2 + 2);
  });
  const signMat = L.add("office", new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35 }));

  // Site infrastructure.
  const gensetMat = L.add("site", new THREE.MeshStandardMaterial({ map: gensetTex, roughness: 0.55, metalness: 0.3 }));
  const gensetTop = L.add("site", std(0xc9c6bd, 0.3, 0.55));
  const steelDark = L.add("site", std(0x30353b, 0.7, 0.4));
  const galv = L.add("site", std(0xa9b0b7, 0.85, 0.35));
  const tankMat = L.add("site", std(0xdcdad3, 0.35, 0.45));
  const xfmrMat = L.add("site", std(0x6f7a72, 0.5, 0.45));
  const radMat = L.add("site", std(0x5f6963, 0.55, 0.4));
  const porcelain = L.add("site", std(0x7a4a32, 0.1, 0.35));
  const conductor = L.add("site", std(0x9aa1a8, 0.9, 0.3));
  const switchHouse = L.add("site", std(0xbfc4c9, 0.2, 0.6));
  const towerMat = L.add("site", new THREE.MeshStandardMaterial({ map: towerTex, roughness: 0.6, metalness: 0.4 }));
  const coilMat = L.add("site", new THREE.MeshStandardMaterial({ map: coilTex, roughness: 0.5, metalness: 0.5 }));
  const unitBody = L.add("site", std(0xc7ccd1, 0.45, 0.45));
  const fanMat = L.add("site", new THREE.MeshStandardMaterial({ map: fanTex, roughness: 0.5, metalness: 0.4 }));
  const pipeBlue = L.add("site", std(0x3a78b5, 0.4, 0.4));
  const pipeGrey = L.add("site", std(0x8d969e, 0.6, 0.4));
  const upsMat = L.add("site", std(0xd8dce0, 0.3, 0.5));
  const battMat = L.add("site", std(0x24282e, 0.4, 0.5));
  const screenMat = L.add("site", std(0x0a0e12, 0, 0.3, { emissive: 0x3dd6a0, emissiveIntensity: 0.9 }));
  const bayFloor = L.add("site", std(0x8a9096, 0.05, 0.8));

  // White space.
  const floorMat = L.add("ws", new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.1 }));
  const plenumMat = L.add("ws", std(0x5c636a, 0.4, 0.6));
  const crahFront = L.add("wsx", new THREE.MeshStandardMaterial({ map: crahTex, roughness: 0.5, metalness: 0.3 }));
  const crahBody = L.add("wsx", std(0xc5cad0, 0.35, 0.5));
  const contGlass = L.add("ws", std(0xa9d8f0, 0.1, 0.05, { side: DS, opacity: 0.3 }));
  const contFrame = L.add("ws", std(0x2a2f35, 0.6, 0.4));
  const fibreTray = L.add("ws", std(0xe3b42e, 0.2, 0.45));
  const wireTray = L.add("ws", std(0xb9c0c7, 0.85, 0.3));
  const busway = L.add("ws", std(0x4c535b, 0.6, 0.4));
  const tapOff = L.add("ws", std(0xc99a2e, 0.4, 0.45));
  const rodMat = L.add("wsx", std(0x7d858d, 0.8, 0.4));
  const ledLight = L.add("wsx", std(0xffffff, 0, 0.4, { emissive: 0xeaf4ff, emissiveIntensity: 1.4 }));
  const sprinkler = L.add("wsx", std(0xb5322a, 0.4, 0.5));
  const partition = L.add("wsx", std(0xc8d6e0, 0.1, 0.1, { side: DS, opacity: 0.32 }));

  // Racks & compute.
  const rackSide = L.add("rack", std(0x2a2f36, 0.6, 0.4));
  const rackTop = L.add("rack", std(0x22262c, 0.5, 0.5));
  // Rear: PSU / NIC status LEDs down both sides, also blinking.
  const rearLed = canvasTexture(THREE, 128, 2048, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 2048);
    for (let f = 0; f < 4; f++)
      for (let y = 24; y < 500; y += 11.4 * (1 + Math.floor(R() * 2))) {
        for (const x of [26, 100, 108]) {
          if (R() < 0.35) continue;
          g.fillStyle = x === 26 ? "#3dff8a" : R() < 0.8 ? "#4aa8ff" : "#ffb020";
          g.fillRect(x - 1.5, f * 512 + y, 3, 3);
        }
      }
  });
  rearLed.repeat.set(1, 0.25);
  const rackRear = L.add(
    "rack",
    new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.6, metalness: 0.3, emissive: 0xffffff, emissiveMap: rearLed, emissiveIntensity: 1.6 })
  );
  const frontMat = (k: RackKind) => {
    const t = rackTex(k);
    const m = L.add(
      "rack",
      new THREE.MeshStandardMaterial({
        map: t.map,
        emissive: 0xffffff,
        emissiveMap: t.led,
        emissiveIntensity: 1.8,
        roughness: 0.45,
        metalness: 0.4,
      })
    );
    return { m, led: t.led };
  };
  const cpuFront = frontMat("cpu"),
    gpuFront = frontMat("gpu"),
    netFront = frontMat("net"),
    cduFront = frontMat("cdu");
  const cduBody = L.add("rack", std(0xd3d7dc, 0.3, 0.5));
  const coolSupply = L.add("rack", std(0x2f7fd0, 0.4, 0.35));
  const coolReturn = L.add("rack", std(0xe0703a, 0.4, 0.35));
  const patchMat = L.add("rack", std(0xe3b42e, 0.2, 0.5));

  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusPower = focus([gensetMat, gensetTop, upsMat], 0xd96c2b);
  const focusXfmr = focus([xfmrMat, radMat, switchHouse], 0x7a5cc7);
  const focusCool = focus([towerMat, unitBody, coilMat], 0x1e9e76);
  const focusTray = focus([fibreTray, tapOff], 0xc99a2e);

  // ================================================================ LAYER 0 — campus & building
  {
    const gp = new THREE.PlaneGeometry(GX, GZ);
    gp.rotateX(-Math.PI / 2);
    mesh(bldgG, gp, groundMat, [0, 0.002, 0]);
    // Yard slabs.
    mesh(bldgG, roundedBox(THREE, 2.14, 0.024, 2.36, 0.01), padMat, [-3.73, 0.012, -1.9]);
    mesh(bldgG, roundedBox(THREE, 2.16, 0.024, 2.28, 0.01), padMat, [3.74, 0.012, -1.94]);
    mesh(bldgG, new THREE.BoxGeometry(2.24, 0.02, 2.58), gravelMat, [-3.78, 0.01, 1.79]);
    bldgG.add(contactShadow(THREE, 6.4, 4.2, 0.55, 0.005));
  }

  // Perimeter fence with a gate gap at the south-east entrance.
  {
    const FX = 5.62,
      FZ = 3.86,
      FH = 0.17;
    const runs: [number, number, number, number][] = [
      [-FX, -FZ, FX, -FZ],
      [FX, -FZ, FX, FZ],
      [FX, FZ, 4.55, FZ],
      [3.85, FZ, -FX, FZ],
      [-FX, FZ, -FX, -FZ],
    ];
    const posts: T.BufferGeometry[] = [];
    const fab: T.BufferGeometry[] = [];
    for (const [x0, z0, x1, z1] of runs) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 0.32));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = lerp(x0, x1, t),
          z = lerp(z0, z1, t);
        posts.push(bx(0.012, FH, 0.012, x, FH / 2, z));
      }
      posts.push(bar(THREE, [x0, FH, z0], [x1, FH, z1], 0.004, 4));
      const p = new THREE.PlaneGeometry(len, FH - 0.01);
      p.rotateY(-Math.atan2(z1 - z0, x1 - x0));
      p.translate((x0 + x1) / 2, FH / 2, (z0 + z1) / 2);
      fab.push(p);
    }
    mesh(bldgG, mergeInto(THREE, posts), fencePost);
    mesh(bldgG, mergeInto(THREE, fab), fenceFab);
    // Guardhouse and boom barrier at the gate.
    mesh(bldgG, roundedBox(THREE, 0.3, 0.16, 0.22, 0.02), guardMat, [3.65, 0.08, 4.12]);
    mesh(bldgG, new THREE.BoxGeometry(0.36, 0.02, 0.28), finMat, [3.65, 0.17, 4.12]);
    mesh(bldgG, bar(THREE, [3.9, 0.07, 3.98], [4.5, 0.07, 3.98], 0.006, 6), doorMat);
    // Street lights along the ring road.
    const lamps: T.BufferGeometry[] = [];
    for (const [x, z] of [
      [-4.6, -3.35],
      [-1.5, -3.35],
      [1.5, -3.35],
      [4.6, -3.35],
      [-4.6, 3.35],
      [-1.5, 3.35],
      [1.5, 3.35],
      [5.2, 0],
      [-5.2, 0],
    ] as [number, number][]) {
      lamps.push(bar(THREE, [x, 0, z], [x, 0.42, z], 0.007, 6));
      lamps.push(bx(0.08, 0.012, 0.025, x + (x > 0 && Math.abs(z) < 1 ? -0.04 : 0), 0.42, z));
    }
    mesh(bldgG, mergeInto(THREE, lamps), lampMat);
  }

  // Trees (instanced) — screening belts outside the fence + planting inside.
  {
    const spots: [number, number, number][] = [];
    const add = (x: number, z: number, s = 1) => spots.push([x + (R() - 0.5) * 0.12, z + (R() - 0.5) * 0.12, s * (0.68 + R() * 0.4)]);
    for (let x = -6.1; x <= 6.1; x += 0.5) {
      add(x, -4.3);
      if (x < 3.6 || x > 4.8) add(x, 4.35);
    }
    for (let z = -3.9; z <= 3.9; z += 0.5) {
      add(6.15, z);
      if (z < 1.4 || z > 2.4) add(-6.15, z);
    }
    for (let x = -2.3; x <= 2.3; x += 0.42) add(x, 2.62, 0.8);
    for (let x = -2.3; x <= 2.3; x += 0.6) if (Math.abs(x) > 0.5) add(x, -2.55, 0.75);
    for (let z = 0.6; z <= 2.8; z += 0.45) add(5.25 - 0.1, z, 0.6);
    for (const [x, z] of [
      [2.75, 3.0],
      [2.55, 2.85],
      [-2.4, -2.4],
      [2.45, -2.6],
    ] as [number, number][])
      add(x, z, 0.7);
    const n = spots.length;
    const trunkGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.16, 6);
    trunkGeo.translate(0, 0.08, 0);
    const leafGeo = new THREE.IcosahedronGeometry(1, 1);
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, n);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    spots.forEach(([x, z, s], i) => {
      d.position.set(x, 0, z);
      d.rotation.set(0, R() * 6.28, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      const r = 0.17 * s;
      d.position.set(x, 0.14 * s + r * 1.05, z);
      d.scale.set(r, r * 1.25, r);
      d.updateMatrix();
      leaves.setMatrixAt(i, d.matrix);
      col.setHSL(0.25 + R() * 0.06, 0.3 + R() * 0.15, 0.12 + R() * 0.06);
      leaves.setColorAt(i, col);
    });
    bldgG.add(trunks, leaves);
  }

  // Cars in the staff car park (instanced, varied colours).
  {
    const body = mergeInto(THREE, [
      roundedBox(THREE, 0.2, 0.045, 0.085, 0.015).translate(0, 0.035, 0),
      bx(0.03, 0.02, 0.02, -0.06, 0.012, 0.033),
      bx(0.03, 0.02, 0.02, 0.06, 0.012, 0.033),
      bx(0.03, 0.02, 0.02, -0.06, 0.012, -0.033),
      bx(0.03, 0.02, 0.02, 0.06, 0.012, -0.033),
    ]);
    const cab = roundedBox(THREE, 0.11, 0.035, 0.075, 0.012).translate(-0.01, 0.07, 0);
    const slots: [number, number][] = [];
    for (let z = 0.53; z <= 2.9; z += 0.16) {
      if (R() < 0.7) slots.push([4.1, z]);
      if (R() < 0.55) slots.push([4.68, z]);
    }
    const cars = new THREE.InstancedMesh(body, carMat, slots.length);
    const cabs = new THREE.InstancedMesh(cab, carGlass, slots.length);
    const d = new THREE.Object3D();
    const palette = [0xe8eaec, 0x2a2e33, 0x8c939a, 0x1f3f6b, 0x8a1f24, 0xc9ccd0, 0x3a3f45];
    slots.forEach(([x, z], i) => {
      d.position.set(x, 0, z);
      d.rotation.set(0, x < 4.4 ? 0 : Math.PI, 0);
      d.updateMatrix();
      cars.setMatrixAt(i, d.matrix);
      cabs.setMatrixAt(i, d.matrix);
      cars.setColorAt(i, new THREE.Color(palette[Math.floor(R() * palette.length)]));
    });
    bldgG.add(cars, cabs);
  }

  // ---------------------------------------------------------------- data hall shell
  {
    const H = ROOF;
    // Walls (cladding).
    const walls: T.BufferGeometry[] = [
      bx(HX1 - HX0, H, WT, 0, H / 2, HZ - WT / 2),
      bx(HX1 - HX0, H, WT, 0, H / 2, -HZ + WT / 2),
      bx(WT, H, 2 * HZ - 2 * WT, HX0 + WT / 2, H / 2, 0),
      bx(WT, H, 2 * HZ - 2 * WT, HX1 - WT / 2, H / 2, 0),
    ];
    mesh(bldgG, mergeInto(THREE, walls), wallMat);
    // Precast plinth band and top cornice.
    const ring = (y0: number, y1: number, out: number) => {
      const hh = y1 - y0,
        yc = (y0 + y1) / 2;
      return [
        bx(HX1 - HX0 + 2 * out, hh, out, 0, yc, HZ + out / 2),
        bx(HX1 - HX0 + 2 * out, hh, out, 0, yc, -HZ - out / 2),
        bx(out, hh, 2 * HZ, HX0 - out / 2, yc, 0),
        bx(out, hh, 2 * HZ, HX1 + out / 2, yc, 0),
      ];
    };
    mesh(bldgG, mergeInto(THREE, ring(0, 0.12, 0.03)), plinthMat);
    // Vertical fins: depth swells and recedes along each facade in a slow wave.
    const fins: T.BufferGeometry[] = [];
    const finY0 = 0.12,
      finY1 = 0.955;
    const fd = (t: number) => 0.022 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.35));
    for (let x = HX0 + 0.06; x <= HX1 - 0.05; x += 0.1) {
      for (const s of [1, -1]) {
        if (s < 0 && x > 0.95 && x < 1.75) continue; // loading bay
        const d = fd(x + (s > 0 ? 0 : 1.7));
        fins.push(bx(0.016, finY1 - finY0, d, x, (finY0 + finY1) / 2, s * (HZ + d / 2)));
      }
    }
    for (let z = -HZ + 0.06; z <= HZ - 0.05; z += 0.1) {
      for (const s of [1, -1]) {
        if (s > 0 && z > 0.38) continue; // office block abuts here
        const d = fd(z * 1.4 + 3);
        fins.push(bx(d, finY1 - finY0, 0.016, s > 0 ? HX1 + d / 2 : HX0 - d / 2, (finY0 + finY1) / 2, z));
      }
    }
    // Cornice band tying the fins together.
    fins.push(...ring(0.955, 1.0, 0.075));
    mesh(bldgG, mergeInto(THREE, fins), finMat);
    // Loading bay: roller doors + canopy on the north facade.
    for (const x of [1.15, 1.55]) mesh(bldgG, new THREE.BoxGeometry(0.3, 0.38, 0.012), doorMat, [x, 0.19, -HZ - 0.008]);
    mesh(bldgG, new THREE.BoxGeometry(0.9, 0.025, 0.28), finMat, [1.35, 0.46, -HZ - 0.14]);
    mesh(bldgG, new THREE.BoxGeometry(0.9, 0.06, 0.12), plinthMat, [1.35, 0.03, -HZ - 0.06]); // dock leveller
    // Roof slab + parapet.
    mesh(bldgG, new THREE.BoxGeometry(HX1 - HX0 + 0.15, 0.04, 2 * HZ + 0.15), roofMat, [0, ROOF + 0.02, 0]);
    const par: T.BufferGeometry[] = [];
    const PX = HX1 + 0.075 - 0.015,
      PZ = HZ + 0.075 - 0.015;
    par.push(bx(2 * PX + 0.03, 0.07, 0.03, 0, ROOF + 0.075, PZ), bx(2 * PX + 0.03, 0.07, 0.03, 0, ROOF + 0.075, -PZ));
    par.push(bx(0.03, 0.07, 2 * PZ, PX, ROOF + 0.075, 0), bx(0.03, 0.07, 2 * PZ, -PX, ROOF + 0.075, 0));
    mesh(bldgG, mergeInto(THREE, par), parapetMat);
    // Roof exhaust-fan array along both long edges.
    const rf: T.BufferGeometry[] = [];
    for (let x = -2.2; x <= 2.25; x += 0.3)
      for (const z of [-1.28, 1.28]) {
        rf.push(new THREE.CylinderGeometry(0.05, 0.055, 0.05, 14).translate(x, ROOF + 0.065, z));
        rf.push(new THREE.CylinderGeometry(0.012, 0.06, 0.03, 14).translate(x, ROOF + 0.105, z));
      }
    mesh(bldgG, mergeInto(THREE, rf), roofFanMat);
  }

  // ---------------------------------------------------------------- office / NOC block
  {
    const X0 = 2.5,
      X1 = 3.8,
      Z0 = 0.4,
      Z1 = 2.72,
      FH = 0.26,
      N = 3;
    const top = FH * N;
    const IN = 0.03;
    // Glass curtain wall volume (inset), lit lobby on the ground floor.
    mesh(bldgG, new THREE.BoxGeometry(X1 - X0 - IN, top, Z1 - Z0 - 2 * IN), glassMat, [(X0 + X1) / 2 - IN / 2 + 0.005, top / 2, (Z0 + Z1) / 2]);
    mesh(bldgG, new THREE.BoxGeometry(0.7, 0.16, 0.01), lobbyLight, [3.15, 0.09, Z1 - IN - 0.012]);
    // Floor-edge slabs + roof slab with an overhang.
    const slabs: T.BufferGeometry[] = [];
    for (let i = 1; i < N; i++) slabs.push(bx(X1 - X0 + 0.02, 0.022, Z1 - Z0 + 0.02, (X0 + X1) / 2 + 0.01, i * FH, (Z0 + Z1) / 2));
    slabs.push(bx(X1 - X0 + 0.12, 0.04, Z1 - Z0 + 0.12, (X0 + X1) / 2 + 0.06, top + 0.02, (Z0 + Z1) / 2));
    // Entrance canopy on slender columns.
    slabs.push(bx(0.9, 0.02, 0.35, 3.15, 0.2, Z1 + 0.17));
    mesh(bldgG, mergeInto(THREE, slabs), slabMat);
    const mul: T.BufferGeometry[] = [];
    for (let x = X0 + 0.11; x < X1 - 0.02; x += 0.11) {
      mul.push(bx(0.008, top, 0.014, x, top / 2, Z1 - IN + 0.004));
      mul.push(bx(0.008, top, 0.014, x, top / 2, Z0 + IN - 0.004));
    }
    for (let z = Z0 + 0.11; z < Z1 - 0.02; z += 0.11) mul.push(bx(0.014, top, 0.008, X1 - IN + 0.004, top / 2, z));
    for (const x of [2.75, 3.55]) mul.push(bar(THREE, [x, 0, Z1 + 0.3], [x, 0.2, Z1 + 0.3], 0.008, 8));
    mesh(bldgG, mergeInto(THREE, mul), mullion);
    // Solid stair / lift core clad like the hall, rising above the roof.
    const core: T.BufferGeometry[] = [bx(0.32, top + 0.12, 0.42, X1 - 0.12, (top + 0.12) / 2, Z0 + 0.23)];
    mesh(bldgG, mergeInto(THREE, core), wallMat);
    const coreFins: T.BufferGeometry[] = [];
    for (let z = Z0 + 0.06; z < Z0 + 0.44; z += 0.07) coreFins.push(bx(0.03, top + 0.1, 0.012, X1 + 0.06, (top + 0.1) / 2, z));
    mesh(bldgG, mergeInto(THREE, coreFins), finMat);
    // Sign on the roof fascia over the entrance.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.115), signMat);
    sign.position.set(3.05, top - 0.085, Z1 + 0.024);
    bldgG.add(sign);
    mesh(bldgG, new THREE.BoxGeometry(0.64, 0.13, 0.012), finMat, [3.05, top - 0.085, Z1 + 0.014]);
    // Roof parapet and a packaged AHU on the office roof.
    const op: T.BufferGeometry[] = [];
    const ox0 = X0 - 0.0,
      ox1 = X1 + 0.12,
      oz0 = Z0 - 0.06,
      oz1 = Z1 + 0.06;
    op.push(bx(ox1 - ox0, 0.04, 0.02, (ox0 + ox1) / 2, top + 0.06, oz1 - 0.01), bx(ox1 - ox0, 0.04, 0.02, (ox0 + ox1) / 2, top + 0.06, oz0 + 0.01));
    op.push(bx(0.02, 0.04, oz1 - oz0, ox1 - 0.01, top + 0.06, (oz0 + oz1) / 2));
    op.push(roundedBox(THREE, 0.42, 0.09, 0.22, 0.01).translate(3.0, top + 0.085, 1.4));
    mesh(bldgG, mergeInto(THREE, op), slabMat);
    mesh(bldgG, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), roofFanMat, [2.9, top + 0.14, 1.4]);
    mesh(bldgG, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), roofFanMat, [3.1, top + 0.14, 1.4]);
  }

  // ================================================================ LAYER 1 — site infrastructure
  // ---- Containerised diesel generators, NW yard
  {
    const gz = -1.88;
    const xs = [-4.45, -4.09, -3.73, -3.37, -3.01];
    const stacks: T.BufferGeometry[] = [];
    const darks: T.BufferGeometry[] = [];
    const tops: T.BufferGeometry[] = [];
    for (const x of xs) {
      // Belly fuel tank, container enclosure, roof silencer, exhaust stack.
      darks.push(bx(0.21, 0.05, 0.6, x, PAD + 0.025, gz));
      const c = new THREE.BoxGeometry(0.62, 0.22, 0.2);
      c.rotateY(Math.PI / 2);
      c.translate(x, PAD + 0.05 + 0.11, gz);
      mesh(siteG, c, gensetMat);
      tops.push(bx(0.205, 0.008, 0.625, x, PAD + 0.274, gz));
      tops.push(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 14).rotateX(Math.PI / 2).translate(x, PAD + 0.32, gz + 0.12));
      stacks.push(bar(THREE, [x, PAD + 0.32, gz + 0.24], [x, 0.66, gz + 0.24], 0.022, 12));
      stacks.push(new THREE.CylinderGeometry(0.028, 0.024, 0.03, 12).translate(x, 0.66, gz + 0.24));
      stacks.push(bar(THREE, [x, PAD + 0.32, gz + 0.22], [x, PAD + 0.32, gz + 0.24], 0.024, 10));
    }
    mesh(siteG, mergeInto(THREE, darks), steelDark);
    mesh(siteG, mergeInto(THREE, tops), gensetTop);
    mesh(siteG, mergeInto(THREE, stacks), galv);
    // Bulk fuel tanks in a bunded enclosure.
    const bund: T.BufferGeometry[] = [
      bx(1.5, 0.05, 0.03, -3.75, PAD + 0.025, -3.0),
      bx(1.5, 0.05, 0.03, -3.75, PAD + 0.025, -2.42),
      bx(0.03, 0.05, 0.6, -4.5, PAD + 0.025, -2.71),
      bx(0.03, 0.05, 0.6, -3.0, PAD + 0.025, -2.71),
    ];
    mesh(siteG, mergeInto(THREE, bund), padMat);
    const tanks: T.BufferGeometry[] = [];
    const saddles: T.BufferGeometry[] = [];
    for (const x of [-4.1, -3.42]) {
      const t = lathePill(0.1, 0.56);
      t.rotateZ(Math.PI / 2);
      t.translate(x, PAD + 0.14, -2.71);
      tanks.push(t);
      for (const dx of [-0.17, 0.17]) saddles.push(bx(0.03, 0.06, 0.16, x + dx, PAD + 0.03, -2.71));
    }
    mesh(siteG, mergeInto(THREE, tanks), tankMat);
    mesh(siteG, mergeInto(THREE, saddles), steelDark);
    // Fuel lines and the cable tray back to the hall's electrical bay.
    const tray: T.BufferGeometry[] = [];
    tray.push(bx(1.98, 0.012, 0.07, -3.5, 0.32, -1.38));
    for (const x of [-4.4, -3.9, -3.4, -2.9]) tray.push(bx(0.015, 0.32, 0.015, x, 0.16, -1.38));
    for (const x of xs) tray.push(bx(0.04, 0.008, 0.2, x, 0.3, -1.48));
    mesh(siteG, mergeInto(THREE, tray), galv);
    mesh(siteG, tube(THREE, [[-4.1, 0.08, -2.5], [-4.1, 0.08, -2.28], [-4.45, 0.08, -2.2]], 0.008, 6), pipeGrey);
    mesh(siteG, tube(THREE, [[-3.42, 0.08, -2.5], [-3.42, 0.08, -2.28], [-3.01, 0.08, -2.2]], 0.008, 6), pipeGrey);
  }

  // ---- HV substation, SW yard
  {
    const xT = -3.45;
    const tz = [1.35, 2.4];
    const hvTops: [number, number, number][] = [];
    for (const z of tz) {
      // Main tank, radiator banks, conservator, bushings.
      mesh(siteG, roundedBox(THREE, 0.28, 0.26, 0.36, 0.015), xfmrMat, [xT, PAD + 0.04 + 0.13, z]);
      mesh(siteG, new THREE.BoxGeometry(0.34, 0.04, 0.42), padMat, [xT, PAD + 0.02, z]);
      const rad: T.BufferGeometry[] = [];
      for (const s of [1, -1])
        for (let i = 0; i < 7; i++) rad.push(bx(0.07, 0.2, 0.008, xT + 0.02 * s + 0.19 * s, PAD + 0.17, z - 0.15 + i * 0.05));
      for (const s of [1, -1]) rad.push(bx(0.02, 0.015, 0.34, xT + 0.15 * s, PAD + 0.26, z), bx(0.02, 0.015, 0.34, xT + 0.15 * s, PAD + 0.09, z));
      mesh(siteG, mergeInto(THREE, rad), radMat);
      mesh(siteG, lathePill(0.045, 0.3).rotateX(Math.PI / 2), xfmrMat, [xT + 0.08, PAD + 0.38, z]);
      mesh(siteG, mergeInto(THREE, [bx(0.01, 0.1, 0.01, xT + 0.08, PAD + 0.33, z - 0.1), bx(0.01, 0.1, 0.01, xT + 0.08, PAD + 0.33, z + 0.1)]), steelDark);
      const bush: T.BufferGeometry[] = [];
      for (let i = -1; i <= 1; i++) {
        const bzz = z + i * 0.1;
        bush.push(insulator(xT - 0.08, PAD + 0.3, bzz, 0.2, 0.018));
        bush.push(insulator(xT + 0.04, PAD + 0.3, bzz, 0.09, 0.012));
        hvTops.push([xT - 0.08, PAD + 0.5, bzz]);
      }
      mesh(siteG, mergeInto(THREE, bush), porcelain);
    }
    // Blast / fire wall between the two transformers.
    mesh(siteG, new THREE.BoxGeometry(0.5, 0.42, 0.05), padMat, [xT, 0.21, 1.875]);
    // Incoming gantry (lattice portal) and line-side switchgear.
    const lat: T.BufferGeometry[] = [];
    const gx = -4.55,
      gH = 0.95;
    for (const z of [0.95, 1.875, 2.8]) lat.push(...latticeColumn(gx, z, gH, 0.07));
    lat.push(...latticeBeam(gx, gH, 0.95, 2.8, 0.06));
    const swGear: T.BufferGeometry[] = [];
    const ins: T.BufferGeometry[] = [];
    const lines: T.BufferGeometry[] = [];
    hvTops.forEach(([, , z]) => {
      // Insulator string hanging from the beam.
      ins.push(insulator(gx, gH - 0.16, z, 0.13, 0.014));
      // Disconnector + breaker on steel supports.
      for (const xs of [-4.15, -3.85]) {
        lat.push(bx(0.025, 0.3, 0.025, xs, 0.15, z));
        ins.push(insulator(xs, 0.3, z, 0.11, 0.012));
        swGear.push(bx(0.04, 0.03, 0.04, xs, 0.425, z));
      }
    });
    hvTops.forEach(([bx_, by, z]) => {
      lines.push(sag([gx, gH - 0.16, z], [-4.15, 0.44, z], 0.06));
      lines.push(bar(THREE, [-4.15, 0.44, z], [-3.85, 0.44, z], 0.004, 4));
      lines.push(sag([-3.85, 0.44, z], [bx_, by, z], 0.03));
    });
    // Overhead line in from a lattice tower outside the fence.
    const TX = -7.2,
      TZ = 1.875,
      TH = 1.9;
    lat.push(...latticeColumn(TX, TZ, TH, 0.16, 0.05));
    for (const y of [1.35, 1.65]) lat.push(bx(0.04, 0.035, 1.1, TX, y, TZ));
    for (const y of [1.35, 1.65])
      for (const dz of [-0.45, 0.45]) {
        ins.push(insulator(TX, y - 0.12, TZ + dz, 0.1, 0.012));
        lines.push(sag([TX, y - 0.12, TZ + dz], [gx, gH - 0.04, 1.875 + dz * 1.4 * (y > 1.5 ? 1 : 0.6)], 0.2));
      }
    lat.push(...latticeBeam(gx, gH + 0.04, 0.95, 2.8, 0.0)); // earth-wire peaks
    mesh(siteG, mergeInto(THREE, lat), galv);
    mesh(siteG, mergeInto(THREE, ins), porcelain);
    mesh(siteG, mergeInto(THREE, swGear), steelDark);
    mesh(siteG, mergeInto(THREE, lines), conductor);
    // MV switch-house and cable route into the hall.
    mesh(siteG, roundedBox(THREE, 0.32, 0.32, 1.5, 0.02), switchHouse, [-2.92, PAD + 0.16, 1.9]);
    mesh(siteG, new THREE.BoxGeometry(0.36, 0.025, 1.54), steelDark, [-2.92, PAD + 0.33, 1.9]);
    const doors: T.BufferGeometry[] = [];
    for (const z of [1.4, 1.9, 2.4]) doors.push(bx(0.006, 0.2, 0.12, -2.92 - 0.162, PAD + 0.11, z));
    mesh(siteG, mergeInto(THREE, doors), steelDark);
    const ct: T.BufferGeometry[] = [bx(0.06, 0.012, 0.36, -2.82, 0.26, 1.2), bx(0.3, 0.012, 0.06, -2.66, 0.26, 1.04)];
    ct.push(bx(0.015, 0.26, 0.015, -2.82, 0.13, 1.1), bx(0.015, 0.26, 0.015, -2.6, 0.13, 1.04));
    mesh(siteG, mergeInto(THREE, ct), galv);
  }

  // ---- Cooling yard, NE: cooling-tower bank, dry coolers, tanks, pipe rack
  {
    const tz = -2.5;
    const cells = [3.12, 3.7, 4.28];
    const tw: T.BufferGeometry[] = [];
    const basins: T.BufferGeometry[] = [];
    const stacks: T.BufferGeometry[] = [];
    const fans: T.BufferGeometry[] = [];
    for (const x of cells) {
      tw.push(bx(0.56, 0.44, 0.6, x, PAD + 0.07 + 0.22, tz));
      basins.push(bx(0.58, 0.07, 0.62, x, PAD + 0.035, tz));
      basins.push(bx(0.585, 0.02, 0.625, x, PAD + 0.52, tz));
      stacks.push(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 28, 1, true).translate(x, PAD + 0.59, tz));
      stacks.push(new THREE.TorusGeometry(0.22, 0.008, 6, 28).rotateX(Math.PI / 2).translate(x, PAD + 0.65, tz));
      fans.push(new THREE.CircleGeometry(0.2, 28).rotateX(-Math.PI / 2).translate(x, PAD + 0.6, tz));
    }
    mesh(siteG, mergeInto(THREE, tw), towerMat);
    mesh(siteG, mergeInto(THREE, basins), steelDark);
    unitBody.side = DS;
    mesh(siteG, mergeInto(THREE, stacks), unitBody);
    const fanMesh = mesh(siteG, mergeInto(THREE, fans), fanMat);
    // Spin the chiller fans: every fan disc has its own 0-1 UVs, so rotating the shared texture
    // about its centre turns them all. This is the motion visible from the overview (the
    // blinking rack LEDs are inside the closed hall until a layer opens it).
    fanTex.center.set(0.5, 0.5);
    fanMesh.onBeforeRender = () => {
      fanTex.rotation = -(performance.now() / 1000) * 2.4;
    };
    // Dry coolers (V-coil, fans on top) on legs.
    const dcBody: T.BufferGeometry[] = [];
    const dcCoil: T.BufferGeometry[] = [];
    const dcFan: T.BufferGeometry[] = [];
    const legs: T.BufferGeometry[] = [];
    for (const x of [3.05, 3.62, 4.19]) {
      const z = -1.48,
        y = PAD + 0.08;
      for (const s of [1, -1]) {
        const c = new THREE.PlaneGeometry(0.5, 0.15);
        c.rotateX(-s * 0.32);
        c.translate(x, y + 0.075, z + s * 0.15);
        dcCoil.push(c);
      }
      dcBody.push(bx(0.52, 0.02, 0.38, x, y + 0.16, z), bx(0.52, 0.02, 0.06, x, y + 0.01, z));
      for (const ex of [-0.26, 0.26]) dcBody.push(bx(0.012, 0.16, 0.38, x + ex, y + 0.08, z));
      for (const dx of [-0.125, 0.125]) {
        dcFan.push(new THREE.CircleGeometry(0.1, 20).rotateX(-Math.PI / 2).translate(x + dx, y + 0.172, z));
        dcBody.push(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 20, 1, true).translate(x + dx, y + 0.18, z));
      }
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.15, 0.15]) legs.push(bx(0.015, 0.08, 0.015, x + dx, PAD + 0.04, z + dz));
    }
    coilMat.side = DS;
    mesh(siteG, mergeInto(THREE, dcCoil), coilMat);
    mesh(siteG, mergeInto(THREE, dcBody), unitBody);
    mesh(siteG, mergeInto(THREE, dcFan), fanMat);
    mesh(siteG, mergeInto(THREE, legs), steelDark);
    // Thermal storage tanks.
    for (const [x, z] of [
      [4.6, -1.05],
      [4.6, -1.42],
    ] as [number, number][])
      mesh(siteG, lathePill(0.13, 0.55, true), tankMat, [x, PAD, z]);
    // Pump skid.
    const pumps: T.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      pumps.push(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 14).rotateZ(Math.PI / 2).translate(2.95 + i * 0.13, PAD + 0.06, -1.95));
      pumps.push(bx(0.1, 0.02, 0.08, 2.95 + i * 0.13, PAD + 0.01, -1.95));
    }
    mesh(siteG, mergeInto(THREE, pumps), pipeBlue);
    // Pipe rack: towers -> pump skid -> into the hall's north wall.
    const rack: T.BufferGeometry[] = [];
    for (const x of [1.95, 2.35, 2.75, 3.15, 3.55, 3.95, 4.35]) {
      rack.push(bx(0.02, 0.42, 0.02, x, 0.21, -2.05), bx(0.02, 0.42, 0.02, x, 0.21, -1.85));
      rack.push(bx(0.02, 0.02, 0.24, x, 0.42, -1.95));
    }
    mesh(siteG, mergeInto(THREE, rack), steelDark);
    const pipes: T.BufferGeometry[] = [];
    for (const [z, r] of [
      [-2.0, 0.032],
      [-1.9, 0.032],
    ] as [number, number][]) {
      pipes.push(tube(THREE, [[4.4, 0.46, z], [2.0, 0.46, z], [1.92, 0.46, z + 0.06], [1.9, 0.46, z + 0.25], [1.9, 0.46, -HZ - 0.02]], r, 12, false, 80));
    }
    for (const x of cells) pipes.push(bar(THREE, [x, PAD + 0.2, tz + 0.3], [x, 0.46, -2.02], 0.022, 10));
    for (const x of cells) pipes.push(bar(THREE, [x, 0.46, -2.0], [x, 0.46, -1.9], 0.022, 10));
    mesh(siteG, mergeInto(THREE, pipes), pipeBlue);
    pipes.length = 0;
    pipes.push(bar(THREE, [3.0, PAD + 0.08, -1.48], [3.0, 0.46, -1.88], 0.018, 8));
    pipes.push(bar(THREE, [4.3, PAD + 0.08, -1.48], [4.3, 0.46, -1.88], 0.018, 8));
    mesh(siteG, mergeInto(THREE, pipes), pipeGrey);
  }

  // ---- Rooftop air-cooled chillers (2 rows) with header pipework
  {
    const rows = [-0.55, 0.45];
    const body: T.BufferGeometry[] = [];
    const coils: T.BufferGeometry[] = [];
    const fans: T.BufferGeometry[] = [];
    const shrouds: T.BufferGeometry[] = [];
    const y0 = ROOF + 0.04;
    for (const z of rows)
      for (let i = 0; i < 6; i++) {
        const x = -2.05 + i * 0.72;
        body.push(bx(0.64, 0.025, 0.26, x, y0 + 0.0125, z)); // base frame
        body.push(bx(0.64, 0.018, 0.27, x, y0 + 0.15, z)); // fan deck
        body.push(bx(0.06, 0.13, 0.25, x + 0.29, y0 + 0.08, z)); // control panel end
        for (const s of [1, -1]) {
          const c = new THREE.PlaneGeometry(0.56, 0.13);
          c.rotateY(s > 0 ? 0 : Math.PI);
          c.rotateX(0);
          c.translate(x - 0.03, y0 + 0.088, z + s * 0.13);
          coils.push(c);
        }
        for (let k = 0; k < 3; k++) {
          const fx = x - 0.21 + k * 0.17;
          shrouds.push(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20, 1, true).translate(fx, y0 + 0.172, z));
          fans.push(new THREE.CircleGeometry(0.068, 20).rotateX(-Math.PI / 2).translate(fx, y0 + 0.165, z));
        }
      }
    mesh(siteG, mergeInto(THREE, body), unitBody);
    mesh(siteG, mergeInto(THREE, coils), coilMat);
    mesh(siteG, mergeInto(THREE, shrouds), unitBody);
    const fanMesh = mesh(siteG, mergeInto(THREE, fans), fanMat);
    // Spin the chiller fans: every fan disc has its own 0-1 UVs, so rotating the shared texture
    // about its centre turns them all. This is the motion visible from the overview (the
    // blinking rack LEDs are inside the closed hall until a layer opens it).
    fanTex.center.set(0.5, 0.5);
    fanMesh.onBeforeRender = () => {
      fanTex.rotation = -(performance.now() / 1000) * 2.4;
    };
    // Insulated chilled-water headers between the rows, dropping through the roof.
    const hdr: T.BufferGeometry[] = [];
    for (const dz of [-0.03, 0.03]) hdr.push(bar(THREE, [-2.3, y0 + 0.05, -0.05 + dz], [2.0, y0 + 0.05, -0.05 + dz], 0.02, 10));
    for (let i = 0; i < 6; i++) {
      const x = -2.05 + i * 0.72;
      hdr.push(bar(THREE, [x - 0.2, y0 + 0.05, -0.08], [x - 0.2, y0 + 0.05, -0.42], 0.012, 8));
      hdr.push(bar(THREE, [x - 0.2, y0 + 0.05, -0.02], [x - 0.2, y0 + 0.05, 0.32], 0.012, 8));
    }
    for (let x = -2.2; x <= 2.0; x += 0.6) hdr.push(bx(0.03, 0.04, 0.12, x, y0 + 0.02, -0.05));
    mesh(siteG, mergeInto(THREE, hdr), pipeGrey);
  }

  // ---- Electrical bay inside the hall (west): UPS lineup, battery strings, switchboards
  {
    const bw = EB - (HX0 + WT);
    const fp = new THREE.PlaneGeometry(bw, 2 * HZ - 2 * WT);
    fp.rotateX(-Math.PI / 2);
    mesh(siteG, fp, bayFloor, [(HX0 + WT + EB) / 2, 0.012, 0]);
    const ups: T.BufferGeometry[] = [];
    const bat: T.BufferGeometry[] = [];
    const scr: T.BufferGeometry[] = [];
    const cab = (x: number, z: number, w: number, h: number, d: number, list: T.BufferGeometry[]) =>
      list.push(roundedBox(THREE, d, h, w, 0.006).translate(x, h / 2 + 0.012, z));
    for (let i = 0; i < 12; i++) {
      const z = -1.32 + i * 0.1;
      cab(-2.33, z, 0.095, 0.32, 0.13, ups);
      cab(-2.03, z, 0.095, 0.3, 0.14, bat);
      if (i % 3 === 0) scr.push(bx(0.004, 0.035, 0.05, -2.33 + 0.067, 0.24, z));
    }
    for (let i = 0; i < 10; i++) {
      const z = 0.25 + i * 0.11;
      cab(-2.33, z, 0.105, 0.34, 0.14, ups);
      if (i % 2 === 0) scr.push(bx(0.004, 0.025, 0.04, -2.33 + 0.072, 0.27, z));
    }
    for (let i = 0; i < 4; i++) cab(-2.02, 0.35 + i * 0.26, 0.2, 0.26, 0.16, ups); // PDU transformers
    mesh(siteG, mergeInto(THREE, ups), upsMat);
    mesh(siteG, mergeInto(THREE, bat), battMat);
    mesh(siteG, mergeInto(THREE, scr), screenMat);
    // Power cable ladder over the bay feeding the white space.
    const lad: T.BufferGeometry[] = [bx(0.06, 0.01, 2.7, -2.18, 0.62, 0), bx(0.5, 0.01, 0.06, -2.0, 0.62, 0.0)];
    for (let z = -1.2; z <= 1.2; z += 0.4) lad.push(bx(0.006, ROOF - 0.62, 0.006, -2.18, (ROOF + 0.62) / 2, z));
    mesh(siteG, mergeInto(THREE, lad), galv);
  }

  // ================================================================ LAYER 2 — white space
  {
    const fw = WS1 - WS0,
      fd = 2 * WZ;
    const fp = new THREE.PlaneGeometry(fw, fd);
    fp.rotateX(-Math.PI / 2);
    mesh(wsG, fp, floorMat, [(WS0 + WS1) / 2, FL, 0]);
    // Plenum skirt (raised-floor edge) and slab.
    mesh(wsG, new THREE.BoxGeometry(fw, FL - 0.005, fd), plenumMat, [(WS0 + WS1) / 2, (FL - 0.005) / 2, 0]);
    // Glazed partition to the electrical bay.
    mesh(wsG, new THREE.BoxGeometry(0.012, ROOF - 0.02, 2 * HZ - 2 * WT), partition, [EB, (ROOF - 0.02) / 2, 0]);
    const pf: T.BufferGeometry[] = [];
    for (let z = -1.4; z <= 1.41; z += 0.35) pf.push(bx(0.02, ROOF - 0.02, 0.015, EB, (ROOF - 0.02) / 2, z));
    pf.push(bx(0.02, 0.02, 2 * HZ - 2 * WT, EB, 0.5, 0));
    mesh(wsG, mergeInto(THREE, pf), contFrame);

    // CRAH galleries along both long walls (instanced, grille fronts inward).
    const cx: number[] = [];
    for (let x = -1.55; x <= 2.3; x += 0.32) cx.push(x);
    const crahGeo = new THREE.BoxGeometry(0.24, 0.42, 0.13);
    const crah = new THREE.InstancedMesh(crahGeo, [crahBody, crahBody, crahBody, crahBody, crahFront, crahBody], cx.length * 2);
    const d = new THREE.Object3D();
    let k = 0;
    for (const x of cx)
      for (const s of [1, -1]) {
        d.position.set(x, FL + 0.21, s * (WZ - 0.075));
        d.rotation.set(0, s > 0 ? Math.PI : 0, 0);
        d.updateMatrix();
        crah.setMatrixAt(k++, d.matrix);
      }
    wsG.add(crah);

    // Cold-aisle containment per pod segment: glazed roof, end doors.
    const cg: T.BufferGeometry[] = [];
    const cf: T.BufferGeometry[] = [];
    for (const zc of PODS)
      for (const [x0, n] of SEGS) {
        const x1 = x0 + n * RW;
        const xm = (x0 + x1) / 2;
        cg.push(bx(x1 - x0, 0.006, 0.2, xm, RTOP + 0.004, zc));
        for (const s of [-1, 1]) cf.push(bx(x1 - x0, 0.012, 0.012, xm, RTOP + 0.008, zc + s * 0.1));
        for (let x = x0 + 0.34; x < x1 - 0.1; x += 0.34) cf.push(bx(0.008, 0.01, 0.2, x, RTOP + 0.009, zc));
        for (const xe of [x0 - 0.006, x1 + 0.006]) {
          const pane = new THREE.PlaneGeometry(0.18, RH);
          pane.rotateY(Math.PI / 2);
          pane.translate(xe, FL + RH / 2, zc);
          cg.push(pane);
          for (const s of [-1, 1]) cf.push(bx(0.012, RH, 0.012, xe, FL + RH / 2, zc + s * 0.094));
          cf.push(bx(0.012, 0.012, 0.19, xe, FL + RH - 0.006, zc), bx(0.014, RH * 0.6, 0.006, xe, FL + RH * 0.45, zc));
        }
      }
    mesh(wsG, mergeInto(THREE, cg), contGlass);
    mesh(wsG, mergeInto(THREE, cf), contFrame);

    // Overhead services per rack row: busway (+ tap-off boxes), wire basket
    // for power, yellow fibre runner over each cold aisle, hanger rods.
    const bus: T.BufferGeometry[] = [];
    const taps: T.BufferGeometry[] = [];
    const wire: T.BufferGeometry[] = [];
    const fib: T.BufferGeometry[] = [];
    const rods: T.BufferGeometry[] = [];
    const channel = (list: T.BufferGeometry[], x0: number, x1: number, y: number, z: number, w: number, hgt: number) => {
      list.push(bx(x1 - x0, 0.006, w, (x0 + x1) / 2, y, z));
      for (const s of [-1, 1]) list.push(bx(x1 - x0, hgt, 0.005, (x0 + x1) / 2, y + hgt / 2, z + (s * w) / 2));
    };
    const xA = SEGS[0][0] - 0.05,
      xB = SEGS[1][0] + SEGS[1][1] * RW + 0.05;
    for (const zc of PODS) {
      for (const s of [-1, 1]) {
        const zr = zc + s * (0.09 + RD / 2);
        bus.push(bx(xB - xA, 0.03, 0.045, (xA + xB) / 2, RTOP + 0.075, zr + s * 0.02));
        for (const [x0, n] of SEGS)
          for (let i = 1; i < n; i += 3) taps.push(bx(0.035, 0.03, 0.05, x0 + (i + 0.5) * RW, RTOP + 0.045, zr + s * 0.02));
        channel(wire, xA, xB, RTOP + 0.15, zr - s * 0.01, 0.08, 0.02);
      }
      channel(fib, -1.45, xB, RTOP + 0.13, zc, 0.07, 0.025);
      for (let x = xA + 0.1; x < xB; x += 0.42) {
        rods.push(bx(0.004, ROOF - (RTOP + 0.075), 0.004, x, (ROOF + RTOP + 0.075) / 2, zc + 0.19));
        rods.push(bx(0.004, ROOF - (RTOP + 0.075), 0.004, x, (ROOF + RTOP + 0.075) / 2, zc - 0.19));
        rods.push(bx(0.004, ROOF - (RTOP + 0.13), 0.004, x, (ROOF + RTOP + 0.13) / 2, zc));
      }
    }
    // Fibre trunk from the network row along the west end, feeding every pod.
    fib.push(bx(0.08, 0.008, 1.95, -1.45, RTOP + 0.13, -0.27));
    for (const s of [-1, 1]) fib.push(bx(0.005, 0.025, 1.95, -1.45 + s * 0.04, RTOP + 0.142, -0.27));
    fib.push(bx(0.05, RTOP + 0.13 - (FL + RH), 0.05, -1.53, (RTOP + 0.13 + RTOP) / 2, -0.85)); // waterfall
    // Main busbar trunk along the electrical-bay partition.
    bus.push(bx(0.05, 0.04, 2.6, EB + 0.08, RTOP + 0.24, 0));
    for (const zc of PODS) for (const s of [-1, 1]) bus.push(bx(xA - EB - 0.08, 0.03, 0.045, (xA + EB + 0.08) / 2, RTOP + 0.075 + 0.0, zc + s * (0.09 + RD / 2) + s * 0.02));
    for (const zc of PODS) bus.push(bx(0.03, 0.17, 0.03, EB + 0.08, RTOP + 0.155, zc));
    mesh(wsG, mergeInto(THREE, bus), busway);
    mesh(wsG, mergeInto(THREE, taps), tapOff);
    mesh(wsG, mergeInto(THREE, wire), wireTray);
    mesh(wsG, mergeInto(THREE, fib), fibreTray);
    mesh(wsG, mergeInto(THREE, rods), rodMat);
    // Linear LED luminaires over the service aisles + sprinkler mains.
    const lights: T.BufferGeometry[] = [];
    for (const z of [-1.12, -0.375, 0.375, 1.12]) for (const [x0, x1] of [[-1.5, 0.2], [0.45, 2.3]]) lights.push(bx(x1 - x0, 0.008, 0.02, (x0 + x1) / 2, ROOF - 0.02, z));
    mesh(wsG, mergeInto(THREE, lights), ledLight);
    const spr: T.BufferGeometry[] = [];
    for (const z of [-1.0, 0.0, 1.0]) spr.push(bar(THREE, [EB + 0.05, ROOF - 0.05, z + 0.22], [WS1 - 0.05, ROOF - 0.05, z + 0.22], 0.009, 8));
    mesh(wsG, mergeInto(THREE, spr), sprinkler);
  }

  // ================================================================ LAYER 3 — racks & compute
  const blinkers: T.CanvasTexture[] = [cpuFront.led, gpuFront.led, netFront.led, cduFront.led, rearLed];
  {
    type Slot = { x: number; z: number; ry: number };
    const cpu: Slot[] = [],
      gpu: Slot[] = [],
      net: Slot[] = [],
      cdu: Slot[] = [];
    PODS.forEach((zc, pi) => {
      for (const s of [-1, 1]) {
        const z = zc + s * (0.09 + RD / 2);
        const ry = s < 0 ? 0 : Math.PI; // fronts face the cold aisle
        for (const [x0, n] of SEGS)
          for (let i = 0; i < n; i++) {
            const slot = { x: x0 + (i + 0.5) * RW, z, ry };
            if (pi === 2) (i === 0 || i === n - 1 ? cdu : gpu).push(slot);
            else cpu.push(slot);
          }
      }
    });
    for (let i = 0; i < 10; i++) net.push({ x: -1.6, z: -1.3 + (i + 0.5) * RW, ry: Math.PI / 2 });
    const rackGeo = new THREE.BoxGeometry(RW * 0.97, RH, RD);
    rackGeo.translate(0, RH / 2, 0);
    const inst = (slots: Slot[], front: T.Material, side: T.Material = rackSide) => {
      const im = new THREE.InstancedMesh(rackGeo, [side, side, rackTop, side, front, rackRear], slots.length);
      const d = new THREE.Object3D();
      slots.forEach((s, i) => {
        d.position.set(s.x, FL, s.z);
        d.rotation.set(0, s.ry, 0);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      });
      rackG.add(im);
      return im;
    };
    const cpuIM = inst(cpu, cpuFront.m);
    inst(gpu, gpuFront.m);
    inst(net, netFront.m);
    inst(cdu, cduFront.m, cduBody);
    // Scroll the LED atlases to make the activity LEDs blink.
    let last = -1;
    cpuIM.onBeforeRender = () => {
      const f = Math.floor(performance.now() / 380);
      if (f === last) return;
      last = f;
      blinkers.forEach((t, i) => (t.offset.y = ((f + i) % 4) * 0.25));
    };

    // Direct-to-chip liquid cooling on the GPU pod: supply / return
    // manifolds along each row, hoses dropping to every rack, CDUs at the ends.
    const zc = PODS[2];
    const sup: T.BufferGeometry[] = [];
    const ret: T.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      const zr = zc + s * (0.09 + RD / 2);
      const zm = zr + s * 0.055; // over the rear (hot) half
      for (const [x0, n] of SEGS) {
        const xa = x0 + RW * 0.5,
          xb = x0 + (n - 0.5) * RW;
        sup.push(bar(THREE, [xa, RTOP + 0.025, zm - 0.012], [xb, RTOP + 0.025, zm - 0.012], 0.008, 8));
        ret.push(bar(THREE, [xa, RTOP + 0.025, zm + 0.012], [xb, RTOP + 0.025, zm + 0.012], 0.008, 8));
        for (let i = 1; i < n - 1; i++) {
          const x = x0 + (i + 0.5) * RW;
          sup.push(bar(THREE, [x - 0.01, RTOP + 0.025, zm - 0.012], [x - 0.01, RTOP, zm - 0.012], 0.004, 5));
          ret.push(bar(THREE, [x + 0.01, RTOP + 0.025, zm + 0.012], [x + 0.01, RTOP, zm + 0.012], 0.004, 5));
        }
        // Risers down into the CDUs at each end.
        for (const x of [xa, xb]) {
          sup.push(bar(THREE, [x, RTOP + 0.025, zm - 0.012], [x, RTOP + 0.0, zm - 0.012], 0.008, 8));
          ret.push(bar(THREE, [x, RTOP + 0.025, zm + 0.012], [x, RTOP + 0.0, zm + 0.012], 0.008, 8));
        }
      }
    }
    mesh(rackG, mergeInto(THREE, sup), coolSupply);
    mesh(rackG, mergeInto(THREE, ret), coolReturn);
    // Top-of-rack fibre patch bundles for the network spine row.
    const patch: T.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const z = -1.3 + (i + 0.5) * RW;
      patch.push(tube(THREE, [[-1.56, RTOP, z], [-1.53, RTOP + 0.06, z], [-1.47, RTOP + 0.13, z]], 0.006, 5, false, 8));
    }
    mesh(rackG, mergeInto(THREE, patch), patchMat);
  }

  // ---------------------------------------------------------------- local helpers
  function lathePill(r: number, len: number, vertical = false): T.BufferGeometry {
    // Capsule-ish tank: cylinder with dished heads, axis along Y (base at 0 if vertical).
    const pts: T.Vector2[] = [];
    const head = r * 0.45;
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.sin(a) * r, -len / 2 + head - Math.cos(a) * head));
    }
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.cos(a) * r, len / 2 - head + Math.sin(a) * head));
    }
    const g = new THREE.LatheGeometry(pts, 24);
    if (vertical) g.translate(0, len / 2, 0);
    return g;
  }
  function insulator(x: number, y: number, z: number, h: number, r: number): T.BufferGeometry {
    // Stacked-shed porcelain insulator standing on (x, y, z).
    const pts: T.Vector2[] = [new THREE.Vector2(0, 0)];
    const sheds = Math.max(3, Math.round(h / 0.018));
    for (let i = 0; i < sheds; i++) {
      const y0 = (i / sheds) * h;
      pts.push(new THREE.Vector2(r * 0.55, y0), new THREE.Vector2(r, y0 + (h / sheds) * 0.3), new THREE.Vector2(r * 0.55, y0 + (h / sheds) * 0.6));
    }
    pts.push(new THREE.Vector2(r * 0.55, h), new THREE.Vector2(0, h));
    const g = new THREE.LatheGeometry(pts, 10);
    g.translate(x, y, z);
    return g;
  }
  function sag(a: Vec3, b: Vec3, dip: number): T.BufferGeometry {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - dip * 4 * t * (1 - t), lerp(a[2], b[2], t)]);
    }
    return tube(THREE, pts, 0.0035, 4, false, 16);
  }
  function latticeColumn(x: number, z: number, h: number, w: number, wTop = w): T.BufferGeometry[] {
    const out: T.BufferGeometry[] = [];
    const c = (s: number, t: number, y: number, ww: number): Vec3 => [x + s * ww / 2, y, z + t * ww / 2];
    const corners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [s, t] of corners) out.push(bar(THREE, c(s, t, 0, w), c(s, t, h, wTop), 0.006, 4));
    const n = Math.max(3, Math.round(h / (w * 1.4)));
    for (let i = 0; i < n; i++) {
      const y0 = (i / n) * h,
        y1 = ((i + 1) / n) * h;
      const w0 = lerp(w, wTop, i / n),
        w1 = lerp(w, wTop, (i + 1) / n);
      for (let k = 0; k < 4; k++) {
        const [s0, t0] = corners[k],
          [s1, t1] = corners[(k + 1) % 4];
        const p0 = i % 2 ? c(s0, t0, y0, w0) : c(s1, t1, y0, w0);
        const p1 = i % 2 ? c(s1, t1, y1, w1) : c(s0, t0, y1, w1);
        out.push(bar(THREE, p0, p1, 0.003, 3));
      }
    }
    return out;
  }
  function latticeBeam(x: number, y: number, z0: number, z1: number, w: number): T.BufferGeometry[] {
    const out: T.BufferGeometry[] = [];
    if (w <= 0) {
      // Earth-wire peaks on top of the gantry columns.
      for (const z of [z0, (z0 + z1) / 2, z1]) out.push(bar(THREE, [x, y, z], [x, y + 0.14, z], 0.005, 4));
      return out;
    }
    for (const dy of [-w / 2, w / 2]) for (const dx of [-w / 2, w / 2]) out.push(bar(THREE, [x + dx, y + dy, z0], [x + dx, y + dy, z1], 0.006, 4));
    const n = Math.round((z1 - z0) / w);
    for (let i = 0; i < n; i++) {
      const za = lerp(z0, z1, i / n),
        zb = lerp(z0, z1, (i + 1) / n);
      for (const dx of [-w / 2, w / 2]) out.push(bar(THREE, [x + dx, y - w / 2, i % 2 ? za : zb], [x + dx, y + w / 2, i % 2 ? zb : za], 0.003, 3));
      for (const dy of [-w / 2, w / 2]) out.push(bar(THREE, [x - w / 2, y + dy, i % 2 ? za : zb], [x + w / 2, y + dy, i % 2 ? zb : za], 0.003, 3));
    }
    return out;
  }

  // ================================================================ levels
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  const pw = (v: number, keys: [number, number][]) => {
    // Piecewise-linear through [level, value] keys.
    if (v <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, va] = keys[i],
        [b, vb] = keys[i + 1];
      if (v <= b) return lerp(va, vb, (v - a) / (b - a));
    }
    return keys[keys.length - 1][1];
  };
  return {
    // The chiller fans spin and the rack LEDs blink (onBeforeRender above), so the engine keeps
    // drawing frames while idle, in every view.
    animated: true,
    applyLevel(v: number) {
      L.set("ground", pw(v, [[0, 1], [1, 0.55], [2, 0.32], [3, 0.28]]));
      L.set("shell", pw(v, [[0, 1], [1, 0.14], [2, 0.07], [3, 0.05]]));
      L.set("roof", pw(v, [[0, 1], [0.6, 0.12], [1, 0.05], [3, 0.03]]));
      L.set("office", pw(v, [[0, 1], [1, 0.35], [2, 0.16], [3, 0.12]]));
      L.set("site", pw(v, [[0, 1], [1, 1], [2, 0.16], [3, 0.1]]));
      L.set("ws", pw(v, [[0, 1], [1, 0.16], [2, 1], [3, 0.4]]));
      L.set("wsx", pw(v, [[0, 1], [1, 0.16], [2, 1], [3, 0.1]]));
      L.set("rack", pw(v, [[0, 1], [1, 0.18], [2, 0.3], [3, 1]]));
      const f1 = tri(v, 1);
      focusPower(f1 * 0.3);
      focusXfmr(f1 * 0.35);
      focusCool(f1 * 0.3);
      focusTray(tri(v, 2) * 0.45);
    },
  };
}
