/* REIN 1V1 - Data Layer & MongoDB Atlas Cloud Sync Engine */
const DataStore = (function() {
  const STORAGE_KEY = 'rein1v1_esports_db_v8';
  let syncStatus = 'synced'; // 'synced' | 'syncing' | 'offline' | 'error'
  const syncListeners = [];
  const dataListeners = [];

  const defaultTournaments = [
    { id: 'tourney-1', name: 'R6 Siege 1v1 World Series 2026', status: 'Live', prizePool: '$5,000', startDate: '2026-08-15', teamCount: 16 },
    { id: 'tourney-2', name: 'Hammer King Clash #12', status: 'Live', prizePool: '$1,500', startDate: '2026-08-28', teamCount: 16 },
    { id: 'tourney-3', name: 'Earthshatter Arena Season 1', status: 'Finished', prizePool: '$3,000', startDate: '2026-07-01', teamCount: 8 },
    { id: 'tourney-4', name: 'Crusader Pro Invitational', status: 'Upcoming', prizePool: '$10,000', startDate: '2026-09-15', teamCount: 32 }
  ];

  function getRankFromElo(elo) {
    const numeric = typeof elo === 'number' ? elo : parseInt(elo, 10) || 500;
    if (numeric >= 2000) return { tier: 'Champion', full: 'Champion', class: 'tier-champ', min: 2000, max: '∞' };
    if (numeric >= 1600) return { tier: 'Grandmaster', full: 'Grandmaster', class: 'tier-gm', min: 1600, max: 1999 };
    if (numeric >= 1300) return { tier: 'Master', full: 'Master', class: 'tier-master', min: 1300, max: 1599 };
    if (numeric >= 1000) return { tier: 'Diamond', full: 'Diamond', class: 'tier-diamond', min: 1000, max: 1299 };
    if (numeric >= 700) return { tier: 'Platinum', full: 'Platinum', class: 'tier-plat', min: 700, max: 999 };
    if (numeric >= 400) return { tier: 'Gold', full: 'Gold', class: 'tier-gold', min: 400, max: 699 };
    if (numeric >= 200) return { tier: 'Silver', full: 'Silver', class: 'tier-silver', min: 200, max: 399 };
    return { tier: 'Bronze', full: 'Bronze', class: 'tier-bronze', min: 0, max: 199 };
  }

  function getWinProbability(eloA, eloB) {
    const ratingA = typeof eloA === 'number' ? eloA : parseInt(eloA, 10) || 500;
    const ratingB = typeof eloB === 'number' ? eloB : parseInt(eloB, 10) || 500;
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  function calculateRoundBasedEloChange(eloA, eloB, roundsWonA, roundsLostA) {
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

  const defaultPlayers = [
    { id: 'p-1', tourneyId: 'tourney-1', rank: 1, name: 'LHCloudy', battleTag: 'LHCloudy#2145', tier: 'Champion', elo: 2140, wins: 18, losses: 3, streak: 6, avatar: '👑', group: 'Group A', lives: 2 },
    { id: 'p-2', tourneyId: 'tourney-1', rank: 2, name: 'SuperTF', battleTag: 'SuperTF#1982', tier: 'Grandmaster', elo: 1870, wins: 15, losses: 6, streak: 3, avatar: '🛡️', group: 'Group A', lives: 2 },
    { id: 'p-3', tourneyId: 'tourney-1', rank: 3, name: 'Kaiser', battleTag: 'Kaiser#3312', tier: 'Master', elo: 1450, wins: 10, losses: 4, streak: 2, avatar: '🔨', group: 'Group B', lives: 2 },
    { id: 'p-4', tourneyId: 'tourney-1', rank: 4, name: 'Bumper', battleTag: 'Bumper#1109', tier: 'Diamond', elo: 1150, wins: 8, losses: 5, streak: 1, avatar: '💥', group: 'Group B', lives: 2 },
    { id: 'p-5', tourneyId: 'tourney-1', rank: 5, name: 'ReinGod', battleTag: 'ReinGod#8801', tier: 'Diamond', elo: 1080, wins: 7, losses: 4, streak: 2, avatar: '⚡', group: 'Group C', lives: 2 },
    { id: 'p-6', tourneyId: 'tourney-1', rank: 6, name: 'ShatterMaster', battleTag: 'ShatterM#3301', tier: 'Platinum', elo: 920, wins: 6, losses: 5, streak: 1, avatar: '🎯', group: 'Group C', lives: 2 },
    { id: 'p-7', tourneyId: 'tourney-1', rank: 7, name: 'ChargeDemon', battleTag: 'ChargeD#5512', tier: 'Platinum', elo: 810, wins: 5, losses: 6, streak: 0, avatar: '🚀', group: 'Group D', lives: 2 },
    { id: 'p-8', tourneyId: 'tourney-1', rank: 8, name: 'RookieR6', battleTag: 'RookieR6#5544', tier: 'Gold', elo: 500, wins: 2, losses: 7, streak: 0, avatar: '🛡️', group: 'Group D', lives: 2 },
    
    { id: 'p-9', tourneyId: 'tourney-2', rank: 1, name: 'Ammar', battleTag: 'Ammar#7711', tier: 'Grandmaster', elo: 1920, wins: 12, losses: 2, streak: 5, avatar: '👑', group: 'Group A', lives: 2 },
    { id: 'p-10', tourneyId: 'tourney-2', rank: 2, name: 'Fahad', battleTag: 'Fahad#9901', tier: 'Grandmaster', elo: 1750, wins: 11, losses: 3, streak: 4, avatar: '⚡', group: 'Group A', lives: 2 },
    { id: 'p-11', tourneyId: 'tourney-2', rank: 3, name: 'Vortex', battleTag: 'Vortex#4412', tier: 'Master', elo: 1510, wins: 9, losses: 4, streak: 2, avatar: '💥', group: 'Group B', lives: 2 },
    { id: 'p-12', tourneyId: 'tourney-2', rank: 4, name: 'GhostDuelist', battleTag: 'Ghost#1211', tier: 'Master', elo: 1390, wins: 8, losses: 5, streak: 1, avatar: '🛡️', group: 'Group B', lives: 2 },
    { id: 'p-13', tourneyId: 'tourney-2', rank: 5, name: 'IronClad', battleTag: 'Iron#3322', tier: 'Diamond', elo: 1240, wins: 7, losses: 4, streak: 1, avatar: '🔨', group: 'Group C', lives: 2 },
    { id: 'p-14', tourneyId: 'tourney-2', rank: 6, name: 'ShadowStrike', battleTag: 'Shadow#8899', tier: 'Platinum', elo: 960, wins: 5, losses: 5, streak: 0, avatar: '🎯', group: 'Group C', lives: 2 },
    { id: 'p-15', tourneyId: 'tourney-2', rank: 7, name: 'BlazeFury', battleTag: 'Blaze#6655', tier: 'Gold', elo: 680, wins: 4, losses: 6, streak: 1, avatar: '🚀', group: 'Group D', lives: 2 },
    { id: 'p-16', tourneyId: 'tourney-2', rank: 8, name: 'TitanShield', battleTag: 'Titan#1122', tier: 'Gold', elo: 500, wins: 1, losses: 5, streak: 0, avatar: '🛡️', group: 'Group D', lives: 2 }
  ];

  const defaultMatches = [
    { id: 'm-1', tourneyId: 'tourney-1', p1: 'LHCloudy', p2: 'SuperTF', score: '10 - 4', winner: 'LHCloudy', eloChangeP1: 28, eloChangeP2: -20, date: '2026-08-30' },
    { id: 'm-2', tourneyId: 'tourney-1', p1: 'Kaiser', p2: 'Bumper', score: '10 - 7', winner: 'Kaiser', eloChangeP1: 20, eloChangeP2: -12, date: '2026-08-29' },
    { id: 'm-3', tourneyId: 'tourney-1', p1: 'ReinGod', p2: 'ShatterMaster', score: '10 - 8', winner: 'ReinGod', eloChangeP1: 18, eloChangeP2: -14, date: '2026-08-28' },
    { id: 'm-4', tourneyId: 'tourney-1', p1: 'ChargeDemon', p2: 'RookieR6', score: '10 - 2', winner: 'ChargeDemon', eloChangeP1: 25, eloChangeP2: -10, date: '2026-08-27' },
    { id: 'm-5', tourneyId: 'tourney-2', p1: 'Ammar', p2: 'Fahad', score: '10 - 6', winner: 'Ammar', eloChangeP1: 22, eloChangeP2: -15, date: '2026-09-01' },
    { id: 'm-6', tourneyId: 'tourney-2', p1: 'Vortex', p2: 'GhostDuelist', score: '10 - 5', winner: 'Vortex', eloChangeP1: 19, eloChangeP2: -13, date: '2026-08-31' }
  ];

  let db = {
    tournaments: defaultTournaments,
    players: defaultPlayers,
    matches: defaultMatches
  };

  function loadLocal() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.tournaments) && parsed.tournaments.length > 0 && Array.isArray(parsed.players) && parsed.players.length > 0) {
          db = parsed;
        } else {
          db = {
            tournaments: defaultTournaments,
            players: defaultPlayers,
            matches: defaultMatches
          };
          saveLocal();
        }
      } else {
        saveLocal();
      }
    } catch (e) {
      console.warn('LocalStorage warning, using memory state:', e);
      db = {
        tournaments: defaultTournaments,
        players: defaultPlayers,
        matches: defaultMatches
      };
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save local state:', e);
    }
    notifyDataChanged();
  }

  function setSyncStatus(status) {
    syncStatus = status;
    syncListeners.forEach(cb => {
      try { cb(status); } catch (e) {}
    });
  }

  function notifyDataChanged() {
    dataListeners.forEach(cb => {
      try { cb(db); } catch (e) {}
    });
  }

  function getAuthHeaders() {
    if (typeof Auth !== 'undefined' && typeof Auth.getAuthHeader === 'function') {
      return Auth.getAuthHeader();
    }
    const token = localStorage.getItem('rein1v1_auth_token') || localStorage.getItem('admin_session');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Authoritative Asynchronous MongoDB Atlas Cloud Sync
  async function initCloudSync() {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          db.tournaments = (json.data.tournaments && json.data.tournaments.length > 0) ? json.data.tournaments : defaultTournaments;
          db.players = (json.data.players && json.data.players.length > 0) ? json.data.players : defaultPlayers;
          db.matches = (json.data.matches && json.data.matches.length > 0) ? json.data.matches : defaultMatches;
          saveLocal();
          setSyncStatus('synced');
          return true;
        }
      }
      setSyncStatus('synced');
    } catch (err) {
      console.warn('Cloud sync offline, using local cached state:', err);
      setSyncStatus('offline');
    }
    return false;
  }

  function getTournaments() {
    return db.tournaments || [];
  }

  /**
   * Get players list:
   * If tourneyId === 'all' or empty, returns all unique players ranked globally by ELO!
   */
  function getPlayersByTournament(tourneyId = 'all') {
    let pool = [];

    if (!tourneyId || tourneyId === 'all') {
      // Global Unique Player Ranking by ELO
      const uniqueMap = new Map();
      (db.players || []).forEach(p => {
        const key = (p.name || '').toLowerCase().trim();
        if (!uniqueMap.has(key) || (p.elo > uniqueMap.get(key).elo)) {
          uniqueMap.set(key, p);
        }
      });
      pool = Array.from(uniqueMap.values());
      // Sort strictly by ELO descending for global standings
      pool.sort((a, b) => b.elo - a.elo);
      return pool.map((p, idx) => {
        const rankInfo = getRankFromElo(p.elo);
        return {
          ...p,
          rank: idx + 1,
          tier: rankInfo.full,
          tierClass: rankInfo.class
        };
      });
    }

    // Filter by specific tournament
    pool = (db.players || [])
      .filter(p => p.tourneyId === tourneyId)
      .sort((a, b) => (a.rank || 99) - (b.rank || 99) || (b.elo - a.elo))
      .map((p, idx) => {
        const rankInfo = getRankFromElo(p.elo);
        return {
          ...p,
          rank: p.rank || (idx + 1),
          tier: rankInfo.full,
          tierClass: rankInfo.class
        };
      });

    return pool;
  }

  function getGlobalPlayers() {
    const map = new Map();
    (db.players || []).forEach(p => {
      const key = (p.name || '').toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.elo - a.elo);
  }

  function getGroupStageData(tourneyId) {
    const players = getPlayersByTournament(tourneyId);
    const groups = {};

    players.forEach(p => {
      const g = p.group || 'Group A';
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    });

    return groups;
  }

  function getMatches(tourneyId) {
    if (!tourneyId || tourneyId === 'all') return db.matches || [];
    return (db.matches || []).filter(m => m.tourneyId === tourneyId);
  }

  /* Dual-Wing FIFA World Cup 2026 Style Bracket Generator + Losers Bracket Redemption */
  function generateRectangularDoubleElimination(tourneyId) {
    const tourney = (db.tournaments && db.tournaments.find(t => t.id === tourneyId)) || 
                    (db.tournaments && db.tournaments[0]) || 
                    { id: 'tourney-default', name: 'REIN 1V1 Esports Championship 2026', status: 'Live', prizePool: '$5,000', startDate: new Date().toISOString().split('T')[0], teamCount: 16 };
    
    let players = getPlayersByTournament(tourney.id);
    if (players.length === 0) {
      players = getPlayersByTournament('all');
    }

    const count = tourney.teamCount || Math.max(16, players.length);
    const halfCount = Math.floor(count / 2);

    const leftPlayers = players.slice(0, halfCount);
    const rightPlayers = players.slice(halfCount, count);

    // Generate Left Wing (WB & LB)
    const leftWing = generateWingBracket('West Bracket (Left)', leftPlayers, tourney.status, 1);
    
    // Generate Right Wing (WB & LB)
    const rightWing = generateWingBracket('East Bracket (Right)', rightPlayers, tourney.status, halfCount + 1);

    const wbChampLeft = leftWing.wbChamp || (leftPlayers[0] ? leftPlayers[0].name : 'West Semifinalist 1');
    const wbChampRight = rightWing.wbChamp || (rightPlayers[0] ? rightPlayers[0].name : 'East Semifinalist 1');
    const lbChampLeft = leftWing.lbChamp || (leftPlayers[1] ? leftPlayers[1].name : 'West LB Champion');
    const lbChampRight = rightWing.lbChamp || (rightPlayers[1] ? rightPlayers[1].name : 'East LB Champion');

    // Winner Semifinal / Final Clash
    const winnerFinalMatch = {
      id: 'CENTER-WF',
      title: '⚔️ WINNERS SEMIFINAL / CROSSOVER',
      p1Name: wbChampLeft,
      p1Avatar: getPlayerAvatar(wbChampLeft, players),
      p2Name: wbChampRight,
      p2Avatar: getPlayerAvatar(wbChampRight, players),
      scoreP1: tourney.status === 'Finished' ? 10 : (tourney.status === 'Live' ? 8 : '-'),
      scoreP2: tourney.status === 'Finished' ? 6 : (tourney.status === 'Live' ? 7 : '-'),
      status: tourney.status === 'Finished' ? 'COMPLETED' : (tourney.status === 'Live' ? 'LIVE' : 'UPCOMING'),
      winner: tourney.status === 'Finished' ? wbChampLeft : null,
      loser: tourney.status === 'Finished' ? wbChampRight : null,
      destWinner: '👑 Grand Final (Slot 1)',
      destLoser: '🔥 Loser Final Stage 2'
    };

    // Loser Bracket Final (Left LB Champ vs Right LB Champ)
    const loserFinalStage1 = {
      id: 'CENTER-LF1',
      title: '💀 LOSERS BRACKET FINAL (STAGE 1)',
      p1Name: lbChampLeft,
      p1Avatar: getPlayerAvatar(lbChampLeft, players),
      p2Name: lbChampRight,
      p2Avatar: getPlayerAvatar(lbChampRight, players),
      scoreP1: tourney.status === 'Finished' ? 10 : '-',
      scoreP2: tourney.status === 'Finished' ? 8 : '-',
      status: tourney.status === 'Finished' ? 'COMPLETED' : 'UPCOMING',
      winner: tourney.status === 'Finished' ? lbChampLeft : null,
      loser: tourney.status === 'Finished' ? lbChampRight : null,
      destWinner: 'Loser Final Stage 2',
      destLoser: '🥉 Bronze Final (Slot 1)'
    };

    // Loser Final Stage 2 (LB Winner vs WB Semifinal Loser)
    const lfWinner = loserFinalStage1.winner || 'Winner LB Stage 1';
    const wfLoser = winnerFinalMatch.loser || 'Loser Winner Semifinal';

    const loserFinalStage2 = {
      id: 'CENTER-LF2',
      title: '🔥 LOSERS REDEMPTION FINAL (STAGE 2)',
      p1Name: lfWinner,
      p1Avatar: getPlayerAvatar(lfWinner, players),
      p2Name: wfLoser,
      p2Avatar: getPlayerAvatar(wfLoser, players),
      scoreP1: tourney.status === 'Finished' ? 10 : '-',
      scoreP2: tourney.status === 'Finished' ? 7 : '-',
      status: tourney.status === 'Finished' ? 'COMPLETED' : 'UPCOMING',
      winner: tourney.status === 'Finished' ? lfWinner : null,
      loser: tourney.status === 'Finished' ? wfLoser : null,
      destWinner: '👑 Grand Final (Slot 2)',
      destLoser: '🥉 Bronze Final (Slot 2)'
    };

    const gfP1 = winnerFinalMatch.winner || 'Winners Bracket Champion';
    const gfP2 = loserFinalStage2.winner || 'Losers Redemption Champion';

    // Grand Final Match
    const grandFinalMatch = {
      id: 'CENTER-GF',
      title: '👑 WORLD CHAMPIONSHIP GRAND FINAL',
      p1Name: gfP1,
      p1Avatar: getPlayerAvatar(gfP1, players),
      p2Name: gfP2,
      p2Avatar: getPlayerAvatar(gfP2, players),
      scoreP1: tourney.status === 'Finished' ? 10 : '-',
      scoreP2: tourney.status === 'Finished' ? 6 : '-',
      status: tourney.status === 'Finished' ? 'COMPLETED' : 'UPCOMING',
      winner: tourney.status === 'Finished' ? gfP1 : null,
      loser: tourney.status === 'Finished' ? gfP2 : null,
      destWinner: '🥇 1st Place World Champion',
      destLoser: '🥈 2nd Place Runner-Up'
    };

    // Bronze Final Match (3rd / 4th place match)
    const p31 = loserFinalStage1.loser || 'Loser LB Stage 1';
    const p32 = loserFinalStage2.loser || 'Loser LB Stage 2';

    const thirdPlaceMatch = {
      id: 'CENTER-3RD',
      title: '🥉 BRONZE FINAL (3RD / 4TH PLACE)',
      p1Name: p31,
      p1Avatar: getPlayerAvatar(p31, players),
      p2Name: p32,
      p2Avatar: getPlayerAvatar(p32, players),
      scoreP1: tourney.status === 'Finished' ? 10 : '-',
      scoreP2: tourney.status === 'Finished' ? 5 : '-',
      status: tourney.status === 'Finished' ? 'COMPLETED' : 'UPCOMING',
      winner: tourney.status === 'Finished' ? p31 : null,
      loser: tourney.status === 'Finished' ? p32 : null,
      destWinner: '🥉 3rd Place Bronze Medalist',
      destLoser: '4th Place Finish'
    };

    const podium = {
      first: grandFinalMatch.winner || (players[0] ? players[0].name : 'LHCloudy'),
      second: grandFinalMatch.loser || (players[1] ? players[1].name : 'SuperTF'),
      third: thirdPlaceMatch.winner || (players[2] ? players[2].name : 'Kaiser'),
      fourth: thirdPlaceMatch.loser || (players[3] ? players[3].name : 'Bumper')
    };

    return {
      tourney,
      leftWing,
      rightWing,
      centerStage: {
        winnerFinalMatch,
        loserFinalStage1,
        loserFinalStage2,
        grandFinalMatch,
        thirdPlaceMatch,
        podium
      }
    };
  }

  function generateWingBracket(wingName, poolPlayers, tourneyStatus, seedOffset) {
    const wbRounds = [];
    const lbRounds = [];

    // WB Round 1 (Round of 16 / 8 teams per wing)
    const p0 = poolPlayers[0] ? poolPlayers[0].name : `Seed #${seedOffset}`;
    const p1 = poolPlayers[1] ? poolPlayers[1].name : `Seed #${seedOffset + 1}`;
    const p2 = poolPlayers[2] ? poolPlayers[2].name : `Seed #${seedOffset + 2}`;
    const p3 = poolPlayers[3] ? poolPlayers[3].name : `Seed #${seedOffset + 3}`;
    const p4 = poolPlayers[4] ? poolPlayers[4].name : `Seed #${seedOffset + 4}`;
    const p5 = poolPlayers[5] ? poolPlayers[5].name : `Seed #${seedOffset + 5}`;
    const p6 = poolPlayers[6] ? poolPlayers[6].name : `Seed #${seedOffset + 6}`;
    const p7 = poolPlayers[7] ? poolPlayers[7].name : `Seed #${seedOffset + 7}`;

    const wbM1 = {
      id: `${wingName}-WB1-M1`,
      title: `${wingName} QF 1`,
      p1Name: p0,
      p1Avatar: getPlayerAvatar(p0, poolPlayers),
      p2Name: p1,
      p2Avatar: getPlayerAvatar(p1, poolPlayers),
      scoreP1: 10,
      scoreP2: 4,
      status: 'COMPLETED',
      winner: p0,
      loser: p1,
      destWinner: `${wingName} Semifinal 1`,
      destLoser: `${wingName} LB Round 1`
    };

    const wbM2 = {
      id: `${wingName}-WB1-M2`,
      title: `${wingName} QF 2`,
      p1Name: p2,
      p1Avatar: getPlayerAvatar(p2, poolPlayers),
      p2Name: p3,
      p2Avatar: getPlayerAvatar(p3, poolPlayers),
      scoreP1: 10,
      scoreP2: 7,
      status: 'COMPLETED',
      winner: p2,
      loser: p3,
      destWinner: `${wingName} Semifinal 1`,
      destLoser: `${wingName} LB Round 1`
    };

    const wbM3 = {
      id: `${wingName}-WB1-M3`,
      title: `${wingName} QF 3`,
      p1Name: p4,
      p1Avatar: getPlayerAvatar(p4, poolPlayers),
      p2Name: p5,
      p2Avatar: getPlayerAvatar(p5, poolPlayers),
      scoreP1: 10,
      scoreP2: 5,
      status: 'COMPLETED',
      winner: p4,
      loser: p5,
      destWinner: `${wingName} Semifinal 2`,
      destLoser: `${wingName} LB Round 2`
    };

    const wbM4 = {
      id: `${wingName}-WB1-M4`,
      title: `${wingName} QF 4`,
      p1Name: p6,
      p1Avatar: getPlayerAvatar(p6, poolPlayers),
      p2Name: p7,
      p2Avatar: getPlayerAvatar(p7, poolPlayers),
      scoreP1: 10,
      scoreP2: 8,
      status: 'COMPLETED',
      winner: p6,
      loser: p7,
      destWinner: `${wingName} Semifinal 2`,
      destLoser: `${wingName} LB Round 2`
    };

    wbRounds.push({ title: `Quarterfinals (WB R1)`, matches: [wbM1, wbM2, wbM3, wbM4] });

    // WB Round 2 (Semifinals)
    const wbSemi1 = {
      id: `${wingName}-WB2-M1`,
      title: `Semifinal 1`,
      p1Name: wbM1.winner,
      p1Avatar: getPlayerAvatar(wbM1.winner, poolPlayers),
      p2Name: wbM2.winner,
      p2Avatar: getPlayerAvatar(wbM2.winner, poolPlayers),
      scoreP1: 10,
      scoreP2: 6,
      status: 'COMPLETED',
      winner: wbM1.winner,
      loser: wbM2.winner,
      destWinner: `Wing Final`,
      destLoser: `${wingName} LB Major Crossover`
    };

    const wbSemi2 = {
      id: `${wingName}-WB2-M2`,
      title: `Semifinal 2`,
      p1Name: wbM3.winner,
      p1Avatar: getPlayerAvatar(wbM3.winner, poolPlayers),
      p2Name: wbM4.winner,
      p2Avatar: getPlayerAvatar(wbM4.winner, poolPlayers),
      scoreP1: 10,
      scoreP2: 7,
      status: 'COMPLETED',
      winner: wbM3.winner,
      loser: wbM4.winner,
      destWinner: `Wing Final`,
      destLoser: `${wingName} LB Major Crossover`
    };

    wbRounds.push({ title: `Semifinals (WB R2)`, matches: [wbSemi1, wbSemi2] });

    // WB Round 3 (Wing Final)
    const wbWingFinal = {
      id: `${wingName}-WB3-M1`,
      title: `${wingName} Championship Final`,
      p1Name: wbSemi1.winner,
      p1Avatar: getPlayerAvatar(wbSemi1.winner, poolPlayers),
      p2Name: wbSemi2.winner,
      p2Avatar: getPlayerAvatar(wbSemi2.winner, poolPlayers),
      scoreP1: tourneyStatus === 'Finished' ? 10 : 8,
      scoreP2: tourneyStatus === 'Finished' ? 7 : 6,
      status: tourneyStatus === 'Finished' ? 'COMPLETED' : 'LIVE',
      winner: wbSemi1.winner,
      loser: wbSemi2.winner,
      destWinner: `World Championship Center Stage`,
      destLoser: `${wingName} LB Redemption Final`
    };

    wbRounds.push({ title: `Wing Final`, matches: [wbWingFinal] });

    // --- LOSER BRACKET (REDEMPTION FLOW) ---
    // LB Round 1: WB QF Losers drop down
    const lbM1 = {
      id: `${wingName}-LB1-M1`,
      title: `LB Minor Match 1`,
      p1Name: wbM1.loser,
      p1Avatar: getPlayerAvatar(wbM1.loser, poolPlayers),
      p2Name: wbM2.loser,
      p2Avatar: getPlayerAvatar(wbM2.loser, poolPlayers),
      scoreP1: 10,
      scoreP2: 6,
      status: 'COMPLETED',
      winner: wbM1.loser,
      loser: wbM2.loser,
      destWinner: `LB Minor Semifinal`,
      destLoser: 'ELIMINATED ❌'
    };

    const lbM2 = {
      id: `${wingName}-LB1-M2`,
      title: `LB Minor Match 2`,
      p1Name: wbM3.loser,
      p1Avatar: getPlayerAvatar(wbM3.loser, poolPlayers),
      p2Name: wbM4.loser,
      p2Avatar: getPlayerAvatar(wbM4.loser, poolPlayers),
      scoreP1: 10,
      scoreP2: 7,
      status: 'COMPLETED',
      winner: wbM3.loser,
      loser: wbM4.loser,
      destWinner: `LB Minor Semifinal`,
      destLoser: 'ELIMINATED ❌'
    };

    lbRounds.push({ title: `LB Round 1 (QF Drop)`, matches: [lbM1, lbM2] });

    // LB Round 2: LB R1 Winners face off
    const lbR2 = {
      id: `${wingName}-LB2-M1`,
      title: `LB Minor Semifinal`,
      p1Name: lbM1.winner,
      p1Avatar: getPlayerAvatar(lbM1.winner, poolPlayers),
      p2Name: lbM2.winner,
      p2Avatar: getPlayerAvatar(lbM2.winner, poolPlayers),
      scoreP1: 10,
      scoreP2: 8,
      status: 'COMPLETED',
      winner: lbM1.winner,
      loser: lbM2.loser,
      destWinner: `LB Major Crossover (vs SF Loser)`,
      destLoser: 'ELIMINATED ❌'
    };

    lbRounds.push({ title: `LB Round 2`, matches: [lbR2] });

    // LB Round 3: LB R2 Winner vs Semifinal Loser
    const lbMajor = {
      id: `${wingName}-LB3-M1`,
      title: `LB Major Crossover`,
      p1Name: lbR2.winner,
      p1Avatar: getPlayerAvatar(lbR2.winner, poolPlayers),
      p2Name: wbSemi1.loser,
      p2Avatar: getPlayerAvatar(wbSemi1.loser, poolPlayers),
      scoreP1: tourneyStatus === 'Finished' ? 10 : 8,
      scoreP2: tourneyStatus === 'Finished' ? 7 : 9,
      status: tourneyStatus === 'Finished' ? 'COMPLETED' : 'LIVE',
      winner: lbR2.winner,
      loser: wbSemi1.loser,
      destWinner: `${wingName} LB Finalist`,
      destLoser: 'ELIMINATED ❌'
    };

    lbRounds.push({ title: `LB Crossover Final`, matches: [lbMajor] });

    return {
      wingName,
      wbRounds,
      lbRounds,
      wbChamp: wbWingFinal.winner,
      lbChamp: lbMajor.winner
    };
  }

  function getPlayerAvatar(name, pool) {
    if (!name) return '🛡️';
    const found = pool.find(p => p.name === name);
    return found ? (found.avatar || '🛡️') : '🛡️';
  }

  // --- Data Mutations connected to MongoDB Backend ---

  async function recordRoundMatchResult(p1Id, p2Id, roundsP1, roundsP2, tourneyId) {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ p1Id, p2Id, scoreP1: roundsP1, scoreP2: roundsP2, tourneyId })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.match) db.matches.unshift(json.match);
        if (json.players && Array.isArray(json.players)) {
          json.players.forEach(up => {
            const idx = db.players.findIndex(p => p.id === up.id);
            if (idx !== -1) db.players[idx] = up;
          });
        }
        reindexRanks(tourneyId);
        saveLocal();
        setSyncStatus('synced');
        return json;
      }
    } catch (e) {
      console.warn('API call failed, updating local state:', e);
    }

    const p1 = db.players.find(p => p.id === p1Id);
    const p2 = db.players.find(p => p.id === p2Id);
    if (!p1 || !p2) return null;

    const p1IsWinner = roundsP1 > roundsP2;
    const p1EloChange = calculateRoundBasedEloChange(p1.elo, p2.elo, roundsP1, roundsP2);
    const p2EloChange = calculateRoundBasedEloChange(p2.elo, p1.elo, roundsP2, roundsP1);

    p1.elo = Math.max(0, p1.elo + p1EloChange);
    p1.tier = getRankFromElo(p1.elo).full;
    p1.wins += p1IsWinner ? 1 : 0;
    p1.losses += p1IsWinner ? 0 : 1;
    p1.streak = p1IsWinner ? (p1.streak + 1) : 0;
    if (!p1IsWinner) p1.lives = Math.max(0, (p1.lives || 2) - 1);

    p2.elo = Math.max(0, p2.elo + p2EloChange);
    p2.tier = getRankFromElo(p2.elo).full;
    p2.wins += p1IsWinner ? 0 : 1;
    p2.losses += p1IsWinner ? 1 : 0;
    p2.streak = p1IsWinner ? 0 : (p2.streak + 1);
    if (p1IsWinner) p2.lives = Math.max(0, (p2.lives || 2) - 1);

    const newMatch = {
      id: 'm-' + Date.now(),
      tourneyId: tourneyId || p1.tourneyId,
      p1: p1.name,
      p2: p2.name,
      score: `${roundsP1} - ${roundsP2}`,
      winner: p1IsWinner ? p1.name : p2.name,
      eloChangeP1: p1EloChange,
      eloChangeP2: p2EloChange,
      date: new Date().toISOString().split('T')[0]
    };

    db.matches.unshift(newMatch);
    reindexRanks(p1.tourneyId);
    saveLocal();
    setSyncStatus('synced');
    return { match: newMatch, p1EloChange, p2EloChange, p1, p2 };
  }

  async function addPlayer(playerData) {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(playerData)
      });
      const json = await res.json();
      if (res.ok && json.success && json.player) {
        db.players.push(json.player);
        reindexRanks(json.player.tourneyId);
        saveLocal();
        setSyncStatus('synced');
        return json.player;
      }
    } catch (e) {
      console.warn('Add player API offline fallback:', e);
    }

    const tourneyPlayers = getPlayersByTournament(playerData.tourneyId);
    const newRank = playerData.rank || tourneyPlayers.length + 1;
    const initialElo = parseInt(playerData.elo) || 500;
    const rankInfo = getRankFromElo(initialElo);

    const newPlayer = {
      id: 'p-' + Date.now(),
      tourneyId: playerData.tourneyId || 'tourney-1',
      rank: newRank,
      name: playerData.name,
      battleTag: playerData.battleTag || (playerData.name + '#' + Math.floor(1000 + Math.random() * 9000)),
      tier: rankInfo.full,
      elo: initialElo,
      wins: parseInt(playerData.wins) || 0,
      losses: parseInt(playerData.losses) || 0,
      streak: parseInt(playerData.streak) || 0,
      avatar: playerData.avatar || '🛡️',
      group: playerData.group || 'Group A',
      lives: 2
    };

    db.players.push(newPlayer);
    reindexRanks(playerData.tourneyId);
    saveLocal();
    setSyncStatus('synced');
    return newPlayer;
  }

  async function assignPlayerToTournament(playerNameOrId, targetTourneyId, targetGroup = 'Group A') {
    setSyncStatus('syncing');
    const existingPlayer = (db.players || []).find(p => p.id === playerNameOrId || p.name === playerNameOrId);
    if (!existingPlayer) return null;

    // Check if player already exists in this tournament
    const alreadyInTourney = (db.players || []).find(p => (p.name === existingPlayer.name || p.id === existingPlayer.id) && p.tourneyId === targetTourneyId);
    if (alreadyInTourney) {
      alreadyInTourney.group = targetGroup;
      saveLocal();
      return alreadyInTourney;
    }

    const newEntry = {
      id: 'p-' + Date.now(),
      tourneyId: targetTourneyId,
      rank: getPlayersByTournament(targetTourneyId).length + 1,
      name: existingPlayer.name,
      battleTag: existingPlayer.battleTag,
      tier: existingPlayer.tier || getRankFromElo(existingPlayer.elo).full,
      elo: existingPlayer.elo,
      wins: 0,
      losses: 0,
      streak: 0,
      avatar: existingPlayer.avatar,
      avatarType: existingPlayer.avatarType || 'emoji',
      group: targetGroup,
      lives: 2
    };

    try {
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newEntry)
      });
    } catch (e) {}

    db.players.push(newEntry);
    saveLocal();
    setSyncStatus('synced');
    return newEntry;
  }

  async function updatePlayer(id, updatedData) {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ id, ...updatedData })
      });
      const json = await res.json();
      if (res.ok && json.success && json.player) {
        const idx = db.players.findIndex(p => p.id === id);
        if (idx !== -1) db.players[idx] = json.player;
        reindexRanks(json.player.tourneyId);
        saveLocal();
        setSyncStatus('synced');
        return json.player;
      }
    } catch (e) {
      console.warn('Update player API offline fallback:', e);
    }

    const index = db.players.findIndex(p => p.id === id);
    if (index !== -1) {
      const merged = { ...db.players[index], ...updatedData };
      if (updatedData.elo !== undefined) {
        merged.tier = getRankFromElo(merged.elo).full;
      }
      db.players[index] = merged;
      reindexRanks(db.players[index].tourneyId);
      saveLocal();
      setSyncStatus('synced');
      return db.players[index];
    }
    return null;
  }

  async function deletePlayer(id) {
    setSyncStatus('syncing');
    try {
      const res = await fetch(`/api/players?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        db.players = db.players.filter(p => p.id !== id);
        saveLocal();
        setSyncStatus('synced');
        return true;
      }
    } catch (e) {
      console.warn('Delete player API offline fallback:', e);
    }

    const player = db.players.find(p => p.id === id);
    if (player) {
      const tourneyId = player.tourneyId;
      db.players = db.players.filter(p => p.id !== id);
      reindexRanks(tourneyId);
      saveLocal();
      setSyncStatus('synced');
      return true;
    }
    return false;
  }

  async function movePlayerRank(id, direction) {
    const player = db.players.find(p => p.id === id);
    if (!player) return;
    const tourneyPlayers = getPlayersByTournament(player.tourneyId);
    const currIndex = tourneyPlayers.findIndex(p => p.id === id);
    let targetRank = player.rank;
    
    if (direction === 'up' && currIndex > 0) {
      targetRank = tourneyPlayers[currIndex - 1].rank;
    } else if (direction === 'down' && currIndex < tourneyPlayers.length - 1) {
      targetRank = tourneyPlayers[currIndex + 1].rank;
    }

    try {
      await fetch('/api/players?action=reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ playerId: id, newRank: targetRank, tourneyId: player.tourneyId })
      });
    } catch (e) {}

    if (direction === 'up' && currIndex > 0) {
      const prevPlayer = tourneyPlayers[currIndex - 1];
      const tempRank = player.rank;
      player.rank = prevPlayer.rank;
      prevPlayer.rank = tempRank;
    } else if (direction === 'down' && currIndex < tourneyPlayers.length - 1) {
      const nextPlayer = tourneyPlayers[currIndex + 1];
      const tempRank = player.rank;
      player.rank = nextPlayer.rank;
      nextPlayer.rank = tempRank;
    }
    
    saveLocal();
  }

  async function setPlayerPosition(id, newPosition) {
    const player = db.players.find(p => p.id === id);
    if (!player) return;

    try {
      await fetch('/api/players?action=reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ playerId: id, newRank: newPosition, tourneyId: player.tourneyId })
      });
    } catch (e) {}

    const tourneyPlayers = getPlayersByTournament(player.tourneyId);
    const targetPos = Math.max(1, Math.min(newPosition, tourneyPlayers.length));

    const filtered = tourneyPlayers.filter(p => p.id !== id);
    filtered.splice(targetPos - 1, 0, player);

    filtered.forEach((p, index) => {
      p.rank = index + 1;
    });

    saveLocal();
  }

  function reindexRanks(tourneyId) {
    const list = db.players.filter(p => p.tourneyId === tourneyId).sort((a, b) => b.elo - a.elo);
    list.forEach((p, idx) => {
      p.rank = idx + 1;
    });
  }

  async function addTournament(name, prizePool, status, teamCount) {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, prizePool, status, teamCount })
      });
      const json = await res.json();
      if (res.ok && json.success && json.tournament) {
        db.tournaments.push(json.tournament);
        saveLocal();
        setSyncStatus('synced');
        return json.tournament;
      }
    } catch (e) {}

    const newT = {
      id: 'tourney-' + Date.now(),
      name: name,
      status: status || 'Live',
      prizePool: prizePool || '$0',
      startDate: new Date().toISOString().split('T')[0],
      teamCount: parseInt(teamCount) || 16
    };
    db.tournaments.push(newT);
    saveLocal();
    setSyncStatus('synced');
    return newT;
  }

  async function generateGroupStage(tourneyId, teamCount) {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/tournaments?action=generate_groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ tourneyId, teamCount })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await initCloudSync();
        return json.numGroups || 4;
      }
    } catch (e) {}

    const players = db.players.filter(p => p.tourneyId === tourneyId);
    const groupNames = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
    const count = parseInt(teamCount) || players.length || 16;
    const teamsPerGroup = 4;
    const numGroups = Math.max(1, Math.ceil(count / teamsPerGroup));

    players.forEach((p, idx) => {
      const groupIdx = idx % numGroups;
      p.group = groupNames[groupIdx] || `Group ${groupIdx + 1}`;
    });

    saveLocal();
    setSyncStatus('synced');
    return numGroups;
  }

  function exportJSON() {
    return JSON.stringify(db, null, 2);
  }

  async function importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.tournaments && parsed.players) {
        db = parsed;
        saveLocal();
        await fetch('/api/data?action=restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ data: parsed })
        });
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON format:', e);
    }
    return false;
  }

  function simulateMatch(p1Id, p2Id, maxRounds = 10) {
    const p1 = db.players.find(p => p.id === p1Id);
    const p2 = db.players.find(p => p.id === p2Id);
    if (!p1 || !p2) {
      return { scoreP1: maxRounds, scoreP2: Math.floor(maxRounds / 2), winnerName: 'Player 1' };
    }
    const probP1 = getWinProbability(p1.elo, p2.elo);
    let scoreP1 = 0;
    let scoreP2 = 0;
    while (scoreP1 < maxRounds && scoreP2 < maxRounds) {
      if (Math.random() < probP1) {
        scoreP1++;
      } else {
        scoreP2++;
      }
    }
    const winnerName = scoreP1 > scoreP2 ? p1.name : p2.name;
    return { scoreP1, scoreP2, winnerName };
  }

  async function resetToDefaultData() {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/data?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        db = json.data;
        saveLocal();
        setSyncStatus('synced');
        return;
      }
    } catch (e) {}

    db = {
      tournaments: defaultTournaments,
      players: defaultPlayers,
      matches: defaultMatches
    };
    saveLocal();
    setSyncStatus('synced');
  }

  function onSyncChange(cb) {
    if (typeof cb === 'function') syncListeners.push(cb);
  }

  function onDataChange(cb) {
    if (typeof cb === 'function') dataListeners.push(cb);
  }

  function getSyncStatus() {
    return syncStatus;
  }

  loadLocal();

  const dataStoreInstance = {
    initCloudSync,
    getSyncStatus,
    onSyncChange,
    onDataChange,
    getTournaments,
    getPlayersByTournament,
    getGlobalPlayers,
    assignPlayerToTournament,
    getGroupStageData,
    getMatches,
    getRankFromElo,
    getWinProbability,
    calculateRoundBasedEloChange,
    recordRoundMatchResult,
    generateRectangularDoubleElimination,
    addPlayer,
    updatePlayer,
    deletePlayer,
    movePlayerRank,
    setPlayerPosition,
    addTournament,
    generateGroupStage,
    simulateMatch,
    resetToDefaultData,
    exportJSON,
    importJSON
  };

  if (typeof window !== 'undefined') {
    window.DataStore = dataStoreInstance;
  }

  return dataStoreInstance;
})();

if (typeof window !== 'undefined') {
  window.DataStore = DataStore;
}
