import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

import { SpanishText } from './language-text';
import { PlayButton } from './play-button';
import { SecondaryButton } from './secondary-button';

interface CardFact {
  kind: string;
  text: string;
  sourceQuote: string;
}

interface Icon {
  ios: SFSymbol;
  android: AndroidSymbol;
}

/** Kinds come from Gemini as free words ("fecha", "Montos"), so they match by prefix. */
const ICON_BY_KIND_PREFIX: [string, Icon][] = [
  ['fecha', { ios: 'calendar', android: 'calendar_month' }],
  ['monto', { ios: 'banknote', android: 'payments' }],
  ['lugar', { ios: 'mappin.and.ellipse', android: 'location_on' }],
  ['documento', { ios: 'doc.text', android: 'description' }],
  ['consecuencia', { ios: 'exclamationmark.triangle', android: 'warning' }],
];
const DEFAULT_ICON: Icon = { ios: 'info.circle', android: 'info' };

/** One idea per card: icon, one sentence, "Escuchar", and the source one tap away. */
export function FactCard({ fact }: { fact: CardFact }) {
  const [sourceVisible, setSourceVisible] = useState(false);
  return (
    <View style={styles.card}>
      <SymbolView
        testID="fact-icon"
        name={iconForKind(fact.kind)}
        size={theme.size.pictogram}
        tintColor={theme.color.signal}
        fallback={null}
      />
      <SpanishText>{fact.text}</SpanishText>
      <PlayButton text={fact.text} />
      {sourceVisible ? (
        <Text style={styles.quote} accessibilityLanguage="es-MX">
          {fact.sourceQuote}
        </Text>
      ) : (
        <SecondaryButton
          label="¿De dónde salió?"
          icon={{ ios: 'text.quote', android: 'format_quote' }}
          onPress={() => setSourceVisible(true)}
        />
      )}
    </View>
  );
}

export function iconForKind(kind: string): Icon {
  const normalized = kind.trim().toLowerCase();
  const match = ICON_BY_KIND_PREFIX.find(([prefix]) => normalized.startsWith(prefix));
  return match ? match[1] : DEFAULT_ICON;
}

const styles = StyleSheet.create({
  card: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.rule,
  },
  quote: { fontSize: theme.type.body, fontStyle: 'italic', color: theme.color.inkMuted },
});
