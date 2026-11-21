import type { AudioCache, VoiceSynthesizer } from './ports';

/** The UI shows this next to every Maya play button (S5). */
export const MACHINE_VOICE_LABEL = 'Voz automática, sin revisar';

/** A card sentence is far shorter; the limit caps the cost of one request (S2). */
export const MAX_VOICE_TEXT = 300;

export interface VoiceDependencies {
  synthesizer: VoiceSynthesizer;
  cache: AudioCache;
  /** Turns a text into its cache key, such as its SHA-256. */
  hash: (text: string) => string;
}

/** Returns the Maya voice for a text as WAV, synthesizing it only on a cache miss (S3, S4). */
export async function getMayaVoice(text: string, { synthesizer, cache, hash }: VoiceDependencies): Promise<Uint8Array> {
  const key = hash(text);
  const cached = await cache.get(key);
  if (cached) return cached;

  const audio = ensureWav(await synthesizer.synthesize(text));
  await cache.set(key, audio);
  return audio;
}

/** Legacy Gemini TTS models return headerless PCM: 16-bit, mono, 24 kHz. */
const PCM_SAMPLE_RATE = 24_000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;
const WAV_HEADER_BYTES = 44;

/** Keeps a full WAV as is; wraps headerless PCM in a 44-byte WAV header (S4). */
export function ensureWav(audio: Uint8Array): Uint8Array {
  return isWav(audio) ? audio : withWavHeader(audio);
}

function isWav(audio: Uint8Array): boolean {
  return readTag(audio, 0) === 'RIFF' && readTag(audio, 8) === 'WAVE';
}

/** Canonical PCM WAV layout: http://soundfile.sapp.org/doc/WaveFormat/ */
function withWavHeader(pcm: Uint8Array): Uint8Array {
  const wav = new Uint8Array(WAV_HEADER_BYTES + pcm.length);
  const header = new DataView(wav.buffer);
  const blockAlign = (PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;

  writeTag(wav, 0, 'RIFF');
  header.setUint32(4, WAV_HEADER_BYTES - 8 + pcm.length, true);
  writeTag(wav, 8, 'WAVE');
  writeTag(wav, 12, 'fmt ');
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, PCM_CHANNELS, true);
  header.setUint32(24, PCM_SAMPLE_RATE, true);
  header.setUint32(28, PCM_SAMPLE_RATE * blockAlign, true);
  header.setUint16(32, blockAlign, true);
  header.setUint16(34, PCM_BITS_PER_SAMPLE, true);
  writeTag(wav, 36, 'data');
  header.setUint32(40, pcm.length, true);
  wav.set(pcm, WAV_HEADER_BYTES);
  return wav;
}

function readTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + 4));
}

function writeTag(bytes: Uint8Array, offset: number, tag: string): void {
  for (let index = 0; index < tag.length; index += 1) bytes[offset + index] = tag.charCodeAt(index);
}
