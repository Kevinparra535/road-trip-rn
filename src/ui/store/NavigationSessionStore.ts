import { injectable } from 'inversify';
import { makeAutoObservable } from 'mobx';

import { Place } from '@/domain/entities/Place';

/**
 * Estado global (singleton) de la sesion de navegacion activa. No calcula
 * rutas ni habla con GPS/Speech; solo conserva el estado mutable que puede
 * ser compartido por Home, futuros overlays y rodadas grupales.
 */
@injectable()
export class NavigationSessionStore {
  isNavigating: boolean = false;
  simulatedDistanceKm: number = 0;
  isArrived: boolean = false;
  arrivedAt: Date | null = null;
  isElevationStripOpen: boolean = true;
  isMuted: boolean = false;
  lastRealProgressKm: number = 0;
  offRouteTicks: number = 0;
  isSimulationMode: boolean = false;
  simulatedOrigin: Place | null = null;

  private spokenVoiceIds: Set<string> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  prepareSimulation(origin: Place): void {
    this.resetRouteSession();
    this.isSimulationMode = true;
    this.simulatedOrigin = origin;
  }

  prepareLiveNavigation(): void {
    this.isSimulationMode = false;
    this.simulatedOrigin = null;
    this.resetNavigationProgress();
  }

  startNavigation(initialRealProgressKm: number): void {
    this.isNavigating = true;
    this.simulatedDistanceKm = 0;
    this.lastRealProgressKm = this.isSimulationMode ? 0 : initialRealProgressKm;
    this.offRouteTicks = 0;
    this.clearSpokenVoiceIds();
  }

  stopNavigation(): void {
    this.isNavigating = false;
    this.resetNavigationProgress();
    this.clearSpokenVoiceIds();
  }

  markArrived(arrivedAt: Date = new Date()): void {
    this.isNavigating = false;
    this.isArrived = true;
    this.arrivedAt = arrivedAt;
    this.offRouteTicks = 0;
    this.lastRealProgressKm = 0;
  }

  dismissArrival(): void {
    this.isArrived = false;
    this.arrivedAt = null;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  toggleElevationStrip(): void {
    this.isElevationStripOpen = !this.isElevationStripOpen;
  }

  setSimulatedDistanceKm(distanceKm: number): void {
    this.simulatedDistanceKm = Math.max(0, distanceKm);
  }

  recordRealProgress(progressKm: number): void {
    this.lastRealProgressKm = Math.max(this.lastRealProgressKm, progressKm);
  }

  resetNavigationProgress(): void {
    this.simulatedDistanceKm = 0;
    this.lastRealProgressKm = 0;
    this.offRouteTicks = 0;
  }

  resetOffRouteTicks(): void {
    this.offRouteTicks = 0;
  }

  incrementOffRouteTicks(): number {
    this.offRouteTicks += 1;
    return this.offRouteTicks;
  }

  hasSpokenVoiceId(key: string): boolean {
    return this.spokenVoiceIds.has(key);
  }

  markSpokenVoiceId(key: string): void {
    this.spokenVoiceIds.add(key);
  }

  clearSpokenVoiceIds(): void {
    this.spokenVoiceIds.clear();
  }

  resetRouteSession(): void {
    this.isNavigating = false;
    this.isArrived = false;
    this.arrivedAt = null;
    this.resetNavigationProgress();
    this.isSimulationMode = false;
    this.simulatedOrigin = null;
    this.clearSpokenVoiceIds();
  }

  reset(): void {
    this.resetRouteSession();
    this.isMuted = false;
    this.isElevationStripOpen = true;
  }
}
