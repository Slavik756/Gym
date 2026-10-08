export function initReveals() {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const targets = document.querySelectorAll(".about-images, .about-content, .section-heading, .center-heading, .workout-card, .price-card, .trainer-card, .review-card, .cta-content");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
      setTimeout(() => entry.target.classList.remove("reveal", "is-visible"), 900);
    });
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
  targets.forEach((target) => { target.classList.add("reveal"); observer.observe(target); });
}
