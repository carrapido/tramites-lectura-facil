import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { LanguageScreen } from '@/screens/language/language-screen';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-router', () => ({ router: { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() } }));
jest.mock('@/screens/language/language-store', () => ({
  loadLanguage: jest.fn(() => 'es'),
  saveLanguage: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('LanguageScreen navigation after a choice (review of PR #2, fix 1)', () => {
  it('goes home when /idioma was opened with no screen behind it', async () => {
    await render(<LanguageScreen />);
    await fireEvent.press(screen.getByRole('button', { name: "Maaya t'aan" }));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('goes back when there is a screen behind it', async () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    await render(<LanguageScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Español' }));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
