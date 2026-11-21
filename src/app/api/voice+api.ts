import { composeVoice, isReplay } from '@/server/composition';
import { handleVoice } from '@/server/voice-handler';

/** https://docs.expo.dev/router/web/api-routes/ */
export function GET(request: Request): Promise<Response> {
  return handleVoice(request, composeVoice, isReplay());
}
