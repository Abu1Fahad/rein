import express from 'express';
import { h, toId, toInt, toStr, oneOf, notFound, HttpError } from '../http.js';
import { audit } from '../services/audit.js';
import { findDemoData, removeDemoData } from '../services/demo.js';
import { requireAdmin, needRole } from '../auth.js';
import { getSettings, updateSettings, resetSettings, DEFAULTS, ranks } from '../services/settings.js';
import { DEFAULT_RANKS } from '../services/ranks.js';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin, ROLES } from '../services/admins.js';
import { auditLog } from '../services/audit.js';
import {
  listPlayers, createPlayer, updatePlayer, deletePlayer, approvePlayer, rejectPlayer,
  getPlayer, adminView, playerCounts, STATUSES, adjustSr, resetStats, srHistory, resetAllSr,
} from '../services/players.js';
import {
  srPreview, setMatchResult, clearMatch, setMatchPlayers, createShowmatch, deleteMatch, listMatches,
  createTournament, updateTournament, deleteTournament, resizeTournament, seedTournament, resolveByes,
  resetTournament, tournamentDetail, listTournaments, competitionStats,
} from '../services/competition.js';
import { bot } from '../bot/index.js';

export const adminRouter = express.Router();
adminRouter.use(requireAdmin);

// Who did it — shown in the activity log.
const actorOf = (req) => req.admin?.username ?? 'web-admin';
const ADMIN = needRole('admin');
const OWNER = needRole('owner');
const idParam = (req) => {
  const id = toId(req.params.id);
  if (!id) throw notFound();
  return id;
};

adminRouter.get('/overview', h(() => ({
  players: playerCounts(),
  competition: competitionStats(),
  bot: bot.status(),
  recent: auditLog(12),
})));

