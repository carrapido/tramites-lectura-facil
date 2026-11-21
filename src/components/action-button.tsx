import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

interface ActionButtonProps {
  label: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
  onPress: () => void;
  disabled?: boolean;
}

/** Primary action: one tap, icon plus word, 64 dp tall. https://docs.expo.dev/versions/v58.0.0/sdk/symbols/ */
export function ActionButton({ label, icon, onPress, disabled = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityLanguage="es-MX"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <SymbolView name={icon} size={theme.size.icon} tintColor={theme.color.onSignal} fallback={null} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
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
