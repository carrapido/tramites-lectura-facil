import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Link, router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { CategoryRow } from '@/components/category-row';
import { FactCard } from '@/components/fact-card';
import { SecondaryButton } from '@/components/secondary-button';
import type { VoiceControls } from '@/components/voice-controls';
import { REPLAY_LABEL } from '@/screens/demo-label';
import { fetchEasyRead } from '@/screens/easy-read-client';
import { useLanguage } from '@/screens/language/language-store';
import { fetchPlan, type PlanResult as PlanResponse } from '@/screens/plan/plan-client';
import { useScreenVoice } from '@/screens/voice/use-screen-voice';
import { CATEGORY_NOTICE, NOTICE_BEFORE_READING, type Category } from '@/tramites/category';
import type { EasyReadCard } from '@/tramites/easy-read';
import type { Plan } from '@/tramites/plan';
import { theme } from '@/theme';

import { PlanSheet } from './confirmation-sheet';
import { readNoticePhoto, type NoticePhoto, type ReadFact } from './api-client';

type ReadState =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'cards'; category: Category; facts: ReadFact[]; cards: EasyReadCard[]; replayed: boolean }
  | { step: 'failed'; message: string };

/** The agent's proposal loads after the cards and never hides them (S10). */
type PlanState =
  | { step: 'none' }
  | { step: 'loading' }
  | { step: 'ready'; plan: Plan; replayed: boolean }
  | { step: 'failed' };

const PLAN_FAILED = 'No pudimos preparar la lista. Sus tarjetas siguen aquí.';

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
  'not-recorded': 'Esta parte no está grabada. Use el modo en vivo.',
};
const UPSTREAM_FAILED = 'Google no respondió. Intente otra vez en un momento.';

/** If the phone never reports the end of the sentence, the camera still opens after this. */
const SPEECH_FALLBACK_MS = 8_000;
/** JPEG quality for the camera and the resize; keeps text legible and the upload small. */
const PHOTO_QUALITY = 0.5;
/** Wider photos are resized on the phone so the upload stays well below the 4 MB limit (S1). */
const MAX_PHOTO_WIDTH = 1600;

