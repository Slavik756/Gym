import {
  CLASSES,
  PLANS,
  INTRO_TIMES,
  getUpcomingSession,
  formatDate,
  localDateKey,
  isFutureSlot,
  isClassDate,
} from "../data/catalog.js";
import { readBookings, saveBooking, removeBooking } from "../services/booking-storage.js";

const form = document.querySelector("#booking-form");
const kindInputs = [...form.querySelectorAll('input[name="kind"]')];
const classSelect = document.querySelector("#class-select");
const introDate = document.querySelector("#intro-date");
const introTime = document.querySelector("#intro-time");
const planSelect = document.querySelector("#plan-select");
const billingSelect = document.querySelector("#billing-select");
const nameInput = document.querySelector("#booking-name");
const emailInput = document.querySelector("#booking-email");
const goalSelect = document.querySelector("#booking-goal");
const experienceSelect = document.querySelector("#booking-experience");
const notice = document.querySelector("#booking-notice");
const detailsPanel = document.querySelector("#details-panel");
const reviewPanel = document.querySelector("#review-panel");
const successPanel = document.querySelector("#success-panel");
const detailsStep = document.querySelector("#step-details");
const reviewStep = document.querySelector("#step-review");
const confirmButton = document.querySelector("#confirm-booking");
const confirmError = document.querySelector("#confirm-error");
const cancelButton = document.querySelector("#cancel-booking");
const cancelError = document.querySelector("#cancel-error");
const today = new Date();
const lastVisitDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
const maximumDate = localDateKey(lastVisitDay);
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

let selectedClassDate = "";
let reviewedSession = null;
let savedSession = null;

function currentKind() {
  return kindInputs.find((input) => input.checked)?.value === "class" ? "class" : "intro";
}

function selectedClass() {
  return CLASSES.find((item) => item.id === classSelect.value);
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = !message;
}

function setError(input, message) {
  const output = document.getElementById(`${input.id}-error`);
  if (output) output.textContent = message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function clearErrors() {
  [classSelect, introDate, introTime, planSelect, billingSelect, nameInput, emailInput].forEach((input) => setError(input, ""));
  confirmError.textContent = "";
  confirmError.hidden = true;
}

function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
  return option;
}

function renderDefinitions(target, rows) {
  const fragment = document.createDocumentFragment();
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const definition = document.createElement("dd");
    term.textContent = label;
    definition.textContent = value;
    row.append(term, definition);
    fragment.append(row);
  });
  target.replaceChildren(fragment);
}

function classSlot() {
  const item = selectedClass();
  if (!item) return null;
  if (!selectedClassDate) selectedClassDate = getUpcomingSession(item).date;
  return { item, date: selectedClassDate, time: item.time };
}

function planPrice() {
  const plan = PLANS[planSelect.value];
  if (!plan) return "Choose a membership";
  return billingSelect.value === "annual"
    ? `${currency.format(plan.annual)} / year`
    : `${currency.format(plan.monthly)} / month`;
}

function updateIntroTimes() {
  const previous = introTime.value;
  let firstAvailable = "";
  [...introTime.options].forEach((option) => {
    option.disabled = !isFutureSlot(introDate.value, option.value);
    option.textContent = `${option.value}${option.disabled ? " — unavailable" : ""}`;
    if (!option.disabled && !firstAvailable) firstAvailable = option.value;
  });
  introTime.value = INTRO_TIMES.includes(previous) && isFutureSlot(introDate.value, previous) ? previous : firstAvailable;
}

function updateSummary() {
  const isClass = currentKind() === "class";
  document.querySelector("#class-fields").hidden = !isClass;
  document.querySelector("#intro-fields").hidden = isClass;
  classSelect.disabled = !isClass;
  [introDate, introTime, planSelect, billingSelect].forEach((input) => { input.disabled = isClass; });
  const title = document.querySelector("#summary-title");
  const description = document.querySelector("#summary-description");
  const rows = [];
  document.querySelector("#summary-kind").textContent = isClass ? "Group class" : "First visit";

  if (isClass) {
    const slot = classSlot();
    const slotOutput = document.querySelector("#class-slot");
    if (!slot) {
      title.textContent = "Find your next session.";
      description.textContent = "Strength, mobility or a little extra energy. Choose a class and see where it takes you.";
      slotOutput.textContent = "Select a class to see its next session.";
      rows.push(["Format", "Coach-led group training"], ["Booking", "Saved on this device"]);
    } else {
      title.textContent = slot.item.title;
      description.textContent = `A ${slot.item.duration}-minute session with ${slot.item.trainer}. Bring your energy; your coach will guide the work.`;
      const date = formatDate(slot.date);
      slotOutput.textContent = `${date} · ${slot.time}`;
      const detail = document.createElement("small");
      detail.textContent = `${slot.item.duration} min · ${slot.item.trainer} · ${slot.item.level}`;
      slotOutput.append(detail);
      rows.push(["Date", date], ["Time", `${slot.time} · local time`], ["Coach", slot.item.trainer], ["Level", slot.item.level], ["Duration", `${slot.item.duration} minutes`]);
    }
  } else {
    title.textContent = "Find your starting point.";
    description.textContent = "Meet the space, talk through your goals and see what training could look like for you.";
    rows.push(["Date", introDate.value ? formatDate(introDate.value) : "Choose a date"], ["Time", introTime.value ? `${introTime.value} · local time` : "Choose a time"], ["Duration", "30 minutes"], ["First visit", "Free"], ["Plan preference", `${PLANS[planSelect.value]?.name || "Starter"} · ${planPrice()}`]);
  }
  renderDefinitions(document.querySelector("#summary-details"), rows);
}

