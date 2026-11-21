import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import { FactCard, iconForKind } from '@/components/fact-card';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

const FACT = { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' };

beforeEach(() => jest.clearAllMocks());

describe('FactCard (S5)', () => {
  it('shows an icon, one sentence, "Escuchar" and "¿De dónde salió?", with the quote hidden', async () => {
    await render(<FactCard fact={FACT} />);
    expect(screen.getByTestId('fact-icon')).toBeTruthy();
    expect(screen.getByText(FACT.text).props.accessibilityLanguage).toBe('es-MX');
    expect(screen.getByRole('button', { name: 'Escuchar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '¿De dónde salió?' })).toBeTruthy();
    expect(screen.queryByText(FACT.sourceQuote)).toBeNull();
  });

  it('reads the sentence aloud from "Escuchar"', async () => {
    await render(<FactCard fact={FACT} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar' }));
    expect(Speech.speak).toHaveBeenCalledWith(FACT.text, expect.objectContaining({ language: 'es-MX' }));
  });

  it('reveals the literal source quote from "¿De dónde salió?"', async () => {
    await render(<FactCard fact={FACT} />);
    await fireEvent.press(screen.getByRole('button', { name: '¿De dónde salió?' }));
    expect(screen.getByText(FACT.sourceQuote).props.accessibilityLanguage).toBe('es-MX');
  });
});

describe('iconForKind', () => {
  it.each([
    ['fecha', 'calendar'],
    ['Fechas', 'calendar'],
    ['monto', 'banknote'],
    ['lugar', 'mappin.and.ellipse'],
    ['documento', 'doc.text'],
    ['consecuencia', 'exclamationmark.triangle'],
    ['otro', 'info.circle'],
  ])('%s uses %s', (kind, iosName) => {
    expect(iconForKind(kind).ios).toBe(iosName);
  });
});
