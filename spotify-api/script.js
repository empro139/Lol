"use strict";

/* =========================================================
   CONFIGURACIÓN
   Para conectar tu cuenta de Spotify:
   1. Crea una app en https://developer.spotify.com/dashboard
   2. Agrega la Redirect URI (la dirección exacta de esta página).
   3. Pega aquí tu Client ID. NUNCA pongas el Client Secret:
      esta página usa el flujo PKCE, que no lo necesita.
   Mientras clientId esté vacío, la página funciona en modo demo.
   ========================================================= */
const CONFIG = {
  clientId: "",
  // Debe coincidir EXACTAMENTE con una Redirect URI registrada en tu app.
  redirectUri: window.location.origin + window.location.pathname,
  scopes: [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative"
  ],
  // Resultados por tipo en cada búsqueda.
  searchLimit: 10
};

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

const STORAGE = {
  auth: "sonora.auth",
  verifier: "sonora.pkce.verifier",
  state: "sonora.pkce.state",
  likes: "sonora.likes"
};

/* =========================================================
   Utilidades
   ========================================================= */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const ICON_PATHS = {
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6zm8-14v14h4V5z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z",
  heartOutline:
    "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z",
  external:
    "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z",
  note: "M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"
};

function icon(name, size = 20, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  if (className) svg.setAttribute("class", className);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

function formatDuration(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString("es") : "";
}

function hashString(text) {
  // FNV-1a con mezcla final para que textos parecidos den valores muy distintos
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function gradientFor(seed) {
  const hue = hashString(seed) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 50) % 360} 60% 22%))`;
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Portada: usa la imagen de Spotify o un degradado generado si no hay. */
function cover(item, extraClass = "") {
  const classes = ["cover", extraClass, item.type === "artist" ? "cover--round" : ""]
    .filter(Boolean)
    .join(" ");
  if (item.image) {
    return el("img", { class: classes, src: item.image, alt: "", loading: "lazy" });
  }
  const box = el("div", { class: classes, "aria-hidden": "true" }, initials(item.name));
  box.style.background = gradientFor(item.id || item.name);
  return box;
}

function joinArtists(artists = []) {
  return artists.map((a) => a.name).join(", ");
}

let toastTimer = null;
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type === "error" ? "toast--error" : ""} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/* =========================================================
   Adaptadores: convierten las respuestas de la API de
   Spotify al formato interno que usa la interfaz.
   ========================================================= */
function pickImage(images, minSize = 300) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width || 0) - (b.width || 0));
  const match = sorted.find((img) => (img.width || 0) >= minSize);
  return (match || sorted[sorted.length - 1]).url;
}

const mapArtistRef = (a) => ({ id: a.id, name: a.name });

function mapTrack(t, albumFallback = null) {
  const album = t.album || albumFallback;
  return {
    type: "track",
    id: t.id,
    name: t.name,
    uri: t.uri,
    url: t.external_urls?.spotify || null,
    artists: (t.artists || []).map(mapArtistRef),
    album: album ? { id: album.id, name: album.name } : null,
    image: album ? pickImage(album.images, 64) ?? album.image ?? null : null,
    durationMs: t.duration_ms || 0,
    explicit: Boolean(t.explicit)
  };
}

function mapArtist(a) {
  return {
    type: "artist",
    id: a.id,
    name: a.name,
    url: a.external_urls?.spotify || null,
    image: pickImage(a.images),
    followers: a.followers?.total,
    genres: a.genres || []
  };
}

function mapAlbum(a) {
  return {
    type: "album",
    id: a.id,
    name: a.name,
    url: a.external_urls?.spotify || null,
    image: pickImage(a.images),
    artists: (a.artists || []).map(mapArtistRef),
    releaseDate: a.release_date || "",
    totalTracks: a.total_tracks,
    albumType: a.album_type
  };
}

function mapPlaylist(p) {
  return {
    type: "playlist",
    id: p.id,
    name: p.name,
    url: p.external_urls?.spotify || null,
    image: pickImage(p.images),
    owner: p.owner?.display_name || "",
    description: (p.description || "").replace(/<[^>]*>/g, ""),
    total: p.tracks?.total ?? p.items?.total ?? null
  };
}

const pageItems = (page) => (page?.items || []).filter(Boolean);

/* =========================================================
   Autenticación con Spotify (Authorization Code + PKCE)
   ========================================================= */
function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function sha256Base64Url(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function tokenRequest(body) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const Auth = {
  refreshPromise: null,

  get tokens() {
    return readJSON(STORAGE.auth, null);
  },

  save(data) {
    const previous = this.tokens;
    localStorage.setItem(
      STORAGE.auth,
      JSON.stringify({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || previous?.refreshToken || null,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000
      })
    );
  },

  isConfigured() {
    return CONFIG.clientId.trim().length > 0;
  },

  isLoggedIn() {
    const t = this.tokens;
    return Boolean(t && (t.refreshToken || t.accessToken));
  },

  async login() {
    const verifier = randomString(64);
    const state = randomString(16);
    localStorage.setItem(STORAGE.verifier, verifier);
    localStorage.setItem(STORAGE.state, state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CONFIG.clientId.trim(),
      scope: CONFIG.scopes.join(" "),
      redirect_uri: CONFIG.redirectUri,
      code_challenge_method: "S256",
      code_challenge: await sha256Base64Url(verifier),
      state
    });
    window.location.assign(`${SPOTIFY_ACCOUNTS}/authorize?${params}`);
  },

  /** Procesa la vuelta desde Spotify (?code=... o ?error=...). */
  async handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (!code && !error) return;

    // Limpia la dirección para que el código no quede en el historial
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);

    const expectedState = localStorage.getItem(STORAGE.state);
    const verifier = localStorage.getItem(STORAGE.verifier);
    localStorage.removeItem(STORAGE.state);
    localStorage.removeItem(STORAGE.verifier);

    if (error) {
      throw new Error(error === "access_denied" ? "Cancelaste la conexión con Spotify." : error);
    }
    if (!verifier || params.get("state") !== expectedState) {
      throw new Error("No se pudo verificar el inicio de sesión. Inténtalo de nuevo.");
    }

    const data = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: CONFIG.redirectUri,
      client_id: CONFIG.clientId.trim(),
      code_verifier: verifier
    });
    this.save(data);
  },

  async refresh() {
    if (!this.refreshPromise) {
      const refreshToken = this.tokens?.refreshToken;
      this.refreshPromise = (async () => {
        if (!refreshToken) throw Object.assign(new Error("Sesión expirada"), { status: 401 });
        const data = await tokenRequest({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: CONFIG.clientId.trim()
        });
        this.save(data);
      })().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  },

  async getAccessToken() {
    const t = this.tokens;
    if (!t) throw Object.assign(new Error("No has iniciado sesión"), { status: 401 });
    if (!t.accessToken || Date.now() > t.expiresAt - 60_000) await this.refresh();
    return this.tokens.accessToken;
  },

  logout() {
    localStorage.removeItem(STORAGE.auth);
  }
};

/* =========================================================
   Cliente de la Web API de Spotify
   Todas las funciones devuelven datos ya adaptados con los
   mapeadores de arriba, igual que el modo demo.
   ========================================================= */
const SpotifyAPI = {
  isDemo: false,

  async request(path, params = {}, retry = true) {
    const url = new URL(SPOTIFY_API + path);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, value);
    }

    let token;
    try {
      token = await Auth.getAccessToken();
    } catch (error) {
      error.status = error.status || 401;
      throw error;
    }

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (response.status === 401 && retry) {
      await Auth.refresh();
      return this.request(path, params, false);
    }
    if (response.status === 429 && retry) {
      const wait = Number(response.headers.get("Retry-After")) || 1;
      await sleep(Math.min(wait, 10) * 1000);
      return this.request(path, params, false);
    }
    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.error?.message || `Error ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  },

  async getMe() {
    const me = await this.request("/me");
    return { name: me.display_name || me.id, image: pickImage(me.images, 64), url: me.external_urls?.spotify };
  },

  async getHome() {
    const [recent, topTracks, topArtists, playlists] = await Promise.allSettled([
      this.request("/me/player/recently-played", { limit: 20 }),
      this.request("/me/top/tracks", { limit: 10, time_range: "short_term" }),
      this.request("/me/top/artists", { limit: 12, time_range: "short_term" }),
      this.request("/me/playlists", { limit: 20 })
    ]);

    const sections = [];
    if (recent.status === "fulfilled") {
      const seen = new Set();
      const items = pageItems(recent.value)
        .map((entry) => entry.track)
        .filter((t) => t && !seen.has(t.id) && seen.add(t.id))
        .slice(0, 12)
        .map((t) => mapTrack(t));
      sections.push({ title: "Escuchado recientemente", kind: "cards", items });
    }
    if (topTracks.status === "fulfilled") {
      sections.push({ title: "Tus canciones más escuchadas", kind: "tracks", items: pageItems(topTracks.value).map((t) => mapTrack(t)) });
    }
    if (topArtists.status === "fulfilled") {
      sections.push({ title: "Tus artistas favoritos", kind: "cards", items: pageItems(topArtists.value).map(mapArtist) });
    }
    if (playlists.status === "fulfilled") {
      sections.push({ title: "Tus playlists", kind: "cards", items: pageItems(playlists.value).map(mapPlaylist) });
    }

    // Si todo falló, muestra el primer error
    if (sections.length === 0) {
      const failed = [recent, topTracks, topArtists, playlists].find((r) => r.status === "rejected");
      if (failed) throw failed.reason;
    }
    return sections.filter((s) => s.items.length > 0);
  },

  async search(query, types) {
    const data = await this.request("/search", {
      q: query,
      type: types.join(","),
      limit: CONFIG.searchLimit,
      market: "from_token"
    });
    return {
      tracks: pageItems(data.tracks).map((t) => mapTrack(t)),
      artists: pageItems(data.artists).map(mapArtist),
      albums: pageItems(data.albums).map(mapAlbum),
      playlists: pageItems(data.playlists).map(mapPlaylist)
    };
  },

  async getLibrary() {
    const data = await this.request("/me/playlists", { limit: 50 });
    return pageItems(data).map(mapPlaylist);
  },

  async getArtist(id) {
    const [artist, top, albums] = await Promise.allSettled([
      this.request(`/artists/${encodeURIComponent(id)}`),
      this.request(`/artists/${encodeURIComponent(id)}/top-tracks`, { market: "from_token" }),
      this.request(`/artists/${encodeURIComponent(id)}/albums`, { include_groups: "album,single", limit: 20 })
    ]);
    if (artist.status === "rejected") throw artist.reason;
    return {
      artist: mapArtist(artist.value),
      topTracks: top.status === "fulfilled" ? (top.value.tracks || []).map((t) => mapTrack(t)) : [],
      albums: albums.status === "fulfilled" ? pageItems(albums.value).map(mapAlbum) : []
    };
  },

  async getAlbum(id) {
    const data = await this.request(`/albums/${encodeURIComponent(id)}`, { market: "from_token" });
    const album = mapAlbum(data);
    const tracks = pageItems(data.tracks).map((t) => mapTrack(t, data));
    return { album, tracks };
  },

  async getPlaylist(id) {
    const data = await this.request(`/playlists/${encodeURIComponent(id)}`, { market: "from_token" });
    const playlist = mapPlaylist(data);
    const page = data.tracks || data.items;
    const tracks = pageItems(page)
      .map((entry) => entry.track || entry.item)
      .filter((t) => t && t.type === "track" && t.id)
      .map((t) => mapTrack(t));
    return { playlist, tracks };
  }
};

