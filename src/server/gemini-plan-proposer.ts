import {
  FunctionCallingConfigMode,
  ThinkingLevel,
  Type,
  type FunctionCall,
  type FunctionDeclaration,
  type Tool,
  type ToolConfig,
} from '@google/genai';
import { z } from 'zod';

import { CATEGORY_LABEL, DEFAULT_CATEGORY, type Category } from '@/tramites/category';
import type { Fact, Plan, PlanProposer, Reminder } from '@/tramites/ports';

import { GEMINI_MODEL, type GenerateContentMessage } from './gemini-writer';
import { withCredentialMapping } from './google-errors';

export interface FunctionCallingRequest {
  model: string;
  contents: GenerateContentMessage[];
  config: { systemInstruction: string; tools: Tool[]; toolConfig: ToolConfig; thinkingConfig: { thinkingLevel: ThinkingLevel } };
}

/** The subset of `GoogleGenAI.models` the plan proposer needs. https://ai.google.dev/gemini-api/docs/function-calling */
export interface FunctionCallingClient {
  generateContent(request: FunctionCallingRequest): Promise<{ functionCalls?: FunctionCall[] }>;
}

const CREATE_CHECKLIST = 'create_checklist';
const SCHEDULE_REMINDER = 'schedule_reminder';

const INSTRUCTION = [
  'Recibes hechos de un papel en JSON. Cada hecho tiene "sourceQuote", una cita literal del papel.',
  `Llama a ${CREATE_CHECKLIST} con 1 a 6 cosas que el papel pide llevar o hacer.`,
  `Si el papel no pide llevar ni hacer nada, llama a ${CREATE_CHECKLIST} con "items" vacío.`,
  'Cada "text" es una oración en español sencillo de 15 palabras o menos que usa "usted".',
  `Solo si el papel tiene una fecha, llama también a ${SCHEDULE_REMINDER} con la fecha en formato AAAA-MM-DD,`,
  'un título corto como "pago del predial" o "junta de padres" y el lugar si el papel lo dice.',
  'Cada "sourceQuote" se copia exactamente de la "sourceQuote" de un hecho.',
  'Cada "text" y el recordatorio solo dice lo que dice su "sourceQuote".',
  'No agregues requisitos, adjetivos, documentos, montos ni fechas que la cita no diga.',
  'Por ejemplo, si la cita dice "identificación oficial", no escribas "identificación oficial vigente";',
  'no agregues palabras como "vigente", "original" o "copia" si la cita no las tiene.',
  'No incluyas CURP, números de INE ni otros datos personales.',
].join(' ');

const quotedText = { type: Type.STRING, description: 'Fragmento copiado exactamente de la sourceQuote de un hecho.' };

/** OpenAPI-style `parameters` (genai.d.ts FunctionDeclaration); Vertex AI and the Gemini API both accept it. */
const DECLARATIONS: FunctionDeclaration[] = [
  {
    name: CREATE_CHECKLIST,
    description: 'Crea la lista de cosas que el papel pide llevar o hacer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { text: { type: Type.STRING, description: 'Oración de 15 palabras o menos.' }, sourceQuote: quotedText },
            required: ['text', 'sourceQuote'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: SCHEDULE_REMINDER,
    description: 'Propone un recordatorio en el teléfono para la fecha que dice el papel.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dueDate: { type: Type.STRING, description: 'Fecha en formato AAAA-MM-DD.' },
        title: { type: Type.STRING, description: 'Título corto de lo que pasa en esa fecha.' },
        place: { type: Type.STRING, description: 'Lugar, si el papel lo dice.' },
        sourceQuote: quotedText,
      },
      required: ['dueDate', 'title', 'sourceQuote'],
    },
  },
];

const checklistArgs = z.object({
  items: z.array(z.object({ text: z.string().trim().min(1), sourceQuote: z.string().trim().min(1) })),
});

const reminderArgs = z.object({
  dueDate: z.string().trim(),
  title: z.string().trim().min(1),
  place: z.string().trim().optional(),
  sourceQuote: z.string().trim().min(1),
});

/** Gemini proposes the plan only through the two declared tools (S1), for any kind of paper (context-categories S5). */
export class GeminiPlanProposer implements PlanProposer {
  constructor(private readonly client: FunctionCallingClient) {}

  async propose(facts: Fact[], category: Category = DEFAULT_CATEGORY): Promise<Plan> {
    const response = await withCredentialMapping(() =>
      this.client.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }],
        config: {
          systemInstruction: instructionFor(category),
          tools: [{ functionDeclarations: DECLARATIONS }],
          // ANY forces function calls instead of free text. https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
          // LOW thinking keeps the call under the 30 s socket timeout of the Expo server fetch.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
    );
    return toPlan(response.functionCalls ?? []);
  }
}

function instructionFor(category: Category): string {
  return `${INSTRUCTION} El papel es de la categoría "${category}" (${CATEGORY_LABEL[category]}).`;
}

/** Unknown calls are ignored; a missing create_checklist call means an empty checklist. */
function toPlan(calls: FunctionCall[]): Plan {
  const checklistCall = calls.find((call) => call.name === CREATE_CHECKLIST);
  const reminderCall = calls.find((call) => call.name === SCHEDULE_REMINDER);
  return {
    checklist: checklistCall ? checklistArgs.parse(checklistCall.args).items : [],
    reminder: reminderCall ? toReminder(reminderArgs.parse(reminderCall.args)) : null,
  };
}

function toReminder({ place, ...reminder }: z.infer<typeof reminderArgs>): Reminder {
  return place ? { ...reminder, place } : reminder;
}
