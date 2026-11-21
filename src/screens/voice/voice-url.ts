import { apiUrl } from '@/screens/api-url';

/** The laptop route that speaks one Maya text as WAV. */
export function mayaVoiceUrl(text: string): string {
  return apiUrl(`/api/voice?text=${encodeURIComponent(text)}`);
}
