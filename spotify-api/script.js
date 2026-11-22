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
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key === "style") Object.assign(node.style, value);
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
  prev: "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  next: "M6 18l8.5-6L6 6zM16 6v12h2V6z",
  shuffle:
    "M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  repeat: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  repeatOne: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z",
  heartOutline:
    "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z",
  external:
    "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3z",
  note: "M12 3v10.55A4 4 0 1 0 14 17V7h4V3z",
  home: "M12 3 2 11h3v9h5v-6h4v6h5v-9h3z",
  search:
    "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  library: "M4 4h2v16H4zm5 0h2v16H9zm4.6.9 1.9-.6 4.9 15-1.9.6z",
  chevronLeft: "M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z",
  chevronRight: "M10 6 8.6 7.4l4.6 4.6-4.6 4.6L10 18l6-6z",
  chevronDown: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z",
  expand: "M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z",
  verified:
    "M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48z"
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

/** Generador de números aleatorios con semilla (siempre da la misma secuencia). */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
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
   Arte generativo
   Crea una portada abstracta única (SVG) a partir de un texto.
   Se usa en el modo demo y cuando Spotify no trae imagen.
   ========================================================= */
const artCache = new Map();

function artFor(seed, wide = false) {
  const key = `${seed}|${wide ? "w" : "s"}`;
  if (artCache.has(key)) return artCache.get(key);

  const hash = hashString(String(seed));
  const rand = seededRandom(hash);
  const hue = hash % 360;
  const W = wide ? 600 : 300;
  const H = 300;
  const c1 = `hsl(${hue}, 72%, 58%)`;
  const c2 = `hsl(${(hue + 40) % 360}, 75%, 46%)`;
  const c3 = `hsl(${(hue + 190) % 360}, 68%, 62%)`;
  const dark = `hsl(${(hue + 20) % 360}, 45%, 12%)`;
  const colors = [c1, c2, c3];
  const style = hashString(`${seed}#style`) % 4;
  let shapes = "";

  if (style === 0) {
    // Esferas de color difuminadas
    for (let i = 0; i < 6; i++) {
      const cx = (rand() * W).toFixed(1);
      const cy = (rand() * H).toFixed(1);
      const r = (50 + rand() * 110).toFixed(1);
      shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[i % 3]}" opacity="${(0.55 + rand() * 0.4).toFixed(2)}" filter="url(#blur)"/>`;
    }
    shapes += `<circle cx="${(W * (0.3 + rand() * 0.4)).toFixed(1)}" cy="${(H * (0.3 + rand() * 0.4)).toFixed(1)}" r="${(18 + rand() * 30).toFixed(1)}" fill="#fff" opacity="0.85"/>`;
  } else if (style === 1) {
    // Ondas superpuestas
    const layers = 7;
    for (let i = 0; i < layers; i++) {
      const y0 = H * 0.22 + i * H * 0.11;
      const amp = 10 + rand() * 28;
      const freq = 1 + rand() * 2;
      const phase = rand() * Math.PI * 2;
      let d = `M0 ${y0.toFixed(1)}`;
      for (let x = 0; x <= W; x += 15) {
        const y = y0 + Math.sin((x / W) * Math.PI * 2 * freq + phase) * amp;
        d += ` L${x} ${y.toFixed(1)}`;
      }
      d += ` L${W} ${H} L0 ${H} Z`;
      shapes += `<path d="${d}" fill="${colors[i % 3]}" opacity="${(0.28 + i * 0.06).toFixed(2)}"/>`;
    }
  } else if (style === 2) {
    // Anillos concéntricos
    const cx = W * (0.35 + rand() * 0.3);
    const cy = H * (0.35 + rand() * 0.3);
    for (let i = 9; i >= 1; i--) {
      shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${i * 24}" fill="none" stroke="${colors[i % 3]}" stroke-width="${(5 + rand() * 9).toFixed(1)}" opacity="${(0.35 + rand() * 0.55).toFixed(2)}"/>`;
    }
    shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="16" fill="${c1}"/>`;
  } else {
    // Sol retro con cuadrícula
    const cx = W / 2;
    const horizon = H * 0.62;
    const r = H * 0.3;
    shapes += `<circle cx="${cx}" cy="${horizon - r * 0.35}" r="${r}" fill="url(#sun)"/>`;
    for (let i = 0; i < 5; i++) {
      const y = horizon - r * 0.35 + i * 13;
      shapes += `<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${3 + i * 1.6}" fill="${dark}"/>`;
    }
    shapes += `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${dark}"/>`;
    for (let i = 0; i < 7; i++) {
      const y = horizon + Math.pow(i / 6, 1.8) * (H - horizon);
      shapes += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${c1}" stroke-width="1.5" opacity="0.7"/>`;
    }
    for (let i = -8; i <= 8; i++) {
      shapes += `<line x1="${cx}" y1="${horizon}" x2="${cx + i * (W / 7)}" y2="${H}" stroke="${c1}" stroke-width="1.5" opacity="0.6"/>`;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${dark}"/></linearGradient>` +
    `<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c3}"/><stop offset="1" stop-color="${c1}"/></linearGradient>` +
    `<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>` +
    `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    shapes +
    `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.09"/>` +
    `</svg>`;

  const result = {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    color: `hsl(${(hue + 20) % 360}, 55%, 32%)`
  };
  artCache.set(key, result);
  return result;
}

function artSeed(item) {
  return item.coverSeed || item.album?.id || item.id || item.name || "sonora";
}

/** Dirección de la imagen de un elemento (la real o la generada). */
function imageFor(item, wide = false) {
  return item.image || artFor(artSeed(item), wide).url;
}

function cover(item, extraClass = "") {
  const classes = ["cover", extraClass, item.type === "artist" ? "cover--round" : ""].filter(Boolean).join(" ");
  const img = el("img", { class: classes, src: imageFor(item), alt: "", loading: "lazy", decoding: "async" });
  // Si la imagen real falla, usa la generada
  if (item.image) {
    img.addEventListener("error", () => (img.src = artFor(artSeed(item)).url), { once: true });
  }
  return img;
}

/* =========================================================
   Color dominante de una portada
   ========================================================= */
const colorCache = new Map();

function colorFor(item) {
  if (!item) return Promise.resolve(DEFAULT_COLOR);
  if (!item.image) return Promise.resolve(artFor(artSeed(item)).color);
  if (colorCache.has(item.image)) return colorCache.get(item.image);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 20;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          // Da más peso a los colores vivos
          const weight = 1 + ((max - min) / 255) * 6;
          r += data[i] * weight;
          g += data[i + 1] * weight;
          b += data[i + 2] * weight;
          total += weight;
        }
        resolve(toThemeColor(r / total, g / total, b / total));
      } catch {
        resolve(artFor(artSeed(item)).color);
      }
    };
    img.onerror = () => resolve(artFor(artSeed(item)).color);
    img.src = item.image;
  });
  colorCache.set(item.image, promise);
  return promise;
}

