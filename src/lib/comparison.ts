import type { EventRecord } from './db';
import { filterRecords, localDateKey, startOfPeriod, summarize, type RecordFilters } from './insights';

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function comparisonPeriods(filters: RecordFilters, now = Date.now()) {
  if (filters.days === 0) return null;
  const currentFrom = filters.days === -1 ? filters.from : localDateKey(startOfPeriod(filters.days, now)!);
  const currentTo = filters.days === -1 ? filters.to : localDateKey(now);
  if (!currentFrom || !currentTo || currentFrom > currentTo || currentTo > localDateKey(now)) return null;
  const days =
    Math.round((Date.parse(currentTo + 'T00:00:00Z') - Date.parse(currentFrom + 'T00:00:00Z')) / 86400000) +
    1;
  if (!Number.isFinite(days) || days < 1) return null;
  const previousTo = shiftDate(currentFrom, -1);
  return {
    currentFrom,
    currentTo,
    previousFrom: shiftDate(previousTo, 1 - days),
    previousTo,
    days
  };
}

export function comparePeriods(records: EventRecord[], filters: RecordFilters, now = Date.now()) {
  const periods = comparisonPeriods(filters, now);
  if (!periods) return null;
  const current = filterRecords(records, filters, now);
  const previous = filterRecords(
    records,
    { ...filters, days: -1, from: periods.previousFrom, to: periods.previousTo },
    now
  );
  return { periods, current: summarize(current), previous: summarize(previous) };
}
