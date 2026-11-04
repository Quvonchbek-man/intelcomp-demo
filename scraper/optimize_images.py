"""webapp/img/*.jpg rasmlarini telefon uchun kichik WebP ga aylantiradi va products.json dagi yo'llarni yangilaydi.

Ishlatish:  python -X utf8 -I scraper/optimize_images.py
Asl JPG fayllar data/img_orig/ ga ko'chiriladi (gitignore), saytga faqat WebP ketadi.
"""
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "webapp" / "img"
ORIG = ROOT / "data" / "img_orig"
CATALOG = ROOT / "webapp" / "products.json"
SIZE = 480      # kartochka ~170px, 2x ekranda ham yetadi
QUALITY = 72


def main():
    ORIG.mkdir(parents=True, exist_ok=True)
    before = after = 0
    for jpg in sorted(IMG.glob("*.jpg")):
        webp = jpg.with_suffix(".webp")
        before += jpg.stat().st_size
        with Image.open(jpg) as im:
            im = im.convert("RGB")
            im.thumbnail((SIZE, SIZE))
            im.save(webp, "WEBP", quality=QUALITY, method=6)
        after += webp.stat().st_size
        shutil.move(str(jpg), ORIG / jpg.name)

    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    for p in data["products"]:
        if p["image"].startswith("img/") and p["image"].endswith(".jpg"):
            p["image"] = p["image"][:-4] + ".webp"
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"rasmlar: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
