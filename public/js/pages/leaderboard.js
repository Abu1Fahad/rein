import { $, html, render, api, countUp, loaderHtml, toastError, debounce } from '../lib.js';
import { t } from '../i18n.js';
import { ICON, avatar, tierChip, formPips, trend, heroCard, openProfile, openRankModal, EMBLEM } from '../components.js';

const CATS = [
  { id: 'sr', key: 'lb_cat_sr', sort: (a, b) => a.position - b.position },
  { id: 'wins', key: 'lb_cat_wins', sort: (a, b) => b.wins - a.wins || a.position - b.position },
  { id: 'wr', key: 'lb_cat_wr', filter: (p) => p.games >= 3, sort: (a, b) => b.winrate - a.winrate || b.games - a.games, sub: () => t('min_games', { n: 3 }) },
  { id: 'streak', key: 'lb_cat_streak', filter: (p) => p.streak > 0, sort: (a, b) => b.streak - a.streak || a.position - b.position },
  { id: 'active', key: 'lb_cat_active', sort: (a, b) => b.games - a.games || a.position - b.position },
  { id: 'titles', key: 'lb_cat_titles', filter: (p) => p.titles > 0, sort: (a, b) => b.titles - a.titles || a.position - b.position },
  { id: 'new', key: 'lb_cat_new', sort: (a, b) => new Date(b.joined_at) - new Date(a.joined_at) },
];

const MIN_ROWS = 8;

