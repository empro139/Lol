# Sonora: página de música conectable a la API de Spotify

Página de música de estilo limpio y minimalista, hecha con HTML, CSS y JavaScript sin librerías.

- `index.html`: estructura (barra lateral, contenido y reproductor)
- `styles.css`: diseño oscuro y minimalista, adaptable a computadora, tablet y celular
- `script.js`: lógica, navegación y conexión con la Web API de Spotify

## Funciones

- **Inicio:** lo escuchado recientemente, tus canciones y artistas más escuchados y tus playlists.
- **Buscar:** canciones, artistas, álbumes y playlists, con filtros por tipo y géneros para explorar.
- **Páginas de artista, álbum y playlist** con su lista de canciones.
- **Tu biblioteca:** tus playlists y las canciones que marcas con el corazón (se guardan en el navegador).
- **Reproductor:** con la cuenta conectada usa el reproductor oficial de Spotify (Spotify Embed). Si iniciaste sesión en Spotify en ese navegador, reproduce la canción completa; si no, un fragmento.
- **Modo demo:** mientras no configures tu cuenta, la página funciona con datos de ejemplo ficticios.

## Cómo conectar tu cuenta de Spotify

### 1. Crea una app en Spotify

1. Entra a https://developer.spotify.com/dashboard e inicia sesión.
2. Pulsa **Create app**.
3. Escribe un nombre y una descripción.
4. En **Redirect URIs** agrega la dirección **exacta** donde abres la página. Ejemplos:
   - Con Live Server de VS Code: `http://127.0.0.1:5500/spotify-api/index.html`
   - Publicada en internet: `https://tu-dominio/spotify-api/index.html`
5. En **Which API/SDKs are you planning to use?** marca **Web API**.
6. Acepta los términos y guarda.

> Spotify no acepta `localhost` como Redirect URI: usa `127.0.0.1`. Las direcciones que no sean locales deben usar `https`.

### 2. Pega tu Client ID

1. En tu app de Spotify, entra a **Settings** y copia el **Client ID**.
2. Abre `script.js` y pégalo al inicio:

```js
const CONFIG = {
  clientId: "PEGA_AQUI_TU_CLIENT_ID",
  ...
};
```

**Nunca pongas el Client Secret en este archivo.** La página usa el flujo *Authorization Code con PKCE*, pensado para aplicaciones que corren en el navegador, y no lo necesita.

### 3. Agrega tu cuenta como usuario de prueba

Las apps nuevas empiezan en **modo desarrollo** y solo las pueden usar las cuentas que agregues. En tu app ve a **User Management** y agrega el correo de tu cuenta de Spotify.

### 4. Conéctate

Abre la página en la misma dirección que registraste y pulsa **Conectar Spotify**. Spotify te pedirá permiso y te regresará a la página ya conectado.

## Notas

- `CONFIG.redirectUri` usa automáticamente la dirección actual de la página. Si Spotify muestra `INVALID_CLIENT: Invalid redirect URI`, revisa que la dirección registrada sea idéntica (incluido `index.html` y la `/` final).
- La página no funciona conectada si la abres como archivo (`file://...`), porque Spotify necesita una Redirect URI `http://127.0.0.1` o `https`. En modo demo sí funciona como archivo.
- Spotify cambia de vez en cuando qué funciones de la API pueden usar las apps en modo desarrollo. Cada sección de la página se carga por separado: si Spotify bloquea una, las demás siguen funcionando.
- Los permisos (`scopes`) que pide la página son de solo lectura: tu perfil, tus canciones y artistas más escuchados, lo escuchado recientemente y tus playlists.

## Estructura del código (`script.js`)

| Parte | Qué hace |
| --- | --- |
| `CONFIG` | Client ID, Redirect URI, permisos y límite de resultados |
| `Auth` | Inicio de sesión con PKCE, guardado y renovación automática del token |
| `SpotifyAPI` | Llamadas a la Web API (`/me`, `/search`, `/artists`, `/albums`, `/playlists`...) con reintentos ante errores 401 y 429 |
| `mapTrack`, `mapArtist`, `mapAlbum`, `mapPlaylist` | Convierten las respuestas de Spotify al formato que usa la interfaz |
| `DemoAPI` | Datos de ejemplo con la misma forma que `SpotifyAPI` |
| `Views` | Pantallas de inicio, búsqueda, biblioteca, artista, álbum y playlist |
| `Player` | Reproductor: Spotify Embed con cuenta conectada, simulación en modo demo |

Para agregar una función nueva de la API, crea un método en `SpotifyAPI` y otro con el mismo nombre en `DemoAPI`, y úsalo desde una vista.
