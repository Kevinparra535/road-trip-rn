import AsyncStorage from '@react-native-async-storage/async-storage';
import { injectable } from 'inversify';

import { RecentDestination } from '@/domain/entities/RecentDestination';

import { RecentDestinationRepository } from '@/domain/repositories/RecentDestinationRepository';

import { RecentDestinationModel } from '@/data/models/recentDestinationModel';

// Versionado en la key para futuras migraciones de shape sin perder datos.
const STORAGE_KEY = '@road-trip/recent-destinations/v1';
// Limite practico de la lista. Mas alla deja de aportar al rider y bloatea
// el storage / la UI del Home.
const MAX_RECENTS = 20;

/**
 * Persiste los destinos recientes en AsyncStorage local. No usa un service
 * intermedio: AsyncStorage es transporte trivial y agregar uno solo inflaria
 * la DI sin valor (cf. fuelStationService vs storage local).
 *
 * Concurrency: `add` hace read-modify-write. Si llegan dos llamadas paralelas
 * (ej. dos confirmaciones de preview rapidas), la segunda podria perder a
 * la primera. Encadenamos las escrituras en un `pendingWrite` privado para
 * serializarlas sin lib externa.
 */
@injectable()
export class RecentDestinationRepositoryImpl implements RecentDestinationRepository {
  private pendingWrite: Promise<void> = Promise.resolve();

  async getAll(): Promise<RecentDestination[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const items = parsed
        .map((entry) => RecentDestinationModel.fromJson(entry).toDomain())
        // Defensive: si visited_at vino corrupto y toDate fallback dio `new Date()`
        // el orden puede no quedar consistente. Reordenamos siempre desc.
        .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime());
      return items;
    } catch {
      // JSON corrupto: tratamos como lista vacia y dejamos que el proximo
      // `add` la sobreescriba con shape valido. No romper la UX del Home.
      return [];
    }
  }

  async add(item: RecentDestination): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(() => this.writeAdd(item));
    return this.pendingWrite;
  }

  async clear(): Promise<void> {
    this.pendingWrite = this.pendingWrite.then(() =>
      AsyncStorage.removeItem(STORAGE_KEY),
    );
    return this.pendingWrite;
  }

  /** Dedup por placeId + cap a MAX_RECENTS. Llamado bajo el mutex. */
  private async writeAdd(item: RecentDestination): Promise<void> {
    const current = await this.getAll();
    const deduped = current.filter((entry) => entry.placeId !== item.placeId);
    const next = [item, ...deduped].slice(0, MAX_RECENTS);
    const serialized = JSON.stringify(
      next.map((entry) => RecentDestinationModel.fromDomain(entry).toJson()),
    );
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  }
}
