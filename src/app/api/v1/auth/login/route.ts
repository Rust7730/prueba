import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/config/database';
import { loginSchema } from '@/schemas/authSchema';
import { generateToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Validación estricta con Zod
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ errors: result.error.format() }, { status: 400 });
    }

    const { email, password } = result.data;

    // 2. Buscar usuario en PostgreSQL
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // 3. Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // 4. Generar JWT con el rol incluido
    const token = generateToken({ id: user.id, role: user.role });

    return NextResponse.json({ 
      message: 'Login exitoso', 
      token,
      user: { id: user.id, name: user.name, role: user.role } 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}