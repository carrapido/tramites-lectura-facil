import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { BackButton } from '@/components/back-button';
import { CATEGORY_NOTICE } from '@/tramites/category';
import { theme } from '@/theme';

import { checkHealth, runSmoke, type SmokeBody } from './api-client';

type Connection = 'checking' | 'connected' | 'offline';

const CONNECTION_TEXT: Record<Connection, string> = {
  checking: 'Buscando la laptop.',
  connected: 'conectado',
  offline: 'Sin conexión. Revise que el teléfono y la laptop usen la misma red.',
};

export function HomeScreen() {
  const connection = useConnection();
  const [smoke, setSmoke] = useState<SmokeBody | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryGoogle() {
    setBusy(true);
    setSmoke(await runSmoke());
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <Text style={styles.status} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          {CONNECTION_TEXT[connection]}
        </Text>
        <ActionButton
          label="Probar Google"
          icon={{ ios: 'paperplane.fill', android: 'send' }}
          onPress={tryGoogle}
          busy={busy}
        />
        {smoke && <SmokeResult result={smoke} />}
        <Text style={styles.notice} accessibilityLanguage="es-MX">
          {CATEGORY_NOTICE.otro}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function useConnection(): Connection {
  const [connection, setConnection] = useState<Connection>('checking');
  useEffect(() => {
    checkHealth().then((ok) => setConnection(ok ? 'connected' : 'offline'));
  }, []);
  return connection;
}

function SmokeResult({ result }: { result: SmokeBody }) {
  if (!result.ok) return <Text style={styles.error}>{failureText(result.reason)}</Text>;
  return (
    <View style={styles.card}>
      <Text style={styles.language}>Español</Text>
      <Text style={styles.body} accessibilityLanguage="es-MX">
        {result.plainSpanish}
      </Text>
      <View style={styles.rule} />
      <Text style={styles.language}>Maaya t&apos;aan</Text>
      <Text style={styles.body} accessibilityLanguage="yua">
        {result.maya}
      </Text>
      <Text style={styles.caption} accessibilityLanguage="es-MX">
        Traducción automática, sin revisar
      </Text>
    </View>
  );
}

function failureText(reason: string): string {
  if (reason === 'adc-missing') {
    return 'La laptop no tiene acceso a Google. Ejecute: gcloud auth application-default login';
  }
  if (reason === 'unreachable') return CONNECTION_TEXT.offline;
  return 'Google no respondió. Intente otra vez en un momento.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  status: { fontSize: theme.type.body, color: theme.color.ink },
  card: {
    gap: theme.space.sm,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.hairline,
    borderColor: theme.color.rule,
  },
  language: { fontSize: theme.type.label, fontWeight: theme.weight.label, color: theme.color.inkMuted },
  body: { fontSize: theme.type.body, color: theme.color.ink },
  rule: { height: 1, backgroundColor: theme.color.rule, marginVertical: theme.space.sm },
  caption: { fontSize: theme.type.label, color: theme.color.inkMuted },
  error: { fontSize: theme.type.body, color: theme.color.danger },
  notice: { fontSize: theme.type.label, color: theme.color.inkMuted },
});
