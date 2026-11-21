import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { pickSpanishVoice } from '@/screens/voice/phone-spanish-voice';
import { NoSpanishVoiceError, speakSpanish } from '@/screens/voice/speak-spanish';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

type Quality = Speech.Voice['quality'];
const DEFAULT: Quality = Speech.VoiceQuality.Default;
const ENHANCED: Quality = Speech.VoiceQuality.Enhanced;

function voice(language: string, quality: Quality = DEFAULT): Speech.Voice {
  return { identifier: `${language}-${quality}`, name: language, quality, language };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createAudioPlayer).mockImplementation(() => {
    throw new Error('laptop unreachable');
  });
});

/** Lets the voice lookup promise settle. */
async function flush(): Promise<void> {
  for (let round = 0; round < 5; round += 1) await Promise.resolve();
}

describe('pickSpanishVoice (field-feedback S4)', () => {
  it.each([
    ['es-MX before es-US', [voice('es-US'), voice('es-MX')], 'es-MX'],
    ['es-US before es-419', [voice('es-419'), voice('es-US')], 'es-US'],
    ['es-419 before any other es-*', [voice('es-ES'), voice('es-419')], 'es-419'],
    ['any es-* before no voice', [voice('en-US'), voice('es-ES')], 'es-ES'],
    ['an Android underscore tag', [voice('es_ES'), voice('es_MX')], 'es_MX'],
  ])('prefers %s', (_name, voices, language) => {
    expect(pickSpanishVoice(voices)?.language).toBe(language);
  });

  it('prefers the Enhanced voice within the same tier', () => {
    expect(pickSpanishVoice([voice('es-MX'), voice('es-MX', ENHANCED), voice('es-US', ENHANCED)])).toEqual(
      voice('es-MX', ENHANCED),
    );
  });

  it('never picks a voice of another language, even one starting with "es" letters', () => {
    expect(pickSpanishVoice([voice('en-US'), voice('et-EE'), voice('est')])).toBeNull();
  });
});

describe('speakSpanish without a phone Spanish voice (field-feedback S4)', () => {
  it('does not speak with another language and rejects with NoSpanishVoiceError so the caller shows the sentence', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([voice('en-US')]);

    await expect(speakSpanish('Hola.')).rejects.toBeInstanceOf(NoSpanishVoiceError);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('rejects with NoSpanishVoiceError when the voice list cannot be read', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockRejectedValue(new Error('no engine'));

    await expect(speakSpanish('Hola.')).rejects.toBeInstanceOf(NoSpanishVoiceError);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('remembers the chosen voice for the session and asks the phone only once', async () => {
    jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([voice('es-MX')]);
    jest.mocked(Speech.speak).mockImplementation((_text, options) => options?.onDone?.());

    await speakSpanish('Uno.');
    await speakSpanish('Dos.');
    await flush();

    expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Speech.speak).mock.calls.map(([, options]) => options?.voice)).toEqual([
      'es-MX-Default',
      'es-MX-Default',
    ]);
  });
});
