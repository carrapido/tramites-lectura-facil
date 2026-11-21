import { useCallback, useMemo, useState } from 'react';

import type { PlayStatus, VoiceControls } from '@/components/voice-controls';

import { useCardVoice } from './use-card-voice';

/**
 * One `useCardVoice()` for the whole screen, so starting a voice on one card stops the
 * other card's voice (review of PR #3, W1). The key of the last button pressed owns the status.
 */
export function useScreenVoice(): VoiceControls {
  const voice = useCardVoice();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { status, speakSpanish: speakVoice, playMaya: playVoice, stop } = voice;

  const statusOf = useCallback(
    (key: string): PlayStatus => (key === activeKey && isAudible(status) ? status : 'idle'),
    [activeKey, status],
  );

  const failed = useCallback((key: string) => key === activeKey && status === 'error', [activeKey, status]);

  const speakSpanish = useCallback(
    (key: string, text: string) => {
      setActiveKey(key);
      speakVoice(text);
    },
    [speakVoice],
  );

  const playMaya = useCallback(
    (key: string, text: string) => {
      setActiveKey(key);
      playVoice(text);
    },
    [playVoice],
  );

  return useMemo(
    () => ({ statusOf, failed, speakSpanish, playMaya, stop }),
    [statusOf, failed, speakSpanish, playMaya, stop],
  );
}

function isAudible(status: string): status is 'loading' | 'playing' {
  return status === 'loading' || status === 'playing';
}
