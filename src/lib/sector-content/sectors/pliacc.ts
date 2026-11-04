// pliacc: a policy authored in ../policies/pliacc.ts (with its scenarios and reading list in
// ../policies/pliacc.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { definePliacc } from "../policies/pliacc";
import { ASOF, SRC, co } from "./shared";

export default definePliacc({ co, ASOF, SRC });
