import { z } from 'zod';

/**
 * Validación del input "Unirse a una ruta": el código de compartir requiere al
 * menos 4 caracteres (sin contar espacios). El resolve real lo hace el UseCase.
 */
export const joinRouteCodeSchema = z.object({
  code: z.string().trim().min(4, 'El código debe tener al menos 4 caracteres'),
});
export type JoinRouteCodeForm = z.infer<typeof joinRouteCodeSchema>;
