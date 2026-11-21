import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { fakeVoice } from '@/__fixtures__/fake-voice';
import type { ReminderControls, ReminderStatus } from '@/screens/plan/use-reminder';
import { ConfirmationSheet, formatDueDate } from '@/screens/read/confirmation-sheet';
import type { Plan } from '@/tramites/plan';

const PLAN: Plan = {
  checklist: [
    { text: 'Lleve este aviso.', sourceQuote: 'presentar este aviso' },
    { text: 'Lleve una identificación.', sourceQuote: 'identificación oficial' },
  ],
  reminder: {
    dueDate: '2026-11-30',
    title: 'Pago pendiente',
    place: 'Tesorería Municipal, Calle 60',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
  },
};

function reminderControls(status: ReminderStatus = 'idle', message?: string): ReminderControls {
  return { status, message, schedule: jest.fn(async () => undefined), cancelAll: jest.fn(async () => undefined) };
}

describe('formatDueDate', () => {
  it.each([
    ['2026-11-30', '30 de noviembre de 2026'],
    ['2027-01-01', '1 de enero de 2027'],
  ])('%s reads as %s', (iso, spoken) => {
    expect(formatDueDate(iso)).toBe(spoken);
  });
});

describe('ConfirmationSheet (S10)', () => {
  it('shows the checklist, the date in large type and the place, with every item traceable', async () => {
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminderControls()} />);
    expect(screen.getByText('Lleve este aviso.').props.accessibilityLanguage).toBe('es-MX');
    expect(screen.getByText('Lleve una identificación.')).toBeTruthy();
    const date = screen.getByText('30 de noviembre de 2026');
    expect(StyleSheet.flatten(date.props.style).fontSize).toBeGreaterThanOrEqual(28);
    expect(screen.getByText('Lugar: Tesorería Municipal, Calle 60')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '¿De dónde salió?' })).toHaveLength(2);
  });

  it('reads the proposal aloud only from its "Escuchar" button', async () => {
    const voice = fakeVoice();
    await render(<ConfirmationSheet plan={PLAN} voice={voice} reminder={reminderControls()} />);
    expect(voice.speakSpanish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar' }));
    const [key, spoken] = jest.mocked(voice.speakSpanish).mock.calls[0];
    expect(key).toBe('plan');
    for (const part of ['Lleve este aviso.', 'Lleve una identificación.', '30 de noviembre de 2026', 'Tesorería Municipal', '¿Quiere que le recuerde?']) {
      expect(spoken).toContain(part);
    }
  });

  it('schedules nothing until "Sí, recuérdeme" is tapped, then answers yes', async () => {
    const reminder = reminderControls();
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminder} />);
    expect(reminder.schedule).not.toHaveBeenCalled();
    const yes = screen.getByRole('button', { name: 'Sí, recuérdeme' });
    expect(StyleSheet.flatten(yes.props.style).minHeight).toBeGreaterThanOrEqual(64);
    await fireEvent.press(yes);
    expect(reminder.schedule).toHaveBeenCalledWith(PLAN, 'yes');
  });

  it('answers no from "No, gracias"', async () => {
    const reminder = reminderControls();
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminder} />);
    await fireEvent.press(screen.getByRole('button', { name: 'No, gracias' }));
    expect(reminder.schedule).toHaveBeenCalledWith(PLAN, 'no');
  });

  it('disables "Sí, recuérdeme" while the phone asks for permission', async () => {
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminderControls('asking')} />);
    expect(screen.getByRole('button', { name: 'Sí, recuérdeme' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('shows the checklist only, with no "Sí, recuérdeme", when there is no reminder', async () => {
    await render(<ConfirmationSheet plan={{ ...PLAN, reminder: null }} voice={fakeVoice()} reminder={reminderControls()} />);
    expect(screen.getByText('Lleve este aviso.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sí, recuérdeme' })).toBeNull();
    expect(screen.queryByText('30 de noviembre de 2026')).toBeNull();
  });

  it.each<[ReminderStatus, string]>([
    ['denied', 'No podemos avisarle. Active las notificaciones en Ajustes.'],
    ['error', 'No pudimos guardar el aviso. Intente otra vez.'],
  ])('shows the reminder message when %s and keeps "Sí, recuérdeme" to try again', async (status, message) => {
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminderControls(status, message)} />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sí, recuérdeme' })).toBeTruthy();
  });

  it.each<[ReminderStatus, string]>([
    ['scheduled', 'Listo. Le avisaremos un día antes y el mismo día.'],
    ['nothing', 'Está bien. No guardamos ningún aviso.'],
  ])('confirms the outcome when %s and hides the answer buttons', async (status, text) => {
    await render(<ConfirmationSheet plan={PLAN} voice={fakeVoice()} reminder={reminderControls(status)} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sí, recuérdeme' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'No, gracias' })).toBeNull();
  });
});
