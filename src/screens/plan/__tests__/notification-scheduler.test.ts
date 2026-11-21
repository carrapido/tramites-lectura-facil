import { PermissionStatus } from 'expo';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';

import {
  NOTIFICATION_TITLE,
  PERMISSION_REASON,
  PermissionDeniedError,
  createNotificationScheduler,
} from '@/screens/plan/notification-scheduler';
import type { Reminder } from '@/tramites/plan';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
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
  jest.mocked(Speech.speak).mockImplementation((_text, options) => {
    order.push('speak');
    options?.onDone?.();
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
  it('speaks the one-sentence reason in es-MX before asking for permission', async () => {
    await createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);

    expect(Speech.speak).toHaveBeenCalledWith(PERMISSION_REASON, expect.objectContaining({ language: 'es-MX' }));
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
        body: 'Mañana vence: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso.',
      },
      { title: NOTIFICATION_TITLE, body: 'Hoy vence: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso.' },
    ]);
    expect(NOTIFICATION_TITLE).toBe('Recordatorio de su trámite');
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
    jest.mocked(Speech.speak).mockImplementation(() => undefined);

    const pending = createNotificationScheduler(() => new Date(2026, 10, 21, 9, 0)).schedule(REMINDER, CHECKLIST);
    await jest.advanceTimersByTimeAsync(7_999);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await pending;

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
