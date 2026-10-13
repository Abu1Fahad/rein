import { t, te, getLang } from './i18n.js';
import { sfx } from './fx.js';

/* ---------------------------------------------------------------- DOM + safe templates */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
/** Mark trusted markup (static strings, already-escaped output). */
export const raw = (s) => new Raw(String(s ?? ''));

const flat = (v) => {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(flat).join('');
  return esc(v);
};

/** Tagged template: interpolated values are escaped unless wrapped with raw()/html``. */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += flat(vals[i]) + strings[i + 1];
  return new Raw(out);
}

export function render(el, content) {
  el.innerHTML = flat(content);
  return el;
}

export function fragment(content) {
  const tpl = document.createElement('template');
  tpl.innerHTML = flat(content);
  return tpl.content.firstElementChild;
}

/* ---------------------------------------------------------------- API */

/*
 * Short-lived cache for public GET requests: pages open instantly when the data was prefetched
 * (hovering a tab) or just viewed. Any live update from the server or any write clears it.
 */
const CACHE_TTL = 20_000;
const cache = new Map();
const cacheable = (path) => /^\/(leaderboard|tournaments|matches|players\/\d+|ranks)\b/.test(path);
export function invalidateApi() {
  cache.clear();
}
export function prefetchApi(path) {
  return api(path).catch(() => null);
}

export async function api(path, { method = 'GET', body } = {}) {
  if (method === 'GET' && cacheable(path)) {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.promise;
    const promise = request(path, method, body);
    cache.set(path, { at: Date.now(), promise });
    promise.catch(() => cache.delete(path));
    return promise;
  }
  if (method !== 'GET') invalidateApi();
  return request(path, method, body);
}

async function request(path, method, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json', 'X-Requested-With': 'rein' } : { 'X-Requested-With': 'rein' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `http_${res.status}`);
    err.code = data.error || `http_${res.status}`;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------- formatting */

export const num = (n) => (n === null || n === undefined ? '—' : new Intl.NumberFormat('en-US').format(n));
export const plain = (n) => (n === null || n === undefined ? '—' : String(n));

export function ago(iso) {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('just_now');
  if (s < 3600) return t('ago_m', { n: Math.floor(s / 60) });
  if (s < 86400) return t('ago_h', { n: Math.floor(s / 3600) });
  if (s < 86400 * 30) return t('ago_d', { n: Math.floor(s / 86400) });
  return date(iso);
}

export function date(iso, withTime = false) {
  if (!iso) return '—';
  const opts = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' };
  return new Intl.DateTimeFormat(getLang() === 'ar' ? 'ar-u-nu-latn' : 'en-GB', opts).format(new Date(iso));
}

/** yyyy-MM-ddTHH:mm in local time, for <input type="datetime-local"> */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const hue = (s) => {
  let h = 0;
  for (const ch of String(s ?? '')) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
};

export const debounce = (fn, ms = 200) => {
  let id;
  return (...a) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...a), ms);
  };
};

/* ---------------------------------------------------------------- toasts */

export function toast(message, type = 'info') {
  const box = $('#toasts');
  const el = fragment(html`<div class="toast ${type === 'ok' ? 'ok' : type === 'err' ? 'err' : ''}">${message}</div>`);
  box.append(el);
  if (type === 'err') sfx('error');
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, type === 'err' ? 4200 : 2600);
}

export const toastError = (err) => toast(te(err?.code || err?.message), 'err');

/* ---------------------------------------------------------------- modal */

const ICON_X = raw('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>');

let openModals = [];

export function modal({ title, body, foot, wide = false, onClose } = {}) {
  const root = fragment(html`
    <div class="modal-root" role="dialog" aria-modal="true">
      <div class="modal-backdrop" data-close></div>
      <div class="modal ${wide ? 'wide' : ''}">
        <div class="modal-head"><h2>${title}</h2><button class="ibtn" data-close aria-label="${t('close')}">${ICON_X}</button></div>
        <div class="modal-body">${body}</div>
        ${foot ? html`<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`);
  document.body.append(root);
  sfx('open');
  const api = {
    el: root,
    body: $('.modal-body', root),
    foot: $('.modal-foot', root),
    close() {
      if (!root.isConnected || root.classList.contains('closing')) return;
      root.classList.add('closing');
      $('.modal', root).classList.add('closing');
      setTimeout(() => root.remove(), 190);
      openModals = openModals.filter((m) => m !== api);
      onClose?.();
    },
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) api.close();
  });
  openModals.push(api);
  setTimeout(() => $('input:not([type=hidden]), select, textarea, button.btn', $('.modal-body', root))?.focus(), 60);
  return api;
}

export const closeTopModal = () => {
  const m = openModals.at(-1);
  if (!m) return false;
  m.close();
  return true;
};

export function confirmBox(message, { danger = false, okLabel } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title: t('confirm'),
      body: html`<p class="lead">${message}</p>`,
      foot: html`<button class="btn navy sm" data-act="no">${t('cancel')}</button><button class="btn sm ${danger ? 'danger' : ''}" data-act="yes">${okLabel ?? t('confirm')}</button>`,
      onClose: () => !done && resolve(false),
    });
    m.foot.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      done = true;
      resolve(act === 'yes');
      m.close();
    });
  });
}

export function promptBox(message, { label = '', multiline = false, okLabel, danger = false, type = 'text' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title: message,
      body: html`<label class="field"><span>${label}</span>${multiline ? html`<textarea class="textarea" maxlength="300"></textarea>` : html`<input class="input" maxlength="300" type="${type}" style="text-transform:none">`}</label>`,
      foot: html`<button class="btn navy sm" data-act="no">${t('cancel')}</button><button class="btn sm ${danger ? 'danger' : ''}" data-act="yes">${okLabel ?? t('confirm')}</button>`,
      onClose: () => !done && resolve(null),
    });
    m.foot.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      done = true;
      resolve(act === 'yes' ? $('input, textarea', m.body).value.trim() : null);
      m.close();
    });
  });
}

/* ---------------------------------------------------------------- animation helpers */

export function countUp(root = document) {
  for (const el of $$('[data-count]', root)) {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to)) continue;
    const from = Number(el.dataset.from ?? Math.max(0, to - Math.min(Math.abs(to), 400)));
    const dur = 900;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - (1 - p) ** 3;
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

export const loaderHtml = () => html`<div class="loader"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="6"/><path d="M32 6a26 26 0 0 1 26 26" fill="none" stroke="#f46b1d" stroke-width="6" stroke-linecap="round"/></svg></div>`;
