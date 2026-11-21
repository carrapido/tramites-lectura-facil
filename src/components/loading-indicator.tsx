import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

/**
 * A large waiting sign with the words of the current step, announced to screen readers
 * (odd/tasks/field-feedback.md, S1). With "reduce motion" on, a still hourglass replaces the spinner.
 * https://reactnative.dev/docs/activityindicator · https://docs.expo.dev/versions/v58.0.0/sdk/symbols/
 */
export function LoadingIndicator({ text }: { text: string }) {
  const reduceMotion = useReduceMotion();
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text}
      accessibilityLanguage="es-MX"
      accessibilityLiveRegion="polite"
    >
      {reduceMotion ? <StillIcon /> : <Spinner />}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/**
 * Follows the system "reduce motion" setting. Until the phone answers it assumes "on",
 * so a person who asked for no motion never sees the spinner flash.
 * https://reactnative.dev/docs/accessibilityinfo
 */
function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function Spinner() {
  return <ActivityIndicator testID="loading-spinner" size="large" color={theme.color.signal} />;
}

function StillIcon() {
  return (
    <View testID="loading-still">
      <SymbolView
        name={{ ios: 'hourglass', android: 'hourglass_empty' }}
        size={theme.size.pictogram}
        tintColor={theme.color.signal}
        fallback={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.lg },
  text: { fontSize: theme.type.body, fontWeight: theme.weight.body, color: theme.color.ink, textAlign: 'center' },
});
