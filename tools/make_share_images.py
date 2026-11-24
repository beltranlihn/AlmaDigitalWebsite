"""Arma las imágenes que se ven al compartir un link (WhatsApp, LinkedIn, X).

Las redes piden 1200×630 en JPG o PNG; con una imagen cuadrada o WebP la vista
previa sale recortada o no sale. Este script genera:

  Asset/Web Icons/og-alma-digital.jpg     home: Asset/Logo.png sobre el aura de marca
  Asset/Soul Charger/og-soul-charger.jpg  página de Soul Charger: su portada recortada

Sólo hace falta volver a correrlo si cambia el logo o la portada:
    python3 tools/make_share_images.py
Necesita Pillow (pip install pillow).
"""
import math
import os

from PIL import Image, ImageFilter

W, H = 1200, 630

# Mesh aura del sistema de marca (de arriba hacia abajo en el orden de CSS):
# (centro x%, centro y%, radio x%, radio y%, color, punto donde se vuelve transparente)
AURA_BASE = (0xCB, 0xC4, 0xEA)
AURA = [
    (8, 4, 120, 95, (0xAE, 0xC5, 0xEF), 0.58),
    (96, 12, 105, 85, (0xC3, 0xD6, 0xF0), 0.55),
    (88, 96, 115, 90, (0xE7, 0xD2, 0xE6), 0.60),
    (4, 92, 110, 85, (0xDB, 0xE6, 0xEC), 0.58),
    (50, 52, 85, 65, (0x8B, 0x92, 0xD3), 0.72),
]


def aura(width, height):
    """Fondo aura: se calcula chico y se amplía, que es un degradé suave."""
    sw, sh = width // 4, height // 4
    px = []
    for y in range(sh):
        for x in range(sw):
            r, g, b = AURA_BASE
            for cx, cy, rx, ry, col, stop in reversed(AURA):  # el último de CSS va al fondo
                dx = (x / sw - cx / 100) / (rx / 100)
                dy = (y / sh - cy / 100) / (ry / 100)
                a = max(0.0, 1 - math.hypot(dx, dy) / stop)
                r, g, b = (r + (col[0] - r) * a, g + (col[1] - g) * a, b + (col[2] - b) * a)
            px.append((round(r), round(g), round(b)))
    img = Image.new('RGB', (sw, sh))
    img.putdata(px)
    return img.resize((width, height), Image.BICUBIC)


def home():
    bg = aura(W, H).convert('RGBA')

    logo = Image.open('Asset/Logo.png').convert('RGBA')
    side = 600
    logo = logo.resize((side, side), Image.LANCZOS)

    # Glow violeta detrás de la ameba (la marca usa luz, no sombra).
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    halo = Image.new('RGBA', (side, side), (122, 92, 242, 0))
    halo.putalpha(logo.getchannel('A').point(lambda v: int(v * 0.42)))
    glow.paste(halo, ((W - side) // 2, (H - side) // 2), halo)
    glow = glow.filter(ImageFilter.GaussianBlur(38))

    bg = Image.alpha_composite(bg, glow)
    bg.alpha_composite(logo, ((W - side) // 2, (H - side) // 2))
    out = 'Asset/Web Icons/og-alma-digital.jpg'
    bg.convert('RGB').save(out, 'JPEG', quality=88, optimize=True, progressive=True)
    return out


def soul_charger():
    src = Image.open('Asset/Studio Projects/Soul Charger/v2-alma-a Portada.webp').convert('RGB')
    # Recorte centrado a 1200:630 y escala.
    sw, sh = src.size
    target = W / H
    if sw / sh > target:
        nw = round(sh * target)
        box = ((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh)
    else:
        nh = round(sw / target)
        box = (0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh)
    out = 'Asset/Soul Charger/og-soul-charger.jpg'
    src.crop(box).resize((W, H), Image.LANCZOS).save(out, 'JPEG', quality=86, optimize=True, progressive=True)
    return out


def cover_to_og(src_path, out):
    """Portada 16:9 → 1200×630 con recorte centrado."""
    src = Image.open(src_path).convert('RGB')
    sw, sh = src.size
    target = W / H
    if sw / sh > target:
        nw = round(sh * target)
        box = ((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh)
    else:
        nh = round(sw / target)
        box = (0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh)
    src.crop(box).resize((W, H), Image.LANCZOS).save(out, 'JPEG', quality=84, optimize=True, progressive=True)
    return out


def projects():
    """Una imagen para compartir por obra: Asset/og/<slug>.jpg, desde su portada."""
    import json
    with open('src/projects.json', encoding='utf-8') as f:
        data = json.load(f)
    os.makedirs('Asset/og', exist_ok=True)
    return [cover_to_og(p['cover'], f"Asset/og/{p['slug']}.jpg") for p in data['projects']]


def icon_mask():
    """Icono solo (blanco con alfa) recortado a su contorno, para el header en móvil.
    El sitio lo usa como máscara CSS, así toma el color del tema."""
    src = Image.open('Asset/Logo Studio/AD_W_3.webp').convert('RGBA')
    box = src.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    icon = src.crop(box)
    side = max(icon.size)
    canvas = Image.new('RGBA', (side, side), (255, 255, 255, 0))
    canvas.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2), icon)
    out = 'Asset/Web Icons/icon-alma.png'
    canvas.resize((192, 192), Image.LANCZOS).save(out, 'PNG', optimize=True)
    return out


if __name__ == '__main__':
    made = [home(), soul_charger(), icon_mask()] + projects()
    for path in made[:3]:
        print(f'{path}: {os.path.getsize(path) // 1024} KB')
    total = sum(os.path.getsize(p) for p in made[3:])
    print(f'Asset/og/: {len(made) - 3} imágenes de obra, {total // 1024} KB en total')
