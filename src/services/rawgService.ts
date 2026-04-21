const RAWG_API_KEY = process.env.RAWG_API_KEY;
const BASE_URL = 'https://api.rawg.io/api';

export const searchGamesOnRAWG = async (query: string) => {
  if (!RAWG_API_KEY) throw new Error('RAWG_API_KEY no está configurada');

  const response = await fetch(`${BASE_URL}/games?key=${RAWG_API_KEY}&search=${query}&page_size=5`);
  
  if (!response.ok) throw new Error('Error al conectar con RAWG');
  
  const data = await response.json();
  
  return data.results.map((game: any) => ({
    rawg_id: game.id,
    name: game.name,
    image_url: game.background_image,

  }));
};