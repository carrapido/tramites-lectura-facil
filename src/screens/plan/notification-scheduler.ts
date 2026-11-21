import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { reminderTexts, type ChecklistItem, type Reminder } from '@/tramites/plan';
import type { ReminderScheduler } from '@/tramites/ports';

/** Spoken before the system permission prompt (S5). */
export const PERMISSION_REASON = 'Para avisarle antes de la fecha, necesitamos permiso.';

/** Generic, so it fits any paper (context-categories S5). */
export const NOTIFICATION_TITLE = 'Recordatorio';

/** The phone may never report the end of the voice; the prompt still appears after this. */
const SPEECH_FALLBACK_MS = 8_000;

const CHANNEL_ID = 'reminders';

/**
 * Fixed identifiers make a second "Sí" replace the first reminders instead of adding duplicates,
 * even after the app restarts. https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#notificationrequestinput
 */
const DAY_BEFORE_ID = 'tramite-reminder-day-before';
const DUE_DAY_ID = 'tramite-reminder-due-day';

/** The person said no to notifications; nothing was scheduled. */
export class PermissionDeniedError extends Error {
  constructor() {
    super('Notification permission was denied');
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Local phone notifications for a reminder (S5): the day before at 10:00 and the due day at 08:00, local time.
 * Local notifications work in Expo Go; push does not. https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
 */
export function createNotificationScheduler(now: () => Date = () => new Date()): ReminderScheduler {
  return {
    async schedule(reminder: Reminder, checklist: ChecklistItem[]): Promise<void> {
      await speakReason();
      await ensureAndroidChannel();
      const permission = await requestPermissionsAsync();
      if (!permission.granted) throw new PermissionDeniedError();
      await cancelPreviousReminders();
      await scheduleMoments(reminder, checklist, now());
    },
  };
}

export async function cancelAllReminders(): Promise<void> {
  await cancelAllScheduledNotificationsAsync();
}

async function cancelPreviousReminders(): Promise<void> {
  await Promise.all([DAY_BEFORE_ID, DUE_DAY_ID].map((identifier) => cancelScheduledNotificationAsync(identifier)));
}

function speakReason(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, SPEECH_FALLBACK_MS);
    function finish(): void {
      clearTimeout(timer);
      resolve();
    }
    // https://docs.expo.dev/versions/v58.0.0/sdk/speech/
    Speech.speak(PERMISSION_REASON, { language: 'es-MX', onDone: finish, onStopped: finish, onError: finish });
  });
}

/** Android 13+ shows the permission prompt only after a channel exists. https://docs.expo.dev/versions/v58.0.0/sdk/notifications/ */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios',
    importance: AndroidImportance.HIGH,
  });
}

async function scheduleMoments(reminder: Reminder, checklist: ChecklistItem[], now: Date): Promise<void> {
  const { dayBefore, dueDay } = reminderTexts(reminder, checklist);
  const moments = [
    { identifier: DAY_BEFORE_ID, date: localMoment(reminder.dueDate, -1, 10), body: dayBefore },
    { identifier: DUE_DAY_ID, date: localMoment(reminder.dueDate, 0, 8), body: dueDay },
  ];
  for (const { identifier, date, body } of moments.filter((moment) => moment.date > now)) {
    await scheduleNotificationAsync({
      identifier,
      content: { title: NOTIFICATION_TITLE, body },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

/** `dueDate` is `YYYY-MM-DD`; the moment is in the phone's own time zone. */
function localMoment(dueDate: string, dayOffset: number, hour: number): Date {
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day + dayOffset, hour, 0, 0, 0);
}
