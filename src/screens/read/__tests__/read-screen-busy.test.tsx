import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { fetchEasyRead } from '@/screens/easy-read-client';
import { fetchPlan } from '@/screens/plan/plan-client';
import { readNoticePhoto, type ReadBody } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';

jest.mock('@/screens/voice/speak-spanish', () => ({ speakSpanish: jest.fn(async () => undefined) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));
jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn() }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn() }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const PHOTO_BUTTON = 'Tome una foto de su papel';
const FACTS = [{ kind: 'fecha', text: 'Vence el 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];

/** A promise the test resolves by hand, so it can look at the screen while the app waits. */
function deferred<T>() {
  const handle: { resolve: (value: T) => void } = { resolve: () => undefined };
  const promise = new Promise<T>((resolve) => {
    handle.resolve = resolve;
  });
  return { promise, resolve: (value: T) => handle.resolve(value) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: false, reason: 'timeout' });
  jest.mocked(fetchPlan).mockResolvedValue({ ok: false, reason: 'unreachable' });
});

describe('the photo button stays busy during the photo flow (field-feedback S8)', () => {
  it('shows its spinner and is disabled and busy until the cards arrive', async () => {
    const reading = deferred<ReadBody>();
    jest.mocked(readNoticePhoto).mockReturnValueOnce(reading.promise);
    await render(<ReadScreen />);
    void fireEvent.press(screen.getByRole('button', { name: PHOTO_BUTTON }));

    await screen.findByRole('progressbar', { name: 'Leyendo.' });
    expect(screen.getByRole('button', { name: PHOTO_BUTTON }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, busy: true }),
    );
    expect(screen.getByTestId('button-spinner')).toBeTruthy();

    await act(async () => reading.resolve({ ok: true, category: 'tramite', facts: FACTS }));
    await screen.findByText(FACTS[0].text);
    expect(screen.queryByTestId('button-spinner')).toBeNull();
    expect(screen.getByRole('button', { name: PHOTO_BUTTON }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });
});
