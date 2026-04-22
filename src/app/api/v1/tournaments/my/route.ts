import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token expirado o inválido' }, { status: 401 });
    }

    const query = `
      SELECT 
        t.id, t.game_id, t.name, t.description, t.type, t.status, 
        t.max_participants, t.start_date, t.end_date, t.created_at,
        g.name AS game_name,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) AS current_participants
      FROM tournaments t
      JOIN games g ON t.game_id = g.id
      WHERE t.creator_id = $1
      ORDER BY t.created_at DESC;
    `;

    const tournamentsResult = await pool.query(query, [decodedUser.id]);

    return NextResponse.json({
      message: 'Mis torneos recuperados exitosamente',
      tournaments: tournamentsResult.rows
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo mis torneos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}