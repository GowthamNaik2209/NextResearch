// Chemicals & Agrochem: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. CHEMICALS_ANCHORS holds one marker per zone of
// sectors/chemicals.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Farm Inputs
//   1 Specialty Chemicals
//   2 Commodity Chemicals
//   3 Feedstock & Logistics
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const CHEMICALS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  crop_protection: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Farm Inputs
  fertilisers: { pos: [0.00, 1.7, 1.6], side: "top" }, // layer 0: Farm Inputs
  seeds: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Farm Inputs
  custom_synthesis: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Specialty Chemicals
  fluorochem: { pos: [-1.50, 1.25, 0.5], side: "left" }, // layer 1: Specialty Chemicals
  intermediates: { pos: [0.00, 1.25, 0.5], side: "top" }, // layer 1: Specialty Chemicals
  consumer_specialty: { pos: [1.50, 1.25, 0.5], side: "right" }, // layer 1: Specialty Chemicals
  carbon_colour: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Specialty Chemicals
  chlor_alkali: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Commodity Chemicals
  petchem: { pos: [0.00, 0.8, -0.6], side: "top" }, // layer 2: Commodity Chemicals
  explosives: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Commodity Chemicals
  feedstock: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Feedstock & Logistics
  terminals: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Feedstock & Logistics
};

export const CHEMICALS_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to Chemicals & Agrochem. Specialty and commodity chemicals, crop protection, fertilisers and seeds, from feedstock to the farm. Peel the model layer by layer, from farm inputs to feedstock & logistics."},
  {id: "layer0", layer: 0, label: "Farm Inputs", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Farm Inputs: crop protection brands, fertilisers, seeds & crop nutrition."},
  {id: "layer1", layer: 1, label: "Specialty Chemicals", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Specialty Chemicals: custom synthesis for global innovators, fluorochemicals & refrigerants, aromatics, amines & specialty intermediates, adhesives, aroma & personal-care chemicals, carbon black, rubber & colour chemicals."},
  {id: "layer2", layer: 2, label: "Commodity Chemicals", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Commodity Chemicals: soda ash & chlor-alkali, petrochemicals, polymers & solvents, industrial explosives & nitrates."},
  {id: "layer3", layer: 3, label: "Feedstock & Logistics", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Feedstock & Logistics: feedstock: refiners & gas, chemical terminals & logistics."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of Chemicals & Agrochem, farm inputs, specialty chemicals, commodity chemicals, feedstock & logistics."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildChemicals(ctx: Ctx, _def?: unknown) {
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
