#!/usr/bin/env python3
"""Génère splash-dark.png / splash-light.png (logo centré + from Beyond).

Source logo : assets/images/icon.png
Spec : docs/SPLASH.md

À lancer après chaque régénération d’icônes :
  python3 scripts/generate-splash.py

Le splash natif Expo utilise ces PNG full-screen (app.json →
enableFullScreenImage_legacy), pour le même branding que BrandedSplash
(logo + from Beyond). Relancer après chaque régénération d’icônes.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "assets" / "images"
ICON_PATH = ROOT / "icon.png"
W, H = 1284, 2778


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def circular_logo(icon: Image.Image, size: int) -> Image.Image:
    src = icon.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def make_splash(
    icon: Image.Image,
    bg: tuple[int, int, int],
    out_name: str,
    *,
    logo_size: int = 420,
) -> None:
    canvas = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(canvas)

    logo = circular_logo(icon, logo_size)
    lx = (W - logo_size) // 2
    ly = int(H * 0.42) - logo_size // 2
    canvas.paste(logo, (lx, ly), logo)

    font_from = load_font(36)
    font_brand = load_font(44)
    line1, line2 = "from", "Beyond"

    def text_size(font: ImageFont.ImageFont, s: str) -> tuple[int, int]:
        bbox = draw.textbbox((0, 0), s, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    w1, h1 = text_size(font_from, line1)
    w2, h2 = text_size(font_brand, line2)
    gap = 10
    block_h = h1 + gap + h2
    bottom_pad = int(H * 0.09)
    y1 = H - bottom_pad - block_h

    if sum(bg) < 200:
        c_from = (163, 145, 113)  # sable
        c_brand = (245, 237, 214)  # crème
    else:
        c_from = (163, 145, 113)
        c_brand = (13, 11, 5)

    draw.text(((W - w1) // 2, y1), line1, font=font_from, fill=c_from)
    draw.text(((W - w2) // 2, y1 + h1 + gap), line2, font=font_brand, fill=c_brand)

    out = ROOT / out_name
    canvas.save(out, "PNG", optimize=True)
    print(f"wrote {out}")


def main() -> None:
    icon = Image.open(ICON_PATH).convert("RGBA")
    make_splash(icon, (13, 11, 5), "splash-dark.png")
    make_splash(icon, (248, 245, 236), "splash-light.png")


if __name__ == "__main__":
    main()
