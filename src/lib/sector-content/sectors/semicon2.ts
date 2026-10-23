// semicon2: a policy authored in ../policies/semicon2.ts (with its scenarios and reading list in
// ../policies/semicon2.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineSemicon2 } from "../policies/semicon2";
import { ASOF, SRC, co } from "./shared";

export default defineSemicon2({ co, ASOF, SRC });
