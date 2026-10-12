'use strict';
/* ==========================================================
   书房 · 个人工作台 —— 核心逻辑
   数据全部保存在浏览器 localStorage（本地保存）
   ========================================================== */

const DB_KEY = 'study-workbench.v1';
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
const PALETTE = ['#3E6B57', '#B58A44', '#8A6D5C', '#5B7A9D', '#9C6B8F', '#6E8B5F', '#B0604A', '#7A7F95', '#A98B4F', '#4F7E84'];
const HABIT_COLORS = ['#3E6B57', '#B58A44', '#5B7A9D', '#9C6B8F', '#B0604A', '#6E8B5F', '#7A7F95', '#A98B4F'];
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60]; // 间隔复习：按熟练度递增

/* ---------------- 工具函数 ---------------- */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(dateStr, n) {
  const p = dateStr.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2] + n);
  return todayStr(d);
}
function fmtCN(dateStr) {
  const p = dateStr.split('-');
  return (+p[1]) + '月' + (+p[2]) + '日';
}
function wdCN(dateStr) {
  const p = dateStr.split('-');
  return WEEK_CN[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function timeFmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------------- 图标库（内联 SVG，线描风格） ---------------- */
function I(inner) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}
const ICONS = {
  grip: I('<circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>'),
  expand: I('<path d="M9 4H4v5"/><path d="M15 4h5v5"/><path d="M9 20H4v-5"/><path d="M15 20h5v-5"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  trash: I('<path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  link: I('<path d="M10 14a4.5 4.5 0 006.3-6.3l2-2a4.5 4.5 0 00-6.4-6.4l-2 2"/><path d="M14 10a4.5 4.5 0 00-6.3 6.3l-2 2a4.5 4.5 0 006.4 6.4l2-2"/>'),
  clock: I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  calendar: I('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
  sun: I('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>'),
  cloud: I('<path d="M7 18a4.5 4.5 0 01-.4-9A5.5 5.5 0 0117.5 9a3.5 3.5 0 01.5 9z"/>'),
  rain: I('<path d="M7 15a4.5 4.5 0 01-.4-9A5.5 5.5 0 0117.5 6a3.5 3.5 0 01.5 9z"/><path d="M8.5 16.5l-1 2.5M12.5 16.5l-1 2.5M16.5 16.5l-1 2.5"/>'),
  snow: I('<path d="M7 15a4.5 4.5 0 01-.4-9A5.5 5.5 0 0117.5 6a3.5 3.5 0 01.5 9z"/><path d="M12 16.5v3M10 17.5l4 1M10 18.5l4-1"/>'),
  thunder: I('<path d="M7 15a4.5 4.5 0 01-.4-9A5.5 5.5 0 0117.5 6a3.5 3.5 0 01.5 9z"/><path d="M13 14l-3 5h2.5l-1.5 4"/>'),
  fog: I('<path d="M7 15a4.5 4.5 0 01-.4-9A5.5 5.5 0 0117.5 6a3.5 3.5 0 01.5 9z"/><path d="M4.5 19h15M7.5 22h9"/>'),
  book: I('<path d="M4 5.5A2.5 2.5 0 016.5 3H12v17.5H6.5A2.5 2.5 0 014 18zM20 5.5A2.5 2.5 0 0017.5 3H12v17.5h5.5A2.5 2.5 0 0020 18z"/>'),
  quote: I('<path d="M9.5 7C7 8 5.5 10 5.5 13v4h5v-5H8c.2-1.8 1.2-3.2 3-4zM19.5 7c-2.5 1-4 3-4 6v4h5v-5h-2.5c.2-1.8 1.2-3.2 3-4z" fill="currentColor" stroke="none"/>'),
  copy: I('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5"/>'),
  refresh: I('<path d="M20 11A8 8 0 106.6 6.6L4 9"/><path d="M4 4v5h5M4 13a8 8 0 1013.4-4.6L20 6"/><path d="M20 20v-5h-5"/>'),
  abc: I('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M8 15.5v-5.5M8 10c.8-1.2 2-1.2 2.8 0M8 13h2.8M12.5 10v5.5M12.5 12.8h3M12.5 15.5h3.2"/>'),
  pencil: I('<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>'),
  download: I('<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>'),
  upload: I('<path d="M12 15V3M7 8l5-5 5 5M4 20h16"/>'),
  flag: I('<path d="M5 21V4M5 4h11l-2 3 2 3H5"/>'),
  star: I('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>')
};
const WEATHER_ICONS = { sun: ICONS.sun, cloud: ICONS.cloud, rain: ICONS.rain, snow: ICONS.snow, thunder: ICONS.thunder, fog: ICONS.fog };

/* ---------------- 默认数据 ---------------- */
function defaultState() {
  const t = todayStr();
  return {
    layout: ['todo', 'pomodoro', 'habits', 'calendar', 'links', 'books', 'quotes', 'words'],
    hidden: {},
    links: [
      { id: uid(), name: '飞书文档', url: 'https://feishu.cn', cat: '效率', color: '#5B7A9D' },
      { id: uid(), name: 'Notion', url: 'https://notion.so', cat: '效率', color: '#3E6B57' },
      { id: uid(), name: '豆瓣读书', url: 'https://book.douban.com', cat: '阅读', color: '#B58A44' },
      { id: uid(), name: '维基百科', url: 'https://zh.wikipedia.org', cat: '学习', color: '#7A7F95' }
    ],
    todos: [
      { id: uid(), text: '整理今日待办清单', done: false, prio: 'normal', date: t },
      { id: uid(), text: '静心阅读 30 分钟', done: false, prio: 'normal', date: t }
    ],
    habits: [
      { id: uid(), name: '早起', color: '#3E6B57', dates: [] },
      { id: uid(), name: '阅读', color: '#B58A44', dates: [] },
      { id: uid(), name: '运动', color: '#B0604A', dates: [] }
    ],
    books: [
      { id: uid(), title: '百年孤独', author: '加西亚·马尔克斯', status: 'reading', progress: 62, color: '#3E6B57' },
      { id: uid(), title: '人类简史', author: '尤瓦尔·赫拉利', status: 'reading', progress: 35, color: '#B58A44' },
      { id: uid(), title: '原则', author: '瑞·达利欧', status: 'planned', progress: 0, color: '#5B7A9D' }
    ],
    quotes: [
      { id: uid(), text: '生活不是为了赶路，而是为了感受路。', book: '散步集', author: '', tags: ['生活'], createdAt: t }
    ],
    words: [],
    pomodoro: { workMin: 25, shortMin: 5, history: {} },
    weather: { city: '西安', lat: 34.3416, lon: 108.9398 },
    meta: { createdAt: t }
  };
}

/* ---------------- 本地存储 ---------------- */
let state = null;
let storageOK = true;
function deepMerge(base, extra) {
  const out = Array.isArray(base) ? base : {};
  if (extra && typeof extra === 'object') {
    for (const k in base) {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        out[k] = deepMerge(base[k], extra[k] || {});
      } else {
        out[k] = (extra[k] !== undefined) ? extra[k] : base[k];
      }
    }
    for (const k in extra) { if (!(k in base)) out[k] = extra[k]; }
  } else {
    Object.assign(out, base);
  }
  return out;
}
function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return deepMerge(defaultState(), JSON.parse(raw));
  } catch (e) { storageOK = false; return null; }
}
function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state));
    const el = $('#lastSave');
    if (el) el.textContent = '最近保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    storageOK = false;
    const el = $('#saveHint');
    if (el) el.textContent = '本地存储不可用，数据仅保存在内存中';
  }
}

/* ---------------- Toast ---------------- */
function toast(msg, type) {
  const wrap = $('#toastWrap');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'ok' ? ' is-ok' : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, 2400);
}

/* ---------------- 问候语 ---------------- */
function setGreeting() {
  const h = new Date().getHours();
  let g;
  if (h < 5) g = '夜深了';
  else if (h < 9) g = '早安';
  else if (h < 12) g = '上午好';
  else if (h < 14) g = '中午好';
  else if (h < 18) g = '下午好';
  else if (h < 23) g = '晚上好';
  else g = '夜深了';
  $('#greetingTitle').textContent = g;
  const now = new Date();
  const line = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · 星期' + WEEK_CN[now.getDay()];
  $('#todayLine').textContent = line;
}

