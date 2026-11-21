import { render, screen } from '@testing-library/react-native';

import { ReadScreen } from '@/screens/read/read-screen';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-image-picker', () => ({ CameraType: { back: 'back', front: 'front' }, requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));

describe('ReadScreen language access (S4)', () => {
  it('always shows a visible "Cambiar idioma" button', async () => {
    await render(<ReadScreen />);
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeTruthy();
  });
});
