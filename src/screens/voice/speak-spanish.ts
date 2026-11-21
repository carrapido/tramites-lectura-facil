import type { AudioStatus } from 'expo-audio';
import * as Speech from 'expo-speech';

import { releasePlayer, startPlayer, type PlayerHolder } from './audio-player';
import { spanishPhoneVoice } from './phone-spanish-voice';
import { voiceUrl } from './voice-url';

/**
 * How one Spanish sentence ended (odd/tasks/field-feedback.md, S3–S4):
 * - `spoken`: a Spanish voice said it to the end;
 * - `shown`: no Spanish voice could say it, so the caller shows the sentence on screen;
 * - `stopped`: the person or a newer voice stopped it.
 */
export type SpanishOutcome = 'spoken' | 'shown' | 'stopped';

/** Neither the laptop nor the phone could say the sentence in Spanish; the caller shows it on screen instead (S4). */
export class NoSpanishVoiceError extends Error {
  constructor() {
    super('No Spanish voice could speak the sentence');
    this.name = 'NoSpanishVoiceError';
  }
}

/** The laptop voice must start playing within this time; after it the phone voice speaks instead (S4). */
export const LAPTOP_VOICE_DEADLINE_MS = 6_000;

/** One Spanish sentence on its way: `done` never rejects. */
export interface SpanishPlayback {
  readonly done: Promise<SpanishOutcome>;
  stop(): void;
}

let current: SpanishPlayback | null = null;

/**
 * Speaks one Spanish sentence and resolves when it ends or is stopped. Contract shared by the read screen,
 * the agent sheet and the permission prompts. A new sentence stops the previous one (S5).
 * Rejects with `NoSpanishVoiceError` when no Spanish voice could say it, so the caller can show it (S4).
 */
export async function speakSpanish(text: string): Promise<void> {
  stopSpanish();
  const playback = startSpanish(text);
  current = playback;
  const outcome = await playback.done;
  if (current === playback) current = null;
  if (outcome === 'shown') throw new NoSpanishVoiceError();
}

/** Stops the sentence that `speakSpanish` is saying, if any. */
export function stopSpanish(): void {
  current?.stop();
  current = null;
}

/**
 * The laptop's Gemini Spanish voice first; the phone's own Spanish voice when the laptop
 * fails or is late (S3, S4). `onPlaying` runs once, when a voice is heard.
 */
export function startSpanish(text: string, onPlaying: () => void = () => undefined): SpanishPlayback {
  const session = new SpanishSession(text, onPlaying);
  session.start();
  return session;
}

class SpanishSession implements SpanishPlayback {
  readonly done: Promise<SpanishOutcome>;
  private finish: (outcome: SpanishOutcome) => void = () => undefined;
  private readonly laptop: PlayerHolder = { current: null };
  private deadline: ReturnType<typeof setTimeout> | undefined;
  private heard = false;
  private onPhone = false;
  private ended = false;

  constructor(
    private readonly text: string,
    private readonly onPlaying: () => void,
  ) {
    this.done = new Promise((resolve) => {
      this.finish = resolve;
    });
  }

  start(): void {
    try {
      this.laptop.current = startPlayer(voiceUrl(this.text, 'es'), (status) => this.follow(status));
      this.deadline = setTimeout(() => this.fallBack(), LAPTOP_VOICE_DEADLINE_MS);
    } catch {
      this.fallBack();
    }
  }

  stop(): void {
    if (this.ended) return;
    this.end('stopped');
    void Speech.stop();
  }

  private follow(status: AudioStatus): void {
    if (status.error) this.fallBack();
    else if (status.didJustFinish) this.end('spoken');
    else if (status.playing) this.markHeard();
  }

  private fallBack(): void {
    if (this.ended || this.onPhone) return;
    this.onPhone = true;
    this.releaseLaptop();
    void this.speakOnPhone();
  }

  /** An explicitly chosen Spanish voice, never the phone's default one. https://docs.expo.dev/versions/v58.0.0/sdk/speech/ */
  private async speakOnPhone(): Promise<void> {
    const voice = await spanishPhoneVoice();
    if (this.ended) return;
    if (!voice) {
      this.end('shown');
      return;
    }
    Speech.speak(this.text, {
      voice: voice.identifier,
      language: voice.language,
      onDone: () => this.end('spoken'),
      onStopped: () => this.end('stopped'),
      onError: () => this.end('shown'),
    });
    this.markHeard();
  }

  private markHeard(): void {
    clearTimeout(this.deadline);
    if (this.heard) return;
    this.heard = true;
    this.onPlaying();
  }

  private end(outcome: SpanishOutcome): void {
    if (this.ended) return;
    this.ended = true;
    this.releaseLaptop();
    this.finish(outcome);
  }

  private releaseLaptop(): void {
    clearTimeout(this.deadline);
    releasePlayer(this.laptop);
  }
}
