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

import Logger from '@/ui/utils/Logger';

import { joinRouteCodeSchema } from '@/ui/schemas/joinRouteSchema';
import { TripPartyStore } from '@/ui/store/TripPartyStore';

type ICalls = 'resolve' | 'join';

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
    return (
      joinRouteCodeSchema.safeParse({ code: this.code }).success &&
      !this.isLoading
    );
  }

  /** `true` cuando el codigo resuelto trae partyId — invita a una rodada. */
  get resolvedHasParty(): boolean {
    return Boolean(this.resolved?.shareCode.partyId);
  }

  /** Id de la ruta resuelta — lo usa el screen para navegar al RouteDetail. */
  get resolvedRouteId(): string | null {
    return this.resolved?.route.id ?? null;
  }

  /** Nombre de la ruta resuelta para el preview card. */
  get routeName(): string {
    return this.resolved?.route.name ?? '';
  }

  /** Subtitulo del preview: distancia, paradas y flag de rodada grupal. */
  get routePreviewSubtitle(): string {
    if (!this.resolved) return '';
    const km = Math.round(this.resolved.route.distanceKm);
    const stops = this.resolved.route.waypoints.length;
    const party = this.resolvedHasParty ? ' · Rodada grupal' : '';
    return `${km} km · ${stops} paradas${party}`;
  }

  /** `true` cuando el rider intento resolver y no hubo match (vs. error). */
  get showEmptyState(): boolean {
    return this.hasTriedResolve && !this.resolved && !this.isError;
  }

  /** Filas de motos para los chips de seleccion en una rodada. */
  get motorcycleRows(): { id: string; name: string; active: boolean }[] {
    return this.myMotorcycles.map((moto) => ({
      id: moto.id,
      name: moto.displayName(),
      active: this.selectedMotorcycleId === moto.id,
    }));
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
      this.hasTriedResolve = false;
    });
    this.updateLoadingState(false, null, 'resolve');
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
    this.updateLoadingState(true, null, 'resolve');
    runInAction(() => {
      this.resolved = null;
    });
    try {
      const result = await this.resolveUseCase.run({ code: this.code });
      runInAction(() => {
        this.resolved = result;
        this.hasTriedResolve = true;
      });
      this.updateLoadingState(false, null, 'resolve');
      // Si el code invita a una rodada, pre-cargamos las motos para que el
      // rider elija la suya — evita un paso extra de loading post-tap.
      if (result?.shareCode.partyId) {
        await this.loadMyMotorcycles();
      }
    } catch (error) {
      runInAction(() => {
        this.hasTriedResolve = true;
      });
      this.handleError(error, 'resolve');
    }
  }

  selectMotorcycle(id: string): void {
    runInAction(() => {
      this.selectedMotorcycleId = id;
    });
    this.updateLoadingState(false, null, 'join');
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
      this.updateLoadingState(
        false,
        'No encontre la moto seleccionada en tu garaje.',
        'join',
      );
      return;
    }

    this.updateLoadingState(true, null, 'join');
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
        this.hasJoinedParty = true;
      });
      this.updateLoadingState(false, null, 'join');
    } catch (error) {
      this.handleError(error, 'join');
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

  private updateLoadingState(
    isLoading: boolean,
    error: string | null,
    type: ICalls,
  ) {
    runInAction(() => {
      switch (type) {
        case 'resolve':
          this.isLoading = isLoading;
          this.isError = error;
          break;
        case 'join':
          this.isJoiningParty = isLoading;
          this.isJoinPartyError = error;
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
}
