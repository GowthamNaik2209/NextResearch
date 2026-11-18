// Banks & NBFCs: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. BANKS_ANCHORS holds one marker per zone of
// sectors/banks.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Specialist Lenders
//   1 Banks
//   2 Groups & State Lenders
//   3 Rails & Regulators
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const BANKS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  consumer_credit: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Specialist Lenders
  vehicle_finance: { pos: [-1.80, 1.7, 1.6], side: "left" }, // layer 0: Specialist Lenders
  gold_loans: { pos: [-0.60, 1.7, 1.6], side: "left" }, // layer 0: Specialist Lenders
  microfinance: { pos: [0.60, 1.7, 1.6], side: "right" }, // layer 0: Specialist Lenders
  msme_lending: { pos: [1.80, 1.7, 1.6], side: "right" }, // layer 0: Specialist Lenders
  affordable_housing: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Specialist Lenders
  large_banks: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Banks
  psu_banks: { pos: [-1.00, 1.25, 0.5], side: "left" }, // layer 1: Banks
  midsize_private: { pos: [1.00, 1.25, 0.5], side: "right" }, // layer 1: Banks
  sfb: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Banks
  diversified_nbfc: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Groups & State Lenders
  prime_housing: { pos: [0.00, 0.8, -0.6], side: "top" }, // layer 2: Groups & State Lenders
  infra_lenders: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Groups & State Lenders
  oversight: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Rails & Regulators
  credit_rails: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Rails & Regulators
};

export const BANKS_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to Banks & NBFCs. Private, PSU and small-finance banks, NBFCs, housing financiers, MFIs and state lenders. Peel the model layer by layer, from specialist lenders to rails & regulators."},
  {id: "layer0", layer: 0, label: "Specialist Lenders", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Specialist Lenders: consumer loans & credit cards, vehicle & equipment finance, gold loans, microfinance, small-business & property-backed loans, affordable housing finance."},
  {id: "layer1", layer: 1, label: "Banks", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Banks: large banks, public-sector banks, mid-size & regional private banks, small finance & payments banks."},
  {id: "layer2", layer: 2, label: "Groups & State Lenders", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Groups & State Lenders: diversified nbfcs & holding companies, prime housing finance, state infrastructure lenders."},
  {id: "layer3", layer: 3, label: "Rails & Regulators", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Rails & Regulators: regulator, refinancers & resolution, bureaus, payments & lending software."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of Banks & NBFCs, specialist lenders, banks, groups & state lenders, rails & regulators."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildBanks(ctx: Ctx, _def?: unknown) {
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
