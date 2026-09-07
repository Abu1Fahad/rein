/* REIN 1V1 Esports - Input Validation & Security Sanitization */

export function sanitizeString(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

export function validateAvatar(avatar, avatarType) {
  if (!avatar) return { valid: true, avatar: '🛡️', avatarType: 'emoji' };
  
  if (avatarType === 'image' || avatar.startsWith('data:image/')) {
    // Validate base64 image data URI format
    const matches = avatar.match(/^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
      // If it's a URL
      if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return { valid: true, avatar: sanitizeString(avatar, 300), avatarType: 'image' };
      }
      return { valid: false, message: 'Invalid image format. Allowed formats: PNG, JPEG, WebP, GIF.' };
    }
    // Check approximate file size (Max 1.5MB base64)
    const stringLength = matches[3].length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383612;
    if (sizeInBytes > 1.5 * 1024 * 1024) {
      return { valid: false, message: 'Avatar image must be smaller than 1.5MB.' };
    }
    return { valid: true, avatar, avatarType: 'image' };
  }

  // Emoji avatar
  return { valid: true, avatar: sanitizeString(avatar, 20), avatarType: 'emoji' };
}

export function validatePlayerInput(data) {
  const name = sanitizeString(data.name, 40);
  if (!name || name.length < 2) {
    return { valid: false, message: 'Competitor name must be at least 2 characters long.' };
  }

  const battleTag = sanitizeString(data.battleTag || `${name}#0000`, 50);
  const tourneyId = sanitizeString(data.tourneyId || 'tourney-1', 40);
  const elo = Math.max(0, Math.min(5000, parseInt(data.elo, 10) || 500));
  const wins = Math.max(0, parseInt(data.wins, 10) || 0);
  const losses = Math.max(0, parseInt(data.losses, 10) || 0);
  const streak = Math.max(0, parseInt(data.streak, 10) || 0);
  const group = sanitizeString(data.group || 'Group A', 30);
  const lives = Math.max(0, parseInt(data.lives, 10) || 2);

  const avatarRes = validateAvatar(data.avatar, data.avatarType);
  if (!avatarRes.valid) return avatarRes;

  return {
    valid: true,
    player: {
      name,
      battleTag,
      tourneyId,
      elo,
      wins,
      losses,
      streak,
      group,
      lives,
      avatar: avatarRes.avatar,
      avatarType: avatarRes.avatarType
    }
  };
}

export function validateTournamentInput(data) {
  const name = sanitizeString(data.name, 80);
  if (!name || name.length < 3) {
    return { valid: false, message: 'Tournament name must be at least 3 characters long.' };
  }

  const validStatuses = ['Live', 'Upcoming', 'Finished'];
  const status = validStatuses.includes(data.status) ? data.status : 'Live';
  const prizePool = sanitizeString(data.prizePool || '$1,000', 30);
  const startDate = sanitizeString(data.startDate || new Date().toISOString().split('T')[0], 20);
  const teamCount = Math.max(4, Math.min(128, parseInt(data.teamCount, 10) || 8));

  return {
    valid: true,
    tournament: {
      name,
      status,
      prizePool,
      startDate,
      teamCount
    }
  };
}

export function validateMatchInput(data) {
  const { p1Id, p2Id, scoreP1, scoreP2, tourneyId } = data;
  if (!p1Id || !p2Id) {
    return { valid: false, message: 'Both competitor IDs (p1 and p2) are required.' };
  }
  if (p1Id === p2Id) {
    return { valid: false, message: 'A competitor cannot play a match against themselves.' };
  }

  const r1 = parseInt(scoreP1, 10);
  const r2 = parseInt(scoreP2, 10);
  if (isNaN(r1) || isNaN(r2) || r1 < 0 || r2 < 0) {
    return { valid: false, message: 'Match rounds must be non-negative integers.' };
  }
  if (r1 === r2) {
    return { valid: false, message: '1v1 matches cannot end in a tie. One competitor must win.' };
  }

  return {
    valid: true,
    matchData: {
      p1Id: sanitizeString(p1Id, 50),
      p2Id: sanitizeString(p2Id, 50),
      scoreP1: r1,
      scoreP2: r2,
      tourneyId: sanitizeString(tourneyId || 'tourney-1', 40)
    }
  };
}
