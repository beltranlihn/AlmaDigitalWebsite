# Alma Digital Studio — Portfolio

## Objetivo
Portfolio web inmersivo para Alma Digital Studio, estudio creativo de arte multimedia. Presenta el estudio, sus proyectos y equipo con una estética audiovisual interactiva.

## Stack tecnológico
- HTML/CSS/JS puro (self-contained, un solo `index.html`)
- WebGL Fluid Simulation (fork de PavelDoGreat, modificado y embebido)
- GSAP (local, `gsap.min.js`)
- Google Fonts: Raleway (200, 300, 400, 500)
- Sin framework, sin bundler

## Estructura de carpetas
```
Alma Digital Portfolio/
├── index.html          # ~4690 líneas — toda la app
├── soul-charger.html   # ~3400 líneas — página dedicada Soul Charger
├── gsap.min.js         # GSAP local
├── robots.txt          # bots fuera de los videos + bloqueo de scrapers de IA/SEO
├── tools/deploy_copy.py # arma dist/ con sólo lo que la web usa (lo corre Netlify)
├── netlify.toml        # build: python3 tools/deploy_copy.py dist → publica dist/
├── _masters/           # originales de los archivos recomprimidos (NO se publica)
├── prototype/          # rediseño descartado; projects.json reutilizable (NO se publica)
├── README.md           # guía corta para personas
├── CLAUDE.md           # este archivo
├── .claude/launch.json # preview local (python -m http.server 5599)
└── Asset/
    ├── Logo.png
    ├── Asset 34.png        # logo pequeño para headers
    ├── Logo Studio/Version 2/  # Logo.webp, Texto Logo 1.webp, Texto Logo 2.webp
    ├── Soul Charger/       # assets del proyecto
    ├── Studio Projects/    # una carpeta por proyecto: 1/2/3 (uno "N Portada") + Reel
    ├── Commisions/         # misma convención que Studio Projects
    ├── Registro/           # 20 WebP (Portada + 1–19) para carrusel sc-4
    └── Web Icons/
```

## Estado actual
El portfolio está **sustancialmente construido**. Tiene todas las secciones principales:

1. **Hero** — logo en 3 capas (blob + texto) con parallax hover, breathing animation, glow
2. **About Text** — tipografía editorial animada al scroll, columna con logo animado
3. **Video Section** — reel con overlay a pantalla completa
4. **Projects** — dos filas de carrusel (Studio Work), tarjetas 390×390
5. **About Us** — row 1: founders (landscape), row 2: team (portrait)
6. **Spin Off** — sección dedicada al spin-off
7. **Contact** — botón + modal de contacto
8. **Footer** — footer del sitio

### UI adicional
- Header fijo con nav + logo
- Redes sociales fijas (lateral)
- Scroll nav indicator (puntos)
- Cursor personalizado (ring + 6 partículas en cadena con lerp)
- Fondo WebGL interactivo con 12 emisores automáticos

## Decisiones de arquitectura tomadas (no reabrir)
- **Self-contained**: todo en un solo `index.html`. No dividir en archivos.
- **WebGL fluid**: fondo fijo con `z-index: 0`, recibe mousemove de `window`
- **Paleta oficial index.html**:
  - Fondo WebGL: `#adc8ed` → `BACK_COLOR: {r:173, g:200, b:237}`
  - Colores simulación: `#3530a0` (×3), `#de79ff`, `#8282ff` (×2), `#fbc2ff`, `#9a3ec7` (×2)
  - Multiplicador generateColor: `0.119`; splatPointer: `×0.162`; emisores: `×0.097`
- **Paleta oficial soul-charger.html**:
  - Fondo WebGL: `BACK_COLOR: {r:132, g:95, b:221}`
  - Colores simulación: `#3530a0` (×3), `#de79ff` (×2), `#8282ff` (×2), `#fbc2ff`, `#9a3ec7` (×2) — sin crema
  - Multiplicador generateColor: `0.108`; splatPointer: `×0.162`; emisores: `×0.097`
  - Crema `#f4f1e9` eliminada para evitar quemado blanco
- **Cursor**: `cursor: none` global, ring blanco 36px + partículas
- **Tipografía**: Raleway weight 200–500, sin serifa

