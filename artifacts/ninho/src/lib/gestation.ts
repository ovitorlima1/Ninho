const DAY_IN_MS = 1000 * 60 * 60 * 24;
const FULL_TERM_DAYS = 280;
export const FULL_TERM_WEEKS = 40;
/** Limites aceitos para a data prevista do parto, contados a partir de hoje. */
export const DUE_DATE_MIN_WEEKS_AGO = 6;
export const DUE_DATE_MAX_WEEKS_AHEAD = 42;

export type Gestation = {
  /** Semanas completas, de 1 a 40 (trava em 40 depois da data prevista). */
  week: number;
  /** Dias completos dentro da semana atual, de 0 a 6. */
  days: number;
  /** Dias que faltam para a data prevista (negativo quando ela já passou). */
  daysToGo: number;
  /** A data prevista já passou. */
  isOverdue: boolean;
};

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  // Date silently normalizes impossible calendar dates (for example,
  // 2026-02-31), so compare the parts before trusting the result.
  const [year, month, day] = value.split("-").map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;

  return date;
}

function atNoon(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Idade gestacional a partir da data prevista do parto.
 *
 * Semanas são contadas por semanas completas (`floor`): com 26 semanas e 4
 * dias a gestante está *na* semana 26, e não na 27 — arredondar mostrava uma
 * semana que ainda não chegou. Os dois horários são fixados ao meio-dia para
 * o horário de verão não roubar nem adicionar um dia.
 */
export function calcGestation(dueDate: string | null, now = new Date()): Gestation | null {
  if (!dueDate) return null;
  const due = parseIsoDate(dueDate);
  if (!due) return null;

  const today = atNoon(now);
  const daysToGo = Math.round((due.getTime() - today.getTime()) / DAY_IN_MS);
  const gestationalDays = FULL_TERM_DAYS - daysToGo;
  if (gestationalDays < 0) return null;

  const week = Math.min(FULL_TERM_WEEKS, Math.max(1, Math.floor(gestationalDays / 7)));
  const days = week >= FULL_TERM_WEEKS ? 0 : gestationalDays % 7;

  return { week, days, daysToGo, isOverdue: daysToGo < 0 };
}

/** Semana atual (1 a 40), para telas que só mostram o número. */
export function calcGestationalWeek(dueDate: string | null, now = new Date()): number | null {
  return calcGestation(dueDate, now)?.week ?? null;
}

/** "semana 26 · 4 dias" — ou só "semana 26" quando a semana virou hoje. */
export function formatGestation(gestation: Gestation): string {
  if (gestation.isOverdue) return `semana ${FULL_TERM_WEEKS}`;
  if (gestation.days === 0) return `semana ${gestation.week}`;
  return `semana ${gestation.week} · ${gestation.days} ${gestation.days === 1 ? "dia" : "dias"}`;
}

/** Intervalo aceito para a data prevista, no formato dos campos `type="date"`. */
export function getDueDateBounds(now = new Date()): { min: string; max: string } {
  const today = atNoon(now);
  const min = new Date(today.getTime() - DUE_DATE_MIN_WEEKS_AGO * 7 * DAY_IN_MS);
  const max = new Date(today.getTime() + DUE_DATE_MAX_WEEKS_AHEAD * 7 * DAY_IN_MS);
  return { min: toIsoDate(min), max: toIsoDate(max) };
}

/** Mensagem de erro para a data prevista, ou null quando está tudo certo. */
export function validateDueDate(value: string, now = new Date()): string | null {
  if (!parseIsoDate(value)) return "Confira a data: use o formato dia/mês/ano.";
  const { min, max } = getDueDateBounds(now);
  if (value < min) return `A data prevista não pode ser anterior a ${formatIsoAsBr(min)}.`;
  if (value > max) return `A data prevista não pode ser depois de ${formatIsoAsBr(max)}.`;
  return null;
}

function formatIsoAsBr(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