/* ---------------- 天气（Open-Meteo 免费接口，失败时回落演示数据） ---------------- */
const WMO_MAP = {
  0: ['sun', '晴'], 1: ['sun', '少云'], 2: ['cloud', '多云'], 3: ['cloud', '阴'],
  45: ['fog', '雾'], 48: ['fog', '雾'],
  51: ['rain', '毛毛雨'], 53: ['rain', '小雨'], 55: ['rain', '小雨'],
  61: ['rain', '阵雨'], 63: ['rain', '中雨'], 65: ['rain', '大雨'],
  66: ['rain', '冻雨'], 67: ['rain', '冻雨'],
  71: ['snow', '小雪'], 73: ['snow', '中雪'], 75: ['snow', '大雪'], 77: ['snow', '雪粒'],
  80: ['rain', '阵雨'], 81: ['rain', '强阵雨'], 82: ['rain', '暴雨'],
  85: ['snow', '阵雪'], 86: ['snow', '强阵雪'],
  95: ['thunder', '雷阵雨'], 96: ['thunder', '雷暴'], 99: ['thunder', '强雷暴']
};
let weather = { now: { t: null, code: null }, daily: [], city: '西安', state: 'idle', isDemo: false };
function wmoInfo(code) {
  return WMO_MAP[code] || ['cloud', '多云'];
}
async function fetchWeather() {
  try {
    let lat = state.weather.lat, lon = state.weather.lon, city = state.weather.city;
    if (!lat || !lon) {
      const g = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=zh&format=json');
      const gj = await g.json();
      if (gj.results && gj.results[0]) {
        lat = gj.results[0].latitude; lon = gj.results[0].longitude;
        state.weather.lat = lat; state.weather.lon = lon; save();
      }
    }
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=7';
    const r = await fetch(url);
    const j = await r.json();
    weather.city = city;
    weather.isDemo = false;
    weather.now = { t: Math.round(j.current.temperature_2m), code: j.current.weather_code };
    weather.daily = (j.daily.time || []).map((d, i) => ({
      date: d,
      code: j.daily.weather_code[i],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i])
    }));
  } catch (e) {
    weather.isDemo = true;
    weather.city = state.weather.city;
    weather.now = { t: 18, code: 1 };
    const base = new Date();
    weather.daily = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      weather.daily.push({ date: todayStr(d), code: i === 0 ? 1 : (i % 3 === 0 ? 3 : 0), max: 18 + (i % 3), min: 9 + (i % 2) });
    }
  }
  renderWeatherUI();
}
function renderWeatherUI() {
  const icon = $('#weatherIcon'), txt = $('#weatherText');
  if (!icon || !txt) return;
  const info = weather.now.code == null ? ['cloud', '—'] : wmoInfo(weather.now.code);
  icon.innerHTML = WEATHER_ICONS[info[0]];
  txt.textContent = (weather.now.t != null ? weather.now.t + '° ' : '') + info[1] + (weather.isDemo ? '（示例）' : '');
  const calBody = $('#modalBody');
  if (calBody && calBody.dataset.view === 'calendar') renderCalendarView();
  // 同步刷新仪表盘上的日历卡片摘要
  const calCard = grid.querySelector('.card[data-id="calendar"] .card-body');
  if (calCard) calCard.innerHTML = calendarSummary();
}
function openCityPop() {
  const pop = $('#cityPop');
  const inp = $('#cityInput');
  inp.value = state.weather.city || '';
  pop.hidden = false;
  pop.style.display = 'flex';
  setTimeout(() => inp.focus(), 30);
}
function closeCityPop() {
  const pop = $('#cityPop');
  pop.hidden = true;
  pop.style.display = 'none';
}
async function setCity(name) {
  const city = String(name || '').trim();
  if (!city) { closeCityPop(); return; }
  try {
    const g = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=zh&format=json');
    const gj = await g.json();
    if (!gj.results || !gj.results[0]) { toast('未找到城市：' + city); return; }
    state.weather.city = city;
    state.weather.lat = gj.results[0].latitude;
    state.weather.lon = gj.results[0].longitude;
    save();
    toast('已切换到 ' + city + ' 的天气');
    closeCityPop();
    fetchWeather();
  } catch (e) {
    toast('城市查询失败，请稍后再试');
  }
}

/* ---------------- 环形进度 ---------------- */
function ringSvg(remain, total, size, stroke, colorClass) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, total > 0 ? remain / total : 0)));
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-track" stroke-width="' + stroke + '"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="ring-bar ' + (colorClass || '') + '" stroke-width="' + stroke + '" ' +
    'style="stroke-dasharray:' + c.toFixed(1) + ';stroke-dashoffset:' + off.toFixed(1) + '"/>' +
    '</svg>';
}

/* ---------------- 弹层系统 ---------------- */
let currentModal = null;
function openModal(id, opts) {
  const M = MODULES[id];
  if (!M) return;
  currentModal = { id: id, opts: opts || {} };
  $('#modalTitle').innerHTML = '<span class="t-icon">' + ICONS[M.icon] + '</span>' + esc(M.title);
  const body = $('#modalBody');
  body.dataset.view = id;
  body.innerHTML = M.view(currentModal.opts);
  if (M.bind) M.bind(body, currentModal.opts);
  $('#modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('#modalOverlay').hidden = true;
  const body = $('#modalBody');
  delete body.dataset.view;
  body.innerHTML = '';
  currentModal = null;
  document.body.style.overflow = '';
  renderDashboard(); // 关闭弹窗后同步卡片摘要
}
$('#modalClose').addEventListener('click', closeModal);
$('#modalOverlay').addEventListener('mousedown', e => { if (e.target === $('#modalOverlay')) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#searchResults').hidden) hideSearch();
    else if (!$('#cityPop').hidden) closeCityPop();
    else if (!currentModal) return;
    else closeModal();
  }
});

/* ---------------- 仪表盘：渲染卡片 ---------------- */
const grid = $('#dashboard');
function renderDashboard() {
  grid.innerHTML = '';
  state.layout.forEach((id, i) => {
    const M = MODULES[id];
    if (!M) return;
    if (state.hidden[id]) return;
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = id;
    card.style.animationDelay = Math.min(i * 55, 440) + 'ms';
    card.innerHTML =
      '<div class="card-head">' +
      '<span class="card-grip" draggable="true" title="拖拽调整顺序">' + ICONS.grip + '</span>' +
      '<div class="card-title" data-act="expand"><span class="t-icon">' + ICONS[M.icon] + '</span>' + esc(M.title) + '</div>' +
      '<button class="card-expand" data-act="expand" title="展开">' + ICONS.expand + '</button>' +
      '</div>' +
      '<div class="card-body">' + M.summary() + '</div>';
    grid.appendChild(card);
  });
  document.body.classList.add('is-ready');
  bindCardEvents();
}

function bindCardEvents() {
  grid.querySelectorAll('.card').forEach(card => {
    card.querySelectorAll('[data-act="expand"]').forEach(el => {
      el.addEventListener('click', () => openModal(card.dataset.id));
    });
  });
  // 卡片级自定义绑定
  state.layout.forEach(id => {
    const M = MODULES[id];
    if (M && M.cardBind) {
      const card = grid.querySelector('.card[data-id="' + id + '"]');
      if (card) M.cardBind(card);
    }
  });
}

/* ---------------- 模块拖拽排序 ---------------- */
let dragId = null;
grid.addEventListener('dragstart', e => {
  const grip = e.target.closest('.card-grip');
  if (!grip) { e.preventDefault(); return; }
  const card = grip.closest('.card');
  dragId = card.dataset.id;
  card.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});
grid.addEventListener('dragover', e => {
  e.preventDefault();
  const card = e.target.closest('.card');
  if (!card || card.dataset.id === dragId) return;
  const dragCard = grid.querySelector('.card[data-id="' + dragId + '"]');
  if (!dragCard) return;
  const rect = card.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const midX = rect.left + rect.width / 2;
  const after = e.clientY > midY || (Math.abs(e.clientY - midY) < 26 && e.clientX > midX);
  if (after) {
    if (card.nextElementSibling !== dragCard) grid.insertBefore(dragCard, card.nextElementSibling);
  } else {
    if (card.previousElementSibling !== dragCard) grid.insertBefore(dragCard, card);
  }
});
grid.addEventListener('dragend', e => {
  const card = grid.querySelector('.card[data-id="' + dragId + '"]');
  if (card) card.classList.remove('is-dragging');
  const order = Array.from(grid.querySelectorAll('.card')).map(c => c.dataset.id);
  if (order.join() !== state.layout.join()) {
    state.layout = order;
    save();
    toast('模块顺序已保存');
  }
  dragId = null;
});

/* ==========================================================
   模块 · 待办便签
   ========================================================== */
