/* REIN 1V1 - Main Application Controller & Cloud Sync Controller */
const App = (function() {
  let activeTab = 'leaderboard';
  let activeTourneyId = 'all';
  let viewingTourneyId = null; // null = List view, string = Dedicated single tournament view
  let initialized = false;

  async function init() {
    if (initialized) return;
    initialized = true;

    populateTourneyDropdowns();
    setupEventListeners();
    updateAuthUI();

    Leaderboard.init(activeTourneyId);
    AdminPage.init(activeTourneyId);

    renderMatches();
    renderTournamentsView();

    // Listen to real-time Cloud Sync state changes
    DataStore.onSyncChange(updateSyncUI);
    DataStore.onDataChange(() => {
      populateTourneyDropdowns();
      Leaderboard.render();
      renderMatches();
      renderTournamentsView();
      AdminPage.render();
    });

    // Initialize MongoDB Atlas Cloud Sync
    await DataStore.initCloudSync();
  }

  function updateSyncUI(status) {
    const badge = document.getElementById('cloud-sync-badge');
    if (!badge) return;

    badge.className = `sync-badge ${status}`;
    if (status === 'syncing') {
      badge.innerHTML = '🔄 Syncing MongoDB...';
    } else if (status === 'synced') {
      badge.innerHTML = '🟢 Cloud Synced';
    } else if (status === 'offline') {
      badge.innerHTML = '⚠️ Local Cache';
    }
  }

  async function triggerCloudSync() {
    SoundFX.playClick();
    showToast('Syncing database with MongoDB Atlas...', 'info');
    const success = await DataStore.initCloudSync();
    if (success) {
      SoundFX.playSuccess();
      showToast('MongoDB Atlas database synchronized!', 'success');
    } else {
      showToast('Database operating in cached mode.', 'info');
    }
  }

  function populateTourneyDropdowns() {
    const tourneys = DataStore.getTournaments();
    
    const mainSelect = document.getElementById('tourney-select-main');
    if (mainSelect) {
      const currentVal = mainSelect.value || activeTourneyId || 'all';
      mainSelect.innerHTML = `
        <option value="all" ${currentVal === 'all' ? 'selected' : ''}>🌐 Global Standings (All Players)</option>
        ${tourneys.map(t => `
          <option value="${t.id}" ${t.id === currentVal ? 'selected' : ''}>${escapeHTML(t.name)} (${t.status})</option>
        `).join('')}
      `;
    }

    const matchSelect = document.getElementById('matches-tourney-select');
    if (matchSelect) {
      matchSelect.innerHTML = tourneys.map(t => `
        <option value="${t.id}" ${t.id === activeTourneyId ? 'selected' : ''}>${escapeHTML(t.name)} (${t.status})</option>
      `).join('');
    }
  }

  function switchTab(tabName) {
    SoundFX.playClick();
    activeTab = tabName;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabName);
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabName);
    });

    document.querySelectorAll('.view-panel').forEach(el => {
      el.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    if (tabName === 'leaderboard') {
      Leaderboard.render();
    } else if (tabName === 'admin') {
      AdminPage.render();
    } else if (tabName === 'matches') {
      renderMatches();
    } else if (tabName === 'tournaments') {
      viewingTourneyId = null;
      renderTournamentsView();
    }
  }

  function onTourneyChange(tourneyId) {
    SoundFX.playClick();
    activeTourneyId = tourneyId;
    Leaderboard.setTourney(tourneyId);
    AdminPage.setTourney(tourneyId);
    renderMatches();
  }

  function setupEventListeners() {
    document.querySelectorAll('[data-tab]').forEach(elem => {
      elem.onclick = (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab) switchTab(tab);
      };
    });

    const tourneySelect = document.getElementById('tourney-select-main');
    if (tourneySelect) {
      tourneySelect.onchange = (e) => {
        onTourneyChange(e.target.value);
      };
    }

    const searchInput = document.getElementById('lb-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        Leaderboard.setSearch(e.target.value);
      };
    }

    const tierFilter = document.getElementById('lb-tier-filter');
    if (tierFilter) {
      tierFilter.onchange = (e) => {
        Leaderboard.setTier(e.target.value);
      };
    }

    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const userEl = document.getElementById('login-username') || document.getElementById('login-email') || document.getElementById('login-user');
        const passEl = document.getElementById('login-pass') || document.getElementById('login-password');
        
        const username = userEl ? userEl.value.trim() : '';
        const pass = passEl ? passEl.value : '';

        if (!username || !pass) {
          showToast('Please enter your Username and Password', 'error');
          return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.classList.add('btn-loading');

        const res = await Auth.login(username, pass);
        if (submitBtn) submitBtn.classList.remove('btn-loading');

        if (res.success) {
          SoundFX.playSuccess();
          updateAuthUI();
          closeModals();
          showToast(`Welcome back, ${res.user.username}!`, 'success');
          if (res.user.isAdmin) switchTab('admin');
        } else {
          SoundFX.playAlert();
          showToast(res.message || 'Login failed', 'error');
        }
      };
    }

    // Sign Up Form Submit
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.onsubmit = async (e) => {
        e.preventDefault();
        const nameEl = document.getElementById('signup-name') || document.getElementById('signup-username');
        const passEl = document.getElementById('signup-pass') || document.getElementById('signup-password');
        const discordEl = document.getElementById('signup-discord');
        const avatarEl = document.getElementById('signup-avatar');

        const uname = nameEl ? nameEl.value.trim() : '';
        const pass = passEl ? passEl.value : '';
        const discordId = discordEl ? discordEl.value.trim() : '';
        
        if (!uname || !pass) {
          showToast('Username and Password are required', 'error');
          return;
        }

        const avatarToUse = (signupAvatarData && signupAvatarData.avatar) 
          ? signupAvatarData.avatar 
          : (avatarEl ? avatarEl.value : '🛡️');
        const avatarTypeToUse = (signupAvatarData && signupAvatarData.avatarType)
          ? signupAvatarData.avatarType
          : (avatarToUse.startsWith('data:') ? 'image' : 'emoji');

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.classList.add('btn-loading');

        const res = await Auth.signup({
          username: uname,
          password: pass,
          discordId: discordId,
          avatar: avatarToUse,
          avatarType: avatarTypeToUse
        });

        if (submitBtn) submitBtn.classList.remove('btn-loading');

        if (res.success) {
          SoundFX.playSuccess();
          updateAuthUI();
          closeModals();
          showToast(`Account registered! Welcome to the Arena, ${res.user.username}.`, 'success');
        } else {
          SoundFX.playAlert();
          showToast(res.message || 'Registration failed', 'error');
        }
      };
    }

    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.onclick = closeModals;
    });

    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.onclick = () => {
        const enabled = SoundFX.toggleSound();
        soundBtn.innerHTML = enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        showToast(enabled ? 'Sound FX Enabled' : 'Sound FX Muted', 'info');
      };
    }
  }

  let signupAvatarData = null;
  let accountAvatarData = null;

  function togglePassword(inputId, btnElem) {
    let input = null;
    if (typeof inputId === 'string' && inputId) {
      input = document.getElementById(inputId);
    }
    if (!input && btnElem) {
      input = btnElem.previousElementSibling || btnElem.parentElement.querySelector('input');
    }
    if (!input && typeof inputId === 'string') {
      if (inputId.includes('signup')) input = document.getElementById('signup-pass');
      if (inputId.includes('login')) input = document.getElementById('login-pass');
    }
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (btnElem) btnElem.textContent = '🔒';
    } else {
      input.type = 'password';
      if (btnElem) btnElem.textContent = '👁️';
    }
  }

  function handleAvatarSelect(valOrEvent) {
    let emoji = '🛡️';
    if (typeof valOrEvent === 'string') {
      emoji = valOrEvent;
    } else if (valOrEvent && valOrEvent.target) {
      emoji = valOrEvent.target.value;
    }
    onSignupEmojiChange(emoji);
  }

  function onSignupEmojiChange(emoji) {
    signupAvatarData = { avatar: emoji, avatarType: 'emoji' };
    const box = document.getElementById('signup-avatar-preview-box');
    if (box) box.innerHTML = emoji;
    const status = document.getElementById('signup-file-status');
    if (status) status.textContent = 'Selected emoji avatar';
  }

  function onAccountEmojiChange(emoji) {
    accountAvatarData = { avatar: emoji, avatarType: 'emoji' };
    const box = document.getElementById('account-avatar-preview-box');
    if (box) box.innerHTML = emoji;
  }

  function handleAvatarFileSelect(event, previewBoxId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file too large (max 2MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      const previewBox = document.getElementById(previewBoxId);
      if (previewBox) {
        previewBox.innerHTML = `<img src="${dataUrl}" class="user-avatar-img" alt="avatar">`;
      }
      if (previewBoxId === 'signup-avatar-preview-box') {
        signupAvatarData = { avatar: dataUrl, avatarType: 'image' };
        const status = document.getElementById('signup-file-status');
        if (status) status.textContent = `Custom: ${file.name.substring(0, 15)}...`;
      } else if (previewBoxId === 'account-avatar-preview-box') {
        accountAvatarData = { avatar: dataUrl, avatarType: 'image' };
      }
    };
    reader.readAsDataURL(file);
  }

  function resetAccountAvatarToEmoji() {
    const select = document.getElementById('account-avatar-select');
    const emoji = select ? select.value : '🛡️';
    accountAvatarData = { avatar: emoji, avatarType: 'emoji' };
    const previewBox = document.getElementById('account-avatar-preview-box');
    if (previewBox) previewBox.innerHTML = emoji;
    const fileInput = document.getElementById('account-avatar-file');
    if (fileInput) fileInput.value = '';
    showToast('Reset to default emoji avatar', 'info');
  }

  function openAccountModal() {
    SoundFX.playClick();
    const user = Auth.getCurrentUser();
    if (!user) {
      openAuthModal('login');
      return;
    }

    const modal = document.getElementById('account-modal');
    const nameEl = document.getElementById('account-profile-username');
    const roleEl = document.getElementById('account-profile-role');
    const discordInput = document.getElementById('account-discord-input');
    const previewBox = document.getElementById('account-avatar-preview-box');
    const emojiSelect = document.getElementById('account-avatar-select');

    if (nameEl) nameEl.textContent = user.username;
    if (roleEl) {
      roleEl.className = user.isAdmin ? 'user-badge-dev' : 'user-badge-player';
      roleEl.textContent = user.isAdmin ? 'DEV ADMIN' : 'PLAYER';
    }
    if (discordInput) discordInput.value = user.discordId || '';
    
    accountAvatarData = {
      avatar: user.avatar || '🛡️',
      avatarType: user.avatarType || (user.avatar && user.avatar.startsWith('data:') ? 'image' : 'emoji')
    };

    if (previewBox) {
      if (accountAvatarData.avatarType === 'image') {
        previewBox.innerHTML = `<img src="${accountAvatarData.avatar}" class="user-avatar-img" alt="avatar">`;
      } else {
        previewBox.innerHTML = accountAvatarData.avatar;
      }
    }

    if (emojiSelect && accountAvatarData.avatarType === 'emoji') {
      emojiSelect.value = accountAvatarData.avatar;
    }

    if (modal) modal.classList.add('active');
  }

  async function handleUpdateProfile(event) {
    if (event) event.preventDefault();
    const discordInput = document.getElementById('account-discord-input');
    const discordVal = discordInput ? discordInput.value.trim() : '';

    const updates = {
      discordId: discordVal,
      avatar: (accountAvatarData && accountAvatarData.avatar) ? accountAvatarData.avatar : '🛡️',
      avatarType: (accountAvatarData && accountAvatarData.avatarType) ? accountAvatarData.avatarType : 'emoji'
    };

    const res = await Auth.updateProfile(updates);
    if (res.success) {
      SoundFX.playSuccess();
      updateAuthUI();
      closeModals();
      showToast('Profile updated successfully!', 'success');
    } else {
      SoundFX.playAlert();
      showToast(res.message || 'Failed to update profile', 'error');
    }
  }

  function updateAuthUI() {
    const user = Auth.getCurrentUser();
    const userWidget = document.getElementById('nav-user-widget');
    const authBtn = document.getElementById('nav-auth-btn');
    const navDevTab = document.getElementById('nav-dev-tab');
    const mobileDevTab = document.getElementById('mobile-dev-tab');

    if (user && user.isAdmin) {
      if (navDevTab) navDevTab.style.display = 'inline-block';
      if (mobileDevTab) mobileDevTab.style.display = 'inline-flex';
    } else {
      if (navDevTab) navDevTab.style.display = 'none';
      if (mobileDevTab) mobileDevTab.style.display = 'none';
    }

    if (user) {
      if (userWidget) {
        userWidget.style.display = 'flex';
        const avatarHtml = (user.avatarType === 'image' || (user.avatar && user.avatar.startsWith('data:'))) 
          ? `<img src="${user.avatar}" class="user-avatar-img" alt="${escapeHTML(user.username)}">`
          : (user.avatar || '🛡️');

        userWidget.innerHTML = `
          <div class="user-avatar-small" onclick="App.openAccountModal()" title="View Account Settings">${avatarHtml}</div>
          <div style="display: flex; flex-direction: column; text-align: left; cursor: pointer;" onclick="App.openAccountModal()">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span class="user-name">${escapeHTML(user.username)}</span>
              ${user.isAdmin ? '<span class="user-badge-dev">DEV ADMIN</span>' : '<span class="user-badge-player">PLAYER</span>'}
            </div>
            ${user.discordId ? `<span style="font-size: 0.68rem; color: #38bdf8; font-weight: 600;">🎮 ${escapeHTML(user.discordId)}</span>` : ''}
          </div>
          <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 0.7rem; margin-left: 6px;" onclick="App.openAccountModal()" title="Account Settings">⚙️</button>
          <button class="btn btn-sm btn-secondary" style="padding: 2px 7px; font-size: 0.7rem;" onclick="App.handleLogout()" title="Log out">Exit</button>
        `;
      }
      if (authBtn) authBtn.style.display = 'none';
    } else {
      if (userWidget) userWidget.style.display = 'none';
      if (authBtn) authBtn.style.display = 'inline-flex';
    }
  }

  function handleLogout() {
    SoundFX.playClick();
    Auth.logout();
    updateAuthUI();
    AdminPage.render();
    showToast('Logged out successfully.', 'info');
  }

  function openAuthModal(mode) {
    SoundFX.playClick();
    const modal = document.getElementById('auth-modal');
    const titleEl = document.getElementById('auth-modal-title');
    const loginBox = document.getElementById('auth-login-box');
    const signupBox = document.getElementById('auth-signup-box');

    if (mode === 'signup') {
      if (loginBox) loginBox.style.display = 'none';
      if (signupBox) signupBox.style.display = 'block';
      if (titleEl) titleEl.textContent = 'PLAYER REGISTRATION';
    } else {
      if (loginBox) loginBox.style.display = 'block';
      if (signupBox) signupBox.style.display = 'none';
      if (titleEl) titleEl.textContent = 'PLAYER AUTHENTICATION';
    }

    if (modal) modal.classList.add('active');
  }

  function openSignUp() {
    openAuthModal('signup');
  }

  function openLogin() {
    openAuthModal('login');
  }

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  }

  function renderMatches() {
    const container = document.getElementById('matches-list');
    if (!container) return;

    const matches = DataStore.getMatches(activeTourneyId);
    if (matches.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No match history recorded for this tournament.</div>`;
      return;
    }

    container.innerHTML = matches.map(m => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.3rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
        <div style="flex: 1; text-align: right; font-weight: 800; font-size: 1.1rem; color: ${m.winner === m.p1 ? 'var(--primary-gold)' : 'var(--text-main)'};">
          ${escapeHTML(m.p1)} ${m.winner === m.p1 ? '👑' : ''}
          ${m.eloChangeP1 ? `<div style="font-size: 0.75rem; color: ${m.eloChangeP1 > 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">(${m.eloChangeP1 > 0 ? '+' : ''}${m.eloChangeP1} ELO)</div>` : ''}
        </div>
        <div style="padding: 0.45rem 1.1rem; background: rgba(0,0,0,0.6); border-radius: 20px; font-weight: 900; font-size: 1.25rem; color: var(--primary-gold); margin: 0 1.2rem; border: 1px solid rgba(245,158,11,0.3);">
          ${escapeHTML(m.score)}
        </div>
        <div style="flex: 1; text-align: left; font-weight: 800; font-size: 1.1rem; color: ${m.winner === m.p2 ? 'var(--primary-gold)' : 'var(--text-main)'};">
          ${m.winner === m.p2 ? '👑' : ''} ${escapeHTML(m.p2)}
          ${m.eloChangeP2 ? `<div style="font-size: 0.75rem; color: ${m.eloChangeP2 > 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">(${m.eloChangeP2 > 0 ? '+' : ''}${m.eloChangeP2} ELO)</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderTournamentsView() {
    const container = document.getElementById('tournaments-container');
    if (!container) return;

    if (!viewingTourneyId) {
      // MODE 1: Full Tournaments Grid (List View)
      const tourneys = DataStore.getTournaments();
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.8rem; font-weight: 900; color: var(--primary-gold);">ALL TOURNAMENTS</h2>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 1.6rem;">
          ${tourneys.map(t => {
            const players = DataStore.getPlayersByTournament(t.id);
            const groupsData = DataStore.getGroupStageData(t.id);
            const groupCount = Object.keys(groupsData).length;

            return `
              <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.6rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 25px rgba(0,0,0,0.5);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                    <span class="tier-pill ${t.status === 'Live' ? 'tier-gm' : 'tier-diamond'}">${escapeHTML(t.status)}</span>
                    <span style="color: var(--primary-gold); font-weight: 900;">🏆 ${escapeHTML(t.prizePool)}</span>
                  </div>
                  <h3 style="font-size: 1.4rem; color: var(--text-main); font-weight: 900; margin-bottom: 0.5rem;">${escapeHTML(t.name)}</h3>
                  <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
                    FIFA 2026 Dual-Wing + Losers Bracket (${t.teamCount || players.length} Teams, ${groupCount} Groups)
                  </p>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Start: ${escapeHTML(t.startDate)}</span>
                  <button class="btn btn-dev btn-sm" onclick="App.openTournamentDetails('${t.id}')">🎮 Show Tournament Bracket</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // MODE 2: Dedicated Single-Page FIFA 2026 Dual-Wing + Losers Bracket Arena
      const tourney = DataStore.getTournaments().find(t => t.id === viewingTourneyId);
      if (!tourney) {
        viewingTourneyId = null;
        renderTournamentsView();
        return;
      }

      const players = DataStore.getPlayersByTournament(tourney.id);
      const rectData = DataStore.generateRectangularDoubleElimination(tourney.id);

      container.innerHTML = `
        <!-- Top Navigation -->
        <div style="margin-bottom: 1.2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.8rem;">
          <button class="btn btn-secondary btn-sm" onclick="App.backToTournamentsList()">
            ← Back to All Tournaments
          </button>
          <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
            Auto-fitting FIFA 2026 Dual-Wing Layout (No Horizontal Scrolling)
          </div>
        </div>

        <!-- Clean Header -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color-glow); border-radius: var(--radius-lg); padding: 1.4rem 1.8rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div>
            <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.3rem;">
              <span class="tier-pill ${tourney.status === 'Live' ? 'tier-gm' : 'tier-diamond'}">${escapeHTML(tourney.status)}</span>
              <h2 style="font-size: 1.7rem; font-weight: 900; color: var(--primary-gold);">${escapeHTML(tourney.name)}</h2>
            </div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">FIFA 2026 Dual-Wing + Losers Bracket (${tourney.teamCount || players.length} Participants)</div>
          </div>
          <div style="font-size: 1.3rem; color: var(--primary-gold); font-weight: 900;">🏆 ${escapeHTML(tourney.prizePool)}</div>
        </div>

        <!-- FIFA 2026 DUAL-WING ARENA -->
        <div class="fifa-dual-wing-arena">

          <!-- STAGE 1: DUAL-WING WINNERS BRACKET (LEFT WING + CENTER TROPHY + RIGHT WING) -->
          <div class="bracket-section-header">
            <div class="bracket-title-wrap">
              <span class="bracket-section-icon">🏆</span>
              <div>
                <h3 class="bracket-main-title">FIFA 2026 DUAL-WING BRACKET (WINNERS PATH)</h3>
                <p class="bracket-sub-title">West & East Wings converge into Center Stage Grand Finals</p>
              </div>
            </div>
            <span class="fifa-pill">UPPER BRACKET</span>
          </div>

          <div class="fifa-dual-wing-grid">
            
            <!-- LEFT WING (WEST) -->
            <div class="fifa-wing fifa-left-wing">
              <div class="fifa-wing-header">
                <span>⚔️ WEST BRACKET</span>
                <span class="fifa-wing-badge">Left Wing</span>
              </div>
              <div class="fifa-wing-rounds">
                ${rectData.leftWing.wbRounds.map(col => `
                  <div class="fifa-round-col">
                    <div class="fifa-round-label">${escapeHTML(col.title)}</div>
                    <div class="fifa-round-matches">
                      ${col.matches.map(m => renderCleanMatchBox(m)).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- CENTER STAGE (WORLD CHAMPIONSHIP TROPHY & GRAND FINAL) -->
            <div class="fifa-center-stage">
              <div class="fifa-trophy-card">
                <div class="fifa-trophy-icon">🏆</div>
                <div class="fifa-trophy-title">WORLD CHAMPIONSHIP</div>
                <div class="fifa-trophy-subtitle">GRAND FINALS ARENA</div>
              </div>

              <div class="fifa-center-matches">
                <div class="fifa-center-match-wrap">
                  <div class="fifa-center-label gold-label">👑 WORLD GRAND FINAL</div>
                  ${renderCleanMatchBox(rectData.centerStage.grandFinalMatch, true)}
                </div>

                <div class="fifa-center-match-wrap">
                  <div class="fifa-center-label bronze-label">🥉 3RD / 4TH PLACE MATCH</div>
                  ${renderCleanMatchBox(rectData.centerStage.thirdPlaceMatch)}
                </div>
              </div>

              <!-- Official Final Podium Standings -->
              <div class="fifa-podium-box">
                <div class="fifa-podium-title">🏅 OFFICIAL PODIUM</div>
                <div class="fifa-podium-rows">
                  <div class="fifa-podium-row gold">
                    <span>🥇 1st Place</span>
                    <strong>${escapeHTML(rectData.centerStage.podium.first)}</strong>
                  </div>
                  <div class="fifa-podium-row silver">
                    <span>🥈 2nd Place</span>
                    <strong>${escapeHTML(rectData.centerStage.podium.second)}</strong>
                  </div>
                  <div class="fifa-podium-row bronze">
                    <span>🥉 3rd Place</span>
                    <strong>${escapeHTML(rectData.centerStage.podium.third)}</strong>
                  </div>
                  <div class="fifa-podium-row fourth">
                    <span>4️⃣ 4th Place</span>
                    <span>${escapeHTML(rectData.centerStage.podium.fourth)}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT WING (EAST) -->
            <div class="fifa-wing fifa-right-wing">
              <div class="fifa-wing-header">
                <span>⚔️ EAST BRACKET</span>
                <span class="fifa-wing-badge">Right Wing</span>
              </div>
              <div class="fifa-wing-rounds">
                ${rectData.rightWing.wbRounds.map(col => `
                  <div class="fifa-round-col">
                    <div class="fifa-round-label">${escapeHTML(col.title)}</div>
                    <div class="fifa-round-matches">
                      ${col.matches.map(m => renderCleanMatchBox(m)).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

          <!-- STAGE 2: LOSERS BRACKET (REDEMPTION FLOW) BELOW -->
          <div class="bracket-section-header" style="margin-top: 2.5rem;">
            <div class="bracket-title-wrap">
              <span class="bracket-section-icon" style="color: #ef4444;">💀</span>
              <div>
                <h3 class="bracket-main-title" style="color: #ef4444;">LOSERS BRACKET (REDEMPTION FLOW)</h3>
                <p class="bracket-sub-title">Losers from R16, QF & SF drop down into Lower Bracket for redemption</p>
              </div>
            </div>
            <span class="fifa-pill loser-pill">LOWER BRACKET</span>
          </div>

          <div class="fifa-losers-grid">
            
            <!-- Left Wing Losers Path -->
            <div class="fifa-losers-wing">
              <div class="fifa-wing-header lb-header">
                <span>WEST LOSERS PATH</span>
              </div>
              <div class="fifa-wing-rounds">
                ${rectData.leftWing.lbRounds.map(col => `
                  <div class="fifa-round-col">
                    <div class="fifa-round-label lb-label">${escapeHTML(col.title)}</div>
                    <div class="fifa-round-matches">
                      ${col.matches.map(m => renderCleanMatchBox(m)).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Center Losers Crossover / Major Final -->
            <div class="fifa-losers-center">
              <div class="fifa-wing-header lb-header" style="text-align: center;">
                <span>🔥 REDEMPTION CROSSOVER</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 1rem; justify-content: center; height: 100%;">
                <div class="fifa-center-match-wrap">
                  <div class="fifa-center-label lb-label">💀 LB SEMIFINAL CROSSOVER</div>
                  ${renderCleanMatchBox(rectData.centerStage.loserFinalStage1)}
                </div>
                <div class="fifa-center-match-wrap">
                  <div class="fifa-center-label lb-label">🔥 LB REDEMPTION FINAL</div>
                  ${renderCleanMatchBox(rectData.centerStage.loserFinalStage2)}
                </div>
              </div>
            </div>

            <!-- Right Wing Losers Path -->
            <div class="fifa-losers-wing">
              <div class="fifa-wing-header lb-header">
                <span>EAST LOSERS PATH</span>
              </div>
              <div class="fifa-wing-rounds">
                ${rectData.rightWing.lbRounds.map(col => `
                  <div class="fifa-round-col">
                    <div class="fifa-round-label lb-label">${escapeHTML(col.title)}</div>
                    <div class="fifa-round-matches">
                      ${col.matches.map(m => renderCleanMatchBox(m)).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>
      `;
    }
  }

  function renderCleanAvatar(avatar, name = 'Player') {
    if (!avatar) return '🛡️';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) {
      return `<img src="${avatar}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; vertical-align: middle; display: inline-block;" alt="${escapeHTML(name)}">`;
    }
    return avatar;
  }

  function renderCleanMatchBox(m, isGrandFinal = false) {
    const boxClass = isGrandFinal ? 'clean-match-box clean-grand-final-box' : 'clean-match-box';

    return `
      <div class="${boxClass}">
        <div class="clean-team-row ${m.winner === m.p1Name ? 'winner-row' : ''}">
          <div class="clean-team-name">
            <span>${renderCleanAvatar(m.p1Avatar, m.p1Name)}</span>
            <span>${escapeHTML(m.p1Name)}</span>
          </div>
          <div class="clean-score">${escapeHTML(String(m.scoreP1))}</div>
        </div>

        <div class="clean-team-row ${m.winner === m.p2Name ? 'winner-row' : ''}">
          <div class="clean-team-name">
            <span>${renderCleanAvatar(m.p2Avatar, m.p2Name)}</span>
            <span>${escapeHTML(m.p2Name)}</span>
          </div>
          <div class="clean-score">${escapeHTML(String(m.scoreP2))}</div>
        </div>
      </div>
    `;
  }

  function openTournamentDetails(tourneyId) {
    SoundFX.playClick();
    viewingTourneyId = tourneyId;
    renderTournamentsView();
  }

  function backToTournamentsList() {
    SoundFX.playClick();
    viewingTourneyId = null;
    renderTournamentsView();
  }

  function selectTourneyAndSwitch(tourneyId) {
    const select = document.getElementById('tourney-select-main');
    if (select) select.value = tourneyId;
    onTourneyChange(tourneyId);
    switchTab('leaderboard');
  }

  function openRankDetailModal(tierKey) {
    SoundFX.playClick();
    const rankDetails = {
      gold: {
        name: 'Gold',
        icon: '⭐',
        class: 'tier-gold',
        range: '400 – 699 ELO',
        starting: 'Yes (500 ELO)',
        winRate: '+30 Base Win / -20 Base Loss',
        desc: 'The starting placement rank for all new competitors. Every player starts at 500 ELO.',
        exampleScore: '10 - 4',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (4 × 10 = 40) = +110 raw points ➡️ Scaled ELO Change: +28 ELO.'
      },
      champion: {
        name: 'Champion',
        icon: '👑',
        class: 'tier-champ',
        range: '2000+ ELO',
        starting: 'No',
        winRate: '+15 Base Win / -35 Base Loss',
        desc: 'The pinnacle rank reserved for world-class champions above 2000 ELO.',
        exampleScore: '10 - 4',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (4 × 10 = 40) = +110 raw points ➡️ Scaled ELO Change: +14 ELO.'
      },
      gm: {
        name: 'Grandmaster',
        icon: '🔥',
        class: 'tier-gm',
        range: '1600 – 1999 ELO',
        starting: 'No',
        winRate: '+18 Base Win / -32 Base Loss',
        desc: 'Elite competitive tier for master duelists closing in on Champion status.',
        exampleScore: '10 - 7',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (7 × 10 = 70) = +80 raw points ➡️ Scaled ELO Change: +18 ELO.'
      },
      master: {
        name: 'Master',
        icon: '⚡',
        class: 'tier-master',
        range: '1300 – 1599 ELO',
        starting: 'No',
        winRate: '+21 Base Win / -29 Base Loss',
        desc: 'High-level tier requiring strong round win ratios and win streak momentum.',
        exampleScore: '10 - 4',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (4 × 10 = 40) = +110 raw points ➡️ Scaled ELO Change: +22 ELO.'
      },
      diamond: {
        name: 'Diamond',
        icon: '💎',
        class: 'tier-diamond',
        range: '1000 – 1299 ELO',
        starting: 'No',
        winRate: '+24 Base Win / -26 Base Loss',
        desc: 'Advanced competitive tier for proven duelists.',
        exampleScore: '10 - 9',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (9 × 10 = 90) = +60 raw points ➡️ Scaled ELO Change: +15 ELO (Close Match).'
      },
      plat: {
        name: 'Platinum',
        icon: '🛡️',
        class: 'tier-plat',
        range: '700 – 999 ELO',
        starting: 'No',
        winRate: '+27 Base Win / -23 Base Loss',
        desc: 'Intermediate competitive rank above default Gold placement.',
        exampleScore: '10 - 0',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (0 × 10 = 0) = +150 raw points ➡️ Scaled ELO Change: +38 ELO (Dominant Shutout).'
      },
      silver: {
        name: 'Silver',
        icon: '🥈',
        class: 'tier-silver',
        range: '200 – 399 ELO',
        starting: 'No',
        winRate: '+32 Base Win / -18 Base Loss',
        desc: 'Below starting placement threshold.',
        exampleScore: '10 - 4',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (4 × 10 = 40) = +110 raw points ➡️ Scaled ELO Change: +32 ELO.'
      },
      bronze: {
        name: 'Bronze',
        icon: '🥉',
        class: 'tier-bronze',
        range: '0 – 199 ELO',
        starting: 'No',
        winRate: '+35 Base Win / -15 Base Loss',
        desc: 'Lowest competitive rank tier.',
        exampleScore: '10 - 4',
        exampleCalc: 'Round Win (10 × 15 = 150) - Round Loss (4 × 10 = 40) = +110 raw points ➡️ Scaled ELO Change: +35 ELO.'
      }
    };

    const rank = rankDetails[tierKey] || rankDetails.gold;
    const modal = document.getElementById('rank-detail-modal');
    const content = document.getElementById('rank-detail-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <div style="font-size: 3.5rem; margin-bottom: 0.5rem;">${rank.icon}</div>
        <h2 style="font-size: 1.8rem; font-weight: 900; color: var(--primary-gold);">${escapeHTML(rank.name)} Rank</h2>
        <div style="margin-top: 0.5rem;"><span class="tier-pill ${rank.class}" style="font-size: 0.9rem; padding: 4px 14px;">${escapeHTML(rank.range)}</span></div>
      </div>

      <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.2rem; border: 1px solid rgba(255,255,255,0.1);">
        <h4 style="color: var(--accent-cyan); font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.4rem;">Description</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.6;">${escapeHTML(rank.desc)}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1.2rem; font-size: 0.85rem;">
        <div style="background: rgba(0,0,0,0.4); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid rgba(245,158,11,0.2);">
          <div style="color: var(--text-muted); font-size: 0.75rem;">ELO Bounds</div>
          <div style="font-weight: 800; color: var(--primary-gold); font-size: 1.1rem;">${escapeHTML(rank.range)}</div>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 0.8rem; border-radius: var(--radius-sm); border: 1px solid rgba(16,185,129,0.2);">
          <div style="color: var(--text-muted); font-size: 0.75rem;">Base Rates</div>
          <div style="font-weight: 800; color: #10b981; font-size: 0.85rem;">${escapeHTML(rank.winRate)}</div>
        </div>
      </div>

      <div style="background: rgba(0,0,0,0.4); padding: 1.1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <h4 style="color: var(--primary-gold); font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.4rem;">💡 Example Match & ELO Calculation</h4>
        <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.3rem;">Match Score: <strong>${escapeHTML(rank.exampleScore)}</strong></div>
        <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; font-family: monospace;">
          ${escapeHTML(rank.exampleCalc)}
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function launchSimulatorDuel(playerId) {
    SoundFX.playClick();
    showToast(`Launching 1v1 Arena Duel with player #${playerId}...`, 'info');
  }

  function initGroupStageChange() {
    if (typeof AdminPage !== 'undefined' && typeof AdminPage.openGroupStageModal === 'function') {
      AdminPage.openGroupStageModal();
    }
  }

  const appInstance = {
    init,
    switchTab,
    onTourneyChange,
    updateAuthUI,
    handleLogout,
    openSignUp,
    openLogin,
    openAuthModal,
    closeModals,
    showToast,
    selectTourneyAndSwitch,
    populateTourneyDropdowns,
    openRankDetailModal,
    renderTournamentsView,
    openTournamentDetails,
    backToTournamentsList,
    triggerCloudSync,
    togglePassword,
    onSignupEmojiChange,
    handleAvatarSelect,
    onAccountEmojiChange,
    handleAvatarFileSelect,
    resetAccountAvatarToEmoji,
    openAccountModal,
    handleUpdateProfile,
    initGroupStageChange,
    launchSimulatorDuel
  };

  if (typeof window !== 'undefined') {
    window.App = appInstance;
  }

  return appInstance;
})();

if (typeof window !== 'undefined') {
  window.App = App;
}

// Self-executing initialization check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
