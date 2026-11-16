# Alma Digital Studio — sitio web

## Objetivo
Portfolio web inmersivo para Alma Digital Studio, estudio creativo de arte multimedia. Presenta el
estudio, sus proyectos y equipo con una estética audiovisual interactiva, en inglés y español.

## Stack tecnológico
- HTML/CSS/JS puros, sin framework ni bundler.
- Las páginas se **generan** con `node src/build.mjs` (Node, sin dependencias) a partir de archivos
  de datos, y se commitean ya generadas. Netlify no corre el generador: publica el HTML tal cual.
- WebGL Fluid Simulation (fork de PavelDoGreat) en `js/fluid.js`.
- Ameba del hero: shader propio en `js/ameba.js` (WebGL 1, sin librerías, ~6 KB).
- Google Fonts: Raleway (200, 300, 400, 500). GSAP (`gsap.min.js`) sólo lo usa `soul-charger.html`.

## Estructura de carpetas
```
├── src/                       # FUENTE del sitio (no se publica)
│   ├── build.mjs              # generador: plantillas de todas las páginas
│   ├── site.json              # textos de interfaz EN/ES, hero, clientes, destacados, ajustes
│   ├── projects.json          # las 19 obras (inglés): textos, créditos, sedes, tecnología
│   └── i18n/
│       ├── projects.es.json   # las obras en español
│       └── studio.json        # about, equipo y spin-offs en los dos idiomas
├── css/site.css               # estilos (dos temas por tokens: aura y night)
├── js/
│   ├── fluid.js               # MÓDULO CERRADO: simulación de fluido
│   ├── cursor.js              # MÓDULO CERRADO: cursor propio
│   ├── ameba.js               # la ameba viva del hero
│   └── app.js                 # header, contacto, reel, filtros, lightbox
├── index.html, studio.html    # GENERADOS (inglés). No editar a mano
├── work/index.html            # GENERADO: índice de obras con filtros
├── work/<obra>.html           # GENERADO: una ficha por obra (19)
├── es/…                       # GENERADO: lo mismo en español
├── sitemap.xml                # GENERADO
├── soul-charger.html          # página dedicada a Soul Charger (a mano, ~3400 líneas, sólo inglés)
├── robots.txt                 # bots fuera de los videos + bloqueo de scrapers de IA/SEO
├── tools/deploy_copy.py       # arma dist/ con sólo lo que la web usa (lo corre Netlify)
├── tools/make_share_images.py # imágenes 1200×630 para compartir y el icono del header
├── netlify.toml               # build: python3 tools/deploy_copy.py dist → publica dist/
├── _masters/                  # originales de los archivos recomprimidos (NO se publica)
├── prototype/                 # prototipo de Beltrán del que salió esta estructura (NO se publica)
├── .claude/launch.json        # preview local (python -m http.server 5599)
└── Asset/                     # imágenes, videos, fuentes. Asset/og/ = imágenes para compartir
```

## Cómo se cambia algo
1. Editar la **fuente**, nunca el HTML generado:
   - Un texto de interfaz, el titular del hero, la lista de clientes o las obras destacadas → `src/site.json`
   - Una obra → `src/projects.json` y su traducción en `src/i18n/projects.es.json`
   - Equipo, spin-offs o el texto "about" → `src/i18n/studio.json`
   - El armado de una página → `src/build.mjs`. El aspecto → `css/site.css`. El comportamiento → `js/app.js`
2. `node src/build.mjs` (rehace `index.html`, `studio.html`, `work/`, `es/` y `sitemap.xml`).
3. Probar en local y commitear **fuente y HTML generado juntos**.

**Agregar una obra:** sumar la entrada en `src/projects.json` (mismo formato que las demás; `formatKey`
tiene que existir en `site.json → formats`), su traducción en `projects.es.json`, los assets en
`Asset/Studio Projects/` o `Asset/Commisions/`, correr `python3 tools/make_share_images.py` (imagen para
compartir) y `node src/build.mjs`. Si falta la traducción, la ficha en español sale en inglés y el
generador lo avisa.

## Páginas
- **Landing** (`index.html`), cinco bloques: hero (ameba viva + titular + credenciales + dos botones),
  reel, seis obras destacadas (`site.json → featured`), "con quién trabajamos" y contacto.
- **Índice de obras** (`work/`): lista filtrable por línea (obra propia / encargos) y formato, con
  vista previa al pasar el mouse.
