import { v4 as uuid } from 'uuid';
import { db, type EventRecord } from './db';
import type { TimeframeKey } from './lookups';
import { DEFAULT_FILTERS, filterRecords, startOfPeriod } from './insights';
import { recordsAsCsv } from './report';
export type { EventRecord };
export type EventFormValues = Omit<EventRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type EventFilter = { days?: number; regionKey?: string; jointKey?: string; minPain?: number };
export type ExportOptions = { timeframe: TimeframeKey; regionKey?: string; jointKey?: string };
export type ExportedEvents = {
  schemaVersion: 1;
  exportedAt: number;
  options: ExportOptions;
  events: EventRecord[];
};

function validTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(new Date(value).getTime());
}
export function validateValues(values: EventFormValues) {
  if (!validTime(values.startAt)) throw new Error('Choose a valid start date and time.');
  if (values.endAt != null && (!validTime(values.endAt) || values.endAt < values.startAt))
    throw new Error('End time must be on or after the start time.');
  if (!Number.isInteger(values.pain) || values.pain < 0 || values.pain > 10)
    throw new Error('Pain must be a whole number from 0 to 10.');
  if (typeof values.region !== 'string' || typeof values.notes !== 'string')
    throw new Error('Location and notes must be text.');
  if (values.side && !['left', 'right', 'both'].includes(values.side)) throw new Error('Invalid side.');
  for (const field of [
    'regionKey',
    'jointKey',
    'jointCustom',
    'symptomKey',
    'symptomCustom',
    'triggerKey',
    'triggerCustom',
    'actionKey',
    'actionCustom'
  ] as const) {
    if (values[field] != null && typeof values[field] !== 'string')
      throw new Error(`Invalid ${field}: expected text.`);
  }
  if (
    values.symptomKeys !== undefined &&
    (!Array.isArray(values.symptomKeys) || values.symptomKeys.some((key) => typeof key !== 'string'))
  )
    throw new Error('Invalid symptom list.');
}
export async function createEvent(values: EventFormValues): Promise<EventRecord> {
  validateValues(values);
  const now = Date.now();
  const event = { ...values, id: uuid(), side: values.side ?? '', createdAt: now, updatedAt: now };
  await db.events.add(event);
  return event;
}
export async function updateEvent(id: string, values: Partial<EventFormValues>): Promise<EventRecord> {
  const current = await db.events.get(id);
  if (!current) throw new Error('Entry not found.');
  const updated = { ...current, ...values, updatedAt: Date.now() };
  validateValues(updated);
  await db.events.put(updated);
  return updated;
}
export async function deleteEvent(id: string): Promise<void> {
  await db.events.delete(id);
}
export async function getEventById(id: string): Promise<EventRecord | undefined> {
  return db.events.get(id);
}
export function getTimeframeRange(timeframe: TimeframeKey): [number | null, number] {
  return [startOfPeriod({ all: 0, year: 365, m6: 183, month: 30, week: 7 }[timeframe]), Date.now()];
}
export async function listEvents(filters: EventFilter = {}): Promise<EventRecord[]> {
  const records = await db.events.toArray();
  // Unfiltered reads also preserve imported future-dated records for inspection.
  if (!Object.keys(filters).length) return records.sort((a, b) => b.startAt - a.startAt);
  return filterRecords(records, {
    ...DEFAULT_FILTERS,
    days: 0,
    ...filters,
    regionKey: filters.regionKey ?? '',
    jointKey: filters.jointKey ?? ''
  });
}
async function filterByExportOptions(options: ExportOptions): Promise<EventRecord[]> {
  return filterRecords(await db.events.toArray(), {
    ...DEFAULT_FILTERS,
    days: { all: 0, year: 365, m6: 183, month: 30, week: 7 }[options.timeframe],
    regionKey: options.regionKey ?? '',
    jointKey: options.jointKey ?? ''
  }).reverse();
}
export async function exportEventsAsJson(options: ExportOptions): Promise<string> {
  return JSON.stringify(
    { schemaVersion: 1, exportedAt: Date.now(), options, events: await filterByExportOptions(options) },
    null,
    2
  );
}
export async function exportEventsAsCsv(options: ExportOptions): Promise<string> {
  return recordsAsCsv(await filterByExportOptions(options));
}
export async function exportAllEventsAsJson(): Promise<ExportedEvents> {
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    options: { timeframe: 'all' },
    events: await db.events.toArray()
  };
}
export async function importEventsFromJson(payload: unknown): Promise<{ imported: number }> {
  if (!payload || typeof payload !== 'object' || !('events' in payload) || !Array.isArray(payload.events))
    throw new Error('This is not a PsA Logbook backup.');
  if ('schemaVersion' in payload && payload.schemaVersion !== 1)
    throw new Error('This backup version is not supported.');
  // Validate the entire file before any writes. Legacy records may omit optional metadata.
  const records = payload.events.map((raw: unknown, index: number): EventRecord => {
    if (!raw || typeof raw !== 'object') throw new Error(`Invalid entry ${index + 1}.`);
    const e = raw as EventRecord;
    if (
      typeof e.id !== 'string' ||
      !e.id.trim() ||
      !validTime(e.createdAt) ||
      !validTime(e.updatedAt ?? e.createdAt)
    )
      throw new Error(`Invalid identity or timestamps in entry ${index + 1}.`);
    const normalized = {
      ...e,
      notes: e.notes ?? '',
      side: e.side ?? '',
      updatedAt: e.updatedAt ?? e.createdAt
    };
    try {
      validateValues(normalized);
    } catch (error) {
      throw new Error(`Entry ${index + 1}: ${(error as Error).message}`);
    }
    return normalized;
  });
  let imported = 0;
  await db.transaction('rw', db.events, async () => {
    for (const incoming of records) {
      const existing = await db.events.get(incoming.id);
      if (!existing || incoming.updatedAt > (existing.updatedAt ?? existing.createdAt)) {
        await db.events.put({ ...existing, ...incoming });
        imported++;
      }
    }
  });
  return { imported };
}
