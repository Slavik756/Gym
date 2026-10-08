import test from "node:test";
import assert from "node:assert/strict";
import { createBookingStore } from "../src/assets/scripts/services/booking-storage.js";

const now = new Date(2026, 9, 8, 12, 0);
const session = { kind: "class", classId: "strength-mon", title: "Strength Foundations", date: "2026-10-12", time: "09:00" };
function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
}

test("a booking survives a new store instance without storing contact fields", () => {
  const storage = memoryStorage();
  const first = createBookingStore(() => storage);
  assert.equal(first.saveBooking({ ...session, name: "Test Person", email: "person@example.com" }, now).ok, true);
  const saved = createBookingStore(() => storage).readBookings();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].classId, "strength-mon");
  assert.equal(JSON.stringify([...storage.data.values()]).includes("person@example.com"), false);
  assert.equal("name" in saved[0], false);
});

test("duplicates are idempotent and cancelling one session preserves others", () => {
  const store = createBookingStore(() => storage);
  const storage = memoryStorage();
  const first = store.saveBooking(session, now);
  const duplicate = store.saveBooking(session, now);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.booking.id, first.booking.id);
  store.saveBooking({ ...session, date: "2026-10-19" }, now);
  assert.equal(store.removeBooking(first.booking.id).ok, true);
  assert.equal(store.readBookings().length, 1);
  assert.equal(store.readBookings()[0].date, "2026-10-19");
});

test("intro visits keep valid tariff metadata and reject inherited plan keys", () => {
  const storage = memoryStorage();
  const store = createBookingStore(() => storage);
  const intro = { kind: "intro", date: "2026-10-09", time: "12:00", plan: "pro", billing: "annual" };
  assert.equal(store.saveBooking(intro, now).ok, true);
  assert.equal(store.readBookings()[0].plan, "pro");
  assert.equal(store.saveBooking({ ...intro, date: "2026-10-10", plan: "__proto__" }, now).ok, false);
});

test("invalid class dates and past slots cannot reach storage", () => {
  const storage = memoryStorage();
  const store = createBookingStore(() => storage);
  assert.equal(store.saveBooking({ ...session, date: "2026-10-13" }, now).ok, false);
  assert.equal(store.saveBooking({ ...session, date: "2026-10-05" }, now).ok, false);
  assert.equal(storage.data.size, 0);
});

test("storage exceptions never return a false saved or cancelled result", () => {
  const store = createBookingStore(() => { throw new Error("Access denied"); });
  assert.deepEqual(store.readBookings(), []);
  assert.equal(store.saveBooking(session, now).ok, false);
  assert.equal(store.removeBooking("anything").ok, false);
});

test("quota errors and corrupted data preserve the original stored value", () => {
  const storage = memoryStorage();
  storage.setItem("powergym.bookings.v1", "broken");
  const store = createBookingStore(() => storage);
  assert.equal(store.saveBooking(session, now).ok, false);
  assert.equal(storage.getItem("powergym.bookings.v1"), "broken");
  const quotaStore = createBookingStore(() => ({ getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } }));
  assert.equal(quotaStore.saveBooking(session, now).ok, false);
});

test("malformed saved sessions are ignored and stored personal fields are removed", () => {
  const storage = memoryStorage();
  storage.setItem("powergym.bookings.v1", JSON.stringify({ version: 1, bookings: [
    { ...session, id: "valid", email: "old@example.com" },
    { ...session, id: "bad-date", date: "2026-99-99", time: "99:99" },
    { ...session, id: "bad-class", classId: "missing" },
  ] }));
  const store = createBookingStore(() => storage);
  assert.equal(store.readBookings().length, 1);
  assert.equal("email" in store.readBookings()[0], false);
});

test("unreadable storage can be distinguished from an empty session list", () => {
  const storage = memoryStorage();
  const store = createBookingStore(() => storage);
  assert.equal(store.getStorageStatus().ok, true);
  storage.setItem("powergym.bookings.v1", "not-json");
  assert.equal(store.getStorageStatus().ok, false);
});
