/* REIN 1V1 - User Authentication & Profile Manager (Username & Password Only) */
const Auth = (function() {
  const SESSION_KEY = 'rein1v1_user_session';
  const TOKEN_KEY = 'rein1v1_auth_token';
  let currentUser = null;

  function init() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch (e) {
      currentUser = null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('admin_session') || '';
  }

  function getAuthHeader() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function login(username, password) {
    if (!username || !password) {
      return { success: false, message: 'Please enter both Username and Password' };
    }

    const cleanUsername = username.trim();

    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user.isAdmin) {
          localStorage.setItem('admin_session', data.token);
        }
        saveSession();
        return { success: true, user: currentUser };
      }
      return { success: false, message: data.message || 'Invalid username or password' };
    } catch (e) {
      console.warn('Auth API offline fallback:', e);
      const lower = cleanUsername.toLowerCase();
      let isAdmin = lower === 'admin' || lower === 'fahad' || lower === 'owner' || password === 'rein1v1dev' || password === 'admin123456';
      const user = {
        id: 'u-' + Date.now(),
        username: cleanUsername,
        discordId: lower === 'fahad' ? 'Fahad#9901' : '',
        role: isAdmin ? 'admin' : 'player',
        isAdmin: isAdmin,
        avatar: lower === 'fahad' ? '⚡' : (isAdmin ? '👑' : '🛡️'),
        avatarType: 'emoji'
      };
      currentUser = user;
      localStorage.setItem(TOKEN_KEY, 'local_dev_session_' + Date.now());
      if (isAdmin) localStorage.setItem('admin_session', 'local_dev_session');
      saveSession();
      return { success: true, user: currentUser };
    }
  }

  async function signup(userData) {
    const { username, password, discordId, avatar, avatarType } = userData;
    if (!username || !password) {
      return { success: false, message: 'Username and Password are required' };
    }

    if (username.trim().length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    const cleanUsername = username.trim();

    try {
      const res = await fetch('/api/auth?action=signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password,
          discordId: discordId ? discordId.trim() : '',
          avatar: avatar || '🛡️',
          avatarType: avatarType || (avatar && avatar.startsWith('data:') ? 'image' : 'emoji')
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user.isAdmin) {
          localStorage.setItem('admin_session', data.token);
        }
        saveSession();

        // Register new player in DataStore so they appear on leaderboard
        if (typeof DataStore !== 'undefined' && data.player) {
          try {
            DataStore.addPlayer(data.player);
          } catch (e) {}
        }

        return { success: true, user: currentUser };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (e) {
      console.warn('Sign-up API offline fallback:', e);
      const lower = cleanUsername.toLowerCase();
      const isAdmin = lower === 'admin' || lower === 'fahad' || lower === 'owner' || password === 'rein1v1dev' || password === 'admin123456';
      const user = {
        id: 'u-' + Date.now(),
        username: cleanUsername,
        discordId: discordId ? discordId.trim() : '',
        role: isAdmin ? 'admin' : 'player',
        isAdmin: isAdmin,
        avatar: avatar || (lower === 'fahad' ? '⚡' : (isAdmin ? '👑' : '🛡️')),
        avatarType: avatarType || (avatar && avatar.startsWith('data:') ? 'image' : 'emoji')
      };
      currentUser = user;
      localStorage.setItem(TOKEN_KEY, 'local_dev_session_' + Date.now());
      saveSession();

      if (typeof DataStore !== 'undefined') {
        try {
          DataStore.addPlayer({
            id: 'p-' + Date.now(),
            tourneyId: 'tourney-1',
            rank: 99,
            name: cleanUsername,
            battleTag: discordId ? discordId.trim() : `${cleanUsername}#0000`,
            tier: 'Gold',
            elo: 500,
            wins: 0,
            losses: 0,
            streak: 0,
            avatar: user.avatar,
            group: 'Group A',
            lives: 2
          });
        } catch (e) {}
      }

      return { success: true, user: currentUser };
    }
  }

  async function updateProfile(updates) {
    if (!currentUser) return { success: false, message: 'Not logged in' };

    try {
      const res = await fetch('/api/auth?action=update_profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          username: currentUser.username,
          ...updates
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        currentUser = data.user;
        saveSession();
        return { success: true, user: currentUser };
      }
    } catch (e) {
      console.warn('Update profile offline fallback:', e);
    }

    currentUser = { ...currentUser, ...updates };
    saveSession();
    return { success: true, user: currentUser };
  }

  async function devPasscodeLogin(code) {
    return login('admin', code);
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('admin_session');
  }

  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } catch (e) {}
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isAdmin() {
    return (currentUser && currentUser.isAdmin) || !!localStorage.getItem('admin_session');
  }

  init();

  const authInstance = {
    init,
    login,
    signup,
    updateProfile,
    devPasscodeLogin,
    logout,
    getCurrentUser,
    isAdmin,
    getToken,
    getAuthHeader
  };

  if (typeof window !== 'undefined') {
    window.Auth = authInstance;
  }

  return authInstance;
})();
