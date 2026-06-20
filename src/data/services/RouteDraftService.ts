import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { injectable } from 'inversify';

import { RouteDraftModel } from '@/data/models/routeDraftModel';

import { firestore } from '@/data/network/firebase';

const RIDERS_COLLECTION = 'riders';
const DRAFTS_SUBCOLLECTION = 'drafts';

/**
 * Transporte remoto del draft del Planner. Persiste en una subcolección por
 * rider en Firestore: `riders/{riderId}/drafts/{draftKey}`, donde `draftKey`
 * es `current` (draft de creación) o `route_{routeId}` (draft de edición).
 *
 * Un draft por (rider, key): siempre se sobreescribe con `setDoc(..., merge)`.
 * El `updated_at` lo pone el servidor (`serverTimestamp`) para que el merge
 * no-destructivo del repo offline-first compare relojes consistentes.
 */
export interface RouteDraftService {
  fetch(riderId: string, draftKey: string): Promise<RouteDraftModel | null>;
  save(
    riderId: string,
    draftKey: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
  delete(riderId: string, draftKey: string): Promise<void>;
}

@injectable()
export class RouteDraftServiceImpl implements RouteDraftService {
  async fetch(riderId: string, draftKey: string): Promise<RouteDraftModel | null> {
    const snapshot = await getDoc(
      doc(firestore, RIDERS_COLLECTION, riderId, DRAFTS_SUBCOLLECTION, draftKey),
    );
    if (!snapshot.exists()) return null;
    return RouteDraftModel.fromJson({ id: draftKey, ...snapshot.data() });
  }

  async save(
    riderId: string,
    draftKey: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const ref = doc(
      firestore,
      RIDERS_COLLECTION,
      riderId,
      DRAFTS_SUBCOLLECTION,
      draftKey,
    );
    await setDoc(ref, { ...payload, updated_at: serverTimestamp() }, { merge: true });
  }

  async delete(riderId: string, draftKey: string): Promise<void> {
    await deleteDoc(
      doc(firestore, RIDERS_COLLECTION, riderId, DRAFTS_SUBCOLLECTION, draftKey),
    );
  }
}
