import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

import { SecondaryButton } from './secondary-button';
import type { PlayStatus } from './voice-controls';

interface PlayButtonProps {
  status: PlayStatus;
  /** Starts the voice; called only from the tap, never by itself. */
  onPress: () => void;
  onStop: () => void;
  /** Spoken name when the visible word "Escuchar" alone is ambiguous; it must keep that word. */
  accessibilityLabel?: string;
}

export function PlayButton({ status, onPress, onStop, accessibilityLabel = 'Escuchar' }: PlayButtonProps) {
  if (status === 'idle') {
    return (
      <SecondaryButton
        label="Escuchar"
        accessibilityLabel={accessibilityLabel}
        icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up' }}
        onPress={onPress}
      />
    );
  }
  return (
    <View style={styles.active}>
      <SecondaryButton
        label="Parar"
        accessibilityState={{ busy: status === 'loading' }}
        icon={{ ios: 'stop.fill', android: 'stop' }}
        onPress={onStop}
      />
      {status === 'loading' ? (
        <Text style={styles.status} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          Preparando la voz.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  active: { gap: theme.space.xs },
  status: { fontSize: theme.type.label, color: theme.color.inkMuted },
});
