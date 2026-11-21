import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { LoadingIndicator } from '@/components/loading-indicator';
import { theme } from '@/theme';

const STEP = 'Leyendo su papel.';

type ReduceMotionListener = (enabled: boolean) => void;

function reduceMotion(enabled: boolean) {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(enabled);
}

/** Captures the `reduceMotionChanged` listener so a test can flip the system setting. */
function captureReduceMotionListener(): { emit: ReduceMotionListener } {
  const captured: { emit: ReduceMotionListener } = { emit: () => undefined };
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((eventName, handler) => {
    if (eventName === 'reduceMotionChanged') captured.emit = handler as ReduceMotionListener;
    return { remove: jest.fn() };
  });
  return captured;
}

afterEach(() => jest.restoreAllMocks());

describe('LoadingIndicator (field-feedback S1)', () => {
  it('shows a large spinner in the accent color with the step text below, at body size', async () => {
    reduceMotion(false);
    await render(<LoadingIndicator text={STEP} />);

    const spinner = await screen.findByTestId('loading-spinner');
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe(theme.color.signal);
    const text = screen.getByText(STEP);
    expect(StyleSheet.flatten(text.props.style).fontSize).toBeGreaterThanOrEqual(theme.type.body);
    expect(screen.queryByTestId('loading-still')).toBeNull();
  });

  it('announces the step to screen readers in Spanish', async () => {
    reduceMotion(false);
    await render(<LoadingIndicator text={STEP} />);

    const progress = await screen.findByRole('progressbar', { name: STEP });
    expect(progress.props.accessibilityLiveRegion).toBe('polite');
    expect(progress.props.accessibilityLanguage).toBe('es-MX');
  });

  it('shows a still icon and no spinner when reduce motion is on', async () => {
    reduceMotion(true);
    await render(<LoadingIndicator text={STEP} />);

    expect(await screen.findByTestId('loading-still')).toBeTruthy();
    expect(screen.queryByTestId('loading-spinner')).toBeNull();
    expect(screen.getByText(STEP)).toBeTruthy();
  });

  it('switches to the still icon when the setting turns on while it shows', async () => {
    reduceMotion(false);
    const listener = captureReduceMotionListener();
    await render(<LoadingIndicator text={STEP} />);
    await screen.findByTestId('loading-spinner');

    await act(async () => listener.emit(true));

    expect(screen.getByTestId('loading-still')).toBeTruthy();
    expect(screen.queryByTestId('loading-spinner')).toBeNull();
  });
});
