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
  'Recibes hechos de un aviso oficial mexicano en JSON. Cada hecho tiene "sourceQuote", una cita literal del aviso.',
  `Llama a ${CREATE_CHECKLIST} con 1 a 6 cosas que la persona debe llevar o hacer.`,
  'Cada "text" es una oración en español sencillo de 15 palabras o menos que usa "usted".',
  `Si hay una fecha límite, llama también a ${SCHEDULE_REMINDER} con la fecha en formato AAAA-MM-DD,`,
  'un título corto como "pago del predial" y el lugar si el aviso lo dice.',
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
    description: 'Crea la lista de cosas que la persona debe llevar o hacer para su trámite.',
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
    description: 'Propone un recordatorio en el teléfono para la fecha límite del trámite.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dueDate: { type: Type.STRING, description: 'Fecha límite en formato AAAA-MM-DD.' },
        title: { type: Type.STRING, description: 'Título corto del trámite.' },
        place: { type: Type.STRING, description: 'Lugar del trámite, si el aviso lo dice.' },
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

/** Gemini proposes the plan only through the two declared tools (S1). */
export class GeminiPlanProposer implements PlanProposer {
  constructor(private readonly client: FunctionCallingClient) {}

  async propose(facts: Fact[]): Promise<Plan> {
    const response = await withCredentialMapping(() =>
      this.client.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }],
        config: {
          systemInstruction: INSTRUCTION,
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
