import { $, $$, html, raw, render, api, toast, closeTopModal, debounce, modal, invalidateApi, prefetchApi } from './lib.js';
import { t, initLang, getLang, setLang, setOverrides } from './i18n.js';
import { startEmbers, fpsMeter, sfx, soundOn, setSound } from './fx.js';
import { ICON, BRAND_MARK, avatar, tierChip, openProfile, openRankModal, setRanks, applyContent } from './components.js';
import { initTilt } from './tilt.js';
import { init3D } from './model3d.js';

const ROUTES = [
  { re: /^\/$/, page: 'leaderboard', tab: 'leaderboard' },
  { re: /^\/player\/(\d+)$/, page: 'leaderboard', tab: 'leaderboard', profile: true },
  { re: /^\/tournaments(?:\/(\d+))?$/, page: 'tournaments', tab: 'tournaments' },
  { re: /^\/matches$/, page: 'matches', tab: 'matches' },
  { re: /^\/register$/, page: 'register', tab: 'register' },
  { re: /^\/admin(?:\/([a-z]+))?(?:\/(\d+))?$/, page: 'admin', tab: 'admin' },
];

/*
 * The admin panel lives at a hidden address (e.g. /admin-3f9c…). Inside the app it is still "/admin";
 * these two helpers translate between the app path and the real address bar path.
 */
const PAGE_ADMIN_BASE = document.querySelector('meta[name="admin-base"]')?.content || null;
const adminBase = () => PAGE_ADMIN_BASE || state.meta?.admin_path || null;
export function realPath(path) {
  const base = adminBase();
  if (!base || !(path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?'))) return path;
  return base + path.slice(6);
}
function appPath(path) {
  const base = adminBase();
  if (base && (path === base || path.startsWith(`${base}/`))) return `/admin${path.slice(base.length)}`;
  // Without the hidden address, /admin is not a page.
  if (path === '/admin' || path.startsWith('/admin/')) return '/404';
  return path;
}
// Links rendered as /admin/… point at the hidden address (so "open in new tab" works too).
function fixAdminLinks(root) {
  if (!adminBase()) return;
  for (const a of root.querySelectorAll?.('a[href^="/admin"]') ?? []) {
    const href = a.getAttribute('href');
    const real = realPath(href);
    if (real !== href) a.setAttribute('href', real);
  }
}
new MutationObserver((list) => {
  for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) fixAdminLinks(n.parentNode ?? n);
}).observe(document.documentElement, { childList: true, subtree: true });

const TABS = [
  { id: 'leaderboard', href: '/', key: 'nav_leaderboard' },
  { id: 'tournaments', href: '/tournaments', key: 'nav_tournaments' },
  { id: 'matches', href: '/matches', key: 'nav_matches' },
  { id: 'register', href: '/register', key: 'nav_register' },
  { id: 'admin', href: '/admin', key: 'nav_admin', adminOnly: true },
];

const state = {
  meta: null,
  route: null,
  page: null,
  pageApi: null,
  fps: 60,
  latency: null,
  extraHints: [],
};

export const ctx = {
  get meta() { return state.meta; },
  navigate,
  refreshMeta,
  setHints(hints) {
    state.extraHints = hints ?? [];
    renderHints();
  },
  setAdminBadge(n) {
    state.adminPending = n;
    renderTabs();
  },
};

/* ---------------------------------------------------------------- theme (light / dark) */

const THEME_KEY = 'rein.theme';
const getTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable — the choice lasts for this page only
  }
  $('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0f1c' : '#232b45');
}
const THEME_ICON = {
  dark: raw('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>'),
  light: raw('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'),
};

/* ---------------------------------------------------------------- meta */

