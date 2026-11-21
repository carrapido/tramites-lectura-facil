import { render, screen } from '@testing-library/react-native';

import { LanguageScreen } from '@/screens/language/language-screen';
import { useScreenVoice } from '@/screens/voice/use-screen-voice';

import { fakeVoice } from '@/__fixtures__/fake-voice';

jest.mock('expo-router', () => ({ router: { canGoBack: () => true, back: jest.fn(), replace: jest.fn() } }));
jest.mock('@/screens/language/language-store', () => ({ loadLanguage: jest.fn(() => 'es'), saveLanguage: jest.fn() }));
jest.mock('@/screens/voice/use-screen-voice', () => ({ useScreenVoice: jest.fn() }));

describe('LanguageScreen Maya sample failure (verifier W5)', () => {
  it('says in plain words when the Maya sample cannot be heard', async () => {
    jest.mocked(useScreenVoice).mockReturnValue(fakeVoice({}, ['yua']));
    await render(<LanguageScreen />);
    expect(screen.getByText('No se pudo oír en maya. Escuche en español.')).toBeTruthy();
  });
});
