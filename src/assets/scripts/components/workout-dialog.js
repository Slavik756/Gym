export function initWorkoutDialog() {
  const dialog = document.querySelector("#workout-modal");
  if (!dialog) return;
  const descriptions = {
    "Strength Training": { category: "Strength", text: "Start with the essentials: free weights, good technique and steady progression. Choose Foundations for your first session or Lift & Progress when you are ready for the next challenge." },
    Cardio: { category: "Cardio", text: "Short circuits, varied stations and coach-led intervals. Pick a weekday evening session or start the weekend with Saturday Sweat." },
    Yoga: { category: "Yoga", text: "Make space for movement and recovery. Morning Flow brings energy to your day; Slow Down Yoga offers an unhurried evening practice." },
    Pilates: { category: "Pilates", text: "Controlled, low-impact sessions focused on posture and core stability. Core & Control and Sunday Reset welcome every experience level." },
    Boxing: { category: "Boxing", text: "Learn stance, footwork and combinations in Boxing Fundamentals, then put them together in Friday Fight Club. No sparring experience required for Fundamentals." },
    "Group Fitness": { category: "Group Fitness", text: "A mix of resistance and conditioning, with a coach and a group to keep you moving. Join Full Body Club midweek or Weekend Warm-Up on Friday." },
  };
  document.querySelectorAll("[data-workout]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = descriptions[button.dataset.workout];
      document.querySelector("#modal-title").textContent = button.dataset.workout;
      document.querySelector("#modal-text").textContent = item.text;
      document.querySelector("#modal-action").href = "./schedule.html?category=" + encodeURIComponent(item.category);
      dialog.showModal();
      document.body.classList.add("no-scroll");
      dialog.querySelector(".modal-close").focus();
    });
  });
  dialog.querySelector("[data-close-modal]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const elements = [...dialog.querySelectorAll("button:not([disabled]), a[href]")];
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener("close", () => document.body.classList.remove("no-scroll"));
}
