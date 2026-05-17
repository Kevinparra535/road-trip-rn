import { Rider } from '@/domain/entities/Rider';

/**
 * Flags de desarrollo. NO dejar activados en produccion.
 *
 * `bypassAuth`: salta el login inyectando un rider falso. Sirve para ver la
 * app en el emulador mientras Firebase Auth aun no esta configurado.
 * Ponlo en `false` (o borra este archivo) cuando Firebase este listo.
 */
export const DEV_FLAGS = {
  bypassAuth: true,
};

/** Rider falso usado cuando `DEV_FLAGS.bypassAuth` esta activo. */
export const DEV_FAKE_RIDER = new Rider({
  id: 'dev-rider',
  email: 'dev@roadtrip.app',
  displayName: 'Rider Dev',
});
