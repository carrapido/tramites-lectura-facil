import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { fakeAudioPlayer } from '@/__fixtures__/fake-audio-player';
import { fetchEasyRead } from '@/screens/easy-read-client';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';

const order: string[] = [];
const player = fakeAudioPlayer((name) => order.push(name));

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(() => order.push('push')) },
  Link: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
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

describe('"Cambiar idioma" silences the card voice first (PR #7 review, W1)', () => {
  it('releases the playing Maya voice before it opens /idioma', async () => {
    await render(<ReadScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Escuchar en maya' }));
    await act(() => player.emit({ playing: true }));
    order.length = 0;

    await fireEvent.press(screen.getByRole('button', { name: 'Cambiar idioma' }));

    expect(router.push).toHaveBeenCalledWith('/idioma');
    expect(order.indexOf('remove')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('remove')).toBeLessThan(order.indexOf('push'));
  });
});