## Convenciones de código
- Variables CSS en `:root` para spacing, colores, animaciones
- Prefijos de ID por sección: `#hero`, `#about-text`, `#video-section`, `#projects`, `#about`, `#spinoff`, `#contact`
- Clases BEM-ish: `.proj-card`, `.site-logo`, `.social-link`, etc.
- Secciones `min-height: 100vh`, flex column centered, `padding-top: 88px` (header height)
- JS en bloques `<script>` inline al final del `<body>`

## Convención de assets de proyecto (Studio Projects / Commisions)
Una carpeta por proyecto dentro de `Asset/Studio Projects/` o `Asset/Commisions/`:
- **3 fotos WebP a 1920×1080**, `quality 85`. Una de ellas lleva sufijo ` Portada` y es la
  que va en `data-cover` + `<img class="proj-card__cover">`.
  Fuentes con otro aspecto → recortar centrado a 16:9 antes de escalar:
  `crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1920:1080:flags=lanczos`
- **1 reel MP4 vertical 406×720** (9:16), H.264, **sin audio**, `-crf 30 -preset slow`,
  `-movflags +faststart`. Peso objetivo 0.5–2 MB.
  Si el material original es apaisado (16:9), se compone sobre lienzo 406×720 con relleno
  desenfocado del propio plano (`gblur=sigma=26` + `eq=brightness=-0.14:saturation=0.85`)
  en vez de recortar — así no se pierde encuadre en la columna 9:16 del modal.

### Límite de texto del modal desktop (`.po-left`)
El panel izquierdo es 30 % de un card 16:9 con `overflow: hidden` — **no scrollea**.
`data-desc` debe quedar en **≈320–360 caracteres** con `Presented at` + `Credits`
(menos si además lleva `Commissioned by`). Verificar midiendo el hueco libre de `.po-left`
antes de dar por bueno un texto largo. (`Fashion Show Micsur` y `Adidas Terrex` ya se
recortan levemente — deuda previa, no replicar.)

## Deploy (Netlify)
- Sitio `glowing-sunflower-a7a485` → `almadigitalstudio.com`. **Plan Personal desde
  2026-10-20**: 1.000 créditos/mes, ciclo que arranca el 20.
- **Deploy automático desde GitHub** (repo privado en la cuenta de Beltrán):
  - push / merge a `main` → **producción** (15 créditos).
  - pull requests y otras ramas → **vista previa** con URL propia (gratis).
  - Netlify corre `python3 tools/deploy_copy.py dist` y publica `dist/` (`netlify.toml`).
- `tools/deploy_copy.py` publica sólo las páginas, `gsap.min.js`, `robots.txt` y los
  archivos de `Asset/` que alguna página referencia. Archivos de trabajo (`.docx`, `.ai`),
  PNG originales, `_masters/`, `prototype/`, `CLAUDE.md` están en el repo pero no se
  publican. **Nunca `netlify deploy --dir .`** (publicaría todo).
- Deploy manual de emergencia (cuesta 15 igual): `python tools/deploy_copy.py dist` y
  `npx netlify deploy --prod --dir dist`.
- Una página nueva tiene que agregarse a `PAGES` en `tools/deploy_copy.py`, o sus assets
  no se publican.
- **Tarifas (docs oficiales de Netlify):** cada deploy de producción = **15 créditos**;
  ancho de banda = **20 créditos/GB**; requests web = 2 créditos / 10.000. Deploy previews gratis.
  → Agrupar cambios en **un solo deploy**. Con 300 créditos, 20 deploys agotan el mes solos.
- El grueso es ancho de banda. Hasta el 2026-10-20 el reel de la home (39 MB, `autoplay`) se
  descargaba entero en cada primera visita. Ahora: **carga diferida** (ver abajo) y primera
  visita de ~0,7 MB. Recargas y loops no re-descargan (medido).

### Videos grandes: carga diferida (no reabrir)
- `#reel-video` (index) y `#sc-trailer` (soul-charger): `preload="none"`, sin `autoplay`,
  fuente en `data-src` (y `data-src-mobile` / `data-poster-mobile` para el reel vertical).
  Póster WebP liviano mientras tanto (`Reel Poster.webp`, `Reel Vertical Poster.webp`,
  `Trailer Poster.webp`).
- Un bloque JS asigna `src` cuando el video está a < media pantalla de entrar en vista y
  pausa al salir. Disparadores: IntersectionObserver **y** scroll/resize, con `setTimeout`
  (no rAF). En móvil elige la fuente con `isMobile` del sitio: el teléfono nunca pide la
  versión de escritorio.
