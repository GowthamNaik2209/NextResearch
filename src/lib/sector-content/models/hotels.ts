// Hotels & Travel: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. HOTELS_ANCHORS holds one marker per zone of
// sectors/hotels.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Hotels & Stays
//   1 Leisure & Holidays
//   2 Getting There
//   3 Booking & Capital
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const HOTELS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  luxury_chains: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Hotels & Stays
  midscale_chains: { pos: [0.00, 1.7, 1.6], side: "top" }, // layer 0: Hotels & Stays
  franchise_stays: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Hotels & Stays
  holidays: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Leisure & Holidays
  parks: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Leisure & Holidays
  airlines: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Getting There
  airports: { pos: [0.00, 0.8, -0.6], side: "top" }, // layer 2: Getting There
  airport_services: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Getting There
  distribution: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Booking & Capital
  visa_forex: { pos: [0.00, 0.35, -1.7], side: "bottom" }, // layer 3: Booking & Capital
  asset_owners: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Booking & Capital
};

export const HOTELS_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to Hotels & Travel. Hotel chains, asset owners, airlines, airports, tour operators and the B2B and visa networks that move India's travellers. Peel the model layer by layer, from hotels & stays to booking & capital."},
  {id: "layer0", layer: 0, label: "Hotels & Stays", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Hotels & Stays: luxury & upscale hotel chains, midscale, economy & regional chains, budget franchise & stay platforms."},
  {id: "layer1", layer: 1, label: "Leisure & Holidays", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Leisure & Holidays: tour operators, holiday ownership & rail tourism, theme parks & leisure destinations."},
  {id: "layer2", layer: 2, label: "Getting There", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Getting There: domestic airlines, airport operators, airport food, lounges & travel retail."},
  {id: "layer3", layer: 3, label: "Booking & Capital", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Booking & Capital: wholesale travel & hotel distribution, visa outsourcing & travel forex, institutional hotel owners."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of Hotels & Travel, hotels & stays, leisure & holidays, getting there, booking & capital."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildHotels(ctx: Ctx, _def?: unknown) {
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
