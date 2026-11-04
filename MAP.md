# IntelComp demo — kod xaritasi

## 1. Nima bu
@intelcomp Telegram kanali (Abu Sahiy bozori R-48, kompyuter aksessuarlari) egasiga ko'rsatish uchun **demo**.
Kanaldagi ochiq postlardan mahsulot nomi, ulgurji narx (y.e) va donalab narx (so'm) avtomatik yig'iladi va
Telegram Mini App ko'rinishidagi katalogga aylantiriladi: qidiruv, kategoriyalar, donalab/ulgurji rejim,
savatcha, buyurtma va admin paneli.
Bu kattaroq g'oyaning 1-bosqichi: Telegram do'konlar uchun sotuv yordamchisi (SaaS). Batafsil xotirada:
`intelcomp-kanal-savdo-tizimi`.

## 2. Arxitektura
```
t.me/s/intelcomp ──fetch_posts.py──▶ data/posts.jsonl ──build_catalog.py──▶ webapp/products.json + webapp/img/
                                                                              │
                                                     webapp/index.html + app.js (katalog, savatcha, buyurtma)
                                                     webapp/admin.html (buyurtmalar, statistika)
```
Backend yo'q: buyurtmalar brauzerning `localStorage`ida saqlanadi (faqat demo uchun).

## 3. Papkalar
| Papka | Nima |
|---|---|
| `scraper/` | Kanalni yig'ish va katalog qurish skriptlari (faqat stdlib) |
| `data/` | Xom postlar `posts.jsonl`, jurnallar, asl JPG rasmlar `img_orig/` (gitignore) |
| `webapp/` | Statik Mini App: shu papkani istalgan HTTPS hostingga qo'yish kifoya |
| `webapp/img/` | Mahsulot rasmlari, `<post_id>.webp` (480px, ~11 KB), gitga kiradi |

## 4. Fayllar (qator raqamlari taxminiy)
- `scraper/fetch_posts.py`: `parse_page()` ~45 (HTML → post dict), `main()` ~80. `?before=<id>` bilan orqaga sahifalaydi, qayta ishga tushirilsa eng eski postdan davom etadi.
- `scraper/build_catalog.py`
  - `WHOLESALE` / `RETAIL` regex ~20: "ULGURJI NARHI X y.e", "DONAGA NARHI Y som"; `INLINE_USD`: nom oxiridagi "2.2$"
  - `CATEGORIES` ~26: kalit so'zlar, **tartib muhim** (birinchi moslik olinadi)
  - `parse_post()` ~55: matndan nom, izoh, narxlar, kategoriya
  - `inherit_batch_category()`: nomidan aniqlanmagan mahsulot o'sha daqiqadagi partiyaning kategoriyasini oladi
  - `main()`: nom bo'yicha dublikatlarni olib tashlaydi (eng yangi post qoladi), rasmlarni yuklaydi, `products.json` yozadi
- `scraper/optimize_images.py`: `img/*.jpg` → 480px WebP, asl nusxani `data/img_orig/` ga ko'chiradi, `products.json` yo'llarini yangilaydi. `build_catalog.py` mavjud `.webp`ni qayta yuklamaydi
- `webapp/i18n.js`: `I18N.uz` / `I18N.ru` (interfeys matnlari va kategoriya nomlari), `ruPlural()`, `detectLang()` (saqlangan tanlov → Telegram `language_code` → brauzer tili)
- `webapp/app.js`: `T()` joriy til lug'ati, `applyLang()` (`data-i18n`, `data-i18n-ph` atributlarini to'ldiradi), `state` ~10, `filtered()` (qidiruv + sinonimlar `SYNONYMS`), `renderGrid()`, `openProduct()`, `openCart()`, `checkout()` (buyurtma → `ic_orders`), `orderText()` (admin oladigan xabar, mijoz tilidan qat'i nazar doim o'zbekcha), `bind()` (barcha hodisalar), `init()`
- `webapp/admin.html`: ichki skript, `ic_orders`ni o'qiydi, statuslar: yangi → tasdiqlandi → jo'natildi; `sampleOrders()` bo'sh panelga katalogdagi haqiqiy mahsulotlardan 3 ta namunaviy buyurtma qo'shadi. Katalogdan kirish: yuqoridagi `⚙ Admin` havolasi
- `webapp/style.css`: Telegram mavzu o'zgaruvchilari (`--tg-theme-*`), brauzerda esa tizimning qorong'i rejimi

## 5. Buzib bo'lmaydigan qoidalar
- **Narx hech qachon taxmin qilinmaydi.** Postda narx bo'lmasa "Narxini so'rang" chiqadi.
- CSS/JS o'zgarsa, `index.html` va `admin.html`dagi `?v=N`ni oshiring (Telegram webview keshi).
- Yig'ish skripti `python -X utf8 -I` bilan ishga tushiriladi (Windows konsoli cp1251).
- Kanal egasining roziligisiz demoni ommaviy joyga qo'ymang: bu uning brendi va narxlari.

## 6. Vazifa → qayerga qarash
| Vazifa | Joy |
|---|---|
| Narx noto'g'ri o'qilyapti | `build_catalog.py` → `WHOLESALE`/`RETAIL`/`to_number()` |
| Mahsulot noto'g'ri kategoriyada | `build_catalog.py` → `CATEGORIES` (tartib), `inherit_batch_category()` |
| Qidiruvda o'zbekcha/ruscha so'z topilmayapti | `app.js` → `SYNONYMS` |
| Buyurtma matni yoki formasi | `app.js` → `openCart()`, `checkout()`, `orderText()` |
| Matn yoki tarjima o'zgartirish, yangi til qo'shish | `i18n.js` (yangi til: `I18N.<kod>` + `#lang` tugmasi `index.html`da) |
| Admin paneli | `admin.html` (faqat o'zbekcha) |
| Ranglar va dizayn | `style.css` `:root` |

## 7. Ishga tushirish
```
python -X utf8 -I scraper/fetch_posts.py                    # kanalni yig'ish (to'liq tarix ~1 soat)
python -X utf8 -I scraper/build_catalog.py --since 2025-11-01   # katalog + rasmlar
python -X utf8 -I scraper/optimize_images.py                # rasmlarni WebP ga siqish
```
Joylash: https://quvonchbek-man.github.io/intelcomp-demo/ (repo `Quvonchbek-man/intelcomp-demo`, ochiq; `gh-pages` = `webapp/` papkasi).
Internet sekin bo'lsa, katta push 408 bilan uziladi: rasmlarni ~100 tadan alohida vaqtinchalik branch'ga yuborib, keyin asosiy branch'larni push qilish kerak.
```
git subtree split --prefix webapp -b gh-pages && git push -f origin gh-pages
```
Ko'rish: `D:\Claude\.claude\launch.json` → `intelcomp-demo` (http://localhost:8765).

## 8. Holat va ochiq savollar (2026-11-04)
- Ishlaydi: o'zbek/rus tili (avtomatik + UZ/RU tugmasi), yig'ish, katalog, qidiruv, kategoriyalar, donalab/ulgurji rejim, savatcha, buyurtma, admin demo.
- Hali yo'q: haqiqiy backend (bot buyurtmani adminga yuboradi), ulgurji mijozni tasdiqlash, katalogdan kanalga avtopost, BotFather'da Mini App ulash. HTTPS hosting tayyor (GitHub Pages, 2026-11-04).
- "Boshqa" kategoriyasida MARVO/MONKA kabi brend sichqonchalari qolishi mumkin, chunki nomida "MOUSE" so'zi yo'q.
- Kanal egasi bilan hali gaplashilmagan.
