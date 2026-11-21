import { render, screen } from '@testing-library/react-native';

import { MayaText, SpanishText } from '@/components/language-text';

describe('language-tagged text (S3)', () => {
  it('tags Spanish text as es-MX', async () => {
    await render(<SpanishText>Pague antes del 30 de noviembre.</SpanishText>);
    expect(screen.getByText('Pague antes del 30 de noviembre.').props.accessibilityLanguage).toBe('es-MX');
  });

  it('tags Maya text as yua and labels it as an unreviewed machine translation in Spanish', async () => {
    await render(<MayaText>Bix a beel</MayaText>);
    expect(screen.getByText('Bix a beel').props.accessibilityLanguage).toBe('yua');
    expect(screen.getByText('Traducción automática, sin revisar').props.accessibilityLanguage).toBe('es-MX');
  });
});
