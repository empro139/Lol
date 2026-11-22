// Abre y cierra el menú de navegación en celular
const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");

menuButton.addEventListener("click", function () {
  const isOpen = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", isOpen);
});

// Cierra el menú al elegir una sección
nav.addEventListener("click", function () {
  nav.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", false);
});
