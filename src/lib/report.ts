import type { EventRecord } from './db';
import { comparePeriods } from './comparison';
import { ACTION_OPTIONS, TRIGGER_OPTIONS, labelForKey } from './lookups';
import {
  filterDescription,
  jointLabel,
  regionLabel,
  sideLabel,
  symptomLabel,
  summarize,
  toLocalInput,
  type RecordFilters
} from './insights';

export const REPORT_NOTE =
  'Summaries describe recorded entries only. An unlogged day is missing data, not a symptom-free day. Pain, fatigue and morning stiffness are averaged only where recorded, per entry. Multiple symptoms may be recorded in one entry; symptom counts can exceed entry counts. Missing end times have no assumed duration. Times use the exporting device’s time zone.';
const columns = [
  'Entry ID',
  'Start (local)',
  'End (local)',
  'Start (UTC)',
  'End (UTC)',
  'Duration (minutes)',
  'Pain (0–10)',
  'Body area',
  'Location',
  'Side',
  'Symptoms',
  'Possible trigger',
  'Action taken',
  'Notes',
  'Region key',
  'Joint key',
  'Symptom keys',
  'Created (UTC)',
  'Updated (UTC)',
  'Fatigue (0–10)',
  'Morning stiffness (minutes)'
];
function rows(records: EventRecord[]) {
  return [...records]
    .sort((a, b) => a.startAt - b.startAt)
    .map((e) => [
      e.id,
      toLocalInput(e.startAt).replace('T', ' '),
      e.endAt != null ? toLocalInput(e.endAt).replace('T', ' ') : '',
      new Date(e.startAt).toISOString(),
      e.endAt != null ? new Date(e.endAt).toISOString() : '',
      e.endAt != null ? Math.round((e.endAt - e.startAt) / 60000) : '',
      e.pain,
      regionLabel(e),
      jointLabel(e),
      sideLabel(e.side),
      symptomLabel(e),
      e.triggerCustom || labelForKey(TRIGGER_OPTIONS, e.triggerKey),
      e.actionCustom || labelForKey(ACTION_OPTIONS, e.actionKey),
      e.notes,
      e.regionKey ?? '',
      e.jointKey ?? '',
      (e.symptomKeys ?? (e.symptomKey ? [e.symptomKey] : [])).join('; '),
      new Date(e.createdAt).toISOString(),
      new Date(e.updatedAt).toISOString(),
      e.fatigue ?? '',
      e.morningStiffnessMinutes ?? ''
    ]);
}
export function csvCell(value: string | number): string {
  const text = String(value);
  // Spreadsheet programs can interpret untrusted text as formulas, even inside CSV quotes.
  const safe = typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function recordsAsCsv(records: EventRecord[]): string {
  return '\uFEFF' + [columns, ...rows(records)].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
export async function createWorkbook(records: EventRecord[], filters: RecordFilters, allRecords = records) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PsA Logbook';
  workbook.created = new Date();
  const s = summarize(records);
  const summary = workbook.addWorksheet('Summary');
  summary.addRows([
    ['PsA Logbook · appointment report'],
    ['Filters', filterDescription(filters)],
    ['Generated', new Date().toISOString()],
    ['Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ['Entries', s.count],
    ['Days with entries', s.loggedDays],
    ['Average pain per entry', s.average ?? 'No data'],
    ['Highest recorded pain', s.peak ?? 'No data'],
    ['Average fatigue where recorded', s.fatigueAverage ?? 'No data'],
    ['Average morning stiffness (min) where recorded', s.stiffnessAverage ?? 'No data'],
    ['Notes', REPORT_NOTE]
  ]);
  summary.getColumn(1).width = 43;
  summary.getColumn(2).width = 95;
  summary.getCell('B11').alignment = { wrapText: true };
  summary.getRow(11).height = 75;
  const comparison = workbook.addWorksheet('Comparison');
  comparison.addRow(['Measure', 'Selected period', 'Previous period']);
  const compared = comparePeriods(allRecords, filters);
  if (compared) {
    const { periods, previous } = compared;
    comparison.addRows([
      [
        'Dates',
        `${periods.currentFrom} to ${periods.currentTo}`,
        `${periods.previousFrom} to ${periods.previousTo}`
      ],
      ['Calendar days', periods.days, periods.days],
      ['Entries', s.count, previous.count],
      ['Days with entries', s.loggedDays, previous.loggedDays],
      ['Average pain per entry', s.average ?? '', previous.average ?? ''],
      ['Highest recorded pain', s.peak ?? '', previous.peak ?? ''],
      ['Fatigue scores recorded', s.fatigueCount, previous.fatigueCount],
      ['Average fatigue (where recorded)', s.fatigueAverage ?? '', previous.fatigueAverage ?? ''],
      ['Stiffness durations recorded', s.stiffnessCount, previous.stiffnessCount],
      ['Average morning stiffness (min)', s.stiffnessAverage ?? '', previous.stiffnessAverage ?? ''],
      ['Note', 'Missing days are unknown. Different logging frequency can affect averages.']
    ]);
  } else comparison.addRow(['Note', 'Select a rolling period or complete custom dates to compare.']);
  const entries = workbook.addWorksheet('Entries');
  entries.addRow(columns);
  entries.addRows(rows(records));
  const daily = workbook.addWorksheet('Daily summary');
  daily.addRow(['Local date', 'Entries', 'Average pain', 'Highest pain']);
  daily.addRows(s.daily.map((d) => [d.date, d.count, d.average, d.peak]));
  const areas = workbook.addWorksheet('Body areas');
  areas.addRow(['Body area', 'Entries', 'Average pain']);
  areas.addRows(s.areas.map((a) => [a.label, a.count, a.average]));
  const symptoms = workbook.addWorksheet('Symptoms');
  symptoms.addRow(['Symptom', 'Entries mentioning symptom']);
  symptoms.addRows(s.symptoms.map((a) => [a.label, a.count]));
  const painScores = workbook.addWorksheet('Pain scores');
  painScores.addRow(['Pain score (0–10)', 'Entries']);
  painScores.addRows(s.painScores.map((a) => [a.score, a.count]));
  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF206B60' } };
    sheet.getRow(1).height = 28;
    if (sheet !== summary) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: Math.max(1, sheet.rowCount), column: sheet.columnCount }
      };
      sheet.columns.forEach((col) => {
        col.width = 25;
      });
      sheet.eachRow((row, i) => {
        if (i > 1)
          row.eachCell((cell) => {
            if (typeof cell.value === 'number') cell.numFmt = '0.0';
          });
      });
    }
  }
  entries.getColumn(14).width = 60;
  entries.getColumn(14).alignment = { wrapText: true };
  comparison.getColumn(1).width = 26;
  comparison.getColumn(2).width = 75;
  comparison.getColumn(3).width = 32;
  for (const [sheet, columnsToFormat] of [
    [entries, [6, 7, 20, 21]],
    [daily, [2, 4]],
    [areas, [2]],
    [symptoms, [2]],
    [painScores, [1, 2]]
  ] as const) {
    for (const column of columnsToFormat)
      sheet.getColumn(column).eachCell((cell, row) => {
        if (row > 1 && typeof cell.value === 'number') cell.numFmt = '0';
      });
  }
  for (const row of [3, 4, 5, 7, 8, 10]) {
    comparison.getCell(`B${row}`).numFmt = '0';
    comparison.getCell(`C${row}`).numFmt = '0';
  }
  return workbook;
}
export function downloadFile(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function downloadWorkbook(records: EventRecord[], filters: RecordFilters, allRecords = records) {
  const workbook = await createWorkbook(records, filters, allRecords);
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(
    'psa-logbook-report.xlsx',
    new Uint8Array(buffer),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
