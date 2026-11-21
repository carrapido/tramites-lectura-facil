import Storage from 'expo-sqlite/kv-store';

import { loadLanguage, saveLanguage } from '@/screens/language/language-store';

jest.mock('expo-sqlite/kv-store', () => {
  const values = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItemSync: jest.fn((key: string) => values.get(key) ?? null),
      setItemSync: jest.fn((key: string, value: string) => values.set(key, value)),
    },
  };
});

describe('language choice is remembered (S4)', () => {
  it('defaults to Spanish when nothing was chosen', () => {
    expect(loadLanguage()).toBe('es');
  });

  it('returns the saved choice', () => {
    saveLanguage('yua');
    expect(loadLanguage()).toBe('yua');
    expect(Storage.setItemSync).toHaveBeenCalledWith('language', 'yua');
  });

  it('falls back to Spanish for an unknown stored value', () => {
    jest.mocked(Storage.getItemSync).mockReturnValueOnce('fr');
    expect(loadLanguage()).toBe('es');
  });

  it('falls back to Spanish when the store cannot be read', () => {
    jest.mocked(Storage.getItemSync).mockImplementationOnce(() => {
      throw new Error('disk');
    });
    expect(loadLanguage()).toBe('es');
  });
});
