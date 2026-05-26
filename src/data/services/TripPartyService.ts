import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { injectable } from 'inversify';

import { PartyMemberJson, TripPartyModel } from '@/data/models/tripPartyModel';

import { firestore } from '@/data/network/firebase';

const PARTIES_COLLECTION = 'parties';

export interface TripPartyService {
  create(payload: {
    route_id: string;
    owner_id: string;
    members: PartyMemberJson[];
  }): Promise<TripPartyModel>;

  fetchById(partyId: string): Promise<TripPartyModel | null>;

  /**
   * Suscribe `onChange` al doc del party. Devuelve la unsubscribe nativa de
   * Firestore. `null` se pasa cuando el doc deja de existir.
   */
  observe(
    partyId: string,
    onChange: (model: TripPartyModel | null) => void,
    onError?: (err: Error) => void,
  ): () => void;

  updateMembers(
    partyId: string,
    payload: { members: PartyMemberJson[]; owner_id?: string },
  ): Promise<void>;

  delete(partyId: string): Promise<void>;
}

@injectable()
export class TripPartyServiceImpl implements TripPartyService {
  async create(payload: {
    route_id: string;
    owner_id: string;
    members: PartyMemberJson[];
  }): Promise<TripPartyModel> {
    const ref = await addDoc(collection(firestore, PARTIES_COLLECTION), {
      ...payload,
      created_at: serverTimestamp(),
    });
    return TripPartyModel.fromJson({ id: ref.id, ...payload });
  }

  async fetchById(partyId: string): Promise<TripPartyModel | null> {
    const snap = await getDoc(doc(firestore, PARTIES_COLLECTION, partyId));
    if (!snap.exists()) return null;
    return TripPartyModel.fromJson({ id: snap.id, ...snap.data() });
  }

  observe(
    partyId: string,
    onChange: (model: TripPartyModel | null) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const ref = doc(firestore, PARTIES_COLLECTION, partyId);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          onChange(null);
          return;
        }
        onChange(TripPartyModel.fromJson({ id: snap.id, ...snap.data() }));
      },
      (err) => onError?.(err),
    );
  }

  async updateMembers(
    partyId: string,
    payload: { members: PartyMemberJson[]; owner_id?: string },
  ): Promise<void> {
    const update: Record<string, unknown> = { members: payload.members };
    if (payload.owner_id !== undefined) update.owner_id = payload.owner_id;
    await updateDoc(doc(firestore, PARTIES_COLLECTION, partyId), update);
  }

  async delete(partyId: string): Promise<void> {
    await deleteDoc(doc(firestore, PARTIES_COLLECTION, partyId));
  }
}
