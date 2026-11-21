import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleGenAI } from '@google/genai';

import type { EasyReadDependencies } from '@/tramites/easy-read';
import type { PlanDependencies } from '@/tramites/plan';
import type {
  AudioCache,
  BatchTranslator,
  NoticeReader,
  PlainLanguageWriter,
  PlanProposer,
  Translator,
  VoiceSynthesizer,
} from '@/tramites/ports';
import type { SmokeDependencies } from '@/tramites/smoke';
import type { VoiceDependencies } from '@/tramites/voice';

import { FileAudioCache, MemoryAudioCache } from './audio-cache';
import { CloudTranslator } from './cloud-translator';
import { readDemoMode } from './demo-mode';
import {
  RecordingNoticeReader,
  RecordingPlanProposer,
  RecordingTranslator,
  RecordingVoiceSynthesizer,
  RecordingWriter,
} from './demo-recording';
import { DemoRecordings } from './demo-recordings';
import { ReplayNoticeReader, ReplayPlanProposer, ReplayTranslator, ReplayVoiceSynthesizer, ReplayWriter } from './demo-replay';
import { GeminiNoticeReader } from './gemini-notice-reader';
import { GeminiPlanProposer } from './gemini-plan-proposer';
import { GeminiVoiceSynthesizer } from './gemini-voice';
import { GeminiPlainLanguageWriter } from './gemini-writer';
import { readGoogleEnv } from './google-env';
import { sha256 } from './hash';
import { localDateIn, NOTICE_TIME_ZONE } from './local-date';

/** Read once per dev-server process: `npm run demo:record` or `npm run demo:replay` (S4, S5). */
const demoMode = readDemoMode(process.env);

const recordings = new DemoRecordings();

/**
 * One cache per dev-server process, so its memory copy survives across requests.
 * Demo modes skip `.cache/voice`, so every voice is recorded and every replay comes from fixtures/demo.
 */
const voiceCache: AudioCache = demoMode === 'live' ? new FileAudioCache() : new MemoryAudioCache();

/** Gemini 3.8 TTS models are served on the global location. https://docs.cloud.google.com/text-to-speech/docs/gemini-tts */
const TTS_LOCATION = 'global';

interface TextAdapters {
  writer: PlainLanguageWriter;
  translator: Translator & BatchTranslator;
}

/** Replay answers carry `replayed: true` or the X-Demo-Replay header (S5). */
export function isReplay(): boolean {
  return demoMode === 'replay';
}

/** Wires Google adapters with Application Default Credentials, no API keys; demo modes wrap or replace them. */
export function composeSmokeDependencies(): SmokeDependencies {
  return composeTextAdapters();
}

export function composeEasyRead(): EasyReadDependencies {
  return composeTextAdapters();
}

export function composeNoticeReader(): NoticeReader {
  return byDemoMode<NoticeReader>(
    () => new ReplayNoticeReader(recordings),
    () => {
      const { project, location } = readGoogleEnv(process.env);
      return new GeminiNoticeReader(createGeminiModels(project, location));
    },
    (reader) => new RecordingNoticeReader(reader, recordings),
  );
}

/** `today` is read per request, so a dev server left running past midnight stays correct (S3). */
export function composePlan(): PlanDependencies {
  const proposer = byDemoMode<PlanProposer>(
    () => new ReplayPlanProposer(recordings),
    () => {
      const { project, location } = readGoogleEnv(process.env);
      return new GeminiPlanProposer(createGeminiModels(project, location));
    },
    (real) => new RecordingPlanProposer(real, recordings),
  );
  return { proposer, today: localDateIn(NOTICE_TIME_ZONE, new Date()) };
}

export function composeVoice(): VoiceDependencies {
  const synthesizer = byDemoMode<VoiceSynthesizer>(
    () => new ReplayVoiceSynthesizer(recordings),
    () => new GeminiVoiceSynthesizer(createGeminiModels(readGoogleEnv(process.env).project, TTS_LOCATION)),
    (real) => new RecordingVoiceSynthesizer(real, recordings),
  );
  return { synthesizer, cache: voiceCache, hash: sha256 };
}

function composeTextAdapters(): TextAdapters {
  return byDemoMode<TextAdapters>(
    () => ({ writer: new ReplayWriter(recordings), translator: new ReplayTranslator(recordings) }),
    () => {
      const { project, location } = readGoogleEnv(process.env);
      return {
        writer: new GeminiPlainLanguageWriter(createGeminiModels(project, location)),
        translator: new CloudTranslator(new TranslationServiceClient(), project),
      };
    },
    ({ writer, translator }) => ({
      writer: new RecordingWriter(writer, recordings),
      translator: new RecordingTranslator(translator, recordings),
    }),
  );
}

/** The one place that picks real, recording or replay adapters. Replay never builds a Google client, so it needs no ADC. */
function byDemoMode<T>(replay: () => T, real: () => T, record: (real: T) => T): T {
  if (demoMode === 'replay') return replay();
  const adapter = real();
  return demoMode === 'record' ? record(adapter) : adapter;
}

function createGeminiModels(project: string, location: string): GoogleGenAI['models'] {
  // vertexai: true routes Gemini through Agent Platform (Vertex AI). https://github.com/googleapis/js-genai
  return new GoogleGenAI({ vertexai: true, project, location }).models;
}