/* =========================================================
   Modo demo: datos de ejemplo con la misma forma que los
   que devuelve SpotifyAPI. Todos los nombres son ficticios.
   ========================================================= */
const DemoAPI = (() => {
  const artists = [
    { id: "demo-a1", name: "Luna Roja", genres: ["indie", "pop"], followers: 482310 },
    { id: "demo-a2", name: "Los Satélites", genres: ["rock", "alternativo"], followers: 1203400 },
    { id: "demo-a3", name: "Nova Kai", genres: ["electrónica", "house"], followers: 754020 },
    { id: "demo-a4", name: "Marea Alta", genres: ["reggaetón", "urbano"], followers: 2310980 },
    { id: "demo-a5", name: "Ciudad Neón", genres: ["synthwave", "electrónica"], followers: 318700 },
    { id: "demo-a6", name: "Valle Sur", genres: ["jazz", "soul"], followers: 96540 }
  ].map((a) => ({ ...a, type: "artist", image: null, url: null }));

  const albumSpecs = [
    { id: "demo-al1", name: "Horizonte", artist: "demo-a1", date: "2024-03-08", tracks: ["Primera luz", "Kilómetros", "Ventana al mar", "Ruido blanco", "Despedida lenta"] },
    { id: "demo-al2", name: "Órbita", artist: "demo-a2", date: "2023-10-20", tracks: ["Despegue", "Gravedad cero", "Señales", "Polvo de estrellas", "Regreso"] },
    { id: "demo-al3", name: "Pulso", artist: "demo-a3", date: "2025-01-17", tracks: ["Latido", "Frecuencia", "Medianoche", "Reflejos", "Amanecer digital"] },
    { id: "demo-al4", name: "Calor", artist: "demo-a4", date: "2024-07-05", tracks: ["Fuego lento", "Bailando sola", "Playa privada", "Sin frenos"] },
    { id: "demo-al5", name: "Autopista 1986", artist: "demo-a5", date: "2022-11-11", tracks: ["Luces traseras", "Cromo", "Arcade", "Lluvia en la ciudad"] },
    { id: "demo-al6", name: "Café de madrugada", artist: "demo-a6", date: "2021-05-28", tracks: ["Humo azul", "Swing del norte", "Terciopelo", "Última copa"] },
    { id: "demo-al7", name: "Cometa", artist: "demo-a1", date: "2025-09-12", tracks: ["Cometa", "Domingo"] }
  ];

  const artistById = Object.fromEntries(artists.map((a) => [a.id, a]));
  const albums = [];
  const tracks = [];

  for (const spec of albumSpecs) {
    const artist = artistById[spec.artist];
    const album = {
      type: "album",
      id: spec.id,
      name: spec.name,
      url: null,
      image: null,
      artists: [{ id: artist.id, name: artist.name }],
      releaseDate: spec.date,
      totalTracks: spec.tracks.length,
      albumType: spec.tracks.length <= 3 ? "single" : "album",
      genres: artist.genres
    };
    albums.push(album);
    spec.tracks.forEach((name, i) => {
      const id = `${spec.id}-t${i + 1}`;
      tracks.push({
        type: "track",
        id,
        name,
        uri: null,
        url: null,
        artists: [{ id: artist.id, name: artist.name }],
        album: { id: album.id, name: album.name },
        image: null,
        coverSeed: album.id,
        durationMs: 140000 + (hashString(id) % 100000),
        explicit: false,
        genres: artist.genres
      });
    });
  }

  const pick = (...ids) => ids.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);
  const playlists = [
    { id: "demo-p1", name: "Mañanas tranquilas", description: "Para arrancar el día con calma.", trackIds: ["demo-al1-t1", "demo-al6-t1", "demo-al1-t3", "demo-al6-t3", "demo-al7-t2"] },
    { id: "demo-p2", name: "Energía total", description: "Lo más intenso para entrenar.", trackIds: ["demo-al2-t1", "demo-al3-t1", "demo-al4-t4", "demo-al2-t2", "demo-al3-t3", "demo-al4-t1"] },
    { id: "demo-p3", name: "Noche en la ciudad", description: "Sintetizadores y luces de neón.", trackIds: ["demo-al5-t1", "demo-al3-t3", "demo-al5-t4", "demo-al5-t2", "demo-al3-t5"] },
    { id: "demo-p4", name: "Fiesta", description: "Para que nadie se quede sentado.", trackIds: ["demo-al4-t2", "demo-al4-t3", "demo-al3-t2", "demo-al4-t1"] }
  ].map((p) => ({
    type: "playlist",
    id: p.id,
    name: p.name,
    description: p.description,
    owner: "Sonora",
    url: null,
    image: null,
    total: p.trackIds.length,
    trackIds: p.trackIds
  }));

  const delay = (value) => sleep(150).then(() => structuredClone(value));
  const matches = (text, q) => text.toLowerCase().includes(q);

  return {
    isDemo: true,

    async getMe() {
      return { name: "Invitado", image: null, url: null };
    },

    async getHome() {
      return delay([
        { title: "Escuchado recientemente", kind: "cards", items: pick("demo-al3-t1", "demo-al1-t1", "demo-al5-t1", "demo-al4-t2", "demo-al6-t1", "demo-al2-t3") },
        { title: "Tus canciones más escuchadas", kind: "tracks", items: pick("demo-al4-t2", "demo-al1-t2", "demo-al3-t3", "demo-al2-t1", "demo-al5-t3") },
        { title: "Tus artistas favoritos", kind: "cards", items: artists },
        { title: "Playlists para ti", kind: "cards", items: playlists }
      ]);
    },

    async search(query) {
      const q = query.trim().toLowerCase();
      const trackMatch = (t) => matches(t.name, q) || t.artists.some((a) => matches(a.name, q)) || t.genres.some((g) => matches(g, q));
      return delay({
        tracks: tracks.filter(trackMatch).slice(0, CONFIG.searchLimit),
        artists: artists.filter((a) => matches(a.name, q) || a.genres.some((g) => matches(g, q))),
        albums: albums.filter((a) => matches(a.name, q) || a.artists.some((ar) => matches(ar.name, q)) || a.genres.some((g) => matches(g, q))),
        playlists: playlists.filter((p) => matches(p.name, q) || matches(p.description, q))
      });
    },

    async getLibrary() {
      return delay(playlists);
    },

    async getArtist(id) {
      const artist = artistById[id];
      if (!artist) throw Object.assign(new Error("Artista no encontrado"), { status: 404 });
      return delay({
        artist,
        topTracks: tracks.filter((t) => t.artists[0].id === id),
        albums: albums.filter((a) => a.artists[0].id === id)
      });
    },

    async getAlbum(id) {
      const album = albums.find((a) => a.id === id);
      if (!album) throw Object.assign(new Error("Álbum no encontrado"), { status: 404 });
      return delay({ album, tracks: tracks.filter((t) => t.album.id === id) });
    },

    async getPlaylist(id) {
      const playlist = playlists.find((p) => p.id === id);
      if (!playlist) throw Object.assign(new Error("Playlist no encontrada"), { status: 404 });
      return delay({ playlist, tracks: pick(...playlist.trackIds) });
    }
  };
})();

