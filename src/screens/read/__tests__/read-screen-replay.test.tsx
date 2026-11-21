import { fireEvent, render, screen } from '@testing-library/react-native';

import { fetchEasyRead } from '@/screens/easy-read-client';
import { fetchPlan } from '@/screens/plan/plan-client';
import { useReminder } from '@/screens/plan/use-reminder';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
import type { EasyReadCard } from '@/tramites/easy-read';
import type { Plan } from '@/tramites/plan';

jest.mock('@/screens/voice/speak-spanish', () => ({ speakSpanish: jest.fn(async () => undefined) }));
jest.mock('expo-speech', () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined),
}));
jest.mock('expo-image-picker', () => ({
  CameraType: { back: 'back', front: 'front' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800 }] })),
}));
jest.mock('@/screens/read/api-client', () => ({ readNoticePhoto: jest.fn() }));
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn() }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn() }));
jest.mock('@/screens/plan/use-reminder', () => ({ useReminder: jest.fn() }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const REPLAY_LABEL = 'Respuesta grabada';
const FACTS = [{ kind: 'fecha', text: 'Vence el 30 de noviembre de 2026.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];
const CARDS: EasyReadCard[] = [
  { kind: 'fecha', plainSpanish: 'Pague antes del 30 de noviembre.', maya: null, mayaStatus: 'unavailable', sourceQuote: FACTS[0].sourceQuote },
];
const PLAN: Plan = {
  checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'presentar este aviso' }],
  reminder: null,
};

async function takePhoto() {
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category: 'tramite', facts: FACTS });
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: true, cards: CARDS });
  jest.mocked(fetchPlan).mockResolvedValue({ ok: true, plan: PLAN });
  jest.mocked(useReminder).mockReturnValue({ status: 'idle', schedule: jest.fn(async () => undefined), cancelAll: jest.fn() });
});

describe('ReadScreen demo replay label (easyread-pitch S5, PR #7 review W2)', () => {
  it('shows "Respuesta grabada" in Spanish above the cards when the reading was replayed', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category: 'tramite', facts: FACTS, replayed: true });
    await takePhoto();
    await screen.findByText('Lleve este aviso.');

    const label = screen.getByText(REPLAY_LABEL);
    expect(label.props.accessibilityLanguage).toBe('es-MX');
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(REPLAY_LABEL)).toBeLessThan(tree.indexOf(CARDS[0].plainSpanish));
  });

  it('shows the label when only the easy-read cards were replayed', async () => {
    jest.mocked(fetchEasyRead).mockResolvedValue({ ok: true, cards: CARDS, replayed: true });
    await takePhoto();
    await screen.findByText('Lleve este aviso.');

    expect(screen.getByText(REPLAY_LABEL)).toBeTruthy();
  });

  it('shows the label when only the plan was replayed', async () => {
    jest.mocked(fetchPlan).mockResolvedValue({ ok: true, plan: PLAN, replayed: true });
    await takePhoto();
    await screen.findByText('Lleve este aviso.');

    expect(screen.getByText(REPLAY_LABEL)).toBeTruthy();
  });

  it('shows no label for live answers', async () => {
    await takePhoto();
    await screen.findByText('Lleve este aviso.');

    expect(screen.queryByText(REPLAY_LABEL)).toBeNull();
  });

  it('says the part is not recorded when the reading answers not-recorded', async () => {
    jest.mocked(readNoticePhoto).mockResolvedValue({ ok: false, reason: 'not-recorded' });
    await takePhoto();

    expect(await screen.findByText('Esta parte no está grabada. Use el modo en vivo.')).toBeTruthy();
    expect(screen.queryByText(REPLAY_LABEL)).toBeNull();
  });
});
