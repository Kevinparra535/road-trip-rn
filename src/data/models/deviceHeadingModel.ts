import { DeviceHeading } from '@/domain/entities/DeviceHeading';

export type DeviceHeadingModelConstructorParams = {
  trueHeading: number;
  magHeading: number;
  accuracy: number | null;
  [key: string]: any;
};

/**
 * Modelo de la capa data: traduce el `LocationHeadingObject` de expo-location
 * hacia/desde la entidad de dominio.
 */
export class DeviceHeadingModel {
  [key: string]: any;

  trueHeading: number;
  magHeading: number;
  accuracy: number | null;

  constructor(params: DeviceHeadingModelConstructorParams) {
    this.trueHeading = params.trueHeading;
    this.magHeading = params.magHeading;
    this.accuracy = params.accuracy;

    Object.assign(this, params);
  }

  static fromJson(json: any): DeviceHeadingModel {
    return new DeviceHeadingModel({
      trueHeading: json?.trueHeading ?? -1,
      magHeading: json?.magHeading ?? -1,
      accuracy: json?.accuracy ?? null,
    });
  }

  toJson(): Record<string, unknown> {
    return {
      trueHeading: this.trueHeading,
      magHeading: this.magHeading,
      accuracy: this.accuracy,
    };
  }
}

declare module './deviceHeadingModel' {
  interface DeviceHeadingModel {
    toDomain(): DeviceHeading;
  }
}

DeviceHeadingModel.prototype.toDomain = function toDomain(): DeviceHeading {
  return new DeviceHeading({
    trueHeading: this.trueHeading,
    magHeading: this.magHeading,
    accuracy: this.accuracy,
  });
};
