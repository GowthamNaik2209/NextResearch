// Hospitals & Healthcare: a miniature multi-specialty hospital campus on a
// display plinth - the kind of tertiary-care site an Indian hospital chain runs
// in a metro (a podium of wards and theatres under a bed tower with a helipad).
//
// Plan (+X east, +Z south/front, the default camera looks in from the SE):
//   · Main hospital: a two-storey podium in the middle with the bed tower on top
//     and a helipad on its roof; the main entrance faces the boulevard.
//   · At the front: a retail pharmacy annex (left of the entrance) and the
//     emergency canopy with ambulances (right of it).
//   · Specialty clinic block (eye / IVF / oncology style) at the front-east.
//   · Diagnostics wing to the west, joined to the podium by a glazed link bridge:
//     a pathology lab at the back, an MRI / CT imaging suite at the front.
//   · Admin & payer block at the back-east: the insurance / TPA cashless desk and
//     a data & command centre with a curved video wall and server racks.
//   · Car park and a liquid-oxygen tank behind the podium, trees and lamps around.
//
// Layers: 0 Campus & Pharmacy (exteriors, pharmacy, specialty clinic, emergency
// bay), 1 Wards & Theatres (podium walls section down, roof + tower lift away:
// wards, two operating theatres, ICU, central supply store), 2 Labs & Imaging
// (diagnostics wing sections down), 3 Payers & Platforms (admin block sections
// down). Buildings peel with a moving world-space clipping plane (a real section
// cut with a dark cap line), like the pharma campus.
import type * as T from "three";
import {
  type Three,
  type Vec3,
  bar,
  canvasTexture,
  clamp01,
  layerMats,
  lerp,
  mergeInto,
  roundedBox,
  smoothstep,
} from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";
type Put = (m: T.Material, g: T.BufferGeometry) => void;

// zone id -> 3D marker position + which rail its callout sits on. Each rail stacks its callouts in
// the zones' array order (sectors/hospitals.ts), which matches the markers' on-screen order in every view.
export const HOSPITALS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  // layer 0: campus & pharmacy
  chains: { pos: [0.15, 1.76, -0.35], side: "top" }, // helipad on the bed tower
  // On the clinic's rooftop plant rather than its front sign: from the Top view the sign sat left of the
  // supply-store leader, so the right-rail line crossed it.
  specialty: { pos: [4.05, 0.55, 0.9], side: "right" }, // rooftop plant on the specialty clinic
  pharmacy: { pos: [-1.0, 0.24, 1.79], side: "left" }, // pharmacy fascia
  // layer 1: wards & theatres
  devices: { pos: [0.66, 0.34, -0.74], side: "bottom" }, // surgical light over OT 1
  consumables: { pos: [2.0, 0.21, 0.3], side: "bottom" }, // oxygen cylinder bank in the central supply store
  // layer 2: labs & imaging
  diagnostics: { pos: [-3.6, 0.26, -1.88], side: "left" }, // automated analyser line
  imaging: { pos: [-3.9, 0.38, 0.05], side: "left" }, // MRI scanner
  // layer 3: payers & platforms
  // Top rail: on the right rail, between the video wall and the clinic, its callout covered the
  // video-wall marker in the Overview.
  insurers: { pos: [3.35, 0.2, -1.22], side: "top" }, // insurance / TPA cashless desk
  healthtech: { pos: [3.6, 0.34, -2.66], side: "right" }, // command-centre video wall
};

