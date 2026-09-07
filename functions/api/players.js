/* Cloudflare Pages Serverless Function - MongoDB Atlas Players API */
import { getDatabase } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { getRankFromElo } from '../_lib/elo.js';
import { validatePlayerInput, sanitizeString } from '../_lib/validators.js';

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
    // 1. GET /api/players (Optionally filter by ?tourneyId=... or ?id=...)
    if (request.method === 'GET') {
      const tourneyId = url.searchParams.get('tourneyId');
      const playerId = url.searchParams.get('id');

      if (playerId) {
        const player = await db.findOne('players', { id: playerId });
        if (!player) {
          return new Response(JSON.stringify({ success: false, message: 'Player not found' }), { status: 404, headers });
        }
        const rankInfo = getRankFromElo(player.elo);
        return new Response(JSON.stringify({
          success: true,
          player: { ...player, tier: rankInfo.full, tierClass: rankInfo.class }
        }), { status: 200, headers });
      }

      const query = tourneyId ? { tourneyId } : {};
      const players = await db.find('players', query, { sort: { rank: 1 } });
      
      const enriched = players.map(p => {
        const rankInfo = getRankFromElo(p.elo);
        return {
          ...p,
          tier: rankInfo.full,
          tierClass: rankInfo.class
        };
      });

      return new Response(JSON.stringify({
        success: true,
        count: enriched.length,
        players: enriched
      }), { status: 200, headers });
    }

    // 2. POST /api/players (Create New Competitor - Admin Only)
    if (request.method === 'POST') {
      const action = url.searchParams.get('action');

      // Reordering ranks
      if (action === 'reorder') {
        const adminCheck = await requireAdmin(request, env);
        if (!adminCheck.isAuthorized) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required.' }), { status: 403, headers });
        }

        const body = await request.json().catch(() => ({}));
        const { playerId, newRank, tourneyId } = body;
        if (!playerId || !newRank) {
          return new Response(JSON.stringify({ success: false, message: 'Player ID and target rank required' }), { status: 400, headers });
        }

        const targetTourney = tourneyId || 'tourney-1';
        const tourneyPlayers = await db.find('players', { tourneyId: targetTourney }, { sort: { rank: 1 } });
        const pIndex = tourneyPlayers.findIndex(p => p.id === playerId);
        if (pIndex === -1) {
          return new Response(JSON.stringify({ success: false, message: 'Player not found in tournament' }), { status: 404, headers });
        }

        const [movingPlayer] = tourneyPlayers.splice(pIndex, 1);
        const insertIdx = Math.max(0, Math.min(tourneyPlayers.length, parseInt(newRank, 10) - 1));
        tourneyPlayers.splice(insertIdx, 0, movingPlayer);

        for (let i = 0; i < tourneyPlayers.length; i++) {
          await db.updateOne('players', { id: tourneyPlayers[i].id }, { rank: i + 1 });
        }

        return new Response(JSON.stringify({ success: true, message: 'Rank positions updated successfully' }), { status: 200, headers });
      }

      // Add Player
      const body = await request.json().catch(() => ({}));
      const validation = validatePlayerInput(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({ success: false, message: validation.message }), { status: 400, headers });
      }

      const existingCount = await db.countDocuments('players', { tourneyId: validation.player.tourneyId });
      const newPlayerDoc = {
        ...validation.player,
        rank: existingCount + 1,
        tier: getRankFromElo(validation.player.elo).full
      };

      const created = await db.insertOne('players', newPlayerDoc);
      return new Response(JSON.stringify({
        success: true,
        message: `Competitor "${created.name}" created and synced to MongoDB Atlas.`,
        player: created
      }), { status: 201, headers });
    }

    // 3. PUT /api/players (Update Existing Competitor)
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const playerId = body.id || url.searchParams.get('id');

      if (!playerId) {
        return new Response(JSON.stringify({ success: false, message: 'Player ID is required for update' }), { status: 400, headers });
      }

      const existing = await db.findOne('players', { id: playerId });
      if (!existing) {
        return new Response(JSON.stringify({ success: false, message: 'Player not found' }), { status: 404, headers });
      }

      const validation = validatePlayerInput({ ...existing, ...body });
      if (!validation.valid) {
        return new Response(JSON.stringify({ success: false, message: validation.message }), { status: 400, headers });
      }

      const updated = await db.updateOne('players', { id: playerId }, {
        ...validation.player,
        tier: getRankFromElo(validation.player.elo).full
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Competitor profile updated in MongoDB Atlas.',
        player: updated
      }), { status: 200, headers });
    }

    // 4. DELETE /api/players (Delete Competitor - Admin Only)
    if (request.method === 'DELETE') {
      const adminCheck = await requireAdmin(request, env);
      if (!adminCheck.isAuthorized) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required to delete competitors.' }), { status: 403, headers });
      }

      const playerId = url.searchParams.get('id') || (await request.json().catch(() => ({}))).id;
      if (!playerId) {
        return new Response(JSON.stringify({ success: false, message: 'Player ID required' }), { status: 400, headers });
      }

      const delRes = await db.deleteOne('players', { id: playerId });
      if (delRes.deletedCount > 0) {
        return new Response(JSON.stringify({ success: true, message: 'Player removed from MongoDB Atlas.' }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ success: false, message: 'Player not found' }), { status: 404, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err.message }), { status: 500, headers });
  }
}
