"""Ochiq kanal sahifasidan (t.me/s/<kanal>) barcha postlarni yig'ib, data/posts.jsonl ga yozadi.

Ishlatish:  python -I scraper/fetch_posts.py [kanal] [--max-pages N]
Qayta ishga tushirilsa, allaqachon yig'ilgan eng eski postdan davom etadi.
"""
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "posts.jsonl"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"

MSG_SPLIT = re.compile(r'<div class="tgme_widget_message_wrap')
POST_ID = re.compile(r'data-post="[^/]+/(\d+)"')
PHOTO = re.compile(r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)")
TEXT = re.compile(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', re.S)
DATE = re.compile(r'<time datetime="([^"]+)"')
VIEWS = re.compile(r'<span class="tgme_widget_message_views">([^<]+)</span>')
GROUPED = re.compile(r'tgme_widget_message_grouped_wrap')


def clean_text(raw):
    raw = re.sub(r"<br\s*/?>", "\n", raw)
    raw = re.sub(r"<i class=\"emoji\"[^>]*><b>(.*?)</b></i>", r"\1", raw)
    raw = re.sub(r"<[^>]+>", "", raw)
    return html.unescape(raw).strip()


def parse_views(v):
    v = v.strip().upper()
    mult = 1000 if v.endswith("K") else 1_000_000 if v.endswith("M") else 1
    return int(float(v.rstrip("KM")) * mult)


def parse_page(page):
    posts = []
    for block in MSG_SPLIT.split(page)[1:]:
        pid = POST_ID.search(block)
        if not pid:
            continue
        text = TEXT.search(block)
        date = DATE.search(block)
        views = VIEWS.search(block)
        posts.append({
            "id": int(pid.group(1)),
            "date": date.group(1) if date else None,
            "text": clean_text(text.group(1)) if text else "",
            "photos": PHOTO.findall(block),
            "views": parse_views(views.group(1)) if views else None,
            "album": bool(GROUPED.search(block)),
        })
    return posts


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # tarmoq uzilishi yoki 429
            wait = 5 * (attempt + 1)
            print(f"  xato: {e}; {wait}s kutamiz", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"yuklab bo'lmadi: {url}")


def main():
    channel = next((a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()), "intelcomp")
    max_pages = int(sys.argv[sys.argv.index("--max-pages") + 1]) if "--max-pages" in sys.argv else 10_000

    seen = set()
    if OUT.exists():
        with OUT.open(encoding="utf-8") as f:
            seen = {json.loads(line)["id"] for line in f if line.strip()}
    before = min(seen) if seen else None
    print(f"oldin yig'ilgan: {len(seen)} post", flush=True)

    with OUT.open("a", encoding="utf-8") as out:
        for page_no in range(max_pages):
            url = f"https://t.me/s/{channel}" + (f"?before={before}" if before else "")
            posts = [p for p in parse_page(fetch(url)) if p["id"] not in seen]
            if not posts:
                print("tugadi: eski postlar qolmadi", flush=True)
                break
            for p in posts:
                out.write(json.dumps(p, ensure_ascii=False) + "\n")
                seen.add(p["id"])
            out.flush()
            before = min(p["id"] for p in posts)
            if page_no % 20 == 0:
                print(f"sahifa {page_no}: jami {len(seen)}, eng eski id {before}", flush=True)
            time.sleep(0.7)


if __name__ == "__main__":
    main()