/* =========================================================
   Estado
   ========================================================= */
let api = DemoAPI;
let currentUser = null;

const Likes = {
  items: readJSON(STORAGE.likes, []),
  has(id) {
    return this.items.some((t) => t.id === id);
  },
  toggle(track) {
    if (this.has(track.id)) {
      this.items = this.items.filter((t) => t.id !== track.id);
      showToast("Eliminada de tus me gusta");
    } else {
      this.items.unshift(track);
      showToast("Añadida a tus me gusta");
    }
    localStorage.setItem(STORAGE.likes, JSON.stringify(this.items));
    document.querySelectorAll(`.like-btn[data-track-id="${CSS.escape(track.id)}"]`).forEach(updateLikeButton);
  }
};

/* =========================================================
   Componentes de la interfaz
   ========================================================= */
function coverFor(item, extraClass) {
  // Las canciones del modo demo usan el degradado de su álbum
  if (!item.image && item.coverSeed) return cover({ ...item, id: item.coverSeed, name: item.album?.name || item.name }, extraClass);
  return cover(item, extraClass);
}

function updateLikeButton(button) {
  const liked = Likes.has(button.dataset.trackId);
  button.classList.toggle("is-liked", liked);
  button.setAttribute("aria-label", liked ? "Quitar de me gusta" : "Me gusta");
  button.setAttribute("aria-pressed", String(liked));
  button.replaceChildren(icon(liked ? "heart" : "heartOutline", 18));
}

