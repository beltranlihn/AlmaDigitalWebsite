"""Arma la carpeta que se sube a Netlify.

Publica sólo lo que la web usa: las páginas, gsap, robots.txt y los archivos de
Asset/ que alguna página referencia. Todo lo demás —archivos de trabajo (.docx,
.ai), originales en PNG, _masters/, prototype/, CLAUDE.md— queda fuera sin tener
que acordarse de excluirlo.

Netlify lo corre solo en cada deploy (ver netlify.toml): arma dist/ y publica eso.
A mano, desde la raíz del proyecto:
    python tools/deploy_copy.py dist

Cada deploy de producción cuesta 15 créditos: juntar los cambios en uno solo.
"""
import os
import shutil
import stat
import sys
import urllib.parse

PAGES = ['index.html', 'soul-charger.html']
ROOT_FILES = PAGES + ['gsap.min.js', 'robots.txt']


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

    html = ''
    for p in PAGES:
        with open(p, encoding='utf-8-sig') as f:
            html += f.read()
    html_dec = urllib.parse.unquote(html)

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

    for f in ROOT_FILES:
        shutil.copy2(f, os.path.join(dest, f))

    used = skipped = 0
    used_bytes = skipped_bytes = 0
    for root, _, files in os.walk('Asset'):
        for name in files:
            path = os.path.join(root, name).replace(os.sep, '/')
            size = os.path.getsize(path)
            if path in html or path in html_dec:
                out = os.path.join(dest, path)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                shutil.copy2(path, out)
                used += 1
                used_bytes += size
            else:
                skipped += 1
                skipped_bytes += size

    mb = 1024 * 1024
    print(f'copia en: {dest}')
    print(f'  publicados:   {len(ROOT_FILES)} archivos raíz + {used} de Asset/ ({used_bytes / mb:.1f} MB)')
    print(f'  no publicados: {skipped} de Asset/ sin referencia ({skipped_bytes / mb:.1f} MB)')


if __name__ == '__main__':
    main()
