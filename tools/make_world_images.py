#!/usr/bin/env python3
"""Imágenes livianas para las galaxias del mundo interior (la portada).

    python3 tools/make_world_images.py

En la portada 3D, cada obra seleccionada puede ser una "galaxia": 4 o 5
imágenes que orbitan alrededor de un ícono 3D. No se usan las fotos originales
(1920×1080, 100–300 KB cada una) sino copias chicas hechas acá:

  · las fotos de la obra: las que elige projects.json → galaxyPhotos, si está, o si no
    la portada y las siguientes de photos sin las que exigen crédito (photoCredits).
    Las apaisadas se recortan a 16:9 (768×432) y las verticales a 9:16 (360×640). Las
    que tienen crédito lo llevan en src/world-images.json, y la ficha de vidrio de la
    obra lo muestra ("Fotos");
  · si la obra tiene menos de 5 fotos, se completan con cuadros sacados de su
    reel vertical (projects.json → video), a 360×640. Hace falta ffmpeg.

Escribe Asset/World/<obra>/ y la lista en src/world-images.json, que lee
src/build.mjs. Volver a correrlo cuando cambien las fotos de una obra
seleccionada (site.json → world.works, o featured si está vacío) o spin-off
(world.spinoffs), y después
`node src/build.mjs`.

Requiere Pillow. No se publica (tools/deploy_copy.py sólo copia lo que la web usa).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)

WANT = 5                       # imágenes por galaxia
H_SIZE = (768, 432)            # fotos, apaisadas
V_SIZE = (360, 640)            # cuadros del reel, verticales
QUALITY = 78
STILLS_AT = (0.28, 0.55, 0.8)  # en qué parte del reel se toman los cuadros


def fit(im, size):
    """Recorta al centro con el aspecto pedido y escala."""
    w, h = im.size
    tw, th = size
    if w / h > tw / th:
        nw = round(h * tw / th)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * th / tw)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize(size, Image.LANCZOS)


def duration(video):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=nw=1:nk=1', video], capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def stills(video, count, tmp):
    """Cuadros del reel, como imágenes de Pillow."""
    if not shutil.which('ffmpeg') or not os.path.exists(video):
        return []
    d = duration(video)
    if d <= 0:
        return []
    frames = []
    for k, at in enumerate(STILLS_AT[:count]):
        dst = os.path.join(tmp, f'f{k}.png')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{d * at:.2f}', '-i', video,
                        '-frames:v', '1', dst], check=False)
        if os.path.exists(dst):
            frames.append(Image.open(dst).convert('RGB'))
    return frames


def main():
    site = json.load(open('src/site.json', encoding='utf-8'))
    projects = {p['slug']: p for p in json.load(open('src/projects.json', encoding='utf-8'))['projects']}
    slugs = (site.get('world') or {}).get('works') or site['featured']
    slugs = slugs + [s for s in (site.get('world') or {}).get('spinoffs', []) if s not in slugs]   # y los spin-offs del recorrido
    out = {}
    for slug in slugs:
        p = projects[slug]
        folder = os.path.join('Asset', 'World', p['title'])
        os.makedirs(folder, exist_ok=True)
        for f in os.listdir(folder):               # sólo lo que este script escribió antes
            if f.endswith('.webp'):
                os.remove(os.path.join(folder, f))
        # galaxyPhotos elige; si no, la portada y las fotos sin crédito obligatorio.
        credited = p.get('photoCredits') or {}
        photos = p.get('galaxyPhotos') or [p['cover']] + [x for x in p['photos'] if x != p['cover'] and x not in credited]
        items = []
        for k, src in enumerate(photos[:WANT]):
            dst = os.path.join(folder, f'{k + 1}.webp')
            im = Image.open(src).convert('RGB')
            size = V_SIZE if im.height > im.width else H_SIZE
            fit(im, size).save(dst, 'WEBP', quality=QUALITY, method=6)
            item = {'src': dst.replace(os.sep, '/'), 'w': size[0], 'h': size[1]}
            if src in credited:
                item['credit'] = credited[src]
            items.append(item)
        missing = WANT - len(items)
        if missing > 0 and p.get('video'):
            with tempfile.TemporaryDirectory() as tmp:
                for k, im in enumerate(stills(p['video'], missing, tmp)):
                    dst = os.path.join(folder, f'reel-{k + 1}.webp')
                    fit(im, V_SIZE).save(dst, 'WEBP', quality=QUALITY, method=6)
                    items.append({'src': dst.replace(os.sep, '/'), 'w': V_SIZE[0], 'h': V_SIZE[1]})
        out[slug] = items
        kb = sum(os.path.getsize(i['src']) for i in items) / 1024
        print(f'{slug}: {len(items)} imágenes, {kb:.0f} KB')
    with open('src/world-images.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('lista en src/world-images.json')


if __name__ == '__main__':
    sys.exit(main())
