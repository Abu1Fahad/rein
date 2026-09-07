/* Cloudflare Pages Serverless Function - MongoDB Atlas Authoritative Match Engine */
import { getDatabase } from '../_lib/db.js';
import { requireAdmin } from '../_lib/auth.js';
import { calculateRoundBasedEloChange, getRankFromElo } from '../_lib/elo.js';
import { validateMatchInput } from '../_lib/validators.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const db = getDatabase(env);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // 1. GET /api/matches (Filter by tourneyId)
    if (request.method === 'GET') {
      const tourneyId = url.searchParams.get('tourneyId');
      const query = tourneyId ? { tourneyId } : {};
      const matches = await db.find('matches', query, { sort: { date: -1 } });

      return new Response(JSON.stringify({
        success: true,
        count: matches.length,
        matches
      }), { status: 200, headers });
    }

    // 2. POST /api/matches (Authoritatively Record Match)
    if (request.method === 'POST') {
      const adminCheck = await requireAdmin(request, env);
      if (!adminCheck.isAuthorized) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Unauthorized. Only administrators can record official tournament matches.'
        }), { status: 403, headers });
      }

      const body = await request.json().catch(() => ({}));
      const validation = validateMatchInput(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({ success: false, message: validation.message }), { status: 400, headers });
      }

      const { p1Id, p2Id, scoreP1, scoreP2, tourneyId } = validation.matchData;

      // Look up both players from MongoDB
      const player1 = await db.findOne('players', { id: p1Id });
      const player2 = await db.findOne('players', { id: p2Id });

      if (!player1 || !player2) {
        return new Response(JSON.stringify({ success: false, message: 'One or both competitors could not be found in the database.' }), { status: 404, headers });
      }

      const isP1Winner = scoreP1 > scoreP2;
      const winnerName = isP1Winner ? player1.name : player2.name;
      const loserName = isP1Winner ? player2.name : player1.name;

      // Authoritative Server-Side ELO Calculations
      const eloChangeP1 = calculateRoundBasedEloChange(player1.elo, player2.elo, scoreP1, scoreP2);
      const eloChangeP2 = calculateRoundBasedEloChange(player2.elo, player1.elo, scoreP2, scoreP1);

      const newEloP1 = Math.max(0, player1.elo + eloChangeP1);
      const newEloP2 = Math.max(0, player2.elo + eloChangeP2);

      const rankInfoP1 = getRankFromElo(newEloP1);
      const rankInfoP2 = getRankFromElo(newEloP2);

      // Create Match Record Document
      const matchDoc = {
        id: 'm-' + Date.now(),
        tourneyId: tourneyId || player1.tourneyId || 'tourney-1',
        p1: player1.name,
        p2: player2.name,
        p1Id: player1.id,
        p2Id: player2.id,
        score: `${scoreP1} - ${scoreP2}`,
        scoreP1,
        scoreP2,
        winner: winnerName,
        loser: loserName,
        eloChangeP1,
        eloChangeP2,
        p1PrevElo: player1.elo,
        p2PrevElo: player2.elo,
        p1NewElo: newEloP1,
        p2NewElo: newEloP2,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      const recordedMatch = await db.insertOne('matches', matchDoc);

      // Update Player 1 in MongoDB
      const updatedP1 = await db.updateOne('players', { id: player1.id }, {
        elo: newEloP1,
        tier: rankInfoP1.full,
        wins: player1.wins + (isP1Winner ? 1 : 0),
        losses: player1.losses + (isP1Winner ? 0 : 1),
        streak: isP1Winner ? (player1.streak + 1) : 0,
        lives: isP1Winner ? player1.lives : Math.max(0, (player1.lives || 2) - 1)
      });

      // Update Player 2 in MongoDB
      const updatedP2 = await db.updateOne('players', { id: player2.id }, {
        elo: newEloP2,
        tier: rankInfoP2.full,
        wins: player2.wins + (isP1Winner ? 0 : 1),
        losses: player2.losses + (isP1Winner ? 1 : 0),
        streak: isP1Winner ? 0 : (player2.streak + 1),
        lives: isP1Winner ? Math.max(0, (player2.lives || 2) - 1) : player2.lives
      });

      // Re-sort tournament ranks based on new ELO
      const allTourneyPlayers = await db.find('players', { tourneyId: matchDoc.tourneyId }, { sort: { elo: -1 } });
      for (let i = 0; i < allTourneyPlayers.length; i++) {
        await db.updateOne('players', { id: allTourneyPlayers[i].id }, { rank: i + 1 });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Match recorded! ${winnerName} won (${scoreP1}-${scoreP2}). ELOs updated in MongoDB Atlas.`,
        match: recordedMatch,
        players: [updatedP1, updatedP2]
      }), { status: 201, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error recording match: ' + err.message }), { status: 500, headers });
  }
}
