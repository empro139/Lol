"use strict";

/* =========================================================
   Datos base de jugadores
   ========================================================= */
const DEFAULT_PLAYERS = [
  {
    id: "michael-jordan",
    name: "Michael Jordan",
    position: "Escolta",
    team: "Chicago Bulls, Washington Wizards",
    bio: "Nacido en 1963 en Brooklyn, Nueva York. Tras su etapa universitaria en North Carolina, fue elegido por los Chicago Bulls en 1984. Con su capacidad anotadora y su mentalidad competitiva lideró dos tripletes de campeonatos y es considerado por muchos el mejor jugador de la historia.",
    trophies: [
      "6 veces campeón de la NBA",
      "6 veces MVP de las Finales",
      "5 veces MVP de la temporada",
      "10 títulos de máximo anotador",
      "Defensor del Año (1988)",
      "Novato del Año (1985)",
      "2 medallas de oro olímpicas (1984, 1992)"
    ]
  },
  {
    id: "lebron-james",
    name: "LeBron James",
    position: "Alero",
    team: "Cleveland Cavaliers, Miami Heat, Los Angeles Lakers",
    bio: "Nacido en 1984 en Akron, Ohio. Llegó a la NBA directamente desde el instituto como primera elección del draft de 2003. Jugador completo capaz de dominar en cualquier posición, superó a Kareem Abdul-Jabbar como máximo anotador de la historia de la NBA en 2023.",
    trophies: [
      "4 veces campeón de la NBA",
      "4 veces MVP de las Finales",
      "4 veces MVP de la temporada",
      "Novato del Año (2004)",
      "Máximo anotador histórico de la NBA",
      "3 medallas de oro olímpicas (2008, 2012, 2024)"
    ]
  },
  {
    id: "kobe-bryant",
    name: "Kobe Bryant",
    position: "Escolta",
    team: "Los Angeles Lakers",
    bio: "Nacido en 1978 en Filadelfia y fallecido en 2020. Jugó sus 20 temporadas con los Lakers, con quienes ganó cinco anillos. Conocido por su 'Mamba Mentality', anotó 81 puntos en un partido en 2006, la segunda mayor cifra de la historia de la liga.",
    trophies: [
      "5 veces campeón de la NBA",
      "2 veces MVP de las Finales",
      "MVP de la temporada (2008)",
      "18 veces All-Star",
      "2 medallas de oro olímpicas (2008, 2012)"
    ]
  },
  {
    id: "stephen-curry",
    name: "Stephen Curry",
    position: "Base",
    team: "Golden State Warriors",
    bio: "Nacido en 1988 en Akron, Ohio, e hijo del exjugador Dell Curry. Elegido por los Warriors en 2009, revolucionó el juego con su tiro de tres puntos desde distancias enormes. Es el líder histórico en triples anotados de la NBA.",
    trophies: [
      "4 veces campeón de la NBA",
      "MVP de las Finales (2022)",
      "2 veces MVP de la temporada (2015, 2016)",
      "Primer MVP unánime de la historia (2016)",
      "Líder histórico en triples de la NBA",
      "Medalla de oro olímpica (2024)"
    ]
  },
  {
    id: "magic-johnson",
    name: "Magic Johnson",
    position: "Base",
    team: "Los Angeles Lakers",
    bio: "Nacido en 1959 en Lansing, Michigan. Base de 2,06 m con una visión de juego excepcional, fue la pieza central de los Lakers del 'Showtime' en los años 80. Su rivalidad con Larry Bird ayudó a popularizar la NBA en todo el mundo.",
    trophies: [
      "5 veces campeón de la NBA",
      "3 veces MVP de las Finales",
      "3 veces MVP de la temporada",
      "12 veces All-Star",
      "Medalla de oro olímpica (1992)"
    ]
  },
  {
    id: "larry-bird",
    name: "Larry Bird",
    position: "Alero",
    team: "Boston Celtics",
    bio: "Nacido en 1956 en West Baden Springs, Indiana. Uno de los mejores tiradores y pasadores de su época, lideró a los Boston Celtics a tres campeonatos en los años 80. Tras retirarse fue entrenador y directivo de los Indiana Pacers.",
    trophies: [
      "3 veces campeón de la NBA",
      "2 veces MVP de las Finales",
      "3 veces MVP de la temporada (consecutivos)",
      "Novato del Año (1980)",
      "12 veces All-Star",
      "Medalla de oro olímpica (1992)"
    ]
  },
  {
    id: "kareem-abdul-jabbar",
    name: "Kareem Abdul-Jabbar",
    position: "Pívot",
    team: "Milwaukee Bucks, Los Angeles Lakers",
    bio: "Nacido en 1947 en Nueva York. Dominó la liga durante dos décadas gracias a su imparable 'skyhook'. Fue el máximo anotador histórico de la NBA durante casi 39 años y sigue teniendo el récord de premios MVP de temporada regular.",
    trophies: [
      "6 veces campeón de la NBA",
      "2 veces MVP de las Finales",
      "6 veces MVP de la temporada (récord)",
      "Novato del Año (1970)",
      "19 veces All-Star"
    ]
  },
  {
    id: "tim-duncan",
    name: "Tim Duncan",
    position: "Ala-pívot",
    team: "San Antonio Spurs",
    bio: "Nacido en 1976 en las Islas Vírgenes de Estados Unidos. Conocido como 'The Big Fundamental' por su juego sobrio y eficaz, pasó toda su carrera en los San Antonio Spurs, con quienes ganó cinco títulos en tres décadas distintas.",
    trophies: [
      "5 veces campeón de la NBA",
      "3 veces MVP de las Finales",
      "2 veces MVP de la temporada",
      "Novato del Año (1998)",
      "15 veces All-Star"
    ]
  }
];

