// IntelComp katalog demo — Telegram Mini App ichida ham, oddiy brauzerda ham ishlaydi.
const tg = window.Telegram && window.Telegram.WebApp;
const inTelegram = !!(tg && tg.initData);
if (inTelegram) {
  document.documentElement.classList.add("tg");
  tg.ready();
  tg.expand();
}

const PAGE = 40;
const state = {
  shop: null, products: [], categories: [],
  lang: "uz", q: "", cat: "all", mode: "retail", sort: "new", shown: PAGE,
  cart: load("ic_cart", {}),
};

const $ = (s) => document.querySelector(s);
const T = () => I18N[state.lang];
const fmtUzs = (n) => n.toLocaleString("ru-RU").replace(/,/g, " ") + " " + T().sum;
const fmtUsd = (n) => (Math.round(n * 100) / 100) + " " + T().usd;

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* xotira yopiq bo'lsa ham ishlayveradi */ }
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function haptic(type = "light") {
  if (inTelegram && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(type);
}

// Joriy rejimdagi narx: donalab so'mda, ulgurji y.e da. Narx yo'q bo'lsa null.
function priceOf(p) {
  return state.mode === "retail" ? p.retail_uzs : p.wholesale_usd;
}
function fmtPrice(v) {
  if (v == null) return null;
  return state.mode === "retail" ? fmtUzs(v) : fmtUsd(v);
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, " ");
}
// Foydalanuvchi o'zbekcha yozsa ham topilsin
const SYNONYMS = {
  simsiz: "wireless", sichqoncha: "mouse", klaviatura: "keyboard", quloqchin: "headset",
  беспроводная: "wireless", беспроводной: "wireless", мышь: "mouse", мышка: "mouse", клавиатура: "keyboard",
  наушники: "headset", кабель: "cable", колонка: "speaker", коврик: "pad", флешка: "flash",
  kabel: "cable", fleshka: "flash", gilamcha: "pad", kolonka: "speaker",
};

function filtered() {
  const words = normalize(state.q).split(" ").filter(Boolean).map((w) => SYNONYMS[w] || w);
  let list = state.products.filter((p) =>
    (state.cat === "all" || p.category === state.cat) &&
    words.every((w) => p._search.includes(w)));
  const priced = (p) => priceOf(p) ?? Infinity;
  if (state.sort === "cheap") list = list.slice().sort((a, b) => priced(a) - priced(b));
  if (state.sort === "pricey") list = list.slice().sort((a, b) => (priceOf(b) ?? -1) - (priceOf(a) ?? -1));
  if (state.sort === "popular") list = list.slice().sort((a, b) => (b.views || 0) - (a.views || 0));
  return list;
}

function renderCats() {
  const counts = {};
  state.products.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
  const cats = [{ id: "all" }, ...state.categories.filter((c) => counts[c.id])];
  $("#cats").innerHTML = cats.map((c) =>
    `<button class="chip ${state.cat === c.id ? "on" : ""}" data-cat="${c.id}">${esc(c.id === "all" ? T().all : T().cats[c.id] || c.title)}<small>${c.id === "all" ? state.products.length : counts[c.id]}</small></button>`
  ).join("");
}

