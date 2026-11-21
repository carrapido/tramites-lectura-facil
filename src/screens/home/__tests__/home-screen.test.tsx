import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { HomeScreen } from '@/screens/home/home-screen';

function mockFetch(routes: Record<string, { status: number; body: unknown }>) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    const route = routes[path];
    return new Response(JSON.stringify(route.body), { status: route.status });
  });
}

describe('HomeScreen', () => {
  it('shows "conectado" when the laptop answers /api/health (S4)', async () => {
    mockFetch({ '/api/health': { status: 200, body: { ok: true } } });
    await render(<HomeScreen />);
    expect(await screen.findByText('conectado')).toBeTruthy();
  });

  it('says what happened and the next step when the laptop is unreachable', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await render(<HomeScreen />);
    expect(await screen.findByText('Sin conexión. Revise que el teléfono y la laptop usen la misma red.')).toBeTruthy();
  });

  it('shows plain Spanish above the labeled Maya after one tap (S6)', async () => {
    mockFetch({
      '/api/health': { status: 200, body: { ok: true } },
      '/api/smoke': { status: 200, body: { ok: true, plainSpanish: 'Vaya a la oficina.', maya: "Xi'iken." } },
    });
    await render(<HomeScreen />);

    const button = await screen.findByRole('button', { name: 'Probar Google' });
    const { minHeight, minWidth } = StyleSheet.flatten(button.props.style);
    expect(minHeight).toBeGreaterThanOrEqual(48);
    expect(minWidth).toBeGreaterThanOrEqual(48);

    await fireEvent.press(button);

    const spanish = await screen.findByText('Vaya a la oficina.');
    const maya = screen.getByText("Xi'iken.");
    expect(spanish.props.accessibilityLanguage).toBe('es-MX');
    expect(maya.props.accessibilityLanguage).toBe('yua');
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText("Maaya t'aan")).toBeTruthy();
    expect(screen.getByText('Traducción automática, sin revisar')).toBeTruthy();
    expect(screen.getByText('Esto no es asesoría legal')).toBeTruthy();
  });

  it('gives the login command when the laptop has no Google credentials', async () => {
    mockFetch({
      '/api/health': { status: 200, body: { ok: true } },
      '/api/smoke': {
        status: 503,
        body: { ok: false, reason: 'adc-missing', fix: 'gcloud auth application-default login' },
      },
    });
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Probar Google' }));
    expect(
      await screen.findByText('La laptop no tiene acceso a Google. Ejecute: gcloud auth application-default login'),
    ).toBeTruthy();
  });
});
