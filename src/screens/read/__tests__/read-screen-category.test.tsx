import { fireEvent, render, screen } from '@testing-library/react-native';

import { fetchEasyRead } from '@/screens/easy-read-client';
import { fetchPlan } from '@/screens/plan/plan-client';
import { readNoticePhoto } from '@/screens/read/api-client';
import { ReadScreen } from '@/screens/read/read-screen';
import type { Category } from '@/tramites/category';

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
jest.mock('@/screens/plan/plan-client', () => ({ fetchPlan: jest.fn(async () => ({ ok: false, reason: 'unreachable' })) }));
jest.mock('@/screens/language/language-store', () => ({ useLanguage: jest.fn(() => 'es') }));

const FACTS = [{ kind: 'fecha', text: 'La junta es el 5 de diciembre.', sourceQuote: 'junta el día 5 de diciembre' }];
const LEGAL = 'Esto no es asesoría legal';
const REVIEW = 'Revise el papel original';
const HEALTH = 'No sustituye a su médico';

const EXPECTED: [Category, string, string][] = [
  ['tramite', 'Trámite', LEGAL],
  ['reunion', 'Reunión', REVIEW],
  ['salud', 'Salud', HEALTH],
  ['nota', 'Nota', REVIEW],
  ['otro', 'Otro', REVIEW],
];

async function readPaper(category: Category) {
  jest.mocked(readNoticePhoto).mockResolvedValue({ ok: true, category, facts: FACTS });
  await render(<ReadScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su texto, papel o trámite' }));
  await screen.findByText(FACTS[0].text);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchEasyRead).mockResolvedValue({ ok: false, reason: 'timeout' });
});

describe('ReadScreen category and notice (context-categories S4)', () => {
  it('shows "Revise el papel original" and no legal notice before any reading', async () => {
    await render(<ReadScreen />);
    expect(screen.getByText(REVIEW).props.accessibilityLanguage).toBe('es-MX');
    expect(screen.queryByText(LEGAL)).toBeNull();
    expect(screen.queryByLabelText(/^Tipo de papel/)).toBeNull();
  });

  it.each(EXPECTED)('shows the %s category by its Spanish name with its notice', async (category, label, notice) => {
    await readPaper(category);
    const row = screen.getByLabelText(`Tipo de papel: ${label}`);
    expect(row.props.accessibilityLanguage).toBe('es-MX');
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(notice)).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(label) })).toBeNull();
  });

  it('shows the legal notice only for a trámite', async () => {
    await readPaper('reunion');
    expect(screen.queryByText(LEGAL)).toBeNull();
  });

  it('shows "No sustituye a su médico" for a health paper, not the generic notice', async () => {
    await readPaper('salud');
    expect(screen.getByText(HEALTH)).toBeTruthy();
    expect(screen.queryByText(REVIEW)).toBeNull();
    expect(screen.queryByText(LEGAL)).toBeNull();
  });

  it('puts the category above the cards', async () => {
    await readPaper('reunion');
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('Reunión')).toBeGreaterThan(-1);
    expect(tree.indexOf('Reunión')).toBeLessThan(tree.indexOf(FACTS[0].text));
  });

  it('asks for the plan with the category of the paper', async () => {
    await readPaper('salud');
    expect(fetchPlan).toHaveBeenCalledWith(FACTS, 'salud');
  });
});
