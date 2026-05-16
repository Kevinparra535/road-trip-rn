import { Rider } from '@/domain/entities/Rider';

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export interface AuthRepository {
  signUp(input: SignUpInput): Promise<Rider>;
  signIn(input: SignInInput): Promise<Rider>;
  signOut(): Promise<void>;
  getCurrentRider(): Promise<Rider | null>;
  observeAuthState(listener: (rider: Rider | null) => void): () => void;
}
