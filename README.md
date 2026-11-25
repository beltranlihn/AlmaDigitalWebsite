# Alma Digital Studio — sitio web

Código de [almadigitalstudio.com](https://almadigitalstudio.com). HTML, CSS y JS puros, sin
framework. Las páginas se generan desde archivos de datos con un script de Node y se guardan
ya generadas en el repo: landing, índice de obras, una ficha por obra y Studio, en inglés y
en español (`/es/`).

Todo el contexto técnico —decisiones tomadas, módulos que no se tocan, convenciones de
assets, cómo se publica— está en [`CLAUDE.md`](CLAUDE.md). Claude Code lo lee solo al
abrir el proyecto.

## Ver la web en tu computadora

```bash
python3 -m http.server 5599
```

y abrir <http://localhost:5599>. En Windows el comando es `python` en vez de `python3`.

## Cambiar un texto, una obra o el diseño

Se edita la **fuente**, nunca los `.html` generados (se pisan):

| Qué | Dónde |
|---|---|
| Titular del hero, textos de interfaz, clientes, obras destacadas | `src/site.json` |
| Una obra (textos, créditos, sedes, fotos) | `src/projects.json` y `src/i18n/projects.es.json` |
| Equipo, spin-offs, texto "about" | `src/i18n/studio.json` |
| Cómo se arma cada página | `src/build.mjs` |
| Colores, tipografía, layout | `css/site.css` |

Después se regenera y se prueba:

```bash
node src/build.mjs
```

Se commitean juntos la fuente y el HTML generado.

## Cómo publicar un cambio

Netlify publica solo lo que llega a la rama `main`. **Cada publicación cuesta 15
créditos** de un plan de 1.000 por mes, así que:

1. Trabajá en una rama propia: `git switch -c nombre-del-cambio`.
2. Subila y abrí un pull request en GitHub.
3. Netlify comenta en el pull request una **URL de vista previa**. Es gratis: probá ahí
   todo lo que quieras.
4. Cuando está bien, merge a `main` → se publica en almadigitalstudio.com.

Juntá varios arreglos en un mismo pull request en vez de publicar uno por uno.

## Antes de empezar a trabajar

```bash
git pull
```

## Qué hay en el repo

| | |
|---|---|
| `src/` | Fuente del sitio: generador y datos. No se publica. |
| `index.html`, `studio.html`, `work/`, `es/`, `sitemap.xml` | Generados por `src/build.mjs`. No editar a mano. |
| `soul-charger.html` | Página dedicada a Soul Charger, hecha a mano. |
| `css/`, `js/` | Estilos y scripts. `js/fluid.js` y `js/cursor.js` son módulos cerrados. |
| `Asset/` | Imágenes, videos y fuentes. También archivos de trabajo (`.docx`, `.ai`) que **no** se publican. |
| `_masters/` | Originales sin comprimir de lo que se recomprimió. No se publica. |
| `tools/deploy_copy.py` | Decide qué se publica: sólo lo que las páginas usan. Lo corre Netlify. |
| `tools/make_share_images.py` | Genera las imágenes 1200×630 que se ven al compartir un link. |
| `netlify.toml` | Le dice a Netlify que corra `deploy_copy.py`. |
| `robots.txt` | Bloquea bots y scrapers. |
| `prototype/` | Prototipo del que salió la estructura actual. No se publica. |
