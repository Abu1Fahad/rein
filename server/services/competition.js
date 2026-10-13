import { all, get, run, tx, now } from '../db.js';
import { bus, changed } from '../events.js';
import { HttpError, notFound, toInt, toStr, toId, oneOf } from '../http.js';
import { setting, ranks } from './settings.js';
import { rankOf, matchPoints } from './ranks.js';
import { audit } from './audit.js';
import { getPlayer, playerName, summariesById } from './players.js';

export const BRACKET_SIZES = [4, 8, 16, 32, 64];
export const TOURNAMENT_STATUSES = ['upcoming', 'live', 'completed'];
export const MATCH_STATUSES = ['pending', 'live', 'completed'];
export const FORMATS = ['single', 'double'];
/** Round numbering: upper bracket 1..k, lower bracket LB+1..LB+2(k-1), grand final GF. */
export const LB = 100;
export const GF = 200;

const getMatch = (id) => get('SELECT * FROM matches WHERE id = ?', id) ?? null;
const getTournament = (id) => get('SELECT * FROM tournaments WHERE id = ?', id) ?? null;
const matchAt = (tid, round, slot) => get('SELECT * FROM matches WHERE tournament_id = ? AND round = ? AND slot = ?', tid, round, slot) ?? null;
const roundsFor = (size) => Math.round(Math.log2(size));
const fmtOf = (t) => (t?.format === 'double' ? 'double' : 'single');
const lbRoundsFor = (size, format) => (format === 'double' ? 2 * (roundsFor(size) - 1) : 0);

/** Every round of a bracket with its number of matches. */
export function bracketLayout(size, format) {
  const k = roundsFor(size);
  const out = [];
  for (let r = 1; r <= k; r++) out.push({ round: r, count: size / 2 ** r });
  if (format === 'double') {
    for (let L = 1; L <= 2 * (k - 1); L++) out.push({ round: LB + L, count: size / 2 ** (Math.ceil(L / 2) + 1) });
    out.push({ round: GF, count: 1 });
  }
  return out;
}

/**
 * Where the winner and the loser of a match go: { win: target | 'champ', lose: target | null },
 * target = { round, slot, field }.
 *  - single: winners advance, losers are out.
 *  - double: upper-bracket losers drop into the lower bracket (round 1 losers meet each other, later
 *    losers meet the lower-bracket survivors). Lower-bracket losers are out. The upper winner and the
 *    lower winner meet in the grand final.
 */
export function routeOf(size, format, round, slot) {
  const k = roundsFor(size);
  const half = (r, s) => ({ round: r, slot: Math.floor(s / 2), field: s % 2 === 0 ? 'player1_id' : 'player2_id' });
  if (format !== 'double') return { win: round < k ? half(round + 1, slot) : 'champ', lose: null };
  if (round === GF) return { win: 'champ', lose: null };
  if (round < LB) {
    const win = round < k ? half(round + 1, slot) : { round: GF, slot: 0, field: 'player1_id' };
    let lose;
    if (round === 1) lose = half(LB + 1, slot);
    else {
      const count = size / 2 ** round;
      // Alternate the drop order so players don't immediately rematch someone they already beat.
      lose = { round: LB + 2 * (round - 1), slot: round % 2 === 0 ? count - 1 - slot : slot, field: 'player2_id' };
    }
    return { win, lose };
  }
  const L = round - LB;
  if (L === 2 * (k - 1)) return { win: { round: GF, slot: 0, field: 'player2_id' }, lose: null };
  if (L % 2 === 1) return { win: { round: round + 1, slot, field: 'player1_id' }, lose: null };
  return { win: half(round + 1, slot), lose: null };
}

/* ---------------------------------------------------------------- SR */

