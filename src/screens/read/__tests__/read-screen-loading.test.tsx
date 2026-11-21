import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AccessibilityInfo } from 'react-native';

import { fetchEasyRead, type EasyReadResult } from '@/screens/easy-read-client';
import { fetchPlan, type PlanResult } from '@/screens/plan/plan-client';
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

const FACTS = [{ kind: 'fecha', text: 'Vence el 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];

/** A promise the test resolves by hand, so it can look at the screen while the app waits. */
function deferred<T>() {
  const handle: { resolve: (value: T) => void } = { resolve: () => undefined };
  const promise = new Promise<T>((resolve) => {
    handle.resolve = resolve;
  });
  return { promise, resolve: (value: T) => handle.resolve(value) };
}

async function startPhoto() {
  await render(<ReadScreen />);
  void fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category: 'tramite', facts: FACTS });
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: false, reason: 'timeout' });
  jest.mocked(fetchPlan).mockResolvedValue({ ok: false, reason: 'unreachable' });
});

describe('ReadScreen loading states (field-feedback S1)', () => {
  it('shows the spinner with "Leyendo." while the photo is read', async () => {
    const reading = deferred<ReadBody>();
    jest.mocked(readNoticePhoto).mockReturnValueOnce(reading.promise);
    await startPhoto();

    expect(await screen.findByRole('progressbar', { name: 'Leyendo.' })).toBeTruthy();
    expect(await screen.findByTestId('loading-spinner')).toBeTruthy();

    await act(async () => reading.resolve({ ok: true, category: 'tramite', facts: FACTS }));
  });

  it('shows "Preparando sus tarjetas." while the cards are prepared', async () => {
    const cards = deferred<EasyReadResult>();
    jest.mocked(fetchEasyRead).mockReturnValueOnce(cards.promise);
    await startPhoto();

    expect(await screen.findByRole('progressbar', { name: 'Preparando sus tarjetas.' })).toBeTruthy();

    await act(async () => cards.resolve({ ok: false, reason: 'timeout' }));
    expect(await screen.findByText(FACTS[0].text)).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: 'Preparando sus tarjetas.' })).toBeNull();
  });

  it('shows "Preparando su lista." as a progress indicator while the plan loads', async () => {
    const plan = deferred<PlanResult>();
    jest.mocked(fetchPlan).mockReturnValueOnce(plan.promise);
    await startPhoto();

    expect(await screen.findByRole('progressbar', { name: 'Preparando su lista.' })).toBeTruthy();

    await act(async () => plan.resolve({ ok: false, reason: 'unreachable' }));
  });

  it('shows a still icon and no spinner while reading when reduce motion is on', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    const reading = deferred<ReadBody>();
    jest.mocked(readNoticePhoto).mockReturnValueOnce(reading.promise);
    await startPhoto();

    await screen.findByRole('progressbar', { name: 'Leyendo.' });
    expect(await screen.findByTestId('loading-still')).toBeTruthy();
    expect(screen.queryByTestId('loading-spinner')).toBeNull();

    await act(async () => reading.resolve({ ok: true, category: 'tramite', facts: FACTS }));
  });
});

describe('ReadScreen camera side (field-feedback S2)', () => {
  it('opens the rear camera', async () => {
    await startPhoto();
    await screen.findByText(FACTS[0].text);

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ cameraType: ImagePicker.CameraType.back }),
    );
  });
});
