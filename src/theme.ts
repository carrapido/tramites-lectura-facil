/**
 * Direction "Voz primero": calm, oral, patient. World: community radio and the town loudspeaker.
 * Single source of colors, spacing, type sizes and radii. dp/sp on a 4 dp grid.
 */
const color = {
  paper: '#F6F3EC',
  ink: '#1B1A17',
  inkMuted: '#45423B',
  signal: '#173F5F',
  onSignal: '#FFFFFF',
  danger: '#8A1C1C',
  rule: '#D9D3C4',
} as const;

export const theme = {
  color,
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  type: { label: 20, body: 22, title: 28 },
  weight: { body: '400', label: '600' },
  radius: { card: 16, button: 32 },
  border: { hairline: 1, strong: 2 },
  size: { minTarget: 48, primaryTarget: 64, icon: 28, pictogram: 48 },
  /** Press feedback (field-feedback S7): under 150 ms, strong ease-out, scale never below 0.9. */
  motion: { pressScale: 0.96, pressOpacity: 0.85, pressMs: 120, pressEasing: [0.23, 1, 0.32, 1] },
  bodyTextPairs: [
    { name: 'ink on paper', foreground: color.ink, background: color.paper },
    { name: 'muted ink on paper', foreground: color.inkMuted, background: color.paper },
    { name: 'label on signal', foreground: color.onSignal, background: color.signal },
    { name: 'danger on paper', foreground: color.danger, background: color.paper },
  ],
} as const;
