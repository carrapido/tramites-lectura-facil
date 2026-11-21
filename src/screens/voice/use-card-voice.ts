import type { AudioPlayer, AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { releasePlayer, startPlayer } from '@/screens/voice/audio-player';
import { startSpanish, type SpanishPlayback } from '@/screens/voice/speak-spanish';
import { mayaVoiceUrl } from '@/screens/voice/voice-url';

/** Shown next to every Maya play button (S5). The domain owns the text; it has no React Native imports. */
export { MACHINE_VOICE_LABEL } from '@/tramites/voice';

export type CardVoiceStatus = 'idle' | 'loading' | 'playing' | 'error';

export type CardVoiceFailure = 'voice-unavailable';

export interface CardVoice {
  status: CardVoiceStatus;
  reason?: CardVoiceFailure;
  /** Plain Spanish with the laptop's Gemini voice, or the phone's Spanish voice as fallback (field-feedback S3, S4). */
  speakSpanish(text: string): void;
  /** Yucatec Maya from the laptop's Gemini voice (S6). */
  playMaya(text: string): void;
  stop(): void;
}

interface VoiceState {
  status: CardVoiceStatus;
  reason?: CardVoiceFailure;
}

const IDLE: VoiceState = { status: 'idle' };
const LOADING: VoiceState = { status: 'loading' };
const PLAYING: VoiceState = { status: 'playing' };
const UNAVAILABLE: VoiceState = { status: 'error', reason: 'voice-unavailable' };

/**
 * One voice at a time, only after a tap: nothing plays on mount (S5).
 * Each call starts a new turn; callbacks from an older turn are ignored.
 */
export function useCardVoice(): CardVoice {
  const [state, setState] = useState<VoiceState>(IDLE);
  const player = useRef<AudioPlayer | null>(null);
  const spanish = useRef<SpanishPlayback | null>(null);
  const turn = useRef(0);

  const silence = useCallback((): number => {
    releasePlayer(player);
    spanish.current?.stop();
    spanish.current = null;
    void Speech.stop();
    turn.current += 1;
    return turn.current;
  }, []);

  const settle = useCallback((ownTurn: number, next: VoiceState) => {
    if (ownTurn === turn.current) setState(next);
  }, []);

  const speakSpanish = useCallback(
    (text: string) => {
      const ownTurn = silence();
      setState(LOADING);
      const playback = startSpanish(text, () => settle(ownTurn, PLAYING));
      spanish.current = playback;
      // `shown`: neither the laptop nor the phone had a Spanish voice; the card already shows the text.
      void playback.done.then((outcome) => settle(ownTurn, outcome === 'shown' ? UNAVAILABLE : IDLE));
    },
    [silence, settle],
  );

  const playMaya = useCallback(
    (text: string) => {
      const ownTurn = silence();
      setState(LOADING);
      const end = (next: VoiceState) => {
        if (ownTurn !== turn.current) return;
        releasePlayer(player);
        setState(next);
      };
      const follow = (status: AudioStatus) => {
        const next = stateAfter(status);
        if (next === PLAYING) settle(ownTurn, next);
        else if (next) end(next);
      };
      try {
        player.current = startPlayer(mayaVoiceUrl(text), follow);
      } catch {
        end(UNAVAILABLE);
      }
    },
    [silence, settle],
  );

  const stop = useCallback(() => {
    silence();
    setState(IDLE);
  }, [silence]);

  useEffect(() => () => void silence(), [silence]);

  return useMemo(() => ({ ...state, speakSpanish, playMaya, stop }), [state, speakSpanish, playMaya, stop]);
}

/** A load or playback error ends the Maya voice; null means no change yet. */
function stateAfter(status: AudioStatus): VoiceState | null {
  if (status.error) return UNAVAILABLE;
  if (status.didJustFinish) return IDLE;
  return status.playing ? PLAYING : null;
}
