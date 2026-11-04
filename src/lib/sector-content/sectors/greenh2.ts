// greenh2: a policy authored in ../policies/greenh2.ts (with its scenarios and reading list in
// ../policies/greenh2.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineGreenh2 } from "../policies/greenh2";
import { ASOF, SRC, co } from "./shared";

export default defineGreenh2({ co, ASOF, SRC });