async function refreshMeta() {
  const started = performance.now();
  try {
    state.meta = await api('/meta');
    state.latency = Math.round(performance.now() - started);
    document.title = state.meta.settings.site_name;
    setOverrides(state.meta.settings.text_overrides);
    applyContent(state.meta.settings);
    setRanks(state.meta.ranks, state.meta.settings);
  } catch {
    state.meta ??= { settings: { site_name: 'REIN 1V1', season_name: '', default_lang: 'en', registration_open: false }, stats: {}, discord: {}, admin: false };
  }
  renderTabs();
  renderHud();
  renderHints();
  renderAnnouncement();
  return state.meta;
}

function renderAnnouncement() {
  const el = $('#announce');
  if (!el) return;
  const s = state.meta?.settings ?? {};
  const text = (getLang() === 'ar' ? s.announcement_ar || s.announcement_en : s.announcement_en || s.announcement_ar) || '';
  const show = s.announcement_on && text.trim();
  el.hidden = !show;
  if (show) render(el, html`<span class="ann-icon">${ICON.bolt}</span><span dir="auto">${text}</span>`);
}

/* ---------------------------------------------------------------- shell */

function brandName() {
  const name = state.meta?.settings.site_name || 'REIN 1V1';
  const m = /^(.*?)(\s*1\s*v\s*1.*)$/i.exec(name);
  return m ? html`${m[1]}<em>${m[2]}</em>` : name;
}

function renderTabs() {
  const isAdmin = !!state.meta?.admin;
  const pending = state.adminPending ?? state.meta?.stats?.pending ?? 0;
  render($('#tabbar'), html`
    <a class="brand" href="/" data-link>${BRAND_MARK}<span class="brand-name">${brandName()}</span></a>
    <div class="tabs" role="tablist">
      <span class="tab-ink"></span>
      ${TABS.filter((tab) => !tab.adminOnly || isAdmin || state.route?.tab === 'admin').map((tab) => html`
        <a class="tab ${state.route?.tab === tab.id ? 'active' : ''}" href="${tab.href}" data-link data-tab="${tab.id}" role="tab">
          ${t(tab.key)}${tab.id === 'admin' && isAdmin && pending ? html`<span class="badge">${pending}</span>` : ''}
        </a>`)}
    </div>
    <button class="tab-icon" data-action="search" title="${t('search')}" aria-label="${t('search')}">${ICON.search}</button>
    <button class="tab-icon ${soundOn() ? '' : 'muted'}" data-action="sound" title="${soundOn() ? t('sound_on') : t('sound_off')}" aria-label="${t('sound_on')}">${ICON.sound}</button>
    <button class="tab-icon" data-action="theme" title="${getTheme() === 'dark' ? t('theme_light') : t('theme_dark')}" aria-label="${t('theme_dark')}">${getTheme() === 'dark' ? THEME_ICON.light : THEME_ICON.dark}</button>
    <button class="tab-icon lang" data-action="lang" title="Language">${getLang() === 'ar' ? 'EN' : 'عربي'}</button>

  `);
  // Phone: the same tabs as an app-style bottom bar.
  render($('#mnav'), TABS.filter((tab) => !tab.adminOnly || isAdmin || state.route?.tab === 'admin').map((tab) => html`
    <a class="mnav-item ${state.route?.tab === tab.id ? 'active' : ''}" href="${tab.href}" data-link data-tab="${tab.id}">
      ${TAB_ICONS[tab.id]}<span>${t(tab.key)}</span>${tab.id === 'admin' && isAdmin && pending ? html`<span class="badge">${pending}</span>` : ''}
    </a>`));
  requestAnimationFrame(moveInk);
}

