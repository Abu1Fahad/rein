import { $, html, render, api, loaderHtml, toastError, date } from '../lib.js';
import { t } from '../i18n.js';
import { ICON, IMG, coverFor, avatar, statusChip, bracketHtml, mountBracket, openProfile, EMBLEM } from '../components.js';

export default {
  async mount(view, params, ctx) {
    let list = [];
    let currentId = Number(params[0]) || null;
    let detail = null;
    let unmountBracket = () => {};

    render(view, html`
      <div class="t-page">
        <nav class="t-picker" id="t-side" aria-label="${t('tournaments')}"></nav>
        <section class="t-main" id="t-content">${loaderHtml()}</section>
        <section class="bracket-full" id="t-bracket"></section>
      </div>`);
    const side = $('#t-side', view);
    const content = $('#t-content', view);
    // The bracket gets the whole page width (under the list) so names stay readable in big brackets.
    const bracketEl = $('#t-bracket', view);

    // Tournament picker: a row of cards across the top (swipe on phones).
    const drawSide = () => {
      render(side, list.length ? list.map((tour, i) => html`
        <a class="t-card ${tour.id === currentId ? 'active' : ''} ${tour.status}" style="--i:${i}" href="/tournaments/${tour.id}" data-link>
          <span class="t-card-top">${statusChip(tour.status)}${tour.format === 'double' ? html`<span class="t-card-fmt">2×</span>` : ''}</span>
          <b class="t-card-name">${tour.name}</b>
          <span class="t-card-sub">${tour.players} / ${tour.size} ${t('players')}${tour.champion ? html` · 🏆 ${tour.champion.name}` : ''}</span>
        </a>`) : '');
      // Bring the selected card into view sideways only (never scroll the page up).
      const active = side.querySelector('.t-card.active');
      if (active) {
        const a = active.getBoundingClientRect();
        const bar = side.getBoundingClientRect();
        if (a.left < bar.left || a.right > bar.right) side.scrollBy({ left: a.left - bar.left - 12 });
      }
    };

    const drawContent = (animate = true) => {
      unmountBracket();
      render(bracketEl, '');
      if (!list.length) {
        render(content, html`<div class="empty-state">${EMBLEM}<b>${t('no_tournaments')}</b>${t('no_tournaments_sub')}</div>`);
        return;
      }
      if (!detail) {
        render(content, loaderHtml());
        return;
      }
      const tour = detail.tournament;
      render(content, html`
        <div class="${animate ? '' : 'no-anim'}">
          <div class="t-hero">
            <img class="cover" src="${coverFor(tour.id) ?? IMG.banner}" alt="" referrerpolicy="no-referrer" data-fallback>
            <div class="three" data-3d="trophy"></div>
            <div class="t-meta">${statusChip(tour.status)}<span class="chip plain">${t('best_of', { n: tour.best_of })}</span><span class="chip plain">${tour.players} / ${tour.size} ${t('players')}</span><span class="chip plain">${tour.format === 'double' ? t('format_double') : t('format_single')}</span><span class="chip plain">${tour.affects_sr ? t('sr_counts') : t('sr_no')}</span>${tour.starts_at ? html`<span class="chip plain">${date(tour.starts_at, true)}</span>` : ''}</div>
            <h1>${tour.name}</h1>
            ${tour.description ? html`<p dir="auto">${tour.description}</p>` : ''}
            ${tour.champion ? html`<div class="t-meta"><span class="chip completed">🏆 ${t('champion')}</span>${avatar(tour.champion, 26)}<b style="font-size:20px">${tour.champion.name}</b></div>` : ''}
          </div>
        </div>`);
      render(bracketEl, html`
        <div class="section ${animate ? '' : 'no-anim'}">
          <div class="section-head"><h2 class="section-title">${t('bracket')}</h2><span class="section-sub">${tour.players} ${t('players')}</span></div>
          ${bracketHtml(detail)}
        </div>`);
      unmountBracket = mountBracket(bracketEl, detail, { onPlayer: (id) => openProfile(id) });
    };

    const loadDetail = async (animate = true) => {
      if (!currentId) {
        detail = null;
        drawContent();
        return;
      }
      try {
        detail = await api(`/tournaments/${currentId}`);
      } catch (err) {
        toastError(err);
        detail = null;
      }
      drawContent(animate);
    };

    const loadList = async () => {
      try {
        list = (await api('/tournaments')).tournaments;
      } catch (err) {
        toastError(err);
        list = [];
      }
      if (!currentId || !list.some((x) => x.id === currentId)) currentId = list[0]?.id ?? null;
      drawSide();
    };

    await loadList();
    await loadDetail();

    return {
      async update(next) {
        currentId = Number(next[0]) || list[0]?.id || null;
        drawSide();
        detail = null;
        drawContent();
        await loadDetail();
      },
      async refresh(batch) {
        if (!batch.some((c) => ['tournaments', 'matches', 'players'].includes(c.scope))) return;
        await loadList();
        await loadDetail(false);
      },
      unmount: () => unmountBracket(),
    };
  },
};
