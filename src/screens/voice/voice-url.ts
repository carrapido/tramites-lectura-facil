import { apiUrl } from '@/screens/api-url';
import type { LanguageCode } from '@/tramites/ports';

/** The laptop route that speaks one Maya text as WAV; it has no `lang`, so the server's Maya default applies. */
export function mayaVoiceUrl(text: string): string {
  return apiUrl(`/api/voice?text=${encodeURIComponent(text)}`);
}

/** The laptop route that speaks one text in one language as WAV (field-feedback S3). */
export function voiceUrl(text: string, language: LanguageCode): string {
  return apiUrl(`/api/voice?text=${encodeURIComponent(text)}&lang=${language}`);
}
