import { all, get, run, tx, now } from '../db.js';
import { bus, changed } from '../events.js';
import { HttpError, notFound, toInt, toStr, oneOf } from '../http.js';
import { setting, ranks } from './settings.js';
import { rankOf } from './ranks.js';
import { audit } from './audit.js';

export const RANK_TIERS = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'champion', 'top500'];
export const STATUSES = ['pending', 'approved', 'rejected', 'banned'];
export const BATTLETAG_RE = /^[^\s#]{2,16}#\d{3,7}$/u;

export const getPlayer = (id) => get('SELECT * FROM players WHERE id = ?', id) ?? null;
export const getByDiscordId = (discordId) => get('SELECT * FROM players WHERE discord_id = ?', String(discordId)) ?? null;

export function playerName(p) {
  if (!p) return null;
  return p.display_name || p.username || (p.battletag || '').split('#')[0] || `Player ${p.id}`;
}

/** The SR rank a player currently sits in: { i, name, color }. */
export function tierOf(sr) {
  const r = rankOf(ranks(), sr);
  return { i: r.index, name: r.name, color: r.color };
}

/** Compact public shape used everywhere a player is referenced. */
export function summary(p) {
  if (!p) return null;
  const showTag = setting('show_battletags');
  return {
    id: p.id,
    name: playerName(p),
    username: p.username || null,
    avatar: p.avatar_url || null,
    battletag: showTag ? p.battletag || null : null,
    rank_tier: p.rank_tier,
    rank_division: p.rank_division,
    sr: p.sr,
    tier: tierOf(p.sr),
    wins: p.wins,
    losses: p.losses,
    status: p.status,
  };
}

export function adminView(p) {
  if (!p) return null;
  return { ...p, name: playerName(p), in_guild: !!p.in_guild, tier: tierOf(p.sr) };
}

export function summariesById(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;
  const rows = all(`SELECT * FROM players WHERE id IN (${unique.map(() => '?').join(',')})`, ...unique);
  for (const row of rows) map.set(row.id, summary(row));
  return map;
}

/** Last N decided (non-bye) results for each player, newest first. */
function recentForm(limit = 5) {
  const rows = all(`
    SELECT player1_id, player2_id, winner_id FROM matches
    WHERE status = 'completed' AND is_bye = 0 AND winner_id IS NOT NULL
    ORDER BY played_at DESC, id DESC LIMIT 5000`);
  const form = new Map();
  for (const m of rows) {
    for (const pid of [m.player1_id, m.player2_id]) {
      if (!pid) continue;
      const list = form.get(pid) ?? [];
      if (list.length < limit) list.push(m.winner_id === pid ? 'W' : 'L');
      form.set(pid, list);
    }
  }
  return form;
}

function lastDeltas() {
  const rows = all('SELECT player_id, delta FROM sr_history WHERE id IN (SELECT MAX(id) FROM sr_history GROUP BY player_id)');
  return new Map(rows.map((r) => [r.player_id, r.delta]));
}

function streakOf(form) {
  if (!form?.length) return 0;
  let n = 0;
  for (const r of form) {
    if (r !== form[0]) break;
    n++;
  }
  return form[0] === 'W' ? n : -n;
}

export function leaderboard() {
  const players = all(`SELECT * FROM players WHERE status = 'approved' ORDER BY sr DESC, wins DESC, losses ASC, id ASC`);
  const form = recentForm();
  const trend = lastDeltas();
  const titles = new Map(all('SELECT champion_id, COUNT(*) AS n FROM tournaments WHERE champion_id IS NOT NULL GROUP BY champion_id').map((r) => [r.champion_id, r.n]));
  return players.map((p, i) => {
    const games = p.wins + p.losses;
    const f = form.get(p.id) ?? [];
    return {
      position: i + 1,
      ...summary(p),
      games,
      winrate: games ? Math.round((p.wins / games) * 1000) / 10 : null,
      form: f,
      streak: streakOf(f),
      trend: trend.get(p.id) ?? 0,
      titles: titles.get(p.id) ?? 0,
      joined_at: p.reviewed_at || p.created_at,
    };
  });
}

export function profile(id) {
  const p = getPlayer(id);
  if (!p || p.status !== 'approved') throw notFound('player_not_found');
  const board = leaderboard();
  const entry = board.find((r) => r.id === p.id);

  const matches = all(`
    SELECT m.*, t.name AS tournament_name, t.size AS tournament_size, t.format AS tournament_format FROM matches m
    LEFT JOIN tournaments t ON t.id = m.tournament_id
    WHERE (m.player1_id = ? OR m.player2_id = ?) AND m.is_bye = 0 AND m.status IN ('completed','live')
    ORDER BY (m.status = 'live') DESC, m.played_at DESC, m.id DESC LIMIT 25`, p.id, p.id);
  const opponents = summariesById(matches.map((m) => (m.player1_id === p.id ? m.player2_id : m.player1_id)));

  // Rebuild the SR curve backwards from the current SR so it always ends on the real value.
  const history = all('SELECT delta, reason, created_at FROM sr_history WHERE player_id = ? ORDER BY id DESC LIMIT 60', p.id);
  let sr = p.sr;
  const curve = [{ sr, at: now() }];
  for (const h of history) {
    sr -= h.delta;
    curve.push({ sr, at: h.created_at });
  }
  curve.reverse();

  return {
    ...entry,
    joined_at: p.reviewed_at || p.created_at,
    curve,
    matches: matches.map((m) => {
      const mine = m.player1_id === p.id ? 1 : 2;
      const won = m.winner_id === p.id;
      return {
        id: m.id,
        status: m.status,
        opponent: opponents.get(mine === 1 ? m.player2_id : m.player1_id) ?? null,
        score_for: mine === 1 ? m.score1 : m.score2,
        score_against: mine === 1 ? m.score2 : m.score1,
        result: m.status === 'live' || !m.winner_id ? null : won ? 'W' : 'L',
        sr_delta: m.applied ? (won ? m.sr_gain : -m.sr_loss) : 0,
        tournament: m.tournament_id ? { id: m.tournament_id, name: m.tournament_name, round: m.round, size: m.tournament_size, format: m.tournament_format } : null,
        played_at: m.played_at,
      };
    }),
  };
}

/* ---------------------------------------------------------------- Discord data */

/**
 * Fresh Discord data for a user (from an interaction or the periodic sync).
 * Returns true when something visible changed.
 */
export function applyDiscordProfile(profile) {
  const p = getByDiscordId(profile.id);
  if (!p) return false;
  const next = {
    username: profile.username ?? p.username,
    display_name: profile.displayName ?? p.display_name,
    avatar_url: profile.avatarUrl ?? p.avatar_url,
    discord_created_at: profile.createdAt ?? p.discord_created_at,
    guild_joined_at: profile.joinedAt ?? p.guild_joined_at,
    in_guild: profile.inGuild === undefined ? p.in_guild : profile.inGuild ? 1 : 0,
  };
  const changedFields = Object.keys(next).filter((k) => next[k] !== p[k]);
  run('UPDATE players SET synced_at = ? WHERE id = ?', now(), p.id);
  if (!changedFields.length) return false;
  run(`UPDATE players SET username = ?, display_name = ?, avatar_url = ?, discord_created_at = ?, guild_joined_at = ?, in_guild = ?, updated_at = ? WHERE id = ?`,
    next.username, next.display_name, next.avatar_url, next.discord_created_at, next.guild_joined_at, next.in_guild, now(), p.id);
  changed('players', p.id);
  return true;
}

function normalizeRank(tier, division) {
  const t = oneOf(String(tier || '').toLowerCase(), RANK_TIERS, 'unranked');
  const d = t === 'unranked' || t === 'top500' ? null : toInt(division, { min: 1, max: 5, def: null });
  return { tier: t, division: d };
}

/**
 * Registration submitted from the Discord modal.
 * Returns { player, outcome } where outcome is one of:
 *  created | reapplied | updated_pending | updated_approved
 */
export function submitRegistration({ discord, battletag, rankTier, rankDivision, notes }) {
  const tag = toStr(battletag, 40).replace(/\s+/g, '');
  if (!BATTLETAG_RE.test(tag)) throw new HttpError(400, 'invalid_battletag');
  const rank = normalizeRank(rankTier, rankDivision);
  const cleanNotes = toStr(notes, 400, { multiline: true });

  return tx(() => {
    const taken = get('SELECT id, discord_id FROM players WHERE lower(battletag) = lower(?) AND status IN (\'pending\',\'approved\',\'banned\')', tag);
    if (taken && taken.discord_id !== String(discord.id)) throw new HttpError(409, 'battletag_taken');

    const existing = getByDiscordId(discord.id);
    const ts = now();

    if (existing?.status === 'banned') throw new HttpError(403, 'banned');

    if (existing?.status === 'approved') {
      run('UPDATE players SET battletag = ?, rank_tier = ?, rank_division = ?, notes = ?, updated_at = ? WHERE id = ?',
        tag, rank.tier, rank.division, cleanNotes, ts, existing.id);
      applyDiscordProfile(discord);
      changed('players', existing.id);
      audit(discord.username ?? discord.id, 'registration.update', `${playerName(existing)} (#${existing.id}): ${tag} · ${rank.tier}`);
      return { player: getPlayer(existing.id), outcome: 'updated_approved' };
    }

    if (!setting('registration_open')) throw new HttpError(403, 'registration_closed');

    if (existing) {
      const outcome = existing.status === 'pending' ? 'updated_pending' : 'reapplied';
      run(`UPDATE players SET battletag = ?, rank_tier = ?, rank_division = ?, notes = ?, status = 'pending',
             reject_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, applied_at = ?, updated_at = ? WHERE id = ?`,
        tag, rank.tier, rank.division, cleanNotes, ts, ts, existing.id);
      applyDiscordProfile(discord);
      changed('registrations', existing.id);
      audit(discord.username ?? discord.id, 'registration.submit', `${discord.displayName || discord.username} (#${existing.id}): ${tag} · ${rank.tier}${outcome === 'reapplied' ? ' · re-applied' : ''}`);
      return { player: getPlayer(existing.id), outcome };
    }

    const res = run(`INSERT INTO players (discord_id, username, display_name, avatar_url, battletag, rank_tier, rank_division, notes,
        sr, status, discord_created_at, guild_joined_at, in_guild, synced_at, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 1, ?, ?)`,
      String(discord.id), discord.username ?? '', discord.displayName ?? '', discord.avatarUrl ?? null, tag, rank.tier, rank.division,
      cleanNotes, setting('starting_sr'), discord.createdAt ?? null, discord.joinedAt ?? null, ts, ts);
    const id = Number(res.lastInsertRowid);
    changed('registrations', id);
    audit(discord.username ?? discord.id, 'registration.submit', `${discord.displayName || discord.username} (#${id}): ${tag} · ${rank.tier}`);
    return { player: getPlayer(id), outcome: 'created' };
  });
}

export function setReviewMessage(id, channelId, messageId) {
  run('UPDATE players SET review_channel_id = ?, review_message_id = ? WHERE id = ?', channelId, messageId, id);
}

/* ---------------------------------------------------------------- review */

function hasHistory(p) {
  return p.wins + p.losses > 0 || !!get('SELECT 1 AS x FROM sr_history WHERE player_id = ? LIMIT 1', p.id);
}

export function approvePlayer(id, reviewer) {
  const p = getPlayer(id);
  if (!p) throw notFound('player_not_found');
  if (p.status === 'approved') throw new HttpError(409, 'already_approved');
  const sr = hasHistory(p) ? p.sr : setting('starting_sr');
  run(`UPDATE players SET status = 'approved', sr = ?, reject_reason = NULL, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    sr, reviewer, now(), now(), id);
  audit(reviewer, 'player.approve', `${playerName(p)} (#${id})`);
  const updated = getPlayer(id);
  bus.emit('registration:reviewed', updated);
  changed('players', id);
  changed('registrations', id);
  return updated;
}

export function rejectPlayer(id, reviewer, reason = '') {
  const p = getPlayer(id);
  if (!p) throw notFound('player_not_found');
  if (p.status === 'rejected') throw new HttpError(409, 'already_rejected');
  run(`UPDATE players SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    toStr(reason, 400) || null, reviewer, now(), now(), id);
  audit(reviewer, 'player.reject', `${playerName(p)} (#${id})${reason ? `: ${reason}` : ''}`);
  const updated = getPlayer(id);
  bus.emit('registration:reviewed', updated);
  changed('players', id);
  changed('registrations', id);
  return updated;
}

/* ---------------------------------------------------------------- admin CRUD */

export function listPlayers({ status, q } = {}) {
  const where = [];
  const params = [];
  if (status && STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(display_name LIKE ? OR username LIKE ? OR battletag LIKE ? OR discord_id LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  const sql = `SELECT * FROM players ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, sr DESC, id DESC`;
  return all(sql, ...params).map(adminView);
}

function readPlayerFields(body, current = {}) {
  const fields = {};
  if ('display_name' in body) fields.display_name = toStr(body.display_name, 64);
  if ('username' in body) fields.username = toStr(body.username, 64);
  if ('battletag' in body) {
    const tag = toStr(body.battletag, 40).replace(/\s+/g, '');
    if (tag && !BATTLETAG_RE.test(tag)) throw new HttpError(400, 'invalid_battletag');
    fields.battletag = tag;
  }
  if ('rank_tier' in body || 'rank_division' in body) {
    const rank = normalizeRank(body.rank_tier ?? current.rank_tier, body.rank_division ?? current.rank_division);
    fields.rank_tier = rank.tier;
    fields.rank_division = rank.division;
  }
  if ('sr' in body) fields.sr = toInt(body.sr, { min: 0, max: 20000, def: current.sr ?? 0 });
  if ('wins' in body) fields.wins = toInt(body.wins, { min: 0, max: 100000, def: 0 });
  if ('losses' in body) fields.losses = toInt(body.losses, { min: 0, max: 100000, def: 0 });
  if ('status' in body) fields.status = oneOf(body.status, STATUSES, current.status ?? 'approved');
  if ('notes' in body) fields.notes = toStr(body.notes, 400, { multiline: true });
  if ('avatar_url' in body) {
    const url = toStr(body.avatar_url, 500);
    fields.avatar_url = /^https:\/\/[^\s"'()<>\\`]+$/i.test(url) ? url : null;
  }
  if ('discord_id' in body) {
    const did = toStr(body.discord_id, 22);
    if (did && !/^\d{15,22}$/.test(did)) throw new HttpError(400, 'invalid_discord_id');
    fields.discord_id = did || null;
  }
  return fields;
}

export function createPlayer(body, actor) {
  const fields = readPlayerFields({ status: 'approved', sr: setting('starting_sr'), ...body });
  if (!fields.display_name && !fields.battletag) throw new HttpError(400, 'name_required');
  if (fields.discord_id && getByDiscordId(fields.discord_id)) throw new HttpError(409, 'discord_id_taken');
  const cols = Object.keys(fields);
  const res = run(`INSERT INTO players (${cols.join(', ')}, reviewed_by, reviewed_at) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`,
    ...cols.map((c) => fields[c]), actor, now());
  const id = Number(res.lastInsertRowid);
  audit(actor, 'player.create', `${fields.display_name || fields.battletag} (#${id})`);
  changed('players', id);
  return adminView(getPlayer(id));
}

export function updatePlayer(id, body, actor) {
  return tx(() => {
    const p = getPlayer(id);
    if (!p) throw notFound('player_not_found');
    const fields = readPlayerFields(body, p);
    if (fields.discord_id && fields.discord_id !== p.discord_id && getByDiscordId(fields.discord_id)) {
      throw new HttpError(409, 'discord_id_taken');
    }
    const cols = Object.keys(fields).filter((c) => fields[c] !== p[c]);
    if (!cols.length) return adminView(p);

    if (fields.status === 'approved' && p.status !== 'approved' && !hasHistory(p) && !('sr' in body)) {
      fields.sr = setting('starting_sr');
      if (!cols.includes('sr')) cols.push('sr');
    }
    const reviewing = cols.includes('status') && p.status === 'pending' && ['approved', 'rejected'].includes(fields.status);
    if (cols.includes('status')) {
      cols.push('reviewed_by', 'reviewed_at');
      fields.reviewed_by = actor;
      fields.reviewed_at = now();
    }

    run(`UPDATE players SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
      ...cols.map((c) => fields[c]), now(), id);

    if (cols.includes('sr') && fields.sr !== p.sr && p.status === 'approved') {
      run('INSERT INTO sr_history (player_id, delta, sr_after, reason) VALUES (?, ?, ?, ?)', id, fields.sr - p.sr, fields.sr, 'admin');
    }
    audit(actor, 'player.update', `${playerName(p)} (#${id}): ${cols.filter((c) => !c.startsWith('reviewed')).join(', ')}`);
    const updated = getPlayer(id);
    if (reviewing) bus.emit('registration:reviewed', updated);
    changed('players', id);
    if (cols.includes('status')) changed('registrations', id);
    return adminView(updated);
  });
}

export function deletePlayer(id, actor) {
  const p = getPlayer(id);
  if (!p) throw notFound('player_not_found');
  tx(() => {
    run('UPDATE tournaments SET champion_id = NULL WHERE champion_id = ?', id);
    run('DELETE FROM players WHERE id = ?', id);
  });
  audit(actor, 'player.delete', `${playerName(p)} (#${id})`);
  bus.emit('player:deleted', p);
  changed('players', id);
  changed('tournaments');
  return { ok: true };
}

export function playerCounts() {
  const rows = all('SELECT status, COUNT(*) AS n FROM players GROUP BY status');
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/* ---------------------------------------------------------------- SR tools (admin) */

/** Add or remove SR by hand, with a reason that shows in the player's history. */
export function adjustSr(id, body, actor) {
  const delta = toInt(body.delta, { min: -20000, max: 20000, def: 0 });
  if (!delta) throw new HttpError(400, 'invalid_number');
  const reason = toStr(body.reason, 80) || 'admin';
  return tx(() => {
    const p = getPlayer(id);
    if (!p) throw notFound('player_not_found');
    const sr = Math.max(0, p.sr + delta);
    run('UPDATE players SET sr = ?, updated_at = ? WHERE id = ?', sr, now(), id);
    run('INSERT INTO sr_history (player_id, delta, sr_after, reason) VALUES (?, ?, ?, ?)', id, sr - p.sr, sr, reason);
    audit(actor, 'player.sr_adjust', `${playerName(p)} (#${id}): ${sr - p.sr > 0 ? '+' : ''}${sr - p.sr} (${reason})`);
    changed('players', id);
    return adminView(getPlayer(id));
  });
}

/** Set SR back to the starting value and wins/losses to zero (match results are kept). */
export function resetStats(id, actor) {
  return tx(() => {
    const p = getPlayer(id);
    if (!p) throw notFound('player_not_found');
    const sr = setting('starting_sr');
    run('UPDATE players SET sr = ?, wins = 0, losses = 0, updated_at = ? WHERE id = ?', sr, now(), id);
    if (sr !== p.sr) run('INSERT INTO sr_history (player_id, delta, sr_after, reason) VALUES (?, ?, ?, ?)', id, sr - p.sr, sr, 'reset');
    audit(actor, 'player.reset_stats', `${playerName(p)} (#${id})`);
    changed('players', id);
    return adminView(getPlayer(id));
  });
}

export function srHistory(id, limit = 40) {
  return all(`SELECT h.id, h.delta, h.sr_after, h.reason, h.created_at, h.match_id,
      m.score1, m.score2, m.player1_id, m.player2_id
    FROM sr_history h LEFT JOIN matches m ON m.id = h.match_id
    WHERE h.player_id = ? ORDER BY h.id DESC LIMIT ?`, id, limit);
}

/** Put every approved player back on the starting SR (wins/losses and match history are kept). */
export function resetAllSr(actor) {
  const sr = setting('starting_sr');
  const n = tx(() => {
    const players = all("SELECT id, sr FROM players WHERE status = 'approved' AND sr != ?", sr);
    for (const p of players) {
      run('UPDATE players SET sr = ?, updated_at = ? WHERE id = ?', sr, now(), p.id);
      run('INSERT INTO sr_history (player_id, delta, sr_after, reason) VALUES (?, ?, ?, ?)', p.id, sr - p.sr, sr, 'season reset');
    }
    return players.length;
  });
  audit(actor, 'players.reset_all_sr', `${n} players → ${sr}`);
  changed('players');
  return { updated: n, sr };
}
