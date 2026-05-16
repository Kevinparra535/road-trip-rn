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

import { RouteModel } from '@/data/models/routeModel';
import { firestore } from '@/data/network/firebase';

const ROUTES_COLLECTION = 'routes';

export interface RouteService {
  fetchAllByRider(riderId: string): Promise<RouteModel[]>;
  fetchById(id: string): Promise<RouteModel | null>;
  create(payload: Record<string, unknown>): Promise<RouteModel>;
  update(id: string, payload: Record<string, unknown>): Promise<RouteModel>;
  delete(id: string): Promise<void>;
}

@injectable()
export class RouteServiceImpl implements RouteService {
  async fetchAllByRider(riderId: string): Promise<RouteModel[]> {
    const snapshot = await getDocs(
      query(
        collection(firestore, ROUTES_COLLECTION),
        where('rider_id', '==', riderId),
      ),
    );
    return snapshot.docs.map((d) =>
      RouteModel.fromJson({ id: d.id, ...d.data() }),
    );
  }

  async fetchById(id: string): Promise<RouteModel | null> {
    const snapshot = await getDoc(doc(firestore, ROUTES_COLLECTION, id));
    if (!snapshot.exists()) return null;
    return RouteModel.fromJson({ id: snapshot.id, ...snapshot.data() });
  }

  async create(payload: Record<string, unknown>): Promise<RouteModel> {
    const ref = await addDoc(collection(firestore, ROUTES_COLLECTION), {
      ...payload,
      created_at: serverTimestamp(),
    });
    return RouteModel.fromJson({ id: ref.id, ...payload });
  }

  async update(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<RouteModel> {
    await updateDoc(doc(firestore, ROUTES_COLLECTION, id), payload);
    return RouteModel.fromJson({ id, ...payload });
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(firestore, ROUTES_COLLECTION, id));
  }
}
