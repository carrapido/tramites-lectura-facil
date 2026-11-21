/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  RecordingNoticeReader,
  RecordingPlanProposer,
  RecordingTranslator,
  RecordingVoiceSynthesizer,
  RecordingWriter,
} from '@/server/demo-recording';
import { DemoRecordings } from '@/server/demo-recordings';
import {
  ReplayNoticeReader,
  ReplayPlanProposer,
  ReplayTranslator,
  ReplayVoiceSynthesizer,
  ReplayWriter,
} from '@/server/demo-replay';
import { sha256 } from '@/server/hash';
import { NotRecordedError } from '@/server/not-recorded-error';
import type { BatchTranslator, Fact, NoticeReading, Plan, Translator } from '@/tramites/ports';

const IMAGE = { base64: 'AAAA', mimeType: 'image/jpeg' as const };

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  { kind: 'lugar', text: 'Vaya a la Tesorería Municipal.', sourceQuote: 'Deberá presentarse en la Tesorería Municipal' },
];

const READING: NoticeReading = { readable: true, category: 'tramite', transcript: 'Aviso ficticio.', facts: FACTS };

const PLAN: Plan = {
  checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'Tesorería Municipal' }],
  reminder: { dueDate: '2026-11-30', title: 'pago del predial', sourceQuote: 'vence el día 30 de noviembre de 2026' },
};

const PCM = new Uint8Array([1, 0, 2, 0]);

let scratch: string;
let store: DemoRecordings;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'demo-recordings-'));
  store = new DemoRecordings(join(scratch, 'demo'));
});

afterEach(() => {
  jest.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(scratch, 'demo', file), 'utf8'));
}

function readText(file: string): string {
  return readFileSync(join(scratch, 'demo', file), 'utf8');
}

function writeRecording(file: string, content: string): void {
  mkdirSync(join(scratch, 'demo'), { recursive: true });
  writeFileSync(join(scratch, 'demo', file), content);
}

function fakeTranslator(map: Record<string, string>): Translator & BatchTranslator {
  return {
    translate: async ({ text }) => map[text],
    translateAll: async ({ texts }) => texts.map((text) => map[text]),
  };
}

const failing = (): Promise<never> => Promise.reject(new Error('boom'));

