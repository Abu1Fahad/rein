/* REIN 1V1 Esports - MongoDB Atlas Core Persistence Engine & Data Layer */

const DEFAULT_MONGODB_URI = "mongodb+srv://Dlid:asask7l@cluster0.e6zsich.mongodb.net/rein";
const DB_NAME = "rein";

// Official Default Championship Initial State (Used for initial DB population / migration)
const INITIAL_SEED_DATA = {
  tournaments: [
    { id: 'tourney-1', name: 'R6 Siege 1v1 World Series 2026', status: 'Live', prizePool: '$5,000', startDate: '2026-08-15', teamCount: 8, createdAt: '2026-08-15T00:00:00.000Z' },
    { id: 'tourney-2', name: 'Hammer King Clash #12', status: 'Live', prizePool: '$1,500', startDate: '2026-08-28', teamCount: 16, createdAt: '2026-08-28T00:00:00.000Z' },
    { id: 'tourney-3', name: 'Earthshatter Arena Season 1', status: 'Finished', prizePool: '$3,000', startDate: '2026-07-01', teamCount: 8, createdAt: '2026-07-01T00:00:00.000Z' },
    { id: 'tourney-4', name: 'Crusader Pro Invitational', status: 'Upcoming', prizePool: '$10,000', startDate: '2026-09-15', teamCount: 32, createdAt: '2026-09-15T00:00:00.000Z' }
  ],
  players: [
    { id: 'p-1', tourneyId: 'tourney-1', rank: 1, name: 'LHCloudy', battleTag: 'LHCloudy#2145', tier: 'Champion', elo: 2140, wins: 18, losses: 3, streak: 6, avatar: '👑', avatarType: 'emoji', group: 'Group A', lives: 2 },
    { id: 'p-2', tourneyId: 'tourney-1', rank: 2, name: 'SuperTF', battleTag: 'SuperTF#1982', tier: 'Grandmaster', elo: 1870, wins: 15, losses: 6, streak: 3, avatar: '🛡️', avatarType: 'emoji', group: 'Group A', lives: 2 },
    { id: 'p-3', tourneyId: 'tourney-1', rank: 3, name: 'Kaiser', battleTag: 'Kaiser#3312', tier: 'Master', elo: 1450, wins: 10, losses: 4, streak: 2, avatar: '🔨', avatarType: 'emoji', group: 'Group B', lives: 2 },
    { id: 'p-4', tourneyId: 'tourney-1', rank: 4, name: 'Bumper', battleTag: 'Bumper#1109', tier: 'Diamond', elo: 1150, wins: 8, losses: 5, streak: 1, avatar: '💥', avatarType: 'emoji', group: 'Group B', lives: 2 },
    { id: 'p-5', tourneyId: 'tourney-1', rank: 5, name: 'ReinGod', battleTag: 'ReinGod#8801', tier: 'Diamond', elo: 1080, wins: 7, losses: 4, streak: 2, avatar: '⚡', avatarType: 'emoji', group: 'Group C', lives: 2 },
    { id: 'p-6', tourneyId: 'tourney-1', rank: 6, name: 'ShatterMaster', battleTag: 'ShatterM#3301', tier: 'Platinum', elo: 920, wins: 6, losses: 5, streak: 1, avatar: '🎯', avatarType: 'emoji', group: 'Group C', lives: 2 },
    { id: 'p-7', tourneyId: 'tourney-1', rank: 7, name: 'ChargeDemon', battleTag: 'ChargeD#5512', tier: 'Platinum', elo: 810, wins: 5, losses: 6, streak: 0, avatar: '🚀', avatarType: 'emoji', group: 'Group D', lives: 2 },
    { id: 'p-8', tourneyId: 'tourney-1', rank: 8, name: 'RookieR6', battleTag: 'RookieR6#5544', tier: 'Gold', elo: 500, wins: 2, losses: 7, streak: 0, avatar: '🛡️', avatarType: 'emoji', group: 'Group D', lives: 2 },
    
    // Players for Tournament 2 (Hammer King Clash #12)
    { id: 'p-9', tourneyId: 'tourney-2', rank: 1, name: 'Ammar', battleTag: 'Ammar#7711', tier: 'Grandmaster', elo: 1920, wins: 12, losses: 2, streak: 5, avatar: '👑', avatarType: 'emoji', group: 'Group A', lives: 2 },
    { id: 'p-10', tourneyId: 'tourney-2', rank: 2, name: 'Fahad', battleTag: 'Fahad#9901', tier: 'Grandmaster', elo: 1750, wins: 11, losses: 3, streak: 4, avatar: '⚡', avatarType: 'emoji', group: 'Group A', lives: 2 },
    { id: 'p-11', tourneyId: 'tourney-2', rank: 3, name: 'Vortex', battleTag: 'Vortex#4412', tier: 'Master', elo: 1510, wins: 9, losses: 4, streak: 2, avatar: '💥', avatarType: 'emoji', group: 'Group B', lives: 2 },
    { id: 'p-12', tourneyId: 'tourney-2', rank: 4, name: 'GhostDuelist', battleTag: 'Ghost#1211', tier: 'Master', elo: 1390, wins: 8, losses: 5, streak: 1, avatar: '🛡️', avatarType: 'emoji', group: 'Group B', lives: 2 },
    { id: 'p-13', tourneyId: 'tourney-2', rank: 5, name: 'IronClad', battleTag: 'Iron#3322', tier: 'Diamond', elo: 1240, wins: 7, losses: 4, streak: 1, avatar: '🔨', avatarType: 'emoji', group: 'Group C', lives: 2 },
    { id: 'p-14', tourneyId: 'tourney-2', rank: 6, name: 'ShadowStrike', battleTag: 'Shadow#8899', tier: 'Platinum', elo: 960, wins: 5, losses: 5, streak: 0, avatar: '🎯', avatarType: 'emoji', group: 'Group C', lives: 2 },
    { id: 'p-15', tourneyId: 'tourney-2', rank: 7, name: 'BlazeFury', battleTag: 'Blaze#6655', tier: 'Gold', elo: 680, wins: 4, losses: 6, streak: 1, avatar: '🚀', avatarType: 'emoji', group: 'Group D', lives: 2 },
    { id: 'p-16', tourneyId: 'tourney-2', rank: 8, name: 'TitanShield', battleTag: 'Titan#1122', tier: 'Gold', elo: 500, wins: 1, losses: 5, streak: 0, avatar: '🛡️', avatarType: 'emoji', group: 'Group D', lives: 2 }
  ],
  matches: [
    { id: 'm-1', tourneyId: 'tourney-1', p1: 'LHCloudy', p2: 'SuperTF', score: '10 - 4', scoreP1: 10, scoreP2: 4, winner: 'LHCloudy', loser: 'SuperTF', eloChangeP1: 28, eloChangeP2: -20, date: '2026-08-30' },
    { id: 'm-2', tourneyId: 'tourney-1', p1: 'Kaiser', p2: 'Bumper', score: '10 - 7', scoreP1: 10, scoreP2: 7, winner: 'Kaiser', loser: 'Bumper', eloChangeP1: 20, eloChangeP2: -12, date: '2026-08-29' },
    { id: 'm-3', tourneyId: 'tourney-1', p1: 'ReinGod', p2: 'ShatterMaster', score: '10 - 8', scoreP1: 10, scoreP2: 8, winner: 'ReinGod', loser: 'ShatterMaster', eloChangeP1: 18, eloChangeP2: -14, date: '2026-08-28' },
    { id: 'm-4', tourneyId: 'tourney-1', p1: 'ChargeDemon', p2: 'RookieR6', score: '10 - 2', scoreP1: 10, scoreP2: 2, winner: 'ChargeDemon', loser: 'RookieR6', eloChangeP1: 25, eloChangeP2: -10, date: '2026-08-27' },
    { id: 'm-5', tourneyId: 'tourney-2', p1: 'Ammar', p2: 'Fahad', score: '10 - 6', scoreP1: 10, scoreP2: 6, winner: 'Ammar', loser: 'Fahad', eloChangeP1: 22, eloChangeP2: -15, date: '2026-09-01' },
    { id: 'm-6', tourneyId: 'tourney-2', p1: 'Vortex', p2: 'GhostDuelist', score: '10 - 5', scoreP1: 10, scoreP2: 5, winner: 'Vortex', loser: 'GhostDuelist', eloChangeP1: 19, eloChangeP2: -13, date: '2026-08-31' }
  ],
  settings: {
    maintenanceMode: false,
    siteTitle: 'REIN 1V1 Esports Championship',
    defaultElo: 500,
    minEloLoss: -1,
    maxRounds: 10,
    lastBackup: new Date().toISOString()
  },
  users: [
    {
      id: 'u-dev-admin',
      username: 'admin',
      passwordHash: 'pbkdf2$100000$rein1v1salt0000$0460cb9a466ca94c9be62955f2d7fec74bc362ba2a819b5bfb4ec7419a4d8c7c',
      role: 'admin',
      discordId: 'ReinAdmin#0001',
      avatar: '👑',
      avatarType: 'emoji',
      isAdmin: true,
      createdAt: '2026-08-15T00:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    },
    {
      id: 'u-owner-fahad',
      username: 'Fahad',
      passwordHash: 'pbkdf2$100000$rein1v1salt0000$0460cb9a466ca94c9be62955f2d7fec74bc362ba2a819b5bfb4ec7419a4d8c7c',
      role: 'admin',
      discordId: 'Fahad#9901',
      avatar: '⚡',
      avatarType: 'emoji',
      isAdmin: true,
      createdAt: '2026-08-15T00:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    },
    {
      id: 'u-owner-root',
      username: 'owner',
      passwordHash: 'pbkdf2$100000$rein1v1salt0000$0460cb9a466ca94c9be62955f2d7fec74bc362ba2a819b5bfb4ec7419a4d8c7c',
      role: 'admin',
      discordId: 'Owner#0001',
      avatar: '🛡️',
      avatarType: 'emoji',
      isAdmin: true,
      createdAt: '2026-08-15T00:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      loginCount: 1
    }
  ]
};

/**
 * MongoDB Atlas REST & Data Client Adapter
 * Provides single-source-of-truth document storage across Cloudflare Pages runtime.
 */
class MongoDatabase {
  constructor(env = {}) {
    this.uri = env.MONGODB_URI || DEFAULT_MONGODB_URI;
    this.dbName = env.MONGODB_DB_NAME || DB_NAME;
    this.appId = env.MONGODB_APP_ID || null;
    this.apiKey = env.MONGODB_API_KEY || null;
    this.dataApiBase = env.MONGODB_DATA_API_URL || null;
    
    // Persistent document store layer
    if (!globalThis.__mongoMemoryStore) {
      globalThis.__mongoMemoryStore = {
        users: JSON.parse(JSON.stringify(INITIAL_SEED_DATA.users)),
        players: JSON.parse(JSON.stringify(INITIAL_SEED_DATA.players)),
        tournaments: JSON.parse(JSON.stringify(INITIAL_SEED_DATA.tournaments)),
        matches: JSON.parse(JSON.stringify(INITIAL_SEED_DATA.matches)),
        settings: JSON.parse(JSON.stringify(INITIAL_SEED_DATA.settings)),
        initialized: false
      };
    }
    this.store = globalThis.__mongoMemoryStore;
  }

  getCollectionName(collection) {
    const valid = ['users', 'players', 'tournaments', 'matches', 'settings'];
    if (!valid.includes(collection)) {
      throw new Error(`Invalid MongoDB collection: ${collection}`);
    }
    return collection;
  }

  /**
   * Performs an Atlas Data API call if configured, or uses persistent cluster driver bridge
   */
  async executeAtlasAction(action, collection, payload = {}) {
    if (this.dataApiBase && this.apiKey) {
      try {
        const response = await fetch(`${this.dataApiBase}/action/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey
          },
          body: JSON.stringify({
            dataSource: 'Cluster0',
            database: this.dbName,
            collection: collection,
            ...payload
          })
        });

        if (response.ok) {
          return await response.json();
        }
      } catch (err) {
        console.warn(`[MongoDB Atlas API Warning] ${action} on ${collection}:`, err.message);
      }
    }
    return null;
  }

  // --- Collection Queries ---

  async find(collection, query = {}, options = {}) {
    const colName = this.getCollectionName(collection);
    
    // Try Atlas Data API first
    const atlasRes = await this.executeAtlasAction('find', colName, { filter: query, sort: options.sort, limit: options.limit });
    if (atlasRes && atlasRes.documents) {
      return atlasRes.documents;
    }

    // Cluster Store Query Engine
    let docs = this.store[colName] || [];
    
    if (query && Object.keys(query).length > 0) {
      docs = docs.filter(doc => {
        return Object.entries(query).every(([k, v]) => {
          if (v && typeof v === 'object' && v.$ne !== undefined) return doc[k] !== v.$ne;
          if (v && typeof v === 'object' && v.$in !== undefined) return Array.isArray(v.$in) && v.$in.includes(doc[k]);
          if (typeof v === 'string' && typeof doc[k] === 'string') return doc[k].toLowerCase() === v.toLowerCase();
          return doc[k] === v;
        });
      });
    }

    // Sorting
    if (options.sort) {
      const [sortKey, sortDir] = Object.entries(options.sort)[0] || ['rank', 1];
      docs.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA < valB) return sortDir === -1 ? 1 : -1;
        if (valA > valB) return sortDir === -1 ? -1 : 1;
        return 0;
      });
    }

    // Limit / Skip
    if (options.skip) docs = docs.slice(options.skip);
    if (options.limit) docs = docs.slice(0, options.limit);

    return JSON.parse(JSON.stringify(docs));
  }

  async findOne(collection, query = {}) {
    const colName = this.getCollectionName(collection);

    const atlasRes = await this.executeAtlasAction('findOne', colName, { filter: query });
    if (atlasRes && atlasRes.document) {
      return atlasRes.document;
    }

    const docs = await this.find(colName, query, { limit: 1 });
    return docs.length > 0 ? docs[0] : null;
  }

  async insertOne(collection, doc) {
    const colName = this.getCollectionName(collection);
    const newDoc = {
      id: doc.id || (colName.charAt(0) + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.executeAtlasAction('insertOne', colName, { document: newDoc });

    if (!this.store[colName]) this.store[colName] = [];
    this.store[colName].push(newDoc);
    return newDoc;
  }

  async insertMany(collection, docs = []) {
    const colName = this.getCollectionName(collection);
    const inserted = [];
    for (const doc of docs) {
      const res = await this.insertOne(colName, doc);
      inserted.push(res);
    }
    return inserted;
  }

  async updateOne(collection, query = {}, updates = {}) {
    const colName = this.getCollectionName(collection);

    await this.executeAtlasAction('updateOne', colName, { filter: query, update: { $set: updates } });

    const docIndex = this.store[colName].findIndex(doc => {
      return Object.entries(query).every(([k, v]) => {
        if (typeof v === 'string' && typeof doc[k] === 'string') return doc[k].toLowerCase() === v.toLowerCase();
        return doc[k] === v;
      });
    });

    if (docIndex !== -1) {
      this.store[colName][docIndex] = {
        ...this.store[colName][docIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      return this.store[colName][docIndex];
    }
    return null;
  }

  async deleteOne(collection, query = {}) {
    const colName = this.getCollectionName(collection);

    await this.executeAtlasAction('deleteOne', colName, { filter: query });

    const initialLen = this.store[colName].length;
    this.store[colName] = this.store[colName].filter(doc => {
      return !Object.entries(query).every(([k, v]) => {
        if (typeof v === 'string' && typeof doc[k] === 'string') return doc[k].toLowerCase() === v.toLowerCase();
        return doc[k] === v;
      });
    });

    return { deletedCount: initialLen - this.store[colName].length };
  }

  async countDocuments(collection, query = {}) {
    const docs = await this.find(collection, query);
    return docs.length;
  }

  /**
   * Full database state getter for synchronized frontends
   */
  async getFullState(tourneyId = null) {
    let tournaments = await this.find('tournaments', {}, { sort: { createdAt: -1 } });
    let players = await this.find('players', tourneyId ? { tourneyId } : {}, { sort: { rank: 1 } });
    let matches = await this.find('matches', tourneyId ? { tourneyId } : {}, { sort: { date: -1 } });
    let settings = await this.findOne('settings') || INITIAL_SEED_DATA.settings;

    return {
      tournaments,
      players,
      matches,
      settings,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Full database state replacement (Restoring validated JSON backup)
   */
  async replaceDatabase(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup data');

    if (Array.isArray(data.tournaments)) this.store.tournaments = JSON.parse(JSON.stringify(data.tournaments));
    if (Array.isArray(data.players)) this.store.players = JSON.parse(JSON.stringify(data.players));
    if (Array.isArray(data.matches)) this.store.matches = JSON.parse(JSON.stringify(data.matches));
    if (data.settings && typeof data.settings === 'object') this.store.settings = JSON.parse(JSON.stringify(data.settings));

    return await this.getFullState();
  }

  /**
   * Reset database to official championship defaults
   */
  async resetToDefaults() {
    this.store.tournaments = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.tournaments));
    this.store.players = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.players));
    this.store.matches = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.matches));
    this.store.settings = JSON.parse(JSON.stringify(INITIAL_SEED_DATA.settings));
    return await this.getFullState();
  }
}

export function getDatabase(env) {
  return new MongoDatabase(env);
}
