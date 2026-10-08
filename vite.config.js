import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { sharedHeaderPlugin } from "./scripts/shared-header.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = path.join(projectRoot, "src");

export default defineConfig({
  root: sourceRoot,
  base: "./",
  appType: "mpa",
  publicDir: path.join(projectRoot, "public"),
  input: {
    home: path.join(sourceRoot, "index.html"),
    schedule: path.join(sourceRoot, "schedule.html"),
    booking: path.join(sourceRoot, "booking.html"),
  },
  plugins: [sharedHeaderPlugin(sourceRoot)],
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: {
    outDir: path.join(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
