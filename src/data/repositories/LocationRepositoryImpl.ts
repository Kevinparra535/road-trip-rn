import { inject, injectable } from 'inversify';

import { TYPES } from '@/config/types';

import { GeoLocation } from '@/domain/entities/GeoLocation';

import {
  HeadingListener,
  LocationListener,
  LocationPermissionStatus,
  LocationRepository,
  LocationWatchMode,
} from '@/domain/repositories/LocationRepository';

import type { LocationService } from '@/data/services/LocationService';

import { DeviceHeadingModel } from '@/data/models/deviceHeadingModel';
import { LocationModel } from '@/data/models/locationModel';

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

  async watchLocation(
    listener: LocationListener,
    mode: LocationWatchMode = 'idle',
  ): Promise<() => void> {
    const subscription = await this.service.watchPosition((position) => {
      listener(LocationModel.fromJson(position).toDomain());
    }, mode);
    return () => subscription.remove();
  }

  async watchHeading(listener: HeadingListener): Promise<() => void> {
    const subscription = await this.service.watchHeading((heading) => {
      listener(DeviceHeadingModel.fromJson(heading).toDomain());
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
