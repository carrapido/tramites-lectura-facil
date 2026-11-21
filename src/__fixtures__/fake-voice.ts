import type { PlayStatus, VoiceControls } from '@/components/voice-controls';

/** A screen voice whose per-key status and failure the test sets. */
export function fakeVoice(statusByKey: Record<string, PlayStatus> = {}, failedKeys: string[] = []): VoiceControls {
  return {
    statusOf: jest.fn((key: string) => statusByKey[key] ?? 'idle'),
    failed: jest.fn((key: string) => failedKeys.includes(key)),
    speakSpanish: jest.fn(),
    playMaya: jest.fn(),
    stop: jest.fn(),
  };
}