/* =========================================================
   Almacenamiento local
   ========================================================= */
const STORAGE_KEYS = {
  images: "hoopsdata.images",
  customPlayers: "hoopsdata.customPlayers"
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    alert("No se pudo guardar: el almacenamiento del navegador está lleno. Prueba con una imagen más pequeña.");
    return false;
  }
}

/* =========================================================
   Estado de la aplicación
   ========================================================= */
const state = {
  images: loadJSON(STORAGE_KEYS.images, {}),
  customPlayers: loadJSON(STORAGE_KEYS.customPlayers, []),
  search: "",
  sort: "default"
};

function getAllPlayers() {
  return [...DEFAULT_PLAYERS, ...state.customPlayers];
}

/* =========================================================
   Referencias al DOM
   ========================================================= */
const grid = document.getElementById("playersGrid");
const template = document.getElementById("playerCardTemplate");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const dialog = document.getElementById("playerDialog");
const form = document.getElementById("playerForm");
const openFormBtn = document.getElementById("openFormBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");

/* =========================================================
   Utilidades
   ========================================================= */
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Reduce la imagen para que quepa en localStorage. */
function resizeImage(file, maxSize = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen no válido"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   Gestión de imágenes
   ========================================================= */
async function setPlayerImage(playerId, file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Selecciona un archivo de imagen válido.");
    return;
  }
  try {
    const dataUrl = await resizeImage(file);
    const previous = state.images[playerId];
    state.images[playerId] = dataUrl;
    if (!saveJSON(STORAGE_KEYS.images, state.images)) {
      if (previous) state.images[playerId] = previous;
      else delete state.images[playerId];
      return;
    }
    render();
  } catch (error) {
    alert(error.message);
  }
}

function removePlayerImage(playerId) {
  delete state.images[playerId];
  saveJSON(STORAGE_KEYS.images, state.images);
  render();
}

/* =========================================================
   Creación de casillas
   ========================================================= */