function likeButton(track) {
  const button = el("button", {
    type: "button",
    class: "icon-btn like-btn",
    dataset: { trackId: track.id },
    onclick: (event) => {
      event.stopPropagation();
      Likes.toggle(track);
    }
  });
  updateLikeButton(button);
  return button;
}

function artistLinks(artists) {
  const parts = [];
  artists.forEach((artist, i) => {
    if (i > 0) parts.push(", ");
    parts.push(
      artist.id
        ? el("a", { href: `#/artist/${encodeURIComponent(artist.id)}`, onclick: (e) => e.stopPropagation() }, artist.name)
        : artist.name
    );
  });
  return parts;
}

function trackList(tracks, { showCover = true, showAlbum = true } = {}) {
  const list = el("div", { class: "tracks", role: "list" });
  tracks.forEach((track, index) => {
    const row = el(
      "div",
      {
        class: "track",
        role: "listitem",
        tabindex: "0",
        dataset: { trackId: track.id },
        onclick: () => Player.play(track, tracks),
        onkeydown: (e) => {
          if (e.key === "Enter") Player.play(track, tracks);
        }
      },
      el("span", { class: "track__index" }, el("span", { class: "num" }, index + 1), icon("play", 16, "icon-play")),
      el(
        "div",
        { class: "track__main" },
        showCover ? coverFor(track, "cover--sm") : null,
        el(
          "div",
          { class: "track__text" },
          el("span", { class: "track__title" }, track.name),
          el("span", { class: "track__artists" }, track.explicit ? el("span", { class: "explicit", title: "Explícito" }, "E") : null, artistLinks(track.artists))
        )
      ),
      showAlbum && track.album
        ? el("span", { class: "track__album" }, el("a", { href: `#/album/${encodeURIComponent(track.album.id)}`, onclick: (e) => e.stopPropagation() }, track.album.name))
        : el("span", { class: "track__album" }),
      likeButton(track),
      el("span", { class: "track__duration" }, formatDuration(track.durationMs))
    );
    list.append(row);
  });
  highlightCurrent(list);
  return list;
}