export function srPreview(winnerId, loserId, { winnerRounds = 0, loserRounds = 0 } = {}) {
  const w = getPlayer(winnerId);
  const l = getPlayer(loserId);
  if (!w || !l) throw notFound('player_not_found');
  const mode = setting('points_mode');
  if (mode === 'rank') {
    const table = ranks();
    const wr = Math.max(0, Number(winnerRounds) || 0);
    const lr = Math.max(0, Number(loserRounds) || 0);
    const wRank = rankOf(table, w.sr);
    const lRank = rankOf(table, l.sr);
    const pts = matchPoints({
      winnerRank: wRank, loserRank: lRank, winnerRounds: wr, loserRounds: lr,
      dominancePct: setting('dominance_pct'), gapPct: setting('gap_pct'),
    });
    const side = (rank) => ({ rank: rank.name, color: rank.color, win: rank.win, loss: rank.loss });
    return {
      mode,
      gain: pts.gain,
      loss: pts.loss,
      dominance: pts.dominance,
      gap: pts.gap,
      rank_gap: pts.rank_gap,
      rounds: [wr, lr],
      winner: side(wRank),
      loser: side(lRank),
      expected: null,
    };
  }
  if (mode === 'fixed') {
    return { mode: 'fixed', gain: setting('fixed_win'), loss: setting('fixed_loss'), expected: null };
  }
  const expected = 1 / (1 + 10 ** ((l.sr - w.sr) / 400));
  const gain = Math.max(1, Math.round(setting('elo_k') * (1 - expected)));
  return { mode: 'elo', gain, loss: gain, expected: Math.round(expected * 1000) / 1000 };
}

function countsForSr(m) {
  if (!m.tournament_id) return true;
  return !!getTournament(m.tournament_id)?.affects_sr;
}

function applyMatch(m) {
  if (m.applied || !m.winner_id || m.is_bye || !m.player1_id || !m.player2_id) return;
  if (!countsForSr(m)) return;
  const loserId = m.winner_id === m.player1_id ? m.player2_id : m.player1_id;
  const w = getPlayer(m.winner_id);
  const l = getPlayer(loserId);
  if (!w || !l) return;
  const floor = setting('min_sr');
  const gain = Math.max(0, m.sr_gain);
  const loss = Math.max(0, Math.min(m.sr_loss, l.sr - floor));
  run('UPDATE players SET sr = sr + ?, wins = wins + 1, updated_at = ? WHERE id = ?', gain, now(), w.id);
  run('UPDATE players SET sr = sr - ?, losses = losses + 1, updated_at = ? WHERE id = ?', loss, now(), l.id);
  run('INSERT INTO sr_history (player_id, match_id, delta, sr_after) VALUES (?, ?, ?, ?)', w.id, m.id, gain, w.sr + gain);
  run('INSERT INTO sr_history (player_id, match_id, delta, sr_after) VALUES (?, ?, ?, ?)', l.id, m.id, -loss, l.sr - loss);
  run('UPDATE matches SET applied = 1, applied_winner_id = ?, applied_loser_id = ?, sr_gain = ?, sr_loss = ? WHERE id = ?',
    w.id, l.id, gain, loss, m.id);
}

function revertMatch(m) {
  if (!m?.applied) return;
  if (m.applied_winner_id) {
    run('UPDATE players SET sr = sr - ?, wins = MAX(0, wins - 1), updated_at = ? WHERE id = ?', m.sr_gain, now(), m.applied_winner_id);
  }
  if (m.applied_loser_id) {
    run('UPDATE players SET sr = sr + ?, losses = MAX(0, losses - 1), updated_at = ? WHERE id = ?', m.sr_loss, now(), m.applied_loser_id);
  }
  run('DELETE FROM sr_history WHERE match_id = ?', m.id);
  run('UPDATE matches SET applied = 0, applied_winner_id = NULL, applied_loser_id = NULL WHERE id = ?', m.id);
}

/* ---------------------------------------------------------------- bracket propagation */

function setChampion(tid, winnerId) {
  const t = getTournament(tid);
  if (!t) return;
  let status = t.status;
  if (winnerId) status = 'completed';
  else if (t.status === 'completed') status = 'live';
  run('UPDATE tournaments SET champion_id = ?, status = ?, updated_at = ? WHERE id = ?', winnerId ?? null, status, now(), tid);
}

function place(tid, target, pid) {
  const next = matchAt(tid, target.round, target.slot);
  if (!next) return;
  if (next[target.field] === (pid ?? null)) return;
  if (next.winner_id || next.status !== 'pending') clearMatchInternal(next);
  run(`UPDATE matches SET ${target.field} = ?, updated_at = ? WHERE id = ?`, pid ?? null, now(), next.id);
}

