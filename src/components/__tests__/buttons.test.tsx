import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { StyleSheet } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { BackButton } from '@/components/back-button';
import { PlayButton } from '@/components/play-button';
import { SecondaryButton } from '@/components/secondary-button';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-router', () => ({ router: { canGoBack: () => false, back: jest.fn(), replace: jest.fn() } }));

const ICON = { ios: 'camera.fill', android: 'photo_camera' } as const;
const MIN_TARGET_DP = 48;

function expectMinimumTarget(element: ReturnType<typeof screen.getByRole>) {
  const style = StyleSheet.flatten(element.props.style);
  expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET_DP);
  expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TARGET_DP);
}

beforeEach(() => jest.clearAllMocks());

describe('buttons expose role, Spanish label and a 48 dp target (S1, S2)', () => {
  it.each([
    ['ActionButton', <ActionButton key="a" label="Tome una foto de su papel" icon={ICON} onPress={jest.fn()} />, 'Tome una foto de su papel'],
    ['SecondaryButton', <SecondaryButton key="s" label="Ver conexión" icon={ICON} />, 'Ver conexión'],
    ['BackButton', <BackButton key="b" />, 'Volver'],
    ['PlayButton', <PlayButton key="p" status="idle" onPress={jest.fn()} onStop={jest.fn()} />, 'Escuchar'],
  ])('%s', async (_name, element, label) => {
    await render(element);
    const button = screen.getByRole('button', { name: label });
    expect(button.props.accessibilityLanguage).toBe('es-MX');
    expectMinimumTarget(button);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe('PlayButton (S9: driven by the screen voice, never autoplay)', () => {
  it('shows "Escuchar" when idle and calls onPress only when pressed', async () => {
    const onPress = jest.fn();
    await render(<PlayButton status="idle" onPress={onPress} onStop={jest.fn()} />);
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  // field-feedback S6/S8 supersede "Parar" while loading: the button itself is busy and disabled.
  it('shows a busy "Preparando la voz." button while loading, with no "Parar" yet', async () => {
    const onStop = jest.fn();
    await render(<PlayButton status="loading" onPress={jest.fn()} onStop={onStop} />);
    expect(screen.getByText('Preparando la voz.')).toBeTruthy();
    const busy = screen.getByRole('button', { name: 'Preparando la voz.' });
    expect(busy.props.accessibilityState).toEqual(expect.objectContaining({ busy: true, disabled: true }));
    expect(screen.queryByRole('button', { name: 'Parar' })).toBeNull();
    await fireEvent.press(busy);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('shows "Parar" while playing', async () => {
    await render(<PlayButton status="playing" onPress={jest.fn()} onStop={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Parar' })).toBeTruthy();
    expect(screen.queryByText('Preparando la voz.')).toBeNull();
  });

  it('accepts a longer spoken label that keeps the visible word', async () => {
    await render(<PlayButton status="idle" onPress={jest.fn()} onStop={jest.fn()} accessibilityLabel="Escuchar en maya" />);
    expect(screen.getByRole('button', { name: 'Escuchar en maya' })).toBeTruthy();
    expect(screen.getByText('Escuchar')).toBeTruthy();
  });
});