export function ReadScreen() {
  const voice = useScreenVoice();
  const { state, plan, photoCount, busy, takePhoto } = useNoticeReading(voice.stop);
  const showMaya = useLanguage() === 'yua';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton
          label="Tome una foto de su papel"
          icon={{ ios: 'camera.fill', android: 'photo_camera' }}
          onPress={takePhoto}
          disabled={busy}
        />
        {isReplayed(state, plan) ? <ReplayLabel /> : null}
        <ReadResult state={state} showMaya={showMaya} voice={voice} />
        <PlanResult key={photoCount} plan={plan} voice={voice} />
        <Text style={styles.notice} accessibilityLanguage="es-MX">
          {noticeFor(state)}
        </Text>
        <SecondaryButton
          label="Cambiar idioma"
          icon={{ ios: 'globe', android: 'language' }}
          onPress={() => openLanguagePicker(voice)}
        />
        <Link href="./diagnostico" asChild>
          <SecondaryButton label="Ver conexión" icon={{ ios: 'wifi', android: 'wifi' }} />
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

/** `silenceVoices` runs first, so a card's voice never plays over the camera reason. */
function useNoticeReading(silenceVoices: () => void) {
  const [state, setState] = useState<ReadState>({ step: 'idle' });
  const [plan, setPlan] = useState<PlanState>({ step: 'none' });
  const [photoCount, setPhotoCount] = useState(0);
  /** The newest photo; a plan from an older one is dropped (PR #7 review W3). */
  const latestPhoto = useRef(0);
  const { busy, runExclusive } = useExclusiveTask();

  function takePhoto() {
    void runExclusive(async () => {
      silenceVoices();
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
    const photoNumber = latestPhoto.current + 1;
    latestPhoto.current = photoNumber;
    setState({ step: 'reading' });
    setPlan({ step: 'none' });
    setPhotoCount(photoNumber);
    const body = await readNoticePhoto(photo);
    if (!body.ok) {
      setState({ step: 'failed', message: failureText(body.reason) });
      return;
    }
    const proposal = fetchPlan(body.facts, body.category);
    const easyRead = await easyReadCards(body.facts);
    const replayed = body.replayed === true || easyRead.replayed;
    setState({ step: 'cards', category: body.category, facts: body.facts, cards: easyRead.cards, replayed });
    setPlan({ step: 'loading' });
    // Not awaited: the camera is free again while the plan loads (PR #7 review W3).
    void showPlan(proposal, photoNumber);
  }

  async function showPlan(proposal: Promise<PlanResponse>, photoNumber: number) {
    const planned = await proposal;
    if (photoNumber !== latestPhoto.current) return;
    setPlan(planned.ok ? { step: 'ready', plan: planned.plan, replayed: planned.replayed === true } : { step: 'failed' });
  }

  return { state, plan, photoCount, busy, takePhoto };
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

/** The read screen stays mounted under /idioma, so its voice must stop first (PR #7 review, W1). */
function openLanguagePicker(voice: VoiceControls) {
  voice.stop();
  router.push('/idioma');
}

/** The easy-read cards, or the objective 3 facts in Spanish when they fail (S7). */
async function easyReadCards(facts: ReadFact[]): Promise<{ cards: EasyReadCard[]; replayed: boolean }> {
  const easyRead = await fetchEasyRead(facts);
  return easyRead.ok
    ? { cards: easyRead.cards, replayed: easyRead.replayed === true }
    : { cards: facts.map(spanishOnlyCard), replayed: false };
}

function spanishOnlyCard(fact: ReadFact): EasyReadCard {
  return { kind: fact.kind, plainSpanish: fact.text, maya: null, mayaStatus: 'unavailable', sourceQuote: fact.sourceQuote };
}

function failureText(reason: string): string {
  return FAILURE_TEXT[reason] ?? UPSTREAM_FAILED;
}

/** Any answer from the demo recordings marks the whole result (easyread-pitch S5). */
function isReplayed(state: ReadState, plan: PlanState): boolean {
  const cardsReplayed = state.step === 'cards' && state.replayed;
  const planReplayed = plan.step === 'ready' && plan.replayed;
  return cardsReplayed || planReplayed;
}

/** The notice for the paper just read; before any reading, the generic one (context-categories S4). */
function noticeFor(state: ReadState): string {
  return state.step === 'cards' ? CATEGORY_NOTICE[state.category] : NOTICE_BEFORE_READING;
}

/** Plain words, not only a color, so a recorded answer is never taken for a live one. */
function ReplayLabel() {
  return (
    <Text style={styles.replay} accessibilityLanguage="es-MX">
      {REPLAY_LABEL}
    </Text>
  );
}

interface ReadResultProps {
  state: ReadState;
  showMaya: boolean;
  voice: VoiceControls;
}

function ReadResult({ state, showMaya, voice }: ReadResultProps) {
  if (state.step === 'reading') return <StatusText>Leyendo su papel.</StatusText>;
  if (state.step === 'failed') {
    return (
      <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
        {state.message}
      </Text>
    );
  }
  if (state.step === 'cards') {
    return (
      <View style={styles.facts}>
        <CategoryRow category={state.category} />
        {state.cards.map((card, index) => (
          <FactCard
            key={`${card.kind}:${card.sourceQuote}`}
            card={card}
            voiceKey={`card${index}`}
            showMaya={showMaya}
            voice={voice}
          />
        ))}
      </View>
    );
  }
  return null;
}

function PlanResult({ plan, voice }: { plan: PlanState; voice: VoiceControls }) {
  if (plan.step === 'loading') return <StatusText>Preparando su lista.</StatusText>;
  if (plan.step === 'failed') {
    return (
      <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
        {PLAN_FAILED}
      </Text>
    );
  }
  if (plan.step === 'ready') return <PlanSheet plan={plan.plan} voice={voice} />;
  return null;
}

function StatusText({ children }: { children: string }) {
  return (
    <Text style={styles.status} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  status: { fontSize: theme.type.body, color: theme.color.ink },
  replay: { fontSize: theme.type.label, fontWeight: theme.weight.label, color: theme.color.ink },
  facts: { gap: theme.space.md },
  error: { fontSize: theme.type.body, color: theme.color.danger },
  notice: { fontSize: theme.type.label, color: theme.color.inkMuted },
});