- **Ficha de obra** (`work/<slug>.html`): portada, ficha técnica, concepto, galería con lightbox, reel,
  créditos, historial de exhibición, botón de consulta y obra siguiente.
- **Studio** (`studio.html`): about, equipo y spin-offs.
- **Español**: las mismas páginas bajo `/es/`, con los mismos slugs. Cada página enlaza a su par
  (`hreflang`) y el header tiene el cambio de idioma.

## Temas
`css/site.css` define todo el color con tokens en `:root`. Hay dos temas:
- **aura** (por defecto): velo claro sobre el fluido y texto en tinta `#211f6b`. Sigue el sistema de marca.
- **night**: velo oscuro y texto blanco, como el prototipo.

Para comparar: `?theme=night` o `?theme=aura` en cualquier URL. En localhost y en las vistas previas de
Netlify aparece además una barra "Tema" abajo a la izquierda; en el dominio publicado no.
El velo existe porque el texto directo sobre el fluido daba un contraste de 1,7:1.

## Decisiones vigentes
- **Fluido de fondo**: canvas fijo `#fluid`, `z-index: 0`, recibe mousemove de `window`. Tiene que ser
  el **primer `<canvas>`** del documento (así lo busca `fluid.js`).
- **Paleta oficial del fluido**: fondo `#adc8ed` → `BACK_COLOR: {r:173, g:200, b:237}`; colores
  `#3530a0` (×3), `#de79ff`, `#8282ff` (×2), `#fbc2ff`, `#9a3ec7` (×2); multiplicador generateColor
  `0.119`; splatPointer `×0.162`; emisores `×0.097`.
- **Paleta de soul-charger.html**: fondo `{r:132, g:95, b:221}`, mismos colores sin crema, multiplicador `0.108`.
- **Tipografía**: Raleway 200–500. Se decidió **no** adoptar Poiret One / DM Sans en la web (nov. 2026).
- **Scroll normal**: sin salto por secciones ni puntos de navegación. Zoom y selección de texto habilitados.
- **Sin animaciones de entrada sobre el texto**: todo lo que se lee tiene que estar visible en el primer
  cuadro (pestañas en segundo plano, vistas previas de enlaces).
- **Dominio principal sin `www`**: canonical, Open Graph y sitemap apuntan a `https://almadigitalstudio.com/`.

## Módulos cerrados (no tocar sin preguntar)
- **`js/fluid.js`** — motor de física, paleta y parámetros. Es el del sitio anterior, extraído tal cual.
  Trae `AlmaFluid.setPalette()` (del prototipo) para teñir el fondo por obra, pero está **apagado**
  (`site.json → perProjectPalette: false`): la paleta sigue siendo la oficial en todas las páginas.
- **`js/cursor.js`** — anillo + 6 partículas con lerp, copiado tal cual. Tamaños, opacidades y lerp
  están calibrados. El color cambia por tema **desde el CSS** (`--cursor` y un filtro SVG), sin tocar el JS.
- **Reabiertos el 2026-11-16** con el acuerdo de Vicente (a confirmar con Beltrán):
  - el **logo del hero** en tres capas pasó a ser la ameba viva (`js/ameba.js`); la imagen de siempre
    (`Logo.webp`) queda de respaldo si WebGL no arranca;
  - la **navegación por secciones** pasó a scroll normal.

## Reel y videos: cuidado con los créditos
El ancho de banda es lo que agotó los créditos en octubre de 2026 (20 créditos por GB).
- **Reel del estudio** (21 MB; 7,5 MB la versión vertical): en modo **clic** (`site.json →
  reelAutoplayOnView: false`). Se ve el póster y el video se descarga recién al reproducir. En escritorio
  abre a pantalla completa con sonido; en el teléfono se reproduce en su lugar y nunca pide la versión
  de escritorio. Antes arrancaba solo al acercarse, pero estaba dos pantallas más abajo; ahora es el
  segundo bloque y con ese criterio lo bajaría casi toda visita (~0,4 créditos cada una).
- **Reels de las fichas** (0,6–4 MB): `preload="none"`, se piden cuando un cuarto del video ya está en
  pantalla y se pausan al salir.
- **Vista previa del índice**: carga el reel de la obra al pasar el mouse (sólo escritorio).
- `#sc-trailer` en soul-charger.html: carga diferida como antes.
- **No poner `autoplay`** en videos de más de un par de MB.
- Compresión de videos de sección: H.264 `-crf 27 -preset slow`, AAC 128k si tienen audio, `+faststart`.

