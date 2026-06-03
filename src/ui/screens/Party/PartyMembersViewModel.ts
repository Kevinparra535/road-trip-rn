import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';
import { PartyMember } from '@/domain/entities/PartyMember';

import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { LeaveTripPartyUseCase } from '@/domain/useCases/LeaveTripPartyUseCase';

import { TripPartyStore } from '@/ui/viewModels/TripPartyStore';

import Logger from '@/ui/utils/Logger';

type ICalls = 'load' | 'leave';

/**
 * Item de la lista de miembros con metadata visual (moto resuelta).
 */
export type PartyMemberRow = {
  member: PartyMember;
  motorcycleLabel: string;
  isMe: boolean;
  isOwner: boolean;
};

/**
 * ViewModel del `PartyMembersScreen`. Lee el party activo del `TripPartyStore`
 * y resuelve nombres de motos consultando el garage del rider actual (cada
 * member trae solo `motorcycleId`; el nombre de la moto solo lo conoce el
 * dueño de esa moto, asi que para MVP mostramos "Moto" como placeholder
 * si no es la nuestra).
 */
@injectable()
export class PartyMembersViewModel {
  isLoading: boolean = false;
  isError: string | null = null;
  /** Riderid del usuario actual; usado para flag `isMe` y para Leave. */
  currentRiderId: string | null = null;
  /** Garage propio (motos del rider actual). Las otras motos NO se cargan. */
  myMotorcycles: Motorcycle[] = [];

  isLeaving: boolean = false;
  hasLeftSuccessfully: boolean = false;

  private logger = new Logger('PartyMembersViewModel');

  constructor(
    @inject(TYPES.TripPartyStore)
    public readonly partyStore: TripPartyStore,
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.LeaveTripPartyUseCase)
    private readonly leaveTripPartyUseCase: LeaveTripPartyUseCase,
  ) {
    makeAutoObservable(this);
  }

  async initialize(): Promise<void> {
    this.updateLoadingState(true, null, 'load');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) throw new Error('No hay un rider autenticado.');
      const motos = await this.getAllMotorcyclesUseCase.run(rider.id);
      runInAction(() => {
        this.currentRiderId = rider.id;
        this.myMotorcycles = motos;
      });
      this.updateLoadingState(false, null, 'load');
    } catch (error) {
      this.handleError(error, 'load');
    }
  }

  get rows(): PartyMemberRow[] {
    const party = this.partyStore.activeParty;
    if (!party) return [];
    const myId = this.currentRiderId;
    return party.members.map((member) => ({
      member,
      motorcycleLabel: this.resolveMotorcycleLabel(member),
      isMe: member.riderId === myId,
      isOwner: member.isOwner,
    }));
  }

  get canLeave(): boolean {
    return (
      this.partyStore.hasActiveParty &&
      this.currentRiderId !== null &&
      !this.isLeaving
    );
  }

  /**
   * Sale del party activo. Si es owner, el repo promueve al siguiente member.
   * Si es el ultimo, el party se borra y el store recibe `null` via observe.
   */
  async leave(): Promise<void> {
    const party = this.partyStore.activeParty;
    const riderId = this.currentRiderId;
    if (!party || !riderId) return;
    this.updateLoadingState(true, null, 'leave');
    try {
      await this.leaveTripPartyUseCase.run({
        partyId: party.id,
        riderId,
      });
      // Si el party se borro (eras el ultimo), el observe ya seteo `null`.
      // Si quedaron otros, el activeParty se actualiza realtime. En ambos
      // casos, desuscribimos local para no ver mas updates.
      this.partyStore.clear();
      runInAction(() => {
        this.hasLeftSuccessfully = true;
      });
      this.updateLoadingState(false, null, 'leave');
    } catch (error) {
      this.handleError(error, 'leave');
    }
  }

  consumeLeaveResult(): void {
    runInAction(() => {
      this.hasLeftSuccessfully = false;
    });
  }

  reset(): void {
    runInAction(() => {
      this.isLoading = false;
      this.isError = null;
      this.currentRiderId = null;
      this.myMotorcycles = [];
      this.isLeaving = false;
      this.hasLeftSuccessfully = false;
    });
  }

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'load':
          this.isLoading = isLoading;
          this.isError = error;
          break;
        case 'leave':
          this.isLeaving = isLoading;
          this.isError = error;
          break;
      }
    });
  }

  private handleError(error: unknown, type: ICalls) {
    const errorMessage = `Error in ${type}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    this.logger.error(errorMessage);
    this.updateLoadingState(false, errorMessage, type);
  }

  private resolveMotorcycleLabel(member: PartyMember): string {
    // Si es mi moto, busco el nombre real en mi garage.
    if (member.riderId === this.currentRiderId) {
      const moto = this.myMotorcycles.find((m) => m.id === member.motorcycleId);
      return moto ? moto.displayName() : 'Mi moto';
    }
    // Para motos de otros riders no tenemos acceso a su garage. Placeholder.
    return 'Moto';
  }
}