function todoSummary() {
  const undone = state.todos.filter(t => !t.done);
  const doneCount = state.todos.length - undone.length;
  const list = undone.slice(0, 4).map(t =>
    '<li class="' + (t.done ? 'is-done' : '') + '" data-id="' + t.id + '">' +
    '<button class="cbox" data-act="tog" data-id="' + t.id + '" title="完成">' + ICONS.check + '</button>' +
    '<span class="prio-dot p-' + esc(t.prio) + '"></span>' +
    '<span class="t-text">' + esc(t.text) + '</span></li>'
  ).join('');
  return '<ul class="todo-mini-list">' + (list || '<li style="color:var(--ink-faint)">今日待办已清空</li>') + '</ul>' +
    '<div class="mini-foot"><span>待办 ' + undone.length + ' 项 · 已完成 ' + doneCount + ' 项</span></div>';
}
function todoCardBind(card) {
  card.querySelectorAll('[data-act="tog"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = state.todos.find(x => x.id === btn.dataset.id);
      if (t) { t.done = !t.done; save(); renderDashboard(); }
    });
  });
}
function todoView() {
  const prios = [['normal', '普通'], ['important', '重要'], ['urgent', '紧急']];
  const opts = ['全部', '进行中', '已完成'];
  const list = state.todos.map(t =>
    '<li class="todo-item ' + (t.done ? 'is-done' : '') + '" data-id="' + t.id + '">' +
    '<button class="cbox ' + (t.done ? 'is-on' : '') + '" data-act="tog" data-id="' + t.id + '">' + ICONS.check + '</button>' +
    '<span class="prio-dot p-' + esc(t.prio) + '"></span>' +
    '<span class="t-text">' + esc(t.text) + '</span>' +
    '<span class="t-date">' + fmtCN(t.date) + '</span>' +
    '<span class="row-act"><button class="mini-act" data-act="del" data-id="' + t.id + '" title="删除">' + ICONS.trash + '</button></span>' +
    '</li>'
  ).join('');
  return '<div class="view-stack">' +
    '<div class="todo-form">' +
    '<input type="text" id="todoInput" placeholder="记一件要做的事…" maxlength="120">' +
    '<select id="todoPrio">' + prios.map(p => '<option value="' + p[0] + '">' + p[1] + '</option>').join('') + '</select>' +
    '<button class="btn btn-primary" data-act="add">' + ICONS.plus + '添加</button>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
    '<div class="seg" id="todoSeg">' + opts.map((o, i) => '<button data-f="' + i + '" class="' + (i === 0 ? 'is-on' : '') + '">' + o + '</button>').join('') + '</div>' +
    '<button class="btn btn-sm" data-act="clearDone">清空已完成</button>' +
    '</div>' +
    '<ul class="todo-list">' + (list || '<li style="color:var(--ink-faint);padding:10px">暂无待办</li>') + '</ul>' +
    '</div>';
}
function todoBind(root, opts) {
  const input = root.querySelector('#todoInput');
  const addBtn = root.querySelector('[data-act="add"]');
  function doAdd() {
    const text = input.value.trim();
    if (!text) { toast('先写点内容吧'); return; }
    state.todos.unshift({ id: uid(), text: text, done: false, prio: root.querySelector('#todoPrio').value, date: todayStr() });
    save(); toast('已添加待办', 'ok');
    openModal('todo', { q: opts.q });
  }
  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  if (opts && opts.q) {
    const inp = root.querySelector('#todoInput');
    if (inp) inp.value = opts.q;
  }
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'tog') {
      const t = state.todos.find(x => x.id === btn.dataset.id);
      if (t) { t.done = !t.done; save(); openModal('todo', { q: opts.q }); }
    } else if (act === 'del') {
      state.todos = state.todos.filter(x => x.id !== btn.dataset.id);
      save(); toast('已删除'); openModal('todo', { q: opts.q });
    } else if (act === 'clearDone') {
      state.todos = state.todos.filter(x => !x.done);
      save(); toast('已清空完成的待办'); openModal('todo', { q: opts.q });
    }
  });
  root.querySelectorAll('#todoSeg button').forEach(b => {
    b.addEventListener('click', () => {
      root.querySelectorAll('#todoSeg button').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      const f = +b.dataset.f;
      const lis = root.querySelectorAll('.todo-item');
      lis.forEach(li => {
        const t = state.todos.find(x => x.id === li.dataset.id);
        if (!t) return;
        li.style.display = (f === 0) || (f === 1 && !t.done) || (f === 2 && t.done) ? '' : 'none';
      });
    });
  });
}

/* ==========================================================
   模块 · 番茄钟
   ========================================================== */
const timer = { mode: 'work', remain: 0, total: 0, running: false, iv: null };
function timerTotal() {
  return (timer.mode === 'work' ? state.pomodoro.workMin : state.pomodoro.shortMin) * 60;
}
function resetTimerState() {
  timer.mode = 'work';
  timer.total = timerTotal();
  timer.remain = timer.total;
  timer.running = false;
}
function pomoCountToday() {
  const h = state.pomodoro.history || {};
  return h[todayStr()] || 0;
}
function pomoSummary() {
  if (!timer.total) resetTimerState();
  const label = timer.mode === 'work' ? '专注' : '小憩';
  return '<div class="pomo-mini">' +
    '<div class="pomo-ring-mini">' + ringSvg(timer.remain, timer.total, 96, 7) +
    '<span class="pomo-time-mini" id="pomoMiniTime">' + timeFmt(timer.remain) + '</span></div>' +
    '<div class="pomo-meta">' +
    '<span class="m-line">' + label + ' · ' + timeFmt(timer.total) + '</span>' +
    '<span class="m-line">今日专注 <b>' + pomoCountToday() + '</b> 个番茄</span>' +
    '<button class="btn btn-sm" data-act="quick">' + (timer.running ? '暂停' : (timer.remain < timer.total ? '继续' : '开始')) + '</button>' +
    '</div></div>';
}
function pomoCardBind(card) {
  card.querySelector('[data-act="quick"]').addEventListener('click', () => {
    togglePomo();
    renderDashboard();
  });
}
function togglePomo() {
  if (timer.running) {
    timer.running = false;
    if (timer.iv) clearInterval(timer.iv);
    toast('已暂停');
  } else {
    timer.running = true;
    if (!timer.iv) timer.iv = setInterval(pomoTick, 1000);
    toast('开始' + (timer.mode === 'work' ? '专注' : '小憩') + '，加油');
  }
  renderDashboard();
  if (currentModal && currentModal.id === 'pomodoro') renderPomoView();
}
function pomoTick() {
  if (!timer.running) return;
  timer.remain--;
  if (timer.remain <= 0) pomoComplete();
  else {
    const tEl = $('#pomoTime');
    if (tEl) tEl.textContent = timeFmt(timer.remain);
    const ringEl = $('#pomoRing');
    if (ringEl) {
      const c = 2 * Math.PI * ((280 - 10) / 2);
      ringEl.style.strokeDashoffset = (c * (1 - timer.remain / timer.total)).toFixed(1);
    }
    const mini = $('#pomoMiniTime');
    if (mini) mini.textContent = timeFmt(timer.remain);
  }
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    o.start(); o.stop(ctx.currentTime + 1.4);
  } catch (e) { /* 忽略音频不可用 */ }
}
function pomoComplete() {
  if (!state.pomodoro.history) state.pomodoro.history = {};
  if (timer.mode === 'work') {
    state.pomodoro.history[todayStr()] = (state.pomodoro.history[todayStr()] || 0) + 1;
    beep(); setTimeout(beep, 450);
    toast('专注完成，休息一下吧', 'ok');
  } else {
    toast('小憩结束，回到专注');
  }
  timer.mode = timer.mode === 'work' ? 'short' : 'work';
  timer.total = timerTotal();
  timer.remain = timer.total;
  timer.running = false;
  if (timer.iv) clearInterval(timer.iv);
  timer.iv = null;
  save();
  renderDashboard();
  if (currentModal && currentModal.id === 'pomodoro') renderPomoView();
}
function pomoView() {
  if (!timer.total) resetTimerState();
  const label = timer.mode === 'work' ? '专注' : '小憩';
  const r = (280 - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - timer.remain / timer.total);
  const week = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    week.push({ date: todayStr(d), n: (state.pomodoro.history || {})[todayStr(d)] || 0 });
  }
  const max = Math.max(1, ...week.map(w => w.n));
  return '<div class="pomo-view">' +
    '<div class="pomo-ring-big">' +
    '<svg viewBox="0 0 280 280">' +
    '<circle cx="140" cy="140" r="' + r + '" class="ring-track" stroke-width="10"/>' +
    '<circle id="pomoRing" cx="140" cy="140" r="' + r + '" class="ring-bar" stroke-width="10" ' +
    'style="stroke-dasharray:' + c.toFixed(1) + ';stroke-dashoffset:' + off.toFixed(1) + '"/>' +
    '</svg>' +
    '<div class="pomo-center">' +
    '<span class="pomo-mode">' + label + '</span>' +
    '<span class="pomo-time" id="pomoTime">' + timeFmt(timer.remain) + '</span>' +
    '<span class="pomo-sub">今日 ' + pomoCountToday() + ' 个番茄</span>' +
    '</div></div>' +
    '<div class="pomo-ctrls">' +
    '<button class="pomo-start" data-act="start" title="开始/暂停">' + (timer.running ? ICONS.close : ICONS.check) + '</button>' +
    '<button class="btn" data-act="reset">重置</button>' +
    '<button class="btn" data-act="skip">跳过</button>' +
    '</div>' +
    '<div class="pomo-settings">' +
    '<label class="field">专注（分钟）<input type="number" id="pomoWork" min="1" max="120" value="' + state.pomodoro.workMin + '"></label>' +
    '<label class="field">小憩（分钟）<input type="number" id="pomoShort" min="1" max="60" value="' + state.pomodoro.shortMin + '"></label>' +
    '<button class="btn btn-primary" data-act="apply">应用</button>' +
    '</div>' +
    '<div class="pomo-week">' + week.map(w =>
      '<div class="wk-col"><span>' + wdCN(w.date).slice(0, 1) + '</span>' +
      '<span class="wk-bar" style="height:' + Math.max(3, Math.round(w.n / max * 56)) + 'px"></span>' +
      '<span>' + w.n + '</span></div>').join('') +
    '</div></div>';
}
function renderPomoView() {
  const body = $('#modalBody');
  if (!body || body.dataset.view !== 'pomodoro') return;
  const oldOpts = currentModal ? currentModal.opts : {};
  body.innerHTML = pomoView();
  pomoBind(body, oldOpts);
}
function pomoBind(root) {
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'start') {
      togglePomo();
    } else if (act === 'reset') {
      timer.running = false;
      if (timer.iv) clearInterval(timer.iv);
      timer.iv = null;
      resetTimerState();
      renderDashboard();
      renderPomoView();
      toast('计时器已重置');
    } else if (act === 'skip') {
      timer.running = false;
      if (timer.iv) clearInterval(timer.iv);
      timer.iv = null;
      timer.mode = timer.mode === 'work' ? 'short' : 'work';
      timer.total = timerTotal();
      timer.remain = timer.total;
      renderDashboard();
      renderPomoView();
      toast('已切换到' + (timer.mode === 'work' ? '专注' : '小憩'));
    } else if (act === 'apply') {
      const w = parseInt(root.querySelector('#pomoWork').value, 10);
      const s = parseInt(root.querySelector('#pomoShort').value, 10);
      if (!w || !s || w < 1 || w > 120 || s < 1 || s > 60) { toast('请输入有效的分钟数'); return; }
      state.pomodoro.workMin = w;
      state.pomodoro.shortMin = s;
      save();
      resetTimerState();
      renderDashboard();
      renderPomoView();
      toast('时长设置已应用', 'ok');
    }
  });
}

