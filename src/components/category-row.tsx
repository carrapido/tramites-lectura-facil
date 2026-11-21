import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CATEGORY_LABEL, type Category } from '@/tramites/category';
import { theme } from '@/theme';

interface Icon {
  ios: SFSymbol;
  android: AndroidSymbol;
}

/** One line set from expo-symbols, always next to the word. https://docs.expo.dev/versions/v58.0.0/sdk/symbols/ */
const CATEGORY_ICON: Record<Category, Icon> = {
  tramite: { ios: 'doc.text', android: 'description' },
  reunion: { ios: 'person.3', android: 'groups' },
  salud: { ios: 'cross.case', android: 'medical_services' },
  nota: { ios: 'note.text', android: 'sticky_note_2' },
  otro: { ios: 'doc', android: 'article' },
};

/** Static text, not a button: the kind of paper by its Spanish name (context-categories S4). */
export function CategoryRow({ category }: { category: Category }) {
  const label = CATEGORY_LABEL[category];
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Tipo de papel: ${label}`}
      accessibilityLanguage="es-MX"
      style={styles.row}
    >
      <SymbolView name={CATEGORY_ICON[category]} size={theme.size.icon} tintColor={theme.color.signal} fallback={null} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, minHeight: theme.size.minTarget },
  label: { fontSize: theme.type.body, fontWeight: theme.weight.label, color: theme.color.ink },
});
