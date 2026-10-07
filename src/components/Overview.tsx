import { useState } from 'react';
import type { EventRecord } from '../lib/db';
import {
  formatDate,
  formatDateTime,
  jointLabel,
  regionLabel,
  sideLabel,
  startOfPeriod,
  summarize,
  symptomLabel,
  type RecordFilters
} from '../lib/insights';
import { Icon } from './Icon';
import { PeriodComparison } from './PeriodComparison';
export function Overview({
  records,
  allRecords,
  total,
  filters,
  mode = 'overview',
  onLog,
  onStats,
  onJournal,
  onEdit
}: {
  records: EventRecord[];
  allRecords: EventRecord[];
  total: number;
  filters: RecordFilters;
  mode?: 'overview' | 'stats';
  onLog: () => void;
  onStats: () => void;
  onJournal: () => void;
  onEdit: (e: EventRecord) => void;
}) {
  const s = summarize(records);
  const maxScoreCount = Math.max(1, ...s.painScores.map((item) => item.count));
  const [selectedDate, setSelectedDate] = useState('');
  const selected = s.daily.find((d) => d.date === selectedDate);
  const now = Date.now();
  const chartStart =
    (filters.days === -1
      ? filters.from
        ? new Date(filters.from + 'T00:00').getTime()
        : null
      : startOfPeriod(filters.days, now)) ??
    (s.daily.length ? new Date(s.daily[0].date + 'T00:00').getTime() : startOfPeriod(30, now)!);
  const end = new Date(filters.days === -1 && filters.to ? filters.to + 'T00:00' : now);
  end.setHours(23, 59, 59, 999);
  const x = (date: string) =>
    40 +
    ((new Date(date + 'T12:00').getTime() - chartStart) / Math.max(86400000, end.getTime() - chartStart)) *
      590;
  const y = (pain: number) => 190 - pain * 15;
  return (
    <div className="overview">
      {mode === 'overview' && (
        <section className="welcome-card">
          <div>
            <p className="eyebrow">
              <span className="checkin-dot" /> YOUR DAILY CHECK-IN
            </p>
            <h2>How are you feeling?</h2>
            <p>A moment to check in. A clearer picture over time.</p>
            <button className="primary" onClick={onLog}>
              <Icon name="plus" />
              Log symptoms
            </button>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="checkin-orbit orbit-outer" />
            <div className="checkin-orbit orbit-inner" />
            <div className="checkin-core">
              <Icon name="activity" size={58} />
            </div>
          </div>
        </section>
      )}
      <div className="stats-grid">
        {[
          {
            label: 'Entries recorded',
            value: s.count,
            sub: 'in the selected view',
            icon: 'journal' as const
          },
          {
            label: 'Average pain',
            value: s.average === null ? '—' : s.average.toFixed(1),
            unit: s.average === null ? '' : '/ 10',
            sub: 'across recorded entries',
            icon: 'activity' as const
          },
          {
            label: 'Days with entries',
            value: s.loggedDays,
            sub: 'unlogged days are unknown',
            icon: 'calendar' as const
          },
          {
            label: 'Highest pain',
            value: s.peak ?? '—',
            unit: s.peak === null ? '' : '/ 10',
            sub: 'highest recorded score',
            icon: 'overview' as const
          }
        ].map((m) => (
          <section className="stat-card" key={m.label}>
            <div className="stat-label">
              {m.label}
              <span className="stat-icon">
                <Icon name={m.icon} size={18} />
              </span>
            </div>
            <div className="stat-value">
              {m.value}
              <span>{m.unit}</span>
            </div>
            <p>{m.sub}</p>
          </section>
        ))}
      </div>
      {mode === 'stats' && (s.fatigueCount > 0 || s.stiffnessCount > 0) && (
        <div className="measure-grid">
          <section className="panel measure-card">
            <p className="eyebrow">OPTIONAL OBSERVATION</p>
            <h2>Fatigue</h2>
            <strong>{s.fatigueAverage === null ? '—' : s.fatigueAverage.toFixed(1) + ' / 10'}</strong>
            <p>
              Average of {s.fatigueCount} {s.fatigueCount === 1 ? 'entry' : 'entries'} with a fatigue score.
            </p>
          </section>
          <section className="panel measure-card">
            <p className="eyebrow">OPTIONAL OBSERVATION</p>
            <h2>Morning stiffness</h2>
            <strong>{s.stiffnessAverage === null ? '—' : Math.round(s.stiffnessAverage) + ' min'}</strong>
            <p>
              Average of {s.stiffnessCount} {s.stiffnessCount === 1 ? 'entry' : 'entries'} with a duration.
            </p>
          </section>
        </div>
      )}
      {mode === 'overview' && records.length > 0 && (
        <button className="stats-link" onClick={onStats}>
          <span>
            <Icon name="activity" size={20} /> Explore your stats and compare periods
          </span>
          <Icon name="arrow" size={18} />
        </button>
      )}
      {mode === 'stats' && <PeriodComparison records={allRecords} filters={filters} />}
      {!records.length ? (
        <section className="panel empty-state">
          <span className="empty-icon">
            <Icon name="activity" size={30} />
          </span>
          <h2>{total ? 'No entries match this view' : 'Your picture starts with one entry'}</h2>
          <p>
            {total
              ? 'Try a wider date range or clear the filters to see more of your records.'
              : 'Log a symptom and your pain history, affected areas, and symptom patterns will appear here.'}
          </p>
          <button className="primary" onClick={onLog}>
            Add an entry
            <Icon name="arrow" size={18} />
          </button>
        </section>
      ) : (
        <>
          {mode === 'stats' && (
            <>
              <section className="panel trend-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">OVER TIME</p>
                    <h2>Your pain history</h2>
                    <p>Daily average and highest score on days you logged.</p>
                  </div>
                  <span className="badge">
                    <i />
                    Recorded pain
                  </span>
                </div>
                <div className="chart-wrap">
                  <svg
                    viewBox="0 0 660 235"
                    role="img"
                    aria-label="Daily pain chart, from 0 to 10. A dot is a daily average; the line above it reaches the highest score. Days without entries have no mark. See the data table below for exact values."
                  >
                    {[0, 2, 4, 6, 8, 10].map((v) => (
                      <g key={v}>
                        <line className="grid-line" x1="40" x2="630" y1={y(v)} y2={y(v)} />
                        <text x="20" y={y(v) + 4}>
                          {v}
                        </text>
                      </g>
                    ))}
                    {s.daily.map((d) => (
                      <g
                        key={d.date}
                        className="chart-point"
                        tabIndex={0}
                        role="button"
                        aria-label={`${d.date}: average pain ${d.average.toFixed(1)}, highest ${d.peak}, ${d.count} entries`}
                        onFocus={() => setSelectedDate(d.date)}
                        onClick={() => setSelectedDate(d.date)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedDate(d.date);
                          }
                        }}
                      >
                        <title>
                          {d.date}: average {d.average.toFixed(1)}, highest {d.peak}
                        </title>
                        <line
                          x1={x(d.date)}
                          x2={x(d.date)}
                          y1={y(d.average)}
                          y2={y(d.peak)}
                          className="peak-line"
                        />
                        <circle cx={x(d.date)} cy={y(d.average)} r="12" fill="transparent" />
                        <circle cx={x(d.date)} cy={y(d.average)} r="4.5" className="pain-dot" />
                      </g>
                    ))}
                    <text x="40" y="220">
                      {formatDate(chartStart)}
                    </text>
                    <text x="630" y="220" textAnchor="end">
                      {formatDate(end.getTime())}
                    </text>
                  </svg>
                </div>
                <p className="chart-caption" aria-live="polite">
                  {selected
                    ? `${selected.date} · ${selected.count} entries · average ${selected.average.toFixed(1)} / 10 · highest ${selected.peak} / 10`
                    : 'Tap a dot for details. Gaps mean no entries, not zero pain.'}
                </p>
                <details className="chart-table">
                  <summary>View daily values</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Entries</th>
                          <th>Average pain</th>
                          <th>Highest pain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.daily.map((d) => (
                          <tr key={d.date}>
                            <td>{d.date}</td>
                            <td>{d.count}</td>
                            <td>{d.average.toFixed(1)}</td>
                            <td>{d.peak}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
              <div className="two-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">WHERE YOU FEEL IT</p>
                      <h2>Affected areas</h2>
                    </div>
                    <span className="muted">Entries</span>
                  </div>
                  <div className="breakdown">
                    {s.areas.map((a) => (
                      <div className="breakdown-row" key={a.label}>
                        <div>
                          <strong>{a.label}</strong>
                          <span>{a.count}</span>
                        </div>
                        <div className="bar-track">
                          <span style={{ width: (a.count / s.count) * 100 + '%' }} />
                        </div>
                        <small>Average pain {a.average.toFixed(1)} / 10</small>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">WHAT YOU NOTICE</p>
                      <h2>Symptoms recorded</h2>
                    </div>
                  </div>
                  <div className="symptom-list">
                    {s.symptoms.map((a, i) => (
                      <div key={a.label}>
                        <span className={'symptom-marker color-' + (i % 4)} />
                        <strong>{a.label}</strong>
                        <span>
                          {a.count}
                          <small> entries</small>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="helper">An entry can include more than one symptom.</p>
                </section>
              </div>
              <section className="panel score-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">RECORDED SCORES</p>
                    <h2>Pain-score spread</h2>
                    <p>How many selected entries have each score.</p>
                  </div>
                </div>
                <div className="score-grid" role="list" aria-label="Entries by pain score">
                  {s.painScores.map(({ score, count }) => (
                    <div className="score-column" role="listitem" key={score}>
                      <span className="score-count">{count || ''}</span>
                      <span className="score-track">
                        <span style={{ height: `${(count / maxScoreCount) * 100}%` }} />
                      </span>
                      <strong>{score}</strong>
                      <span className="sr-only">
                        : {count} {count === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="helper">Each entry is counted once. Unlogged days are not included.</p>
              </section>
            </>
          )}
          {mode === 'overview' && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">YOUR LOGBOOK</p>
                  <h2>Latest entries</h2>
                </div>
                <button className="text-button" onClick={onJournal}>
                  View all
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              {records.slice(0, 3).map((e) => (
                <button className="recent-row" key={e.id} onClick={() => onEdit(e)}>
                  <span className={'pain-badge ' + (e.pain >= 7 ? 'high' : '')}>
                    {e.pain}
                    <small>/10</small>
                  </span>
                  <span className="recent-content">
                    <strong>
                      {regionLabel(e)} · {sideLabel(e.side)}
                    </strong>
                    <span>
                      {jointLabel(e)} · {symptomLabel(e)}
                    </span>
                    <small>{formatDateTime(e.startAt)}</small>
                  </span>
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </section>
          )}
        </>
      )}
      <p className="insight-note">
        <Icon name="shield" size={16} />
        These summaries describe what you’ve recorded. Share them with your care team to discuss changes.
      </p>
    </div>
  );
}