## Convención de assets de proyecto (Studio Projects / Commisions)
Una carpeta por proyecto dentro de `Asset/Studio Projects/` o `Asset/Commisions/`:
- **Fotos WebP a 1920×1080**, `quality 85`. Hoy hay 3 por obra; la galería de la ficha admite las que
  se quieran (lista `photos` en `projects.json`). Una lleva sufijo ` Portada` y va en `cover`.
  Fuentes con otro aspecto → recortar centrado a 16:9 antes de escalar:
  `crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1920:1080:flags=lanczos`
- **1 reel MP4 vertical 406×720** (9:16), H.264, **sin audio**, `-crf 30 -preset slow`,
  `-movflags +faststart`. Peso objetivo 0,5–2 MB. En la ficha se ven algo blandos: conviene
  reexportarlos más grandes desde los másters cuando se pueda.
  Si el material original es apaisado (16:9), se compone sobre lienzo 406×720 con relleno
  desenfocado del propio plano (`gblur=sigma=26` + `eq=brightness=-0.14:saturation=0.85`).
- Originales pesados van a `_masters/` (mismo árbol que `Asset/`), no a `Asset/`.

## Deploy (Netlify)
- Sitio `glowing-sunflower-a7a485` → `almadigitalstudio.com`. **Plan Personal desde 2026-10-20**:
  1.000 créditos/mes, ciclo que arranca el 20.
- **Deploy automático desde GitHub** (repo privado en la cuenta de Beltrán):
  - push / merge a `main` → **producción** (15 créditos).
  - pull requests y otras ramas → **vista previa** con URL propia (gratis).
  - Netlify corre `python3 tools/deploy_copy.py dist` y publica `dist/` (`netlify.toml`).
- `tools/deploy_copy.py` publica las páginas (`.html` de la raíz, `work/`, `es/`, `es/work/`), `css/`,
  `js/`, `robots.txt`, `sitemap.xml` y los archivos de `Asset/` que alguna página, CSS o JS referencia.
  `src/`, archivos de trabajo, `_masters/`, `prototype/` y `CLAUDE.md` no se publican.
  **Nunca `netlify deploy --dir .`** (publicaría todo).
- Una carpeta nueva de páginas hay que sumarla a `PAGE_DIRS` en ese script.
- Deploy manual de emergencia (cuesta 15 igual): `python tools/deploy_copy.py dist` y
  `npx netlify deploy --prod --dir dist`.
- **Tarifas**: deploy de producción = 15 créditos; ancho de banda = 20 créditos/GB; requests web =
  2 créditos / 10.000. Deploy previews gratis. → Agrupar cambios en **un solo deploy**.

## Analítica
Cloudflare Web Analytics, **activa desde 2026-10-15**. Panel: dash.cloudflare.com → Web Analytics →
`almadigitalstudio.com`. El cargador lo escribe `src/build.mjs` en el `<head>` de cada página generada
(token en `site.json → analyticsToken`, público); `soul-charger.html` lo tiene a mano. Vaciar el token la
desactiva. **No** cambiar nameservers a Cloudflare.

## Trabajo en equipo (Beltrán + Vicente, cada uno con su Claude Code)
- **No commitear directo a `main`**: cada commit ahí es un deploy de 15 créditos.
  Trabajar en una rama, abrir pull request, revisar en la URL de vista previa, merge.
- `git pull` antes de empezar. Si los dos tocan `src/build.mjs` o `css/site.css` a la vez, avisarse.
  El HTML generado da conflictos fáciles de resolver: se vuelve a correr `node src/build.mjs`.
- Mail público de contacto: `vicente@almadigitalstudio.com` (`site.json → email`). Formulario: Formspree.

## soul-charger.html — decisiones clave

### Header `#sc-header`
- Mismas dimensiones que `#site-header` de index.html: `padding: 22px var(--px)`, logo `32px`, nav `0.88rem`/`gap: 36px`/`letter-spacing: 0.06em`
- Aparece instantáneamente (sin animación de entrada, `opacity: 1`)
- Oculto en mobile (reemplazado por botón back inline)

