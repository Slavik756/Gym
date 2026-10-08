import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-08T12:00:00+02:00") });
});

async function completeDetails(page) {
  await page.locator("#booking-name").fill("Portfolio Visitor");
  await page.locator("#booking-email").fill("visitor@example.com");
  await page.getByRole("button", { name: "Review your session" }).click();
  await expect(page.locator("#review-panel")).toBeVisible();
}

const navigationLabels = ["Home", "About", "Workouts", "Memberships", "Schedule", "Book a visit"];

async function openNavigation(page) {
  const toggle = page.locator("#burger");
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") !== "true") {
    await toggle.click();
  }
}

async function expectCompleteNavigation(page, activePage) {
  await openNavigation(page);
  const links = page.locator("#mainNav .main-nav-list .nav-item");
  await expect(links).toHaveText(navigationLabels);
  for (const link of await links.all()) await expect(link).toBeVisible();
  if (activePage) {
    const currentPage = page.locator('#mainNav .main-nav-list [aria-current="page"]');
    await expect(currentPage).toHaveCount(1);
    await expect(currentPage).toHaveText(activePage);
  }
  const isHome = new URL(page.url()).pathname.endsWith("/index.html");
  for (const [name, section] of [["About", "about"], ["Workouts", "workouts"], ["Memberships", "programs"]]) {
    const expected = isHome ? `#${section}` : `./index.html#${section}`;
    await expect(page.locator("#mainNav").getByRole("link", { name, exact: true })).toHaveAttribute("href", expected);
  }
}

