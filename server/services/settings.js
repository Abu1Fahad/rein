import crypto from 'node:crypto';
import { all, run, get, tx } from '../db.js';
import { config } from '../config.js';
import { changed } from '../events.js';
import { HttpError } from '../http.js';
import { DEFAULT_RANKS, normalizeRanks, rankTable } from './ranks.js';

const d = config.discord;

/** Every setting with its default. The default's type decides how values are coerced. */
export const DEFAULTS = {
  site_name: 'REIN 1V1',
  season_name: 'SEASON 1',
  default_lang: 'en',
  starting_sr: 0,
  points_mode: 'rank',
  rank_table: JSON.stringify(DEFAULT_RANKS),
  points_divisor: 1,
  dominance_pct: 100,
  gap_pct: 140,
  elo_k: 40,
  fixed_win: 25,
  fixed_loss: 25,
  min_sr: 0,
  registration_open: true,
  show_battletags: true,
  discord_invite: '',
  guild_id: d.guildId,
  registration_channel_id: d.registrationChannelId,
  review_channel_id: d.reviewChannelId,
  results_channel_id: d.resultsChannelId,
  player_role_id: d.playerRoleId,
  admin_role_id: d.adminRoleId,
  announce_results: true,
  dm_players: true,
  sync_interval_min: 30,
  // Discord log channels (one channel per kind of activity, created inside this category)
  log_enabled: true,
  log_category_id: '1559440741561008200',
  log_lang: 'ar',
  // site content
  announcement_on: false,
  announcement_en: '',
  announcement_ar: '',
  img_banner: '',
  img_card: '',
  img_covers: '',
  text_overrides: '{}',
};

/** Max stored length per key (default 300). */
const MAX_LEN = { rank_table: 20000, text_overrides: 60000, announcement_en: 500, announcement_ar: 500, img_covers: 3000 };
const URL_KEYS = ['img_banner', 'img_card'];

const LIMITS = {
  starting_sr: [0, 10000],
  elo_k: [1, 200],
  fixed_win: [0, 1000],
  fixed_loss: [0, 1000],
  min_sr: [0, 10000],
  points_divisor: [1, 100],
  dominance_pct: [0, 300],
  gap_pct: [100, 300],
  sync_interval_min: [5, 1440],
};

const ENUMS = {
  points_mode: ['rank', 'elo', 'fixed'],
  default_lang: ['en', 'ar'],
  log_lang: ['ar', 'en'],
};

const SNOWFLAKE_KEYS = [
  'log_category_id', 'guild_id', 'registration_channel_id', 'review_channel_id',
  'results_channel_id', 'player_role_id', 'admin_role_id',
];

const PUBLIC_KEYS = [
  'site_name', 'season_name', 'default_lang', 'registration_open',
  'show_battletags', 'discord_invite', 'points_mode', 'starting_sr', 'points_divisor', 'dominance_pct', 'gap_pct',
  'announcement_on', 'announcement_en', 'announcement_ar', 'img_banner', 'img_card', 'img_covers',
];

let cache = null;

function decode(key, raw) {
  const def = DEFAULTS[key];
  if (raw === null || raw === undefined) return def;
  if (typeof def === 'number') return Number(raw);
  if (typeof def === 'boolean') return raw === 'true';
  return String(raw);
}

let migrated = false;
/** One-time switch of existing installs to the rank-based points system. */
function migrate() {
  migrated = true;
  if (!get('SELECT value FROM settings WHERE key = ?', '_rank_points_v1')) {
    run(`INSERT INTO settings (key, value) VALUES ('points_mode', 'rank') ON CONFLICT(key) DO UPDATE SET value = 'rank'`);
    run(`INSERT INTO settings (key, value) VALUES ('_rank_points_v1', '1') ON CONFLICT(key) DO NOTHING`);
  }
  // v2: Bronze → Champion ELO table, dominance + rank-gap formula, starting SR 500.
  if (!get('SELECT value FROM settings WHERE key = ?', '_rank_points_v2')) {
    run(`DELETE FROM settings WHERE key IN ('rank_table', 'points_divisor')`);
    run(`DELETE FROM settings WHERE key = 'starting_sr' AND value = '2500'`);
    run(`INSERT INTO settings (key, value) VALUES ('points_mode', 'rank') ON CONFLICT(key) DO UPDATE SET value = 'rank'`);
    run(`INSERT INTO settings (key, value) VALUES ('_rank_points_v2', '1') ON CONFLICT(key) DO NOTHING`);
  }
  // v3: newly accepted players start at 0 SR.
  if (!get('SELECT value FROM settings WHERE key = ?', '_start_zero_v3')) {
    run(`DELETE FROM settings WHERE key = 'starting_sr' AND value IN ('500', '2500')`);
    run(`INSERT INTO settings (key, value) VALUES ('_start_zero_v3', '1') ON CONFLICT(key) DO NOTHING`);
  }
}

