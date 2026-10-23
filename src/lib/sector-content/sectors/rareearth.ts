// rareearth: a policy authored in ../policies/rareearth.ts (with its scenarios and reading list in
// ../policies/rareearth.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineRareearth } from "../policies/rareearth";
import { ASOF, SRC, co } from "./shared";

export default defineRareearth({ co, ASOF, SRC });
