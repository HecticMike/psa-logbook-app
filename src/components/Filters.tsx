import { REGION_OPTIONS, SYMPTOM_OPTIONS, jointsForRegion } from '../lib/lookups';
import { DEFAULT_FILTERS, type RecordFilters } from '../lib/insights';
import { Icon } from './Icon';
export function Filters({
  value,
  onChange,
  count
}: {
  value: RecordFilters;
  onChange: (f: RecordFilters) => void;
  count: number;
}) {
  const extra = Boolean(
    value.regionKey || value.jointKey || value.symptomKey || value.minPain || value.query
  );
  return (
    <div className="filter-container">
      <div className="filter-top">
        <label className="period-control">
          <Icon name="calendar" size={18} />
          <span className="sr-only">Time period</span>
          <select value={value.days} onChange={(e) => onChange({ ...value, days: Number(e.target.value) })}>
            {[
              [7, 'Last 7 days'],
              [30, 'Last 30 days'],
              [90, 'Last 90 days'],
              [183, 'Last 6 months'],
              [365, 'Last year'],
              [0, 'All time']
            ].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="filter-count">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
        <details className="filter-details">
          <summary>
            <Icon name="sliders" size={16} />
            Filters{extra && <span className="filter-dot" />}
          </summary>
          <div className="filter-fields">
            <label>
              Body area
              <select
                value={value.regionKey}
                onChange={(e) => onChange({ ...value, regionKey: e.target.value, jointKey: '' })}
              >
                <option value="">All areas</option>
                {REGION_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {value.regionKey && (
              <label>
                Joint / location
                <select
                  value={value.jointKey}
                  onChange={(e) => onChange({ ...value, jointKey: e.target.value })}
                >
                  <option value="">All locations</option>
                  {jointsForRegion(value.regionKey).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Symptom
              <select
                value={value.symptomKey}
                onChange={(e) => onChange({ ...value, symptomKey: e.target.value })}
              >
                <option value="">All symptoms</option>
                {SYMPTOM_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum pain
              <select
                value={value.minPain}
                onChange={(e) => onChange({ ...value, minPain: Number(e.target.value) })}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? 'Any score' : i + ' or higher'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Search notes & locations
              <input
                type="search"
                value={value.query}
                onChange={(e) => onChange({ ...value, query: e.target.value })}
                placeholder="e.g. walking, index finger…"
              />
            </label>
            <button onClick={() => onChange({ ...DEFAULT_FILTERS, days: value.days })}>Clear filters</button>
          </div>
        </details>
      </div>
      {extra && (
        <div className="active-filter-note">
          <span>Additional filters are applied to this view and its reports.</span>
          <button className="text-button" onClick={() => onChange({ ...DEFAULT_FILTERS, days: value.days })}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
