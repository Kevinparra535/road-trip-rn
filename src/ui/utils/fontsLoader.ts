import { useFonts } from 'expo-font';

/**
 * Set de familias Poppins (TTF locales en `@/ui/assets/fonts/Poppins`) que la
 * app carga al boot. Las llaves coinciden con `FontFamily` en
 * `@/ui/styles/Fonts` — el peso va horneado en cada familia, así que
 * `fontWeight` nunca se setea inline. Centralizar el set aquí evita que App.tsx
 * y los tokens se desincronicen.
 */
const appFonts = {
  'Poppins-Regular': require('@/ui/assets/fonts/Poppins/Poppins-Regular.ttf'),
  'Poppins-Medium': require('@/ui/assets/fonts/Poppins/Poppins-Medium.ttf'),
  'Poppins-SemiBold': require('@/ui/assets/fonts/Poppins/Poppins-SemiBold.ttf'),
  'Poppins-Bold': require('@/ui/assets/fonts/Poppins/Poppins-Bold.ttf'),
};

/**
 * Hook de carga de fuentes de la app. Envuelve `useFonts` de `expo-font` para
 * que el set de familias viva en un solo lugar (App.tsx solo consume el estado).
 *
 * @returns `[fontsLoaded, fontError]` — `fontsLoaded` es `true` cuando las
 * familias están listas; `fontError` trae el error si la carga falló (App.tsx
 * puede decidir si bloquear el render o degradar a las fuentes del sistema).
 */
function useAppFonts(): [boolean, Error | null] {
  return useFonts(appFonts);
}

export default useAppFonts;
