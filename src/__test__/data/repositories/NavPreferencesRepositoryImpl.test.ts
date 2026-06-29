import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavPreferencesRepositoryImpl } from '@/data/repositories/NavPreferencesRepositoryImpl';

const STORAGE_KEY = '@road-trip/nav-preferences/v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('NavPreferencesRepositoryImpl', () => {
  it('get devuelve los defaults cuando no hay nada guardado', async () => {
    const repo = new NavPreferencesRepositoryImpl();
    expect(await repo.get()).toEqual({ muted: false });
  });

  it('setMuted + get: roundtrip persiste el flag', async () => {
    const repo = new NavPreferencesRepositoryImpl();
    await repo.setMuted(true);
    expect(await repo.get()).toEqual({ muted: true });

    await repo.setMuted(false);
    expect(await repo.get()).toEqual({ muted: false });
  });

  it('get degrada a defaults si el JSON persistido esta corrupto', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid json');
    const repo = new NavPreferencesRepositoryImpl();
    expect(await repo.get()).toEqual({ muted: false });
  });

  it('get cae al default cuando muted no es boolean (shape parcial/corrupto)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: 'yes' }));
    const repo = new NavPreferencesRepositoryImpl();
    expect(await repo.get()).toEqual({ muted: false });
  });

  it('serializa escrituras paralelas sin perder la ultima', async () => {
    const repo = new NavPreferencesRepositoryImpl();
    await Promise.all([repo.setMuted(true), repo.setMuted(false), repo.setMuted(true)]);
    expect(await repo.get()).toEqual({ muted: true });
  });
});
