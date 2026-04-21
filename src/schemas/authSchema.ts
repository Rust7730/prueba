import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Formato de correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'El nombre es obligatorio'),
  // El rol por defecto será 'user' en la BD, no necesitamos pedirlo
});