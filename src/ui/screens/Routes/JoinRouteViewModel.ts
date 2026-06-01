import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { JoinTripPartyUseCase } from '@/domain/useCases/JoinTripPartyUseCase';
import {
  ResolvedRouteShare,
  ResolveRouteShareCodeUseCase,
} from '@/domain/useCases/ResolveRouteShareCodeUseCase';

import { TripPartyStore } from '@/ui/viewModels/TripPartyStore';

import Logger from '@/ui/utils/Logger';

/**
 * ViewModel del flow "Unirse a una ruta" (C.4). Maneja el input del codigo,
 * el call a `ResolveRouteShareCodeUseCase` y los estados loading/error/found.
 *
 * El screen renderiza el preview de la ruta una vez resuelta; la accion
 * "Ver ruta" navega al `RouteDetail` con el `routeId` (la nav es del screen,
 * no del VM — clean architecture).
 */
@injectable()
export class JoinRouteViewModel {
  /** Texto del input. Se normaliza al hacer resolve (upper + sin guiones). */
  code: string = '';

  isLoading: boolean = false;
  isError: string | null = null;
  /** Ruta + shareCode resueltos. `null` antes de resolver o si no encontrado. */
  resolved: ResolvedRouteShare | null = null;
  /** Flag UX: el rider intento resolver y no hubo match (vs. nunca intento). */
  hasTriedResolve: boolean = false;

  // ── Party joining state (C.5) ──────────────────────────────────────────
  myMotorcycles: Motorcycle[] = [];
  selectedMotorcycleId: string | null = null;
  isJoiningParty: boolean = false;
  isJoinPartyError: string | null = null;
  hasJoinedParty: boolean = false;

  private logger = new Logger('JoinRouteViewModel');

  constructor(
    @inject(TYPES.ResolveRouteShareCodeUseCase)
    private readonly resolveUseCase: ResolveRouteShareCodeUseCase,
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.JoinTripPartyUseCase)
    private readonly joinTripPartyUseCase: JoinTripPartyUseCase,
    @inject(TYPES.TripPartyStore)
    public readonly partyStore: TripPartyStore,
  ) {
    makeAutoObservable(this);
  }

  get canResolve(): boolean {
    return this.code.trim().length >= 4 && !this.isLoading;
  }

  /** `true` cuando el codigo resuelto trae partyId — invita a una rodada. */
  get resolvedHasParty(): boolean {
    return Boolean(this.resolved?.shareCode.partyId);
  }

  get canJoinParty(): boolean {
    return (
      this.resolvedHasParty &&
      this.selectedMotorcycleId !== null &&
      !this.isJoiningParty
    );
  }

  setCode(value: string): void {
    runInAction(() => {
      this.code = value;
      // Si el rider cambia el codigo, descartar resultados previos.
      this.resolved = null;
      this.isError = null;
      this.hasTriedResolve = false;
    });
  }

  /** Acepta un codigo inicial (ej. desde deep link). */
  initialize(initialCode?: string): void {
    if (initialCode) {
      this.setCode(initialCode);
      void this.resolve();
    }
  }

  async resolve(): Promise<void> {
    if (!this.canResolve) return;
    runInAction(() => {
      this.isLoading = true;
      this.isError = null;
      this.resolved = null;
    });
    try {
      const result = await this.resolveUseCase.run({ code: this.code });
      runInAction(() => {
        this.resolved = result;
        this.isLoading = false;
        this.hasTriedResolve = true;
      });
      // Si el code invita a una rodada, pre-cargamos las motos para que el
      // rider elija la suya — evita un paso extra de loading post-tap.
      if (result?.shareCode.partyId) {
        await this.loadMyMotorcycles();
      }
    } catch (error) {
      const msg = `Error resolviendo: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(msg);
      runInAction(() => {
        this.isError = msg;
        this.isLoading = false;
        this.hasTriedResolve = true;
      });
    }
  }

  selectMotorcycle(id: string): void {
    runInAction(() => {
      this.selectedMotorcycleId = id;
      this.isJoinPartyError = null;
    });
  }

  /**
   * Une al rider al party del code resuelto. Activa el party en el store
   * y dispara `hasJoinedParty` para que el screen navegue al RouteDetail.
   */
  async joinParty(): Promise<void> {
    const resolved = this.resolved;
    const motorcycleId = this.selectedMotorcycleId;
    if (!resolved?.shareCode.partyId || !motorcycleId) return;
    const motorcycle = this.myMotorcycles.find((m) => m.id === motorcycleId);
    if (!motorcycle) {
      runInAction(() => {
        this.isJoinPartyError =
          'No encontre la moto seleccionada en tu garaje.';
      });
      return;
    }

    runInAction(() => {
      this.isJoiningParty = true;
      this.isJoinPartyError = null;
    });
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) throw new Error('Necesitas iniciar sesion para unirte.');

      const party = await this.joinTripPartyUseCase.run({
        partyId: resolved.shareCode.partyId,
        riderId: rider.id,
        displayName: rider.displayName ?? rider.email ?? 'Rider',
        motorcycle,
      });
      this.partyStore.setActiveParty(party.id);
      runInAction(() => {
        this.isJoiningParty = false;
        this.hasJoinedParty = true;
      });
    } catch (error) {
      const msg = `Error uniendote: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(msg);
      runInAction(() => {
        this.isJoinPartyError = msg;
        this.isJoiningParty = false;
      });
    }
  }

  consumeJoinPartyResult(): void {
    runInAction(() => {
      this.hasJoinedParty = false;
    });
  }

  reset(): void {
    runInAction(() => {
      this.code = '';
      this.resolved = null;
      this.isLoading = false;
      this.isError = null;
      this.hasTriedResolve = false;
      this.myMotorcycles = [];
      this.selectedMotorcycleId = null;
      this.isJoiningParty = false;
      this.isJoinPartyError = null;
      this.hasJoinedParty = false;
    });
  }

  private async loadMyMotorcycles(): Promise<void> {
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) return;
      const motos = await this.getAllMotorcyclesUseCase.run(rider.id);
      runInAction(() => {
        this.myMotorcycles = motos;
        // Pre-seleccionamos la primera moto para reducir friccion.
        if (motos.length > 0 && this.selectedMotorcycleId === null) {
          this.selectedMotorcycleId = motos[0].id;
        }
      });
    } catch (error) {
      this.logger.warn(
        `No pude cargar motos: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
