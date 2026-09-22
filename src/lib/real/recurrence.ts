export type RecurrenceInput = {
  recurrenceKind: string;
  recurrenceInterval: number;
  weeklyTarget: number;
  recurrenceAnchor: Date;
};

type LocalDate = { year: number; month: number; day: number };

function localDate(date: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day };
}

function dateNumber(value: LocalDate) {
  return Date.UTC(value.year, value.month - 1, value.day);
}

function dateKey(value: LocalDate) {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function mondayKey(value: LocalDate) {
  const date = new Date(dateNumber(value));
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return `week:${date.toISOString().slice(0, 10)}`;
}

export function currentPeriodKey(date = new Date(), timeZone = "America/Sao_Paulo") {
  return dateKey(localDate(date, timeZone));
}

export function periodKeyForRecurrence(input: RecurrenceInput, date = new Date(), timeZone = "America/Sao_Paulo") {
  const current = localDate(date, timeZone);
  if (input.recurrenceKind === "DAILY") return dateKey(current);
  if (input.recurrenceKind === "MONTHLY") return `month:${current.year}-${String(current.month).padStart(2, "0")}`;
  if (input.recurrenceKind === "EVERY_N_WEEKS") {
    const anchor = localDate(input.recurrenceAnchor, timeZone);
    const weeks = Math.floor((dateNumber(current) - dateNumber(anchor)) / (7 * 24 * 60 * 60 * 1000));
    if (weeks < 0 || weeks % Math.max(1, input.recurrenceInterval) !== 0) return null;
    return `week:${dateKey(anchor)}:${Math.floor(weeks / Math.max(1, input.recurrenceInterval))}`;
  }
  return mondayKey(current);
}

