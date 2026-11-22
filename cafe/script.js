"use strict";

/* =========================================================
   Datos del menú
   Para cambiar el menú solo edita esta lista.
   category: "caliente" | "frio" | "te" | "pan"
   ========================================================= */
const MENU = [
  { id: "espresso", name: "Espresso", category: "caliente", price: 38, image: "images/espresso.svg", description: "Doble carga de nuestro tueste de la casa, intenso y con notas de chocolate.", tags: [] },
  { id: "cappuccino", name: "Cappuccino", category: "caliente", price: 55, image: "images/cappuccino.svg", description: "Espresso con leche vaporizada y una capa generosa de espuma.", tags: ["Favorito"] },
  { id: "latte", name: "Latte", category: "caliente", price: 58, image: "images/latte.svg", description: "Suave y cremoso, con arte latte hecho a mano por nuestros baristas.", tags: [] },
  { id: "mocha", name: "Mocha", category: "caliente", price: 64, image: "images/mocha.svg", description: "Espresso, chocolate oaxaqueño y leche vaporizada.", tags: [] },
  { id: "cold-brew", name: "Cold brew", category: "frio", price: 62, image: "images/cold-brew.svg", description: "Café infusionado en frío por 18 horas. Refrescante y poco ácido.", tags: ["Favorito", "Vegano"] },
  { id: "frappe", name: "Frappé de caramelo", category: "frio", price: 72, image: "images/frappe.svg", description: "Café, caramelo de la casa y hielo frappé con crema batida.", tags: [] },
  { id: "horchata", name: "Horchata latte", category: "frio", price: 66, image: "images/horchata.svg", description: "Espresso sobre horchata de arroz con canela. Nuestro clásico mexicano.", tags: ["Favorito"] },
  { id: "matcha", name: "Matcha latte", category: "te", price: 68, image: "images/matcha.svg", description: "Té verde matcha ceremonial batido con leche. Caliente o frío.", tags: ["Vegano"] },
  { id: "chai", name: "Chai latte", category: "te", price: 60, image: "images/chai.svg", description: "Té negro con especias (canela, cardamomo y jengibre) y leche.", tags: [] },
  { id: "croissant", name: "Croissant de mantequilla", category: "pan", price: 42, image: "images/croissant.svg", description: "Hojaldrado y dorado, recién salido del horno cada mañana.", tags: [] },
  { id: "concha", name: "Concha", category: "pan", price: 28, image: "images/concha.svg", description: "Pan dulce tradicional de vainilla, suave y esponjoso.", tags: ["Favorito"] },
  { id: "cheesecake", name: "Cheesecake de frutos rojos", category: "pan", price: 75, image: "images/cheesecake.svg", description: "Cremoso, con base de galleta y mermelada casera.", tags: ["Sin gluten"] }
];

/* Horario: [apertura, cierre] en horas decimales. Índice 0 = domingo. */
const HOURS = {
  0: [9, 18],
  1: [7.5, 21],
  2: [7.5, 21],
  3: [7.5, 21],
  4: [7.5, 21],
  5: [7.5, 22],
  6: [8, 22]
};

const STORAGE_KEY = "cafeaurora.picks";

/* =========================================================
   Utilidades
   ========================================================= */
const formatPrice = (value) => `$${value.toLocaleString("es-MX")}`;

function formatHour(decimal) {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

/* =========================================================
   Menú de navegación (móvil) y enlace activo
   ========================================================= */
const header = document.getElementById("header");
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}

menuToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));

// Cierra el menú al elegir una sección, al tocar fuera o con Escape
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("click", (event) => {
  if (nav.classList.contains("is-open") && !nav.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

// Resalta en el menú la sección que se está viendo
const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);

function updateActiveLink() {
  const offset = header.offsetHeight + 120;
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= offset) current = section.id;
  }
  // Al llegar al final de la página se marca la última sección
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    current = sections[sections.length - 1].id;
  }
  navLinks.forEach((link) => {
    const active = link.getAttribute("href") === `#${current}`;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}

const toTop = document.getElementById("toTop");
let scrollTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      toTop.classList.toggle("is-visible", window.scrollY > 600);
      updateActiveLink();
      scrollTicking = false;
    });
  },
  { passive: true }
);

/* =========================================================
   Menú del café: filtros y lista "Quiero probar"
   ========================================================= */
const menuGrid = document.getElementById("menuGrid");
const filterButtons = [...document.querySelectorAll(".filter")];
let activeFilter = "todo";

let picks = loadPicks();

function loadPicks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return saved.filter((id) => MENU.some((item) => item.id === id));
  } catch {
    return [];
  }
}

function savePicks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  } catch {
    /* Si el navegador no permite guardar, la lista funciona igual mientras la página esté abierta. */
  }
}