- El overlay de pantalla completa (desktop) lee `#reel-video.dataset.src`.
- **No volver a poner `autoplay`** en videos de más de un par de MB.
- Videos de sección: H.264 `-crf 27 -preset slow`, AAC 128k si tienen audio, `+faststart`.
  Reel 37→21 MB (SSIM 0,988), tráiler 42→13 MB (SSIM 0,994), vertical CRF 30 10→7,5 MB.

## Analítica
Cloudflare Web Analytics, **activa desde 2026-10-15**. Panel: dash.cloudflare.com →
Web Analytics → `almadigitalstudio.com`. Cargador en el `<head>` de `index.html` y
`soul-charger.html`, token `ee88c2886dd4410694851f5bfea47a74` (público, no es secreto).
Una página nueva necesita el mismo bloque. Vaciar `CF_TOKEN` la desactiva.
Sólo cuenta navegadores reales: comparar contra el ancho de banda de Netlify para estimar bots.
**No** cambiar nameservers a Cloudflare: no hace falta para esto y movería el DNS del dominio.

## Trabajo en equipo (Beltrán + socio, cada uno con su Claude Code)
- **No commitear directo a `main`**: cada commit ahí es un deploy de 15 créditos.
  Trabajar en una rama, abrir pull request, revisar en la URL de vista previa, merge.
  Agrupar arreglos en un mismo pull request.
- `git pull` antes de empezar. Casi todo vive en `index.html` (~4.800 líneas): si los dos
  lo editan a la vez, coordinar qué sección toca cada uno para evitar conflictos.
- Antes de agregar videos o imágenes: respetar la convención de assets y la de carga
  diferida (abajo). Un video con `autoplay` vuelve a disparar el consumo de créditos.
- Originales pesados nuevos van a `_masters/` (mismo árbol que `Asset/`), no a `Asset/`.

## Módulos cerrados (no tocar)
- **WebGL Fluid Simulation** — motor de física completo, no modificar
- **Paleta de colores** y config física del fluid (ya calibrada, ver arriba)
- **Cursor custom** — lerp y tamaños calibrados
- **Hero logo (index.html)** — layers, breathing, parallax hover

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

## index.html — decisiones clave

### Carrusel de Projects
- Hover sobre card: escala, brillo, atenúa vecinas — pero **NO pausa la animación**
- Línea `animation-play-state: paused` en hover eliminada intencionalmente
- **Duración dinámica**: el JS de duplicación de tracks setea
  `--carousel-dur = nº de tarjetas × 6.7s` por fila. Así la velocidad se mantiene constante
  al añadir proyectos y ambas filas van igual de rápido. El `--carousel-dur: 60s` fijo del
  CSS queda solo como fallback.

## Próximos pasos
- Agregar video real del reel en soul-charger.html sc-3 (reemplazar placeholder)
- Revisar soul-charger.html en móvil (orbit col se oculta en mobile)
- Considerar deploy a producción
- Evaluar página dedicada (tipo `soul-charger.html`) para Neural Canvas / Collective Pulse

## Android scroll — decisión técnica (no reabrir)

**Problema:** Chrome Android bloqueaba el scroll en toda la página. El `canvas` (position:fixed, 100% viewport, z-index:0) tiene un listener `touchmove` no-pasivo con `e.preventDefault()`. Chrome Android, a diferencia de iOS, escanea geométricamente todos los elementos superpuestos al toque — no solo por z-index — y al encontrar ese listener bloqueaba el compositor de scroll.

**Solución aplicada en `index.html` y `soul-charger.html`:**
1. `canvas { touch-action: none; }` — global: excluye el canvas del análisis de gestos de scroll del compositor
2. `canvas { pointer-events: none !important; }` — solo `@media (pointer: coarse)`: en mobile el canvas no recibe eventos táctiles; su `touchmove` con `preventDefault()` nunca se activa
3. `#hero { touch-action: pan-y; }` — solo mobile: `touch-action` no se hereda en CSS; declaración explícita necesaria en Android

El fluid sim sigue corriendo con auto-emitters en mobile. Los usuarios de Android no pueden tocar el fondo para emitir fluidos (correcto — el dedo es para el scroll).

## Historial de sesiones (última al tope)

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
