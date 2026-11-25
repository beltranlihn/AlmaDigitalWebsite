"""Arma la carpeta que se sube a Netlify.

Publica sólo lo que la web usa: las páginas, css/, js/, robots.txt, sitemap.xml y
los archivos de Asset/ que alguna página (o su CSS/JS) referencia. Todo lo demás
—fuentes del generador (src/), archivos de trabajo (.docx, .ai), originales en
PNG, _masters/, prototype/, CLAUDE.md— queda fuera sin tener que acordarse de
excluirlo.

Netlify lo corre solo en cada deploy (ver netlify.toml): arma dist/ y publica eso.
A mano, desde la raíz del proyecto:
    python tools/deploy_copy.py dist

Las páginas las genera src/build.mjs y se commitean ya generadas: este script no
las arma, sólo las copia.

Cada deploy de producción cuesta 15 créditos: juntar los cambios en uno solo.
"""
import os
import shutil
import stat
import sys
import urllib.parse

# Carpetas donde hay páginas (.html). '.' = raíz: index, studio, soul-charger.
PAGE_DIRS = ['.', 'work', 'es', 'es/work']
# Carpetas de código que se publican enteras.
STATIC_DIRS = ['css', 'js']
# Archivos sueltos de la raíz. gsap sólo se copia si alguna página lo usa.
ROOT_FILES = ['robots.txt', 'sitemap.xml']
ROOT_IF_USED = ['gsap.min.js']


def find_pages():
    pages = []
    for d in PAGE_DIRS:
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if name.endswith('.html'):
                pages.append(os.path.normpath(os.path.join(d, name)).replace(os.sep, '/'))
    return pages


def find_static():
    files = []
    for d in STATIC_DIRS:
        for root, _, names in os.walk(d):
            for name in sorted(names):
                files.append(os.path.join(root, name).replace(os.sep, '/'))
    return files


def read(path):
    with open(path, encoding='utf-8-sig') as f:
        return f.read()


def copy(path, dest):
    out = os.path.join(dest, path)
    os.makedirs(os.path.dirname(out) or dest, exist_ok=True)
    shutil.copy2(path, out)


def main():
    if len(sys.argv) != 2:
        sys.exit('uso: python tools/deploy_copy.py <carpeta-destino>')
    dest = os.path.abspath(sys.argv[1])
    proj = os.path.abspath('.')
    # El destino se borra y se rehace. Dentro del proyecto sólo se permite dist/
    # (ignorada por git): cualquier otra carpeta podría ser código o assets.
    inside = dest == proj or dest.startswith(proj + os.sep)
    if inside and os.path.relpath(dest, proj) != 'dist':
        sys.exit('el destino tiene que ser dist/ o una carpeta fuera del proyecto')

    pages = find_pages()
    static = find_static()
    if 'index.html' not in pages:
        sys.exit('falta index.html: correr primero  node src/build.mjs')

    # Texto donde se buscan las referencias a Asset/: páginas + CSS + JS.
    text = ''.join(read(p) for p in pages) + ''.join(
        read(p) for p in static if p.endswith(('.css', '.js')))
    text_dec = urllib.parse.unquote(text)

    if os.path.exists(dest):
        # Windows deja algunos archivos copiados como sólo lectura: quitarlo y reintentar.
        def force(func, path, *_):
            os.chmod(path, stat.S_IWRITE)
            func(path)
        if sys.version_info >= (3, 12):
            shutil.rmtree(dest, onexc=force)
        else:
            shutil.rmtree(dest, onerror=force)
    os.makedirs(dest)

    root_files = [f for f in ROOT_FILES if os.path.exists(f)]
    root_files += [f for f in ROOT_IF_USED if os.path.exists(f) and f in text]
    for f in pages + static + root_files:
        copy(f, dest)

    used = skipped = 0
    used_bytes = skipped_bytes = 0
    for root, _, files in os.walk('Asset'):
        for name in files:
            path = os.path.join(root, name).replace(os.sep, '/')
            size = os.path.getsize(path)
            if path in text or path in text_dec:
                copy(path, dest)
                used += 1
                used_bytes += size
            else:
                skipped += 1
                skipped_bytes += size

    mb = 1024 * 1024
    print(f'copia en: {dest}')
    print(f'  publicados:   {len(pages)} páginas + {len(static)} de css/js + {len(root_files)} de raíz'
          f' + {used} de Asset/ ({used_bytes / mb:.1f} MB)')
    print(f'  no publicados: {skipped} de Asset/ sin referencia ({skipped_bytes / mb:.1f} MB)')


if __name__ == '__main__':
    main()
