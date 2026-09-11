import { beforeEach, describe, expect, it } from 'vitest';
import { db, type EventRecord } from '../../src/lib/db';
import { createEvent, updateEvent, importEventsFromJson, exportAllEventsAsJson } from '../../src/lib/events';
import {
  DEFAULT_FILTERS,
  filterRecords,
  localDateKey,
  startOfPeriod,
  summarize,
  toLocalInput
} from '../../src/lib/insights';
import { createWorkbook, csvCell, recordsAsCsv } from '../../src/lib/report';
const now = new Date('2026-09-10T12:00:00Z').getTime();
const record = (changes: Partial<EventRecord> = {}): EventRecord => ({
  id: 'entry-1',
  startAt: now,
  pain: 4,
  region: 'Hands',
  regionKey: 'hands',
  jointKey: 'fingers',
  side: 'left',
  symptomKey: 'pain',
  notes: 'Walking was difficult',
  createdAt: now,
  updatedAt: now,
  ...changes
});
beforeEach(async () => {
  await db.events.clear();
});
describe('local times and summaries', () => {
  it('uses local wall time for editing in summer and winter', () => {
    expect(toLocalInput(new Date('2026-07-01T12:30:00Z').getTime())).toBe('2026-07-01T13:30');
    expect(toLocalInput(new Date('2026-01-01T12:30:00Z').getTime())).toBe('2026-01-01T12:30');
  });
  it('groups records around UTC midnight into the correct local date', () => {
    expect(localDateKey(new Date('2026-07-01T23:30:00Z').getTime())).toBe('2026-07-02');
  });
  it('uses calendar days across daylight saving changes', () => {
    expect(toLocalInput(startOfPeriod(7, new Date('2026-03-30T12:00:00Z').getTime())!)).toBe(
      '2026-03-24T00:00'
    );
  });
  it('includes midnight at the boundary and excludes future records', () => {
    const start = startOfPeriod(7, now)!;
    const results = filterRecords(
      [
        record({ id: 'boundary', startAt: start }),
        record({ id: 'earlier', startAt: start - 1 }),
        record({ id: 'future', startAt: now + 1 })
      ],
      { ...DEFAULT_FILTERS, days: 7 },
      now
    );
    expect(results.map((e) => e.id)).toEqual(['boundary']);
  });
  it('combines region, joint, symptoms, score, and free text filters', () => {
    const f = {
      ...DEFAULT_FILTERS,
      regionKey: 'hands',
      jointKey: 'fingers',
      symptomKey: 'swelling',
      minPain: 4,
      query: 'walking'
    };
    expect(
      filterRecords(
        [
          record({ symptomKeys: ['pain', 'swelling'] }),
          record({ id: 'low', pain: 2 }),
          record({ id: 'foot', regionKey: 'feet' })
        ],
        f,
        now
      )
    ).toHaveLength(1);
  });
  it('averages entries and leaves missing days out rather than filling zeros', () => {
    const s = summarize([
      record({ pain: 2 }),
      record({ id: 'two', pain: 8 }),
      record({ id: 'three', startAt: now - 86400000 * 3, pain: 5 })
    ]);
    expect(s.average).toBe(5);
    expect(s.peak).toBe(8);
    expect(s.loggedDays).toBe(2);
    expect(s.daily).toHaveLength(2);
    expect(s.daily[1].average).toBe(5);
    expect(s.count).toBe(3);
  });
  it('counts each selected symptom once and supports legacy single symptoms', () => {
    const s = summarize([
      record({ symptomKeys: ['pain', 'swelling', 'pain'] }),
      record({ id: 'legacy', symptomKey: 'swelling' })
    ]);
    expect(s.symptoms).toEqual([
      { label: 'Swelling', count: 2 },
      { label: 'Pain', count: 1 }
    ]);
  });
  it('uses null rather than zero when no pain data exists', () => {
    expect(summarize([])).toMatchObject({ average: null, peak: null, loggedDays: 0 });
  });
});
describe('record integrity and backup merging', () => {
  it('rejects invalid pain and reversed dates without saving', async () => {
    await expect(createEvent(record({ pain: 11 }))).rejects.toThrow('Pain');
    await expect(createEvent(record({ endAt: now - 1 }))).rejects.toThrow('End time');
    expect(await db.events.count()).toBe(0);
  });
  it('updates the same record and preserves metadata', async () => {
    const created = await createEvent(record());
    await updateEvent(created.id, { pain: 7 });
    expect(await db.events.count()).toBe(1);
    expect(await db.events.get(created.id)).toMatchObject({
      pain: 7,
      createdAt: created.createdAt,
      jointKey: 'fingers'
    });
  });
  it('validates the whole import before writing any entries', async () => {
    await expect(
      importEventsFromJson({ schemaVersion: 1, events: [record(), record({ id: 'bad', pain: 99 })] })
    ).rejects.toThrow('Entry 2');
    expect(await db.events.count()).toBe(0);
  });
  it('rejects malformed optional fields and future schema versions', async () => {
    await expect(importEventsFromJson({ schemaVersion: 2, events: [] })).rejects.toThrow('version');
    await expect(importEventsFromJson({ events: [{ ...record(), symptomKeys: 'pain' }] })).rejects.toThrow(
      'symptom list'
    );
  });
  it('merges only newer edits, preserves unrelated records, and can be repeated', async () => {
    await db.events.bulkPut([record(), record({ id: 'unrelated' })]);
    const data = {
      schemaVersion: 1,
      events: [record({ pain: 9, updatedAt: now + 1 }), record({ id: 'new' })]
    };
    expect(await importEventsFromJson(data)).toEqual({ imported: 2 });
    expect(await importEventsFromJson(data)).toEqual({ imported: 0 });
    await importEventsFromJson({ events: [record({ pain: 1, updatedAt: now - 1 })] });
    expect((await db.events.get('entry-1'))?.pain).toBe(9);
    expect(await db.events.count()).toBe(3);
  });
  it('round-trips a full backup with multiple symptoms and custom locations', async () => {
    await db.events.add(record({ jointCustom: 'Outside edge', symptomKeys: ['pain', 'swelling'] }));
    const data = await exportAllEventsAsJson();
    await db.events.clear();
    await importEventsFromJson(data);
    expect(await db.events.get('entry-1')).toMatchObject({
      jointCustom: 'Outside edge',
      symptomKeys: ['pain', 'swelling']
    });
  });
  it('accepts older records without side, notes, or updatedAt', async () => {
    const legacy = { ...record(), side: undefined, notes: undefined, updatedAt: undefined };
    await importEventsFromJson({ events: [legacy] });
    expect(await db.events.get('entry-1')).toMatchObject({ side: '', notes: '', updatedAt: now });
  });
});
describe('reports', () => {
  it('escapes CSV formulas, quotes, unicode, and line breaks for Excel', () => {
    expect(csvCell(' =HYPERLINK("bad")')).toBe('"\' =HYPERLINK(""bad"")"');
    const csv = recordsAsCsv([record({ notes: 'Miguel’s "note"\nsecond line' })]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Miguel’s ""note""\nsecond line"');
    expect(csv).toContain('Hands & wrists');
    expect(csv).toContain('Start (UTC)');
  });
  it('creates an actual Excel workbook with summary and raw numeric values', async () => {
    const workbook = await createWorkbook(
      [record({ symptomKeys: ['pain', 'swelling'], notes: '=1+1' })],
      DEFAULT_FILTERS
    );
    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      'Summary',
      'Entries',
      'Daily summary',
      'Body areas',
      'Symptoms'
    ]);
    expect(workbook.getWorksheet('Entries')!.getCell('G2').value).toBe(4);
    expect(workbook.getWorksheet('Entries')!.getCell('N2').value).toBe('=1+1'); // a literal string, never a formula object
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
    const { default: ExcelJS } = await import('exceljs');
    const read = new ExcelJS.Workbook();
    await read.xlsx.load(buffer);
    expect(read.getWorksheet('Entries')!.getCell('N2').type).toBe(ExcelJS.ValueType.String);
    expect(read.getWorksheet('Symptoms')!.rowCount).toBe(3);
  }, 60000);
});
