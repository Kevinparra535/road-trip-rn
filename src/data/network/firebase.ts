import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { ENV } from '@/config/env';

const app = getApps().length ? getApps()[0] : initializeApp(ENV.firebase);

/**
 * `initializeAuth` debe llamarse una sola vez por app. En hot-reload puede
 * relanzarse, por eso caemos a `getAuth` si ya estaba inicializado.
 */
function resolveAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const firebaseApp = app;
export const firebaseAuth = resolveAuth();
export const firestore = getFirestore(app);
