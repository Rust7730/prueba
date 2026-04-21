import { z } from 'zod';

export const createGameSchema = z.object({
  name: z.string().min(1, 'El nombre del juego es obligatorio'),
  description: z.string().optional(),
  category: z.string().optional(), 
  image_url: z.string().url('Debe ser una URL válida').optional(),
  max_players: z.number().int().positive().optional(),
  rawg_id: z.number().int().positive('El ID de RAWG debe ser un número válido'),
});