function cardSubtitle(item) {
  switch (item.type) {
    case "track":
      return joinArtists(item.artists);
    case "artist":
      return "Artista";
    case "album":
      return `${(item.releaseDate || "").slice(0, 4)} · ${joinArtists(item.artists)}`;
    case "playlist":
      return item.description || (item.owner ? `De ${item.owner}` : "Playlist");
    default:
      return "";
  }
}

function card(item, siblings = []) {
  const isTrack = item.type === "track";
  const open = () => {
    if (isTrack) Player.play(item, siblings.filter((s) => s.type === "track"));
    else navigate(`#/${item.type}/${encodeURIComponent(item.id)}`);
  };

  const playButton = el(
    "span",
    {
      class: "play-btn play-btn--accent card__play",
      role: "button",
      "aria-label": `Reproducir ${item.name}`,
      onclick: (event) => {
        event.stopPropagation();
        playCollection(item, siblings);
      }
    },
    icon("play", 24)
  );

  return el(
    "button",
    { type: "button", class: "card", onclick: open, title: item.name },
    el("div", { class: "card__cover" }, coverFor(item), playButton),
    el("span", { class: "card__title" }, item.name),
    el("span", { class: "card__subtitle" }, cardSubtitle(item))
  );
}

/** Reproduce una canción, o la primera canción de un artista, álbum o playlist. */
async function playCollection(item, siblings = []) {
  try {
    if (item.type === "track") return Player.play(item, siblings.filter((s) => s.type === "track"));
    let tracks = [];
    if (item.type === "album") tracks = (await api.getAlbum(item.id)).tracks;
    if (item.type === "playlist") tracks = (await api.getPlaylist(item.id)).tracks;
    if (item.type === "artist") tracks = (await api.getArtist(item.id)).topTracks;
    if (tracks.length) Player.play(tracks[0], tracks);
    else showToast("No hay canciones para reproducir");
  } catch (error) {
    handleError(error);
  }
}

function cardGrid(items) {
  return el("div", { class: "cards" }, items.map((item) => card(item, items)));
}

function section(title, content) {
  return el("section", { class: "section" }, el("div", { class: "section__head" }, el("h2", { class: "section__title" }, title)), content);
}

function emptyState(title, text, action) {
  return el("div", { class: "state" }, icon("note", 48), el("p", { class: "state__title" }, title), text ? el("p", {}, text) : null, action || null);
}

function loadingState() {
  return el("div", { class: "skeleton", "aria-label": "Cargando" }, Array.from({ length: 6 }, () => el("div")));
}

function hero(item, typeLabel, meta, extra) {
  return el(
    "header",
    { class: "hero" },
    el("div", { class: "hero__cover" }, coverFor(item)),
    el(
      "div",
      { class: "hero__text" },
      el("span", { class: "hero__type" }, typeLabel),
      el("h1", { class: "hero__title" }, item.name),
      el("p", { class: "hero__meta" }, meta),
      extra || null
    )
  );
}

function actionBar(tracks, url) {
  return el(
    "div",
    { class: "actions" },
    el(
      "button",
      {
        type: "button",
        class: "play-btn play-btn--accent play-btn--lg",
        "aria-label": "Reproducir",
        disabled: tracks.length === 0,
        onclick: () => Player.play(tracks[0], tracks)
      },
      icon("play", 28)
    ),
    url ? el("a", { class: "btn btn--ghost", href: url, target: "_blank", rel: "noopener" }, icon("external", 16), "Abrir en Spotify") : null
  );
}

