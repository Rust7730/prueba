import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { createMatchSchema } from '@/schemas/matchSchema';
import { verifyToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Se requiere inicio de sesión.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Token expirado o inválido.' }, { status: 401 });
    }

    const body = await req.json();
    const result = createMatchSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { game_id, title, description, max_players, scheduled_at } = result.data;

    const gameCheck = await pool.query('SELECT id FROM games WHERE id = $1', [game_id]);
    if (gameCheck.rows.length === 0) {
      return NextResponse.json({ error: 'El juego seleccionado no está registrado en la plataforma.' }, { status: 404 });
    }

    const insertQuery = `
      INSERT INTO matches (game_id, creator_id, title, description, status, max_players, scheduled_at) 
      VALUES ($1, $2, $3, $4, 'open', $5, $6) 
      RETURNING *;
    `;
    
    const scheduleDate = scheduled_at ? new Date(scheduled_at) : null;

    const newMatchResult = await pool.query(insertQuery, [
      game_id, 
      decodedUser.id, 
      title, 
      description, 
      max_players, 
      scheduleDate
    ]);

    return NextResponse.json({
      message: 'Partida creada exitosamente',
      match: newMatchResult.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando la partida:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear la partida' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const query = `
      SELECT 
        m.id, m.title, m.description, m.status, m.max_players, m.scheduled_at, m.created_at,
        g.name AS game_name, g.image_url AS game_image,
        u.name AS creator_name
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN users u ON m.creator_id = u.id
      WHERE m.status = 'open'
      ORDER BY m.created_at DESC
      LIMIT 50;
    `;

    const matchesResult = await pool.query(query);

    return NextResponse.json({
      message: 'Partidas recuperadas exitosamente',
      matches: matchesResult.rows
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo las partidas:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener las partidas' }, { status: 500 });
  }
}