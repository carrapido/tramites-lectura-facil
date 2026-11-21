import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PlayButton } from '@/components/play-button';
import { theme } from '@/theme';

import { loadLanguage, saveLanguage, type Language } from './language-store';

/** Each language by its own name, tagged in that language; the sample says that name aloud. */
const LANGUAGES: { id: Language; name: string; speechTag: string }[] = [
  { id: 'es', name: 'Español', speechTag: 'es-MX' },
  { id: 'yua', name: "Maaya t'aan", speechTag: 'yua' },
];

export function LanguageScreen() {
  const [current] = useState(loadLanguage);

  function choose(choice: Language) {
    rememberOrSkip(choice);
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        {LANGUAGES.map(({ id, name, speechTag }) => (
          <View key={id} style={styles.row}>
            <LanguageOption name={name} speechTag={speechTag} selected={id === current} onPress={() => choose(id)} />
            <PlayButton text={name} accessibilityLabel={`Escuchar ${name}`} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A failed save must not trap the person on this screen; the choice then lasts until the app closes. */
function rememberOrSkip(choice: Language) {
  try {
    saveLanguage(choice);
  } catch {
    // Nothing to tell the person: the app keeps working in the default language.
  }
}

interface LanguageOptionProps {
  name: string;
  speechTag: string;
  selected: boolean;
  onPress: () => void;
}

/** The selected option is filled and shows a check, so color is not the only signal. */
function LanguageOption({ name, speechTag, selected, onPress }: LanguageOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityLanguage={speechTag}
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
    borderWidth: 2,
    borderColor: theme.color.signal,
  },
  optionSelected: { backgroundColor: theme.color.signal },
  optionLabel: { fontSize: theme.type.title, fontWeight: theme.weight.label, color: theme.color.signal },
  optionLabelSelected: { color: theme.color.onSignal },
});
