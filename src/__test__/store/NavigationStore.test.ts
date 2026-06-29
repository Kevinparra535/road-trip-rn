import { NavigationStore } from '@/ui/store/NavigationStore';

import { makePlace } from '../factories';

describe('NavigationStore — condiciones del viaje (F1)', () => {
  it('arranca sin copiloto/maletas/ritmo', () => {
    const store = new NavigationStore();
    expect(store.hasPassenger).toBe(false);
    expect(store.hasLuggage).toBe(false);
    expect(store.aggressiveRiding).toBe(false);
  });

  it('los toggles alternan cada condición de forma independiente', () => {
    const store = new NavigationStore();
    store.togglePassenger();
    store.toggleLuggage();
    store.toggleAggressiveRiding();
    expect(store.hasPassenger).toBe(true);
    expect(store.hasLuggage).toBe(true);
    expect(store.aggressiveRiding).toBe(true);

    store.togglePassenger();
    expect(store.hasPassenger).toBe(false);
    expect(store.hasLuggage).toBe(true);
  });

  it('ridingConditions expone el value object de dominio', () => {
    const store = new NavigationStore();
    store.togglePassenger();
    const conditions = store.ridingConditions;
    expect(conditions.hasPassenger).toBe(true);
    expect(conditions.hasLuggage).toBe(false);
    expect(conditions.aggressiveRiding).toBe(false);
  });

  it('reset limpia las condiciones junto con el resto del estado', () => {
    const store = new NavigationStore();
    store.setPreviewPlace(makePlace());
    store.togglePassenger();
    store.toggleLuggage();
    store.toggleAggressiveRiding();

    store.reset();

    expect(store.hasPassenger).toBe(false);
    expect(store.hasLuggage).toBe(false);
    expect(store.aggressiveRiding).toBe(false);
    expect(store.previewPlace).toBeNull();
  });
});
