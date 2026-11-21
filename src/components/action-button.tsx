import { StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

import { ButtonIcon, type ButtonSymbol } from './button-icon';
import { PressableFeedback } from './pressable-feedback';

interface ActionButtonProps {
  label: string;
  icon: ButtonSymbol;
  onPress: () => void;
  disabled?: boolean;
  /** Its action is in progress: loading symbol next to the words, and no second tap (field-feedback S8). */
  busy?: boolean;
}

/** Primary action: one tap, icon plus word, 64 dp tall. https://docs.expo.dev/versions/v58.0.0/sdk/symbols/ */
export function ActionButton({ label, icon, onPress, disabled = false, busy = false }: ActionButtonProps) {
  const inactive = disabled || busy;
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityLanguage="es-MX"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={styles.button}
    >
      <ButtonIcon icon={icon} busy={busy} color={theme.color.onSignal} />
      <Text style={styles.label}>{label}</Text>
    </PressableFeedback>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.size.primaryTarget,
    minWidth: theme.size.primaryTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.signal,
  },
  label: { fontSize: theme.type.label, fontWeight: theme.weight.label, color: theme.color.onSignal },
});
