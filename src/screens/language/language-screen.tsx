import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { PlayButton } from '@/components/play-button';
import { theme } from '@/theme';

import { loadLanguage, saveLanguage, type Language } from './language-store';

/** Each language by its own name; the sample says that name aloud. */
const LANGUAGES: { id: Language; name: string }[] = [
  { id: 'es', name: 'Español' },
  { id: 'yua', name: "Maaya t'aan" },
];

export function LanguageScreen() {
  const [current] = useState(loadLanguage);

  function choose(choice: Language) {
    saveLanguage(choice);
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        {LANGUAGES.map(({ id, name }) => (
          <View key={id} style={styles.row}>
            <LanguageOption name={name} selected={id === current} onPress={() => choose(id)} />
            <PlayButton text={name} accessibilityLabel={`Escuchar ${name}`} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

interface LanguageOptionProps {
  name: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * The name is a proper noun in its own language, so no `accessibilityLanguage` is forced on it.
 * The selected option is filled and shows a check, so color is not the only signal.
 */
function LanguageOption({ name, selected, onPress }: LanguageOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
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
