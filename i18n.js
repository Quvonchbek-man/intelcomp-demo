// Interfeys tarjimalari. Mahsulot nomlari postdagidek qoladi (ular asosan inglizcha).
function ruPlural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const I18N = {
  uz: {
    demo: "DEMO · @intelcomp kanalidagi postlar asosida tayyorlangan namuna",
    sub: "Kompyuter aksessuarlari · Abu Sahiy R-48",
    search: "Qidirish: HP, simsiz, HDMI...",
    retail: "Donalab", wholesale: "Ulgurji",
    sort_new: "Yangi kelganlar", sort_cheap: "Arzonroq", sort_pricey: "Qimmatroq", sort_popular: "Ko'p ko'rilgan",
    wholesale_note: "Ulgurji narxlar (y.e). Haqiqiy tizimda bu narxlar faqat admin tasdiqlagan ulgurji mijozlarga ko'rinadi.",
    empty: "Hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.",
    cart: "Savatcha", all: "Barchasi", count: (n) => `${n} ta mahsulot`,
    ask_price: "Narxini so'rang", add_aria: "Savatchaga",
    posted: "Kanalga joylangan", views: (n) => `${n} marta ko'rilgan`,
    add_to_cart: "Savatchaga qo'shish", open_post: "Kanaldagi postni ochish",
    price_by_admin: "narxini admin aytadi", total: "Jami",
    unknown_prices: (n) => `${n} ta mahsulot narxini admin tasdiqlaydi.`,
    f_name: "Ismingiz", f_phone: "Telefon: +998 ...", f_note: "Izoh (yetkazib berish manzili va h.k.)",
    checkout: "Buyurtma berish", need_contact: "Ism va telefon raqamini kiriting",
    order_ok: (no) => `Buyurtma #${no} qabul qilindi`, order_ok_sub: "Admin tez orada siz bilan bog'lanadi.",
    demo_msg: "Demo: admin Telegram'da quyidagi xabarni oladi 👇",
    admin_demo: "Admin panelni ko'rish (demo)", back: "Katalogga qaytish",
    sum: "so'm", usd: "y.e",
    cats: {
      combo: "Kombo to'plam", mousepad: "Gilamcha", keyboard: "Klaviatura", mouse: "Sichqoncha",
      headset: "Quloqchin va mikrofon", speaker: "Kolonka", webcam: "Veb-kamera", gamepad: "Geympad va rul",
      cooling: "Sovutish va stend", hub: "USB hub va dok", network: "Tarmoq", storage: "Disk va xotira",
      adapter: "Adapter va konverter", cable: "Kabel", power: "Zaryadlovchi va quvvat",
      stylus: "Stilus va planshet", other: "Boshqa",
    },
  },
  ru: {
    demo: "ДЕМО · пример на основе постов канала @intelcomp",
    sub: "Компьютерные аксессуары · Абу Сахий R-48",
    search: "Поиск: HP, беспроводная, HDMI...",
    retail: "Розница", wholesale: "Оптом",
    sort_new: "Новинки", sort_cheap: "Дешевле", sort_pricey: "Дороже", sort_popular: "Популярные",
    wholesale_note: "Оптовые цены (у.е). В рабочей версии их видят только оптовые клиенты, одобренные админом.",
    empty: "Ничего не найдено. Попробуйте другой запрос.",
    cart: "Корзина", all: "Все", count: (n) => `${n} ${ruPlural(n, "товар", "товара", "товаров")}`,
    ask_price: "Цена по запросу", add_aria: "В корзину",
    posted: "Опубликовано в канале", views: (n) => `${n} ${ruPlural(n, "просмотр", "просмотра", "просмотров")}`,
    add_to_cart: "Добавить в корзину", open_post: "Открыть пост в канале",
    price_by_admin: "цену уточнит админ", total: "Итого",
    unknown_prices: (n) => `Цену ${n} товаров подтвердит админ.`,
    f_name: "Ваше имя", f_phone: "Телефон: +998 ...", f_note: "Комментарий (адрес доставки и т.д.)",
    checkout: "Оформить заказ", need_contact: "Укажите имя и номер телефона",
    order_ok: (no) => `Заказ #${no} принят`, order_ok_sub: "Админ скоро свяжется с вами.",
    demo_msg: "Демо: админ получит в Telegram такое сообщение 👇",
    admin_demo: "Открыть админ-панель (демо)", back: "Вернуться в каталог",
    sum: "сум", usd: "у.е",
    cats: {
      combo: "Комплекты", mousepad: "Коврики", keyboard: "Клавиатуры", mouse: "Мыши",
      headset: "Наушники и микрофоны", speaker: "Колонки", webcam: "Веб-камеры", gamepad: "Геймпады и рули",
      cooling: "Охлаждение и подставки", hub: "USB-хабы и доки", network: "Сеть", storage: "Диски и память",
      adapter: "Адаптеры и конвертеры", cable: "Кабели", power: "Зарядки и питание",
      stylus: "Стилусы и планшеты", other: "Другое",
    },
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem("ic_lang");
    if (saved && I18N[saved]) return saved;
  } catch { /* xotira yopiq */ }
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const lang = (tgLang || navigator.language || "uz").slice(0, 2);
  return lang === "ru" ? "ru" : "uz";
}