### sc-4 Carrusel de fotos — patrón correcto
- Imágenes con carga **eager** (sin `loading="lazy"`) — crítico para que `measureTrack` funcione en `window.load`
- Animación arranca **pausada** en CSS (`animation-play-state: paused`)
- `measureTrack` mide anchos reales, setea `--sc-group-w`, reinicia y arranca (`animationPlayState = 'running'`)
- Si se agrega `loading="lazy"` a las imágenes, la animación volverá a ser lenta en primera carga

### sc-6 — Logo Alma Digital (última sección)
- Tamaño: `clamp(460px, 69vw, 989px)` desktop / `clamp(299px, 80vw, 483px)` mobile
- Glow `::before`: `radial-gradient` púrpura + `blur(44px)` — igual que hero de index.html
- 3 capas con `mix-blend-mode: screen` + breathing animation independiente por capa

## Pendientes
- **Contenido que sólo tiene el estudio**: año de cada obra (`year`), prensa (`press`), textos largos
  (`body`; hoy sólo Neural Canvas y Collective Pulse tienen tres párrafos), más fotos por obra, reels
  más nítidos, permiso para mostrar logos de clientes.
- **Revisar los borradores**: titular y bajada del hero, lista de clientes y obras destacadas
  (`site.json`), y las traducciones al español.
- **Visor 360° / domo** en las fichas de Neurocosm Full Dome, Neurocosm 360, Alma Digital 360 y LPS:
  falta material equirectangular. Opciones evaluadas: Pannellum (19 KB) o Three.js (155 KB); el formato
  domo (ojo de pez) necesita un shader propio en los dos casos. Si entra Three.js, sus archivos van en
  `js/` para que se publiquen.
- **Probar en teléfonos reales** (ameba + fluido a la vez, batería y temperatura) y hacer un envío real
  del formulario en la vista previa.
- `soul-charger.html` sigue con el aspecto anterior y sólo en inglés.
- `LDR_LLL1_0.png` da 404: textura de dithering del fluido que falta desde siempre. No afecta nada visible.

## Android scroll — decisión técnica (no reabrir)

**Problema:** Chrome Android bloqueaba el scroll en toda la página. El `canvas` (position:fixed, 100% viewport, z-index:0) tiene un listener `touchmove` no-pasivo con `e.preventDefault()`. Chrome Android, a diferencia de iOS, escanea geométricamente todos los elementos superpuestos al toque — no solo por z-index — y al encontrar ese listener bloqueaba el compositor de scroll.

**Solución aplicada en `index.html` y `soul-charger.html`:**
1. `canvas { touch-action: none; }` — global: excluye el canvas del análisis de gestos de scroll del compositor
2. `canvas { pointer-events: none !important; }` — solo `@media (pointer: coarse)`: en mobile el canvas no recibe eventos táctiles; su `touchmove` con `preventDefault()` nunca se activa
3. `#hero { touch-action: pan-y; }` — solo mobile: `touch-action` no se hereda en CSS; declaración explícita necesaria en Android

El fluid sim sigue corriendo con auto-emitters en mobile. Los usuarios de Android no pueden tocar el fondo para emitir fluidos (correcto — el dedo es para el scroll).

## Historial de sesiones (última al tope)

### 2026-11-16 — Etapas 1 a 3: sitio nuevo generado, bilingüe, con la ameba viva (Vicente)

Rama `rediseno-landing`, encima de `etapa-0-arreglos`. Cambia la arquitectura: el sitio deja de ser un
solo `index.html` de 4.900 líneas y pasa a generarse con `src/build.mjs`, tomando la estructura del
prototipo de Beltrán (landing + índice filtrable + una ficha por obra).

- **Landing de cinco bloques** en vez de ocho. La primera pantalla dice qué hace el estudio, muestra
  credenciales (IDB, EUIPO, Johns Hopkins, New Images, Adidas, LATAM, Pacha Ibiza) y tiene dos botones.
  Antes era sólo el logo.
- **Una página por obra** (19) con URL propia, imagen para compartir y datos estructurados. Antes las
  descripciones y créditos vivían en atributos `data-*` de un modal: no se podían enlazar ni indexar.
- **Inglés y español** (44 páginas). Traducciones en `src/i18n/`, a revisar por el estudio.
- **Legibilidad**: velo entre el fluido y el contenido, texto en tinta, cuerpo de 16 px como mínimo.
- **Ameba viva** en el hero (`js/ameba.js`): respira cada 6 s, gira con el puntero, muta con el scroll y
  cambia de forma con un clic. Se pausa fuera de pantalla y baja sola de resolución si el equipo no da.
