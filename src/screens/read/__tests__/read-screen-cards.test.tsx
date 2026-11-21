import { fireEvent, render, screen } from '@testing-library/react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { fakeAudioPlayer } from '@/__fixtures__/fake-audio-player';

import { fetchEasyRead } from '@/screens/easy-read-client';
import { useLanguage } from '@/screens/language/language-store';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
import type { EasyReadCard } from '@/tramites/easy-read';

jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined),
}));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('@/screens/voice/speak-spanish', () => ({
  ...jest.requireActual('@/screens/voice/speak-spanish'),
  speakSpanish: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn() }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn(async () => ({ ok: false, reason: 'unreachable' })) }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const FACTS = [
  { kind: 'fecha', text: 'Vence el 30 de noviembre de 2026.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  { kind: 'monto', text: 'Debe 1,250 pesos.', sourceQuote: 'la cantidad de $1,250.00' },
];
const CARDS: EasyReadCard[] = [
  { kind: 'fecha', plainSpanish: 'Pague antes del 30 de noviembre.', maya: "Bo'ot ka'aj 30.", mayaStatus: 'machine-unreviewed', sourceQuote: FACTS[0].sourceQuote },
  { kind: 'monto', plainSpanish: 'Debe pagar 1,250 pesos.', maya: null, mayaStatus: 'unavailable', sourceQuote: FACTS[1].sourceQuote },
];

async function takePhoto() {
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category: 'tramite', facts: FACTS });
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: true, cards: CARDS });
});

describe('ReadScreen easy-read cards (S7, S8, S9)', () => {
  it('turns the facts into easy-read cards, one card per EasyReadCard', async () => {
    await takePhoto();
    expect(await screen.findByText(CARDS[0].plainSpanish)).toBeTruthy();
    expect(screen.getByText(CARDS[1].plainSpanish)).toBeTruthy();
    expect(fetchEasyRead).toHaveBeenCalledWith(FACTS);
    expect(screen.queryByText(FACTS[0].text)).toBeNull();
    expect(screen.getAllByRole('button', { name: '¿De dónde salió?' })).toHaveLength(2);
  });

  it('keeps the objective 3 facts in Spanish when the easy-read cards fail', async () => {
    jest.mocked(fetchEasyRead).mockResolvedValue({ ok: false, reason: 'timeout' });
    await takePhoto();
    expect(await screen.findByText(FACTS[0].text)).toBeTruthy();
    expect(screen.getByText(FACTS[1].text)).toBeTruthy();
    expect(screen.queryByText('Traducción automática, sin revisar')).toBeNull();
  });

  it('shows no Maya while Español is chosen', async () => {
    await takePhoto();
    await screen.findByText(CARDS[0].plainSpanish);
    expect(screen.queryByText(CARDS[0].maya ?? '')).toBeNull();
  });

  it('adds the labeled Maya under the Spanish when Maaya t\'aan is chosen, only where Maya exists', async () => {
    jest.mocked(useLanguage).mockReturnValue('yua');
    await takePhoto();
    expect(await screen.findByText(CARDS[0].maya ?? '')).toBeTruthy();
    expect(screen.getAllByText('Traducción automática, sin revisar')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Escuchar en maya' })).toHaveLength(1);
    expect(screen.getByText(CARDS[1].plainSpanish)).toBeTruthy();
  });

  it('plays one voice at a time across cards: only the last pressed card shows its busy voice button', async () => {
    await takePhoto();
    await screen.findByText(CARDS[0].plainSpanish);
    jest.mocked(createAudioPlayer).mockImplementation(() => fakeAudioPlayer(() => undefined) as AudioPlayer);
    const [first, second] = screen.getAllByRole('button', { name: 'Escuchar' });
    await fireEvent.press(first);
    await fireEvent.press(second);
    // Spanish now plays the laptop's Gemini voice (field-feedback S3), not the phone voice (objective 5 S1, superseded).
    expect(jest.mocked(createAudioPlayer).mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ uri: expect.stringContaining(`text=${encodeURIComponent(CARDS[1].plainSpanish)}&lang=es`) }),
    );
    // The laptop voice is still loading, so the button is busy (field-feedback S6/S8) instead of "Parar".
    expect(screen.getAllByRole('button', { name: 'Preparando la voz.' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Escuchar' })).toHaveLength(1);
  });
});
