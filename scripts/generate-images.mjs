// Sinh file SVG minh họa từ content/src/icons.mjs vào public/images/vocab/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { icons, iconSvg } from "../content/src/icons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "images", "vocab");
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const key of Object.keys(icons)) {
  fs.writeFileSync(path.join(outDir, `${key}.svg`), iconSvg(key), "utf8");
  n++;
}
console.log(`Đã sinh ${n} hình SVG vào ${path.relative(root, outDir)}`);