/* ==========================================================
   模块 · 习惯打卡
   ========================================================== */
function habitWeek() {
  const arr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(todayStr(d));
  }
  return arr;
}
function habitStreak(h) {
  let n = 0;
  const d = new Date();
  if (!h.dates.includes(todayStr(d))) d.setDate(d.getDate() - 1);
  while (h.dates.includes(todayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function habitsSummary() {
  const total = state.habits.length;
  const doneToday = state.habits.filter(h => h.dates.includes(todayStr())).length;
  const pct = total ? Math.round(doneToday / total * 100) : 0;
  const rows = state.habits.slice(0, 4).map(h => {
    const on = h.dates.includes(todayStr());
    return '<li><span class="hab-dot" style="background:' + esc(h.color) + '"></span>' +
      '<span class="hab-name">' + esc(h.name) + '</span>' +
      '<span class="hab-st ' + (on ? 'is-on' : '') + '">' + (on ? '今日完成' : '未打卡') + '</span>' +
      '<span class="hab-st">连击 ' + habitStreak(h) + '</span></li>';
  }).join('');
  return '<div class="hab-mini">' +
    '<div class="hab-ring">' + ringSvg(pct, 100, 76, 7) +
    '<span class="pct">' + pct + '%</span></div>' +
    '<ul class="hab-list">' + (rows || '<li style="color:var(--ink-faint)">还没有习惯，点右上角添加</li>') + '</ul></div>';
}
function habitsView() {
  const week = habitWeek();
  const ths = week.map(d => '<th><div class="wday">' + wdCN(d) + '</div><div>' + fmtCN(d) + '</div></th>').join('');
  const rows = state.habits.map(h =>
    '<tr data-id="' + h.id + '">' +
    '<td><div class="hab-col-name"><span class="hab-dot" style="background:' + esc(h.color) + '"></span>' +
    '<span>' + esc(h.name) + '</span></div></td>' +
    week.map(d => {
      const on = h.dates.includes(d);
      return '<td><button class="hab-cell ' + (on ? 'is-on' : '') + (d === todayStr() ? ' is-today' : '') +
        '" data-act="tap" data-h="' + h.id + '" data-d="' + d + '">' + ICONS.check + '</button></td>';
    }).join('') +
    '<td><span class="hab-streak">连击 ' + habitStreak(h) + ' 天</span></td>' +
    '<td><button class="mini-act" data-act="del" data-h="' + h.id + '" title="删除习惯">' + ICONS.trash + '</button></td>' +
    '</tr>').join('');
  return '<div class="view-stack">' +
    '<div class="hab-add">' +
    '<input type="text" id="habInput" class="input-grow" placeholder="新习惯，如：冥想 15 分钟" maxlength="30">' +
    '<div class="swatches" id="habSwatches">' + HABIT_COLORS.map((c, i) =>
      '<span class="sw ' + (i === 0 ? 'is-on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') + '</div>' +
    '<button class="btn btn-primary" data-act="add">' + ICONS.plus + '添加</button>' +
    '</div>' +
    '<div class="hab-table"><table><thead><tr><th style="text-align:left;min-width:130px">习惯</th>' + ths +
    '<th>连续</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="9" style="color:var(--ink-faint);text-align:center;padding:16px">还没有习惯，先添加一个吧</td></tr>') + '</tbody></table></div>' +
    '<div class="mini-foot">点击日期格子即可打卡 · 金色圆点标记今天</div></div>';
}
function habitsBind(root) {
  root.querySelectorAll('#habSwatches .sw').forEach(sw => {
    sw.addEventListener('click', () => {
      root.querySelectorAll('#habSwatches .sw').forEach(x => x.classList.remove('is-on'));
      sw.classList.add('is-on');
    });
  });
  root.querySelector('[data-act="add"]').addEventListener('click', () => {
    const name = root.querySelector('#habInput').value.trim();
    if (!name) { toast('写下习惯名称'); return; }
    const color = root.querySelector('#habSwatches .sw.is-on').dataset.c;
    state.habits.push({ id: uid(), name: name, color: color, dates: [] });
    save(); toast('习惯已添加', 'ok');
    openModal('habits');
  });
  root.querySelector('#habInput').addEventListener('keydown', e => { if (e.key === 'Enter') root.querySelector('[data-act="add"]').click(); });
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'tap') {
      const h = state.habits.find(x => x.id === btn.dataset.h);
      if (!h) return;
      const d = btn.dataset.d;
      const i = h.dates.indexOf(d);
      if (i >= 0) h.dates.splice(i, 1); else h.dates.push(d);
      save(); renderDashboard(); openModal('habits');
    } else if (btn.dataset.act === 'del') {
      state.habits = state.habits.filter(x => x.id !== btn.dataset.h);
      save(); toast('已删除习惯'); renderDashboard(); openModal('habits');
    }
  });
}

/* ==========================================================
   模块 · 日历天气
   ========================================================== */
let calCursor = null;
function calKey(y, m) { return y + '-' + m; }
function monthInfo(y, m) {
  const first = new Date(y, m, 1);
  const start = (first.getDay() + 6) % 7; // 周一开头
  const days = new Date(y, m + 1, 0).getDate();
  return { start: start, days: days };
}
function calendarSummary() {
  const t = todayStr();
  const d = new Date();
  const now = weather.now.code == null ? ['cloud', '—'] : wmoInfo(weather.now.code);
  const days3 = weather.daily.slice(0, 3);
  return '<div class="cal-mini">' +
    '<div class="cal-today-row">' +
    '<span class="big-date">' + d.getDate() + '</span>' +
    '<span class="big-meta"><span>' + (d.getMonth() + 1) + ' 月 · 星期' + WEEK_CN[d.getDay()] + '</span>' +
    '<span class="mini-weather">' + WEATHER_ICONS[now[0]] + '<b>' + (weather.now.t != null ? weather.now.t + '°' : '—') + '</b>' + now[1] + '</span></span>' +
    '</div>' +
    '<div class="mini-days">' + (days3.length ? days3.map(dy => {
      const info = wmoInfo(dy.code);
      return '<span class="day-chip"><b>' + wdCN(dy.date) + '</b>' + WEATHER_ICONS[info[0]] +
        '<span>' + dy.max + '°/' + dy.min + '°</span></span>';
    }).join('') : '<span class="day-chip">天气加载中</span>') + '</div></div>';
}
function calendarView() {
  const base = calCursor ? new Date(calCursor.y, calCursor.m, 1) : new Date();
  const y = base.getFullYear(), m = base.getMonth();
  const info = monthInfo(y, m);
  const today = todayStr();
  let cells = '';
  for (let i = 0; i < info.start; i++) cells += '<span class="cal-day is-empty"></span>';
  for (let d = 1; d <= info.days; d++) {
    const ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const isToday = ds === today;
    const marked = state.todos.some(t => t.date === ds && !t.done) || state.habits.some(h => h.dates.includes(ds));
    cells += '<span class="cal-day ' + (isToday ? 'is-today' : '') + (marked ? ' is-marked' : '') + '">' + d + '</span>';
  }
  const wdHead = WEEK_CN.map(w => '<span class="cal-wd">' + w + '</span>').join('');
  const strip = weather.daily.map(dy => {
    const info = wmoInfo(dy.code);
    const isT = dy.date === today;
    return '<div class="w-chip' + (isT ? ' is-today' : '') + '">' +
      '<span class="wd">' + (isT ? '今天' : wdCN(dy.date)) + '</span>' +
      WEATHER_ICONS[info[0]] +
      '<span class="wt">' + dy.max + '°</span>' +
      '<span class="wl">' + dy.min + '° ' + info[1] + '</span></div>';
  }).join('');
  return '<div class="cal-view">' +
    '<div class="cal-nav">' +
    '<button class="btn btn-sm" data-act="prev">‹ 上月</button>' +
    '<h3>' + y + ' 年 ' + (m + 1) + ' 月</h3>' +
    '<button class="btn btn-sm" data-act="next">下月 ›</button>' +
    '<button class="btn btn-sm" data-act="today">回到今天</button>' +
    '</div>' +
    '<div class="cal-grid">' + wdHead + cells + '</div>' +
    '<div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">' +
    '<span style="font-family:var(--serif);font-weight:700;font-size:14px">未来 7 天 · ' + esc(state.weather.city) + '</span>' +
    '<button class="btn btn-sm" data-act="city">切换城市</button>' +
    '</div>' +
    '<div class="weather-strip">' + (strip || '<span>天气加载中</span>') + '</div>' +
    (weather.isDemo ? '<p style="font-size:11.5px;color:var(--ink-faint);margin-top:6px">当前为离线示例天气，联网后自动更新</p>' : '') +
    '</div>' +
    '<div class="mini-foot">· 圆点表示有待办或打卡记录的日期 · 天气数据来自 Open-Meteo</div></div>';
}
function renderCalendarView() {
  const body = $('#modalBody');
  if (!body || body.dataset.view !== 'calendar') return;
  body.innerHTML = calendarView();
  calendarBind(body);
}
function calendarBind(root) {
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'prev' || act === 'next' || act === 'today') {
      const base = calCursor ? new Date(calCursor.y, calCursor.m, 1) : new Date();
      let y = base.getFullYear(), m = base.getMonth();
      if (act === 'prev') { m--; if (m < 0) { m = 11; y--; } }
      else if (act === 'next') { m++; if (m > 11) { m = 0; y++; } }
      else { calCursor = null; }
      if (act !== 'today') calCursor = { y: y, m: m };
      renderCalendarView();
    } else if (act === 'city') {
      openCityPop();
    }
  });
}

