import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

import { SecondaryButton } from './secondary-button';

/** Every fact keeps its source: the literal quote of the notice is one tap away. */
export function SourceQuote({ quote }: { quote: string }) {
  const [visible, setVisible] = useState(false);
  if (visible) {
    return (
      <Text style={styles.quote} accessibilityLanguage="es-MX">
        {quote}
      </Text>
    );
  }
  return (
    <SecondaryButton
      label="¿De dónde salió?"
      icon={{ ios: 'text.quote', android: 'format_quote' }}
      onPress={() => setVisible(true)}
    />
  );
}

const styles = StyleSheet.create({
  quote: { fontSize: theme.type.body, fontStyle: 'italic', color: theme.color.inkMuted },
});
