import { fetchEasyRead } from '@/screens/easy-read-client';
import type { Fact } from '@/tramites/ports';

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
];

const CARDS = [
  {
    kind: 'fecha',
    plainSpanish: 'Pague antes del 30 de noviembre.',
    maya: "Bo'ot ka'aj 30.",
    mayaStatus: 'machine-unreviewed',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
    box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
  },
  {
    kind: 'lugar',
    plainSpanish: 'Vaya a la Tesorería Municipal.',
    maya: null,
    mayaStatus: 'unavailable',
    sourceQuote: 'Deberá presentarse en la Tesorería Municipal',
  },
];

describe('fetchEasyRead (S6)', () => {
  it('posts the facts to /api/easy-read and returns the cards', async () => {
    const fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ ok: true, cards: CARDS }),
    );
    global.fetch = fetchMock;

    expect(await fetchEasyRead(FACTS)).toEqual({ ok: true, cards: CARDS });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/easy-read$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ facts: FACTS });
  });

  it.each(['invalid-request', 'adc-missing', 'config-missing'])('passes the server reason %s through', async (reason) => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason }, { status: 400 }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason });
  });

  it('reports an unknown server reason as bad-response', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason: 'upstream-failed' }, { status: 502 }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports bad-response when the answer is not JSON', async () => {
    global.fetch = jest.fn(async () => new Response('<html>Internal error</html>', { status: 500 }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports bad-response when a card does not match the expected shape', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, cards: [{ ...CARDS[0], mayaStatus: 'reviewed' }] }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports unreachable when the request cannot reach the laptop', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('reports timeout and aborts the request when the deadline passes', async () => {
    let signal: AbortSignal | null | undefined;
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal;
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    expect(await fetchEasyRead(FACTS, 10)).toEqual({ ok: false, reason: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });
});

describe('fetchEasyRead in demo replay (S5)', () => {
  it('passes replayed: true through', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, cards: CARDS, replayed: true }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: true, cards: CARDS, replayed: true });
  });

  it('passes not-recorded through so the app can explain it', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason: 'not-recorded' }, { status: 404 }));
    expect(await fetchEasyRead(FACTS)).toEqual({ ok: false, reason: 'not-recorded' });
  });
});
