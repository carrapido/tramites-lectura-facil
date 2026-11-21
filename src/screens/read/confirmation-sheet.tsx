import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SpanishText } from '@/components/language-text';
import { PlayButton } from '@/components/play-button';
import { SecondaryButton } from '@/components/secondary-button';
import { SourceQuote } from '@/components/source-quote';
import type { VoiceControls } from '@/components/voice-controls';
import { useReminder, type ReminderControls } from '@/screens/plan/use-reminder';
import type { Plan, Reminder } from '@/tramites/plan';
import { theme } from '@/theme';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const VOICE_KEY = 'plan';
const QUESTION = '¿Quiere que le recuerde?';
const OUTCOME_TEXT: Partial<Record<ReminderControls['status'], string>> = {
  scheduled: 'Listo. Le avisaremos un día antes y el mismo día.',
  nothing: 'Está bien. No guardamos ningún aviso.',
};

interface PlanSheetProps {
  plan: Plan;
  voice: VoiceControls;
}

/** The agent's proposal with its own reminder controls; remount it for a new plan to start fresh. */
export function PlanSheet({ plan, voice }: PlanSheetProps) {
  const reminder = useReminder();
  return <ConfirmationSheet plan={plan} voice={voice} reminder={reminder} />;
}

interface ConfirmationSheetProps extends PlanSheetProps {
  reminder: ReminderControls;
}

/**
 * The agent acts only after the big "Sí" (S10). Audio plays only from "Escuchar", never by itself,
 * so the proposal is read aloud from that button.
 */
export function ConfirmationSheet({ plan, voice, reminder }: ConfirmationSheetProps) {
  return (
    <View style={styles.sheet}>
      <SpanishText>{proposalSentence(plan.reminder)}</SpanishText>
      <PlayButton
        status={voice.statusOf(VOICE_KEY)}
        onPress={() => voice.speakSpanish(VOICE_KEY, spokenProposal(plan))}
        onStop={voice.stop}
      />
      {plan.checklist.map((item, index) => (
        <View key={`${index}:${item.sourceQuote}`} style={styles.item}>
          <SpanishText>{item.text}</SpanishText>
          <SourceQuote quote={item.sourceQuote} />
        </View>
      ))}
      {plan.reminder ? <ReminderAnswer plan={plan} reminder={plan.reminder} controls={reminder} /> : null}
    </View>
  );
}

/** Spanish long date from `YYYY-MM-DD`, without time zones; anything else is shown as written. */
export function formatDueDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const [year, month, day] = match ? match.slice(1).map(Number) : [];
  const monthName = month === undefined ? undefined : MONTHS[month - 1];
  return monthName ? `${day} de ${monthName} de ${year}` : isoDate;
}

function proposalSentence(reminder: Reminder | null): string {
  return reminder
    ? `Le propongo esta lista y un aviso antes del ${formatDueDate(reminder.dueDate)}.`
    : 'Le propongo esta lista para su trámite.';
}

function spokenProposal(plan: Plan): string {
  const reminder = plan.reminder;
  const reminderParts = reminder ? [`Fecha: ${formatDueDate(reminder.dueDate)}.`, placeSentence(reminder), QUESTION] : [];
  return [proposalSentence(reminder), ...plan.checklist.map((item) => item.text), ...reminderParts]
    .filter((part) => part.length > 0)
    .join(' ');
}

function placeSentence(reminder: Reminder): string {
  return reminder.place ? `Lugar: ${reminder.place}.` : '';
}

interface ReminderAnswerProps {
  plan: Plan;
  reminder: Reminder;
  controls: ReminderControls;
}

function ReminderAnswer({ plan, reminder, controls }: ReminderAnswerProps) {
  const outcome = OUTCOME_TEXT[controls.status];
  return (
    <View style={styles.answer}>
      <Text style={styles.date} accessibilityLanguage="es-MX">
        {formatDueDate(reminder.dueDate)}
      </Text>
      {reminder.place ? <SpanishText>{`Lugar: ${reminder.place}`}</SpanishText> : null}
      {outcome ? (
        <Text style={styles.outcome} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          {outcome}
        </Text>
      ) : (
        <AnswerButtons plan={plan} controls={controls} />
      )}
    </View>
  );
}

/** Both answers wait while the phone asks for permission, so a second tap cannot change the outcome. */
function AnswerButtons({ plan, controls }: { plan: Plan; controls: ReminderControls }) {
  const asking = controls.status === 'asking';
  return (
    <>
      {controls.message ? (
        <Text style={styles.error} accessibilityLanguage="es-MX" accessibilityLiveRegion="polite">
          {controls.message}
        </Text>
      ) : null}
      <ActionButton
        label="Sí, recuérdeme"
        icon={{ ios: 'bell.fill', android: 'notifications' }}
        disabled={asking}
        onPress={() => void controls.schedule(plan, 'yes')}
      />
      <SecondaryButton
        label="No, gracias"
        icon={{ ios: 'xmark', android: 'close' }}
        disabled={asking}
        accessibilityState={{ disabled: asking }}
        onPress={() => void controls.schedule(plan, 'no')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.strong,
    borderColor: theme.color.signal,
  },
  item: { gap: theme.space.sm },
  answer: { gap: theme.space.md },
  date: { fontSize: theme.type.title, fontWeight: theme.weight.label, color: theme.color.ink },
  outcome: { fontSize: theme.type.body, color: theme.color.ink },
  error: { fontSize: theme.type.body, color: theme.color.danger },
});