/* ==========================================================
   模块 · 网页链接快捷导航
   ========================================================== */
function linkTileHtml(l) {
  return '<div class="link-card" data-id="' + l.id + '" title="' + esc(l.url) + '">' +
    '<div class="lc-ico" style="background:' + esc(l.color) + '">' + esc((l.name || '?').slice(0, 1).toUpperCase()) + '</div>' +
    '<span class="lc-name">' + esc(l.name) + '</span>' +
    '<span class="lc-url">' + esc((l.url || '').replace(/^https?:\/\//, '').split('/')[0]) + '</span>' +
    '<span class="lc-act">' +
    '<button class="mini-act" data-act="edit" data-id="' + l.id + '" title="编辑">' + ICONS.pencil + '</button>' +
    '<button class="mini-act" data-act="del" data-id="' + l.id + '" title="删除">' + ICONS.trash + '</button>' +
    '</span></div>';
}
function linkMiniHtml(l) {
  return '<div class="link-tile" data-id="' + l.id + '" title="' + esc(l.url) + '">' +
    '<span class="link-ico" style="background:' + esc(l.color) + '">' + esc((l.name || '?').slice(0, 1).toUpperCase()) + '</span>' +
    '<span class="link-name">' + esc(l.name) + '</span></div>';
}
function linksSummary() {
  const tiles = state.links.slice(0, 6).map(linkMiniHtml).join('');
  return '<div class="links-mini">' +
    '<div class="links-tiles">' + (tiles || '<span style="color:var(--ink-faint);font-size:13px">还没有快捷链接</span>') + '</div>' +
    '<div class="mini-foot"><span>共 ' + state.links.length + ' 个链接</span><span>点击打开 · 右上角进入管理</span></div></div>';
}
function linksCardBind(card) {
  card.querySelectorAll('.link-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const l = state.links.find(x => x.id === tile.dataset.id);
      if (l) window.open(l.url, '_blank', 'noopener');
    });
  });
}
function linksView() {
  const cats = ['全部'].concat(Array.from(new Set(state.links.map(l => l.cat || '其他'))));
  return '<div class="links-view">' +
    '<div class="cat-filter" id="catFilter">' + cats.map((c, i) =>
      '<button class="chip ' + (i === 0 ? 'is-on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
    '<div class="link-grid" id="linkGrid">' + state.links.map(linkTileHtml).join('') +
    (state.links.length ? '' : '<span style="color:var(--ink-faint)">还没有快捷链接，先添加一个吧</span>') + '</div>' +
    '<div class="form-row" style="background:var(--card-soft);border:1px solid var(--line);border-radius:11px;padding:12px">' +
    '<input type="text" id="linkName" class="input-grow" placeholder="名称，如：GitHub" maxlength="30">' +
    '<input type="text" id="linkUrl" class="input-grow" placeholder="网址 https://…" maxlength="200">' +
    '<input type="text" id="linkCat" class="input-grow" placeholder="分类，如：学习" maxlength="12" style="max-width:120px">' +
    '<div class="swatches" id="linkSwatches">' + PALETTE.slice(0, 6).map((c, i) =>
      '<span class="sw ' + (i === 0 ? 'is-on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') + '</div>' +
    '<button class="btn btn-primary" data-act="add">' + ICONS.plus + '添加</button>' +
    '</div></div>';
}
function linksBind(root, opts) {
  root.querySelectorAll('#linkSwatches .sw').forEach(sw => {
    sw.addEventListener('click', () => {
      root.querySelectorAll('#linkSwatches .sw').forEach(x => x.classList.remove('is-on'));
      sw.classList.add('is-on');
    });
  });
  function doAdd() {
    const name = root.querySelector('#linkName').value.trim();
    const url = root.querySelector('#linkUrl').value.trim();
    if (!name || !url) { toast('名称和网址都要填哦'); return; }
    const full = /^https?:\/\//i.test(url) ? url : 'https://' + url;
    state.links.push({
      id: uid(), name: name, url: full,
      cat: root.querySelector('#linkCat').value.trim() || '其他',
      color: root.querySelector('#linkSwatches .sw.is-on').dataset.c
    });
    save(); toast('链接已添加', 'ok'); openModal('links', { q: opts.q });
  }
  root.querySelector('[data-act="add"]').addEventListener('click', doAdd);
  root.querySelector('#linkUrl').addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  if (opts && opts.q) { root.querySelector('#linkName').value = opts.q; }
  root.addEventListener('click', e => {
    const actEl = e.target.closest('[data-act]');
    if (actEl && actEl.dataset.act === 'add') return;
    const tile = e.target.closest('.link-card');
    if (tile && !e.target.closest('[data-act]')) {
      const l = state.links.find(x => x.id === tile.dataset.id);
      if (l) window.open(l.url, '_blank', 'noopener');
      return;
    }
    if (!actEl) return;
    const act = actEl.dataset.act;
    if (act === 'edit') {
      const l = state.links.find(x => x.id === actEl.dataset.id);
      if (!l) return;
      const name = window.prompt('链接名称', l.name);
      if (name == null) return;
      const url = window.prompt('链接网址', l.url);
      if (url == null) return;
      const cat = window.prompt('分类', l.cat || '');
      l.name = name.trim() || l.name;
      l.url = /^https?:\/\//i.test(url.trim()) ? url.trim() : 'https://' + url.trim();
      l.cat = cat.trim() || '其他';
      save(); toast('已更新'); openModal('links', { q: opts.q });
    } else if (act === 'del') {
      state.links = state.links.filter(x => x.id !== actEl.dataset.id);
      save(); toast('已删除'); openModal('links', { q: opts.q });
    }
  });
  root.querySelectorAll('#catFilter .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      root.querySelectorAll('#catFilter .chip').forEach(x => x.classList.remove('is-on'));
      ch.classList.add('is-on');
      const cat = ch.dataset.cat;
      root.querySelectorAll('#linkGrid .link-card').forEach(card => {
        const l = state.links.find(x => x.id === card.dataset.id);
        card.style.display = (cat === '全部' || (l && (l.cat || '其他') === cat)) ? '' : 'none';
      });
    });
  });
}

/* ==========================================================
   模块 · 阅读书架
   ========================================================== */
