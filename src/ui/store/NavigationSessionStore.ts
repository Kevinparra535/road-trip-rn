import { injectable } from 'inversify';
import { makeAutoObservable } from 'mobx';

import { Place } from '@/domain/entities/Place';

export type NavigationSessionPhase =
  | 'idle'
  | 'preview'
  | 'navigating'
  | 'paused'
  | 'offRoute'
  | 'arrived'
  | 'groupRide';

type MovingNavigationPhase = Extract<
  NavigationSessionPhase,
  'navigating' | 'groupRide'
>;

/**
 * Estado global (singleton) de la sesion de navegacion activa. No calcula
 * rutas ni habla con GPS/Speech; solo conserva el estado mutable que puede
 * ser compartido por Home, futuros overlays y rodadas grupales.
 */
@injectable()
export class NavigationSessionStore {
  navigationPhase: NavigationSessionPhase = 'idle';
  simulatedDistanceKm: number = 0;
  arrivedAt: Date | null = null;
  isElevationStripOpen: boolean = true;
  isMuted: boolean = false;
  lastRealProgressKm: number = 0;
  offRouteTicks: number = 0;
  isSimulationMode: boolean = false;
  isGroupRideMode: boolean = false;
  simulatedOrigin: Place | null = null;

  private resumePhase: MovingNavigationPhase = 'navigating';
  private spokenVoiceIds: Set<string> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  get isNavigating(): boolean {
    return (
      this.navigationPhase === 'navigating' ||
      this.navigationPhase === 'offRoute' ||
      this.navigationPhase === 'groupRide'
    );
  }

  get isNavigationActive(): boolean {
    return this.navigationPhase !== 'idle';
  }

  get isArrived(): boolean {
    return this.navigationPhase === 'arrived';
  }

  get isPreviewing(): boolean {
    return this.navigationPhase === 'preview';
  }

  get isPaused(): boolean {
    return this.navigationPhase === 'paused';
  }

  get isOffRoute(): boolean {
    return this.navigationPhase === 'offRoute';
  }

  get isGroupRide(): boolean {
    return this.navigationPhase === 'groupRide';
  }

  prepareSimulation(origin: Place): void {
    this.resetRouteSession();
    this.isSimulationMode = true;
    this.simulatedOrigin = origin;
    this.navigationPhase = 'preview';
  }

  prepareLiveNavigation(): void {
    this.isSimulationMode = false;
    this.isGroupRideMode = false;
    this.simulatedOrigin = null;
    this.resetNavigationProgress();
    this.arrivedAt = null;
    this.navigationPhase = 'preview';
  }

  prepareGroupRideNavigation(): void {
    this.isSimulationMode = false;
    this.isGroupRideMode = true;
    this.simulatedOrigin = null;
    this.resetNavigationProgress();
    this.arrivedAt = null;
    this.navigationPhase = 'preview';
  }

  startNavigation(initialRealProgressKm: number): void {
    this.navigationPhase = this.isGroupRideMode ? 'groupRide' : 'navigating';
    this.resumePhase = this.isGroupRideMode ? 'groupRide' : 'navigating';
    this.arrivedAt = null;
    this.simulatedDistanceKm = 0;
    this.lastRealProgressKm = this.isSimulationMode ? 0 : initialRealProgressKm;
    this.offRouteTicks = 0;
    this.clearSpokenVoiceIds();
  }

  startGroupRideNavigation(initialRealProgressKm: number): void {
    this.isGroupRideMode = true;
    this.isSimulationMode = false;
    this.simulatedOrigin = null;
    this.startNavigation(initialRealProgressKm);
  }

  pauseNavigation(): void {
    if (!this.isNavigating) return;
    this.resumePhase = this.isGroupRideMode ? 'groupRide' : 'navigating';
    this.navigationPhase = 'paused';
  }

  resumeNavigation(): void {
    if (!this.isPaused) return;
    this.navigationPhase = this.resumePhase;
  }

  enterOffRoute(): void {
    if (!this.isNavigating || this.isOffRoute) return;
    this.resumePhase = this.isGroupRideMode ? 'groupRide' : 'navigating';
    this.navigationPhase = 'offRoute';
  }

  exitOffRoute(): void {
    if (!this.isOffRoute) return;
    this.navigationPhase = this.isGroupRideMode ? 'groupRide' : 'navigating';
  }

  stopNavigation(): void {
    this.navigationPhase = 'preview';
    this.resetNavigationProgress();
    this.clearSpokenVoiceIds();
  }

  markArrived(arrivedAt: Date = new Date()): void {
    this.navigationPhase = 'arrived';
    this.arrivedAt = arrivedAt;
    this.offRouteTicks = 0;
    this.lastRealProgressKm = 0;
  }

  dismissArrival(): void {
    this.navigationPhase = 'idle';
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
    this.navigationPhase = 'idle';
    this.arrivedAt = null;
    this.resetNavigationProgress();
    this.isSimulationMode = false;
    this.isGroupRideMode = false;
    this.simulatedOrigin = null;
    this.resumePhase = 'navigating';
    this.clearSpokenVoiceIds();
  }

  reset(): void {
    this.resetRouteSession();
    this.isMuted = false;
    this.isElevationStripOpen = true;
  }
}