/* =========================================================
   Vistas
   ========================================================= */
function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

const Views = {
  async home() {
    const sections = await api.getHome();
    const name = currentUser && !api.isDemo ? `, ${currentUser.name}` : "";
    const root = el("div", {}, el("h1", { class: "greeting" }, `${greetingText()}${name}`));
    if (sections.length === 0) {
      root.append(emptyState("Todavía no hay nada por aquí", "Escucha música en Spotify y vuelve para ver tus recomendaciones."));
    }
    for (const s of sections) {
      root.append(section(s.title, s.kind === "tracks" ? trackList(s.items) : cardGrid(s.items)));
    }
    return root;
  },

  async search(route) {
    const query = route.params.get("q") || "";
    const type = route.params.get("type") || "all";
    const searchInput = document.getElementById("searchInput");
    if (document.activeElement !== searchInput) searchInput.value = query;

    if (!query.trim()) return browseView();

    const types = type === "all" ? ["track", "artist", "album", "playlist"] : [type];
    const results = await api.search(query, types);
    const root = el("div", {}, searchChips(query, type));

    const blocks = [];
    if (results.tracks.length) blocks.push(section("Canciones", trackList(type === "all" ? results.tracks.slice(0, 5) : results.tracks)));
    if (results.artists.length) blocks.push(section("Artistas", cardGrid(results.artists)));
    if (results.albums.length) blocks.push(section("Álbumes", cardGrid(results.albums)));
    if (results.playlists.length) blocks.push(section("Playlists", cardGrid(results.playlists)));

    if (blocks.length === 0) {
      root.append(emptyState(`No se encontraron resultados para "${query}"`, "Revisa la ortografía o prueba con otras palabras."));
    } else {
      root.append(...blocks);
    }
    return root;
  },

  async library() {
    const playlists = await api.getLibrary();
    const root = el("div", {}, el("h1", { class: "greeting" }, "Tu biblioteca"));

    const likedTracks = Likes.items;
    root.append(
      section(
        `Tus me gusta (${likedTracks.length})`,
        likedTracks.length
          ? trackList(likedTracks)
          : el("p", { class: "muted" }, "Toca el corazón de una canción para guardarla aquí.")
      )
    );
    root.append(section("Playlists", playlists.length ? cardGrid(playlists) : el("p", { class: "muted" }, "No tienes playlists todavía.")));
    return root;
  },

  async artist(route) {
    const { artist, topTracks, albums } = await api.getArtist(route.id);
    const meta = artist.followers != null ? `${formatNumber(artist.followers)} seguidores` : "";
    const tags = artist.genres?.length ? el("div", { class: "tags" }, artist.genres.slice(0, 5).map((g) => el("span", { class: "tag" }, g))) : null;
    return el(
      "div",
      {},
      hero(artist, "Artista", meta, tags),
      actionBar(topTracks, artist.url),
      topTracks.length ? section("Populares", trackList(topTracks.slice(0, 10))) : null,
      albums.length ? section("Discografía", cardGrid(albums)) : null
    );
  },

  async album(route) {
    const { album, tracks } = await api.getAlbum(route.id);
    const total = tracks.reduce((sum, t) => sum + t.durationMs, 0);
    const meta = [
      el("strong", {}, joinArtists(album.artists)),
      ` · ${(album.releaseDate || "").slice(0, 4)} · ${tracks.length} canciones, ${Math.round(total / 60000)} min`
    ];
    const label = album.albumType === "single" ? "Sencillo" : "Álbum";
    return el("div", {}, hero(album, label, meta), actionBar(tracks, album.url), trackList(tracks, { showCover: false, showAlbum: false }));
  },

  async playlist(route) {
    const { playlist, tracks } = await api.getPlaylist(route.id);
    const meta = [
      playlist.description ? el("span", {}, playlist.description, el("br")) : null,
      el("strong", {}, playlist.owner),
      ` · ${playlist.total ?? tracks.length} canciones`
    ];
    return el("div", {}, hero(playlist, "Playlist", meta), actionBar(tracks, playlist.url), trackList(tracks));
  }
};

const GENRES = ["Pop", "Rock", "Reggaetón", "Electrónica", "Hip hop", "Indie", "Jazz", "Synthwave"];

function browseView() {
  return el(
    "div",
    {},
    el("h1", { class: "greeting" }, "Explorar todo"),
    el(
      "div",
      { class: "genres" },
      GENRES.map((genre) => {
        const tile = el("button", { type: "button", class: "genre", onclick: () => navigate(`#/search?q=${encodeURIComponent(genre)}`) }, genre);
        tile.style.background = gradientFor(genre + "genre");
        return tile;
      })
    )
  );
}

function searchChips(query, active) {
  const options = [
    ["all", "Todo"],
    ["track", "Canciones"],
    ["artist", "Artistas"],
    ["album", "Álbumes"],
    ["playlist", "Playlists"]
  ];
  return el(
    "div",
    { class: "chips" },
    options.map(([value, label]) =>
      el(
        "button",
        {
          type: "button",
          class: `chip ${value === active ? "is-active" : ""}`,
          onclick: () => navigate(`#/search?q=${encodeURIComponent(query)}${value === "all" ? "" : `&type=${value}`}`, true)
        },
        label
      )
    )
  );
}