const STATUS_CN = { reading: '在读', planned: '想读', finished: '读完' };
function spineHtml(b, cls) {
  const h = Math.max(56, Math.min(96, 40 + b.progress * 0.5));
  return '<div class="spine ' + cls + '" data-id="' + b.id + '" title="' + esc(b.title) + '" style="background:' + esc(b.color) + ';height:' + h + 'px">' +
    '<span class="sp-title">' + esc(b.title) + '</span></div>';
}
function booksSummary() {
  const reading = state.books.filter(b => b.status === 'reading').length;
  const planned = state.books.filter(b => b.status === 'planned').length;
  const finished = state.books.filter(b => b.status === 'finished').length;
  const spines = state.books.slice(0, 6).map(b => spineHtml(b, b.status === 'reading' ? 'is-reading' : '')).join('');
  return '<div class="books-mini">' +
    '<div class="shelf">' + (spines || '<span style="color:var(--ink-faint);font-size:12.5px">书架还空着，去添几本书吧</span>') + '</div>' +
    '<div class="books-mini-foot"><span>在读 <b>' + reading + '</b></span><span>想读 <b>' + planned + '</b></span><span>读完 <b>' + finished + '</b></span></div></div>';
}
function booksCardBind(card) {
  card.querySelectorAll('.spine').forEach(sp => {
    sp.addEventListener('click', () => openModal('books'));
  });
}
function booksView() {
  const spines = state.books.map(b => spineHtml(b, 'spine-full sp-' + b.status + (b.status === 'reading' ? '' : ''))).join('');
  const detail = state.books[0]
    ? '<div class="book-detail" id="bookDetail">' + bookDetailHtml(state.books[0]) + '</div>'
    : '';
  return '<div class="books-view">' +
    '<div class="shelf-full" id="shelfFull">' + (spines || '<span style="color:var(--ink-faint)">书架空空如也</span>') + '</div>' +
    (detail ? detail : '') +
    '<div class="form-row" style="background:var(--card-soft);border:1px solid var(--line);border-radius:11px;padding:12px">' +
    '<input type="text" id="bkTitle" class="input-grow" placeholder="书名" maxlength="40">' +
    '<input type="text" id="bkAuthor" class="input-grow" placeholder="作者" maxlength="30" style="max-width:150px">' +
    '<select id="bkStatus"><option value="reading">在读</option><option value="planned">想读</option><option value="finished">读完</option></select>' +
    '<div class="swatches" id="bkSwatches">' + PALETTE.map((c, i) =>
      '<span class="sw ' + (i === 0 ? 'is-on' : '') + '" data-c="' + c + '" style="background:' + c + '"></span>').join('') + '</div>' +
    '<button class="btn btn-primary" data-act="add">' + ICONS.plus + '上架</button>' +
    '</div></div>';
}
function bookDetailHtml(b) {
  return '<div>' +
    '<div class="bd-title">' + esc(b.title) + '</div>' +
    '<div class="bd-author">' + esc(b.author || '佚名') + ' · ' + (STATUS_CN[b.status] || b.status) + '</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<div class="bd-row"><input type="range" id="bkProg" min="0" max="100" value="' + b.progress + '">' +
    '<span class="bd-progress-label" id="bkProgLabel">' + b.progress + '%</span></div>' +
    '<div class="bd-row">' +
    '<select id="bkStatusSel">' + Object.keys(STATUS_CN).map(k => '<option value="' + k + '"' + (b.status === k ? ' selected' : '') + '>' + STATUS_CN[k] + '</option>').join('') + '</select>' +
    '<button class="btn btn-danger btn-sm" data-act="delBook" data-id="' + b.id + '">' + ICONS.trash + '下架</button>' +
    '</div></div>';
}
function booksBind(root) {
  root.querySelectorAll('#bkSwatches .sw').forEach(sw => {
    sw.addEventListener('click', () => {
      root.querySelectorAll('#bkSwatches .sw').forEach(x => x.classList.remove('is-on'));
      sw.classList.add('is-on');
    });
  });
  function doAdd() {
    const title = root.querySelector('#bkTitle').value.trim();
    if (!title) { toast('书名不能为空'); return; }
    state.books.push({
      id: uid(), title: title,
      author: root.querySelector('#bkAuthor').value.trim(),
      status: root.querySelector('#bkStatus').value,
      progress: 0,
      color: root.querySelector('#bkSwatches .sw.is-on').dataset.c
    });
    save(); toast('已上架：《' + title + '》', 'ok');
    openModal('books');
  }
  root.querySelector('[data-act="add"]').addEventListener('click', doAdd);
  root.querySelector('#bkTitle').addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  root.querySelector('#shelfFull').addEventListener('click', e => {
    const sp = e.target.closest('.spine-full');
    if (!sp) return;
    const b = state.books.find(x => x.id === sp.dataset.id);
    if (!b) return;
    root.querySelectorAll('.spine-full').forEach(x => x.classList.remove('is-selected'));
    sp.classList.add('is-selected');
    const detail = root.querySelector('#bookDetail');
    if (detail) detail.innerHTML = bookDetailHtml(b);
    bindBookDetail(root, b);
  });
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act="delBook"]');
    if (!btn) return;
    state.books = state.books.filter(x => x.id !== btn.dataset.id);
    save(); toast('已下架'); renderDashboard(); openModal('books');
  });
  if (state.books[0]) bindBookDetail(root, state.books[0]);
}
function bindBookDetail(root, b) {
  const range = root.querySelector('#bkProg');
  if (range) {
    range.addEventListener('input', () => {
      const label = root.querySelector('#bkProgLabel');
      if (label) label.textContent = range.value + '%';
      const sp = root.querySelector('.spine-full[data-id="' + b.id + '"]');
      if (sp) sp.style.height = Math.max(56, Math.min(120, 40 + (+range.value) * 0.6)) + 'px';
    });
    range.addEventListener('change', () => {
      b.progress = +range.value; save(); renderDashboard();
      toast('进度已更新为 ' + b.progress + '%', 'ok');
    });
  }
  const sel = root.querySelector('#bkStatusSel');
  if (sel) {
    sel.addEventListener('change', () => {
      b.status = sel.value;
      save(); renderDashboard();
      const sp = root.querySelector('.spine-full[data-id="' + b.id + '"]');
      if (sp) { sp.className = 'spine-full sp-' + b.status; }
      toast('状态已更新');
    });
  }
}

/* ==========================================================
   模块 · 书摘金句库
   ========================================================== */
function quoteCardHtml(q) {
  return '<div class="quote-card" data-id="' + q.id + '">' +
    '<div class="q-text">“' + esc(q.text) + '”</div>' +
    '<div class="q-meta"><span>— ' + esc(q.book || '无名') + (q.author ? ' · ' + esc(q.author) : '') + '</span>' +
    (q.tags && q.tags.length ? q.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join('') : '') + '</div>' +
    '<span class="q-acts">' +
    '<button class="mini-act" data-act="copy" data-id="' + q.id + '" title="复制">' + ICONS.copy + '</button>' +
    '<button class="mini-act" data-act="delq" data-id="' + q.id + '" title="删除">' + ICONS.trash + '</button></span></div>';
}
function quotesSummary() {
  const pick = state.quotes.length ? state.quotes[Math.floor(Math.random() * state.quotes.length)] : null;
  if (!pick) return '<div style="color:var(--ink-faint);font-size:13px">摘录一段让你心动的话吧</div>';
  return '<div class="quote-mini">' +
    '<button class="q-reload" data-act="qreload" title="换一句">' + ICONS.refresh + '</button>' +
    '<div class="q-text">“' + esc(pick.text) + '”</div>' +
    '<div class="q-cite">— ' + esc(pick.book || '无名') + '</div></div>';
}
function quotesCardBind(card) {
  const btn = card.querySelector('[data-act="qreload"]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const body = card.querySelector('.card-body');
    body.innerHTML = quotesSummary();
    quotesCardBind(card);
  });
}
function quotesView() {
  return '<div class="quotes-view">' +
    '<div class="form-row">' +
    '<input type="text" id="qSearch" class="input-grow" placeholder="筛选摘录、书名或标签…">' +
    '</div>' +
    '<div class="form-row" style="background:var(--card-soft);border:1px solid var(--line);border-radius:11px;padding:12px">' +
    '<textarea id="qText" class="input-grow" rows="2" placeholder="写下一句打动你的话…" maxlength="300" style="min-width:220px;resize:vertical"></textarea>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;flex:1">' +
    '<input type="text" id="qBook" class="input-grow" placeholder="出自哪本书" maxlength="40">' +
    '<input type="text" id="qAuthor" class="input-grow" placeholder="作者（可选）" maxlength="30" style="max-width:140px">' +
    '<input type="text" id="qTags" class="input-grow" placeholder="标签，逗号分隔" maxlength="40" style="max-width:160px">' +
    '<button class="btn btn-primary" data-act="addq">' + ICONS.plus + '收录</button>' +
    '</div></div>' +
    '<div id="quoteList" class="view-stack">' + state.quotes.map(quoteCardHtml).join('') +
    (state.quotes.length ? '' : '<span style="color:var(--ink-faint)">金句库还空着</span>') + '</div>' +
    '<div class="mini-foot">共收录 ' + state.quotes.length + ' 条摘录</div></div>';
}
function quotesBind(root, opts) {
  function renderQuotes(q) {
    const list = root.querySelector('#quoteList');
    const kw = (q || '').trim().toLowerCase();
    const arr = state.quotes.filter(it => {
      if (!kw) return true;
      return (it.text + ' ' + (it.book || '') + ' ' + (it.author || '') + ' ' + (it.tags || []).join(' ')).toLowerCase().includes(kw);
    });
    list.innerHTML = arr.map(quoteCardHtml).join('') || '<span style="color:var(--ink-faint)">没有匹配的摘录</span>';
  }
  function doAdd() {
    const text = root.querySelector('#qText').value.trim();
    if (!text) { toast('摘录内容不能为空'); return; }
    const tags = root.querySelector('#qTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
    state.quotes.unshift({ id: uid(), text: text, book: root.querySelector('#qBook').value.trim(), author: root.querySelector('#qAuthor').value.trim(), tags: tags, createdAt: todayStr() });
    save(); toast('已收录一条摘录', 'ok');
    openModal('quotes', { q: opts.q });
  }
  root.querySelector('[data-act="addq"]').addEventListener('click', doAdd);
  root.querySelector('#qSearch').addEventListener('input', e => renderQuotes(e.target.value));
  if (opts && opts.q) { root.querySelector('#qSearch').value = opts.q; renderQuotes(opts.q); }
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'copy') {
      const q = state.quotes.find(x => x.id === btn.dataset.id);
      if (!q) return;
      const text = '“' + q.text + '”——' + (q.book || '') + (q.author ? ' ' + q.author : '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板', 'ok')).catch(() => toast('复制失败'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('已复制到剪贴板', 'ok'); } catch (e2) { toast('复制失败'); }
        ta.remove();
      }
    } else if (btn.dataset.act === 'delq') {
      state.quotes = state.quotes.filter(x => x.id !== btn.dataset.id);
      save(); toast('已删除'); renderDashboard(); openModal('quotes', { q: opts.q });
    }
  });
}

