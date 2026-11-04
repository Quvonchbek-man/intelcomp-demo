"""data/posts.jsonl dan webapp/products.json katalogini quradi va rasmlarni webapp/img/ ga yuklaydi.

Ishlatish:  python -X utf8 -I scraper/build_catalog.py [--since 2025-01-01] [--no-images]
Bir xil nomli mahsulot bir necha marta post qilingan bo'lsa, eng yangisi olinadi.
"""
import json
import re
import sys
import time
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "data" / "posts.jsonl"
OUT = ROOT / "webapp" / "products.json"
IMG_DIR = ROOT / "webapp" / "img"
CHANNEL = "intelcomp"

WHOLESALE = re.compile(r"ULGURJI\s*NAR[HX]?[IY]?\W*([\d.,]+)\s*(y\.?\s*e|\$|usd)", re.I)
RETAIL = re.compile(r"DONA(?:GA|LAB)?\s*NAR[HX]?[IY]?\W*([\d.,\s]+?)\s*(so'?m|сум|sum)", re.I)
INLINE_USD = re.compile(r"\s([\d]+(?:[.,]\d+)?)\s*\$\s*$")
HAS_LETTER = re.compile(r"[A-Za-zА-Яа-я]")

# Tartib muhim: birinchi mos kelgan kategoriya olinadi
CATEGORIES = [
    ("combo", "Kombo to'plam", ["COMBO", "KOMBO", " KIT "]),
    ("mousepad", "Gilamcha", ["MOUSEPAD", "MOUSE PAD", "KOVRIK", " PAD "]),
    ("keyboard", "Klaviatura", ["KEYBOARD", "KLAVIATURA", "KLAVA", " KB ", "MECHANICAL", " GK-"]),
    ("mouse", "Sichqoncha", ["MOUSE", "MYSHKA", "МЫШ"]),
    ("headset", "Quloqchin va mikrofon", ["HEADSET", "HEADPHONE", "NAUSHNIK", "QULOQCHIN", "EARPHONE", "AIRPODS", "BUDS", "MICROPHONE", "MIKROFON", "HEAD STAND"]),
    ("speaker", "Kolonka", ["SPEAKER", "KOLONKA", "SOUNDBAR", " SP "]),
    ("webcam", "Veb-kamera", ["WEBCAM", "WEB CAM", "VEB KAMERA"]),
    ("gamepad", "Geympad va rul", ["GAMEPAD", "JOYSTICK", "DZHOYSTIK", " RUL ", "PIDAL"]),
    ("cooling", "Sovutish va stend", ["FAN ", " FAN", "COOLER", "TERMO", "PASTA", "NOTEPAD", "STAND", "HOLDER"]),
    ("hub", "USB hub va dok", ["HUB", "DOCK STATION", "DOK STANSIYA"]),
    ("network", "Tarmoq", ["LAN", "RJ-45", "RJ45", "ABJIM", "ROUTER", "WIFI", "WI-FI", "TP-LINK", "TENDA", "TESTOR", "MEGABIT"]),
    ("storage", "Disk va xotira", ["HDD", "SSD", "NVME", "NWME", " CASE ", "CADDY", "SATA", "FLASH", "FLESHKA", "MICRO SD", "MICROSD"]),
    ("adapter", "Adapter va konverter", ["CONVERTER", "KONVERTER", " TO ", "CARTREADER", "CARDREADER", "ADAPTER", "PEREXODNIK", "SPLITTER", " X2 ", " SOUND "]),
    ("cable", "Kabel", ["CABLE", "KABEL", "HDMI", "UDLINITEL", " DP ", "VGA", "TUNDERBOLT", "THUNDERBOLT"]),
    ("power", "Zaryadlovchi va quvvat", ["CHARGER", "ZARYAD", "POWER BANK", "POWERBANK", "UPS", "BLOK PITANIYA", " PIN",
                                         "DURACELL", "ENERGIZER", "BATAREY", "MACBOOK"]),
    ("stylus", "Stilus va planshet", ["PENCIL", "STYLUS", "DISPLAY PROTECTOR"]),
]
# Noutbuk zaryadlovchisi: "DELL 65W 19.5V 3.34A" — nomida kalit so'z yo'q, lekin kuchlanish va quvvat bor
LAPTOP_CHARGER = re.compile(r"\b\d+(?:\.\d+)?V\b.*\b\d+(?:\.\d+)?[AW]\b|\b\d+W\b.*\b\d+(?:\.\d+)?V\b")
OTHER = ("other", "Boshqa")


def to_number(s):
    s = s.strip().replace(" ", "")
    # 80.000 yoki 1.250.000 → minglik ajratuvchi; 3.5 → kasr
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", s):
        return int(re.sub(r"[.,]", "", s))
    return float(s.replace(",", "."))


