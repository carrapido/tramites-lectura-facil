import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
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
const CAMERA_FAILED = 'No pudimos abrir la cámara. Intente otra vez.';
const UNREADABLE = 'No se ve bien la foto. Tome otra con más luz.';

const FAILURE_TEXT: Record<string, string> = {
  unreadable: UNREADABLE,
  'invalid-request': 'La foto es muy grande o no sirve. Tome otra más de cerca.',
  'adc-missing': 'La laptop no tiene acceso a Google. Ejecute: gcloud auth application-default login',
  'config-missing': 'Falta configurar la laptop. Avise a quien la atiende.',
  'bad-response': 'La laptop respondió con un error. Avise a quien la atiende.',
  timeout: 'La laptop tardó mucho. Revise la red y tome la foto otra vez.',
  unreachable: 'Sin conexión. Revise que el teléfono y la laptop usen la misma red.',
};
const UPSTREAM_FAILED = 'Google no respondió. Intente otra vez en un momento.';

/** If the phone never reports the end of the sentence, the camera still opens after this. */
const SPEECH_FALLBACK_MS = 8_000;
/** JPEG quality for the camera and the resize; keeps text legible and the upload small. */
const PHOTO_QUALITY = 0.5;
/** Wider photos are resized on the phone so the upload stays well below the 4 MB limit (S1). */
const MAX_PHOTO_WIDTH = 1600;

export function ReadScreen() {
  const { state, busy, takePhoto } = useNoticeReading();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton
          label="Tome una foto de su papel"
          icon={{ ios: 'camera.fill', android: 'photo_camera' }}
          onPress={takePhoto}
          disabled={busy}
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
  const { busy, runExclusive } = useExclusiveTask();

  function takePhoto() {
    void runExclusive(async () => {
      try {
        await readNoticeFromCamera();
      } catch {
        setState({ step: 'failed', message: CAMERA_FAILED });
      }
    });
  }

  async function readNoticeFromCamera() {
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

  return { state, busy, takePhoto };
}

/**
 * Runs one task at a time. `busy` disables the button; the ref also drops a tap
 * that arrives before React re-renders the disabled button.
 */
function useExclusiveTask() {
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  async function runExclusive(task: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return { busy, runExclusive };
}

/** Resolves when the sentence ends, fails or stops, or after a bounded wait if the phone stays silent. */
function speak(sentence: string): Promise<void> {
  // https://docs.expo.dev/versions/v58.0.0/sdk/speech/
  return new Promise((resolve) => {
    const fallback = setTimeout(finish, SPEECH_FALLBACK_MS);
    function finish() {
      clearTimeout(fallback);
      resolve();
    }
    Speech.speak(sentence, { language: 'es-MX', onDone: finish, onStopped: finish, onError: finish });
  });
}

async function capturePhoto(): Promise<NoticePhoto | 'canceled' | null> {
  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: PHOTO_QUALITY, mediaTypes: ['images'] });
  if (result.canceled) return 'canceled';
  const asset = result.assets[0];
  if (!asset) return null;
  const base64 = asset.width > MAX_PHOTO_WIDTH ? await resizedOrOriginal(asset) : asset.base64;
  // The picker returns base64 as JPEG data. https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/
  return base64 ? { base64, mimeType: 'image/jpeg' } : null;
}

/** Keeps the picker's own JPEG if resizing fails; the server still enforces the size limit. */
async function resizedOrOriginal(asset: ImagePicker.ImagePickerAsset): Promise<string | null | undefined> {
  try {
    return await resizedJpegBase64(asset.uri);
  } catch {
    return asset.base64;
  }
}

async function resizedJpegBase64(uri: string): Promise<string | undefined> {
  // https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/
  const image = await ImageManipulator.manipulate(uri).resize({ width: MAX_PHOTO_WIDTH, height: null }).renderAsync();
  const saved = await image.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: PHOTO_QUALITY });
  return saved.base64;
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
