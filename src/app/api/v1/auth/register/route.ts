import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/config/database';
import { registerSchema } from '@/schemas/authSchema';
import { generateToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { name, email, password } = result.data;

    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 409 } 
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, 'user') 
      RETURNING id, name, email, role, created_at;
    `;
    
    const newUserResult = await pool.query(insertQuery, [name, email, hashedPassword]);
    const newUser = newUserResult.rows[0];

    const token = generateToken({ id: newUser.id, role: newUser.role });

    return NextResponse.json({
      message: 'Usuario registrado exitosamente',
      token,
      user: newUser
    }, { status: 201 }); 

  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al registrar el usuario' }, 
      { status: 500 }
    );
  }
}