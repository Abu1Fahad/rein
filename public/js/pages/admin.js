import {
  $, $$, html, raw, render, api, toast, toastError, modal, confirmBox, promptBox, loaderHtml, ago, date, toLocalInput, debounce,
} from '../lib.js';
import { t, te, allKeys, baseText } from '../i18n.js';
import { sfx } from '../fx.js';
import {
  ICON, IMG, EMBLEM, TIERS, TIER_LABEL, avatar, rankBadge, statusChip, bracketHtml, mountBracket, roundName,
  tierChip, rangeText, calcPoints,
} from '../components.js';
import { matchRow } from './matches.js';

// role = minimum role that sees the section (moderator < admin < owner)
const SECTIONS = [
  { id: 'overview', key: 'a_overview' },
  { id: 'registrations', key: 'a_registrations' },
  { id: 'players', key: 'a_players' },
  { id: 'tournaments', key: 'a_tournaments' },
  { id: 'matches', key: 'a_matches' },
  { id: 'ranks', key: 'a_ranks', role: 'admin' },
  { id: 'content', key: 'a_content', role: 'admin' },
  { id: 'settings', key: 'a_settings', role: 'admin' },
  { id: 'discord', key: 'a_discord', role: 'admin' },
  { id: 'admins', key: 'a_admins', role: 'owner' },
  { id: 'log', key: 'a_log' },
];
const ROLE_LEVEL = { moderator: 0, admin: 1, owner: 2 };
const canSee = (sec, role) => (ROLE_LEVEL[role] ?? -1) >= (ROLE_LEVEL[sec.role ?? 'moderator'] ?? 0);
const SIZES = [4, 8, 16, 32, 64];

/* ======================================================================== login */

function mountLogin(view, ctx, onDone) {
  render(view, html`
    <div class="login-wrap">
      <div class="login-card hero-card">
        <div class="hero-art">
          <img class="bgimg" src="${IMG.bannerSmall}" alt="" referrerpolicy="no-referrer" data-fallback>
          <div class="fade"></div><div class="three" data-3d="hammer">${EMBLEM}</div>
        </div>
        <div class="hero-name">${t('admin_login')}</div>
        <form id="login-form">
          <label class="field"><span>${t('username')}</span><input class="input" name="username" autocomplete="username" placeholder="${t('username_hint')}" style="text-transform:none"></label>
          <label class="field"><span>${t('password')}</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>
          <div class="err" id="login-err"></div>
          <button class="btn block" type="submit">${t('login')}</button>
        </form>
      </div>
    </div>`);
  const form = $('#login-form', view);
  setTimeout(() => form.password.focus(), 50);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button', form);
    btn.disabled = true;
    try {
      await api('/auth/login', { method: 'POST', body: { username: form.username.value.trim(), password: form.password.value, gate: document.querySelector('meta[name="admin-base"]')?.content ?? '' } });
      sfx('success');
      await ctx.refreshMeta();
      onDone();
    } catch (err) {
      $('#login-err', view).textContent = te(err.code);
      sfx('error');
      form.password.select();
    } finally {
      btn.disabled = false;
    }
  });
  return {};
}

/* ======================================================================== shared bits */

let approvedCache = null;
async function approvedPlayers(force = false) {
  if (!approvedCache || force) approvedCache = (await api('/admin/players?status=approved')).players;
  return approvedCache;
}

const playerOptions = (players, selected) => html`<option value="">— ${t('empty')} —</option>${players.map((p) => html`<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name} · ${p.sr}</option>`)}`;

const seg = (name, options, value) => html`<div class="seg" data-seg="${name}">${options.map(([v, label]) => html`<button type="button" data-v="${v}" class="${String(v) === String(value) ? 'on' : ''}">${label}</button>`)}</div>`;

function segValue(root, name) {
  return $(`[data-seg="${name}"] button.on`, root)?.dataset.v ?? null;
}

function wireSegs(root, onChange) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-seg] button');
    if (!b) return;
    const group = b.closest('[data-seg]');
    $$('button', group).forEach((x) => x.classList.toggle('on', x === b));
    onChange?.(group.dataset.seg, b.dataset.v, b);
  });
}

/* ======================================================================== match editor */

