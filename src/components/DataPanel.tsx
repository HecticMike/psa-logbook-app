import { useEffect, useState } from 'react';
import type { EventRecord } from '../lib/db';
import { exportAllEventsAsJson, importEventsFromJson } from '../lib/events';
import {
  backupToDrive,
  connectDrive,
  getDriveStatus,
  isDriveAvailable,
  restoreFromDrive,
  type DriveStatus
} from '../lib/drive';
import { filterDescription, formatDateTime, type RecordFilters } from '../lib/insights';
import { downloadFile, downloadWorkbook, recordsAsCsv } from '../lib/report';
import { Icon } from './Icon';
export function DataPanel({
  records,
  total,
  filters,
  reload
}: {
  records: EventRecord[];
  total: number;
  filters: RecordFilters;
  reload: () => Promise<void>;
}) {
  const [status, setStatus] = useState<DriveStatus>({ configured: isDriveAvailable(), connected: false });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; content: unknown; count: number } | null>(
    null
  );
  useEffect(() => {
    getDriveStatus()
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, []);
  async function run(label: string, action: () => Promise<string>) {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      setMessage(await action());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
      getDriveStatus()
        .then(setStatus)
        .catch(() => {});
    }
  }
  return (
    <div className="data-grid">
      <section className="panel report-panel">
        <span className="feature-icon">
          <Icon name="export" size={26} />
        </span>
        <p className="eyebrow">READY FOR YOUR APPOINTMENT</p>
        <h2>Your records, ready to share.</h2>
        <p>
          Download an Excel workbook with a summary, detailed entries, daily pain, body areas, and symptoms.
        </p>
        <div className="export-scope">
          <strong>{records.length} entries selected</strong>
          <span>{filterDescription(filters)}</span>
        </div>
        <div className="button-row">
          <button
            className="primary"
            disabled={!!busy || !records.length}
            onClick={() =>
              run('excel', async () => {
                await downloadWorkbook(records, filters);
                return 'Excel report downloaded.';
              })
            }
          >
            <Icon name="export" />
            {busy === 'excel' ? 'Preparing workbook…' : 'Download Excel report'}
          </button>
          <button
            disabled={!!busy || !records.length}
            onClick={() =>
              run('csv', async () => {
                downloadFile('psa-logbook-entries.csv', recordsAsCsv(records), 'text/csv;charset=utf-8');
                return 'CSV downloaded.';
              })
            }
          >
            CSV
          </button>
        </div>
        <p className="helper">
          Reports use the filters above. Excel includes the time zone and explains how the summaries are
          calculated.
        </p>
      </section>
      <section className="panel">
        <span className="feature-icon">
          <Icon name="shield" size={26} />
        </span>
        <h2>Keep a copy of your logbook</h2>
        <p>
          Your entries live in this browser on this device. A full backup lets you restore them or move to
          another device.
        </p>
        <p className="backup-count">
          <strong>{total}</strong> total entries · full backup ignores filters
        </p>
        <div className="button-row">
          <button
            disabled={!!busy}
            onClick={() =>
              run('json', async () => {
                const data = await exportAllEventsAsJson();
                downloadFile('psa-logbook-backup.json', JSON.stringify(data, null, 2), 'application/json');
                return 'Full backup downloaded.';
              })
            }
          >
            Download full backup
          </button>
        </div>
        <label className="import-field">
          Restore a JSON backup
          <input
            type="file"
            accept=".json,application/json"
            disabled={!!busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setError('');
              setPendingFile(null);
              try {
                const content = JSON.parse(await file.text());
                if (!Array.isArray(content?.events)) throw new Error('Choose a PsA Logbook JSON backup.');
                setPendingFile({ name: file.name, content, count: content.events.length });
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
        </label>
        {pendingFile && (
          <div className="restore-confirm">
            <strong>{pendingFile.name}</strong>
            <p>
              {pendingFile.count} entries in this file. Import merges by ID and keeps the most recently edited
              version. Existing unrelated entries stay.
            </p>
            <div className="button-row">
              <button
                className="primary"
                disabled={!!busy}
                onClick={() =>
                  run('import', async () => {
                    const result = await importEventsFromJson(pendingFile.content);
                    setPendingFile(null);
                    await reload();
                    return `Imported or updated ${result.imported} entries.`;
                  })
                }
              >
                Import backup
              </button>
              <button disabled={!!busy} onClick={() => setPendingFile(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <p className="helper">
          Deleting an entry locally does not remove it from older backups. Restoring an older backup can bring
          it back.
        </p>
      </section>
      <section className="panel cloud-panel">
        <div className="panel-heading">
          <div>
            <h2>
              <Icon name="cloud" /> Google Drive backup
            </h2>
            <p>Optional · you decide when to back up or restore.</p>
          </div>
          <span className="badge">
            {status.connected ? 'Connected' : status.configured ? 'Not connected' : 'Not set up'}
          </span>
        </div>
        {status.configured ? (
          <>
            <div className="button-row">
              <button
                disabled={!!busy || status.connected}
                onClick={() =>
                  run('connect', async () => {
                    await connectDrive();
                    return 'Google Drive connected.';
                  })
                }
              >
                Connect Google Drive
              </button>
              <button
                disabled={!!busy || !status.connected}
                onClick={() =>
                  run('backup', async () => {
                    await backupToDrive();
                    return 'Full backup saved to Google Drive.';
                  })
                }
              >
                Back up now
              </button>
              <button disabled={!!busy || !status.connected} onClick={() => setConfirmRestore(true)}>
                Restore from Drive
              </button>
            </div>
            {confirmRestore && (
              <div className="restore-confirm">
                <p>
                  Merge the Drive backup into this device? The most recently edited version of each entry will
                  be kept.
                </p>
                <div className="button-row">
                  <button
                    disabled={!!busy}
                    className="primary"
                    onClick={() =>
                      run('restore', async () => {
                        const result = await restoreFromDrive();
                        setConfirmRestore(false);
                        await reload();
                        return `Imported or updated ${result.imported} entries from Drive.`;
                      })
                    }
                  >
                    Merge backup
                  </button>
                  <button disabled={!!busy} onClick={() => setConfirmRestore(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="helper">
            Google Drive hasn’t been set up for this installation. You can use full backup files above at any
            time.
          </p>
        )}
        <p className="helper">
          Last Drive backup:{' '}
          {status.lastBackupAt ? formatDateTime(status.lastBackupAt) : 'No backup recorded'}
          <br />
          Last Drive restore:{' '}
          {status.lastRestoreAt ? formatDateTime(status.lastRestoreAt) : 'No restore recorded'}
        </p>
      </section>
      {busy && (
        <p role="status" className="message">
          Working…
        </p>
      )}
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
