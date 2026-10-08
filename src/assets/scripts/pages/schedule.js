import { CLASSES, PLANS, getUpcomingSession, formatDate, filterClasses } from '../data/catalog.js';
import { readBookings, removeBooking, getStorageStatus } from '../services/booking-storage.js';

const dayButtons = [...document.querySelectorAll('[data-day]')];
const categoryFilter = document.getElementById('categoryFilter');
const classGrid = document.getElementById('classGrid');
const resultsCount = document.getElementById('resultsCount');
const scheduleEmpty = document.getElementById('scheduleEmpty');
const resetFilters = document.getElementById('resetFilters');
const savedSessionList = document.getElementById('savedSessionList');
const savedEmpty = document.getElementById('savedEmpty');
const savedStatus = document.getElementById('savedStatus');
let selectedDay = 'all';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function categoryLabel(value) {
  return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function savedBookings() {
  try {
    const status = getStorageStatus();
    if (!status.ok) {
      setStatus(status.error, true);
      return [];
    }
    const bookings = readBookings();
    return Array.isArray(bookings) ? bookings.filter((booking) => ['class', 'intro'].includes(booking.kind)) : [];
  } catch {
    setStatus('Your saved sessions could not be loaded. Please refresh and try again.', true);
    return [];
  }
}

function setStatus(message, isError = false) {
  savedStatus.textContent = message;
  savedStatus.classList.toggle('is-error', isError);
}

function classCard(classItem, session, bookings) {
  const isBooked = bookings.some((booking) => booking.kind === 'class' && booking.classId === classItem.id && booking.date === session.date);
  const article = element('article', `class-card${isBooked ? ' is-booked' : ''}`);
  const top = element('div', 'class-card-top');
  top.append(element('span', 'class-category', categoryLabel(classItem.category)), element('span', 'class-duration', `${classItem.duration} min`));
  const title = element('h3', '', classItem.title);
  const coach = element('p', 'class-coach', `With ${classItem.trainer}`);
  const sessionInfo = element('div', 'class-session');
  const dateAndTime = element('div');
  const date = element('time', 'class-date', formatDate(session.date, { weekday: 'short', month: 'short', day: 'numeric' }));
  date.dateTime = session.date;
  const time = element('time', 'class-time', session.time);
  time.dateTime = `${session.date}T${session.time}`;
  dateAndTime.append(date, time);
  sessionInfo.append(dateAndTime, element('span', 'class-level', classItem.level));
  const bottom = element('div', 'class-card-bottom');
  bottom.append(element('span', 'class-capacity', `${classItem.seats}-person class`));
  if (classItem.seats > 0 || isBooked) {
    const link = element('a', `btn ${isBooked ? 'btn-outline-dark' : 'btn-dark'}`, isBooked ? 'Saved ✓' : 'Book class ↗');
    link.href = isBooked ? '#my-sessions' : `./booking.html?${new URLSearchParams({ class: classItem.id, date: session.date })}`;
    link.setAttribute('aria-label', isBooked ? `${classItem.title} is saved. View your saved sessions` : `Book ${classItem.title} on ${formatDate(session.date)} at ${session.time}`);
    bottom.append(link);
  } else {
    bottom.append(element('span', 'class-unavailable', 'Fully booked'));
  }
  article.append(top, title, coach, sessionInfo, bottom);
  return article;
}

function renderClasses() {
  const now = new Date();
  const bookings = savedBookings();
  const matching = filterClasses(CLASSES, { day: selectedDay, category: categoryFilter.value })
    .map((classItem) => ({ classItem, session: getUpcomingSession(classItem, now) }))
    .sort((a, b) => a.session.start - b.session.start || a.classItem.title.localeCompare(b.classItem.title));
  classGrid.replaceChildren(...matching.map(({ classItem, session }) => classCard(classItem, session, bookings)));
  resultsCount.textContent = `${matching.length} ${matching.length === 1 ? 'session' : 'sessions'}${selectedDay !== 'all' || categoryFilter.value !== 'all' ? ' matching your filters' : ' to make your week stronger'}`;
  scheduleEmpty.hidden = matching.length > 0;
  resetFilters.hidden = selectedDay === 'all' && categoryFilter.value === 'all';
}

function reset() {
  selectedDay = 'all';
  categoryFilter.value = 'all';
  updateDayButtons();
  renderClasses();
}

function updateDayButtons() {
  for (const button of dayButtons) {
    const selected = button.dataset.day === selectedDay;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

function savedCard(booking) {
  const start = new Date(`${booking.date}T${booking.time || '00:00'}`);
  const past = start.getTime() < Date.now();
  const classItem = booking.kind === 'class' ? CLASSES.find((item) => item.id === booking.classId) : null;
  const title = booking.kind === 'intro' ? 'Introductory visit' : booking.title || classItem?.title || 'Group class';
  const article = element('article', `saved-session${past ? ' is-past' : ''}`);
  const date = element('div', 'saved-session-date');
  date.append(element('strong', '', formatDate(booking.date, { weekday: undefined, month: undefined, day: 'numeric' })), element('span', '', formatDate(booking.date, { weekday: undefined, day: undefined, month: 'short' })));
  const content = element('div');
  const details = element('p', 'saved-session-detail');
  details.append(element('span', '', formatDate(booking.date, { weekday: 'long', month: undefined, day: undefined })), element('span', '', `${booking.time}${classItem ? ` · ${classItem.duration} min` : booking.kind === 'intro' ? ' · 30 min' : ''}`));
  if (classItem) details.append(element('span', '', `With ${classItem.trainer}`));
  if (booking.kind === 'intro') {
    const plan = Object.hasOwn(PLANS, booking.plan) ? PLANS[booking.plan] : null;
    if (plan) details.append(element('span', '', `${plan.name} membership${['monthly', 'annual'].includes(booking.billing) ? ` · ${booking.billing === 'annual' ? 'Annual' : 'Monthly'} billing` : ''}`));
    else details.append(element('span', '', 'Club tour & goal consultation'));
  }
  content.append(element('h3', '', title), details);
  const actions = element('div', 'saved-session-actions');
  actions.append(element('span', 'saved-session-badge', past ? 'PAST SESSION' : 'SAVED'));
  const cancelButton = element('button', 'cancel-session', past ? 'Remove' : 'Cancel session');
  cancelButton.type = 'button';
  cancelButton.dataset.cancel = booking.id;
  cancelButton.setAttribute('aria-label', `${past ? 'Remove' : 'Cancel'} ${title} on ${formatDate(booking.date)} at ${booking.time}`);
  actions.append(cancelButton);
  article.append(date, content, actions);
  return article;
}

function renderSaved() {
  const now = Date.now();
  const bookings = savedBookings().sort((a, b) => {
    const aStart = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const bStart = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return Number(aStart < now) - Number(bStart < now) || aStart - bStart;
  });
  savedSessionList.replaceChildren(...bookings.map(savedCard));
  savedEmpty.hidden = bookings.length > 0;
  document.getElementById('savedCount').textContent = bookings.filter((booking) => new Date(`${booking.date}T${booking.time || '00:00'}`).getTime() >= Date.now()).length;
}

for (const button of dayButtons) {
  button.addEventListener('click', () => {
    selectedDay = button.dataset.day;
    updateDayButtons();
    renderClasses();
  });
}
categoryFilter.addEventListener('change', renderClasses);
resetFilters.addEventListener('click', reset);
document.getElementById('emptyReset').addEventListener('click', reset);
savedSessionList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cancel]');
  if (!button) return;
  const booking = savedBookings().find((item) => item.id === button.dataset.cancel);
  if (!booking) {
    renderSaved();
    renderClasses();
    return;
  }
  let result;
  try {
    result = removeBooking(booking.id);
  } catch {
    result = { ok: false };
  }
  if (!result.ok) {
    setStatus('This session could not be cancelled. Please check that browser storage is available and try again.', true);
    return;
  }
  setStatus(`${booking.title || 'Your session'} has been removed from your saved sessions.`);
  renderSaved();
  renderClasses();
  document.getElementById('saved-title').focus({ preventScroll: true });
});

window.addEventListener('storage', () => {
  renderSaved();
  renderClasses();
});
window.addEventListener('pageshow', () => {
  renderSaved();
  renderClasses();
});

const categories = [...new Set(CLASSES.map((classItem) => classItem.category))];
for (const category of categories) {
  const option = element('option', '', categoryLabel(category));
  option.value = category;
  categoryFilter.append(option);
}
const requestedCategory = new URLSearchParams(window.location.search).get('category');
const initialCategory = categories.find((category) => category.toLowerCase() === requestedCategory?.trim().toLowerCase());
if (initialCategory) categoryFilter.value = initialCategory;
document.getElementById('weeklyClassCount').textContent = CLASSES.length;
document.getElementById('disciplineCount').textContent = categories.length;
renderSaved();
renderClasses();
