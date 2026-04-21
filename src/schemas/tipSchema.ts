import { z } from 'zod';

const buildSchema = z.object({
  champion: z.string().min(1, 'El campeón es obligatorio'),
  role: z.string().min(1, 'El rol es obligatorio'),
  items: z.record(z.string(), z.any()), 
  runes: z.record(z.string(), z.any()), 
  skill_order: z.record(z.string(), z.any()).optional(),
  patch_version: z.string().optional(),
});
export const createTipSchema = z.object({
  game_id: z.number().int().positive('El ID del juego es obligatorio'),
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(200),
  content: z.string().min(10, 'El contenido debe ser más detallado'),
  category: z.string().optional(),
  build: buildSchema.optional(),
});