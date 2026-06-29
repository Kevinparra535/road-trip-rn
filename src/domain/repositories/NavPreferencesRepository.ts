/**
 * Preferencias de navegación persistidas localmente (device-scoped, sin rider).
 * Hoy solo guarda el mute de la voz turn-by-turn; el shape está pensado para
 * crecer (p. ej. `rideStyle` en F5) sin romper datos persistidos previos.
 */
export interface NavPreferences {
  /** Anuncios de voz turn-by-turn silenciados. */
  muted: boolean;
}

/** Valores por defecto cuando aún no hay nada persistido. */
export const DEFAULT_NAV_PREFERENCES: NavPreferences = {
  muted: false,
};

/**
 * Contrato de persistencia de las preferencias de navegación. Local-device
 * (AsyncStorage), sin scoping por rider — aceptable para MVP (cf.
 * `RecentDestinationRepository`). Los setters hacen merge parcial para no
 * pisar otras preferencias.
 */
export interface NavPreferencesRepository {
  /** Lee las preferencias actuales (o los defaults si no hay nada guardado). */
  get(): Promise<NavPreferences>;

  /** Persiste el flag de mute, conservando el resto de preferencias. */
  setMuted(muted: boolean): Promise<void>;
}
