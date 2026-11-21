import { composePlan } from '@/server/composition';
import { handlePlan } from '@/server/plan-handler';

/** https://docs.expo.dev/router/web/api-routes/ */
export function POST(request: Request): Promise<Response> {
  return handlePlan(request, composePlan);
}
