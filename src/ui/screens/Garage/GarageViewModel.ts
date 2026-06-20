import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import { TYPES } from '@/config/types';

import { Motorcycle } from '@/domain/entities/Motorcycle';

import { DeleteMotorcycleUseCase } from '@/domain/useCases/DeleteMotorcycleUseCase';
import { GetAllMotorcyclesUseCase } from '@/domain/useCases/GetAllMotorcyclesUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';

import Logger from '@/ui/utils/Logger';

type ICalls = 'motorcycles' | 'delete';

/** Datos listos para render de una fila de moto en el garaje. */
export type MotorcycleRowData = {
  id: string;
  name: string;
  meta: string;
  autonomyLabel: string;
};

@injectable()
export class GarageViewModel {
  isMotorcyclesLoading: boolean = false;
  isMotorcyclesError: string | null = null;
  isMotorcyclesResponse: Motorcycle[] | null = null;

  isDeleteLoading: boolean = false;
  isDeleteError: string | null = null;

  private logger = new Logger('GarageViewModel');

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetAllMotorcyclesUseCase)
    private readonly getAllMotorcyclesUseCase: GetAllMotorcyclesUseCase,
    @inject(TYPES.DeleteMotorcycleUseCase)
    private readonly deleteMotorcycleUseCase: DeleteMotorcycleUseCase,
  ) {
    makeAutoObservable(this);
  }

  get isLoaded(): boolean {
    return !this.isMotorcyclesLoading && this.isMotorcyclesResponse !== null;
  }

  get isEmpty(): boolean {
    return this.isLoaded && (this.isMotorcyclesResponse?.length ?? 0) === 0;
  }

  /**
   * Filas listas para render del listado de motos: nombre, meta
   * (tanque · consumo · combustible) y autonomia teorica ya formateada. La
   * pantalla solo consume estos textos; no toca la entidad Motorcycle.
   */
  get motorcycleRows(): MotorcycleRowData[] {
    return (this.isMotorcyclesResponse ?? []).map((motorcycle) => ({
      id: motorcycle.id,
      name: motorcycle.displayName(),
      meta: `${motorcycle.tankCapacityLiters} L · ${motorcycle.fuelConsumptionKmPerLiter} km/L · ${motorcycle.fuelType}`,
      autonomyLabel: `Autonomia ~${Math.round(motorcycle.fullTankRangeKm())} km`,
    }));
  }

  async initialize(): Promise<void> {
    this.updateLoadingState(true, null, 'motorcycles');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      const motorcycles = await this.getAllMotorcyclesUseCase.run(rider.id);
      runInAction(() => {
        this.isMotorcyclesResponse = motorcycles;
      });
      this.updateLoadingState(false, null, 'motorcycles');
    } catch (error) {
      this.handleError(error, 'motorcycles');
    }
  }

  async delete(id: string): Promise<boolean> {
    this.updateLoadingState(true, null, 'delete');
    try {
      await this.deleteMotorcycleUseCase.run(id);
      runInAction(() => {
        this.isMotorcyclesResponse =
          this.isMotorcyclesResponse?.filter((m) => m.id !== id) ?? null;
      });
      this.updateLoadingState(false, null, 'delete');
      return true;
    } catch (error) {
      this.handleError(error, 'delete');
      return false;
    }
  }

  reset(): void {
    runInAction(() => {
      this.isMotorcyclesResponse = null;
      this.isMotorcyclesLoading = false;
      this.isMotorcyclesError = null;
      this.isDeleteLoading = false;
      this.isDeleteError = null;
    });
  }

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'motorcycles':
          this.isMotorcyclesLoading = isLoading;
          this.isMotorcyclesError = error;
          break;
        case 'delete':
          this.isDeleteLoading = isLoading;
          this.isDeleteError = error;
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
