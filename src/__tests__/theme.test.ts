import { theme } from '@/theme';

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

describe('theme tokens', () => {
  it.each(theme.bodyTextPairs)('$name body text reaches 7:1', ({ foreground, background }) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(7);
  });

  it('keeps body text at 20 sp or more and targets at 48 dp or more', () => {
    expect(theme.type.body).toBeGreaterThanOrEqual(20);
    expect(theme.size.minTarget).toBeGreaterThanOrEqual(48);
    expect(theme.size.primaryTarget).toBeGreaterThanOrEqual(64);
  });
});
