/**
 * Traduce un error de Firebase Auth (`auth/*`) a un mensaje en espanol apto
 * para mostrar al usuario. Si no reconoce el codigo, devuelve el mensaje crudo.
 * Compartido por los ViewModels de autenticacion (SignIn / SignUp).
 */
export function friendlyAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('auth/invalid-credential')) {
    return 'Email o contrasena incorrectos.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'Ese email ya tiene una cuenta.';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'El email no es valido.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'La contrasena es demasiado debil.';
  }
  return raw;
}
