import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';
import { LocationModel } from '@/data/models/locationModel';
import type { LocationService } from '@/data/services/LocationService';
import { GeoLocation } from '@/domain/entities/GeoLocation';
import {
  LocationListener,
  LocationPermissionStatus,
  LocationRepository,
} from '@/domain/repositories/LocationRepository';

@injectable()
export class LocationRepositoryImpl implements LocationRepository {
  constructor(
    @inject(TYPES.LocationService)
    private readonly service: LocationService,
  ) {}

  async requestPermission(): Promise<LocationPermissionStatus> {
    const status = await this.service.requestPermission();
    return this.mapStatus(status);
  }

  async getCurrentLocation(): Promise<GeoLocation> {
    const position = await this.service.getCurrentPosition();
    return LocationModel.fromJson(position).toDomain();
  }

  async watchLocation(listener: LocationListener): Promise<() => void> {
    const subscription = await this.service.watchPosition((position) => {
      listener(LocationModel.fromJson(position).toDomain());
    });
    return () => subscription.remove();
  }

  /** Traduce el estado crudo de Expo al contrato de dominio. */
  private mapStatus(status: string): LocationPermissionStatus {
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  }
}
