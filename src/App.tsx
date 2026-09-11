import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { listEvents, deleteEvent, type EventRecord } from './lib/events';
import { DEFAULT_FILTERS, filterRecords } from './lib/insights';
import { Overview } from './components/Overview';
import { Filters } from './components/Filters';
import { LogForm } from './components/LogForm';
import { Journal } from './components/Journal';
import { DataPanel } from './components/DataPanel';
import { Icon, type IconName } from './components/Icon';
import './index.css';
type View = 'overview' | 'log' | 'journal' | 'data';
const navigation: { key: View; label: string; icon: IconName }[] = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'log', label: 'Log symptoms', icon: 'plus' },
  { key: 'journal', label: 'History', icon: 'journal' },
  { key: 'data', label: 'Export & backup', icon: 'export' }
];
export default function App() {
  const [view, setView] = useState<View>('overview');
  const [records, setRecords] = useState<EventRecord[]>([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [editing, setEditing] = useState<EventRecord>();
  const [formVersion, setFormVersion] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const reload = useCallback(async () => {
    setRecords(await listEvents());
    setNow(Date.now());
  }, []);
  useEffect(() => {
    const subscription = liveQuery(() => listEvents()).subscribe({
      next: (data) => {
        setRecords(data);
        setNow(Date.now());
        setLoading(false);
        setError('');
      },
      error: () => {
        setError(
          'Your local logbook could not be opened. Check that browser storage is enabled, then try reloading.'
        );
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setNow(Date.now());
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('focus', update);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  const filtered = useMemo(() => filterRecords(records, filters, now), [records, filters, now]);
  function navigate(next: View) {
    setView(next);
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => heading.current?.focus());
  }
  function edit(e: EventRecord) {
    setEditing(e);
    setFormVersion((v) => v + 1);
    navigate('log');
  }
  function closeForm() {
    setEditing(undefined);
    setFormVersion((v) => v + 1);
    navigate('overview');
  }
  const title = {
    overview: 'Your overview',
    log: editing ? 'Edit your entry' : 'Log how you feel',
    journal: 'Your symptom history',
    data: 'Export & backup'
  }[view];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#main" onClick={() => navigate('overview')}>
          <span className="brand-mark">
            <Icon name="leaf" size={25} />
          </span>
          <span>
            PsA<span className="brand-light"> Logbook</span>
            <small>A little clarity, every day.</small>
          </span>
        </a>
        <p className="nav-caption">YOUR SPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? 'active' : ''}
              aria-current={view === item.key ? 'page' : undefined}
              onClick={() => navigate(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {view === item.key && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Icon name="shield" size={20} />
          <strong>Personal. On your device.</strong>
          <p>Your entries stay in this browser. Back them up to keep a copy.</p>
          <span className="local-status">
            <i />
            {online ? 'Available offline' : 'You’re offline'}
          </span>
        </div>
      </aside>
      <main id="main" className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">PSORIATIC ARTHRITIS · PERSONAL LOGBOOK</p>
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            <p>
              {view === 'overview'
                ? 'A clearer picture, one observation at a time.'
                : view === 'log'
                  ? 'Take a moment to check in with yourself.'
                  : view === 'journal'
                    ? 'Revisit the details and prepare for your next conversation.'
                    : 'Bring your observations to your care team.'}
            </p>
          </div>
          {view !== 'log' && (
            <button className="header-log primary" onClick={() => navigate('log')}>
              <Icon name="plus" />
              Log symptoms
            </button>
          )}
        </header>
        {!online && (
          <p className="offline-banner">
            <Icon name="shield" size={16} />
            Offline · you can still log symptoms and view your history.
          </p>
        )}
        {notice && (
          <div role="status" className="message notice">
            <Icon name="check" size={18} />
            <span>{notice}</span>
            <button className="text-button" onClick={() => navigate('log')}>
              Add another
            </button>
            <button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice('')}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="message error">
            {error}
          </p>
        )}
        {loading ? (
          <div className="panel empty-state" role="status">
            Opening your logbook…
          </div>
        ) : (
          <>
            {view !== 'log' && <Filters value={filters} onChange={setFilters} count={filtered.length} />}
            {view === 'overview' && (
              <Overview
                records={filtered}
                total={records.length}
                filters={filters}
                onLog={() => navigate('log')}
                onJournal={() => navigate('journal')}
                onEdit={edit}
              />
            )}
            <div hidden={view !== 'log'}>
              <LogForm
                key={formVersion}
                active={view === 'log'}
                entry={editing}
                recent={records}
                onCancel={closeForm}
                onSaved={() => {
                  const wasEditing = !!editing;
                  setEditing(undefined);
                  setFormVersion((v) => v + 1);
                  setNow(Date.now());
                  navigate('overview');
                  setNotice(
                    wasEditing
                      ? 'Your changes are saved.'
                      : 'Entry saved. One more observation in your logbook.'
                  );
                }}
              />
            </div>
            {view === 'journal' && (
              <Journal
                records={filtered}
                onEdit={edit}
                onLog={() => navigate('log')}
                onDelete={async (e) => {
                  await deleteEvent(e.id);
                  await reload();
                }}
              />
            )}
            {view === 'data' && (
              <DataPanel records={filtered} total={records.length} filters={filters} reload={reload} />
            )}
          </>
        )}
        <footer className="app-footer">
          <span>PsA Logbook</span>
          <span>Made for your everyday, and your next appointment.</span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button
            key={item.key}
            className={view === item.key ? 'active' : ''}
            aria-current={view === item.key ? 'page' : undefined}
            onClick={() => navigate(item.key)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.key === 'log' ? 'Log' : item.key === 'data' ? 'Export' : item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