for (const width of [1440, 390]) {
  test(`navigation keeps every destination across pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, activePage] of [["/index.html", "Home"], ["/schedule.html", "Schedule"], ["/booking.html", "Book a visit"]]) {
      await page.goto(route);
      await expectCompleteNavigation(page, activePage);
    }

    await page.goto("/schedule.html");
    await expectCompleteNavigation(page, "Schedule");
    await page.locator("#mainNav .main-nav-list").getByRole("link", { name: "Book a visit", exact: true }).click();
    await expect(page).toHaveURL(/\/booking\.html$/);
    if (width === 390) await expect(page.locator("#burger")).toHaveAttribute("aria-expanded", "false");
    await expectCompleteNavigation(page, "Book a visit");

    await page.locator("#mainNav").getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/index\.html(?:#home)?$/);
    await expectCompleteNavigation(page, "Home");
    await page.locator("#mainNav").getByRole("link", { name: "Memberships", exact: true }).click();
    await expect(page).toHaveURL(/\/index\.html#programs$/);
    await expect(page.locator("#programs")).toBeVisible();
    await expect(page.locator('#mainNav .main-nav-list [aria-current="location"]')).toHaveText("Memberships");
    if (width === 390) await expect(page.locator("#burger")).toHaveAttribute("aria-expanded", "false");

    await page.goto("/booking.html");
    await expectCompleteNavigation(page, "Book a visit");
    await page.locator("#mainNav").getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/index\.html#about$/);
    await expect(page.locator("#about")).toBeVisible();
    await expect(page.locator('#mainNav .main-nav-list [aria-current="location"]')).toHaveText("About");
    await expectCompleteNavigation(page);
  });
}

test("header stays fixed while JavaScript modules load", async ({ page }) => {
  const scriptAsset = /\/assets\/[^/]+\.js(?:\?.*)?$/;
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    let releaseScripts;
    let heldRequests = 0;
    const scriptsReady = new Promise((resolve) => { releaseScripts = resolve; });
    const holdScripts = async (route) => {
      heldRequests++;
      await scriptsReady;
      await route.continue();
    };
    await page.route(scriptAsset, holdScripts);
    try {
      await page.goto("/schedule.html", { waitUntil: "commit" });
      await expect.poll(() => heldRequests).toBeGreaterThan(0);
      await expect(page.locator(".header")).toHaveCSS("position", "fixed");
      const selectors = [".header", ".header .logo"];
      const before = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()));
      for (const box of before) expect(box).not.toBeNull();
      if (width === 1440) {
        const links = page.locator("#mainNav .nav-item");
        await expect(links).toHaveText(navigationLabels);
        for (const link of await links.all()) await expect(link).toBeVisible();
      } else {
        await expect(page.locator("#burger")).toBeVisible();
        await expect(page.locator("#mainNav")).toBeHidden();
      }
      releaseScripts();
      await page.waitForLoadState("load");
      await expect(page.locator(".header")).toHaveCSS("position", "fixed");
      const after = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()));
      for (let index = 0; index < before.length; index++) {
        expect(after[index]).not.toBeNull();
        for (const key of ["x", "y", "width", "height"]) {
          expect(Math.abs(after[index][key] - before[index][key]), `${selectors[index]} ${key} shifted at ${width}px`).toBeLessThanOrEqual(0.5);
        }
      }
    } finally {
      releaseScripts();
      await page.unroute(scriptAsset, holdScripts);
    }
  }
});

test("booking navigation preserves layout before the form becomes interactive", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const headerSelectors = [".header", ".header .logo"];
  const bookingSelectors = [...headerSelectors, ".booking-heading", ".booking-form-card", ".booking-footer"];
  const entryBundle = /\/assets\/booking-(?!storage-)[^/]+\.js(?:\?.*)?$/;
  async function captureLayout(selectors) {
    const entries = await Promise.all(selectors.map(async (selector) => [selector, await page.locator(selector).boundingBox()]));
    for (const [selector, box] of entries) expect(box, `${selector} must be rendered`).not.toBeNull();
    return Object.fromEntries(entries);
  }
  function expectStableLayout(before, after, stage) {
    for (const [selector, box] of Object.entries(before)) {
      for (const key of ["x", "y", "width", "height"]) {
        expect(Math.abs(after[selector][key] - box[key]), `${selector} ${key} shifted during ${stage}`).toBeLessThanOrEqual(0.5);
      }
    }
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/index.html#home");
    const home = await captureLayout(headerSelectors);
    let releaseEntry;
    let heldRequests = 0;
    const entryReady = new Promise((resolve) => { releaseEntry = resolve; });
    const holdEntry = async (route) => {
      heldRequests++;
      await entryReady;
      await route.continue();
    };
    await page.route(entryBundle, holdEntry);
    try {
      if (width === 390) {
        await page.locator("#burger").click();
        await expect(page.locator("#burger")).toHaveAttribute("aria-expanded", "true");
        await expect(page.locator(".mobile-join")).toBeVisible();
        expectStableLayout(home, await captureLayout(headerSelectors), `opening the menu at ${width}px`);
      }
      const committed = page.waitForURL(/\/booking\.html$/, { waitUntil: "commit" });
      await page.locator(width === 390 ? ".mobile-join" : ".header-btn").click({ noWaitAfter: true });
      await committed;
      await expect.poll(() => heldRequests).toBeGreaterThan(0);
      const workspace = page.locator("#booking-workspace");
      await expect(workspace).toBeVisible();
      await expect(workspace).toHaveAttribute("inert", "");
      await expect(workspace).toHaveAttribute("aria-busy", "true");
      await expect(page.locator("#booking-fallback")).toBeHidden();
      const pending = await captureLayout(bookingSelectors);
      expectStableLayout(home, pending, `opening booking at ${width}px`);

      releaseEntry();
      await page.waitForLoadState("load");
      await expect(workspace).not.toHaveAttribute("inert", "");
      await expect(workspace).not.toHaveAttribute("aria-busy", "true");
      await expect(page.locator("#booking-fallback")).toBeHidden();
      expectStableLayout(pending, await captureLayout(bookingSelectors), `initializing booking at ${width}px`);
      await page.locator("#booking-name").fill("Layout Visitor");
      await expect(page.locator("#booking-name")).toHaveValue("Layout Visitor");
    } finally {
      releaseEntry();
      await page.unroute(entryBundle, holdEntry);
    }
  }
});

test("annual membership flows into a reviewable intro booking", async ({ page }) => {
  await page.goto("/index.html#programs");
  await page.getByRole("button", { name: "Annually" }).click();
  await expect(page.locator('[data-price="pro"]')).toHaveText("$39.17");
  await expect(page.locator('[data-plan-billing="pro"]')).toHaveText("$470 billed once per year");
  await page.locator('[data-plan-link="pro"]').click();
  await expect(page.locator("#plan-select")).toHaveValue("pro");
  await expect(page.locator("#billing-select")).toHaveValue("annual");
  await page.locator("#intro-date").fill("2026-10-09");
  await page.locator("#intro-date").dispatchEvent("change");
  await completeDetails(page);
  await expect(page.locator("#booking-review")).toContainText("$470 / year");
  await page.locator("#back-to-details").click();
  await expect(page.locator("#booking-name")).toHaveValue("Portfolio Visitor");
  await page.getByRole("button", { name: "Review your session" }).click();
  await page.locator("#confirm-booking").click();
  await expect(page.locator("#success-panel")).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem("powergym.bookings.v1"));
  expect(raw).not.toContain("visitor@example.com");
  expect(raw).not.toContain("Portfolio Visitor");
  await page.goto("/schedule.html#my-sessions");
  await expect(page.locator("#savedSessionList")).toContainText("Introductory visit");
  await page.locator("[data-cancel]").click();
  await expect(page.locator("#savedEmpty")).toBeVisible();
});

test("schedule filters support deep links, empty results and reset", async ({ page }) => {
  await page.goto("/schedule.html?category=Yoga");
  await expect(page.locator("#classGrid .class-card")).toHaveCount(2);
  await page.locator('[data-day="1"]').click();
  await expect(page.locator("#scheduleEmpty")).toBeVisible();
  await expect(page.locator("#resultsCount")).toContainText("0 sessions");
  await page.locator("#emptyReset").click();
  await expect(page.locator("#classGrid .class-card")).toHaveCount(12);
});

test("class booking persists, rejects a duplicate and can be cancelled", async ({ page }) => {
  await page.goto("/schedule.html");
  const link = page.locator("#classGrid .class-card-bottom a").first();
  const href = await link.getAttribute("href");
  await link.click();
  await completeDetails(page);
  await page.locator("#confirm-booking").click();
  await expect(page.locator("#success-panel")).toBeVisible();
  await page.goto("/schedule.html");
  await page.reload();
  await expect(page.locator("#savedSessionList .saved-session")).toHaveCount(1);
  await expect(page.locator(".class-card.is-booked")).toHaveCount(1);
  await page.goto(href.replace(/^\.\//, "/"));
  await page.locator("#booking-name").fill("Another Visitor");
  await page.locator("#booking-email").fill("other@example.com");
  await page.getByRole("button", { name: "Review your session" }).click();
  await expect(page.locator("#class-select-error")).toContainText("already saved");
  await page.goto("/schedule.html#my-sessions");
  await page.locator("[data-cancel]").click();
  await expect(page.locator("#savedSessionList .saved-session")).toHaveCount(0);
  await expect(page.locator(".class-card.is-booked")).toHaveCount(0);
});

test("form errors are inline and invalid query values recover safely", async ({ page }) => {
  await page.goto("/booking.html?class=missing&date=2026-02-30");
  await expect(page.locator("#booking-notice")).toContainText("could not be found");
  await page.getByRole("button", { name: "Review your session" }).click();
  await expect(page.locator("#class-select-error")).toContainText("Choose a class");
  await expect(page.locator("#booking-name")).toHaveAttribute("aria-invalid", "true");
  await page.goto("/booking.html?class=strength-mon&date=2026-10-05");
  await expect(page.locator("#booking-notice")).toContainText("no longer available");
  await expect(page.locator("#class-slot")).toContainText("Oct 12");
});

test("unavailable storage does not produce a fake confirmation", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "QuotaExceededError"); }; });
  await page.goto("/booking.html");
  await completeDetails(page);
  await page.locator("#confirm-booking").click();
  await expect(page.locator("#confirm-error")).toBeVisible();
  await expect(page.locator("#success-panel")).toBeHidden();
});

test("workout dialog traps focus and restores its trigger on Escape", async ({ page }) => {
  await page.goto("/index.html#workouts");
  const trigger = page.locator('[data-workout="Yoga"]');
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement.closest("dialog") !== null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("mobile menu hides closed links, handles Escape and survives resize", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/schedule.html");
  await expect(page.locator("#mainNav")).toHaveAttribute("inert", "");
  await page.locator("#burger").click();
  await expect(page.locator("#burger")).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#burger")).toBeFocused();
  await expect(page.locator("#mainNav")).toHaveAttribute("inert", "");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#mainNav")).not.toHaveAttribute("inert", "");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#burger").click();
  await page.locator(".mobile-join").click();
  await expect(page).toHaveURL(/booking\.html/);
});

test("pages fit small phones through wide desktops with no runtime errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1000, 1001, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/index.html", "/schedule.html", "/booking.html"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(size.content, route + " at " + width + "px").toBeLessThanOrEqual(size.viewport + 1);
      if (width >= 1001) {
        await expect(page.locator("#mainNav")).toBeVisible();
        await expect(page.locator("#burger")).toBeHidden();
        const [logo, nav, action] = await Promise.all([
          page.locator(".header .logo").boundingBox(),
          page.locator("#mainNav").boundingBox(),
          page.locator(".header-btn").boundingBox(),
        ]);
        for (const box of [logo, nav, action]) expect(box).not.toBeNull();
        expect(logo.x + logo.width, `${route}: logo overlaps navigation at ${width}px`).toBeLessThanOrEqual(nav.x + 1);
        expect(nav.x + nav.width, `${route}: navigation overlaps action at ${width}px`).toBeLessThanOrEqual(action.x + 1);
        expect(action.x + action.width, `${route}: header action overflows at ${width}px`).toBeLessThanOrEqual(width + 1);
      } else {
        await expect(page.locator("#burger")).toBeVisible();
        await expect(page.locator("#mainNav")).toHaveAttribute("inert", "");
      }
      if (route === "/schedule.html") {
        const icon = await page.locator(".schedule-help-icon").evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const ownStyle = getComputedStyle(element);
          const bars = ["::before", "::after"].map((pseudo) => {
            const style = getComputedStyle(element, pseudo);
            const matrix = new DOMMatrixReadOnly(style.transform);
            const width = parseFloat(style.width), height = parseFloat(style.height);
            const top = parseFloat(style.top), left = parseFloat(style.left);
            return {
              width, height, top, left,
              centerX: parseFloat(ownStyle.borderLeftWidth) + left + width / 2 + matrix.m41,
              centerY: parseFloat(ownStyle.borderTopWidth) + top + height / 2 + matrix.m42,
            };
          });
          return { width: bounds.width, height: bounds.height, innerWidth: element.clientWidth, innerHeight: element.clientHeight, text: element.textContent.trim(), bars };
        });
        const expectedSize = width <= 580 ? 34 : 42;
        expect([icon.width, icon.height]).toEqual([expectedSize, expectedSize]);
        expect(icon.text).toBe("");
        expect(icon.bars.map(({ width, height }) => [width, height])).toEqual([[14, 2], [2, 14]]);
        for (const bar of icon.bars) {
          expect(bar.top).toBeCloseTo(icon.innerHeight / 2);
          expect(bar.left).toBeCloseTo(icon.innerWidth / 2);
          expect(bar.centerX).toBeCloseTo(icon.width / 2);
          expect(bar.centerY).toBeCloseTo(icon.height / 2);
        }
        if (width <= 580) {
          const [description, link] = await Promise.all([
            page.locator(".schedule-help p").boundingBox(),
            page.locator(".schedule-help > a").boundingBox(),
          ]);
          expect(description.width, "help text must not collapse beside the booking link").toBeGreaterThan(170);
          expect(link.y).toBeGreaterThanOrEqual(description.y + description.height);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test("a visitor without JavaScript sees a useful fallback", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of ["/index.html", "/schedule.html", "/booking.html"]) {
    await page.goto(route);
    const links = page.locator("#mainNav .nav-item");
    await expect(links).toHaveText(navigationLabels);
    for (const link of await links.all()) await expect(link).toBeVisible();
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    expect(size.content, route + " without JavaScript at 390px").toBeLessThanOrEqual(size.viewport + 1);
  }
  await expect(page.locator("#booking-fallback")).toBeVisible();
  await page.locator("#booking-fallback a").first().click();
  await expect(page).toHaveURL(/index\.html#workouts/);
  await context.close();
});
