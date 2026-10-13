import { $, html, render, api, loaderHtml, toastError, ago } from '../lib.js';
import { t } from '../i18n.js';
import { avatar, roundName, openProfile, EMBLEM } from '../components.js';

const FILTERS = [
  { id: 'all', key: 'all_matches' },
  { id: 'live', key: 'live_now' },
  { id: 'tournament', key: 'tournament_matches' },
  { id: 'showmatch', key: 'showmatches' },
];

export function matchRow(m, i, { admin = false } = {}) {
  const w1 = m.winner_id && m.winner_id === m.player1_id;
  const w2 = m.winner_id && m.winner_id === m.player2_id;
  const live = m.status === 'live';
  const where = m.tournament_id
    ? html`<b>${m.tournament_name ?? t('tournament')}</b>${m.round && m.tournament_size ? roundName(m.round, m.tournament_size, m.tournament_format) : ''}`
    : html`<b>${t('showmatch')}</b>`;
  const side = (p, win, right) => html`
    <div class="cell m-side ${right ? 'right' : ''} ${win ? 'win' : m.winner_id ? 'lose' : ''}" ${p ? html`data-player="${p.id}"` : ''}>
      ${avatar(p, 30)}<span class="n">${p?.name ?? t('tbd')}</span>
    </div>`;
  return html`
    <div class="row m-row ${admin ? 'interactive' : ''}" style="--i:${i}" data-match="${m.id}">
      <div class="cell m-meta">${live ? html`<span class="chip live">${t('live')}</span>` : where}</div>
      ${side(m.p1, w1, false)}
      <div class="cell ${live ? 'accent' : ''}"><span class="m-score">${m.score1} - ${m.score2}</span></div>
      ${side(m.p2, w2, true)}
      <div class="cell m-meta m-when">${m.applied ? html`<b><span class="delta up">+${m.sr_gain}</span> / <span class="delta down">−${m.sr_loss}</span></b>` : html`<b>—</b>`}${live ? t('live') : ago(m.played_at)}</div>
    </div>`;
}

export default {
  async mount(view) {
    let filter = 'all';
    let matches = [];

    render(view, html`
      <div class="layout no-aside">
        <aside class="side" id="m-side"></aside>
        <section class="content" id="m-content">${loaderHtml()}</section>
      </div>`);
    const side = $('#m-side', view);
    const content = $('#m-content', view);

    const drawSide = () => render(side, FILTERS.map((f, i) => html`<button class="side-btn ${filter === f.id ? 'active' : ''}" style="--i:${i}" data-filter="${f.id}">${t(f.key)}</button>`));

    const draw = (animate = true) => {
      const title = t(FILTERS.find((f) => f.id === filter).key);
      render(content, html`
        <div class="section ${animate ? '' : 'no-anim'}">
          <div class="section-head"><h2 class="section-title">${title}</h2><span class="section-sub">${matches.length}</span></div>
          ${matches.length
            ? html`<div class="rows">${matches.map((m, i) => matchRow(m, i))}</div>`
            : html`<div class="empty-state">${EMBLEM}<b>${t('no_matches')}</b></div>`}
        </div>`);
    };

    const load = async (animate = true) => {
      try {
        matches = (await api(`/matches?type=${filter}&limit=100`)).matches;
      } catch (err) {
        toastError(err);
        matches = [];
      }
      draw(animate);
    };

    side.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn || btn.dataset.filter === filter) return;
      filter = btn.dataset.filter;
      drawSide();
      render(content, loaderHtml());
      load();
    });
    content.addEventListener('click', (e) => {
      const p = e.target.closest('[data-player]');
      if (p) openProfile(Number(p.dataset.player));
    });

    drawSide();
    await load();
    return {
      async refresh(batch) {
        if (batch.some((c) => ['matches', 'players', 'tournaments'].includes(c.scope))) await load(false);
      },
    };
  },
};
