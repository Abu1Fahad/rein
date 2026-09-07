/* Cloudflare Pages Serverless Function - MongoDB Atlas Tournaments API */
import { getDatabase } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { validateTournamentInput, sanitizeString } from '../_lib/validators.js';

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
    // 1. GET /api/tournaments
    if (request.method === 'GET') {
      const tourneyId = url.searchParams.get('id');

      if (tourneyId) {
        const tourney = await db.findOne('tournaments', { id: tourneyId });
        if (!tourney) {
          return new Response(JSON.stringify({ success: false, message: 'Tournament not found' }), { status: 404, headers });
        }
        const players = await db.find('players', { tourneyId }, { sort: { rank: 1 } });
        const matches = await db.find('matches', { tourneyId }, { sort: { date: -1 } });

        return new Response(JSON.stringify({
          success: true,
          tournament: tourney,
          playerCount: players.length,
          matchCount: matches.length
        }), { status: 200, headers });
      }

      const tourneys = await db.find('tournaments', {}, { sort: { createdAt: -1 } });
      return new Response(JSON.stringify({
        success: true,
        tournaments: tourneys
      }), { status: 200, headers });
    }

    // 2. POST /api/tournaments
    if (request.method === 'POST') {
      const action = url.searchParams.get('action');

      // Generate Group Stages
      if (action === 'generate_groups') {
        const adminCheck = await requireAdmin(request, env);
        if (!adminCheck.isAuthorized) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Admin credentials required to generate groups.' }), { status: 403, headers });
        }

        const body = await request.json().catch(() => ({}));
        const { tourneyId, teamCount } = body;
        const targetTourneyId = tourneyId || 'tourney-1';
        const totalTeams = Math.max(4, parseInt(teamCount, 10) || 16);

        const players = await db.find('players', { tourneyId: targetTourneyId }, { sort: { elo: -1 } });
        if (players.length === 0) {
          return new Response(JSON.stringify({ success: false, message: 'No competitors in tournament to distribute into groups' }), { status: 400, headers });
        }

        const groupNames = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
        const numGroups = totalTeams <= 8 ? 2 : (totalTeams <= 16 ? 4 : 8);

        // Snake-draft distribution for balanced competitive groups
        for (let i = 0; i < players.length; i++) {
          const groupIdx = i % numGroups;
          const assignedGroup = groupNames[groupIdx] || `Group ${groupIdx + 1}`;
          await db.updateOne('players', { id: players[i].id }, {
            group: assignedGroup,
            lives: 2
          });
        }

        await db.updateOne('tournaments', { id: targetTourneyId }, { teamCount: totalTeams, status: 'Live' });

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully balanced ${players.length} competitors across ${numGroups} groups.`,
          numGroups
        }), { status: 200, headers });
      }

      // Create New Tournament
      const body = await request.json().catch(() => ({}));
      const validation = validateTournamentInput(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({ success: false, message: validation.message }), { status: 400, headers });
      }

      const created = await db.insertOne('tournaments', {
        ...validation.tournament,
        id: 'tourney-' + Date.now()
      });

      return new Response(JSON.stringify({
        success: true,
        message: `Tournament "${created.name}" created in MongoDB Atlas.`,
        tournament: created
      }), { status: 201, headers });
    }

    // 3. PUT /api/tournaments
    if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const id = body.id || url.searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ success: false, message: 'Tournament ID required' }), { status: 400, headers });
      }

      const updated = await db.updateOne('tournaments', { id }, body);
      if (!updated) {
        return new Response(JSON.stringify({ success: false, message: 'Tournament not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Tournament updated successfully.',
        tournament: updated
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err.message }), { status: 500, headers });
  }
}