function load() {
  if (!migrated) migrate();
  const values = { ...DEFAULTS };
  for (const row of all('SELECT key, value FROM settings')) {
    if (Object.hasOwn(DEFAULTS, row.key)) values[row.key] = decode(row.key, row.value);
  }
  cache = values;
  return values;
}

export function getSettings() {
  return cache ?? load();
}

export function setting(key) {
  return getSettings()[key];
}

export function publicSettings() {
  const s = getSettings();
  return {
    ...Object.fromEntries(PUBLIC_KEYS.map((k) => [k, s[k]])),
    text_overrides: parseOverrides(s.text_overrides),
  };
}

export const ranks = () => rankTable(getSettings().rank_table);

function parseOverrides(raw) {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** { en: { key: text }, ar: { key: text } } — only non-empty strings are kept. */
function normalizeOverrides(value) {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v || '{}');
    } catch {
      throw new HttpError(400, 'invalid_option', { key: 'text_overrides' });
    }
  }
  const out = {};
  for (const lang of ['en', 'ar']) {
    const src = v?.[lang];
    if (!src || typeof src !== 'object') continue;
    for (const [k, text] of Object.entries(src)) {
      if (!/^[a-z0-9_]{1,60}$/i.test(k)) continue;
      const str = String(text ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').slice(0, 500);
      if (str.trim()) (out[lang] ??= {})[k] = str;
    }
  }
  return JSON.stringify(out);
}

function coerce(key, value) {
  const def = DEFAULTS[key];
  if (typeof def === 'number') {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) throw new HttpError(400, 'invalid_number', { key });
    const [min, max] = LIMITS[key] ?? [-1e9, 1e9];
    return Math.min(max, Math.max(min, n));
  }
  if (typeof def === 'boolean') return value === true || value === 'true' || value === 1;
  if (key === 'rank_table') return JSON.stringify(normalizeRanks(value));
  if (key === 'text_overrides') return normalizeOverrides(value);
  let str = String(value ?? '').trim().slice(0, MAX_LEN[key] ?? 300);
  // Plain web links only (no quotes/brackets that could break out of the CSS or HTML they end up in).
  const SAFE_URL = /^https?:\/\/[^\s"'()<>\\`]+$/i;
  if (URL_KEYS.includes(key) && str && !SAFE_URL.test(str)) throw new HttpError(400, 'invalid_url', { key });
  if (key === 'img_covers') {
    str = str.split(/\s+/).filter((u) => SAFE_URL.test(u)).join('\n');
  }
  if (key === 'discord_invite' && str && !/^(https:\/\/)?[^\s"'()<>\\`]+$/i.test(str)) throw new HttpError(400, 'invalid_url', { key });
  if (ENUMS[key] && !ENUMS[key].includes(str)) throw new HttpError(400, 'invalid_option', { key });
  if (SNOWFLAKE_KEYS.includes(key) && str && !/^\d{15,22}$/.test(str)) {
    throw new HttpError(400, 'invalid_discord_id', { key });
  }
  if (key === 'discord_invite' && str && !/^https:\/\//i.test(str)) str = `https://${str}`;
  return str;
}

export function updateSettings(patch) {
  const updates = {};
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (!Object.hasOwn(DEFAULTS, key)) continue;
    updates[key] = coerce(key, value);
  }
  tx(() => {
    for (const [key, value] of Object.entries(updates)) {
      run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
    }
  });
  cache = null;
  changed('settings');
  return { updated: Object.keys(updates), settings: getSettings() };
}

export function resetSettings() {
  run(`DELETE FROM settings WHERE key NOT LIKE '\\_%' ESCAPE '\\'`);
  cache = null;
  changed('settings');
  return getSettings();
}

/** Internal values (prefixed with "_") that are not user settings. */
export function getInternal(key) {
  return get('SELECT value FROM settings WHERE key = ?', `_${key}`)?.value ?? null;
}

export function setInternal(key, value) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', `_${key}`, value == null ? null : String(value));
}

export function sessionSecret() {
  if (config.sessionSecret) return config.sessionSecret;
  let secret = getInternal('session_secret');
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    setInternal('session_secret', secret);
  }
  return secret;
}
