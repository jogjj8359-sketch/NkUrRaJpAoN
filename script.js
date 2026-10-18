/* ============================================
   BLACK RUSSIA — LIFE SIMULATOR
   Полный игровой движок
============================================ */

const SAVE_KEY = "blackrussia_save_v1";

/* ================= ДАННЫЕ ================= */

const JOBS = [
  { id: "miner",    name: "Шахтёр",       emoji: "⛏️", pay: 500,  xp: 10, cooldown: 15000,  level: 1,  desc: "Добыча угля в глубокой шахте" },
  { id: "factory",  name: "Завод",        emoji: "🏭", pay: 1200, xp: 20, cooldown: 30000,  level: 2,  desc: "Работа на конвейере" },
  { id: "trucker",  name: "Дальнобойщик", emoji: "🚛", pay: 3000, xp: 40, cooldown: 60000,  level: 5,  desc: "Доставка грузов по России" },
  { id: "business", name: "Бизнес",       emoji: "💼", pay: 8000, xp: 80, cooldown: 120000, level: 10, desc: "Управление собственной компанией" },
];

const CARS = [
  { id: "vaz",      name: "ВАЗ 2107",        emoji: "🚗", price: 50000,   level: 1, desc: "Легендарная классика" },
  { id: "bmw",      name: "BMW M5",          emoji: "🏎️", price: 800000,  level: 5, desc: "Спортивный седан" },
  { id: "mercedes", name: "Mercedes S-Class", emoji: "🚘", price: 2000000, level: 8, desc: "Премиум-комфорт" },
];

const PROPERTIES = [
  { id: "studio", name: "Квартира-студия", emoji: "🏢", price: 150000,  level: 1,  desc: "Уютная студия в центре" },
  { id: "two",    name: "2-комнатная",     emoji: "🏠", price: 800000,  level: 3,  desc: "Отличный вариант для семьи" },
  { id: "penth",  name: "Пентхаус",        emoji: "🏙️", price: 3000000, level: 10, desc: "Элитное жильё с видом" },
];

const DEFAULT_STATE = {
  name: "Игрок",
  xp: 0,
  money: 1000,
  cars: [],
  properties: [],
  lastWork: {},
};

/* ================= СОСТОЯНИЕ ================= */

let state = loadState();
let cdTicker = null;

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Ошибка загрузки:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Ошибка сохранения:", e);
  }
}

/* ================= ХЕЛПЕРЫ ================= */

function level() { return Math.floor(state.xp / 100) + 1; }
function xpInLevel() { return state.xp % 100; }

