// Shared procedural-modelling toolkit for the sector explorer's 3D models.
//
// Every sector's build() constructs its geometry in code (no external .glb
// assets) so each part can live in its own peel-away layer group. These
// helpers are what lets that code produce smooth, designed surfaces instead
// of stacked boxes: profile curves, a lofted body surface with surface-hugging
// detail patches/trim lines, lathed parts, wheels and contact shadows.
//
// THREE is always passed in (never imported) — products.ts is also loaded on
// the server, and only the client explorer ever calls build().
import type * as T from "three";

export type Three = typeof import("three");
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (x: number, e0: number, e1: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/**
 * Smooth monotone (Fritsch–Carlson) interpolation through [x, y] keys — used
 * for silhouette/plan/profile curves. Monotone so profiles never overshoot
 * between keys (no ripples in a roofline). Keys may be given in any x order.
 */
export function profile(keys: Vec2[]): (x: number) => number {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  const n = k.length;
  const xs = k.map((p) => p[0]);
  const ys = k.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i],
      b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t,
      t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

// Centripetal Catmull–Rom through 2D points (no cusps/loops on uneven spacing).
function crSegment(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const td = (a: Vec2, b: Vec2) => Math.max(1e-6, Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5));
  const t0 = 0,
    t1 = t0 + td(p0, p1),
    t2 = t1 + td(p1, p2),
    t3 = t2 + td(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const L = (a: Vec2, b: Vec2, ta: number, tb: number): Vec2 => {
    const w = (u - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const A1 = L(p0, p1, t0, t1),
    A2 = L(p1, p2, t1, t2),
    A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2),
    B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}

/** Evaluate a Catmull–Rom curve through `pts` at parameter t ∈ [0, pts.length-1]. */
export function crEval(pts: Vec2[], t: number): Vec2 {
  const n = pts.length;
  const i = Math.max(0, Math.min(n - 2, Math.floor(t)));
  const f = t - i;
  const p1 = pts[i],
    p2 = pts[i + 1];
  const p0: Vec2 = i > 0 ? pts[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
  const p3: Vec2 = i + 2 < n ? pts[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
  return crSegment(p0, p1, p2, p3, f);
}

/** Smooth closed/open outline -> THREE.Shape (for extrusions of curvy plan shapes). */
export function smoothShape(THREE: Three, pts: Vec2[], samplesPerSeg = 8, closed = true): T.Shape {
  const ring = closed ? [...pts, pts[0]] : pts;
  const s = new THREE.Shape();
  const ext = closed ? [pts[pts.length - 1], ...ring, pts[1]] : ring;
  const off = closed ? 1 : 0;
  const segs = ring.length - 1;
  for (let i = 0; i <= segs * samplesPerSeg; i++) {
    const t = off + i / samplesPerSeg;
    const p = crEval(ext, t);
    if (i === 0) s.moveTo(p[0], p[1]);
    else s.lineTo(p[0], p[1]);
  }
  return s;
}

// --------------------------------------------------------------------------
// Lofted body surface
// --------------------------------------------------------------------------
//
// A body is defined by, for each station x along its length, the RIGHT half
// of its cross-section as control points [z, y] from the bottom edge up to the
// top centre line (z = 0). The surface mirrors that to the left side, so
// the section parameter is (h, side): h ∈ [0,1] runs bottom -> top centre,
// side = +1 (right, +z) or -1 (left, -z). The control-point index grid is
// what keeps features (shoulder line, glass edge) on a consistent iso-line
// down the whole length, so materials can be split by h-band.

export type LoftSection = (x: number) => Vec2[];

export type Loft = {
  geometry: T.BufferGeometry;
  /** Point on the surface (optionally pushed out along the normal by `off`). */
  at: (x: number, h: number, side: number, off?: number) => T.Vector3;
  normal: (x: number, h: number, side: number) => T.Vector3;
  /** The h (searched in [0, hMax]) at which the section at x reaches height y. */
  hAtY: (x: number, y: number, hMax?: number) => number;
  x0: number;
  x1: number;
};

export function loft(
  THREE: Three,
  opts: {
    x0: number;
    x1: number;
    section: LoftSection;
    stations?: number;
    perSegment?: number;
    /** Returns a material-group index for a face given its centre (x, h). Default 0. */
    group?: (x: number, h: number) => number;
    groups?: number;
    /** Cluster stations near the ends (for rounded noses/tails). 0..1 */
    endBias?: number;
    /** Extra station pairs at x±ε — lets a profile jump there (wheel-arch edges). */
    breaks?: number[];
    /** Final per-point deformation (e.g. rake a nose back in side view). */
    warp?: (p: T.Vector3) => void;
  }
): Loft {
  const { x0, x1, section } = opts;
  const nu = opts.stations ?? 96;
  const per = opts.perSegment ?? 8;
  const endBias = opts.endBias ?? 0.6;
  const R = section((x0 + x1) / 2).length; // right-half control points
  const M = R - 1;
  const N = 2 * R - 1;

  const fullSection = (x: number): Vec2[] => {
    const right = section(x);
    const left = right
      .slice(0, M)
      .reverse()
      .map((p) => [-p[0], p[1]] as Vec2);
    return [...right, ...left];
  };
  const tOf = (h: number, side: number) => (side >= 0 ? h * M : N - 1 - h * M);
  const warp = opts.warp;
  const raw = (x: number, h: number, side: number) => {
    const p = crEval(fullSection(x), tOf(h, side));
    const v = new THREE.Vector3(x, p[1], p[0]);
    if (warp) warp(v);
    return v;
  };
  const normal = (x: number, h: number, side: number) => {
    const e = 1e-3;
    const xa = Math.max(x0, x - e),
      xb = Math.min(x1, x + e);
    const ha = Math.max(0, h - e),
      hb = Math.min(1, h + e);
    const du = raw(xb, h, side).sub(raw(xa, h, side));
    const dv = raw(x, hb, side).sub(raw(x, ha, side));
    const n = new THREE.Vector3().crossVectors(du, dv);
    if (n.lengthSq() < 1e-14) {
      // Degenerate at a pinched nose/tail: fall back to the length axis.
      n.set(x > (x0 + x1) / 2 ? 1 : -1, 0, 0);
    }
    n.normalize();
    const p = raw(x, h, side);
    const sec = section(x);
    const yc = (sec[0][1] + sec[M][1]) / 2;
    const out = new THREE.Vector3(p.x - (x0 + x1) / 2, p.y - yc, p.z);
    out.x *= 0.15; // mostly radial, slightly toward the ends
    if (n.dot(out) < 0) n.negate();
    return n;
  };
  const at = (x: number, h: number, side: number, off = 0) => {
    const p = raw(x, h, side);
    if (off) p.addScaledVector(normal(x, h, side), off);
    return p;
  };

  // Station distribution: denser toward both ends.
  let us: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const s = i / nu;
    const c = 0.5 - 0.5 * Math.cos(Math.PI * s);
    us.push(lerp(x0, x1, lerp(s, c, endBias)));
  }
  for (const b of opts.breaks ?? []) us.push(b - 1e-4, b + 1e-4);
  us = us.sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > 5e-5);
  const nuEff = us.length - 1;
  const nv = (N - 1) * per + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const tmp = new THREE.Vector3();
  for (let i = 0; i <= nuEff; i++) {
    const x = us[i];
    const full = fullSection(x);
    for (let j = 0; j < nv; j++) {
      const p = crEval(full, j / per);
      tmp.set(x, p[1], p[0]);
      if (warp) warp(tmp);
      pos.push(tmp.x, tmp.y, tmp.z);
      uv.push((x - x0) / (x1 - x0), j / (nv - 1));
    }
  }
  const nGroups = opts.groups ?? 1;
  const buckets: number[][] = Array.from({ length: nGroups }, () => []);
  for (let i = 0; i < nuEff; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = i * nv + j,
        b = (i + 1) * nv + j,
        c = (i + 1) * nv + j + 1,
        d = i * nv + j + 1;
      const xm = (us[i] + us[i + 1]) / 2;
      const tm = (j + 0.5) / per;
      const hm = tm <= M ? tm / M : (N - 1 - tm) / M;
      const g = opts.group ? opts.group(xm, hm) : 0;
      buckets[g].push(a, b, d, b, c, d);
    }
  }
  const index: number[] = [];
  const geo = new THREE.BufferGeometry();
  buckets.forEach((b, g) => {
    geo.addGroup(index.length, b.length, g);
    index.push(...b);
  });
  geo.setIndex(index);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // Make the winding face outward (so FrontSide-only shells work): check the
  // top-centre vertex of the middle station, whose outward normal is +y.
  const mid = Math.floor(nuEff / 2) * nv + M * per;
  const ny = geo.getAttribute("normal").getY(mid);
  if (ny < 0) {
    const idx = geo.getIndex()!.array as Uint32Array | Uint16Array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    geo.computeVertexNormals();
  }
  const hAtY = (x: number, y: number, hMax = 0.6) => {
    let lo = 0,
      hi = hMax;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (crEval(fullSection(x), mid * M)[1] < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return { geometry: geo, at, normal, hAtY, x0, x1 };
}

/**
 * A detail panel lying on a loft surface (light lenses, grilles, glass
 * inserts, decals): spans x ∈ [xa, xb] and, per x, h ∈ hRange(x), pushed
 * `off` out along the surface normal. Returns null if the range is empty.
 */
export function loftPatch(
  THREE: Three,
  body: Loft,
  xa: number,
  xb: number,
  hRange: (x: number) => Vec2 | null,
  side: number,
  off = 0.004,
  nu = 24,
  nv = 10
): T.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  let rows = 0;
  for (let i = 0; i <= nu; i++) {
    const x = lerp(xa, xb, i / nu);
    const r = hRange(x) ?? [0, 0];
    for (let j = 0; j <= nv; j++) {
      const h = lerp(r[0], r[1], j / nv);
      const p = body.at(x, h, side, off);
      pos.push(p.x, p.y, p.z);
    }
    rows++;
  }
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j,
        b = (i + 1) * (nv + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // orient outward like the body
  const mx = (xa + xb) / 2;
  const r = hRange(mx) ?? [0, 0];
  const n0 = body.normal(mx, (r[0] + r[1]) / 2, side);
  const ci = Math.floor(nu / 2) * (nv + 1) + Math.floor(nv / 2);
  const nn = g.getAttribute("normal");
  if (nn.getX(ci) * n0.x + nn.getY(ci) * n0.y + nn.getZ(ci) * n0.z < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.setIndex(idx);
    g.computeVertexNormals();
  }
  return g;
}

/** A thin tube following a path of (x, h) pairs over a loft surface (shut lines, trim). */
export function loftLine(
  THREE: Three,
  body: Loft,
  path: Vec2[],
  side: number,
  radius: number,
  off = 0.002,
  samples = 48
): T.BufferGeometry {
  // Densify in (x, h) first so the tube hugs the surface between path points
  // instead of cutting through it.
  const dense: Vec2[] = [];
  const per = Math.max(2, Math.ceil(samples / Math.max(1, path.length - 1)));
  for (let i = 0; i < path.length - 1; i++)
    for (let k = 0; k < per; k++) {
      const t = k / per;
      dense.push([lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)]);
    }
  dense.push(path[path.length - 1]);
  const pts = dense.map(([x, h]) => body.at(x, h, side, off));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  return new THREE.TubeGeometry(curve, samples, radius, 6, false);
}

// --------------------------------------------------------------------------
// Generic shape helpers
// --------------------------------------------------------------------------

/** Tube through 3D points. */
export function tube(THREE: Three, points: Vec3[], radius: number, radial = 8, closed = false, samples?: number) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    closed,
    "centripetal"
  );
  return new THREE.TubeGeometry(curve, samples ?? Math.max(16, points.length * 10), radius, radial, closed);
}