/**
 * Push the winner (and, in double elimination, the loser) of a match to wherever they play next,
 * clearing anything that depended on the old values.
 */
function propagate(m, winnerId, loserId = null) {
  if (!m.tournament_id) return;
  const t = getTournament(m.tournament_id);
  if (!t) return;
  const r = routeOf(t.size, fmtOf(t), m.round, m.slot);
  if (r.win === 'champ') setChampion(t.id, winnerId);
  else place(t.id, r.win, winnerId);
  if (r.lose) place(t.id, r.lose, loserId);
}

function clearMatchInternal(m) {
  revertMatch(m);
  run(`UPDATE matches SET winner_id = NULL, score1 = 0, score2 = 0, status = 'pending', is_bye = 0,
       sr_gain = 0, sr_loss = 0, played_at = NULL, updated_at = ? WHERE id = ?`, now(), m.id);
  if (m.winner_id) propagate(m, null, null);
}

/* ---------------------------------------------------------------- match results */

/**
 * Set or change a match result. body: { winner_id, score1, score2, sr_gain, sr_loss, status, note, played_at }
 * winner_id = null with status pending/live clears the result.
 */
export function setMatchResult(matchId, body, actor) {
  const result = tx(() => {
    const m = getMatch(matchId);
    if (!m) throw notFound('match_not_found');
    const winnerId = toId(body.winner_id);
    const score1 = toInt(body.score1, { min: 0, max: 99, def: m.score1 });
    const score2 = toInt(body.score2, { min: 0, max: 99, def: m.score2 });
    const note = 'note' in body ? toStr(body.note, 200) : m.note;

    if (!winnerId) {
      const status = oneOf(body.status, ['pending', 'live'], 'pending');
      clearMatchInternal(m);
      run('UPDATE matches SET status = ?, score1 = ?, score2 = ?, note = ?, updated_at = ? WHERE id = ?', status, score1, score2, note, now(), m.id);
      if (status === 'live' && m.tournament_id) {
        run(`UPDATE tournaments SET status = 'live', updated_at = ? WHERE id = ? AND status = 'upcoming'`, now(), m.tournament_id);
      }
      return { match: getMatch(m.id), completed: false };
    }

    if (winnerId !== m.player1_id && winnerId !== m.player2_id) throw new HttpError(400, 'winner_not_in_match');
    const loserId = winnerId === m.player1_id ? m.player2_id : m.player1_id;
    const isBye = !loserId;

    let gain = toInt(body.sr_gain, { min: 0, max: 1000 });
    let loss = toInt(body.sr_loss, { min: 0, max: 1000 });
    if (!isBye && (gain === null || loss === null)) {
      const winnerRounds = winnerId === m.player1_id ? score1 : score2;
      const loserRounds = winnerId === m.player1_id ? score2 : score1;
      const preview = srPreview(winnerId, loserId, { winnerRounds, loserRounds });
      gain ??= preview.gain;
      loss ??= preview.loss;
    }
    const playedAt = body.played_at ? new Date(body.played_at) : null;
    const playedIso = playedAt && !Number.isNaN(playedAt.getTime()) ? playedAt.toISOString() : m.played_at || now();

    const winnerChanged = m.winner_id !== winnerId;
    revertMatch(m);
    run(`UPDATE matches SET winner_id = ?, score1 = ?, score2 = ?, status = 'completed', is_bye = ?, sr_gain = ?, sr_loss = ?,
         note = ?, played_at = ?, updated_at = ? WHERE id = ?`,
      winnerId, score1, score2, isBye ? 1 : 0, isBye ? 0 : gain, isBye ? 0 : loss, note, playedIso, now(), m.id);
    applyMatch(getMatch(m.id));
    if (winnerChanged) propagate(m, winnerId, isBye ? null : loserId);
    if (m.tournament_id) {
      run(`UPDATE tournaments SET status = 'live', updated_at = ? WHERE id = ? AND status = 'upcoming'`, now(), m.tournament_id);
      // In double elimination a lower-bracket bye only becomes known once results come in.
      resolveByesInternal(m.tournament_id);
    }
    return { match: getMatch(m.id), completed: !isBye };
  });

  const m = result.match;
  audit(actor, 'match.result', describeMatch(m));
  if (result.completed) bus.emit('match:completed', m.id);
  changed('matches', m.id);
  changed('players');
  if (m.tournament_id) changed('tournaments', m.tournament_id);
  return decorateMatches([m])[0];
}

