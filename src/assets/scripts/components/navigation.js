const MOBILE_QUERY = "(max-width: 1000px)";

export function initNavigation() {
  const header = document.querySelector(".header");
  const toggle = header?.querySelector(".burger");
  const nav = header?.querySelector(".main-nav");
  if (!header || !toggle || !nav) return;

  const mobile = window.matchMedia(MOBILE_QUERY);
  const links = [...nav.querySelectorAll(".nav-item[data-nav-key]")];
  let menuOpen = false;

  function setMenu(open, restoreFocus = false) {
    menuOpen = mobile.matches && open;
    nav.classList.toggle("open", menuOpen);
    toggle.classList.toggle("active", menuOpen);
    toggle.setAttribute("aria-expanded", String(menuOpen));
    toggle.setAttribute("aria-label", menuOpen ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", menuOpen);
    nav.inert = mobile.matches && !menuOpen;

    if (mobile.matches) nav.setAttribute("aria-hidden", String(!menuOpen));
    else nav.removeAttribute("aria-hidden");

    if (restoreFocus && mobile.matches) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", () => {
    const opening = !menuOpen;
    setMenu(opening);
    if (opening) nav.querySelector("a[href]")?.focus({ preventScroll: true });
  });

  mobile.addEventListener("change", () => {
    // A desktop menu must never inherit the closed drawer's inert state.
    const focusWasInMenu = nav.contains(document.activeElement);
    setMenu(false, focusWasInMenu);
  });

  document.addEventListener("click", (event) => {
    if (!menuOpen || header.contains(event.target)) return;
    setMenu(false, nav.contains(document.activeElement));
  });

  document.addEventListener("keydown", (event) => {
    if (!menuOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setMenu(false, true);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...nav.querySelectorAll("a[href], button:not([disabled])"), toggle];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  header.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !header.contains(link)) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const wasOpen = menuOpen;
    setMenu(false);
    const destination = new URL(link.href, window.location.href);
    const isSamePage = destination.pathname === window.location.pathname
      && destination.origin === window.location.origin
      && destination.search === window.location.search;
    const target = isSamePage && destination.hash
      ? document.getElementById(decodeURIComponent(destination.hash.slice(1)))
      : null;

    if (target) {
      // Keep native anchor scrolling/history, while moving keyboard focus to its destination.
      requestAnimationFrame(() => {
        const temporaryTabIndex = !target.hasAttribute("tabindex");
        if (temporaryTabIndex) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        if (temporaryTabIndex) {
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
        }
      });
    } else if (wasOpen) {
      toggle.focus({ preventScroll: true });
    }
  });

  setMenu(false);
  if (document.body.dataset.page !== "home") return;

  const sections = links
    .filter((link) => link.dataset.section)
    .map((link) => ({ link, section: document.getElementById(link.dataset.section) }))
    .filter(({ section }) => section);
  if (!sections.length) return;

  let activeKey;
  let framePending = false;
  function updateActiveSection() {
    const marker = header.getBoundingClientRect().height + 48;
    let current = sections[0];
    for (const item of sections) {
      if (item.section.getBoundingClientRect().top <= marker) current = item;
    }

    const key = current.link.dataset.navKey;
    if (key !== activeKey) {
      links.forEach((link) => {
        const active = link === current.link;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", key === "home" ? "page" : "location");
        else link.removeAttribute("aria-current");
      });
      activeKey = key;
    }
    framePending = false;
  }

  function scheduleActiveSection() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateActiveSection);
  }

  window.addEventListener("scroll", scheduleActiveSection, { passive: true });
  window.addEventListener("resize", scheduleActiveSection);
  window.addEventListener("pageshow", scheduleActiveSection);
  updateActiveSection();
}
