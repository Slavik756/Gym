import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, filterClasses, getUpcomingSession, isClassDate, isFutureSlot, localDateKey, parseSlot } from "../src/assets/scripts/data/catalog.js";

test("a session that has just started rolls to the next week", () => {
  const item = CLASSES.find((item) => item.id === "strength-mon");
  const now = new Date(2026, 9, 5, 9, 0);
  assert.equal(getUpcomingSession(item, now).date, "2026-10-12");
  assert.equal(getUpcomingSession(item, new Date(2026, 9, 5, 8, 59)).date, "2026-10-05");
});

test("weekly recurrence crosses month and year boundaries", () => {
  const item = CLASSES.find((item) => item.id === "strength-mon");
  const session = getUpcomingSession(item, new Date(2026, 11, 31, 12, 0));
  assert.equal(session.date, "2027-01-04");
  assert.equal(session.start.getHours(), 9);
});

test("calendar dates reject overflow, malformed values and invalid times", () => {
  for (const [date, time] of [["2026-02-30", "12:00"], ["2026-13-01", "12:00"], ["2026-10-08", "24:00"], ["2026-10-08", "12:60"], ["2026-1-01", "12:00"]]) {
    assert.equal(parseSlot(date, time), null);
  }
  assert.ok(parseSlot("2028-02-29", "12:00"));
});

test("local calendar date is preserved without UTC shifting", () => {
  const date = new Date(2026, 9, 8, 0, 1);
  assert.equal(localDateKey(date), "2026-10-08");
  assert.equal(parseSlot("2026-10-08", "00:01").getTime(), date.getTime());
});

test("a class booking must match its recurring day and booking window", () => {
  const item = CLASSES.find((item) => item.id === "strength-mon");
  const now = new Date(2026, 9, 8, 12, 0);
  assert.equal(isClassDate(item, "2026-10-12", now), true);
  assert.equal(isClassDate(item, "2026-10-13", now), false);
  assert.equal(isClassDate(item, "2026-10-05", now), false);
  assert.equal(isClassDate(item, "2026-11-09", now), false);
});

test("combined filters return a specific result and an honest empty state", () => {
  assert.deepEqual(filterClasses(CLASSES, { day: "1", category: "Strength" }).map((item) => item.id), ["strength-mon"]);
  assert.deepEqual(filterClasses(CLASSES, { day: "1", category: "Yoga" }), []);
  assert.equal(filterClasses(CLASSES).length, CLASSES.length);
});

test("past and exact-current slots cannot be booked", () => {
  const now = new Date(2026, 9, 8, 12, 0);
  assert.equal(isFutureSlot("2026-10-08", "12:00", now), false);
  assert.equal(isFutureSlot("2026-10-08", "12:01", now), true);
  assert.equal(isFutureSlot("2026-10-07", "19:00", now), false);
});
