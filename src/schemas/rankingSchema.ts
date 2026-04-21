import { z } from 'zod';

export const getRankingSchema = z.object({
  game_id: z.coerce.number().int().positive('El ID del juego es obligatorio y debe ser un número'),
  period_type: z.enum(['quincenal', 'mensual'], {
    message: 'El periodo debe ser estrictamente quincenal o mensual',
  }),
});