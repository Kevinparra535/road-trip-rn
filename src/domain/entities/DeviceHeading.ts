export type DeviceHeadingConstructorParams = {
  trueHeading: number;
  magHeading: number;
  accuracy?: number | null;
  [key: string]: any;
};

/**
 * Orientacion fisica del dispositivo (brujula). `trueHeading` es respecto al
 * norte geografico y `magHeading` respecto al norte magnetico; cualquiera
 * puede venir como `-1` cuando el sensor no lo entrega.
 */
export class DeviceHeading {
  [key: string]: any;

  trueHeading: number;
  magHeading: number;
  accuracy: number | null;

  constructor(params: DeviceHeadingConstructorParams) {
    this.trueHeading = params.trueHeading;
    this.magHeading = params.magHeading;
    this.accuracy = params.accuracy ?? null;

    Object.assign(this, params);
  }

  /**
   * Mejor rumbo disponible en grados (0 = norte, sentido horario): prioriza
   * el norte geografico y cae al magnetico; `null` si ninguno es valido.
   */
  get degrees(): number | null {
    if (this.trueHeading >= 0) return this.trueHeading;
    if (this.magHeading >= 0) return this.magHeading;
    return null;
  }
}