/** Straight round bar between two points. */
export function bar(THREE: Three, a: Vec3, b: Vec3, r: number, radial = 8): T.BufferGeometry {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, radial, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    vb.clone().sub(va).normalize()
  );
  g.applyQuaternion(q);
  const mid = va.add(vb).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

/** Box with rounded vertical/horizontal edges (extruded rounded rect, bevelled). */
export function roundedBox(THREE: Three, w: number, h: number, d: number, r: number, seg = 3): T.BufferGeometry {
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  const s = new THREE.Shape();
  const x = -w / 2 + rr,
    y = -h / 2 + rr,
    W = w - 2 * rr,
    H = h - 2 * rr;
  s.moveTo(x, y - rr);
  s.lineTo(x + W, y - rr);
  s.quadraticCurveTo(x + W + rr, y - rr, x + W + rr, y);
  s.lineTo(x + W + rr, y + H);
  s.quadraticCurveTo(x + W + rr, y + H + rr, x + W, y + H + rr);
  s.lineTo(x, y + H + rr);
  s.quadraticCurveTo(x - rr, y + H + rr, x - rr, y + H);
  s.lineTo(x - rr, y);
  s.quadraticCurveTo(x - rr, y - rr, x, y - rr);
  const bev = Math.min(rr, d / 2 - 1e-4) * 0.9;
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-4, d - 2 * bev),
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev * 0.6,
    bevelSegments: seg,
    curveSegments: seg * 2,
  });
  g.translate(0, 0, -(d - 2 * bev) / 2);
  g.computeVertexNormals();
  return g;
}

