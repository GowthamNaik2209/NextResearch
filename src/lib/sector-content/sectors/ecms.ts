// ecms: a policy authored in ../policies/ecms.ts (with its scenarios and reading list in
// ../policies/ecms.extras.ts); this module only binds it to the shared helpers so the registry
// (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineEcms } from "../policies/ecms";
import { ASOF, SRC, co } from "./shared";

export default defineEcms({ co, ASOF, SRC });