function formatMoney(n) {
  return n.toLocaleString("ru-RU") + " ₽";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ================= РЕНДЕР ================= */

function renderAll() {
  renderHeader();
  renderProfile();
  renderJobs();
  renderCars();
  renderProperties();
}

function renderHeader() {
  document.getElementById("hdr-money").textContent = formatMoney(state.money);
  document.getElementById("hdr-level").textContent = "Ур. " + level();
}

function renderProfile() {
  const el = document.getElementById("tab-profile");
  const lvl = level();
  const xpPct = xpInLevel();

  el.innerHTML = `
    <div class="profile-card">
      <div class="avatar">👤</div>
      <div class="profile-info">
        <div class="profile-name">
          <span>${escapeHtml(state.name)}</span>
          <button class="icon-btn" id="edit-name" title="Изменить имя">✏️</button>
        </div>
        <div class="level-line">Уровень ${lvl}</div>
        <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
        <div class="xp-text">${xpInLevel()} / 100 XP до следующего уровня</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-val">${formatMoney(state.money)}</div>
        <div class="stat-lbl">Баланс</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚗</div>
        <div class="stat-val">${state.cars.length}</div>
        <div class="stat-lbl">Машин</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏠</div>
        <div class="stat-val">${state.properties.length}</div>
        <div class="stat-lbl">Жильё</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-val">${lvl}</div>
        <div class="stat-lbl">Уровень</div>
      </div>
    </div>

    <div class="section">
      <h3>Моё имущество</h3>
      <div class="owned-list" id="owned-list"></div>
    </div>

    <button class="btn btn-danger" id="reset-btn">🗑 Сбросить прогресс</button>
  `;

  document.getElementById("edit-name").onclick = editName;
  document.getElementById("reset-btn").onclick = resetGame;
  renderOwned();
}

function renderOwned() {
  const list = document.getElementById("owned-list");
  if (!list) return;

  if (state.cars.length === 0 && state.properties.length === 0) {
    list.innerHTML = `<div class="empty">Пока ничего не куплено 😔</div>`;
    return;
  }

  let html = "";
  state.cars.forEach((id) => {
    const c = CARS.find((x) => x.id === id);
    if (c) html += `<div class="owned-item">${c.emoji} ${c.name}</div>`;
  });
  state.properties.forEach((id) => {
    const p = PROPERTIES.find((x) => x.id === id);
    if (p) html += `<div class="owned-item">${p.emoji} ${p.name}</div>`;
  });
  list.innerHTML = html;
}

function renderJobs() {
  const el = document.getElementById("tab-jobs");
  const lvl = level();
  const now = Date.now();

  el.innerHTML = JOBS.map((job) => {
    const locked = lvl < job.level;
    const last = state.lastWork[job.id] || 0;
    const remaining = Math.max(0, job.cooldown - (now - last));
    const onCd = remaining > 0;
    const progress = onCd ? (1 - remaining / job.cooldown) * 100 : 100;

    let actionHtml;
    if (locked) {
      actionHtml = `<div class="lock-msg">🔒 Требуется уровень ${job.level}</div>`;
    } else if (onCd) {
      actionHtml = `
        <div class="cooldown-bar">
          <div class="cooldown-fill" data-cd-fill="${job.id}" style="width:${progress}%"></div>
        </div>
        <div class="cooldown-text" data-cd-text="${job.id}">
          Доступно через ${Math.ceil(remaining / 1000)}с
        </div>`;
    } else {
      actionHtml = `<button class="btn btn-primary" data-work="${job.id}" style="width:100%">Работать</button>`;
    }

    return `
      <div class="job-card ${locked ? "locked" : ""}">
        <div class="job-head">
          <div class="job-emoji">${job.emoji}</div>
          <div class="job-info">
            <div class="job-name">${job.name}</div>
            <div class="job-desc">${job.desc}</div>
          </div>
        </div>
        <div class="job-meta">
          <span>💰 +${job.pay.toLocaleString("ru-RU")} ₽</span>
          <span>⭐ +${job.xp} XP</span>
          <span>⏱ ${job.cooldown / 1000}с</span>
        </div>
        ${actionHtml}
      </div>`;
  }).join("");

  el.querySelectorAll("[data-work]").forEach((btn) => {
    btn.onclick = () => doWork(btn.dataset.work);
  });

  if (anyCooldownActive()) startCooldownTicker();
}

function anyCooldownActive() {
  const now = Date.now();
  return JOBS.some((j) => now - (state.lastWork[j.id] || 0) < j.cooldown);
}

function startCooldownTicker() {
  if (cdTicker) return;

  cdTicker = setInterval(() => {
    const now = Date.now();
    let stillActive = false;
    let needRerender = false;

    JOBS.forEach((job) => {
      const last = state.lastWork[job.id] || 0;
      const remaining = job.cooldown - (now - last);
      const fill = document.querySelector(`[data-cd-fill="${job.id}"]`);
      const text = document.querySelector(`[data-cd-text="${job.id}"]`);

      if (remaining > 0) {
        stillActive = true;
        if (fill) fill.style.width = ((1 - remaining / job.cooldown) * 100) + "%";
        if (text) text.textContent = `Доступно через ${Math.ceil(remaining / 1000)}с`;
      } else if (fill || text) {
        needRerender = true;
      }
    });

    if (!stillActive) {
      clearInterval(cdTicker);
      cdTicker = null;
      renderJobs();
      return;
    }
    if (needRerender) renderJobs();
  }, 250);
}

/* ================= РАБОТА ================= */

function doWork(id) {
  const job = JOBS.find((j) => j.id === id);
  if (!job) return;

  if (level() < job.level) return showToast(`🔒 Нужен уровень ${job.level}`, "error");

  const last = state.lastWork[id] || 0;
  if (Date.now() - last < job.cooldown) return showToast("⏱ Подождите ещё немного", "error");

  const prevLevel = level();

  state.money += job.pay;
  state.xp += job.xp;
  state.lastWork[id] = Date.now();
  saveState();

  const newLevel = level();
  if (newLevel > prevLevel) {
    showToast(`🎉 Новый уровень ${newLevel}!`, "success");
  } else {
    showToast(`+${job.pay.toLocaleString("ru-RU")} ₽ • +${job.xp} XP`, "success");
  }

  renderHeader();
  renderJobs();
  renderProfile();
}

/* ================= МАГАЗИНЫ ================= */

function renderCars() {
  const el = document.getElementById("tab-cars");
  el.innerHTML = CARS.map((c) => shopCardHtml(c, "car")).join("");
  el.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.onclick = () => {
      const item = CARS.find((c) => c.id === btn.dataset.buy);
      buyItem(item, "car");
    };
  });
}

