/**
 * @jest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MemoryAudioCache } from '@/server/audio-cache';
import { RecordingNoticeReader } from '@/server/demo-recording';
import { DemoRecordings } from '@/server/demo-recordings';
import {
  ReplayNoticeReader,
  ReplayPlanProposer,
  ReplayTranslator,
  ReplayVoiceSynthesizer,
  ReplayWriter,
} from '@/server/demo-replay';
import { handleEasyRead } from '@/server/easy-read-handler';
import { sha256 } from '@/server/hash';
import { handlePlan } from '@/server/plan-handler';
import { handleRead } from '@/server/read-handler';
import { handleSmoke } from '@/server/smoke-handler';
import { handleVoice } from '@/server/voice-handler';
import type { Fact, NoticeReading, Plan } from '@/tramites/ports';

const FIXTURES = join(__dirname, '..', '..', '..', 'fixtures');
const TRANSCRIPT = readFileSync(join(FIXTURES, 'aviso-ficticio.txt'), 'utf8');
const PHOTO = readFileSync(join(FIXTURES, 'aviso-ficticio.jpg')).toString('base64');

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  { kind: 'lugar', text: 'Vaya a la Tesorería Municipal.', sourceQuote: 'Deberá presentarse en la Tesorería Municipal' },
];

const INVENTED: Fact = { kind: 'monto', text: 'Debe pagar 9,999 pesos.', sourceQuote: 'El monto es de $9,999.00' };

const LONG_FACT: Fact = {
  kind: 'recargo',
  text: 'Si usted no paga en la fecha indicada se generarán recargos del dos por ciento cada mes',
  sourceQuote: 'se generarán recargos del 2% mensual',
};

const READING: NoticeReading = { readable: true, category: 'tramite', transcript: TRANSCRIPT, facts: [...FACTS, INVENTED] };

const PLAN: Plan = {
  checklist: [
    { text: 'Lleve este aviso.', sourceQuote: 'Deberá presentarse en la Tesorería Municipal' },
    { text: 'Lleve su acta de nacimiento.', sourceQuote: 'acta de nacimiento' },
  ],
  reminder: { dueDate: '2026-11-30', title: 'pago del predial', sourceQuote: 'vence el día 30 de noviembre de 2026' },
};

const MAYA = ["Bo'ot ka'aj 30.", 'Xi’ik Tesorería.'];
const WAV = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]);

let scratch: string;
let store: DemoRecordings;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'demo-replay-'));
  store = new DemoRecordings(join(scratch, 'demo'));
});

afterEach(() => {
  jest.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

function post(path: string, body: unknown): Request {
  return new Request(`http://laptop${path}`, { method: 'POST', body: JSON.stringify(body) });
}

const readRequest = () => post('/api/read', { imageBase64: PHOTO, mimeType: 'image/jpeg' });
const factsRequest = (path: string, facts: Fact[]) => post(path, { facts });
const voiceRequest = (text: string) => new Request(`http://laptop/api/voice?text=${encodeURIComponent(text)}`);

const replayText = () => ({ writer: new ReplayWriter(store), translator: new ReplayTranslator(store) });
const replayPlan = () => ({ proposer: new ReplayPlanProposer(store), today: '2026-11-21' });
const replayVoice = () => ({ synthesizer: new ReplayVoiceSynthesizer(store), cache: new MemoryAudioCache(), hash: sha256 });

const NOT_RECORDED = { ok: false, reason: 'not-recorded' };

async function expectNotRecorded(response: Response): Promise<void> {
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual(NOT_RECORDED);
}

describe('POST /api/read in replay (S5)', () => {
  it('answers from the recording through the traceability rule, marked replayed', async () => {
    await store.saveNoticeReading(READING);

    const response = await handleRead(readRequest(), () => new ReplayNoticeReader(store), true);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, category: 'tramite', facts: FACTS, replayed: true });
  });

  it('returns 404 not-recorded without a recording', async () => {
    await expectNotRecorded(await handleRead(readRequest(), () => new ReplayNoticeReader(store), true));
  });

  it('replays what a recording run returned (S4, S5)', async () => {
    const live = await handleRead(readRequest(), () => new RecordingNoticeReader({ read: async () => READING }, store));
    const replayed = await handleRead(readRequest(), () => new ReplayNoticeReader(store), true);

    const liveBody = await live.json();
    expect(liveBody).toEqual({ ok: true, category: 'tramite', facts: FACTS });
    expect(await replayed.json()).toEqual({ ...liveBody, replayed: true });
  });
});

describe('POST /api/easy-read in replay (S5)', () => {
  it('returns recorded Maya cards marked replayed', async () => {
    await store.saveTranslations(FACTS.map((fact, index) => ({ text: fact.text, translation: MAYA[index] })));

    const response = await handleEasyRead(factsRequest('/api/easy-read', FACTS), replayText, true);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.replayed).toBe(true);
    expect(body.cards.map((card: { maya: string }) => card.maya)).toEqual(MAYA);
  });

  it('uses the recorded rewrite for a fact over 15 words', async () => {
    await store.savePlainSpanish(LONG_FACT.text, 'Si no paga a tiempo, pagará más.');
    await store.saveTranslations([{ text: 'Si no paga a tiempo, pagará más.', translation: "Wa ma' a bo'otike'." }]);

    const response = await handleEasyRead(factsRequest('/api/easy-read', [LONG_FACT]), replayText, true);

    expect((await response.json()).cards[0]).toEqual(
      expect.objectContaining({ plainSpanish: 'Si no paga a tiempo, pagará más.', maya: "Wa ma' a bo'otike'." }),
    );
  });

  it('returns 404 not-recorded when the rewrite was never recorded', async () => {
    await expectNotRecorded(await handleEasyRead(factsRequest('/api/easy-read', [LONG_FACT]), replayText, true));
  });
});

describe('POST /api/plan in replay (S5)', () => {
  it('returns the recorded plan through the traceability rule, marked replayed', async () => {
    await store.savePlan(FACTS, PLAN);

    const response = await handlePlan(factsRequest('/api/plan', FACTS), replayPlan, true);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      plan: { checklist: [PLAN.checklist[0]], reminder: PLAN.reminder },
      replayed: true,
    });
  });

  it('returns 404 not-recorded without a recorded plan', async () => {
    await expectNotRecorded(await handlePlan(factsRequest('/api/plan', FACTS), replayPlan, true));
  });
});

describe('GET /api/voice in replay (S5)', () => {
  it('returns the recorded WAV with X-Demo-Replay: 1', async () => {
    await store.saveVoice(MAYA[0], WAV);

    const response = await handleVoice(voiceRequest(MAYA[0]), replayVoice, true);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/wav');
    expect(response.headers.get('X-Demo-Replay')).toBe('1');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(WAV));
  });

  it('returns 404 not-recorded for a text never recorded', async () => {
    await expectNotRecorded(await handleVoice(voiceRequest('Mix tu’ux'), replayVoice, true));
  });

  it('has no X-Demo-Replay header outside replay', async () => {
    const response = await handleVoice(voiceRequest(MAYA[0]), () => ({
      synthesizer: { synthesize: async () => WAV },
      cache: new MemoryAudioCache(),
      hash: sha256,
    }));

    expect(response.headers.get('X-Demo-Replay')).toBeNull();
  });
});

describe('GET /api/smoke in replay', () => {
  it('maps a missing recording to 404 not-recorded through the shared failure mapping', async () => {
    await expectNotRecorded(await handleSmoke(replayText));
  });
});

describe('MemoryAudioCache', () => {
  it('returns what it stored and null otherwise', async () => {
    const cache = new MemoryAudioCache();
    await cache.set('k', WAV);

    expect(await cache.get('k')).toBe(WAV);
    expect(await cache.get('other')).toBeNull();
  });
});
