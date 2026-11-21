import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { theme } from '@/theme';

interface SecondaryButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
}

/**
 * Secondary action: outlined, icon plus word, at least 48 dp. Extra props pass through so it works
 * inside `<Link asChild>`. https://docs.expo.dev/versions/v58.0.0/sdk/router/
 */
export function SecondaryButton({ label, icon, ...pressableProps }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityLanguage="es-MX"
      {...pressableProps}
      style={styles.button}
    >
      <SymbolView name={icon} size={theme.size.icon} tintColor={theme.color.signal} fallback={null} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
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
    borderWidth: 1,
    borderColor: theme.color.signal,
  },
  label: { fontSize: theme.type.label, fontWeight: theme.weight.label, color: theme.color.signal },
});
