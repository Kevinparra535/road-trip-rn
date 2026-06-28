import { gateDeepLink, PendingDeepLinkStore } from '@/ui/store/PendingDeepLinkStore';

describe('gateDeepLink', () => {
  it('permite navegar con sesión abierta, guarda con sesión cerrada', () => {
    expect(gateDeepLink(true)).toBe('allow');
    expect(gateDeepLink(false)).toBe('stash');
  });
});

describe('PendingDeepLinkStore', () => {
  it('arranca sin URL pendiente', () => {
    const store = new PendingDeepLinkStore();
    expect(store.hasPending).toBe(false);
    expect(store.pendingUrl).toBeNull();
  });

  it('gate("...", false) guarda la URL; gate("...", true) la deja pasar', () => {
    const store = new PendingDeepLinkStore();

    expect(store.gate('roadtrip://join/ABC', false)).toBe('stash');
    expect(store.hasPending).toBe(true);
    expect(store.pendingUrl).toBe('roadtrip://join/ABC');

    const other = new PendingDeepLinkStore();
    expect(other.gate('roadtrip://route/r1', true)).toBe('allow');
    expect(other.hasPending).toBe(false);
  });

  it('resolvePending reemite la URL guardada a los listeners y la limpia', () => {
    const store = new PendingDeepLinkStore();
    const received: string[] = [];
    store.onResolved((url) => received.push(url));

    store.stash('roadtrip://join/XYZ');
    store.resolvePending();

    expect(received).toEqual(['roadtrip://join/XYZ']);
    expect(store.hasPending).toBe(false);
  });

  it('resolvePending es no-op cuando no hay nada pendiente', () => {
    const store = new PendingDeepLinkStore();
    const received: string[] = [];
    store.onResolved((url) => received.push(url));
    store.resolvePending();
    expect(received).toEqual([]);
  });

  it('onResolved devuelve un unsubscribe que evita reemisiones', () => {
    const store = new PendingDeepLinkStore();
    const received: string[] = [];
    const unsub = store.onResolved((url) => received.push(url));
    unsub();
    store.stash('roadtrip://route/r1');
    store.resolvePending();
    expect(received).toEqual([]);
  });
});
