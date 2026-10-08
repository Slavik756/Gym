export const PLANS = Object.freeze({
  starter: { id: "starter", name: "Starter", monthly: 29, annual: 278 },
  pro: { id: "pro", name: "Pro", monthly: 49, annual: 470 },
  elite: { id: "elite", name: "Elite", monthly: 79, annual: 758 },
});

export const INTRO_TIMES = ["09:00", "12:00", "17:00", "19:00"];

export const CLASSES = [
  { id: "strength-mon", title: "Strength Foundations", category: "Strength", day: 1, time: "09:00", duration: 50, trainer: "Alex Morgan", level: "All levels", seats: 12 },
  { id: "boxing-mon", title: "Boxing Fundamentals", category: "Boxing", day: 1, time: "18:00", duration: 45, trainer: "Daniel Carter", level: "Beginner", seats: 10 },
  { id: "yoga-tue", title: "Morning Flow", category: "Yoga", day: 2, time: "07:30", duration: 50, trainer: "Sarah Wilson", level: "All levels", seats: 16 },
  { id: "cardio-tue", title: "Cardio Circuit", category: "Cardio", day: 2, time: "18:00", duration: 40, trainer: "Daniel Carter", level: "Intermediate", seats: 14 },
  { id: "pilates-wed", title: "Core & Control", category: "Pilates", day: 3, time: "08:00", duration: 45, trainer: "Sarah Wilson", level: "Beginner", seats: 12 },
  { id: "group-wed", title: "Full Body Club", category: "Group Fitness", day: 3, time: "18:30", duration: 50, trainer: "Alex Morgan", level: "All levels", seats: 20 },
  { id: "strength-thu", title: "Lift & Progress", category: "Strength", day: 4, time: "07:00", duration: 55, trainer: "Alex Morgan", level: "Intermediate", seats: 10 },
  { id: "yoga-thu", title: "Slow Down Yoga", category: "Yoga", day: 4, time: "19:00", duration: 60, trainer: "Sarah Wilson", level: "All levels", seats: 16 },
  { id: "boxing-fri", title: "Friday Fight Club", category: "Boxing", day: 5, time: "17:00", duration: 45, trainer: "Daniel Carter", level: "Intermediate", seats: 10 },
  { id: "group-fri", title: "Weekend Warm-Up", category: "Group Fitness", day: 5, time: "18:30", duration: 45, trainer: "Alex Morgan", level: "All levels", seats: 20 },
  { id: "cardio-sat", title: "Saturday Sweat", category: "Cardio", day: 6, time: "10:00", duration: 40, trainer: "Daniel Carter", level: "All levels", seats: 14 },
  { id: "pilates-sun", title: "Sunday Reset", category: "Pilates", day: 0, time: "10:00", duration: 50, trainer: "Sarah Wilson", level: "All levels", seats: 12 },
];

export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Construct local calendar dates without UTC conversion or silently overflowing dates.
export function parseSlot(dateKey, time = "00:00") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (year < 2000 || year > 2100 || hours > 23 || minutes > 59) return null;
  const date = new Date(year, month - 1, day, hours, minutes);
  return localDateKey(date) === dateKey && date.getHours() === hours && date.getMinutes() === minutes ? date : null;
}

export function isFutureSlot(dateKey, time, now = new Date()) {
  const date = parseSlot(dateKey, time);
  return date !== null && date > now;
}

export function getUpcomingSession(classItem, now = new Date()) {
  const date = new Date(now);
  const [hours, minutes] = classItem.time.split(":").map(Number);
  date.setDate(date.getDate() + (classItem.day - date.getDay() + 7) % 7);
  date.setHours(hours, minutes, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 7);
  return { date: localDateKey(date), time: classItem.time, start: date };
}

export function isClassDate(classItem, dateKey, now = new Date()) {
  const date = parseSlot(dateKey, classItem.time);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);
  limit.setHours(23, 59, 59, 999);
  return Boolean(date && date > now && date <= limit && date.getDay() === classItem.day);
}

export function formatDate(dateKey, options = {}) {
  const date = parseSlot(dateKey, "12:00");
  return date ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", ...options }).format(date) : "Choose a date";
}

export function filterClasses(classes, { day = "all", category = "all" } = {}) {
  return classes.filter((item) => (day === "all" || item.day === Number(day)) && (category === "all" || item.category === category));
}
