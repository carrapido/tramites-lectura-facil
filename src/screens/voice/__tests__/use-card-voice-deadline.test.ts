import { act, renderHook } from '@testing-library/react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { fakeAudioPlayer } from '@/__fixtures__/fake-audio-player';
import { MAYA_VOICE_DEADLINE_MS, useCardVoice } from '@/screens/voice/use-card-voice';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));
jest.mock('@/screens/voice/phone-spanish-voice', () => ({ spanishPhoneVoice: jest.fn() }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

const MAYA = "Bo'ot ka'aj 30.";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Maya voice deadline (field-feedback S8: a busy button never stays stuck)', () => {
  it('frees the button with voice-unavailable when the Maya voice never starts', async () => {
    const calls: string[] = [];
    const player = fakeAudioPlayer((name) => calls.push(name));
    jest.mocked(createAudioPlayer).mockReturnValue(player as AudioPlayer);
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.playMaya(MAYA));
    expect(result.current.status).toBe('loading');

    await act(() => jest.advanceTimersByTime(MAYA_VOICE_DEADLINE_MS));

    expect(result.current.status).toBe('error');
    expect(result.current.reason).toBe('voice-unavailable');
    expect(calls).toContain('remove');
  });

  it('keeps a Maya voice that started playing before the deadline', async () => {
    const calls: string[] = [];
    const player = fakeAudioPlayer((name) => calls.push(name));
    jest.mocked(createAudioPlayer).mockReturnValue(player as AudioPlayer);
    const { result } = await renderHook(() => useCardVoice());

    await act(() => result.current.playMaya(MAYA));
    await act(() => player.emit({ playing: true }));
    await act(() => jest.advanceTimersByTime(MAYA_VOICE_DEADLINE_MS));

    expect(result.current.status).toBe('playing');
    expect(calls).not.toContain('remove');
  });
});
