import { act, renderHook } from '@testing-library/react-native';
import { createAudioPlayer, type AudioEvents, type AudioPlayer, type AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';

import { MACHINE_VOICE_LABEL, useCardVoice } from '@/screens/voice/use-card-voice';
import { mayaVoiceUrl } from '@/screens/voice/voice-url';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
}));

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

const SPANISH = 'Pague antes del 30 de noviembre.';
const MAYA = "Bo'ot ka'aj 30.";

type FakePlayer = Pick<AudioPlayer, 'play' | 'pause' | 'remove' | 'addListener'> & {
  emit: (status: Partial<AudioStatus>) => void;
};

const BASE_STATUS: AudioStatus = {
  id: 'p1',
  currentTime: 0,
  playbackState: 'ready',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  mute: false,
  duration: 2,
  playing: false,
  loop: false,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: true,
  playbackRate: 1,
  shouldCorrectPitch: true,
  isLive: false,
  currentOffsetFromLive: null,
  error: null,
};

function fakePlayer(): FakePlayer {
  const listeners: ((status: AudioStatus) => void)[] = [];
  return {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn((event: keyof AudioEvents, listener: AudioEvents[keyof AudioEvents]) => {
      if (isStatusListener(event, listener)) listeners.push(listener);
      return { remove: jest.fn() };
    }),
    emit: (status) => listeners.forEach((listener) => listener({ ...BASE_STATUS, ...status })),
  };
}

function isStatusListener(
  event: keyof AudioEvents,
  _listener: AudioEvents[keyof AudioEvents],
): _listener is AudioEvents['playbackStatusUpdate'] {
  return event === 'playbackStatusUpdate';
}

let player: FakePlayer;

beforeEach(() => {
  jest.clearAllMocks();
  player = fakePlayer();
  jest.mocked(createAudioPlayer).mockImplementation(() => player as AudioPlayer);
});

function lastSpeechOptions(): Speech.SpeechOptions | undefined {
  return jest.mocked(Speech.speak).mock.calls.at(-1)?.[1];
}

describe('MACHINE_VOICE_LABEL (S5)', () => {
  it('is exported for the UI next to the Maya play button', () => {
    expect(MACHINE_VOICE_LABEL).toBe('Voz automática, sin revisar');
  });
});

describe('mayaVoiceUrl (S6)', () => {
  it('points to GET /api/voice on the laptop with the text encoded', () => {
    expect(mayaVoiceUrl('Bo’ot 30 & más')).toMatch(/^http:\/\/.+\/api\/voice\?text=Bo%E2%80%99ot%2030%20%26%20m%C3%A1s$/);
  });
});

describe('useCardVoice (S1, S5, S6)', () => {
  it('plays nothing on mount and starts idle (S5)', async () => {
    const { result } = await renderHook(() => useCardVoice());

    expect(result.current.status).toBe('idle');
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(createAudioPlayer).not.toHaveBeenCalled();
  });

  it('speaks Spanish with the phone voice in es-MX and returns to idle when done (S1)', async () => {
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.speakSpanish(SPANISH));

    expect(Speech.speak).toHaveBeenCalledWith(SPANISH, expect.objectContaining({ language: 'es-MX' }));
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(result.current.status).toBe('playing');

    await act(() => lastSpeechOptions()?.onDone?.());
    expect(result.current.status).toBe('idle');
  });

  it('stops the phone voice, then plays the remote WAV for the Maya text (S5, S6)', async () => {
    const order: string[] = [];
    jest.mocked(Speech.stop).mockImplementation(async () => {
      order.push('speech-stop');
    });
    jest.mocked(createAudioPlayer).mockImplementation(() => {
      order.push('player');
      return player as AudioPlayer;
    });
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.playMaya(MAYA));

    expect(order).toEqual(['speech-stop', 'player']);
    expect(createAudioPlayer).toHaveBeenCalledWith({ uri: mayaVoiceUrl(MAYA) });
    expect(player.play).toHaveBeenCalled();
    expect(result.current.status).toBe('loading');

    await act(() => player.emit({ playing: true }));
    expect(result.current.status).toBe('playing');

    await act(() => player.emit({ playing: false, didJustFinish: true }));
    expect(result.current.status).toBe('idle');
    expect(player.remove).toHaveBeenCalled();
  });

  it('never sends the Maya text to the phone voice (S1)', async () => {
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.playMaya(MAYA));
    await act(() => result.current.speakSpanish(SPANISH));

    expect(jest.mocked(Speech.speak).mock.calls.map(([text]) => text)).toEqual([SPANISH]);
  });

  it('releases the Maya player before the Spanish voice starts: one voice at a time (S5)', async () => {
    const { result } = await renderHook(() => useCardVoice());
    await act(() => result.current.playMaya(MAYA));

    await act(() => result.current.speakSpanish(SPANISH));

    expect(player.pause).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledTimes(1);
  });

  it('stop() stops both voices and returns to idle (S6)', async () => {
    const { result } = await renderHook(() => useCardVoice());
    await act(() => result.current.playMaya(MAYA));
    jest.mocked(Speech.stop).mockClear();

    await act(() => result.current.stop());

    expect(Speech.stop).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('ignores the stopped Spanish callback after Maya starts', async () => {
    const { result } = await renderHook(() => useCardVoice());
    await act(() => result.current.speakSpanish(SPANISH));
    const spanishOptions = lastSpeechOptions();

    await act(() => result.current.playMaya(MAYA));
    await act(() => spanishOptions?.onStopped?.());

    expect(result.current.status).toBe('loading');
  });

  it('reports voice-unavailable when the Maya audio fails, and Spanish still works (S6)', async () => {
    const { result } = await renderHook(() => useCardVoice());
    await act(() => result.current.playMaya(MAYA));

    await act(() => player.emit({ error: 'HTTP 502' }));

    expect(result.current.status).toBe('error');
    expect(result.current.reason).toBe('voice-unavailable');
    expect(player.remove).toHaveBeenCalled();

    await act(() => result.current.speakSpanish(SPANISH));
    expect(Speech.speak).toHaveBeenCalledWith(SPANISH, expect.objectContaining({ language: 'es-MX' }));
    expect(result.current.status).toBe('playing');
    expect(result.current.reason).toBeUndefined();
  });

  it('reports voice-unavailable when the player cannot be created (S6)', async () => {
    jest.mocked(createAudioPlayer).mockImplementation(() => {
      throw new Error('bad source');
    });
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.playMaya(MAYA));

    expect(result.current.status).toBe('error');
    expect(result.current.reason).toBe('voice-unavailable');
  });

  it('releases the Maya player on unmount', async () => {
    const { result, unmount } = await renderHook(() => useCardVoice());
    await act(() => result.current.playMaya(MAYA));

    await unmount();

    expect(player.remove).toHaveBeenCalled();
  });
});
