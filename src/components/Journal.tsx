import { useState } from 'react';
import type { EventRecord } from '../lib/db';
import { ACTION_OPTIONS, TRIGGER_OPTIONS, labelForKey } from '../lib/lookups';
import { formatDateTime, jointLabel, regionLabel, sideLabel, symptomLabel } from '../lib/insights';
import { Icon } from './Icon';
export function Journal({
  records,
  onEdit,
  onDelete,
  onLog
}: {
  records: EventRecord[];
  onEdit: (e: EventRecord) => void;
  onDelete: (e: EventRecord) => Promise<void>;
  onLog: () => void;
}) {
  const [limit, setLimit] = useState(30);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove(e: EventRecord) {
    setBusy(true);
    setError('');
    try {
      await onDelete(e);
      setDeleting(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="journal">
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      {!records.length && (
        <section className="panel empty-state">
          <Icon name="journal" size={32} />
          <h2>No entries in this view</h2>
          <p>Add a symptom entry, or adjust the date range and filters.</p>
          <button className="primary" onClick={onLog}>
            Log symptoms
          </button>
        </section>
      )}
      {records.slice(0, limit).map((e) => (
        <article className="panel journal-card" key={e.id}>
          <div className="journal-heading">
            <span className={'pain-badge ' + (e.pain >= 7 ? 'high' : '')}>
              {e.pain}
              <small>/10</small>
            </span>
            <div>
              <p className="entry-date">{formatDateTime(e.startAt)}</p>
              <h2>
                {regionLabel(e)} <span>· {sideLabel(e.side)}</span>
              </h2>
              <p>{jointLabel(e)}</p>
            </div>
          </div>
          <div className="entry-symptoms">{symptomLabel(e)}</div>
          {e.notes && <p className="event-notes">{e.notes}</p>}
          <details className="entry-details">
            <summary>Entry details</summary>
            <dl>
              <dt>Ended</dt>
              <dd>{e.endAt != null ? formatDateTime(e.endAt) : 'Not recorded / ongoing'}</dd>
              <dt>Possible trigger</dt>
              <dd>{e.triggerCustom || labelForKey(TRIGGER_OPTIONS, e.triggerKey)}</dd>
              <dt>Action taken</dt>
              <dd>{e.actionCustom || labelForKey(ACTION_OPTIONS, e.actionKey)}</dd>
              <dt>Last updated</dt>
              <dd>{formatDateTime(e.updatedAt)}</dd>
            </dl>
          </details>
          <div className="entry-actions">
            <button onClick={() => onEdit(e)}>
              <Icon name="edit" size={16} />
              Edit entry
            </button>
            <button className="text-button danger" onClick={() => setDeleting(e.id)}>
              Delete
            </button>
          </div>
          {deleting === e.id && (
            <div className="delete-confirm" role="group" aria-label="Confirm deletion">
              <p>Delete this entry from this device?</p>
              <div className="button-row">
                <button disabled={busy} className="danger-button" onClick={() => remove(e)}>
                  {busy ? 'Deleting…' : 'Delete entry'}
                </button>
                <button disabled={busy} onClick={() => setDeleting(null)}>
                  Keep entry
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
      {records.length > limit && (
        <button className="load-more" onClick={() => setLimit(limit + 30)}>
          Show 30 more entries
        </button>
      )}
    </div>
  );
}
