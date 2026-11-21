import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PlayButton } from '@/components/play-button';
import { theme } from '@/theme';

const ICON = { ios: 'camera.fill', android: 'photo_camera' } as const;
const PREPARING_VOICE = 'Preparando la voz.';

function reduceMotion(enabled: boolean) {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(enabled);
}

/** Renders and waits for the phone's reduce-motion answer. */
async function renderSettled(element: ReactElement) {
  await render(element);
  await act(async () => undefined);
}

afterEach(() => jest.restoreAllMocks());

describe('ActionButton busy (field-feedback S8)', () => {
  it('shows the spinner next to its words and is disabled and busy', async () => {
    reduceMotion(false);
    const onPress = jest.fn();
    await renderSettled(<ActionButton label="Tome una foto de su papel" icon={ICON} onPress={onPress} busy />);

    const button = screen.getByRole('button', { name: 'Tome una foto de su papel' });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, busy: true }));
    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    expect(screen.getByText('Tome una foto de su papel')).toBeTruthy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps its 64 dp target while busy', async () => {
    reduceMotion(false);
    await renderSettled(<ActionButton label="Sí, recuérdeme" icon={ICON} onPress={jest.fn()} busy />);
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Sí, recuérdeme' }).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(theme.size.primaryTarget);
  });

  it('shows a still symbol instead of the spinner when reduce motion is on', async () => {
    reduceMotion(true);
    await renderSettled(<ActionButton label="Sí, recuérdeme" icon={ICON} onPress={jest.fn()} busy />);
    expect(screen.getByTestId('button-still')).toBeTruthy();
    expect(screen.queryByTestId('button-spinner')).toBeNull();
  });

  it('shows no spinner and stays enabled when not busy', async () => {
    reduceMotion(false);
    await renderSettled(<ActionButton label="Sí, recuérdeme" icon={ICON} onPress={jest.fn()} />);
    expect(screen.queryByTestId('button-spinner')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sí, recuérdeme' }).props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });
});

describe('PlayButton while the voice loads (field-feedback S6, S8)', () => {
  it('shows the spinner inside the button with "Preparando la voz.", busy and disabled', async () => {
    reduceMotion(false);
    const onPress = jest.fn();
    const onStop = jest.fn();
    await renderSettled(<PlayButton status="loading" onPress={onPress} onStop={onStop} />);

    const button = screen.getByRole('button', { name: PREPARING_VOICE });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, busy: true }));
    expect(screen.getByTestId('button-spinner')).toBeTruthy();
    expect(screen.getByText(PREPARING_VOICE)).toBeTruthy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('announces "Preparando la voz." in Spanish', async () => {
    reduceMotion(false);
    await renderSettled(<PlayButton status="loading" onPress={jest.fn()} onStop={jest.fn()} accessibilityLabel="Escuchar en maya" />);
    const button = screen.getByRole('button', { name: PREPARING_VOICE });
    expect(button.props.accessibilityLiveRegion).toBe('polite');
    expect(button.props.accessibilityLanguage).toBe('es-MX');
  });

  it('shows a still symbol when reduce motion is on', async () => {
    reduceMotion(true);
    await renderSettled(<PlayButton status="loading" onPress={jest.fn()} onStop={jest.fn()} />);
    expect(screen.getByTestId('button-still')).toBeTruthy();
    expect(screen.queryByTestId('button-spinner')).toBeNull();
  });

  it('shows no spinner while idle or playing', async () => {
    reduceMotion(false);
    await renderSettled(<PlayButton status="playing" onPress={jest.fn()} onStop={jest.fn()} />);
    expect(screen.queryByTestId('button-spinner')).toBeNull();
    expect(screen.queryByText(PREPARING_VOICE)).toBeNull();
  });
});
