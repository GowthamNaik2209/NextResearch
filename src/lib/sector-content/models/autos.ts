// Automobiles: placeholder scene - a plinth with one tier per layer, so the explorer, callouts and
// views work while the model author builds the real one. AUTOS_ANCHORS holds one marker per zone of
// sectors/autos.ts; the model author moves them onto the parts that show each zone.
//
// Layers peel outside -> inside by fading each tier above the current one:
//   0 Vehicle Makers
//   1 Systems & Modules
//   2 Engine & Driveline
//   3 Tyres & Aftermarket
import type * as T from "three";
import type { Three, Vec3 } from "./kit";

type Ctx = { THREE: Three; layerGroups: T.Group[]; staticGroup: T.Group };
type Side = "left" | "right" | "top" | "bottom";

// zone id -> 3D marker position + which rail its callout sits on.
export const AUTOS_ANCHORS: Record<string, { pos: Vec3; side: Side }> = {
  two_wheelers: { pos: [-3.00, 1.7, 1.6], side: "left" }, // layer 0: Vehicle Makers
  passenger_vehicles: { pos: [-1.00, 1.7, 1.6], side: "left" }, // layer 0: Vehicle Makers
  commercial_vehicles: { pos: [1.00, 1.7, 1.6], side: "right" }, // layer 0: Vehicle Makers
  tractors: { pos: [3.00, 1.7, 1.6], side: "right" }, // layer 0: Vehicle Makers
  body_electricals: { pos: [-3.00, 1.25, 0.5], side: "left" }, // layer 1: Systems & Modules
  chassis_systems: { pos: [0.00, 1.25, 0.5], side: "top" }, // layer 1: Systems & Modules
  modules_interiors: { pos: [3.00, 1.25, 0.5], side: "right" }, // layer 1: Systems & Modules
  engine_parts: { pos: [-3.00, 0.8, -0.6], side: "left" }, // layer 2: Engine & Driveline
  emissions_fuel: { pos: [0.00, 0.8, -0.6], side: "top" }, // layer 2: Engine & Driveline
  driveline: { pos: [3.00, 0.8, -0.6], side: "right" }, // layer 2: Engine & Driveline
  tyres: { pos: [-3.00, 0.35, -1.7], side: "left" }, // layer 3: Tyres & Aftermarket
  replacement: { pos: [0.00, 0.35, -1.7], side: "bottom" }, // layer 3: Tyres & Aftermarket
  dealers: { pos: [3.00, 0.35, -1.7], side: "right" }, // layer 3: Tyres & Aftermarket
};

export const AUTOS_VIEWS = [
  {id: "overview", label: "Overview", pos: [8,6.5,9], target: [0,0.9,0], narration: "Welcome to Automobiles. Two-wheelers, cars, trucks and tractors, and the systems, engine parts, tyres and dealers behind them. Peel the model layer by layer, from vehicle makers to tyres & aftermarket."},
  {id: "layer0", layer: 0, label: "Vehicle Makers", pos: [5.5,4.6,6.5], target: [0,1.7,1.6], narration: "Vehicle Makers: two-wheelers, cars & utility vehicles, trucks, buses & vans, tractors & farm equipment."},
  {id: "layer1", layer: 1, label: "Systems & Modules", pos: [4.9,4.1,5.7], target: [0,1.25,0.5], narration: "Systems & Modules: lighting, switches & body electricals, brakes, suspension & steering, modules, interiors, glass & frames."},
  {id: "layer2", layer: 2, label: "Engine & Driveline", pos: [4.3,3.6,4.9], target: [0,0.8,-0.6], narration: "Engine & Driveline: engine components, fuel injection & emission control, gears, bearings, chains & axles."},
  {id: "layer3", layer: 3, label: "Tyres & Aftermarket", pos: [3.7,3.1,4.1], target: [0,0.35,-1.7], narration: "Tyres & Aftermarket: tyres, replacement batteries & lubricants, dealers & used vehicles."},
  {id: "top", label: "Top", pos: [0.05,12.5,0.05], target: [0,0,0], narration: "From above: the four layers of Automobiles, vehicle makers, systems & modules, engine & driveline, tyres & aftermarket."},
];

const TIER = [
  { y: 1.50, z: 1.6, color: 0x8fb3cf },
  { y: 1.05, z: 0.5, color: 0x7f9fc0 },
  { y: 0.60, z: -0.6, color: 0x6f8bb0 },
  { y: 0.15, z: -1.7, color: 0x5f77a0 },
];

export function buildAutos(ctx: Ctx, _def?: unknown) {
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
