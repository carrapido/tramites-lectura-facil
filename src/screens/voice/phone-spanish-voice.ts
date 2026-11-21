import * as Speech from 'expo-speech';

/** Spanish variants in order of preference; any other `es-*` voice comes after them (field-feedback S4). */
const PREFERRED_TAGS = ['es-mx', 'es-us', 'es-419'];

/** Found once per app session; an empty answer is not remembered, because Android may list voices late. */
let remembered: Speech.Voice | null = null;

/** The phone's best installed Spanish voice, or null when it has none: never the default voice (S4). */
export async function spanishPhoneVoice(): Promise<Speech.Voice | null> {
  if (remembered) return remembered;
  remembered = pickSpanishVoice(await installedVoices());
  return remembered;
}

/** es-MX, then es-US, then es-419, then any es-*; an Enhanced voice first within the same tier. */
export function pickSpanishVoice(voices: readonly Speech.Voice[]): Speech.Voice | null {
  return voices.filter(isSpanish).sort(byPreference)[0] ?? null;
}

/** A failed lookup means no known voice. https://docs.expo.dev/versions/v58.0.0/sdk/speech/#speechgetavailablevoicesasync */
async function installedVoices(): Promise<Speech.Voice[]> {
  try {
    return await Speech.getAvailableVoicesAsync();
  } catch {
    return [];
  }
}

function isSpanish(voice: Speech.Voice): boolean {
  const tag = tagOf(voice);
  return tag === 'es' || tag.startsWith('es-');
}

function byPreference(left: Speech.Voice, right: Speech.Voice): number {
  return tierOf(left) - tierOf(right) || qualityRank(left) - qualityRank(right);
}

function tierOf(voice: Speech.Voice): number {
  const index = PREFERRED_TAGS.indexOf(tagOf(voice));
  return index === -1 ? PREFERRED_TAGS.length : index;
}

function qualityRank(voice: Speech.Voice): number {
  return voice.quality === Speech.VoiceQuality.Enhanced ? 0 : 1;
}

/** Android may report `es_MX`; iOS reports `es-MX`. */
function tagOf(voice: Speech.Voice): string {
  return voice.language.replaceAll('_', '-').toLowerCase();
}
