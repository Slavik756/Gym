import { readFile } from "node:fs/promises";
import path from "node:path";

const pages = { "index.html": "home", "schedule.html": "schedule", "booking.html": "booking" };
const headerMarker = "    <!-- shared-header -->";

export function renderHeader(template, page) {
  if (!Object.values(pages).includes(page)) throw new Error(`Unknown page: ${page}`);
  const values = {};
  const sections = { home: "home", about: "about", workouts: "workouts", memberships: "programs" };
  for (const [key, section] of Object.entries(sections)) {
    values[key + "-href"] = (page === "home" ? "" : "./index.html") + "#" + section;
    values[key + "-state"] = page === "home" ? ` data-section="${section}"` : "";
  }
  for (const key of ["home", "schedule", "booking"]) {
    values[key + "-active"] = key === page ? " active" : "";
    values[key + "-state"] = (values[key + "-state"] || "") + (key === page ? ' aria-current="page"' : "");
  }
  return template.trimEnd().replace(/\{\{([\w-]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown header placeholder: ${key}`);
    return values[key];
  });
}

export function injectHeader(source, template, filename) {
  const page = pages[path.basename(filename)];
  if (!page) throw new Error(`Unknown HTML entry: ${filename}`);
  if (source.split(headerMarker).length !== 2) {
    throw new Error(`${filename} must contain exactly one shared-header marker.`);
  }
  const html = source.replace(headerMarker, renderHeader(template, page));
  if (/\{\{|shared-header/.test(html)) throw new Error(`Unresolved template in ${filename}.`);
  return html;
}

export function sharedHeaderPlugin(sourceRoot) {
  const templatePath = path.join(sourceRoot, "partials/header.html");
  return {
    name: "powergym-shared-header",
    transformIndexHtml: {
      // Insert before Vite resolves image URLs and processes the HTML entries.
      order: "pre",
      async handler(html, context) {
        const template = await readFile(templatePath, "utf8");
        return injectHeader(html, template, context.filename);
      },
    },
    hotUpdate(context) {
      if (this.environment.name !== "client" || path.resolve(context.file) !== path.resolve(templatePath)) return;
      this.environment.hot.send({ type: "full-reload", path: "*" });
      return [];
    },
  };
}