export default {
  async mount(view, _params, ctx) {
    let players = [];
    let cat = 'sr';
    let query = '';
    let selected = null;
    let firstPaint = true;

    render(view, html`
      <div class="layout">
        <aside class="side" id="lb-side"></aside>
        <section class="content" id="lb-content">${loaderHtml()}</section>
        <aside class="aside" id="lb-aside"></aside>
      </div>`);

    const side = $('#lb-side', view);
    const content = $('#lb-content', view);
    const aside = $('#lb-aside', view);

    const list = () => {
      const c = CATS.find((x) => x.id === cat);
      let out = players.filter(c.filter ?? (() => true));
      if (query) {
        const q = query.toLowerCase();
        out = out.filter((p) => `${p.name} ${p.username ?? ''} ${p.battletag ?? ''}`.toLowerCase().includes(q));
      }
      return [...out].sort(c.sort);
    };

    const drawSide = () => {
      render(side, html`
        ${CATS.map((c, i) => html`<button class="side-btn ${cat === c.id ? 'active' : ''}" style="--i:${i}" data-cat="${c.id}">${t(c.key)}</button>`)}
        <button class="side-btn ranks-btn" style="--i:${CATS.length}" data-ranks>${t('ranks_btn')}</button>
        <div class="side-sep"></div>
        <div class="showcase" style="--i:${CATS.length}">
          <span class="hint3d">3D · HOVER · CLICK</span>
          <div class="three" data-3d="hammer">${EMBLEM}</div>
          <div class="showcase-label">Reinhardt<small>Rocket Hammer</small></div>
        </div>
        <div class="panel" id="lb-season" style="--i:${CATS.length + 1}">${seasonPanel()}</div>`);
    };

    const seasonPanel = () => html`
      <h3>${ctx.meta?.settings.season_name ?? ''}</h3>
      <dl class="kv">
        <dt>${t('players')}</dt><dd>${ctx.meta?.stats.players ?? 0}</dd>
        <dt>${t('played')}</dt><dd>${ctx.meta?.stats.matches ?? 0}</dd>
        <dt>${t('live')}</dt><dd>${ctx.meta?.stats.live ?? 0}</dd>
        <dt>${t('starting_sr')}</dt><dd>${ctx.meta?.settings.starting_sr ?? ''}</dd>
      </dl>`;

    const row = (p, i, c) => html`
      <div class="row lb-row interactive ${cat === 'sr' && !query && p.position <= 3 ? `top${p.position}` : ''} ${selected === p.id ? 'selected' : ''}" style="--i:${i}" data-player="${p.id}">
        <div class="label">
          <span class="lb-pos">${cat === 'sr' ? p.position : i + 1}</span>
          ${avatar(p, 32)}
          <span class="lb-name"><span class="n">${p.name}</span>${p.battletag ? html`<span class="tag">${p.battletag}</span>` : ''}</span>
          ${p.titles ? html`<span class="hint">🏆 ${p.titles}</span>` : ''}
        </div>
        <div class="cell hide-sm">${tierChip(p.tier)}</div>
        <div class="cell hide-sm" dir="ltr">${c === 'wr' ? `${p.winrate ?? 0}%` : html`${p.wins}<span style="opacity:.5">-</span>${p.losses}`}</div>
        <div class="cell">${c === 'streak' ? html`<span class="sr-val">W${p.streak}</span>` : c === 'active' ? html`<span class="sr-val">${p.games}</span>` : formPips(p.form)}</div>
        <div class="cell ${i === 0 && cat === 'sr' && !query ? 'accent' : ''}"><span class="sr-val" data-count="${firstPaint ? p.sr : ''}">${p.sr}</span>${trend(p.trend)}</div>
      </div>`;

    const emptyRow = (i) => html`
      <div class="row lb-row empty-row" style="--i:${i}">
        <div class="label"><span class="lb-pos" style="opacity:.4">—</span><span class="txt">${t('empty')}</span></div>
        <div class="cell empty hide-sm">${t('empty')}</div><div class="cell empty hide-sm">${t('empty')}</div>
        <div class="cell empty">${t('empty')}</div><div class="cell empty">${t('empty')}</div>
      </div>`;

    const podium = (top) => html`
      <div class="podium">
        ${top.map((p, i) => html`
          <div class="pod p${i + 1}" data-player="${p.id}">
            <div class="pod-art">
              ${i === 0 ? html`<span class="crown">${ICON.crown}</span>` : ''}
              <span class="pod-place">${i + 1}</span>
              <span class="pod-rank">${tierChip(p.tier)}</span>
              ${avatar(p, i === 0 ? 118 : 92)}
            </div>
            <div class="pod-name">${p.name}</div>
            <div class="pod-sr"><b data-count="${firstPaint ? p.sr : ''}">${p.sr}</b> SR</div>
          </div>`)}
      </div>`;

    const drawContent = () => {
      const c = CATS.find((x) => x.id === cat);
      const rows = list();
      const showPodium = cat === 'sr' && !query && rows.length >= 3;
      const pad = Math.max(0, MIN_ROWS - rows.length);
      const colHead = cat === 'wr' ? t('winrate') : `${t('w')}-${t('l')}`;
      const formHead = cat === 'streak' ? t('streak') : cat === 'active' ? t('games') : t('form');
      render(content, html`
        <div class="section ${firstPaint ? '' : 'no-anim'}">
          <div class="section-head">
            <h2 class="section-title">${ctx.meta?.settings.season_name ?? ''} · ${t(c.key)}</h2>
            ${c.sub ? html`<span class="section-sub">${c.sub()}</span>` : ''}
            <div class="section-tools">
              <label class="search-box">${ICON.search}<input class="input" id="lb-q" placeholder="${t('search_players')}" value="${query}" autocomplete="off"></label>
            </div>
          </div>
          ${showPodium ? podium(rows.slice(0, 3)) : ''}
          <div class="row-head lb" style="--cols:4"><span>${t('player')}</span><span class="hide-sm">${t('rank')}</span><span class="hide-sm">${colHead}</span><span>${formHead}</span><span>${t('sr')}</span></div>
          <div class="rows">
            ${rows.map((p, i) => row(p, i, cat))}
            ${Array.from({ length: pad }, (_, i) => emptyRow(rows.length + i))}
          </div>
        </div>`);
      if (firstPaint) countUp(content);
      const input = $('#lb-q', content);
      input.addEventListener('input', debounce(() => {
        query = input.value.trim();
        const pos = input.selectionStart;
        drawContent();
        const again = $('#lb-q', content);
        again.focus();
        again.setSelectionRange(pos, pos);
      }, 120));
    };

    const drawAside = () => {
      const p = players.find((x) => x.id === selected) ?? players[0] ?? null;
      if (!p) {
        render(aside, html`<div class="hero-card"><div class="hero-art">${EMBLEM}</div><div class="hero-name">${t('empty')}</div></div>`);
        return;
      }
      render(aside, html`
        ${heroCard(p, { position: p.position, button: t('view_profile'), buttonAttrs: `data-profile="${p.id}"` })}
        <div class="stat-grid">
          <div class="stat"><span class="k">${t('sr')}</span><span class="v">${p.sr}</span></div>
          <div class="stat wide"><span class="k">${t('rank')}</span>${tierChip(p.tier)}</div>
          <div class="stat"><span class="k">${t('winrate')}</span><span class="v">${p.winrate === null ? '—' : `${p.winrate}%`}</span></div>
          <div class="stat"><span class="k">${t('wins')}</span><span class="v">${p.wins}</span></div>
          <div class="stat"><span class="k">${t('losses')}</span><span class="v">${p.losses}</span></div>
          <div class="stat wide"><span class="k">${t('form')}</span>${formPips(p.form)}</div>
        </div>`);
    };

    const load = async () => {
      try {
        players = (await api('/leaderboard')).players;
      } catch (err) {
        toastError(err);
        players = [];
      }
      // The sidebar holds the live 3D model — build it once, then only refresh the numbers.
      if (!$('[data-cat]', side)) drawSide();
      else render($('#lb-season', side), seasonPanel());
      drawContent();
      drawAside();
      firstPaint = false;
    };

    side.addEventListener('click', (e) => {
      if (e.target.closest('[data-ranks]')) {
        const me = players.find((x) => x.id === selected) ?? players[0];
        openRankModal(me?.tier?.i ?? 0);
        return;
      }
      const btn = e.target.closest('[data-cat]');
      if (!btn || btn.dataset.cat === cat) return;
      cat = btn.dataset.cat;
      firstPaint = true;
      side.querySelectorAll('[data-cat]').forEach((b) => b.classList.toggle('active', b === btn));
      drawContent();
      firstPaint = false;
    });

    const select = debounce((id) => {
      if (selected === id) return;
      selected = id;
      drawAside();
    }, 60);
    content.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-player]');
      if (el) select(Number(el.dataset.player));
    });
    content.addEventListener('click', (e) => {
      if (e.target.closest('[data-rank]')) return;
      const el = e.target.closest('[data-player]');
      if (el) openProfile(Number(el.dataset.player));
    });
    aside.addEventListener('click', (e) => {
      const el = e.target.closest('[data-profile]');
      if (el) openProfile(Number(el.dataset.profile));
    });

    await load();

    return {
      async refresh(batch) {
        if (batch.some((c) => ['players', 'matches', 'tournaments', 'settings'].includes(c.scope))) await load();
      },
    };
  },
};
