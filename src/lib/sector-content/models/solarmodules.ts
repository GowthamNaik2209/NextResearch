// Solar module manufacturing (ALMM) — a domestic cell + module gigafactory
// feeding the utility-scale PV plant built beside it.
//
// Plan (+X east, +Z south/toward the default camera):
//   x -5.5..-2.4  sawtooth-roofed module/cell factory (rooftop PV on the
//                 south-facing slopes, north-light glazing), loading docks,
//                 raw-material yard and office on the south (+z) front.
//   x -1.4.. 2.6  single-axis tracker blocks (1P, portrait-across-row) with
//                 instanced glass/cell/frame modules, split by an E-W road.
//   x  3.2.. 5.6  inverter skids, 220 kV-style pooling substation, control
//                 building, gantry and a lattice tower carrying the line out.
//
// Layers: 0 the complete site; 1 cells & wafers (factory interior cell
// line, raw-material yard, and an ingot -> brick -> wafer -> cell exhibit
// that rises above the roof); 2 modules & racking (module line, glass/EVA
// stock, tracker array and an exploded module); 3 power & grid.
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
  roundedBox,
  smoothstep,
  tube,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };

export function buildSolarmodules(ctx: Ctx) {
  const THREE = ctx.THREE;
  const [siteG, cellG, modG, powG] = ctx.layerGroups;
  const L = layerMats();
  const DS = THREE.DoubleSide;
  const std = (color: number, metalness = 0.3, roughness = 0.6, extra: T.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });

  // ------------------------------------------------------------ merge bins
  // Everything static is accumulated per (parent, material) and merged once
  // at the end, so hundreds of small parts cost a handful of draw calls.
  type Bin = { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[]; order: number };
  const bins = new Map<string, Bin>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry, order = 0) => {
    const k = parent.uuid + "|" + mat.uuid;
    let b = bins.get(k);
    if (!b) {
      b = { parent, mat, geos: [], order };
      bins.set(k, b);
    }
    b.geos.push(geo);
    return geo;
  };
  const flush = () => {
    for (const b of bins.values()) {
      const m = new THREE.Mesh(mergeInto(THREE, b.geos), b.mat);
      m.renderOrder = b.order;
      b.parent.add(m);
    }
    bins.clear();
  };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  /** Box standing on y0. */
  const blk = (w: number, h: number, d: number, x: number, y0: number, z: number) => box(w, h, d, x, y0 + h / 2, z);
  const rbox = (w: number, h: number, d: number, r: number, x: number, y0: number, z: number) =>
    roundedBox(THREE, w, h, d, r).translate(x, y0 + h / 2, z);
  const cyl = (rt: number, rb: number, h: number, x: number, y0: number, z: number, seg = 16) =>
    new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y0 + h / 2, z);
  /** Quad a-b-c-d with tiling UVs. */
  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, us = 1, vs = 1) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, us, 0, us, vs, 0, vs], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  };
  const addAt = (parent: T.Object3D, o: T.Object3D, x: number, y: number, z: number) => {
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const shadow = (parent: T.Object3D, sx: number, sz: number, op: number, x: number, z: number, bucket = "site") => {
    const m = contactShadow(THREE, sx, sz, op, 0.003);
    m.position.x = x;
    m.position.z = z;
    L.add(bucket, m.material as T.Material);
    parent.add(m);
  };
  const tri3 = (a: Vec3, b: Vec3, c: Vec3) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    g.setIndex([0, 1, 2]);
    g.computeVertexNormals();
    return g;
  };
  /** Pseudo-square (mono-Si brick/wafer/cell) outline: square of half-side h with corners cut by a circle of radius r. */
  const pseudoSquare = (h: number, r: number, n = 96) => {
    const s = new THREE.Shape();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 4;
      const x = Math.max(-h, Math.min(h, r * Math.cos(a)));
      const y = Math.max(-h, Math.min(h, r * Math.sin(a)));
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    return s;
  };

  // ------------------------------------------------------------ textures
  const soilTex = canvasTexture(THREE, 1024, 768, (g, w, h) => {
    g.fillStyle = "#7a6a58";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? `rgba(60,48,38,${0.1 + Math.random() * 0.15})` : `rgba(175,160,138,${0.08 + Math.random() * 0.12})`;
      const r = 0.5 + Math.random() * 2.2;
      g.fillRect(Math.random() * w, Math.random() * h, r, r);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(98,84,64,0.05)" : "rgba(150,134,110,0.05)";
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, Math.PI * 2);
      g.fill();
    }
  });
  const cladTex = canvasTexture(THREE, 64, 256, (g, w, h) => {
    // v=0 at the bottom of the canvas -> plinth; top -> fascia band.
    g.fillStyle = "#cfd4da";
    g.fillRect(0, 0, w, h);
    const rib = g.createLinearGradient(0, 0, w, 0);
    rib.addColorStop(0, "rgba(0,0,0,0.0)");
    rib.addColorStop(0.42, "rgba(0,0,0,0.0)");
    rib.addColorStop(0.5, "rgba(0,0,0,0.16)");
    rib.addColorStop(0.62, "rgba(255,255,255,0.22)");
    rib.addColorStop(0.75, "rgba(0,0,0,0.0)");
    g.fillStyle = rib;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#24476e";
    g.fillRect(0, 0, w, h * 0.1);
    g.fillStyle = "#1a3554";
    g.fillRect(0, h * 0.1, w, 3);
    g.fillStyle = "#8b9097";
    g.fillRect(0, h * 0.9, w, h * 0.1);
  });
  cladTex.wrapS = THREE.RepeatWrapping;
  // Landscape 2:1 module: 24 half-cut cells across, 6 strings down, silver frame.
  const drawModule = (g: CanvasRenderingContext2D, w: number, h: number, frame: boolean) => {
    const f = frame ? 7 : 0;
    if (frame) {
      g.fillStyle = "#c8ced6";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#9aa2ac";
      g.fillRect(f - 2, f - 2, w - 2 * f + 4, h - 2 * f + 4);
      g.fillStyle = "#4a525e";
      g.fillRect(f, f, w - 2 * f, h - 2 * f);
    } else g.clearRect(0, 0, w, h);
    const m = 6,
      gap = 2,
      mid = 8;
    const cols = 24,
      rows = 6;
    const cw = (w - 2 * f - 2 * m - (cols - 2) * gap - mid) / cols;
    const ch = (h - 2 * f - 2 * m - (rows - 1) * gap) / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = f + m + c * (cw + gap) + (c >= cols / 2 ? mid - gap : 0);
        const y = f + m + r * (ch + gap);
        const gr = g.createLinearGradient(x, y, x + cw, y + ch);
        gr.addColorStop(0, "#172644");
        gr.addColorStop(0.5, "#0f1b34");
        gr.addColorStop(1, "#0a1326");
        g.fillStyle = gr;
        g.fillRect(x, y, cw, ch);
        g.fillStyle = "rgba(120,140,175,0.18)";
        for (let k = 1; k < 7; k++) g.fillRect(x + (k * cw) / 7, y, 0.6, ch);
      }
    // busbars running along each string
    g.fillStyle = "rgba(190,198,210,0.7)";
    for (let r = 0; r < rows; r++)
      for (let k = 1; k <= 5; k++) {
        const y = f + m + r * (ch + gap) + (k * ch) / 6;
        g.fillRect(f + m, y - 0.6, w - 2 * f - 2 * m, 1.2);
      }
    // string interconnect ribbons at the ends
    g.fillStyle = "rgba(205,212,222,0.9)";
    g.fillRect(f + 2, f + m, 3, h - 2 * f - 2 * m);
    g.fillRect(w - f - 5, f + m, 3, h - 2 * f - 2 * m);
  };
  const modTex = canvasTexture(THREE, 512, 256, (g, w, h) => drawModule(g, w, h, true));
  modTex.wrapS = modTex.wrapT = THREE.RepeatWrapping;
  const cellsOnlyTex = canvasTexture(THREE, 1024, 512, (g, w, h) => drawModule(g, w, h, false));
  const cellTex = canvasTexture(THREE, 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    const H = w * 0.49,
      R = w * 0.66,
      c = w / 2;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      const x = c + Math.max(-H, Math.min(H, R * Math.cos(a)));
      const y = c + Math.max(-H, Math.min(H, R * Math.sin(a)));
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.closePath();
    g.clip();
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#27406e");
    gr.addColorStop(0.45, "#16274a");
    gr.addColorStop(1, "#0c172e");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(150,170,205,0.35)";
    for (let y = 4; y < h; y += 7) g.fillRect(0, y, w, 1);
    for (let k = 0; k < 9; k++) {
      const x = 22 + (k * (w - 44)) / 8;
      g.fillStyle = "#c9d0d9";
      g.fillRect(x - 3, 0, 6, h);
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(x - 1, 0, 1.5, h);
      for (let y = 40; y < h; y += 72) {
        g.fillStyle = "#e3e7ec";
        g.fillRect(x - 5, y, 10, 12);
      }
    }
    g.restore();
  });
  const louvreTex = canvasTexture(THREE, 128, 128, (g, w, h) => {
    g.fillStyle = "#e8ebee";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b9c0c8";
    g.fillRect(14, 14, w - 28, h - 40);
    for (let y = 18; y < h - 30; y += 7) {
      g.fillStyle = "#6f7882";
      g.fillRect(16, y, w - 32, 3);
    }
    g.fillStyle = "#7a5cc7";
    g.fillRect(0, h - 18, w, 6);
  });
  const glazTex = canvasTexture(THREE, 128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#5f7d98");
    gr.addColorStop(1, "#2b3f55");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#c7cdd4";
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
    for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 3);
  });
  glazTex.wrapS = glazTex.wrapT = THREE.RepeatWrapping;
  const fenceTex = canvasTexture(THREE, 64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(200,206,214,1)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, h);
    g.moveTo(w, 0);
    g.lineTo(0, h);
    g.stroke();
  });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;

  // ------------------------------------------------------------ materials
  // ground (fades least)
  const soil = L.add("ground", std(0xffffff, 0, 0.97, { map: soilTex }));
  const asphalt = L.add("ground", std(0x2f3338, 0.05, 0.9));
  const gravel = L.add("ground", std(0x9b9385, 0.0, 0.95));
  const concrete = L.add("ground", std(0xa5a8aa, 0.0, 0.85));
  const floorEpoxy = L.add("ground", std(0x8d969e, 0.1, 0.45));
  const walkway = L.add("ground", std(0x3f8f5a, 0.05, 0.6));
  // site context
  const fencePost = L.add("site", std(0x9aa3ad, 0.6, 0.45));
  const fenceMesh = L.add(
    "site",
    std(0xffffff, 0.5, 0.5, { map: fenceTex, alphaTest: 0.4, side: DS }),
    0.9
  );
  const truckWhite = L.add("site", std(0xe9ecef, 0.3, 0.4));
  const truckCab = L.add("site", std(0x2a5d8f, 0.5, 0.35));
  const tyre = L.add("site", std(0x1a1c1f, 0.1, 0.85));
  const darkGlass = L.add("site", std(0x0f1620, 0.6, 0.15));
  const leaf = L.add("site", std(0x3e6b3a, 0, 0.85, { flatShading: true }));
  const bark = L.add("site", std(0x5a4636, 0, 0.9));
  const ctrlWall = L.add("power", std(0xd9d4c8, 0.05, 0.75));
  const ctrlTrim = L.add("power", std(0x6b7480, 0.4, 0.5));
  const ctrlGlass = L.add("power", std(0x0f1620, 0.6, 0.15));
  const ctrlHvac = L.add("power", std(0xdfe3e6, 0.4, 0.5));
  // factory shell
  const clad = L.add("shell", std(0xffffff, 0.35, 0.5, { map: cladTex, side: DS }));
  const cladPlain = L.add("shell", std(0xcfd4da, 0.35, 0.5, { side: DS }));
  const roofMem = L.add("shell", std(0xb7bcc2, 0.2, 0.7, { side: DS }));
  const northGlass = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({ color: 0x7894ad, metalness: 0.3, roughness: 0.1, clearcoat: 1, side: DS, map: glazTex })
  );
  const roofPV = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({ map: modTex, metalness: 0.1, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.12, envMapIntensity: 0.6 })
  );
  const trim = L.add("shell", std(0x5d6670, 0.6, 0.4));
  const dockDoor = L.add("shell", std(0x8e98a3, 0.5, 0.45));
  const dockSeal = L.add("shell", std(0x1b1d20, 0.1, 0.9));
  const officeGlass = L.add(
    "shell",
    new THREE.MeshPhysicalMaterial({ color: 0x9fb8cc, metalness: 0.4, roughness: 0.08, clearcoat: 1, map: glazTex })
  );
  const hvac = L.add("shell", std(0xdfe3e6, 0.4, 0.5));
  // cells & wafers
  const machWhite = L.add("cells", std(0xe4e7ea, 0.2, 0.45));
  const machSteel = L.add("cells", std(0xb8c0c8, 0.85, 0.28));
  const machDark = L.add("cells", std(0x2b3138, 0.4, 0.5));
  const cellAccent = L.add("cells", std(0x2e86ab, 0.35, 0.4));
  const furnaceGlow = L.add("cells", std(0x331306, 0.2, 0.6, { emissive: 0xff7a1a, emissiveIntensity: 1.4 }));
  const bulkBag = L.add("cells", std(0xeeeae0, 0, 0.9));
  const pallet = L.add("cells", std(0x9b7a52, 0, 0.85));
  const crate = L.add("cells", std(0x6a7b8c, 0.3, 0.6));
  const siMono = L.add("cellHero", std(0x5c636d, 0.9, 0.22));
  const waferMat = L.add("cellHero", std(0x8d949e, 0.75, 0.38, { side: DS }));
  const cellFace = L.add("cellHero", std(0xffffff, 0.45, 0.3, { map: cellTex, alphaTest: 0.5, side: DS }));
  const cellBack = L.add("cellHero", std(0x9da3aa, 0.7, 0.45, { side: DS }));
  const heroCellAccent = L.add("cellHero", std(0x2e86ab, 0.3, 0.4, { emissive: 0x2e86ab, emissiveIntensity: 0.6 }));
  // modules & racking
  const modTop = L.add(
    "mods",
    new THREE.MeshPhysicalMaterial({ map: modTex, metalness: 0.1, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.12, envMapIntensity: 0.6 })
  );
  const modFrame = L.add("mods", std(0xc5ccd4, 0.85, 0.3));
  const modBack = L.add("mods", std(0xe6e8ea, 0.1, 0.7));
  const galv = L.add("mods", std(0xa9b1b9, 0.8, 0.38));
  const tubeSteel = L.add("mods", std(0x8d969f, 0.75, 0.35));
  const drive = L.add("mods", std(0x3a4148, 0.5, 0.5));
  const lineWhite = L.add("mods", std(0xe6e9ec, 0.2, 0.45));
  const lineGreen = L.add("mods", std(0x1e9e76, 0.35, 0.45));
  const lineDark = L.add("mods", std(0x30363d, 0.4, 0.5));
  const glassStock = L.add(
    "mods",
    new THREE.MeshPhysicalMaterial({ color: 0xbfe3e6, metalness: 0.05, roughness: 0.08, clearcoat: 1, opacity: 0.75 })
  );
  const evaRoll = L.add("mods", std(0xf3f1ea, 0, 0.75));
  const palletM = L.add("mods", std(0x9b7a52, 0, 0.85));
  const lineSteel = L.add("mods", std(0xb8c0c8, 0.85, 0.28));
  // exploded hero module
  const hGlass = L.add(
    "modHero",
    new THREE.MeshPhysicalMaterial({ color: 0xd8f0f4, metalness: 0, roughness: 0.04, clearcoat: 1, opacity: 0.38, side: DS })
  );
  const hEva = L.add("modHero", std(0xf4f1e6, 0, 0.6, { opacity: 0.28, side: DS }));
  const hCells = L.add("modHero", std(0xffffff, 0.4, 0.3, { map: cellsOnlyTex, alphaTest: 0.5, side: DS }));
  const hBack = L.add("modHero", std(0xf1f2ef, 0.05, 0.7, { side: DS }));
  const hFrame = L.add("modHero", std(0xc9d0d8, 0.9, 0.25));
  const hJbox = L.add("modHero", std(0x1c1f23, 0.2, 0.6));
  // power & grid
  const invWhite = L.add("power", std(0xeceff1, 0.25, 0.45));
  const invLouvre = L.add("power", std(0xffffff, 0.25, 0.5, { map: louvreTex }));
  const invAccent = L.add("power", std(0x7a5cc7, 0.4, 0.4));
  const xfmrGrey = L.add("power", std(0x7f8992, 0.55, 0.45));
  const porcelain = L.add("power", std(0x8a5a3c, 0.1, 0.35));
  const polymer = L.add("power", std(0xd9dde0, 0.05, 0.5));
  const lattice = L.add("power", std(0xa3abb3, 0.75, 0.4));
  const conductor = L.add("power", std(0x55595e, 0.85, 0.35));
  const cableTray = L.add("power", std(0x2a2e33, 0.3, 0.7));
  const padConc = L.add("power", std(0xb3b5b5, 0, 0.85));
  const yardGravel = L.add("power", std(0x8f8a82, 0, 0.95));

  // Emissive focus tint for the system the current layer is about.
  const focus = (mats: T.MeshStandardMaterial[], hex: number) => {
    mats.forEach((m) => m.emissive.setHex(hex));
    return (k: number) => mats.forEach((m) => (m.emissiveIntensity = k));
  };
  const focusCells = focus([cellAccent], 0x2e86ab);
  const focusMods = focus([lineGreen, tubeSteel], 0x1e9e76);
  const focusPower = focus([invAccent], 0x7a5cc7);

  // ------------------------------------------------------------ ground & roads
  const GX0 = -6.1,
    GX1 = 6.9,
    GZ = 4.6;
  {
    const g = new THREE.BoxGeometry(GX1 - GX0, 0.06, 2 * GZ).translate((GX0 + GX1) / 2, -0.027, 0);
    const m = new THREE.Mesh(g, soil);
    m.renderOrder = -3;
    siteG.add(m);
  }
  const road = (mat: T.Material, x0: number, x1: number, z0: number, z1: number, y = 0.004) =>
    put(siteG, mat, box(x1 - x0, 0.008, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2), -2);
  road(asphalt, GX0, -1.7, 3.55, 3.9); // perimeter road along the factory front
  road(asphalt, -2.1, -1.7, -4.2, 3.9); // N-S spine between factory and array
  road(gravel, -1.7, 3.2, -0.42, -0.1); // E-W internal array road
  road(gravel, 2.85, 3.2, -4.0, 3.9); // N-S road past the inverter skids
  road(gravel, 3.2, 4.4, -2.9, -2.1); // to the control building
  road(concrete, -5.5, -2.4, 2.4, 3.55, 0.006); // dock apron
  road(concrete, -2.4, -2.1, 2.4, 3.55, 0.006);
  // dashed centre line on the spine road
  for (let z = -4.0; z < 3.6; z += 0.36) put(siteG, gravel, box(0.02, 0.003, 0.18, -1.9, 0.0095, z), -1);

  // Perimeter fence (posts + top rail + chain-link mesh) with a gate gap at the west road.
  const FX0 = -5.85,
    FX1 = 5.85,
    FZ = 4.35,
    FH = 0.26;
  const fenceRun = (a: [number, number], b: [number, number]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 0.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(a[0], b[0], t),
        z = lerp(a[1], b[1], t);
      put(siteG, fencePost, cyl(0.008, 0.008, FH, x, 0, z, 6));
    }
    put(siteG, fencePost, bar(THREE, [a[0], FH, a[1]], [b[0], FH, b[1]], 0.005, 5));
    put(
      siteG,
      fenceMesh,
      quad([a[0], 0.01, a[1]], [b[0], 0.01, b[1]], [b[0], FH, b[1]], [a[0], FH, a[1]], len / 0.06, FH / 0.06)
    );
  };
  fenceRun([FX0, -FZ], [FX1, -FZ]);
  fenceRun([FX1, -FZ], [FX1, FZ]);
  fenceRun([FX1, FZ], [FX0, FZ]);
  fenceRun([FX0, FZ], [FX0, 3.95]);
  fenceRun([FX0, 3.5], [FX0, -FZ]);

  // ------------------------------------------------------------ factory shell
  const FA = -5.5,
    FB = -2.4,
    FZ0 = -1.6,
    FZ1 = 2.4,
    WH = 0.85,
    RIDGE = 1.2;
  const NT = 6;
  const P = (FZ1 - FZ0) / NT;
  // Interior floor (epoxy grey with green walkways)
  put(siteG, floorEpoxy, box(FB - FA - 0.04, 0.01, FZ1 - FZ0 - 0.04, (FA + FB) / 2, 0.008, (FZ0 + FZ1) / 2), -1);
  put(siteG, walkway, box(FB - FA - 0.3, 0.004, 0.06, (FA + FB) / 2, 0.015, 0.4), -1);
  put(siteG, walkway, box(0.06, 0.004, FZ1 - FZ0 - 0.3, -2.62, 0.015, 0.4), -1);
  // Walls: ribbed cladding quads (UV u tiles every 0.09 along the wall)
  const RIB = 0.09;
  const wall = (a: [number, number], b: [number, number]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    put(siteG, clad, quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], WH, b[1]], [a[0], WH, a[1]], len / RIB, 1));
  };
  wall([FA, FZ1], [FB, FZ1]);
  wall([FB, FZ1], [FB, FZ0]);
  wall([FB, FZ0], [FA, FZ0]);
  wall([FA, FZ0], [FA, FZ1]);
  // Sawtooth roof: north-light glazing (vertical, facing -z) + south-facing PV slopes.
  for (let k = 0; k < NT; k++) {
    const zs = FZ0 + k * P,
      ze = zs + P;
    put(siteG, northGlass, quad([FB, WH, zs], [FA, WH, zs], [FA, RIDGE, zs], [FB, RIDGE, zs], (FB - FA) / 0.4, 1));
    put(siteG, roofMem, quad([FA, RIDGE, zs], [FA, WH, ze], [FB, WH, ze], [FB, RIDGE, zs]));
    // gable infill triangles
    put(siteG, cladPlain, tri3([FA, WH, zs], [FA, RIDGE, zs], [FA, WH, ze]));
    put(siteG, cladPlain, tri3([FB, WH, zs], [FB, WH, ze], [FB, RIDGE, zs]));
    // ridge cap, valley gutter
    put(siteG, trim, box(FB - FA + 0.04, 0.025, 0.035, (FA + FB) / 2, RIDGE + 0.008, zs));
    put(siteG, trim, box(FB - FA + 0.04, 0.02, 0.05, (FA + FB) / 2, WH + 0.005, ze));
    // rooftop PV on the slope, lifted a little off the membrane
    const inset = 0.1,
      s0 = 0.06,
      s1 = 0.06;
    const lift = 0.012;
    const ny = P / Math.hypot(P, RIDGE - WH),
      nz = (RIDGE - WH) / Math.hypot(P, RIDGE - WH);
    const pz = (t: number) => lerp(zs, ze, t);
    const py = (t: number) => lerp(RIDGE, WH, t);
    const ta = s0 / Math.hypot(P, RIDGE - WH),
      tb = 1 - s1 / Math.hypot(P, RIDGE - WH);
    const nrows = 3,
      ncols = Math.floor((FB - FA - 2 * inset) / 0.22);
    const xa = FA + inset,
      xb = xa + ncols * 0.22;
    put(
      siteG,
      roofPV,
      quad(
        [xa, py(tb) + ny * lift, pz(tb) + nz * lift],
        [xb, py(tb) + ny * lift, pz(tb) + nz * lift],
        [xb, py(ta) + ny * lift, pz(ta) + nz * lift],
        [xa, py(ta) + ny * lift, pz(ta) + nz * lift],
        ncols / 2,
        nrows
      )
    );
  }
  // Parapet trims along the eaves/corners
  put(siteG, trim, box(FB - FA + 0.06, 0.05, 0.05, (FA + FB) / 2, WH + 0.02, FZ1));
  for (const x of [FA, FB]) put(siteG, trim, box(0.05, 0.05, FZ1 - FZ0 + 0.04, x, WH + 0.02, (FZ0 + FZ1) / 2));
  for (const [x, z] of [
    [FA, FZ0],
    [FA, FZ1],
    [FB, FZ0],
    [FB, FZ1],
  ])
    put(siteG, trim, blk(0.05, WH, 0.05, x, 0, z));
  // Loading docks on the front: recessed roller doors, black shelters, canopy, bumpers
  const DOCKS = [-4.35, -3.9, -3.45];
  for (const x of DOCKS) {
    put(siteG, dockDoor, blk(0.3, 0.36, 0.012, x, 0.12, FZ1 + 0.008));
    for (let y = 0.15; y < 0.47; y += 0.035) put(siteG, trim, box(0.3, 0.004, 0.004, x, y, FZ1 + 0.016));
    put(siteG, dockSeal, blk(0.36, 0.04, 0.05, x, 0.48, FZ1 + 0.03));
    for (const s of [-1, 1]) put(siteG, dockSeal, blk(0.03, 0.4, 0.05, x + s * 0.165, 0.1, FZ1 + 0.03));
    put(siteG, dockSeal, blk(0.3, 0.12, 0.03, x, 0, FZ1 + 0.02));
  }
  put(siteG, trim, box(1.5, 0.02, 0.32, -3.9, 0.62, FZ1 + 0.16));
  for (const x of [-4.62, -3.18]) put(siteG, trim, bar(THREE, [x, 0.62, FZ1 + 0.3], [x, 0.78, FZ1 + 0.005], 0.006, 5));
  // Personnel doors and a west-side dock
  put(siteG, dockDoor, blk(0.012, 0.36, 0.32, FA - 0.008, 0.0, 1.6));
  put(siteG, dockSeal, blk(0.03, 0.42, 0.38, FA - 0.02, 0.0, 1.6));
  // Two-storey glazed office block on the front-east corner
  {
    const ox0 = -3.05,
      ox1 = -2.3,
      oz0 = FZ1 - 0.05,
      oz1 = FZ1 + 0.55,
      oh = 0.62;
    const ow = ox1 - ox0,
      od = oz1 - oz0;
    const g = new THREE.BoxGeometry(ow, oh, od);
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 2);
    g.translate((ox0 + ox1) / 2, oh / 2, (oz0 + oz1) / 2);
    put(siteG, officeGlass, g);
    put(siteG, trim, box(ow + 0.06, 0.04, od + 0.06, (ox0 + ox1) / 2, oh + 0.02, (oz0 + oz1) / 2));
    put(siteG, trim, box(ow + 0.02, 0.025, od + 0.02, (ox0 + ox1) / 2, oh / 2, (oz0 + oz1) / 2));
    put(siteG, trim, box(0.4, 0.02, 0.18, (ox0 + ox1) / 2, 0.24, oz1 + 0.09));
  }
  // Rooftop HVAC units on a few teeth
  for (const [x, k] of [
    [-5.0, 1],
    [-4.2, 3],
    [-3.2, 1],
  ] as [number, number][]) {
    const z = FZ0 + (k + 0.75) * P;
    const y = lerp(RIDGE, WH, 0.75) + 0.0;
    put(siteG, hvac, rbox(0.22, 0.09, 0.14, 0.02, x, y, z));
    put(siteG, trim, cyl(0.035, 0.035, 0.012, x + 0.05, y + 0.09, z, 14));
  }
  shadow(siteG, 4.2, 5.0, 0.35, (FA + FB) / 2, 0.4);

  // Trucks backed into two docks
  const truck = (x: number, z0: number, flatbed: boolean) => {
    const tl = 0.78,
      tw = 0.22;
    if (flatbed) {
      put(siteG, truckWhite, blk(tw, 0.03, tl, x, 0.1, z0 + tl / 2));
      for (let i = 0; i < 3; i++) put(siteG, crate, blk(tw - 0.03, 0.12, 0.2, x, 0.13, z0 + 0.12 + i * 0.25));
    } else put(siteG, truckWhite, rbox(tw, 0.28, tl, 0.012, x, 0.1, z0 + tl / 2));
    put(siteG, truckCab, rbox(tw, 0.24, 0.2, 0.03, x, 0.08, z0 + tl + 0.16));
    put(siteG, darkGlass, box(tw - 0.03, 0.08, 0.01, x, 0.25, z0 + tl + 0.262));
    for (const zz of [z0 + 0.08, z0 + 0.2, z0 + tl + 0.1, z0 + tl + 0.2])
      for (const s of [-1, 1]) {
        const w = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 14).rotateZ(Math.PI / 2);
        put(siteG, tyre, w.translate(x + s * (tw / 2 - 0.012), 0.045, zz));
      }
  };
  truck(-4.35, FZ1 + 0.08, false);
  truck(-3.45, FZ1 + 0.08, true);
  // Trees along the front road and around the control building
  const tree = (x: number, z: number, s = 1) => {
    put(siteG, bark, cyl(0.012 * s, 0.018 * s, 0.14 * s, x, 0, z, 6));
    for (const [dx, dy, dz, r] of [
      [0, 0.2, 0, 0.11],
      [0.06, 0.16, 0.03, 0.08],
      [-0.05, 0.17, -0.03, 0.08],
    ])
      put(siteG, leaf, new THREE.IcosahedronGeometry(r * s, 1).translate(x + dx * s, dy * s, z + dz * s));
  };
  for (let x = -5.5; x <= -2.0; x += 0.55) tree(x, 4.12, 1);
  for (const [x, z] of [
    [3.6, -3.5],
    [5.3, -3.6],
    [5.5, -2.0],
  ])
    tree(x, z, 1.1);

  // Control building / site O&M office (EPC & owner)
  {
    const cx = 4.4,
      cz = -2.55;
    put(powG, ctrlWall, blk(0.95, 0.36, 0.5, cx, 0, cz));
    put(powG, ctrlTrim, blk(1.0, 0.04, 0.55, cx, 0.36, cz));
    for (const s of [-1, 1]) {
      put(powG, ctrlGlass, box(0.7, 0.07, 0.01, cx, 0.22, cz + s * 0.252));
      put(powG, ctrlGlass, box(0.01, 0.07, 0.34, cx + s * 0.477, 0.22, cz));
    }
    put(powG, ctrlTrim, box(0.12, 0.2, 0.01, cx - 0.36, 0.1, cz + 0.253));
    for (const dx of [-0.25, 0.0, 0.25]) put(powG, ctrlHvac, rbox(0.12, 0.06, 0.1, 0.015, cx + dx, 0.4, cz - 0.05));
    put(powG, ctrlTrim, cyl(0.006, 0.006, 0.35, cx + 0.42, 0.4, cz - 0.18, 6)); // comms mast
    // parked cars
    for (const [dx, col] of [
      [-0.3, truckCab],
      [0.0, truckWhite],
    ] as [number, T.Material][]) {
      put(siteG, col, rbox(0.11, 0.05, 0.2, 0.02, cx + dx, 0.02, cz + 0.48));
      put(siteG, darkGlass, rbox(0.09, 0.035, 0.1, 0.015, cx + dx, 0.065, cz + 0.47));
    }
  }

  // ------------------------------------------------------------ layer 1: cells & wafers
  // Back half of the factory: Cz ingot pullers, wire saws, diffusion/PECVD,
  // metallisation (screen printers + firing furnace) and cell testers.
  for (let i = 0; i < 5; i++) {
    const x = -5.15 + i * 0.42,
      z = -1.25;
    put(cellG, machWhite, rbox(0.26, 0.14, 0.26, 0.02, x, 0, z));
    put(cellG, machSteel, cyl(0.1, 0.1, 0.16, x, 0.14, z, 24));
    put(cellG, machSteel, new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.3, z));
    put(cellG, machSteel, cyl(0.035, 0.035, 0.32, x, 0.38, z, 14));
    put(cellG, cellAccent, rbox(0.09, 0.06, 0.09, 0.015, x, 0.7, z));
    put(cellG, cellAccent, rbox(0.08, 0.28, 0.12, 0.015, x + 0.17, 0, z + 0.03));
    put(cellG, machDark, box(0.06, 0.08, 0.004, x + 0.17, 0.2, z + 0.091));
  }
  for (const x of [-3.0, -2.65]) {
    put(cellG, machWhite, rbox(0.28, 0.3, 0.3, 0.025, x, 0, -1.22));
    put(cellG, machDark, box(0.18, 0.12, 0.004, x, 0.18, -1.068));
    put(cellG, cellAccent, box(0.28, 0.025, 0.302, x, 0.27, -1.22));
  }
  // Diffusion furnace bank with its quartz tube ports
  put(cellG, machWhite, rbox(1.3, 0.34, 0.3, 0.02, -4.55, 0, -0.6));
  put(cellG, cellAccent, box(1.3, 0.03, 0.302, -4.55, 0.3, -0.6));
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 2; j++)
      put(
        cellG,
        machDark,
        new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16).rotateX(Math.PI / 2).translate(-5.08 + i * 0.21, 0.1 + j * 0.1, -0.447)
      );
  // PECVD / ALD tools
  for (const x of [-3.6, -3.05]) {
    put(cellG, machWhite, rbox(0.42, 0.36, 0.32, 0.025, x, 0, -0.6));
    put(cellG, cellAccent, rbox(0.12, 0.2, 0.06, 0.015, x - 0.1, 0.36, -0.6));
    put(cellG, machDark, box(0.22, 0.1, 0.004, x + 0.06, 0.2, -0.437));
  }
  // Metallisation line: conveyor, screen printers, firing furnace, IV tester/sorter
  put(cellG, machSteel, blk(2.7, 0.04, 0.12, -4.0, 0.12, 0.05));
  for (let x = -5.3; x <= -2.7; x += 0.4) for (const s of [-1, 1]) put(cellG, machSteel, blk(0.02, 0.12, 0.02, x, 0, 0.05 + s * 0.05));
  for (const x of [-5.0, -4.6, -4.2]) {
    put(cellG, machWhite, rbox(0.28, 0.3, 0.3, 0.025, x, 0, 0.05));
    put(cellG, cellAccent, rbox(0.3, 0.06, 0.32, 0.02, x, 0.3, 0.05));
  }
  put(cellG, machWhite, rbox(0.9, 0.2, 0.28, 0.025, -3.45, 0.05, 0.05));
  put(cellG, furnaceGlow, box(0.86, 0.025, 0.004, -3.45, 0.17, 0.192));
  put(cellG, machDark, box(0.9, 0.03, 0.29, -3.45, 0.25, 0.05));
  put(cellG, machWhite, rbox(0.3, 0.32, 0.3, 0.025, -2.8, 0, 0.05));
  put(cellG, cellAccent, box(0.2, 0.08, 0.004, -2.8, 0.22, 0.202));
  // Raw-material yard outside the dock: polysilicon bulk bags and wafer/ingot crates on pallets
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      const x = -5.32 + i * 0.27,
        z = 2.75 + j * 0.32;
      put(cellG, pallet, blk(0.22, 0.03, 0.22, x, 0, z));
      put(cellG, bulkBag, rbox(0.2, 0.2, 0.2, 0.04, x, 0.03, z));
      for (const s of [-1, 1]) put(cellG, bulkBag, tube(THREE, [[x + s * 0.06, 0.22, z - 0.05], [x + s * 0.06, 0.27, z], [x + s * 0.06, 0.22, z + 0.05]], 0.006, 4));
    }
  for (let i = 0; i < 2; i++) {
    const x = -4.95 + i * 0.3,
      z = 3.4 - 0.0;
    put(cellG, pallet, blk(0.25, 0.03, 0.2, x - 0.32, 0, z));
    put(cellG, crate, rbox(0.23, 0.12, 0.18, 0.01, x - 0.32, 0.03, z));
    put(cellG, crate, rbox(0.23, 0.1, 0.18, 0.01, x - 0.32, 0.15, z));
  }

  // Exhibit: as-grown ingot -> squared brick -> wafers -> finished cell, rising over the roof.
  const cellHero = new THREE.Group();
  cellG.add(cellHero);
  {
    const R = 0.13;
    const ing = lathe(
      THREE,
      [
        [0, 0],
        [0.012, 0],
        [0.012, 0.04],
        [0.05, 0.07],
        [0.1, 0.11],
        [R, 0.16],
        [R, 0.66],
        [0.12, 0.7],
        [0.07, 0.74],
        [0, 0.76],
      ],
      40
    );
    ing.rotateZ(-Math.PI / 2).translate(-0.38, 0, 0);
    addAt(cellHero, new THREE.Mesh(ing, siMono), -4.9, 0, 0);
    const brick = new THREE.ExtrudeGeometry(pseudoSquare(0.105, 0.135), { depth: 0.48, bevelEnabled: false, curveSegments: 6 });
    brick.rotateY(Math.PI / 2).translate(-0.24, 0, 0);
    addAt(cellHero, new THREE.Mesh(brick, siMono), -4.08, 0, 0);
    const waferGeo = new THREE.ExtrudeGeometry(pseudoSquare(0.105, 0.135), { depth: 0.004, bevelEnabled: false });
    waferGeo.rotateY(Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Mesh(waferGeo, waferMat);
      w.position.set(-3.7 + i * 0.055, 0.0 + i * 0.008, 0);
      w.rotation.set(0, -i * 0.07, i * 0.04);
      cellHero.add(w);
    }
    const cellG2 = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), cellFace);
    face.position.z = 0.003;
    cellG2.add(face);
    const back = new THREE.Mesh(new THREE.ShapeGeometry(pseudoSquare(0.17 * 0.98, 0.17 * 0.98 * (0.66 / 0.49)), 4), cellBack);
    back.position.z = -0.001;
    cellG2.add(back);
    cellG2.position.set(-3.1, 0.04, 0.05);
    cellG2.rotation.set(-0.35, -0.35, 0);
    cellHero.add(cellG2);
    // little plinth arrows linking the stages
    for (const x of [-4.4, -3.79, -3.32])
      addAt(cellHero, new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 12).rotateZ(-Math.PI / 2), heroCellAccent), x, -0.2, 0);
    cellHero.add(new THREE.Mesh(bar(THREE, [-5.25, -0.2, 0], [-3.29, -0.2, 0], 0.006, 6), heroCellAccent));
  }
  const CELL_HERO_POS = new THREE.Vector3(1.0, 1.75, -0.55);
  cellHero.position.copy(CELL_HERO_POS);
  cellHero.scale.setScalar(1.25);

  // ------------------------------------------------------------ layer 2: modules & racking
  // Module line in the front half of the factory.
  // Glass racks and EVA/backsheet rolls by the docks
  for (let i = 0; i < 3; i++) {
    const x = -4.75 + i * 0.32,
      z = 2.0;
    put(modG, lineDark, bar(THREE, [x - 0.12, 0, z - 0.1], [x - 0.12, 0.3, z], 0.006, 5));
    put(modG, lineDark, bar(THREE, [x + 0.12, 0, z - 0.1], [x + 0.12, 0.3, z], 0.006, 5));
    put(modG, lineDark, blk(0.28, 0.02, 0.24, x, 0, z));
    for (let k = 0; k < 5; k++) {
      const g = new THREE.BoxGeometry(0.24, 0.3, 0.006).rotateX(-0.28).translate(x, 0.17, z - 0.02 + k * 0.018);
      put(modG, glassStock, g);
    }
  }
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const x = -5.3 + i * 0.22,
        z = 1.9 + j * 0.24;
      put(modG, palletM, blk(0.18, 0.025, 0.2, x, 0, z));
      for (let k = 0; k < 2; k++)
        put(modG, evaRoll, new THREE.CylinderGeometry(0.045, 0.045, 0.17, 18).rotateX(Math.PI / 2).translate(x - 0.045 + k * 0.09, 0.07, z));
    }
  // Stringers -> layup conveyor -> laminators -> framing/JB -> EL/IV test -> packing
  for (const x of [-5.1, -4.7]) {
    put(modG, lineWhite, rbox(0.32, 0.3, 0.3, 0.025, x, 0, 1.18));
    put(modG, lineGreen, box(0.32, 0.03, 0.302, x, 0.25, 1.18));
    put(modG, lineDark, box(0.2, 0.1, 0.004, x, 0.17, 1.332));
  }
  put(modG, lineSteel, blk(2.85, 0.035, 0.26, -3.95, 0.12, 0.78));
  for (let x = -5.3; x <= -2.6; x += 0.3) for (const s of [-1, 1]) put(modG, lineSteel, blk(0.02, 0.12, 0.02, x, 0, 0.78 + s * 0.11));
  // modules riding the conveyor
  const lineModGeo = new THREE.BoxGeometry(0.22, 0.008, 0.44);
  for (const x of [-5.0, -4.65, -4.3, -2.95]) {
    const g = lineModGeo.clone();
    g.translate(x, 0.16, 0.78);
    put(modG, lineDark, g);
  }
  for (const x of [-4.05, -3.6, -3.15]) {
    put(modG, lineWhite, rbox(0.38, 0.14, 0.52, 0.02, x, 0, 1.32));
    put(modG, lineGreen, rbox(0.4, 0.09, 0.54, 0.02, x, 0.14, 1.32));
    put(modG, lineDark, blk(0.36, 0.015, 0.5, x, 0.23, 1.32));
  }
  put(modG, lineWhite, rbox(0.3, 0.32, 0.32, 0.025, -2.75, 0, 1.25));
  put(modG, lineGreen, box(0.3, 0.04, 0.322, -2.75, 0.27, 1.25));
  // finished, packed modules on pallets by the east wall
  for (let i = 0; i < 3; i++) {
    const x = -2.72,
      z = 1.75 + i * 0.22;
    put(modG, palletM, blk(0.26, 0.025, 0.2, x, 0, z));
    put(modG, lineDark, blk(0.24, 0.2, 0.18, x, 0.025, z));
    put(modG, modFrame, box(0.242, 0.012, 0.182, x, 0.12, z));
  }

  // Tracker array: 6 rows x 2 blocks, 1P single-axis trackers rotating about N-S torque tubes.
  const ROWS = [-1.2, -0.48, 0.24, 0.96, 1.68, 2.4];
  const BLOCKS: [number, number][] = [
    [-3.75, -0.62],
    [0.1, 3.25],
  ];
  const TUBE_Y = 0.32,
    TILT = 0.42,
    MW = 0.44,
    MD = 0.212,
    MP = 0.224;
  const modGeo = new THREE.BoxGeometry(MW, 0.012, MD);
  const slots: { x: number; z: number }[] = [];
  for (const x of ROWS)
    for (const [z0, z1] of BLOCKS) {
      const n = Math.floor((z1 - z0) / MP);
      const zc = (z0 + z1) / 2;
      for (let i = 0; i < n; i++) slots.push({ x, z: zc + (i - (n - 1) / 2) * MP });
      // torque tube
      const tg = new THREE.BoxGeometry(0.024, 0.024, z1 - z0 + 0.04).rotateZ(-TILT).translate(x, TUBE_Y, zc);
      put(modG, tubeSteel, tg);
      // piles + bearing housings, drive at the middle
      const np = Math.round((z1 - z0) / 0.6);
      for (let k = 0; k <= np; k++) {
        const z = lerp(z0 + 0.06, z1 - 0.06, k / np);
        put(modG, galv, blk(0.022, TUBE_Y, 0.014, x, -0.02, z));
        put(modG, galv, box(0.016, 0.03, 0.03, x, TUBE_Y - 0.01, z));
        put(modG, galv, blk(0.06, 0.012, 0.04, x, 0.0, z)); // pile cap / soil collar
      }
      const zm = lerp(z0 + 0.06, z1 - 0.06, Math.floor(np / 2) / np);
      put(modG, drive, rbox(0.07, 0.06, 0.05, 0.012, x, TUBE_Y - 0.03, zm + 0.04));
      put(modG, drive, rbox(0.04, 0.05, 0.03, 0.01, x + 0.05, 0.12, zm));
    }
  const modMesh = new THREE.InstancedMesh(modGeo, [modFrame, modFrame, modTop, modBack, modFrame, modFrame], slots.length);
  {
    const d = new THREE.Object3D();
    slots.forEach((s, i) => {
      d.position.set(s.x + Math.sin(TILT) * 0.026, TUBE_Y + Math.cos(TILT) * 0.026, s.z);
      d.rotation.set(0, 0, -TILT);
      d.updateMatrix();
      modMesh.setMatrixAt(i, d.matrix);
      // module rails (purlins) under each module
      for (const dz of [-0.06, 0.06]) {
        const g = new THREE.BoxGeometry(MW * 0.86, 0.01, 0.014).rotateZ(-TILT);
        g.translate(s.x + Math.sin(TILT) * 0.014, TUBE_Y + Math.cos(TILT) * 0.014, s.z + dz);
        put(modG, galv, g);
      }
    });
    modMesh.instanceMatrix.needsUpdate = true;
  }
  modG.add(modMesh);
  // (no broad contact shadow under the array — the rows read better on bare soil)

  // Exploded module: glass / EVA / cells / EVA / backsheet / frame + junction box.
  const modHero = new THREE.Group();
  modG.add(modHero);
  const HW = 1.0,
    HD = 0.5;
  const layer = (geo: T.BufferGeometry, mat: T.Material) => {
    const m = new THREE.Mesh(geo, mat);
    modHero.add(m);
    return m;
  };
  const hGlassM = layer(new THREE.BoxGeometry(HW - 0.03, 0.012, HD - 0.03), hGlass);
  const hEva1 = layer(new THREE.PlaneGeometry(HW - 0.04, HD - 0.04).rotateX(-Math.PI / 2), hEva);
  const hCellsM = layer(new THREE.PlaneGeometry(HW - 0.05, HD - 0.05).rotateX(-Math.PI / 2), hCells);
  const hEva2 = layer(new THREE.PlaneGeometry(HW - 0.04, HD - 0.04).rotateX(-Math.PI / 2), hEva);
  const hBackM = layer(new THREE.BoxGeometry(HW - 0.04, 0.005, HD - 0.04), hBack);
  const hFrameM = (() => {
    const t = 0.022,
      h = 0.045;
    const g = mergeInto(THREE, [
      box(HW, h, t, 0, 0, HD / 2 - t / 2),
      box(HW, h, t, 0, 0, -HD / 2 + t / 2),
      box(t, h, HD - 2 * t, HW / 2 - t / 2, 0, 0),
      box(t, h, HD - 2 * t, -HW / 2 + t / 2, 0, 0),
      box(HW - 0.01, 0.006, 0.03, 0, h / 2 - 0.003, HD / 2 - t - 0.012),
      box(HW - 0.01, 0.006, 0.03, 0, h / 2 - 0.003, -HD / 2 + t + 0.012),
    ]);
    return layer(g, hFrame);
  })();
  const hJ = new THREE.Group();
  hJ.add(new THREE.Mesh(roundedBox(THREE, 0.11, 0.025, 0.07, 0.008), hJbox));
  for (const s of [-1, 1])
    hJ.add(new THREE.Mesh(tube(THREE, [[s * 0.05, -0.005, 0], [s * 0.15, -0.02, 0.04], [s * 0.24, -0.03, 0.02]], 0.005, 6), hJbox));
  modHero.add(hJ);
  const MOD_HERO_POS = new THREE.Vector3(-1.85, 1.15, 0.75);
  modHero.position.copy(MOD_HERO_POS);
  modHero.rotation.set(0.55, -0.25, -0.12, "YXZ");
  modHero.scale.setScalar(1.3);
  const explode = (e: number) => {
    const d = 0.012 + e * 0.1;
    const stack: [T.Object3D, number][] = [
      [hJ, -0.55],
      [hFrameM, 0],
      [hBackM, 1],
      [hEva2, 2],
      [hCellsM, 3],
      [hEva1, 4],
      [hGlassM, 5],
    ];
    for (const [o, k] of stack) o.position.y = (k - 2.5) * d + (k < 0 ? -0.02 : 0);
    hFrameM.position.y = -2.5 * d + (1 - e) * 0.03;
  };

  // ------------------------------------------------------------ layer 3: power & grid
  // DC combiner boxes at every row end facing the internal road, and cable trenches.
  for (const x of ROWS)
    for (const z of [-0.56, 0.04]) {
      put(powG, invWhite, rbox(0.06, 0.07, 0.035, 0.008, x + 0.12, 0.06, z));
      put(powG, cableTray, blk(0.012, 0.06, 0.012, x + 0.12, 0, z));
    }
  put(powG, cableTray, box(3.95, 0.006, 0.03, 0.85, 0.012, -0.47));
  put(powG, cableTray, box(3.95, 0.006, 0.03, 0.85, 0.012, -0.05));
  put(powG, cableTray, box(0.03, 0.006, 3.5, 3.05, 0.012, -0.26));
  // Inverter skids: central inverter + MV step-up transformer + RMU on a pad
  const skid = (x: number, z: number) => {
    put(powG, padConc, blk(0.42, 0.03, 0.98, x, 0, z));
    const inv = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.42), [invLouvre, invLouvre, invWhite, invWhite, invLouvre, invLouvre]);
    inv.position.set(x, 0.03 + 0.14, z - 0.2);
    powG.add(inv);
    put(powG, invWhite, box(0.32, 0.02, 0.44, x, 0.31 + 0.01, z - 0.2));
    put(powG, invAccent, box(0.302, 0.03, 0.422, x, 0.29, z - 0.2));
    // transformer tank + radiators + bushings
    put(powG, xfmrGrey, rbox(0.2, 0.2, 0.18, 0.015, x, 0.03, z + 0.17));
    for (let i = 0; i < 6; i++) {
      put(powG, xfmrGrey, box(0.008, 0.16, 0.05, x - 0.08 + i * 0.032, 0.12, z + 0.17 + 0.115));
      put(powG, xfmrGrey, box(0.008, 0.16, 0.05, x - 0.08 + i * 0.032, 0.12, z + 0.17 - 0.115));
    }
    for (let i = 0; i < 3; i++) put(powG, polymer, cyl(0.01, 0.012, 0.06, x - 0.05 + i * 0.05, 0.23, z + 0.17, 10));
    put(powG, invWhite, rbox(0.14, 0.18, 0.1, 0.012, x, 0.03, z + 0.39));
    put(powG, invAccent, box(0.142, 0.02, 0.102, x, 0.18, z + 0.39));
  };
  skid(3.42, -1.9);
  skid(3.42, 1.7);

  // Pooling substation
  const SX0 = 3.85,
    SX1 = 5.6,
    SZ0 = -1.2,
    SZ1 = 1.35;
  put(powG, yardGravel, box(SX1 - SX0, 0.01, SZ1 - SZ0, (SX0 + SX1) / 2, 0.006, (SZ0 + SZ1) / 2), -1);
  {
    const runs: [[number, number], [number, number]][] = [
      [
        [SX0, SZ0],
        [SX1, SZ0],
      ],
      [
        [SX1, SZ0],
        [SX1, SZ1],
      ],
      [
        [SX1, SZ1],
        [SX0, SZ1],
      ],
      [
        [SX0, SZ1],
        [SX0, SZ0],
      ],
    ];
    for (const [a, b] of runs) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.round(len / 0.35);
      for (let i = 0; i <= n; i++) put(powG, lattice, cyl(0.006, 0.006, 0.22, lerp(a[0], b[0], i / n), 0, lerp(a[1], b[1], i / n), 5));
      put(powG, lattice, bar(THREE, [a[0], 0.22, a[1]], [b[0], 0.22, b[1]], 0.004, 4));
      put(powG, fenceMesh, quad([a[0], 0.01, a[1]], [b[0], 0.01, b[1]], [b[0], 0.22, b[1]], [a[0], 0.22, a[1]], len / 0.05, 0.22 / 0.05));
    }
  }
  // Insulator post (lathe with sheds)
  const insulatorGeo = (h: number, r: number, sheds: number) => {
    const pts: [number, number][] = [[0, 0]];
    for (let i = 0; i < sheds; i++) {
      const y = (i / sheds) * h;
      pts.push([r, y + 0.002], [r * 2.1, y + h / sheds * 0.35], [r, y + h / sheds * 0.6]);
    }
    pts.push([r, h], [0, h]);
    return lathe(THREE, pts, 14);
  };
  // Main power transformer (33/220 kV)
  {
    const tx = 4.5,
      tz = 0.1;
    put(powG, padConc, blk(0.75, 0.04, 0.6, tx, 0, tz));
    put(powG, xfmrGrey, rbox(0.46, 0.34, 0.3, 0.02, tx, 0.04, tz));
    put(powG, xfmrGrey, blk(0.48, 0.02, 0.32, tx, 0.38, tz));
    for (const s of [-1, 1])
      for (let i = 0; i < 9; i++) put(powG, xfmrGrey, blk(0.012, 0.3, 0.09, tx - 0.2 + i * 0.05, 0.06, tz + s * 0.2));
    // conservator on brackets
    put(powG, xfmrGrey, new THREE.CylinderGeometry(0.045, 0.045, 0.3, 18).rotateX(Math.PI / 2).translate(tx - 0.2, 0.55, tz));
    put(powG, xfmrGrey, bar(THREE, [tx - 0.2, 0.4, tz], [tx - 0.2, 0.51, tz], 0.012, 6));
    // HV bushings (tall, brown porcelain) and MV bushings
    for (let i = 0; i < 3; i++) {
      put(powG, porcelain, insulatorGeo(0.26, 0.014, 8).translate(tx + 0.13, 0.4, tz - 0.1 + i * 0.1));
      put(powG, conductor, cyl(0.008, 0.008, 0.02, tx + 0.13, 0.66, tz - 0.1 + i * 0.1, 8));
      put(powG, porcelain, insulatorGeo(0.1, 0.01, 3).translate(tx - 0.05, 0.4, tz - 0.08 + i * 0.08));
    }
  }
  // HV bay: CTs, breaker, disconnector on steel supports, busbars to the gantry
  const BAY_Z = [-0.0, 0.1, 0.2];
  const support = (x: number, z: number, h: number) => {
    put(powG, lattice, blk(0.03, h, 0.03, x, 0, z));
    put(powG, padConc, blk(0.06, 0.02, 0.06, x, 0, z));
  };
  for (const [x, h, kind] of [
    [4.88, 0.32, 0],
    [5.1, 0.32, 1],
    [5.3, 0.36, 2],
  ] as [number, number, number][]) {
    for (const z of BAY_Z) {
      support(x, z, h);
      put(powG, porcelain, insulatorGeo(0.2, 0.012, 6).translate(x, h, z));
      if (kind === 0) put(powG, polymer, rbox(0.05, 0.06, 0.05, 0.015, x, h + 0.2, z)); // CT head
      if (kind === 1) put(powG, invWhite, cyl(0.025, 0.025, 0.08, x, h + 0.2, z, 12)); // breaker interrupter
      if (kind === 2) put(powG, lattice, box(0.12, 0.012, 0.012, x - 0.04, h + 0.205, z)); // disconnector blade
    }
  }
  for (const z of BAY_Z) {
    put(powG, conductor, tube(THREE, [[4.63, 0.66, z - 0.1], [4.75, 0.68, z], [4.88, 0.6, z]], 0.006, 6));
    put(powG, conductor, bar(THREE, [4.88, 0.6, z], [5.3, 0.6, z], 0.006, 6));
  }
  // Gantry (dead-end structure) where the line leaves the yard
  const GXg = 5.48,
    GY = 0.98;
  for (const z of [-0.22, 0.42]) {
    for (const dx of [-0.04, 0.04]) put(powG, lattice, bar(THREE, [GXg + dx, 0, z], [GXg + dx * 0.5, GY, z], 0.01, 6));
    for (let y = 0.1; y < GY; y += 0.15) put(powG, lattice, bar(THREE, [GXg - 0.04, y, z], [GXg + 0.035, y + 0.15, z], 0.004, 4));
  }
  put(powG, lattice, box(0.06, 0.06, 0.74, GXg, GY, 0.1));
  for (const z of BAY_Z) {
    put(powG, polymer, insulatorGeo(0.1, 0.008, 5).rotateZ(Math.PI / 2).translate(GXg + 0.12, GY - 0.02, z));
    put(powG, conductor, tube(THREE, [[5.3, 0.6, z], [5.4, 0.8, z], [GXg + 0.03, GY - 0.02, z]], 0.005, 6));
  }
  // Lightning masts and the MV switchgear kiosk
  for (const [x, z] of [
    [3.95, -1.1],
    [5.5, 1.25],
  ])
    put(powG, lattice, cyl(0.008, 0.022, 1.25, x, 0, z, 6));
  put(powG, invWhite, rbox(0.55, 0.3, 0.28, 0.015, 4.3, 0, 0.95));
  put(powG, invAccent, box(0.552, 0.03, 0.282, 4.3, 0.26, 0.95));
  put(powG, conductor, tube(THREE, [[4.3, 0.2, 0.8], [4.35, 0.3, 0.55], [4.4, 0.45, 0.32]], 0.008, 6));

  // Lattice transmission tower outside the fence, carrying the line east.
  const TX = 6.35,
    TZc = 0.1;
  {
    const H = 2.05;
    const half = (y: number) => lerp(0.2, 0.06, Math.pow(y / H, 0.8));
    const legs: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const levels = [0, 0.3, 0.58, 0.84, 1.08, 1.3, 1.5, 1.7, 1.88, H];
    for (const [sx, sz] of legs)
      for (let i = 0; i < levels.length - 1; i++) {
        const y0 = levels[i],
          y1 = levels[i + 1];
        put(powG, lattice, bar(THREE, [TX + sx * half(y0), y0, TZc + sz * half(y0)], [TX + sx * half(y1), y1, TZc + sz * half(y1)], 0.011, 5));
      }
    // face bracing (X on each face)
    for (let i = 0; i < levels.length - 1; i++) {
      const y0 = levels[i],
        y1 = levels[i + 1];
      for (let f = 0; f < 4; f++) {
        const [ax, az] = legs[f],
          [bx, bz] = legs[(f + 1) % 4];
        put(powG, lattice, bar(THREE, [TX + ax * half(y0), y0, TZc + az * half(y0)], [TX + bx * half(y1), y1, TZc + bz * half(y1)], 0.004, 4));
        put(powG, lattice, bar(THREE, [TX + bx * half(y0), y0, TZc + bz * half(y0)], [TX + ax * half(y1), y1, TZc + az * half(y1)], 0.004, 4));
      }
    }
    for (const [sx, sz] of legs) put(powG, padConc, blk(0.08, 0.04, 0.08, TX + sx * 0.2, 0, TZc + sz * 0.2));
  }
  // Cross-arms (double circuit, three levels) with insulator strings and conductors.
  const ARMS = [
    [1.4, 0.42],
    [1.62, 0.36],
    [1.84, 0.3],
  ];
  const sag = (a: Vec3, b: Vec3, s: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - s * 4 * t * (1 - t), lerp(a[2], b[2], t)]);
    }
    return pts;
  };
  const gantryPts = [-0.2, -0.06, 0.08, 0.2, 0.32, 0.4];
  let gp = 0;
  for (const [y, arm] of ARMS)
    for (const s of [-1, 1]) {
      put(powG, lattice, bar(THREE, [TX - 0.05, y, TZc + s * 0.06], [TX, y, TZc + s * arm], 0.009, 5));
      put(powG, lattice, bar(THREE, [TX - 0.05, y + 0.12, TZc + s * 0.06], [TX, y, TZc + s * arm], 0.004, 4));
      const tip: Vec3 = [TX, y - 0.1, TZc + s * arm];
      put(powG, polymer, insulatorGeo(0.1, 0.007, 5).translate(TX, y - 0.1, TZc + s * arm));
      // to the substation gantry
      const gz = gantryPts[gp++] ?? 0;
      put(powG, conductor, tube(THREE, sag([GXg + 0.12, GY - 0.02, gz], tip, 0.06), 0.004, 4, false, 24));
      // and away east, into the haze
      put(powG, conductor, tube(THREE, sag(tip, [TX + 4.5, y - 0.35, TZc + s * arm * 1.1], 0.3), 0.004, 4, false, 24));
    }
  // Earth wire peak
  put(powG, lattice, bar(THREE, [TX, 1.88, TZc], [TX, 2.12, TZc], 0.008, 5));
  put(powG, conductor, tube(THREE, sag([TX, 2.12, TZc], [TX + 4.5, 1.8, TZc], 0.25), 0.003, 4, false, 24));

  flush();

  // ------------------------------------------------------------ levels
  const GHOST = 0.18;
  const tri = (v: number, c: number) => clamp01(1 - Math.abs(v - c));
  return {
    applyLevel(v: number) {
      const full = clamp01(1 - v);
      L.set("ground", lerp(1, 0.85, clamp01(v)));
      L.set("site", lerp(1, 0.2, clamp01(v)));
      L.set("shell", Math.max(clamp01(1 - v * 1.25), 0.1 + 0.08 * clamp01(v - 2)));
      L.set("cells", Math.max(full, tri(v, 1), GHOST));
      L.set("cellHero", tri(v, 1));
      L.set("mods", Math.max(full, tri(v, 2), GHOST + 0.04 + 0.08 * clamp01(v - 2)));
      L.set("modHero", tri(v, 2));
      L.set("power", Math.max(full, clamp01(v - 2), GHOST));
      focusCells(tri(v, 1) * 0.45);
      focusMods(tri(v, 2) * 0.25);
      focusPower(clamp01(v - 2) * 0.3);
      // exhibits rise into place as their layer comes forward
      const c = smoothstep(v, 0.3, 1);
      cellHero.position.set(CELL_HERO_POS.x, CELL_HERO_POS.y - (1 - c) * 0.5, CELL_HERO_POS.z);
      cellHero.visible = tri(v, 1) > 0.01;
      const m = tri(v, 2);
      modHero.visible = m > 0.01;
      modHero.position.set(MOD_HERO_POS.x, MOD_HERO_POS.y - (1 - smoothstep(v, 1.3, 2)) * 0.5, MOD_HERO_POS.z);
      explode(smoothstep(v, 1.4, 2) * (1 - smoothstep(v, 2, 2.7)));
    },
  };
}
