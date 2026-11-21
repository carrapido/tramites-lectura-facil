/** Plain words for `voice-unavailable` (objective 5 contract): what happened and the next step. */
export const MAYA_VOICE_FAILED = 'No se pudo oír en maya. Escuche en español.';

/** What one play button shows: "Escuchar" when idle, "Parar" while the voice loads or plays. */
export type PlayStatus = 'idle' | 'loading' | 'playing';

/**
 * One voice for the whole screen. Each button passes its own key, so only the button
 * that started the voice shows its status.
 */
export interface VoiceControls {
  statusOf(key: string): PlayStatus;
  failed(key: string): boolean;
  speakSpanish(key: string, text: string): void;
  playMaya(key: string, text: string): void;
  stop(): void;
}
