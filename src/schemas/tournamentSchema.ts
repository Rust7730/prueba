import { z } from 'zod';

export const createTournamentSchema = z.object({
  game_id: z.number().int().positive('El ID del juego es obligatorio'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(150),
  description: z.string().optional(),
type: z.enum(['single', 'double', 'round_robin'] as const, {
    message: 'El tipo de torneo es obligatorio y debe ser single, double o round_robin',
  }),
  max_participants: z.number().int().min(4, 'Mínimo 4 participantes para un torneo'),
  rules: z.string().optional(),
  start_date: z.string().datetime('Formato de fecha de inicio inválido'),
  end_date: z.string().datetime('Formato de fecha de fin inválido').optional(),
}).refine((data) => {
  if (data.end_date) {
    return new Date(data.end_date) > new Date(data.start_date);
  }
  return true;
}, {
  message: "La fecha de finalización debe ser posterior a la fecha de inicio",
  path: ["end_date"],
});