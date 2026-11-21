import { fireEvent, render, screen } from '@testing-library/react-native';

import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';

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

beforeEach(() => jest.clearAllMocks());

async function takePhoto() {
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));
}

function expectPhotoButtonEnabled() {
  expect(screen.getByRole('button', { name: PHOTO_BUTTON }).props.accessibilityState).toEqual(
    expect.objectContaining({ disabled: false }),
  );
}

describe('ReadScreen without text (S4 amended from L7)', () => {
  it('says what the photo seems to show and asks for a paper with letters', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'no-text', seen: 'una taza de café' });

    await takePhoto();

    const message = await screen.findByText(
      'No puedo saber si es un texto. Lo que me muestra parece ser: una taza de café. Tome una foto de un papel con letras.',
    );
    expect(message.props.accessibilityLanguage).toBe('es-MX');
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expectPhotoButtonEnabled();
  });

  it('asks for a paper with letters when there is no description', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'no-text' });

    await takePhoto();

    expect(await screen.findByText('No puedo saber si es un texto. Tome una foto de un papel con letras.')).toBeTruthy();
    expectPhotoButtonEnabled();
  });

  it('keeps the unreadable message for blurry text', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValueOnce({ ok: false, reason: 'unreadable' });

    await takePhoto();

    expect(await screen.findByText('No se ve bien la foto. Tome otra con más luz.')).toBeTruthy();
  });
});
