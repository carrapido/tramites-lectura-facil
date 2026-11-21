import Storage from 'expo-sqlite/kv-store';
import { z } from 'zod';

const language = z.enum(['es', 'yua']);

export type Language = z.infer<typeof language>;

const STORAGE_KEY = 'language';
const DEFAULT_LANGUAGE: Language = 'es';

/** The remembered choice, or Spanish when there is none or the store cannot be read. */
export function loadLanguage(): Language {
  const parsed = language.safeParse(readStoredValue());
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
}

export function saveLanguage(choice: Language) {
  // https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
  Storage.setItemSync(STORAGE_KEY, choice);
}

function readStoredValue(): string | null {
  try {
    return Storage.getItemSync(STORAGE_KEY);
  } catch {
    return null;
  }
}
