import { PartyMember } from '@/domain/entities/PartyMember';
import { TripParty } from '@/domain/entities/TripParty';

/**
 * Callback que el repo invoca con el estado actual del party. `null` significa
 * que el party fue borrado (todos salieron / owner cerro).
 */
export type TripPartyObserver = (party: TripParty | null) => void;

/**
 * Funcion de desuscripcion devuelta por `observe`. Llamarla para liberar
 * el listener (esencial para evitar leaks en pantallas que se desmontan).
 */
export type TripPartyUnsubscribe = () => void;

/**
 * Callback invocado cuando la suscripcion realtime falla (permiso denegado,
 * timeout, perdida de red). El observer de exito deja de emitir tras un error.
 */
export type TripPartyObserverError = (error: Error) => void;

export interface TripPartyRepository {
  /** Crea un party con `owner` como primer miembro. */
  create(input: { routeId: string; owner: PartyMember }): Promise<TripParty>;

  getById(partyId: string): Promise<TripParty | null>;

  /**
   * Suscribe un callback al estado del party (realtime via Firestore
   * onSnapshot). Retorna la funcion para desuscribir. `onError` (opcional)
   * recibe los fallos del stream (permiso/timeout/red).
   */
  observe(
    partyId: string,
    onChange: TripPartyObserver,
    onError?: TripPartyObserverError,
  ): TripPartyUnsubscribe;

  addMember(partyId: string, member: PartyMember): Promise<void>;

  /**
   * Quita un miembro. Si el removed era owner y quedan otros, promueve al
   * siguiente member mas antiguo. Si queda vacio, borra el party.
   * Devuelve `null` si el party fue borrado, sino la nueva version.
   */
  removeMember(partyId: string, riderId: string): Promise<TripParty | null>;

  /** Borra el party completo (solo owner deberia poder llamar esto). */
  delete(partyId: string): Promise<void>;
}
