import { z } from 'zod';

export const createMatchSchema = z.object({
  game_id: z.number().int().positive('El ID del juego es obligatorio (referencia a tu tabla games)'),
  title: z.string().min(3, 'El título de la partida debe tener al menos 3 caracteres').max(150),
  description: z.string().optional(),
  max_players: z.number().int().min(2, 'La partida debe ser para al menos 2 jugadores'),
  scheduled_at: z.string().datetime().optional(), 
});