def clean_name(line):
    line = re.sub(r"\s+", " ", line).strip(" .-–—:")
    return line


def parse_post(post):
    text = post["text"]
    if not text or not post["photos"]:
        return None
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    name_lines = []
    for line in lines:
        if re.search(r"ULGURJI|DONA", line, re.I):
            break
        if HAS_LETTER.search(line):
            name_lines.append(line)
    if not name_lines:
        return None

    name = clean_name(name_lines[0])
    note = " ".join(clean_name(l) for l in name_lines[1:]) or None

    wholesale = retail = None
    if m := WHOLESALE.search(text):
        wholesale = to_number(m.group(1))
    if m := RETAIL.search(text):
        retail = to_number(m.group(1))
    if wholesale is None and (m := INLINE_USD.search(name)):
        wholesale = to_number(m.group(1))
        name = clean_name(name[: m.start()])
    if wholesale is None and retail is None:
        return None
    if retail is not None and retail < 1000:  # "80" ko'rinishida yozilgan bo'lsa ming so'm
        retail = int(retail * 1000)

    upper = f" {name.upper()} "
    cat = next(((cid, title) for cid, title, keys in CATEGORIES if any(k in upper for k in keys)), OTHER)
    if cat == OTHER and LAPTOP_CHARGER.search(upper):
        cat = ("power", "")
    return {
        "id": post["id"],
        "name": name,
        "note": note,
        "category": cat[0],
        "wholesale_usd": wholesale,
        "retail_uzs": int(retail) if retail else None,
        "photo_url": post["photos"][0],
        "views": post["views"],
        "date": post["date"],
        "post_url": f"https://t.me/{CHANNEL}/{post['id']}",
    }


def key(name):
    return re.sub(r"[^A-Z0-9]", "", name.upper())


def inherit_batch_category(items):
    """Admin bir xil turdagi tovarlarni bir daqiqada ketma-ket joylaydi. Nomidan turini aniqlab
    bo'lmagan mahsulot (masalan "LENOVO MG51 WIRELESS") o'sha partiyadagi ko'pchilik kategoriyasini oladi."""
    batches = {}
    for p in items:
        batches.setdefault((p["date"] or "")[:16], []).append(p)
    for batch in batches.values():
        known = Counter(p["category"] for p in batch if p["category"] != OTHER[0])
        if not known:
            continue
        top, count = known.most_common(1)[0]
        if count * 2 >= len(batch):
            for p in batch:
                if p["category"] == OTHER[0]:
                    p["category"] = top


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dest.write_bytes(r.read())


def main():
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "0000"
    posts = [json.loads(l) for l in POSTS.open(encoding="utf-8") if l.strip()]
    posts = [p for p in posts if (p["date"] or "") >= since]

    products, skipped = {}, 0
    for post in sorted(posts, key=lambda p: p["id"]):
        item = parse_post(post)
        if item is None:
            skipped += 1
            continue
        products[key(item["name"])] = item  # keyingi (yangiroq) post eskisini almashtiradi

    items = sorted(products.values(), key=lambda p: -p["id"])
    inherit_batch_category(items)
    if "--no-images" not in sys.argv:
        IMG_DIR.mkdir(parents=True, exist_ok=True)
        for i, p in enumerate(items):
            dest = IMG_DIR / f"{p['id']}.jpg"
            if not dest.exists() and not dest.with_suffix(".webp").exists():
                try:
                    download(p["photo_url"], dest)
                    time.sleep(0.15)
                except Exception as e:
                    print(f"rasm yuklanmadi {p['id']}: {e}")
            if i % 100 == 0:
                print(f"rasmlar: {i}/{len(items)}", flush=True)
    for p in items:
        local = [f for f in (f"{p['id']}.webp", f"{p['id']}.jpg") if (IMG_DIR / f).exists()]
        p["image"] = f"img/{local[0]}" if local else p["photo_url"]
        del p["photo_url"]

    catalog = {
        "shop": {"name": "IntelComp", "channel": CHANNEL, "admin": "intel_comp",
                 "phone": "+998977807290", "address": "Toshkent, Abu Sahiy bozori, R-48"},
        "categories": [{"id": c[0], "title": c[1]} for c in CATEGORIES] + [{"id": OTHER[0], "title": OTHER[1]}],
        "products": items,
    }
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"postlar: {len(posts)}, mahsulot: {len(items)}, tashlab ketildi: {skipped}")
    print("kategoriyalar:", dict(Counter(p["category"] for p in items).most_common()))


if __name__ == "__main__":
    main()
