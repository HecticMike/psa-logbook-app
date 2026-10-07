import type { EventRecord } from '../lib/db';
import { comparePeriods } from '../lib/comparison';
import { formatDate, type RecordFilters } from '../lib/insights';

const readableDate = (date: string) => formatDate(new Date(date + 'T12:00').getTime());

export function PeriodComparison({ records, filters }: { records: EventRecord[]; filters: RecordFilters }) {
  const comparison = comparePeriods(records, filters);
  return (
    <section className="panel comparison-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">BETWEEN APPOINTMENTS</p>
          <h2>Compare two periods</h2>
          <p>The previous period is the same number of calendar days immediately before your selection.</p>
        </div>
      </div>
      {!comparison ? (
        <p className="helper">
          Choose a rolling period or a complete custom date range above to compare periods.
        </p>
      ) : (
        <>
          <div className="comparison-grid">
            {(
              [
                [
                  'Selected period',
                  comparison.current,
                  comparison.periods.currentFrom,
                  comparison.periods.currentTo
                ],
                [
                  'Previous period',
                  comparison.previous,
                  comparison.periods.previousFrom,
                  comparison.periods.previousTo
                ]
              ] as const
            ).map(([label, summary, from, to], index) => (
              <div className={'comparison-card ' + (index === 0 ? 'current' : '')} key={label}>
                <strong>{label}</strong>
                <span className="comparison-dates">
                  {readableDate(from)} – {readableDate(to)}
                </span>
                <div className="comparison-pain">
                  <span>Average pain per entry</span>
                  <strong>{summary.average === null ? '—' : summary.average.toFixed(1) + ' / 10'}</strong>
                </div>
                <div className="comparison-bar" aria-hidden="true">
                  <span style={{ width: `${(summary.average ?? 0) * 10}%` }} />
                </div>
                <dl>
                  <div>
                    <dt>Entries</dt>
                    <dd>{summary.count}</dd>
                  </div>
                  <div>
                    <dt>Days with entries</dt>
                    <dd>
                      {summary.loggedDays} / {comparison.periods.days}
                    </dd>
                  </div>
                  <div>
                    <dt>Highest pain</dt>
                    <dd>{summary.peak === null ? '—' : summary.peak + ' / 10'}</dd>
                  </div>
                  <div>
                    <dt>Fatigue (reported)</dt>
                    <dd>
                      {summary.fatigueAverage === null ? '—' : summary.fatigueAverage.toFixed(1) + ' / 10'}
                    </dd>
                  </div>
                  <div>
                    <dt>Morning stiffness (reported)</dt>
                    <dd>
                      {summary.stiffnessAverage === null
                        ? '—'
                        : Math.round(summary.stiffnessAverage) + ' min'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <p className="helper">
            This compares recorded entries. Days without an entry are unknown, and differences in logging
            frequency can affect the average.
          </p>
        </>
      )}
    </section>
  );
}
