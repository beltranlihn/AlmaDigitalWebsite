# Alma Digital Studio — sitio web

## Objetivo
Portfolio web inmersivo para Alma Digital Studio, estudio creativo de arte multimedia. Presenta el
estudio, sus proyectos y equipo con una estética audiovisual interactiva, en inglés y español.

## Stack tecnológico
- HTML/CSS/JS puros, sin framework ni bundler.
- Las páginas se **generan** con `node src/build.mjs` (Node, sin dependencias) a partir de archivos
  de datos, y se commitean ya generadas. Netlify no corre el generador: publica el HTML tal cual.
- WebGL Fluid Simulation (fork de PavelDoGreat) en `js/fluid.js`.
- Ameba del hero: shader propio en `js/ameba.js` (WebGL 1, sin librerías, ~8 KB): doce esferas fundidas
  (metaballs) con la superficie mate de la ameba de la marca. Ver "Las amebas".
- **Three.js** (0.187.0, desde el CDN jsDelivr, 156 KB comprimido) lo usan dos módulos, que se cargan
  sólo en las páginas que los piden: `js/particles.js` (partículas de las obras principales) y
  `js/world.js` (el mundo interior, que es la portada).
- Sonido de ambiente: `js/sound.js` (Web Audio, sin librerías). La música es un archivo de 1,8 MB en
  `Asset/Audio/`, que se pide sólo si el visitante enciende el sonido.
- Google Fonts: Raleway (200, 300, 400, 500). GSAP (`gsap.min.js`) sólo lo usa `soul-charger.html`.

## Estructura de carpetas
```
├── src/                       # FUENTE del sitio (no se publica)
│   ├── build.mjs              # generador: plantillas de todas las páginas
│   ├── site.json              # textos de interfaz EN/ES, hero, clientes, destacados, ajustes
│   ├── projects.json          # las 22 obras y spin-offs (inglés): textos, créditos, sedes, tecnología
│   └── i18n/
│       ├── projects.es.json   # las obras en español
│       └── studio.json        # about, equipo y spin-offs en los dos idiomas
├── css/site.css               # estilos (dos temas por tokens: aura y night)
├── js/
│   ├── fluid.js               # MÓDULO CERRADO: simulación de fluido
│   ├── cursor.js              # MÓDULO CERRADO: cursor propio
│   ├── ameba.js               # la ameba viva del hero
│   ├── particles.js           # partículas en la cabecera de las obras principales (Three.js)
│   ├── sound.js               # música de ambiente, filtro "bajo el agua" y sonidos de transición
│   ├── world.js               # la portada: recorrido 3D por el estudio, el reel y las obras (Three.js)
│   └── app.js                 # header, contacto, reel, filtros, lightbox
├── index.html, studio.html    # GENERADOS (inglés). No editar a mano
├── work/index.html            # GENERADO: índice de obras con filtros
├── work/<obra>.html           # GENERADO: una ficha por obra o spin-off (22)
├── es/…                       # GENERADO: lo mismo en español
├── sitemap.xml                # GENERADO
├── soul-charger.html          # página dedicada a Soul Charger (a mano, ~3400 líneas, sólo inglés)
├── robots.txt                 # bots fuera de los videos + bloqueo de scrapers de IA/SEO
├── tools/deploy_copy.py       # arma dist/ con sólo lo que la web usa (lo corre Netlify)
├── tools/make_share_images.py # imágenes 1200×630 para compartir y el icono del header
├── tools/make_world_images.py # imágenes chicas para las galaxias de la portada (Asset/World/ + src/world-images.json)
├── tools/serve.py             # servidor local sin caché para revisar el sitio (no se publica)
├── netlify.toml               # build: python3 tools/deploy_copy.py dist → publica dist/
├── _masters/                  # originales de los archivos recomprimidos (NO se publica)
├── prototype/                 # prototipo de Beltrán del que salió esta estructura (NO se publica)
├── .claude/launch.json        # preview local (python tools/serve.py 5599)
└── Asset/                     # imágenes, videos, fuentes. Asset/og/ = imágenes para compartir
```

## Cómo se cambia algo
1. Editar la **fuente**, nunca el HTML generado:
   - Un texto de interfaz, el titular del hero, la lista de clientes o las obras destacadas → `src/site.json`
   - Una obra → `src/projects.json` y su traducción en `src/i18n/projects.es.json`
   - Equipo, spin-offs o el texto "about" → `src/i18n/studio.json`
   - El armado de una página → `src/build.mjs`. El aspecto → `css/site.css`. El comportamiento → `js/app.js`
2. `node src/build.mjs` (rehace `index.html`, `studio.html`, `work/`, `es/` y `sitemap.xml`).
   **También después de tocar sólo `css/` o `js/`**: ver "Archivos con versión".
3. Probar en local (`python3 tools/serve.py` → `http://localhost:5599`) y commitear **fuente y HTML
   generado juntos**.

### Archivos con versión (por qué hay que correr el build al cambiar CSS o JS)
Cada página pide `css/site.css?v=…` y `js/*.js?v=…`, donde el valor sale del contenido del archivo
(`v()` en `src/build.mjs`). `js/world.js` y `js/particles.js`, que se cargan con `import()`, reciben la
suya por `window.__ALMA__.v` (`ver()` en `js/app.js`). Así el navegador nunca mezcla una página nueva con
estilos o código viejos, ni en local ni en el sitio publicado. La contracara: si se cambia un `.css` o un
`.js` y no se corre el build, las páginas siguen pidiendo la versión anterior.

`tools/serve.py` es el servidor para revisar en local: igual que `python -m http.server`, pero le dice al
navegador que no guarde nada. Con el servidor común Chrome se quedaba con el CSS viejo durante horas (así
fue como Vicente vio el mundo interior con el texto sin estilo y las amebas "igual que antes").

El permiso de View Transitions entre documentos (`@view-transition`) va además en un `<style>` dentro del
`<head>`: si sólo está en `site.css` y la hoja no está en caché, Chrome cancela la transición y deja una
excepción en la consola en cada carga.

**Agregar una obra:** sumar la entrada en `src/projects.json` (mismo formato que las demás; `formatKey`
tiene que existir en `site.json → formats`), su traducción en `projects.es.json`, los assets en
`Asset/Studio Projects/` o `Asset/Commisions/`, correr `python3 tools/make_share_images.py` (imagen para
compartir) y `node src/build.mjs`. Si falta la traducción, la ficha en español sale en inglés y el
generador lo avisa. Si la obra entra a las seleccionadas (`site.json → featured`), correr además
`python3 tools/make_world_images.py` (su galaxia) y elegirle ícono en `world.icons`.