/* =========================================================
   Reproductor
   - Con la cuenta conectada usa el reproductor oficial
     (Spotify Embed), que reproduce la canción real.
   - En modo demo simula la reproducción.
   ========================================================= */
const Player = {
  queue: [],
  index: -1,
  playing: false,
  elapsed: 0,
  timer: null,

  get current() {
    return this.queue[this.index] || null;
  },

  play(track, queue = []) {
    if (!track) return;
    this.queue = queue.length ? queue : [track];
    this.index = Math.max(0, this.queue.findIndex((t) => t.id === track.id));
    this.load();
  },

  load() {
    const track = this.current;
    if (!track) return;

    const dom = Player.dom;
    dom.cover.replaceChildren(coverFor(track));
    dom.title.textContent = track.name;
    dom.artist.textContent = joinArtists(track.artists);
    dom.like.dataset.trackId = track.id;
    dom.like.classList.remove("hidden");
    updateLikeButton(dom.like);
    dom.prev.disabled = this.index <= 0;
    dom.next.disabled = this.index >= this.queue.length - 1;
    dom.play.disabled = false;

    if (track.url) {
      dom.open.href = track.url;
      dom.open.classList.remove("hidden");
    } else {
      dom.open.classList.add("hidden");
    }

    this.stopTimer();
    if (!api.isDemo && track.id) {
      // Reproductor oficial de Spotify
      dom.root.classList.add("has-embed");
      dom.progress.classList.add("hidden");
      dom.embed.classList.remove("hidden");
      const iframe = el("iframe", {
        src: `https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`,
        allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        loading: "lazy",
        title: `Reproductor: ${track.name}`
      });
      dom.embed.replaceChildren(iframe);
      this.playing = false;
    } else {
      dom.root.classList.remove("has-embed");
      dom.progress.classList.remove("hidden");
      dom.embed.classList.add("hidden");
      dom.embed.replaceChildren();
      this.elapsed = 0;
      this.playing = true;
      this.startTimer();
    }

    this.render();
    highlightCurrent(document);
  },

  toggle() {
    if (!this.current || !api.isDemo) return;
    this.playing = !this.playing;
    if (this.playing) this.startTimer();
    else this.stopTimer();
    this.render();
  },

  next() {
    if (this.index < this.queue.length - 1) {
      this.index++;
      this.load();
    } else {
      this.playing = false;
      this.stopTimer();
      this.render();
    }
  },

  prev() {
    if (this.elapsed > 3000 || this.index === 0) {
      this.elapsed = 0;
      this.render();
      return;
    }
    this.index--;
    this.load();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.elapsed += 500;
      if (this.elapsed >= (this.current?.durationMs || 0)) this.next();
      else this.render();
    }, 500);
  },

  stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  },

  render() {
    const dom = Player.dom;
    const track = this.current;
    const duration = track?.durationMs || 0;
    dom.play.replaceChildren(icon(this.playing ? "pause" : "play", 20));
    dom.play.setAttribute("aria-label", this.playing ? "Pausar" : "Reproducir");
    dom.current.textContent = formatDuration(this.elapsed);
    dom.total.textContent = formatDuration(duration);
    dom.fill.style.width = duration ? `${Math.min(100, (this.elapsed / duration) * 100)}%` : "0%";
  },

  reset() {
    this.stopTimer();
    this.queue = [];
    this.index = -1;
    this.playing = false;
    this.elapsed = 0;
    const dom = Player.dom;
    dom.root.classList.remove("has-embed");
    dom.embed.replaceChildren();
    dom.embed.classList.add("hidden");
    dom.progress.classList.remove("hidden");
    dom.cover.replaceChildren();
    dom.title.textContent = "Nada sonando";
    dom.artist.textContent = "Elige una canción";
    dom.like.classList.add("hidden");
    dom.open.classList.add("hidden");
    dom.play.disabled = dom.prev.disabled = dom.next.disabled = true;
    this.render();
  }
};

function highlightCurrent(scope) {
  const id = Player.current?.id;
  scope.querySelectorAll(".track").forEach((row) => row.classList.toggle("is-current", row.dataset.trackId === id));
}

/* =========================================================
   Cuenta y barra superior
   ========================================================= */
function renderAccount() {
  const account = document.getElementById("account");
  const topRight = document.getElementById("topbarRight");

  if (api.isDemo) {
    account.replaceChildren(
      el("span", { class: "account__name" }, "Modo demo"),
      el("span", { class: "account__hint" }, "Conecta tu cuenta para ver tu música de Spotify.")
    );
    topRight.replaceChildren(
      el("span", { class: "badge" }, "Demo"),
      el("button", { type: "button", class: "btn btn--primary", onclick: connect }, "Conectar Spotify")
    );
    return;
  }

  const avatar = currentUser?.image
    ? el("img", { class: "account__avatar", src: currentUser.image, alt: "" })
    : el("span", { class: "account__avatar" }, initials(currentUser?.name || "?"));
  account.replaceChildren(
    el("div", { class: "account__user" }, avatar, el("span", { class: "account__name" }, currentUser?.name || "Tu cuenta")),
    el("button", { type: "button", class: "btn btn--ghost", onclick: disconnect }, "Cerrar sesión")
  );
  topRight.replaceChildren(
    el("button", { type: "button", class: "btn btn--ghost", onclick: disconnect }, "Cerrar sesión")
  );
}

