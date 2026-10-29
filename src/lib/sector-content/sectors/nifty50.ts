// nifty50: the Nifty 50 index, authored in ../indices/nifty50.ts (with its scenarios and reading
// list in ../indices/nifty50.extras.ts); this module only binds it to the shared helpers so the
// registry (../products.ts) and the browser loader (./load.ts) address every sector the same way.
import { defineNifty50 } from "../indices/nifty50";
import { ASOF, SRC, co } from "./shared";

export default defineNifty50({ co, ASOF, SRC });
