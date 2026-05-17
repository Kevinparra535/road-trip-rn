import { Motorcycle } from '@/domain/entities/Motorcycle';
import { Rider } from '@/domain/entities/Rider';

/**
 * Flags de desarrollo. NO dejar activados en produccion.
 *
 * `bypassAuth`: salta el login inyectando un rider falso. Sirve para ver la
 *   app en el emulador mientras Firebase Auth aun no esta configurado.
 * `mockGarage`: inyecta una moto de prueba en el garaje, sin pasar por
 *   Firestore. Util para revisar el flujo de moto sin backend.
 *
 * Ponlos en `false` (o borra este archivo) cuando el backend este listo.
 */
export const DEV_FLAGS = {
  bypassAuth: true,
  mockGarage: true,
};

/** Rider falso usado cuando `DEV_FLAGS.bypassAuth` esta activo. */
export const DEV_FAKE_RIDER = new Rider({
  id: 'dev-rider',
  email: 'dev@roadtrip.app',
  displayName: 'Rider Dev',
});

/** Moto de prueba (mock temporal) inyectada cuando `DEV_FLAGS.mockGarage`. */
export const DEV_FAKE_MOTORCYCLE = new Motorcycle({
  id: 'dev-moto-cfmoto-450mt',
  riderId: DEV_FAKE_RIDER.id,
  brand: 'CFMOTO',
  model: '450MT',
  year: 2026,
  nickname: null,
  fuelType: 'extra',
  tankCapacityLiters: 17.5,
  fuelConsumptionKmPerLiter: 26,
  engineCc: 449,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});