function connect() {
  if (!Auth.isConfigured()) {
    document.getElementById("redirectUriText").textContent = CONFIG.redirectUri;
    document.getElementById("setupDialog").showModal();
    return;
  }
  Auth.login().catch(handleError);
}

function disconnect() {
  Auth.logout();
  api = DemoAPI;
  currentUser = null;
  Player.reset();
  renderAccount();
  showToast("Sesión cerrada");
  router();
}

function handleError(error) {
  if (error?.status === 401 && !api.isDemo) {
    Auth.logout();
    api = DemoAPI;
    currentUser = null;
    Player.reset();
    renderAccount();
    showToast("Tu sesión de Spotify expiró. Vuelve a conectarte.", "error");
    router();
    return true;
  }
  showToast(error?.message || "Algo salió mal", "error");
  return false;
}

function errorView(error) {
  let text = error?.message || "Error desconocido";
  if (error?.status === 403) {
    text = "Spotify rechazó la solicitud. Si tu app está en modo desarrollo, agrega tu correo en User Management dentro del panel de Spotify.";
  } else if (error?.status === 404) {
    text = "No encontramos lo que buscabas.";
  }
  return emptyState("No se pudo cargar", text, el("button", { type: "button", class: "btn", onclick: () => router() }, "Reintentar"));
}

/* =========================================================
   Navegación (rutas con #)
   #/home · #/search?q= · #/library · #/artist/ID · #/album/ID · #/playlist/ID
   ========================================================= */
function parseRoute() {
  const hash = window.location.hash.slice(1) || "/home";
  const [path, query = ""] = hash.split("?");
  const parts = path.split("/").filter(Boolean);
  return {
    name: parts[0] || "home",
    id: parts[1] ? decodeURIComponent(parts[1]) : null,
    params: new URLSearchParams(query)
  };
}

function navigate(hash, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", hash);
    router();
  } else if (window.location.hash === hash) {
    router();
  } else {
    window.location.hash = hash;
  }
}

let renderId = 0;
async function router() {
  const id = ++renderId;
  const route = parseRoute();
  const view = Views[route.name] ? route.name : "home";

  document.querySelectorAll(".nav__link").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.route === view);
  });
  document.getElementById("searchForm").classList.toggle("hidden", view !== "search");

  const container = document.getElementById("view");
  const main = document.getElementById("main");
  // En la búsqueda no se borra la vista en cada tecla para evitar parpadeos
  if (view !== "search" || !container.firstChild) container.replaceChildren(loadingState());

  try {
    const content = await Views[view](route);
    if (id !== renderId) return;
    container.replaceChildren(content);
  } catch (error) {
    if (id !== renderId) return;
    if (handleError(error)) return;
    container.replaceChildren(errorView(error));
  }
  if (view !== "search") main.scrollTop = 0;
}

/* =========================================================
   Eventos
   ========================================================= */
Player.dom = {
  root: document.getElementById("player"),
  cover: document.getElementById("playerCover"),
  title: document.getElementById("playerTitle"),
  artist: document.getElementById("playerArtist"),
  like: document.getElementById("playerLike"),
  play: document.getElementById("playBtn"),
  prev: document.getElementById("prevBtn"),
  next: document.getElementById("nextBtn"),
  progress: document.getElementById("playerProgress"),
  current: document.getElementById("timeCurrent"),
  total: document.getElementById("timeTotal"),
  fill: document.getElementById("progressFill"),
  embed: document.getElementById("playerEmbed"),
  open: document.getElementById("playerOpen")
};

Player.dom.play.addEventListener("click", () => Player.toggle());
Player.dom.next.addEventListener("click", () => Player.next());
Player.dom.prev.addEventListener("click", () => Player.prev());
Player.dom.like.addEventListener("click", () => Player.current && Likes.toggle(Player.current));

document.getElementById("backBtn").addEventListener("click", () => window.history.back());
document.getElementById("forwardBtn").addEventListener("click", () => window.history.forward());

let searchTimer = null;
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value.trim();
    const type = parseRoute().params.get("type");
    const hash = q ? `#/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}` : "#/search";
    navigate(hash, true);
  }, 350);
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  navigate(q ? `#/search?q=${encodeURIComponent(q)}` : "#/search", true);
  searchInput.blur();
});

window.addEventListener("hashchange", router);

// Atajo: barra espaciadora para pausar en modo demo
document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (event.code === "Space" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON" && Player.current && api.isDemo) {
    event.preventDefault();
    Player.toggle();
  }
});

/* =========================================================
   Inicio
   ========================================================= */
async function init() {
  Player.render();

  try {
    await Auth.handleRedirect();
  } catch (error) {
    showToast(error.message, "error");
  }

  if (Auth.isConfigured() && Auth.isLoggedIn()) {
    api = SpotifyAPI;
    try {
      currentUser = await api.getMe();
      showToast(`Conectado como ${currentUser.name}`);
    } catch (error) {
      handleError(error);
    }
  }

  renderAccount();
  router();
}

init();
