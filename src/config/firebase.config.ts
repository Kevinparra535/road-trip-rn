import { FirebaseOptions } from 'firebase/app';

import { ENV } from '@/config/env';

/**
 * Configuracion del proyecto Firebase.
 *
 * Los valores se consumen desde variables de entorno via la cadena
 * `.env` -> `app.config.js` -> `expo.extra` -> `ENV` (ver `@/config/env`);
 * nunca se hardcodean en el repositorio. La inicializacion del SDK vive en
 * `src/data/network/firebase.ts`.
 *
 * `measurementId` es opcional (Firebase JS SDK v7.20.0+). Firebase Analytics
 * web (`firebase/analytics`) no corre en React Native, por lo que solo se
 * guarda el id para integrarlo mas adelante con un SDK nativo.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: ENV.firebase.apiKey,
  authDomain: ENV.firebase.authDomain,
  projectId: ENV.firebase.projectId,
  storageBucket: ENV.firebase.storageBucket,
  messagingSenderId: ENV.firebase.messagingSenderId,
  appId: ENV.firebase.appId,
  measurementId: ENV.firebase.measurementId,
};
