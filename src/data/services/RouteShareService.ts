import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { injectable } from 'inversify';

import { RouteShareCodeModel } from '@/data/models/routeShareCodeModel';

import { firestore } from '@/data/network/firebase';

const SHARE_CODES_COLLECTION = 'shareCodes';

export interface RouteShareService {
  /**
   * Crea el documento `/shareCodes/{code}` si NO existe. Devuelve `true` si
   * lo creo, `false` si el codigo ya estaba ocupado (colision). El caller
   * (repo) decide si reintentar con otro codigo.
   */
  createIfMissing(payload: Record<string, unknown>): Promise<boolean>;
  fetchByCode(code: string): Promise<RouteShareCodeModel | null>;
  deleteByCode(code: string): Promise<void>;
}

@injectable()
export class RouteShareServiceImpl implements RouteShareService {
  async createIfMissing(payload: Record<string, unknown>): Promise<boolean> {
    const code = String(payload.code ?? '').toUpperCase();
    if (!code) throw new Error('code requerido en payload.');

    const ref = doc(firestore, SHARE_CODES_COLLECTION, code);
    // Cheque previo: si existe, no escribimos. Race condition existe pero
    // es aceptable para MVP (la probabilidad de colision real en codigos de
    // 32^8 es <1 en mil millones por dia con 1000 codigos activos).
    const existing = await getDoc(ref);
    if (existing.exists()) return false;

    await setDoc(ref, {
      ...payload,
      code,
      created_at: serverTimestamp(),
    });
    return true;
  }

  async fetchByCode(code: string): Promise<RouteShareCodeModel | null> {
    const normalized = code.toUpperCase();
    const snapshot = await getDoc(
      doc(firestore, SHARE_CODES_COLLECTION, normalized),
    );
    if (!snapshot.exists()) return null;
    return RouteShareCodeModel.fromJson({
      code: snapshot.id,
      ...snapshot.data(),
    });
  }

  async deleteByCode(code: string): Promise<void> {
    await deleteDoc(doc(firestore, SHARE_CODES_COLLECTION, code.toUpperCase()));
  }
}
