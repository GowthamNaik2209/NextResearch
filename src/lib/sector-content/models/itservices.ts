// IT Services & GCCs: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. ITSERVICES_ANCHORS holds one marker per zone of
// sectors/itservices.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Services Firms
//   1 Engineering & Products
//   2 Operations & GCCs
//   3 Talent & Workspace
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const ITSERVICES_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  tier1: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Services Firms
  midtier: { pos: [-1.00, 1.7, 1.6], side: "left" }, // layer 0: Services Firms
  data_ai: { pos: [1.00, 1.7, 1.6], side: "right" }, // layer 0: Services Firms
  infra_services: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Services Firms
  erd: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Engineering & Products
  saas_products: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Engineering & Products
  bpm: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Operations & GCCs
  healthcare_ops: { pos: [0.00, 0.8, -0.6], side: "top" }, // layer 2: Operations & GCCs
  gccs: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Operations & GCCs
  staffing: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Talent & Workspace
  flex_workspace: { pos: [0.00, 0.35, -1.7], side: "bottom" }, // layer 3: Talent & Workspace
  skilling: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Talent & Workspace
};

export const ITSERVICES_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to IT Services & GCCs. IT services firms, engineering R&D, software products, BPM and the global capability centres, staffing and offices around them. Peel the model layer by layer, from services firms to talent & workspace."},
  {id: "layer0", layer: 0, label: "Services Firms", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Services Firms: large IT services, mid-tier IT services, data, analytics & AI services, IT infrastructure & network services."},
  {id: "layer1", layer: 1, label: "Engineering & Products", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Engineering & Products: engineering R&D services, software products & SaaS."},
  {id: "layer2", layer: 2, label: "Operations & GCCs", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Operations & GCCs: BPM & knowledge services, healthcare operations & revenue-cycle services, global capability centres."},
  {id: "layer3", layer: 3, label: "Talent & Workspace", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Talent & Workspace: tech staffing & hiring, flexible & managed offices, training & skilling."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of IT Services & GCCs, services firms, engineering & products, operations & GCCs, talent & workspace."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildItservices(ctx: Ctx, _def?: unknown) {
  void _def;
  const THREE = ctx.THREE;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, 5.4).translate(0, 0.06, 0),
    new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.8 }),
  );
  ctx.staticGroup.add(plinth);
  const mats: T.MeshStandardMaterial[] = [];
  TIER.forEach((t, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6, transparent: true, opacity: 1 });
    mats.push(mat);
    const tier = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 0.9).translate(0, t.y, t.z), mat);
    ctx.layerGroups[i]?.add(tier);
  });
  return {
    applyLevel(v: number) {
      mats.forEach((mat, i) => {
        mat.opacity = i < v ? Math.max(0.12, 1 - (v - i)) : 1;
        mat.depthWrite = mat.opacity > 0.99;
      });
    },
  };
}
