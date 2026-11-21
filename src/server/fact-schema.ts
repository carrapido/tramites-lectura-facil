import { z } from 'zod';

const unit = z.number().min(0).max(1);

/** The fact shape returned by POST /api/read (objective 3). */
export const factSchema = z.object({
  kind: z.string().min(1),
  text: z.string().min(1),
  sourceQuote: z.string().min(1),
  box: z.object({ x: unit, y: unit, width: unit, height: unit }).optional(),
});

/** POST /api/easy-read and POST /api/plan accept the facts of one notice. */
export const factsRequestSchema = z.object({ facts: z.array(factSchema).min(1).max(7) });
