import express from 'express';
import { h, toId, toInt, oneOf, notFound } from '../http.js';
import { adminSession, login, logout } from '../auth.js';
import { sseHandler } from '../events.js';
import { publicSettings, ranks } from '../services/settings.js';
import { leaderboard, profile, playerCounts } from '../services/players.js';
import { listTournaments, tournamentDetail, listMatches, competitionStats } from '../services/competition.js';
import { bot } from '../bot/index.js';
import { adminPath } from '../security.js';

export const publicRouter = express.Router();

publicRouter.get('/meta', h((req) => {
  const counts = playerCounts();
  const session = adminSession(req);
  return {
    settings: publicSettings(),
    ranks: ranks(),
    stats: { players: counts.approved, pending: counts.pending, ...competitionStats() },
    discord: bot.publicInfo(),
    admin: !!session,
    role: session?.role ?? null,
    username: session?.username ?? null,
    // Only signed-in admins learn the hidden panel address (for the Admin tab).
    admin_path: session ? adminPath() : null,
    server_time: new Date().toISOString(),
  };
}));

publicRouter.get('/leaderboard', h(() => ({ players: leaderboard() })));

publicRouter.get('/players/:id', h((req) => {
  const id = toId(req.params.id);
  if (!id) throw notFound('player_not_found');
  return profile(id);
}));

publicRouter.get('/tournaments', h(() => ({ tournaments: listTournaments() })));

publicRouter.get('/tournaments/:id', h((req) => {
  const id = toId(req.params.id);
  if (!id) throw notFound('tournament_not_found');
  return tournamentDetail(id);
}));

publicRouter.get('/matches', h((req) => ({
  matches: listMatches({
    type: oneOf(req.query.type, ['all', 'live', 'tournament', 'showmatch'], 'all'),
    limit: toInt(req.query.limit, { min: 1, max: 200, def: 60 }),
  }),
})));

publicRouter.get('/events', sseHandler);

publicRouter.post('/auth/login', h(login));
publicRouter.post('/auth/logout', h(logout));
publicRouter.get('/auth/me', h((req) => {
  const session = adminSession(req);
  return { admin: !!session, role: session?.role ?? null, username: session?.username ?? null };
}));
publicRouter.get('/ranks', h(() => {
  const ps = publicSettings();
  return { ranks: ranks(), mode: ps.points_mode, dominance_pct: ps.dominance_pct, gap_pct: ps.gap_pct };
}));
