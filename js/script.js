/* =========================================
   ELEMENTS
========================================= */

const header = document.querySelector(".site-header");

const menuToggle = document.querySelector(".menu-toggle");

const nav = document.querySelector(".main-nav");

const navLinks = document.querySelectorAll(".nav-item");

const sections = document.querySelectorAll("main section[id]");

/* =========================================
   MOBILE MENU
========================================= */

function closeMenu() {
  nav.classList.remove("open");

  menuToggle.classList.remove("open");

  menuToggle.setAttribute("aria-expanded", "false");

  document.body.classList.remove("no-scroll");
}

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");

  menuToggle.classList.toggle("open", isOpen);

  menuToggle.setAttribute("aria-expanded", String(isOpen));

  document.body.classList.toggle("no-scroll", isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

/* =========================================
   HEADER SCROLL EFFECT
========================================= */

function updateHeader() {
  if (window.scrollY > 10) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
}

window.addEventListener("scroll", updateHeader, {
  passive: true,
});

updateHeader();

/* =========================================
   ACTIVE NAVIGATION
========================================= */

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const target = link.getAttribute("href");

        link.classList.toggle("active", target === `#${entry.target.id}`);
      });
    });
  },
  {
    rootMargin: "-35% 0px -55% 0px",
    threshold: 0,
  },
);

sections.forEach((section) => {
  sectionObserver.observe(section);
});

/* =========================================
   WORKOUT MODAL
========================================= */

const modal = document.querySelector("#workout-modal");

const modalTitle = document.querySelector("#modal-title");

const modalText = document.querySelector("#modal-text");

const workoutCards = document.querySelectorAll(".workout-card");

const closeModalButtons = document.querySelectorAll("[data-close-modal]");

const workoutDescriptions = {
  "Strength Training":
    "Build strength with structured sessions designed for your level, with guidance from our professional coaches.",

  Cardio:
    "Improve endurance, energy and heart health with dynamic cardio sessions for every fitness level.",

  Yoga: "Improve mobility, balance and recovery with mindful sessions that help you feel stronger and calmer.",

  Pilates:
    "Strengthen your core, improve posture and build controlled movement through focused Pilates sessions.",

  Boxing:
    "Learn boxing fundamentals while getting a high-energy full-body workout that keeps every session fresh.",

  "Group Fitness":
    "Train with a community, stay motivated and enjoy energetic classes led by experienced coaches.",
};

function openModal(name) {
  modalTitle.textContent = name;

  modalText.textContent = workoutDescriptions[name];

  modal.classList.add("open");

  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("no-scroll");

  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("open");

  modal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("no-scroll");
}

workoutCards.forEach((card) => {
  card.addEventListener("click", () => {
    openModal(card.dataset.workout);
  });
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

/* =========================================
   ESC CLOSE MODAL
========================================= */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) {
    closeModal();
  }
});

/* =========================================
   SUBSCRIBE FORM
========================================= */

const form = document.querySelector("#subscribe-form");

const email = document.querySelector("#email");

const message = document.querySelector("#form-message");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = email.value.trim();

  if (!value || !email.checkValidity()) {
    message.textContent = "Please enter a valid email address.";

    email.focus();

    return;
  }

  message.textContent =
    "You're in! Check your inbox for your 15% welcome offer.";

  form.reset();
});

/* =========================================
   WINDOW RESIZE
========================================= */

window.addEventListener("resize", () => {
  if (window.innerWidth > 700) {
    closeMenu();
  }
});
