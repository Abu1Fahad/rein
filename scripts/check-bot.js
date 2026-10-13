// Builds every Discord message / modal the bot can send and runs discord.js validation on it.
// No token needed. Usage: npm run check:bot
import {
  panelMessage, registrationModal, rejectReasonModal, reviewCard, profileUpdatedCard, decisionDm,
  statusCard, profileCard, leaderboardCard, resultCard, notice,
} from '../server/bot/ui.js';

const player = {
  id: 7, discord_id: '123456789012345678', username: 'rein_main', display_name: 'Balderich', avatar_url: null,
  battletag: 'Balderich#1234', rank_tier: 'master', rank_division: 2, notes: 'Peak GM 3\nEU evenings', sr: 2500,
  wins: 3, losses: 1, status: 'pending', created_at: new Date().toISOString(), applied_at: new Date().toISOString(),
  discord_created_at: '2020-01-01T00:00:00.000Z', guild_joined_at: '2024-05-01T00:00:00.000Z',
  reviewed_by: 'discord:111111111111111111:admin', reviewed_at: new Date().toISOString(), reject_reason: 'Wrong BattleTag',
};
const entry = { position: 1, id: 7, name: 'Balderich', avatar: null, battletag: 'Balderich#1234', rank_tier: 'master', rank_division: 2, sr: 2550, wins: 5, losses: 1, winrate: 83.3, form: ['W', 'W', 'L'] };
const match = { winner_id: 1, player1_id: 1, player2_id: 2, score1: 3, score2: 1, applied: true, sr_gain: 19, sr_loss: 19, tournament_name: 'Crusader Cup', round: 2, tournament_size: 8 };

const payloads = {
  panel: panelMessage(),
  reviewPending: reviewCard(player),
  reviewApproved: reviewCard({ ...player, status: 'approved' }),
  reviewRejected: reviewCard({ ...player, status: 'rejected' }),
  profileUpdated: profileUpdatedCard(player),
  dmApproved: decisionDm({ ...player, status: 'approved' }),
  dmRejected: decisionDm({ ...player, status: 'rejected' }),
  statusNone: statusCard(null),
  statusPending: statusCard(player),
  profile: profileCard(entry),
  leaderboard: leaderboardCard([entry, { ...entry, position: 2, name: 'Wilhelm' }]),
  leaderboardEmpty: leaderboardCard([]),
  result: resultCard(match, { name: 'A', avatar: null }, { name: 'B', avatar: null }),
  notice: notice({ title: 'Hi', body: 'Body' }),
};

let failed = 0;
for (const [name, p] of Object.entries(payloads)) {
  try {
    const json = p.components.map((c) => (typeof c.toJSON === 'function' ? c.toJSON() : c));
    if (!json.length) throw new Error('no components');
    console.log(`✔ ${name} (${JSON.stringify(json).length} bytes)`);
  } catch (err) {
    failed++;
    console.error(`✘ ${name}:`, err.message);
  }
}
for (const [name, build] of Object.entries({
  registrationModal: () => registrationModal(null),
  registrationModalPrefilled: () => registrationModal(player),
  rejectReasonModal: () => rejectReasonModal(7),
})) {
  try {
    const json = build().toJSON();
    if (json.components.length > 5) throw new Error('modal has more than 5 components');
    console.log(`✔ ${name} (${json.components.length} components)`);
  } catch (err) {
    failed++;
    console.error(`✘ ${name}:`, err.message);
  }
}
process.exit(failed ? 1 : 0);
