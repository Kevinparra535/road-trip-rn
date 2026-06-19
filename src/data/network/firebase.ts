import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';

import { firebaseConfig } from '@/config/firebase.config';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

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

/**
 * `ignoreUndefinedProperties` evita que los payloads con campos opcionales en
 * `undefined` (notes/avoid/round_trip/days y sus campos nested) rompan
 * `addDoc`/`setDoc` con "Unsupported field value: undefined". `initializeFirestore`
 * debe llamarse una sola vez; en hot-reload caemos a `getFirestore`.
 */
function resolveFirestore(): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseApp = app;
export const firebaseAuth = resolveAuth();
export const firestore = resolveFirestore();
