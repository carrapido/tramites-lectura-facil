import type {
  BatchTranslationRequest,
  BatchTranslator,
  Fact,
  NoticeImage,
  NoticeReader,
  NoticeReading,
  Plan,
  PlainLanguageWriter,
  PlanProposer,
  TranslationRequest,
  Translator,
  VoiceSynthesizer,
} from '@/tramites/ports';

import type { DemoRecordings } from './demo-recordings';
import { NotRecordedError } from './not-recorded-error';

/*
 * DEMO_REPLAY=1 adapters (S5): they answer from fixtures/demo/ and never call Google.
 * The domain rules still run on their answers. A missing recording throws NotRecordedError.
 */

export class ReplayNoticeReader implements NoticeReader {
  constructor(private readonly store: DemoRecordings) {}

  /** The demo has one notice, so its reading answers any photo. */
  async read(_image: NoticeImage): Promise<NoticeReading> {
    return recordedOrThrow(await this.store.noticeReading(), 'the notice reading');
  }
}

export class ReplayTranslator implements Translator, BatchTranslator {
  constructor(private readonly store: DemoRecordings) {}

  async translate({ text }: TranslationRequest): Promise<string> {
    return recordedOrThrow(await this.store.translation(text), 'a translation');
  }

  async translateAll({ texts, from, to }: BatchTranslationRequest): Promise<string[]> {
    return Promise.all(texts.map((text) => this.translate({ text, from, to })));
  }
}

export class ReplayWriter implements PlainLanguageWriter {
  constructor(private readonly store: DemoRecordings) {}

  async toPlainSpanish(text: string): Promise<string> {
    return recordedOrThrow(await this.store.plainSpanish(text), 'a plain Spanish rewrite');
  }
}

export class ReplayVoiceSynthesizer implements VoiceSynthesizer {
  constructor(private readonly store: DemoRecordings) {}

  async synthesize(text: string): Promise<Uint8Array> {
    return recordedOrThrow(await this.store.voice(text), 'a voice');
  }
}

export class ReplayPlanProposer implements PlanProposer {
  constructor(private readonly store: DemoRecordings) {}

  async propose(facts: Fact[]): Promise<Plan> {
    return recordedOrThrow(await this.store.plan(facts), 'a plan');
  }
}

function recordedOrThrow<T>(recorded: T | null, what: string): T {
  if (recorded === null) throw new NotRecordedError(what);
  return recorded;
}
