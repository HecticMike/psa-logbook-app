import type { EventRecord } from './db';
import { REGION_OPTIONS, SYMPTOM_OPTIONS, jointsForRegion, labelForKey } from './lookups';

export type RecordFilters = {
  days: number;
  regionKey: string;
  jointKey: string;
  symptomKey: string;
  minPain: number;
  query: string;
};
export const DEFAULT_FILTERS: RecordFilters = {
  days: 30,
  regionKey: '',
  jointKey: '',
  symptomKey: '',
  minPain: 0,
  query: ''
};
export function localDateKey(value: number): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function toLocalInput(value = Date.now()): string {
  const d = new Date(value);
  return `${localDateKey(value)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export const formatDate = (value: number) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDateTime = (value: number) =>
  new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
export const symptomKeys = (e: EventRecord): string[] => [
  ...new Set(e.symptomKeys?.length ? e.symptomKeys : e.symptomKey ? [e.symptomKey] : [])
];
export const symptomLabel = (e: EventRecord) =>
  symptomKeys(e)
    .map((k) => (k === 'other' && e.symptomCustom ? e.symptomCustom : labelForKey(SYMPTOM_OPTIONS, k)))
    .join(', ') || 'Not recorded';
export const regionLabel = (e: EventRecord) =>
  e.regionKey ? labelForKey(REGION_OPTIONS, e.regionKey) : e.region || 'Not recorded';
export const jointLabel = (e: EventRecord) =>
  e.jointCustom ||
  (e.jointKey ? labelForKey(jointsForRegion(e.regionKey), e.jointKey) : 'Area only / joint unsure');
export const sideLabel = (side?: string) =>
  ({ left: 'Left', right: 'Right', both: 'Both sides' })[side ?? ''] || 'Side not recorded';
export function startOfPeriod(days: number, now = Date.now()): number | null {
  if (!days) return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return start.getTime();
}
export function filterRecords(
  records: EventRecord[],
  filters: RecordFilters,
  now = Date.now()
): EventRecord[] {
  const start = startOfPeriod(filters.days, now);
  const q = filters.query.trim().toLocaleLowerCase();
  return records
    .filter(
      (e) =>
        (start === null || e.startAt >= start) &&
        e.startAt <= now &&
        (!filters.regionKey || e.regionKey === filters.regionKey) &&
        (!filters.jointKey || e.jointKey === filters.jointKey) &&
        (!filters.symptomKey || symptomKeys(e).includes(filters.symptomKey)) &&
        e.pain >= filters.minPain &&
        (!q ||
          [
            regionLabel(e),
            jointLabel(e),
            sideLabel(e.side),
            symptomLabel(e),
            e.notes,
            e.triggerCustom,
            e.actionCustom
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(q))
    )
    .sort((a, b) => b.startAt - a.startAt);
}
export function filterDescription(f: RecordFilters): string {
  return [
    f.days ? `Last ${f.days} days` : 'All time',
    f.regionKey ? labelForKey(REGION_OPTIONS, f.regionKey) : 'All areas',
    f.jointKey ? labelForKey(jointsForRegion(f.regionKey), f.jointKey) : '',
    f.symptomKey ? labelForKey(SYMPTOM_OPTIONS, f.symptomKey) : '',
    f.minPain ? `Pain ≥ ${f.minPain}` : '',
    f.query ? `Search: ${f.query}` : ''
  ]
    .filter(Boolean)
    .join(' · ');
}
export type DailySummary = { date: string; count: number; average: number; peak: number };
export function summarize(records: EventRecord[]) {
  const groups = new Map<string, EventRecord[]>();
  const areas = new Map<string, { count: number; total: number }>();
  const symptoms = new Map<string, number>();
  for (const e of records) {
    const date = localDateKey(e.startAt);
    groups.set(date, [...(groups.get(date) ?? []), e]);
    const area = regionLabel(e);
    const current = areas.get(area) ?? { count: 0, total: 0 };
    areas.set(area, { count: current.count + 1, total: current.total + e.pain });
    for (const key of symptomKeys(e)) {
      const label = key === 'other' && e.symptomCustom ? e.symptomCustom : labelForKey(SYMPTOM_OPTIONS, key);
      symptoms.set(label, (symptoms.get(label) ?? 0) + 1);
    }
  }
  const daily: DailySummary[] = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({
      date,
      count: entries.length,
      average: entries.reduce((sum, e) => sum + e.pain, 0) / entries.length,
      peak: Math.max(...entries.map((e) => e.pain))
    }));
  return {
    count: records.length,
    loggedDays: daily.length,
    average: records.length ? records.reduce((sum, e) => sum + e.pain, 0) / records.length : null,
    peak: records.length ? Math.max(...records.map((e) => e.pain)) : null,
    daily,
    areas: [...areas]
      .map(([label, v]) => ({ label, count: v.count, average: v.total / v.count }))
      .sort((a, b) => b.count - a.count),
    symptoms: [...symptoms].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  };
}
