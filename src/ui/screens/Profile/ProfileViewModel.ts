import { inject, injectable } from 'inversify';
import { makeAutoObservable } from 'mobx';

import { TYPES } from '@/config/types';

import { SessionStore } from '@/ui/store/SessionStore';

/**
 * ViewModel del `ProfileScreen`. Expone los datos del rider en sesion y la
 * accion de cerrar sesion listos para la UI, delegando el estado real al
 * `SessionStore` (singleton global de sesion). El screen consume solo este VM
 * colocado — nunca el store directamente.
 */
@injectable()
export class ProfileViewModel {
  constructor(
    @inject(TYPES.SessionStore)
    private readonly sessionStore: SessionStore,
  ) {
    makeAutoObservable(this);
  }

  /** Iniciales del rider para el avatar; `--` si aun no hay sesion. */
  get riderInitials(): string {
    const rider = this.sessionStore.currentRider;
    return rider ? rider.initials() : '--';
  }

  /** Nombre visible del rider; fallback generico si no hay sesion. */
  get displayName(): string {
    return this.sessionStore.currentRider?.displayName ?? 'Motero';
  }

  /** Email del rider; cadena vacia si no hay sesion. */
  get email(): string {
    return this.sessionStore.currentRider?.email ?? '';
  }

  get isSignOutLoading(): boolean {
    return this.sessionStore.isSignOutLoading;
  }

  get isSignOutError(): string | null {
    return this.sessionStore.isSignOutError;
  }

  /** Cierra la sesion del rider. Devuelve si la operacion fue exitosa. */
  async signOut(): Promise<boolean> {
    return this.sessionStore.signOut();
  }
}
