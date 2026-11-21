import { z } from 'zod';

/** live: real Google adapters; record: real adapters whose answers are saved; replay: recordings only (S4, S5). */
export type DemoMode = 'live' | 'record' | 'replay';

/** The voice route marks a replayed WAV with this header, so the app can show "Respuesta grabada" (S5). */
export const REPLAY_HEADER = 'X-Demo-Replay';

/** Server-only flags. They never start with EXPO_PUBLIC_, so they never reach the app bundle (S5). */
const demoEnv = z.object({
  DEMO_RECORD: z.string().optional(),
  DEMO_REPLAY: z.string().optional(),
});

/** '1' turns a mode on. Replay wins when both are on: it never calls Google. */
export function readDemoMode(source: Record<string, string | undefined>): DemoMode {
  const env = demoEnv.parse(source);
  const record = env.DEMO_RECORD === '1';
  const replay = env.DEMO_REPLAY === '1';
  if (record && replay) console.warn('[demo] DEMO_RECORD and DEMO_REPLAY are both on; replaying without recording.');
  if (replay) return 'replay';
  return record ? 'record' : 'live';
}

/** The JSON field that marks a replayed answer; absent outside replay. */
export function replayedField(replayed: boolean): { replayed?: true } {
  return replayed ? { replayed: true } : {};
}
