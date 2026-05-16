import { injectable } from 'inversify';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { RiderModel } from '@/data/models/riderModel';
import { firebaseAuth, firestore } from '@/data/network/firebase';

const RIDERS_COLLECTION = 'riders';

export interface AuthService {
  signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<RiderModel>;
  signIn(email: string, password: string): Promise<RiderModel>;
  signOut(): Promise<void>;
  getCurrentRider(): Promise<RiderModel | null>;
  onAuthStateChanged(
    listener: (rider: RiderModel | null) => void,
  ): () => void;
}

@injectable()
export class AuthServiceImpl implements AuthService {
  async signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<RiderModel> {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    await updateProfile(credential.user, { displayName });

    const profile = {
      uid: credential.user.uid,
      email,
      display_name: displayName,
      photo_url: null,
      created_at: serverTimestamp(),
    };
    await setDoc(
      doc(firestore, RIDERS_COLLECTION, credential.user.uid),
      profile,
    );

    return RiderModel.fromJson({ ...profile, created_at: new Date() });
  }

  async signIn(email: string, password: string): Promise<RiderModel> {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    return this.resolveRiderModel(credential.user);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(firebaseAuth);
  }

  async getCurrentRider(): Promise<RiderModel | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return this.resolveRiderModel(user);
  }

  onAuthStateChanged(
    listener: (rider: RiderModel | null) => void,
  ): () => void {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        listener(null);
        return;
      }
      listener(await this.resolveRiderModel(user));
    });
  }

  private async resolveRiderModel(user: User): Promise<RiderModel> {
    const snapshot = await getDoc(
      doc(firestore, RIDERS_COLLECTION, user.uid),
    );
    if (snapshot.exists()) {
      return RiderModel.fromJson({ uid: user.uid, ...snapshot.data() });
    }
    return RiderModel.fromJson({
      uid: user.uid,
      email: user.email ?? '',
      display_name: user.displayName ?? '',
      photo_url: user.photoURL,
      created_at: new Date().toISOString(),
    });
  }
}
