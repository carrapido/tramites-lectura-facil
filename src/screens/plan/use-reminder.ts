import { useCallback, useMemo, useState } from 'react';

import { cancelAllReminders, createNotificationScheduler, PermissionDeniedError } from '@/screens/plan/notification-scheduler';
import { executePlan, type Plan, type PlanAnswer, type PlanOutcome } from '@/tramites/plan';
import type { ReminderScheduler } from '@/tramites/ports';

/** Shown when the person refused notifications (S5). */
export const DENIED_MESSAGE = 'No podemos avisarle. Active las notificaciones en Ajustes.';

export const ERROR_MESSAGE = 'No pudimos guardar el aviso. Intente otra vez.';

export type ReminderStatus = 'idle' | 'asking' | 'scheduled' | 'denied' | 'error' | 'nothing';

export interface ReminderControls {
  status: ReminderStatus;
  message?: string;
  /** Call with "yes" only after the big "Sí, recuérdeme" tap; any other answer schedules nothing (S4). */
  schedule(plan: Plan, answer: PlanAnswer): Promise<void>;
  cancelAll(): Promise<void>;
}

interface ReminderState {
  status: ReminderStatus;
  message?: string;
}

const IDLE: ReminderState = { status: 'idle' };
const DENIED: ReminderState = { status: 'denied', message: DENIED_MESSAGE };
const FAILED: ReminderState = { status: 'error', message: ERROR_MESSAGE };

const notificationScheduler = createNotificationScheduler();

/** The confirmation sheet's reminder controls (S7). Nothing is scheduled on mount. */
export function useReminder(scheduler: ReminderScheduler = notificationScheduler): ReminderControls {
  const [state, setState] = useState<ReminderState>(IDLE);

  const schedule = useCallback(
    async (plan: Plan, answer: PlanAnswer) => {
      setState({ status: 'asking' });
      try {
        setState(stateAfter(await executePlan(plan, answer, scheduler)));
      } catch (error) {
        setState(error instanceof PermissionDeniedError ? DENIED : FAILED);
      }
    },
    [scheduler],
  );

  const cancelAll = useCallback(async () => {
    await cancelAllReminders();
    setState(IDLE);
  }, []);

  return useMemo(() => ({ ...state, schedule, cancelAll }), [state, schedule, cancelAll]);
}

function stateAfter(outcome: PlanOutcome): ReminderState {
  return outcome === 'scheduled' ? { status: 'scheduled' } : { status: 'nothing' };
}