/** Convierte un color RGB en un tono apto para fondo oscuro. */
function toThemeColor(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `hsl(${Math.round(h)}, ${Math.round(clamp(s, 0.3, 0.75) * 100)}%, ${Math.round(clamp(l, 0.26, 0.36) * 100)}%)`;
}

const DEFAULT_COLOR = "hsl(150, 25%, 22%)";
const NEUTRAL_COLOR = "hsl(240, 6%, 20%)";

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
let renderId = 0;

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
    document.querySelectorAll(`.like-btn[data-track-id="${CSS.escape(track.id)}"]`).forEach((button) => {
      updateLikeButton(button);
      button.classList.remove("pop");
      void button.offsetWidth; // reinicia la animación
      button.classList.add("pop");
    });
  }
};

/* =========================================================
   Tema de color dinámico
   ========================================================= */
function setThemeColor(color) {
  document.documentElement.style.setProperty("--dyn", color);
}

/** Aplica el color de un elemento si la vista sigue siendo la misma. */
function themeFrom(item) {
  const id = renderId;
  colorFor(item).then((color) => {
    if (id === renderId) setThemeColor(color);
  });
}

/* =========================================================
   Componentes de la interfaz
   ========================================================= */
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

function equalizer() {
  return el("span", { class: "eq", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("i"));
}

function trackList(tracks, { showCover = true, showAlbum = true, context = "Tu música" } = {}) {
  const list = el("div", { class: "tracks", role: "list" });
  tracks.forEach((track, index) => {
    const row = el(
      "div",
      {
        class: "track",
        role: "listitem",
        tabindex: "0",
        dataset: { trackId: track.id },
        onclick: () => Player.play(track, tracks, context),
        onkeydown: (e) => {
          if (e.key === "Enter") Player.play(track, tracks, context);
        }
      },
      el("span", { class: "track__index" }, el("span", { class: "num" }, index + 1), icon("play", 16, "icon-play"), equalizer()),
      el(
        "div",
        { class: "track__main" },
        showCover ? cover(track, "cover--sm") : null,
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
    row.style.setProperty("--i", Math.min(index, 20));
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

function card(item, siblings = [], index = 0) {
  const isTrack = item.type === "track";
  const open = () => {
    if (isTrack) Player.play(item, siblings.filter((s) => s.type === "track"), "Escuchado recientemente");
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

  const node = el(
    "button",
    { type: "button", class: "card", onclick: open, title: item.name, dataset: { trackId: isTrack ? item.id : "" } },
    el("div", { class: "card__cover" }, cover(item), playButton),
    el("span", { class: "card__title" }, item.name),
    el("span", { class: "card__subtitle" }, cardSubtitle(item))
  );
  node.style.setProperty("--i", Math.min(index, 16));
  return node;
}

/** Reproduce una canción, o la primera canción de un artista, álbum o playlist. */
async function playCollection(item, siblings = []) {
  try {
    if (item.type === "track") return Player.play(item, siblings.filter((s) => s.type === "track"), "Escuchado recientemente");
    let tracks = [];
    if (item.type === "album") tracks = (await api.getAlbum(item.id)).tracks;
    if (item.type === "playlist") tracks = (await api.getPlaylist(item.id)).tracks;
    if (item.type === "artist") tracks = (await api.getArtist(item.id)).topTracks;
    if (tracks.length) Player.play(tracks[0], tracks, item.name);
    else showToast("No hay canciones para reproducir");
  } catch (error) {
    handleError(error);
  }
}

function cardGrid(items) {
  return el("div", { class: "cards" }, items.map((item, i) => card(item, items, i)));
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
  const isArtist = item.type === "artist";
  return el(
    "header",
    { class: `hero ${isArtist ? "hero--artist" : ""}` },
    isArtist ? el("img", { class: "hero__banner", src: imageFor(item, true), alt: "" }) : null,
    el("div", { class: "hero__cover" }, cover(item)),
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

function actionBar(tracks, url, context) {
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
        onclick: () => Player.play(tracks[0], tracks, context)
      },
      icon("play", 28)
    ),
    url ? el("a", { class: "btn btn--ghost", href: url, target: "_blank", rel: "noopener" }, icon("external", 16), "Abrir en Spotify") : null
  );
}

/** Título pequeño que aparece en la barra superior al hacer scroll. */
function setTopbarTitle(name, tracks = [], context) {
  const box = document.getElementById("topbarTitle");
  if (!name) {
    box.replaceChildren();
    return;
  }
  box.replaceChildren(
    el(
      "button",
      {
        type: "button",
        class: "play-btn play-btn--accent",
        "aria-label": `Reproducir ${name}`,
        disabled: tracks.length === 0,
        onclick: () => Player.play(tracks[0], tracks, context || name)
      },
      icon("play", 22)
    ),
    el("span", {}, name)
  );
}

/** Banner grande con arte, parallax y portadas apiladas. */
function featuredBanner(item, stackItems) {
  const banner = el(
    "section",
    {
      class: "featured",
      onclick: () => navigate(`#/${item.type}/${encodeURIComponent(item.id)}`),
      onpointermove: (e) => {
        if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
        const rect = banner.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        banner.style.setProperty("--px", `${(-x * 18).toFixed(1)}px`);
        banner.style.setProperty("--py", `${(-y * 14).toFixed(1)}px`);
      },
      onpointerleave: () => {
        banner.style.setProperty("--px", "0px");
        banner.style.setProperty("--py", "0px");
      }
    },
    el("img", { class: `featured__bg ${item.image ? "is-photo" : ""}`, src: imageFor(item, true), alt: "" }),
    el(
      "div",
      { class: "featured__content" },
      el("span", { class: "featured__label" }, "Destacado para ti"),
      el("h2", { class: "featured__title" }, item.name),
      el("p", { class: "featured__text" }, cardSubtitle(item)),
      el(
        "div",
        { class: "featured__actions" },
        el(
          "button",
          {
            type: "button",
            class: "play-btn play-btn--accent",
            "aria-label": `Reproducir ${item.name}`,
            onclick: (e) => {
              e.stopPropagation();
              playCollection(item);
            }
          },
          icon("play", 24)
        ),
        el("span", { class: "btn btn--ghost" }, "Ver ", item.type === "album" ? "álbum" : "playlist")
      )
    ),
    el("div", { class: "featured__stack", "aria-hidden": "true" }, stackItems.slice(0, 3).map((s) => el("img", { src: imageFor(s), alt: "" })))
  );
  return banner;
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

    // Banner: la primera playlist o álbum disponible
    const allCards = sections.filter((s) => s.kind === "cards").flatMap((s) => s.items);
    const featured = allCards.find((i) => i.type === "playlist") || allCards.find((i) => i.type === "album");
    if (featured) {
      root.append(featuredBanner(featured, allCards.filter((i) => i !== featured && i.type !== "artist")));
      themeFrom(Player.current || featured);
    } else if (Player.current) {
      themeFrom(Player.current);
    }

    if (sections.length === 0) {
      root.append(emptyState("Todavía no hay nada por aquí", "Escucha música en Spotify y vuelve para ver tus recomendaciones."));
    }
    for (const s of sections) {
      root.append(section(s.title, s.kind === "tracks" ? trackList(s.items, { context: s.title }) : cardGrid(s.items)));
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
    if (results.tracks.length) blocks.push(section("Canciones", trackList(type === "all" ? results.tracks.slice(0, 5) : results.tracks, { context: `Búsqueda: ${query}` })));
    if (results.artists.length) blocks.push(section("Artistas", cardGrid(results.artists)));
    if (results.albums.length) blocks.push(section("Álbumes", cardGrid(results.albums)));
    if (results.playlists.length) blocks.push(section("Playlists", cardGrid(results.playlists)));

    if (blocks.length === 0) {
      root.append(emptyState(`No se encontraron resultados para "${query}"`, "Revisa la ortografía o prueba con otras palabras."));
    } else {
      root.append(...blocks);
      const first = results.tracks[0] || results.artists[0] || results.albums[0];
      if (first) themeFrom(first);
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
          ? trackList(likedTracks, { context: "Tus me gusta" })
          : el("p", { class: "muted" }, "Toca el corazón de una canción para guardarla aquí.")
      )
    );
    root.append(section("Playlists", playlists.length ? cardGrid(playlists) : el("p", { class: "muted" }, "No tienes playlists todavía.")));
    setThemeColor("hsl(250, 35%, 28%)");
    return root;
  },

  async artist(route) {
    const { artist, topTracks, albums } = await api.getArtist(route.id);
    themeFrom(artist);
    setTopbarTitle(artist.name, topTracks);
    const meta = artist.followers != null ? `${formatNumber(artist.followers)} seguidores` : "";
    const tags = artist.genres?.length ? el("div", { class: "tags" }, artist.genres.slice(0, 5).map((g) => el("span", { class: "tag" }, g))) : null;
    const label = el("span", { class: "verified" }, icon("verified", 18), "Artista");
    return el(
      "div",
      {},
      hero(artist, label, meta, tags),
      actionBar(topTracks, artist.url, artist.name),
      topTracks.length ? section("Populares", trackList(topTracks.slice(0, 10), { context: artist.name })) : null,
      albums.length ? section("Discografía", cardGrid(albums)) : null
    );
  },

  async album(route) {
    const { album, tracks } = await api.getAlbum(route.id);
    themeFrom(album);
    setTopbarTitle(album.name, tracks);
    const total = tracks.reduce((sum, t) => sum + t.durationMs, 0);
    const meta = [
      el("strong", {}, joinArtists(album.artists)),
      ` · ${(album.releaseDate || "").slice(0, 4)} · ${tracks.length} canciones, ${Math.round(total / 60000)} min`
    ];
    const label = album.albumType === "single" ? "Sencillo" : "Álbum";
    return el(
      "div",
      {},
      hero(album, label, meta),
      actionBar(tracks, album.url, album.name),
      trackList(tracks, { showCover: false, showAlbum: false, context: album.name })
    );
  },

  async playlist(route) {
    const { playlist, tracks } = await api.getPlaylist(route.id);
    themeFrom(playlist);
    setTopbarTitle(playlist.name, tracks);
    const meta = [
      playlist.description ? el("span", {}, playlist.description, el("br")) : null,
      el("strong", {}, playlist.owner),
      ` · ${playlist.total ?? tracks.length} canciones`
    ];
    return el("div", {}, hero(playlist, "Playlist", meta), actionBar(tracks, playlist.url, playlist.name), trackList(tracks, { context: playlist.name }));
  }
};

const GENRES = ["Pop", "Rock", "Reggaetón", "Electrónica", "Hip hop", "Indie", "Jazz", "Synthwave"];

function browseView() {
  setThemeColor(NEUTRAL_COLOR);
  return el(
    "div",
    {},
    el("h1", { class: "greeting" }, "Explorar todo"),
    el(
      "div",
      { class: "genres" },
      GENRES.map((genre, i) => {
        const art = artFor(`genre-${genre}`);
        const tile = el(
          "button",
          { type: "button", class: "genre", onclick: () => navigate(`#/search?q=${encodeURIComponent(genre)}`) },
          genre,
          el("img", { src: art.url, alt: "" })
        );
        tile.style.background = art.color;
        tile.style.setProperty("--i", i);
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
   Los controles se identifican con data-action y las clases
   js-*, así la barra inferior y la pantalla completa se
   actualizan juntas.
   ========================================================= */
const REPEAT_MODES = ["off", "all", "one"];

const Player = {
  queue: [],
  index: -1,
  context: "Tu música",
  playing: false,
  elapsed: 0,
  shuffle: false,
  repeat: "off",
  timer: null,
  lastTick: 0,
  color: DEFAULT_COLOR,

  get current() {
    return this.queue[this.index] || null;
  },

  get usesEmbed() {
    return !api.isDemo && Boolean(this.current?.id);
  },

  play(track, queue = [], context = "Tu música") {
    if (!track) return;
    this.queue = queue.length ? [...queue] : [track];
    this.index = Math.max(0, this.queue.findIndex((t) => t.id === track.id));
    this.context = context;
    this.load();
  },

  jump(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.index = index;
    this.load();
  },

  load() {
    const track = this.current;
    if (!track) return;

    const dom = this.dom;
    dom.cover.replaceChildren(cover(track));
    document.querySelectorAll(".js-title").forEach((n) => (n.textContent = track.name));
    document.querySelectorAll(".js-artist").forEach((n) => (n.textContent = joinArtists(track.artists)));
    document.querySelectorAll(".js-like").forEach((button) => {
      button.dataset.trackId = track.id;
      button.classList.remove("hidden");
      updateLikeButton(button);
    });
    dom.context.textContent = this.context;
    dom.npLabel.src = imageFor(track);
    dom.npBg.src = imageFor(track);

    if (track.url) {
      dom.open.href = track.url;
      dom.open.classList.remove("hidden");
    } else {
      dom.open.classList.add("hidden");
    }

    colorFor(track).then((color) => {
      if (this.current !== track) return;
      this.color = color;
      dom.np.style.setProperty("--np", color);
      if (parseRoute().name === "home") setThemeColor(color);
    });

    this.stopTimer();
    this.elapsed = 0;
    if (this.usesEmbed) {
      // Reproductor oficial de Spotify
      dom.player.classList.add("has-embed");
      dom.embed.classList.remove("hidden");
      dom.npNote.classList.remove("hidden");
      dom.embed.replaceChildren(
        el("iframe", {
          src: `https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`,
          allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
          loading: "lazy",
          title: `Reproductor: ${track.name}`
        })
      );
      this.playing = false;
    } else {
      dom.player.classList.remove("has-embed");
      dom.embed.classList.add("hidden");
      dom.npNote.classList.add("hidden");
      dom.embed.replaceChildren();
      this.playing = true;
      this.startTimer();
    }

    this.renderQueue();
    this.render();
    highlightCurrent(document);
  },

  toggle() {
    if (!this.current || this.usesEmbed) return;
    this.playing = !this.playing;
    if (this.playing) this.startTimer();
    else this.stopTimer();
    this.render();
  },

  nextIndex() {
    if (this.queue.length <= 1) return this.repeat === "all" ? 0 : -1;
    if (this.shuffle) {
      let i;
      do i = Math.floor(Math.random() * this.queue.length);
      while (i === this.index);
      return i;
    }
    if (this.index < this.queue.length - 1) return this.index + 1;
    return this.repeat === "all" ? 0 : -1;
  },

  next() {
    const i = this.nextIndex();
    if (i >= 0) {
      this.index = i;
      this.load();
    } else {
      this.playing = false;
      this.elapsed = 0;
      this.stopTimer();
      this.render();
    }
  },

  prev() {
    if (this.elapsed > 3000 || this.index === 0) {
      this.seek(0);
      return;
    }
    this.index--;
    this.load();
  },

  /** Termina la canción: repite, pasa a la siguiente o se detiene. */
  ended() {
    if (this.repeat === "one") {
      this.elapsed = 0;
      this.render();
      return;
    }
    this.next();
  },

  seek(ms) {
    const duration = this.current?.durationMs || 0;
    this.elapsed = clamp(ms, 0, duration);
    this.render();
  },

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    showToast(this.shuffle ? "Aleatorio activado" : "Aleatorio desactivado");
    this.renderQueue();
    this.render();
  },

  cycleRepeat() {
    this.repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(this.repeat) + 1) % REPEAT_MODES.length];
    const labels = { off: "Repetir desactivado", all: "Repetir todo", one: "Repetir una canción" };
    showToast(labels[this.repeat]);
    this.render();
  },

  startTimer() {
    this.stopTimer();
    this.lastTick = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.elapsed += now - this.lastTick;
      this.lastTick = now;
      if (this.elapsed >= (this.current?.durationMs || 0)) this.ended();
      else this.renderProgress();
    }, 250);
  },

  stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  },

  renderProgress() {
    const duration = this.current?.durationMs || 0;
    const percent = duration ? clamp((this.elapsed / duration) * 100, 0, 100) : 0;
    document.querySelectorAll(".js-fill").forEach((n) => (n.style.width = `${percent}%`));
    document.querySelectorAll(".js-knob").forEach((n) => (n.style.left = `${percent}%`));
    document.querySelectorAll(".js-seek").forEach((n) => {
      n.setAttribute("aria-valuenow", Math.round(percent));
      n.setAttribute("aria-valuetext", `${formatDuration(this.elapsed)} de ${formatDuration(duration)}`);
    });
    document.querySelectorAll(".js-time-current").forEach((n) => (n.textContent = formatDuration(this.elapsed)));
    document.querySelectorAll(".js-time-total").forEach((n) => (n.textContent = formatDuration(duration)));
  },

  render() {
    const hasTrack = Boolean(this.current);
    const canControl = hasTrack && !this.usesEmbed;

    document.querySelectorAll('[data-action="toggle"]').forEach((button) => {
      const big = button.classList.contains("play-btn--xl");
      button.replaceChildren(icon(this.playing ? "pause" : "play", big ? 30 : 20));
      button.setAttribute("aria-label", this.playing ? "Pausar" : "Reproducir");
      button.disabled = !canControl;
    });
    document.querySelectorAll('[data-action="prev"]').forEach((b) => (b.disabled = !canControl));
    document.querySelectorAll('[data-action="next"]').forEach((b) => (b.disabled = !canControl || (this.nextIndex() < 0 && !this.shuffle)));
    document.querySelectorAll('[data-action="shuffle"]').forEach((b) => {
      b.classList.toggle("is-on", this.shuffle);
      b.setAttribute("aria-pressed", String(this.shuffle));
    });
    document.querySelectorAll('[data-action="repeat"]').forEach((b) => {
      const size = Number(b.dataset.size) || 20;
      b.classList.toggle("is-on", this.repeat !== "off");
      b.replaceChildren(icon(this.repeat === "one" ? "repeatOne" : "repeat", size));
      b.setAttribute("aria-label", { off: "Repetir", all: "Repetir todo", one: "Repetir una canción" }[this.repeat]);
    });
    document.querySelectorAll(".js-progress").forEach((p) => p.classList.toggle("is-disabled", !canControl));
    document.body.classList.toggle("is-playing", this.playing);
    this.dom.np.classList.toggle("is-playing", this.playing || this.usesEmbed);
    this.renderProgress();
  },

  renderQueue() {
    const list = this.dom.queue;
    if (this.shuffle) {
      list.replaceChildren(el("li", { class: "np__empty" }, "Modo aleatorio: la siguiente canción será una sorpresa."));
      return;
    }
    const upcoming = this.queue.slice(this.index + 1, this.index + 21);
    if (upcoming.length === 0) {
      list.replaceChildren(el("li", { class: "np__empty" }, this.repeat === "all" ? "La lista volverá a empezar." : "No hay más canciones en la cola."));
      return;
    }
    list.replaceChildren(
      ...upcoming.map((track, i) =>
        el(
          "li",
          {},
          el(
            "button",
            { type: "button", onclick: () => this.jump(this.index + 1 + i) },
            cover(track, "cover--sm"),
            el("span", {}, el("b", {}, track.name), el("small", {}, joinArtists(track.artists)))
          )
        )
      )
    );
  },

  reset() {
    this.stopTimer();
    this.queue = [];
    this.index = -1;
    this.playing = false;
    this.elapsed = 0;
    const dom = this.dom;
    dom.player.classList.remove("has-embed");
    dom.embed.replaceChildren();
    dom.embed.classList.add("hidden");
    dom.cover.replaceChildren();
    document.querySelectorAll(".js-title").forEach((n) => (n.textContent = "Nada sonando"));
    document.querySelectorAll(".js-artist").forEach((n) => (n.textContent = "Elige una canción"));
    document.querySelectorAll(".js-like").forEach((n) => n.classList.add("hidden"));
    dom.open.classList.add("hidden");
    NowPlaying.close();
    this.renderQueue();
    this.render();
  }
};

function highlightCurrent(scope) {
  const id = Player.current?.id;
  scope.querySelectorAll(".track").forEach((row) => row.classList.toggle("is-current", row.dataset.trackId === id));
  scope.querySelectorAll(".card[data-track-id]").forEach((c) => c.classList.toggle("is-current", Boolean(id) && c.dataset.trackId === id));
}

/* =========================================================
   Pantalla "Reproduciendo ahora" y visualizador
   ========================================================= */
const Visualizer = {
  canvas: null,
  ctx: null,
  bars: new Float32Array(56),
  targets: new Float32Array(56),
  running: false,
  lastShuffle: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    window.addEventListener("resize", () => this.running && this.resize());
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  },

  stop() {
    this.running = false;
  },

  frame(time) {
    if (!this.running) return;
    const { ctx, canvas, bars, targets } = this;
    const n = bars.length;
    const active = (Player.playing || Player.usesEmbed) && !prefersReducedMotion();

    // Cada 110 ms se generan nuevas alturas objetivo con un "pulso" rítmico
    if (time - this.lastShuffle > 110) {
      this.lastShuffle = time;
      const beat = 0.55 + 0.45 * Math.pow(Math.abs(Math.sin((time / 1000) * Math.PI * 2.05)), 6);
      for (let i = 0; i < n; i++) {
        const falloff = 1 - (i / n) * 0.55;
        targets[i] = active ? clamp(beat * falloff * (0.35 + Math.random() * 0.65), 0.05, 1) : 0.05;
      }
    }
    for (let i = 0; i < n; i++) bars[i] += (targets[i] - bars[i]) * 0.2;

    const w = canvas.width;
    const h = canvas.height;
    const mid = h * 0.7;
    const gap = w / n;
    const barW = gap * 0.55;
    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(1, "rgba(74,222,128,0.95)");

    for (let i = 0; i < n; i++) {
      const bh = Math.max(2, bars[i] * mid);
      const x = i * gap + (gap - barW) / 2;
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      roundedRect(ctx, x, mid - bh, barW, bh, barW / 2);
      // Reflejo
      ctx.globalAlpha = 0.18;
      roundedRect(ctx, x, mid + 3, barW, bh * 0.4, barW / 2);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame((t) => this.frame(t));
  }
};

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

const NowPlaying = {
  isOpen: false,
  lastFocus: null,

  open() {
    if (!Player.current) {
      showToast("Elige una canción para empezar");
      return;
    }
    const np = Player.dom.np;
    this.lastFocus = document.activeElement;
    this.isOpen = true;
    np.classList.add("is-open");
    np.setAttribute("aria-hidden", "false");
    np.inert = false;
    Visualizer.start();
    setTimeout(() => np.querySelector('[data-action="close-np"]').focus(), 50);
  },

  close() {
    if (!this.isOpen) return;
    const np = Player.dom.np;
    this.isOpen = false;
    np.classList.remove("is-open");
    np.setAttribute("aria-hidden", "true");
    np.inert = true;
    Visualizer.stop();
    if (this.lastFocus && document.contains(this.lastFocus)) this.lastFocus.focus();
  }
};

/* =========================================================
   Interacciones
   ========================================================= */

/** Efecto de onda al tocar botones. */
function addRipple(event) {
  const target = event.target.closest(".btn, .chip, .play-btn, .genre");
  if (!target || target.disabled || prefersReducedMotion()) return;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = el("span", { class: "ripple" });
  Object.assign(ripple.style, {
    width: `${size}px`,
    height: `${size}px`,
    left: `${event.clientX - rect.left - size / 2}px`,
    top: `${event.clientY - rect.top - size / 2}px`
  });
  target.append(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

/** Inclinación 3D de las tarjetas siguiendo el mouse. */
function tiltCard(event) {
  if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
  const card = event.target.closest(".card");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  card.style.setProperty("--ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
  card.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(2)}deg`);
  card.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
  card.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
}

function resetTilt(event) {
  const card = event.target.closest(".card");
  if (!card || card.contains(event.relatedTarget)) return;
  card.style.removeProperty("--rx");
  card.style.removeProperty("--ry");
}

/** Barra de progreso: clic, arrastre y teclado. */
function setupSeekBars() {
  document.querySelectorAll(".js-seek").forEach((bar) => {
    const seekTo = (clientX) => {
      const rect = bar.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      Player.seek(ratio * (Player.current?.durationMs || 0));
    };
    bar.addEventListener("pointerdown", (event) => {
      if (!Player.current || Player.usesEmbed) return;
      bar.setPointerCapture(event.pointerId);
      bar.classList.add("is-dragging");
      seekTo(event.clientX);
    });
    bar.addEventListener("pointermove", (event) => {
      if (bar.classList.contains("is-dragging")) seekTo(event.clientX);
    });
    const stop = () => bar.classList.remove("is-dragging");
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
    bar.addEventListener("keydown", (event) => {
      if (!Player.current || Player.usesEmbed) return;
      if (event.key === "ArrowRight") Player.seek(Player.elapsed + 5000);
      else if (event.key === "ArrowLeft") Player.seek(Player.elapsed - 5000);
      else return;
      event.preventDefault();
    });
  });
}

/** Efectos al hacer scroll: barra superior, título y parallax del encabezado. */
function onMainScroll() {
  const main = document.getElementById("main");
  const topbar = document.getElementById("topbar");
  const top = main.scrollTop;
  topbar.classList.toggle("is-scrolled", top > 12);

  const heroNode = main.querySelector(".hero");
  if (heroNode) {
    const height = heroNode.offsetHeight || 1;
    heroNode.style.setProperty("--p", clamp(top / height, 0, 1).toFixed(3));
    topbar.classList.toggle("show-title", top > height - 20);
  } else {
    topbar.classList.remove("show-title");
  }
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
  topRight.replaceChildren(el("button", { type: "button", class: "btn btn--ghost", onclick: disconnect }, "Cerrar sesión"));
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

async function router() {
  const id = ++renderId;
  const route = parseRoute();
  const view = Views[route.name] ? route.name : "home";
  const isDetail = ["artist", "album", "playlist"].includes(view);

  NowPlaying.close();
  document.querySelectorAll(".nav__link").forEach((link) => link.classList.toggle("is-active", link.dataset.route === view));
  document.getElementById("searchForm").classList.toggle("hidden", view !== "search");
  if (!isDetail) setTopbarTitle(null);

  const container = document.getElementById("view");
  const main = document.getElementById("main");
  const searching = view === "search" && container.dataset.view === "search";
  // En la búsqueda no se borra la vista en cada tecla para evitar parpadeos
  if (!searching) {
    container.replaceChildren(loadingState());
    if (view === "home") setThemeColor(Player.current ? Player.color : DEFAULT_COLOR);
    else if (!isDetail) setThemeColor(NEUTRAL_COLOR);
  }

  try {
    const content = await Views[view](route);
    if (id !== renderId) return;
    container.dataset.view = view;
    container.classList.remove("view-in");
    container.replaceChildren(content);
    if (!searching) {
      void container.offsetWidth; // reinicia la animación de entrada
      container.classList.add("view-in");
    }
  } catch (error) {
    if (id !== renderId) return;
    container.dataset.view = "";
    if (handleError(error)) return;
    container.replaceChildren(errorView(error));
  }
  if (!searching) main.scrollTop = 0;
  onMainScroll();
}

/* =========================================================
   Eventos
   ========================================================= */
Player.dom = {
  player: document.getElementById("player"),
  cover: document.getElementById("playerCover"),
  embed: document.getElementById("playerEmbed"),
  open: document.getElementById("playerOpen"),
  np: document.getElementById("nowPlaying"),
  npLabel: document.getElementById("npLabel"),
  npBg: document.getElementById("npBg"),
  npNote: document.getElementById("npEmbedNote"),
  context: document.getElementById("npContext"),
  queue: document.getElementById("npQueue")
};
Player.dom.np.inert = true;

// Iconos estáticos del HTML (data-icon="nombre")
document.querySelectorAll("[data-icon]").forEach((node) => {
  node.append(icon(node.dataset.icon, Number(node.dataset.size) || 20));
});

// Botones con data-action (barra inferior y pantalla completa)
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const actions = {
    toggle: () => Player.toggle(),
    next: () => Player.next(),
    prev: () => Player.prev(),
    shuffle: () => Player.toggleShuffle(),
    repeat: () => Player.cycleRepeat(),
    "open-np": () => NowPlaying.open(),
    "close-np": () => NowPlaying.close()
  };
  actions[button.dataset.action]?.();
});

document.querySelectorAll(".js-like").forEach((button) =>
  button.addEventListener("click", () => Player.current && Likes.toggle(Player.current))
);

// En móvil, tocar la canción de la barra inferior abre la pantalla completa
document.querySelector(".player__info").addEventListener("click", () => NowPlaying.open());

document.getElementById("backBtn").addEventListener("click", () => window.history.back());
document.getElementById("forwardBtn").addEventListener("click", () => window.history.forward());

document.addEventListener("pointerdown", addRipple);
const viewNode = document.getElementById("view");
viewNode.addEventListener("pointermove", tiltCard);
viewNode.addEventListener("pointerout", resetTilt);

const mainNode = document.getElementById("main");
let scrollFrame = 0;
mainNode.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      onMainScroll();
    });
  },
  { passive: true }
);

setupSeekBars();
Visualizer.init(document.getElementById("npViz"));

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

// Atajos de teclado
document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA";
  if (event.key === "Escape" && NowPlaying.isOpen) {
    NowPlaying.close();
    return;
  }
  if (typing || !Player.current || Player.usesEmbed) return;
  if (event.code === "Space" && tag !== "BUTTON") {
    event.preventDefault();
    Player.toggle();
  } else if (event.key === "ArrowRight" && event.shiftKey) {
    Player.next();
  } else if (event.key === "ArrowLeft" && event.shiftKey) {
    Player.prev();
  }
});

/* =========================================================
   Inicio
   ========================================================= */
async function init() {
  Player.render();
  Player.renderQueue();

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
      if (handleError(error)) return;
    }
  }

  renderAccount();
  router();
}

init();
