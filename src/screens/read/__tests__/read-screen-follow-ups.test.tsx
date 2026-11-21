import { fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

import { ReadScreen } from '@/screens/read/read-screen';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockResize = jest.fn();
const mockSave = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: {
    manipulate: () => {
      const context = {
        resize: (size: unknown) => {
          mockResize(size);
          return context;
        },
        renderAsync: async () => ({
          saveAsync: async (options: unknown) => {
            mockSave(options);
            return { uri: 'file:///small.jpg', width: 1600, height: 1200, base64: 'U01BTEw=' };
          },
        }),
      };
      return context;
    },
  },
}));

const PHOTO_BUTTON = 'Tome una foto de su papel';
const FACT = { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' };

function mockReadResponse(status: number, body: unknown) {
  global.fetch = jest.fn(async () => new Response(JSON.stringify(body), { status }));
}

function photoButton() {
  return screen.getByRole('button', { name: PHOTO_BUTTON });
}

/** Taps without waiting: fireEvent.press settles only when the whole photo flow ends. */
function startTap() {
  return fireEvent.press(photoButton());
}

function nextMacrotask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(Speech.speak).mockImplementation((_text, options) => options?.onDone?.());
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as ImagePicker.CameraPermissionResponse);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///photo.jpg', width: 1200, height: 900, base64: 'QUJD', mimeType: 'image/jpeg' }],
  });
});
afterEach(() => jest.useRealTimers());

describe('ReadScreen review follow-ups (S1, S4, S6)', () => {
  it('shows a camera message when the camera fails to open', async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockRejectedValueOnce(new Error('camera unavailable'));

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(await screen.findByText('No pudimos abrir la cámara. Intente otra vez.')).toBeTruthy();
    expect(photoButton()).toBeEnabled();
  });

  it('shows a camera message when the permission prompt fails', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockRejectedValueOnce(new Error('prompt failed'));

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(await screen.findByText('No pudimos abrir la cámara. Intente otra vez.')).toBeTruthy();
  });

  it('ignores a second tap while the first photo flow is still pending', async () => {
    let grant: (value: ImagePicker.CameraPermissionResponse) => void = () => undefined;
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    );
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });

    await render(<ReadScreen />);
    const firstTap = startTap();
    await nextMacrotask();
    const secondTap = startTap();
    await nextMacrotask();

    expect(photoButton()).toBeDisabled();
    grant({ granted: true } as ImagePicker.CameraPermissionResponse);
    await Promise.all([firstTap, secondTap]);
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('shows no error and re-enables the button when the person cancels the camera', async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Intente|Tome otra|Avise/)).toBeNull();
    expect(photoButton()).toBeEnabled();
  });

  it('still asks for the camera when speech never reports the end', async () => {
    jest.useFakeTimers();
    jest.mocked(Speech.speak).mockImplementationOnce(() => undefined);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });

    await render(<ReadScreen />);
    const tap = startTap();
    await jest.advanceTimersByTimeAsync(7_000);
    expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1_000);
    await tap;

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('continues when speech reports an error', async () => {
    jest.mocked(Speech.speak).mockImplementationOnce((_text, options) => options?.onError?.(new Error('no voice')));
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('asks the camera for a reduced quality photo', async () => {
    mockReadResponse(200, { ok: true, facts: [FACT] });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    await screen.findByText(FACT.text);
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ quality: 0.5 }));
  });

  it('shrinks a wide photo to 1600 px JPEG before sending it (S1)', async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///big.jpg', width: 4000, height: 3000, base64: 'QklH', mimeType: 'image/jpeg' }],
    });
    mockReadResponse(200, { ok: true, facts: [FACT] });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    await screen.findByText(FACT.text);
    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: null });
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ base64: true, format: 'jpeg' }));
    const body = jest.mocked(global.fetch).mock.calls[0]?.[1]?.body;
    expect(body).toContain('U01BTEw=');
    expect(body).not.toContain('QklH');
  });

  it('says the photo is too big or unusable on 400 invalid-request (S1)', async () => {
    mockReadResponse(400, { ok: false, reason: 'invalid-request' });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(await screen.findByText('La foto es muy grande o no sirve. Tome otra más de cerca.')).toBeTruthy();
  });

  it('does not blame the Wi-Fi when the laptop answers something unexpected', async () => {
    global.fetch = jest.fn(async () => new Response('<html>Internal error</html>', { status: 500 }));

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(await screen.findByText('La laptop respondió con un error. Avise a quien la atiende.')).toBeTruthy();
  });

  it('says the laptop needs configuration on 500 config-missing', async () => {
    mockReadResponse(500, { ok: false, reason: 'config-missing' });

    await render(<ReadScreen />);
    await fireEvent.press(photoButton());

    expect(await screen.findByText('Falta configurar la laptop. Avise a quien la atiende.')).toBeTruthy();
  });

  it('gives up after 45 s, says the laptop took too long and re-enables the button', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    await render(<ReadScreen />);
    const tap = startTap();
    await jest.advanceTimersByTimeAsync(45_000);
    await tap;

    expect(screen.getByText('La laptop tardó mucho. Revise la red y tome la foto otra vez.')).toBeTruthy();
    expect(photoButton()).toBeEnabled();
  });
});
