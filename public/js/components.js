import { html, raw, esc, hue, $, $$, api, modal, num, ago, countUp, loaderHtml, toastError } from './lib.js';
import { t } from './i18n.js';

/* ---------------------------------------------------------------- images (official Blizzard CDN) */

export const IMG = {
  banner: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt8215ad99f856a606/631a8b03636d390da7825ddb/1600_Reinhardt.jpg',
  bannerSmall: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/bltd56f6208dd1b6903/631a8b031613910e6926bfcc/960_Reinhardt.jpg',
  portrait: 'https://d15f34w2p8l1cc.cloudfront.net/overwatch/551fbe070c16fdfcc17f7f1de63af22c53e7d2f1340fc2f3172441504527bc4e.png',
  charge: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/bltbd7b9ce27cbfccd3/6333cb5fe3c2a2741688caf9/REINHARDT_CHARGE.jpg',
  earthshatter: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt835d0694f91f76b4/6333cb5f1a0b5e7d3d1ec4e5/REINHARDT_EARTHSHATTER.jpg',
  firestrike: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt3acd13c282146202/6333cb5fed7dcc6a00280300/REINHARDT_FIRE_STRIKE.jpg',
  barrier: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt065ef6f056c618e3/6333cb5f7e84e17596f9c7f2/REINHARDT_BARRIER_FIELD.jpg',
  hammer: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt2477dcaf4ebd440c/blt98187374c16f7b33/6333cb5f1ccd046877c0e445/REINHARDT_ROCKET_HAMMER.jpg',
};
const DEFAULT_IMG = { ...IMG };
const DEFAULT_COVERS = [IMG.earthshatter, IMG.charge, IMG.firestrike, IMG.barrier, IMG.hammer];
const COVERS = [...DEFAULT_COVERS];
export const coverFor = (id) => COVERS[(Number(id) || 0) % COVERS.length];

/** Images the admins replaced from the panel (Site content). Empty value = built-in image. */
export function applyContent(settings = {}) {
  IMG.banner = settings.img_banner || DEFAULT_IMG.banner;
  IMG.bannerSmall = settings.img_card || DEFAULT_IMG.bannerSmall;
  const covers = String(settings.img_covers || '').split(/\s+/).filter((u) => /^https?:\/\//i.test(u));
  COVERS.splice(0, COVERS.length, ...(covers.length ? covers : DEFAULT_COVERS));
}

/* ---------------------------------------------------------------- icons */

const svg = (inner, vb = '0 0 24 24') => raw(`<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`);
export const ICON = {
  search: svg('<circle cx="10.5" cy="10.5" r="6.5" stroke-width="2.6"/><path d="m15.5 15.5 5 5" stroke-width="3"/>'),
  sound: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/><path class="wave" d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>'),
  reset: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14" stroke-width="2.8"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="2.8"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18" stroke-width="2.8"/>'),
  sync: svg('<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1"/><path d="M18.5 3v4.4h-4.4M5.5 21v-4.4h4.4"/>'),
  discord: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9 0 13.6.3 18.1a19.8 19.8 0 0 0 6 3l1.3-2a12.7 12.7 0 0 1-2-1l.5-.4a14 14 0 0 0 12 0l.5.4-2 1 1.3 2a19.7 19.7 0 0 0 6-3c.4-5.2-.8-9.7-3.6-13.7ZM8.3 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z"/></svg>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>'),
  back: svg('<path d="M15 5 8 12l7 7" stroke-width="2.8"/>'),
  link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  live: raw('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="#ff3b3b"/><circle cx="12" cy="12" r="9" fill="none" stroke="#ff3b3b" stroke-width="2" opacity=".5"/></svg>'),
  trophy: raw(`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14c0 9-6 16-14 16s-14-7-14-16z" fill="url(#trophyGold)"/><path d="M18 13H9c0 9 4 14 11 15M46 13h9c0 9-4 14-11 15" fill="none" stroke="url(#trophyGold)" stroke-width="4"/><path d="M28 37h8v9h-8z" fill="#c9921f"/><path d="M20 46h24l3 9H17z" fill="url(#trophyGold)"/><path d="M27 15l5-4 5 4-5 12z" fill="#fff" opacity=".55"/></svg>`),
  crown: raw('<svg viewBox="0 0 64 44" aria-hidden="true"><path d="M4 12l14 12L32 4l14 20 14-12-6 30H10z" fill="url(#trophyGold)" stroke="#8a5d0c" stroke-width="2"/><circle cx="32" cy="30" r="4" fill="#fff" opacity=".8"/></svg>'),
};

/** Shield + hammer emblem used on hero cards (our own art — not the Overwatch logo). */
export const EMBLEM = raw(`<svg class="emblem" viewBox="0 0 200 200" aria-hidden="true">
  <circle cx="100" cy="100" r="86" fill="none" stroke="#3a4670" stroke-width="16"/>
  <path d="M100 30 152 50v42c0 36-22 62-52 76-30-14-52-40-52-76V50z" fill="#33406a"/>
  <path d="M100 44 140 59v33c0 28-17 48-40 60-23-12-40-32-40-60V59z" fill="#28335a"/>
  <path d="M74 70h52v20h-16v50H90V90H74z" fill="#3e4c7c"/>
</svg>`);

export const BRAND_MARK = raw(`<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a52"/><stop offset="1" stop-color="#e2510f"/></linearGradient></defs>
  <path d="M32 3 56 12v18c0 15-10 26-24 31C18 56 8 45 8 30V12z" fill="#fff"/>
  <path d="M32 8 51 15v15c0 12-8 21-19 26-11-5-19-14-19-26V15z" fill="url(#bm)"/>
  <path d="M22 20h20v8H36v20h-8V28h-6z" fill="#fff"/>
</svg>`);

/* ---------------------------------------------------------------- ranks */

export const TIERS = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'champion', 'top500'];
export const TIER_LABEL = {
  unranked: 'Unranked', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond',
  master: 'Master', grandmaster: 'Grandmaster', champion: 'Champion', top500: 'Top 500',
};
export const rankText = (tier, div) => `${TIER_LABEL[tier] ?? 'Unranked'}${div ? ` ${div}` : ''}`;

