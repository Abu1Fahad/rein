// Fills the database with demo players, a tournament and showmatches so the site can be explored.
// Usage: npm run seed            (only if the database has no players)
//        npm run seed -- --reset (wipes players, tournaments and matches first)
//        npm run seed -- --wipe  (wipes them and adds nothing — use before going live)
import { db, get, run } from '../server/db.js';
import { createPlayer, submitRegistration } from '../server/services/players.js';
import {
  createTournament, setMatchResult, createShowmatch, updateTournament, tournamentDetail,
} from '../server/services/competition.js';

const reset = process.argv.includes('--reset');
const wipe = process.argv.includes('--wipe');
if (reset || wipe) {
  db.exec('DELETE FROM sr_history; DELETE FROM matches; DELETE FROM tournament_entries; DELETE FROM tournaments; DELETE FROM players; DELETE FROM audit_log;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('players','matches','tournaments','sr_history','audit_log')");
  if (wipe) {
    console.log('All players, tournaments and matches deleted (settings kept).');
    process.exit(0);
  }
} else if (get('SELECT COUNT(*) AS n FROM players').n > 0) {
  console.log('Database already has players — run `npm run seed -- --reset` to replace them with demo data.');
  process.exit(0);
}

const names = [
  ['Balderich', 'master', 2], ['ShatterKing', 'grandmaster', 3], ['HammerDown', 'diamond', 1], ['Crusader', 'champion', 4],
  ['StuttgartLion', 'master', 4], ['FireStrike', 'diamond', 3], ['Pinmaster', 'grandmaster', 1], ['IronWill', 'platinum', 2],
  ['BarrierBoi', 'diamond', 5], ['Wilhelm', 'top500', null], ['Earthquake', 'master', 1], ['Honor', 'platinum', 4],
  ['ShieldUp', 'gold', 1], ['Brigitte', 'diamond', 2], ['Charger', 'master', 3], ['أبو_المطرقة', 'grandmaster', 2],
  ['محارب', 'diamond', 4], ['Knight', 'gold', 3],
];

// Spread the demo players over the rank table so every tier shows up.
const SEED_SR = { gold: 450, platinum: 780, diamond: 1080, master: 1380, grandmaster: 1680, champion: 2050, top500: 2150 };
const players = names.map(([name, tier, div], i) => createPlayer({
  display_name: name,
  username: name.toLowerCase(),
  battletag: `${/^[A-Za-z]+$/.test(name) ? name : `Rein${i}`}#${1000 + i * 137}`,
  rank_tier: tier,
  rank_division: div,
  sr: (SEED_SR[tier] ?? 500) + ((i * 37) % 160),
}, 'seed'));

const rand = (n) => Math.floor(Math.random() * n);
const pickWinner = (m) => {
  const a = players.find((p) => p.id === m.player1_id);
  const b = players.find((p) => p.id === m.player2_id);
  const strength = (p) => ['gold', 'platinum', 'diamond', 'master', 'grandmaster', 'champion', 'top500'].indexOf(p.rank_tier) + Math.random() * 3;
  return strength(a) >= strength(b) ? a.id : b.id;
};

// Showmatches spread over the last weeks
for (let i = 0; i < 30; i++) {
  const a = players[rand(players.length)];
  let b = players[rand(players.length)];
  while (b.id === a.id) b = players[rand(players.length)];
  const fake = { player1_id: a.id, player2_id: b.id };
  const winner = pickWinner(fake);
  const loserScore = rand(3);
  createShowmatch({
    player1_id: a.id,
    player2_id: b.id,
    winner_id: winner,
    score1: winner === a.id ? 3 : loserScore,
    score2: winner === b.id ? 3 : loserScore,
    played_at: new Date(Date.now() - (30 - i) * 18 * 3600_000).toISOString(),
  }, 'seed');
}

// A finished 8-player cup
const cup = createTournament({
  name: 'Crusader Cup #1', description: 'أول بطولة راينهارت 1v1 — Best of 3, single elimination.', size: 8, best_of: 3,
  starts_at: new Date(Date.now() - 9 * 86400_000).toISOString(), player_ids: players.slice(0, 8).map((p) => p.id), seed_mode: 'sr',
}, 'seed');
playOut(cup.tournament.id, 99);

// A live 16-slot tournament with 13 players (byes) and the first round partly played
const live = createTournament({
  name: 'Earthshatter Open', description: 'Season 1 main event · Best of 5 · the champion gets the Earthshatter title.', size: 16, best_of: 5,
  starts_at: new Date(Date.now() - 3600_000).toISOString(), player_ids: players.slice(0, 13).map((p) => p.id), seed_mode: 'sr',
}, 'seed');
updateTournament(live.tournament.id, { status: 'live' }, 'seed');
playOut(live.tournament.id, 1, 3);
const nextLive = tournamentDetail(live.tournament.id).matches.find((m) => m.status === 'pending' && m.player1_id && m.player2_id);
if (nextLive) setMatchResult(nextLive.id, { status: 'live', score1: 1, score2: 1 }, 'seed');

// A live double-elimination (lower bracket) event, part-way through
const de = createTournament({
  name: 'Barrier Field Double', description: 'Double elimination — lose twice and you are out. خروج مزدوج: خسارتين وتطلع.', size: 8, best_of: 3, format: 'double',
  starts_at: new Date(Date.now() - 2 * 3600_000).toISOString(), player_ids: players.slice(4, 12).map((p) => p.id), seed_mode: 'sr',
}, 'seed');
updateTournament(de.tournament.id, { status: 'live' }, 'seed');
for (let n = 0; n < 8; n++) {
  const m = tournamentDetail(de.tournament.id).matches.find((x) => x.player1_id && x.player2_id && !x.winner_id);
  if (!m) break;
  const winner = pickWinner(m);
  const loserScore = rand(2);
  setMatchResult(m.id, { winner_id: winner, score1: winner === m.player1_id ? 2 : loserScore, score2: winner === m.player2_id ? 2 : loserScore }, 'seed');
}

// An upcoming 32-slot event with nobody seeded yet
createTournament({ name: 'Rocket Hammer League', description: 'Sign-ups open on Discord.', size: 32, best_of: 3, starts_at: new Date(Date.now() + 6 * 86400_000).toISOString() }, 'seed');

/** Pending registrations as if they came from the Discord modal — try ACCEPT / REJECT in the admin panel. */
export function seedPending() {
  const demo = [
    ['900000000000000001', 'hammer_time', 'HammerTime', 'HammerTime#4821', 'diamond', 2, 'Peak Master 4 · evenings GMT+3'],
    ['900000000000000002', 'rein_sa', 'راينهارت_السعودي', 'ReinSA#2290', 'master', 5, 'متواجد بعد العشاء'],
    ['900000000000000003', 'shieldwall', 'ShieldWall', 'ShieldWall#7314', 'platinum', 1, ''],
  ];
  for (const [id, username, displayName, battletag, tier, div, notes] of demo) {
    try {
      submitRegistration({
        discord: { id, username, displayName, avatarUrl: null, createdAt: '2019-06-01T12:00:00.000Z', joinedAt: new Date(Date.now() - 86400_000 * 40).toISOString() },
        battletag, rankTier: tier, rankDivision: div, notes,
      });
    } catch (err) {
      console.warn(`skip ${battletag}: ${err.code ?? err.message}`);
    }
  }
}

function playOut(tid, maxRound, limit = Infinity) {
  let played = 0;
  for (let round = 1; round <= maxRound; round++) {
    const matches = tournamentDetail(tid).matches.filter((m) => m.round === round && m.player1_id && m.player2_id && !m.winner_id);
    if (!matches.length) break;
    for (const m of matches) {
      if (played >= limit) return;
      const winner = pickWinner(m);
      const loserScore = rand(2);
      setMatchResult(m.id, { winner_id: winner, score1: winner === m.player1_id ? 2 : loserScore, score2: winner === m.player2_id ? 2 : loserScore }, 'seed');
      played++;
    }
  }
}

seedPending();

run("INSERT INTO audit_log (actor, action, details) VALUES ('seed', 'demo.seed', 'Demo data loaded')");
console.log(`Seeded ${players.length} players, 4 tournaments, 30 showmatches.`);