function cardHtml(p) {
  const price = fmtPrice(priceOf(p));
  const qty = state.cart[p.id] || 0;
  return `<article class="card" data-id="${p.id}">
    <img src="${esc(p.image)}" alt="" loading="lazy">
    <div class="info">
      <div class="name">${esc(p.name)}</div>
      <div class="bottom">
        ${price ? `<span class="price">${price}</span>` : `<span class="price ask">${T().ask_price}</span>`}
        <button class="add ${qty ? "in" : ""}" data-add="${p.id}" aria-label="${T().add_aria}">${qty ? qty : "+"}</button>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  const list = filtered();
  $("#count").textContent = T().count(list.length);
  $("#empty").hidden = list.length > 0;
  $("#grid").innerHTML = list.slice(0, state.shown).map(cardHtml).join("");
  $("#mode-note").hidden = state.mode !== "wholesale";
}

function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ p: state.byId[id], qty }))
    .filter((l) => l.p && l.qty > 0);
}
function cartTotal(lines) {
  let total = 0, unknown = 0;
  lines.forEach(({ p, qty }) => {
    const v = priceOf(p);
    v == null ? unknown++ : (total += v * qty);
  });
  return { total, unknown };
}

function renderCartBar() {
  const lines = cartLines();
  const n = lines.reduce((s, l) => s + l.qty, 0);
  $("#cart-bar").hidden = n === 0;
  if (!n) return;
  const { total, unknown } = cartTotal(lines);
  $("#cart-count").textContent = n;
  // Narxi noma'lum tovar bo'lsa "0 so'm" emas, "Narxini so'rang" yoki "... +" ko'rsatiladi
  $("#cart-total").textContent = total ? fmtPrice(total) + (unknown ? " +" : "") : T().ask_price;
}

function setQty(id, qty) {
  qty = Math.max(0, Math.min(999, qty));
  if (qty) state.cart[id] = qty; else delete state.cart[id];
  save("ic_cart", state.cart);
  renderCartBar();
  const btn = document.querySelector(`[data-add="${id}"]`);
  if (btn) { btn.classList.toggle("in", !!qty); btn.textContent = qty || "+"; }
}

function openSheet(html) {
  $("#sheet-body").innerHTML = html;
  $("#sheet").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  $("#sheet").hidden = true;
  document.body.style.overflow = "";
}

function openProduct(id) {
  const p = state.byId[id];
    const date = p.date ? new Date(p.date).toLocaleDateString("ru-RU") : "";
  const qty = state.cart[id] || 1;
  openSheet(`
    <div class="head-row"><span class="sub">${esc(T().cats[p.category] || "")}</span><button class="x" data-close>✕</button></div>
    <img class="big" src="${esc(p.image)}" alt="">
    <h2>${esc(p.name)}</h2>
    ${p.note ? `<div class="sub">${esc(p.note)}</div>` : ""}
    <div class="prices">
      <div><span>${T().retail}</span><b>${p.retail_uzs ? fmtUzs(p.retail_uzs) : "—"}</b></div>
      <div><span>${T().wholesale}</span><b>${p.wholesale_usd ? fmtUsd(p.wholesale_usd) : "—"}</b></div>
    </div>
    <div class="sub">${T().posted}: ${date} · ${T().views(p.views || 0)}</div>
    <div class="actions" style="margin:14px 0 8px">
      <div class="qty"><button data-q="-1">−</button><span id="pq">${qty}</span><button data-q="1">+</button></div>
      <button class="btn" id="to-cart" data-id="${id}">${T().add_to_cart}</button>
    </div>
    <a class="btn ghost" style="display:block" href="${esc(p.post_url)}" target="_blank" rel="noopener">${T().open_post}</a>
  `);
}

function openCart() {
  const lines = cartLines();
  const { total, unknown } = cartTotal(lines);
  const user = inTelegram && tg.initDataUnsafe.user;
  openSheet(`
    <div class="head-row"><h2 style="margin:0">${T().cart}</h2><button class="x" data-close>✕</button></div>
    ${lines.map(({ p, qty }) => `
      <div class="line">
        <img src="${esc(p.image)}" alt="">
        <div class="ln">${esc(p.name)}<small>${fmtPrice(priceOf(p)) || T().price_by_admin}</small></div>
        <div class="qty"><button data-cq="${p.id}" data-d="-1">−</button><span>${qty}</span><button data-cq="${p.id}" data-d="1">+</button></div>
      </div>`).join("")}
    <div class="total"><span>${T().total}</span><span>${total ? fmtPrice(total) : "—"}</span></div>
    ${unknown ? `<div class="sub">${T().unknown_prices(unknown)}</div>` : ""}
    <input class="field" id="o-name" placeholder="${T().f_name}" value="${esc(user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "")}">
    <input class="field" id="o-phone" type="tel" placeholder="${T().f_phone}" inputmode="tel">
    <input class="field" id="o-note" placeholder="${T().f_note}">
    <button class="btn" id="checkout" style="width:100%">${T().checkout}</button>
  `);
}

// Admin uchun xabar mijoz tilidan qat'i nazar o'zbekcha
function orderText(order) {
  const fmt = (v) => order.mode === "retail"
    ? v.toLocaleString("ru-RU").replace(/,/g, " ") + " so'm"
    : (Math.round(v * 100) / 100) + " y.e";
  const rows = order.lines.map((l, i) =>
    `${i + 1}. ${l.name} × ${l.qty}${l.price != null ? " = " + fmt(l.price * l.qty) : ""}`).join("\n");
  return `🛒 Yangi buyurtma #${order.no} (${order.mode === "retail" ? "donalab" : "ulgurji"})\n` +
    `👤 ${order.name}\n📞 ${order.phone}\n` + (order.note ? `📝 ${order.note}\n` : "") +
    `\n${rows}\n\nJami: ${fmt(order.total)}`;
}

