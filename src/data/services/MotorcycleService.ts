import { injectable } from 'inversify';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { MotorcycleModel } from '@/data/models/motorcycleModel';
import { firestore } from '@/data/network/firebase';

const MOTORCYCLES_COLLECTION = 'motorcycles';

export interface MotorcycleService {
  fetchAllByRider(riderId: string): Promise<MotorcycleModel[]>;
  fetchById(id: string): Promise<MotorcycleModel | null>;
  create(payload: Record<string, unknown>): Promise<MotorcycleModel>;
  update(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<MotorcycleModel>;
  delete(id: string): Promise<void>;
}

@injectable()
export class MotorcycleServiceImpl implements MotorcycleService {
  async fetchAllByRider(riderId: string): Promise<MotorcycleModel[]> {
    const snapshot = await getDocs(
      query(
        collection(firestore, MOTORCYCLES_COLLECTION),
        where('rider_id', '==', riderId),
      ),
    );
    return snapshot.docs.map((d) =>
      MotorcycleModel.fromJson({ id: d.id, ...d.data() }),
    );
  }

  async fetchById(id: string): Promise<MotorcycleModel | null> {
    const snapshot = await getDoc(doc(firestore, MOTORCYCLES_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return MotorcycleModel.fromJson({ id: snapshot.id, ...snapshot.data() });
  }

  async create(payload: Record<string, unknown>): Promise<MotorcycleModel> {
    const ref = await addDoc(collection(firestore, MOTORCYCLES_COLLECTION), {
      ...payload,
      created_at: serverTimestamp(),
    });
    return MotorcycleModel.fromJson({ id: ref.id, ...payload });
  }

  async update(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<MotorcycleModel> {
    await updateDoc(doc(firestore, MOTORCYCLES_COLLECTION, id), payload);
    return MotorcycleModel.fromJson({ id, ...payload });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(firestore, MOTORCYCLES_COLLECTION, id));
  }
}