/* ==========================================================
   模块 · 单词本与间隔复习（简化 SM-2）
   ========================================================== */
function wordStage(w) {
  if (w.reps >= 6) return '熟练';
  if (w.reps >= 1) return '学习中';
  return '新词';
}
function dueWords() {
  const t = todayStr();
  return state.words.filter(w => w.due <= t).sort((a, b) => a.due.localeCompare(b.due));
}
function wordsSummary() {
  const due = dueWords().length;
  const total = state.words.length;
  const done = Math.max(0, total - due);
  const pct = total ? Math.round(done / total * 100) : 0;
  return '<div class="words-mini">' +
    '<div class="words-stat"><span class="big">' + due + '<small> / ' + total + '</small></span>' +
    '<span class="sub">今日到期待复习</span>' +
    '<div class="prog"><i style="width:' + pct + '%"></i></div></div>' +
    '<button class="btn btn-primary btn-sm" data-act="review">' + ICONS.abc + '去复习</button></div>';
}
function wordsCardBind(card) {
  card.querySelector('[data-act="review"]').addEventListener('click', () => openModal('words', { tab: 'review' }));
}
function wordsView(opts) {
  const tab = (opts && opts.tab) || 'review';
  const due = dueWords();
  const next = due[0];
  let reviewPane;
  if (!state.words.length) {
    reviewPane = '<div class="review-done"><span class="r-icon">' + ICONS.abc + '</span><h4>单词本还是空的</h4><p style="color:var(--ink-soft);font-size:13px">先在「单词表」里添加几个单词吧</p></div>';
  } else if (!next) {
    reviewPane = '<div class="review-done"><span class="r-icon">' + ICONS.star + '</span><h4>今日复习已完成</h4><p style="color:var(--ink-soft);font-size:13px">明天再来巩固吧</p></div>';
  } else {
    reviewPane = '<div class="review-card" data-id="' + next.id + '">' +
      '<span class="review-prog">今日剩余 ' + due.length + ' 个 · 第 ' + (due.length - due.indexOf(next)) + ' 个</span>' +
      '<div class="review-word">' + esc(next.word) + '</div>' +
      '<div class="review-meaning" id="rvMeaning" hidden><div>' + esc(next.meaning) + '</div>' +
      (next.example ? '<div class="review-example">例：' + esc(next.example) + '</div>' : '') + '</div>' +
      '<div class="review-acts" id="rvActs">' +
      '<button class="btn" data-act="show">显示释义</button>' +
      '</div></div>';
  }
  const rows = state.words.map(w =>
    '<tr data-k="' + esc((w.word + ' ' + w.meaning).toLowerCase()) + '"><td class="w-word">' + esc(w.word) + '</td><td>' + esc(w.meaning) + '</td>' +
    '<td class="w-stage"><span class="tag">' + wordStage(w) + '</span></td>' +
    '<td class="w-due">' + (w.due <= todayStr() ? '今天到期' : fmtCN(w.due)) + '</td>' +
    '<td style="text-align:right;white-space:nowrap"><button class="mini-act" data-act="delw" data-id="' + w.id + '" title="删除">' + ICONS.trash + '</button></td></tr>').join('');
  return '<div class="view-stack">' +
    '<div class="tabs">' +
    '<button data-tab="review" class="' + (tab === 'review' ? 'is-on' : '') + '">间隔复习</button>' +
    '<button data-tab="list" class="' + (tab === 'list' ? 'is-on' : '') + '">单词表</button>' +
    '</div>' +
    '<div id="reviewPane" style="display:' + (tab === 'review' ? '' : 'none') + '">' + reviewPane + '</div>' +
    '<div id="listPane" style="display:' + (tab === 'list' ? '' : 'none') + '">' +
    '<div class="form-row" style="margin-bottom:10px"><input type="text" id="wSearch" class="input-grow" placeholder="搜索单词或释义…"></div>' +
    '<div class="word-add">' +
    '<input type="text" id="wWord" placeholder="单词" maxlength="60">' +
    '<input type="text" id="wMeaning" placeholder="释义" maxlength="120">' +
    '<input type="text" id="wExample" class="span2" placeholder="例句（可选）" maxlength="200">' +
    '<button class="btn btn-primary span2" data-act="addw" style="justify-self:start">' + ICONS.plus + '添加单词</button>' +
    '</div>' +
    '<div class="word-table-wrap"><table class="word-table">' +
    '<thead><tr><th style="width:22%">单词</th><th>释义</th><th style="width:14%">阶段</th><th style="width:16%">下次复习</th><th style="width:10%"></th></tr></thead>' +
    '<tbody id="wordTbody">' + (rows || '<tr><td colspan="5" style="text-align:center;color:var(--ink-faint);padding:14px">还没有单词</td></tr>') + '</tbody>' +
    '</table></div>' +
    '<div class="mini-foot">复习规则：记得越牢，间隔越长（1→2→4→7→15→30 天）</div>' +
    '</div></div>';
}
function wordsBind(root, opts) {
  root.querySelectorAll('.tabs button').forEach(b => {
    b.addEventListener('click', () => {
      root.querySelectorAll('.tabs button').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      const t = b.dataset.tab;
      root.querySelector('#reviewPane').style.display = t === 'review' ? '' : 'none';
      root.querySelector('#listPane').style.display = t === 'list' ? '' : 'none';
    });
  });
  function doAddWord() {
    const word = root.querySelector('#wWord').value.trim();
    const meaning = root.querySelector('#wMeaning').value.trim();
    if (!word || !meaning) { toast('单词和释义都要填'); return; }
    state.words.unshift({ id: uid(), word: word, meaning: meaning, example: root.querySelector('#wExample').value.trim(), reps: 0, interval: 0, due: todayStr(), createdAt: todayStr() });
    save(); toast('已添加：' + word, 'ok');
    openModal('words', { tab: 'list', q: opts.q });
  }
  root.querySelector('[data-act="addw"]').addEventListener('click', doAddWord);
  const wSearch = root.querySelector('#wSearch');
  if (wSearch) {
    wSearch.addEventListener('input', e => {
      const kw = e.target.value.trim().toLowerCase();
      root.querySelectorAll('#wordTbody tr').forEach(tr => {
        tr.style.display = tr.dataset.k.includes(kw) ? '' : 'none';
      });
    });
  }
  if (opts && opts.q) { root.querySelector('#wWord').value = opts.q; }
  root.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'show') {
      const meaning = root.querySelector('#rvMeaning');
      if (!meaning) return;
      meaning.hidden = false;
      btn.style.display = 'none';
      const acts = root.querySelector('#rvActs');
      if (acts) {
        acts.innerHTML =
          '<button class="btn" data-act="grade" data-g="again" style="border-color:var(--danger);color:var(--danger)">忘记了</button>' +
          '<button class="btn" data-act="grade" data-g="hard">模糊</button>' +
          '<button class="btn btn-primary" data-act="grade" data-g="good">记得</button>' +
          '<button class="btn" data-act="grade" data-g="easy" style="background:var(--accent-soft);border-color:var(--accent)">很熟</button>';
      }
    } else if (act === 'grade') {
      const card = root.querySelector('.review-card');
      if (!card) return;
      const w = state.words.find(x => x.id === card.dataset.id);
      if (!w) return;
      const g = btn.dataset.g;
      if (g === 'again') { w.reps = 0; w.interval = 0; w.due = todayStr(); }
      else if (g === 'hard') { w.interval = Math.max(1, w.interval); w.due = addDays(todayStr(), 1); }
      else if (g === 'good') { w.reps = Math.min(w.reps + 1, INTERVALS.length - 1); w.interval = INTERVALS[w.reps]; w.due = addDays(todayStr(), w.interval); }
      else { w.reps = Math.min(w.reps + 2, INTERVALS.length - 1); w.interval = INTERVALS[w.reps]; w.due = addDays(todayStr(), w.interval); }
      save(); renderDashboard();
      openModal('words', { tab: 'review' });
    } else if (act === 'delw') {
      state.words = state.words.filter(x => x.id !== btn.dataset.id);
      save(); toast('已删除'); renderDashboard(); openModal('words', { tab: 'list' });
    }
  });
}

/* ==========================================================
   模块注册表
   ========================================================== */
