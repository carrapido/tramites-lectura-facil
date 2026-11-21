import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { ReadScreen } from '@/screens/read/read-screen';
import { speakSpanish } from '@/screens/voice/speak-spanish';

jest.mock('@/screens/voice/speak-spanish', () => ({ speakSpanish: jest.fn(async () => undefined) }));
jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined),
}));

jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
  })),
}));

const PHOTO_BUTTON = 'Tome una foto de su texto, papel o trámite';

function mockReadResponse(status: number, body: unknown) {
  global.fetch = jest.fn(async () => new Response(JSON.stringify(body), { status }));
}

beforeEach(() => jest.clearAllMocks());

describe('ReadScreen (S6, S4)', () => {
  it('does not ask for the camera before the tap', async () => {
    await render(<ReadScreen />);
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: PHOTO_BUTTON })).toBeTruthy();
  });

  it('speaks the reason, then asks permission, then shows the facts with their source', async () => {
    const order: string[] = [];
    jest.mocked(speakSpanish).mockImplementationOnce(async () => {
      order.push('speak');
    });
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockImplementationOnce(async () => {
      order.push('permission');
      return { granted: true } as ImagePicker.CameraPermissionResponse;
    });
    mockReadResponse(200, {
      ok: true,
      facts: [{ kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' }],
    });

    await render(<ReadScreen />);
    await fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));

    expect(await screen.findByText('Pague antes del 30 de noviembre.')).toBeTruthy();
    expect(order).toEqual(['speak', 'permission']);
    expect(speakSpanish).toHaveBeenCalledWith('Necesitamos la cámara para leer su papel.');
    expect(screen.queryByText('vence el día 30 de noviembre de 2026')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: '¿De dónde salió?' }));
    expect(screen.getByText('vence el día 30 de noviembre de 2026')).toBeTruthy();
  });

  it('tells the person to take another photo when the notice is unreadable (S4)', async () => {
    mockReadResponse(422, { ok: false, reason: 'unreadable' });

    await render(<ReadScreen />);
    await fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));

    expect(await screen.findByText('No se ve bien la foto. Tome otra con más luz.')).toBeTruthy();
  });

  it('explains what to do when the camera permission is denied', async () => {
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as ImagePicker.CameraPermissionResponse);

    await render(<ReadScreen />);
    await fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));

    expect(await screen.findByText('Sin permiso para la cámara. Actívelo en Ajustes del teléfono.')).toBeTruthy();
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});
