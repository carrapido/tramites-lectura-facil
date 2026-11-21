import { StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

import { ButtonIcon, type ButtonSymbol } from './button-icon';
import { PressableFeedback, type PressableFeedbackProps } from './pressable-feedback';

interface SecondaryButtonProps extends Omit<PressableFeedbackProps, 'style' | 'children'> {
  label: string;
  icon: ButtonSymbol;
  /** Its action is in progress: loading symbol next to the words, and no second tap (field-feedback S8). */
  busy?: boolean;
}

/**
 * Secondary action: outlined, icon plus word, at least 48 dp. Extra props pass through so it works
 * inside `<Link asChild>`. https://docs.expo.dev/versions/v58.0.0/sdk/router/
 */
export function SecondaryButton({ label, icon, busy = false, ...pressableProps }: SecondaryButtonProps) {
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityLanguage="es-MX"
      {...pressableProps}
      {...(busy ? busyProps(pressableProps) : null)}
      style={styles.button}
    >
      <ButtonIcon icon={icon} busy={busy} color={theme.color.signal} />
      <Text style={styles.label}>{label}</Text>
    </PressableFeedback>
  );
}

function busyProps({ accessibilityState }: PressableFeedbackProps) {
  return { disabled: true, accessibilityState: { ...accessibilityState, disabled: true, busy: true } };
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.size.minTarget,
    minWidth: theme.size.minTarget,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.signal,
  },
  label: { fontSize: theme.type.label, fontWeight: theme.weight.label, color: theme.color.signal },
});
