import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { LAPTOP_VOICE_DEADLINE_MS, speakSpanish, startSpanish, stopSpanish } from '@/screens/voice/speak-spanish';
import { voiceUrl } from '@/screens/voice/voice-url';

import { fakeAudioPlayer, type FakeAudioPlayer } from '@/__fixtures__/fake-audio-player';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(),
  VoiceQuality: { Default: 'Default', Enhanced: 'Enhanced' },
}));

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

const SENTENCE = 'Para avisarle antes de la fecha, necesitamos permiso.';

const MEXICAN: Speech.Voice = {
  identifier: 'es-mx-voice',
  name: 'Paulina',
  quality: Speech.VoiceQuality.Default,
  language: 'es-MX',
};

const ENGLISH: Speech.Voice = { identifier: 'en-voice', name: 'Samantha', quality: MEXICAN.quality, language: 'en-US' };

let player: FakeAudioPlayer;

beforeEach(() => {
  jest.clearAllMocks();
  player = fakeAudioPlayer();
  jest.mocked(createAudioPlayer).mockImplementation(() => player as AudioPlayer);
  jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([ENGLISH, MEXICAN]);
});

afterEach(() => {
  stopSpanish();
  jest.useRealTimers();
});

function lastSpeechOptions(): Speech.SpeechOptions | undefined {
  return jest.mocked(Speech.speak).mock.calls.at(-1)?.[1];
}

/** Lets the voice lookup promise settle. */
async function flush(): Promise<void> {
  for (let round = 0; round < 5; round += 1) await Promise.resolve();
}

describe('voiceUrl (field-feedback S3)', () => {
  it('asks the laptop for the Spanish voice with lang=es', () => {
    expect(voiceUrl('Sí & no', 'es')).toMatch(/^http:\/\/.+\/api\/voice\?text=S%C3%AD%20%26%20no&lang=es$/);
  });

  it('asks the laptop for the Maya voice with lang=yua', () => {
    expect(voiceUrl("Bo'ot", 'yua')).toMatch(/\/api\/voice\?text=Bo'ot&lang=yua$/);
  });
});

describe('speakSpanish (field-feedback S3, S4)', () => {
  it('plays the laptop Spanish voice first and resolves when it ends (S3)', async () => {
    const spoken = speakSpanish(SENTENCE);

    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: voiceUrl(SENTENCE, 'es') });
    expect(player.play).toHaveBeenCalled();
    player.emit({ playing: true });
    player.emit({ playing: false, didJustFinish: true });

    await expect(spoken).resolves.toBeUndefined();
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
  });

  it('falls back to an explicit es-MX phone voice when the laptop voice fails (S4)', async () => {
    const spoken = speakSpanish(SENTENCE);
    player.emit({ error: 'HTTP 502' });
    await flush();

    expect(player.remove).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith(
      SENTENCE,
      expect.objectContaining({ voice: 'es-mx-voice', language: 'es-MX' }),
    );
    lastSpeechOptions()?.onDone?.();
    await expect(spoken).resolves.toBeUndefined();
  });

  it('falls back to the phone voice when the laptop player cannot be created (S4)', async () => {
    jest.mocked(createAudioPlayer).mockImplementation(() => {
      throw new Error('bad source');
    });

    const spoken = speakSpanish(SENTENCE);
    await flush();

    expect(Speech.speak).toHaveBeenCalledWith(SENTENCE, expect.objectContaining({ voice: 'es-mx-voice' }));
    lastSpeechOptions()?.onDone?.();
    await expect(spoken).resolves.toBeUndefined();
  });

  it('falls back when the laptop voice has not started after the deadline, not before (S4)', async () => {
    jest.useFakeTimers();
    void speakSpanish(SENTENCE);

    await jest.advanceTimersByTimeAsync(LAPTOP_VOICE_DEADLINE_MS - 1);
    expect(Speech.speak).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    expect(LAPTOP_VOICE_DEADLINE_MS).toBe(6_000);
    expect(player.remove).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith(SENTENCE, expect.objectContaining({ voice: 'es-mx-voice' }));
  });

  it('keeps the laptop voice once it plays, even past the deadline', async () => {
    jest.useFakeTimers();
    void speakSpanish(SENTENCE);
    player.emit({ playing: true });

    await jest.advanceTimersByTimeAsync(LAPTOP_VOICE_DEADLINE_MS * 2);

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(player.remove).not.toHaveBeenCalled();
  });

  it('stopSpanish stops the voice, resolves and never falls back', async () => {
    const spoken = speakSpanish(SENTENCE);

    stopSpanish();
    player.emit({ error: 'late' });
    await flush();

    await expect(spoken).resolves.toBeUndefined();
    expect(player.remove).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('a new sentence stops the previous one: one voice at a time (S5)', async () => {
    const first = fakeAudioPlayer();
    const second = fakeAudioPlayer();
    jest.mocked(createAudioPlayer)
      .mockImplementationOnce(() => first as AudioPlayer)
      .mockImplementationOnce(() => second as AudioPlayer);

    const earlier = speakSpanish('Uno.');
    void speakSpanish('Dos.');

    await expect(earlier).resolves.toBeUndefined();
    expect(first.remove).toHaveBeenCalled();
    expect(second.remove).not.toHaveBeenCalled();
  });

  it('startSpanish reports how the sentence ended: stopped, then spoken', async () => {
    const stopped = startSpanish('Uno.');
    stopped.stop();
    await expect(stopped.done).resolves.toBe('stopped');

    const spoken = startSpanish('Dos.');
    player.emit({ playing: false, didJustFinish: true });
    await expect(spoken.done).resolves.toBe('spoken');
  });
});
