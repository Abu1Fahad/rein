/* REIN 1V1 - Clean Competitive Leaderboard Component */
const Leaderboard = (function() {
  let activeTourneyId = 'all';
  let searchQuery = '';
  let selectedTier = 'all';
  let sortField = 'rank';
  let sortDirection = 'asc';

  function init(tourneyId) {
    activeTourneyId = tourneyId || 'all';
    render();
    if (typeof DataStore !== 'undefined' && typeof DataStore.onDataChange === 'function') {
      DataStore.onDataChange(() => {
        render();
      });
    }
  }

  function setTourney(tourneyId) {
    activeTourneyId = tourneyId;
    render();
  }

  function setSearch(query) {
    searchQuery = query.toLowerCase();
    render();
  }

  function setTier(tier) {
    selectedTier = tier;
    render();
  }

  function toggleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = field === 'rank' ? 'asc' : 'desc';
    }
    render();
  }

  function getFilteredAndSortedPlayers() {
    let players = DataStore.getPlayersByTournament(activeTourneyId);

    if (searchQuery) {
      players = players.filter(p => 
        p.name.toLowerCase().includes(searchQuery) || 
        p.battleTag.toLowerCase().includes(searchQuery) ||
        (p.group && p.group.toLowerCase().includes(searchQuery))
      );
    }

    if (selectedTier !== 'all') {
      players = players.filter(p => p.tier.toLowerCase().includes(selectedTier.toLowerCase()));
    }

    players.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'winrate') {
        valA = a.wins / (a.wins + a.losses || 1);
        valB = b.wins / (b.wins + b.losses || 1);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return players;
  }

  function renderAvatar(avatar, altName = 'Player') {
    if (!avatar) return '🛡️';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
      return `<img src="${avatar}" class="user-avatar-img" alt="${escapeHTML(altName)}">`;
    }
    return avatar;
  }

  function render() {
    const tableBody = document.getElementById('lb-table-body');
    const mobileList = document.getElementById('lb-mobile-list');

    if (!tableBody || !mobileList) return;

    const players = getFilteredAndSortedPlayers();

    if (players.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No competitors found in this tournament tier.</td></tr>`;
      mobileList.innerHTML = `<div style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No competitors found in this tournament tier.</div>`;
      return;
    }

    // Render Desktop Table
    tableBody.innerHTML = players.map(p => {
      const winRate = ((p.wins / (p.wins + p.losses || 1)) * 100).toFixed(1);
      const rankBadgeClass = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : 'rank-normal';
      const rankInfo = DataStore.getRankFromElo(p.elo);
      const formHtml = (p.recentForm || ['W', 'W', 'L']).map(r => `
        <span class="form-badge form-${r.toLowerCase()}">${r}</span>
      `).join('');

      return `
        <tr onclick="Leaderboard.openPlayerModal('${p.id}')">
          <td><span class="rank-badge ${rankBadgeClass}">#${p.rank}</span></td>
          <td>
            <div class="player-cell">
              <div class="player-avatar">${renderAvatar(p.avatar, p.name)}</div>
              <div class="player-details">
                <span class="player-name">${escapeHTML(p.name)}</span>
                <span class="player-tag">${escapeHTML(p.battleTag)} <span class="group-tag">${p.group || 'Group A'}</span></span>
              </div>
            </div>
          </td>
          <td><span class="tier-pill ${rankInfo.class}">${rankInfo.full}</span></td>
          <td><strong style="color: var(--primary-gold); font-size: 1.15rem;">${p.elo} ELO</strong></td>
          <td>${p.wins} - ${p.losses}</td>
          <td><strong>${winRate}%</strong></td>
          <td><span style="color: ${p.streak >= 3 ? '#10b981' : 'var(--text-main)'}; font-weight: bold;">🔥 ${p.streak}</span></td>
          <td><div class="recent-form-wrap">${formHtml}</div></td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards
    mobileList.innerHTML = players.map(p => {
      const winRate = ((p.wins / (p.wins + p.losses || 1)) * 100).toFixed(1);
      const rankBadgeClass = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : 'rank-normal';
      const rankInfo = DataStore.getRankFromElo(p.elo);

      return `
        <div class="mobile-lb-card" onclick="Leaderboard.openPlayerModal('${p.id}')">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <span class="rank-badge ${rankBadgeClass}">#${p.rank}</span>
              <div class="player-avatar">${renderAvatar(p.avatar, p.name)}</div>
              <div>
                <div class="player-name">${escapeHTML(p.name)}</div>
                <span class="tier-pill ${rankInfo.class}">${rankInfo.full}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="card-stat-val" style="font-size: 1.1rem;">${p.elo} ELO</div>
              <span class="group-tag" style="margin-top: 2px;">${p.group || 'Group A'}</span>
            </div>
          </div>
          <div class="card-stats-grid">
            <div>
              <div class="card-stat-val" style="color: #10b981;">${p.wins}W - ${p.losses}L</div>
              <div class="card-stat-lbl">Record (${winRate}%)</div>
            </div>
            <div>
              <div class="card-stat-val">🔥 ${p.streak}</div>
              <div class="card-stat-lbl">Win Streak</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function getTierProgress(elo) {
    if (elo >= 2000) return { percent: 100, nextTier: 'Max Rank (Champion)', remaining: 0 };
    if (elo >= 1600) return { percent: Math.min(100, Math.round(((elo - 1600) / 400) * 100)), nextTier: 'Champion (2000)', remaining: 2000 - elo };
    if (elo >= 1300) return { percent: Math.min(100, Math.round(((elo - 1300) / 300) * 100)), nextTier: 'Grandmaster (1600)', remaining: 1600 - elo };
    if (elo >= 1000) return { percent: Math.min(100, Math.round(((elo - 1000) / 300) * 100)), nextTier: 'Master (1300)', remaining: 1300 - elo };
    if (elo >= 700) return { percent: Math.min(100, Math.round(((elo - 700) / 300) * 100)), nextTier: 'Diamond (1000)', remaining: 1000 - elo };
    if (elo >= 400) return { percent: Math.min(100, Math.round(((elo - 400) / 300) * 100)), nextTier: 'Platinum (700)', remaining: 700 - elo };
    if (elo >= 200) return { percent: Math.min(100, Math.round(((elo - 200) / 200) * 100)), nextTier: 'Gold (400)', remaining: 400 - elo };
    return { percent: Math.min(100, Math.round((elo / 200) * 100)), nextTier: 'Silver (200)', remaining: 200 - elo };
  }

  function openPlayerModal(playerId) {
    SoundFX.playClick();
    const players = DataStore.getPlayersByTournament(activeTourneyId);
    const p = players.find(x => x.id === playerId);
    if (!p) return;

    const modal = document.getElementById('player-modal');
    const content = document.getElementById('player-modal-content');
    if (!modal || !content) return;

    const winRate = ((p.wins / (p.wins + p.losses || 1)) * 100).toFixed(1);
    const rankInfo = DataStore.getRankFromElo(p.elo);
    const progress = getTierProgress(p.elo);
    const formHtml = (p.recentForm || ['W', 'W', 'L']).map(r => `
      <span class="form-badge form-${r.toLowerCase()}" style="font-size: 0.85rem; padding: 4px 10px;">${r}</span>
    `).join('');

    const modalAvatarHtml = (p.avatar && (p.avatar.startsWith('data:') || p.avatar.startsWith('http')))
      ? `<div style="width: 72px; height: 72px; margin: 0 auto 0.5rem auto; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary-gold);"><img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover;" alt="${escapeHTML(p.name)}"></div>`
      : `<div style="font-size: 3.5rem; margin-bottom: 0.4rem; filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4));">${p.avatar || '🛡️'}</div>`;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        ${modalAvatarHtml}
        <h2 style="font-size: 1.8rem; color: var(--primary-gold); font-weight: 900;">${escapeHTML(p.name)}</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; font-family: monospace;">${escapeHTML(p.battleTag)} • <strong>${p.group || 'Group A'}</strong></p>
        <div style="margin-top: 0.6rem;"><span class="tier-pill ${rankInfo.class}" style="font-size: 0.9rem; padding: 4px 14px;">${rankInfo.full}</span></div>
      </div>

      <!-- Quick Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(0,0,0,0.4); padding: 0.9rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(245, 158, 11, 0.3);">
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary-gold);">${p.elo}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Current ELO</div>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 0.9rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(16, 185, 129, 0.3);">
          <div style="font-size: 1.6rem; font-weight: 900; color: #10b981;">#${p.rank}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Tournament Rank</div>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 0.9rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(6, 182, 212, 0.3);">
          <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-cyan);">${winRate}%</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Win Rate</div>
        </div>
      </div>

      <!-- Rank Progression Bar -->
      <div style="background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: var(--radius-md); margin-bottom: 1.2rem; border: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.4rem;">
          <span style="color: var(--text-muted); font-weight: 600;">Rank Progression</span>
          <span style="color: var(--primary-gold); font-weight: 700;">${progress.remaining > 0 ? `${progress.remaining} ELO to ${progress.nextTier}` : 'Max Tier Reached'}</span>
        </div>
        <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
          <div style="width: ${progress.percent}%; height: 100%; background: linear-gradient(90deg, var(--primary-amber), var(--primary-gold)); transition: width 0.5s ease;"></div>
        </div>
      </div>

      <!-- Match Breakdown & Recent Form -->
      <div style="background: rgba(0,0,0,0.3); padding: 1.2rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
          <span style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Recent Match Form:</span>
          <div style="display: flex; gap: 0.4rem;">${formHtml}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.8rem;">
          <div>🔥 <strong>Win Streak:</strong> ${p.streak} Matches</div>
          <div>⚔️ <strong>Total Matches:</strong> ${p.wins + p.losses}</div>
          <div>✅ <strong>Victories:</strong> ${p.wins}</div>
          <div>❌ <strong>Defeats:</strong> ${p.losses}</div>
        </div>
      </div>

      <div style="display: flex; gap: 0.8rem;">
        <button class="btn btn-primary" style="flex: 1;" onclick="App.launchSimulatorDuel('${p.id}')">⚔️ Challenge in 1v1 Arena</button>
        <button class="btn btn-secondary modal-cancel" onclick="App.closeModals()">Close</button>
      </div>
    `;

    modal.classList.add('active');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  const lbInstance = {
    init,
    setTourney,
    setSearch,
    setTier,
    toggleSort,
    render,
    openPlayerModal
  };

  if (typeof window !== 'undefined') {
    window.Leaderboard = lbInstance;
  }

  return lbInstance;
})();

if (typeof window !== 'undefined') {
  window.Leaderboard = Leaderboard;
}
