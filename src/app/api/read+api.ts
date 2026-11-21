import { composeNoticeReader, isReplay } from '@/server/composition';
import { handleRead } from '@/server/read-handler';

/** https://docs.expo.dev/router/web/api-routes/ */
export function POST(request: Request): Promise<Response> {
  return handleRead(request, composeNoticeReader, isReplay());
}
