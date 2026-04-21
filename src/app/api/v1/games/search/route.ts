import { NextResponse } from 'next/server';
import { searchGamesOnRAWG } from '@/services/rawgService';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Debes proporcionar un término de búsqueda válido (mínimo 2 caracteres).' }, 
        { status: 400 }
      );
    }

    const results = await searchGamesOnRAWG(query.trim());

    return NextResponse.json({ 
      message: 'Búsqueda completada exitosamente',
      results 
    }, { status: 200 });

  } catch (error) {
    console.error('Error en la búsqueda de juegos:', error);
    return NextResponse.json(
      { error: 'Error interno al comunicarse con el servidor de juegos.' }, 
      { status: 500 }
    );
  }
}