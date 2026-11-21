import { MAX_PLAIN_WORDS } from './easy-read';
import type { ChecklistItem, Fact, Plan, PlanProposer, Reminder, ReminderScheduler } from './ports';
import { collapseWhitespace, isQuotedIn } from './quote-match';

export type { ChecklistItem, Plan, Reminder } from './ports';

/** A checklist longer than this is no longer easy to read (S2). */
export const MAX_CHECKLIST_ITEMS = 6;

/** Only "yes" lets the agent act (S4). */
export type PlanAnswer = 'yes' | 'no';

export type PlanOutcome = 'scheduled' | 'nothing-to-schedule' | 'declined';

export interface PlanDependencies {
  proposer: PlanProposer;
  /** Today's local calendar date as `YYYY-MM-DD`. */
  today: string;
}

export interface ReminderTexts {
  dayBefore: string;
  dueDay: string;
}

/**
 * Asks for a plan and keeps only what is traceable to the facts' quotes (S2)
 * and a reminder due today or later (S3).
 */
export async function proposePlan(facts: Fact[], { proposer, today }: PlanDependencies): Promise<Plan> {
  const proposal = await proposer.propose(facts);
  const quotes = facts.map((fact) => collapseWhitespace(fact.sourceQuote));
  return {
    checklist: proposal.checklist.filter((item) => isReadableItem(item, quotes)).slice(0, MAX_CHECKLIST_ITEMS),
    reminder: proposal.reminder && isKeptReminder(proposal.reminder, quotes, today) ? proposal.reminder : null,
  };
}

/** Schedules the reminder only after the person said "yes" (S4). */
export async function executePlan(plan: Plan, answer: PlanAnswer, scheduler: ReminderScheduler): Promise<PlanOutcome> {
  if (answer !== 'yes') return 'declined';
  if (!plan.reminder) return 'nothing-to-schedule';
  await scheduler.schedule(plan.reminder, plan.checklist);
  return 'scheduled';
}

/** Notification bodies in plain Spanish, 15 words or fewer per sentence, without personal IDs (S6). */
export function reminderTexts(reminder: Reminder, checklist: ChecklistItem[]): ReminderTexts {
  const details = [reminder.place && `Lugar: ${reminder.place}`, checklist[0]?.text];
  return {
    dayBefore: toBody([`Mañana vence: ${reminder.title}`, ...details]),
    dueDay: toBody([`Hoy vence: ${reminder.title}`, ...details]),
  };
}

function isReadableItem(item: ChecklistItem, quotes: string[]): boolean {
  return countWords(item.text) <= MAX_PLAIN_WORDS && isTraceable(item.sourceQuote, quotes);
}

function isKeptReminder(reminder: Reminder, quotes: string[], today: string): boolean {
  return isTraceable(reminder.sourceQuote, quotes) && isCalendarDate(reminder.dueDate) && reminder.dueDate >= today;
}

function isTraceable(quote: string, collapsedQuotes: string[]): boolean {
  return collapsedQuotes.some((factQuote) => isQuotedIn(factQuote, quote));
}

/** `YYYY-MM-DD` that names a real day; 2026-02-30 is not one. */
function isCalendarDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toBody(sentences: (string | undefined)[]): string {
  return sentences
    .map((sentence) => toSentence(sentence ?? ''))
    .filter((sentence) => sentence.length > 0)
    .join(' ');
}

function toSentence(text: string): string {
  const words = withoutPersonalIds(text).replace(/[.\s]+$/, '').split(' ').filter((word) => word.length > 0);
  return words.length === 0 ? '' : `${words.slice(0, MAX_PLAIN_WORDS).join(' ')}.`;
}

/** CURP: https://www.gob.mx/curp. INE voter key: 6 letters, 8 digits, sex, 3 digits. Long digit runs: ID or account numbers. */
const PERSONAL_ID = /\b(?:[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d|[A-Z]{6}\d{8}[HMX]\d{3}|\d{10,})\b/gi;

function withoutPersonalIds(text: string): string {
  return collapseWhitespace(text.replaceAll(PERSONAL_ID, ''));
}

/** Words are whitespace-separated tokens. */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