function createCard(player) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.id = player.id;

  // Imagen
  const imageBox = card.querySelector(".card__image");
  const img = card.querySelector(".card__img");
  const placeholder = card.querySelector(".card__placeholder");
  const fileInput = card.querySelector(".card__file");
  const removeImgBtn = card.querySelector(".card__remove-img");
  const imageSrc = state.images[player.id];

  card.querySelector(".card__initials").textContent = getInitials(player.name);

  if (imageSrc) {
    img.src = imageSrc;
    img.alt = `Foto de ${player.name}`;
    img.classList.remove("hidden");
    placeholder.classList.add("hidden");
    removeImgBtn.classList.remove("hidden");
  }

  fileInput.addEventListener("change", () => {
    setPlayerImage(player.id, fileInput.files[0]);
  });
  removeImgBtn.addEventListener("click", () => removePlayerImage(player.id));

  // Arrastrar y soltar imagen sobre la casilla
  imageBox.addEventListener("dragover", (event) => {
    event.preventDefault();
    imageBox.classList.add("is-dragover");
  });
  imageBox.addEventListener("dragleave", () => imageBox.classList.remove("is-dragover"));
  imageBox.addEventListener("drop", (event) => {
    event.preventDefault();
    imageBox.classList.remove("is-dragover");
    setPlayerImage(player.id, event.dataTransfer.files[0]);
  });

  // Texto
  card.querySelector(".card__name").textContent = player.name;
  card.querySelector(".card__meta").textContent = [player.position, player.team]
    .filter(Boolean)
    .join(" · ");
  card.querySelector(".card__bio").textContent = player.bio;

  // Trofeos
  const list = card.querySelector(".card__trophies");
  card.querySelector(".card__count").textContent = player.trophies.length;
  if (player.trophies.length === 0) {
    const li = document.createElement("li");
    li.className = "is-empty";
    li.textContent = "Sin trofeos registrados";
    list.appendChild(li);
  } else {
    player.trophies.forEach((trophy) => {
      const li = document.createElement("li");
      li.textContent = trophy;
      list.appendChild(li);
    });
  }

  // Los jugadores añadidos por el usuario se pueden eliminar
  if (player.custom) {
    const deleteBtn = card.querySelector(".card__delete");
    deleteBtn.classList.remove("hidden");
    deleteBtn.addEventListener("click", () => deletePlayer(player.id, player.name));
  }

  return card;
}

/* =========================================================
   Renderizado de la interfaz
   ========================================================= */
function getVisiblePlayers() {
  const query = normalize(state.search.trim());
  let players = getAllPlayers();

  if (query) {
    players = players.filter((p) =>
      normalize(`${p.name} ${p.team} ${p.position}`).includes(query)
    );
  }

  if (state.sort === "name") {
    players.sort((a, b) => a.name.localeCompare(b.name, "es"));
  } else if (state.sort === "trophies") {
    players.sort((a, b) => b.trophies.length - a.trophies.length);
  }

  return players;
}

function updateStats() {
  const all = getAllPlayers();
  const ids = new Set(all.map((p) => p.id));
  document.getElementById("statPlayers").textContent = all.length;
  document.getElementById("statTrophies").textContent = all.reduce(
    (sum, p) => sum + p.trophies.length,
    0
  );
  document.getElementById("statImages").textContent = Object.keys(state.images).filter((id) =>
    ids.has(id)
  ).length;
}

function render() {
  const players = getVisiblePlayers();
  const fragment = document.createDocumentFragment();
  players.forEach((player) => fragment.appendChild(createCard(player)));
  grid.replaceChildren(fragment);
  emptyMessage.classList.toggle("hidden", players.length > 0);
  updateStats();
}

/* =========================================================
   Añadir / eliminar jugadores
   ========================================================= */
function addPlayer(data) {
  let id = slugify(data.name) || "jugador";
  const existing = new Set(getAllPlayers().map((p) => p.id));
  let suffix = 2;
  const base = id;
  while (existing.has(id)) id = `${base}-${suffix++}`;

  state.customPlayers.push({
    id,
    name: data.name,
    position: data.position,
    team: data.team,
    bio: data.bio,
    trophies: data.trophies,
    custom: true
  });
  saveJSON(STORAGE_KEYS.customPlayers, state.customPlayers);
  render();
}

function deletePlayer(id, name) {
  if (!confirm(`¿Eliminar a ${name}?`)) return;
  state.customPlayers = state.customPlayers.filter((p) => p.id !== id);
  delete state.images[id];
  saveJSON(STORAGE_KEYS.customPlayers, state.customPlayers);
  saveJSON(STORAGE_KEYS.images, state.images);
  render();
}

/* =========================================================
   Eventos
   ========================================================= */
searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  render();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  render();
});

openFormBtn.addEventListener("click", () => {
  form.reset();
  dialog.showModal();
});

cancelFormBtn.addEventListener("click", () => dialog.close());

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get("name").trim();
  const bio = data.get("bio").trim();
  if (!name || !bio) return;

  addPlayer({
    name,
    position: data.get("position").trim(),
    team: data.get("team").trim(),
    bio,
    trophies: data
      .get("trophies")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
  });
  dialog.close();
});

render();
