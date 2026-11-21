import * as Speech from 'expo-speech';

/**
 * Speaks one Spanish sentence and resolves when it ends (odd/tasks/field-feedback.md, S3–S4).
 * Contract shared by the read screen, the agent sheet and the permission prompts.
 * Placeholder: the voice task replaces the body with the laptop Spanish voice plus an explicit phone fallback.
 */
export function speakSpanish(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, { language: 'es-MX', onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve() });
  });
}
