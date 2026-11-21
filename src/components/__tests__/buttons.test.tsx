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
    ['PlayButton', <PlayButton key="p" text="Pague antes del 30 de noviembre." />, 'Escuchar'],
  ])('%s', async (_name, element, label) => {
    await render(element);
    const button = screen.getByRole('button', { name: label });
    expect(button.props.accessibilityLanguage).toBe('es-MX');
    expectMinimumTarget(button);
    expect(screen.getByText(label.startsWith('Escuchar') ? 'Escuchar' : label)).toBeTruthy();
  });
});

describe('PlayButton (S5: audio only from a large "Escuchar" button)', () => {
  it('says nothing until it is pressed', async () => {
    await render(<PlayButton text="Pague antes del 30 de noviembre." />);
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('stops any sentence in progress, then reads its text in Mexican Spanish', async () => {
    await render(<PlayButton text="Pague antes del 30 de noviembre." />);
    await fireEvent.press(screen.getByRole('button', { name: 'Escuchar' }));
    expect(Speech.stop).toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalledWith('Pague antes del 30 de noviembre.', expect.objectContaining({ language: 'es-MX' }));
  });

  it('accepts a longer spoken label that keeps the visible word', async () => {
    await render(<PlayButton text="Maaya t'aan" accessibilityLabel="Escuchar Maaya t'aan" />);
    expect(screen.getByRole('button', { name: "Escuchar Maaya t'aan" })).toBeTruthy();
    expect(screen.getByText('Escuchar')).toBeTruthy();
  });
});
