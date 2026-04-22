import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { createTournamentSchema } from '@/schemas/tournamentSchema';
import { verifyToken } from '@/lib/jwt';

export async function GET() {
  try {
    const query = `
      SELECT 
        t.id, t.name, t.description, t.type, t.status, t.max_participants, 
        t.rules, t.start_date, t.end_date, t.created_at,
        g.name AS game_name,
        u.name AS creator_name,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) AS current_participants
      FROM tournaments t
      JOIN games g ON t.game_id = g.id
      JOIN users u ON t.creator_id = u.id
      ORDER BY t.start_date DESC
      LIMIT 50;
    `;

    const tournamentsResult = await pool.query(query);

    return NextResponse.json({
      message: 'Torneos recuperados exitosamente',
      tournaments: tournamentsResult.rows
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo torneos:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener torneos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const result = createTournamentSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { game_id, name, description, type, max_participants, rules, start_date, end_date } = result.data;

    const gameCheck = await pool.query('SELECT id FROM games WHERE id = $1', [game_id]);
    if (gameCheck.rows.length === 0) {
      return NextResponse.json({ error: 'El juego seleccionado no existe.' }, { status: 404 });
    }

    const insertQuery = `
      INSERT INTO tournaments (
        game_id, creator_id, name, description, type, status, max_participants, rules, start_date, end_date
      ) 
      VALUES ($1, $2, $3, $4, $5, 'registration', $6, $7, $8, $9) 
      RETURNING *;
    `;
    
    const newTournamentResult = await pool.query(insertQuery, [
      game_id, 
      decodedUser.id, 
      name, 
      description, 
      type, 
      max_participants, 
      rules, 
      new Date(start_date), 
      end_date ? new Date(end_date) : null
    ]);

    return NextResponse.json({
      message: 'Torneo creado exitosamente',
      tournament: newTournamentResult.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando el torneo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}