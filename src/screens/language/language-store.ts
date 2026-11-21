import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

const language = z.enum(['es', 'yua']);

export type Language = z.infer<typeof language>;

const STORAGE_KEY = 'language';
const DEFAULT_LANGUAGE: Language = 'es';

/** Set only when the phone could not store the choice, so the screens still change this session. */
let unsavedChoice: Language | null = null;
const listeners = new Set<() => void>();

/** The current language; screens re-render when it changes in `/idioma`. https://react.dev/reference/react/useSyncExternalStore */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, loadLanguage);
}

/** The remembered choice, or Spanish when there is none or the store cannot be read. */
export function loadLanguage(): Language {
  if (unsavedChoice) return unsavedChoice;
  const parsed = language.safeParse(readStoredValue());
  return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
}

/** Stores the choice and updates the screens; a storage failure is rethrown after the screens changed. */
export function saveLanguage(choice: Language) {
  try {
    // https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
    Storage.setItemSync(STORAGE_KEY, choice);
    unsavedChoice = null;
  } catch (error) {
    unsavedChoice = choice;
    throw error;
  } finally {
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredValue(): string | null {
  try {
    return Storage.getItemSync(STORAGE_KEY);
  } catch {
    return null;
  }
}
