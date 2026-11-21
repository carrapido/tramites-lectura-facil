import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { z } from 'zod';

import type { Fact, NoticeReading, Plan } from '@/tramites/ports';

import { factSchema, lenientCategorySchema } from './fact-schema';
import { sha256 } from './hash';

export interface RecordedTranslation {
  text: string;
  translation: string;
}

/** Recordings made before categories existed have none; they replay as "otro" (context-categories S2). */
const noticeReadingSchema = z.object({
  readable: z.boolean(),
  category: lenientCategorySchema,
  transcript: z.string(),
  facts: z.array(factSchema),
});

const translationsSchema = z.record(z.string(), z.object({ text: z.string(), translation: z.string().min(1) }));

const plainSpanishSchema = z.record(z.string(), z.string().min(1));

const planSchema = z.object({
  checklist: z.array(z.object({ text: z.string(), sourceQuote: z.string() })),
  reminder: z
    .object({ dueDate: z.string(), title: z.string(), place: z.string().optional(), sourceQuote: z.string() })
    .nullable(),
});

const plansSchema = z.record(z.string(), planSchema);

const NOTICE_READING = 'notice-reading.json';
const TRANSLATIONS = 'translations.json';
const PLAIN_SPANISH = 'plain-spanish.json';
const PLANS = 'plan.json';
const VOICE = 'voice';

/**
 * Google answers for the fictitious notice, saved under fixtures/demo/ and committed (S4).
 * Every recording is validated with Zod when read; writes are atomic and run one at a time.
 */
export class DemoRecordings {
  private writes: Promise<void> = Promise.resolve();

  constructor(readonly root = join(process.cwd(), 'fixtures', 'demo')) {}

  /** One reading for the demo notice; replay returns it for any photo. */
  async noticeReading(): Promise<NoticeReading | null> {
    return readJsonOrNull(this.fileOf(NOTICE_READING), noticeReadingSchema);
  }

  saveNoticeReading(reading: NoticeReading): Promise<void> {
    return this.serialized(() => writeJsonAtomically(this.fileOf(NOTICE_READING), reading));
  }

  async translation(text: string): Promise<string | null> {
    const translations = await this.readMap(TRANSLATIONS, translationsSchema);
    return translations[sha256(text)]?.translation ?? null;
  }

  saveTranslations(pairs: RecordedTranslation[]): Promise<void> {
    return this.updateMap(TRANSLATIONS, translationsSchema, pairs.map((pair) => [sha256(pair.text), pair]));
  }

  async plainSpanish(text: string): Promise<string | null> {
    const rewrites = await this.readMap(PLAIN_SPANISH, plainSpanishSchema);
    return rewrites[sha256(text)] ?? null;
  }

  savePlainSpanish(text: string, output: string): Promise<void> {
    return this.updateMap(PLAIN_SPANISH, plainSpanishSchema, [[sha256(text), output]]);
  }

  /** The plan for these facts' quotes; a single recorded plan answers any facts. */
  async plan(facts: Fact[]): Promise<Plan | null> {
    const plans = await this.readMap(PLANS, plansSchema);
    const recorded = Object.values(plans);
    return plans[planKey(facts)] ?? (recorded.length === 1 ? recorded[0] : null);
  }

  savePlan(facts: Fact[], plan: Plan): Promise<void> {
    return this.updateMap(PLANS, plansSchema, [[planKey(facts), plan]]);
  }

  async voice(text: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.voiceFileOf(text)));
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  saveVoice(text: string, audio: Uint8Array): Promise<void> {
    return this.serialized(() => writeAtomically(this.voiceFileOf(text), audio));
  }

  private async readMap<T>(name: string, schema: z.ZodType<Record<string, T>>): Promise<Record<string, T>> {
    return (await readJsonOrNull(this.fileOf(name), schema)) ?? {};
  }

  /** Read, merge and write inside the queue, so concurrent saves never lose an entry. */
  private updateMap<T>(name: string, schema: z.ZodType<Record<string, T>>, entries: [string, T][]): Promise<void> {
    return this.serialized(async () => {
      const merged = { ...(await this.readMap(name, schema)), ...Object.fromEntries(entries) };
      await writeJsonAtomically(this.fileOf(name), sortedByKey(merged));
    });
  }

  private serialized(write: () => Promise<void>): Promise<void> {
    const next = this.writes.then(write);
    this.writes = next.catch(() => undefined);
    return next;
  }

  private fileOf(name: string): string {
    return join(this.root, name);
  }

  private voiceFileOf(text: string): string {
    return join(this.root, VOICE, `${sha256(text)}.wav`);
  }
}

function planKey(facts: Fact[]): string {
  return sha256(JSON.stringify(facts.map((fact) => fact.sourceQuote)));
}

async function readJsonOrNull<T>(file: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    return schema.parse(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function writeJsonAtomically(file: string, value: unknown): Promise<void> {
  return writeAtomically(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Writes a sibling temporary file, then renames it over the target. https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisesrenameoldpath-newpath */
async function writeAtomically(file: string, content: string | Uint8Array): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, file);
}

/** Stable key order keeps recording diffs small. */
function sortedByKey<T>(map: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => (left < right ? -1 : 1)));
}

const errorWithCode = z.object({ code: z.string() });

function isMissingFile(error: unknown): boolean {
  return errorWithCode.safeParse(error).data?.code === 'ENOENT';
}