export async function openMatchEditor({ match = null, affectsSr = true, onSaved } = {}) {
  const players = await approvedPlayers();
  const isNew = !match;
  const isBracket = !!match?.tournament_id;
  const state = {
    p1: match?.player1_id ?? null,
    p2: match?.player2_id ?? null,
    winner: match?.winner_id ?? null,
    status: match?.status ?? 'completed',
    srManual: !!match?.applied,
    gain: match?.applied ? match.sr_gain : null,
    loss: match?.applied ? match.sr_loss : null,
  };
  const title = isNew ? t('new_showmatch') : isBracket ? `${t('match_editor')} · ${match.tournament_name ?? ''} ${roundName(match.round, match.tournament_size ?? 2 ** match.round, match.tournament_format)}` : `${t('match_editor')} #${match.id}`;
  const find = (id) => players.find((p) => p.id === id) ?? (id === match?.p1?.id ? match.p1 : id === match?.p2?.id ? match.p2 : null);

  const m = modal({
    title,
    wide: true,
    body: html`<form id="me-form" autocomplete="off"></form>`,
    foot: html`
      ${!isNew && !isBracket ? html`<button class="btn danger sm" data-act="delete" data-need-admin>${ICON.trash}${t('delete')}</button>` : ''}
      ${!isNew && (match.winner_id || match.status !== 'pending') ? html`<button class="btn navy sm" data-act="clear">${ICON.reset}${t('clear_result')}</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn navy sm" data-close>${t('cancel')}</button>
      <button class="btn sm" data-act="save">${ICON.check}${t('save')}</button>`,
  });
  const form = $('#me-form', m.body);

  const wpButton = (side) => {
    const id = side === 1 ? state.p1 : state.p2;
    const p = find(id);
    return html`<button type="button" class="wp ${state.winner && state.winner === id ? 'on' : ''}" data-win="${side}" ${id ? '' : 'disabled'}>
      <span class="crown-mini">${state.winner && state.winner === id ? t('winner') : ''}</span>${avatar(p, 56)}<span>${p?.name ?? t('empty')}</span></button>`;
  };

  const draw = () => {
    render(form, html`
      <div class="form-grid">
        <label class="field"><span>${t('player1')}</span><select class="select" name="p1">${playerOptions(players, state.p1)}</select></label>
        <label class="field"><span>${t('player2')}</span><select class="select" name="p2">${playerOptions(players, state.p2)}</select></label>
        <div class="field full"><span>${t('winner')}</span>
          <div class="winner-pick">${wpButton(1)}<span class="vs">${t('vs')}</span>${wpButton(2)}</div>
        </div>
        <label class="field"><span>${t('score')} · ${find(state.p1)?.name ?? t('player1')}</span><input class="input" type="number" min="0" max="99" name="score1" value="${match?.score1 ?? 0}"></label>
        <label class="field"><span>${t('score')} · ${find(state.p2)?.name ?? t('player2')}</span><input class="input" type="number" min="0" max="99" name="score2" value="${match?.score2 ?? 0}"></label>
        <div class="field full"><span>${t('status')}</span>${seg('status', [['pending', t('pending')], ['live', t('live')], ['completed', t('completed')]], state.winner ? 'completed' : state.status)}</div>
        ${affectsSr ? html`
          <label class="field"><span>${t('sr_gain')}</span><input class="input" type="number" min="0" max="1000" name="gain" value="${state.gain ?? ''}" placeholder="${t('auto')}"></label>
          <label class="field"><span>${t('sr_loss')}</span><input class="input" type="number" min="0" max="1000" name="loss" value="${state.loss ?? ''}" placeholder="${t('auto')}"></label>
          <div class="field full"><span id="me-preview" style="text-transform:none;letter-spacing:.04em"></span></div>`
          : html`<div class="field full"><span>${t('sr')} · ${t('sr_no')}</span></div>`}
        <label class="field full"><span>${t('note')}</span><input class="input" name="note" maxlength="200" value="${match?.note ?? ''}"></label>
      </div>`);
    preview();
  };

  const preview = debounce(async () => {
    const el = $('#me-preview', form);
    if (!el) return;
    const loser = state.winner === state.p1 ? state.p2 : state.p1;
    if (!state.winner || !loser) {
      el.textContent = '';
      return;
    }
    const s1 = Number(form.score1?.value) || 0;
    const s2 = Number(form.score2?.value) || 0;
    const wr = state.winner === state.p1 ? s1 : s2;
    const lr = state.winner === state.p1 ? s2 : s1;
    try {
      const p = await api(`/admin/sr-preview?winner=${state.winner}&loser=${loser}&wr=${wr}&lr=${lr}`);
      const modeName = p.mode === 'rank' ? t('s_rank_mode') : p.mode === 'elo' ? 'Elo' : t('s_fixed');
      const calc = (x, sign, base, out) => html`<span class="me-calc"><b style="color:${x.color}">${x.rank}</b> <span dir="ltr">${sign}${base} × ${p.dominance} × ${p.gap} = ${sign}${out}</span></span>`;
      el.innerHTML = String(html`${t('sr_preview')} (${modeName}): <b class="delta up">+${p.gain}</b> / <b class="delta down">−${p.loss}</b> <button type="button" class="btn xs navy" id="me-auto">${t('auto')}</button>
        ${p.mode === 'rank' ? html`<div class="me-breakdown">🏆 ${calc(p.winner, '+', p.winner.win, p.gain)}<br>✖ ${calc(p.loser, '−', p.loser.loss, p.loss)}<br><span class="help" style="margin:0">${t('calc_legend')}</span>${!wr && !lr ? html`<br><i>${t('enter_score_hint')}</i>` : ''}</div>` : ''}`);
      if (!state.srManual) {
        form.gain.value = p.gain;
        form.loss.value = p.loss;
      }
      $('#me-auto', form).onclick = () => {
        state.srManual = false;
        form.gain.value = p.gain;
        form.loss.value = p.loss;
      };
    } catch {
      el.textContent = '';
    }
  }, 120);

  form.addEventListener('change', (e) => {
    const n = e.target.name;
    if (n === 'p1' || n === 'p2') {
      state[n] = Number(e.target.value) || null;
      if (state.winner && state.winner !== state.p1 && state.winner !== state.p2) state.winner = null;
      state.srManual = false;
      keepInputs(draw);
    }
  });
  form.addEventListener('input', (e) => {
    if (e.target.name === 'gain' || e.target.name === 'loss') state.srManual = true;
    if (e.target.name === 'score1' || e.target.name === 'score2') preview();
  });
  form.addEventListener('click', (e) => {
    const w = e.target.closest('[data-win]');
    if (w) {
      const id = w.dataset.win === '1' ? state.p1 : state.p2;
      state.winner = state.winner === id ? null : id;
      state.status = state.winner ? 'completed' : state.status === 'completed' ? 'pending' : state.status;
      state.srManual = false;
      keepInputs(draw);
    }
  });
  wireSegs(form, (name, v) => {
    if (name !== 'status') return;
    state.status = v;
    if (v !== 'completed') {
      state.winner = null;
      keepInputs(draw);
    }
  });

  // Re-render without losing typed scores / note
  function keepInputs(fn) {
    const saved = { score1: form.score1?.value, score2: form.score2?.value, note: form.note?.value, gain: form.gain?.value, loss: form.loss?.value };
    fn();
    for (const [k, v] of Object.entries(saved)) if (form[k] && v !== undefined) form[k].value = v;
    if (!state.srManual && form.gain) {
      form.gain.value = '';
      form.loss.value = '';
    }
  }

  m.foot.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const btn = e.target.closest('button');
    btn.disabled = true;
    try {
      if (act === 'delete') {
        if (!(await confirmBox(t('delete_match_q'), { danger: true }))) return;
        await api(`/admin/matches/${match.id}`, { method: 'DELETE' });
        toast(t('deleted'), 'ok');
      } else if (act === 'clear') {
        await api(`/admin/matches/${match.id}/clear`, { method: 'POST', body: {} });
        toast(t('result_cleared'), 'ok');
      } else {
        const status = state.winner ? 'completed' : segValue(form, 'status') === 'completed' ? 'pending' : segValue(form, 'status');
        const body = {
          winner_id: state.winner,
          score1: Number(form.score1.value) || 0,
          score2: Number(form.score2.value) || 0,
          status,
          note: form.note.value,
          sr_gain: form.gain && state.srManual && form.gain.value !== '' ? Number(form.gain.value) : null,
          sr_loss: form.loss && state.srManual && form.loss.value !== '' ? Number(form.loss.value) : null,
        };
        if (isNew) {
          await api('/admin/matches', { method: 'POST', body: { ...body, player1_id: state.p1, player2_id: state.p2 } });
        } else {
          if (state.p1 !== match.player1_id || state.p2 !== match.player2_id) {
            await api(`/admin/matches/${match.id}/players`, { method: 'PUT', body: { player1_id: state.p1, player2_id: state.p2 } });
          }
          if (state.winner || status !== 'pending' || match.winner_id || match.status !== 'pending' || body.score1 || body.score2 || body.note !== (match.note ?? '')) {
            await api(`/admin/matches/${match.id}/result`, { method: 'PUT', body });
          }
        }
        sfx('success');
        toast(t('match_saved'), 'ok');
      }
      m.close();
      onSaved?.();
    } catch (err) {
      toastError(err);
    } finally {
      btn.disabled = false;
    }
  });

  draw();
  return m;
}

/* ======================================================================== player editor */

async function openPlayerEditor(player, onSaved) {
  const isNew = !player;
  const p = player ?? { status: 'approved', rank_tier: 'unranked' };
  const m = modal({
    title: isNew ? t('add_player') : `${t('edit_player')} · ${p.name}`,
    wide: true,
    body: html`
      ${!isNew ? html`<div class="prof-head" style="margin-bottom:14px">${avatar(p, 72)}<div><h3 style="font-size:34px">${p.name}</h3><div class="tag">${p.username ? `@${p.username}` : ''} ${p.discord_id ? html`· <span class="code">${p.discord_id}</span>` : ''}</div>
        <div class="tag" style="font-size:14px">${t('created')}: ${date(p.discord_created_at)} · ${t('joined')}: ${date(p.guild_joined_at)} · ${p.in_guild ? t('in_guild') : t('left_guild')} · ${t('last_sync')}: ${ago(p.synced_at)}</div></div><div class="prof-pos">${statusChip(p.status)}</div></div>` : ''}
      <form id="pe-form" class="form-grid" autocomplete="off">
        <label class="field"><span>${t('display_name')}</span><input class="input" name="display_name" maxlength="64" value="${p.display_name ?? ''}"></label>
        <label class="field"><span>${t('battletag')}</span><input class="input" name="battletag" maxlength="40" value="${p.battletag ?? ''}" placeholder="Name#1234"></label>
        <label class="field"><span>${t('rank')}</span><select class="select" name="rank_tier">${TIERS.map((tier) => html`<option value="${tier}" ${p.rank_tier === tier ? 'selected' : ''}>${TIER_LABEL[tier]}</option>`)}</select></label>
        <label class="field"><span>Division</span><select class="select" name="rank_division"><option value="">—</option>${[1, 2, 3, 4, 5].map((d) => html`<option value="${d}" ${p.rank_division === d ? 'selected' : ''}>${d}</option>`)}</select></label>
        <label class="field"><span>${t('sr')}</span><input class="input" type="number" name="sr" min="0" max="20000" value="${p.sr ?? ''}" placeholder="${t('starting_sr')}"></label>
        <label class="field"><span>${t('status')}</span><select class="select" name="status">${['approved', 'pending', 'rejected', 'banned'].map((s) => html`<option value="${s}" ${p.status === s ? 'selected' : ''}>${t(s)}</option>`)}</select></label>
        <label class="field"><span>${t('wins')}</span><input class="input" type="number" name="wins" min="0" value="${p.wins ?? 0}"></label>
        <label class="field"><span>${t('losses')}</span><input class="input" type="number" name="losses" min="0" value="${p.losses ?? 0}"></label>
        <label class="field"><span>${t('discord_id')}</span><input class="input" name="discord_id" maxlength="22" value="${p.discord_id ?? ''}" placeholder="123456789012345678"></label>
        <label class="field"><span>${t('username')}</span><input class="input" name="username" maxlength="64" value="${p.username ?? ''}"></label>
        <label class="field full"><span>${t('avatar_url')}</span><input class="input" name="avatar_url" maxlength="500" value="${p.avatar_url ?? ''}" placeholder="https://…" style="text-transform:none"></label>
        <label class="field full"><span>${t('notes')}</span><textarea class="textarea" name="notes" maxlength="400">${p.notes ?? ''}</textarea></label>
        ${p.reject_reason ? html`<div class="field full"><span>${t('reject_reason')}</span><div class="panel">${p.reject_reason}</div></div>` : ''}
      </form>
      ${!isNew ? html`
        <div class="section" style="margin-top:18px">
          <div class="section-head"><h4 class="section-title">${t('sr_tools')}</h4><span class="section-sub">${tierChip(p.tier)} <b>${p.sr}</b> SR</span></div>
          <div class="sr-tools" data-need-admin>
            <input class="input" type="number" id="pe-delta" placeholder="+50 / -50" step="1">
            <input class="input" id="pe-reason" maxlength="80" placeholder="${t('reason')}" style="text-transform:none">
            <button type="button" class="btn sm" data-act="adjust">${ICON.check}${t('apply_sr')}</button>
            <button type="button" class="btn navy sm" data-act="reset-stats">${ICON.reset}${t('reset_stats')}</button>
          </div>
          <div class="rows" id="pe-history" style="margin-top:10px">${loaderHtml()}</div>
        </div>` : ''}`,
    foot: html`
      ${!isNew ? html`<button class="btn danger sm" data-act="delete" data-need-admin>${ICON.trash}${t('delete')}</button>` : ''}
      ${!isNew && p.discord_id ? html`<button class="btn navy sm" data-act="sync">${ICON.sync}${t('sync')}</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn navy sm" data-close>${t('cancel')}</button>
      <button class="btn sm" data-act="save" data-need-admin>${ICON.check}${t('save')}</button>`,
  });
  const form = $('#pe-form', m.body);
  const loadHistory = async () => {
    const box = $('#pe-history', m.body);
    if (!box) return;
    try {
      const { history } = await api(`/admin/players/${p.id}/history?limit=25`);
      render(box, history.length ? history.map((h, i) => html`
        <div class="row" style="--cols:3;--i:${i}">
          <div class="label"><span class="txt" style="font-size:15px">${h.match_id ? html`${t('match')} #${h.match_id} <span dir="ltr" style="opacity:.7">${h.score1 ?? ''}-${h.score2 ?? ''}</span>` : h.reason}</span></div>
          <div class="cell"><span class="delta ${h.delta > 0 ? 'up' : 'down'}">${h.delta > 0 ? '+' : ''}${h.delta}</span></div>
          <div class="cell">${h.sr_after}</div>
          <div class="cell soft" style="font-size:13px">${ago(h.created_at)}</div>
        </div>`) : html`<div class="empty-state" style="min-height:60px">${t('no_matches_yet')}</div>`);
    } catch {
      render(box, '');
    }
  };
  if (!isNew) loadHistory();
  const toolsHandler = async (act) => {
    if (act === 'adjust') {
      const delta = Number($('#pe-delta', m.body).value);
      if (!delta) return $('#pe-delta', m.body).focus();
      await api(`/admin/players/${p.id}/adjust`, { method: 'POST', body: { delta, reason: $('#pe-reason', m.body).value } });
    } else {
      if (!(await confirmBox(t('reset_stats_q', { name: p.name }), { danger: true }))) return undefined;
      await api(`/admin/players/${p.id}/reset-stats`, { method: 'POST', body: {} });
    }
    sfx('success');
    toast(t('saved'), 'ok');
    approvedCache = null;
    m.close();
    onSaved?.();
    const fresh = await api(`/admin/players/${p.id}`);
    return openPlayerEditor(fresh, onSaved);
  };
  m.body.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act !== 'adjust' && act !== 'reset-stats') return;
    try {
      await toolsHandler(act);
    } catch (err) {
      toastError(err);
    }
  });
  m.foot.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'delete') {
        if (!(await confirmBox(t('delete_player_q', { name: p.name }), { danger: true }))) return;
        await api(`/admin/players/${p.id}`, { method: 'DELETE' });
        toast(t('deleted'), 'ok');
      } else if (act === 'sync') {
        await api(`/admin/players/${p.id}/sync`, { method: 'POST', body: {} });
        toast(t('sync'), 'ok');
      } else {
        const body = Object.fromEntries(new FormData(form).entries());
        for (const k of ['sr', 'wins', 'losses']) body[k] = body[k] === '' ? undefined : Number(body[k]);
        if (body.sr === undefined) delete body.sr;
        if (isNew) await api('/admin/players', { method: 'POST', body });
        else await api(`/admin/players/${p.id}`, { method: 'PATCH', body });
        sfx('success');
        toast(t('saved'), 'ok');
      }
      approvedCache = null;
      m.close();
      onSaved?.();
    } catch (err) {
      toastError(err);
    }
  });
}

/* ======================================================================== tournament create */

function openTournamentCreator(onCreated) {
  const m = modal({
    title: t('create_tournament'),
    body: html`<form id="tc-form" class="form-grid">
      <label class="field full"><span>${t('name')}</span><input class="input" name="name" maxlength="80" required></label>
      <label class="field full"><span>${t('description')}</span><textarea class="textarea" name="description" maxlength="600"></textarea></label>
      <div class="field full"><span>${t('slots')}</span>${seg('size', SIZES.map((s) => [s, s]), 8)}</div>
      <div class="field full"><span>${t('bracket_type')}</span>${seg('format', [['single', t('format_single')], ['double', t('format_double')]], 'single')}</div>
      <div class="field full"><span>${t('format')}</span>${seg('best_of', [1, 3, 5, 7].map((n) => [n, t('bo', { n })]), 3)}</div>
      <label class="field"><span>${t('starts')}</span><input class="input" type="datetime-local" name="starts_at"></label>
      <div class="field"><span>${t('sr')}</span>${seg('affects_sr', [['true', t('sr_counts')], ['false', t('sr_no')]], 'true')}</div>
    </form>`,
    foot: html`<button class="btn navy sm" data-close>${t('cancel')}</button><button class="btn sm" data-act="create">${ICON.plus}${t('create_tournament')}</button>`,
  });
  const form = $('#tc-form', m.body);
  wireSegs(form);
  m.foot.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-act="create"]')) return;
    if (!form.name.value.trim()) {
      form.name.focus();
      return;
    }
    try {
      const res = await api('/admin/tournaments', {
        method: 'POST',
        body: {
          name: form.name.value,
          description: form.description.value,
          size: Number(segValue(form, 'size')),
          format: segValue(form, 'format'),
          best_of: Number(segValue(form, 'best_of')),
          affects_sr: segValue(form, 'affects_sr') === 'true',
          starts_at: form.starts_at.value ? new Date(form.starts_at.value).toISOString() : null,
        },
      });
      sfx('success');
      toast(t('tournament_created'), 'ok');
      m.close();
      onCreated?.(res.tournament.id);
    } catch (err) {
      toastError(err);
    }
  });
}

/* ======================================================================== panel */

function mountPanel(view, params, ctx, me) {
  const role = me?.role ?? 'moderator';
  document.body.dataset.role = role;
  const visible = SECTIONS.filter((x) => canSee(x, role));
  const pickSection = (id) => (visible.some((x) => x.id === id) ? id : 'overview');
  let section = pickSection(params[0]);
  let subId = Number(params[1]) || null;
  let overview = null;
  let cleanup = () => {};
  const ui = { regFilter: 'pending', playerFilter: '', playerQuery: '', matchFilter: 'all', seedMode: 'sr', seedPick: null, seedQuery: '' };

  render(view, html`
    <div class="layout">
      <aside class="side" id="a-side"></aside>
      <section class="content" id="a-content">${loaderHtml()}</section>
      <aside class="aside" id="a-aside"></aside>
    </div>`);
  const side = $('#a-side', view);
  const content = $('#a-content', view);
  const aside = $('#a-aside', view);

  const go = (sec, id) => ctx.navigate(`/admin/${sec}${id ? `/${id}` : ''}`);

  const drawSide = () => {
    const pending = overview?.players.pending ?? 0;
    render(side, visible.map((s, i) => html`
      <a class="side-btn ${section === s.id ? 'active' : ''}" style="--i:${i}" href="/admin/${s.id}" data-link>
        ${t(s.key)}${s.id === 'registrations' && pending ? html`<span class="meta"><span class="badge">${pending}</span></span>` : ''}
      </a>`));
  };

  const drawAside = () => {
    const b = overview?.bot ?? {};
    render(aside, html`
      <div class="hero-card">
        <div class="hero-art" style="height:170px">
          <img class="bgimg" src="${IMG.hammer}" alt="" referrerpolicy="no-referrer" data-fallback><div class="fade"></div>
          ${b.user?.avatar ? html`<span class="av" style="--s:96px"><img src="${b.user.avatar}" alt="" data-fallback></span>` : EMBLEM}
        </div>
        <div class="hero-name">${b.user?.tag ?? t('bot')}</div>
        <div class="hero-sub" style="display:flex;justify-content:center;gap:8px;align-items:center"><span class="status-dot ${b.online ? 'on' : ''}"></span>${b.configured ? (b.online ? t('online') : t('offline')) : t('not_configured')}</div>
      </div>
      <button class="btn block navy" data-quick="sync" data-need-admin ${b.online ? '' : 'disabled'}>${ICON.sync}${t('sync_now')}</button>
      <button class="btn block navy" data-quick="panel" data-need-admin ${b.online ? '' : 'disabled'}>${ICON.discord}${t('post_panel')}</button>
      <div class="panel whoami"><span class="k">${t('signed_in_as')}</span><b>${me?.username ?? 'owner'}</b><span class="chip plain">${t(`role_${role}`)}</span></div>
      <button class="btn block light" data-quick="logout">${t('logout')}</button>`);
  };

  aside.addEventListener('click', async (e) => {
    const q = e.target.closest('[data-quick]')?.dataset.quick;
    if (!q) return;
    try {
      if (q === 'logout') {
        await api('/auth/logout', { method: 'POST', body: {} });
        await ctx.refreshMeta();
        ctx.navigate('/', { replace: true });
      } else if (q === 'sync') {
        const r = await api('/admin/discord/sync', { method: 'POST', body: {} });
        toast(t('sync_done', { u: r.updated ?? 0, c: r.checked ?? 0 }), 'ok');
      } else if (q === 'panel') {
        await api('/admin/discord/panel', { method: 'POST', body: {} });
        toast(t('panel_posted'), 'ok');
      }
    } catch (err) {
      toastError(err);
    }
  });

  const loadOverview = async () => {
    try {
      overview = await api('/admin/overview');
      ctx.setAdminBadge(overview.players.pending);
    } catch (err) {
      if (err.status === 401) return location.reload();
      toastError(err);
    }
    drawSide();
    drawAside();
    return overview;
  };

  /* -------------------------------------------------------------- sections */

  const S = {};

  S.overview = async () => {
    const o = overview ?? (await loadOverview());
    render(content, html`
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('a_overview')}</h2></div>
        <div class="tiles">
          <div class="tile accent" style="--i:0"><div class="k">${t('pending')}</div><div class="v">${o.players.pending}</div></div>
          <div class="tile" style="--i:1"><div class="k">${t('players')}</div><div class="v">${o.players.approved}</div></div>
          <div class="tile" style="--i:2"><div class="k">${t('tournaments')}</div><div class="v">${o.competition.tournaments}</div></div>
          <div class="tile" style="--i:3"><div class="k">${t('live')}</div><div class="v">${o.competition.live}</div></div>
          <div class="tile" style="--i:4"><div class="k">${t('played')}</div><div class="v">${o.competition.matches}</div></div>
        </div>
        <div class="section-tools" style="margin:0 0 22px;justify-content:flex-start">
          <a class="btn sm" href="/admin/registrations" data-link>${t('a_registrations')}</a>
          <button class="btn navy sm" data-new="showmatch">${ICON.plus}${t('new_showmatch')}</button>
          <button class="btn navy sm" data-new="tournament" data-need-admin>${ICON.plus}${t('create_tournament')}</button>
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('a_log')}</h2></div>
        <div class="rows">${o.recent.map((l, i) => logRow(l, i))}</div>
      </div>`);
  };

  const logRow = (l, i) => html`
    <div class="row log-row" style="--i:${i}">
      <div class="label"><span class="txt">${l.details || l.action}</span></div>
      <div class="cell soft" style="font-size:14px">${l.action}</div>
      <div class="cell soft" style="font-size:14px">${ago(l.created_at)}</div>
    </div>`;

  S.registrations = async () => {
    render(content, loaderHtml());
    const { players } = await api(`/admin/players?status=${ui.regFilter}`);
    render(content, html`
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${t('a_registrations')}</h2><span class="section-sub">${players.length}</span>
          <div class="section-tools">${seg('regFilter', [['pending', t('pending')], ['rejected', t('rejected')], ['banned', t('banned')]], ui.regFilter)}</div>
        </div>
        <div class="row-head reg-row"><span>${t('player')}</span><span>${t('battletag')}</span><span class="hide-sm">${t('rank')}</span><span class="hide-sm">${t('applied')}</span><span>${t('actions')}</span></div>
        <div class="rows">
          ${players.length ? players.map((p, i) => html`
            <div class="row reg-row interactive" style="--i:${i}" data-edit="${p.id}">
              <div class="label">${avatar(p, 32)}<span class="lb-name"><span class="n">${p.name}</span><span class="tag">@${p.username} · ${p.discord_id ?? ''}</span></span>${p.notes ? html`<span class="hint" title="${p.notes}">📝</span>` : ''}</div>
              <div class="cell" style="text-transform:none;font-size:15px">${p.battletag}</div>
              <div class="cell hide-sm">${rankBadge(p.rank_tier, p.rank_division, { size: 28, label: true })}</div>
              <div class="cell soft hide-sm" style="font-size:14px">${ago(p.applied_at || p.created_at)}</div>
              <div class="cell adm-actions">
                ${p.status !== 'approved' ? html`<button class="btn success xs" data-approve="${p.id}">${ICON.check}${t('accept')}</button>` : ''}
                ${p.status === 'pending' ? html`<button class="btn danger xs" data-reject="${p.id}">${ICON.x}${t('reject')}</button>` : ''}
              </div>
            </div>`) : html`<div class="empty-state">${ICON.check}<b>${t('nothing_pending')}</b></div>`}
        </div>
      </div>`);
  };

  S.players = async () => {
    const q = new URLSearchParams();
    if (ui.playerFilter) q.set('status', ui.playerFilter);
    if (ui.playerQuery) q.set('q', ui.playerQuery);
    const { players } = await api(`/admin/players?${q}`);
    const focus = document.activeElement?.id === 'ap-q';
    render(content, html`
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${t('a_players')}</h2><span class="section-sub">${players.length}</span>
          <div class="section-tools">
            <label class="search-box">${ICON.search}<input class="input" id="ap-q" placeholder="${t('search_players')}" value="${ui.playerQuery}"></label>
            <button class="btn sm" data-new="player" data-need-admin>${ICON.plus}${t('add_player')}</button>
          </div>
        </div>
        <div style="margin-bottom:10px">${seg('playerFilter', [['', t('all_statuses')], ['approved', t('approved')], ['pending', t('pending')], ['rejected', t('rejected')], ['banned', t('banned')]], ui.playerFilter)}</div>
        <div class="row-head adm-row"><span>${t('player')}</span><span class="hide-sm">${t('battletag')}</span><span class="hide-sm">${t('rank')}</span><span>${t('sr')}</span><span>${t('w')}-${t('l')}</span><span class="hide-sm">${t('status')}</span></div>
        <div class="rows">
          ${players.map((p, i) => html`
            <div class="row adm-row interactive" style="--i:${Math.min(i, 30)}" data-edit="${p.id}">
              <div class="label">${avatar(p, 30)}<span class="lb-name"><span class="n">${p.name}</span><span class="tag">${p.username ? `@${p.username}` : t('none')}</span></span></div>
              <div class="cell hide-sm" style="text-transform:none;font-size:15px">${p.battletag || '—'}</div>
              <div class="cell hide-sm">${tierChip(p.tier, { size: 'sm' })}</div>
              <div class="cell"><span class="sr-val">${p.sr}</span></div>
              <div class="cell" dir="ltr">${p.wins}-${p.losses}</div>
              <div class="cell hide-sm">${statusChip(p.status)}</div>
            </div>`)}
        </div>
      </div>`);
    const input = $('#ap-q', content);
    if (focus) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    input.addEventListener('input', debounce(() => {
      ui.playerQuery = input.value.trim();
      S.players();
    }, 250));
  };

  S.tournaments = async () => {
    if (subId) return tournamentEditor(subId);
    const { tournaments } = await api('/admin/tournaments');
    render(content, html`
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${t('a_tournaments')}</h2><span class="section-sub">${tournaments.length}</span>
          <div class="section-tools"><button class="btn sm" data-new="tournament" data-need-admin>${ICON.plus}${t('create_tournament')}</button></div>
        </div>
        <div class="row-head" style="--cols:4"><span>${t('tournament')}</span><span>${t('status')}</span><span>${t('slots')}</span><span>${t('played')}</span><span>${t('champion')}</span></div>
        <div class="rows">
          ${tournaments.length ? tournaments.map((tour, i) => html`
            <a class="row interactive" style="--cols:4;--i:${i}" href="/admin/tournaments/${tour.id}" data-link>
              <div class="label"><span class="txt">${tour.name}</span><span class="hint">${date(tour.starts_at)}</span></div>
              <div class="cell">${statusChip(tour.status)}</div>
              <div class="cell">${tour.players} / ${tour.size}</div>
              <div class="cell">${tour.played}</div>
              <div class="cell ${tour.champion ? '' : 'empty'}">${tour.champion ? html`${avatar(tour.champion, 24)}${tour.champion.name}` : t('empty')}</div>
            </a>`) : html`<div class="empty-state">${EMBLEM}<b>${t('no_tournaments')}</b></div>`}
        </div>
      </div>`);
  };

  async function tournamentEditor(id) {
    const [detail, players] = await Promise.all([api(`/admin/tournaments/${id}`), approvedPlayers(true)]);
    const tour = detail.tournament;
    const hasResults = detail.matches.some((m) => m.winner_id && !m.is_bye);
    if (!ui.seedPick || ui.seedFor !== id) {
      ui.seedPick = detail.entries.map((e) => e.player?.id).filter(Boolean);
      ui.seedFor = id;
    }
    const pickedSet = new Set(ui.seedPick);
    const q = ui.seedQuery.toLowerCase();
    const pool = players.filter((p) => !q || `${p.name} ${p.battletag}`.toLowerCase().includes(q));

    cleanup();
    render(content, html`
      <div class="section">
        <div class="section-head">
          <a class="btn navy sm" href="/admin/tournaments" data-link>${ICON.back}${t('back')}</a>
          <h2 class="section-title">${tour.name}</h2>${statusChip(tour.status)}
          <div class="section-tools"><a class="btn navy sm" href="/tournaments/${tour.id}" data-link>${ICON.link}${t('open_bracket')}</a></div>
        </div>
      </div>
      <div class="section" id="te-settings" data-need-admin>
        <div class="section-head"><h3 class="section-title">${t('edit_tournament')}</h3></div>
        <div class="rows">
          <div class="row" style="--cols:2;--i:0"><div class="label">${t('name')}</div><div class="cell editable" style="grid-column:span 2"><input class="input" name="name" maxlength="80" value="${tour.name}" style="text-align:start;padding:0 12px"></div></div>
          <div class="row" style="--cols:2;--i:1"><div class="label">${t('description')}</div><div class="cell editable" style="grid-column:span 2"><input class="input" name="description" maxlength="600" value="${tour.description}" style="text-align:start;padding:0 12px;font-weight:600"></div></div>
          <div class="row" style="--cols:2;--i:2"><div class="label">${t('status')}</div><div class="cell" style="grid-column:span 2;padding:0;background:none">${seg('status', [['upcoming', t('upcoming')], ['live', t('live')], ['completed', t('completed')]], tour.status)}</div></div>
          <div class="row" style="--cols:2;--i:3"><div class="label">${t('slots')}<span class="hint">${tour.players} ${t('players')}</span></div><div class="cell" style="grid-column:span 2;padding:0;background:none">${seg('size', SIZES.map((s) => [s, s]), tour.size)}</div></div>
          <div class="row" style="--cols:2;--i:4"><div class="label">${t('bracket_type')}<span class="hint">${tour.format === 'double' ? t('format_double_hint') : ''}</span></div><div class="cell" style="grid-column:span 2;padding:0;background:none">${seg('format', [['single', t('format_single')], ['double', t('format_double')]], tour.format)}</div></div>
          <div class="row" style="--cols:2;--i:4"><div class="label">${t('format')}</div><div class="cell" style="grid-column:span 2;padding:0;background:none">${seg('best_of', [1, 3, 5, 7].map((n) => [n, t('bo', { n })]), tour.best_of)}</div></div>
          <div class="row" style="--cols:2;--i:5"><div class="label">${t('sr')}</div><div class="cell" style="grid-column:span 2;padding:0;background:none">${seg('affects_sr', [['true', t('sr_counts')], ['false', t('sr_no')]], String(tour.affects_sr))}</div></div>
          <div class="row" style="--cols:2;--i:6"><div class="label">${t('starts')}</div><div class="cell editable" style="grid-column:span 2"><input class="input" type="datetime-local" name="starts_at" value="${toLocalInput(tour.starts_at)}"></div></div>
        </div>
      </div>
      <div class="section" id="te-seed">
        <div class="section-head">
          <h3 class="section-title">${t('seed_players')}</h3><span class="section-sub">${t('select_players', { n: ui.seedPick.length, max: tour.size })}</span>
          <div class="section-tools">
            <label class="search-box">${ICON.search}<input class="input" id="seed-q" placeholder="${t('search_players')}" value="${ui.seedQuery}"></label>
          </div>
        </div>
        <div class="picker">
          ${pool.map((p) => {
            const idx = ui.seedPick.indexOf(p.id);
            return html`<div class="pick ${pickedSet.has(p.id) ? 'on' : ''}" data-pick="${p.id}">
              <span class="ord">${idx >= 0 ? idx + 1 : ''}</span>${avatar(p, 26)}<span class="n">${p.name}</span><span class="s">${p.sr}</span></div>`;
          })}
        </div>
        <div class="section-tools" style="margin-top:10px;justify-content:flex-start">
          ${seg('seedMode', [['sr', t('seed_by_sr')], ['random', t('seed_random')], ['order', t('seed_order')]], ui.seedMode)}
          <button class="btn sm" data-te="seed">${ICON.check}${t('seed_now')}</button>
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h3 class="section-title">${t('bracket')}</h3><span class="section-sub">${t('edit_bracket_hint')}</span></div>
        ${bracketHtml(detail, { admin: true })}
      </div>
      <div class="section">
        <div class="section-tools" style="justify-content:flex-start">
          <button class="btn navy sm" data-te="byes">${ICON.bolt}${t('byes')}</button>
          <button class="btn navy sm" data-te="reset" data-need-admin>${ICON.reset}${t('reset_results')}</button>
          <button class="btn danger sm" data-te="delete" data-need-admin>${ICON.trash}${t('delete_tournament')}</button>
        </div>
      </div>`);

    cleanup = mountBracket(content, detail, {
      onMatch: (mid) => {
        const match = detail.matches.find((x) => x.id === mid);
        openMatchEditor({ match: { ...match, tournament_name: tour.name, tournament_size: tour.size, tournament_format: tour.format }, affectsSr: tour.affects_sr, onSaved: () => tournamentEditor(id) });
      },
    });

    const patch = async (body) => {
      try {
        await api(`/admin/tournaments/${id}`, { method: 'PATCH', body });
        toast(t('saved'), 'ok');
        await tournamentEditor(id);
      } catch (err) {
        toastError(err);
      }
    };

    const settingsEl = $('#te-settings', content);
    for (const input of $$('input', settingsEl)) {
      input.addEventListener('change', () => {
        const v = input.name === 'starts_at' ? (input.value ? new Date(input.value).toISOString() : null) : input.value;
        patch({ [input.name]: v });
      });
    }
    wireSegs(settingsEl, async (name, v) => {
      if (name === 'format') {
        if (v === tour.format) return;
        if (!(await confirmBox(t('format_q'), { danger: hasResults }))) return tournamentEditor(id);
        try {
          await api(`/admin/tournaments/${id}/resize`, { method: 'POST', body: { size: tour.size, format: v } });
          toast(t('saved'), 'ok');
        } catch (err) {
          toastError(err);
        }
        return tournamentEditor(id);
      }
      if (name === 'size') {
        if (Number(v) === tour.size) return;
        if (!(await confirmBox(t('resize_q', { n: v }), { danger: hasResults }))) return tournamentEditor(id);
        try {
          await api(`/admin/tournaments/${id}/resize`, { method: 'POST', body: { size: Number(v) } });
          toast(t('cells_changed'), 'ok');
        } catch (err) {
          toastError(err);
        }
        return tournamentEditor(id);
      }
      return patch({ [name]: name === 'affects_sr' ? v === 'true' : name === 'best_of' ? Number(v) : v });
    });

    const seedEl = $('#te-seed', content);
    wireSegs(seedEl, (name, v) => { if (name === 'seedMode') ui.seedMode = v; });
    $('#seed-q', seedEl).addEventListener('input', debounce((e) => {
      ui.seedQuery = e.target.value.trim();
      tournamentEditor(id).then(() => {
        const el = $('#seed-q', content);
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      });
    }, 250));
    seedEl.addEventListener('click', (e) => {
      const pick = e.target.closest('[data-pick]');
      if (!pick) return;
      const pid = Number(pick.dataset.pick);
      const at = ui.seedPick.indexOf(pid);
      if (at >= 0) ui.seedPick.splice(at, 1);
      else if (ui.seedPick.length < tour.size) ui.seedPick.push(pid);
      else return toast(te('too_many_players'), 'err');
      // update in place — no full re-render
      for (const el of $$('[data-pick]', seedEl)) {
        const idx = ui.seedPick.indexOf(Number(el.dataset.pick));
        el.classList.toggle('on', idx >= 0);
        $('.ord', el).textContent = idx >= 0 ? idx + 1 : '';
      }
      $('.section-sub', seedEl).textContent = t('select_players', { n: ui.seedPick.length, max: tour.size });
      return undefined;
    });

    content.onclick = async (e) => {
      const act = e.target.closest('[data-te]')?.dataset.te;
      if (!act) return;
      try {
        if (act === 'seed') {
          if (hasResults && !(await confirmBox(t('reseed_q'), { danger: true }))) return;
          await api(`/admin/tournaments/${id}/seed`, { method: 'POST', body: { player_ids: ui.seedPick, mode: ui.seedMode } });
          ui.seedPick = null;
          toast(t('players_seeded'), 'ok');
        } else if (act === 'byes') {
          await api(`/admin/tournaments/${id}/byes`, { method: 'POST', body: {} });
          toast(t('saved'), 'ok');
        } else if (act === 'reset') {
          if (!(await confirmBox(t('reset_q', { name: tour.name }), { danger: true }))) return;
          await api(`/admin/tournaments/${id}/reset`, { method: 'POST', body: {} });
          toast(t('saved'), 'ok');
        } else if (act === 'delete') {
          if (!(await confirmBox(t('delete_tournament_q', { name: tour.name }), { danger: true }))) return;
          await api(`/admin/tournaments/${id}`, { method: 'DELETE' });
          toast(t('deleted'), 'ok');
          return go('tournaments');
        }
        sfx('success');
        await tournamentEditor(id);
      } catch (err) {
        toastError(err);
      }
    };
  }

  S.matches = async () => {
    const { matches } = await api(`/admin/matches?type=${ui.matchFilter}&limit=300`);
    render(content, html`
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${t('a_matches')}</h2><span class="section-sub">${matches.length}</span>
          <div class="section-tools"><button class="btn sm" data-new="showmatch">${ICON.plus}${t('new_showmatch')}</button></div>
        </div>
        <div style="margin-bottom:10px">${seg('matchFilter', [['all', t('all_matches')], ['live', t('live_now')], ['tournament', t('tournament_matches')], ['showmatch', t('showmatches')]], ui.matchFilter)}</div>
        ${matches.length ? html`<div class="rows">${matches.map((m, i) => matchRow(m, Math.min(i, 30), { admin: true }))}</div>` : html`<div class="empty-state">${EMBLEM}<b>${t('no_matches')}</b></div>`}
      </div>`);
    content.dataset.matches = JSON.stringify(matches.map((m) => m.id));
    S._matches = matches;
  };

  /* -------------------------------------------------------------- settings */

  const settingRow = (key, control, i, span = 2) => html`
    <div class="row" style="--cols:2;--i:${i}"><div class="label"><span class="txt">${t(`s_${key}`)}</span></div>
      <div class="cell editable" style="grid-column:span ${span};${control.seg ? 'padding:0;background:none;box-shadow:none' : ''}">${control.html}</div></div>`;

  const ctlInput = (key, value, type = 'text', extra = '') => ({ html: html`<input class="input" data-key="${key}" type="${type}" value="${value ?? ''}" ${raw(extra)} style="${type === 'text' || type === 'url' ? 'text-align:start;padding:0 12px;text-transform:none' : ''}">` });
  const ctlSeg = (key, options, value) => ({ seg: true, html: html`<div class="seg" data-setting="${key}">${options.map(([v, label]) => html`<button type="button" data-v="${v}" class="${String(v) === String(value) ? 'on' : ''}">${label}</button>`)}</div>` });
  const onOff = (key, s) => ctlSeg(key, [['true', t('on')], ['false', t('off')]], String(s[key]));

  async function saveSetting(key, value) {
    try {
      await api('/admin/settings', { method: 'PUT', body: { [key]: value } });
      toast(t('saved'), 'ok');
      await ctx.refreshMeta();
    } catch (err) {
      toastError(err);
    }
  }

  function wireSettings(root, settings) {
    for (const input of $$('[data-key]', root)) {
      input.addEventListener('change', () => {
        const def = settings[input.dataset.key];
        saveSetting(input.dataset.key, typeof def === 'number' ? Number(input.value) : input.value);
      });
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-setting] button');
      if (!b) return;
      const group = b.closest('[data-setting]');
      $$('button', group).forEach((x) => x.classList.toggle('on', x === b));
      const key = group.dataset.setting;
      const def = settings[key];
      saveSetting(key, typeof def === 'boolean' ? b.dataset.v === 'true' : b.dataset.v);
    });
  }

  S.settings = async () => {
    const { settings: s } = await api('/admin/settings');
    let i = 0;
    render(content, html`
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('s_general')}</h2></div>
        <div class="rows">
          ${settingRow('site_name', ctlInput('site_name', s.site_name), i++)}
          ${settingRow('season_name', ctlInput('season_name', s.season_name), i++)}
          ${settingRow('default_lang', ctlSeg('default_lang', [['en', 'English'], ['ar', 'العربية']], s.default_lang), i++)}
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('s_points')}</h2></div>
        <div class="rows"><a class="row interactive" style="--cols:1;--i:${i++}" href="/admin/ranks" data-link><div class="label"><span class="txt">${t('points_moved')}</span></div><div class="cell">${t('a_ranks')} ›</div></a></div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('s_registration')}</h2></div>
        <div class="rows">
          ${settingRow('registration_open', ctlSeg('registration_open', [['true', t('open')], ['false', t('closed')]], String(s.registration_open)), i++)}
          ${settingRow('show_battletags', onOff('show_battletags', s), i++)}
          ${settingRow('discord_invite', ctlInput('discord_invite', s.discord_invite, 'url', 'placeholder="https://discord.gg/…"'), i++)}
        </div>
      </div>
      <div class="section" id="demo-sec">
        <div class="section-head"><h2 class="section-title">${t('demo_data')}</h2><span class="section-sub" id="demo-count"></span></div>
        <p class="help">${t('demo_data_help')}</p>
        <div class="section-tools" style="justify-content:flex-start;margin-top:10px"><button class="btn danger sm" data-demo-remove disabled>${ICON.trash}${t('demo_remove')}</button></div>
      </div>
      <div class="section"><button class="btn navy sm" data-restore>${ICON.reset}${t('restore_defaults')}</button></div>`);
    wireSettings(content, s);
    const demoBtn = $('[data-demo-remove]', content);
    api('/admin/demo').then((d) => {
      $('#demo-count', content).textContent = t('demo_count', { p: d.players, t: d.tournaments });
      demoBtn.disabled = !d.players && !d.tournaments;
    }).catch(() => {});
    demoBtn.addEventListener('click', async () => {
      if (!(await confirmBox(t('demo_remove_q'), { danger: true }))) return;
      try {
        const r = await api('/admin/demo/remove', { method: 'POST', body: {} });
        sfx('success');
        toast(t('demo_removed', { p: r.players, t: r.tournaments }), 'ok');
        approvedCache = null;
        S.settings();
      } catch (err) {
        toastError(err);
      }
    });
  };

  async function restoreDefaults() {
    if (!(await confirmBox(t('restore_q'), { danger: true }))) return;
    try {
      await api('/admin/settings/reset', { method: 'POST', body: {} });
      toast(t('saved'), 'ok');
      await ctx.refreshMeta();
      if (section === 'settings' || section === 'discord') S[section]();
    } catch (err) {
      toastError(err);
    }
  }

  S.discord = async () => {
    const [{ settings: s }, b] = await Promise.all([api('/admin/settings'), api('/admin/discord')]);
    const check = (ok) => html`<span class="${ok ? 'ok-mark' : 'no-mark'}">${ok ? ICON.check : ICON.x}</span>`;
    const steps = [
      [b.configured, 'DISCORD_TOKEN (.env)'],
      [b.online, t('bot_online')],
      [!!(s.guild_id || b.guild), t('s_guild_id')],
      [!!s.registration_channel_id, t('s_registration_channel_id')],
      [!!s.review_channel_id, t('s_review_channel_id')],
      [!!b.panel?.message_id, t('post_panel')],
    ];
    let i = 0;
    render(content, html`
      <div class="section dc-connect">
        <div class="section-head"><h2 class="section-title">${t('dc_connect_title')}</h2>
          <span class="section-sub"><span class="status-dot ${b.online ? 'on' : ''}"></span> ${b.online ? `${t('online')} · ${b.user?.tag ?? ''}` : b.configured ? t('offline') : t('not_configured')}</span>
        </div>
        ${b.token_source === 'env' ? html`<p class="help">${t('dc_token_env')}</p>` : html`
          <form id="dc-form" class="dc-form" autocomplete="off">
            <label class="field"><span>${t('bot_token')}</span><input class="input" name="token" type="password" placeholder="${b.token_source === 'panel' ? t('dc_token_saved') : 'MTA…'}" style="text-transform:none" autocomplete="off"></label>
            <div class="field"><span>${t('members_intent')}</span>${seg('dcIntent', [['true', t('on')], ['false', t('off')]], String(!!b.members_intent))}</div>
            <div class="field"><span>&nbsp;</span><span class="dc-btns">
              <button class="btn" type="submit">${ICON.discord}${b.configured ? t('dc_reconnect') : t('dc_connect')}</button>
              ${b.token_source === 'panel' ? html`<button class="btn navy" type="button" data-dc="disconnect">${ICON.x}${t('dc_disconnect')}</button>` : ''}
            </span></div>
          </form>`}
        ${b.error ? html`<div class="dc-error">⚠ ${b.error}</div>` : ''}
        <ol class="dc-steps">
          <li>${raw(t('dc_step1'))}</li>
          <li>${t('dc_step2')}</li>
          <li>${t('dc_step3')}</li>
          <li>${t('dc_step4')} ${b.invite_url ? html`<a class="btn navy xs" href="${b.invite_url}" target="_blank" rel="noopener">${ICON.discord}${t('invite_bot')}</a>` : ''}</li>
          <li>${t('dc_step5')}</li>
          <li>${t('dc_step6')}</li>
        </ol>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('a_discord')}</h2>
          <div class="section-tools">
            ${b.invite_url ? html`<a class="btn navy sm" href="${b.invite_url}" target="_blank" rel="noopener">${ICON.discord}${t('invite_bot')}</a>` : ''}
            <button class="btn navy sm" data-dc="commands" ${b.online ? '' : 'disabled'}>${ICON.sync}${t('register_commands')}</button>
            <button class="btn sm" data-dc="panel" ${b.online ? '' : 'disabled'}>${ICON.discord}${t('post_panel')}</button>
          </div>
        </div>
        <div class="rows">
          <div class="row" style="--cols:2;--i:${i++}"><div class="label">${t('bot')}</div><div class="cell"><span class="status-dot ${b.online ? 'on' : ''}"></span>${b.online ? t('online') : b.configured ? t('offline') : t('not_configured')}</div><div class="cell ${b.user ? '' : 'empty'}" style="text-transform:none">${b.user?.tag ?? t('empty')}</div></div>
          <div class="row" style="--cols:2;--i:${i++}"><div class="label">${t('server')}</div><div class="cell ${b.guild ? '' : 'empty'}">${b.guild?.name ?? t('empty')}</div><div class="cell ${b.guild ? '' : 'empty'}">${b.guild ? `${b.guild.members} ${t('members')}` : t('empty')}</div></div>
          <div class="row" style="--cols:2;--i:${i++}"><div class="label">${t('commands')}</div><div class="cell ${b.commands ? '' : 'empty'}">${b.commands ? `/${b.commands.scope}` : t('empty')}</div><div class="cell ${b.commands ? '' : 'empty'}">${b.commands ? `${b.commands.count} ${t('commands')}` : t('empty')}</div></div>
          <div class="row" style="--cols:2;--i:${i++}"><div class="label">${t('last_sync')}</div><div class="cell ${b.last_sync ? '' : 'empty'}">${b.last_sync ? ago(b.last_sync.at) : t('empty')}</div><div class="cell ${b.last_sync ? '' : 'empty'}">${b.last_sync ? `${b.last_sync.updated}/${b.last_sync.checked}` : t('empty')}</div></div>
          <div class="row" style="--cols:2;--i:${i++}"><div class="label">Server Members intent</div><div class="cell">${b.members_intent ? t('on') : t('off')}</div><div class="cell soft" style="font-size:13px;text-transform:none">${b.members_intent ? 'instant' : `every ${s.sync_interval_min} min`}</div></div>
          ${b.error ? html`<div class="row" style="--cols:2;--i:${i++}"><div class="label" style="color:#ffb4b4">Error</div><div class="cell" style="grid-column:span 2;text-transform:none;font-size:14px;white-space:normal">${b.error}</div></div>` : ''}
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('setup_guide')}</h2></div>
        <div class="rows">${steps.map(([ok, label], k) => html`<div class="row" style="--cols:1;--i:${k}"><div class="label">${check(ok)}<span class="txt">${label}</span></div><div class="cell ${ok ? '' : 'empty'}">${ok ? 'OK' : t('empty')}</div></div>`)}</div>
      </div>
      <div class="section" id="dc-logs">
        <div class="section-head"><h2 class="section-title">${t('dc_logs')}</h2><span class="section-sub">${t('dc_logs_sub')}</span>
          <div class="section-tools"><button class="btn sm" data-dc="logs" ${b.online ? '' : 'disabled'}>${ICON.sync}${t('create_log_channels')}</button></div>
        </div>
        <div class="rows">
          ${settingRow('log_enabled', onOff('log_enabled', s), i++)}
          ${settingRow('log_category_id', ctlInput('log_category_id', s.log_category_id, 'text', 'inputmode="numeric" placeholder="123456789012345678"'), i++)}
          ${settingRow('log_lang', ctlSeg('log_lang', [['ar', 'العربية'], ['en', 'English']], s.log_lang ?? 'ar'), i++)}
          ${(b.logs?.channels ?? []).map((c) => html`<div class="row" style="--cols:2;--i:${i++}"><div class="label"><span class="txt" style="text-transform:none">${c.name}</span></div><div class="cell ${c.id ? '' : 'empty'}" style="grid-column:span 2;text-transform:none">${c.id ? html`<span class="ok-mark">${ICON.check}</span> <span class="code">${c.id}</span>` : t('dc_log_pending')}</div></div>`)}
        </div>
        <p class="help">${t('dc_logs_help')}</p>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('s_discord')}</h2></div>
        <div class="rows">
          ${['guild_id', 'registration_channel_id', 'review_channel_id', 'results_channel_id', 'player_role_id', 'admin_role_id'].map((k) => settingRow(k, ctlInput(k, s[k], 'text', 'inputmode="numeric" placeholder="123456789012345678"'), i++))}
          ${settingRow('announce_results', onOff('announce_results', s), i++)}
          ${settingRow('dm_players', onOff('dm_players', s), i++)}
          ${settingRow('sync_interval_min', ctlInput('sync_interval_min', s.sync_interval_min, 'number', 'min="5" max="1440"'), i++)}
        </div>
      </div>`);
    wireSettings(content, s);
    const dcForm = $('#dc-form', content);
    const connect = async (body) => {
      $$('button', dcForm ?? content).forEach((x) => { x.disabled = true; });
      toast(t('dc_connecting'));
      try {
        const res = await api('/admin/discord/connect', { method: 'POST', body });
        if (res.online) {
          sfx('success');
          toast(t('dc_connected', { tag: res.user?.tag ?? '' }), 'ok');
        } else if (res.error) toast(res.error, 'err');
      } catch (err) {
        toastError(err);
      }
      await loadOverview();
      S.discord();
    };
    dcForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const token = dcForm.token.value.trim();
      connect({ ...(token ? { token } : {}), members_intent: segValue(dcForm, 'dcIntent') === 'true' });
    });
    content.onclick = async (e) => {
      if (e.target.closest('[data-dc="logs"]')) {
        try {
          const r = await api('/admin/discord/logs', { method: 'POST', body: {} });
          sfx('success');
          toast(t('logs_ready', { n: r.created }), 'ok');
        } catch (err) {
          toastError(err);
        }
        S.discord();
        return;
      }
      if (e.target.closest('[data-dc="disconnect"]')) {
        if (!(await confirmBox(t('dc_disconnect_q'), { danger: true }))) return;
        connect({ token: '' });
      }
    };
  };

  /* -------------------------------------------------------------- ranks & points */

  S.ranks = async () => {
    const { settings: s, ranks, default_ranks: defaults } = await api('/admin/settings');
    let table = ranks.map(({ name, min, win, loss, color, desc }) => ({ name, min, win, loss, color, desc }));
    let i = 0;
    render(content, html`
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('s_points')}</h2></div>
        <div class="rows" id="rk-settings">
          ${settingRow('points_mode', ctlSeg('points_mode', [['rank', t('s_rank_mode')], ['elo', t('s_elo')], ['fixed', t('s_fixed')]], s.points_mode), i++)}
          ${settingRow('starting_sr', ctlInput('starting_sr', s.starting_sr, 'number', 'min="0" max="10000"'), i++)}
          ${settingRow('dominance_pct', ctlInput('dominance_pct', s.dominance_pct, 'number', 'min="0" max="300"'), i++)}
          ${settingRow('gap_pct', ctlInput('gap_pct', s.gap_pct, 'number', 'min="100" max="300"'), i++)}
          ${settingRow('min_sr', ctlInput('min_sr', s.min_sr, 'number', 'min="0" max="10000"'), i++)}
          ${s.points_mode === 'elo' ? settingRow('elo_k', ctlInput('elo_k', s.elo_k, 'number', 'min="1" max="200"'), i++) : ''}
          ${s.points_mode === 'fixed' ? html`${settingRow('fixed_win', ctlInput('fixed_win', s.fixed_win, 'number', 'min="0" max="1000"'), i++)}${settingRow('fixed_loss', ctlInput('fixed_loss', s.fixed_loss, 'number', 'min="0" max="1000"'), i++)}` : ''}
        </div>
        <p class="help">${t('rank_formula_help')}</p>
        <div class="section-tools" style="justify-content:flex-start;margin-top:10px">
          <button class="btn danger sm" data-rk="reset-all">${ICON.reset}${t('reset_all_sr')}</button>
        </div>
      </div>
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">${t('rank_table')}</h2><span class="section-sub">${table.length}</span>
          <div class="section-tools">
            <button class="btn navy sm" data-rk="defaults">${ICON.reset}${t('restore_table')}</button>
            <button class="btn navy sm" data-rk="add">${ICON.plus}${t('add_rank')}</button>
            <button class="btn sm" data-rk="save">${ICON.check}${t('save_table')}</button>
          </div>
        </div>
        <div class="rk-head"><span>${t('rank_name')}</span><span>${t('rank_min')}</span><span>${t('rank_win')}</span><span>${t('rank_loss')}</span><span>${t('color')}</span><span>${t('description')}</span><span></span></div>
        <div id="rk-rows"></div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('calculator')}</h2><span class="section-sub">${t('calculator_sub')}</span></div>
        <div class="calc">
          <label class="field"><span>${t('winner')} SR</span><input class="input" type="number" id="ck-wsr" value="${s.starting_sr}"></label>
          <label class="field"><span>${t('loser')} SR</span><input class="input" type="number" id="ck-lsr" value="${s.starting_sr}"></label>
          <label class="field"><span>${t('score')}</span><span class="calc-score"><input class="input" type="number" id="ck-w" value="10" min="0" max="99"><b>-</b><input class="input" type="number" id="ck-l" value="4" min="0" max="99"></span></label>
          <div class="calc-out" id="ck-out"></div>
        </div>
      </div>`);
    wireSettings($('#rk-settings', content), s);
    $('#rk-settings', content).addEventListener('click', (e) => {
      if (e.target.closest('[data-setting="points_mode"] button')) setTimeout(() => S.ranks(), 400);
    });

    const rowsEl = $('#rk-rows', content);
    const drawRows = () => {
      const sorted = [...table].map((r, idx) => ({ ...r, idx })).sort((a, b) => a.min - b.min);
      render(rowsEl, sorted.map((r, k) => {
        const next = sorted[k + 1];
        return html`
          <div class="rk-row" data-idx="${r.idx}" style="--rc:${r.color}">
            <input class="input" data-f="name" maxlength="24" value="${r.name}">
            <span class="rk-min"><input class="input" type="number" data-f="min" min="0" value="${r.min}" ${k === 0 ? 'disabled' : ''}><small dir="ltr">${next ? `→ ${next.min - 1}` : '+'}</small></span>
            <input class="input up" type="number" data-f="win" min="0" max="1000" value="${r.win}">
            <input class="input down" type="number" data-f="loss" min="0" max="1000" value="${r.loss}">
            <input class="input color" type="color" data-f="color" value="${r.color}">
            <input class="input desc" data-f="desc" maxlength="240" value="${r.desc ?? ''}" style="text-transform:none">
            <button type="button" class="btn danger xs" data-rk="del" ${table.length <= 1 ? 'disabled' : ''}>${ICON.trash}</button>
          </div>`;
      }));
      calc();
    };
    const calc = () => {
      const sorted = [...table].sort((a, b) => a.min - b.min).map((r, index) => ({ ...r, index }));
      const rankAt = (sr) => sorted.reduce((acc, r) => (sr >= r.min ? r : acc), sorted[0]);
      const opts = {
        dominance: Number($('[data-key="dominance_pct"]', content)?.value) || 0,
        gap: Number($('[data-key="gap_pct"]', content)?.value) || 100,
      };
      const wsr = Number($('#ck-wsr', content).value) || 0;
      const lsr = Number($('#ck-lsr', content).value) || 0;
      const w = Number($('#ck-w', content).value) || 0;
      const l = Number($('#ck-l', content).value) || 0;
      const wr = rankAt(wsr);
      const lr = rankAt(lsr);
      const p = calcPoints(wr, lr, w, l, opts);
      render($('#ck-out', content), html`
        <div><b style="color:${wr.color}">${wr.name}</b> <span dir="ltr">+${wr.win} × ${p.dominance} × ${p.gap}</span> → <b class="delta up">+${p.gain}</b></div>
        <div><b style="color:${lr.color}">${lr.name}</b> <span dir="ltr">−${lr.loss} × ${p.dominance} × ${p.gap}</span> → <b class="delta down">−${p.loss}</b></div>
        <div class="help" style="margin:0">${t('calc_legend')}</div>`);
    };
    rowsEl.addEventListener('input', (e) => {
      const row = e.target.closest('[data-idx]');
      const f = e.target.dataset.f;
      if (!row || !f) return;
      const r = table[Number(row.dataset.idx)];
      r[f] = ['min', 'win', 'loss'].includes(f) ? Number(e.target.value) || 0 : e.target.value;
      if (f === 'color') row.style.setProperty('--rc', r.color);
      calc();
    });
    rowsEl.addEventListener('change', (e) => {
      if (e.target.dataset.f === 'min') drawRows();
    });
    for (const id of ['#ck-wsr', '#ck-lsr', '#ck-w', '#ck-l']) $(id, content).addEventListener('input', calc);
    for (const k of ['dominance_pct', 'gap_pct']) $(`[data-key="${k}"]`, content)?.addEventListener('input', calc);
    content.onclick = async (e) => {
      const act = e.target.closest('[data-rk]')?.dataset.rk;
      if (!act) return;
      if (act === 'reset-all') {
        if (!(await confirmBox(t('reset_all_sr_q', { n: s.starting_sr }), { danger: true }))) return;
        try {
          const res = await api('/admin/players/reset-all-sr', { method: 'POST', body: {} });
          toast(t('reset_all_done', { n: res.updated }), 'ok');
        } catch (err) {
          toastError(err);
        }
        return;
      }
      if (act === 'add') {
        const top = [...table].sort((a, b) => b.min - a.min)[0];
        table.push({ name: t('new_rank'), min: (top?.min ?? 0) + 500, win: top?.win ?? 20, loss: top?.loss ?? 20, color: '#ffffff', desc: '' });
        drawRows();
      } else if (act === 'del') {
        table.splice(Number(e.target.closest('[data-idx]').dataset.idx), 1);
        drawRows();
      } else if (act === 'defaults') {
        if (!(await confirmBox(t('restore_table_q'), { danger: true }))) return;
        table = defaults.map((r) => ({ ...r }));
        drawRows();
      } else if (act === 'save') {
        try {
          await api('/admin/settings', { method: 'PUT', body: { rank_table: table } });
          sfx('success');
          toast(t('saved'), 'ok');
          await ctx.refreshMeta();
          S.ranks();
        } catch (err) {
          toastError(err);
        }
      }
    };
    drawRows();
  };

  /* -------------------------------------------------------------- site content */

  S.content = async () => {
    const { settings: s } = await api('/admin/settings');
    let overrides = {};
    try {
      overrides = JSON.parse(s.text_overrides || '{}');
    } catch {
      overrides = {};
    }
    let i = 0;
    const covers = String(s.img_covers || '').split(/\s+/).filter(Boolean);
    render(content, html`
      <div class="section" id="ct-top">
        <div class="section-head"><h2 class="section-title">${t('announcement')}</h2><span class="section-sub">${t('announcement_sub')}</span></div>
        <div class="rows">
          ${settingRow('announcement_on', onOff('announcement_on', s), i++)}
          ${settingRow('announcement_en', ctlInput('announcement_en', s.announcement_en, 'text', 'maxlength="500"'), i++)}
          ${settingRow('announcement_ar', ctlInput('announcement_ar', s.announcement_ar, 'text', 'maxlength="500" dir="rtl"'), i++)}
        </div>
      </div>
      <div class="section" id="ct-img">
        <div class="section-head"><h2 class="section-title">${t('images')}</h2><span class="section-sub">${t('images_sub')}</span></div>
        <div class="rows">
          ${settingRow('img_banner', ctlInput('img_banner', s.img_banner, 'url', 'placeholder="https://…"'), i++)}
          ${settingRow('img_card', ctlInput('img_card', s.img_card, 'url', 'placeholder="https://…"'), i++)}
        </div>
        <label class="field" style="margin-top:10px"><span>${t('s_img_covers')}</span><textarea class="textarea" id="ct-covers" rows="4" placeholder="https://…" style="text-transform:none" dir="ltr">${covers.join('\n')}</textarea></label>
        <div class="img-previews">
          ${[['img_banner', s.img_banner || IMG.banner], ['img_card', s.img_card || IMG.bannerSmall], ...covers.map((u) => ['img_covers', u])].map(([k, u]) => html`<figure><img src="${u}" alt="" referrerpolicy="no-referrer" loading="lazy"><figcaption>${t(`s_${k}`)}</figcaption></figure>`)}
        </div>
      </div>
      <div class="section" id="ct-texts">
        <div class="section-head">
          <h2 class="section-title">${t('site_texts')}</h2><span class="section-sub" id="ct-count"></span>
          <div class="section-tools">
            <label class="search-box">${ICON.search}<input class="input" id="ct-q" placeholder="${t('search_texts')}"></label>
            <button class="btn sm" data-ct="save">${ICON.check}${t('save')}</button>
          </div>
        </div>
        <p class="help">${t('site_texts_help')}</p>
        <div class="tx-head"><span>${t('text_key')}</span><span>English</span><span>العربية</span></div>
        <div id="ct-list"></div>
      </div>`);
    wireSettings($('#ct-top', content), s);
    wireSettings($('#ct-img', content), s);
    $('#ct-covers', content).addEventListener('change', async (e) => {
      await saveSetting('img_covers', e.target.value);
      S.content();
    });

    const keys = allKeys().filter((k) => !k.startsWith('e_'));
    const listEl = $('#ct-list', content);
    const count = () => {
      const n = Object.keys(overrides.en ?? {}).length + Object.keys(overrides.ar ?? {}).length;
      $('#ct-count', content).textContent = t('n_changed', { n });
    };
    const drawList = () => {
      const q = $('#ct-q', content).value.trim().toLowerCase();
      const match = keys.filter((k) => !q || k.includes(q) || baseText('en', k).toLowerCase().includes(q) || baseText('ar', k).includes(q)
        || (overrides.en?.[k] ?? '').toLowerCase().includes(q) || (overrides.ar?.[k] ?? '').includes(q));
      const shown = match.slice(0, 80);
      render(listEl, html`${shown.map((k) => html`
        <div class="tx-row ${overrides.en?.[k] || overrides.ar?.[k] ? 'changed' : ''}" data-k="${k}">
          <code>${k}</code>
          <input class="input" data-lang="en" value="${overrides.en?.[k] ?? ''}" placeholder="${baseText('en', k)}">
          <input class="input" data-lang="ar" dir="rtl" value="${overrides.ar?.[k] ?? ''}" placeholder="${baseText('ar', k)}">
        </div>`)}
        ${match.length > shown.length ? html`<div class="help">${t('more_results', { n: match.length - shown.length })}</div>` : ''}`);
      count();
    };
    listEl.addEventListener('input', (e) => {
      const row = e.target.closest('[data-k]');
      const lang = e.target.dataset.lang;
      if (!row || !lang) return;
      overrides[lang] ??= {};
      if (e.target.value.trim()) overrides[lang][row.dataset.k] = e.target.value;
      else delete overrides[lang][row.dataset.k];
      row.classList.toggle('changed', !!(overrides.en?.[row.dataset.k] || overrides.ar?.[row.dataset.k]));
      count();
    });
    $('#ct-q', content).addEventListener('input', debounce(drawList, 150));
    content.onclick = async (e) => {
      if (!e.target.closest('[data-ct="save"]')) return;
      try {
        await api('/admin/settings', { method: 'PUT', body: { text_overrides: overrides } });
        sfx('success');
        toast(t('saved'), 'ok');
        await ctx.refreshMeta();
      } catch (err) {
        toastError(err);
      }
    };
    drawList();
  };

  /* -------------------------------------------------------------- admin accounts */

  S.admins = async () => {
    const { admins } = await api('/admin/admins');
    const roleSel = (value, attrs = '') => html`<select class="select" ${raw(attrs)}>${['moderator', 'admin', 'owner'].map((r) => html`<option value="${r}" ${r === value ? 'selected' : ''}>${t(`role_${r}`)}</option>`)}</select>`;
    render(content, html`
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('a_admins')}</h2><span class="section-sub">${admins.length}</span></div>
        <p class="help" style="margin-bottom:14px">${t('admins_help')}</p>
        <div class="row-head adm-acc"><span>${t('username')}</span><span>${t('role')}</span><span>${t('status')}</span><span class="hide-sm">${t('last_login')}</span><span>${t('actions')}</span></div>
        <div class="rows">
          <div class="row adm-acc" style="--i:0">
            <div class="label"><span class="txt">owner</span><span class="hint">.env</span></div>
            <div class="cell">${t('role_owner')}</div><div class="cell">${t('on')}</div><div class="cell hide-sm soft">—</div><div class="cell soft" style="font-size:13px;text-transform:none">ADMIN_PASSWORD</div>
          </div>
          ${admins.map((a, i) => html`
            <div class="row adm-acc" style="--i:${i + 1}" data-admin="${a.id}">
              <div class="label"><span class="txt" style="text-transform:none">${a.username}</span>${a.created_by ? html`<span class="hint">${t('by')} ${a.created_by}</span>` : ''}</div>
              <div class="cell editable">${roleSel(a.role, 'data-adm="role"')}</div>
              <div class="cell" style="padding:0;background:none">${seg(`dis-${a.id}`, [['false', t('on')], ['true', t('off')]], String(a.disabled))}</div>
              <div class="cell hide-sm soft" style="font-size:14px">${a.last_login_at ? ago(a.last_login_at) : '—'}</div>
              <div class="cell adm-actions">
                <button class="btn navy xs" data-adm="password">${t('change_password')}</button>
                <button class="btn danger xs" data-adm="delete">${ICON.trash}</button>
              </div>
            </div>`)}
        </div>
      </div>
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('add_admin')}</h2></div>
        <form id="adm-new" class="form-grid" autocomplete="off">
          <label class="field"><span>${t('username')}</span><input class="input" name="username" maxlength="32" required style="text-transform:none"></label>
          <label class="field"><span>${t('password')}</span><input class="input" name="password" type="password" minlength="8" autocomplete="new-password" required></label>
          <label class="field"><span>${t('role')}</span>${roleSel('moderator', 'name="role"')}</label>
          <div class="field"><span>&nbsp;</span><button class="btn" type="submit">${ICON.plus}${t('add_admin')}</button></div>
        </form>
        <div class="role-help">
          <div><b>${t('role_moderator')}</b> ${t('role_moderator_help')}</div>
          <div><b>${t('role_admin')}</b> ${t('role_admin_help')}</div>
          <div><b>${t('role_owner')}</b> ${t('role_owner_help')}</div>
        </div>
      </div>`);
    const form = $('#adm-new', content);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/admin/admins', { method: 'POST', body: { username: form.username.value.trim(), password: form.password.value, role: form.role.value } });
        sfx('success');
        toast(t('saved'), 'ok');
        S.admins();
      } catch (err) {
        toastError(err);
      }
    });
    const patchAdmin = async (id, body) => {
      try {
        await api(`/admin/admins/${id}`, { method: 'PATCH', body });
        toast(t('saved'), 'ok');
      } catch (err) {
        toastError(err);
      }
      S.admins();
    };
    content.onchange = (e) => {
      const sel = e.target.closest('[data-adm="role"]');
      if (sel) patchAdmin(Number(sel.closest('[data-admin]').dataset.admin), { role: sel.value });
    };
    content.onclick = async (e) => {
      const segBtn = e.target.closest('[data-seg^="dis-"] button');
      if (segBtn) return patchAdmin(Number(segBtn.closest('[data-admin]').dataset.admin), { disabled: segBtn.dataset.v === 'true' });
      const act = e.target.closest('[data-adm]')?.dataset.adm;
      const row = e.target.closest('[data-admin]');
      if (!act || !row || act === 'role') return undefined;
      const id = Number(row.dataset.admin);
      const name = $('.txt', row).textContent;
      if (act === 'password') {
        const pw = await promptBox(t('change_password'), { label: `${t('new_password')} · ${name}`, okLabel: t('save'), type: 'password' });
        if (pw) return patchAdmin(id, { password: pw });
      } else if (act === 'delete') {
        if (!(await confirmBox(t('delete_admin_q', { name }), { danger: true }))) return undefined;
        try {
          await api(`/admin/admins/${id}`, { method: 'DELETE' });
          toast(t('deleted'), 'ok');
        } catch (err) {
          toastError(err);
        }
        return S.admins();
      }
      return undefined;
    };
  };

  S.log = async () => {
    const { log } = await api('/admin/audit?limit=300');
    render(content, html`
      <div class="section">
        <div class="section-head"><h2 class="section-title">${t('a_log')}</h2><span class="section-sub">${log.length}</span></div>
        <div class="rows">${log.map((l, i) => logRow(l, Math.min(i, 30)))}</div>
      </div>`);
  };

  /* -------------------------------------------------------------- shared content events */

  content.addEventListener('click', async (e) => {
    const t0 = e.target;
    const approve = t0.closest('[data-approve]');
    const reject = t0.closest('[data-reject]');
    const edit = t0.closest('[data-edit]');
    const neu = t0.closest('[data-new]');
    const matchEl = section === 'matches' ? t0.closest('[data-match]') : null;
    try {
      if (approve) {
        e.stopPropagation();
        await api(`/admin/players/${approve.dataset.approve}/approve`, { method: 'POST', body: {} });
        sfx('success');
        toast(t('approved'), 'ok');
        approvedCache = null;
        await loadOverview();
        return S.registrations();
      }
      if (reject) {
        e.stopPropagation();
        const reason = await promptBox(t('reject'), { label: t('reject_reason'), multiline: true, danger: true, okLabel: t('reject') });
        if (reason === null) return undefined;
        await api(`/admin/players/${reject.dataset.reject}/reject`, { method: 'POST', body: { reason } });
        toast(t('rejected'), 'ok');
        await loadOverview();
        return S.registrations();
      }
      if (t0.closest('[data-restore]')) return restoreDefaults();
      if (neu) {
        if (neu.dataset.new === 'player') return openPlayerEditor(null, () => S.players());
        if (neu.dataset.new === 'tournament') return openTournamentCreator((id) => go('tournaments', id));
        if (neu.dataset.new === 'showmatch') return openMatchEditor({ onSaved: () => (section === 'matches' ? S.matches() : loadOverview().then(() => S[section]())) });
      }
      if (edit) {
        const p = await api(`/admin/players/${edit.dataset.edit}`);
        return openPlayerEditor(p, () => S[section]());
      }
      if (matchEl && !t0.closest('[data-player]')) {
        const match = S._matches?.find((x) => x.id === Number(matchEl.dataset.match));
        if (!match) return undefined;
        let affectsSr = true;
        if (match.tournament_id) affectsSr = (await api(`/admin/tournaments/${match.tournament_id}`)).tournament.affects_sr;
        return openMatchEditor({ match, affectsSr, onSaved: () => S.matches() });
      }
      const dc = t0.closest('[data-dc]')?.dataset.dc;
      if (dc === 'panel') {
        await api('/admin/discord/panel', { method: 'POST', body: {} });
        toast(t('panel_posted'), 'ok');
        return S.discord();
      }
      if (dc === 'commands') {
        await api('/admin/discord/commands', { method: 'POST', body: {} });
        toast(t('saved'), 'ok');
        return S.discord();
      }
    } catch (err) {
      toastError(err);
    }
    return undefined;
  });

  wireSegs(content, (name, v) => {
    if (name === 'regFilter') {
      ui.regFilter = v;
      S.registrations();
    } else if (name === 'playerFilter') {
      ui.playerFilter = v;
      S.players();
    } else if (name === 'matchFilter') {
      ui.matchFilter = v;
      S.matches();
    }
  });

  /* -------------------------------------------------------------- navigation */

  const show = async () => {
    cleanup();
    cleanup = () => {};
    content.onclick = null;
    content.onchange = null;
    drawSide();
    ctx.setHints(section === 'settings' ? [{ id: 'restore', key: 'DEL', code: 'Delete', label: t('hint_restore'), run: restoreDefaults }] : []);
    render(content, loaderHtml());
    try {
      await S[section]();
    } catch (err) {
      if (err.status === 401) return location.reload();
      toastError(err);
    }
    return undefined;
  };

  loadOverview().then(show);

  return {
    async update(next) {
      section = pickSection(next[0]);
      subId = Number(next[1]) || null;
      await show();
    },
    // Live updates: redraw the open section when something it shows changed — but never while the
    // admin is typing or has a popup open (their unsaved input would be lost).
    async refresh(batch) {
      const scopes = new Set(batch.map((c) => c.scope));
      await loadOverview();
      if (document.querySelector('.modal-root')) return;
      const el = document.activeElement;
      if (el && content.contains(el) && el.matches('input, textarea, select')) return;
      const WATCH = {
        overview: ['*'],
        log: ['*'],
        registrations: ['registrations', 'players'],
        players: ['players', 'registrations'],
        tournaments: ['tournaments', 'matches', 'players'],
        matches: ['matches', 'players', 'tournaments'],
        discord: ['settings'],
        settings: ['settings'],
      };
      const want = WATCH[section] ?? [];
      if (!want.includes('*') && !want.some((x) => scopes.has(x))) return;
      const y = window.scrollY;
      const inner = content.scrollTop;
      await S[section]();
      window.scrollTo(0, y);
      content.scrollTop = inner;
    },
    back() {
      if (section === 'tournaments' && subId) {
        go('tournaments');
        return true;
      }
      return false;
    },
    unmount: () => {
      cleanup();
      delete document.body.dataset.role;
    },
  };
}

/* ======================================================================== entry */

export default {
  async mount(view, params, ctx) {
    let inner = null;
    const start = async () => {
      const me = await api('/auth/me').catch(() => ({ admin: false }));
      inner = me.admin ? mountPanel(view, params, ctx, me) : mountLogin(view, ctx, () => { ctx.navigate('/admin', { replace: true }); start(); });
    };
    await start();
    return {
      update: (next) => {
        params = next;
        return inner?.update?.(next);
      },
      refresh: (batch) => inner?.refresh?.(batch),
      back: () => inner?.back?.() ?? false,
      unmount: () => inner?.unmount?.(),
    };
  },
};
