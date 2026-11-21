import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { loadLanguage, saveLanguage, useLanguage } from '@/screens/language/language-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() },
}));

describe('the read screen follows the saved language (S8)', () => {
  it('re-renders a subscriber when the language is saved', async () => {
    const { result } = await renderHook(() => useLanguage());
    expect(result.current).toBe('es');
    await act(() => saveLanguage('yua'));
    expect(result.current).toBe('yua');
  });

  it('keeps the choice for this session even when the phone cannot store it', () => {
    jest.mocked(Storage.setItemSync).mockImplementationOnce(() => {
      throw new Error('disk');
    });
    expect(() => saveLanguage('es')).toThrow('disk');
    expect(loadLanguage()).toBe('es');
  });
});
