import { executePlan, proposePlan, reminderTexts, type Plan } from '@/tramites/plan';
import type { Fact, PlanProposer, ReminderScheduler } from '@/tramites/ports';

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  { kind: 'lugar', text: 'Vaya a la Tesorería Municipal.', sourceQuote: 'Deberá presentarse en la Tesorería\nMunicipal  con este aviso' },
  { kind: 'documento', text: 'Lleve su identificación.', sourceQuote: 'identificación oficial vigente' },
];

const TODAY = '2026-11-21';

const REMINDER = {
  dueDate: '2026-11-30',
  title: 'pago del predial',
  place: 'Tesorería Municipal',
  sourceQuote: 'vence el día 30 de noviembre de 2026',
};

function proposerOf(plan: Plan): PlanProposer & { calls: Fact[][] } {
  const calls: Fact[][] = [];
  return {
    calls,
    propose: async (facts) => {
      calls.push(facts);
      return plan;
    },
  };
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `palabra${index}`).join(' ');
}

describe('proposePlan: traceability (S2)', () => {
  it('passes the facts to the proposer and keeps traceable items and reminder', async () => {
    const proposer = proposerOf({
      checklist: [
        { text: 'Lleve este aviso.', sourceQuote: 'Tesorería Municipal con este aviso' },
        { text: 'Lleve su identificación oficial.', sourceQuote: 'identificación oficial' },
      ],
      reminder: REMINDER,
    });

    const plan = await proposePlan(FACTS, { proposer, today: TODAY });

    expect(proposer.calls).toEqual([FACTS]);
    expect(plan).toEqual({
      checklist: [
        { text: 'Lleve este aviso.', sourceQuote: 'Tesorería Municipal con este aviso' },
        { text: 'Lleve su identificación oficial.', sourceQuote: 'identificación oficial' },
      ],
      reminder: REMINDER,
    });
  });

  it('drops items whose quote is not literally in any fact quote', async () => {
    const proposer = proposerOf({
      checklist: [
        { text: 'Lleve su acta de nacimiento.', sourceQuote: 'acta de nacimiento' },
        { text: 'Lleve su identificación.', sourceQuote: 'identificación oficial vigente' },
        { text: 'Vaya en la mañana.', sourceQuote: '   ' },
      ],
      reminder: REMINDER,
    });

    const plan = await proposePlan(FACTS, { proposer, today: TODAY });

    expect(plan.checklist).toEqual([{ text: 'Lleve su identificación.', sourceQuote: 'identificación oficial vigente' }]);
  });

  it('drops items over 15 words and keeps at most 6', async () => {
    const item = { text: 'Lleve este aviso.', sourceQuote: 'con este aviso' };
    const proposer = proposerOf({
      checklist: [
        { text: words(16), sourceQuote: 'con este aviso' },
        { text: words(15), sourceQuote: 'con este aviso' },
        ...Array.from({ length: 7 }, () => item),
      ],
      reminder: null,
    });

    const plan = await proposePlan(FACTS, { proposer, today: TODAY });

    expect(plan.checklist).toHaveLength(6);
    expect(plan.checklist[0].text).toBe(words(15));
    expect(plan.checklist.map((entry) => entry.text)).not.toContain(words(16));
  });

  it('drops a reminder without a traceable quote', async () => {
    const proposer = proposerOf({ checklist: [], reminder: { ...REMINDER, sourceQuote: 'vence el 1 de diciembre' } });

    expect((await proposePlan(FACTS, { proposer, today: TODAY })).reminder).toBeNull();
  });
});

describe('proposePlan: due date (S3)', () => {
  const checklist = [{ text: 'Lleve su identificación.', sourceQuote: 'identificación oficial vigente' }];

  it.each([
    ['a past date', '2026-11-20'],
    ['an impossible day', '2026-02-30'],
    ['month 13', '2026-13-01'],
    ['a non-ISO format', '30/11/2026'],
    ['an empty string', ''],
  ])('sets reminder null for %s and keeps the checklist', async (_name, dueDate) => {
    const plan = await proposePlan(FACTS, { proposer: proposerOf({ checklist, reminder: { ...REMINDER, dueDate } }), today: TODAY });

    expect(plan).toEqual({ checklist, reminder: null });
  });

  it('keeps a reminder due today', async () => {
    const reminder = { ...REMINDER, dueDate: TODAY };
    const plan = await proposePlan(FACTS, { proposer: proposerOf({ checklist, reminder }), today: TODAY });

    expect(plan.reminder).toEqual(reminder);
  });
});