function checkout() {
  const name = $("#o-name").value.trim();
  const phone = $("#o-phone").value.trim();
  if (!name || phone.replace(/\D/g, "").length < 9) {
    $(!name ? "#o-name" : "#o-phone").focus();
    if (inTelegram) tg.showAlert(T().need_contact);
    return;
  }
  const lines = cartLines();
  const orders = load("ic_orders", []);
  const order = {
    no: 1000 + orders.length + 1, at: new Date().toISOString(), mode: state.mode,
    name, phone, note: $("#o-note").value.trim(), status: "yangi",
    lines: lines.map(({ p, qty }) => ({ id: p.id, name: p.name, qty, price: priceOf(p) })),
    total: cartTotal(lines).total,
  };
  orders.unshift(order);
  save("ic_orders", orders);
  state.cart = {};
  save("ic_cart", state.cart);
  renderCartBar();
  renderGrid();
  haptic("medium");
  openSheet(`
    <div class="done">
      <div class="ic">✅</div>
      <h2>${T().order_ok(order.no)}</h2>
      <div class="sub">${T().order_ok_sub}</div>
    </div>
    <div class="sub">${T().demo_msg}</div>
    <div class="preview">${esc(orderText(order))}</div>
    <a class="btn ghost" style="display:block;margin-bottom:8px" href="admin.html">${T().admin_demo}</a>
    <button class="btn" data-close style="width:100%">${T().back}</button>
  `);
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = T()[el.dataset.i18n]));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = T()[el.dataset.i18nPh]));
  document.querySelectorAll("#lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === state.lang));
}

function bind() {
  $("#lang").addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    state.lang = b.dataset.lang;
    save("ic_lang", state.lang);
    applyLang(); renderCats(); renderGrid(); renderCartBar();
  });
  let t;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderGrid(); window.scrollTo({ top: 0 }); }, 150);
  });
  $("#cats").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    state.cat = b.dataset.cat; state.shown = PAGE;
    renderCats(); renderGrid();
    window.scrollTo({ top: 0 });
  });
  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    state.mode = b.dataset.mode;
    document.querySelectorAll("#mode button").forEach((x) => x.classList.toggle("on", x === b));
    renderGrid(); renderCartBar();
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.shown = PAGE; renderGrid(); });

  $("#grid").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      e.stopPropagation();
      setQty(add.dataset.add, (state.cart[add.dataset.add] || 0) + 1);
      haptic();
      return;
    }
    const card = e.target.closest(".card");
    if (card) openProduct(card.dataset.id);
  });

  $("#cart-bar").addEventListener("click", openCart);
  $("#sheet").addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return closeSheet();
    const q = e.target.closest("[data-q]");
    if (q) {
      const el = $("#pq");
      el.textContent = Math.max(1, +el.textContent + +q.dataset.q);
      return;
    }
    if (e.target.id === "to-cart") {
      setQty(e.target.dataset.id, +$("#pq").textContent);
      haptic();
      return closeSheet();
    }
    const cq = e.target.closest("[data-cq]");
    if (cq) {
      setQty(cq.dataset.cq, (state.cart[cq.dataset.cq] || 0) + +cq.dataset.d);
      return cartLines().length ? openCart() : closeSheet();
    }
    if (e.target.id === "checkout") checkout();
  });

  // Pastga yetganda keyingi mahsulotlarni ko'rsatish
  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 600 && state.shown < filtered().length) {
      state.shown += PAGE;
      renderGrid();
    }
  }, { passive: true });
}

async function init() {
  const data = await fetch("products.json").then((r) => r.json());
  state.shop = data.shop;
  state.categories = data.categories;
  state.products = data.products.map((p) => ({ ...p, _search: " " + normalize(`${p.name} ${p.note || ""}`) + " " }));
  state.byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
  for (const id of Object.keys(state.cart)) if (!state.byId[id]) delete state.cart[id];
  state.lang = detectLang();
  applyLang();
  bind();
  renderCats();
  renderGrid();
  renderCartBar();
}

init();
