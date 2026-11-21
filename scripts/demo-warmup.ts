/**
 * Demo warm-up (S6): `npm run demo:warmup [baseUrl]`.
 * Checks the dev server, calls the four demo routes once with the fictitious notice
 * and prints one line per route. Exits 1 if any route fails.
 * Runs on Node 24 type stripping: https://nodejs.org/docs/latest-v24.x/api/typescript.html
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

export interface RouteResult {
  route: string;
  ok: boolean;
  status: number;
  ms: number;
  replayed: boolean;
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_BASE_URL = 'http://localhost:8081';

const FIXTURE = join(process.cwd(), 'fixtures', 'aviso-ficticio.jpg');

/** Gemini calls take seconds; one minute ends a stalled route. */
const ROUTE_DEADLINE_MS = 60_000;

const ROUTES = ['/api/health', '/api/read', '/api/easy-read', '/api/voice', '/api/plan'];

const okBody = z.object({ ok: z.literal(true), replayed: z.boolean().optional() });
const readBody = z.object({ facts: z.array(z.unknown()).min(1) });
const easyReadBody = z.object({ cards: z.array(z.object({ maya: z.string().nullable() })) });

if (process.argv[1]?.endsWith('demo-warmup.ts')) void main();

async function main(): Promise<void> {
  const image = new Uint8Array(await readFile(FIXTURE));
  const results = await runWarmup(baseUrlOf(process.argv, process.env), image, fetch, () => performance.now());
  for (const result of results) console.log(formatLine(result));
  process.exitCode = exitCodeOf(results);
}

/** Health first; each later route uses what the previous one returned. A failure marks the rest FAIL. */
export async function runWarmup(baseUrl: string, image: Uint8Array, fetchImpl: Fetch, now: () => number): Promise<RouteResult[]> {
  const call = (route: string, init?: RequestInit, query = '') => timedCall(fetchImpl, now, baseUrl, route, query, init);

  const health = await call('/api/health');
  if (!health.result.ok) return withSkipped([health.result]);

  const read = await call('/api/read', postJson({ imageBase64: Buffer.from(image).toString('base64'), mimeType: 'image/jpeg' }));
  const facts = readBody.safeParse(read.body).data?.facts;
  if (!read.result.ok || !facts) return withSkipped([health.result, failed(read.result)]);

  const easyRead = await call('/api/easy-read', postJson({ facts }));
  const maya = easyReadBody.safeParse(easyRead.body).data?.cards.find((card) => card.maya !== null)?.maya;
  const voice = maya ? (await call('/api/voice', undefined, `?text=${encodeURIComponent(maya)}`)).result : skipped('/api/voice');
  const plan = await call('/api/plan', postJson({ facts }));

  return [health.result, read.result, easyRead.result, voice, plan.result];
}

/** `OK|FAIL <route> <status> <ms>ms [replayed]` */
export function formatLine({ route, ok, status, ms, replayed }: RouteResult): string {
  return `${ok ? 'OK' : 'FAIL'} ${route} ${status} ${Math.round(ms)}ms${replayed ? ' replayed' : ''}`;
}

export function exitCodeOf(results: RouteResult[]): number {
  return results.length > 0 && results.every((result) => result.ok) ? 0 : 1;
}

/** The first argument, then DEMO_BASE_URL, then the Expo dev server default. */
export function baseUrlOf(argv: string[], env: Record<string, string | undefined>): string {
  return argv[2] ?? env.DEMO_BASE_URL ?? DEFAULT_BASE_URL;
}

interface TimedCall {
  result: RouteResult;
  body: unknown;
}

async function timedCall(fetchImpl: Fetch, now: () => number, baseUrl: string, route: string, query: string, init?: RequestInit): Promise<TimedCall> {
  const started = now();
  try {
    const response = await fetchImpl(`${baseUrl}${route}${query}`, { ...init, signal: AbortSignal.timeout(ROUTE_DEADLINE_MS) });
    const body = await bodyOf(response);
    const replayed = response.headers.get('X-Demo-Replay') === '1' || okBody.safeParse(body).data?.replayed === true;
    return { result: { route, ok: isSuccess(response, body), status: response.status, ms: now() - started, replayed }, body };
  } catch {
    return { result: { route, ok: false, status: 0, ms: now() - started, replayed: false }, body: null };
  }
}

/** JSON routes must say ok: true; the voice route must send audio. */
function isSuccess(response: Response, body: unknown): boolean {
  if (!response.ok) return false;
  return body === null ? (response.headers.get('Content-Type') ?? '').startsWith('audio/') : okBody.safeParse(body).success;
}

/** Parsed JSON, or null for audio and anything else. */
async function bodyOf(response: Response): Promise<unknown> {
  if (!(response.headers.get('Content-Type') ?? '').includes('json')) {
    await response.arrayBuffer();
    return null;
  }
  return response.json();
}

function postJson(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function failed(result: RouteResult): RouteResult {
  return { ...result, ok: false };
}

function skipped(route: string): RouteResult {
  return { route, ok: false, status: 0, ms: 0, replayed: false };
}

/** Routes after the first failure never ran: report them as FAIL with status 0. */
function withSkipped(results: RouteResult[]): RouteResult[] {
  return [...results, ...ROUTES.slice(results.length).map(skipped)];
}