/* players */
adminRouter.get('/players', h((req) => ({
  players: listPlayers({ status: oneOf(req.query.status, STATUSES, null), q: toStr(req.query.q, 60) }),
})));
adminRouter.post('/players/reset-all-sr', ADMIN, h((req) => resetAllSr(actorOf(req))));
adminRouter.post('/players', ADMIN, h((req) => createPlayer(req.body ?? {}, actorOf(req))));
adminRouter.get('/players/:id', h((req) => {
  const p = getPlayer(idParam(req));
  if (!p) throw notFound('player_not_found');
  return adminView(p);
}));
adminRouter.patch('/players/:id', ADMIN, h((req) => updatePlayer(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.delete('/players/:id', ADMIN, h((req) => deletePlayer(idParam(req), actorOf(req))));
adminRouter.post('/players/:id/approve', h((req) => adminView(approvePlayer(idParam(req), actorOf(req)))));
adminRouter.post('/players/:id/reject', h((req) => adminView(rejectPlayer(idParam(req), actorOf(req), toStr(req.body?.reason, 400)))));
adminRouter.get('/players/:id/history', h((req) => ({ history: srHistory(idParam(req), toInt(req.query.limit, { min: 1, max: 500, def: 40 })) })));
adminRouter.post('/players/:id/adjust', ADMIN, h((req) => adjustSr(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.post('/players/:id/reset-stats', ADMIN, h((req) => resetStats(idParam(req), actorOf(req))));
adminRouter.post('/players/:id/sync', h(async (req) => {
  const p = getPlayer(idParam(req));
  if (!p) throw notFound('player_not_found');
  if (!p.discord_id) throw new HttpError(400, 'no_discord_id');
  await bot.syncOne(p.discord_id);
  return adminView(getPlayer(p.id));
}));

/* matches */
adminRouter.get('/sr-preview', h((req) => srPreview(toId(req.query.winner), toId(req.query.loser), {
  winnerRounds: toInt(req.query.wr, { min: 0, max: 99, def: 0 }),
  loserRounds: toInt(req.query.lr, { min: 0, max: 99, def: 0 }),
})));
adminRouter.get('/matches', h((req) => ({
  matches: listMatches({
    type: oneOf(req.query.type, ['all', 'live', 'tournament', 'showmatch'], 'all'),
    tournamentId: toId(req.query.tournament),
    limit: toInt(req.query.limit, { min: 1, max: 500, def: 200 }),
  }),
})));
adminRouter.post('/matches', h((req) => createShowmatch(req.body ?? {}, actorOf(req))));
adminRouter.put('/matches/:id/result', h((req) => setMatchResult(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.put('/matches/:id/players', h((req) => setMatchPlayers(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.post('/matches/:id/clear', h((req) => clearMatch(idParam(req), actorOf(req))));
adminRouter.delete('/matches/:id', ADMIN, h((req) => deleteMatch(idParam(req), actorOf(req))));

/* tournaments */
adminRouter.get('/tournaments', h(() => ({ tournaments: listTournaments() })));
adminRouter.post('/tournaments', ADMIN, h((req) => createTournament(req.body ?? {}, actorOf(req))));
adminRouter.get('/tournaments/:id', h((req) => tournamentDetail(idParam(req))));
adminRouter.patch('/tournaments/:id', ADMIN, h((req) => updateTournament(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.delete('/tournaments/:id', ADMIN, h((req) => deleteTournament(idParam(req), actorOf(req))));
adminRouter.post('/tournaments/:id/resize', ADMIN, h((req) => resizeTournament(idParam(req), req.body?.size, actorOf(req), req.body?.format)));
adminRouter.post('/tournaments/:id/seed', h((req) => seedTournament(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.post('/tournaments/:id/byes', h((req) => resolveByes(idParam(req), actorOf(req))));
adminRouter.post('/tournaments/:id/reset', ADMIN, h((req) => resetTournament(idParam(req), actorOf(req))));

/* settings */
adminRouter.get('/settings', h(() => ({ settings: getSettings(), defaults: DEFAULTS, ranks: ranks(), default_ranks: DEFAULT_RANKS })));
adminRouter.put('/settings', ADMIN, h((req) => {
  const res = updateSettings(req.body ?? {});
  if (res.updated.length) auditSettings(req, res.updated);
  return { ...res, ranks: ranks() };
}));
adminRouter.post('/settings/reset', ADMIN, h((req) => {
  auditSettings(req, ['all (restore defaults)']);
  return { settings: resetSettings(), ranks: ranks() };
}));

/* demo data */
adminRouter.get('/demo', ADMIN, h(() => {
  const d = findDemoData();
  return { players: d.players.length, tournaments: d.tournaments.length };
}));
adminRouter.post('/demo/remove', ADMIN, h((req) => removeDemoData(actorOf(req))));

/* admin accounts (owner only) */
adminRouter.get('/admins', OWNER, h(() => ({ admins: listAdmins(), roles: ROLES })));
adminRouter.post('/admins', OWNER, h((req) => createAdmin(req.body ?? {}, actorOf(req))));
adminRouter.patch('/admins/:id', OWNER, h((req) => updateAdmin(idParam(req), req.body ?? {}, actorOf(req))));
adminRouter.delete('/admins/:id', OWNER, h((req) => deleteAdmin(idParam(req), actorOf(req))));

/* discord */
adminRouter.get('/discord', h(() => bot.status()));
adminRouter.post('/discord/panel', ADMIN, h(async () => bot.postPanel()));
adminRouter.post('/discord/sync', ADMIN, h(async () => bot.syncAll()));
adminRouter.post('/discord/connect', ADMIN, h(async (req) => {
  const res = await bot.connect({ token: req.body?.token, membersIntent: req.body?.members_intent });
  audit(actorOf(req), 'discord.connect', res.online ? `online as ${res.user?.tag}` : res.error || 'not connected');
  return res;
}));
adminRouter.post('/discord/logs', ADMIN, h(async () => bot.setupLogs()));
adminRouter.post('/discord/restart', ADMIN, h(async () => bot.restart()));
adminRouter.post('/discord/commands', ADMIN, h(async () => bot.registerCommands()));

adminRouter.get('/audit', h((req) => ({ log: auditLog(toInt(req.query.limit, { min: 1, max: 1000, def: 200 })) })));

function auditSettings(req, keys) {
  const s = getSettings();
  const show = (k) => {
    if (!Object.hasOwn(s, k)) return k;
    if (k === 'rank_table') return 'rank table';
    if (k === 'text_overrides') return 'site texts';
    const v = String(s[k]);
    return `${k} = ${v.length > 60 ? `${v.slice(0, 60)}…` : v}`;
  };
  audit(actorOf(req), 'settings.update', keys.map(show).join(' · '));
}