/** Our own rank emblem: shield shape in tier colours, wings from Master up, crown for Champion / Top 500. */
export function rankBadge(tier = 'unranked', div = null, { size = 28, label = false } = {}) {
  const lvl = Math.max(0, TIERS.indexOf(tier));
  const fill = `url(#rk-${TIERS[lvl]})`;
  const wings = lvl >= 6
    ? `<path d="M14 26 2 18l4 14 10 6zM50 26l12-8-4 14-10 6z" fill="${fill}" opacity=".9"/>`
    : '';
  const crown = lvl >= 8 ? `<path d="M20 9l6 5 6-8 6 8 6-5-2 9H22z" fill="#fff" opacity=".95"/>` : '';
  const chevrons = Array.from({ length: Math.min(3, Math.max(0, Math.ceil(lvl / 2))) }, (_, i) =>
    `<path d="M22 ${33 + i * 7}l10 5 10-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="${0.95 - i * 0.2}"/>`).join('');
  const divText = div ? `<text x="32" y="30" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="15" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".6">${div}</text>` : '';
  const top = lvl === 9 ? `<text x="32" y="31" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="13" fill="#fff">500</text>` : '';
  const svgEl = `<svg viewBox="0 0 64 64" role="img" aria-label="${esc(rankText(tier, div))}">
    ${wings}
    <path d="M32 6 50 13v20c0 12-8 21-18 26-10-5-18-14-18-26V13z" fill="${fill}" stroke="rgba(15,20,40,.55)" stroke-width="2"/>
    <path d="M32 11 45 16v16c0 9-5.5 16-13 20-7.5-4-13-11-13-20V16z" fill="rgba(0,0,0,.18)"/>
    ${crown}${divText}${top}${lvl > 0 && !div && lvl !== 9 ? '' : ''}${chevrons}
  </svg>`;
  return html`<span class="rank" style="--rs:${size}px">${raw(svgEl)}${label ? html`<span class="rl">${rankText(tier, div)}</span>` : ''}</span>`;
}

/* ---------------------------------------------------------------- SR ranks (from the rank table) */

let RANKS = [];
let OPTS = { dominance: 100, gap: 140 };
export function setRanks(ranks, settings = {}) {
  RANKS = Array.isArray(ranks) ? ranks : [];
  OPTS = { dominance: Number(settings.dominance_pct ?? 100), gap: Number(settings.gap_pct ?? 140) };
}
export const getRanks = () => RANKS;
export function rankForSr(sr) {
  let found = RANKS[0] ?? null;
  for (const r of RANKS) if (sr >= r.min) found = r;
  return found;
}
export const rangeText = (r) => (r.max === null || r.max === undefined ? `${r.min}+` : `${r.min} – ${r.max}`);

/** Same formula as the server (server/services/ranks.js). */
export function calcPoints(winner, loser, won, lost, opts = OPTS) {
  const total = won + lost;
  const dominance = total ? 1 + (Math.max(0, won - lost) / total) * (opts.dominance / 100) : 1;
  const gap = (opts.gap / 100) ** ((loser.index ?? 0) - (winner.index ?? 0));
  return {
    gain: Math.max(1, Math.round(winner.win * dominance * gap)),
    loss: Math.max(0, Math.round(loser.loss * dominance * gap)),
    dominance: Math.round(dominance * 100) / 100,
    gap: Math.round(gap * 100) / 100,
  };
}