describe('executePlan: the agent acts only after "Sí" (S4)', () => {
  const plan: Plan = { checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }], reminder: REMINDER };

  function recordingScheduler(): ReminderScheduler & { calls: unknown[][] } {
    const calls: unknown[][] = [];
    return {
      calls,
      schedule: async (reminder, checklist) => {
        calls.push([reminder, checklist]);
      },
    };
  }

  it('schedules the reminder with its checklist after "yes"', async () => {
    const scheduler = recordingScheduler();

    expect(await executePlan(plan, 'yes', scheduler)).toBe('scheduled');
    expect(scheduler.calls).toEqual([[REMINDER, plan.checklist]]);
  });

  it('schedules nothing after "no"', async () => {
    const scheduler = recordingScheduler();

    expect(await executePlan(plan, 'no', scheduler)).toBe('declined');
    expect(scheduler.calls).toEqual([]);
  });

  it('schedules nothing when the plan has no reminder', async () => {
    const scheduler = recordingScheduler();

    expect(await executePlan({ ...plan, reminder: null }, 'yes', scheduler)).toBe('nothing-to-schedule');
    expect(scheduler.calls).toEqual([]);
  });
});

describe('reminderTexts (S6)', () => {
  const wordCounts = (text: string) =>
    text
      .split(/(?<=\.)\s+/)
      .map((sentence) => sentence.split(/\s+/).filter((word) => word.length > 0).length);

  it('writes plain Spanish for the day before and the due day', () => {
    const texts = reminderTexts(REMINDER, [{ text: 'Lleve este aviso y su identificación.', sourceQuote: 'con este aviso' }]);

    expect(texts).toEqual({
      dayBefore: 'Mañana: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso y su identificación.',
      dueDay: 'Hoy: pago del predial. Lugar: Tesorería Municipal. Lleve este aviso y su identificación.',
    });
  });

  it('omits the place and the checklist sentence when there are none', () => {
    const { place: _place, ...withoutPlace } = REMINDER;

    expect(reminderTexts(withoutPlace, [])).toEqual({
      dayBefore: 'Mañana: pago del predial.',
      dueDay: 'Hoy: pago del predial.',
    });
  });

  it('keeps every sentence at 15 words or fewer', () => {
    const texts = reminderTexts({ ...REMINDER, title: words(20), place: words(18) }, []);

    expect(Math.max(...wordCounts(texts.dayBefore), ...wordCounts(texts.dueDay))).toBeLessThanOrEqual(15);
  });

  it('never includes a CURP or an INE voter key', () => {
    const texts = reminderTexts({ ...REMINDER, title: 'pago de GOMC800101HYNRRR09 clave GOMRCR80010131H100' }, []);

    expect(texts.dayBefore).toBe('Mañana: pago de clave. Lugar: Tesorería Municipal.');
    expect(texts.dueDay).not.toMatch(/GOM/);
  });
});

describe('proposePlan: category (context-categories S5)', () => {
  function categoryRecorder(): PlanProposer & { categories: unknown[] } {
    const categories: unknown[] = [];
    return {
      categories,
      propose: async (_facts, category) => {
        categories.push(category);
        return { checklist: [], reminder: null };
      },
    };
  }

  it('passes the category of the paper to the proposer', async () => {
    const proposer = categoryRecorder();

    await proposePlan(FACTS, { proposer, today: TODAY }, 'reunion');

    expect(proposer.categories).toEqual(['reunion']);
  });

  it('uses otro when no category is given', async () => {
    const proposer = categoryRecorder();

    await proposePlan(FACTS, { proposer, today: TODAY });

    expect(proposer.categories).toEqual(['otro']);
  });

  it('never says trámite in the reminder bodies', () => {
    const texts = reminderTexts({ ...REMINDER, title: 'junta de padres' }, []);

    expect(`${texts.dayBefore} ${texts.dueDay}`).not.toMatch(/trámite/i);
  });
});
