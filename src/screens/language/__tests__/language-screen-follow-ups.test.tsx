import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { saveLanguage } from '@/screens/language/language-store';
import { LanguageScreen } from '@/screens/language/language-screen';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-router', () => ({ router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() } }));
jest.mock('@/screens/language/language-store', () => ({
  loadLanguage: jest.fn(() => 'es'),
  saveLanguage: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('LanguageScreen follow-ups (S1, S2, S3)', () => {
  it.each([
    ['Español', 'es-MX'],
    ["Maaya t'aan", 'yua'],
  ])('tags the %s option with its own language %s', async (name, language) => {
    await render(<LanguageScreen />);
    expect(screen.getByRole('button', { name }).props.accessibilityLanguage).toBe(language);
  });

  it('gives each option a primary-size width too', async () => {
    await render(<LanguageScreen />);
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Español' }).props.style).minWidth).toBeGreaterThanOrEqual(64);
  });

  it('still goes back when the choice cannot be saved', async () => {
    jest.mocked(saveLanguage).mockImplementationOnce(() => {
      throw new Error('disk');
    });
    await render(<LanguageScreen />);
    await fireEvent.press(screen.getByRole('button', { name: "Maaya t'aan" }));
    expect(router.back).toHaveBeenCalled();
  });
});
