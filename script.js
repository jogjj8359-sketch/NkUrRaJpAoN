const SAVE_KEY = "blackrussia_v2";
const DEFAULT_STATE = { name: "Игрок", xp: 0, money: 1000, energy: 100, cars: [], lastWork: {}, lastCrime: 0 };

const JOBS = [
  { id: "miner", name: "Шахтёр", emoji: "⛏️", pay: 400, xp: 10, cd: 10000, lvl: 1, energyCost: 15 },
  { id: "factory", name: "Завод", emoji: "🏭", pay: 1000, xp: 20, cd: 20000, lvl: 2, energyCost: 25 },
  { id: "trucker", name: "Дальнобойщик", emoji: "🚛", pay: 3000, xp: 40, cd: 45000, lvl: 5, energyCost: 40 },
  { id: "business", name: "Бизнес", emoji: "💼", pay: 8000, xp: 80, cd: 90000, lvl: 10, energyCost: 60 }
];
const CARS = [
  { id: "vaz", name: "ВАЗ 2107", emoji: "🚗", price: 50000, lvl: 1, desc: "Классика" },
  { id: "bmw", name: "BMW M5", emoji: "🏎️", price: 800000, lvl: 5, desc: "Спорт" },
  { id: "merc", name: "Mercedes S-Class", emoji: "🚘", price: 2000000, lvl: 8, desc: "Премиум" }
];

let state = JSON.parse(localStorage.getItem(SAVE_KEY)) || { ...DEFAULT_STATE };
if(!state.lastWork) state.lastWork = {};
let ticker = null;

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function lvl() { return Math.floor(state.xp / 100) + 1; }
function xpInLvl() { return state.xp % 100; }
function fmt(n) { return n.toLocaleString("ru-RU") + " ₽"; }

function render() {
  document.getElementById("hdr-money").textContent = fmt(state.money);
  document.getElementById("hdr-energy").textContent = state.energy + "%";
  document.getElementById("hdr-level").textContent = "Ур. " + lvl();
  renderProfile(); renderJobs(); renderCars(); renderCriminal();
}

function renderProfile() {
  document.getElementById("tab-profile").innerHTML = `
    <div class="profile-card">
      <div class="avatar">👤</div>
      <div class="profile-info">
        <div class="profile-name">${state.name} <button class="icon-btn" id="edit-name">✏️</button></div>
        <div style="font-size:13px;color:var(--muted)">Уровень ${lvl()}</div>
        <div class="xp-bar"><div class="xp-fill" style="width:${xpInLvl()}%"></div></div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">${xpInLvl()} / 100 XP</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-val">${fmt(state.money)}</div><div class="stat-lbl">Баланс</div></div>
      <div class="stat-card"><div class="stat-icon">⚡</div><div class="stat-val">${state.energy}</div><div class="stat-lbl">Энергия</div></div>
      <div class="stat-card"><div class="stat-icon">🚗</div><div class="stat-val">${state.cars.length}</div><div class="stat-lbl">Машин</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-val">${lvl()}</div><div class="stat-lbl">Уровень</div></div>
    </div>
    <button class="btn btn-danger" id="reset-btn">🗑 Сбросить прогресс</button>
  `;
  document.getElementById("edit-name").onclick = () => {
    let n = prompt("Новое имя:", state.name);
    if (n && n.trim()) { state.name = n.trim().slice(0,15); save(); render(); }
  };
  document.getElementById("reset-btn").onclick = () => {
    if(confirm("Сбросить прогресс?")) { state = JSON.parse(JSON.stringify(DEFAULT_STATE)); save(); render(); }
  };
}

function renderJobs() {
  const now = Date.now();
  document.getElementById("tab-jobs").innerHTML = JOBS.map(j => {
    let locked = lvl() < j.lvl;
    let remaining = Math.max(0, j.cd - (now - (state.lastWork[j.id]||0)));
    let action = locked ? `<div class="lock-msg">🔒 Требуется Ур. ${j.lvl}</div>` :
      remaining > 0 ? `<div class="lock-msg">⏱ Ждите ${Math.ceil(remaining/1000)} сек...</div>` :
      `<button class="btn btn-primary" data-work="${j.id}">Работать (⚡ -${j.energyCost})</button>`;
    return `<div class="job-card"><div class="job-head"><div class="job-emoji">${j.emoji}</div><div class="job-info"><div class="job-name">${j.name}</div><div class="job-desc">${j.desc||''}</div></div></div>
      <div class="job-meta"><span>💰 +${j.pay} ₽</span><span>⭐ +${j.xp} XP</span></div>${action}</div>`;
  }).join("");
  document.querySelectorAll("[data-work]").forEach(b => b.onclick = () => doWork(b.dataset.work));
  if (JOBS.some(j => now - (state.lastWork[j.id]||0) < j.cd)) startTicker();
}

