// Runs before `next build`. On Vercel (VERCEL=1) it applies any pending Prisma migrations to that
// deployment's own DATABASE_URL, so production gets new tables on deploy without anyone handling
// its credentials. It only adds what's pending and never resets data. If it fails, the build fails
// and the live site keeps serving the previous deployment. Locally it does nothing.
import { execSync } from "node:child_process";

if (process.env.VERCEL === "1") {
  console.log("[migrate] applying pending Prisma migrations for this environment");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("[migrate] not on Vercel, skipping");
}
