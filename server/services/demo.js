import path from 'node:path';
import fs from 'node:fs';
import { db, all, get, run } from '../db.js';
import { config } from '../config.js';
import { changed } from '../events.js';
import { audit, quietly } from './audit.js';
import { deletePlayer } from './players.js';
import { deleteTournament, deleteMatch, clearMatch } from './competition.js';

/*
 * Demo data = what `npm run seed` creates: players added by "seed", the three fake Discord
 * registrations (IDs 90000000000000000x) and the demo tournaments. Real players who registered
 * through Discord and anything the admins created themselves are never touched.
 */
const DEMO_DISCORD_IDS = ['900000000000000001', '900000000000000002', '900000000000000003'];
const DEMO_TOURNAMENTS = ['Crusader Cup #1', 'Earthshatter Open', 'Rocket Hammer League', 'Barrier Field Double'];

export function findDemoData() {
  const players = all(
    `SELECT id FROM players WHERE reviewed_by = 'seed' OR discord_id IN (${DEMO_DISCORD_IDS.map(() => '?').join(',')})`,
    ...DEMO_DISCORD_IDS,
  ).map((r) => r.id);
  const tournaments = new Set(all(`SELECT id FROM tournaments WHERE name IN (${DEMO_TOURNAMENTS.map(() => '?').join(',')})`, ...DEMO_TOURNAMENTS).map((r) => r.id));
  for (const r of all("SELECT details FROM audit_log WHERE actor = 'seed' AND action = 'tournament.create'")) {
    const id = Number(/\(#(\d+)/.exec(r.details)?.[1]);
    if (id && get('SELECT 1 AS x FROM tournaments WHERE id = ?', id)) tournaments.add(id);
  }
  return { players, tournaments: [...tournaments] };
}

function backup() {
  const dir = config.dataDir;
  const file = path.join(dir, `backup-before-demo-removal-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  fs.mkdirSync(dir, { recursive: true });
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

/** Delete the demo data (points from matches against demo players are given back first). */
export function removeDemoData(actor = 'system') {
  const { players, tournaments } = findDemoData();
  if (!players.length && !tournaments.length) return { players: 0, tournaments: 0, matches: 0, backup: null };
  const backupFile = backup();
  let matches = 0;
  quietly(() => {
    for (const id of tournaments) deleteTournament(id, actor);
    if (players.length) {
      const marks = players.map(() => '?').join(',');
      const rows = all(`SELECT id, tournament_id FROM matches WHERE player1_id IN (${marks}) OR player2_id IN (${marks})`, ...players, ...players);
      for (const m of rows) {
        if (m.tournament_id) clearMatch(m.id, actor);
        else deleteMatch(m.id, actor);
        matches++;
      }
      for (const id of players) deletePlayer(id, actor);
    }
    run("DELETE FROM audit_log WHERE actor = 'seed'");
  });
  audit(actor, 'demo.remove', `${players.length} demo players, ${tournaments.length} demo tournaments and ${matches} demo matches removed (backup: ${path.basename(backupFile)})`);
  changed('players');
  changed('tournaments');
  changed('matches');
  return { players: players.length, tournaments: tournaments.length, matches, backup: path.basename(backupFile) };
}

/** One-time clean-up on the first start after this update. */
export function removeDemoDataOnce() {
  if (get("SELECT value FROM settings WHERE key = '_demo_removed_v1'")) return null;
  let res = null;
  try {
    res = removeDemoData('system');
    if (res.players || res.tournaments) console.log(`[web] removed demo data: ${res.players} players, ${res.tournaments} tournaments, ${res.matches} matches — backup in data/${res.backup}`);
  } catch (err) {
    console.error('[web] demo clean-up failed (nothing was lost, the data is unchanged where it failed):', err.message);
  }
  run("INSERT INTO settings (key, value) VALUES ('_demo_removed_v1', '1') ON CONFLICT(key) DO NOTHING");
  return res;
}
