import 'reflect-metadata';

// Silencia ruido de logs en la salida de tests sin perder fallos reales.
jest.spyOn(console, 'error').mockImplementation(() => undefined);
jest.spyOn(console, 'warn').mockImplementation(() => undefined);
jest.spyOn(console, 'log').mockImplementation(() => undefined);
