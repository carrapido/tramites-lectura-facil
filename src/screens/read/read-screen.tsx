import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { SecondaryButton } from '@/components/secondary-button';
import { theme } from '@/theme';

import { readNoticePhoto, type NoticePhoto, type ReadFact } from './api-client';

type ReadState =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'facts'; facts: ReadFact[] }
  | { step: 'failed'; message: string };

const CAMERA_REASON = 'Necesitamos la cámara para leer su papel.';
const PERMISSION_DENIED = 'Sin permiso para la cámara. Actívelo en Ajustes del teléfono.';
const UNREADABLE = 'No se ve bien la foto. Tome otra con más luz.';

const FAILURE_TEXT: Record<string, string> = {
  unreadable: UNREADABLE,
  'adc-missing': 'La laptop no tiene acceso a Google. Ejecute: gcloud auth application-default login',
  unreachable: 'Sin conexión. Revise que el teléfono y la laptop usen la misma red.',
};
const UPSTREAM_FAILED = 'Google no respondió. Intente otra vez en un momento.';

export function ReadScreen() {
  const { state, takePhoto } = useNoticeReading();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton
          label="Tome una foto de su papel"
          icon={{ ios: 'camera.fill', android: 'photo_camera' }}
          onPress={takePhoto}
          disabled={state.step === 'reading'}
        />
        <ReadResult state={state} />
        <Text style={styles.notice} accessibilityLanguage="es-MX">
          Esto no es asesoría legal
        </Text>
        <Link href="./diagnostico" asChild>
          <SecondaryButton label="Ver conexión" icon={{ ios: 'wifi', android: 'wifi' }} />
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function useNoticeReading() {
  const [state, setState] = useState<ReadState>({ step: 'idle' });

  async function takePhoto() {
    await speak(CAMERA_REASON);
    // Permission is requested only now, after the spoken reason (S6).
    // https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setState({ step: 'failed', message: PERMISSION_DENIED });
      return;
    }
    const photo = await capturePhoto();
    if (photo === 'canceled') return;
    if (!photo) {
      setState({ step: 'failed', message: UNREADABLE });
      return;
    }
    setState({ step: 'reading' });
    const body = await readNoticePhoto(photo);
    setState(body.ok ? { step: 'facts', facts: body.facts } : { step: 'failed', message: failureText(body.reason) });
  }

  return { state, takePhoto };
}

/** Resolves when the sentence ends, or right away if the phone cannot speak. */
function speak(sentence: string): Promise<void> {
  // https://docs.expo.dev/versions/v58.0.0/sdk/speech/
  return new Promise((resolve) => {
    const done = () => resolve();
    Speech.speak(sentence, { language: 'es-MX', onDone: done, onStopped: done, onError: done });
  });
}

async function capturePhoto(): Promise<NoticePhoto | 'canceled' | null> {
  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] });
  if (result.canceled) return 'canceled';
  const base64 = result.assets[0]?.base64;
  // The picker returns base64 as JPEG data. https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
  return base64 ? { base64, mimeType: 'image/jpeg' } : null;
}

function failureText(reason: string): string {
  return FAILURE_TEXT[reason] ?? UPSTREAM_FAILED;
}

function ReadResult({ state }: { state: ReadState }) {
  if (state.step === 'reading') return <Text style={styles.status}>Leyendo su papel.</Text>;
  if (state.step === 'failed') {
    return (
      <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
        {state.message}
      </Text>
    );
  }
  if (state.step === 'facts') {
    return (
      <View style={styles.facts}>
        {state.facts.map((fact) => (
          <FactCard key={`${fact.kind}:${fact.sourceQuote}`} fact={fact} />
        ))}
      </View>
    );
  }
  return null;
}

function FactCard({ fact }: { fact: ReadFact }) {
  const [sourceVisible, setSourceVisible] = useState(false);
  return (
    <View style={styles.card}>
      <Text style={styles.body} accessibilityLanguage="es-MX">
        {fact.text}
      </Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  status: { fontSize: theme.type.body, color: theme.color.ink },
  facts: { gap: theme.space.md },
  card: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.rule,
  },
  body: { fontSize: theme.type.body, color: theme.color.ink },
  quote: { fontSize: theme.type.body, fontStyle: 'italic', color: theme.color.inkMuted },
  error: { fontSize: theme.type.body, color: theme.color.danger },
  notice: { fontSize: theme.type.label, color: theme.color.inkMuted },
});