function renderProperties() {
  const el = document.getElementById("tab-property");
  el.innerHTML = PROPERTIES.map((p) => shopCardHtml(p, "property")).join("");
  el.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.onclick = () => {
      const item = PROPERTIES.find((p) => p.id === btn.dataset.buy);
      buyItem(item, "property");
    };
  });
}

function shopCardHtml(item, type) {
  const owned = type === "car" ? state.cars.includes(item.id) : state.properties.includes(item.id);
  const locked = level() < item.level;

  let action;
  if (owned) {
    action = `<button class="btn btn-disabled" disabled>✓ Куплено</button>`;
  } else if (locked) {
    action = `<button class="btn btn-disabled" disabled>🔒 Ур. ${item.level}</button>`;
  } else {
    action = `<button class="btn btn-primary" data-buy="${item.id}">Купить</button>`;
  }

  return `
    <div class="shop-card ${owned ? "owned" : ""} ${locked ? "locked" : ""}">
      <div class="shop-emoji">${item.emoji}</div>
      <div class="shop-body">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
        <div class="shop-meta">
          <span class="price">${item.price.toLocaleString("ru-RU")} ₽</span>
          ${locked ? `<span class="lvl-req">🔒 Ур. ${item.level}</span>` : ""}
        </div>
      </div>
      <div class="shop-action">${action}</div>
    </div>`;
}

function buyItem(item, type) {
  if (!item) return;

  if (level() < item.level) return showToast(`🔒 Требуется уровень ${item.level}`, "error");
  if (state.money < item.price) return showToast("💸 Недостаточно денег", "error");

  const arr = type === "car" ? state.cars : state.properties;
  if (arr.includes(item.id)) return showToast("Уже куплено", "error");

  confirmModal(
    "Подтверждение покупки",
    `Купить «${item.name}» за ${item.price.toLocaleString("ru-RU")} ₽?`,
    () => {
      state.money -= item.price;
      arr.push(item.id);
      saveState();
      renderAll();
      showToast(`✅ Куплено: ${item.name}`, "success");
    }
  );
}

/* ================= МОДАЛКА ================= */

function confirmModal(title, text, onConfirm) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-text").textContent = text;
  modal.classList.remove("hidden");

  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");

  const close = () => {
    modal.classList.add("hidden");
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  confirmBtn.onclick = () => { close(); onConfirm(); };
  cancelBtn.onclick = close;
}

/* ================= ПРОЧЕЕ ================= */

function editName() {
  const newName = prompt("Введите новое имя (до 20 символов):", state.name);
  if (newName && newName.trim()) {
    state.name = newName.trim().slice(0, 20);
    saveState();
    renderProfile();
    showToast("Имя изменено", "success");
  }
}

function resetGame() {
  confirmModal(
    "Сброс прогресса",
    "Вы уверены? Весь прогресс будет удалён безвозвратно.",
    () => {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      saveState();
      renderAll();
      showToast("Прогресс сброшен", "success");
    }
  );
}

function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = "toast"; }, 2200);
}

/* ================= TABS ================= */

function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById("tab-" + btn.dataset.tab);
      if (target) target.classList.add("active");
    };
  });
}

/* ================= СТАРТ ================= */

function init() {
  initTabs();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
