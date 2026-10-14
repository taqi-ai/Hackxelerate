// Builds the Expo web export of the mobile app into apps/web/public/mobile-sim (served at /mobile-sim).
// Expo puts bundled fonts under assets/node_modules/, which git and several hosts skip. Rename it to assets/vendor/.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(import.meta.dirname, "../../web/public/mobile-sim");
execSync(`npx expo export --platform web --output-dir "${out}"`, { stdio: "inherit", cwd: resolve(import.meta.dirname, "..") });

const nm = join(out, "assets/node_modules");
if (existsSync(nm)) renameSync(nm, join(out, "assets/vendor"));

const jsDir = join(out, "_expo/static/js/web");
for (const f of readdirSync(jsDir)) {
  const p = join(jsDir, f);
  const s = readFileSync(p, "utf8");
  if (s.includes("assets/node_modules/")) writeFileSync(p, s.replaceAll("assets/node_modules/", "assets/vendor/"));
}
console.log("mobile-sim exported");