**Un formato nuevo** (como `software`, que se sumó con VEATION): la etiqueta en `site.json → formats`,
la frase en `formatsDesc`, el nombre en `projects.json → meta.formats` y, en `src/build.mjs`, el ícono
por defecto en `ICON_BY_FORMAT`. El filtro del índice aparece solo.
**Spin-offs** (hoy Digital Sanctuaries; Rito Digital lo fue hasta el 2026-11-21): son fichas como las demás, con `track:
"spinoff"` (la línea "Spin-offs" del índice y "Spin-off" en la ficha). Para que salgan en la portada,
su slug va en `site.json → world.spinoffs` (no en `featured`): tienen su propio paso después de las obras.
**`theme`** (opcional, en `projects.json`): una ficha con estética propia. Hoy sólo `"ds"` (Digital
Sanctuaries): `body.pg-ds`, ver "Temas". **`specs`** (opcional): el catálogo de la obra, una fila por unidad
(`lead` y `rows: [código, nombre, práctica, duración, aforo]`), después del teléfono. **`enquire`**
(opcional): el texto y el botón de consulta de esa ficha, si no le queda "¿Te interesa esta obra?".
**Sin créditos sobre las fotos** (decisión de Vicente, 2026-11-23: "olvídate de los créditos en las
fotos, de toda la web"): se quitó `photoCredits` y todo lo que lo mostraba, y también los fotógrafos de
los créditos de Rito.
**`website`** (opcional, en `projects.json`): un sitio propio de la obra. Sale como botón ("Visit
ritodigital.com ↗", texto `pVisit`) bajo el resumen de la ficha, y como enlace al lado de "Entrar a la
obra" en su parada de la portada (VEATION, Rito Digital y Digital Sanctuaries).
**`wideVideo`** (opcional, en `projects.json`): un video horizontal (16:9, sin audio, 1280×720) en el
lugar de la imagen ancha de la ficha. Se pide recién cuando se ve y se pausa al salir, como los reels de
los teléfonos. También es el que se ve al pasar por la obra en el índice si no hay `video`. Hoy, Neural
Canvas. **`noSlots`** (opcional): la obra no tiene más material; la ficha no muestra lugares vacíos ni
en revisión (sin teléfono vacío, sin huecos en la galería, sin imagen ancha o a sangre vacías).
**`galaxyPhotos`** (opcional, en `projects.json`): qué fotos van a la galaxia de la obra en la portada
(hasta 5). Sin este campo van la portada y las siguientes de `photos`. Las verticales van a 9:16. Hoy
lo usan VEATION y Rito (fotos de FulldomeUK).

## Navegación continua (leer antes de tocar `js/app.js` o las plantillas)
Cada página es un HTML completo: sirve sola, se indexa sola y funciona sin JavaScript. Pero al navegar
**dentro** del sitio no se recarga: `js/app.js` pide el HTML de destino y reemplaza sólo `<header>`,
`<main>`, `<footer>` y el modal de contacto, y sincroniza el `<head>` (título, description, canonical,
hreflang, Open Graph, JSON-LD) y `window.__ALMA__`. El fluido (`#fluid`) y la ameba (`#ameba-wrap`)
no se tocan: el fondo no se corta y la ameba viaja de un lugar a otro. Cambiar de idioma también es
una navegación continua. Si el pedido falla, se navega de la forma normal.

Consecuencias:
- Todo lo que cambia de una página a otra tiene que estar **dentro** de esas cuatro piezas, en el
  `<head>` o en `#alma-data` (los textos que usa el JS). Lo que quede suelto en `<body>` no se actualiza.
- En `js/app.js` hay dos tipos de código. Lo **global** se engancha una vez (contacto, navegación,
  barra de tema). Lo **de página** va en `initPage()` y tiene que desmontarse solo: los listeners en
  `window`/`document` se registran con `on()`, los observers con `observe()` y los nodos que se agregan
  a `<body>` se anotan en `life.nodes`. Si no, se acumulan en cada navegación.
- No guardar referencias a elementos del header, main, footer o modal fuera de `initPage()`: se
  reemplazan. Buscarlos en el momento.
- Las páginas hechas a mano (`site.json → legacyPages`, hoy `soul-charger.html`) se abren con carga normal.
- Entre una página de superficie y la ficha de una obra el cambio no usa View Transitions sino la
  zambullida (ver "Sonido e inmersión"): la capa de agua tapa la pantalla mientras se reemplaza la página.
- Lo que una página monta por su cuenta y hay que soltar al salir (hoy las partículas, que abren un
  contexto WebGL) deja su función de limpieza en `life.cleanups`.
- Donde el navegador soporta View Transitions (Chrome, Safari, Firefox recientes) el cambio lleva un
  fundido, la portada de la obra se convierte en la cabecera de su ficha y la ameba se desliza. Sin
  soporte, el cambio es inmediato y la ameba se desliza por JavaScript.

## Páginas
- **Portada** (`index.html`): el mundo interior, un recorrido 3D que se avanza con el scroll. Ver "El
  mundo interior (la portada)". Reemplazó el 2026-11-18 al landing de siete bloques, que quedó **en
  reserva**: `buildLanding` sigue en `src/build.mjs` y vuelve a ser la portada con `site.json →
  world.enabled: false` y un build (no se mantiene: si se vuelve a él, revisarlo).
- **La ameba** (la de `js/ameba.js`) se posa en el `[data-ameba-slot]` que esté más en pantalla: a la
  derecha del título en Obras y Studio, en el bloque de contacto y en la esquina de la foto en cada
  ficha. La portada no tiene slots (sus amebas son las del mundo 3D), así que ahí no se ve.
  Los slots son cajas vacías que sólo reservan el lugar.
- **Índice de obras** (`work/`): lista filtrable por línea (obra propia / encargos / spin-offs) y formato, con
  vista previa al pasar el mouse. Sin filtros el contador dice "Obras seleccionadas" (decisión de
  Vicente: no hablar de "19 obras"); con filtros, cuántas quedan. **En reposo** (desde el 2026-11-23)
  el cuadro de la vista previa no queda vacío: pasan las portadas de las obras a la vista, con su
  nombre, cada 4 s, con fundido y un acercamiento leve (respeta los filtros; un clic abre la obra).
  Pide una portada a la vez, al tocarle (unos 115 KB cada una), y se detiene fuera de pantalla, con la
  pestaña oculta y mientras el cursor está en la lista. En teléfono no hay vista previa.
- **Ficha de obra** (`work/<slug>.html`): portada, resumen con la ficha técnica al lado, un recorrido de
  imágenes y video, créditos, historial de exhibición, botón de consulta y obra siguiente. Ver "Ficha de
  obra: el recorrido de imágenes".
- **Cabecera viva en todas las fichas** (`site.json → particles`, las 20 obras desde el 2026-11-18): la
  portada se mueve despacio (un acercamiento lento y un parallax leve al bajar) y sobre ella se enciende
  un campo de puntos con una formación y colores propios de la obra. Se arrastra para girarlo, el cursor
  aparta las partículas y un clic lo dispersa. Cada entrada de `particles` lleva `formation`
  (`attractor`, `pulse`, `halo`, `strokes`, `dome`, `wave` o `grid`), `stage` (color del fondo) y `colors`. De
  ahí salen también los colores de la ameba de la obra en la portada 3D. Las 15 entradas nuevas las
  armé a partir de los colores de cada portada: **son borradores, a revisar**. Sin entrada, la ficha
  queda con la foto sola. Una formación nueva se escribe en `FORMATIONS` de `js/particles.js`.
- **Studio** (`studio.html`): about, con quién trabajamos (dos franjas en movimiento, antes en el
  landing), equipo y spin-offs.
- **Español**: las mismas páginas bajo `/es/`, con los mismos slugs. Cada página enlaza a su par
  (`hreflang`) y el header tiene el cambio de idioma.

## Ficha de obra: el recorrido de imágenes
Referencia de Vicente: las páginas de proyecto de [unseen.co](https://unseen.co/projects/blue-marine-foundation/).
Lo que se tomó: el fondo oscuro, el resumen en letra grande con los datos al lado, la galería de imágenes
chicas dispersas que se mueven, el teléfono como objeto 3D que gira con el scroll y la entrada curva de
cada imagen. Segunda vuelta el 2026-11-18, a pedido de Vicente, después de volver a mirar la referencia.

- **Fondo oscuro, como el mundo interior**: en las fichas (`body.pg-project`) el velo tiñe el fluido de
  violeta (`mix-blend-mode: multiply`, el mismo degradado de `.world-tint`) y el contenido, el menú y el
  pie usan los valores oscuros. Es sólo CSS: no depende de `js/world.js`. Al pasar del mundo 3D o de
  otra ficha no hay salto de color; desde una página clara, el cambio queda tapado por la zambullida.
- **El recorrido**, en este orden (lo arma `buildProject` en `src/build.mjs`; el aspecto, `.pj-*` en
  `css/site.css`): imagen ancha · teléfono 3D con una foto al lado (o dos teléfonos) y el texto ·
  galería dispersa de 6 imágenes chicas · imagen a sangre. Son 9 lugares para fotos y 2 para video
  vertical. Más de 9 fotos siguen en dúos.
- **Qué foto va a cada lugar** (`projects.json → photos`): la primera va al lado del teléfono, la
  portada y la siguiente a la galería, después la ancha, tres más a la galería, la imagen a sangre y la
  sexta de la galería. Con las 3 fotos que tienen casi todas las obras: una al lado del teléfono y dos
  en la galería. Para sumar fotos basta agregarlas a `photos` y correr el build.
- **`sidePhoto`** (opcional, en `projects.json`): la foto del lado del teléfono se recorta en vertical
  (4:5). Si ese recorte le queda mal a la primera (un afiche con texto), `sidePhoto` elige otra. Hoy lo
  usan Neural Canvas y Adidas Terrex.
- **El teléfono es un objeto 3D** hecho en CSS: una cara con el marco y la pantalla, y ocho capas detrás
  que le dan canto. Gira mientras cruza la pantalla y se inclina un poco hacia el cursor. Con un solo
  video vertical (`video`) va un teléfono y la foto al lado, que gira para el otro lado; con `verticals`
  (opcional, `.mp4` o imagen 9:16) van dos teléfonos. Al lado, el resto del texto de la obra si lo tiene.
- **Galería dispersa**: tres columnas de imágenes chicas, cada una con otro tamaño y a otra altura, que
  se sale por la derecha. Las columnas se mueven a distinta velocidad con el scroll. A la izquierda va
  el historial de exhibición; si la obra no tiene, la galería ocupa todo el ancho. Sale en el sitio
  publicado con dos fotos o más. En teléfono son dos columnas y una fila.
- **Movimiento** (`initMotion` en `js/app.js` + "Ficha de obra: movimiento" en `css/site.css`): cada
  elemento con `data-m` recibe dos variables, `--in` (0 a 1 mientras entra) y `--p` (1 a −1 mientras
  cruza la pantalla), con algo de inercia; el CSS decide qué hace cada cosa: las fotos entran dobladas
  y con el borde de abajo curvo, la imagen se desliza dentro de su marco, la imagen a sangre se abre
  desde más chica, las columnas de la galería van a distinta velocidad, el teléfono gira. Funciona en
  todos los navegadores (antes era CSS atado al scroll y Firefox quedaba quieto). Con "reducir
  movimiento" nada se mueve y todo está a la vista. El texto no se anima nunca. Es una aproximación: la
  curvatura real de Unseen es WebGL.
- **Lugares vacíos**: en el sitio publicado un bloque sin fotos no sale. En localhost y en las vistas
  previas de Netlify (`body.has-review`) los huecos se ven con borde punteado y el formato que hay que sumar.
- Un clic en cualquier foto la abre entera en el visor.

## El mundo interior (la portada)
`index.html` (y `es/index.html`). Idea de Vicente a partir de
[mirages.nrly.fun](https://mirages.nrly.fun/) (Nathan Riley, Unseen Studio): en vez de una lista, se
**avanza** por un mundo 3D y las obras aparecen en el camino. Nació como página de prueba
(`inner-world.html`) y el 2026-11-18 Vicente decidió que fuera la portada única. **Falta que Beltrán lo
vea y probarlo en teléfonos reales** (en la portada corren el fluido y el mundo 3D a la vez).

- **El recorrido tiene seis momentos** (los tiempos están arriba de `layout()` en `js/world.js`):
  1. **La entrada**: el título del estudio (`site.json → heroTitle`) con el logo debajo (`alma ◎ digital`,
     `Asset/Logo Studio/lockup-alma-digital.webp`, como máscara que toma el color del texto), la ameba
     grande, que es la puerta, y sobre ella la invitación "Entra al mundo interior". No lleva la línea
     "Immersive wellness art studio": repetía el título.
  2. **El estudio**: ya adentro, una **ameba de Alma Digital** con la descripción del estudio (`heroLead`)
     en su ficha de vidrio y el botón "Conocer el estudio". Un clic en ella abre `studio.html`.
  3. **El reel**: una pantalla que flota y se reproduce sola, en silencio. Ver "El reel flotante".
  4. **El paso a las obras**: la cámara atraviesa tres anillos de luz, con la forma del icono, mientras
     aparece en el centro "Obras seleccionadas" (`site.json → selectedTitle`). Es un tramo, no una
     parada. El título sólo cambia de opacidad: la tipografía no se mueve.
  5. **Las obras**, una galaxia cada una (ver "Paradas en galaxia"; antes, una ameba).
  6. **Los spin-offs** (desde el 2026-11-20): un segundo paso con anillos y el título "Studio
     spin-offs" (`site.json → spinTitle`), y una galaxia para cada uno (`world.spinoffs`, hoy sólo
     Digital Sanctuaries). Su ficha de vidrio dice "Spin-off" en vez del número de obra.
     Sin 3D van en la misma lista que las obras.
  7. **El cierre**: las obras seleccionadas, conocer el estudio y contacto. La ameba del final aparece
     recién al dejar la última parada.
- **Las amebas** (todas: las del mundo 3D y la que flota en las otras páginas) son, desde el 2026-11-21,
  la ameba de la marca: un racimo de doce esferas fundidas (metaballs) con la superficie mate, como el
  blob del logo y del reel. Sale del prototipo WebGPU que pasó Vicente (`alma-ameba-webgpu`), llevado a
  WebGL: cada ameba es una esfera envolvente de pocos triángulos y el shader recorre el campo de
  distancias (`AMEBA_VERT`/`AMEBA_FRAG` y `ballsFor()` en `js/world.js`; `FS` y `ballsAt()` en
  `js/ameba.js`). Luz difusa envolvente, oclusión en los pliegues, una rampa de cuatro tonos (sombra,
  medio, luz, brillo) y el acento en los pliegues. **Mate** (pedido de Vicente el mismo día, "sin tantas
  reflexiones"): sin brillos especulares, sin borde reflejado y con el tono más claro apenas. **Suaves**
  (pedido del 2026-11-23: "algunas muy saturadas y metálicas"): poco contraste entre la luz y los
  pliegues, el acento apenas como un velo y el borde translúcido, que se funde con el fondo. La de Alma
  (puerta, estudio, final y la flotante) usa la rampa de la marca: `#5c1fc7`, `#8f47ee`, `#cba0fb`,
  `#fcd6f8` y el acento `#4cc8f5` (`ALMA_RAMP`). **Las de las obras** arman su rampa con los colores de
  `site.json → particles` (o `world.forms`), del más oscuro al más claro, con el más saturado de acento
  (`rampOf()`), pero antes les baja la saturación y los acerca al lila (`soft()`), y la sombra va
  al violeta profundo y no al negro. Para cambiar sólo el color de la ameba de una obra en la portada, sin tocar la cabecera
  de su ficha: `site.json → world.forms` (hoy Neurocosm Full Dome, en azul oscuro y morado, a pedido de
  Vicente). Escriben su profundidad real, así las imágenes de las galaxias pasan por detrás. En
  táctil el recorrido usa 40 pasos en vez de 64. **No llevan fotos** (decisión de Vicente, 2026-11-18):
  la portada de la obra aparece recién en la transición líquida.
- **Las amebas no van en fila**: cada parada tiene su propio encuadre (`COMP` y `HEIGHTS` en `layout()` de
  `js/world.js`): lado (derecha o izquierda, alternando), altura en pantalla, distancia (unas se ven
  grandes y otras más chicas), altura de la cámara y un giro leve hacia el lado de la ameba. Entre
  paradas la cámara hace una curva: sube, baja, se corre de costado y se ladea. La ficha va siempre del
  lado contrario a la ameba. Cada ameba aparece recién al salir de la parada anterior; si no, quedaría
  detrás de la ficha de la que se está mirando. En teléfono todas van centradas arriba, con la ficha abajo.
- **Adentro**: está oscuro. Del lado contrario a cada ameba, una ficha de vidrio esmerilado con el nombre
  y el botón; en el borde derecho, puntos para saltar de parada. Al final, una ameba grande y los botones.
- **El líquido del mundo es el fluido del sitio.** Al entrar, el velo claro se retira y una capa violeta
  (`.world-tint`, `mix-blend-mode: multiply`) tiñe el fluido: sus remolinos quedan de fondo, en
  profundidad, y siguen respondiendo al cursor. No se toca `js/fluid.js`. La capa la crea `js/world.js`
  al lado de `.veil`, fuera de `<main>`: adentro de `<main>` no podría mezclarse con el canvas del fluido.
- **Detalle**: polvo en suspensión de tres colores que deriva y titila, tres corrientes de partículas en
  hélice que giran alrededor del camino, treinta amebas chicas de fondo.
- **Enjambre por ameba**: cada una tiene unas 560 partículas propias (220 en táctil), en sus colores.
  Mientras se pasa son una nube suelta; al detenerse frente a ella se ordenan, en espiral y a
  destiempo, en una forma que la representa, y se sueltan al seguir. Formas (`FORMS` en `js/world.js`):
  `attractor` madeja (Neurocosm XR), `halo` anillos que respiran (Soul Charger), `strokes` pinceladas
  (Neural Canvas), `pulse` capas que laten de adentro hacia afuera (Collective Pulse), `dome` media
  esfera de meridianos (Neurocosm Full Dome), `wave` ondas en un plano (Pacha Ibiza), `logo` anillos
  concéntricos como el icono (la parada del estudio). La forma y los
  colores salen de `site.json → particles` (los de la ficha) o, si la obra no tiene, de `world.forms`.
  Tienen que ser más grandes que el polvo: del mismo tamaño la forma se pierde.
- **Luces que avanzan**: unos 50 hilos finos alrededor del camino que van al doble de la velocidad de la
  cámara y se estiran al avanzar (en reposo son chispas), y dos luces guía con cola que van por delante:
  siguen al scroll y no a la cámara, así que se adelantan y uno las alcanza. Sólo adentro.
- **Presentar con el teclado** (pedido de Vicente, 2026-11-24, para mostrar el sitio en una charla):
  - en la portada, **→ / ←** parada siguiente y anterior; **Enter** hace lo del botón de la ficha de
    vidrio (entra a la obra con la transición líquida, abre Studio o el reel con sonido); en la entrada,
    lleva a la primera parada (`keydown` en `js/world.js`);
  - en cualquier otra página (una ficha, Studio, el índice), **Esc o ←** vuelven atrás: a la portada, en
    la misma parada, si se llegó desde ahí; si la página se abrió directamente, a la portada
    (`keydown` global en `js/app.js`; el historial anota cuántas páginas del sitio hay detrás, `hops()`).
    Si están abiertos el visor de fotos, el reel a pantalla completa o el contacto, esas teclas los
    manejan a ellos primero.
- **Lo que responde**: el cursor mueve la cámara, corre el arte dentro de cada ameba, inclina la pantalla
  del reel y aparta las partículas; la ameba bajo el cursor se hincha; al avanzar rápido la cámara abre
  el ángulo y todo se agita; un clic en el vacío agita el mundo y suena una nota; las flechas izquierda
  y derecha saltan de parada; la cámara y la puerta respiran cada 6 s.
- **Scroll real**: la sección mide (tramos × 1,3 + 3,55) pantallas (`--n` en el HTML son los tramos:
  obras + estudio + reel; hoy 8, unas 14 pantallas) y el escenario queda fijo (`position: sticky`)
  mientras se la recorre. No se secuestra la rueda, a diferencia de Mirages: funciona con el dedo y el
  teclado. El avance del scroll (0 a 1) mueve la cámara. `js/world.js` saca los tiempos de cuántas
  pantallas mide la sección, así que si cambia esa fórmula en el CSS no hay que tocar el JS.
- **Cada parada frena** (pedido de Vicente: "es muy fácil pasarse al siguiente proyecto"). Dos cosas:
  1. **Pausa**: frente a cada parada la cámara se queda quieta durante casi la mitad del tramo de
     scroll (`HOLD` en `js/world.js`, unos 230 px antes y después en una pantalla de 760 px de alto).
  2. **Imán**: un `scroll-snap` de proximidad (`html.w-snap`, con un marcador `.world__snap` por
     parada). Si uno suelta el scroll cerca de una parada, el navegador termina de llevarlo hasta ella;
     en mitad del camino no hace nada. No es obligatorio: con un movimiento largo se pasa de largo.
  Para quitar el imán: borrar la regla `html.w-snap` del CSS. Para acortar o alargar la pausa: `HOLD`.
- **Cómo son las paradas de las obras: galaxia** (`site.json → world.stops: "galaxy"`, elegida por
  Vicente el 2026-11-18): las fotos de la obra en órbita alrededor de su ameba (desde el 2026-11-20;
  antes, alrededor de un ícono 3D). Quedan en reserva, y siguen funcionando, `"ameba"` (la ameba sola)
  e `"icons"` (la galaxia con el ícono 3D al centro). Ver "Paradas en galaxia". Para comparar,
  `?paradas=ameba`, `?paradas=galaxia` o `?paradas=iconos` en la URL, o los botones "Paradas" de la
  barra de revisión (Ameba · Galaxia · Íconos): la elección dura la visita (`sessionStorage`).
- **La ficha de cada obra** (rediseñada el 2026-11-23, pedido de Vicente: "muy cargadas de texto,
  botones, mucha información… cuidar de no repetir"), de arriba abajo:
  1. una línea chica con el número y el formato ("03 / 06 — Fulldome");
  2. el nombre;
  3. el subtítulo (`format` de la obra) **sólo si dice algo nuevo**: `subOf()` en `src/build.mjs` lo
     quita si todas sus palabras ya están en la etiqueta o en la descripción (hoy quedan Collective
     Pulse y VEATION);
  4. la primera oración de la descripción;
  5. bajo un filete, una lista chica "Tecnología" (hasta cuatro de `tech`, separadas por puntos, ya no
     como píldoras) y "Presentada en" (las dos primeras sedes, sólo lugar y ciudad, y "+N");
  6. el crédito obligatorio, si hay (`creditLine`);
  7. "Entrar a la obra" y, en la misma fila, el sitio propio.
  En el teléfono la descripción va en tres líneas, la tecnología en una y no sale "presentada en".
- **Entrar a una obra**: clic en la ameba o en "Entrar a la obra". La ameba se derrama como un líquido
  desde donde está hasta cubrir la pantalla (borde ondulado, con brillo de vidrio). Arranca con los
  colores de la ameba; adentro va apareciendo la portada, y al final se acomoda en el encuadre y el
  degradado de la cabecera de la ficha (`.phero`), que se abre a continuación con la navegación
  continua: el cambio de página casi no se nota. Dura 1,25 s. Con "atrás" se vuelve al mismo punto del
  recorrido. Es un shader a pantalla completa (`LIQ_FRAG` en `js/world.js`); **si cambia el alto o el
  degradado de `.phero` en el CSS, hay que cambiarlos también ahí** (`uHero` y el cálculo de `shade`).
- **Volver a la portada** (el logo del menú) lleva siempre a la entrada, arriba de todo.
- **Qué obras**: `site.json → world.works` (lista de slugs); vacío usa `featured`. Desde el 2026-11-21,
  una obra por formato, elegidas por Vicente, en este orden: Soul Charger (VR), Collective Pulse (XR),
  Neurocosm Full Dome (Fulldome), VEATION (software), Pacha Ibiza (encargo) y Rito Digital (performance
  audiovisual en vivo); después, los spin-offs. **El formato** de cada una va arriba del nombre en su ficha de vidrio, en el color de la
  segunda voz (`site.json → world.labels`, por idioma; `.world__kind` en el CSS): al recorrer las
  paradas se lee el abanico de lo que hace el estudio. Con etiqueta, el número va solo ("01 / 06"), sin
  "Obra propia" ni "Encargo". Los spin-offs, en
  `world.spinoffs`. Los pasos de capítulo (`CHAPS` y `gates` en `js/world.js`) salen solos: uno antes
  de la primera obra y otro antes del primer spin-off.
- **Cómo está hecho** (`js/world.js`): Three.js con WebGL, canvas transparente sobre el fluido. Cada ameba
  es un racimo de esferas dibujado con raymarching (ver "Las amebas"). La portada de cada obra se pide recién al detenerse frente a
  ella, sólo para el derrame. Mirages usa WebGPU; acá se eligió WebGL para que corra en todos los teléfonos.
- **Sin 3D sirve igual**, y es lo que leen los buscadores: el HTML trae el título, la descripción, el
  reel con su póster, "Obras seleccionadas" con las obras en tarjetas y los botones
  (`class="world--flat"`). `js/app.js` quita esa clase al montar el mundo y la repone si Three.js o
  WebGL fallan. Sin JavaScript queda esa página.
- **`html.is-under`**: lo pone `js/world.js` mientras se está adentro. Viste de oscuro el header y el pie,
  pasa el cursor a blanco y le dice a la navegación que no hace falta zambullida para entrar a una obra.
- **Sonido**: la música se filtra al entrar; una nota suave marca la llegada a cada parada (`AlmaSound.chime`).
- **Textos** (`site.json → t.world*`, `heroTitle`, `heroLead`, `selectedTitle`): borradores, a revisar
  por el estudio.

### Paradas en galaxia
Idea de Vicente (2026-11-18): que cada obra seleccionada no sea una ameba de un color sino una galaxia
de 4–5 imágenes suyas en movimiento, un poco 3D, con un ícono 3D que la represente. Se probó como
variante y la eligió el mismo día ("Galaxia"): es la de por defecto. Las amebas del entorno, la del
estudio y la del final siguen igual. El 2026-11-20 pidió probar la ameba de cada obra en lugar del
ícono ("a ver cómo funciona ameba + fotos") y se quedó con ella: es lo que muestra ahora "Galaxia";
los íconos quedan en reserva en "Íconos" (`world.stops: "icons"`).

- **Al centro, la ameba de la obra** (`blob` en `galaxy()`): la misma del modo ameba, con la rampa de
  los colores de la obra (`site.json → particles`), un poco más chica (`BLOB_R`) y apenas por encima del
  disco (`BLOB_Y`). Respira cada 6 s, se hincha bajo el cursor, se agita al avanzar rápido y su arte
  se enfoca al llegar. Tapa las imágenes que pasan por detrás. La transición líquida sale de ella.
  Con la ameba al centro, las amebas de fondo **y la del final** se apagan cerca de la galaxia aunque
  estén detrás (con el ícono sólo las de delante): si no, se confunden con la de la obra.

- **Cómo es** (`galaxy()` y `galaxyFrame()` en `js/world.js`): un disco inclinado de imágenes que
  orbitan despacio alrededor del ícono, que flota un poco por encima como un planeta sobre su anillo.
  Las imágenes miran siempre a quien mira, apenas curvadas, con puntas redondas; las de atrás se ven
  más apagadas y la que pasa delante del ícono se aclara. Al llegar, las imágenes se juntan en su
  órbita; al seguir, se abren y la galaxia se apaga. El enjambre de partículas de la obra se ordena en
  dos brazos de espiral sobre el mismo disco. Todo se inclina un poco hacia el cursor. Las amebas de
  fondo se apagan donde se cruzan, en pantalla, con la galaxia.
- **Los íconos** (`ICONS` en `js/world.js`) están modelados con código: formas de Three.js más
  `RoundedBoxGeometry` (de los ejemplos oficiales de Three.js, mismo CDN y versión), con materiales
  físicos (nácar iridiscente, vidrio oscuro, metal pulido, partes que brillan) en los colores de la
  obra, iluminados por `RoomEnvironment` (un estudio virtual que da reflejos; también de los ejemplos
  oficiales). Algunos tienen pantallas con las imágenes de la galaxia. `headset` casco de VR con su
  frente de vidrio y cámaras; `eeg` cabeza de vidrio con el cerebro encendido y la vincha de
  electrodos; `brush` pincel con una pincelada que lo rodea; `pulse` corazón que late con un
  electrocardiograma en anillo; `dome` cúpula geodésica con la imagen de la obra proyectada adentro;
  `room` túnel de pantallas con imágenes de la obra y una persona; `editor` notebook de grafito con
  el editor en pantalla y la cúpula en alambre encima, con el cenit en ámbar (VEATION); `projector`,
  `speaker` y `prism`. `brush` ya no lo usa ninguna obra seleccionada desde que salió Neural Canvas.
  Los que se ven mejor de frente se mecen en vez de girar (`SWING`). Cuál lleva cada obra:
  `site.json → world.icons`; sin entrada, uno según el formato.
  Se buscaron modelos 3D hechos (2026-11-18): lo gratis es de estilo low-poly y lo bueno es pago o con
  licencias que hay que revisar una por una, así que se modelaron. **Si el estudio tiene o arma
  modelos propios en Blender** (exportados como `.glb`), se pueden usar en lugar de estos con
  `GLTFLoader`, también de los ejemplos de Three.js.
- **Las imágenes** no son las fotos originales sino copias chicas (768×432, y 360×640 las verticales):
  `python3 tools/make_world_images.py` toma la portada y las fotos de cada obra seleccionada (hasta 5)
  y, si tiene menos, completa con cuadros de su reel vertical (necesita ffmpeg). Escribe
  `Asset/World/<obra>/` y la lista en `src/world-images.json`. Hoy son 790 KB para las seis obras, y se
  piden recién al acercarse a cada una. **Cuando lleguen las fotos nuevas de las obras**: sumarlas a
  `projects.json → photos`, correr ese script y después `node src/build.mjs`.
- **Clic** en cualquier parte de la galaxia: entra a la obra con la transición líquida, que arranca
  desde la ameba del centro (o desde el ícono).
- Para volver a las amebas: `site.json → world.stops: "ameba"` y un build. Si se decide no volver
  nunca, se puede borrar el modo ameba de las obras en `js/world.js` (el arte de paleta de `FRAG` lo
  siguen usando la ameba del estudio y las del fondo, así que eso queda).

### El reel flotante
Pedido de Vicente (2026-11-18): que después de la ameba del estudio se avance hasta el reel, flotando y
en reproducción automática, y de ahí a las obras.

- Es un plano con el video dentro del mundo 3D (`screen()` y `REEL_FRAG` en `js/world.js`): puntas
  redondas, filo de vidrio y un resplandor violeta. Flota, se inclina hacia el cursor y se deshace
  cuando la cámara avanza hacia él.
- **No es el reel completo.** Es una versión **sin audio**, hecha para esto:
  `Asset/Reel Portfolio/Reel Flotante.mp4` (1280×720, 8,3 MB) y `Reel Flotante Vertical.mp4` (540×960,
  5 MB) para pantallas verticales (`site.json → world.reel`). El reel completo (26,5 MB) no arranca solo
  nunca. Desde el 2026-11-21 es el reel 2026 (`2026 REEL PROJECTS HORIZONTAL`) y va a 1280×720 y crf 28:
  la versión anterior, a 960×540 y crf 33 (0,57 Mbps), se veía pixelada.
- **Se descarga recién al acercarse a su parada**, no al cargar la página, y se pausa al alejarse, con
  la pestaña oculta o fuera de pantalla. Antes del video se ve su póster. Con "reducir movimiento"
  queda el póster.
- **"Ver con sonido"** (el botón, o un clic en la pantalla) abre el reel completo a pantalla completa:
  es el mismo botón del bloque de reel de la página sin 3D (`initReel` en `js/app.js`; `js/world.js`
  lo llama por `opts.reelFull`). En teléfono no se ofrece: la versión vertical no tiene audio.
- **Costo**: cada visita que llega a esa parada y lo deja correr entero baja unos 8,3 MB, es decir
  **0,17 créditos de Netlify** (1.000 visitas ≈ 166 créditos); el navegador lo va bajando mientras
  suena, así que quien sigue de largo baja menos. Es la excepción consciente a la regla de no poner `autoplay` en videos
  de más de un par de MB. **Para apagarlo**: borrar `world.reel` de `site.json` y correr el build; la
  parada desaparece y el recorrido pasa del estudio a las obras.
- **Para rehacer las versiones** desde el máster (`~/Desktop/2026 REEL PROJECTS HORIZONTAL.mp4`, 1080p,
  121 MB; no está en `_masters/` porque pasa el límite de 100 MB de GitHub):
  - flotante: `-an -vf scale=1280:720:flags=lanczos -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart`
  - completo con sonido: `scale=1920:1080`, `-crf 24`, `-c:a aac -b:a 128k`
  - **verticales** (no hay montaje vertical del reel 2026): recorte 9:16 al centro, salvo la entrada
    (hasta 2,4 s) y la salida (desde 46,33 s), donde va el cuadro entero sobre su propio fondo
    desenfocado para que el logo no quede cortado. Flotante a 540×960 y `-crf 27` sin audio; con
    sonido (`Reel Vertical Web.mp4`) a 720×1280, `-crf 26` y AAC 128k. El filtro está en el historial
    del 2026-11-21. Si el estudio arma un montaje vertical, reemplazarlo directamente.

## Sonido e inmersión
Idea tomada de [unseen.co](https://unseen.co/): el sitio suena, y entrar a una obra es sumergirse.

- **Apagado por defecto.** Lo enciende el botón "Sonido" del menú (los navegadores no dejan sonar una
  página sin un clic). La elección dura lo que dura la visita (`sessionStorage`): si recarga o va y
  vuelve de `soul-charger.html`, la música regresa con su primer clic; una visita nueva empieza en silencio.
- **La música** (`site.json → sound.src`, hoy `Asset/Audio/breath-loop.m4a`): bucle exacto de 2:48 sacado
  de "Breath" (música de Soul Charger VR). Se descarga recién al encender. Sigue sonando al cambiar de
  página porque la navegación no recarga. Se calla con la pestaña oculta y mientras suena un video con
  audio (el reel a pantalla completa).
- **Profundidad** (`AlmaSound.setDepth`, lo llama `initSound()` de `js/app.js`): landing y Studio 0, índice
  de obras 0,25, ficha de obra 1. A más profundidad, un filtro deja la música sorda y grave.
- **Sólo suena la música. Nada de ruido de fondo** (decisión de Vicente, 2026-11-17): se probó una capa
  de "aire de superficie" y un rumor grave hechos con ruido blanco y se oían como un ruido fuerte. Los
  sonidos de transición son tonos suaves con eco, afinados a la música (si bemol): bajan una quinta al
  sumergirse, con unas gotas, y suben al salir.
- "Breath" es casi toda grave (bajo 150 Hz): en parlantes de teléfono o notebook casi no se escucha y el
  filtro tiene poco que apagar. **Con una pista que tenga medios y agudos el efecto se nota mucho más.**
- **Zambullida** (`water()` en `js/app.js`, aspecto en `.dive` de `css/site.css`): al pasar de una página
  de superficie a una ficha, el agua sube, la página cambia por debajo y el agua se aclara (cerca de 1 s),
  con su sonido de transición si el sonido está encendido. Al salir de la ficha, el agua baja. Entre dos
  fichas no hay zambullida. Con "reducir movimiento" no hay agua (el sonido sí cambia).
- **Para apagar todo**: `site.json → sound.enabled: false` y build. No se genera ni el botón ni el script.
- **Para cambiar la música**: recortar un tramo que se repita sin corte y comprimirlo. En Mac:
  `ffmpeg -ss <inicio> -t <duración> -i master.wav -c:a pcm_s16le loop.wav` y
  `afconvert loop.wav "Asset/Audio/<nombre>.m4a" -f m4af -d aac -b 96000 -s 2 -q 127`
  (en Windows: `ffmpeg -i loop.wav -c:a aac -b:a 96k -movflags +faststart <salida>.m4a`). Después cambiar
  `sound.src` y correr el build. El final y el principio se cruzan 6 s al repetir.
- `robots.txt` deja a los bots fuera de `/Asset/Audio/`.
- El máster de "Breath" (WAV, 89 MB) **no está en el repo**: pasa el aviso de 50 MB de GitHub. Lo tiene Vicente.

## Temas
`css/site.css` define todo el color con tokens en `:root`. Hay dos temas:
- **aura** (por defecto): velo claro sobre el fluido y texto en tinta `#211f6b`. Sigue el sistema de marca.
- **night**: velo oscuro y texto blanco, como el prototipo.

Aparte del tema, hay dos lugares que son siempre oscuros, "bajo el agua": el interior del mundo 3D de la
portada y las fichas de obra. Usan los mismos valores que night sobre el fluido teñido de violeta.

**Excepción: la ficha de Digital Sanctuaries** (`body.pg-ds`, bloque "Digital Sanctuaries" de
`css/site.css`). Pedido de Vicente (2026-11-21): que se vea elegante y boutique, distinta del resto. Lleva
el sistema de esa marca (skill `diseno-sanctuaries`): vacío `#0a0a09` y hueso `#f2f0ec`, el velo tapa el
fluido (otra sala), Libre Franklin 300/400 e IBM Plex Mono (cargadas en el mismo pedido a Google Fonts
que Raleway; los archivos sólo se bajan donde se usan), radios 0, sin sombras ni vidrio, fotos que entran
sin doblarse, sin ameba de Alma y sin partículas en la cabecera. El menú y el pie siguen siendo los de
Alma. Al navegar sin recarga la clase del `<body>` cambia sola.

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
- **Títulos a dos voces**: recta en 300 + cursiva fina (Raleway Italic 200) en el color de acento. En
  `site.json` la parte en cursiva se marca con `*asteriscos*`.
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
- **Reel del estudio** (26,5 MB; 9,6 MB la versión vertical): en modo **clic** (`site.json →
  reelAutoplayOnView: false`). Hoy vive en la portada: es lo que abre "Ver con sonido" en la parada del
  reel, y el bloque con póster de la página sin 3D. Se ve el póster y el video se descarga recién al reproducir. En escritorio
  abre a pantalla completa con sonido; en el teléfono se reproduce en su lugar y nunca pide la versión
  de escritorio. Antes arrancaba solo al acercarse, pero estaba dos pantallas más abajo; ahora es el
  segundo bloque y con ese criterio lo bajaría casi toda visita (~0,4 créditos cada una).
- **Reels de las fichas** (0,6–4 MB): `preload="none"`, se piden cuando un cuarto del video ya está en
  pantalla y se pausan al salir.
- **Vista previa del índice**: carga el reel de la obra al pasar el mouse (sólo escritorio).
- `#sc-trailer` en soul-charger.html: carga diferida como antes.
- **No poner `autoplay`** en videos de más de un par de MB. Única excepción, pedida por Vicente: el reel
  flotante de la portada, con una versión de 8,3 MB que se pide recién al llegar a su parada
  (ver "El reel flotante").
- Compresión de videos de sección: H.264 `-crf 27 -preset slow`, AAC 128k si tienen audio, `+faststart`.

## Convención de assets de proyecto (Studio Projects / Commisions)
Una carpeta por proyecto dentro de `Asset/Studio Projects/` o `Asset/Commisions/`:
- **Fotos WebP a 1920×1080**, `quality 85`. Hoy hay 3 por obra; la ficha tiene lugar para 8 y admite
  más (lista `photos` en `projects.json`). Una lleva sufijo ` Portada` y va en `cover`.
  Fuentes con otro aspecto → recortar centrado a 16:9 antes de escalar:
  `crop='min(iw,ih*16/9)':'min(ih,iw*9/16)',scale=1920:1080:flags=lanczos`
- **1 reel MP4 vertical 406×720** (9:16), H.264, **sin audio**, `-crf 30 -preset slow`,
  `-movflags +faststart`. Peso objetivo 0,5–2 MB. En la ficha se ven algo blandos: conviene
  reexportarlos más grandes desde los másters cuando se pueda.
  Si el material original es apaisado (16:9), se compone sobre lienzo 406×720 con relleno
  desenfocado del propio plano (`gblur=sigma=26` + `eq=brightness=-0.14:saturation=0.85`).
- Originales pesados van a `_masters/` (mismo árbol que `Asset/`), no a `Asset/`.
- **De dónde sale el material nuevo**: de la biblioteca de marketing del estudio, en la Mac de Vicente
  (`Desktop/ALMA MARKETING/Alma Marketing/05_Biblioteca/`, una carpeta por proyecto). **Antes de sumar
  algo, leer su `_PERMISOS.md`**: dice qué se puede usar y con qué crédito, y qué fotos tienen pendiente
  el permiso de una persona o de un fotógrafo. El repo es público y lo que entra a `Asset/` se publica.

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
  falta material equirectangular. Opciones evaluadas: Pannellum (19 KB) o Three.js (que ya se usa en
  `js/particles.js`); el formato domo (ojo de pez) necesita un shader propio en los dos casos.
- **Three.js viene de un CDN** (jsDelivr). Si se prefiere servirlo desde el sitio, bajar el archivo a
  `js/` (se publica solo) y cambiar la línea `import` de `js/particles.js`.
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

### 2026-11-24 — soul-charger.html con las fotos de la versión 2026 (Vicente)

La página hecha a mano seguía con 20 renders de la versión antigua (`Asset/Registro/`) en el carrusel
"Registro" y su visor. Se reemplazaron por 20 capturas de 2026, en el orden del recorrido (alma,
protoamebas, baldosas, respiración, latido, mente, attracting, dibujo, resultados, constelación y el
título), en `Asset/Soul Charger/Registro 2026/` con los mismos nombres (`Portada.webp`, `1..19.webp`),
1920×1080, 694 KB en total. `Asset/Registro/` ya no lo usa nada (no se publica; sigue en el repo).

**Sin cambiar**: el tráiler de esa página (`Trailer Soul Charger VR_V1.mp4` y su póster) es de la
versión antigua; hace falta un tráiler nuevo para reemplazarlo. Los gráficos de las fases (anillos de
colores) no son capturas y quedan.

**Verificado en Chrome**: el carrusel con las fotos nuevas, sin imágenes rotas, y el visor.

### 2026-11-24 — Digital Sanctuaries: portada nueva (Vicente)

Vicente pidió de portada la sala grupal con almohadones y la pantalla de anillos (`group.webp`,
`CTX_GROUP_SESSION`, que era la imagen a sangre). El campo de luz azul (`2 Portada.webp`, la portada
anterior) pasó a ser la imagen a sangre. También cambian la primera imagen de su galaxia y su imagen para
compartir.

### 2026-11-24 — Soul Charger con la versión 2026 (Vicente)

Vicente: las fotos de Soul Charger eran de la versión antigua. Pasó `~/Desktop/SOUL CHARGER 2026 VR/Soul
Charger Material/` (35 capturas a 2560×1440 de las doce escenas, hojas de contacto con sus tiempos y el
recorrido completo en video, 15 min) y el deck de Canva "Soul Charger - VR Interactive"
(canva.link/soul-charger-vr-interactive), que usa esas mismas capturas.

- **Fotos** (`v2-*.webp`, 13): portada, la sala dorada con el alma (`v2-alma-a Portada`); al lado del
  teléfono, la respiración; imagen ancha, los resultados con el panel; a sangre, el bosque de "dibujo";
  galería y dúos con protoamebas, latido, mente, attracting, las baldosas del anillo, la constelación.
  Salen todas las anteriores (renders viejos y las cinco `web-*` de la versión de 2025); siguen en la
  carpeta, sin publicarse. No se usaron el título con logos ni el timbre.
- **Reel del teléfono**: `Soul Charger Reel 2026.mp4`, nueve tramos de 2,6 s del recorrido completo
  (alma, protoamebas, respiración, latido, mente, attracting, dibujo, resultados, constelación), recorte
  9:16 al centro, 540×960, sin audio, crf 28: 1 MB. El anterior era de la versión vieja.
- **Cabecera**: las partículas pasan a dorado, lila y rosa (`particles`), como la versión nueva. La
  ameba de la portada queda como estaba (sus colores anteriores van en `world.forms`).
- Galaxia de la portada, imagen para compartir de la ficha y la de `soul-charger.html`, rehechas.

**Sin cambiar**: `soul-charger.html` (la página hecha a mano) sigue con sus fotos de la versión antigua.

**Verificado en Chrome**: la ficha (cabecera, imagen ancha, teléfono con el reel nuevo, galería, a
sangre), sin imágenes rotas; la galaxia en la portada. En la consola, sólo los avisos de View
Transitions de la ventana de prueba.

### 2026-11-24 — Presentar con el teclado (Vicente)

Vicente quiere usar la portada para presentar: ya avanzaba con las flechas y pidió poder entrar y salir
de las obras seleccionadas con el teclado. Enter entra a la obra de la parada; Esc o ← vuelven al mismo
punto del recorrido. Ver "Presentar con el teclado" en la sección del mundo interior.

**Verificado en Chrome**, con teclas reales: tres → hasta Soul Charger, Enter abre su ficha, Esc vuelve a
Soul Charger en el recorrido; → a Collective Pulse, Enter, ← vuelve a Collective Pulse. En una ficha con
el visor de fotos abierto, ← cambia de foto y Esc lo cierra sin salir de la ficha. Una ficha abierta
directamente: Esc lleva a la portada. Consola sin errores.

### 2026-11-23 — Neural Canvas: el reel horizontal en grande y sin huecos (Vicente)

Vicente empezó a corregir las fichas una por una. En Neural Canvas pidió el video horizontal en la
sección grande vacía (la imagen ancha), sacarlo del teléfono de abajo y, si no hay más material, limpiar
los espacios vacíos.

- **Video**: `Neural Canvas Reel Horizontal.mp4`, del reel EIT original (`05_Biblioteca/neural-canvas/
  video/neural-canvas-reel-eit-36s.mp4`, 1080p, 116 MB) a 1280×720, crf 29, sin audio: 3,9 MB. Campo
  nuevo `wideVideo`. Sale el reel vertical (`video`) y con él el teléfono.
- **Fotos nuevas**: tres del foro EIT en la EUIPO (`euipo-1..3.webp`, de `web-canva-2026-11/
  neural-canvas/fotos-euipo-alicante`): las pantallas LED con las pinturas, la sala con las
  proyecciones (público de espaldas) y el escenario. No se usaron la del escenario con la marca del
  foro, la del público de frente ni `IMG_6205` (participante reconocible, consentimiento pendiente).
- Campo nuevo `noSlots`: sin lugares vacíos.

**Para tener en cuenta**: `2.webp` (la foto al lado del texto, que ya estaba) parece la misma
participante de `IMG_6205`, cuyo consentimiento `_PERMISOS.md` marca pendiente. Y `_PERMISOS.md` sigue
diciendo que el contrato con EIT cede la propiedad de los entregables.

**Verificado en Chrome**: el video se carga al verlo y se reproduce (1280×720), la foto al lado del
texto, la galería con cinco fotos, sin huecos. Consola sin errores.

### 2026-11-23 — Rito Digital sin fotógrafos en los créditos (Vicente)

Después de quitar los créditos sobre las fotos, Vicente pidió sacar también los fotógrafos del pie de la
ficha de Rito (FOC, CULTVR y FulldomeUK). Quedan "A work by Alma Digital Studio" y "Direction, music and
visuals: Vicente Manzano · Beltrán Lihn" (y su versión en español). Ojo: el `CREDITS.txt` del press kit
de Rito dice que el crédito de las fotos es obligatorio.

### 2026-11-23 — Fuera los créditos sobre las fotos, en todo el sitio (Vicente)

Pedido de Vicente: "olvídate de los créditos en las fotos, de toda la web". Se quitaron el crédito
sobre cada foto de las fichas (Rito Digital y VEATION), la fila "Fotos" de la ficha de vidrio de la
portada, el campo `photoCredits` y sus textos y estilos (`pPhoto`, `worldPhotos`, `.shot__credit`).
`tools/make_world_images.py` ya no distingue fotos con crédito. Siguen los créditos al pie de la ficha de
Rito ("Photography, …: @aliciaganesha · @thelighttrace", "Rhys Davies / CULTVR", "4PI"), que no van sobre
las fotos, y las líneas de crédito obligatorias de las obras (`creditLine`: BID, Johns Hopkins).

**Verificado en Chrome**: la ficha de Rito y su parada en la portada, sin créditos sobre las fotos.
Consola sin errores.

### 2026-11-23 — Las fotos de FulldomeUK también en las galaxias de la portada (Vicente)

Vicente quería las fotos de FulldomeUK también en las obras seleccionadas de la portada. Hasta ahora las
fotos con crédito obligatorio no iban a las galaxias. Campo nuevo `galaxyPhotos` (ver arriba) y fila
"Photos / Fotos" (`worldPhotos`) en la ficha de vidrio con el crédito de las fotos de esa galaxia.

- **VEATION**: portada, la charla colorida en el domo, una captura y otras dos de la charla.
- **Rito Digital**: portada, las dos verticales de ustedes tocando en FulldomeUK, una de CULTVR (Rhys
  Davies) y un cuadro del film. Créditos: "4PI / FulldomeUK · Rhys Davies / CULTVR".

**Verificado en Chrome**: las dos paradas con las fotos y la fila de créditos. Consola sin errores.

### 2026-11-23 — Digital Sanctuaries: las situaciones del deck maestro (Vicente)

Vicente pasó el deck "Digital Sanctuaries Master Deck" de Canva (canva.link/digitalsanctuaries, 22
páginas) y pidió usar sus imágenes, también las de situaciones reales, en la ficha y en la galaxia de la
portada. Las del deck son visualizaciones del estudio (dicen "Visualisation"); se tomaron los
originales en alta de `DIGITAL SANCTUARIES/DS Marketing/IA Realistas Refe` (2752×1536) y de
`Prototipo Producto/DECK ASSETS/CTX_*` (2048×1143), recortados a 16:9 y a 1920×1080.

- **Nueve situaciones nuevas** (`sensor`, `office`, `spa`, `transit`, `group`, `breath`, `painting`,
  `bedroom`, `games` .webp): el sensor en la frente (al lado del texto), la oficina, el spa con
  tumbonas (imagen ancha), el lobby con la cabina, la sala grupal con almohadones (imagen a sangre), la
  respiración en grupo, la pintura en VR, el dormitorio y los juegos.
- **Del look anterior quedan** la portada (campo azul), la puerta, el óculo con el grupo, el grupo de
  rodillas y la figura recostada. Salen el óculo de la tapa del deck (`3.webp`), el objeto de sonido
  (`6.webp`) y el túnel gris (`7.webp`); siguen en la carpeta.
- La galaxia de la portada pasó a portada + sensor, oficina, spa y puerta.
- El crédito sigue siendo "Imagery: visualisations by Alma Digital Studio": no se presentan como registro.

**Verificado en Chrome**: la ficha (lado del texto, galería, ancha, a sangre) y la galaxia. Consola sin errores.

### 2026-11-23 — Fotos de FulldomeUK 2026 en VEATION y Rito Digital (Vicente)

Pedido de Vicente: usar fotos de la presentación de VEATION en FulldomeUK y de Rito en vivo en el domo.
Fuente: `~/Downloads/drive-download-20261016T1242*/261010_FDUK_PHOTOS_BY_4PI_WEBL_RES_*.jpg` (14 fotos
del 10-10-2026, CULTVR Lab, Cardiff; 2250×1500). Crédito sobre cada foto: "4PI / FulldomeUK" (sale del
nombre de los archivos; el `CREDITS.txt` de Rito todavía dice "[credit to confirm]" para FulldomeUK).

- **VEATION** (8 → 12 fotos): cuatro de la charla con el editor proyectado en el domo
  (`fduk-1..4.webp`, recorte 16:9): la imagen ancha, la imagen a sangre, una en la galería y una en dúo.
- **Rito Digital** (10 → 12 fotos): dos verticales de ustedes tocando bajo el domo (`fduk-1..2.webp`,
  1200×1800, sin recortar), en el lugar vertical (4:5) de cada dúo. Créditos: "Photography, FulldomeUK
  2026: 4PI".
- Por llevar crédito, no van a las galaxias de la portada. No se usó la foto de FulldomeUK del press kit
  de Rito (iPhone, crédito sin confirmar).

**Verificado en Chrome**: las dos fichas, con el crédito sobre cada foto y sin imágenes rotas.

### 2026-11-23 — Johns Hopkins en Soul Charger; Rito sin FulldomeUK (Vicente)

- **Soul Charger**: la colaboración con iDeas Lab (Berman Institute of Bioethics, Johns Hopkins
  University) pasó de la segunda oración de la descripción, que la ficha de vidrio no mostraba, a
  `creditLine`: sale en la ficha de vidrio de la portada y bajo el resumen de su ficha, en los dos
  idiomas, y ya no se repite en el texto. `creditLine` ahora admite traducción
  (`projects.es.json → creditLine`; si falta, va la de inglés, como el crédito del BID).
  Nota: `_PERMISOS.md` pide el visto bueno de JHU antes de insinuar respaldo; el texto es el mismo
  "en colaboración con" que el sitio ya tenía.
- **Rito Digital**: FulldomeUK sale de la obra; la tercera sede es "CULTVR Lab, Cardiff, Wales,
  October 2026" y el texto dice que volvió a ese domo en octubre. En VEATION, Rito se presentó en el
  domo de CULTVR y es el propio VEATION el que se presentó en FulldomeUK 2026.
- El crédito de la ficha de vidrio, un poco más legible (color del cuerpo).

**Verificado en Chrome**: la parada de Soul Charger con la línea de Johns Hopkins, su ficha con el
crédito bajo el resumen, las sedes de Rito sin FulldomeUK. Consola sin errores.

### 2026-11-23 — Portada: fichas de vidrio más livianas (Vicente)

Vicente: las fichas de las obras seleccionadas estaban "muy cargadas de texto, botones, mucha
información"; pidió rediseñarlas para que sean más elegantes y fáciles de leer, sin sacar información
necesariamente y sin repetir. Lo que se repetía: el formato salía tres veces (etiqueta, subtítulo y
descripción: "Fulldome" · "Full Dome Experience" · "A 45-minute immersive full dome…").

- Número y formato en una sola línea; el subtítulo sólo si no repite (`subOf()`); la tecnología y las
  sedes en una lista chica de dos columnas, sin píldoras; sedes sin país ni fecha; el sitio propio al
  lado del botón. Ver "La ficha de cada obra". Texto nuevo: `worldTech`.

**Verificado en Chrome**: Collective Pulse (con subtítulo y el crédito del BID), Neurocosm Full Dome,
VEATION, Rito Digital, la parada del estudio, y en español Soul Charger y Digital Sanctuaries. Consola
sin errores.
**Sin ver**: el teléfono (la ventana de Chrome no se deja achicar), Safari y Firefox.

### 2026-11-23 — Índice de obras: portadas en el cuadro de la vista previa (Vicente)

Pedido de Vicente: que el cuadro de la derecha del índice no quede en blanco ("Hover a work") cuando no
hay nada bajo el cursor. Ahora pasan las portadas (ver "Índice de obras"). Markup `.preview__loop` en
`src/build.mjs` (índice y el bloque de formatos del landing en reserva), lógica en `initIndex()` de
`js/app.js`, estilos junto a `.preview`.

**Verificado en Chrome**: rota en reposo (VEATION → Rito Digital…), con el filtro Encargos pasan sólo
los encargos, al pasar por una obra se ve esa con su video y al salir de la lista vuelve la rotación.
Consola sin errores.

### 2026-11-23 — Amebas más suaves (Vicente)

Vicente vio que algunas amebas habían quedado "muy saturadas y metálicas" y pidió la suavidad de las de
antes. Las que más se notaban eran Collective Pulse (arcoíris), Pacha, Rito, VEATION y Soul Charger. Las
causas: las rampas salían de los colores de partículas (pensados como luz sobre negro), los pliegues
quedaban oscuros con un acento de otro tono y el borde se cortaba en seco.

- `js/world.js`: luz más envolvente y menos contraste con los pliegues, el acento como un velo (máximo
  25 %), menos deriva de tono y el borde translúcido y teñido del tono medio, sin reflejo. `rampOf()`
  pasa los colores de cada obra por `soft()` (30 % menos de saturación y un poco de lila) y lleva la
  sombra al violeta profundo.
- `js/ameba.js` (la flotante): los mismos ajustes de luz, acento y borde.

**Verificado en Chrome**: la puerta, Soul Charger, Collective Pulse, Neurocosm Full Dome, VEATION, Pacha
y Rito en la portada, y la ameba flotante en Studio. Cada obra conserva su color, en pastel. Consola sin
errores.
**Sin ver**: teléfonos reales, Safari y Firefox.

### 2026-11-21 — Amebas con metaballs, como la ameba de la marca (Vicente)

Vicente pasó un prototipo WebGPU (`~/Downloads/alma-ameba-webgpu/`: un racimo de esferas fundidas con
raymarching, superficie mate y una rampa de lilas) para que las amebas del sitio se parezcan más a la
ameba de Alma Digital. Se llevó a WebGL (el sitio no usa WebGPU, para que corra en todos los teléfonos) y
se aplicó a todas las amebas. Ver "Las amebas" en la sección del mundo interior.

- **Mundo 3D** (`js/world.js`): cada ameba es una esfera envolvente de pocos triángulos y el shader
  recorre doce esferas fundidas, con algo de ruido cerca del borde. Escribe su profundidad real, así que
  las imágenes de las galaxias siguen pasando por detrás. La puerta, la ameba del estudio y la del final
  llevan la rampa de la marca; las de las obras, una rampa con sus colores. Se fueron el brillo de
  pompa de jabón y el arte de tinta de adentro.
- **La ameba flotante** de las otras páginas (`js/ameba.js`): el mismo racimo y la misma rampa, con sus
  interacciones de siempre (respira, sigue al puntero, se arrastra, se aplasta, muta con el clic).
- Después Vicente pidió dejarlas "un poco más matte, sin tantas reflexiones": se quitó el borde
  reflejado, el tono más claro quedó a la mitad y sólo en lo más iluminado, y la luz envuelve más.
- También pidió la ameba de Neurocosm Full Dome "más azul oscuro y morada" (`world.forms`: su cabecera
  sigue en rojos) y este orden de la selección: Soul Charger, Collective Pulse, Neurocosm Full Dome,
  VEATION, Pacha Ibiza, Rito Digital y los spin-offs.

**Verificado en Chrome**: la puerta, la ameba del estudio, las galaxias de Soul Charger y Rito, el
cierre, el modo "Ameba" (Neurocosm Full Dome) y la ameba flotante en Obras y Studio. Consola sin
errores. Unos 35 cuadros por segundo en la entrada y en una galaxia, en la ventana de prueba (antes,
31 en la misma clase de ventana).
**Sin ver**: teléfonos reales (el raymarching pesa más que la esfera deformada; en táctil hace menos
pasos), Safari y Firefox.

### 2026-11-21 — Digital Sanctuaries con su propia estética, y las fotos de Rhys Davies aprobadas (Vicente)

- **Rhys Davies**: Vicente confirmó que sus fotos (CULTVR) se pueden usar. No volver a marcarlo.
- **Digital Sanctuaries**: Vicente pasó el deck (`DS Marketing/Pitch DS/DS_Pitch_con_videos_ES.pptx`) y la
  carpeta `DS Marketing/`, pidió evitar las fotos de las ferias ("demos muy low cost") y que la ficha se
  vea "muy elegante y boutique", con una estética distinta del resto. Ver "Temas".
  - **Imágenes**: nueve de `DS Marketing/DECK ASSETS` (las del deck, generadas por el estudio): aperturas
    de luz en el vacío con figuras en reposo y un objeto del catálogo, todas en azul, cian o
    acromáticas. Portada: el campo de luz azul (`DECK2_S08_FIELD_ONEHUE`). En los créditos: "Imagery:
    visualisations by Alma Digital Studio". No se usaron `Refes Digital Sanctuaries` (referencias de
    terceros) ni las fotos y el video de Barcelona Design Week e Inner Canvas (se sacaron de la ficha y de
    la galaxia; siguen en el historial de exhibición).
  - **Ficha**: sin teléfono; la foto vertical va sola al lado del texto. Nuevo bloque **El catálogo**
    con las cinco unidades de la skill `voz-sanctuaries` (UMB–03 Umbral, FOC–10 Foco, PRA–15 Prana,
    RES–15 Resonancia, REP–15 Reposo). Consulta: "Request a private demonstration" / "Solicitar una
    demostración privada".
  - **Dominio**: queda www.almadigitalsanctuaries.com. El deck dice www.digitalsanctuaries.com, pero ese
    dominio está en venta (redirige a hugedomains.com).

**Verificado en Chrome**: la ficha en inglés y en español de punta a punta (cabecera, resumen con el
botón al sitio, foto y texto, catálogo, galería, imagen a sangre, créditos, consulta), con Libre Franklin
y Plex Mono cargadas; la navegación sin recarga desde LPS hacia la ficha y de ahí a VEATION (la estética y
la ameba cambian y vuelven); las demás fichas sin cambios; la galaxia de Digital Sanctuaries en la
portada. Paquete: 51 páginas, 1.564 referencias, ninguna rota.
**Sin ver**: teléfono, Safari y Firefox.

### 2026-11-21 — Rito Digital: enlace a ritodigital.com y ficha con el material de su web (Vicente)

Pedido de Vicente: enlazar ritodigital.com para que se pueda entrar desde la ficha, y usar lo que haga
falta del proyecto `~/Desktop/RITO DIGITAL MASTER/Rito Digital Web/` (la web publicada está en su
`deploy-netlify/`) para mejorar la ficha.

- **Enlace**: el sitio propio de una obra (`website`) pasó de un enlace chico a un botón bajo el resumen,
  y se suma como enlace en su parada de la portada. Vale para las tres obras con sitio.
- **Texto** alineado con la web de Rito: "immersive live concert film", siempre en vivo, adaptado a tres
  configuraciones (fulldome, sala 360°, proyección única); la música (techno ritual, pulso de latin
  house, procesamiento vocal, handpan en vivo); los ocho pasos por su nombre (Creation … Dancing with
  Myself, Creativity, como en la web); el estreno en el cierre de FOC ante 1.000 personas. No se usó la
  sinopsis de la web (cuenta lo de la IA, que `voz-rito` reserva para entrevistas).
- **Fotos**: tres del domo de CULTVR en Cardiff (© Rhys Davies / CULTVR, con el crédito sobre la foto y
  en los créditos; la web de Rito ya las publica así) como imagen ancha, imagen a sangre y en la galería.
  Sale la foto de las manos en el sintetizador (`8.webp`). 10 fotos en total.
- Las galaxias ya no usan fotos con crédito obligatorio (la de Rito tenía una de FOC).

**Verificado en Chrome**: la ficha con el botón (pestaña nueva, ritodigital.com), las fotos de CULTVR
con su crédito, sin huecos ni imágenes rotas; la parada de Rito en la portada en español con
"Visitar ritodigital.com ↗", y que no aparece en Soul Charger. En la consola, avisos de View
Transitions ("Viewport size changed") al cargar páginas desde la barra de direcciones en la ventana de
prueba, que aparecen desde antes de este cambio.

### 2026-11-21 — Selección nueva: una obra por formato, con el formato en cada parada (Vicente)

Vicente preguntó si después de la descripción convenía mostrar cinco obras o cinco formatos (VR/AR,
domo, XR con biofeedback, encargos, performance musical, software). Se le recomendó obras, no formatos
(así lo hacen las referencias y los estudios de ese circuito; quien decide mira una obra concreta; un
formato agrega un clic), pero elegidas para que cada una represente un formato distinto y con el formato
escrito en la parada. Eligió las seis y el orden:

- **Selección** (`featured`): Soul Charger (VR), Collective Pulse (XR), Neurocosm Full Dome (Fulldome),
  Rito Digital (Live audiovisual performance / Performance audiovisual en vivo), Pacha Ibiza
  (Commission / Encargo) y VEATION (Software). Sale Neurocosm XR (sigue en el índice; se borró su
  `Asset/World/Neurocosm XR/`, que ya no se usaba).
- **Rito Digital deja de ser spin-off** en el sitio: `track: "studio"` (obra propia), segundo en el
  índice, entre las obras del recorrido. El paso "Studio spin-offs" queda con Digital Sanctuaries sola.
  A pedido de Vicente, Rito también salió del bloque de spin-offs de Studio y del pie ("Also from the
  studio"), que salen de `src/i18n/studio.json → spinoffs`: ahí queda sólo Digital Sanctuary.
- **Etiqueta de formato** en la ficha de vidrio de cada parada (`world.labels`, `data-w-kind`).

**Verificado en Chrome**: las seis paradas con su etiqueta (capturas de Soul Charger, Rito Digital, Pacha
Ibiza) y Digital Sanctuaries como único spin-off. En la consola sólo dos avisos de View Transitions por
cambios de tamaño de la ventana de prueba. Paquete: 51 páginas, 1.568 referencias, ninguna rota.
**Sin ver**: el teléfono (la etiqueta suma una línea a la ficha), Safari y Firefox.

### 2026-11-21 — Reel 2026 nítido (Vicente)

Dos pedidos de Vicente: cambiar el reel por el actualizado (`~/Desktop/2026 REEL PROJECTS HORIZONTAL.mp4`)
"y que no se vea pixeleado", y volver a la descripción original de Alma Digital.

- **Reel**: las cuatro versiones de `Asset/Reel Portfolio/` se rehicieron desde ese máster (1080p, 19
  Mbps), con los mismos nombres. El flotante pasó de 960×540 a 0,57 Mbps (lo que se veía pixelado) a
  1280×720 con crf 28 (8,3 MB); el completo con sonido, 1080p con crf 24 (26,5 MB). Del reel 2026 no hay
  montaje vertical: las versiones verticales son un recorte al centro, con la entrada y la salida
  (el logo) enteras sobre fondo desenfocado. Pósters nuevos, del logo de la entrada. Ver "El reel flotante".
  Filtro de las verticales (W×H: 540×960 o 720×1280):
  `[0:v]split=3[a][b][c];[a]crop=606:1080,scale=W:H[A];[b]scale=W:H:force_original_aspect_ratio=increase,crop=W:H,gblur=sigma=26,eq=brightness=-0.14:saturation=0.85[bg];[c]scale=W:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[B];[A][B]overlay=0:0:enable='lt(t,2.4)+gte(t,46.33)'[v]`
- **Descripción**: se probó volver `heroLead` (la ficha del estudio en la portada y la página sin 3D) al
  texto del sitio anterior ("Alma Digital is an immersive wellness art studio that creates multimedia
  experiences…", el mismo del "about" de Studio). Vicente lo vio y pidió volver a la descripción que
  estaba, y después la cambió por una propia: **"We create interactive and immersive experiences that
  merge art, science and technology to support well-being and inner exploration."** En español: "Creamos
  experiencias interactivas e inmersivas que unen arte, ciencia y tecnología para acompañar el bienestar
  y la exploración interior." (traducción a revisar). Es la que quedó.

**Para tener en cuenta** (de `_PERMISOS.md`, que describe este mismo reel): trae tomas de Pacha Ibiza y
Adidas Terrex, y una de Collective Pulse (hacia los 40 s) sin el crédito del BID que esa obra exige en toda
pieza. El reel anterior del sitio no tenía la de Collective Pulse.

**Verificado en Chrome**: la parada del estudio con cada una de las dos descripciones; el reel flotante
reproduciéndose a 1280×720; "Watch with sound" abre el reel nuevo (0:50) y pausa el flotante. Cuadros de
la versión vertical revisados (logo entero en la entrada y la salida). Consola sin errores.
**Sin ver**: el reel en un teléfono (vertical flotante y con sonido), Safari y Firefox.

### 2026-11-20 — Rito Digital y Digital Sanctuaries entran como spin-offs (Vicente)

Pedido de Vicente: sumar Rito Digital y Digital Sanctuaries como spin-offs. Se le recomendó no meterlos
en las seis obras seleccionadas sino darles un capítulo propio al final del recorrido, con su ficha y
el enlace a su sitio, y lo aprobó. Material: `~/Desktop/RITO DIGITAL MASTER/MARKETING/` (y su copia en
la biblioteca de Alma Marketing) y `~/Desktop/DIGITAL SANCTUARIES/`.

- **Dos fichas nuevas** (`work/rito-digital.html`, `work/digital-sanctuaries.html` y en español), línea
  nueva **Spin-offs** en el índice. Rito: formato Performance; Digital Sanctuaries: VR / XR.
- **Portada**: después de Pacha Ibiza, un paso "Studio spin-offs" con sus anillos y dos galaxias. La
  ameba del final ya no se ve de lejos detrás de la última ficha.
- **Rito Digital**: ocho fotos. Cinco cuadros del film (`04_OBRA/Stills Film`, de los primeros 50
  minutos: nada del final, del botón de apagado, de la cuarta pared ni del Espejo del Alma) y tres fotos
  del Festival of Consciousness (Barcelona, julio 2026), cada una con su crédito sobre la foto
  (@aliciaganesha, @thelighttrace), como pide el `CREDITS.txt` del press kit. Teléfonos: el reel
  fulldome de CULTVR y el aftermovie de FOC (sin audio, 1,9 MB cada uno). Textos con la skill
  `voz-rito`, en capa ficha (el boilerplate aprobado), sin contar la trama. Créditos según su canon:
  "A work by Alma Digital Studio · Direction, music and visuals: Vicente Manzano · Beltrán Lihn".
  Partículas `pulse` en rojo, crema y cobre.
- **Digital Sanctuaries**: nueve fotos de iPhone del equipo, de Barcelona Design Week 2026 y de Inner
  Canvas (Barcelona, noviembre 2026), y el resumen de Design Week en el teléfono (0,6 MB). Textos con la
  skill `voz-sanctuaries` (capa llana primero, sin promesas de salud). Partículas `halo` (anillos que
  respiran) en los tonos de su marca.
- Campo nuevo `photoCredits` y textos nuevos `pSpinoff`, `pPhoto`, `spinTitle`.

**No se usó, y por qué**: las fotos de CULTVR de Rito (© Rhys Davies: `_PERMISOS.md` pide confirmar con
él) y la de FulldomeUK (crédito sin confirmar); las fotos de multitud de FOC con caras reconocibles; el
tráiler de Digital Sanctuaries y las imágenes del deck (hechos con IA o renders: la nota pide no
mostrarlos como registro); las fotos de "juano" en Design Week (fotógrafo sin crédito confirmado); lo
de Neural Canvas en la EUIPO; la mención de Washington como piloto y la de Johns Hopkins (la voz de
Digital Sanctuaries y `_PERMISOS.md` lo piden).
**A revisar**: en Inner Canvas y Design Week aparecen participantes, casi todos con el casco puesto o de
espaldas; si el evento de Inner Canvas fue para una empresa, confirmar que se puede mostrar. Los
colores de partículas de los dos.

**Verificado en Chrome**: el paso "Studio spin-offs" y las dos galaxias; las dos fichas de punta a punta
(cabecera, resumen con el enlace a su sitio, teléfonos reproduciendo, galería con los créditos sobre las
fotos, créditos), en inglés y español; el índice filtrado por Spin-offs (`?line=spinoff`). Consola sin
errores. Paquete: 51 páginas, 1.584 referencias locales, ninguna rota.
**Sin ver**: teléfonos (en tamaño y reales), Safari y Firefox, el movimiento continuo.

### 2026-11-20 — Galaxias con la ameba de la obra al centro, en vez del ícono (Vicente)

Pedido de Vicente: en la versión galaxia, cambiar los íconos 3D por las amebas, "a ver cómo funciona
ameba + fotos". Ver "Paradas en galaxia".

- `"galaxy"` lleva ahora la ameba de cada obra al centro de su galaxia, con el arte de sus colores; la
  transición líquida sale de ella. Los íconos no se borraron: son la opción `"icons"`, con su botón
  "Íconos" en la barra de revisión y `?paradas=iconos`. Con la ameba no se arma el entorno de luz de
  los íconos (`RoomEnvironment`) ni sus materiales.
- Las amebas de fondo y la del final se apagan cerca de la galaxia aunque estén detrás: en Pacha
  Ibiza, la del final quedaba al lado de la de la obra y parecían dos.

**Verificado en Chrome**: las seis galaxias con su ameba (Neurocosm XR, Soul Charger, VEATION,
Neurocosm Full Dome y Pacha Ibiza en capturas), en inglés y español; el botón "Íconos", que vuelve a
armar el mundo con los íconos en el mismo punto; la entrada a Soul Charger, con el derrame saliendo de
la ameba hasta la ficha; el cierre con su ameba entera. Consola sin errores.
**Sin ver**: el tamaño de teléfono (el panel integrado frena la animación y la ventana de Chrome no se
dejó achicar), el movimiento continuo, teléfonos reales, Safari y Firefox.
**Decidido el mismo día**: Vicente se quedó con la ameba. Los íconos quedan en reserva (`"icons"`),
como el modo ameba. Si se decide no volver nunca a ellos, se pueden borrar `ICONS`, `makeIcon` y su
entorno de luz de `js/world.js` (dos imports de Three.js menos).

### 2026-11-19 — VEATION entra al sitio, con el formato nuevo Software, y reemplaza a Neural Canvas en la selección (Vicente)

Pedido de Vicente: sumar VEATION (el editor de video inmersivo del estudio) como obra, con una categoría
nueva "Software", y ponerla en la primera selección en lugar de Neural Canvas. Material en
`~/Desktop/VEATION/` (sus notas: `CLAUDE.md`, `estado-web-para-socio.md`, `Marketing/LEEME.md`).

- **La ficha** (`work/veation.html` y `es/work/veation.html`): primera del índice, obra propia, 2026.
  Ocho capturas reales del editor (`Marketing/Capturas/`, 3840×2160 → 1920×1080) con Rito en el domo y en
  la sala 360, y dos reels de la serie de Veation en los teléfonos (`VEATION-01` presentación y
  `VEATION-02` fulldome, a 406×720 sin audio: 0,9 y 1,2 MB). Enlace a veation.com bajo el resumen
  (campo nuevo `website`). Datos estructurados `SoftwareApplication` en vez de `CreativeWork`.
- **Formato nuevo `software`** ("Software" en los dos idiomas), con su filtro en el índice.
- **Cabecera**: formación nueva `grid` en `js/particles.js`, la rejilla de domo de la marca VEATION
  (anillos, radios, marcas del borde y el cenit), con una línea que la recorre como el cabezal de
  reproducción. Colores: grises, un ámbar escaso y el azul y violeta de Rito.
- **Portada**: VEATION ocupa el tercer lugar de la selección; su galaxia lleva las capturas y el ícono
  nuevo `editor`. Se borró `Asset/World/Neural Canvas/` (ya no se usaba). Neural Canvas sigue en el
  índice con su ficha.
- **Textos**: salen de lo que las notas de Veation dan por publicable (`Marketing/Redes/Instagram/TEXTOS.md`
  y la web veation.com) y, lo de Rito en CULTVR y FulldomeUK, de la propuesta al EIT
  (`EIT-2026/PROPUESTA.md`). **No se afirma** lo que esas notas piden no publicar todavía: 8K,
  Syphon, sistemas operativos, precio, fecha de salida, "el primer editor", NDI.

**No se usó, y por qué**: las fotos de CULTVR (`250808_CULTVR_*`, de Rhys Davies, sin confirmar) y
las `IMG_8224–8226` (CULTVR, gente reconocible, autor sin confirmar); la grabación de pantalla y la
captura de septiembre (`Record Edit Dome.MP4`, `Screenshot…`, y el `reel.mp4` de veation.com) porque
muestran el nombre viejo "Immersive Studio Pro"; `hongos domo.mp4` (autor y lugar sin confirmar);
`IMG_7929` (sala 360 de iPhone: no se sabe si la pieza se hizo en VEATION); `VEATION-10` (nombra NDI);
el tráiler de Barcelona XR Lab (voz y música de ElevenLabs, falta confirmar la licencia).
**Créditos**: sólo "Created by: Alma Digital Studio" / "Creación: Alma Digital Studio", sin nombres
(decisión de Vicente, el mismo día).
**Para confirmar entre los socios**: si se nombra Reel 360 para Barcelona XR Lab como obra hecha en
VEATION, y los colores de la cabecera.

**Verificado en Chrome**: la ficha en inglés de punta a punta (cabecera con la rejilla, resumen con el
enlace, teléfonos reproduciendo, galería con el historial, imagen a sangre, créditos), la galaxia de
VEATION en la portada con el ícono nuevo, la entrada a la obra desde la galaxia y el índice en español
filtrado por Software. Consola sin errores. En emulación 375×812: la ficha en español, sin desbordes.
Paquete: 47 páginas, 1.426 referencias locales, ninguna rota.
**Sin ver**: el movimiento continuo, teléfonos reales, Safari y Firefox.

### 2026-11-18 — Fotos nuevas en seis fichas, desde Alma Marketing y la descarga de Canva (Vicente)

Vicente pasó `Desktop/ALMA MARKETING/` y la carpeta `05_Biblioteca/web-canva-2026-11/` (lo que bajó de
Canva, ordenado por obra) y pidió elegir las mejores y de mejor calidad. Se leyó antes `_PERMISOS.md`.
Las fotos nuevas se llaman `web-N.webp` (1920×1080, q85, recorte centrado) y se sumaron a `photos`:

- **Neurocosm XR** (3 → 9): seis fotos de la instalación (`neurocosm/fotos/instalacion-experience`),
  sólo siluetas de espaldas frente a las proyecciones; a una se le recortó una marca de agua.
- **Soul Charger** (8 → 11): cinco capturas del recorrido en VR a 2560×1440 (`playthrough`); el orden se
  rehízo y salieron de la lista dos capturas más flojas (`2.webp`, `3.webp`, quedan en la carpeta).
- **Collective Pulse** (3 → 8): cinco pantallas de la app y de la proyección, sin personas.
- **Neurocosm Full Dome** (8 → 11): tres fotos de iPhone de la función en Plymouth (`IMG_1417`,
  `IMG_1472`, `IMG_3918`; sin autor en los metadatos, iPhone del equipo).
- **Panta Rhei** (3 → 9): seis renders de la sala de Sabda.
- **Pixel Líquido** (7 → 9): dos fotogramas del video de registro.
- Las galaxias de la portada se rehicieron (`tools/make_world_images.py`): Neurocosm XR y Collective
  Pulse ya no usan cuadros del reel.

**No se usó, y por qué** (según `_PERMISOS.md` y el `INDICE.md` de la descarga): las fotos de CULTVR
(© Rhys Davies, falta confirmar con él) y las de Plymouth en baja resolución (fotógrafo sin confirmar);
las de Fixiona (Alma Digital 360 y eSoul: autor sin confirmar); las de la EUIPO (Neural Canvas: personas
reconocibles y la propiedad de EIT); los stills verticales de "INSTALLATION REEL" (caras reconocibles);
lo de Pacha y Adidas Terrex (sin permiso); los conceptos hechos con IA de EIT; las fotos de LATAM (son de
Carlos Donoso: habría que darle crédito); lo que sólo está en video o en PDF (LPS, MICSUR, Mapping,
my2DROPS, Alma Digital Fest). Los 13 stills del render de Neurocosm XR que menciona el índice no están en
la carpeta descargada.
**Crédito del BID en Collective Pulse** (pedido por `_PERMISOS.md`, aprobado por Vicente el mismo día):
campo nuevo `creditLine` en `projects.json` (`Commissioned by the Inter-American Development Bank`), que
sale tal cual, en los dos idiomas, debajo del resumen de la ficha y en la ficha de vidrio de la portada.
Además `commissionedBy: "Inter-American Development Bank"` en los datos de la ficha. Sin logo del BID.
Cualquier obra que exija un crédito exacto puede usar `creditLine`.

**Verificado en Chrome**: la ficha de Neurocosm XR (galería y a sangre con las fotos nuevas), las
galaxias de Neurocosm XR y Collective Pulse, sin imágenes rotas ni errores. Paquete: 45 páginas, 1.487
referencias, ninguna rota.

### 2026-11-18 — Portada 3D: paradas en galaxia (prueba), fichas con más datos y pausa en cada obra (Vicente)

Tres pedidos de Vicente sobre el recorrido de la portada:

- **Probar una alternativa a las amebas** antes de cerrar la estética: cada obra como una galaxia de
  4–5 imágenes en movimiento con un ícono 3D (domo, casco de VR, sensor…). Hecha como **variante**,
  sin reemplazar a las amebas: se elige con `site.json → world.stops`, `?paradas=galaxia` o los botones
  de la barra de revisión. Ver "Paradas en galaxia". Script nuevo `tools/make_world_images.py`.
- **Más información en la ficha de cada obra**: obra propia o encargo, la primera oración de la
  descripción, la tecnología y dónde se presentó. Texto nuevo: `worldWhere`.
- **Que cueste más pasar a la siguiente obra**: pausa de la cámara en cada parada y un imán de scroll
  de proximidad. El recorrido es más largo (cada tramo, 1,3 pantallas en vez de 0,94).

**Verificado en Chrome**: las seis galaxias en capturas (ícono, imágenes, enjambre, ficha); la
transición líquida desde una galaxia, en cámara lenta, hasta la ficha; "atrás" vuelve al mismo punto
con la galaxia; el cambio Ameba / Galaxia desde la barra, en el mismo punto y sin acumular canvas;
el modo ameba en español con la ficha nueva; la pausa y el imán con la rueda (3 pasos desde una parada:
la cámara casi no se mueve; 5 pasos más: el scroll termina en la obra siguiente); que el imán se apaga al
salir de la portada. Consola sin errores. En emulación 375×812: galaxia arriba y ficha abajo, sin desbordes.
Paquete: 45 páginas, 1.437 referencias, ninguna rota, con las 30 imágenes nuevas.
**Sin ver**: el movimiento continuo (sólo cuadros sueltos), teléfonos reales (en la emulación el panel
frena la animación), Safari y Firefox (el imán de scroll se comporta distinto en cada navegador).
**Decidido después**: Vicente eligió la galaxia; `world.stops` pasó a `"galaxy"`. **Queda por ver**: si
el imán del scroll se siente bien o molesta.

### 2026-11-18 — Fichas de obra: fondo oscuro, galería dispersa y teléfono 3D (Vicente)

Vicente pidió volver a mirar la página de proyecto de Unseen y llevar más de ella a las fichas. Ver
"Ficha de obra: el recorrido de imágenes".

- **Fondo oscuro en todas las fichas**, como el interior del mundo 3D.
- **Cabecera viva en las 19 obras**: la portada se mueve y todas llevan partículas (antes, cuatro). Dos
  formaciones nuevas en `js/particles.js`: `dome` y `wave`. Los colores de las 15 obras nuevas salieron
  de sus portadas (borradores). `world.forms` se fundió en `particles`.
- **Galería dispersa** de imágenes chicas que se mueven a distinta velocidad, en vez del dúo y el trío.
- **Teléfono 3D** que gira con el scroll; con un solo video vertical, una foto al lado.
- **Movimiento al bajar**: un motor chico en `js/app.js` (`initMotion`) reemplaza a las animaciones CSS
  atadas al scroll; ahora también anda en Firefox.
- Campo nuevo `sidePhoto` en `projects.json`.

**Verificado en Chrome**: Soul Charger de punta a punta (8 fotos), Neural Canvas (3 fotos, con y sin
los huecos de revisión), Neurocosm Full Dome (dos teléfonos, galería con historial, cúpula de
partículas), Collective Pulse (portada clara bajo las partículas, visor de fotos) y Pacha Ibiza
(ondas); el paso de una ficha a la siguiente, del índice a una ficha y de vuelta a la portada, que
recupera el fondo claro. Consola sin errores propios. En emulación 375×812: cabecera, teléfono con la
foto al lado y galería en dos columnas, sin desbordes. Paquete: 45 páginas, 1.437 referencias, ninguna rota.
**Sin ver**: el movimiento continuo (sólo cuadros sueltos), teléfonos reales, Safari y Firefox, y las
otras 14 fichas una por una (comparten plantilla; revisé en una hoja de contactos cómo queda recortada
la foto del lado del teléfono en las 19).
**Para revisar**: los colores y formaciones de partículas de las 15 obras nuevas, y qué foto va al lado
del teléfono en cada una.

### 2026-11-18 — El mundo 3D pasa a ser la portada, con el reel flotando (Vicente)

Vicente vio el mundo ("funciona bastante bien todo") y pidió siete ajustes. Todos hechos:

- **El mundo 3D es la portada única** (`index.html`): se eliminó `inner-world.html` y el botón "Mundo 3D"
  de la barra de revisión. El landing de bloques quedó en reserva en el generador (`world.enabled: false`).
  La portada conserva título, descripción, Open Graph y datos estructurados, y ya no lleva `noindex`.
- **Reel flotante en reproducción automática** después de la ameba del estudio (era "el cambio principal").
  Ver "El reel flotante": versión liviana de 3,6 MB que se pide al llegar a su parada.
- **Paso a las obras**: un tramo propio con tres anillos de luz que se atraviesan y el título "Selected
  works / Obras seleccionadas" en el centro.
- **Amebas sin fotos**: arte con la paleta de cada obra. La transición líquida arranca con esos colores
  y la portada aparece adentro.
- **Entrada**: se quitó "Immersive wellness art studio" y va el logo debajo del título: el
  lockup `alma ◎ digital`, recortado de `Texto Logo 2.webp` (Vicente lo confirmó).
- **"Selected works" en vez de "19 works"**: en el cierre del recorrido y en el contador del índice de obras.
- **"Who we have worked with"** pasó a Studio, después del texto "about".

**Verificado en Chrome**: la entrada en los dos idiomas, las ocho paradas y el cierre en capturas; el
reel flotante reproduciéndose (y en pausa al alejarse), el clic que abre el reel completo con sonido y
Escape que lo cierra y reanuda el flotante; el paso con los anillos y el título; la transición líquida
en cámara lenta; entrar a una obra y "atrás" al mismo punto; el logo, que vuelve a la entrada; Studio
con las franjas; el contador del índice con y sin filtros; la página sin 3D. Consola sin errores. En
emulación 375×812: entrada, estudio, reel vertical, paso, una obra y cierre, sin desbordes. Paquete:
45 páginas, 1.437 referencias, ninguna rota.
**Sin ver**: el movimiento continuo (sólo cuadros sueltos), teléfonos reales, Safari y Firefox, y el
reel flotante en un iPhone (ahí la reproducción automática depende de `muted` + `playsinline`).
**Para decidir entre los socios**: el costo del reel automático (0,07 créditos por visita que llega) y
si el landing de bloques se borra del todo.

### 2026-11-18 — El mundo interior: ameba del estudio, amebas repartidas y fin del caché viejo (Vicente)

Vicente vio la ronda anterior con el texto del estudio suelto arriba, encima del menú, y las amebas
"igual que antes". Pidió sacar ese bloque: lo que quería era una ameba de Alma Digital antes de
Neurocosm XR, con la descripción del estudio, y después las amebas de las obras, que no estén en fila.

- **La causa de lo que vio**: Chrome tenía guardados el CSS y el JavaScript anteriores y los usó con el
  HTML nuevo. Se arregló de raíz: `tools/serve.py` (servidor local sin caché) y archivos con versión en
  la URL. Ver "Archivos con versión".
- **La parada del estudio** dejó de ser un texto y es una ameba más del recorrido, con el logo adentro y
  su ficha de vidrio (descripción + "Conocer el estudio"). Se quitó el bloque `.world__story`.
- **Amebas repartidas**: encuadre propio por parada en vez de una regla general (ver la sección del mundo).
- De paso: el permiso de View Transitions pasó también al `<head>`, y `.claude/launch.json` usa
  `tools/serve.py`.

**Verificado en Chrome** con los archivos recién versionados: la entrada (sólo título e invitación), la
ameba del estudio en inglés y español, las seis obras alternando lado, altura y tamaño, el cierre, las
flechas, clic en la ameba del estudio (abre Studio) y en la de una obra (transición líquida y ficha), y
"atrás" al mismo punto en los dos casos. Consola sin errores. En emulación 375×812: entrada y parada del
estudio sin desbordes. Paquete: 47 páginas, 1.545 referencias, ninguna rota.
**Sin ver**: el movimiento entre paradas más que en cuadros sueltos; teléfonos reales; Safari y Firefox.

### 2026-11-18 — El mundo interior: menos texto al entrar, una narrativa y más movimiento (Vicente)

Pedido de Vicente: que la primera pantalla tenga sólo el título; que al empezar el scroll haya una
pequeña narrativa antes de las obras, con la descripción del estudio como primera parada; más movimiento
de elevación y hacia los lados, con las amebas a distinta posición y altura; y al final otra fase con
las demás obras, el estudio y el contacto.

- La descripción y las credenciales salieron de la entrada y pasaron a una parada propia, adentro.
- Las obras alternan lado y altura; la cámara curva entre paradas y se ladea al correrse de costado.
  La ficha de cada obra va del lado contrario a su ameba.
- El cierre suma un texto y el botón "Conocer el estudio". Textos nuevos: `worldStoryLabel`,
  `worldEndLead`, `worldEndStudio` (borradores).
- La sección pasó de (obras + 2,2) a (obras + 3,2) pantallas. Las flechas y la invitación conocen la
  parada nueva.

**Verificado en Chrome**: los cuatro momentos en capturas, la alternancia de lado en tres obras, la
invitación y las flechas. En emulación 375×812: la entrada, sin desbordes.
**Pendiente de Vicente**: habló de 5 obras y el recorrido tiene las 6 destacadas; se le preguntó cuál sacar.
**Sin ver**: el movimiento en sí (curvas y ladeo) más que en cuadros sueltos; teléfonos reales.

### 2026-11-18 — Fotos nuevas en cuatro fichas, desde la biblioteca de marketing (Vicente)

Vicente pasó `Desktop/ALMA MARKETING/` para llenar los lugares de las fichas. Se usó sólo lo que
`05_Biblioteca/_PERMISOS.md` marca como propio y libre:

- **Soul Charger**: 5 capturas limpias del registro en VR (`soul-charger/fotos/registro-vr-2456`).
- **Neurocosm Full Dome**: 5 stills de los másters de cúpula (recorte del centro, sin esquinas negras) y
  un segundo video vertical de 20 s (`Neurocosm Fulldome UK Reel.mp4`, 972 KB, sin audio).
- **Neurocosm 360**: 5 stills 16:9 de los visuales.
- **Pixel Liquido**: 4 fotos de iPhone del estudio.

Esas cuatro fichas quedan con los 8 lugares llenos (Pixel Liquido, 7). Las otras 15 siguen con 3 fotos.

**No se usó, y por qué** (todo según `_PERMISOS.md`): los fotogramas de Latido Común y la foto de Neural
Canvas tienen pendiente el permiso de las personas que aparecen; las fotos de CULTVR son de Rhys Davies y
falta confirmar con él; las de "FOTOS JUANO" parecen de un fotógrafo sin crédito confirmado; las de
Concha y Toro (Live 360) y de ETM (Digital Prana) no dicen quién las hizo; los stills de la inauguración
de Neurocosm miden 960×540 y muestran invitados reconocibles; todo lo de Pacha.

**Avisos para los socios, que salen de esa misma nota y el sitio hoy no cumple**:
- **Pacha Ibiza**: la nota dice no mostrarlo ni nombrar al cliente hasta revisar el acuerdo con Gola
  Studio y el NDA. El sitio lo tiene como obra, entre las destacadas, en las credenciales del hero y en
  el mundo interior.
- **Collective Pulse**: exige el texto `Commissioned by the Inter-American Development Bank` en toda
  pieza. La ficha no lo lleva (`commissionedBy` está vacío).
- **Neural Canvas**: el contrato con EIT cede la propiedad de los entregables; la nota pide consultarlo
  antes de presentarlo como obra propia. El sitio lo lista como obra del estudio.
- **Adidas Terrex**: "consultar", sin permiso localizado.

**Canva**: hay acceso por el conector (se ven las carpetas), pero de las fotos subidas sólo entrega
miniaturas; a calidad completa sólo se pueden exportar diseños.

**Verificado en Chrome**: la ficha de Neurocosm Full Dome con los dos teléfonos reproduciendo, el dúo y
el trío llenos y sin huecos. Paquete: 178 archivos de `Asset/`, 1.539 referencias, ninguna rota.

### 2026-11-18 — Fichas de obra: recorrido de imágenes como en Unseen (Vicente)

Rama `rediseno-landing`. Vicente pidió usar la página de proyecto de Unseen como referencia para la
manera de desplegar la información y de hacer aparecer imágenes y videos: videos verticales como en un
teléfono, curvatura al aparecer, diagramación más creativa, y lugar para más imágenes que va a pasar.
Ver "Ficha de obra: el recorrido de imágenes".

- La ficha deja la tarjeta de ficha técnica + concepto + galería en grilla + reel suelto, y pasa a resumen
  grande con datos al lado y un recorrido de seis bloques.
- Lugares vacíos marcados sólo en revisión; el segundo teléfono queda libre (campo nuevo `verticals`).
- Entrada curva sólo con CSS. Las imágenes dobladas se abren más allá del borde: `.pj-flow` lleva
  `overflow-x: clip` para que no aparezca scroll horizontal.
- Se quitaron los estilos `.spec`, `.concept`, `.gal` y `.preel` (este último queda sólo como gancho del
  JS que carga el video cuando ya se ve). Texto nuevo: `pOverview`.

**Verificado en Chrome**: Collective Pulse (tres párrafos) y Neurocosm XR (uno, con historial al lado del
teléfono); cada bloque, los huecos en revisión y cómo queda sin ellos; teléfono y a sangre a mitad de la
entrada; el visor de fotos; sin scroll horizontal. En emulación 375×812: bloques apilados, sin desbordes.
Paquete de publicación sin enlaces rotos.
**Sin probar**: teléfonos reales, Safari, y Firefox (donde no hay entrada curva).

### 2026-11-17 — El mundo interior: enjambre por obra y luces que avanzan (Vicente)

Dos pedidos de Vicente: que las partículas tomen la forma de cada obra al detenerse, y elementos
sutiles que avancen con uno al hacer scroll, "como una pequeña luz o electricidad fluida" (en Mirages
son unas tiras de luz). Ver "Enjambre por obra" y "Luces que avanzan" en la sección del mundo.

- Seis formas, una por obra; dos son nuevas (`dome`, `wave`) y se configuran en `site.json → world.forms`.
- Hilos de luz (`THREE.LineSegments`) y dos luces guía con cola que tiembla.
- **Tropiezo**: la primera versión no se veía. Las partículas del enjambre tenían el tamaño del polvo y
  la forma se perdía entre las 4.600 de fondo; se confirmó agrandándolas en vivo. Quedaron casi el doble
  de grandes y más brillantes cuando están formadas.

**Verificado en Chrome**: las seis formas armadas (capturas ampliadas), y los hilos y una luz guía en
pleno avance. Sin errores de consola. Paquete: 47 páginas, 1.497 referencias, ninguna rota.
**Sin ver**: todo esto en pantalla vertical (la emulación de teléfono frena la animación) y en teléfonos
reales; el movimiento en sí (sólo cuadros sueltos).

### 2026-11-17 — El mundo interior: transición líquida al entrar a una obra (Vicente)

Antes la ameba crecía y había un fundido. Ahora se derrama (ver "Entrar a una obra" en la sección del
mundo). Primera versión mezclaba dos imágenes y a mitad de camino se veía doble; quedó con un solo
muestreo cuyo encuadre va cambiando.

**Verificado en Chrome** en cámara lenta (se frenó el reloj de la página para capturar los cuadros): el
derrame desde la ameba, la pantalla cubierta, el asentamiento en el encuadre de la cabecera, y la ficha
abierta sin recarga. A velocidad normal: entra con el botón y con un clic en la ameba, suena la
transición, y "atrás" devuelve el mundo al mismo punto. **Sin ver**: el derrame en pantalla vertical (la
emulación de teléfono frena la animación) y en teléfonos reales.

### 2026-11-17 — El mundo interior: más identidad y más respuesta (Vicente)

Vicente vio la prueba ("funciona bastante bien") y pidió seguir mejorándola como mundo aparte, antes de
decidir si sirve de landing: más detalle (partículas, patrones líquidos), la presentación del estudio en
la entrada con "Entra al mundo interior" a la derecha sobre la ameba, y más interactividad.

- **Entrada**: la presentación del hero del landing a la izquierda; la invitación arriba de la ameba, a la
  derecha, como botón que lleva a la primera obra. Se quitaron los textos `worldEyebrow` y `worldLead`.
- **Patrón líquido**: el fluido del sitio teñido de violeta con una capa en modo multiplicar. El fondo del
  fluido es celeste, así que el tinte lleva más rojo para que dé violeta y no azul.
- **Partículas**: de 1.100 a 4.600 en escritorio (1.600 en táctil), con color, deriva, titilar y tres
  corrientes en hélice. Más amebas chicas de fondo. Película iridiscente en las amebas.
- **Interactividad**: ver "Lo que responde" en la sección del mundo.

**Verificado en Chrome**: la entrada en los dos idiomas, el fondo teñido y las partículas (capturas), la
invitación, las flechas, el cursor sobre una ameba y el clic en el vacío. En emulación 375×812 la entrada
entra en una pantalla, sin desbordes. **Sin probar**: teléfonos reales, Safari y Firefox; el costo de la
capa en modo multiplicar sobre el fluido en equipos lentos.

**Ideas para seguir** (no construidas): que el fluido reciba un empujón al llegar a cada obra (hay que
abrir `js/fluid.js`); agua que refleje; transición líquida al entrar a la obra; que las partículas
formen el nombre o un símbolo de cada obra al detenerse; arrastrar para mirar alrededor; que la música
cambie de capa por obra.

### 2026-11-17 — Prueba: el mundo interior en 3D (Vicente)

Rama `rediseno-landing`. Vicente trajo [mirages.nrly.fun](https://mirages.nrly.fun/) y pidió probar "un
entorno 3D simple de amebas por el que avanzamos, como entrando al mundo interior de Alma Digital",
además del listado estándar. Ver la sección "El mundo interior".

- **Análisis de Mirages**: un solo HTML con unos 75 KB de código propio, Three.js r180 con WebGPU, scroll
  secuestrado con la rueda, esferas de vidrio con la obra adentro y agua que las refleja; unos 2,2 MB.
- **Lo que se construyó**: `inner-world.html` en los dos idiomas, `js/world.js`, estilos `.world*`,
  `initWorld()` en `js/app.js` y la nota `chime()` en `js/sound.js`.
- **Tres diferencias a propósito con Mirages**: scroll real, WebGL en vez de WebGPU, y el listado de
  obras sigue existiendo.
- Quedó **sin construir** la inmersión por scroll dentro del landing que Vicente había pedido antes (una
  línea de agua al llegar al segundo bloque): este recorrido cubre el mismo momento.

**Verificado en Chrome**: el recorrido completo (puerta, seis obras, final) en inglés y español; el
salto con los puntos; entrar a una obra con el botón y con un clic en la ameba; volver con "atrás" al
mismo punto, sin recarga y sin zambullida; que el sonido recibe la zambullida y una nota por obra; el
respaldo en lista. En emulación 375×812: composición de teléfono, sin desbordes. Paquete: 47 páginas,
1.495 referencias, ninguna rota.
**Sin probar**: teléfonos reales (con el fluido de fondo son dos animaciones WebGL a la vez; el fluido
no se puede pausar sin abrir ese módulo), Safari y Firefox, y la fluidez real: en la ventana de prueba
Chrome dibujaba a 31 cuadros por segundo tanto en el landing como en el mundo, así que no se pudo medir
cuánto margen queda.

**Ideas que quedaron afuera**: agua que refleje las amebas, una transición líquida al entrar a la obra
(hoy la ameba crece y hay un fundido), amebas más ricas hechas por un artista 3D en vez de por código.

### 2026-11-17 — Sonido: sólo la música, sin ruido (Vicente)

Vicente escuchó la primera versión: el sonido iba bien pero se oía un ruido blanco muy fuerte. Se
quitaron de `js/sound.js` la capa de aire de superficie, el rumor grave y el chapuzón de ruido. Quedan la
música, el filtro por profundidad y dos sonidos de transición hechos sólo con tonos suaves, afinados a
"Breath" (si bemol). Medido en Chrome: sobre 2 kHz ya no hay nada más que la música (de −53 a −104 dB);
el tono de transición sube unos 8 dB la banda de 150 a 500 Hz durante un segundo y se apaga.
**Falta que Vicente lo escuche de nuevo.**

### 2026-11-17 — Inmersión: sonido de ambiente y zambullida (Vicente)

Rama `rediseno-landing`. Referencia: [unseen.co](https://unseen.co/). Música que pasó Vicente:
"Breath" (Soul Charger VR).

- **`js/sound.js`**: música de ambiente con Web Audio, apagada por defecto, con botón en el menú (cuatro
  barras que se mueven mientras suena; en pantallas chicas queda sólo el icono). Filtro "bajo el agua"
  según la profundidad de la página, rumor de fondo, chapuzón y burbujas sintetizados, capa de aire de
  superficie. Ver la sección "Sonido e inmersión".
- **La música**: "Breath" dura 5:36 pero es un bucle de 168 s repetido dos veces, idéntico muestra a
  muestra. Se recortó ese tramo (de 0:30 a 3:18) y se comprimió a AAC 96 kbps: de 89 MB a 1,8 MB.
- **Zambullida** al entrar y salir de una obra (`water()` en `js/app.js`).
- **Menú en teléfonos**: con el botón nuevo, el menú en español no entraba a 360 px de ancho. Se apretó
  en dos cortes (400 y 340 px).

**Verificado en Chrome** midiendo la salida de audio (no se puede escuchar desde acá): la música se
descarga sólo al encender; bajo el agua la banda de 2 a 8 kHz cae de −53 a −129 dB y vuelve al salir;
el reel con sonido calla la música y al cerrarlo regresa; apagar suspende el audio; la elección sobrevive
a una recarga y arranca con el primer clic. La zambullida se midió cuadro a cuadro (sube en 0,5 s, cambia
la página, se aclara en 0,6 s; no queda ninguna capa colgada) y se miró en capturas. Navegación sin
recarga en todas las combinaciones. Menú medido a 320, 360 y 375 px. Paquete: 45 páginas, 1.421
referencias, ninguna rota, con la música incluida.
**Sin probar**: cómo suena de verdad (volúmenes del aire, del chapuzón y del rumor: ajustables en
`js/sound.js`), teléfonos reales (en iPhone el audio pasa por Web Audio y hay que confirmar que suena),
Safari y Firefox.

**Para decidir**: "Breath" es casi toda grave y en parlantes chicos apenas se oye. Opciones: otra
pista con medios y agudos, una mezcla de "Breath" con las capas medias más arriba, o realzar los medios
en el navegador (cambia cómo suena la obra: preguntar antes).

### 2026-11-17 — Partículas en la cabecera de las obras principales (Vicente)

Rama `rediseno-landing`. Referencia de Vicente: [flow.nrly.fun](https://flow.nrly.fun/).

- **`js/particles.js`** (módulo ES, Three.js 0.187.0 desde jsDelivr): 13.000 puntos en escritorio y
  5.200 en táctil, con cuatro formaciones: `attractor` (madeja caótica, Neurocosm XR), `pulse`
  (organismos que laten, Collective Pulse), `halo` (anillos que respiran cada 6 s, Soul Charger) y
  `strokes` (trazos que fluyen, Neural Canvas). Arrastrar lo gira con inercia, el cursor aparta las
  partículas y un clic lo dispersa. Se pausa fuera de pantalla y con la pestaña oculta; con "reducir
  movimiento" dibuja un cuadro quieto.
- **Carga sólo donde hace falta**: `js/app.js` lo pide con `import()` en las fichas que traen
  `data-particles`. El resto del sitio no descarga Three.js. Si el CDN o WebGL fallan, queda la foto.
- **Se desmonta al navegar** (`life.cleanups`): libera el contexto WebGL y quita su canvas.
- Se usa el paquete `+esm` de jsDelivr (un archivo, 156 KB). El `build/three.module.min.js` del
  paquete importa el núcleo sin minificar y suma 285 KB: no usarlo.
- La indicación bajo el título cambia de texto según el equipo (mouse o dedo). En pantallas angostas
  las líneas bajo el título ya no pasan por detrás de la ameba.

**Verificado**: en Chrome, las cuatro formaciones, arrastre y clic; navegación sin recarga de ida y
vuelta (el canvas aparece y desaparece, Three.js se descarga una sola vez). En emulación 375×812, sin
desbordes y con el texto para táctil. Paquete de publicación: 45 páginas, 1.377 referencias, ninguna rota.
**Sin probar**: teléfonos reales (en una ficha con partículas hay tres canvas WebGL a la vez: fluido,
ameba y partículas), Safari y Firefox.

**Idea siguiente** (referencia: [unseen.co](https://unseen.co/)): inmersión con sonido. Música de
ambiente que sigue sonando al cambiar de página y un efecto de "sumergirse" (imagen y sonido) al entrar
a una obra. Vicente puede pasar la música.

### 2026-11-17 — Navegación continua y landing como recorrido (Vicente)

Rama `rediseno-landing`. Referencia que trajo Vicente: [unseen.co](https://unseen.co/), donde todo el
sitio es un mismo lugar 3D y nunca hay un corte entre páginas. Se tomó la idea, no la técnica: el
"lugar" de Alma son el fluido y la ameba.

- **Navegación continua** (ver la sección de arriba): las páginas cambian sin recargar; el fluido sigue
  corriendo y la ameba viaja. `js/app.js` reescrito en código global + código de página.
- **Ameba persistente** (`js/ameba.js`): sale de `<main>` y se posa en un `[data-ameba-slot]` por
  página o por bloque. Se desliza al nuevo lugar cuando cambia.
- **Landing como recorrido**: de cinco a siete bloques. Nuevos: manifiesto, "lo que hacemos" y
  credenciales en movimiento (con botón de pausa; quietas con "reducir movimiento"). Las obras
  destacadas pasan a un mosaico grande y alternado.
- **Tarjetas que se inclinan** hacia el cursor (sólo con mouse).
- **Títulos a dos voces** dentro de Raleway. **Contacto con dos caminos**, que mandan su asunto.
- El índice de obras acepta `?format=` y `?line=` para llegar filtrado.

**No se copió de Unseen**: la portada de entrada (aparece en cada carga directa), el scroll controlado
por el sitio y el mundo 3D modelado (1,6 MB de JavaScript contra unos 105 KB de este sitio).

**Verificado**: en Chrome, la navegación sin recarga (ida, atrás, cambio de idioma), el viaje de la
ameba entre bloques y páginas, filtros por URL, formulario con `fetch` simulado, galería y reel después
de navegar, y que no se acumulan nodos tras varias navegaciones. En emulación 375×812, medidas sin
desbordes. Paquete de publicación: 45 páginas, 1.377 referencias locales, ninguna rota.
**Sin probar**: teléfonos reales, Safari y Firefox, y un envío real del formulario.

**Idea siguiente** (referencia de Vicente: [flow.nrly.fun](https://flow.nrly.fun/), partículas en
Three.js que toman distintas formaciones y reaccionan al arrastre): usar un sistema así en la cabecera
de las obras principales o en el landing. Es el caso donde Three.js sí se justifica.

### 2026-11-17 — Interactividad: respirar con la ameba, arrastrarla, tarjetas vivas (Vicente)

Rama `rediseno-landing`. Tres mejoras, sin material nuevo:

> **"Respira con ella" quedó apagada** el mismo día a pedido de Vicente (`site.json → breathing: false`):
> el botón no se genera. El código sigue en `js/ameba.js`; con `breathing: true` y un build vuelve.

- **Respira con ella** (`js/ameba.js` + bloque `.breath` del hero): botón bajo la ameba que inicia un
  minuto guiado, seis ciclos de 4 s de inhalación y 6 s de exhalación. La ameba crece y se recoge
  marcando el ritmo, con la indicación "Inhala / Exhala" y el número de ciclo. No pide micrófono ni
  cámara. Se detiene si la pestaña queda oculta. El botón sólo aparece si WebGL arrancó. La
  indicación cambia de texto pero no se mueve (regla de marca: la tipografía no se anima).
- **Ameba que se toca**: se arrastra para girarla, con inercia, y se aplasta un poco mientras se la
  presiona. Un toque sin arrastre sigue cambiando la forma. En táctil el canvas tiene
  `touch-action: pan-y`: el scroll vertical pasa de largo y el arrastre horizontal la gira.
- **Tarjetas de obras destacadas**: el reel se reproduce dentro de la tarjeta al dejar el cursor
  encima 0,3 s (sólo con mouse; un cursor de paso no descarga nada).
- **Transición entre páginas** (`css/site.css`, View Transitions entre documentos): fundido al navegar
  y la portada de la obra se convierte en la cabecera de su ficha. La imagen de origen recibe el nombre
  `work-cover` al hacer clic (`js/app.js`); en la ficha lo tiene `.phero__bg`. Lo soportan Chrome y
  Safari; en el resto no hay animación. Desactivada con "reducir movimiento".

**Verificado en local**: el ciclo de respiración (textos y conteo), el arranque y la pausa del reel en
las tarjetas, y que la transición se dispara con el nombre puesto y no deja restos al volver atrás.
**Sin ver**: la animación de la transición en sí (las capturas no la registran) y el arrastre con el
dedo en un teléfono real.

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
