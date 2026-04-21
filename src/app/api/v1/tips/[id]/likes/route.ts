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
    const tipId = parseInt(id, 10);
    if (isNaN(tipId)) {
      return NextResponse.json({ error: 'ID de tip inválido' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token expirado o inválido' }, { status: 401 });
    }

    await client.query('BEGIN');

    const tipCheck = await client.query('SELECT id FROM tips WHERE id = $1', [tipId]);
    if (tipCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'El tip no existe' }, { status: 404 });
    }

    const likeCheck = await client.query(
      'SELECT id FROM tip_likes WHERE tip_id = $1 AND user_id = $2',
      [tipId, decodedUser.id]
    );

    let action = '';

    if (likeCheck.rows.length > 0) {
      await client.query('DELETE FROM tip_likes WHERE id = $1', [likeCheck.rows[0].id]);
      await client.query('UPDATE tips SET likes_count = likes_count - 1 WHERE id = $1', [tipId]);
      action = 'unliked';
    } else {
      await client.query(
        'INSERT INTO tip_likes (tip_id, user_id) VALUES ($1, $2)',
        [tipId, decodedUser.id]
      );
      await client.query('UPDATE tips SET likes_count = likes_count + 1 WHERE id = $1', [tipId]);
      action = 'liked';
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: action === 'liked' ? 'Like agregado' : 'Like removido',
      action
    }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error procesando el like:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    client.release();
  }
}