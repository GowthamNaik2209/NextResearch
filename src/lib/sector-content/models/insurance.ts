// Insurance: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. INSURANCE_ANCHORS holds one marker per zone of
// sectors/insurance.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Distribution
//   1 Insurers
//   2 Claims & Reinsurance
//   3 Capital & Regulation
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const INSURANCE_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  bancassurance: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Distribution
  digital_brokers: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Distribution
  life_bank: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Insurers
  life_lic: { pos: [-1.00, 1.25, 0.5], side: "left" }, // layer 1: Insurers
  general: { pos: [1.00, 1.25, 0.5], side: "right" }, // layer 1: Insurers
  health: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Insurers
  reinsurance: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Claims & Reinsurance
  tpa_claims: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Claims & Reinsurance
  holdcos: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Capital & Regulation
  regulator: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Capital & Regulation
};

export const INSURANCE_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to Insurance. Life, general and health insurers, the reinsurers behind them, and the banks, brokers and TPAs that sell policies and settle claims - India's risk-pooling chain. Peel the model layer by layer, from distribution to capital & regulation."},
  {id: "layer0", layer: 0, label: "Distribution", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Distribution: bank partners (bancassurance), online marketplaces & brokers."},
  {id: "layer1", layer: 1, label: "Insurers", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Insurers: bank-promoted life insurers, lic and group-owned life insurers, multi-line general insurers, standalone health insurers."},
  {id: "layer2", layer: 2, label: "Claims & Reinsurance", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Claims & Reinsurance: reinsurers, tpas & claims rails."},
  {id: "layer3", layer: 3, label: "Capital & Regulation", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Capital & Regulation: insurance holding companies & promoters, regulator & public rails."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of Insurance, distribution, insurers, claims & reinsurance, capital & regulation."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildInsurance(ctx: Ctx, _def?: unknown) {
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
