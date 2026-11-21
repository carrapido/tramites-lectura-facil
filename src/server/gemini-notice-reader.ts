import { ThinkingLevel } from '@google/genai';
import { z } from 'zod';

import type { NoticeImage, NoticeReader, NoticeReading } from '@/tramites/ports';

import { geminiFactSchema, lenientCategorySchema } from './fact-schema';
import { GEMINI_MODEL, type GenerateContentClient } from './gemini-writer';
import { withCredentialMapping } from './google-errors';

const INSTRUCTION = [
  'Lee la foto de un papel: aviso oficial, invitación a una reunión o evento, receta o cita médica,',
  'nota de la escuela o de la comunidad, u otro papel.',
  'Responde solo con JSON: {"readable": boolean, "category": string, "transcript": string, "facts": [...]}.',
  '"readable" es false si la foto no se puede leer; entonces "transcript" es "" y "facts" es [].',
  'Agrega "textFound": boolean y "seen"?: string.',
  '"textFound" es false si la foto no muestra ningún texto, ni borroso; entonces "readable" es false.',
  'Si "textFound" es false, "seen" dice qué muestra la foto en español, de 2 a 6 palabras,',
  'en minúsculas y con artículo, por ejemplo "una taza de café" o "un perro en un sillón".',
  '"seen" nunca lleva nombres de personas ni datos personales.',
  '"category" es una de estas palabras, según el contexto del papel:',
  '"tramite" para un aviso oficial, cobro o trámite de gobierno;',
  '"reunion" para una invitación a una reunión, asamblea o evento;',
  '"salud" para una receta, cita médica o indicación de salud;',
  '"nota" para una nota o mensaje general de la escuela, el trabajo o la comunidad;',
  '"otro" si no es ninguno de los anteriores.',
  '"transcript" es el texto del papel copiado literalmente, sin corregir nada.',
  '"facts" tiene de 3 a 7 hechos importantes: fechas, horas, montos, lugares, documentos, indicaciones y consecuencias.',
  'Cada hecho es {"kind": string, "text": string, "sourceQuote": string, "box"?: {"x", "y", "width", "height"}}.',
  '"text" es una oración en español sencillo de 15 palabras o menos que usa "usted".',
  '"sourceQuote" es un fragmento copiado exactamente de "transcript".',
  '"box" es opcional y marca la zona de la cita en la foto, con valores de 0 a 1.',
].join(' ');

/** Longer descriptions are dropped, not cut mid-word; the app then gives the message without them. */
const MAX_SEEN_LENGTH = 60;

/** Lenient: anything but an explicit false keeps today's behavior (S4 amended from L7). */
const lenientTextFound = z
  .unknown()
  .optional()
  .transform((value) => (value === false ? false : undefined));

const lenientSeen = z.unknown().optional().transform(toSeen);

const geminiReading = z
  .object({
    readable: z.boolean(),
    category: lenientCategorySchema,
    transcript: z.string(),
    facts: z.array(geminiFactSchema).max(7),
    textFound: lenientTextFound,
    seen: lenientSeen,
  })
  .transform(withoutTextAsUnreadable);

const geminiAnswer = z.object({ text: z.string().min(1) });

/** Reads a paper photo with multimodal Gemini and validates its JSON answer, category included (S2). */
export class GeminiNoticeReader implements NoticeReader {
  constructor(private readonly client: GenerateContentClient) {}

  async read(image: NoticeImage): Promise<NoticeReading> {
    // responseMimeType asks Gemini for JSON. https://ai.google.dev/gemini-api/docs/structured-output
    const response = await withCredentialMapping(() =>
      this.client.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { data: image.base64, mimeType: image.mimeType } }, { text: 'Lea este papel.' }],
          },
        ],
        // LOW thinking keeps the call under the 30 s socket timeout of the Expo server fetch.
        config: { systemInstruction: INSTRUCTION, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      }),
    );
    return geminiReading.parse(JSON.parse(geminiAnswer.parse(response).text));
  }
}

function toSeen(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const seen = value.trim();
  return seen.length > 0 && seen.length <= MAX_SEEN_LENGTH ? seen : undefined;
}

/** A photo without text is never readable, so it never replaces the demo recording. */
function withoutTextAsUnreadable(reading: NoticeReading): NoticeReading {
  if (reading.textFound !== false) return { ...reading, seen: undefined };
  return { ...reading, readable: false };
}
