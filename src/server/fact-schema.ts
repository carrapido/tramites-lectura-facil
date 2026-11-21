import { z } from 'zod';

import { CATEGORIES, DEFAULT_CATEGORY, toCategory } from '@/tramites/category';

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

type UnitBox = { x: number; y: number; width: number; height: number };

const GEMINI_BOX_SCALE = 1000;
const rawBox = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });

/**
 * Facts as Gemini writes them. Gemini often gives boxes on its native 0–1000 scale,
 * and a box is optional context, so it is normalized or dropped, never allowed to fail the reading.
 */
export const geminiFactSchema = factSchema.extend({ box: z.unknown().optional().transform(toUnitBox) });

function toUnitBox(value: unknown): UnitBox | undefined {
  const parsed = rawBox.safeParse(value);
  if (!parsed.success) return undefined;
  const values = Object.values(parsed.data);
  if (values.some((n) => !Number.isFinite(n) || n < 0)) return undefined;
  if (values.every((n) => n <= 1)) return parsed.data;
  if (values.every((n) => n <= GEMINI_BOX_SCALE)) return scaleBox(parsed.data, GEMINI_BOX_SCALE);
  return undefined;
}

function scaleBox(box: UnitBox, scale: number): UnitBox {
  return { x: box.x / scale, y: box.y / scale, width: box.width / scale, height: box.height / scale };
}

/** POST /api/plan also takes the paper's category; absent means "otro" (context-categories S5). */
export const planRequestSchema = factsRequestSchema.extend({ category: z.enum(CATEGORIES).default(DEFAULT_CATEGORY) });

/**
 * A category written by Gemini or found in an old recording. Capitals, spaces and accents are forgiven;
 * anything else, or a missing value, becomes "otro" instead of failing the reading (context-categories S2).
 */
export const lenientCategorySchema = z
  .unknown()
  .optional()
  .transform((value) => toCategory(typeof value === 'string' ? asCategoryWord(value) : value));

function asCategoryWord(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '');
}
