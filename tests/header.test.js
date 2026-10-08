import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { injectHeader, renderHeader, sharedHeaderPlugin } from "../scripts/shared-header.mjs";

const template = await readFile(new URL("../src/partials/header.html", import.meta.url), "utf8");
const source = "<body>\n    <!-- shared-header -->\n<main></main></body>";
const expectedKeys = ["home", "about", "workouts", "memberships", "schedule", "booking"];

test("every page gets all six links and exactly one current page", () => {
  for (const page of ["home", "schedule", "booking"]) {
    const html = renderHeader(template, page);
    assert.deepEqual([...html.matchAll(/data-nav-key="([^"]+)"/g)].map((match) => match[1]), expectedKeys);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, new RegExp(`data-nav-key="${page}"[^>]+aria-current="page"`));
    assert.doesNotMatch(html, /\{\{/);
  }
});

test("home section links stay on the home page only", () => {
  assert.match(renderHeader(template, "home"), /href="#programs" data-section="programs"/);
  assert.match(renderHeader(template, "schedule"), /href="\.\/index\.html#programs"/);
  assert.doesNotMatch(renderHeader(template, "booking"), /data-section=/);
});

test("HTML injection rejects missing and repeated template markers", () => {
  assert.throws(() => injectHeader("<body></body>", template, "index.html"), /exactly one/);
  assert.throws(() => injectHeader(source + source, template, "index.html"), /exactly one/);
  assert.doesNotMatch(injectHeader(source, template, "booking.html"), /shared-header|\{\{/);
});

test("unknown pages and placeholders fail loudly", () => {
  assert.throws(() => renderHeader(template, "unknown"), /Unknown page/);
  assert.throws(() => renderHeader("{{typo}}", "home"), /Unknown header placeholder/);
  assert.throws(() => injectHeader(source, template, "unknown.html"), /Unknown HTML entry/);
});

test("the shared-header plugin runs before Vite's HTML processing", async () => {
  const plugin = sharedHeaderPlugin(fileURLToPath(new URL("../src", import.meta.url)));
  assert.equal(plugin.transformIndexHtml.order, "pre");
  const html = await plugin.transformIndexHtml.handler(source, { filename: "schedule.html" });
  assert.match(html, /data-nav-key="schedule"[^>]+aria-current="page"/);
  assert.match(html, /src="\/icons\/logo-mark\.svg"/);
});

test("only changes to the shared header trigger a full dev reload", () => {
  const messages = [];
  const plugin = sharedHeaderPlugin("src");
  const context = { environment: { name: "client", hot: { send: (message) => messages.push(message) } } };
  assert.equal(plugin.hotUpdate.call(context, { file: "src/assets/scripts/app.js" }), undefined);
  assert.equal(plugin.hotUpdate.call({ environment: { name: "ssr" } }, { file: "src/partials/header.html" }), undefined);
  assert.deepEqual(plugin.hotUpdate.call(context, { file: "src/partials/header.html" }), []);
  assert.deepEqual(messages, [{ type: "full-reload", path: "*" }]);
});
