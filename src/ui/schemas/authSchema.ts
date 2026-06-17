import { z } from 'zod';

/**
 * Validación de los formularios de autenticación. Es una preocupación de UI
 * (forma del input), no de dominio: las reglas de negocio de auth viven en los
 * UseCases. Aquí solo validamos que los campos requeridos estén presentes.
 */
export const signInSchema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type SignInForm = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, 'El nombre es obligatorio'),
});
export type SignUpForm = z.infer<typeof signUpSchema>;
