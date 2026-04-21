import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { getRankingSchema } from '@/schemas/rankingSchema';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryData = {
      game_id: searchParams.get('game_id'),
      period_type: searchParams.get('period_type'),
    };

    const result = getRankingSchema.safeParse(queryData);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { game_id, period_type } = result.data;

  
    const rankingQuery = `
      SELECT 
        RANK() OVER (ORDER BY r.total_score DESC, r.wins DESC) as live_position,
        u.name as player_name,
        r.total_score,
        r.wins,
        r.matches_played,
        r.period_start,
        r.period_end
      FROM rankings r
      JOIN users u ON r.user_id = u.id
      WHERE r.game_id = $1 AND r.period_type = $2
      ORDER BY live_position ASC
      LIMIT 100; -- Traemos solo el Top 100 para no saturar el frontend
    `;

    const rankingResult = await pool.query(rankingQuery, [game_id, period_type]);

    return NextResponse.json({
      message: `Ranking ${period_type} recuperado exitosamente`,
      game_id,
      leaderboard: rankingResult.rows
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo el ranking:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al calcular la tabla de posiciones' }, 
      { status: 500 }
    );
  }
}