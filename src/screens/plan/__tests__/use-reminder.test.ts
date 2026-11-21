import { act, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';

import { PermissionDeniedError } from '@/screens/plan/notification-scheduler';
import { DENIED_MESSAGE, useReminder } from '@/screens/plan/use-reminder';
import type { Plan } from '@/tramites/plan';
import type { ReminderScheduler } from '@/tramites/ports';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => null),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 6 },
}));

const PLAN: Plan = {
  checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }],
  reminder: {
    dueDate: '2026-11-30',
    title: 'pago del predial',
    place: 'Tesorería Municipal',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
  },
};

function schedulerThat(schedule: ReminderScheduler['schedule']): ReminderScheduler & { schedule: jest.Mock } {
  return { schedule: jest.fn(schedule) };
}

beforeEach(() => jest.clearAllMocks());

describe('useReminder (S4, S5, S7)', () => {
  it('starts idle and schedules nothing on mount', async () => {
    const scheduler = schedulerThat(async () => undefined);

    const { result } = await renderHook(() => useReminder(scheduler));

    expect(result.current.status).toBe('idle');
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('schedules after "yes" and reports scheduled', async () => {
    const scheduler = schedulerThat(async () => undefined);
    const { result } = await renderHook(() => useReminder(scheduler));

    await act(() => result.current.schedule(PLAN, 'yes'));

    expect(scheduler.schedule).toHaveBeenCalledWith(PLAN.reminder, PLAN.checklist);
    expect(result.current.status).toBe('scheduled');
  });

  it('schedules nothing after "no"', async () => {
    const scheduler = schedulerThat(async () => undefined);
    const { result } = await renderHook(() => useReminder(scheduler));

    await act(() => result.current.schedule(PLAN, 'no'));

    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(result.current.status).toBe('nothing');
  });

  it('shows the Settings message when permission is denied (S5)', async () => {
    const { result } = await renderHook(() =>
      useReminder(
        schedulerThat(async () => {
          throw new PermissionDeniedError();
        }),
      ),
    );

    await act(() => result.current.schedule(PLAN, 'yes'));

    expect(result.current.status).toBe('denied');
    expect(result.current.message).toBe('No podemos avisarle. Active las notificaciones en Ajustes.');
    expect(DENIED_MESSAGE).toBe(result.current.message);
  });

  it('reports error when scheduling fails for another reason', async () => {
    const { result } = await renderHook(() =>
      useReminder(
        schedulerThat(async () => {
          throw new Error('native failure');
        }),
      ),
    );

    await act(() => result.current.schedule(PLAN, 'yes'));

    expect(result.current.status).toBe('error');
    expect(result.current.message).toBe('No pudimos guardar el aviso. Intente otra vez.');
  });

  it('cancelAll cancels every scheduled notification', async () => {
    const { result } = await renderHook(() => useReminder(schedulerThat(async () => undefined)));

    await act(() => result.current.cancelAll());

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');
  });

  it('uses the notification scheduler by default: nothing is scheduled without "yes"', async () => {
    const { result } = await renderHook(() => useReminder());

    await act(() => result.current.schedule(PLAN, 'no'));

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
