import { z } from 'zod';

import { getVoice, MAX_VOICE_TEXT, type VoiceDependencies } from '@/tramites/voice';

import { composeOrNull } from './compose-or-null';
import { REPLAY_HEADER } from './demo-mode';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { invalidRequestResponse } from './request-body';

/** `lang` defaults to Maya, so callers from before Spanish keep working (field-feedback S3). */
const voiceQuery = z.object({
  text: z.string().trim().min(1).max(MAX_VOICE_TEXT),
  lang: z.enum(['yua', 'es']).default('yua'),
});

/** The phone may replay the same card many times in a day without asking the laptop again. */
const CACHE_CONTROL = 'private, max-age=86400';

/** GET /api/voice?text=<text>&lang=yua|es: the voice of one sentence as WAV (S2-S4, field-feedback S3). */
export async function handleVoice(request: Request, compose: () => VoiceDependencies, replayed = false): Promise<Response> {
  const query = voiceQuery.safeParse(queryOf(new URL(request.url).searchParams));
  if (!query.success) return invalidRequestResponse();

  const dependencies = composeOrNull(compose, 'voice');
  if (!dependencies) return configMissingResponse();

  try {
    const audio = await getVoice(query.data.text, query.data.lang, dependencies);
    return new Response(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': CACHE_CONTROL, ...(replayed ? { [REPLAY_HEADER]: '1' } : {}) },
    });
  } catch (error) {
    return googleFailureResponse(error, 'voice');
  }
}

/** A missing parameter is `undefined`, so Zod applies the default; an empty one stays invalid. */
function queryOf(params: URLSearchParams): Record<'text' | 'lang', string | undefined> {
  return { text: params.get('text') ?? undefined, lang: params.get('lang') ?? undefined };
}
