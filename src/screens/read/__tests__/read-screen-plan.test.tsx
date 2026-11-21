import { fireEvent, render, screen } from '@testing-library/react-native';

import { fetchEasyRead } from '@/screens/easy-read-client';
import { fetchPlan } from '@/screens/plan/plan-client';
import { useReminder } from '@/screens/plan/use-reminder';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
import type { Plan } from '@/tramites/plan';

jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn(async () => ({ ok: false, reason: 'timeout' })) }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn() }));
jest.mock('@/screens/plan/use-reminder', () => ({ useReminder: jest.fn() }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const FACTS = [{ kind: 'fecha', text: 'Vence el 30 de noviembre de 2026.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];
const PLAN: Plan = {
  checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'presentar este aviso' }],
  reminder: { dueDate: '2026-11-30', title: 'Pago pendiente', sourceQuote: 'vence el día 30 de noviembre de 2026' },
};
const schedule = jest.fn(async () => undefined);

async function takePhoto() {
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, facts: FACTS });
  jest.mocked(useReminder).mockReturnValue({ status: 'idle', schedule, cancelAll: jest.fn() });
});

describe('ReadScreen confirmation sheet (S10)', () => {
  it('asks for the plan with the facts and shows the sheet after the cards', async () => {
    jest.mocked(fetchPlan).mockResolvedValue({ ok: true, plan: PLAN });
    await takePhoto();
    expect(await screen.findByRole('button', { name: 'Sí, recuérdeme' })).toBeTruthy();
    expect(fetchPlan).toHaveBeenCalledWith(FACTS);
    expect(fetchEasyRead).toHaveBeenCalledWith(FACTS);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(FACTS[0].text)).toBeLessThan(tree.indexOf('Lleve este aviso.'));
    expect(schedule).not.toHaveBeenCalled();
  });

  it('schedules with "yes" only after the big tap', async () => {
    jest.mocked(fetchPlan).mockResolvedValue({ ok: true, plan: PLAN });
    await takePhoto();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sí, recuérdeme' }));
    expect(schedule).toHaveBeenCalledWith(PLAN, 'yes');
  });

  it('keeps the cards and says what happened when the plan fails', async () => {
    jest.mocked(fetchPlan).mockResolvedValue({ ok: false, reason: 'bad-response' });
    await takePhoto();
    expect(await screen.findByText('No pudimos preparar la lista. Sus tarjetas siguen aquí.')).toBeTruthy();
    expect(screen.getByText(FACTS[0].text)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sí, recuérdeme' })).toBeNull();
  });
});