/** Revolve a [radius, y] profile around the Y axis. */
export function lathe(THREE: Three, pts: Vec2[], segments = 32): T.BufferGeometry {
  return new THREE.LatheGeometry(
    pts.map((p) => new THREE.Vector2(p[0], p[1])),
    segments
  );
}

/** Extrude a 2D outline (in XY) by depth along Z, centred on Z. */
export function extrude(
  THREE: Three,
  pts: Vec2[],
  depth: number,
  bevel = 0,
  smooth = false
): T.BufferGeometry {
  const shape = smooth ? smoothShape(THREE, pts) : new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** Soft radial contact shadow on the floor — grounds a model without real shadow maps. */
export function contactShadow(THREE: Three, sx: number, sz: number, opacity = 0.55, y = 0.002): T.Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,1)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.55)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = -1;
  return m;
}

/** Simple vertical-gradient / stripe canvas texture helper. */
export function canvasTexture(
  THREE: Three,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void
): T.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Merge many geometries that share one material into one (fewer draw calls). */
export function mergeInto(THREE: Three, geos: T.BufferGeometry[]): T.BufferGeometry {
  // Minimal merge (position/normal/uv, indexed) — avoids pulling in
  // BufferGeometryUtils for the handful of attributes we use.
  const norm = geos.map((g) => (g.index ? g : indexify(THREE, g)));
  let vCount = 0;
  const pos: number[] = [],
    nor: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (const g of norm) {
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    const p = g.getAttribute("position"),
      n = g.getAttribute("normal"),
      t = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      if (t) uv.push(t.getX(i), t.getY(i));
      else uv.push(0, 0);
    }
    const ia = g.index!;
    for (let i = 0; i < ia.count; i++) idx.push(ia.getX(i) + vCount);
    vCount += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setIndex(idx);
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

function indexify(THREE: Three, g: T.BufferGeometry): T.BufferGeometry {
  const n = g.getAttribute("position").count;
  const out = g.clone();
  out.setIndex(Array.from({ length: n }, (_, i) => i));
  return out;
}

/**
 * Layer-opacity bookkeeping shared by every sector: register materials into
 * named buckets at build time, then fade each bucket in applyLevel().
 * Materials are made transparent here so builders can author them as solid.
 */
export function layerMats() {
  const buckets = new Map<string, { mat: T.Material; scale: number; base: number }[]>();
  return {
    add<M extends T.Material>(bucket: string, mat: M, scale = 1): M {
      mat.transparent = true;
      const base = (mat as T.Material & { opacity: number }).opacity ?? 1;
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket)!.push({ mat, scale, base });
      return mat;
    },
    set(bucket: string, v: number) {
      for (const e of buckets.get(bucket) ?? []) {
        const op = Math.max(0, Math.min(1, v)) * e.scale * e.base;
        e.mat.opacity = op;
        e.mat.visible = op > 0.01;
        // Fully opaque -> render in the opaque pass with depth writes, so a
        // solid shell correctly hides what's inside it. Fading -> transparent
        // pass without depth writes, so it never punches holes behind it.
        const solid = op > 0.995;
        if (e.mat.transparent === solid) {
          e.mat.transparent = !solid;
          e.mat.needsUpdate = true;
        }
        e.mat.depthWrite = solid;
      }
    },
  };
}

