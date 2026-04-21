import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { verifyToken } from '@/lib/jwt';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    await client.query('BEGIN');

    const tournamentResult = await client.query(
      'SELECT game_id, creator_id, status FROM tournaments WHERE id = $1', 
      [tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    const tournament = tournamentResult.rows[0];

    if (tournament.creator_id !== decodedUser.id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Solo el creador del torneo puede generar las llaves' }, { status: 403 });
    }

    if (tournament.status !== 'registration') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Las llaves ya fueron generadas o el torneo ya empezó' }, { status: 400 });
    }

    const participantsQuery = `
      SELECT tp.user_id, COALESCE(SUM(r.wins), 0) AS historical_wins
      FROM tournament_participants tp
      LEFT JOIN rankings r ON tp.user_id = r.user_id AND r.game_id = $1
      WHERE tp.tournament_id = $2
      GROUP BY tp.user_id
    `;
    const participantsResult = await client.query(participantsQuery, [tournament.game_id, tournamentId]);
    const participants = participantsResult.rows;

    if (participants.length < 2) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No hay suficientes participantes para generar llaves' }, { status: 400 });
    }

    const sortedParticipants = participants.map(p => {
      const randomness = Math.floor(Math.random() * 15);
      return {
        user_id: p.user_id,
        sortScore: Number(p.historical_wins) + randomness
      };
    }).sort((a, b) => b.sortScore - a.sortScore); 

    let matchCounter = 1;
    
    for (let i = 0; i < sortedParticipants.length - 1; i += 2) {
      const player1 = sortedParticipants[i];
      const player2 = sortedParticipants[i + 1];

      const matchInsert = await client.query(`
        INSERT INTO matches (game_id, creator_id, title, status, max_players) 
        VALUES ($1, $2, $3, 'scheduled', 2) RETURNING id
      `, [tournament.game_id, tournament.creator_id, `Ronda 1 - Partida ${matchCounter}`]);
      
      const matchId = matchInsert.rows[0].id;

      await client.query(`
        INSERT INTO tournament_matches (tournament_id, match_id, round, bracket_position) 
        VALUES ($1, $2, 1, $3)
      `, [tournamentId, matchId, matchCounter]);

      await client.query(`
        INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2), ($1, $3)
      `, [matchId, player1.user_id, player2.user_id]);

      matchCounter++;
    }

    await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [tournamentId]);

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Llaves generadas exitosamente. Las inscripciones han cerrado.',
      total_matches_created: matchCounter - 1
    }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generando las llaves:', error);
    return NextResponse.json({ error: 'Error interno al generar el torneo' }, { status: 500 });
  } finally {
    client.release();
  }
}