/* Cloudflare Pages Serverless Function - MongoDB Atlas Unified Data & Backup Engine */
import { getDatabase } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { getRankFromElo, calculateRoundBasedEloChange } from '../_lib/elo.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const db = getDatabase(env);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // 1. GET /api/data - Read authoritative full state from MongoDB Atlas
    if (request.method === 'GET') {
      const tourneyId = url.searchParams.get('tourneyId');
      const state = await db.getFullState(tourneyId);

      return new Response(JSON.stringify({
        success: true,
        source: 'mongodb-atlas',
        database: 'rein',
        data: state,
        timestamp: Date.now()
      }), {
        status: 200,
        headers
      });
    }

    // 2. POST /api/data - Synchronize, Backup, Restore, or Reset
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const action = body.action || url.searchParams.get('action') || 'sync_all';

      // 2A. EXPORT BACKUP JSON (Admin Only)
      if (action === 'backup') {
        const adminCheck = await requireAdmin(request, env);
        if (!adminCheck.isAuthorized) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required to export database.' }), { status: 403, headers });
        }

        const fullState = await db.getFullState();
        return new Response(JSON.stringify({
          success: true,
          exportedAt: new Date().toISOString(),
          version: 'rein-1v1-v8.0',
          data: fullState
        }), { status: 200, headers });
      }

      // 2B. RESTORE BACKUP JSON (Admin Only)
      if (action === 'restore') {
        const adminCheck = await requireAdmin(request, env);
        if (!adminCheck.isAuthorized) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required to restore database.' }), { status: 403, headers });
        }

        const backupData = body.data || body;
        if (!backupData || (!backupData.players && !backupData.tournaments)) {
          return new Response(JSON.stringify({ success: false, message: 'Malformed backup JSON file.' }), { status: 400, headers });
        }

        const updatedState = await db.replaceDatabase(backupData);
        return new Response(JSON.stringify({
          success: true,
          message: 'Database restored and synchronized to MongoDB Atlas successfully.',
          data: updatedState
        }), { status: 200, headers });
      }

      // 2C. RESET DATABASE TO OFFICIAL DEFAULTS (Admin Only)
      if (action === 'reset') {
        const adminCheck = await requireAdmin(request, env);
        if (!adminCheck.isAuthorized) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required to reset database.' }), { status: 403, headers });
        }

        const defaultState = await db.resetToDefaults();
        return new Response(JSON.stringify({
          success: true,
          message: 'Database reset to official default state in MongoDB Atlas.',
          data: defaultState
        }), { status: 200, headers });
      }

      // 2D. ADD PLAYER ACTION
      if (action === 'add_player' && body.player) {
        const newPlayer = {
          ...body.player,
          id: body.player.id || ('p-' + Date.now()),
          tier: getRankFromElo(body.player.elo || 500).full
        };
        await db.insertOne('players', newPlayer);
      }

      // 2E. RECORD MATCH ACTION
      if (action === 'record_match' && body.match) {
        await db.insertOne('matches', body.match);
        if (body.updatedPlayers && Array.isArray(body.updatedPlayers)) {
          for (const up of body.updatedPlayers) {
            await db.updateOne('players', { id: up.id }, up);
          }
        }
      }

      // 2F. ADD TOURNAMENT ACTION
      if (action === 'add_tournament' && body.tournament) {
        await db.insertOne('tournaments', body.tournament);
      }

      // 2G. GENERAL SYNC ALL
      if (action === 'sync_all' && body.data) {
        const adminCheck = await requireAdmin(request, env);
        if (adminCheck.isAuthorized) {
          await db.replaceDatabase(body.data);
        }
      }

      const currentState = await db.getFullState();

      return new Response(JSON.stringify({
        success: true,
        message: 'Data synchronized successfully to MongoDB Atlas cluster',
        lastUpdated: currentState.lastUpdated,
        data: currentState
      }), {
        status: 200,
        headers
      });
    }

    // 3. PUT /api/data - Update individual records
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { type, id, updates } = body;

      if (type === 'player' && id) {
        const updated = await db.updateOne('players', { id }, updates);
        if (updated) return new Response(JSON.stringify({ success: true, player: updated }), { status: 200, headers });
      } else if (type === 'tournament' && id) {
        const updated = await db.updateOne('tournaments', { id }, updates);
        if (updated) return new Response(JSON.stringify({ success: true, tournament: updated }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ success: false, message: 'Record not found' }), { status: 404, headers });
    }

    // 4. DELETE /api/data - Delete individual records
    if (request.method === 'DELETE') {
      const adminCheck = await requireAdmin(request, env);
      if (!adminCheck.isAuthorized) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized.' }), { status: 403, headers });
      }

      const body = await request.json().catch(() => ({}));
      const { type, id } = body;

      if (type === 'player' && id) {
        const delRes = await db.deleteOne('players', { id });
        return new Response(JSON.stringify({ success: true, message: 'Player removed', deletedCount: delRes.deletedCount }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ success: false, message: 'Invalid delete parameters' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Server error handling MongoDB Atlas: ' + err.message
    }), {
      status: 500,
      headers
    });
  }
}
