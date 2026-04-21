import { NextResponse } from 'next/server';
import { pool } from '@/config/database';
import { verifyToken } from '@/lib/jwt';
import { updateUserSchema } from '@/schemas/userSchema';


export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const query = `
      SELECT id, name, email, biografia, role, riot_id, created_at 
      FROM users 
      WHERE id = $1
    `;
    const userResult = await pool.query(query, [decodedUser.id]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const statsQuery = `
      SELECT COUNT(*) as torneos_jugados 
      FROM tournament_participants 
      WHERE user_id = $1
    `;
    const statsResult = await pool.query(statsQuery, [decodedUser.id]);

    return NextResponse.json({
      message: 'Perfil recuperado',
      user: userResult.rows[0],
      stats: statsResult.rows[0]
    }, { status: 200 });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await req.json();
    const result = updateUserSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { name, biografia, riot_id } = result.data;

    if (name === undefined && biografia === undefined && riot_id === undefined) {
      return NextResponse.json({ message: 'No se enviaron datos para actualizar' }, { status: 200 });
    }


    const updates: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${queryIndex++}`);
      values.push(name);
    }
    if (biografia !== undefined) {
      updates.push(`biografia = $${queryIndex++}`);
      values.push(biografia);
    }
    if (riot_id !== undefined) {
      updates.push(`riot_id = $${queryIndex++}`);
      values.push(riot_id);
    }

    updates.push(`updated_at = NOW()`);

    values.push(decodedUser.id);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${queryIndex} 
      RETURNING id, name, email, biografia, role, riot_id, updated_at;
    `;

    const updatedUserResult = await pool.query(updateQuery, values);

    return NextResponse.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUserResult.rows[0]
    }, { status: 200 });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'Este Riot ID ya está vinculado a otra cuenta' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}