import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { fetchPlan, type PlanResult } from '@/screens/plan/plan-client';
import { useReminder } from '@/screens/plan/use-reminder';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
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
jest.mock('@/screens/easy-read-client', () => ({ fetchEasyRead: jest.fn(async () => ({ ok: false, reason: 'timeout' })) }));
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn() }));
jest.mock('@/screens/plan/use-reminder', () => ({ useReminder: jest.fn() }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const PHOTO_BUTTON = 'Tome una foto de su papel';
const FIRST_FACTS = [{ kind: 'fecha', text: 'Primer papel: vence el 30.', sourceQuote: 'vence el día 30' }];
const SECOND_FACTS = [{ kind: 'monto', text: 'Segundo papel: debe 100 pesos.', sourceQuote: 'la cantidad de $100' }];
const FIRST_PLAN: Plan = { checklist: [{ text: 'Lista del primer papel.', sourceQuote: 'vence el día 30' }], reminder: null };
const SECOND_PLAN: Plan = { checklist: [{ text: 'Lista del segundo papel.', sourceQuote: 'la cantidad de $100' }], reminder: null };

interface PendingPlan {
  resolve: (result: PlanResult) => void;
}

const pendingPlans: PendingPlan[] = [];

function photoButton() {
  return screen.getByRole('button', { name: PHOTO_BUTTON });
}

/** Taps without waiting, so the test can look at the screen while the plan is pending. */
function startTap() {
  return fireEvent.press(photoButton());
}

beforeEach(() => {
  jest.clearAllMocks();
  pendingPlans.length = 0;
  jest.mocked(readNoticePhoto).mockReset().mockResolvedValueOnce({ ok: true, category: 'tramite', facts: FIRST_FACTS }).mockResolvedValueOnce({ ok: true, category: 'tramite', facts: SECOND_FACTS });
  jest.mocked(fetchPlan).mockImplementation(
    () =>
      new Promise<PlanResult>((resolve) => {
        pendingPlans.push({ resolve });
      }),
  );
  jest.mocked(useReminder).mockReturnValue({ status: 'idle', schedule: jest.fn(async () => undefined), cancelAll: jest.fn() });
});

describe('the camera stays free while the plan loads (PR #7 review W3)', () => {
  it('enables the photo button once the cards show, while the plan is still pending', async () => {
    await render(<ReadScreen />);
    void startTap();
    await screen.findByText(FIRST_FACTS[0].text);
    await screen.findByText('Preparando su lista.');

    expect(photoButton()).toBeEnabled();
    await act(async () => pendingPlans[0]?.resolve({ ok: true, plan: FIRST_PLAN }));
  });

  it('ignores a plan from an older photo that arrives after the newer one', async () => {
    await render(<ReadScreen />);
    void startTap();
    await screen.findByText(FIRST_FACTS[0].text);
    await screen.findByText('Preparando su lista.');

    void startTap();
    await screen.findByText(SECOND_FACTS[0].text);
    expect(pendingPlans).toHaveLength(2);

    await act(async () => pendingPlans[1]?.resolve({ ok: true, plan: SECOND_PLAN }));
    await screen.findByText('Lista del segundo papel.');
    await act(async () => pendingPlans[0]?.resolve({ ok: true, plan: FIRST_PLAN }));

    expect(screen.getByText('Lista del segundo papel.')).toBeTruthy();
    expect(screen.queryByText('Lista del primer papel.')).toBeNull();
  });
});
