import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { verifyToken } from '@/lib/jwt';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt((await params).id, 10);
    if (isNaN(tournamentId)) {
      return NextResponse.json({ error: 'ID de torneo inválido' }, { status: 400 });
    }
//solo para commit
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token expirado o inválido' }, { status: 401 });
    }

    const tournamentResult = await pool.query(
      'SELECT status, max_participants FROM tournaments WHERE id = $1', 
      [tournamentId]
    );

    if (tournamentResult.rows.length === 0) {
      return NextResponse.json({ error: 'El torneo no existe' }, { status: 404 });
    }

    const tournament = tournamentResult.rows[0];

    if (tournament.status !== 'registration') {
      return NextResponse.json({ error: 'Las inscripciones para este torneo están cerradas' }, { status: 403 });
    }

    const participantCheck = await pool.query(
      'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, decodedUser.id]
    );

    if (participantCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Ya estás inscrito en este torneo' }, { status: 409 });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = $1',
      [tournamentId]
    );
    const currentParticipants = parseInt(countResult.rows[0].count, 10);

    if (currentParticipants >= tournament.max_participants) {
      return NextResponse.json({ error: 'El torneo ha alcanzado el límite máximo de participantes' }, { status: 403 });
    }

    const insertParticipantQuery = `
      INSERT INTO tournament_participants (tournament_id, user_id, joined_at, eliminated) 
      VALUES ($1, $2, NOW(), false) 
      RETURNING id, joined_at;
    `;
    
    await pool.query(insertParticipantQuery, [tournamentId, decodedUser.id]);

    return NextResponse.json({
      message: 'Te has inscrito al torneo exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error al inscribirse en el torneo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}