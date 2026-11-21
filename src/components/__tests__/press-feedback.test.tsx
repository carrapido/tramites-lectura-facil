import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { BackButton } from '@/components/back-button';
import { PlayButton } from '@/components/play-button';
import { PressableFeedback } from '@/components/pressable-feedback';
import { SecondaryButton } from '@/components/secondary-button';
import { theme } from '@/theme';

jest.mock('expo-router', () => ({ router: { canGoBack: () => false, back: jest.fn(), replace: jest.fn() } }));

const ICON = { ios: 'camera.fill', android: 'photo_camera' } as const;

function reduceMotion(enabled: boolean) {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(enabled);
}

/** Renders and waits for the phone's reduce-motion answer before any press. */
/** Captures the `reduceMotionChanged` listener so a test can flip the system setting. */
function captureReduceMotionListener(): { emit: (enabled: boolean) => void } {
  const captured: { emit: (enabled: boolean) => void } = { emit: () => undefined };
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((eventName, handler) => {
    if (eventName === 'reduceMotionChanged') captured.emit = handler as (enabled: boolean) => void;
    return { remove: jest.fn() };
  });
  return captured;
}

async function renderSettled(element: ReactElement) {
  await render(element);
  await act(async () => undefined);
}

async function press(event: 'pressIn' | 'pressOut', name: string) {
  await fireEvent(screen.getByRole('button', { name }), event);
}

/** The style the button transitions to; Reanimated animates the change on the UI thread. */
function styleOf(name: string) {
  return StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
}

afterEach(() => jest.restoreAllMocks());

describe('press feedback on every button (field-feedback S7)', () => {
  it.each<[string, ReactElement, string]>([
    ['ActionButton', <ActionButton key="a" label="Tome una foto de su papel" icon={ICON} onPress={jest.fn()} />, 'Tome una foto de su papel'],
    ['SecondaryButton', <SecondaryButton key="s" label="Ver conexión" icon={ICON} onPress={jest.fn()} />, 'Ver conexión'],
    ['BackButton', <BackButton key="b" />, 'Volver'],
    ['PlayButton', <PlayButton key="p" status="idle" onPress={jest.fn()} onStop={jest.fn()} />, 'Escuchar'],
  ])('%s scales down and dims on press-in, and comes back on press-out', async (_name, element, label) => {
    reduceMotion(false);
    await renderSettled(element);

    expect(styleOf(label)).toEqual(expect.objectContaining({ opacity: 1, transform: [{ scale: 1 }] }));

    await press('pressIn', label);
    expect(styleOf(label)).toEqual(
      expect.objectContaining({ opacity: theme.motion.pressOpacity, transform: [{ scale: theme.motion.pressScale }] }),
    );

    await press('pressOut', label);
    expect(styleOf(label)).toEqual(expect.objectContaining({ opacity: 1, transform: [{ scale: 1 }] }));
  });

  it('animates scale and opacity over the theme press time', async () => {
    reduceMotion(false);
    await renderSettled(<SecondaryButton label="Ver conexión" icon={ICON} onPress={jest.fn()} />);
    expect(styleOf('Ver conexión')).toEqual(
      expect.objectContaining({ transitionProperty: ['transform', 'opacity'], transitionDuration: theme.motion.pressMs }),
    );
  });

  it('only dims, without scaling, when reduce motion is on', async () => {
    reduceMotion(true);
    await renderSettled(<ActionButton label="Sí, recuérdeme" icon={ICON} onPress={jest.fn()} />);

    await press('pressIn', 'Sí, recuérdeme');

    const style = styleOf('Sí, recuérdeme');
    expect(style.opacity).toBe(theme.motion.pressOpacity);
    expect(style.transform ?? [{ scale: 1 }]).toEqual([{ scale: 1 }]);
    expect(style).toEqual(expect.objectContaining({ transitionProperty: ['opacity'] }));
  });

  it('stops scaling when reduce motion turns on while the screen shows', async () => {
    reduceMotion(false);
    const listener = captureReduceMotionListener();
    await renderSettled(<ActionButton label="Sí, recuérdeme" icon={ICON} onPress={jest.fn()} />);

    await act(async () => listener.emit(true));
    await press('pressIn', 'Sí, recuérdeme');

    expect(styleOf('Sí, recuérdeme').transform ?? [{ scale: 1 }]).toEqual([{ scale: 1 }]);
  });

  it('keeps the press itself: one tap still calls onPress once', async () => {
    reduceMotion(false);
    const onPress = jest.fn();
    await renderSettled(<ActionButton label="Tome una foto de su papel" icon={ICON} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tome una foto de su papel' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the caller layout style next to the press animation', async () => {
    reduceMotion(false);
    await renderSettled(
      <PressableFeedback accessibilityRole="button" accessibilityLabel="Opción" style={{ minHeight: 64, minWidth: 64 }} />,
    );
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Opción' }).props.style);
    expect(style.minHeight).toBe(64);
    expect(style.minWidth).toBe(64);
  });

  it('uses short press timings from the theme', () => {
    expect(theme.motion.pressMs).toBeGreaterThanOrEqual(100);
    expect(theme.motion.pressMs).toBeLessThanOrEqual(150);
    expect(theme.motion.pressScale).toBeGreaterThanOrEqual(0.9);
    expect(theme.motion.pressScale).toBeLessThan(1);
    expect(theme.motion.pressOpacity).toBeLessThan(1);
  });
});

describe('one press primitive (field-feedback S7)', () => {
  const SRC = join(__dirname, '..', '..');
  const PRIMITIVE = join('components', 'pressable-feedback.tsx');

  it('no screen or component outside the primitive uses Pressable directly', () => {
    const offenders = sourceFiles(join(SRC, 'components'))
      .concat(sourceFiles(join(SRC, 'screens')))
      .filter((file) => relative(SRC, file) !== PRIMITIVE)
      .filter((file) => /\bPressable\b/.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
  });
});

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}