describe('DemoRecordings file layout (S4)', () => {
  it('defaults to fixtures/demo under the working directory', () => {
    expect(new DemoRecordings().root).toBe(join(process.cwd(), 'fixtures', 'demo'));
  });

  it('writes translations.json keyed by sha256, pretty-printed in stable key order', async () => {
    await store.saveTranslations([
      { text: 'b', translation: 'B' },
      { text: 'a', translation: 'A' },
    ]);

    const expected = Object.fromEntries(
      [
        [sha256('a'), { text: 'a', translation: 'A' }],
        [sha256('b'), { text: 'b', translation: 'B' }],
      ].sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
    expect(readText('translations.json')).toBe(`${JSON.stringify(expected, null, 2)}\n`);
  });

  it('writes plain-spanish.json as sha256(input) -> output and keeps earlier entries', async () => {
    await store.savePlainSpanish('largo uno', 'Corto uno.');
    await store.savePlainSpanish('largo dos', 'Corto dos.');

    expect(readJson('plain-spanish.json')).toEqual({
      [sha256('largo uno')]: 'Corto uno.',
      [sha256('largo dos')]: 'Corto dos.',
    });
  });

  it('keeps every entry when saves run concurrently', async () => {
    await Promise.all([store.savePlainSpanish('x', 'X.'), store.savePlainSpanish('y', 'Y.'), store.savePlainSpanish('z', 'Z.')]);

    expect(Object.keys(readJson('plain-spanish.json') as object)).toHaveLength(3);
  });

  it('writes notice-reading.json and plan.json keyed by sha256 of the quotes', async () => {
    await store.saveNoticeReading(READING);
    await store.savePlan(FACTS, PLAN);

    expect(readJson('notice-reading.json')).toEqual(READING);
    expect(readJson('plan.json')).toEqual({ [sha256(JSON.stringify(FACTS.map((fact) => fact.sourceQuote)))]: PLAN });
  });

  it('writes voice/<sha256>.wav', async () => {
    await store.saveVoice('Maya', new Uint8Array([82, 73, 70, 70]));

    expect(Array.from(readFileSync(join(scratch, 'demo', 'voice', `${sha256('Maya')}.wav`)))).toEqual([82, 73, 70, 70]);
  });

  it('leaves no temporary file behind (atomic write)', async () => {
    await store.saveNoticeReading(READING);
    await store.saveTranslations([{ text: 'a', translation: 'A' }]);

    expect(readdirSync(join(scratch, 'demo')).sort()).toEqual(['notice-reading.json', 'translations.json']);
  });

  it('rejects a recording that does not match its schema', async () => {
    writeRecording('notice-reading.json', JSON.stringify({ readable: 'yes', transcript: '', facts: [] }));

    await expect(store.noticeReading()).rejects.toThrow();
  });

  it('returns null for anything not recorded yet', async () => {
    expect(await store.noticeReading()).toBeNull();
    expect(await store.translation('a')).toBeNull();
    expect(await store.plainSpanish('a')).toBeNull();
    expect(await store.plan(FACTS)).toBeNull();
    expect(await store.voice('a')).toBeNull();
  });
});

describe('Recording decorators (S4)', () => {
  it('stores a readable notice reading and returns it unchanged', async () => {
    const reader = new RecordingNoticeReader({ read: async () => READING }, store);

    expect(await reader.read(IMAGE)).toBe(READING);
    expect(await store.noticeReading()).toEqual(READING);
  });

  it('does not overwrite the recording with an unreadable reading', async () => {
    await store.saveNoticeReading(READING);
    const reader = new RecordingNoticeReader({ read: async () => ({ readable: false, category: 'otro', transcript: '', facts: [] }) }, store);

    await reader.read(IMAGE);

    expect(await store.noticeReading()).toEqual(READING);
  });

  it('stores every batch translation and a single translation', async () => {
    const translator = new RecordingTranslator(fakeTranslator({ uno: 'jun', dos: "ka'a", tres: 'óox' }), store);

    expect(await translator.translateAll({ texts: ['uno', 'dos'], from: 'es', to: 'yua' })).toEqual(['jun', "ka'a"]);
    expect(await translator.translate({ text: 'tres', from: 'es', to: 'yua' })).toBe('óox');
    expect(await store.translation('uno')).toBe('jun');
    expect(await store.translation('dos')).toBe("ka'a");
    expect(await store.translation('tres')).toBe('óox');
  });

  it('stores the plain Spanish rewrite', async () => {
    const writer = new RecordingWriter({ toPlainSpanish: async () => 'Corto.' }, store);

    expect(await writer.toPlainSpanish('largo')).toBe('Corto.');
    expect(await store.plainSpanish('largo')).toBe('Corto.');
  });

  it('stores the voice as WAV and returns the raw audio unchanged', async () => {
    const voice = new RecordingVoiceSynthesizer({ synthesize: async () => PCM }, store);

    expect(await voice.synthesize('Maya')).toBe(PCM);
    const recorded = (await store.voice('Maya')) ?? new Uint8Array();
    expect(String.fromCharCode(...recorded.slice(0, 4))).toBe('RIFF');
    expect(Array.from(recorded.slice(44))).toEqual(Array.from(PCM));
  });

  it('stores the plan for the facts', async () => {
    const proposer = new RecordingPlanProposer({ propose: async () => PLAN }, store);

    expect(await proposer.propose(FACTS)).toBe(PLAN);
    expect(await store.plan(FACTS)).toEqual(PLAN);
  });

  it('stores nothing when the real adapter fails', async () => {
    await expect(new RecordingWriter({ toPlainSpanish: failing }, store).toPlainSpanish('largo')).rejects.toThrow('boom');
    await expect(new RecordingPlanProposer({ propose: failing }, store).propose(FACTS)).rejects.toThrow('boom');

    expect(await store.plainSpanish('largo')).toBeNull();
    expect(await store.plan(FACTS)).toBeNull();
  });
});

describe('Replay adapters (S5)', () => {
  it('return what was recorded', async () => {
    await store.saveNoticeReading(READING);
    await store.saveTranslations([
      { text: 'uno', translation: 'jun' },
      { text: 'dos', translation: "ka'a" },
    ]);
    await store.savePlainSpanish('largo', 'Corto.');
    await store.savePlan(FACTS, PLAN);
    await store.saveVoice('Maya', new Uint8Array([82, 73, 70, 70]));

    expect(await new ReplayNoticeReader(store).read(IMAGE)).toEqual(READING);
    expect(await new ReplayTranslator(store).translateAll({ texts: ['dos', 'uno'], from: 'es', to: 'yua' })).toEqual(["ka'a", 'jun']);
    expect(await new ReplayTranslator(store).translate({ text: 'uno', from: 'es', to: 'yua' })).toBe('jun');
    expect(await new ReplayWriter(store).toPlainSpanish('largo')).toBe('Corto.');
    expect(await new ReplayPlanProposer(store).propose(FACTS)).toEqual(PLAN);
    expect(Array.from(await new ReplayVoiceSynthesizer(store).synthesize('Maya'))).toEqual([82, 73, 70, 70]);
  });

  it('return the single recorded plan for any facts', async () => {
    await store.savePlan(FACTS, PLAN);

    expect(await new ReplayPlanProposer(store).propose([FACTS[0]])).toEqual(PLAN);
  });

  it('throw NotRecordedError for unknown facts when several plans are recorded', async () => {
    await store.savePlan(FACTS, PLAN);
    await store.savePlan([FACTS[1]], { checklist: [], reminder: null });

    await expect(new ReplayPlanProposer(store).propose([FACTS[0]])).rejects.toBeInstanceOf(NotRecordedError);
  });

  it('throw NotRecordedError when anything is missing', async () => {
    await store.saveTranslations([{ text: 'uno', translation: 'jun' }]);

    await expect(new ReplayNoticeReader(store).read(IMAGE)).rejects.toBeInstanceOf(NotRecordedError);
    await expect(
      new ReplayTranslator(store).translateAll({ texts: ['uno', 'dos'], from: 'es', to: 'yua' }),
    ).rejects.toBeInstanceOf(NotRecordedError);
    await expect(new ReplayTranslator(store).translate({ text: 'dos', from: 'es', to: 'yua' })).rejects.toBeInstanceOf(NotRecordedError);
    await expect(new ReplayWriter(store).toPlainSpanish('largo')).rejects.toBeInstanceOf(NotRecordedError);
    await expect(new ReplayPlanProposer(store).propose(FACTS)).rejects.toBeInstanceOf(NotRecordedError);
    await expect(new ReplayVoiceSynthesizer(store).synthesize('Maya')).rejects.toBeInstanceOf(NotRecordedError);
  });
});

describe('Notice reading category (context-categories S2)', () => {
  it('stores the category of the recorded reading', async () => {
    await new RecordingNoticeReader({ read: async () => ({ ...READING, category: 'reunion' }) }, store).read(IMAGE);

    expect(readJson('notice-reading.json')).toEqual(expect.objectContaining({ category: 'reunion' }));
    expect((await new ReplayNoticeReader(store).read(IMAGE)).category).toBe('reunion');
  });

  it.each([
    ['without a category', { readable: true, transcript: 'Aviso ficticio.', facts: FACTS }],
    ['with an unknown category', { readable: true, category: 'banco', transcript: 'Aviso ficticio.', facts: FACTS }],
  ])('replays an old recording %s as otro', async (_name, recording) => {
    writeRecording('notice-reading.json', JSON.stringify(recording));

    expect(await new ReplayNoticeReader(store).read(IMAGE)).toEqual({ ...READING, category: 'otro' });
  });
});
