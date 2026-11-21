/** Shown on any screen whose answer came from the demo recordings, never from a live call (S5). */
export const REPLAY_LABEL = 'Respuesta grabada';

/** The laptop's voice route sends this header with a recorded WAV. */
const REPLAY_HEADER = 'X-Demo-Replay';

export function isReplayedVoice(headers: Headers): boolean {
  return headers.get(REPLAY_HEADER) === '1';
}
