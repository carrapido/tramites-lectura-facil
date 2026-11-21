import { fetchPlan } from '@/screens/plan/plan-client';
import type { Fact } from '@/tramites/ports';

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
];

const PLAN = {
  checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }],
  reminder: {
    dueDate: '2026-11-30',
    title: 'pago del predial',
    place: 'Tesorería Municipal',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
  },
};

describe('fetchPlan (S7)', () => {
  it('posts the facts to /api/plan and returns the plan', async () => {
    const fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({ ok: true, plan: PLAN }));
    global.fetch = fetchMock;

    expect(await fetchPlan(FACTS)).toEqual({ ok: true, plan: PLAN });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/plan$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ facts: FACTS });
  });

  it('accepts a plan without reminder', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, plan: { checklist: [], reminder: null } }));
    expect(await fetchPlan(FACTS)).toEqual({ ok: true, plan: { checklist: [], reminder: null } });
  });

  it.each(['invalid-request', 'adc-missing', 'config-missing'])('passes the server reason %s through', async (reason) => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason }, { status: 400 }));
    expect(await fetchPlan(FACTS)).toEqual({ ok: false, reason });
  });

  it('reports upstream-failed and malformed plans as bad-response', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason: 'upstream-failed' }, { status: 502 }));
    expect(await fetchPlan(FACTS)).toEqual({ ok: false, reason: 'bad-response' });

    global.fetch = jest.fn(async () => Response.json({ ok: true, plan: { checklist: [{ text: 'Sin cita.' }], reminder: null } }));
    expect(await fetchPlan(FACTS)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports unreachable when the request cannot reach the laptop', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchPlan(FACTS)).toEqual({ ok: false, reason: 'unreachable' });
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

    expect(await fetchPlan(FACTS, 10)).toEqual({ ok: false, reason: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });
});

describe('fetchPlan in demo replay (S5)', () => {
  it('passes replayed: true through', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, plan: PLAN, replayed: true }));
    expect(await fetchPlan(FACTS)).toEqual({ ok: true, plan: PLAN, replayed: true });
  });
});