function sessionFromForm() {
  if (currentKind() === "class") {
    const slot = classSlot();
    return slot ? { kind: "class", classId: slot.item.id, title: slot.item.title, date: slot.date, time: slot.time } : null;
  }
  return { kind: "intro", title: "First visit", date: introDate.value, time: introTime.value, plan: planSelect.value, billing: billingSelect.value };
}

function validate() {
  clearErrors();
  const invalid = [];
  function invalidField(input, message) {
    setError(input, message);
    invalid.push(input);
  }

  if (currentKind() === "class") {
    const slot = classSlot();
    if (!slot) invalidField(classSelect, "Choose a class to continue.");
    else if (!isClassDate(slot.item, slot.date)) {
      selectedClassDate = getUpcomingSession(slot.item).date;
      updateSummary();
      invalidField(classSelect, "This session has passed. Its next date is now selected; check it before continuing.");
    }
    else if (readBookings().some((booking) => booking.kind === "class" && booking.classId === slot.item.id && booking.date === slot.date && booking.time === slot.time)) {
      invalidField(classSelect, "This session is already saved. View or cancel it in My sessions on the schedule.");
    }
  } else {
    const minimumDate = localDateKey(new Date());
    if (!introDate.value || introDate.value < minimumDate || introDate.value > maximumDate || !isFutureSlot(introDate.value, "23:59")) {
      invalidField(introDate, "Choose a valid date within the next 30 days.");
    }
    if (!INTRO_TIMES.includes(introTime.value) || !isFutureSlot(introDate.value, introTime.value)) {
      invalidField(introTime, "Choose an offered time that has not passed.");
    }
    if (!Object.hasOwn(PLANS, planSelect.value)) invalidField(planSelect, "Choose a membership preference.");
    if (!["monthly", "annual"].includes(billingSelect.value)) invalidField(billingSelect, "Choose monthly or annual billing.");
  }

  if (nameInput.value.trim().length < 2 || nameInput.value.trim().length > 80) invalidField(nameInput, "Enter a name between 2 and 80 characters.");
  emailInput.value = emailInput.value.trim();
  if (!emailInput.value || !emailInput.checkValidity()) invalidField(emailInput, "Enter a valid email address.");
  return invalid;
}

function showPanel(panel) {
  detailsPanel.hidden = panel !== "details";
  reviewPanel.hidden = panel !== "review";
  successPanel.hidden = panel !== "success";
  detailsStep.classList.toggle("is-current", panel === "details");
  detailsStep.classList.toggle("is-complete", panel !== "details");
  reviewStep.classList.toggle("is-current", panel === "review");
  reviewStep.classList.toggle("is-complete", panel === "success");
  detailsStep.removeAttribute("aria-current");
  reviewStep.removeAttribute("aria-current");
  if (panel === "details") detailsStep.setAttribute("aria-current", "step");
  if (panel === "review") reviewStep.setAttribute("aria-current", "step");
  document.querySelector(`#${panel}-heading`).focus({ preventScroll: true });
  const card = document.querySelector(".booking-form-card");
  const top = card.getBoundingClientRect().top;
  if (top < 90 || top > window.innerHeight - 120) card.scrollIntoView({ behavior: "auto", block: "start" });
}

function renderReview(session) {
  const rows = [["Session", session.title], ["Date", formatDate(session.date)], ["Time", `${session.time} · device local time`]];
  if (session.kind === "class") {
    const item = selectedClass();
    rows.push(["Coach", item.trainer], ["Duration", `${item.duration} minutes`]);
  } else {
    rows.push(["First visit", "Free · 30 minutes"], ["Membership interest", `${PLANS[session.plan].name} · ${planPrice()}`]);
  }
  rows.push(["Name", nameInput.value.trim()], ["Email", emailInput.value.trim()]);
  if (goalSelect.value) rows.push(["Goal", goalSelect.value]);
  if (experienceSelect.value) rows.push(["Experience", experienceSelect.value]);
  renderDefinitions(document.querySelector("#booking-review"), rows);
}