export function clearMatch(matchId, actor) {
  const m = tx(() => {
    const match = getMatch(matchId);
    if (!match) throw notFound('match_not_found');
    clearMatchInternal(match);
    if (match.tournament_id && getTournament(match.tournament_id)?.status === 'live') resolveByesInternal(match.tournament_id);
    return getMatch(matchId);
  });
  audit(actor, 'match.clear', describeMatch(m));
  changed('matches', m.id);
  changed('players');
  if (m.tournament_id) changed('tournaments', m.tournament_id);
  return decorateMatches([m])[0];
}

/** Put players into a match slot (any round). Clears the existing result if the line-up changes. */
export function setMatchPlayers(matchId, body, actor) {
  const m = tx(() => {
    const match = getMatch(matchId);
    if (!match) throw notFound('match_not_found');
    const p1 = 'player1_id' in body ? toId(body.player1_id) : match.player1_id;
    const p2 = 'player2_id' in body ? toId(body.player2_id) : match.player2_id;
    if (p1 && p1 === p2) throw new HttpError(400, 'same_player');
    for (const pid of [p1, p2]) if (pid && !getPlayer(pid)) throw notFound('player_not_found');
    if (p1 === match.player1_id && p2 === match.player2_id) return match;
    clearMatchInternal(match);
    run('UPDATE matches SET player1_id = ?, player2_id = ?, updated_at = ? WHERE id = ?', p1, p2, now(), match.id);
    if (match.tournament_id) {
      for (const pid of [p1, p2]) if (pid) ensureEntry(match.tournament_id, pid);
    }
    return getMatch(match.id);
  });
  audit(actor, 'match.players', describeMatch(m));
  changed('matches', m.id);
  if (m.tournament_id) changed('tournaments', m.tournament_id);
  return decorateMatches([m])[0];
}

/** One-off match outside any bracket ("showmatch"). */
export function createShowmatch(body, actor) {
  const p1 = toId(body.player1_id);
  const p2 = toId(body.player2_id);
  if (!p1 || !p2) throw new HttpError(400, 'two_players_required');
  if (p1 === p2) throw new HttpError(400, 'same_player');
  for (const pid of [p1, p2]) if (!getPlayer(pid)) throw notFound('player_not_found');
  const id = tx(() => {
    const res = run('INSERT INTO matches (player1_id, player2_id, note) VALUES (?, ?, ?)', p1, p2, toStr(body.note, 200));
    return Number(res.lastInsertRowid);
  });
  audit(actor, 'match.create', `#${id}`);
  if (body.winner_id || body.status === 'live') return setMatchResult(id, body, actor);
  changed('matches', id);
  return decorateMatches([getMatch(id)])[0];
}

export function deleteMatch(matchId, actor) {
  const m = getMatch(matchId);
  if (!m) throw notFound('match_not_found');
  if (m.tournament_id) throw new HttpError(400, 'bracket_match_use_clear');
  tx(() => {
    revertMatch(m);
    run('DELETE FROM matches WHERE id = ?', m.id);
  });
  audit(actor, 'match.delete', describeMatch(m));
  changed('matches', m.id);
  changed('players');
  return { ok: true };
}

function describeMatch(m) {
  const a = playerName(getPlayer(m.player1_id)) ?? '—';
  const b = playerName(getPlayer(m.player2_id)) ?? '—';
  const w = m.winner_id ? playerName(getPlayer(m.winner_id)) : null;
  const where = m.tournament_id ? `T${m.tournament_id} R${m.round} S${m.slot}` : 'showmatch';
  return `#${m.id} [${where}] ${a} ${m.score1}-${m.score2} ${b}${w ? ` → ${w} (+${m.sr_gain}/-${m.sr_loss})` : ''}`;
}

