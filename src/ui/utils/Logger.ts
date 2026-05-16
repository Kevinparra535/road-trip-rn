/**
 * Wrapper de logging consistente. Cada clase crea su propia instancia con un
 * scope (`new Logger('AuthViewModel')`) para etiquetar el origen del mensaje.
 */
export default class Logger {
  constructor(private readonly scope: string) {}

  info(message: string): void {
    console.log(`[${this.scope}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.scope}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.scope}] ${message}`);
  }
}