function dishCard(item, index) {
  const added = picks.includes(item.id);
  const card = el(
    "li",
    { class: "dish" },
    el("img", { class: "dish__image", src: item.image, alt: item.name, width: "400", height: "300", loading: "lazy" }),
    el(
      "div",
      { class: "dish__body" },
      el("div", { class: "dish__top" }, el("h3", { class: "dish__name" }, item.name), el("span", { class: "dish__price" }, formatPrice(item.price))),
      el("p", { class: "dish__desc" }, item.description),
      item.tags.length
        ? el("div", { class: "dish__tags" }, item.tags.map((tag) => el("span", { class: `tag ${tag === "Favorito" ? "tag--popular" : ""}` }, tag)))
        : null,
      el(
        "button",
        {
          type: "button",
          class: `btn btn--small dish__add ${added ? "is-added" : ""}`,
          "aria-pressed": String(added),
          onclick: () => togglePick(item.id)
        },
        added ? "✓ En tu lista" : "+ Agregar"
      )
    )
  );
  card.style.animationDelay = `${index * 40}ms`;
  return card;
}

function renderMenu() {
  const items = activeFilter === "todo" ? MENU : MENU.filter((item) => item.category === activeFilter);
  menuGrid.replaceChildren(...items.map(dishCard));
}

function renderPicks() {
  const list = document.getElementById("picksList");
  const empty = document.getElementById("picksEmpty");
  const footer = document.getElementById("picksFooter");
  const chosen = picks.map((id) => MENU.find((item) => item.id === id)).filter(Boolean);

  empty.hidden = chosen.length > 0;
  footer.hidden = chosen.length === 0;
  list.replaceChildren(
    ...chosen.map((item) =>
      el(
        "li",
        { class: "pick" },
        el("img", { src: item.image, alt: "" }),
        el("span", { class: "pick__name" }, item.name, el("span", { class: "pick__price" }, formatPrice(item.price))),
        el("button", { type: "button", class: "pick__remove", "aria-label": `Quitar ${item.name}`, onclick: () => togglePick(item.id) }, "×")
      )
    )
  );
  const total = chosen.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("picksTotal").textContent = formatPrice(total);
}

function togglePick(id) {
  picks = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id];
  savePicks();
  renderMenu();
  renderPicks();
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((b) => {
      const active = b === button;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderMenu();
  });
});

document.getElementById("picksClear").addEventListener("click", () => {
  picks = [];
  savePicks();
  renderMenu();
  renderPicks();
});

/* =========================================================
   Horario: día actual y estado "abierto / cerrado"
   ========================================================= */
function renderOpenStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const [open, close] = HOURS[day];

  document.querySelectorAll("#hoursBody tr").forEach((row) => {
    row.classList.toggle("is-today", Number(row.dataset.day) === day);
  });

  let text;
  let isOpen = false;
  if (hour >= open && hour < close) {
    isOpen = true;
    text = `Abierto ahora · cerramos a las ${formatHour(close)}`;
  } else if (hour < open) {
    text = `Cerrado ahora · abrimos hoy a las ${formatHour(open)}`;
  } else {
    const tomorrow = (day + 1) % 7;
    text = `Cerrado ahora · abrimos mañana a las ${formatHour(HOURS[tomorrow][0])}`;
  }

  ["openStatus", "openStatusBig"].forEach((id) => {
    const node = document.getElementById(id);
    node.textContent = text;
    node.classList.toggle("is-open", isOpen);
    node.classList.toggle("is-closed", !isOpen);
  });
}

/* =========================================================
   Formulario de contacto (validación en el navegador)
   Nota: el sitio no tiene servidor, así que el mensaje no se
   envía. Para recibirlo hay que conectar un servicio de
   formularios o un backend.
   ========================================================= */
const form = document.getElementById("contactForm");

const validators = {
  name: (value) => (value.trim().length >= 2 ? "" : "Escribe tu nombre."),
  email: (value) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "" : "Escribe un correo válido, por ejemplo nombre@correo.com."),
  message: (value) => (value.trim().length >= 10 ? "" : "El mensaje debe tener al menos 10 caracteres.")
};

function validateField(input) {
  const error = validators[input.name](input.value);
  const field = input.closest(".field");
  const errorNode = document.getElementById(`${input.name}-error`);
  field.classList.toggle("has-error", Boolean(error));
  errorNode.textContent = error;
  input.setAttribute("aria-invalid", String(Boolean(error)));
  if (error) input.setAttribute("aria-describedby", errorNode.id);
  else input.removeAttribute("aria-describedby");
  return !error;
}

form.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
  input.addEventListener("input", () => {
    if (input.closest(".field").classList.contains("has-error")) validateField(input);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const inputs = [...form.querySelectorAll("input, textarea")];
  const results = inputs.map(validateField);
  const firstInvalid = inputs[results.indexOf(false)];
  const success = document.getElementById("formSuccess");

  if (firstInvalid) {
    success.hidden = true;
    firstInvalid.focus();
    return;
  }

  const name = form.elements.name.value.trim().split(" ")[0];
  success.textContent = `¡Gracias, ${name}! Recibimos tu mensaje y te responderemos pronto.`;
  success.hidden = false;
  form.reset();
});

/* =========================================================
   Animación al hacer scroll
   ========================================================= */
function setupReveal() {
  if (!("IntersectionObserver" in window)) return;
  const targets = document.querySelectorAll(".section__head, .feature, .split > *, .hours, .map, .form, .picks");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((target) => {
    target.classList.add("reveal");
    observer.observe(target);
  });
}

/* =========================================================
   Inicio
   ========================================================= */
document.getElementById("year").textContent = new Date().getFullYear();
renderMenu();
renderPicks();
renderOpenStatus();
setInterval(renderOpenStatus, 60_000);
setupReveal();
updateActiveLink();