const hexIcon = (color) => raw(`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 28 9v14l-12 7-12-7V9z" fill="${esc(color)}"/><path d="M16 2 28 9v14l-12 7z" fill="#000" opacity=".18"/><path d="M16 8l6.5 3.8v8.4L16 24l-6.5-3.8v-8.4z" fill="#fff" opacity=".28"/></svg>`);
/** Overwatch-style shield for the classic rank names, a coloured gem for custom ones. */
function tierIcon(tier, size = 22) {
  const key = String(tier?.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (TIERS.includes(key) && key !== 'unranked') return rankBadge(key, null, { size });
  return hexIcon(tier?.color ?? '#9aa3b5');
}

/** Clickable SR rank chip. `tier` = { i, name, color } from the API (or a full rank row). */
export function tierChip(tier, { size = 'md' } = {}) {
  if (!tier) return '';
  const i = tier.i ?? tier.index ?? 0;
  const px = size === 'lg' ? 30 : size === 'sm' ? 20 : 24;
  return html`<button type="button" class="tier ${size}" data-rank="${i}" style="--rc:${tier.color}" title="${t('rank_spec_title')}">${tierIcon(tier, px)}<b>${tier.name}</b></button>`;
}

/** Popup explaining one rank and the points formula, with examples and the full table underneath. */
export function openRankModal(index = 0) {
  if (!RANKS.length) return null;
  let cur = Math.min(RANKS.length - 1, Math.max(0, Number(index) || 0));
  const m = modal({ title: t('rank_spec_title'), body: html`<div class="rank-spec"></div>`, wide: false });
  const root = $('.rank-spec', m.body);
  const ex = (label, winner, loser, won, lost, mine) => {
    const p = calcPoints(winner, loser, won, lost);
    return html`<div class="rs-ex">
      <div class="rs-score">${label}</div>
      <div class="rs-line"><b style="color:${winner.color}">${winner.name}</b> <span dir="ltr">${won} - ${lost}</span> <b style="color:${loser.color}">${loser.name}</b></div>
      <code dir="ltr">${winner.name}: +${winner.win} × ${p.dominance} × ${p.gap} = +${p.gain}    ${loser.name}: −${loser.loss} × ${p.dominance} × ${p.gap} = −${p.loss}</code>
      ${mine ? html`<div class="rs-result">${mine === 'win' ? html`${t('you_gain')} <span class="delta up">+${p.gain}</span>` : html`${t('you_lose')} <span class="delta down">−${p.loss}</span>`}</div>` : ''}
    </div>`;
  };
  const draw = () => {
    const r = RANKS[cur];
    const up = RANKS[Math.min(RANKS.length - 1, cur + 3)];
    const down = RANKS[Math.max(0, cur - 3)];
    root.innerHTML = String(html`
      <div class="rs-head" style="--rc:${r.color}">
        <span class="rs-icon">${tierIcon(r, 72)}</span>
        <h3>${t('rank_word', { name: `⁨${r.name}⁩` })}</h3>
        <span class="rs-pill">${rangeText(r)} SR</span>
      </div>
      ${r.desc ? html`<div class="rs-box"><div class="rs-k">${t('description')}</div><p dir="auto">${r.desc}</p></div>` : ''}
      <div class="rs-grid">
        <div class="rs-box"><div class="rs-k">${t('sr_bounds')}</div><div class="rs-v" style="color:var(--orange-2)"><span class="num">${rangeText(r)} SR</span></div></div>
        <div class="rs-box"><div class="rs-k">${t('base_rates')}</div><div class="rs-v"><span class="delta up">+${r.win}</span> ${t('base_win')} · <span class="delta down">−${r.loss}</span> ${t('base_loss')}</div></div>
      </div>
      <div class="rs-box rs-example">
        <div class="rs-k">💡 ${t('how_points_work')}</div>
        <ol class="rs-rules">
          <li><b>${t('rule_base')}</b> ${t('rule_base_sub')}</li>
          <li><b>${t('rule_dominance')}</b> ${t('rule_dominance_sub')}</li>
          <li><b>${t('rule_gap')}</b> ${t('rule_gap_sub')}</li>
        </ol>
        ${ex(t('ex_same'), r, r, 10, 4, null)}
        ${up !== r ? ex(t('ex_upset', { name: up.name }), r, up, 10, 4, 'win') : ''}
        ${down !== r ? ex(t('ex_upset_against', { name: down.name }), down, r, 10, 4, 'loss') : ''}
        <div class="rs-note">${t('formula_note')}</div>
      </div>
      <div class="rs-k" style="margin:16px 0 8px">${t('all_ranks')}</div>
      <div class="rs-table">
        ${RANKS.map((x, i) => html`<button type="button" class="rs-row ${i === cur ? 'on' : ''}" data-pick-rank="${i}" style="--rc:${x.color}">
          <span class="rs-name">${tierIcon(x, 22)}<b>${x.name}</b></span><span dir="ltr">${rangeText(x)}</span>
          <span><span class="delta up">+${x.win}</span> / <span class="delta down">−${x.loss}</span></span></button>`)}
      </div>`);
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick-rank]');
    if (!b) return;
    cur = Number(b.dataset.pickRank);
    draw();
  });
  draw();
  return m;
}

/* ---------------------------------------------------------------- avatar */

export function avatar(p, size = 30, cls = '') {
  const name = p?.name || '?';
  const initials = [...name.replace(/[^\p{L}\p{N}]/gu, '')].slice(0, 2).join('') || '?';
  return html`<span class="av ${cls}" style="--s:${size}px;--hue:${hue(name)}">${initials}${p?.avatar ? html`<img src="${p.avatar}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback>` : ''}</span>`;
}

// Broken avatar URLs (changed on Discord) fall back to initials.
document.addEventListener('error', (e) => {
  const el = e.target;
  if (el instanceof HTMLImageElement && el.hasAttribute('data-fallback')) el.remove();
}, true);

export const formPips = (form = []) => html`<span class="form">${Array.from({ length: 5 }, (_, i) => html`<i class="${form[i] ?? 'x'}">${form[i] ? t(form[i] === 'W' ? 'w' : 'l') : ''}</i>`)}</span>`;

export const trend = (d) => (d ? html`<span class="trend ${d > 0 ? 'up' : 'down'}">${d > 0 ? `▲${d}` : `▼${-d}`}</span>` : '');

export const statusChip = (status) => html`<span class="chip ${status}">${t(status)}</span>`;

/* ---------------------------------------------------------------- rounds */

export const LB = 100;
export const GF = 200;

