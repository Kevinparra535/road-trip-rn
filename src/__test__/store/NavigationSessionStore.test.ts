import { DEV_FAKE_ORIGIN } from '@/config/devFlags';

import { NavigationSessionStore } from '@/ui/store/NavigationSessionStore';

describe('NavigationSessionStore', () => {
  it('starts and stops a simulated navigation session', () => {
    const store = new NavigationSessionStore();

    store.prepareSimulation(DEV_FAKE_ORIGIN);
    store.startNavigation(42);
    store.setSimulatedDistanceKm(12.5);

    expect(store.isSimulationMode).toBe(true);
    expect(store.simulatedOrigin?.id).toBe(DEV_FAKE_ORIGIN.id);
    expect(store.isNavigating).toBe(true);
    expect(store.lastRealProgressKm).toBe(0);
    expect(store.simulatedDistanceKm).toBe(12.5);

    store.stopNavigation();

    expect(store.isNavigating).toBe(false);
    expect(store.simulatedDistanceKm).toBe(0);
    expect(store.isSimulationMode).toBe(true);
  });

  it('records real progress monotonically and tracks off-route confirmations', () => {
    const store = new NavigationSessionStore();

    store.prepareLiveNavigation();
    store.startNavigation(1.2);
    store.recordRealProgress(1.1);
    store.recordRealProgress(2.4);

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
});
