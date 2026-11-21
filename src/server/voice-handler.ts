import { z } from 'zod';

import { getMayaVoice, MAX_VOICE_TEXT, type VoiceDependencies } from '@/tramites/voice';

import { composeOrNull } from './compose-or-null';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { invalidRequestResponse } from './request-body';

const voiceQuery = z.object({ text: z.string().trim().min(1).max(MAX_VOICE_TEXT) });

/** The phone may replay the same card many times in a day without asking the laptop again. */
const CACHE_CONTROL = 'private, max-age=86400';

/** GET /api/voice?text=<maya>: the Maya voice of one card as WAV (S2-S4). */
export async function handleVoice(request: Request, compose: () => VoiceDependencies): Promise<Response> {
  const query = voiceQuery.safeParse({ text: new URL(request.url).searchParams.get('text') ?? undefined });
  if (!query.success) return invalidRequestResponse();

  const dependencies = composeOrNull(compose, 'voice');
  if (!dependencies) return configMissingResponse();

  try {
    const audio = await getMayaVoice(query.data.text, dependencies);
    return new Response(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    return googleFailureResponse(error, 'voice');
  }
}
