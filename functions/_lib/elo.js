/* REIN 1V1 Esports - Server-Side Authoritative ELO & Tier Engine */

export function getRankFromElo(elo) {
  const numericElo = typeof elo === 'number' ? elo : parseInt(elo, 10) || 500;
  if (numericElo >= 2000) return { tier: 'Champion', full: 'Champion', class: 'tier-champ', min: 2000, max: '∞' };
  if (numericElo >= 1600) return { tier: 'Grandmaster', full: 'Grandmaster', class: 'tier-gm', min: 1600, max: 1999 };
  if (numericElo >= 1300) return { tier: 'Master', full: 'Master', class: 'tier-master', min: 1300, max: 1599 };
  if (numericElo >= 1000) return { tier: 'Diamond', full: 'Diamond', class: 'tier-diamond', min: 1000, max: 1299 };
  if (numericElo >= 700) return { tier: 'Platinum', full: 'Platinum', class: 'tier-plat', min: 700, max: 999 };
  if (numericElo >= 400) return { tier: 'Gold', full: 'Gold', class: 'tier-gold', min: 400, max: 699 };
  if (numericElo >= 200) return { tier: 'Silver', full: 'Silver', class: 'tier-silver', min: 200, max: 399 };
  return { tier: 'Bronze', full: 'Bronze', class: 'tier-bronze', min: 0, max: 199 };
}

export function getWinProbability(eloA, eloB) {
  const ratingA = typeof eloA === 'number' ? eloA : parseInt(eloA, 10) || 500;
  const ratingB = typeof eloB === 'number' ? eloB : parseInt(eloB, 10) || 500;
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Authoritative Round-Based ELO Calculation (+15 Win / -10 Loss scaled with opponent rating)
 */
export function calculateRoundBasedEloChange(eloA, eloB, roundsWonA, roundsLostA) {
  const isWinnerA = roundsWonA > roundsLostA;
  const expectedA = getWinProbability(eloA, eloB);
  const rawA = (roundsWonA * 15) - (roundsLostA * 10);
  
  if (isWinnerA) {
    const baseGain = rawA / 4;
    return Math.max(1, Math.round(baseGain * (2 * (1 - expectedA))));
  } else {
    const roundDeficit = roundsLostA - roundsWonA;
    const baseLoss = Math.min(-1, -Math.round((roundDeficit * 2.5 + 5) * (2 * expectedA)));
    return baseLoss;
  }
}
