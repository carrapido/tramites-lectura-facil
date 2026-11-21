import * as Speech from 'expo-speech';

import { SecondaryButton } from './secondary-button';

interface PlayButtonProps {
  /** What the phone says aloud. */
  text: string;
  /** Spoken name when the visible word "Escuchar" alone is ambiguous; it must keep that word. */
  accessibilityLabel?: string;
}

/** Audio plays only from this button, never by itself. */
export function PlayButton({ text, accessibilityLabel = 'Escuchar' }: PlayButtonProps) {
  return (
    <SecondaryButton
      label="Escuchar"
      accessibilityLabel={accessibilityLabel}
      icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
      onPress={() => speakAloud(text)}
    />
  );
}

function speakAloud(text: string) {
  // A new tap replaces the sentence in progress. https://docs.expo.dev/versions/v58.0.0/sdk/speech/
  void Speech.stop();
  Speech.speak(text, { language: 'es-MX' });
}
