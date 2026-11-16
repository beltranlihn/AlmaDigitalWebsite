# Prototipo — catálogo

Prueba de la propuesta: landing + índice filtrable + una página por obra,
generadas desde un archivo de datos. **No toca `index.html` ni
`soul-charger.html`.** El sitio en producción sigue exactamente igual.

Tres niveles, como en la propuesta:

| | |
|---|---|
| `index.html` | **Landing.** La ameba a pantalla completa, el reel del estudio, adelanto de obras. |
| `obras.html` | El índice de las 19, filtrable. |
| `work/<obra>.html` | La página de cada obra. |

## Ver

```bash
python -m http.server 5599
```

Después abrir <http://localhost:5599/prototype/index.html>.
Tiene que servirse desde la raíz del proyecto, porque las páginas leen los
assets de `Asset/` que están un nivel más arriba.

## Regenerar

```bash
node prototype/build.mjs
```

Lee `projects.json` y reescribe `index.html` y las 19 páginas de `work/`.
Sin framework y sin bundler: la salida es HTML estático, igual de desplegable
que el sitio actual.

Para volver a derivar las paletas (si cambian las portadas):

```bash
node prototype/palettes.mjs
```

## Archivos

| | |
|---|---|
| `projects.json` | **La fuente de verdad.** Los 19 proyectos: textos, créditos, sedes, tecnología, paleta. |
| `build.mjs` | Genera el índice y las páginas. ~200 líneas. |
| `palettes.mjs` | Saca la paleta de cada obra de su portada, con `sharp`. |
| `fluid.js` | La simulación de `index.html`, extraída. Único cambio: `AlmaFluid.setPalette()`. |
| `style.css`, `app.js` | Estilos e interacción. |
| `index.html`, `obras.html`, `work/*.html` | **Generados. No editar a mano** — se pisan en el próximo build. |

## Qué falta, y por qué

- **`year` está vacío en los 19.** Es el único dato que no podía completar sin
  inventarlo. Está en `projects.json` esperando; la ficha técnica omite la fila
  mientras esté vacío.
- **`press` está vacío.** Ídem.
- **3 fotos por obra**, que es lo que hay hoy. La galería está pensada para 12–20.
- **Los reels son los de 406×720**, hechos para thumbnail. En la página de
  proyecto se ven blandos. Hay que reexportar desde los másters.
- **Los textos son los recortados a ~330 caracteres**, salvo Neural Canvas y
  Collective Pulse, que llevan el texto completo que mandó el estudio. La
  diferencia entre esas dos páginas y el resto es exactamente lo que se gana.

## Decisiones que conviene revisar

- **`formatKey`** (el filtro de formato) es un campo explícito por obra, no algo
  derivado de la etiqueta visible. "Neurocosm 360" es 360° y VR a la vez, y
  adivinarlo por regex daba resultados arbitrarios. Está en `projects.json`.
- **La paleta lleva un ancla oscura con triple peso**, igual que la paleta
  oficial repite `#3530a0` tres veces. Sin eso, una obra de pasteles como
  Collective Pulse aclara el fondo entero y el texto blanco deja de leerse.
- **Hay un velo (`.scrim`) entre el fluido y el contenido.** El sitio actual pone
  blanco directo sobre el fluido y se lee al límite; con páginas llenas de texto
  no alcanzaba.
- **El reel arranca con `autoplay` y el IntersectionObserver sólo lo pausa**
  cuando sale de vista. Al revés (que el observer sea quien arranca) basta con
  que el observer no dispare para que el reel quede congelado en el póster.
- **`LDR_LLL1_0.png` da 404**, acá y en producción. Es la textura de dithering
  del fluido; falta desde siempre y la simulación sigue igual. Vale la pena
  agregarla o sacar la referencia.
