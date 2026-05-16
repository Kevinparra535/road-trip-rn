import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { ENV } from '@/config/env';

const app = getApps().length ? getApps()[0] : initializeApp(ENV.firebase);

/**
 * Firebase v12 persiste la sesion en React Native automaticamente cuando
 * `@react-native-async-storage/async-storage` esta instalado. `initializeAuth`
 * debe llamarse una sola vez; en hot-reload caemos a `getAuth`.
 */
function resolveAuth(): Auth {
  try {
    return initializeAuth(app);
  } catch {
    return getAuth(app);
  }
}

export const firebaseApp = app;
export const firebaseAuth = resolveAuth();
export const firestore = getFirestore(app);