/**
 * Faceted frustum between a bottom and a top rectangle (each given as
 * [xMin, xMax, zHalf, y]) — the flat, inward-raked panels of a stealth
 * superstructure, a funnel, a mast. Flat-shaded (non-indexed) on purpose.
 */
export function prism(
  THREE: Three,
  b: [number, number, number, number],
  t: [number, number, number, number],
  zShift = 0
): T.BufferGeometry {
  const v = [
    [b[0], b[3], -b[2]],
    [b[1], b[3], -b[2]],
    [b[1], b[3], b[2]],
    [b[0], b[3], b[2]],
    [t[0], t[3], -t[2]],
    [t[1], t[3], -t[2]],
    [t[1], t[3], t[2]],
    [t[0], t[3], t[2]],
  ].map((p) => [p[0], p[1], p[2] + zShift]);
  const quads = [
    [0, 1, 2, 3], // bottom
    [7, 6, 5, 4], // top
    [3, 2, 6, 7], // +z
    [1, 0, 4, 5], // -z
    [2, 1, 5, 6], // +x
    [0, 3, 7, 4], // -x
  ];
  const pos: number[] = [];
  for (const q of quads) {
    const [a, bb, c, d] = q.map((i) => v[i]);
    pos.push(...a, ...bb, ...c, ...a, ...c, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Railing (posts + top/mid rails) along a polyline. */
export function railing(THREE: Three, pts: Vec3[], height = 0.05, r = 0.0035, spacing = 0.12): T.BufferGeometry {
  const geos: T.BufferGeometry[] = [];
  for (const k of [0.55, 1]) {
    geos.push(tube(THREE, pts.map((p) => [p[0], p[1] + height * k, p[2]] as Vec3), r, 4, false, pts.length * 6));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.max(1, Math.round(len / spacing));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const p: Vec3 = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      geos.push(bar(THREE, p, [p[0], p[1] + height, p[2]], r, 4));
    }
  }
  return mergeInto(THREE, geos);
}

/**
 * A lifting surface (wing, tailplane, fin, blade) through spanwise stations.
 * Each station gives its leading-edge point, chord (laid out along -X) and
 * thickness ratio; `thickAxis` is the direction the airfoil's thickness points
 * (Y for a wing, Z for a fin). Symmetric NACA-00xx section with a little camber,
 * caps at both ends.
 */
export function liftingSurface(
  THREE: Three,
  stations: { le: Vec3; chord: number; t: number; camber?: number }[],
  thickAxis: Vec3 = [0, 1, 0],
  nChord = 18
): T.BufferGeometry {
  const yt = (u: number) =>
    5 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const us: number[] = [];
  for (let i = 0; i <= nChord; i++) us.push(0.5 - 0.5 * Math.cos((Math.PI * i) / nChord));
  // Loop: upper TE -> LE -> lower TE.
  const loopUV: [number, number][] = [];
  for (let i = nChord; i >= 0; i--) loopUV.push([us[i], 1]);
  for (let i = 1; i <= nChord; i++) loopUV.push([us[i], -1]);
  const nl = loopUV.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const N = thickAxis;
  for (const st of stations) {
    const cam = st.camber ?? 0.02;
    for (const [u, s] of loopUV) {
      const camberV = cam * 4 * u * (1 - u);
      const v = (s * st.t * yt(u) + camberV) * st.chord;
      pos.push(st.le[0] - u * st.chord + N[0] * v, st.le[1] + N[1] * v, st.le[2] + N[2] * v);
    }
  }
  for (let s = 0; s < stations.length - 1; s++)
    for (let i = 0; i < nl - 1; i++) {
      const a = s * nl + i,
        b = (s + 1) * nl + i;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // End caps (fan from mid-chord).
  for (const [s, flip] of [
    [0, true],
    [stations.length - 1, false],
  ] as [number, boolean][]) {
    const st = stations[s];
    const c = pos.length / 3;
    pos.push(st.le[0] - 0.45 * st.chord, st.le[1], st.le[2]);
    for (let i = 0; i < nl - 1; i++) {
      const a = s * nl + i;
      if (flip) idx.push(c, a, a + 1);
      else idx.push(c, a + 1, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
