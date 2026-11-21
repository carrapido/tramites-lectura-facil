import { fireEvent, render, screen } from '@testing-library/react-native';

import { FactCard, iconForKind } from '@/components/fact-card';
import type { EasyReadCard } from '@/tramites/easy-read';

import { fakeVoice } from '@/__fixtures__/fake-voice';

const CARD: EasyReadCard = {
  kind: 'fecha',
  plainSpanish: 'Pague antes del 30 de noviembre.',
  maya: "Bo'ot ka'aj 30 noviembre.",
  mayaStatus: 'machine-unreviewed',
  sourceQuote: 'vence el día 30 de noviembre de 2026',
};

describe('FactCard in Spanish (S5, S8)', () => {
  it('shows an icon, the plain Spanish, "Escuchar" and "¿De dónde salió?", with the quote hidden', async () => {
    await render(<FactCard card={CARD} voiceKey="c0" showMaya={false} voice={fakeVoice()} />);
    expect(screen.getByTestId('fact-icon')).toBeTruthy();
    expect(screen.getByText(CARD.plainSpanish).props.accessibilityLanguage).toBe('es-MX');
    expect(screen.getByRole('button', { name: 'Escuchar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '¿De dónde salió?' })).toBeTruthy();
    expect(screen.queryByText(CARD.sourceQuote)).toBeNull();
    expect(screen.queryByText(CARD.maya ?? '')).toBeNull();
  });

  it('reads the plain Spanish with the screen voice', async () => {
    const voice = fakeVoice();
    await render(<FactCard card={CARD} voiceKey="c0" showMaya={false} voice={voice} />);
    expect(voice.speakSpanish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar' }));
    expect(voice.speakSpanish).toHaveBeenCalledWith('c0:es', CARD.plainSpanish);
  });

  it('reveals the literal source quote from "¿De dónde salió?"', async () => {
    await render(<FactCard card={CARD} voiceKey="c0" showMaya={false} voice={fakeVoice()} />);
    await fireEvent.press(screen.getByRole('button', { name: '¿De dónde salió?' }));
    expect(screen.getByText(CARD.sourceQuote).props.accessibilityLanguage).toBe('es-MX');
  });
});

describe('FactCard in Maaya t\'aan (S8, S9)', () => {
  it('keeps the Spanish on top and adds the labeled Maya with its own button', async () => {
    await render(<FactCard card={CARD} voiceKey="c0" showMaya voice={fakeVoice()} />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf(CARD.plainSpanish)).toBeLessThan(tree.indexOf(CARD.maya ?? ''));
    expect(screen.getByText(CARD.maya ?? '').props.accessibilityLanguage).toBe('yua');
    expect(screen.getByText('Traducción automática, sin revisar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Escuchar en maya' })).toBeTruthy();
    expect(screen.getByText('Voz automática, sin revisar')).toBeTruthy();
  });

  it('plays the Maya voice only from its button', async () => {
    const voice = fakeVoice();
    await render(<FactCard card={CARD} voiceKey="c0" showMaya voice={voice} />);
    expect(voice.playMaya).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar en maya' }));
    expect(voice.playMaya).toHaveBeenCalledWith('c0:yua', CARD.maya);
  });

  it.each<[string, Partial<EasyReadCard>]>([
    ['unavailable', { maya: null, mayaStatus: 'unavailable' }],
    ['null maya', { maya: null }],
  ])('hides Maya when it is %s', async (_name, change) => {
    await render(<FactCard card={{ ...CARD, ...change }} voiceKey="c0" showMaya voice={fakeVoice()} />);
    expect(screen.getByText(CARD.plainSpanish)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Escuchar en maya' })).toBeNull();
    expect(screen.queryByText('Traducción automática, sin revisar')).toBeNull();
  });

  // field-feedback S6/S8: while the Maya voice loads, its button is busy; "Parar" comes once it plays.
  it('shows the Maya loading state as a busy button, then stops the Maya voice from "Parar"', async () => {
    const voice = fakeVoice({ 'c0:yua': 'loading' });
    const { rerender } = await render(<FactCard card={CARD} voiceKey="c0" showMaya voice={voice} />);
    expect(screen.getByRole('button', { name: 'Preparando la voz.' }).props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true, disabled: true }),
    );
    const playing = fakeVoice({ 'c0:yua': 'playing' });
    await rerender(<FactCard card={CARD} voiceKey="c0" showMaya voice={playing} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Parar' }));
    expect(playing.stop).toHaveBeenCalled();
  });

  it('says in plain words when the Maya voice is unavailable', async () => {
    await render(<FactCard card={CARD} voiceKey="c0" showMaya voice={fakeVoice({}, ['c0:yua'])} />);
    expect(screen.getByText('No se pudo oír en maya. Escuche en español.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Escuchar' })).toBeTruthy();
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
