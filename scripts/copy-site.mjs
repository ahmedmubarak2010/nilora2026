import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist");
const excluded = new Set([
  ".git", ".vercel", "node_modules", "dist", "dashboard", "scripts",
  "package.json", "package-lock.json", "vite.config.js", "tsconfig.json"
]);

await mkdir(output, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  await cp(path.join(root, entry.name), path.join(output, entry.name), {
    recursive: true,
    force: true,
  });
}
console.log("Copied the existing NILORA static site and the compiled React dashboard to dist/.");
