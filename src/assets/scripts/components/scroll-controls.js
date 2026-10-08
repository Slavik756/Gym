export function initScrollControls() {
  const header = document.querySelector(".header");
  const backToTop = document.querySelector(".back-to-top");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let framePending = false;

  function updateScrollControls() {
    header?.classList.toggle("scrolled", window.scrollY > 18);
    if (backToTop) {
      const visible = window.scrollY > 620;
      backToTop.classList.toggle("is-visible", visible);
      backToTop.disabled = !visible;
    }
    framePending = false;
  }

  function scheduleUpdate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateScrollControls);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("pageshow", scheduleUpdate);
  updateScrollControls();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
    document.querySelector(".logo")?.focus({ preventScroll: true });
  });
}
