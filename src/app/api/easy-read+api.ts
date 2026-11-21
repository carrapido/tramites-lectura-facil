import { composeEasyRead } from '@/server/composition';
import { handleEasyRead } from '@/server/easy-read-handler';

/** https://docs.expo.dev/router/web/api-routes/ */
export function POST(request: Request): Promise<Response> {
  return handleEasyRead(request, composeEasyRead);
}
