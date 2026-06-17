import { z } from 'zod';

/**
 * Validación del formulario de moto. Preocupación de UI (forma del input): el
 * VM parsea los textos a número y los valida contra estos esquemas. Las
 * invariantes de dominio reales viven en la entidad `Motorcycle` / UseCases.
 */

/** Datos mínimos para buscar la ficha técnica por marca/modelo/año. */
export const motorcycleSpecsSearchSchema = z.object({
  brand: z.string().trim().min(1, 'La marca es obligatoria'),
  model: z.string().trim().min(1, 'El modelo es obligatorio'),
  year: z.number().int().positive('El año debe ser válido'),
});
export type MotorcycleSpecsSearchForm = z.infer<
  typeof motorcycleSpecsSearchSchema
>;

/** Formulario completo para crear/editar una moto. */
export const motorcycleFormSchema = motorcycleSpecsSearchSchema.extend({
  tankCapacity: z.number().positive('La capacidad del tanque debe ser > 0'),
  consumption: z.number().positive('El rendimiento debe ser > 0'),
});
export type MotorcycleForm = z.infer<typeof motorcycleFormSchema>;
