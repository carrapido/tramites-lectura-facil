import { fireEvent, render, screen } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';

import { loadLanguage, saveLanguage } from '@/screens/language/language-store';
import { LanguageScreen } from '@/screens/language/language-screen';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => []) }));
jest.mock('expo-router', () => ({ router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() } }));
jest.mock('@/screens/language/language-store', () => ({
  loadLanguage: jest.fn(() => 'es'),
  saveLanguage: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('LanguageScreen (S4)', () => {
  it('names each language in its own name, with a sample button each and a visible back', async () => {
    await render(<LanguageScreen />);
    expect(screen.getByRole('button', { name: 'Español' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Maaya t'aan" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Escuchar Español' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Escuchar Maaya t'aan" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
  });

  it('marks the remembered language as selected', async () => {
    jest.mocked(loadLanguage).mockReturnValueOnce('yua');
    await render(<LanguageScreen />);
    expect(screen.getByRole('button', { name: "Maaya t'aan" }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole('button', { name: 'Español' }).props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('plays each sample only when its button is pressed, Maya with the Maya voice (S9)', async () => {
    await render(<LanguageScreen />);
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(createAudioPlayer).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar Español' }));
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: expect.stringMatching(/\/api\/voice\?text=Espa%C3%B1ol&lang=es$/) });
    await fireEvent.press(screen.getByRole('button', { name: "Escuchar Maaya t'aan" }));
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: expect.stringContaining('/api/voice?text=') });
    expect(screen.getByText('Voz automática, sin revisar')).toBeTruthy();
  });

  it('remembers the chosen language and goes back', async () => {
    await render(<LanguageScreen />);
    await fireEvent.press(screen.getByRole('button', { name: "Maaya t'aan" }));
    expect(saveLanguage).toHaveBeenCalledWith('yua');
    expect(router.back).toHaveBeenCalled();
  });

  it('gives each language option a primary-size target', async () => {
    await render(<LanguageScreen />);
    const option = screen.getByRole('button', { name: 'Español' });
    const { StyleSheet } = jest.requireActual<typeof import('react-native')>('react-native');
    expect(StyleSheet.flatten(option.props.style).minHeight).toBeGreaterThanOrEqual(64);
  });
});