function startTicker() {
  if(ticker) return;
  ticker = setInterval(() => {
    let active = JOBS.some(j => Date.now() - (state.lastWork[j.id]||0) < j.cd);
    if(active) renderJobs(); else { clearInterval(ticker); ticker = null; renderJobs(); }
  }, 1000);
}

function doWork(id) {
  const j = JOBS.find(x => x.id === id);
  if (state.energy < j.energyCost) return toast("🔋 Недостаточно энергии! Отдохните.", "error");
  if (Date.now() - (state.lastWork[id]||0) < j.cd) return;
  state.money += j.pay; state.xp += j.xp; state.energy -= j.energyCost; state.lastWork[id] = Date.now();
  save(); render(); toast(`+${j.pay} ₽ • +${j.xp} XP`, "success");
}

function renderCars() {
  document.getElementById("tab-cars").innerHTML = CARS.map(c => {
    let owned = state.cars.includes(c.id);
    let locked = lvl() < c.lvl;
    let btn = owned ? `<button class="btn btn-disabled">✓ Куплено</button>` :
      locked ? `<button class="btn btn-disabled">🔒 Ур. ${c.lvl}</button>` :
      `<button class="btn btn-primary" data-buy="${c.id}">Купить за ${fmt(c.price)}</button>`;
    return `<div class="shop-card"><div class="shop-emoji">${c.emoji}</div><div class="shop-body"><div class="shop-name">${c.name}</div><div class="shop-desc">${c.desc}</div></div>${btn}</div>`;
  }).join("");
  document.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => buyCar(b.dataset.buy));
}

function buyCar(id) {
  const c = CARS.find(x => x.id === id);
  if (state.money < c.price) return toast("💸 Мало денег!", "error");
  if (confirm(`Купить ${c.name} за ${c.price} ₽?`)) {
    state.money -= c.price; state.cars.push(c.id); save(); render(); toast("✅ Куплено!", "success");
  }
}

function renderCriminal() {
  const now = Date.now();
  const cd = 60000;
  let remaining = Math.max(0, cd - (now - state.lastCrime));
  let action = remaining > 0 ? `<div class="lock-msg">Полиция ищет вас... Ждите ${Math.ceil(remaining/1000)} сек</div>` :
    `<button class="btn btn-primary" style="background:linear-gradient(135deg, #e11d48, #7f1d1d)" id="rob-btn">🔫 Ограбить прохожего (Риск 40%)</button>`;

  document.getElementById("tab-criminal").innerHTML = `
    <div class="criminal-card">
      <div class="criminal-title">🔫 Теневые делишки</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:15px">Если вас поймают, вы потеряете 1000 ₽ и получите розыск.</p>
      ${action}
    </div>
  `;

  const rb = document.getElementById("rob-btn");
  if (rb) rb.onclick = () => {
    state.lastCrime = Date.now();
    if (Math.random() < 0.4) {
      state.money -= 1000; toast("🚔 Вас поймали! Штраф 1000 ₽", "error");
    } else {
      let win = Math.floor(Math.random() * 3000) + 500;
      state.money += win; state.xp += 15; toast(`💰 Успех! Вы украли ${win} ₽`, "success");
    }
    save(); render();
  };
  if (remaining > 0) startCrimeTicker();
}

function startCrimeTicker() {
  if(ticker) return;
  ticker = setInterval(() => {
    if(Date.now() - state.lastCrime < 60000) renderCriminal();
    else { clearInterval(ticker); ticker = null; renderCriminal(); }
  }, 1000);
}

function toast(msg, type="info") {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast show " + type;
  setTimeout(() => t.className = "toast", 2500);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  };
});

render();
