/** Kinds of paper the app recognizes from their context (odd/tasks/context-categories.md, S2). */
export const CATEGORIES = ['tramite', 'reunion', 'salud', 'nota', 'otro'] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 'otro';

/** Spanish name shown on screen and read by the screen reader. */
export const CATEGORY_LABEL: Record<Category, string> = {
  tramite: 'Trámite',
  reunion: 'Reunión',
  salud: 'Salud',
  nota: 'Nota',
  otro: 'Otro',
};

const REVIEW_ORIGINAL = 'Revise el papel original';

/** Harm-mitigation notice per category (S4). */
export const CATEGORY_NOTICE: Record<Category, string> = {
  tramite: 'Esto no es asesoría legal',
  reunion: REVIEW_ORIGINAL,
  salud: 'No sustituye a su médico',
  nota: REVIEW_ORIGINAL,
  otro: REVIEW_ORIGINAL,
};

/** Notice shown before any paper has been read. */
/** Line under the photo button before any reading: what can be photographed. */
export const NOTICE_BEFORE_READING = 'Texto, papel o trámite';

export function toCategory(value: unknown): Category {
  return isCategory(value) ? value : DEFAULT_CATEGORY;
}

function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}
