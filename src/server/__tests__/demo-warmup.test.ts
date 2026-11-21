/**
 * @jest-environment node
 */
import { baseUrlOf, exitCodeOf, formatLine, runWarmup, type RouteResult } from '../../../scripts/demo-warmup';

const FACTS = [{ kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];
const CARDS = [
  { kind: 'fecha', plainSpanish: 'Pague antes del 30.', maya: null, mayaStatus: 'unavailable', sourceQuote: 'x' },
  { kind: 'lugar', plainSpanish: 'Vaya.', maya: "Bo'ot ka'aj 30.", mayaStatus: 'machine-unreviewed', sourceQuote: 'y' },
];
const IMAGE = new Uint8Array([255, 216, 255]);

function result(overrides: Partial<RouteResult>): RouteResult {
  return { route: '/api/read', ok: true, status: 200, ms: 120.4, replayed: false, ...overrides };
}

interface Call {
  url: string;
  method: string;
  body: unknown;
}

/** A dev server answering each route; `answers` overrides one route's response. */
function fakeServer(answers: Record<string, () => Response> = {}) {
  const calls: Call[] = [];
  const defaults: Record<string, () => Response> = {
    '/api/health': () => Response.json({ ok: true }),
    '/api/read': () => Response.json({ ok: true, facts: FACTS, replayed: true }),
    '/api/easy-read': () => Response.json({ ok: true, cards: CARDS, replayed: true }),
    '/api/voice': () => new Response(new Uint8Array([82]), { headers: { 'Content-Type': 'audio/wav', 'X-Demo-Replay': '1' } }),
    '/api/plan': () => Response.json({ ok: true, plan: { checklist: [], reminder: null }, replayed: true }),
  };
  const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    return (answers[url.pathname] ?? defaults[url.pathname])();
  });
  return { calls, fetchImpl };
}

let clock = 0;
const now = () => (clock += 10);

describe('demo warm-up output (S6)', () => {
  it('prints OK, route, status and rounded time', () => {
    expect(formatLine(result({}))).toBe('OK /api/read 200 120ms');
  });

  it('marks a replayed answer and a failure', () => {
    expect(formatLine(result({ replayed: true }))).toBe('OK /api/read 200 120ms replayed');
    expect(formatLine(result({ ok: false, status: 404, ms: 3 }))).toBe('FAIL /api/read 404 3ms');
  });

  it('exits 0 only when every route is OK', () => {
    expect(exitCodeOf([result({}), result({ route: '/api/plan' })])).toBe(0);
    expect(exitCodeOf([result({}), result({ ok: false })])).toBe(1);
    expect(exitCodeOf([])).toBe(1);
  });

  it('uses the argument, then DEMO_BASE_URL, then http://localhost:8081', () => {
    expect(baseUrlOf(['node', 'demo-warmup.ts', 'http://10.0.0.2:8081'], { DEMO_BASE_URL: 'http://x' })).toBe('http://10.0.0.2:8081');
    expect(baseUrlOf(['node', 'demo-warmup.ts'], { DEMO_BASE_URL: 'http://192.168.1.5:8081' })).toBe('http://192.168.1.5:8081');
    expect(baseUrlOf(['node', 'demo-warmup.ts'], {})).toBe('http://localhost:8081');
  });
});

describe('demo warm-up run (S6)', () => {
  it('checks health, then calls the four routes once with the fixture and the returned facts', async () => {
    const server = fakeServer();

    const results = await runWarmup('http://laptop:8081', IMAGE, server.fetchImpl, now);

    expect(results.map(formatLine)).toEqual([
      'OK /api/health 200 10ms',
      'OK /api/read 200 10ms replayed',
      'OK /api/easy-read 200 10ms replayed',
      'OK /api/voice 200 10ms replayed',
      'OK /api/plan 200 10ms replayed',
    ]);
    expect(server.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      'GET /api/health',
      'POST /api/read',
      'POST /api/easy-read',
      'GET /api/voice',
      'POST /api/plan',
    ]);
    expect(server.calls[1].body).toEqual({ imageBase64: Buffer.from(IMAGE).toString('base64'), mimeType: 'image/jpeg' });
    expect(server.calls[2].body).toEqual({ facts: FACTS });
    expect(new URL(server.calls[3].url).searchParams.get('text')).toBe("Bo'ot ka'aj 30.");
    expect(server.calls[4].body).toEqual({ facts: FACTS });
  });

  it('reports a failing route and every route that depends on it as FAIL', async () => {
    const server = fakeServer({ '/api/read': () => Response.json({ ok: false, reason: 'not-recorded' }, { status: 404 }) });

    const results = await runWarmup('http://laptop:8081', IMAGE, server.fetchImpl, now);

    expect(results.map((entry) => `${entry.ok ? 'OK' : 'FAIL'} ${entry.route} ${entry.status}`)).toEqual([
      'OK /api/health 200',
      'FAIL /api/read 404',
      'FAIL /api/easy-read 0',
      'FAIL /api/voice 0',
      'FAIL /api/plan 0',
    ]);
    expect(exitCodeOf(results)).toBe(1);
  });

  it('reports status 0 when the dev server is unreachable', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('fetch failed');
    });

    const results = await runWarmup('http://laptop:8081', IMAGE, fetchImpl, now);

    expect(results[0]).toEqual(expect.objectContaining({ route: '/api/health', ok: false, status: 0 }));
    expect(exitCodeOf(results)).toBe(1);
  });
});
