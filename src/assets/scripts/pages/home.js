import { PLANS } from "../data/catalog.js";
import { initWorkoutDialog } from "../components/workout-dialog.js";
import { initReveals } from "../utils/reveal.js";

function initPricing() {
  const buttons = [...document.querySelectorAll("[data-billing]")];
  if (!buttons.length) return;
  buttons.forEach((button) => button.addEventListener("click", () => {
    const annual = button.dataset.billing === "annual";
    buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    for (const plan of Object.values(PLANS)) {
      document.querySelector('[data-price="' + plan.id + '"]').textContent = annual ? "$" + (plan.annual / 12).toFixed(2) : "$" + plan.monthly;
      document.querySelector('[data-plan-billing="' + plan.id + '"]').textContent = annual ? "$" + plan.annual + " billed once per year" : "Billed monthly";
      document.querySelector('[data-plan-link="' + plan.id + '"]').href = "./booking.html?plan=" + plan.id + "&billing=" + (annual ? "annual" : "monthly");
    }
    document.querySelector("#billing-caption").textContent = annual ? "Monthly equivalent shown. Annual membership is paid in one installment." : "Pay monthly. Find the plan that fits your routine.";
  }));
}

initWorkoutDialog();
initPricing();
initReveals();