addOption(classSelect, "", "Select a class");
CLASSES.forEach((item) => addOption(classSelect, item.id, `${item.title} · ${item.time}`));
Object.values(PLANS).forEach((plan) => addOption(planSelect, plan.id, plan.name));
introTime.replaceChildren();
INTRO_TIMES.forEach((time) => addOption(introTime, time, time));
introDate.min = localDateKey(today);
introDate.max = maximumDate;
introDate.value = localDateKey(today);
if (!INTRO_TIMES.some((time) => isFutureSlot(introDate.value, time))) {
  introDate.value = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
}

const params = new URLSearchParams(window.location.search);
const queryClassId = params.get("class");
const queryPlan = params.get("plan");
const queryBilling = params.get("billing");
if (queryClassId !== null) {
  kindInputs.find((input) => input.value === "class").checked = true;
  const item = CLASSES.find((entry) => entry.id === queryClassId);
  if (item) {
    classSelect.value = item.id;
    const queryDate = params.get("date");
    if (queryDate && isClassDate(item, queryDate)) selectedClassDate = queryDate;
    else if (queryDate) showNotice("That date is no longer available. The next session is shown below; check the details before continuing.");
  } else showNotice("That class could not be found. Choose an available class below or browse the schedule.");
} else {
  if (queryPlan !== null) {
    if (Object.hasOwn(PLANS, queryPlan)) planSelect.value = queryPlan;
    else showNotice("That membership could not be found. Starter is selected; you can change your preference below.");
  }
  if (queryBilling !== null) {
    if (["monthly", "annual"].includes(queryBilling)) billingSelect.value = queryBilling;
    else showNotice("That billing preference could not be found. Monthly is selected; you can change it below.");
  }
}

kindInputs.forEach((input) => input.addEventListener("change", () => {
  clearErrors();
  showNotice("");
  updateSummary();
}));
classSelect.addEventListener("change", () => {
  selectedClassDate = "";
  setError(classSelect, "");
  showNotice("");
  updateSummary();
});
introDate.addEventListener("change", () => {
  updateIntroTimes();
  setError(introDate, "");
  setError(introTime, "");
  updateSummary();
});
[introTime, planSelect, billingSelect].forEach((input) => input.addEventListener("change", () => {
  setError(input, "");
  updateSummary();
}));
[nameInput, emailInput].forEach((input) => input.addEventListener("input", () => setError(input, "")));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const invalid = validate();
  if (invalid.length) {
    invalid[0].focus();
    return;
  }
  reviewedSession = sessionFromForm();
  renderReview(reviewedSession);
  showPanel("review");
});

document.querySelector("#back-to-details").addEventListener("click", () => {
  confirmError.hidden = true;
  showPanel("details");
});

confirmButton.addEventListener("click", () => {
  const invalid = validate();
  if (invalid.length || !reviewedSession) {
    showNotice("Your session needs a quick update before it can be saved. Check the highlighted fields below.");
    showPanel("details");
    invalid[0]?.focus();
    return;
  }
  confirmButton.disabled = true;
  const result = saveBooking(reviewedSession);
  confirmButton.disabled = false;
  if (!result.ok || result.duplicate) {
    confirmError.textContent = result.duplicate
      ? "This session is already saved. Open My sessions on the schedule to view or cancel it."
      : result.error || "Your browser could not save the session. Allow site storage, then try again. Your details have not been sent.";
    confirmError.hidden = false;
    return;
  }
  savedSession = result.booking;
  const when = `${formatDate(savedSession.date)} at ${savedSession.time}`;
  document.querySelector("#success-session").textContent = `${savedSession.title} · ${when} (device local time).`;
  document.querySelector("#booking-review").replaceChildren();
  nameInput.value = "";
  emailInput.value = "";
  goalSelect.value = "";
  experienceSelect.value = "";
  showNotice("");
  showPanel("success");
});

cancelButton.addEventListener("click", () => {
  if (!savedSession) return;
  const result = removeBooking(savedSession.id);
  if (!result.ok) {
    cancelError.textContent = result.error || "Your browser could not remove the saved session. Check site storage and try again.";
    cancelError.hidden = false;
    return;
  }
  cancelError.hidden = true;
  successPanel.querySelector(".section-label").textContent = "Room for a new plan";
  document.querySelector("#success-heading").textContent = "Session cancelled.";
  document.querySelector("#cancel-status").textContent = "The session has been removed from this browser.";
  cancelButton.hidden = true;
  savedSession = null;
});

window.addEventListener("storage", () => {
  if (currentKind() === "class" && !successPanel.hidden) return;
  if (currentKind() === "class" && !reviewPanel.hidden) {
    const session = sessionFromForm();
    if (session && readBookings().some((entry) => entry.kind === "class" && entry.classId === session.classId && entry.date === session.date && entry.time === session.time)) {
      confirmError.textContent = "This session was just saved in another tab. View it in My sessions on the schedule.";
      confirmError.hidden = false;
    }
  }
});

updateIntroTimes();
updateSummary();
document.querySelector("#booking-fallback").hidden = true;
document.querySelector("#booking-intro").textContent = "Choose how you’d like to train.";
document.querySelector("#booking-workspace").inert = false;
document.querySelector("#booking-workspace").removeAttribute("aria-busy");
