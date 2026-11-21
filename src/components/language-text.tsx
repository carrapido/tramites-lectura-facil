import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MACHINE_TRANSLATION_LABEL } from '@/tramites/easy-read';
import { theme } from '@/theme';

interface LanguageTextProps {
  children: ReactNode;
}

/**
 * `accessibilityLanguage` tells VoiceOver which voice to use (iOS only).
 * https://reactnative.dev/docs/accessibility#accessibilitylanguage-ios
 */
export function SpanishText({ children }: LanguageTextProps) {
  return (
    <Text style={styles.body} accessibilityLanguage="es-MX">
      {children}
    </Text>
  );
}

/** Every Maya sentence carries the machine-translation notice in Spanish. */
export function MayaText({ children }: LanguageTextProps) {
  return (
    <View style={styles.maya}>
      <Text style={styles.body} accessibilityLanguage="yua">
        {children}
      </Text>
      <Text style={styles.notice} accessibilityLanguage="es-MX">
        {MACHINE_TRANSLATION_LABEL}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  maya: { gap: theme.space.xs },
  body: { fontSize: theme.type.body, color: theme.color.ink },
  notice: { fontSize: theme.type.label, color: theme.color.inkMuted },
});
