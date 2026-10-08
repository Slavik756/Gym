import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { build, outputRoot, projectRoot } from "./build.mjs";

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  }))).flat();
}

await build();
const scripts = (await filesUnder(path.join(projectRoot, "src/assets/scripts"))).filter((file) => file.endsWith(".js"));
const tooling = (await filesUnder(path.join(projectRoot, "scripts"))).filter((file) => file.endsWith(".mjs"));
for (const file of [...scripts, ...tooling, path.join(projectRoot, "vite.config.js"), path.join(projectRoot, "playwright.config.js")]) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(1);
  const source = await readFile(file, "utf8");
  for (const [, reference] of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) {
    await readFile(path.resolve(path.dirname(file), reference));
  }
}

const expectedKeys = ["home", "about", "workouts", "memberships", "schedule", "booking"];
for (const page of ["index.html", "schedule.html", "booking.html"]) {
  const source = await readFile(path.join(outputRoot, page), "utf8");
  const keys = [...source.matchAll(/data-nav-key="([^"]+)"/g)].map((match) => match[1]);
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) throw new Error(`Inconsistent navigation in ${page}`);
  const header = source.match(/<header\b[\s\S]*?<\/header>/)?.[0] || "";
  if ((header.match(/aria-current="page"/g) || []).length !== 1) throw new Error(`Missing active navigation in ${page}`);
  for (const [, reference] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|data:)/.test(reference)) continue;
    const url = new URL(reference, "http://build.local/" + page);
    const target = path.resolve(outputRoot, "." + decodeURIComponent(url.pathname));
    const relative = path.relative(outputRoot, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Reference outside build: ${reference}`);
    const content = await readFile(target, "utf8");
    if (url.hash && path.extname(target) === ".html") {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!content.includes('id="' + id + '"')) throw new Error(`Broken anchor ${reference} in ${page}`);
    }
  }
}
console.log(`Checked ${scripts.length} browser modules, tooling, shared navigation and all local page links/assets.`);