export function decorateMatches(matches, entrySeeds) {
  const players = summariesById(matches.flatMap((m) => [m.player1_id, m.player2_id]));
  return matches.map((m) => ({
    id: m.id,
    tournament_id: m.tournament_id,
    round: m.round,
    slot: m.slot,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    p1: players.get(m.player1_id) ?? null,
    p2: players.get(m.player2_id) ?? null,
    seed1: entrySeeds?.get(m.player1_id) ?? null,
    seed2: entrySeeds?.get(m.player2_id) ?? null,
    score1: m.score1,
    score2: m.score2,
    winner_id: m.winner_id,
    status: m.status,
    is_bye: !!m.is_bye,
    sr_gain: m.sr_gain,
    sr_loss: m.sr_loss,
    applied: !!m.applied,
    note: m.note,
    played_at: m.played_at,
    tournament_name: m.tournament_name ?? undefined,
    tournament_size: m.tournament_size ?? undefined,
    tournament_format: m.tournament_format ?? undefined,
  }));
}

export function listMatches({ type = 'all', tournamentId = null, limit = 50, includePending = false } = {}) {
  const where = ['m.player1_id IS NOT NULL', 'm.player2_id IS NOT NULL', 'm.is_bye = 0'];
  const params = [];
  if (!includePending) where.push("m.status IN ('completed','live')");
  if (type === 'live') where.push("m.status = 'live'");
  if (type === 'tournament') where.push('m.tournament_id IS NOT NULL');
  if (type === 'showmatch') where.push('m.tournament_id IS NULL');
  if (tournamentId) {
    where.push('m.tournament_id = ?');
    params.push(tournamentId);
  }
  const rows = all(`
    SELECT m.*, t.name AS tournament_name, t.size AS tournament_size, t.format AS tournament_format FROM matches m
    LEFT JOIN tournaments t ON t.id = m.tournament_id
    WHERE ${where.join(' AND ')}
    ORDER BY (m.status = 'live') DESC, COALESCE(m.played_at, m.updated_at) DESC, m.id DESC
    LIMIT ?`, ...params, Math.min(500, Math.max(1, limit)));
  return decorateMatches(rows);
}

/* ---------------------------------------------------------------- tournaments */

function ensureEntry(tid, pid) {
  if (get('SELECT 1 AS x FROM tournament_entries WHERE tournament_id = ? AND player_id = ?', tid, pid)) return;
  const max = get('SELECT COALESCE(MAX(seed), 0) AS s FROM tournament_entries WHERE tournament_id = ?', tid).s;
  run('INSERT INTO tournament_entries (tournament_id, player_id, seed) VALUES (?, ?, ?)', tid, pid, max + 1);
}

function generateMatches(tid, size, format = 'single') {
  for (const { round, count } of bracketLayout(size, format)) {
    for (let s = 0; s < count; s++) run('INSERT INTO matches (tournament_id, round, slot) VALUES (?, ?, ?)', tid, round, s);
  }
}

function revertAll(tid) {
  for (const m of all('SELECT * FROM matches WHERE tournament_id = ? AND applied = 1', tid)) revertMatch(m);
}