// `layer` (optional): a view about one layer also peels the model to it (engine.ts flyTo).
export const HOSPITALS_VIEWS = [
  {
    id: "overview",
    label: "Overview",
    pos: [8.6, 6.3, 9.0],
    target: [0, 0.2, 0],
    narration:
      "Welcome to the hospital campus. The chain runs the main tower with its wards and theatres, a pharmacy and specialty clinics sit at the front, labs and scanners fill the west wing, and insurers and digital platforms pay for and connect it all from the admin block at the back. Peel it layer by layer, from the front door to the back office.",
  },
  {
    id: "campus",
    layer: 0,
    label: "Front Door",
    pos: [2.4, 2.6, 6.8],
    target: [0.9, 0.3, 1.1],
    narration:
      "From the boulevard: the bed tower of a multi-specialty chain like Apollo, Max or Fortis, with the emergency bay and ambulances on the right. The pharmacy by the entrance is where retail chains like MedPlus and Apollo's own stores sell to patients, and the specialty clinic next door is the model of eye, fertility and cancer chains like Dr Agarwal's and HCG.",
  },
  {
    id: "wards",
    layer: 1,
    label: "Wards & OT",
    pos: [3.0, 3.8, 4.0],
    target: [0.25, 0.08, -0.1],
    narration:
      "Inside the podium: general wards on the left, two operating theatres at the back with tables, surgical lights, anaesthesia machines and a C-arm, and an ICU with ventilators at the front. The supply room holds the syringes, catheters, gloves and oxygen cylinders that makers like Poly Medicure sell to every hospital.",
  },
  {
    id: "labs",
    layer: 2,
    label: "Labs & Imaging",
    pos: [-0.9, 3.0, 3.0],
    target: [-3.35, 0.12, -0.7],
    narration:
      "The diagnostics wing. At the back, the pathology lab runs blood and urine samples through automated analysers on a conveyor, the work chains like Dr Lal PathLabs and Metropolis do at scale. At the front sit an MRI and a CT scanner, the radiology that Krsnaa and Vijaya run, often for government hospitals.",
  },
  {
    id: "payers",
    layer: 3,
    label: "Payer Desk",
    pos: [6.6, 3.1, 0.9],
    target: [3.6, 0.15, -1.75],
    narration:
      "The back office. At the insurance desk, insurers like Star Health and Niva Bupa approve cashless claims through administrators like Medi Assist. Behind it, the command centre watches beds, records and teleconsults on a video wall, the digital layer that platforms like Apollo 24/7 are building.",
  },
  {
    id: "top",
    label: "Top",
    pos: [0.05, 12.5, 0.05],
    target: [0, 0, 0],
    narration:
      "From above: the bed tower and helipad in the middle, the pharmacy and emergency bay at the front, the specialty clinic to the right, the diagnostics wing to the left, and the admin and payer block at the back right, beside the car park.",
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
type Item = { p: Vec3; ry?: number; s?: Vec3; c?: number };

export function buildHospitals(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const [campusG, wardG, labG, admG] = ctx.layerGroups;
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
  const batches = new Map<string, { parent: T.Object3D; mat: T.Material; geos: T.BufferGeometry[] }>();
  const put = (parent: T.Object3D, mat: T.Material, geo: T.BufferGeometry) => {
    const key = parent.uuid + ":" + mat.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { parent, mat, geos: [] }));
    b.geos.push(geo);
  };
  const putter = (parent: T.Object3D): Put => (m, g) => put(parent, m, g);
  /** Local frame (front = +Z, floor = y 0) -> world. */
  const place = (P: Put, x: number, y: number, z: number, ry = 0): Put => (m, g) => {
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
  /** Hollow ring (scanner gantry) with its axis along X, centred at (x, y, z). */
  const gantry = (ri: number, ro: number, len: number, x: number, y: number, z: number, seg = 32) => {
    const outer = new THREE.CylinderGeometry(ro, ro, len, seg, 1, true);
    const inner = new THREE.CylinderGeometry(ri, ri, len, seg, 1, true);
    const face = (s: number) => new THREE.RingGeometry(ri, ro, seg, 1).rotateX(s * -Math.PI / 2).translate(0, (s * len) / 2, 0);
    return mergeInto(THREE, [outer, inner, face(1), face(-1)])
      .rotateZ(Math.PI / 2)
      .translate(x, y, z);
  };
  const uvScale = (g: T.BufferGeometry, su: number, sv: number) => {
    const uv = g.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
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
  const inst = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, items: Item[]) => {
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
  // People: an instanced capsule body (colour per instance) and a head.
  const bodyGeo = new THREE.CapsuleGeometry(0.016, 0.05, 3, 8).translate(0, 0.041, 0);
  const headGeo = new THREE.SphereGeometry(0.0135, 10, 8).translate(0, 0.096, 0);
  const people = (parent: T.Object3D, body: T.Material, head: T.Material, items: Item[]) => {
    inst(parent, bodyGeo, body, items);
    inst(parent, headGeo, head, items.map((it) => ({ p: it.p })));
  };

  // ------------------------------------------------------------ site plan
  const FLOOR = 0.012;
  const DADO = 0.1;
  const POD: Box = { x0: -1.6, x1: 2.1, z0: -1.3, z1: 1.2, h: 0.55 };
  const TWR = { x0: -1.0, x1: 1.3, z0: -1.05, z1: 0.35, top: 1.7 };
  const LAB: Box = { x0: -4.35, x1: -2.35, z0: -2.3, z1: 0.8, h: 0.62 };
  const ADM: Box = { x0: 2.75, x1: 4.45, z0: -2.95, z1: -0.55, h: 0.66 };
  const SPC: Box = { x0: 2.8, x1: 4.45, z0: 0.35, z1: 1.95, h: 0.46 };
  const PH: Box = { x0: -1.5, x1: -0.5, z0: 1.2, z1: 1.76, h: 0.27 };
  const ER = { x0: 0.9, x1: 2.05, z0: 1.2, z1: 2.0, h: 0.3 };
  const PX = 4.85,
    PZ = 3.35,
    PR = 0.45;
  const GX0 = -PX,
    GX1 = PX,
    GZ0 = -PZ,
    GZ1 = PZ;

  // ------------------------------------------------------------ textures
  const groundTex = canvasTexture(THREE, 1024, 708, (g, w, h) => {
    const X = (x: number) => ((x - GX0) / (GX1 - GX0)) * w;
    const Z = (z: number) => ((z - GZ0) / (GZ1 - GZ0)) * h;
    const sx = w / (GX1 - GX0);
    const rect = (x0: number, x1: number, z0: number, z1: number) => g.fillRect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sx);
    g.fillStyle = "#c9cbc5";
    g.fillRect(0, 0, w, h);
    const rnd = mulberry(7);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + rnd() * 0.04})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
    const lawn = (x0: number, x1: number, z0: number, z1: number) => {
      g.fillStyle = "#71a058";
      rect(x0, x1, z0, z1);
      g.fillStyle = "rgba(40,70,30,0.25)";
      for (let i = 0; i < 260; i++) g.fillRect(X(x0) + rnd() * (x1 - x0) * sx, Z(z0) + rnd() * (z1 - z0) * sx, 2, 2);
    };
    lawn(-4.85, 4.85, 3.05, 3.35);
    lawn(-4.75, -1.65, 1.0, 2.5);
    lawn(2.62, 4.75, -0.45, 0.25);
    lawn(-4.75, -4.45, -3.2, 0.9);
    lawn(-2.25, -1.7, -1.3, 0.85);
    // Garden paths through the west lawn.
    g.fillStyle = "#d8d3c6";
    rect(-3.5, -3.3, 1.0, 2.5);
    rect(-4.6, -1.7, 1.7, 1.85);
    const road = (x0: number, x1: number, z0: number, z1: number, dashed = true) => {
      g.fillStyle = "#40454a";
      rect(x0, x1, z0, z1);
      if (!dashed) return;
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
    road(-4.85, 4.85, 2.58, 3.02);
    road(2.22, 2.58, -3.25, 2.58);
    road(-2.3, 2.22, -1.62, -1.38);
    road(0.85, 2.22, 1.2, 2.58, false);
    // Car park behind the podium.
    g.fillStyle = "#565b60";
    rect(-1.65, 2.2, -3.15, -1.65);
    g.strokeStyle = "rgba(240,240,230,0.85)";
    g.lineWidth = 2;
    for (const [z0, z1] of [
      [-2.25, -1.7],
      [-3.1, -2.55],
    ]) {
      for (let i = 0; i <= 13; i++) {
        const x = -1.55 + i * 0.27;
        g.beginPath();
        g.moveTo(X(x), Z(z0));
        g.lineTo(X(x), Z(z1));
        g.stroke();
      }
    }
    // Entrance plaza (light pavers) and the drop-off zebra.
    g.fillStyle = "#e3ddd0";
    rect(-0.45, 0.85, 1.2, 2.58);
    g.fillStyle = "rgba(0,0,0,0.06)";
    for (let i = 0; i < 14; i++) rect(-0.45, 0.85, 1.2 + i * 0.1, 1.205 + i * 0.1);
    g.fillStyle = "rgba(250,250,245,0.9)";
    for (let i = 0; i < 6; i++) rect(-0.35 + i * 0.2, -0.25 + i * 0.2, 2.6, 3.0);
    // Ambulance bay: yellow hatching + "AMBULANCE" lettering.
    g.fillStyle = "rgba(226,179,58,0.9)";
    for (let i = 0; i < 6; i++) rect(1.0 + i * 0.18, 1.08 + i * 0.18, 2.05, 2.5);
    g.save();
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = `bold ${Math.round(0.11 * sx)}px sans-serif`;
    g.textAlign = "center";
    g.fillText("AMBULANCE", X(1.5), Z(2.42));
    g.restore();
    // Oxygen tank pad.
    g.fillStyle = "#b9bdb8";
    rect(-2.25, -1.7, -3.05, -2.4);
  });
  groundTex.anisotropy = 8;

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
    t.repeat.set(3, 3);
    return t;
  };

  /** Façade: base colour, window bands (fractions of height), accent stripe, plinth course. */
  const facade = (H: number, o: { base: string; bands: [number, number][]; accent: string; accentAt: number; pitch?: number; glass?: string; ribs?: boolean }) =>
    tex(256, Math.max(64, Math.round(256 * H)), (g, w, h) => {
      const Y = (f: number) => h - f * h;
      g.fillStyle = o.base;
      g.fillRect(0, 0, w, h);
      if (o.ribs) {
        for (let x = 0; x < w; x += 12) {
          g.fillStyle = "rgba(0,0,0,0.08)";
          g.fillRect(x, 0, 3, h);
        }
      }
      for (const [a, b] of o.bands) {
        const y0 = Y(b),
          y1 = Y(a);
        const gr = g.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, o.glass ?? "#2f4a60");
        gr.addColorStop(1, "#16222d");
        g.fillStyle = gr;
        g.fillRect(0, y0, w, y1 - y0);
        g.fillStyle = "rgba(190,220,240,0.18)";
        g.fillRect(0, y0 + 2, w, (y1 - y0) * 0.3);
        g.fillStyle = "#d4d9de";
        const p = o.pitch ?? 32;
        for (let x = 0; x < w; x += p) g.fillRect(x, y0, 3, y1 - y0);
        g.fillRect(0, y0 - 1.5, w, 3);
        g.fillRect(0, y1 - 1.5, w, 3);
      }
      g.fillStyle = o.accent;
      g.fillRect(0, Y(o.accentAt) - 4, w, 8);
      g.fillStyle = "#59616a";
      g.fillRect(0, Y(0.07), w, h - Y(0.07));
    });
  const podTex = facade(POD.h, { base: "#f1f2f0", bands: [[0.16, 0.42], [0.58, 0.84]], accent: "#16a3a0", accentAt: 0.5 });
  const towerTex = (() => {
    const H = TWR.top - POD.h;
    const floors = 6;
    const bands: [number, number][] = [];
    for (let i = 0; i < floors; i++) bands.push([(i + 0.28) / floors, (i + 0.82) / floors]);
    return facade(H, { base: "#f4f5f3", bands, accent: "#16a3a0", accentAt: 0.985, pitch: 24, glass: "#35566f" });
  })();
  const labTex = facade(LAB.h, { base: "#e2e7ec", bands: [[0.62, 0.78]], accent: "#2f6fd0", accentAt: 0.88, ribs: true, pitch: 64 });
  const admTex = facade(ADM.h, { base: "#d8dee3", bands: [[0.12, 0.45], [0.55, 0.88]], accent: "#5b6cc9", accentAt: 0.5, pitch: 20, glass: "#3b5f7c" });
  const spcTex = facade(SPC.h, { base: "#f3eee9", bands: [[0.18, 0.5]], accent: "#8a4fc0", accentAt: 0.66, pitch: 40 });
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
  /** Text sign (optionally with a plus / cross icon on the left). */
  const signTex = (W: number, H: number, bg: string, fg: string, text: string, icon?: { color: string; bg?: string }) =>
    canvasTexture(THREE, W, H, (g, w, h) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      let x0 = w / 2;
      if (icon) {
        const s = h * 0.7,
          cx = h * 0.6,
          cy = h / 2;
        if (icon.bg) {
          g.fillStyle = icon.bg;
          g.fillRect(cx - s / 2 - 4, cy - s / 2 - 4, s + 8, s + 8);
        }
        g.fillStyle = icon.color;
        g.fillRect(cx - s / 2, cy - s / 6, s, s / 3);
        g.fillRect(cx - s / 6, cy - s / 2, s / 3, s);
        x0 = h * 1.2 + (w - h * 1.2) / 2;
      }
      g.fillStyle = fg;
      g.font = `bold ${Math.round(h * 0.52)}px sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, x0, h / 2 + 2);
    });
  const phSignTex = signTex(512, 64, "#12804a", "#ffffff", "PHARMACY", { color: "#ffffff" });
  const erSignTex = signTex(512, 64, "#ffffff", "#c8262d", "EMERGENCY", { color: "#c8262d" });
  const hosSignTex = signTex(512, 96, "#ffffff", "#0f6e74", "HOSPITAL", { color: "#ffffff", bg: "#16a3a0" });
  const spcSignTex = signTex(512, 64, "#8a4fc0", "#ffffff", "SPECIALTY CARE", { color: "#ffffff" });
  const tpaSignTex = signTex(512, 64, "#1f4f9a", "#ffffff", "INSURANCE · CASHLESS", { color: "#ffffff" });
  const crossTex = canvasTexture(THREE, 64, 64, (g, w, h) => {
    g.fillStyle = "#0b3d22";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#3dff8a";
    g.fillRect(w * 0.36, h * 0.12, w * 0.28, h * 0.76);
    g.fillRect(w * 0.12, h * 0.36, w * 0.76, h * 0.28);
  });
  const heliTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = "#3a4249";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ffffff";
    g.lineWidth = 10;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#e2b33a";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#ffffff";
    g.fillRect(w * 0.33, h * 0.27, w * 0.08, h * 0.46);
    g.fillRect(w * 0.59, h * 0.27, w * 0.08, h * 0.46);
    g.fillRect(w * 0.33, h * 0.46, w * 0.34, h * 0.08);
  });
  const dashTex = canvasTexture(THREE, 1024, 256, (g, w, h) => {
    g.fillStyle = "#06121f";
    g.fillRect(0, 0, w, h);
    const rnd = mulberry(21);
    const cols = 6,
      rows = 2;
    const pw = w / cols,
      ph = h / rows;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const x = c * pw + 6,
          y = r * ph + 6,
          pW = pw - 12,
          pH = ph - 12;
        g.fillStyle = "#0e2236";
        g.fillRect(x, y, pW, pH);
        g.fillStyle = "#2a4a6a";
        g.fillRect(x, y, pW, 6);
        const kind = (c + r * 2) % 4;
        if (kind === 0) {
          // Line chart.
          g.strokeStyle = "#3fd0ff";
          g.lineWidth = 3;
          g.beginPath();
          let v = 0.5;
          for (let i = 0; i <= 16; i++) {
            v = Math.max(0.1, Math.min(0.9, v + (rnd() - 0.45) * 0.25));
            const px = x + (i / 16) * pW,
              py = y + 10 + (1 - v) * (pH - 16);
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
        } else if (kind === 1) {
          // Bed-occupancy bars.
          for (let i = 0; i < 9; i++) {
            const bh = (0.3 + rnd() * 0.65) * (pH - 18);
            g.fillStyle = i % 3 === 0 ? "#f5a623" : "#36d399";
            g.fillRect(x + 8 + i * (pW - 16) / 9, y + pH - 4 - bh, (pW - 16) / 9 - 5, bh);
          }
        } else if (kind === 2) {
          // KPI tiles.
          for (let i = 0; i < 4; i++) {
            g.fillStyle = ["#1f6feb", "#36d399", "#f5a623", "#e5484d"][i];
            g.fillRect(x + 8 + (i % 2) * (pW / 2), y + 14 + Math.floor(i / 2) * (pH / 2 - 4), pW / 2 - 16, pH / 2 - 20);
          }
        } else {
          // Ring gauge.
          g.strokeStyle = "#1c3a56";
          g.lineWidth = 12;
          g.beginPath();
          g.arc(x + pW / 2, y + pH / 2 + 4, pH * 0.32, 0, Math.PI * 2);
          g.stroke();
          g.strokeStyle = "#36d399";
          g.beginPath();
          g.arc(x + pW / 2, y + pH / 2 + 4, pH * 0.32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.5 + rnd() * 0.4));
          g.stroke();
        }
      }
  });
  const screenTex = canvasTexture(THREE, 64, 40, (g, w, h) => {
    g.fillStyle = "#08131f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3dff8a";
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x < w; x++) {
      const k = x % 22;
      const y = h * 0.55 - (k === 8 ? h * 0.35 : k === 9 ? -h * 0.15 : 0);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = "#3fd0ff";
    g.fillRect(4, h - 9, 18, 4);
  });

  // ------------------------------------------------------------ materials
  const baseM = {
    ground: L.add("base", new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })),
    plinth: L.add("base", std(0x212a33, 0.5, 0.45)),
    lip: L.add("base", std(0x2a3540, 0.3, 0.35, { emissive: 0x2fbfb0, emissiveIntensity: 0.35 })),
    podFloor: L.add("base", std(0xffffff, 0.05, 0.4, { map: floorTex("#dfe6e6", "rgba(0,0,0,0.06)") })),
    otFloor: L.add("base", std(0xffffff, 0.05, 0.35, { map: floorTex("#bfdcd8", "rgba(0,0,0,0.05)", 64) })),
    labFloor: L.add("base", std(0xffffff, 0.05, 0.45, { map: floorTex("#d9dfe8", "rgba(0,0,0,0.07)") })),
    admFloor: L.add("base", std(0xffffff, 0.05, 0.6, { map: floorTex("#d6d0c6", "rgba(0,0,0,0.06)", 48) })),
  };
  const ctxM = {
    canopy: L.add("trees", std(0xffffff, 0, 0.9)),
    trunk: L.add("trees", std(0x5a4632, 0, 0.9)),
    car: L.add("ctx", std(0xffffff, 0.5, 0.35)),
    glass: L.add("ctx", std(0x1b2631, 0.6, 0.15)),
    pole: L.add("ctx", std(0x6d757d, 0.7, 0.4)),
    lamp: L.add("ctx", std(0xffffff, 0, 0.4, { emissive: 0xfff1d6, emissiveIntensity: 1.2 })),
    tyre: L.add("ctx", std(0x17181a, 0.1, 0.85)),
    o2: L.add("ctx", std(0xf2f4f5, 0.35, 0.35)),
    steel: L.add("ctx", std(0x8b949c, 0.6, 0.4)),
    body: L.add("ctx", std(0xffffff, 0, 0.7)),
    skin: L.add("ctx", std(0x9a6b4c, 0, 0.6)),
  };
  // Layer-0 systems (pharmacy, specialty clinic, emergency bay, link bridge): stay readable when ghosted.
  const l0 = {
    white: L.add("l0", std(0xf3f4f2, 0.1, 0.5)),
    spcWall: L.add("l0", std(0xffffff, 0.1, 0.55, { map: spcTex })),
    roof: L.add("l0", std(0xffffff, 0.05, 0.85, { map: roofTex })),
    glass: L.add("l0", std(0x284256, 0.6, 0.12)),
    glassLight: L.add("l0", std(0x9fc6da, 0.3, 0.1, { opacity: 0.55 })),
    dark: L.add("l0", std(0x3a434c, 0.4, 0.5)),
    grey: L.add("l0", std(0x9aa4ad, 0.5, 0.45)),
    green: L.add("l0", std(0x12804a, 0.2, 0.45)),
    red: L.add("l0", std(0xc8262d, 0.3, 0.45)),
    blueLed: L.add("l0", std(0x001a33, 0, 0.4, { emissive: 0x3a8bff, emissiveIntensity: 1.4 })),
    tyre: L.add("l0", std(0x17181a, 0.1, 0.85)),
    shelf: L.add("l0", std(0xffffff, 0, 0.6, { emissive: 0xfff4e0, emissiveIntensity: 0.25 })),
    phSign: L.add("l0", std(0xffffff, 0, 0.5, { map: phSignTex, emissive: 0xffffff, emissiveMap: phSignTex, emissiveIntensity: 0.35 })),
    erSign: L.add("l0", std(0xffffff, 0, 0.5, { map: erSignTex, emissive: 0xffffff, emissiveMap: erSignTex, emissiveIntensity: 0.35 })),
    spcSign: L.add("l0", std(0xffffff, 0, 0.5, { map: spcSignTex, emissive: 0xffffff, emissiveMap: spcSignTex, emissiveIntensity: 0.3 })),
    cross: L.add("l0", std(0xffffff, 0, 0.5, { map: crossTex, emissive: 0xffffff, emissiveMap: crossTex, emissiveIntensity: 0.9 })),
    purple: L.add("l0", std(0x8a4fc0, 0.2, 0.45)),
  };
  /** Equipment palette for one layer bucket. */
  const eqMats = (bucket: string) => ({
    white: L.add(bucket, std(0xeef1f3, 0.12, 0.4)),
    shell: L.add(bucket, std(0xf2f4f6, 0.15, 0.32, { side: DS })),
    grey: L.add(bucket, std(0x8d97a1, 0.5, 0.42)),
    dark: L.add(bucket, std(0x2e343b, 0.45, 0.45)),
    ss: L.add(bucket, std(0xc9d0d6, 0.88, 0.24)),
    glass: L.add(bucket, std(0xcfe9f2, 0.2, 0.05, { opacity: 0.3, side: DS })),
    curtain: L.add(bucket, std(0x8fd3cf, 0, 0.8, { opacity: 0.7, side: DS })),
    screen: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1.0 })),
    glow: L.add(bucket, std(0x000000, 0, 0.4, { emissive: 0xfff6dc, emissiveIntensity: 1.6 })),
    greenLed: L.add(bucket, std(0x003311, 0, 0.5, { emissive: 0x2fe07a, emissiveIntensity: 1.1 })),
    blueLed: L.add(bucket, std(0x001a33, 0, 0.5, { emissive: 0x3fb0ff, emissiveIntensity: 1.1 })),
    sheet: L.add(bucket, std(0xf7f8fa, 0, 0.75)),
    blanket: L.add(bucket, std(0x5aa9c9, 0, 0.8)),
    drape: L.add(bucket, std(0x2e8a6e, 0, 0.8)),
    teal: L.add(bucket, std(0x16a3a0, 0.25, 0.4)),
    blue: L.add(bucket, std(0x2f6fd0, 0.3, 0.4)),
    navy: L.add(bucket, std(0x1f4f9a, 0.3, 0.45)),
    yellow: L.add(bucket, std(0xe2b33a, 0.3, 0.45)),
    red: L.add(bucket, std(0xc8262d, 0.3, 0.45)),
    black: L.add(bucket, std(0x1d2024, 0.4, 0.45)),
    wood: L.add(bucket, std(0xa77a4f, 0, 0.7)),
    tint: L.add(bucket, std(0xffffff, 0.1, 0.55)), // instance-coloured boxes
    body: L.add(bucket, std(0xffffff, 0, 0.7)),
    skin: L.add(bucket, std(0x9a6b4c, 0, 0.6)),
  });
  const w1 = eqMats("wardEq");
  const e2 = eqMats("labEq");
  const e3 = eqMats("admEq");
  const roofMats = (bucket: string) => ({
    mem: L.add(bucket, std(0xffffff, 0.05, 0.85, { map: roofTex })),
    unit: L.add(bucket, std(0xc9cfd4, 0.35, 0.45)),
    dark: L.add(bucket, std(0x3e464e, 0.4, 0.5)),
    coping: L.add(bucket, std(0xe2e6e9, 0.15, 0.5)),
    solar: L.add(bucket, std(0x1d2c4a, 0.6, 0.2)),
    ss: L.add(bucket, std(0xc9d0d6, 0.85, 0.25)),
  });

  // ------------------------------------------------------------ plinth + ground
  {
    const rr = new THREE.Shape();
    const x0 = -PX,
      x1 = PX,
      z0 = -PZ,
      z1 = PZ;
    rr.moveTo(x0 + PR, -z0);
    rr.lineTo(x1 - PR, -z0);
    rr.quadraticCurveTo(x1, -z0, x1, -z0 - PR);
    rr.lineTo(x1, -z1 + PR);
    rr.quadraticCurveTo(x1, -z1, x1 - PR, -z1);
    rr.lineTo(x0 + PR, -z1);
    rr.quadraticCurveTo(x0, -z1, x0, -z1 + PR);
    rr.lineTo(x0, -z0 - PR);
    rr.quadraticCurveTo(x0, -z0, x0 + PR, -z0);
    const gg = new THREE.ShapeGeometry(rr, 12).rotateX(-Math.PI / 2);
    const p = gg.getAttribute("position") as T.BufferAttribute;
    const uv = gg.getAttribute("uv") as T.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - GX0) / (GX1 - GX0), 1 - (p.getZ(i) - GZ0) / (GZ1 - GZ0));
    gg.translate(0, 0.004, 0);
    mesh(campusG, gg, baseM.ground);
    const depth = 0.26,
      bev = 0.035;
    const pl = new THREE.ExtrudeGeometry(rr, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 12 });
    pl.rotateX(-Math.PI / 2).translate(0, -depth - bev - 0.002, 0);
    mesh(campusG, pl, baseM.plinth);
    const lip = new THREE.ExtrudeGeometry(rr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.05, bevelSegments: 1, curveSegments: 12 });
    lip.rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    mesh(campusG, lip, baseM.lip);
    const floor = (b: { x0: number; x1: number; z0: number; z1: number }, m: T.Material) => {
      const g = new THREE.PlaneGeometry(b.x1 - b.x0, b.z1 - b.z0).rotateX(-Math.PI / 2);
      uvScale(g, (b.x1 - b.x0) / 3, (b.z1 - b.z0) / 3);
      g.translate((b.x0 + b.x1) / 2, FLOOR, (b.z0 + b.z1) / 2);
      put(campusG, m, g);
    };
    floor(POD, baseM.podFloor);
    floor({ x0: 0.24, x1: POD.x1, z0: POD.z0, z1: -0.25 }, baseM.otFloor);
    floor(LAB, baseM.labFloor);
    floor(ADM, baseM.admFloor);
  }

  // ============================================================ PEELING SHELLS
  type Peel = { b: Box; plane: T.Plane; roof: T.Group; cap: T.Mesh; bucket: string };
  const peels: Peel[] = [];
  const capMat = std(0x343c45, 0.3, 0.6);
  const makePeel = (b: Box, map: T.Texture, roofBucket: string) => {
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.h);
    const wm = std(0xffffff, 0.15, 0.55, { map, side: DS, clippingPlanes: [plane] });
    mesh(campusG, wallRing(b), wm);
    const roof = new THREE.Group();
    campusG.add(roof);
    const t = 0.03,
      hh = 0.02;
    const capG = mergeInto(THREE, [
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z0 - t / 2, b.z0 + t / 2),
      bb(b.x0 - t / 2, b.x1 + t / 2, -hh, 0, b.z1 - t / 2, b.z1 + t / 2),
      bb(b.x0 - t / 2, b.x0 + t / 2, -hh, 0, b.z0, b.z1),
      bb(b.x1 - t / 2, b.x1 + t / 2, -hh, 0, b.z0, b.z1),
    ]);
    const cap = mesh(campusG, capG, capMat);
    cap.position.y = b.h;
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
    return { P, R, plane, roof, roofBucket };
  };
  const clipMat = (color: number, plane: T.Plane, metal = 0.3, rough = 0.55, extra: T.MeshStandardMaterialParameters = {}) =>
    std(color, metal, rough, { clippingPlanes: [plane], side: DS, ...extra });

  // ---- Main hospital: podium + bed tower + helipad (tower and roof lift away at layer 1).
  {
    const { P, R, plane, roof, roofBucket } = makePeel(POD, podTex, "roofPod");
    const H = POD.h;
    // Bed tower.
    const tH = TWR.top - H;
    const twrWall = L.add(roofBucket, std(0xffffff, 0.15, 0.5, { map: towerTex }));
    put(roof, twrWall, wallRing({ x0: TWR.x0, x1: TWR.x1, z0: TWR.z0, z1: TWR.z1, h: tH }).translate(0, H, 0));
    P(R.mem, uvScale(bb(TWR.x0, TWR.x1, TWR.top - 0.02, TWR.top, TWR.z0, TWR.z1), 1.5, 1));
    const pt = 0.025;
    P(R.coping, bb(TWR.x0, TWR.x1, TWR.top, TWR.top + 0.035, TWR.z1 - pt, TWR.z1));
    P(R.coping, bb(TWR.x0, TWR.x1, TWR.top, TWR.top + 0.035, TWR.z0, TWR.z0 + pt));
    P(R.coping, bb(TWR.x0, TWR.x0 + pt, TWR.top, TWR.top + 0.035, TWR.z0, TWR.z1));
    P(R.coping, bb(TWR.x1 - pt, TWR.x1, TWR.top, TWR.top + 0.035, TWR.z0, TWR.z1));
    // Vertical fins on the tower's south face (sun shading).
    for (let i = 0; i <= 9; i++) P(R.coping, bb(TWR.x0 + 0.05 + i * 0.244, TWR.x0 + 0.065 + i * 0.244, H, TWR.top, TWR.z1, TWR.z1 + 0.025));
    // Lift core + stair tower on the east end.
    P(R.coping, bb(TWR.x1 - 0.45, TWR.x1 - 0.05, TWR.top, TWR.top + 0.12, TWR.z0 + 0.1, TWR.z0 + 0.4));
    // Helipad on a raised steel deck.
    const hx = 0.0,
      hz = -0.35,
      hr = 0.4;
    const heliM = L.add(roofBucket, std(0xffffff, 0.2, 0.7, { map: heliTex }));
    put(roof, heliM, new THREE.CircleGeometry(hr, 40).rotateX(-Math.PI / 2).translate(hx, TWR.top + 0.06, hz));
    P(R.dark, cyl(hr + 0.02, 0.02, hx, TWR.top + 0.038, hz, 40));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      P(R.ss, bx(0.02, 0.04, 0.02, hx + 0.3 * Math.cos(a), TWR.top, hz + 0.3 * Math.sin(a)));
    }
    const padLed = L.add(roofBucket, std(0x332000, 0, 0.5, { emissive: 0xffc23a, emissiveIntensity: 1.4 }));
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      put(roof, padLed, cyl(0.008, 0.01, hx + (hr + 0.005) * Math.cos(a), TWR.top + 0.058, hz + (hr + 0.005) * Math.sin(a), 6));
    }
    // Rooftop sign + windsock on the tower.
    const hosSign = L.add(roofBucket, std(0xffffff, 0, 0.5, { map: hosSignTex, emissive: 0xffffff, emissiveMap: hosSignTex, emissiveIntensity: 0.35 }));
    put(roof, hosSign, new THREE.PlaneGeometry(0.9, 0.17).translate(0.75, TWR.top - 0.13, TWR.z1 + 0.03));
    P(R.dark, bar(THREE, [TWR.x1 - 0.12, TWR.top, TWR.z1 - 0.12], [TWR.x1 - 0.12, TWR.top + 0.22, TWR.z1 - 0.12], 0.005, 6));
    const sock = L.add(roofBucket, std(0xe8742b, 0.1, 0.6));
    put(roof, sock, cyl(0.016, 0.07, 0, 0, 0, 10, 0.008).rotateZ(Math.PI / 2).translate(TWR.x1 - 0.085, TWR.top + 0.2, TWR.z1 - 0.12));
    // Podium roof: AHUs and solar.
    for (let i = 0; i < 3; i++) {
      const x = -1.3 + i * 0.25;
      P(R.unit, rb(0.18, 0.08, 0.3, 0.015, x, H, 0.8));
    }
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < 3; k++) P(R.solar, new THREE.BoxGeometry(0.36, 0.008, 0.16).rotateX(-0.3).translate(1.5 + r * 0.42, H + 0.05, 0.5 + k * 0.22));
    for (let i = 0; i < 2; i++) {
      P(R.unit, rb(0.3, 0.1, 0.22, 0.02, -1.25 + i * 0.4, H, -1.05));
      for (const dx of [-0.07, 0.07]) P(R.dark, cyl(0.045, 0.012, -1.25 + i * 0.4 + dx, H + 0.1, -1.05, 16));
    }
    // Main entrance: glazed doors + cantilever canopy (cut with the walls).
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    const whiteM = clipMat(0xeef1f3, plane, 0.1, 0.5);
    const tealM = clipMat(0x16a3a0, plane, 0.25, 0.4);
    put(campusG, glassM, bb(-0.3, 0.7, 0.0, 0.24, POD.z1 + 0.002, POD.z1 + 0.012));
    put(campusG, whiteM, bb(-0.4, 0.8, 0.25, 0.28, POD.z1, POD.z1 + 0.32));
    put(campusG, tealM, bb(-0.4, 0.8, 0.245, 0.285, POD.z1 + 0.31, POD.z1 + 0.325));
    for (const x of [-0.36, 0.76]) put(campusG, whiteM, cyl(0.012, 0.25, x, 0, POD.z1 + 0.29, 8));
    // Back doors to the service road.
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    for (const x of [0.6, 1.2]) put(campusG, doorM, bb(x - 0.12, x + 0.12, 0, 0.22, POD.z0 - 0.012, POD.z0 - 0.002));
    // Emergency doors behind the canopy.
    const erDoor = clipMat(0xc8262d, plane, 0.3, 0.45);
    put(campusG, erDoor, bb(1.2, 1.75, 0, 0.22, POD.z1 + 0.002, POD.z1 + 0.012));
  }

  // ---- Diagnostics wing: windowless imaging block with a clerestory, chillers on the roof.
  {
    const { P, R, plane } = makePeel(LAB, labTex, "roofLab");
    const H = LAB.h;
    for (let i = 0; i < 2; i++) {
      P(R.unit, rb(0.36, 0.12, 0.3, 0.02, -3.8 + i * 0.55, H, -1.6));
      for (const dx of [-0.08, 0.08]) P(R.dark, cyl(0.05, 0.012, -3.8 + i * 0.55 + dx, H + 0.12, -1.6, 16));
    }
    // MRI quench pipe + chiller block over the imaging suite.
    P(R.ss, cyl(0.022, 0.22, -3.9, H, 0.05, 12));
    P(R.ss, cylX(0.022, 0.12, -3.85, H + 0.22, 0.05, 10));
    P(R.unit, rb(0.5, 0.1, 0.24, 0.02, -2.95, H, 0.35));
    const doorM = clipMat(0x3a434c, plane, 0.4, 0.5);
    put(campusG, doorM, bb(-3.6, -3.2, 0, 0.25, LAB.z1 + 0.002, LAB.z1 + 0.012));
    const blueM = clipMat(0x2f6fd0, plane, 0.3, 0.4);
    put(campusG, blueM, bb(-4.0, -2.7, 0.44, 0.5, LAB.z1 + 0.002, LAB.z1 + 0.01));
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    put(campusG, glassM, bb(-3.62, -3.18, 0.02, 0.24, LAB.z1 + 0.012, LAB.z1 + 0.016));
  }

  // ---- Admin & payer block: glass offices, a dish on the roof for the data centre.
  {
    const { P, R, plane } = makePeel(ADM, admTex, "roofAdm");
    const H = ADM.h;
    P(R.unit, rb(0.5, 0.12, 0.3, 0.02, 3.3, H, -2.4));
    for (const dx of [-0.12, 0.12]) P(R.dark, cyl(0.05, 0.012, 3.3 + dx, H + 0.12, -2.4, 16));
    P(R.ss, cyl(0.012, 0.12, 4.05, H, -2.35, 8));
    P(R.ss, new THREE.SphereGeometry(0.09, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.6).rotateX(-0.6).translate(4.05, H + 0.16, -2.35));
    for (let k = 0; k < 4; k++) P(R.solar, new THREE.BoxGeometry(0.34, 0.008, 0.16).rotateX(-0.3).translate(3.2 + (k % 2) * 0.42, H + 0.05, -1.55 + Math.floor(k / 2) * 0.24));
    const glassM = clipMat(0x2b4458, plane, 0.6, 0.12);
    put(campusG, glassM, bb(ADM.x0 - 0.012, ADM.x0 - 0.002, 0, 0.26, -1.25, -0.85));
    const navyM = clipMat(0x5b6cc9, plane, 0.3, 0.4);
    put(campusG, navyM, bb(ADM.x0 - 0.2, ADM.x0, 0.27, 0.3, -1.3, -0.8));
  }

  // ============================================================ LAYER 0 - FRONT OF CAMPUS
  {
    const P = putter(campusG);
    // Pharmacy annex: glass shopfront, green fascia, a lit blade cross.
    P(l0.white, bb(PH.x0, PH.x0 + 0.03, 0, PH.h, PH.z0, PH.z1));
    P(l0.white, bb(PH.x1 - 0.03, PH.x1, 0, PH.h, PH.z0, PH.z1));
    P(l0.glass, bb(PH.x0 + 0.03, PH.x1 - 0.03, 0.0, 0.17, PH.z1 - 0.012, PH.z1));
    P(l0.dark, bb(PH.x0 + 0.03, PH.x1 - 0.03, 0.0, 0.02, PH.z1 - 0.014, PH.z1 + 0.002));
    for (let i = 1; i < 4; i++) P(l0.grey, bb(PH.x0 + i * 0.25 - 0.005, PH.x0 + i * 0.25 + 0.005, 0, 0.17, PH.z1 - 0.014, PH.z1 + 0.002));
    P(l0.roof, uvScale(bb(PH.x0 - 0.02, PH.x1 + 0.02, PH.h - 0.03, PH.h, PH.z0, PH.z1 + 0.04), 0.7, 0.4));
    put(campusG, l0.phSign, new THREE.PlaneGeometry(PH.x1 - PH.x0 - 0.06, 0.075).translate((PH.x0 + PH.x1) / 2, 0.21, PH.z1 + 0.042));
    P(l0.green, bb(PH.x0, PH.x1, 0.17, 0.172, PH.z1, PH.z1 + 0.04));
    // Shelves seen through the glass.
    for (let i = 0; i < 3; i++) P(l0.shelf, bb(PH.x0 + 0.08 + i * 0.3, PH.x0 + 0.3 + i * 0.3, 0, 0.13, PH.z0 + 0.05, PH.z0 + 0.1));
    P(l0.white, bb(PH.x0 + 0.2, PH.x1 - 0.2, 0, 0.06, PH.z0 + 0.25, PH.z0 + 0.32));
    // Blade sign.
    P(l0.dark, bb(PH.x1 - 0.005, PH.x1 + 0.09, 0.27, 0.278, PH.z1 - 0.01, PH.z1 + 0.0));
    P(l0.green, bb(PH.x1 + 0.03, PH.x1 + 0.1, 0.18, 0.27, PH.z1 - 0.012, PH.z1 - 0.004));
    for (const s of [1, -1]) put(campusG, l0.cross, new THREE.PlaneGeometry(0.066, 0.066).rotateY(s > 0 ? 0 : Math.PI).translate(PH.x1 + 0.065, 0.225, PH.z1 - 0.008 + s * 0.0045));

    // Emergency canopy with two ambulances.
    P(l0.white, bb(ER.x0, ER.x1, ER.h, ER.h + 0.035, ER.z0, ER.z1));
    P(l0.red, bb(ER.x0, ER.x1, ER.h + 0.005, ER.h + 0.03, ER.z1, ER.z1 + 0.006));
    put(campusG, l0.erSign, new THREE.PlaneGeometry(0.6, 0.07).translate((ER.x0 + ER.x1) / 2, ER.h + 0.075, ER.z1 - 0.02));
    P(l0.white, bb((ER.x0 + ER.x1) / 2 - 0.31, (ER.x0 + ER.x1) / 2 + 0.31, ER.h + 0.035, ER.h + 0.11, ER.z1 - 0.03, ER.z1 - 0.021));
    for (const x of [ER.x0 + 0.04, ER.x1 - 0.04]) for (const z of [ER.z0 + 0.25, ER.z1 - 0.04]) P(l0.grey, cyl(0.016, ER.h, x, 0, z, 10));
    const ambulance = (Q: Put) => {
      // Built along +X (cab at +X).
      Q(l0.white, rb(0.3, 0.16, 0.15, 0.02, -0.04, 0.03, 0));
      Q(l0.white, rb(0.1, 0.11, 0.145, 0.02, 0.15, 0.03, 0));
      Q(l0.glass, bb(0.19, 0.205, 0.09, 0.135, -0.065, 0.065));
      Q(l0.glass, bb(0.13, 0.19, 0.095, 0.135, -0.074, 0.074));
      Q(l0.red, bb(-0.19, 0.2, 0.09, 0.11, -0.077, 0.077));
      Q(l0.blueLed, bb(0.07, 0.13, 0.19, 0.205, -0.05, 0.05));
      for (const s of [1, -1]) {
        Q(l0.red, bb(-0.09, -0.07, 0.13, 0.17, s * 0.0755 - 0.001, s * 0.0755 + 0.001).translate(0, 0, 0));
        Q(l0.red, bb(-0.1, -0.06, 0.14, 0.16, s * 0.0755 - 0.001, s * 0.0755 + 0.001));
      }
      for (const x of [-0.12, 0.13]) for (const z of [-0.07, 0.07]) Q(l0.tyre, cylZ(0.03, 0.022, x, 0.03, z, 12));
    };
    ambulance(place(P, 1.22, 0, 1.6, -Math.PI / 2));
    ambulance(place(P, 1.74, 0, 1.65, -Math.PI / 2));

    // Specialty clinic: warm-white block, glass drum entrance, purple sign band.
    put(campusG, l0.spcWall, wallRing(SPC));
    P(l0.roof, uvScale(bb(SPC.x0, SPC.x1, SPC.h - 0.03, SPC.h, SPC.z0, SPC.z1), 1.1, 1.1));
    for (const [x0, x1, z0, z1] of [
      [SPC.x0, SPC.x1, SPC.z1 - 0.025, SPC.z1],
      [SPC.x0, SPC.x1, SPC.z0, SPC.z0 + 0.025],
      [SPC.x0, SPC.x0 + 0.025, SPC.z0, SPC.z1],
      [SPC.x1 - 0.025, SPC.x1, SPC.z0, SPC.z1],
    ])
      P(l0.white, bb(x0, x1, SPC.h, SPC.h + 0.035, z0, z1));
    P(l0.glass, cyl(0.26, SPC.h - 0.04, 3.05, 0, SPC.z1 - 0.08, 32));
    P(l0.white, cyl(0.28, 0.04, 3.05, SPC.h - 0.04, SPC.z1 - 0.08, 32));
    for (let k = 0; k < 10; k++) {
      const a = Math.PI * 0.05 + (k / 9) * Math.PI * 0.9;
      P(l0.white, bx(0.01, SPC.h - 0.04, 0.01, 3.05 + 0.262 * Math.cos(a), 0, SPC.z1 - 0.08 + 0.262 * Math.sin(a)));
    }
    put(campusG, l0.spcSign, new THREE.PlaneGeometry(1.0, 0.07).translate(3.85, 0.36, SPC.z1 + 0.003));
    P(l0.purple, bb(3.36, 4.38, 0.0, 0.2, SPC.z1 + 0.001, SPC.z1 + 0.004));
    P(l0.glass, bb(3.4, 4.34, 0.02, 0.19, SPC.z1 + 0.004, SPC.z1 + 0.008));
    P(l0.white, rb(0.34, 0.08, 0.24, 0.02, 4.05, SPC.h, 0.9));

    // Glazed link bridge: diagnostics wing <-> podium.
    const lz0 = -0.45,
      lz1 = -0.1;
    P(l0.white, bb(LAB.x1, POD.x0, 0.27, 0.3, lz0, lz1));
    P(l0.white, bb(LAB.x1, POD.x0, 0.46, 0.48, lz0, lz1));
    P(l0.glassLight, bb(LAB.x1, POD.x0, 0.3, 0.46, lz0 + 0.01, lz1 - 0.01));
    for (const x of [-2.15, -1.8]) P(l0.grey, cyl(0.016, 0.27, x, 0, (lz0 + lz1) / 2, 10));
  }

  // ============================================================ CONTEXT - trees, cars, lamps, O2 tank, people
  {
    const P = putter(campusG);
    const rnd = mulberry(11);
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 13; i++) trees.push([-4.4 + i * 0.73, 3.2, 0.8 + rnd() * 0.3]);
    for (const [x, z] of [
      [-4.3, 1.25],
      [-3.9, 2.25],
      [-2.9, 1.3],
      [-2.4, 2.2],
      [-1.95, 1.2],
      [-4.55, -0.2],
      [-4.6, -1.4],
      [-4.6, -2.6],
      [-1.95, -0.85],
      [-1.95, 0.6],
      [2.95, -0.1],
      [3.6, -0.15],
      [4.3, 0.0],
    ])
      trees.push([x, z, 0.9 + rnd() * 0.35]);
    const crown = new THREE.IcosahedronGeometry(0.14, 1).scale(1, 0.9, 1);
    const trunk = cyl(0.016, 0.14, 0, 0, 0, 6);
    const greens = [0x4f8a3e, 0x5b9446, 0x43793a, 0x679f4c];
    inst(campusG, crown, ctxM.canopy, trees.map(([x, z, s]) => ({ p: [x, 0.13 + 0.12 * s, z], s: [s, s, s], c: greens[Math.floor(rnd() * greens.length)] })));
    inst(campusG, trunk, ctxM.trunk, trees.map(([x, z, s]) => ({ p: [x, 0, z], s: [1, s, 1] })));
    // Cars in the back car park and on the boulevard.
    const cars: Item[] = [];
    const cc = [0xf4f6f8, 0x9aa3ac, 0x2b3137, 0xb3262d, 0x2f6fd0, 0xd9d9d2, 0x5c6b7a];
    for (const z of [-1.97, -2.83])
      for (let i = 0; i < 13; i++) if (rnd() < 0.72) cars.push({ p: [-1.415 + i * 0.27, 0.012, z], ry: Math.PI / 2, c: cc[Math.floor(rnd() * cc.length)] });
    cars.push({ p: [-3.2, 0.012, 2.69], c: 0xf4f6f8 }, { p: [-0.1, 0.012, 2.9], ry: Math.PI, c: 0x2f6fd0 }, { p: [3.4, 0.012, 2.69], c: 0x9aa3ac });
    const carBody = rb(0.21, 0.05, 0.1, 0.02, 0, 0.02, 0);
    const carCab = rb(0.11, 0.045, 0.088, 0.02, -0.01, 0.06, 0);
    inst(campusG, carBody, ctxM.car, cars);
    inst(campusG, carCab, ctxM.glass, cars);
    const wheel = cylZ(0.022, 0.104, 0, 0.022, 0, 10);
    inst(campusG, wheel, ctxM.tyre, cars.flatMap((c) => [-0.065, 0.065].map((dx) => ({ p: [c.p[0] + dx * Math.cos(c.ry ?? 0), 0, c.p[2] - dx * Math.sin(c.ry ?? 0)] as Vec3, ry: c.ry }))));
    // A third ambulance arriving on the boulevard.
    {
      const Q = place(P, 0.3, 0, 2.7);
      Q(ctxM.o2, rb(0.3, 0.16, 0.15, 0.02, -0.04, 0.03, 0));
      Q(ctxM.o2, rb(0.1, 0.11, 0.145, 0.02, 0.15, 0.03, 0));
      Q(ctxM.glass, bb(0.13, 0.205, 0.095, 0.135, -0.074, 0.074));
      Q(l0.red, bb(-0.19, 0.2, 0.09, 0.11, -0.077, 0.077));
      Q(l0.blueLed, bb(0.07, 0.13, 0.19, 0.205, -0.05, 0.05));
      for (const x of [-0.12, 0.13]) for (const z of [-0.07, 0.07]) Q(ctxM.tyre, cylZ(0.03, 0.022, x, 0.03, z, 12));
    }
    // Street lamps along the boulevard.
    for (let i = 0; i < 7; i++) {
      const x = -4.2 + i * 1.4;
      P(ctxM.pole, cyl(0.008, 0.36, x, 0, 2.52, 6));
      P(ctxM.pole, bx(0.012, 0.008, 0.08, x, 0.355, 2.56));
      P(ctxM.lamp, bx(0.03, 0.008, 0.04, x, 0.348, 2.59));
    }
    // Liquid medical oxygen tank (VIE) with vaporiser fins, fenced.
    {
      const x = -1.95,
        z = -2.75;
      P(ctxM.o2, cyl(0.09, 0.42, x, 0.06, z, 24));
      P(ctxM.o2, new THREE.SphereGeometry(0.09, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.48, z));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        P(ctxM.steel, bar(THREE, [x + 0.08 * Math.cos(a), 0, z + 0.08 * Math.sin(a)], [x + 0.06 * Math.cos(a), 0.1, z + 0.06 * Math.sin(a)], 0.008, 6));
      }
      for (let k = 0; k < 4; k++) P(ctxM.steel, bx(0.012, 0.28, 0.06, x + 0.16, 0, z - 0.12 + k * 0.08));
      P(ctxM.steel, bb(x - 0.27, x + 0.27, 0, 0.1, -2.42, -2.418));
      P(ctxM.steel, bb(x - 0.27, x + 0.27, 0, 0.1, -3.05, -3.048));
      P(ctxM.steel, bb(x - 0.27, x - 0.268, 0, 0.1, -3.05, -2.42));
      P(ctxM.steel, bb(x + 0.268, x + 0.27, 0, 0.1, -3.05, -2.42));
    }
    // People at the entrance, the pharmacy and the clinic.
    const cols = [0x2f6fd0, 0xd9742b, 0x8a4fc0, 0xe2b33a, 0x3a434c, 0xc8262d, 0x16a3a0];
    const ppl: Item[] = [];
    for (const [x, z] of [
      [-0.2, 1.65],
      [0.0, 1.85],
      [0.35, 1.6],
      [0.5, 2.1],
      [-0.85, 1.95],
      [-1.2, 2.05],
      [-0.1, 2.35],
      [3.3, 2.15],
      [3.75, 2.25],
      [2.75, 2.4],
      [-3.4, 1.4],
      [-3.4, 2.05],
    ])
      ppl.push({ p: [x, 0.004, z], c: cols[Math.floor(rnd() * cols.length)] });
    people(campusG, ctxM.body, ctxM.skin, ppl);
  }

  // ============================================================ LAYER 1 - WARDS & THEATRES (podium)
  {
    const P = putter(wardG);
    const M = w1;
    const Y0 = FLOOR;
    /** Hospital bed in its local frame: head at z=0, foot toward +z. */
    const bed = (Q: Put, occupied: boolean, iv = true, monitor = false) => {
      Q(M.grey, bx(0.1, 0.035, 0.2, 0, 0.005, 0.12));
      Q(M.white, rb(0.13, 0.03, 0.24, 0.008, 0, 0.04, 0.12));
      Q(M.sheet, rb(0.12, 0.02, 0.22, 0.008, 0, 0.07, 0.122));
      Q(M.grey, bx(0.13, 0.085, 0.012, 0, 0.03, 0.006));
      Q(M.grey, bx(0.13, 0.05, 0.01, 0, 0.04, 0.24));
      Q(M.white, rb(0.08, 0.014, 0.04, 0.006, 0, 0.09, 0.035));
      if (occupied) {
        Q(M.blanket, rb(0.122, 0.022, 0.14, 0.008, 0, 0.088, 0.16));
        Q(M.skin, new THREE.SphereGeometry(0.018, 10, 8).translate(0, 0.112, 0.04));
      }
      if (iv) {
        Q(M.ss, bar(THREE, [0.085, 0, 0.02], [0.085, 0.22, 0.02], 0.004, 6));
        Q(M.glass, rb(0.022, 0.034, 0.01, 0.004, 0.085, 0.17, 0.02));
      }
      if (monitor) {
        Q(M.ss, bar(THREE, [-0.085, 0, 0.015], [-0.085, 0.17, 0.015], 0.004, 6));
        Q(M.dark, bx(0.055, 0.04, 0.012, -0.085, 0.165, 0.02));
        Q(M.screen, new THREE.PlaneGeometry(0.046, 0.032).translate(-0.085, 0.185, 0.0265));
      }
    };
    // ---- General wards (west half): two rows of beds with privacy curtains + a nurse station.
    for (let i = 0; i < 5; i++) {
      const x = -1.42 + i * 0.3;
      bed(place(P, x, Y0, POD.z0 + 0.02), i !== 2, true, i % 2 === 0);
      bed(place(P, x, Y0, POD.z1 - 0.02, Math.PI), i !== 4, true, i % 2 === 1);
    }
    for (let i = 0; i <= 5; i++) {
      const x = -1.57 + i * 0.3;
      for (const [z0, z1] of [
        [POD.z0 + 0.02, POD.z0 + 0.3],
        [POD.z1 - 0.3, POD.z1 - 0.02],
      ]) {
        P(M.curtain, bb(x - 0.002, x + 0.002, Y0 + 0.02, Y0 + 0.22, z0, z1));
        P(M.ss, bb(x - 0.004, x + 0.004, Y0 + 0.22, Y0 + 0.228, z0, z1));
      }
    }
    // Nurse station: curved counter with screens.
    {
      const cx = -0.8,
        cz = 0.0;
      P(M.white, new THREE.CylinderGeometry(0.2, 0.2, 0.09, 24, 1, true, -Math.PI * 0.4, Math.PI * 0.8).translate(cx, Y0 + 0.045, cz));
      P(M.teal, new THREE.CylinderGeometry(0.215, 0.215, 0.012, 24, 1, false, -Math.PI * 0.4, Math.PI * 0.8).translate(cx, Y0 + 0.09, cz));
      for (const a of [-0.25, 0.25]) {
        const px = cx + 0.12 * Math.sin(a * Math.PI),
          pz = cz + 0.12 * Math.cos(a * Math.PI);
        P(M.dark, bx(0.05, 0.035, 0.008, px, Y0 + 0.096, pz).rotateY(0));
      }
      P(M.navy, rb(0.18, 0.09, 0.08, 0.01, cx, Y0, cz - 0.12));
    }
    // Ward / theatre partition (with a door gap).
    P(M.white, bb(0.2, 0.24, Y0, Y0 + 0.24, POD.z0, -0.18));
    P(M.white, bb(0.2, 0.24, Y0, Y0 + 0.24, 0.18, POD.z1));
    // ---- Two operating theatres (north-east), glass fronts on the corridor.
    const OTZ0 = POD.z0,
      OTZ1 = -0.25;
    P(M.white, bb(1.18, 1.22, Y0, Y0 + 0.24, OTZ0, OTZ1));
    P(M.glass, bb(0.24, POD.x1, Y0, Y0 + 0.24, OTZ1 - 0.004, OTZ1 + 0.004));
    P(M.white, bb(0.24, POD.x1, Y0 + 0.24, Y0 + 0.255, OTZ1 - 0.012, OTZ1 + 0.012));
    for (const x of [0.24, 1.2, POD.x1 - 0.02]) P(M.white, bb(x - 0.01, x + 0.01, Y0, Y0 + 0.24, OTZ1 - 0.012, OTZ1 + 0.012));
    const surgeons: Item[] = [];
    const ot = (cx: number, cArm: boolean) => {
      const cz = -0.8;
      // Operating table on a pedestal, patient under a green drape.
      P(M.grey, cyl(0.03, 0.08, cx, Y0, cz, 12));
      P(M.ss, bx(0.24, 0.012, 0.085, cx, Y0 + 0.08, cz));
      P(M.drape, rb(0.22, 0.02, 0.1, 0.008, cx + 0.01, Y0 + 0.092, cz));
      P(M.skin, new THREE.SphereGeometry(0.016, 10, 8).translate(cx - 0.11, Y0 + 0.11, cz));
      // Mobile twin-dome surgical light: wheeled base, tall pole, arm, two domes.
      const lx = cx + 0.2,
        lz = cz - 0.17;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        P(M.grey, bar(THREE, [lx, Y0 + 0.01, lz], [lx + 0.05 * Math.cos(a), Y0 + 0.005, lz + 0.05 * Math.sin(a)], 0.005, 6));
      }
      P(M.ss, bar(THREE, [lx, Y0, lz], [lx, Y0 + 0.36, lz], 0.007, 8));
      P(M.ss, bar(THREE, [lx, Y0 + 0.36, lz], [cx - 0.05, Y0 + 0.36, cz + 0.02], 0.006, 8));
      P(M.ss, bar(THREE, [lx, Y0 + 0.34, lz], [cx + 0.08, Y0 + 0.32, cz - 0.02], 0.006, 8));
      for (const [dx, dy, dz] of [
        [-0.05, 0.33, 0.02],
        [0.08, 0.29, -0.02],
      ]) {
        P(M.shell, new THREE.SphereGeometry(0.055, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.4).translate(cx + dx, Y0 + dy, cz + dz));
        P(M.glow, new THREE.CircleGeometry(0.045, 20).rotateX(Math.PI / 2).translate(cx + dx, Y0 + dy + 0.017, cz + dz));
      }
      // Anaesthesia workstation at the head end + gas cylinders.
      const ax = cx - 0.22;
      P(M.white, rb(0.09, 0.15, 0.08, 0.01, ax, Y0, cz + 0.12));
      P(M.dark, bx(0.07, 0.05, 0.008, ax + 0.01, Y0 + 0.15, cz + 0.12).rotateY(0));
      P(M.screen, new THREE.PlaneGeometry(0.06, 0.04).rotateY(Math.PI / 2).translate(ax + 0.046, Y0 + 0.12, cz + 0.12));
      P(M.blue, cyl(0.012, 0.11, ax - 0.03, Y0, cz + 0.17, 10));
      P(M.black, cyl(0.012, 0.11, ax - 0.005, Y0, cz + 0.175, 10));
      // Patient monitor on a stand + instrument trolley.
      P(M.ss, bar(THREE, [cx - 0.16, Y0, cz - 0.15], [cx - 0.16, Y0 + 0.2, cz - 0.15], 0.005, 6));
      P(M.dark, bx(0.07, 0.05, 0.012, cx - 0.16, Y0 + 0.19, cz - 0.15));
      P(M.screen, new THREE.PlaneGeometry(0.06, 0.04).translate(cx - 0.16, Y0 + 0.215, cz - 0.143));
      P(M.ss, bx(0.12, 0.008, 0.06, cx + 0.12, Y0 + 0.1, cz + 0.17));
      P(M.ss, bx(0.12, 0.006, 0.06, cx + 0.12, Y0 + 0.04, cz + 0.17));
      for (const dx of [-0.055, 0.055]) for (const dz of [-0.025, 0.025]) P(M.ss, bx(0.006, 0.1, 0.006, cx + 0.12 + dx, Y0, cz + 0.17 + dz));
      surgeons.push(
        { p: [cx - 0.02, Y0, cz + 0.1], c: 0x2e8a6e },
        { p: [cx + 0.07, Y0, cz - 0.1], c: 0x2e8a6e },
        { p: [cx - 0.08, Y0, cz - 0.1], c: 0x2e8a6e },
        { p: [cx - 0.26, Y0, cz], c: 0x3a7bc8 }
      );
      if (cArm) {
        // Mobile C-arm X-ray beside the table.
        const ccx = cx + 0.04,
          ccy = Y0 + 0.14,
          ccz = cz + 0.0;
        P(M.white, new THREE.TorusGeometry(0.1, 0.014, 8, 28, Math.PI * 1.25).rotateZ(Math.PI * 0.375).rotateY(Math.PI / 2).translate(ccx, ccy, ccz));
        P(M.white, rb(0.1, 0.1, 0.08, 0.012, ccx, Y0, ccz + 0.22));
        P(M.grey, bx(0.02, 0.05, 0.1, ccx, Y0 + 0.08, ccz + 0.15));
        P(M.dark, cylZ(0.03, 0.03, ccx, ccy + 0.1, ccz, 14));
      }
    };
    ot(0.66, false);
    ot(1.62, true);
    // Scrub sinks in the corridor.
    for (const x of [0.5, 1.45]) {
      P(M.ss, bx(0.14, 0.09, 0.05, x, Y0, OTZ1 + 0.03));
      P(M.ss, bar(THREE, [x, Y0 + 0.09, OTZ1 + 0.02], [x, Y0 + 0.13, OTZ1 + 0.04], 0.003, 6));
    }
    // ---- ICU (south-east): three beds with ventilators.
    P(M.white, bb(1.28, 1.31, Y0, Y0 + 0.22, 0.02, POD.z1));
    P(M.glass, bb(0.24, 1.28, Y0, Y0 + 0.22, 0.016, 0.024));
    for (let i = 0; i < 3; i++) {
      const x = 0.42 + i * 0.32;
      bed(place(P, x, Y0, POD.z1 - 0.02, Math.PI), true, true, true);
      const vx = x + 0.12,
        vz = POD.z1 - 0.12;
      P(M.white, rb(0.07, 0.11, 0.06, 0.01, vx, Y0 + 0.015, vz));
      P(M.screen, new THREE.PlaneGeometry(0.05, 0.035).translate(vx, Y0 + 0.1, vz - 0.031).rotateY(0));
      for (const dx of [-0.025, 0.025]) P(M.dark, cyl(0.008, 0.015, vx + dx, Y0, vz, 8));
      if (i < 2) P(M.curtain, bb(x + 0.155, x + 0.159, Y0 + 0.02, Y0 + 0.22, POD.z1 - 0.3, POD.z1 - 0.02));
    }
    // ---- Central supply store (east): shelving of disposables, supply carts,
    //      oxygen cylinder bank and colour-coded biomedical waste bins.
    const boxes: Item[] = [];
    const boxCols = [0xf4f6f8, 0x5aa9c9, 0x9fd8c8, 0xf4f6f8, 0x2f6fd0, 0xe7d9b8];
    const rnd = mulberry(31);
    for (const sx of [1.47, 1.77]) {
      for (const z of [0.15, 0.55, 0.95]) for (const dx of [-0.05, 0.05]) P(M.ss, bb(sx + dx - 0.004, sx + dx + 0.004, Y0, Y0 + 0.2, z - 0.004, z + 0.004));
      for (let lv = 0; lv < 3; lv++) {
        P(M.grey, bb(sx - 0.055, sx + 0.055, Y0 + 0.02 + lv * 0.07, Y0 + 0.026 + lv * 0.07, 0.15, 0.95));
        for (let k = 0; k < 7; k++) {
          if (rnd() < 0.15) continue;
          boxes.push({ p: [sx, Y0 + 0.026 + lv * 0.07, 0.2 + k * 0.11], c: boxCols[Math.floor(rnd() * boxCols.length)], s: [1, 0.7 + rnd() * 0.5, 1] });
        }
      }
    }
    inst(wardG, bx(0.085, 0.045, 0.09, 0, 0, 0), M.tint, boxes);
    // Supply carts with coloured bins.
    const cart = (Q: Put) => {
      Q(M.ss, bx(0.14, 0.006, 0.08, 0, 0.03, 0));
      Q(M.ss, bx(0.14, 0.006, 0.08, 0, 0.12, 0));
      for (const dx of [-0.065, 0.065]) for (const dz of [-0.035, 0.035]) Q(M.ss, bx(0.006, 0.13, 0.006, dx, 0.01, dz));
      for (const dx of [-0.065, 0.065]) for (const dz of [-0.035, 0.035]) Q(M.dark, cyl(0.009, 0.012, dx, 0, dz, 8));
      Q(M.blue, bx(0.06, 0.03, 0.07, -0.033, 0.126, 0));
      Q(M.teal, bx(0.06, 0.03, 0.07, 0.033, 0.126, 0));
      Q(M.yellow, bx(0.06, 0.03, 0.07, -0.033, 0.036, 0));
      Q(M.white, bx(0.06, 0.03, 0.07, 0.033, 0.036, 0));
      Q(M.ss, bar(THREE, [0.075, 0.15, -0.035], [0.075, 0.15, 0.035], 0.004, 6));
    };
    cart(place(P, 1.62, Y0, 0.55, Math.PI / 2));
    cart(place(P, 1.0, Y0, -0.1));
    cart(place(P, 0.55, Y0, -0.12));
    // Medical oxygen cylinder bank (black body, white shoulder) on the east wall.
    for (let k = 0; k < 7; k++) {
      const z = 0.2 + k * 0.1;
      P(M.black, cyl(0.022, 0.17, 2.0, Y0, z, 12));
      P(M.white, cyl(0.022, 0.03, 2.0, Y0 + 0.17, z, 12, 0.012));
    }
    P(M.ss, bb(1.96, 2.06, Y0 + 0.14, Y0 + 0.15, 0.15, 0.85));
    // Biomedical waste segregation bins (yellow / red / blue / black).
    [M.yellow, M.red, M.blue, M.black].forEach((m, k) => P(m, cyl(0.025, 0.07, 1.42 + k * 0.065, Y0, 1.08, 12, 0.028)));
    // Staff: nurses in blue, a doctor in white, patients walking.
    people(
      wardG,
      M.body,
      M.skin,
      [
        { p: [-0.8, Y0, -0.1], c: 0x3a7bc8 },
        { p: [-0.62, Y0, 0.12], c: 0x3a7bc8 },
        { p: [-1.1, Y0, 0.3], c: 0xf4f6f8 },
        { p: [-0.3, Y0, -0.4], c: 0xd9742b },
        { p: [0.7, Y0, 0.6], c: 0x3a7bc8 },
        { p: [1.05, Y0, 0.15], c: 0xf4f6f8 },
        { p: [1.62, Y0, 0.3], c: 0x3a7bc8 },
        ...surgeons,
      ]
    );
  }

  // ============================================================ LAYER 2 - LABS & IMAGING (west wing)
  {
    const P = putter(labG);
    const M = e2;
    const Y0 = FLOOR;
    // Partition between the lab (back) and the imaging suite (front).
    P(M.white, bb(LAB.x0, LAB.x1, Y0, Y0 + 0.24, -0.72, -0.68));
    // ---- Pathology lab: automated analyser line on a sample-track conveyor.
    const ax = [-4.05, -3.65, -3.25];
    for (const x of ax) {
      P(M.white, rb(0.32, 0.19, 0.2, 0.015, x, Y0, -1.95));
      P(M.navy, bx(0.32, 0.03, 0.202, x, Y0 + 0.13, -1.95));
      P(M.glass, bx(0.26, 0.05, 0.004, x, Y0 + 0.06, -1.848));
      P(M.screen, new THREE.PlaneGeometry(0.07, 0.045).rotateX(-0.5).translate(x + 0.1, Y0 + 0.21, -1.86));
      P(M.dark, bx(0.08, 0.05, 0.012, x + 0.1, Y0 + 0.185, -1.87).rotateX(0));
    }
    // Sample track running past the analysers + carriers.
    P(M.grey, bb(-4.25, -2.75, Y0 + 0.06, Y0 + 0.075, -1.78, -1.72));
    P(M.dark, bb(-4.25, -2.75, Y0, Y0 + 0.06, -1.77, -1.73));
    const capCols = [0x7a4fc0, 0xc8262d, 0xe2b33a, 0x2f6fd0, 0x8d97a1, 0x36a65a];
    const rnd = mulberry(41);
    const caps: Item[] = [];
    for (let k = 0; k < 18; k++) caps.push({ p: [-4.2 + k * 0.08, Y0 + 0.075, -1.75], c: capCols[Math.floor(rnd() * capCols.length)] });
    // Island bench with tube racks, centrifuges and microscopes.
    P(M.white, rb(1.1, 0.012, 0.22, 0.004, -3.4, Y0 + 0.11, -1.25));
    P(M.grey, bb(-3.93, -2.87, Y0, Y0 + 0.11, -1.33, -1.17));
    for (let r = 0; r < 4; r++) {
      const rx = -3.85 + r * 0.14;
      P(M.white, bx(0.1, 0.012, 0.05, rx, Y0 + 0.122, -1.3));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) caps.push({ p: [rx - 0.04 + i * 0.02, Y0 + 0.134, -1.31 + j * 0.02], c: capCols[(r + i + j) % capCols.length] });
    }
    inst(labG, cyl(0.0065, 0.035, 0, 0, 0, 8), M.tint, caps);
    for (const x of [-3.15, -3.0]) {
      P(M.white, cyl(0.04, 0.05, x, Y0 + 0.122, -1.22, 16));
      P(M.grey, cyl(0.036, 0.008, x, Y0 + 0.172, -1.22, 16));
    }
    {
      const mx = -3.35,
        mz = -1.18;
      P(M.dark, bx(0.04, 0.01, 0.05, mx, Y0 + 0.122, mz));
      P(M.dark, bar(THREE, [mx, Y0 + 0.13, mz - 0.02], [mx, Y0 + 0.2, mz - 0.01], 0.006, 6));
      P(M.white, bar(THREE, [mx, Y0 + 0.2, mz - 0.005], [mx, Y0 + 0.16, mz + 0.02], 0.008, 8));
    }
    // Wall bench with fridges and a biosafety cabinet on the west side.
    P(M.white, rb(0.12, 0.26, 0.24, 0.01, -4.25, Y0, -1.2));
    P(M.glass, bx(0.004, 0.22, 0.2, -4.188, Y0 + 0.02, -1.2));
    P(M.blueLed, bx(0.003, 0.2, 0.004, -4.186, Y0 + 0.03, -1.3));
    P(M.white, rb(0.12, 0.26, 0.24, 0.01, -4.25, Y0, -0.92));
    P(M.glass, bx(0.004, 0.22, 0.2, -4.188, Y0 + 0.02, -0.92));
    P(M.white, rb(0.3, 0.22, 0.14, 0.012, -2.62, Y0, -2.15));
    P(M.glass, bx(0.26, 0.08, 0.004, -2.62, Y0 + 0.11, -2.078));
    P(M.dark, bx(0.26, 0.012, 0.13, -2.62, Y0 + 0.1, -2.15));
    // Sample reception: cold-chain boxes from collection centres.
    for (let k = 0; k < 3; k++) P(M.blue, rb(0.07, 0.05, 0.05, 0.01, -2.62 + (k % 2) * 0.09, Y0 + (k > 1 ? 0.05 : 0), -1.0));
    P(M.white, rb(0.3, 0.09, 0.1, 0.01, -2.6, Y0, -1.25));
    // ---- Imaging suite: MRI room, control room, CT room, digital X-ray.
    P(M.white, bb(-3.42, -3.38, Y0, Y0 + 0.24, -0.68, LAB.z1));
    P(M.white, bb(-2.92, -2.88, Y0, Y0 + 0.24, -0.68, 0.25));
    P(M.glass, bb(-3.38, -2.92, Y0 + 0.1, Y0 + 0.24, -0.1, -0.096));
    // MRI: big gantry with a bore, blue accent ring, back cover and patient table.
    {
      const mx = -3.95,
        my = Y0 + 0.2,
        mz = 0.05;
      P(M.shell, gantry(0.08, 0.18, 0.28, mx, my, mz));
      P(M.white, rb(0.26, 0.04, 0.34, 0.01, mx, Y0, mz));
      P(M.blue, new THREE.TorusGeometry(0.13, 0.008, 6, 40).rotateY(Math.PI / 2).translate(mx + 0.142, my, mz));
      P(M.white, rb(0.1, 0.3, 0.3, 0.02, mx - 0.18, Y0, mz));
      P(M.white, bx(0.42, 0.016, 0.08, mx + 0.25, Y0 + 0.125, mz));
      P(M.grey, bx(0.12, 0.125, 0.06, mx + 0.32, Y0, mz));
      P(M.sheet, rb(0.2, 0.018, 0.06, 0.006, mx + 0.27, Y0 + 0.141, mz));
      P(M.skin, new THREE.SphereGeometry(0.016, 10, 8).translate(mx + 0.17, Y0 + 0.155, mz));
    }
    // Control room: desks with screens looking through the glass.
    for (const z of [-0.45, -0.25]) {
      P(M.white, rb(0.3, 0.012, 0.1, 0.004, -3.15, Y0 + 0.09, z));
      P(M.grey, bb(-3.29, -3.27, Y0, Y0 + 0.09, z - 0.04, z + 0.04));
      P(M.grey, bb(-3.03, -3.01, Y0, Y0 + 0.09, z - 0.04, z + 0.04));
      for (const dx of [-0.07, 0.07]) {
        P(M.dark, bx(0.08, 0.05, 0.008, -3.15 + dx, Y0 + 0.11, z + 0.03));
        P(M.screen, new THREE.PlaneGeometry(0.072, 0.042).rotateY(Math.PI).translate(-3.15 + dx, Y0 + 0.136, z + 0.025));
      }
    }
    // CT: slim gantry + table.
    {
      const cx = -2.62,
        cy = Y0 + 0.16,
        cz = 0.38;
      P(M.shell, gantry(0.07, 0.15, 0.1, cx, cy, cz));
      P(M.white, rb(0.12, 0.03, 0.3, 0.01, cx, Y0, cz));
      P(M.teal, new THREE.TorusGeometry(0.11, 0.006, 6, 36).rotateY(Math.PI / 2).translate(cx - 0.052, cy, cz));
      P(M.white, bx(0.36, 0.014, 0.07, cx - 0.2, Y0 + 0.11, cz));
      P(M.grey, bx(0.1, 0.11, 0.05, cx - 0.26, Y0, cz));
    }
    // Digital X-ray: wall stand with detector + ceiling-free tube column.
    {
      P(M.grey, bb(-3.3, -3.27, Y0, Y0 + 0.26, 0.6, 0.63));
      P(M.white, bx(0.1, 0.12, 0.02, -3.2, Y0 + 0.1, 0.62));
      P(M.grey, bb(-3.05, -3.02, Y0, Y0 + 0.3, 0.6, 0.63));
      P(M.white, rb(0.08, 0.06, 0.06, 0.01, -3.1, Y0 + 0.18, 0.62));
      // Radiation warning: yellow plate at the door.
      P(M.yellow, bx(0.04, 0.04, 0.004, -3.6, Y0 + 0.17, -0.664));
    }
    people(
      labG,
      M.body,
      M.skin,
      [
        { p: [-3.85, Y0, -1.55], c: 0xf4f6f8 },
        { p: [-3.3, Y0, -1.45], c: 0xf4f6f8 },
        { p: [-2.85, Y0, -1.05], c: 0xf4f6f8 },
        { p: [-4.1, Y0, -1.05], c: 0x3a7bc8 },
        { p: [-3.15, Y0, -0.35], c: 0x2e8a6e },
        { p: [-3.65, Y0, 0.4], c: 0x3a7bc8 },
        { p: [-2.45, Y0, 0.05], c: 0xf4f6f8 },
      ]
    );
  }

  // ============================================================ LAYER 3 - PAYERS & PLATFORMS (admin block)
  {
    const P = putter(admG);
    const M = e3;
    const Y0 = FLOOR;
    P(M.white, bb(ADM.x0, ADM.x1, Y0, Y0 + 0.22, -1.64, -1.6));
    P(M.glass, bb(3.2, 4.0, Y0 + 0.04, Y0 + 0.22, -1.645, -1.595));
    // ---- Insurance / TPA cashless desk: long counter, staff, waiting chairs, sign.
    {
      const z = -1.22;
      P(M.white, rb(1.2, 0.1, 0.1, 0.012, 3.5, Y0, z));
      P(M.navy, bx(1.2, 0.06, 0.004, 3.5, Y0 + 0.02, z + 0.052));
      P(M.wood, rb(1.24, 0.012, 0.12, 0.004, 3.5, Y0 + 0.1, z));
      for (let k = 0; k < 4; k++) {
        const x = 3.05 + k * 0.3;
        P(M.dark, bx(0.07, 0.045, 0.008, x, Y0 + 0.115, z - 0.02));
        P(M.screen, new THREE.PlaneGeometry(0.062, 0.038).rotateY(Math.PI).translate(x, Y0 + 0.138, z - 0.0245));
        P(M.dark, bx(0.05, 0.004, 0.02, x, Y0 + 0.112, z + 0.025));
      }
      const tpaM = L.add("admEq", std(0xffffff, 0, 0.5, { map: tpaSignTex, emissive: 0xffffff, emissiveMap: tpaSignTex, emissiveIntensity: 0.35 }));
      put(admG, tpaM, new THREE.PlaneGeometry(0.66, 0.08).translate(3.5, Y0 + 0.2, z - 0.05));
      for (const x of [3.2, 3.8]) P(M.ss, bb(x - 0.004, x + 0.004, Y0 + 0.112, Y0 + 0.16, z - 0.055, z - 0.047));
      // Waiting chairs (rows facing the counter).
      const chairs: Item[] = [];
      for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) chairs.push({ p: [3.0 + k * 0.1, Y0, -0.9 + r * 0.16], ry: Math.PI, c: 0x1f4f9a });
      const chair = mergeInto(THREE, [bx(0.07, 0.01, 0.06, 0, 0.05, 0), bx(0.07, 0.07, 0.01, 0, 0.05, -0.03), bx(0.008, 0.05, 0.008, 0, 0, 0)]);
      inst(admG, chair, M.tint, chairs);
      people(
        admG,
        M.body,
        M.skin,
        [
          { p: [3.05, Y0, -1.33], c: 0x1f4f9a },
          { p: [3.35, Y0, -1.33], c: 0x1f4f9a },
          { p: [3.65, Y0, -1.33], c: 0x1f4f9a },
          { p: [3.95, Y0, -1.33], c: 0x1f4f9a },
          { p: [3.2, Y0, -1.08], c: 0xd9742b },
          { p: [3.5, Y0, -1.1], c: 0x8a4fc0 },
          { p: [3.8, Y0, -1.08], c: 0x16a3a0 },
          { p: [3.1, Y0, -0.9], c: 0xe2b33a },
          { p: [3.4, Y0, -0.74], c: 0xc8262d },
          { p: [4.25, Y0, -0.8], c: 0x3a434c },
          { p: [2.95, Y0, -0.68], c: 0x2f6fd0 },
        ]
      );
    }
    // ---- Data & command centre: curved video wall, operator desks, server racks.
    {
      const cx = 3.55,
        cz = -1.72,
        r = 0.95;
      const operators: Item[] = [];
      const wallM = L.add("admEq", std(0x000000, 0, 0.4, { emissive: 0xffffff, emissiveMap: dashTex, emissiveIntensity: 1.0, side: DS }));
      put(admG, wallM, new THREE.CylinderGeometry(r, r, 0.26, 32, 1, true, Math.PI - 0.55, 1.1).translate(cx, Y0 + 0.07 + 0.13, cz));
      P(M.dark, new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.29, 32, 1, true, Math.PI - 0.57, 1.14).translate(cx, Y0 + 0.055 + 0.145, cz));
      P(M.dark, bb(cx - 0.5, cx + 0.5, Y0, Y0 + 0.06, cz - r - 0.03, cz - r + 0.12));
      for (const [rr, n] of [
        [0.55, 4],
        [0.3, 3],
      ] as [number, number][]) {
        for (let k = 0; k < n; k++) {
          const a = Math.PI + (k - (n - 1) / 2) * (0.85 / n);
          const px = cx + rr * Math.sin(a),
            pz = cz + rr * Math.cos(a);
          const ry = a;
          const Q = place(P, px, Y0, pz, ry);
          Q(M.white, rb(0.16, 0.01, 0.08, 0.004, 0, 0.08, 0));
          Q(M.grey, bx(0.008, 0.08, 0.06, -0.07, 0, 0));
          Q(M.grey, bx(0.008, 0.08, 0.06, 0.07, 0, 0));
          for (const dx of [-0.04, 0.04]) {
            Q(M.dark, bx(0.07, 0.045, 0.006, dx, 0.095, 0.025));
            Q(M.screen, new THREE.PlaneGeometry(0.064, 0.04).translate(dx, 0.1175, 0.0285));
          }
          operators.push({ p: [px - 0.08 * Math.sin(a), Y0, pz - 0.08 * Math.cos(a)], c: 0x3a434c });
        }
      }
      people(admG, M.body, M.skin, operators);
      // Server racks along the east wall with status LEDs.
      for (let k = 0; k < 5; k++) {
        const z = -2.8 + k * 0.2;
        P(M.black, rb(0.11, 0.26, 0.17, 0.006, 4.36, Y0, z));
        for (let l = 0; l < 6; l++) P(l % 2 ? M.blueLed : M.greenLed, bx(0.003, 0.006, 0.12, 4.303, Y0 + 0.04 + l * 0.035, z));
      }
      P(M.grey, bb(4.27, 4.3, Y0 + 0.26, Y0 + 0.28, -2.9, -1.95));
    }
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
  const [pPod, pLab, pAdm] = peels;
  return {
    applyLevel(v: number) {
      const a = clamp01(v),
        b = clamp01(v - 1),
        c = clamp01(v - 2);
      L.set("base", 1);
      peel(pPod, a);
      peel(pLab, b);
      peel(pAdm, c);
      L.set("trees", lerp(1, 0.45, ease(a)));
      L.set("ctx", lerp(1, 0.3, ease(a)));
      L.set("l0", lerp(1, 0.35, ease(a)) * lerp(1, 0.6, ease(c)));
      L.set("wardEq", smoothstep(a, 0.15, 0.85) * lerp(1, 0.22, ease(b)));
      L.set("labEq", smoothstep(b, 0.15, 0.85) * lerp(1, 0.22, ease(c)));
      L.set("admEq", smoothstep(c, 0.15, 0.85));
    },
  };
}