const tabSvg = (inner) => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`);
const TAB_ICONS = {
  leaderboard: tabSvg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>'),
  tournaments: tabSvg('<path d="M3 5h5v4H3zM3 15h5v4H3zM16 10h5v4h-5z"/><path d="M8 7h3v10H8M11 12h5"/>'),
  matches: tabSvg('<path d="M4 4l9 9M13 4 4 13M15 15l5 5M20 15l-5 5"/><path d="M14 4h6v6M10 20H4v-6"/>'),
  register: tabSvg('<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>'),
  admin: tabSvg('<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
};

function moveInk() {
  const tabs = $('.tabs');
  const ink = $('.tab-ink');
  const active = $('.tab.active');
  if (!tabs || !ink) return;
  if (!active) {
    ink.style.width = '0px';
    return;
  }
  ink.style.width = `${active.offsetWidth}px`;
  ink.style.transform = `translateX(${active.offsetLeft}px)`;
}
window.addEventListener('resize', debounce(moveInk, 60));
document.fonts?.ready.then(() => requestAnimationFrame(moveInk));

// The FPS / players / latency bar was removed from the page; the frame rate is still measured for low-power mode.
function renderHud() {}

function renderClock() {
  const d = new Date();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  $('#hud-clock').textContent = `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

function renderHints() {
  const invite = state.meta?.settings?.discord_invite;
  const left = [
    invite ? html`<a class="hint" href="${invite}" target="_blank" rel="noopener"><kbd>D</kbd>${t('hint_discord')}</a>` : '',
    html`<button class="hint" data-action="search"><kbd>/</kbd>${t('hint_search')}</button>`,
  ];
  const right = [
    ...state.extraHints.map((h) => html`<button class="hint" data-hint="${h.id}"><kbd>${h.key}</kbd>${h.label}</button>`),
    html`<button class="hint" data-action="next-tab"><kbd>Q</kbd><kbd>E</kbd>${t('hint_switch')}</button>`,
    html`<button class="hint" data-action="back"><kbd>ESC</kbd>${t('hint_back')}</button>`,
  ];
  render($('#hints'), html`<div>${left}</div><div>${right}</div>`);
}

/* ---------------------------------------------------------------- routing */

function match(path) {
  for (const r of ROUTES) {
    const m = r.re.exec(path);
    if (m) return { ...r, params: m.slice(1), path };
  }
  return { ...ROUTES[0], params: [], path: '/' };
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Swap pages with a short cross-fade where the browser supports view transitions. */
function transition(fn) {
  if (!document.startViewTransition || reducedMotion || document.hidden) return fn();
  let done;
  const finished = new Promise((r) => { done = r; });
  document.startViewTransition(async () => {
    try {
      await fn();
    } finally {
      done();
    }
  });
  return finished;
}

export function navigate(path, { replace = false } = {}) {
  path = realPath(path);
  if (path === location.pathname + location.search && !replace) return;
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  transition(route);
}

/* Prefetch a page's code and data when the pointer heads for its link, so it opens instantly. */
const prefetched = new Set();
async function prefetch(path) {
  if (prefetched.has(path)) return;
  prefetched.add(path);
  setTimeout(() => prefetched.delete(path), 15_000);
  const r = match(appPath(path));
  import(`./pages/${r.page}.js`).catch(() => {});
  if (r.page === 'leaderboard') prefetchApi('/leaderboard');
  else if (r.page === 'matches') prefetchApi('/matches?type=all&limit=100');
  else if (r.page === 'tournaments') {
    const list = await prefetchApi('/tournaments');
    const id = Number(r.params[0]) || list?.tournaments?.[0]?.id;
    if (id) prefetchApi(`/tournaments/${id}`);
  }
}
document.addEventListener('pointerover', (e) => {
  const a = e.target.closest?.('a[data-link]');
  if (a) prefetch(a.getAttribute('href'));
}, { passive: true });

async function route() {
  const next = match(appPath(location.pathname));
  const samePage = state.route?.page === next.page && state.pageApi?.update;
  state.route = next;
  renderTabs();

  if (samePage) {
    await state.pageApi.update(next.params);
  } else {
    state.pageApi?.unmount?.();
    state.extraHints = [];
    renderHints();
    const view = $('#view');
    const mod = await import(`./pages/${next.page}.js`);
    state.page = next.page;
    state.pageApi = (await mod.default.mount(view, next.params, ctx)) ?? {};
  }
  if (next.profile) {
    openProfile(Number(next.params[0]), { onClose: () => location.pathname.startsWith('/player/') && history.replaceState({}, '', '/') });
  }
}

/* ---------------------------------------------------------------- search overlay */

let searchOpen = false;
async function openSearch() {
  if (searchOpen) return;
  searchOpen = true;
  const root = document.createElement('div');
  root.className = 'search-overlay';
  render(root, html`<div class="modal-backdrop" data-close></div>
    <div class="search-panel">${ICON.search}<input class="input" placeholder="${t('search_players')}" autocomplete="off" spellcheck="false"><div class="search-results"></div></div>`);
  document.body.append(root);
  sfx('open');
  const input = $('input', root);
  const results = $('.search-results', root);
  input.focus();
  let players = [];
  try {
    players = (await api('/leaderboard')).players;
  } catch {
    players = [];
  }
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const list = (q ? players.filter((p) => `${p.name} ${p.username ?? ''} ${p.battletag ?? ''}`.toLowerCase().includes(q)) : players).slice(0, 12);
    render(results, list.map((p, i) => html`
      <div class="row interactive" style="--i:${i}" data-player="${p.id}">
        <div class="label"><span style="opacity:.6">#${p.position}</span>${avatar(p, 28)}<span class="txt">${p.name}</span><span class="hint">${p.battletag ?? ''}</span></div>
        <div class="cell">${tierChip(p.tier, { size: 'sm' })}</div>
        <div class="cell"><span class="sr-val">${p.sr}</span></div>
      </div>`));
  };
  draw();
  input.addEventListener('input', draw);
  const close = () => {
    searchOpen = false;
    root.remove();
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-rank]')) return;
    const row = e.target.closest('[data-player]');
    if (row) {
      close();
      openProfile(Number(row.dataset.player));
    } else if (e.target.closest('[data-close]')) close();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') $('[data-player]', results)?.click();
  });
}

