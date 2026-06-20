import { DEV_FAKE_ORIGIN } from '@/config/devFlags';

import { NavigationSessionStore } from '@/ui/store/NavigationSessionStore';

describe('NavigationSessionStore', () => {
  it('starts and stops a simulated navigation session', () => {
    const store = new NavigationSessionStore();

    store.prepareSimulation(DEV_FAKE_ORIGIN);
    expect(store.navigationPhase).toBe('preview');
    expect(store.isPreviewing).toBe(true);

    store.startNavigation(42);
    store.setSimulatedDistanceKm(12.5);

    expect(store.navigationPhase).toBe('navigating');
    expect(store.isSimulationMode).toBe(true);
    expect(store.simulatedOrigin?.id).toBe(DEV_FAKE_ORIGIN.id);
    expect(store.isNavigating).toBe(true);
    expect(store.lastRealProgressKm).toBe(0);
    expect(store.simulatedDistanceKm).toBe(12.5);

    store.stopNavigation();

    expect(store.navigationPhase).toBe('preview');
    expect(store.isNavigating).toBe(false);
    expect(store.simulatedDistanceKm).toBe(0);
    expect(store.isSimulationMode).toBe(true);
  });

  it('records real progress monotonically and tracks off-route confirmations', () => {
    const store = new NavigationSessionStore();

    store.prepareLiveNavigation();
    expect(store.navigationPhase).toBe('preview');

    store.startNavigation(1.2);
    store.recordRealProgress(1.1);
    store.recordRealProgress(2.4);

    expect(store.navigationPhase).toBe('navigating');
    expect(store.isSimulationMode).toBe(false);
    expect(store.lastRealProgressKm).toBe(2.4);
    expect(store.incrementOffRouteTicks()).toBe(1);
    expect(store.incrementOffRouteTicks()).toBe(2);

    store.resetOffRouteTicks();

    expect(store.offRouteTicks).toBe(0);
  });

  it('marks arrival, toggles UI flags, and resets route session state', () => {
    const store = new NavigationSessionStore();
    const arrivedAt = new Date('2026-06-20T12:00:00.000Z');

    store.startNavigation(0);
    store.markSpokenVoiceId('voice-1');
    store.toggleMute();
    store.toggleElevationStrip();
    store.markArrived(arrivedAt);

    expect(store.navigationPhase).toBe('arrived');
    expect(store.isNavigating).toBe(false);
    expect(store.isArrived).toBe(true);
    expect(store.arrivedAt).toBe(arrivedAt);
    expect(store.isMuted).toBe(true);
    expect(store.isElevationStripOpen).toBe(false);
    expect(store.hasSpokenVoiceId('voice-1')).toBe(true);

    store.reset();

    expect(store.isArrived).toBe(false);
    expect(store.arrivedAt).toBeNull();
    expect(store.isMuted).toBe(false);
    expect(store.isElevationStripOpen).toBe(true);
    expect(store.hasSpokenVoiceId('voice-1')).toBe(false);
  });

  it('pauses, resumes, and marks off-route without losing the session', () => {
    const store = new NavigationSessionStore();

    store.prepareLiveNavigation();
    store.startNavigation(3);
    store.pauseNavigation();

    expect(store.navigationPhase).toBe('paused');
    expect(store.isNavigating).toBe(false);
    expect(store.isNavigationActive).toBe(true);

    store.resumeNavigation();

    expect(store.navigationPhase).toBe('navigating');
    expect(store.isNavigating).toBe(true);

    store.enterOffRoute();

    expect(store.navigationPhase).toBe('offRoute');
    expect(store.isOffRoute).toBe(true);
    expect(store.isNavigating).toBe(true);

    store.exitOffRoute();

    expect(store.navigationPhase).toBe('navigating');
    expect(store.isOffRoute).toBe(false);
  });

  it('keeps group rides as a first-class navigation phase', () => {
    const store = new NavigationSessionStore();

    store.prepareGroupRideNavigation();
    expect(store.navigationPhase).toBe('preview');
    expect(store.isGroupRideMode).toBe(true);

    store.startNavigation(8);

    expect(store.navigationPhase).toBe('groupRide');
    expect(store.isGroupRide).toBe(true);
    expect(store.isNavigating).toBe(true);
    expect(store.lastRealProgressKm).toBe(8);

    store.enterOffRoute();
    expect(store.navigationPhase).toBe('offRoute');

    store.exitOffRoute();
    expect(store.navigationPhase).toBe('groupRide');

    store.pauseNavigation();
    store.resumeNavigation();
    expect(store.navigationPhase).toBe('groupRide');
  });

  it('tracks reroute attempts with cooldown while off-route', () => {
    const store = new NavigationSessionStore();

    store.prepareLiveNavigation();
    store.startNavigation(3);
    store.markOffRoute(0.24, 1_000);

    expect(store.navigationPhase).toBe('offRoute');
    expect(store.offRouteDistanceKm).toBe(0.24);
    expect(store.offRouteDetectedAtMs).toBe(1_000);
    expect(store.canRequestReroute(1_000)).toBe(true);

    expect(store.beginReroute(1_000, 30_000)).toBe(true);
    expect(store.isRerouting).toBe(true);
    expect(store.rerouteAttempts).toBe(1);
    expect(store.lastRerouteAtMs).toBe(1_000);
    expect(store.rerouteCooldownRemainingMs(10_000)).toBe(21_000);
    expect(store.canRequestReroute(10_000)).toBe(false);

    store.failReroute('network', 12_000, 60_000);

    expect(store.isRerouting).toBe(false);
    expect(store.rerouteError).toBe('network');
    expect(store.rerouteCooldownRemainingMs(42_000)).toBe(30_000);
    expect(store.beginReroute(42_000, 30_000)).toBe(false);

    expect(store.beginReroute(72_000, 30_000)).toBe(true);
    store.completeReroute();

    expect(store.navigationPhase).toBe('navigating');
    expect(store.isRerouting).toBe(false);
    expect(store.rerouteError).toBeNull();
    expect(store.offRouteDistanceKm).toBe(0);
    expect(store.rerouteAttempts).toBe(2);
    expect(store.rerouteCooldownRemainingMs(80_000)).toBe(22_000);
  });
});
