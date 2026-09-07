/* REIN 1V1 - DEV Admin Management Module */
const AdminPage = (function() {
  let activeTourneyId = 'tourney-1';
  let editingPlayerId = null;

  function init(tourneyId) {
    activeTourneyId = tourneyId || 'tourney-1';
    render();
  }

  function setTourney(tourneyId) {
    activeTourneyId = tourneyId;
    render();
  }

  function render() {
    const adminPanel = document.getElementById('admin-panel-content');
    const devLockView = document.getElementById('admin-lock-view');

    if (!Auth.isAdmin()) {
      if (adminPanel) adminPanel.style.display = 'none';
      if (devLockView) devLockView.style.display = 'block';
      return;
    }

    if (devLockView) devLockView.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    renderAdminPlayerTable();
    populateTourneySelects();
  }

  function renderAdminAvatar(avatar, altName = 'Player') {
    if (!avatar) return '🛡️';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
      return `<img src="${avatar}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; vertical-align: middle; display: inline-block;" alt="${escapeHTML(altName)}">`;
    }
    return avatar;
  }

  function renderAdminPlayerTable() {
    const tableBody = document.getElementById('admin-player-table-body');
    if (!tableBody) return;

    const players = DataStore.getPlayersByTournament(activeTourneyId);

    if (players.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No competitors registered in this tournament yet. Click "Assign Competitor" or "Add Player" above to build the roster.</td></tr>`;
      return;
    }

    tableBody.innerHTML = players.map(p => {
      const rankInfo = DataStore.getRankFromElo(p.elo);
      return `
        <tr>
          <td><strong>#${p.rank}</strong></td>
          <td>
            <div class="player-cell">
              <span>${renderAdminAvatar(p.avatar, p.name)}</span>
              <div>
                <div class="player-name">${escapeHTML(p.name)}</div>
                <div class="player-tag">${escapeHTML(p.battleTag)} <span class="group-tag">${p.group || 'Group A'}</span> (${p.lives !== undefined ? p.lives : 2} Lives)</div>
              </div>
            </div>
          </td>
          <td><span class="tier-pill ${rankInfo.class}">${rankInfo.full}</span></td>
          <td><strong style="color: var(--primary-gold); font-size: 1.05rem;">${p.elo} ELO</strong></td>
          <td>${p.wins}W / ${p.losses}L (🔥 ${p.streak || 0})</td>
          <td>
            <div class="admin-table-actions">
              <button class="btn btn-secondary btn-icon" onclick="AdminPage.movePlayer('${p.id}', 'up')" title="Move Up Rank"><i class="lucide-arrow-up">▲</i></button>
              <button class="btn btn-secondary btn-icon" onclick="AdminPage.movePlayer('${p.id}', 'down')" title="Move Down Rank"><i class="lucide-arrow-down">▼</i></button>
              <button class="btn btn-secondary btn-icon" onclick="AdminPage.promptSetRank('${p.id}', ${p.rank})" title="Set Rank Position"><i class="lucide-hash">#</i></button>
            </div>
          </td>
          <td>
            <div class="admin-table-actions">
              <button class="btn btn-dev btn-sm" onclick="AdminPage.openEditModal('${p.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="AdminPage.confirmDelete('${p.id}', '${escapeHTML(p.name)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function populateTourneySelects() {
    const tourneys = DataStore.getTournaments();
    const selects = ['admin-tourney-select', 'add-player-tourney', 'edit-player-tourney', 'assign-tourney-select'];

    selects.forEach(id => {
      const elem = document.getElementById(id);
      if (elem) {
        elem.innerHTML = tourneys.map(t => `
          <option value="${t.id}" ${t.id === activeTourneyId ? 'selected' : ''}>${escapeHTML(t.name)} (${t.status})</option>
        `).join('');
      }
    });
  }

  function openRecordMatchModal() {
    SoundFX.playClick();
    const players = DataStore.getPlayersByTournament(activeTourneyId);
    const p1Select = document.getElementById('match-p1-select');
    const p2Select = document.getElementById('match-p2-select');

    if (!p1Select || !p2Select) return;

    if (players.length < 2) {
      App.showToast('At least 2 players are required in this tournament to record a match.', 'error');
      return;
    }

    const options = players.map(p => `
      <option value="${p.id}">${escapeHTML(p.name)} (${p.elo} ELO, ${p.tier})</option>
    `).join('');

    p1Select.innerHTML = options;
    p2Select.innerHTML = options;
    p2Select.selectedIndex = 1;

    previewEloImpact();

    const modal = document.getElementById('record-match-modal');
    if (modal) modal.classList.add('active');
  }

  function openRecordMatchWithPlayers(p1Name, p2Name) {
    SoundFX.playClick();
    const players = DataStore.getPlayersByTournament(activeTourneyId);
    const p1 = players.find(p => p.name === p1Name);
    const p2 = players.find(p => p.name === p2Name);

    openRecordMatchModal();

    if (p1 && p2) {
      const p1Select = document.getElementById('match-p1-select');
      const p2Select = document.getElementById('match-p2-select');
      if (p1Select && p2Select) {
        p1Select.value = p1.id;
        p2Select.value = p2.id;
        previewEloImpact();
      }
    }
  }

  function previewEloImpact() {
    const p1Select = document.getElementById('match-p1-select');
    const p2Select = document.getElementById('match-p2-select');
    const roundsP1Input = document.getElementById('match-p1-rounds');
    const roundsP2Input = document.getElementById('match-p2-rounds');
    const previewBox = document.getElementById('match-elo-preview');

    if (!p1Select || !p2Select || !roundsP1Input || !roundsP2Input || !previewBox) return;

    const players = DataStore.getPlayersByTournament(activeTourneyId);
    const p1 = players.find(x => x.id === p1Select.value);
    const p2 = players.find(x => x.id === p2Select.value);
    const r1 = parseInt(roundsP1Input.value) || 0;
    const r2 = parseInt(roundsP2Input.value) || 0;

    if (!p1 || !p2 || p1.id === p2.id) {
      previewBox.innerHTML = `<span style="color: #ef4444;">Select 2 distinct competitors to preview dynamic ELO.</span>`;
      return;
    }

    const p1Change = DataStore.calculateRoundBasedEloChange(p1.elo, p2.elo, r1, r2);
    const p2Change = DataStore.calculateRoundBasedEloChange(p2.elo, p1.elo, r2, r1);

    previewBox.innerHTML = `
      <div style="font-size: 0.85rem; line-height: 1.5;">
        <div style="margin-bottom: 0.4rem;">
          <strong>${escapeHTML(p1.name)}</strong> (${p1.elo} ELO): <span style="color: ${p1Change > 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">➡️ ${Math.max(0, p1.elo + p1Change)} (${p1Change > 0 ? '+' : ''}${p1Change} ELO)</span>
        </div>
        <div>
          <strong>${escapeHTML(p2.name)}</strong> (${p2.elo} ELO): <span style="color: ${p2Change > 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">➡️ ${Math.max(0, p2.elo + p2Change)} (${p2Change > 0 ? '+' : ''}${p2Change} ELO)</span>
        </div>
      </div>
    `;
  }

  async function handleRecordMatchSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const p1Select = document.getElementById('match-p1-select');
    const p2Select = document.getElementById('match-p2-select');
    const r1Input = document.getElementById('match-p1-rounds');
    const r2Input = document.getElementById('match-p2-rounds');

    const p1Id = p1Select ? p1Select.value : '';
    const p2Id = p2Select ? p2Select.value : '';
    const r1 = r1Input ? parseInt(r1Input.value) : 0;
    const r2 = r2Input ? parseInt(r2Input.value) : 0;

    if (p1Id === p2Id) {
      if (btn) btn.classList.remove('btn-loading');
      App.showToast('Cannot record a match between the same competitor.', 'error');
      return;
    }

    const result = await DataStore.recordRoundMatchResult(p1Id, p2Id, r1, r2, activeTourneyId);
    if (btn) btn.classList.remove('btn-loading');
    if (result) {
      SoundFX.playShatter();
      App.closeModals();
      renderAdminPlayerTable();
      Leaderboard.render();
      App.renderTournamentsView();
      App.showToast(`Match Recorded (${r1}-${r2})! Synced to MongoDB Atlas.`, 'success');
    }
  }

  async function generateRandomDemoMatch() {
    SoundFX.playClick();
    const players = DataStore.getPlayersByTournament(activeTourneyId);
    if (players.length < 2) {
      App.showToast('Need at least 2 competitors to simulate a match', 'error');
      return;
    }

    const idx1 = Math.floor(Math.random() * players.length);
    let idx2 = Math.floor(Math.random() * players.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * players.length);
    }

    const p1 = players[idx1];
    const p2 = players[idx2];
    const sim = DataStore.simulateMatch(p1.id, p2.id, 10);
    if (sim) {
      await DataStore.recordRoundMatchResult(p1.id, p2.id, sim.scoreP1, sim.scoreP2, activeTourneyId);
      SoundFX.playShatter();
      renderAdminPlayerTable();
      Leaderboard.render();
      App.renderTournamentsView();
      App.showToast(`Simulated Match: ${p1.name} vs ${p2.name} ➡️ Final: ${sim.scoreP1} - ${sim.scoreP2}! Winner: ${sim.winnerName} 👑`, 'success');
    }
  }

  function openGroupStageModal() {
    SoundFX.playClick();
    const modal = document.getElementById('group-stage-modal');
    if (modal) modal.classList.add('active');
  }

  async function handleGenerateGroupStageSubmit(e) {
    e.preventDefault();
    const inputEl = document.getElementById('group-stage-teams-input');
    const count = inputEl ? (parseInt(inputEl.value) || 16) : 16;
    
    const numGroups = await DataStore.generateGroupStage(activeTourneyId, count);
    SoundFX.playSuccess();
    App.closeModals();
    renderAdminPlayerTable();
    Leaderboard.render();
    App.renderTournamentsView();
    App.showToast(`Group Stage generated! ${count} competitors balanced into ${numGroups} groups in MongoDB Atlas.`, 'success');
  }

  async function movePlayer(playerId, direction) {
    SoundFX.playClick();
    await DataStore.movePlayerRank(playerId, direction);
    renderAdminPlayerTable();
    Leaderboard.render();
  }

  async function promptSetRank(playerId, currentRank) {
    SoundFX.playClick();
    const newPos = prompt(`Set new position / place for competitor (Current: #${currentRank}):`, currentRank);
    if (newPos && !isNaN(newPos)) {
      await DataStore.setPlayerPosition(playerId, parseInt(newPos));
      renderAdminPlayerTable();
      Leaderboard.render();
      App.showToast(`Competitor position changed to #${newPos}!`, 'success');
    }
  }

  // --- Assign Global Player to Specific Tournament ---
  function openAssignPlayerModal() {
    SoundFX.playClick();
    populateTourneySelects();
    populateAssignPlayerOptions('');
    const searchInput = document.getElementById('assign-player-search');
    if (searchInput) searchInput.value = '';

    const modal = document.getElementById('assign-player-modal');
    if (modal) modal.classList.add('active');
  }

  function filterAssignPlayerList(query) {
    populateAssignPlayerOptions(query);
  }

  function populateAssignPlayerOptions(query = '') {
    const select = document.getElementById('assign-player-select');
    if (!select) return;

    const allPlayers = DataStore.getGlobalPlayers();
    const cleanQuery = query.toLowerCase().trim();

    const filtered = allPlayers.filter(p => 
      !cleanQuery || 
      p.name.toLowerCase().includes(cleanQuery) || 
      (p.battleTag && p.battleTag.toLowerCase().includes(cleanQuery))
    );

    if (filtered.length === 0) {
      select.innerHTML = `<option disabled>No matching players found in system</option>`;
      return;
    }

    select.innerHTML = filtered.map((p, idx) => `
      <option value="${p.id}" ${idx === 0 ? 'selected' : ''}>${p.avatar || '🛡️'} ${escapeHTML(p.name)} (${p.elo} ELO, ${p.tier || 'Gold'})</option>
    `).join('');
  }

  async function handleAssignPlayerSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const playerSelect = document.getElementById('assign-player-select');
    const tourneySelect = document.getElementById('assign-tourney-select');
    const groupInput = document.getElementById('assign-player-group');

    const playerId = playerSelect ? playerSelect.value : '';
    const tourneyId = tourneySelect ? tourneySelect.value : activeTourneyId;
    const group = groupInput ? (groupInput.value.trim() || 'Group A') : 'Group A';

    if (!playerId) {
      if (btn) btn.classList.remove('btn-loading');
      App.showToast('Please select a player to assign.', 'error');
      return;
    }

    const assigned = await DataStore.assignPlayerToTournament(playerId, tourneyId, group);
    if (btn) btn.classList.remove('btn-loading');

    if (assigned) {
      SoundFX.playSuccess();
      App.closeModals();
      setTourney(tourneyId);
      renderAdminPlayerTable();
      Leaderboard.render();
      App.renderTournamentsView();
      App.showToast(`Player "${assigned.name}" assigned to ${tourneyId} (${group})!`, 'success');
    } else {
      App.showToast('Failed to assign player.', 'error');
    }
  }

  // --- Add Global Player to System ---
  function openAddPlayerModal() {
    SoundFX.playClick();
    const form = document.getElementById('add-player-form');
    if (form) form.reset();
    populateTourneySelects();
    const modal = document.getElementById('add-player-modal');
    if (modal) modal.classList.add('active');
  }

  async function handleAddPlayerSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const nameEl = document.getElementById('add-player-name');
    const btagEl = document.getElementById('add-player-btag');
    const tourneyEl = document.getElementById('add-player-tourney');
    const eloEl = document.getElementById('add-player-elo');
    const winsEl = document.getElementById('add-player-wins');
    const lossesEl = document.getElementById('add-player-losses');
    const avatarEl = document.getElementById('add-player-avatar');
    const groupEl = document.getElementById('add-player-group');

    const name = nameEl ? nameEl.value.trim() : '';
    const battleTag = btagEl ? btagEl.value.trim() : '';
    const tourneyId = tourneyEl ? tourneyEl.value : activeTourneyId;
    const elo = eloEl ? (parseInt(eloEl.value) || 500) : 500;
    const wins = winsEl ? (parseInt(winsEl.value) || 0) : 0;
    const losses = lossesEl ? (parseInt(lossesEl.value) || 0) : 0;
    const avatar = avatarEl ? avatarEl.value : '🛡️';
    const group = groupEl ? (groupEl.value.trim() || 'Group A') : 'Group A';

    if (!name) {
      if (btn) btn.classList.remove('btn-loading');
      App.showToast('Please enter competitor name', 'error');
      return;
    }

    await DataStore.addPlayer({
      name, battleTag, tourneyId, elo, wins, losses, streak: 0, avatar, group
    });

    if (btn) btn.classList.remove('btn-loading');
    SoundFX.playSuccess();
    App.closeModals();
    renderAdminPlayerTable();
    Leaderboard.render();
    App.showToast(`Competitor "${name}" saved & synced to MongoDB Atlas!`, 'success');
  }

  // --- Edit Player Details ---
  function openEditModal(playerId) {
    SoundFX.playClick();
    editingPlayerId = playerId;
    const players = DataStore.getPlayersByTournament(activeTourneyId);
    const p = players.find(x => x.id === playerId) || DataStore.getGlobalPlayers().find(x => x.id === playerId);
    if (!p) return;

    populateTourneySelects();
    const idEl = document.getElementById('edit-player-id');
    const nameEl = document.getElementById('edit-player-name');
    const btagEl = document.getElementById('edit-player-btag');
    const tourneyEl = document.getElementById('edit-player-tourney');
    const eloEl = document.getElementById('edit-player-elo');
    const winsEl = document.getElementById('edit-player-wins');
    const lossesEl = document.getElementById('edit-player-losses');
    const streakEl = document.getElementById('edit-player-streak');
    const livesEl = document.getElementById('edit-player-lives');
    const avatarEl = document.getElementById('edit-player-avatar');
    const groupEl = document.getElementById('edit-player-group');

    if (idEl) idEl.value = p.id;
    if (nameEl) nameEl.value = p.name;
    if (btagEl) btagEl.value = p.battleTag;
    if (tourneyEl) tourneyEl.value = p.tourneyId;
    if (eloEl) eloEl.value = p.elo;
    if (winsEl) winsEl.value = p.wins;
    if (lossesEl) lossesEl.value = p.losses;
    if (streakEl) streakEl.value = p.streak || 0;
    if (livesEl) livesEl.value = p.lives !== undefined ? p.lives : 2;
    if (avatarEl) avatarEl.value = p.avatar || '🛡️';
    if (groupEl) groupEl.value = p.group || 'Group A';

    const modal = document.getElementById('edit-player-modal');
    if (modal) modal.classList.add('active');
  }

  async function handleEditPlayerSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const idEl = document.getElementById('edit-player-id');
    const nameEl = document.getElementById('edit-player-name');
    const btagEl = document.getElementById('edit-player-btag');
    const tourneyEl = document.getElementById('edit-player-tourney');
    const eloEl = document.getElementById('edit-player-elo');
    const winsEl = document.getElementById('edit-player-wins');
    const lossesEl = document.getElementById('edit-player-losses');
    const streakEl = document.getElementById('edit-player-streak');
    const livesEl = document.getElementById('edit-player-lives');
    const avatarEl = document.getElementById('edit-player-avatar');
    const groupEl = document.getElementById('edit-player-group');

    const id = idEl ? idEl.value : '';
    const name = nameEl ? nameEl.value.trim() : '';
    const battleTag = btagEl ? btagEl.value.trim() : '';
    const tourneyId = tourneyEl ? tourneyEl.value : activeTourneyId;
    const elo = eloEl ? (parseInt(eloEl.value) || 500) : 500;
    const wins = winsEl ? (parseInt(winsEl.value) || 0) : 0;
    const losses = lossesEl ? (parseInt(lossesEl.value) || 0) : 0;
    const streak = streakEl ? (parseInt(streakEl.value) || 0) : 0;
    const lives = livesEl ? (parseInt(livesEl.value) || 2) : 2;
    const avatar = avatarEl ? avatarEl.value : '🛡️';
    const group = groupEl ? (groupEl.value.trim() || 'Group A') : 'Group A';

    if (!id || !name) {
      if (btn) btn.classList.remove('btn-loading');
      App.showToast('Please provide valid competitor details', 'error');
      return;
    }

    await DataStore.updatePlayer(id, {
      name, battleTag, tourneyId, elo, wins, losses, streak, lives, avatar, group
    });

    if (btn) btn.classList.remove('btn-loading');
    SoundFX.playSuccess();
    App.closeModals();
    renderAdminPlayerTable();
    Leaderboard.render();
    App.showToast(`Updated "${name}" & synced to MongoDB Atlas!`, 'success');
  }

  async function confirmDelete(playerId, playerName) {
    SoundFX.playAlert();
    if (confirm(`Are you sure you want to remove "${playerName}" from the tournament?`)) {
      await DataStore.deletePlayer(playerId);
      renderAdminPlayerTable();
      Leaderboard.render();
      App.showToast(`Removed competitor "${playerName}".`, 'info');
    }
  }

  async function handleDevLockSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const codeEl = document.getElementById('dev-passcode-input');
    const code = codeEl ? codeEl.value : '';

    const res = await Auth.devPasscodeLogin(code);
    if (btn) btn.classList.remove('btn-loading');

    if (res && res.success) {
      SoundFX.playRankUp();
      App.updateAuthUI();
      render();
      App.showToast('DEV Admin Mode Activated!', 'success');
    } else {
      SoundFX.playAlert();
      App.showToast('Invalid DEV Passcode.', 'error');
    }
  }

  async function resetDatabase() {
    SoundFX.playAlert();
    if (confirm('Reset entire tournament database to default official championship data in MongoDB Atlas?')) {
      await DataStore.resetToDefaultData();
      SoundFX.playSuccess();
      renderAdminPlayerTable();
      Leaderboard.render();
      App.populateTourneyDropdowns();
      App.renderTournamentsView();
      App.showToast('Database reset to official default state in MongoDB Atlas.', 'success');
    }
  }

  function exportData() {
    SoundFX.playClick();
    const jsonStr = DataStore.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rein1v1_mongodb_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Database exported to JSON!', 'success');
  }

  function importData() {
    SoundFX.playClick();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async event => {
        if (await DataStore.importJSON(event.target.result)) {
          SoundFX.playSuccess();
          renderAdminPlayerTable();
          Leaderboard.render();
          App.populateTourneyDropdowns();
          App.renderTournamentsView();
          App.showToast('Database restored successfully to MongoDB Atlas!', 'success');
        } else {
          SoundFX.playAlert();
          App.showToast('Invalid database JSON format', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function openAddTourneyModal() {
    SoundFX.playClick();
    const modal = document.getElementById('add-tourney-modal');
    if (modal) modal.classList.add('active');
  }

  async function handleAddTourneySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.classList.add('btn-loading');

    const nameEl = document.getElementById('add-tourney-name');
    const prizeEl = document.getElementById('add-tourney-prize');
    const statusEl = document.getElementById('add-tourney-status');
    const teamsEl = document.getElementById('add-tourney-teams');

    const name = nameEl ? nameEl.value.trim() : '';
    const prize = prizeEl ? prizeEl.value.trim() : '$0';
    const status = statusEl ? statusEl.value : 'Live';
    const teamCount = teamsEl ? teamsEl.value : 8;

    if (!name) {
      if (btn) btn.classList.remove('btn-loading');
      App.showToast('Tournament name is required', 'error');
      return;
    }

    await DataStore.addTournament(name, prize, status, teamCount);
    if (btn) btn.classList.remove('btn-loading');
    SoundFX.playSuccess();
    App.closeModals();
    populateTourneySelects();
    App.populateTourneyDropdowns();
    App.renderTournamentsView();
    App.showToast(`Tournament "${name}" created & saved to MongoDB Atlas!`, 'success');
  }

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  const adminInstance = {
    init,
    setTourney,
    render,
    movePlayer,
    promptSetRank,
    openAddPlayerModal,
    handleAddPlayerSubmit,
    openAssignPlayerModal,
    filterAssignPlayerList,
    handleAssignPlayerSubmit,
    openEditModal,
    handleEditPlayerSubmit,
    confirmDelete,
    handleDevLockSubmit,
    generateRandomDemoMatch,
    resetDatabase,
    exportData,
    importData,
    openAddTourneyModal,
    handleAddTourneySubmit,
    openRecordMatchModal,
    openRecordMatchWithPlayers,
    previewEloImpact,
    handleRecordMatchSubmit,
    openGroupStageModal,
    handleGenerateGroupStageSubmit
  };

  if (typeof window !== 'undefined') {
    window.AdminPage = adminInstance;
  }

  return adminInstance;
})();

if (typeof window !== 'undefined') {
  window.AdminPage = AdminPage;
}
