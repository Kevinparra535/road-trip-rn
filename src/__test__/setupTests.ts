import 'reflect-metadata';

// Mock global de AsyncStorage. La libreria provee uno listo para Jest y es la
// forma oficial recomendada (https://react-native-async-storage.github.io/
// async-storage/docs/advanced/jest). `jest.mock()` necesita require sincrono
// dentro de la factory; la regla aqui es ruido del lint.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Silencia ruido de logs en la salida de tests sin perder fallos reales.
jest.spyOn(console, 'error').mockImplementation(() => undefined);
jest.spyOn(console, 'warn').mockImplementation(() => undefined);
jest.spyOn(console, 'log').mockImplementation(() => undefined);
