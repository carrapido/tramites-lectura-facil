import { PermissionStatus } from 'expo';
import * as Notifications from 'expo-notifications';

import {
  NOTIFICATION_TITLE,
  PERMISSION_REASON,
  PermissionDeniedError,
  cancelAllReminders,
  createNotificationScheduler,
} from '@/screens/plan/notification-scheduler';
import { NoSpanishVoiceError, speakSpanish } from '@/screens/voice/speak-spanish';
import type { Reminder } from '@/tramites/plan';

jest.mock('@/screens/voice/speak-spanish', () => ({
  ...jest.requireActual<typeof import('@/screens/voice/speak-spanish')>('@/screens/voice/speak-spanish'),
  speakSpanish: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(async () => null),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 6 },
}));

const REMINDER: Reminder = {
  dueDate: '2026-11-30',
  title: 'pago del predial',
  place: 'Tesorería Municipal',
  sourceQuote: 'vence el día 30 de noviembre de 2026',
};

const CHECKLIST = [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }];

function permission(granted: boolean): Notifications.NotificationPermissionsStatus {
  return {
    granted,
    status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
    expires: 'never',
    canAskAgain: !granted,
  };
}

const order: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
  jest.mocked(speakSpanish).mockImplementation(async () => {
    order.push('speak');
  });
  jest.mocked(Notifications.requestPermissionsAsync).mockImplementation(async () => {
    order.push('permission');
    return permission(true);
  });
});

function scheduledTriggers(): unknown[] {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request.trigger);
}

describe('notification scheduler (S5, S6)', () => {
  it('speaks the one-sentence reason with the shared Spanish voice before asking for permission (field-feedback S3)', async () => {
    await createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);

    expect(speakSpanish).toHaveBeenCalledWith(PERMISSION_REASON);
    expect(PERMISSION_REASON).toBe('Para avisarle antes de la fecha, necesitamos permiso.');
    expect(order).toEqual(['speak', 'permission']);
  });

  it('schedules the day before at 10:00 and the due day at 08:00, local time', async () => {
    await createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);

    expect(scheduledTriggers()).toEqual([
      expect.objectContaining({ type: 'date', date: new Date(2026, 10, 29, 10, 0) }),
      expect.objectContaining({ type: 'date', date: new Date(2026, 10, 30, 8, 0) }),
    ]);
    const contents = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request.content);
    expect(contents).toEqual([
      {
        title: NOTIFICATION_TITLE,
        body: 'Mañana: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso.',
      },
      { title: NOTIFICATION_TITLE, body: 'Hoy: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso.' },
    ]);
    expect(NOTIFICATION_TITLE).toBe('Recordatorio');
  });

  it('skips the moments already past', async () => {
    await createNotificationScheduler(() => new Date(2026, 10, 29, 18, 0)).schedule(REMINDER, CHECKLIST);

    expect(scheduledTriggers()).toEqual([expect.objectContaining({ date: new Date(2026, 10, 30, 8, 0) })]);
  });

  it('throws PermissionDeniedError and schedules nothing when permission is denied', async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(permission(false));

    await expect(
      createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('asks for permission after 8 s even when the voice never reports its end', async () => {
    jest.useFakeTimers();
    jest.mocked(speakSpanish).mockImplementation(() => new Promise(() => undefined));

    const pending = createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);
    await jest.advanceTimersByTimeAsync(7_999);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await pending;

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('still asks for permission when the phone has no Spanish voice (field-feedback S4)', async () => {
    jest.mocked(speakSpanish).mockRejectedValue(new NoSpanishVoiceError());

    await createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

/** The phone's pending notifications, keyed by identifier, as `expo-notifications` keeps them. */
function phoneStore(): { pending: Map<string, Notifications.NotificationRequestInput>; scheduledIds: string[] } {
  const pending = new Map<string, Notifications.NotificationRequestInput>();
  const scheduledIds: string[] = [];
  jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async (request) => {
    const id = request.identifier ?? `generated-${scheduledIds.length + 1}`;
    pending.set(id, request);
    scheduledIds.push(id);
    return id;
  });
  jest.mocked(Notifications.cancelScheduledNotificationAsync).mockImplementation(async (id) => {
    pending.delete(id);
  });
  jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockImplementation(async () => {
    pending.clear();
  });
  return { pending, scheduledIds };
}

const OTHER_REQUEST: Notifications.NotificationRequestInput = {
  content: { title: 'Otro aviso' },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(2026, 11, 1, 9, 0) },
};

describe('idempotent reminders (L5 duplicates)', () => {
  it('cancels the first two reminders on a second "Sí" and leaves exactly two scheduled', async () => {
    const { pending, scheduledIds } = phoneStore();
    const scheduler = createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0));

    await scheduler.schedule(REMINDER, CHECKLIST);
    const firstIds = [...scheduledIds];
    await scheduler.schedule(REMINDER, CHECKLIST);

    expect(firstIds).toHaveLength(2);
    for (const id of firstIds) expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(id);
    expect(pending.size).toBe(2);
  });

  it('leaves exactly the two fixed reminder ids scheduled after two consecutive schedules', async () => {
    const { pending } = phoneStore();
    const scheduler = createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0));

    await scheduler.schedule(REMINDER, CHECKLIST);
    await scheduler.schedule(REMINDER, CHECKLIST);

    expect([...pending.keys()].sort()).toEqual(['tramite-reminder-day-before', 'tramite-reminder-due-day']);
  });

  it('cancelAllReminders cancels the scheduled reminders', async () => {
    const { pending } = phoneStore();
    await createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);

    await cancelAllReminders();

    expect(pending.size).toBe(0);
  });

  it('keeps a notification that is not a reminder when scheduling again', async () => {
    const { pending } = phoneStore();
    pending.set('other-id', OTHER_REQUEST);
    const scheduler = createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0));

    await scheduler.schedule(REMINDER, CHECKLIST);
    await scheduler.schedule(REMINDER, CHECKLIST);

    expect(pending.get('other-id')).toBe(OTHER_REQUEST);
    expect(pending.size).toBe(3);
  });
});