/** `short`: inside the upper/lower sections the section title already says which bracket it is. */
export function roundName(round, size, format = 'single', short = false) {
  const rounds = Math.round(Math.log2(size));
  if (format === 'double' && short && round !== GF) {
    const lower = round > LB;
    const n = lower ? round - LB : round;
    const last = lower ? 2 * (rounds - 1) : rounds;
    if (n === last) return t('final');
    if (n === last - 1) return t('semifinals');
    return t('round_n', { n });
  }
  if (format === 'double') {
    if (round === GF) return t('grand_final');
    if (round > LB) {
      const L = round - LB;
      const last = 2 * (rounds - 1);
      if (L === last) return t('lower_final');
      if (L === last - 1) return t('lower_semifinal');
      return t('lower_round', { n: L });
    }
    const fromEnd = rounds - round + 1;
    if (fromEnd === 1) return t('upper_final');
    if (fromEnd === 2) return t('upper_semifinals');
    return t('upper_round', { n: round });
  }
  const fromEnd = rounds - round + 1;
  if (fromEnd === 1) return t('final');
  if (fromEnd === 2) return t('semifinals');
  if (fromEnd === 3) return t('quarterfinals');
  return t('round_of', { n: 2 ** fromEnd });
}

/* ---------------------------------------------------------------- hero card (right panel) */

