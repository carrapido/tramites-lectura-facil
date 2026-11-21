import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { fakeAudioPlayer } from '@/__fixtures__/fake-audio-player';
import { fetchEasyRead } from '@/screens/easy-read-client';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';

const order: string[] = [];
const player = fakeAudioPlayer((name) => order.push(name));

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('@/screens/voice/speak-spanish', () => ({
  speakSpanish: jest.fn(async (text: string) => {
    order.push(`speak:${text}`);
  }),
}));
jest.mock('expo-speech', () => ({
  speak: jest.fn((text: string, options?: { onDone?: () => void }) => {
    order.push(`speak:${text}`);
    options?.onDone?.();
  }),
  stop: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn() }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn(async () => ({ ok: false, reason: 'unreachable' })) }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'yua') }));

const FACT = { kind: 'fecha', text: 'Vence el 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' };
const CARD = { kind: 'fecha', plainSpanish: 'Pague antes del 30 de noviembre.', maya: "Bo'ot ka'aj 30.", mayaStatus: 'machine-unreviewed' as const, sourceQuote: FACT.sourceQuote };

beforeEach(() => {
  order.length = 0;
  jest.mocked(createAudioPlayer).mockImplementation(() => player as AudioPlayer);
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category: 'tramite', facts: [FACT] });
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: true, cards: [CARD] });
});

describe('a new photo silences the card voice first (verifier B1)', () => {
  it('stops the Maya voice before the camera reason, and no old "Parar" stays', async () => {
    await render(<ReadScreen />);
    const photoButton = screen.getByRole('button', { name: 'Tome una foto de su papel' });
    await fireEvent.press(photoButton);
    await fireEvent.press(await screen.findByRole('button', { name: 'Escuchar en maya' }));
    await act(() => player.emit({ playing: true }));
    expect(screen.getByRole('button', { name: 'Parar' })).toBeTruthy();
    order.length = 0;

    await fireEvent.press(photoButton);
    await screen.findByRole('button', { name: 'Escuchar en maya' });

    expect(order.indexOf('remove')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('remove')).toBeLessThan(order.indexOf('speak:Necesitamos la cámara para leer su papel.'));
    expect(screen.queryByRole('button', { name: 'Parar' })).toBeNull();
    expect(Speech.stop).toHaveBeenCalled();
  });
});
