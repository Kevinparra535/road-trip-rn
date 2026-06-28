import { injectable } from 'inversify';

/**
 * Decisión de gating de un deep link según el estado de sesión (F4 auth-gating).
 * Pura y testeable; la usa el `linking` config para decidir si navega ya o
 * guarda la URL hasta el login.
 */
export type DeepLinkGate = 'allow' | 'stash';

export const gateDeepLink = (isAuthenticated: boolean): DeepLinkGate =>
  isAuthenticated ? 'allow' : 'stash';

/**
 * Store global (singleton) del deep-linking diferido (F4 — G9). Cuando llega un
 * deep link con la sesión cerrada, `RootNavigator` muestra el `AuthNavigator` y
 * la pantalla destino (RouteDetail/JoinRoute…) aún no existe, así que el link se
 * perdería. Aquí lo **guardamos** y lo **reemitimos** una vez autenticado.
 *
 * Es estado puro, sin use-cases: una URL pendiente + listeners de "resuelto".
 * El `linking.subscribe` se suscribe a `onResolved` para reinyectar la URL al
 * navigator cuando el login ocurre.
 *
 * NOTA: el cableado end-to-end con `expo-linking` + el `NavigationContainer`
 * requiere validación en device (cold-start de deep link).
 *
 * Es un store puramente imperativo (sin lecturas reactivas de `pendingUrl`), así
 * que NO usa `makeAutoObservable` — sería envoltura inútil sobre el Set de
 * listeners.
 */
@injectable()
export class PendingDeepLinkStore {
  /** URL/path pendiente de resolver tras el login, o `null`. */
  pendingUrl: string | null = null;

  private resolvedListeners: Set<(url: string) => void> = new Set();

  get hasPending(): boolean {
    return this.pendingUrl !== null;
  }

  /** Guarda una URL que llegó con la sesión cerrada. */
  stash(url: string): void {
    this.pendingUrl = url;
  }

  /**
   * Reemite la URL pendiente (si hay) a los listeners y la limpia. Lo llama el
   * gate al pasar a autenticado. No-op si no hay nada pendiente.
   */
  resolvePending(): void {
    const url = this.pendingUrl;
    if (!url) return;
    this.pendingUrl = null;
    this.resolvedListeners.forEach((listener) => listener(url));
  }

  /** Suscribe un listener que recibe la URL al resolverse; devuelve el unsub. */
  onResolved(listener: (url: string) => void): () => void {
    this.resolvedListeners.add(listener);
    return () => {
      this.resolvedListeners.delete(listener);
    };
  }

  /** Decide si una URL entrante navega ya o se guarda, según la sesión. */
  gate(url: string, isAuthenticated: boolean): DeepLinkGate {
    const decision = gateDeepLink(isAuthenticated);
    if (decision === 'stash') this.stash(url);
    return decision;
  }

  reset(): void {
    this.pendingUrl = null;
  }
}
