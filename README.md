# Alma Digital Studio — sitio web

Código de [almadigitalstudio.com](https://almadigitalstudio.com). HTML, CSS y JS puros,
sin framework ni build: `index.html` (home) y `soul-charger.html` (página de Soul Charger).

Todo el contexto técnico —decisiones tomadas, módulos que no se tocan, convenciones de
assets, cómo se publica— está en [`CLAUDE.md`](CLAUDE.md). Claude Code lo lee solo al
abrir el proyecto.

## Ver la web en tu computadora

```bash
python -m http.server 5599
```

y abrir <http://localhost:5599>. Con Claude Code en la app de escritorio, el preview
ya está configurado en `.claude/launch.json`.

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

Casi todo el sitio vive en un solo archivo (`index.html`, ~4.800 líneas). Si los dos
lo editan a la vez, avisense qué parte toca cada uno.

## Qué hay en el repo

| | |
|---|---|
| `index.html`, `soul-charger.html` | Las dos páginas. |
| `Asset/` | Imágenes, videos y fuentes. También archivos de trabajo (`.docx`, `.ai`) que **no** se publican. |
| `_masters/` | Originales sin comprimir de lo que se recomprimió. No se publica. |
| `tools/deploy_copy.py` | Decide qué se publica: sólo lo que las páginas usan. |
| `netlify.toml` | Le dice a Netlify que corra ese script. |
| `robots.txt` | Bloquea bots y scrapers. |
| `prototype/` | Prototipo de rediseño descartado. Su `projects.json` tiene los datos de los 19 proyectos ordenados. No se publica. |
