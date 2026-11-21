import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PlayButton } from '@/components/play-button';
import { MAYA_VOICE_FAILED, type VoiceControls } from '@/components/voice-controls';
import { useScreenVoice } from '@/screens/voice/use-screen-voice';
import { MACHINE_VOICE_LABEL } from '@/tramites/voice';
import { theme } from '@/theme';

import { loadLanguage, saveLanguage, type Language } from './language-store';

/** Each language by its own name, tagged in that language; the sample says that name with that language's voice. */
const LANGUAGES: { id: Language; name: string; a11yLanguage: string }[] = [
  { id: 'es', name: 'Español', a11yLanguage: 'es-MX' },
  { id: 'yua', name: "Maaya t'aan", a11yLanguage: 'yua' },
];

export function LanguageScreen() {
  const [current] = useState(loadLanguage);
  const voice = useScreenVoice();

  function choose(choice: Language) {
    rememberOrSkip(choice);
    leaveScreen();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        {LANGUAGES.map(({ id, name, a11yLanguage }) => (
          <View key={id} style={styles.row}>
            <LanguageOption name={name} a11yLanguage={a11yLanguage} selected={id === current} onPress={() => choose(id)} />
            <LanguageSample id={id} name={name} voice={voice} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Same rule as `BackButton`: go home when /idioma was opened with no screen behind it. */
function leaveScreen() {
  // https://docs.expo.dev/versions/v58.0.0/sdk/router/
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** A failed save must not trap the person on this screen; the choice then lasts until the app closes. */
function rememberOrSkip(choice: Language) {
  try {
    saveLanguage(choice);
  } catch {
    // Nothing to tell the person: the app keeps working in the default language.
  }
}

function LanguageSample({ id, name, voice }: { id: Language; name: string; voice: VoiceControls }) {
  const play = () => (id === 'yua' ? voice.playMaya(id, name) : voice.speakSpanish(id, name));
  return (
    <>
      <PlayButton status={voice.statusOf(id)} accessibilityLabel={`Escuchar ${name}`} onPress={play} onStop={voice.stop} />
      {id === 'yua' ? (
        <Text style={styles.note} accessibilityLanguage="es-MX">
          {MACHINE_VOICE_LABEL}
        </Text>
      ) : null}
      {id === 'yua' && voice.failed(id) ? (
        <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          {MAYA_VOICE_FAILED}
        </Text>
      ) : null}
    </>
  );
}

interface LanguageOptionProps {
  name: string;
  a11yLanguage: string;
  selected: boolean;
  onPress: () => void;
}

/** The selected option is filled and shows a check, so color is not the only signal. */
function LanguageOption({ name, a11yLanguage, selected, onPress }: LanguageOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityLanguage={a11yLanguage}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      {selected ? (
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }}
          size={theme.size.icon}
          tintColor={theme.color.onSignal}
          fallback={null}
        />
      ) : null}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  row: { gap: theme.space.sm },
  option: {
    minHeight: theme.size.primaryTarget,
    minWidth: theme.size.primaryTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.strong,
    borderColor: theme.color.signal,
  },
  optionSelected: { backgroundColor: theme.color.signal },
  optionLabel: { fontSize: theme.type.title, fontWeight: theme.weight.label, color: theme.color.signal },
  optionLabelSelected: { color: theme.color.onSignal },
  note: { fontSize: theme.type.label, color: theme.color.inkMuted },
  error: { fontSize: theme.type.body, color: theme.color.danger },
});
