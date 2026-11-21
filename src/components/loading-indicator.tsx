import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

import { useReduceMotion } from './use-reduce-motion';

/**
 * A large waiting sign with the words of the current step, announced to screen readers
 * (odd/tasks/field-feedback.md, S1). With "reduce motion" on, a still hourglass replaces the spinner.
 * https://reactnative.dev/docs/activityindicator · https://docs.expo.dev/versions/v58.0.0/sdk/symbols/
 */
export function LoadingIndicator({ text }: { text: string }) {
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      accessibilityLanguage="es-MX"
      accessibilityLiveRegion="polite"
    >
      <LoadingSymbol variant="block" color={theme.color.signal} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/**
 * `block` stands alone on the screen; `inline` sits inside a button, at icon size (S6, S8).
 * A number size is honored on Android; iOS draws its small spinner inside that box.
 */
const SYMBOL_VARIANT = {
  block: { spinnerSize: 'large', stillSize: theme.size.pictogram, testIDPrefix: 'loading' },
  inline: { spinnerSize: theme.size.icon, stillSize: theme.size.icon, testIDPrefix: 'button' },
} as const;

interface LoadingSymbolProps {
  variant: keyof typeof SYMBOL_VARIANT;
  color: string;
}

/** The one loading symbol of the app: a spinner, or a still hourglass with reduce motion on. */
export function LoadingSymbol({ variant, color }: LoadingSymbolProps) {
  const reduceMotion = useReduceMotion();
  const { spinnerSize, stillSize, testIDPrefix } = SYMBOL_VARIANT[variant];
  if (reduceMotion) {
    return (
      <View testID={`${testIDPrefix}-still`}>
        <SymbolView
          name={{ ios: 'hourglass', android: 'hourglass_empty' }}
          size={stillSize}
          tintColor={color}
          fallback={null}
        />
      </View>
    );
  }
  return <ActivityIndicator testID={`${testIDPrefix}-spinner`} size={spinnerSize} color={color} />;
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.lg },
  text: { fontSize: theme.type.body, fontWeight: theme.weight.body, color: theme.color.ink, textAlign: 'center' },
});
