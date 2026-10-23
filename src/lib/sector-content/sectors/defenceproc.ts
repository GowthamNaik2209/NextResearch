// defenceproc: a policy authored in ../policies/defenceproc.ts (with its scenarios and reading list in
// ../policies/defenceproc.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineDefenceproc } from "../policies/defenceproc";
import { ASOF, SRC, co } from "./shared";

export default defineDefenceproc({ co, ASOF, SRC });