/** Standard seeding: position i of the first round holds seed order[i] (1 v N, 2 v N-1 meet last). */
export function seedPositions(size) {
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

function placeSeeds(tid, size, playerIds) {
  const order = seedPositions(size);
  run(`UPDATE matches SET player1_id = NULL, player2_id = NULL, winner_id = NULL, score1 = 0, score2 = 0, status = 'pending',
       is_bye = 0, sr_gain = 0, sr_loss = 0, applied = 0, played_at = NULL, updated_at = ? WHERE tournament_id = ?`, now(), tid);
  run('DELETE FROM tournament_entries WHERE tournament_id = ?', tid);
  playerIds.slice(0, size).forEach((pid, i) => {
    run('INSERT INTO tournament_entries (tournament_id, player_id, seed) VALUES (?, ?, ?)', tid, pid, i + 1);
  });
  order.forEach((seed, pos) => {
    const pid = playerIds[seed - 1] ?? null;
    if (!pid) return;
    const field = pos % 2 === 0 ? 'player1_id' : 'player2_id';
    run(`UPDATE matches SET ${field} = ? WHERE tournament_id = ? AND round = 1 AND slot = ?`, pid, tid, Math.floor(pos / 2));
  });
  run(`UPDATE tournaments SET champion_id = NULL, status = CASE WHEN status = 'completed' THEN 'live' ELSE status END, updated_at = ? WHERE id = ?`, now(), tid);
}

function readTournamentFields(body, current = {}) {
  const f = {};
  if ('name' in body) {
    f.name = toStr(body.name, 80);
    if (!f.name) throw new HttpError(400, 'name_required');
  }
  if ('description' in body) f.description = toStr(body.description, 600, { multiline: true });
  if ('status' in body) f.status = oneOf(body.status, TOURNAMENT_STATUSES, current.status ?? 'upcoming');
  if ('best_of' in body) f.best_of = toInt(body.best_of, { min: 1, max: 15, def: 3 });
  if ('affects_sr' in body) f.affects_sr = body.affects_sr === true || body.affects_sr === 'true' || body.affects_sr === 1 ? 1 : 0;
  if ('starts_at' in body) {
    const d = body.starts_at ? new Date(body.starts_at) : null;
    f.starts_at = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }
  return f;
}

export function createTournament(body, actor) {
  const size = toInt(body.size, { def: 8 });
  if (!BRACKET_SIZES.includes(size)) throw new HttpError(400, 'invalid_size');
  const format = oneOf(body.format, FORMATS, 'single');
  const f = readTournamentFields({ name: body.name, description: body.description ?? '', best_of: body.best_of ?? 3, affects_sr: body.affects_sr ?? true, starts_at: body.starts_at, status: body.status ?? 'upcoming' });
  const id = tx(() => {
    const res = run('INSERT INTO tournaments (name, description, size, status, best_of, starts_at, affects_sr, format) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      f.name, f.description, size, f.status, f.best_of, f.starts_at, f.affects_sr, format);
    const tid = Number(res.lastInsertRowid);
    generateMatches(tid, size, format);
    const playerIds = Array.isArray(body.player_ids) ? body.player_ids.map(toId).filter(Boolean) : [];
    if (playerIds.length) placeSeeds(tid, size, orderPlayers(playerIds, body.seed_mode));
    return tid;
  });
  audit(actor, 'tournament.create', `${f.name} (#${id}, ${size}, ${format})`);
  changed('tournaments', id);
  return tournamentDetail(id, { admin: true });
}

export function updateTournament(id, body, actor) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  const f = readTournamentFields(body, t);
  const cols = Object.keys(f).filter((c) => f[c] !== t[c]);
  tx(() => {
    if (cols.includes('affects_sr')) {
      // Re-apply SR for every decided match under the new rule.
      revertAll(id);
      run('UPDATE tournaments SET affects_sr = ? WHERE id = ?', f.affects_sr, id);
      if (f.affects_sr) for (const m of all("SELECT * FROM matches WHERE tournament_id = ? AND status = 'completed' ORDER BY round, slot", id)) applyMatch(m);
    }
    if (cols.length) {
      run(`UPDATE tournaments SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...cols.map((c) => f[c]), now(), id);
    }
    if (f.status === 'live' && t.status !== 'live') resolveByesInternal(id);
  });
  if (cols.length) audit(actor, 'tournament.update', `${t.name} (#${id}): ${cols.join(', ')}`);
  changed('tournaments', id);
  if (cols.includes('affects_sr')) changed('players');
  return tournamentDetail(id, { admin: true });
}

export function deleteTournament(id, actor) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  tx(() => {
    revertAll(id);
    run('DELETE FROM tournaments WHERE id = ?', id);
  });
  audit(actor, 'tournament.delete', `${t.name} (#${id})`);
  changed('tournaments', id);
  changed('players');
  return { ok: true };
}

function currentSeedOrder(tid) {
  return all('SELECT player_id FROM tournament_entries WHERE tournament_id = ? ORDER BY seed', tid).map((r) => r.player_id);
}

/**
 * Change the number of bracket cells and/or the format (single / double elimination).
 * Results are reset; seeded players are kept (top seeds first if shrinking).
 */
export function resizeTournament(id, size, actor, format = null) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  size = size === undefined || size === null ? t.size : toInt(size);
  if (!BRACKET_SIZES.includes(size)) throw new HttpError(400, 'invalid_size');
  format = oneOf(format, FORMATS, fmtOf(t));
  const players = currentSeedOrder(id);
  tx(() => {
    revertAll(id);
    run('DELETE FROM matches WHERE tournament_id = ?', id);
    run('UPDATE tournaments SET size = ?, format = ?, champion_id = NULL, updated_at = ? WHERE id = ?', size, format, now(), id);
    generateMatches(id, size, format);
    placeSeeds(id, size, players);
    if (t.status === 'live') resolveByesInternal(id);
  });
  audit(actor, 'tournament.resize', `${t.name} (#${id}): ${t.size}/${fmtOf(t)} → ${size}/${format}`);
  changed('tournaments', id);
  changed('players');
  return tournamentDetail(id, { admin: true });
}

function orderPlayers(ids, mode) {
  const unique = [...new Set(ids)].filter((pid) => getPlayer(pid));
  if (mode === 'random') {
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique;
  }
  if (mode === 'order') return unique;
  const sr = new Map(unique.map((pid) => [pid, getPlayer(pid).sr]));
  return unique.sort((a, b) => sr.get(b) - sr.get(a));
}

/** Seed the first round. mode: sr (default) | random | order */
export function seedTournament(id, body, actor) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  const ids = Array.isArray(body.player_ids) ? body.player_ids.map(toId).filter(Boolean) : [];
  const mode = oneOf(body.mode, ['sr', 'random', 'order'], 'sr');
  const ordered = orderPlayers(ids, mode);
  if (ordered.length > t.size) throw new HttpError(400, 'too_many_players', { max: t.size });
  tx(() => {
    revertAll(id);
    placeSeeds(id, t.size, ordered);
    if (t.status === 'live') resolveByesInternal(id);
  });
  audit(actor, 'tournament.seed', `${t.name} (#${id}): ${ordered.length} players, ${mode}`);
  changed('tournaments', id);
  changed('players');
  return tournamentDetail(id, { admin: true });
}

/** Advance players whose opponent slot can never be filled (works for both formats). */
function resolveByesInternal(tid) {
  const t = getTournament(tid);
  const fmt = fmtOf(t);
  for (let pass = 0; pass < 2000; pass++) {
    const matches = all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, slot', tid);
    // Which match output feeds each slot.
    const feeds = new Map();
    for (const m of matches) {
      const r = routeOf(t.size, fmt, m.round, m.slot);
      if (r.win !== 'champ') feeds.set(`${r.win.round}:${r.win.slot}:${r.win.field}`, { m, kind: 'win' });
      if (r.lose) feeds.set(`${r.lose.round}:${r.lose.slot}:${r.lose.field}`, { m, kind: 'lose' });
    }
    const memo = new Map();
    // A slot is "dead" when it is empty and nobody can ever arrive there.
    const slotDead = (m, field) => {
      if (m[field]) return false;
      const key = `${m.id}:${field}`;
      if (memo.has(key)) return memo.get(key);
      const f = feeds.get(`${m.round}:${m.slot}:${field}`);
      let v;
      if (!f) v = true;
      else if (f.kind === 'win') v = !f.m.winner_id && slotDead(f.m, 'player1_id') && slotDead(f.m, 'player2_id');
      else v = f.m.winner_id ? !!f.m.is_bye : slotDead(f.m, 'player1_id') || slotDead(f.m, 'player2_id');
      memo.set(key, v);
      return v;
    };
    let advanced = false;
    for (const m of matches) {
      if (m.winner_id) continue;
      const d1 = slotDead(m, 'player1_id');
      const d2 = slotDead(m, 'player2_id');
      if (d1 === d2) continue;
      const pid = d1 ? m.player2_id : m.player1_id;
      if (!pid) continue;
      run(`UPDATE matches SET winner_id = ?, status = 'completed', is_bye = 1, sr_gain = 0, sr_loss = 0, score1 = 0, score2 = 0,
           played_at = ?, updated_at = ? WHERE id = ?`, pid, now(), now(), m.id);
      propagate(m, pid, null);
      advanced = true;
      break;
    }
    if (!advanced) break;
  }
}

export function resolveByes(id, actor) {
  if (!getTournament(id)) throw notFound('tournament_not_found');
  tx(() => resolveByesInternal(id));
  audit(actor, 'tournament.byes', `#${id}`);
  changed('tournaments', id);
  return tournamentDetail(id, { admin: true });
}

export function resetTournament(id, actor) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  tx(() => {
    revertAll(id);
    run(`UPDATE matches SET winner_id = NULL, score1 = 0, score2 = 0, status = 'pending', is_bye = 0, sr_gain = 0, sr_loss = 0,
         played_at = NULL, updated_at = ? WHERE tournament_id = ?`, now(), id);
    run('UPDATE matches SET player1_id = NULL, player2_id = NULL WHERE tournament_id = ? AND round > 1', id);
    run(`UPDATE tournaments SET champion_id = NULL, status = 'upcoming', updated_at = ? WHERE id = ?`, now(), id);
  });
  audit(actor, 'tournament.reset', `${t.name} (#${id})`);
  changed('tournaments', id);
  changed('players');
  return tournamentDetail(id, { admin: true });
}

function serializeTournament(t, extra = {}) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    size: t.size,
    format: fmtOf(t),
    rounds: roundsFor(t.size),
    lb_rounds: lbRoundsFor(t.size, fmtOf(t)),
    status: t.status,
    best_of: t.best_of,
    starts_at: t.starts_at,
    affects_sr: !!t.affects_sr,
    champion: t.champion_id ? summariesById([t.champion_id]).get(t.champion_id) ?? null : null,
    created_at: t.created_at,
    updated_at: t.updated_at,
    ...extra,
  };
}

