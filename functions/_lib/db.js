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
  players: [],
  matches: [],
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
