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
import { ensureWav } from '@/tramites/voice';

import type { DemoRecordings } from './demo-recordings';

/*
 * DEMO_RECORD=1 decorators (S4): each one calls the real adapter, saves its answer under fixtures/demo/
 * and returns it unchanged. A failed call saves nothing.
 */

export class RecordingNoticeReader implements NoticeReader {
  constructor(
    private readonly inner: NoticeReader,
    private readonly store: DemoRecordings,
  ) {}

  /** An unreadable photo never replaces a good recording of the demo notice. */
  async read(image: NoticeImage): Promise<NoticeReading> {
    const reading = await this.inner.read(image);
    if (reading.readable) await this.store.saveNoticeReading(reading);
    return reading;
  }
}

export class RecordingTranslator implements Translator, BatchTranslator {
  constructor(
    private readonly inner: Translator & BatchTranslator,
    private readonly store: DemoRecordings,
  ) {}

  async translate(request: TranslationRequest): Promise<string> {
    const translation = await this.inner.translate(request);
    await this.store.saveTranslations([{ text: request.text, translation }]);
    return translation;
  }

  async translateAll(request: BatchTranslationRequest): Promise<string[]> {
    const translations = await this.inner.translateAll(request);
    await this.store.saveTranslations(request.texts.map((text, index) => ({ text, translation: translations[index] })));
    return translations;
  }
}

export class RecordingWriter implements PlainLanguageWriter {
  constructor(
    private readonly inner: PlainLanguageWriter,
    private readonly store: DemoRecordings,
  ) {}

  async toPlainSpanish(text: string): Promise<string> {
    const output = await this.inner.toPlainSpanish(text);
    await this.store.savePlainSpanish(text, output);
    return output;
  }
}

export class RecordingVoiceSynthesizer implements VoiceSynthesizer {
  constructor(
    private readonly inner: VoiceSynthesizer,
    private readonly store: DemoRecordings,
  ) {}

  /** Saved as WAV, so the recording plays on its own; the caller still gets the raw bytes. */
  async synthesize(text: string): Promise<Uint8Array> {
    const audio = await this.inner.synthesize(text);
    await this.store.saveVoice(text, ensureWav(audio));
    return audio;
  }
}

export class RecordingPlanProposer implements PlanProposer {
  constructor(
    private readonly inner: PlanProposer,
    private readonly store: DemoRecordings,
  ) {}

  async propose(facts: Fact[]): Promise<Plan> {
    const plan = await this.inner.propose(facts);
    await this.store.savePlan(facts, plan);
    return plan;
  }
}
