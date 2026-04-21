import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { createTournamentSchema } from '@/schemas/tournamentSchema';
import { verifyToken } from '@/lib/jwt';

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