import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const outputRoot = path.join(projectRoot, "dist");

export async function build() {
  await viteBuild({ configFile: path.join(projectRoot, "vite.config.js") });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