export function listTournaments() {
  const rows = all(`
    SELECT t.*,
      (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id = t.id) AS players,
      (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.status = 'live') AS live_matches,
      (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.status = 'completed' AND m.is_bye = 0) AS played
    FROM tournaments t
    ORDER BY CASE t.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(t.starts_at, t.created_at) DESC, t.id DESC`);
  return rows.map((t) => serializeTournament(t, { players: t.players, live_matches: t.live_matches, played: t.played }));
}

export function tournamentDetail(id) {
  const t = getTournament(id);
  if (!t) throw notFound('tournament_not_found');
  const entries = all('SELECT player_id, seed FROM tournament_entries WHERE tournament_id = ? ORDER BY seed', id);
  const seeds = new Map(entries.map((e) => [e.player_id, e.seed]));
  const matches = all('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, slot', id);
  const players = summariesById(entries.map((e) => e.player_id));
  const byKey = new Map(matches.map((m) => [`${m.round}:${m.slot}`, m.id]));
  const fmt = fmtOf(t);
  const decorated = decorateMatches(matches, seeds).map((m) => {
    const r = routeOf(t.size, fmt, m.round, m.slot);
    return {
      ...m,
      bracket: m.round === GF ? 'GF' : m.round > LB ? 'L' : 'W',
      win_to: r.win === 'champ' ? 'champ' : byKey.get(`${r.win.round}:${r.win.slot}`) ?? null,
      win_field: r.win === 'champ' ? null : r.win.field === 'player1_id' ? 1 : 2,
      lose_to: r.lose ? byKey.get(`${r.lose.round}:${r.lose.slot}`) ?? null : null,
    };
  });
  return {
    tournament: serializeTournament(t, { players: entries.length }),
    entries: entries.map((e) => ({ seed: e.seed, player: players.get(e.player_id) ?? null })),
    matches: decorated,
  };
}

export function competitionStats() {
  return {
    matches: get("SELECT COUNT(*) AS n FROM matches WHERE status = 'completed' AND is_bye = 0").n,
    live: get("SELECT COUNT(*) AS n FROM matches WHERE status = 'live'").n,
    tournaments: get('SELECT COUNT(*) AS n FROM tournaments').n,
    live_tournaments: get("SELECT COUNT(*) AS n FROM tournaments WHERE status = 'live'").n,
  };
}