const MODULES = {
  todo: { id: 'todo', title: '待办便签', icon: 'check', summary: todoSummary, view: todoView, bind: todoBind, cardBind: todoCardBind },
  pomodoro: { id: 'pomodoro', title: '番茄钟', icon: 'clock', summary: pomoSummary, view: pomoView, bind: pomoBind, cardBind: pomoCardBind },
  habits: { id: 'habits', title: '习惯打卡', icon: 'flag', summary: habitsSummary, view: habitsView, bind: habitsBind },
  calendar: { id: 'calendar', title: '日历天气', icon: 'calendar', summary: calendarSummary, view: calendarView, bind: calendarBind },
  links: { id: 'links', title: '网页导航', icon: 'link', summary: linksSummary, view: linksView, bind: linksBind, cardBind: linksCardBind },
  books: { id: 'books', title: '阅读书架', icon: 'book', summary: booksSummary, view: booksView, bind: booksBind, cardBind: booksCardBind },
  quotes: { id: 'quotes', title: '书摘金句', icon: 'quote', summary: quotesSummary, view: quotesView, bind: quotesBind, cardBind: quotesCardBind },
  words: { id: 'words', title: '单词本', icon: 'abc', summary: wordsSummary, view: wordsView, bind: wordsBind, cardBind: wordsCardBind }
};

/* ==========================================================
   全局搜索
   ========================================================== */
let searchOpen = false;
function hideSearch() {
  $('#searchResults').hidden = true;
  searchOpen = false;
}
function buildSearchIndex() {
  const idx = [];
  state.links.forEach(l => idx.push({ m: 'links', label: l.name, sub: (l.cat || '其他') + ' · ' + l.url, q: (l.name + ' ' + l.url + ' ' + (l.cat || '')).toLowerCase() }));
  state.todos.forEach(t => idx.push({ m: 'todo', label: t.text, sub: '待办 · ' + (t.done ? '已完成' : '进行中'), q: t.text.toLowerCase() }));
  state.habits.forEach(h => idx.push({ m: 'habits', label: h.name, sub: '习惯 · 连击 ' + habitStreak(h) + ' 天', q: h.name.toLowerCase() }));
  state.books.forEach(b => idx.push({ m: 'books', label: b.title, sub: (b.author || '佚名') + ' · ' + (STATUS_CN[b.status] || b.status), q: (b.title + ' ' + (b.author || '')).toLowerCase() }));
  state.quotes.forEach(q => idx.push({ m: 'quotes', label: q.text.slice(0, 40), sub: '书摘 · ' + (q.book || '无名'), q: (q.text + ' ' + (q.book || '') + ' ' + (q.tags || []).join(' ')).toLowerCase() }));
  state.words.forEach(w => idx.push({ m: 'words', label: w.word, sub: w.meaning.slice(0, 30), q: (w.word + ' ' + w.meaning).toLowerCase() }));
  return idx;
}
function runSearch(kw) {
  const box = $('#searchResults');
  if (!kw) { box.hidden = true; return; }
  const k = kw.toLowerCase();
  const hits = buildSearchIndex().filter(it => it.q.includes(k)).slice(0, 24);
  if (!hits.length) {
    box.innerHTML = '<div class="sr-empty">没有找到相关内容</div>';
  } else {
    const byModule = {};
    hits.forEach(h => { (byModule[h.m] = byModule[h.m] || []).push(h); });
    box.innerHTML = Object.keys(byModule).map(m =>
      '<div class="sr-group"><div class="sr-group-title">' + ICONS[MODULES[m].icon] + MODULES[m].title + '</div>' +
      byModule[m].map(h =>
        '<div class="sr-item" data-m="' + m + '" data-q="' + esc(h.label) + '">' +
        '<span class="sr-icon">' + ICONS[MODULES[m].icon] + '</span>' +
        '<span class="sr-main"><div class="sr-title">' + esc(h.label) + '</div><div class="sr-sub">' + esc(h.sub) + '</div></span>' +
        '</div>').join('') + '</div>'
    ).join('');
  }
  box.hidden = false;
  searchOpen = true;
}
function jumpSearch(e) {
  const item = e.target.closest('.sr-item');
  if (!item) return;
  const m = item.dataset.m;
  const q = item.dataset.q;
  hideSearch();
  $('#globalSearch').value = '';
  openModal(m, { q: q });
}
$('#globalSearch').addEventListener('input', e => {
  const kw = e.target.value.trim();
  runSearch(kw);
});
$('#searchResults').addEventListener('mousedown', e => e.preventDefault());
$('#searchResults').addEventListener('click', jumpSearch);
$('#globalSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = $('#searchResults .sr-item');
    if (first) first.click();
  }
});
document.addEventListener('click', e => {
  if (searchOpen && !e.target.closest('.search-wrap')) hideSearch();
});

/* ==========================================================
   设置与数据
   ========================================================== */
function settingsView() {
  const mods = Object.keys(MODULES).map(id => {
    const M = MODULES[id];
    const vis = !state.hidden[id];
    return '<div class="set-row"><span class="t-name">' + ICONS[M.icon] + M.title + '</span>' +
      '<span class="switch ' + (vis ? 'is-on' : '') + '" data-toggle="' + id + '"></span></div>';
  }).join('');
  return '<div class="settings-view">' +
    '<div class="set-block"><h4>显示模块（可拖拽排序，此处控制显隐）</h4>' + mods + '</div>' +
    '<div class="set-block"><h4>天气城市</h4>' +
    '<div class="form-row"><input type="text" id="setCity" class="input-grow" value="' + esc(state.weather.city) + '" placeholder="输入城市名">' +
    '<button class="btn btn-primary" data-act="setCity">保存城市</button></div></div>' +
    '<div class="set-block"><h4>数据备份</h4>' +
    '<div class="set-acts">' +
    '<button class="btn" data-act="export">' + ICONS.download + '导出备份（JSON）</button>' +
    '<label class="btn" style="cursor:pointer">' + ICONS.upload + '导入备份<input type="file" id="importFile" accept="application/json,.json" hidden></label>' +
    '<button class="btn btn-danger" data-act="reset">清空全部数据</button>' +
    '</div>' +
    '<p style="font-size:11.5px;color:var(--ink-faint);margin-top:9px">数据仅保存在本机浏览器（localStorage），不会上传。建议定期导出备份。</p></div>' +
    '<div class="mini-foot">书房工作台 v1.0 · 本地离线可用（天气需联网）</div></div>';
}
function settingsBind(root) {
  root.querySelectorAll('.switch').forEach(sw => {
    sw.addEventListener('click', () => {
      const id = sw.dataset.toggle;
      state.hidden[id] = !state.hidden[id];
      if (!state.hidden[id]) delete state.hidden[id];
      sw.classList.toggle('is-on', !state.hidden[id]);
      save(); renderDashboard();
      toast(state.hidden[id] ? '已隐藏：' + MODULES[id].title : '已显示：' + MODULES[id].title, 'ok');
    });
  });
  root.querySelector('[data-act="setCity"]').addEventListener('click', () => {
    const v = root.querySelector('#setCity').value.trim();
    if (!v) { toast('输入城市名'); return; }
    state.weather.city = v;
    state.weather.lat = null;
    state.weather.lon = null;
    save(); toast('已更新城市，正在获取天气…', 'ok');
    fetchWeather();
  });
  root.querySelector('[data-act="export"]').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '书房工作台-备份-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
    toast('已导出备份文件', 'ok');
  });
  const file = root.querySelector('#importFile');
  if (file) {
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          if (!data || typeof data !== 'object') throw new Error('bad');
          state = deepMerge(defaultState(), data);
          save(); renderDashboard(); toast('备份已导入', 'ok');
        } catch (e2) { toast('导入失败：文件格式不正确'); }
        file.value = '';
      };
      rd.readAsText(f);
    });
  }
  root.querySelector('[data-act="reset"]').addEventListener('click', () => {
    if (!window.confirm('确定清空全部数据吗？此操作不可恢复。')) return;
    try { localStorage.removeItem(DB_KEY); } catch (e) { /* 忽略 */ }
    state = defaultState();
    save(); renderDashboard(); toast('已恢复初始状态');
  });
}
function openSettings() {
  currentModal = { id: 'settings', opts: {} };
  $('#modalTitle').innerHTML = '<span class="t-icon">' + ICONS.gear + '</span>设置与数据';
  const body = $('#modalBody');
  body.dataset.view = 'settings';
  body.innerHTML = settingsView();
  settingsBind(body);
  $('#modalOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
$('#settingsBtn').addEventListener('click', openSettings);

/* ---------------- 顶栏：天气与城市浮层 ---------------- */
$('#weatherChip').addEventListener('click', () => {
  if ($('#cityPop').hidden) openCityPop(); else closeCityPop();
});
$('#cityOk').addEventListener('click', () => setCity($('#cityInput').value));
$('#cityCancel').addEventListener('click', closeCityPop);
$('#cityInput').addEventListener('keydown', e => { if (e.key === 'Enter') setCity($('#cityInput').value); });

/* ==========================================================
   初始化
   ========================================================== */
function init() {
  state = load() || defaultState();
  save();
  setGreeting();
  resetTimerState();
  renderDashboard();
  fetchWeather();
  // 若页面在后台，恢复番茄钟运行状态
  if (timer.running) {
    timer.iv = setInterval(pomoTick, 1000);
  }
  setInterval(() => {
    if (timer.running) return;
    setGreeting();
  }, 60000);
}
init();
