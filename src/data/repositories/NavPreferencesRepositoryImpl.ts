import AsyncStorage from '@react-native-async-storage/async-storage';
import { injectable } from 'inversify';

import {
  DEFAULT_NAV_PREFERENCES,
  NavPreferences,
  NavPreferencesRepository,
} from '@/domain/repositories/NavPreferencesRepository';

// Versionado en la key para futuras migraciones de shape sin perder datos.
const STORAGE_KEY = '@road-trip/nav-preferences/v1';

/**
 * Persiste las preferencias de navegación en AsyncStorage local. Sin service
 * intermedio: AsyncStorage es transporte trivial (cf.
 * `RecentDestinationRepositoryImpl`). Las escrituras se serializan en un
 * `pendingWrite` privado para que dos setters paralelos no se pisen
 * (read-modify-write).
 */
@injectable()
export class NavPreferencesRepositoryImpl implements NavPreferencesRepository {
  private pendingWrite: Promise<void> = Promise.resolve();

  async get(): Promise<NavPreferences> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NAV_PREFERENCES };
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...DEFAULT_NAV_PREFERENCES };
      }
      // Merge defensivo: cualquier campo ausente/corrupto cae al default.
      return {
        muted:
          typeof parsed.muted === 'boolean'
            ? parsed.muted
            : DEFAULT_NAV_PREFERENCES.muted,
      };
    } catch {
      // JSON corrupto: tratamos como defaults y dejamos que el próximo set lo
      // sobreescriba con shape válido. No romper la navegación.
      return { ...DEFAULT_NAV_PREFERENCES };
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(() => this.writeMerge({ muted }));
    return this.pendingWrite;
  }

  /** Lee, mergea el patch y reescribe. Llamado bajo el mutex `pendingWrite`. */
  private async writeMerge(patch: Partial<NavPreferences>): Promise<void> {
    const current = await this.get();
    const next: NavPreferences = { ...current, ...patch };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
