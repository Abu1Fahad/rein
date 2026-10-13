import { HttpError } from '../http.js';

/**
 * SR rank table. Each rank covers SR from `min` up to the next rank's `min` - 1.
 * `win` / `loss` are the rank's base points for one match. A finished match changes SR by:
 *
 *   winner  +  win(winner's rank)  × dominance × rank gap
 *   loser   −  loss(loser's rank)  × dominance × rank gap
 *
 *   dominance = 1 + (rounds won − rounds lost) / (rounds played) × weight     (10-9 ≈ 1.05, 10-0 = 2)
 *   rank gap  = factor ^ (loser's rank − winner's rank)   e.g. Diamond beats Champion → 1.4³ ≈ 2.7×,
 *                                                             Champion beats Diamond → 1.4⁻³ ≈ 0.36×
 * The winner always gains at least 1 and the loser never gains.
 */
export const DEFAULT_RANKS = [
  { name: 'Bronze', min: 0, win: 30, loss: 15, color: '#d9925e', desc: 'Where everyone starts learning the matchup. Wins count big, losses barely hurt.' },
  { name: 'Silver', min: 200, win: 28, loss: 18, color: '#d8dfea', desc: 'Getting the basics down. Gains are still generous.' },
  { name: 'Gold', min: 400, win: 26, loss: 21, color: '#f7c64a', desc: 'Solid fundamentals and consistent rounds.' },
  { name: 'Platinum', min: 700, win: 24, loss: 24, color: '#6fd3e8', desc: 'Even ground: a win and a loss are worth the same.' },
  { name: 'Diamond', min: 1000, win: 22, loss: 26, color: '#7f9cff', desc: 'Strong players. Dropping matches starts to cost more.' },
  { name: 'Master', min: 1300, win: 21, loss: 29, color: '#4bd3a4', desc: 'High-level tier requiring strong round win ratios and win streak momentum.' },
  { name: 'Grandmaster', min: 1600, win: 19, loss: 31, color: '#b48cff', desc: 'Elite. Every loss hurts, especially against lower ranks.' },
  { name: 'Champion', min: 2000, win: 17, loss: 33, color: '#ff7a3c', desc: 'The very top. Losing to a lower rank costs a lot.' },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** Validate and normalise a rank table coming from the admin panel (array or JSON string). */
export function normalizeRanks(input) {
  let list = input;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      throw new HttpError(400, 'invalid_rank_table');
    }
  }
  if (!Array.isArray(list) || !list.length) throw new HttpError(400, 'invalid_rank_table');
  if (list.length > 30) throw new HttpError(400, 'too_many_ranks');
  const int = (v, min, max, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const out = list.map((r, i) => ({
    name: String(r?.name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) || `Rank ${i + 1}`,
    min: int(r?.min, 0, 100000, 0),
    win: int(r?.win, 0, 1000, 0),
    loss: int(r?.loss, 0, 1000, 0),
    color: HEX.test(String(r?.color ?? '')) ? String(r.color).toLowerCase() : '#9aa3b5',
    desc: String(r?.desc ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').trim().slice(0, 240),
  }));
  out.sort((a, b) => a.min - b.min);
  out[0].min = 0;
  for (let i = 1; i < out.length; i++) {
    if (out[i].min === out[i - 1].min) throw new HttpError(400, 'duplicate_rank_min', { min: out[i].min });
  }
  return out;
}

let parsedFrom = null;
let parsed = DEFAULT_RANKS;

/** The table with computed upper bounds. `raw` is the stored setting (JSON string). */
export function rankTable(raw) {
  if (raw !== parsedFrom) {
    parsedFrom = raw;
    try {
      parsed = normalizeRanks(raw);
    } catch {
      parsed = DEFAULT_RANKS;
    }
  }
  return parsed.map((r, i) => ({ ...r, index: i, max: i + 1 < parsed.length ? parsed[i + 1].min - 1 : null }));
}

export function rankOf(table, sr) {
  let found = table[0];
  for (const r of table) if (sr >= r.min) found = r;
  return found;
}

/** Bigger score margin → bigger swing. 0-0 (no score entered) counts as an average match. */
export function dominanceOf(roundsWon, roundsLost, weightPct = 100) {
  const total = roundsWon + roundsLost;
  if (!total) return 1;
  return 1 + (Math.max(0, roundsWon - roundsLost) / total) * (weightPct / 100);
}

/** > 1 when the lower rank wins (upset), < 1 when the higher rank wins. */
export function gapOf(winnerRank, loserRank, factorPct = 140) {
  return (factorPct / 100) ** (loserRank.index - winnerRank.index);
}

/** Points for both players of one match. */
export function matchPoints({ winnerRank, loserRank, winnerRounds = 0, loserRounds = 0, dominancePct = 100, gapPct = 140 }) {
  const dominance = dominanceOf(winnerRounds, loserRounds, dominancePct);
  const gap = gapOf(winnerRank, loserRank, gapPct);
  const gain = Math.max(1, Math.round(winnerRank.win * dominance * gap));
  const loss = Math.max(0, Math.round(loserRank.loss * dominance * gap));
  return {
    gain,
    loss,
    dominance: Math.round(dominance * 100) / 100,
    gap: Math.round(gap * 100) / 100,
    rank_gap: loserRank.index - winnerRank.index,
  };
}
