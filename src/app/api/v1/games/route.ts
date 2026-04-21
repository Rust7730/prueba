import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { createGameSchema } from '@/schemas/gameSchema';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Token faltante o inválido.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Token expirado o inválido.' }, { status: 401 });
    }

    const body = await req.json();
    const result = createGameSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { name, description, category, image_url, max_players, rawg_id } = result.data;

    const gameCheck = await pool.query('SELECT id FROM games WHERE rawg_id = $1', [rawg_id]);
    if (gameCheck.rows.length > 0) {
      return NextResponse.json(
        { message: 'El juego ya existe en la plataforma', gameId: gameCheck.rows[0].id },
        { status: 200 }
      );
    }

    const insertQuery = `
      INSERT INTO games (name, description, category, image_url, max_players, rawg_id, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    
    const newGameResult = await pool.query(insertQuery, [
      name, description, category, image_url, max_players, rawg_id, decodedUser.id
    ]);

    return NextResponse.json({
      message: 'Juego registrado exitosamente',
      game: newGameResult.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error guardando el juego:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}