import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src", "db", "migrations");
const dest = path.join(root, "dist", "db", "migrations");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (f.endsWith(".sql")) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }
}
console.log("Copied SQL migrations to dist/db/migrations");
