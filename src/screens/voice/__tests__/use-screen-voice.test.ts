import { act, renderHook } from '@testing-library/react-native';

import { useCardVoice, type CardVoice } from '@/screens/voice/use-card-voice';
import { useScreenVoice } from '@/screens/voice/use-screen-voice';

jest.mock('@/screens/voice/use-card-voice', () => ({ useCardVoice: jest.fn() }));

function cardVoice(status: CardVoice['status'], reason?: CardVoice['reason']): CardVoice {
  return { status, reason, speakSpanish: jest.fn(), playMaya: jest.fn(), stop: jest.fn() };
}

describe('useScreenVoice (S9: one voice per screen)', () => {
  it('passes the text to the matching voice and reports status only for the key that started it', async () => {
    const voice = cardVoice('loading');
    jest.mocked(useCardVoice).mockReturnValue(voice);
    const { result } = await renderHook(() => useScreenVoice());

    await act(() => result.current.playMaya('c1:yua', "Bo'ot"));

    expect(voice.playMaya).toHaveBeenCalledWith("Bo'ot");
    expect(result.current.statusOf('c1:yua')).toBe('loading');
    expect(result.current.statusOf('c0:yua')).toBe('idle');
  });

  it('moves the status to the last key, so only one card shows "Parar"', async () => {
    const voice = cardVoice('playing');
    jest.mocked(useCardVoice).mockReturnValue(voice);
    const { result } = await renderHook(() => useScreenVoice());

    await act(() => result.current.playMaya('c0:yua', 'uno'));
    await act(() => result.current.speakSpanish('c1:es', 'dos'));

    expect(voice.speakSpanish).toHaveBeenCalledWith('dos');
    expect(result.current.statusOf('c0:yua')).toBe('idle');
    expect(result.current.statusOf('c1:es')).toBe('playing');
  });

  it('reports a failure only for the key that failed', async () => {
    jest.mocked(useCardVoice).mockReturnValue(cardVoice('error', 'voice-unavailable'));
    const { result } = await renderHook(() => useScreenVoice());

    await act(() => result.current.playMaya('c2:yua', 'tres'));

    expect(result.current.failed('c2:yua')).toBe(true);
    expect(result.current.failed('c0:yua')).toBe(false);
    expect(result.current.statusOf('c2:yua')).toBe('idle');
  });

  it('stops the shared voice', async () => {
    const voice = cardVoice('playing');
    jest.mocked(useCardVoice).mockReturnValue(voice);
    const { result } = await renderHook(() => useScreenVoice());
    await act(() => result.current.stop());
    expect(voice.stop).toHaveBeenCalled();
  });
});
