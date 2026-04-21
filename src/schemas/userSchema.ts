import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  biografia: z.string().max(500, 'La biografía es muy larga').optional(),
  riot_id: z.string().optional(), 
});