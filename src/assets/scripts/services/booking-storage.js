import { CLASSES, INTRO_TIMES, PLANS, isClassDate, isFutureSlot, localDateKey, parseSlot } from "../data/catalog.js";

const STORAGE_KEY = "powergym.bookings.v1";
const STORAGE_ERROR = "Your browser could not save this change. Check site storage permissions or clear this site's saved data and try again.";

function normalizeSavedBooking(value) {
  if (!value || typeof value.id !== "string" || !value.id || !parseSlot(value.date, value.time)) return null;
  const shared = { id: value.id, date: value.date, time: value.time, createdAt: typeof value.createdAt === "string" ? value.createdAt : "" };
  if (value.kind === "class") {
    const item = CLASSES.find((item) => item.id === value.classId);
    if (!item || item.time !== value.time) return null;
    return { ...shared, kind: "class", classId: item.id, title: item.title };
  }
  if (value.kind === "intro" && Object.hasOwn(PLANS, value.plan) && ["monthly", "annual"].includes(value.billing) && INTRO_TIMES.includes(value.time)) {
    return { ...shared, kind: "intro", title: "Introductory visit", plan: value.plan, billing: value.billing };
  }
  return null;
}

export function createBookingStore(getStorage) {
  function load() {
    const source = getStorage().getItem(STORAGE_KEY);
    if (source === null) return [];
    const saved = JSON.parse(source);
    if (saved.version !== 1 || !Array.isArray(saved.bookings)) throw new Error("Invalid booking storage");
    return saved.bookings.map(normalizeSavedBooking).filter(Boolean);
  }

  function write(bookings) {
    getStorage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, bookings }));
  }

  function readBookings() {
    try { return load(); } catch { return []; }
  }

  function getStorageStatus() {
    try { load(); return { ok: true }; }
    catch { return { ok: false, error: "Saved sessions could not be read in this browser. Check site storage permissions or clear this site's saved data." }; }
  }

  function saveBooking(input, now = new Date()) {
    if (!input || !isFutureSlot(input.date, input.time, now)) return { ok: false, error: "Choose a session that has not started yet." };
    if (input.kind === "class") {
      const item = CLASSES.find((item) => item.id === input.classId);
      if (!item || input.time !== item.time || !isClassDate(item, input.date, now)) return { ok: false, error: "This class date is unavailable. Please choose a session from the schedule." };
    } else if (input.kind === "intro") {
      const limit = new Date(now);
      limit.setDate(limit.getDate() + 30);
      if (!INTRO_TIMES.includes(input.time) || input.date > localDateKey(limit) || !Object.hasOwn(PLANS, input.plan) || !["monthly", "annual"].includes(input.billing)) {
        return { ok: false, error: "Choose a valid intro date, time and membership option." };
      }
    } else return { ok: false, error: "Choose a class or an introductory visit." };

    try {
      const bookings = load();
      const duplicate = bookings.find((item) => item.kind === input.kind && item.date === input.date && item.time === input.time && (input.kind !== "class" || item.classId === input.classId));
      if (duplicate) return { ok: true, booking: duplicate, duplicate: true };
      const booking = {
        id: globalThis.crypto?.randomUUID?.() ?? `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: input.kind,
        title: input.kind === "class" ? CLASSES.find((item) => item.id === input.classId).title : "Introductory visit",
        date: input.date,
        time: input.time,
        createdAt: now.toISOString(),
        ...(input.kind === "class" ? { classId: input.classId } : { plan: input.plan, billing: input.billing }),
      };
      write([...bookings, booking]);
      return { ok: true, booking, duplicate: false };
    } catch { return { ok: false, error: STORAGE_ERROR }; }
  }

  function removeBooking(id) {
    try {
      write(load().filter((item) => item.id !== id));
      return { ok: true };
    } catch { return { ok: false, error: STORAGE_ERROR }; }
  }

  return { readBookings, saveBooking, removeBooking, getStorageStatus };
}

const store = createBookingStore(() => window.localStorage);
export const { readBookings, saveBooking, removeBooking, getStorageStatus } = store;