/* ---------------------------------------------------------------- global events */

function cycleTab(dir) {
  const tabs = $$('.tab');
  const i = tabs.findIndex((el) => el.classList.contains('active'));
  const next = tabs[(i + dir + tabs.length) % tabs.length];
  if (next) {
    sfx('tab');
    navigate(next.getAttribute('href'));
  }
}

document.addEventListener('click', (e) => {
  const rk = e.target.closest('[data-rank]');
  if (rk) {
    sfx('open');
    openRankModal(Number(rk.dataset.rank));
    return;
  }
  const link = e.target.closest('a[data-link]');
  if (link && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    if (link.classList.contains('tab')) sfx('tab');
    navigate(link.getAttribute('href'));
    return;
  }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'search') openSearch();
  if (action === 'next-tab') cycleTab(1);
  if (action === 'back') goBack();
  if (action === 'theme') {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    renderTabs();
    sfx('click');
  }
  if (action === 'sound') {
    setSound(!soundOn());
    renderTabs();
    sfx('click');
  }
  if (action === 'lang') {
    setLang(getLang() === 'ar' ? 'en' : 'ar');
    renderTabs();
    renderHints();
    renderAnnouncement();
    state.pageApi?.unmount?.();
    state.pageApi = null;
    state.route = null;
    route();
  }
  const hint = e.target.closest('[data-hint]')?.dataset.hint;
  if (hint) state.extraHints.find((h) => h.id === hint)?.run();
  if (e.target.closest('.btn, .side-btn, .row.interactive, .seg button, .pick, .wp, .ibtn, .pod')) sfx('click');
});

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('.btn, .side-btn, .tab, .row.interactive, .seg button, .pick, .pod, .b-match.clickable');
  if (el && !el.contains(e.relatedTarget)) sfx('hover');
});

function goBack() {
  if (closeTopModal()) return;
  if (document.querySelector('.search-overlay')) return;
  if (state.pageApi?.back?.()) return;
  if (history.length > 1 && location.pathname !== '/') history.back();
}

