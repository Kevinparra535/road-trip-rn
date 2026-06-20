import { inject, injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';

import {
  FUEL_OPTIONS,
  LUGGAGE_LABEL,
  LUGGAGE_POSITIONS,
} from '@/config/motorcycleFormOptions';
import { TYPES } from '@/config/types';

import {
  DEFAULT_DRIVER_WEIGHT_KG,
  DEFAULT_PASSENGER_WEIGHT_KG,
  FuelType,
  loadConsumptionFactor,
  LuggageItem,
  LuggagePosition,
  Motorcycle,
} from '@/domain/entities/Motorcycle';
import { MotorcycleSpecs } from '@/domain/entities/MotorcycleSpecs';

import { CreateMotorcycleUseCase } from '@/domain/useCases/CreateMotorcycleUseCase';
import { FetchMotorcycleSpecsUseCase } from '@/domain/useCases/FetchMotorcycleSpecsUseCase';
import { GetCurrentRiderUseCase } from '@/domain/useCases/GetCurrentRiderUseCase';
import { GetMotorcycleUseCase } from '@/domain/useCases/GetMotorcycleUseCase';
import { UpdateMotorcycleUseCase } from '@/domain/useCases/UpdateMotorcycleUseCase';

import Logger from '@/ui/utils/Logger';

import {
  motorcycleFormSchema,
  motorcycleSpecsSearchSchema,
} from '@/ui/schemas/motorcycleFormSchema';

type ICalls = 'load' | 'specs' | 'submit';
type Mode = 'create' | 'edit';

/** Peso maximo configurable por maletero, en kilogramos. */
export const MAX_LUGGAGE_KG = 30;

/** Rango configurable para el peso de una persona, en kilogramos. */
export const MIN_PERSON_KG = 40;
export const MAX_PERSON_KG = 150;

const EMPTY_LUGGAGE: Record<LuggagePosition, number> = {
  left: 0,
  right: 0,
  top: 0,
};

@injectable()
export class MotorcycleFormViewModel {
  // ── Form state ──────────────────────────────────────────────────────────
  brand: string = '';
  model: string = '';
  yearText: string = '';
  nickname: string = '';
  fuelType: FuelType = 'corriente';
  tankCapacityText: string = '';
  consumptionText: string = '';
  engineCcText: string = '';

  // ── Carga: piloto, copiloto y maleteros ───────────────────────────────────
  driverWeightKg: number = DEFAULT_DRIVER_WEIGHT_KG;
  hasPassenger: boolean = false;
  passengerWeightKg: number = DEFAULT_PASSENGER_WEIGHT_KG;
  luggageEnabled: boolean = false;
  luggageWeights: Record<LuggagePosition, number> = { ...EMPTY_LUGGAGE };

  // ── Async state ─────────────────────────────────────────────────────────
  isLoadLoading: boolean = false;
  isLoadError: string | null = null;

  isSpecsLoading: boolean = false;
  isSpecsError: string | null = null;
  specsResult: MotorcycleSpecs | null = null;
  specsNotFound: boolean = false;

  isSubmitting: boolean = false;
  isSubmitError: string | null = null;
  hasSubmitSuccess: boolean = false;

  private mode: Mode = 'create';
  private editingId: string | null = null;
  private riderId: string | null = null;
  private logger = new Logger('MotorcycleFormViewModel');

  constructor(
    @inject(TYPES.GetCurrentRiderUseCase)
    private readonly getCurrentRiderUseCase: GetCurrentRiderUseCase,
    @inject(TYPES.GetMotorcycleUseCase)
    private readonly getMotorcycleUseCase: GetMotorcycleUseCase,
    @inject(TYPES.CreateMotorcycleUseCase)
    private readonly createMotorcycleUseCase: CreateMotorcycleUseCase,
    @inject(TYPES.UpdateMotorcycleUseCase)
    private readonly updateMotorcycleUseCase: UpdateMotorcycleUseCase,
    @inject(TYPES.FetchMotorcycleSpecsUseCase)
    private readonly fetchMotorcycleSpecsUseCase: FetchMotorcycleSpecsUseCase,
  ) {
    makeAutoObservable(this);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode ? 'Editar moto' : 'Registrar moto';
  }

  get canSearchSpecs(): boolean {
    return motorcycleSpecsSearchSchema.safeParse({
      brand: this.brand,
      model: this.model,
      year: this.parsedYear,
    }).success;
  }

  get isValid(): boolean {
    return motorcycleFormSchema.safeParse({
      brand: this.brand,
      model: this.model,
      year: this.parsedYear,
      tankCapacity: this.parsedTank,
      consumption: this.parsedConsumption,
    }).success;
  }

  /** Autonomia teorica de catalogo (tanque x rendimiento), sin carga. */
  get estimatedRangeKm(): number {
    return Math.round(this.parsedTank * this.parsedConsumption);
  }

  /** Peso total a bordo segun la carga configurada en el formulario, en kg. */
  get totalLoadKg(): number {
    const passenger = this.hasPassenger ? this.passengerWeightKg : 0;
    const luggage = this.luggageEnabled
      ? Object.values(this.luggageWeights).reduce((sum, kg) => sum + kg, 0)
      : 0;
    return this.driverWeightKg + passenger + luggage;
  }

  /**
   * Autonomia ajustada por la carga configurada (piloto + copiloto +
   * maleteros). Usa el mismo modelo de peso que el estimador de ruta.
   */
  get loadAdjustedRangeKm(): number {
    return Math.round(this.estimatedRangeKm * loadConsumptionFactor(this.totalLoadKg));
  }

  /** Opciones de combustible con su estado activo segun el tipo seleccionado. */
  get fuelOptions(): { value: FuelType; label: string; active: boolean }[] {
    return FUEL_OPTIONS.map((value) => ({
      value,
      label: value,
      active: value === this.fuelType,
    }));
  }

  /** Filas de maleteros con etiqueta en espanol y peso configurado. */
  get luggageRows(): {
    position: LuggagePosition;
    label: string;
    weightKg: number;
  }[] {
    return LUGGAGE_POSITIONS.map((position) => ({
      position,
      label: LUGGAGE_LABEL[position],
      weightKg: this.luggageWeights[position],
    }));
  }

  private get parsedYear(): number {
    return Number.parseInt(this.yearText, 10) || 0;
  }

  private get parsedTank(): number {
    return Number.parseFloat(this.tankCapacityText.replace(',', '.')) || 0;
  }

  private get parsedConsumption(): number {
    return Number.parseFloat(this.consumptionText.replace(',', '.')) || 0;
  }

  private get parsedEngineCc(): number | null {
    const value = Number.parseInt(this.engineCcText, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // ── Field setters ───────────────────────────────────────────────────────

  setBrand(value: string): void {
    runInAction(() => {
      this.brand = value;
    });
  }

  setModel(value: string): void {
    runInAction(() => {
      this.model = value;
    });
  }

  setYearText(value: string): void {
    runInAction(() => {
      this.yearText = value.replace(/[^0-9]/g, '');
    });
  }

  setNickname(value: string): void {
    runInAction(() => {
      this.nickname = value;
    });
  }

  setFuelType(value: FuelType): void {
    runInAction(() => {
      this.fuelType = value;
    });
  }

  setTankCapacityText(value: string): void {
    runInAction(() => {
      this.tankCapacityText = value;
    });
  }

  setConsumptionText(value: string): void {
    runInAction(() => {
      this.consumptionText = value;
    });
  }

  setEngineCcText(value: string): void {
    runInAction(() => {
      this.engineCcText = value.replace(/[^0-9]/g, '');
    });
  }

  setDriverWeight(weightKg: number): void {
    runInAction(() => {
      this.driverWeightKg = weightKg;
    });
  }

  setHasPassenger(value: boolean): void {
    runInAction(() => {
      this.hasPassenger = value;
    });
  }

  setPassengerWeight(weightKg: number): void {
    runInAction(() => {
      this.passengerWeightKg = weightKg;
    });
  }

  setLuggageEnabled(value: boolean): void {
    runInAction(() => {
      this.luggageEnabled = value;
    });
  }

  setLuggageWeight(position: LuggagePosition, weightKg: number): void {
    runInAction(() => {
      this.luggageWeights = { ...this.luggageWeights, [position]: weightKg };
    });
  }

  // ── Entrypoints ─────────────────────────────────────────────────────────

  async initialize(motorcycleId?: string): Promise<void> {
    this.updateLoadingState(true, null, 'load');
    try {
      const rider = await this.getCurrentRiderUseCase.run();
      if (!rider) {
        throw new Error('No hay un rider autenticado.');
      }
      runInAction(() => {
        this.riderId = rider.id;
      });

      if (motorcycleId) {
        const motorcycle = await this.getMotorcycleUseCase.run(motorcycleId);
        if (motorcycle) {
          this.hydrateFrom(motorcycle);
        }
      }
      this.updateLoadingState(false, null, 'load');
    } catch (error) {
      this.handleError(error, 'load');
    }
  }

  async fetchSpecs(): Promise<void> {
    this.updateLoadingState(true, null, 'specs');
    runInAction(() => {
      this.specsNotFound = false;
      this.specsResult = null;
    });
    try {
      const specs = await this.fetchMotorcycleSpecsUseCase.run({
        brand: this.brand,
        model: this.model,
        year: this.parsedYear,
      });
      runInAction(() => {
        if (specs) {
          this.specsResult = specs;
          this.applySpecs(specs);
        } else {
          this.specsNotFound = true;
        }
      });
      this.updateLoadingState(false, null, 'specs');
    } catch (error) {
      this.handleError(error, 'specs');
    }
  }

  async submit(): Promise<boolean> {
    this.updateLoadingState(true, null, 'submit');
    try {
      if (!this.riderId) {
        throw new Error('No hay un rider autenticado.');
      }
      const motorcycle = new Motorcycle({
        id: this.editingId ?? '',
        riderId: this.riderId,
        brand: this.brand.trim(),
        model: this.model.trim(),
        year: this.parsedYear,
        nickname: this.nickname.trim() || null,
        fuelType: this.fuelType,
        tankCapacityLiters: this.parsedTank,
        fuelConsumptionKmPerLiter: this.parsedConsumption,
        engineCc: this.parsedEngineCc,
        driverWeightKg: this.driverWeightKg,
        hasPassenger: this.hasPassenger,
        passengerWeightKg: this.passengerWeightKg,
        luggage: this.buildLuggage(),
      });

      if (this.isEditMode) {
        await this.updateMotorcycleUseCase.run(motorcycle);
      } else {
        await this.createMotorcycleUseCase.run(motorcycle);
      }

      runInAction(() => {
        this.hasSubmitSuccess = true;
      });
      this.updateLoadingState(false, null, 'submit');
      return true;
    } catch (error) {
      this.handleError(error, 'submit');
      return false;
    }
  }

  consumeSubmitResult(): void {
    runInAction(() => {
      this.hasSubmitSuccess = false;
      this.isSubmitError = null;
    });
  }

  reset(): void {
    runInAction(() => {
      this.brand = '';
      this.model = '';
      this.yearText = '';
      this.nickname = '';
      this.fuelType = 'corriente';
      this.tankCapacityText = '';
      this.consumptionText = '';
      this.engineCcText = '';
      this.driverWeightKg = DEFAULT_DRIVER_WEIGHT_KG;
      this.hasPassenger = false;
      this.passengerWeightKg = DEFAULT_PASSENGER_WEIGHT_KG;
      this.luggageEnabled = false;
      this.luggageWeights = { ...EMPTY_LUGGAGE };
      this.mode = 'create';
      this.editingId = null;
      this.specsResult = null;
      this.specsNotFound = false;
      this.isSpecsError = null;
      this.isSubmitError = null;
      this.hasSubmitSuccess = false;
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private hydrateFrom(motorcycle: Motorcycle): void {
    runInAction(() => {
      this.mode = 'edit';
      this.editingId = motorcycle.id;
      this.brand = motorcycle.brand;
      this.model = motorcycle.model;
      this.yearText = String(motorcycle.year);
      this.nickname = motorcycle.nickname ?? '';
      this.fuelType = motorcycle.fuelType;
      this.tankCapacityText = String(motorcycle.tankCapacityLiters);
      this.consumptionText = String(motorcycle.fuelConsumptionKmPerLiter);
      this.engineCcText = motorcycle.engineCc ? String(motorcycle.engineCc) : '';
      this.driverWeightKg = motorcycle.driverWeightKg;
      this.hasPassenger = motorcycle.hasPassenger;
      this.passengerWeightKg = motorcycle.passengerWeightKg;
      this.luggageEnabled = motorcycle.luggage.length > 0;
      const weights: Record<LuggagePosition, number> = { ...EMPTY_LUGGAGE };
      motorcycle.luggage.forEach((item) => {
        weights[item.position] = item.weightKg;
      });
      this.luggageWeights = weights;
    });
  }

  /** Maleteros con peso, listos para persistir. Vacio si el switch esta off. */
  private buildLuggage(): LuggageItem[] {
    if (!this.luggageEnabled) return [];
    return (['left', 'right', 'top'] as LuggagePosition[])
      .filter((position) => this.luggageWeights[position] > 0)
      .map((position) => ({
        position,
        weightKg: this.luggageWeights[position],
      }));
  }

  private applySpecs(specs: MotorcycleSpecs): void {
    this.tankCapacityText = String(specs.tankCapacityLiters);
    this.consumptionText = String(specs.fuelConsumptionKmPerLiter);
    if (specs.engineCc) {
      this.engineCcText = String(specs.engineCc);
    }
    if (specs.recommendedFuelType) {
      this.fuelType = specs.recommendedFuelType;
    }
  }

  private updateLoadingState(isLoading: boolean, error: string | null, type: ICalls) {
    runInAction(() => {
      switch (type) {
        case 'load':
          this.isLoadLoading = isLoading;
          this.isLoadError = error;
          break;
        case 'specs':
          this.isSpecsLoading = isLoading;
          this.isSpecsError = error;
          break;
        case 'submit':
          this.isSubmitting = isLoading;
          this.isSubmitError = error;
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