- **Reel con clic** en vez de arranque automático (ver "Reel y videos").
- Equipo y spin-offs pasaron a `studio.html`.
- Primera carga en escritorio: de 928 KB a unos 500 KB, sin ningún video.
- Fluido y cursor copiados tal cual a `js/fluid.js` y `js/cursor.js`.
- `tools/deploy_copy.py` reescrito para el sitio de varias páginas; `sitemap.xml` y su línea en `robots.txt`.

**Verificado en local**, escritorio 1440×900 y móvil 375×812, en los dos temas: consola sin errores
nuevos; formulario con `fetch` simulado (éxito, error, validaciones) sin enviar nada a Formspree;
filtros, vista previa, lightbox y reel; 45 páginas y 1.241 referencias locales del paquete de
publicación sin enlaces rotos. **Sin probar**: teléfonos reales, rendimiento con los dos canvas, un
envío real del formulario y cómo se ve el link al compartirlo.

**Borradores a revisar por el estudio**: textos del hero, lista de clientes, obras destacadas y todas
las traducciones. Inconsistencias de los datos originales que quedaron como estaban: "Beltran Lihn"
sin acento en el equipo y "Beltrán" en los créditos; "IDB Bank" escrito de tres formas; Mapping
Mediamorfosis dice "Viña del Mar International Festival" en el texto y "Festival Mediamorfosis 2024" en
las sedes; "Digital Sanctuary" / "Digital Sanctuaries"; "My2DROPS" / "my2DROPS".

### 2026-11-16 — Etapa 0: arreglos sin cambiar el diseño (Vicente)

Primera etapa de un plan de rediseño en cuatro (0 arreglos · 1 legibilidad · 2 estructura con una
página por obra · 3 animación). Rama `etapa-0-arreglos`. No toca ningún módulo cerrado.

**index.html:**
- **Formulario de contacto:** antes cerraba el modal y recién después enviaba, descartando errores:
  un envío fallido no lo veía nadie. Ahora queda abierto con "Sending…", confirma el envío y se
  cierra solo, o muestra el error conservando lo escrito. Valida el formato del mail, corta a los
  15 s y no deja cerrar con un envío en curso. Mail visible bajo el título (`vicente@…`).
- **Head:** `<title>` con el tagline, meta description, canonical, `og:image` 1200×630 en JPG,
  Twitter cards completas y JSON-LD `Organization`. **El dominio principal es sin `www`** (www
  redirige con 301): canonical y Open Graph apuntan a `https://almadigitalstudio.com/`.
- **`<h1>`** oculto visualmente (`.sr-only`) antes del hero: la página no tenía ninguno.
- **Teclado:** Enter / Espacio abren la tarjeta de proyecto enfocada. Las copias del loop del
  carrusel salen del orden de tabulación (`tabindex="-1"`).
- **Zoom y selección:** fuera `user-scalable=no`. `user-select: none` sigue global (evita selección
  accidental sobre el fluido y los carruseles) pero el texto de lectura y los campos del formulario
  son seleccionables. `cursor: none` no se tocó.
- **Panel móvil de proyecto:** botón "View Page" cuando la tarjeta tiene `data-url` (hoy sólo Soul
  Charger). Abre en la misma pestaña, porque el "Volver" de esa página usa `history.back()`.
- **Datos:** "Nico Pirelli" (antes "Perilli" en Team), Soul Charger 15 minutos (la home decía 10),
  Spin Off numerado 04 (decía 05), `rel="noopener"` en enlaces externos, `id="contact-title"`.
- La tarjeta "This could be you / Write to us" ahora abre el formulario.
- Fotos del equipo con `loading="lazy"`: 416 KB menos en la primera carga.

**soul-charger.html:** description, canonical, Open Graph, favicon y zoom habilitado.

**Assets:**
- `tools/make_share_images.py` (Pillow) genera `Asset/Web Icons/og-alma-digital.jpg` (`Asset/Logo.png`
  sobre el aura de marca) y `Asset/Soul Charger/og-soul-charger.jpg`.
- `Foto Chris.webp` y `Foto Pato.webp`: 2680×1568 → 1340×784 (180 → 67 KB). Originales en `_masters/`.

