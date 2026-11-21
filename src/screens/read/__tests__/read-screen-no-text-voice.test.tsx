import { fireEvent, render, screen } from '@testing-library/react-native';

import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
import { speakSpanish } from '@/screens/voice/speak-spanish';

jest.mock('@/screens/voice/speak-spanish', () => ({ speakSpanish: jest.fn(async () => undefined) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));
jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const PHOTO_BUTTON = 'Tome una foto de su papel';
const NO_TEXT_WITH_SEEN =
  'No puedo saber si es un texto. Lo que me muestra parece ser: una taza de café. Tome una foto de un papel con letras.';

beforeEach(() => jest.clearAllMocks());

async function takePhoto() {
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));
}

describe('ReadScreen speaks the no-text message (document-reading L12)', () => {
  it('reads the red message aloud in Spanish when the photo has no text', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'no-text', seen: 'una taza de café' });

    await takePhoto();
    await screen.findByText(NO_TEXT_WITH_SEEN);

    expect(speakSpanish).toHaveBeenLastCalledWith(NO_TEXT_WITH_SEEN);
  });

  it('does not speak other errors by itself', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'unreadable' });

    await takePhoto();
    await screen.findByText('No se ve bien la foto. Tome otra con más luz.');

    expect(speakSpanish).not.toHaveBeenCalledWith('No se ve bien la foto. Tome otra con más luz.');
  });

  it('keeps the message on screen when the phone has no Spanish voice', async () => {
    jest.mocked(speakSpanish).mockImplementation(async (text: string) => {
      if (text === NO_TEXT_WITH_SEEN) throw new Error('no Spanish voice');
    });
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'no-text', seen: 'una taza de café' });

    await takePhoto();

    expect(await screen.findByText(NO_TEXT_WITH_SEEN)).toBeTruthy();
  });
});
