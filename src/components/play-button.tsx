import { SecondaryButton } from './secondary-button';
import type { PlayStatus } from './voice-controls';

/** Said while the laptop prepares the voice, before it plays (field-feedback S6). */
const PREPARING_VOICE = 'Preparando la voz.';

interface PlayButtonProps {
  status: PlayStatus;
  /** Starts the voice; called only from the tap, never by itself. */
  onPress: () => void;
  onStop: () => void;
  /** Spoken name when the visible word "Escuchar" alone is ambiguous; it must keep that word. */
  accessibilityLabel?: string;
}

/**
 * "Escuchar" when idle, a busy "Preparando la voz." while the voice loads (S6, S8),
 * and "Parar" while it plays.
 */
export function PlayButton({ status, onPress, onStop, accessibilityLabel = 'Escuchar' }: PlayButtonProps) {
  if (status === 'loading') {
    return (
      <SecondaryButton
        label={PREPARING_VOICE}
        icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
        busy
        accessibilityLiveRegion="polite"
      />
    );
  }
  if (status === 'playing') {
    return <SecondaryButton label="Parar" icon={{ ios: 'stop.fill', android: 'stop' }} onPress={onStop} />;
  }
  return (
    <SecondaryButton
      label="Escuchar"
      accessibilityLabel={accessibilityLabel}
      icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
      onPress={onPress}
    />
  );
}