**Verificado en local** (escritorio y 375×812): consola sin errores nuevos; formulario probado con
`fetch` simulado (éxito, error de red, 422) sin enviar nada a Formspree; `deploy_copy.py` publica las
imágenes nuevas. **Falta probar en teléfonos reales y un envío real del formulario en la vista previa.**

**Decisiones de Vicente para las etapas siguientes** (a confirmar entre los dos socios):
- El sitio le habla a un público amplio (marcas, instituciones, festivales); no se segmenta.
- De acuerdo con reabrir el **logo del hero** (ameba viva con shader propio) y la **navegación por
  secciones** (volver al scroll normal). Fluido, paleta y cursor siguen cerrados.
- **Se mantiene Raleway**: la web no adopta las tipografías del sistema de marca.
- Sitio en **inglés y español**.
- De acuerdo con un paso de generación local para las fichas de obra (como `prototype/build.mjs`).
- Three.js queda como opcional: la ameba se resuelve con un shader propio (~5 KB) y un visor 360°
  básico con Pannellum (19 KB). Si entra Three.js, declarar sus archivos en `tools/deploy_copy.py`.

### 2026-11-16 — repo en GitHub y deploy automático

- Repo git creado (rama `main`), privado en la cuenta personal de GitHub de Beltrán, para
  trabajar con el socio. Incluye todo: código, `Asset/`, `_masters/`, archivos de trabajo,
  `prototype/`. Fuera: `node_modules/`, `.netlify/`, `dist/`.
- `netlify.toml` + `tools/deploy_copy.py dist`: Netlify publica sólo lo referenciado.
- `.gitattributes` normaliza fines de línea (Windows/Mac) y marca binarios.
- `README.md` con el flujo rama → pull request → vista previa gratis → merge = publica.


### 2026-10-20 — aligerar la web (créditos agotados → plan Personal)

- 16/10 se agotaron los 300 créditos: 13,26 GB × 20 = 265 + 3 deploys × 15 = 45. Corrección:
  los deploys **sí** cuestan (15 c/u); el 15/10 se hicieron 3 cuando podía ser 1.
- Cloudflare mostró ~10 personas/día y ~1 GB/día sin explicar → descargas directas de archivos
  (crawlers o links al .mp4), no visitas. No hay logs para distinguir.
- Plan Personal (US$ 9). Un solo deploy con:
  - Reel y tráiler con carga diferida + pósters. Primera visita desktop: 39 MB → 0,65 MB.
  - Recompresión: reel, tráiler, reel vertical, 2 reels de proyecto (los otros 6 no pasaban
    SSIM ≥ 0,98 con −25 %, se dejaron). Originales en `_masters/`.
  - `Logo Ideas Lab.png` era 18624×13080 px para mostrarse a 36 px → 256×180 (4,4 MB → 22 KB).
    `Logo Alma Digital.png` → 533×180. Fotos de Neurocosm Full Dome (~6800 px) → 1920×1080.
  - `tools/deploy_copy.py`: publica sólo lo referenciado. 175 → 143 archivos, 209 → 85 MB.
- Verificado en producción: sin videos al cargar, reel arranca al llegar (1920×1080), overlay
  con sonido, móvil sólo vertical, soul-charger sin imágenes rotas, analítica activa.


### 2026-10-15 — consumo de créditos Netlify: robots.txt + analítica

- Mails de "75 % de créditos" sin deploys en el ciclo. Causa: **11,87 GB de ancho de banda**
  del 27/09 al 15/10. Una primera visita desktop baja ~39 MB, móvil ~11 MB, por el reel.
- No había `robots.txt` ni analítica: imposible separar personas de bots.
- Creado `robots.txt`: `*` sin `.mp4`/`.MP4`, sin `/Asset/Reel Portfolio/`, sin `/prototype/`;
  `Disallow: /` para 24 scrapers de IA y SEO. Googlebot/Bingbot y previews sociales intactos.
- Cloudflare Web Analytics en ambas páginas. Tercer deploy con el token: verificado beacon 200
  y `/cdn-cgi/rum` 204 en producción.
- Deploy desde copia limpia (sin `prototype/`). Verificado: robots 200, prototype 404, sitio OK.
- Segundo deploy: sacados de producción (estaban públicos desde antes)
  `Commission.docx`, `Documento sin título.docx`, `Diagramación.ai` (18 MB),
  `Soul Charger/Logo.ai` (24 MB), `CLAUDE.md`, `package.json`, `package-lock.json`.
  Siguen en la carpeta local. Verificado: los 7 dan 404, sitio y soul-charger sin imágenes rotas.