document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if (e.key === 'Escape') {
    if (!document.querySelector('.search-overlay')) goBack();
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  // e.code is layout-independent, so the shortcuts also work with an Arabic keyboard.
  if (e.code === 'KeyQ') cycleTab(-1);
  else if (e.code === 'KeyE') cycleTab(1);
  else if (e.code === 'Slash' || e.key === '/') {
    e.preventDefault();
    openSearch();
  } else if (e.code === 'KeyD' && state.meta?.settings?.discord_invite) window.open(state.meta.settings.discord_invite, '_blank', 'noopener');
  else state.extraHints.find((h) => h.code === e.code || h.code === e.key)?.run();
});

window.addEventListener('popstate', () => transition(route));

/* ---------------------------------------------------------------- live updates */

let lastLiveToast = 0;

/** Re-render the current page from scratch (used when texts, images or ranks change). */
function remountPage() {
  if (state.page === 'admin') return state.pageApi?.refresh?.([{ scope: 'settings' }]);
  state.pageApi?.unmount?.();
  state.pageApi = null;
  state.route = null;
  return route();
}

async function applyChanges(batch, { quiet = false } = {}) {
  invalidateApi();
  const scopes = new Set(batch.map((c) => c.scope));
  if (scopes.has('settings') || scopes.has('players') || scopes.has('matches') || scopes.has('registrations') || scopes.has('tournaments')) await refreshMeta();
  if (scopes.has('settings') && state.page !== 'admin' && !document.querySelector('.modal-root')) await remountPage();
  else await state.pageApi?.refresh?.(batch);
  if (!quiet && state.page !== 'admin' && Date.now() - lastLiveToast > 6000 && !document.hidden) {
    lastLiveToast = Date.now();
    toast(html`${ICON.bolt} ${t('updated_live')}`);
  }
}

/**
 * Live updates ("broadcast"): the server pushes a message over Server-Sent Events whenever an admin,
 * a moderator or the Discord bot changes anything, and every open page refreshes itself.
 */
function connectEvents() {
  const es = new EventSource('/api/events');
  let lost = false;
  es.addEventListener('change', (e) => {
    let batch = [];
    try {
      batch = JSON.parse(e.data);
    } catch {
      return;
    }
    applyChanges(batch);
  });
  es.addEventListener('ping', () => renderHud());
  es.addEventListener('error', () => { lost = true; });
  // After a dropped connection (sleep, Wi-Fi, server restart) catch up on anything we missed.
  es.addEventListener('open', () => {
    if (!lost) return;
    lost = false;
    applyChanges(['settings', 'players', 'matches', 'tournaments', 'registrations'].map((scope) => ({ scope })), { quiet: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && es.readyState === EventSource.CLOSED) connectEvents();
  });
}

/* ---------------------------------------------------------------- boot */

async function boot() {
  // Low-power mode: remembered per browser, or switched on automatically when the frame rate stays low.
  const LITE_KEY = 'rein.lite';
  let lite = false;
  try {
    lite = localStorage.getItem(LITE_KEY) === '1';
  } catch {
    lite = false;
  }
  if (lite) document.documentElement.classList.add('lite');
  const embers = lite ? null : startEmbers($('#embers'));
  initTilt();
  init3D();
  let slow = 0;
  let seconds = 0;
  fpsMeter((fps) => {
    state.fps = fps;
    const b = $('#hud-stats b');
    if (b) b.textContent = fps;
    seconds++;
    if (lite || document.hidden || seconds < 4) return;
    slow = fps < 40 ? slow + 1 : 0;
    if (slow >= 4) {
      lite = true;
      document.documentElement.classList.add('lite');
      embers?.stop();
      try {
        localStorage.setItem(LITE_KEY, '1');
      } catch {
        // ignore
      }
    }
  });
  renderClock();
  setInterval(renderClock, 10_000);
  await refreshMeta();
  initLang(state.meta?.settings?.default_lang);
  renderTabs();
  renderHints();
  await route();
  connectEvents();
  setInterval(refreshMeta, 60_000);
}

boot();

export { modal };