export function heroCard(p, { position, button, buttonAttrs = '' } = {}) {
  if (!p) {
    return html`<div class="hero-card"><div class="hero-art">${EMBLEM}</div><div class="hero-name">${t('empty')}</div></div>`;
  }
  return html`
    <div class="hero-card">
      <div class="hero-art">
        <img class="bgimg" src="${IMG.bannerSmall}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback>
        <div class="fade"></div>
        ${position ? html`<span class="pos">#${position}</span>` : ''}
        <span class="corner">${p.tier ? tierChip(p.tier, { size: 'lg' }) : rankBadge(p.rank_tier, p.rank_division, { size: 40 })}</span>
        ${avatar(p, 128)}
      </div>
      <div class="hero-name">${p.name}</div>
      ${p.battletag ? html`<div class="hero-sub">${p.battletag}</div>` : ''}
    </div>
    ${button ? html`<button class="btn block" ${raw(buttonAttrs)}>${button}</button>` : ''}`;
}

/* ---------------------------------------------------------------- bracket */

export function bracketHtml(detail, { admin = false } = {}) {
  const tour = detail.tournament;
  const format = tour.format ?? 'single';
  const R = tour.rounds;
  const byRound = new Map();
  for (const m of detail.matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round).push(m);
  }
  const compact = tour.size >= 32;
  const sizeCls = `s${tour.size}`;
  // Which upper-bracket match feeds the loser into each lower-bracket slot (for "Loser of …" labels).
  const dropFrom = new Map();
  for (const m of detail.matches) {
    if (!m.lose_to) continue;
    const target = detail.matches.find((x) => x.id === m.lose_to);
    if (!target) continue;
    const field = target.round === LB + 1 ? (m.slot % 2 === 0 ? 1 : 2) : 2;
    dropFrom.set(`${m.lose_to}:${field}`, m);
  }

  const slot = (m, side) => {
    const p = side === 1 ? m.p1 : m.p2;
    const seed = side === 1 ? m.seed1 : m.seed2;
    const score = side === 1 ? m.score1 : m.score2;
    const won = m.winner_id && p && m.winner_id === p.id;
    const lost = m.winner_id && p && m.winner_id !== p.id;
    if (!p) {
      const first = m.round === 1;
      const src = dropFrom.get(`${m.id}:${side}`);
      if (src) {
        const full = t('loser_of', { r: src.round, n: src.slot + 1 });
        return html`<div class="b-slot tbd drop" title="${full}"><span class="b-seed"></span><span class="b-name">${t('loser_short', { r: src.round, n: src.slot + 1 })}</span><span class="b-score"></span></div>`;
      }
      return html`<div class="b-slot ${first ? 'empty' : 'tbd'}"><span class="b-seed"></span><span class="b-name">${first ? '' : t('tbd')}</span><span class="b-score"></span></div>`;
    }
    const showScore = !m.is_bye && m.status !== 'pending';
    return html`<div class="b-slot ${won ? 'won' : ''} ${lost ? 'lost' : ''}" data-player="${p.id}">
      <span class="b-seed">${seed ?? ''}</span>${avatar(p, compact ? 20 : 24)}
      <span class="b-name" title="${p.name}">${p.name}</span>
      ${m.is_bye && won ? html`<span class="bye">${t('bye')}</span>` : html`<span class="b-score">${showScore ? score : ''}</span>`}
    </div>`;
  };

  const matchBox = (m, k) => html`
    <div class="b-match ${m.status === 'live' ? 'live' : ''} ${admin ? 'clickable' : ''} ${m.round === 1 && !m.p1 && !m.p2 ? 'ghost' : ''}" data-match="${m.id}" data-round="${m.round}" data-slot="${m.slot}" style="--k:${k}">
      ${m.status === 'live' ? html`<span class="b-live chip live">${t('live')}</span>` : ''}
      ${slot(m, 1)}${slot(m, 2)}
    </div>`;

  const champCard = () => {
    const champ = tour.champion;
    return html`
      <div class="champ-card ${champ ? '' : 'none'}" data-champ ${champ ? raw(`data-player="${champ.id}"`) : ''}>
        <div class="trophy">${champ ? html`<div class="three" data-3d="trophy">${ICON.trophy}</div>` : ICON.trophy}</div>
        <div class="who">${champ ? html`${avatar(champ, 30)}<span>${champ.name}</span>` : t('winner_tbd')}</div>
        <div class="lbl">${t('champion')}</div>
      </div>`;
  };

  const sideCol = (round, ms, idx, side) => html`
    <div class="b-round ${side}" style="--r:${idx};--lv:${idx}">
      <div class="b-round-head">${roundName(round, tour.size, format, true)}</div>
      <div class="b-col" style="--n:${ms.length}">
        ${ms.map((m, k) => html`<div class="b-cell">${matchBox(m, k)}</div>`)}
      </div>
    </div>`;

  /**
   * Two-sided bracket: the first half of every round on the left, the second half on the right
   * (mirrored), and the rounds with a single match (finals) stacked in the middle.
   */
  const block = (rounds, { champ = false, cls = '', straight = false } = {}) => {
    if (straight) {
      // One direction, left to right (the lower bracket): half the columns of the two-sided layout,
      // so its boxes get the same room as the upper bracket's.
      const cols = rounds.filter((r) => (byRound.get(r) ?? []).length);
      const n1 = Math.max(1, (byRound.get(cols[0]) ?? []).length);
      return html`<div class="bracket-wrap"><div class="bracket mirrored straight ${compact ? 'compact' : ''} ${sizeCls} ${cls}" style="--n1:${n1}">${cols.map((r, i) => sideCol(r, byRound.get(r), i, 'left'))}<svg class="b-lines"></svg></div></div>`;
    }
    const split = rounds.filter((r) => (byRound.get(r) ?? []).length >= 2);
    const center = rounds.filter((r) => (byRound.get(r) ?? []).length === 1);
    const first = byRound.get(split[0] ?? center[0]) ?? [];
    const n1 = Math.max(1, split.length ? first.length / 2 : 1);
    const left = split.map((r, i) => {
      const ms = byRound.get(r);
      return sideCol(r, ms.slice(0, ms.length / 2), i, 'left');
    });
    const right = split.map((r, i) => {
      const ms = byRound.get(r);
      return sideCol(r, ms.slice(ms.length / 2), i, 'right');
    }).reverse();
    const mid = html`
      <div class="b-round center" style="--r:${split.length};--lv:${split.length}">
        <div class="b-col b-center">
          ${center.map((r, k) => html`<div class="b-center-item ${r === GF || (format !== 'double' && r === R) ? 'final' : ''}">
            <div class="b-round-head">${roundName(r, tour.size, format, true)}</div>
            ${matchBox(byRound.get(r)[0], k)}
          </div>`)}
          ${champ ? html`<div class="b-center-item champ">${champCard()}</div>` : ''}
        </div>
      </div>`;
    return html`<div class="bracket-wrap"><div class="bracket mirrored ${compact ? 'compact' : ''} ${sizeCls} ${cls}" style="--n1:${n1}">${left}${mid}${right}<svg class="b-lines"></svg></div></div>`;
  };

  /*
   * Phone view: one round at a time as a list of match cards, with buttons to switch rounds.
   * Opens on the round that is being played now.
   */
  const listView = (rounds) => {
    const chrono = [...rounds.filter((r) => r !== GF), ...rounds.filter((r) => r === GF)];
    const current = chrono.find((r) => (byRound.get(r) ?? []).some((m) => !m.winner_id && m.player1_id && m.player2_id))
      ?? [...chrono].reverse().find((r) => (byRound.get(r) ?? []).some((m) => m.winner_id)) ?? rounds[0];
    const group = (r) => (format !== 'double' ? '' : r === GF ? 'gf' : r > LB ? 'lower' : 'upper');
    const champ = tour.champion;
    return html`
      <div class="bracket-list">
        ${champ ? html`<div class="bl-champ" data-player="${champ.id}">${ICON.trophy}<span><small>${t('champion')}</small><b>${champ.name}</b></span>${avatar(champ, 40)}</div>` : ''}
        <div class="bl-tabs">
          ${rounds.map((r) => html`<button type="button" class="bl-tab ${group(r)} ${r === current ? 'on' : ''}" data-show-round="${r}">${roundName(r, tour.size, format)}</button>`)}
        </div>
        ${rounds.map((r) => {
          const ms = byRound.get(r) ?? [];
          const done = ms.filter((m) => m.winner_id).length;
          return html`<div class="bl-round ${group(r)}" data-list-round="${r}" ${r === current ? '' : 'hidden'}>
            <div class="bl-head"><b>${roundName(r, tour.size, format)}</b><span>${done} / ${ms.length}</span></div>
            ${ms.map((m, k) => html`<div class="bl-match">${matchBox(m, k)}</div>`)}
          </div>`;
        })}
      </div>`;
  };

  if (format !== 'double') {
    const rounds = [];
    for (let r = 1; r <= R; r++) rounds.push(r);
    return html`${block(rounds, { champ: true })}${listView(rounds)}`;
  }

  const upper = [];
  for (let r = 1; r <= R; r++) upper.push(r);
  const lower = [];
  for (let L = 1; L <= tour.lb_rounds; L++) lower.push(LB + L);
  return html`
    <div class="brackets-double">
      <div class="bk-title gf"><span>${t('grand_final')}</span><small>${t('grand_final_sub')}</small></div>
      ${block([GF], { champ: true, cls: 'gf' })}
      <div class="bk-title upper"><span>${t('upper_bracket')}</span><small>${t('upper_bracket_sub')}</small></div>
      ${block(upper, { cls: 'upper' })}
      <div class="bk-title lower"><span>${t('lower_bracket')}</span><small>${t('lower_bracket_sub')}</small></div>
      ${block(lower, { cls: 'lower', straight: true })}
    </div>
    ${listView([GF, ...upper, ...lower])}`;
}

/** Draws connector lines between rounds. Call after the bracket is in the DOM; redraws on resize. */
export function mountBracket(root, detail, { onMatch, onPlayer } = {}) {
  const brackets = $$('.bracket', root);
  if (!brackets.length) return () => {};
  const byId = new Map(detail.matches.map((m) => [m.id, m]));
  const byKey = new Map(detail.matches.map((m) => [`${m.round}:${m.slot}`, m]));
  const cleanups = [];
  const drawers = [];

  // One scale for every part (upper, lower, final) so all boxes are the same size: the widest part decides.
  // First stretch or shrink the box width (the same for every part) so the bracket fills the page with
  // readable text; only if the boxes would get too narrow does it fall back to scaling everything down.
  // Box width and column gap are worked out together: boxes stretch to fill the page; when space is short
  // the gaps shrink first (down to half), and only then the boxes, so names stay as big as possible.
  const fitWidth = (list) => {
    const info = [];
    let comfy = 0;
    let minMw = 0;
    for (const br of list) {
      br.style.transform = '';
      br.style.removeProperty('--gap');
      const avail = br.parentElement.clientWidth;
      const cols = br.querySelectorAll('.b-round').length;
      if (!avail || !cols) continue;
      const cs = getComputedStyle(br);
      const cur = parseFloat(cs.getPropertyValue('--mw')) || 160;
      const gap = parseFloat(cs.columnGap) || 0;
      info.push({ br, avail, cols, gap, rest: br.offsetWidth - cols * cur - (cols - 1) * gap });
      const big = br.classList.contains('s64') ? 2 : br.classList.contains('s32') ? 1 : 0;
      comfy = Math.max(comfy, [190, 150, 128][big]);
      minMw = Math.max(minMw, [130, 108, 96][big]);
    }
    if (!info.length) return;
    const mwAt = (f) => Math.min(...info.map((x) => (x.avail - x.rest - (x.cols - 1) * x.gap * f) / x.cols));
    let f = 1;
    while (f > 0.5 && mwAt(f) < comfy) f -= 0.05;
    const mw = Math.floor(Math.min(300, Math.max(minMw, mwAt(f))));
    for (const x of info) {
      x.br.style.setProperty('--gap', `${Math.round(x.gap * f)}px`);
      x.br.style.setProperty('--mw', `${mw}px`);
      // Narrow boxes: drop the avatar, then the seed number, so the name keeps the space.
      x.br.classList.toggle('no-av', mw < 200);
      x.br.classList.toggle('no-seed', mw < 125);
    }
  };
  const scaleOf = (list) => {
    fitWidth(list);
    let scale = 1;
    for (const br of list) {
      const avail = br.parentElement.clientWidth;
      if (avail > 0 && br.offsetWidth > avail) scale = Math.min(scale, avail / br.offsetWidth);
    }
    return scale;
  };
  const place = (br, scale) => {
    const wrap = br.parentElement;
    const natural = br.offsetWidth;
    const rtl = getComputedStyle(br).direction === 'rtl';
    const avail = wrap.clientWidth;
    if (natural <= avail) {
      // Already narrower than the page (e.g. the grand final): flexbox centres it, scale around the middle.
      br.style.transformOrigin = 'top center';
      br.style.transform = scale < 1 ? `scale(${scale})` : '';
    } else {
      // Wider than the page: it starts at the edge, so shift it to the middle after scaling.
      const off = Math.max(0, (avail - natural * scale) / 2);
      br.style.transformOrigin = rtl ? 'top right' : 'top left';
      br.style.transform = `translateX(${rtl ? -off : off}px) scale(${scale})`;
    }
    wrap.style.height = `${Math.ceil(br.offsetHeight * scale) + 8}px`;
    br.classList.toggle('scaled', scale < 1);
  };
  // Upper, lower and final share one box size. Only when the lower bracket is so much wider that it would
  // shrink everything to unreadable (64-player double elimination) does it get its own size.
  const fitAll = () => {
    const lower = brackets.filter((b) => b.classList.contains('lower'));
    const rest = brackets.filter((b) => !b.classList.contains('lower'));
    let scale = scaleOf(brackets);
    if (scale < 0.85 && lower.length && rest.length) {
      const own = scaleOf(rest);
      if (own > scale + 0.05) {
        for (const br of rest) place(br, own);
        const ls = scaleOf(lower);
        for (const br of lower) place(br, ls);
        return;
      }
      scale = scaleOf(brackets);
    }
    for (const br of brackets) place(br, scale);
  };
  // Long names shrink a little to fit their box (down to 78%) before falling back to "…".
  const fitNames = () => {
    const range = document.createRange();
    for (const n of $$('.b-slot[data-player] .b-name', root)) {
      n.style.fontSize = '';
      const have = n.clientWidth;
      if (!(have > 0) || n.scrollWidth <= have) continue;
      // The real text width (scrollWidth is rounded and never smaller than the box).
      range.selectNodeContents(n);
      const need = range.getBoundingClientRect().width / (n.getBoundingClientRect().width / n.offsetWidth || 1);
      if (need > have - 2) n.style.fontSize = `${Math.max(0.78, (have - 3) / need).toFixed(3)}em`;
    }
  };
  const relayoutAll = () => {
    fitAll();
    fitNames();
    drawers.forEach((d) => d());
  };

  for (const bracket of brackets) {
    const svgEl = $('.b-lines', bracket);
    const wrap = bracket.parentElement;
    let first = true;

    // Scale the whole bracket down so it always fits the width — no sideways scrolling.
    const draw = () => {
      const box = bracket.getBoundingClientRect();
      if (!box.width) return;
      svgEl.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const paths = [];
      for (const el of $$('[data-match]', bracket)) {
        const m = byId.get(Number(el.dataset.match));
        if (!m) continue;
        let target;
        let rowIndex;
        if (m.win_to !== undefined) {
          target = m.win_to === 'champ' ? $('[data-champ]', bracket) : m.win_to ? $(`[data-match="${m.win_to}"]`, bracket) : null;
          rowIndex = (m.win_field ?? 1) - 1;
        } else {
          const next = byKey.get(`${m.round + 1}:${Math.floor(m.slot / 2)}`);
          target = next ? $(`[data-match="${next.id}"]`, bracket) : $('[data-champ]', bracket);
          rowIndex = m.slot % 2;
        }
        if (!target) continue;
        const toChamp = target.hasAttribute('data-champ');
        const a = el.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        if (el.closest('.b-round') === target.closest('.b-round') && (b.left >= a.right - 1 || b.right <= a.left + 1)) {
          // Side by side in the middle (grand final → champion): short horizontal connector.
          const right = b.left >= a.right - 1;
          const x1h = (right ? a.right : a.left) - box.left;
          const x2h = (right ? b.left : b.right) - box.left;
          const yh = a.top + a.height / 2 - box.top;
          const lenH = Math.abs(x2h - x1h);
          const winH = m.winner_id && detail.tournament.champion;
          if (lenH > 2) paths.push(`<path d="M${x1h},${yh} H${x2h}" class="${winH ? 'win' : ''} ${first ? 'draw' : ''}" style="--len:${lenH};stroke-dasharray:${lenH}"/>`);
          continue;
        }
        if (el.closest('.b-round') === target.closest('.b-round')) {
          // Stacked in the middle column: short vertical connector.
          const x = a.left + a.width / 2 - box.left;
          const y1v = a.bottom - box.top;
          const y2v = b.top - box.top;
          const lenV = Math.abs(y2v - y1v);
          const winV = m.winner_id && (toChamp ? detail.tournament.champion : true);
          if (lenV > 2) paths.push(`<path d="M${x},${y1v} V${y2v}" class="${winV ? 'win' : ''} ${first ? 'draw' : ''}" style="--len:${lenV};stroke-dasharray:${lenV}"/>`);
          continue;
        }
        const forward = b.left + b.width / 2 > a.left + a.width / 2;
        const x1 = (forward ? a.right : a.left) - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = (forward ? b.left : b.right) - box.left;
        let y2 = b.top + b.height / 2 - box.top;
        if (!toChamp) {
          const row = $$('.b-slot', target)[rowIndex];
          if (row) {
            const rr = row.getBoundingClientRect();
            y2 = rr.top + rr.height / 2 - box.top;
          }
        }
        const xm = (x1 + x2) / 2;
        const d = `M${x1},${y1} H${xm} V${y2} H${x2}`;
        const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
        const win = m.winner_id && (toChamp ? detail.tournament.champion : true);
        const col = Number(el.closest('.b-round')?.style.getPropertyValue('--r')) || 0;
        paths.push(`<path d="${d}" class="${win ? 'win' : ''} ${first ? 'draw' : ''}" style="--len:${len};stroke-dasharray:${len};animation-delay:${col * 0.12 + 0.25}s"/>`);
      }
      svgEl.innerHTML = paths.join('');
      first = false;
    };

    drawers.push(draw);
    const ro = new ResizeObserver(() => requestAnimationFrame(relayoutAll));
    ro.observe(wrap);
    ro.observe(bracket);
    // Wait for the pop-in animation to settle so the geometry is final.
    setTimeout(relayoutAll, 30);
    const late = setTimeout(relayoutAll, 700);

    bracket.addEventListener('click', (e) => {
      const slotEl = e.target.closest('[data-player]');
      const matchEl = e.target.closest('[data-match]');
      if (onMatch && matchEl) return onMatch(Number(matchEl.dataset.match));
      if (onPlayer && slotEl?.dataset.player) return onPlayer(Number(slotEl.dataset.player));
      return undefined;
    });
    cleanups.push(() => {
      ro.disconnect();
      clearTimeout(late);
    });
  }

  // Phone list view: switch rounds, open matches / players.
  const list = $('.bracket-list', root);
  const onListClick = (e) => {
    const tab = e.target.closest('[data-show-round]');
    if (tab) {
      const r = tab.dataset.showRound;
      $$('[data-show-round]', list).forEach((b) => b.classList.toggle('on', b === tab));
      $$('[data-list-round]', list).forEach((el) => { el.hidden = el.dataset.listRound !== r; });
      centreTab(tab);
      return;
    }
    const matchEl = e.target.closest('[data-match]');
    const slotEl = e.target.closest('[data-player]');
    if (onMatch && matchEl) onMatch(Number(matchEl.dataset.match));
    else if (onPlayer && slotEl?.dataset.player) onPlayer(Number(slotEl.dataset.player));
  };
  list?.addEventListener('click', onListClick);
  // Centre the current round's button without scrolling the page.
  const centreTab = (tab) => {
    const bar = tab?.parentElement;
    if (!bar) return;
    const a = tab.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    bar.scrollBy({ left: a.left - b.left - (b.width - a.width) / 2, behavior: 'smooth' });
  };
  if (list) requestAnimationFrame(() => centreTab($('.bl-tab.on', list)));

  // Highlight a player's path on hover (across upper, lower and final brackets).
  const over = (e) => {
    const pid = e.target.closest?.('.bracket [data-player]')?.dataset.player;
    for (const el of $$('.b-slot.hl', root)) el.classList.remove('hl');
    if (pid) for (const el of $$(`.b-slot[data-player="${pid}"]`, root)) el.classList.add('hl');
  };
  const leave = () => $$('.b-slot.hl', root).forEach((el) => el.classList.remove('hl'));
  root.addEventListener('mouseover', over);
  root.addEventListener('mouseleave', leave);

  return () => {
    cleanups.forEach((fn) => fn());
    list?.removeEventListener('click', onListClick);
    root.removeEventListener('mouseover', over);
    root.removeEventListener('mouseleave', leave);
  };
}

/* ---------------------------------------------------------------- SR sparkline */

export function sparkline(curve, { w = 600, h = 120 } = {}) {
  if (!curve || curve.length < 2) return '';
  const vals = curve.map((c) => c.sr);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 14;
  const span = Math.max(1, max - min);
  const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  const area = `M${pts[0][0]},${h} L${line.replaceAll(' ', ' L')} L${pts.at(-1)[0]},${h} Z`;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const last = pts.at(-1);
  return raw(`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path class="area" d="${area}"/>
    <polyline class="ln draw" points="${line}" style="--len:${len.toFixed(0)}"/>
    <circle class="dot" cx="${last[0]}" cy="${last[1]}" r="4.5"/>
    <text x="${w - 6}" y="14" text-anchor="end">${max}</text>
    <text x="${w - 6}" y="${h - 5}" text-anchor="end">${min}</text>
  </svg>`);
}

/* ---------------------------------------------------------------- profile modal */

export async function openProfile(id, { onClose } = {}) {
  const m = modal({ title: t('profile'), body: loaderHtml(), wide: true, onClose });
  try {
    const p = await api(`/players/${id}`);
    $('.modal-head h2', m.el).textContent = p.name;
    m.body.innerHTML = String(html`
      <div class="prof-head">
        ${avatar(p, 104)}
        <div>
          <h3>${p.name}</h3>
          ${p.battletag ? html`<div class="tag">${p.battletag}</div>` : ''}
          <div class="prof-ranks">${tierChip(p.tier, { size: 'lg' })}${p.rank_tier && p.rank_tier !== 'unranked' ? rankBadge(p.rank_tier, p.rank_division, { size: 30, label: true }) : ''}</div>
        </div>
        <div class="prof-pos"><div class="v">#${p.position}</div><div class="k">${t('position')}</div></div>
      </div>
      <div class="tiles">
        <div class="tile accent" style="--i:0"><div class="k">${t('sr')}</div><div class="v" data-count="${p.sr}">${p.sr}</div></div>
        <div class="tile" style="--i:1"><div class="k">${t('wins')}</div><div class="v">${p.wins}</div></div>
        <div class="tile" style="--i:2"><div class="k">${t('losses')}</div><div class="v">${p.losses}</div></div>
        <div class="tile" style="--i:3"><div class="k">${t('winrate')}</div><div class="v">${p.winrate === null ? '—' : `${p.winrate}%`}</div></div>
        <div class="tile" style="--i:4"><div class="k">${t('streak')}</div><div class="v">${p.streak ? `${p.streak > 0 ? 'W' : 'L'}${Math.abs(p.streak)}` : '—'}</div></div>
        <div class="tile" style="--i:5"><div class="k">${t('titles')}</div><div class="v">${p.titles}</div></div>
      </div>
      <div class="section">
        <div class="section-head"><h4 class="section-title">${t('sr_history')}</h4><span class="section-sub">${t('joined')} ${ago(p.joined_at)}</span></div>
        ${p.curve.length > 1 ? sparkline(p.curve) : html`<div class="empty-state" style="min-height:120px">${t('no_matches_yet')}</div>`}
      </div>
      <div class="section">
        <div class="section-head"><h4 class="section-title">${t('recent_matches')}</h4></div>
        <div class="rows">
          ${p.matches.length ? p.matches.map((mt, i) => html`
            <div class="row" style="--cols:3;--i:${i}">
              <div class="label">
                ${mt.result ? html`<span class="form"><i class="${mt.result}">${t(mt.result === 'W' ? 'w' : 'l')}</i></span>` : html`<span class="chip live">${t('live')}</span>`}
                <span class="txt">${t('vs')}</span>${avatar(mt.opponent, 26)}<span class="txt">${mt.opponent?.name ?? '—'}</span>
              </div>
              <div class="cell"><span class="m-score">${mt.score_for} - ${mt.score_against}</span></div>
              <div class="cell ${mt.sr_delta ? '' : 'soft'}"><span class="delta ${mt.sr_delta > 0 ? 'up' : mt.sr_delta < 0 ? 'down' : ''}">${mt.sr_delta > 0 ? `+${mt.sr_delta}` : mt.sr_delta || '—'}</span></div>
              <div class="cell soft" style="font-size:14px">${mt.tournament ? html`${mt.tournament.name}<br><small>${roundName(mt.tournament.round, mt.tournament.size, mt.tournament.format)}</small>` : t('showmatch')}</div>
            </div>`) : html`<div class="row empty-row" style="--cols:3"><div class="label">${t('no_matches_yet')}</div><div class="cell empty">${t('empty')}</div><div class="cell empty">${t('empty')}</div><div class="cell empty">${t('empty')}</div></div>`}
        </div>
      </div>`);
    countUp(m.body);
  } catch (err) {
    toastError(err);
    m.close();
  }
  return m;
}

export const fmtNum = num;
