import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { createTipSchema } from '@/schemas/tipSchema';
import { verifyToken } from '@/lib/jwt';
import { validateChampion } from '@/services/riotService';

export async function GET() {
  try {
    const query = `
      SELECT 
        t.id, t.game_id, t.title, t.content, t.category, t.likes_count, t.created_at,
        u.name AS author_name,
        g.name AS game_name
      FROM tips t
      JOIN users u ON t.author_id = u.id
      JOIN games g ON t.game_id = g.id
      ORDER BY t.created_at DESC
      LIMIT 50;
    `;

    const tipsResult = await pool.query(query);

    return NextResponse.json({
      message: 'Tips recuperados exitosamente',
      tips: tipsResult.rows
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo tips:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener tips' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();

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
    const result = createTipSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { game_id, title, content, category, build } = result.data;

    if (build) {
      const isValidChampion = await validateChampion(build.champion);
      if (!isValidChampion) {
        return NextResponse.json({ error: `El campeón '${build.champion}' no es válido o no existe en el parche actual.` }, { status: 400 });
      }
    }


    await client.query('BEGIN');

    const insertTipQuery = `
      INSERT INTO tips (game_id, author_id, title, content, category) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;
    const tipResult = await client.query(insertTipQuery, [
      game_id, decodedUser.id, title, content, category
    ]);
    const newTip = tipResult.rows[0];

    let newBuild = null;
    if (build) {
      const insertBuildQuery = `
        INSERT INTO builds (tip_id, champion, role, items, runes, skill_order, patch_version) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *;
      `;
      const buildResult = await client.query(insertBuildQuery, [
        newTip.id, build.champion, build.role, 
        JSON.stringify(build.items), JSON.stringify(build.runes), 
        build.skill_order ? JSON.stringify(build.skill_order) : null, 
        build.patch_version || null
      ]);
      newBuild = buildResult.rows[0];
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Tip publicado exitosamente',
      tip: {
        ...newTip,
        build: newBuild 
      }
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error publicando el tip/build:', error);
    return NextResponse.json({ error: 'Error interno del servidor al publicar el tip' }, { status: 500 });
  } finally {
    client.release();
  }
}