### 2026-08-31 — dos proyectos nuevos: Neural Canvas + Collective Pulse

**Assets** (fuente: `Desktop/Neurcal Canva - Collective Pulse/`):
- `Asset/Studio Projects/Neural Canvas/` → `1.webp` (key art), `2.webp` (participante VR),
  `3 Portada.webp` (mosaico de las 200 pinturas), `Neural Canvas Reel.mp4`
- `Asset/Studio Projects/Collective Pulse/` → `1.webp` (tablet), `2.webp` (visitante frente a
  la proyección), `3 Portada.webp` (sala en la galería), `Collective Pulse Reel.mp4`
- PNG → WebP 1920×1080 q85 (6 imágenes, 5.5 MB → 790 KB)
- Reels: 109 MB → 595 KB (Collective Pulse, vertical nativo) y 116 MB → 1.14 MB
  (Neural Canvas, apaisado 16:9 compuesto sobre lienzo 406×720 con relleno desenfocado)

**index.html:**
- Dos `proj-card` nuevas al inicio de la fila `#track-projects` (ahora 11 tarjetas)
- Textos condensados a ~330 chars para que entren sin recorte en `.po-left`
  (verificado midiendo hueco libre: ambas +31 px de holgura a 1920×1080)
- `--carousel-dur` ahora se calcula por fila desde el nº de tarjetas (× 6.7s) — antes era
  60s fijo, y con 2 tarjetas más la fila 1 habría acelerado ~27 %

**Otros:** creado `.claude/launch.json` para levantar preview local en el puerto 5599.


### 2026-04-14 — fix Android scroll

**index.html + soul-charger.html:**
- Bug: en Android (Chrome) no era posible hacer scroll — se veía la sección 1 pero el gesto táctil no movía la página. iOS y desktop funcionaban bien.
- Causa: canvas con `touchmove` no-pasivo + `e.preventDefault()` bloqueaba el compositor de scroll de Chrome Android (análisis geométrico de overlapping elements, no por z-index)
- Fix: `touch-action: none` en canvas (global) + `pointer-events: none` en canvas (mobile) + `touch-action: pan-y` en `#hero` (mobile)

### 2026-04-11 — sesión 2: ajustes visuales y bugs

**soul-charger.html:**
- sc-6: logo agrandado a `clamp(460px, 69vw, 989px)` (+15% vs sesión anterior), glow `::before` púrpura igual al hero
- Header: aparece sin animación (`opacity: 1`); dimensiones igualadas a index.html (`padding: 22px var(--px)`, logo 32px, nav 0.88rem/36px gap)
- WebGL: eliminado color crema `#f4f1e9`; multiplicador bajado `0.125 → 0.108` para evitar quemado blanco
- Carrusel sc-4: bug de velocidad lenta en primera carga resuelto — quitado `loading="lazy"`, animación arranca pausada y se activa desde `measureTrack`

**index.html:**
- Carrusel Projects: eliminada pausa de animación en hover (`animation-play-state: paused` removido)

### 2026-04-11 — sesión 1: soul-charger.html (solo esta página)

**sc-1 Hero:**
- Tagline restaurado a "Interactive Biofeedback VR"

**sc-2 About — reescritura completa:**
- Layout: fila flex con columna texto (46vw) + sistema órbita absoluto (puro CSS)
- `.orbit-system` position:absolute left:72% top:50% width:0 height:0
- Logo central: 504×504px; orbit ring: 33s CW; 5 elementos a 72° cada uno, translateX(288px)
- Assets: `Asset/Soul Charger/Phases/1x/image N.png` + `text N.png` (N=1–5)
- Mobile: `.orbit-system { display: none !important }`

**sc-4 Carrusel:**
- Velocidad +20%: 104s → 83s
- Lightbox PHOTOS array corregido: fila 2 en orden inverso (19→10)
- Scroll y wheel bloqueados mientras lightbox abierto

### 2026-04-07
- Creado `soul-charger.html`: WebGL fondo idéntico al landing, cursor, scroll nav 6 dots, 6 secciones
- Convertidas 20 imágenes PNG de `Asset/Registro/` a WebP (quality 85): 58.48 MB → 2.26 MB

### 2026-03-29
- Creado CLAUDE.md; portfolio completo (~4690 líneas en index.html)
