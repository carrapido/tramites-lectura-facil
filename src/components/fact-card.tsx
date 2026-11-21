import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { EasyReadCard } from '@/tramites/easy-read';
import { MACHINE_VOICE_LABEL } from '@/tramites/voice';
import { theme } from '@/theme';

import { MayaText, SpanishText } from './language-text';
import { PlayButton } from './play-button';
import { SourceQuote } from './source-quote';
import type { VoiceControls } from './voice-controls';

interface FactCardProps {
  card: EasyReadCard;
  /** Unique per card on the screen; the voice keys are `<voiceKey>:es` and `<voiceKey>:yua`. */
  voiceKey: string;
  /** The person chose Maaya t'aan. */
  showMaya: boolean;
  voice: VoiceControls;
}

interface Icon {
  ios: SFSymbol;
  android: AndroidSymbol;
}

const MAYA_VOICE_FAILED = 'No se pudo oír en maya. Escuche en español.';

/** Kinds come from Gemini as free words ("fecha", "Montos"), so they match by prefix. */
const ICON_BY_KIND_PREFIX: [string, Icon][] = [
  ['fecha', { ios: 'calendar', android: 'calendar_month' }],
  ['monto', { ios: 'banknote', android: 'payments' }],
  ['lugar', { ios: 'mappin.and.ellipse', android: 'location_on' }],
  ['documento', { ios: 'doc.text', android: 'description' }],
  ['consecuencia', { ios: 'exclamationmark.triangle', android: 'warning' }],
];
const DEFAULT_ICON: Icon = { ios: 'info.circle', android: 'info' };

/** One idea per card: icon, plain Spanish on top, Maya when chosen, and the source one tap away. */
export function FactCard({ card, voiceKey, showMaya, voice }: FactCardProps) {
  const spanishKey = `${voiceKey}:es`;
  const maya = showMaya ? labeledMaya(card) : null;
  return (
    <View style={styles.card}>
      <SymbolView
        testID="fact-icon"
        name={iconForKind(card.kind)}
        size={theme.size.pictogram}
        tintColor={theme.color.signal}
        fallback={null}
      />
      <SpanishText>{card.plainSpanish}</SpanishText>
      <PlayButton
        status={voice.statusOf(spanishKey)}
        onPress={() => voice.speakSpanish(spanishKey, card.plainSpanish)}
        onStop={voice.stop}
      />
      {maya === null ? null : <MayaSection maya={maya} voiceKey={`${voiceKey}:yua`} voice={voice} />}
      <SourceQuote quote={card.sourceQuote} />
    </View>
  );
}

export function iconForKind(kind: string): Icon {
  const normalized = kind.trim().toLowerCase();
  const match = ICON_BY_KIND_PREFIX.find(([prefix]) => normalized.startsWith(prefix));
  return match ? match[1] : DEFAULT_ICON;
}

/** Maya is shown only when it exists and is labeled as an unreviewed machine translation. */
function labeledMaya(card: EasyReadCard): string | null {
  return card.mayaStatus === 'machine-unreviewed' ? card.maya : null;
}

function MayaSection({ maya, voiceKey, voice }: { maya: string; voiceKey: string; voice: VoiceControls }) {
  return (
    <View style={styles.section}>
      <MayaText>{maya}</MayaText>
      <PlayButton
        status={voice.statusOf(voiceKey)}
        accessibilityLabel="Escuchar en maya"
        onPress={() => voice.playMaya(voiceKey, maya)}
        onStop={voice.stop}
      />
      <Text style={styles.note} accessibilityLanguage="es-MX">
        {MACHINE_VOICE_LABEL}
      </Text>
      {voice.failed(voiceKey) ? (
        <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          {MAYA_VOICE_FAILED}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.rule,
  },
  section: { gap: theme.space.sm },
  note: { fontSize: theme.type.label, color: theme.color.inkMuted },
  error: { fontSize: theme.type.body, color: theme.color.danger },
});
