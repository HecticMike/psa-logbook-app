import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createEvent, updateEvent, type EventRecord, type EventFormValues } from '../lib/events';
import {
  ACTION_OPTIONS,
  REGION_OPTIONS,
  SYMPTOM_OPTIONS,
  TRIGGER_OPTIONS,
  labelForKey,
  type Option
} from '../lib/lookups';
import {
  formatDate,
  jointLabel,
  regionLabel,
  sideLabel,
  symptomKeys,
  symptomLabel,
  toLocalInput
} from '../lib/insights';
import { LocationPicker } from './LocationPicker';
import { Icon } from './Icon';
type Form = {
  start: string;
  end: string;
  pain: number | null;
  fatigue: number | null;
  morningStiffnessMinutes: number | null;
  region: string;
  joint: string;
  custom: string;
  side: string;
  symptoms: string[];
  symptomCustom: string;
  trigger: string;
  triggerCustom: string;
  action: string;
  actionCustom: string;
  notes: string;
};
const draftKey = 'psa-logbook-entry-draft-v1';
function initial(entry?: EventRecord): Form {
  return {
    start: toLocalInput(entry?.startAt),
    end: entry?.endAt != null ? toLocalInput(entry.endAt) : '',
    pain: entry?.pain ?? null,
    fatigue: entry?.fatigue ?? null,
    morningStiffnessMinutes: entry?.morningStiffnessMinutes ?? null,
    region: entry?.regionKey ?? '',
    joint: entry?.jointKey ?? '',
    custom: entry?.jointCustom ?? '',
    side: entry?.side ?? '',
    symptoms: entry ? symptomKeys(entry) : [],
    symptomCustom: entry?.symptomCustom ?? '',
    trigger: entry?.triggerKey ?? '',
    triggerCustom: entry?.triggerCustom ?? '',
    action: entry?.actionKey ?? '',
    actionCustom: entry?.actionCustom ?? '',
    notes: entry?.notes ?? ''
  };
}
function readDraft(): Form {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (
      value &&
      typeof value.start === 'string' &&
      Array.isArray(value.symptoms) &&
      typeof value.region === 'string' &&
      typeof value.notes === 'string' &&
      (value.pain === null || Number.isInteger(value.pain))
    ) {
      return { ...initial(), ...value };
    }
  } catch {
    /* Storage may be unavailable. Logging still works. */
  }
  return initial();
}
export function LogForm({
  active,
  entry,
  recent,
  onSaved,
  onCancel
}: {
  active: boolean;
  entry?: EventRecord;
  recent: EventRecord[];
  onSaved: (continueLogging: boolean) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Form>(() => (entry ? initial(entry) : readDraft()));
  const [restoredDraft] = useState(() => {
    try {
      return !entry && !!localStorage.getItem(draftKey);
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(
    Boolean(
      entry?.endAt ||
      entry?.triggerKey ||
      entry?.actionKey ||
      entry?.fatigue != null ||
      entry?.morningStiffnessMinutes != null
    )
  );
  const [locationVersion, setLocationVersion] = useState(0);
  const initialStart = useRef(form.start);
  const hasDraft = Boolean(
    restoredDraft ||
    form.start !== initialStart.current ||
    form.region ||
    form.symptoms.length ||
    form.notes ||
    form.pain !== null ||
    form.fatigue !== null ||
    form.morningStiffnessMinutes !== null ||
    form.end ||
    form.trigger ||
    form.action
  );
  useEffect(() => {
    if (entry) return;
    try {
      if (hasDraft) localStorage.setItem(draftKey, JSON.stringify(form));
      else localStorage.removeItem(draftKey);
    } catch {
      /* A storage error must not prevent saving the entry in IndexedDB. */
    }
  }, [form, entry, hasDraft]);
  useEffect(() => {
    if (active && !entry)
      setForm((current) => {
        if (
          current.start !== initialStart.current ||
          current.region ||
          current.symptoms.length ||
          current.notes ||
          current.pain !== null ||
          current.fatigue !== null ||
          current.morningStiffnessMinutes !== null
        )
          return current;
        initialStart.current = toLocalInput();
        return { ...current, start: initialStart.current };
      });
  }, [active, entry]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const frequent = recent
    .filter((e) => e.regionKey)
    .filter(
      (e, index, all) =>
        all.findIndex(
          (other) =>
            `${other.regionKey}|${other.jointKey}|${other.side}` === `${e.regionKey}|${e.jointKey}|${e.side}`
        ) === index
    )
    .slice(0, 3);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    const continueLogging =
      !entry && ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'another';
    setError('');
    if (!form.region && !entry?.region) {
      setError('Choose a body area first. You can select “Another area” if you are unsure.');
      return;
    }
    if (!form.symptoms.length) {
      setError('Select at least one symptom.');
      return;
    }
    if (form.pain === null) {
      setError('Choose your pain level, including 0 if there is no pain.');
      return;
    }
    const startAt = new Date(form.start).getTime();
    if (startAt > Date.now()) {
      setError('The start time cannot be in the future.');
      return;
    }
    const values: EventFormValues = {
      startAt,
      endAt: form.end ? new Date(form.end).getTime() : null,
      pain: form.pain,
      fatigue: form.fatigue,
      morningStiffnessMinutes: form.morningStiffnessMinutes,
      region: form.region ? labelForKey(REGION_OPTIONS, form.region) : (entry?.region ?? ''),
      regionKey: form.region || undefined,
      jointKey: form.joint || undefined,
      jointCustom: form.custom.trim(),
      side: form.side as EventRecord['side'],
      symptomKeys: form.symptoms,
      symptomKey: form.symptoms[0],
      symptomCustom: form.symptoms.includes('other') ? form.symptomCustom.trim() : '',
      triggerKey: form.trigger || undefined,
      triggerCustom: form.trigger === 'other' ? form.triggerCustom.trim() : '',
      actionKey: form.action || undefined,
      actionCustom: form.action === 'other' ? form.actionCustom.trim() : '',
      notes: form.notes.trim()
    };
    saving.current = true;
    setBusy(true);
    try {
      if (entry) await updateEvent(entry.id, values);
      else await createEvent(values);
      if (!entry) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* Ignore unavailable storage. */
        }
      }
      if (continueLogging) {
        initialStart.current = form.start;
        setForm({
          ...initial(),
          start: form.start,
          symptoms: [...form.symptoms],
          symptomCustom: form.symptomCustom
        });
        setLocationVersion((version) => version + 1);
        setSessionCount((count) => count + 1);
        setMore(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else setForm(initial());
      onSaved(continueLogging);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function optionalSelect(
    title: string,
    options: Option[],
    key: 'trigger' | 'action',
    customKey: 'triggerCustom' | 'actionCustom'
  ) {
    return (
      <div>
        <label className="field">
          {title}
          <select value={form[key]} onChange={(e) => set(key, e.target.value)}>
            <option value="">Not recorded / unsure</option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {form[key] === 'other' && (
          <label className="field">
            Describe {key}
            <input required value={form[customKey]} onChange={(e) => set(customKey, e.target.value)} />
          </label>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="log-layout">
      <div className="log-main">
        {sessionCount > 0 && !entry && (
          <p className="session-progress" role="status">
            <Icon name="check" size={18} />
            {sessionCount} {sessionCount === 1 ? 'area' : 'areas'} saved. Choose the next location and its own
            pain score.
          </p>
        )}
        {restoredDraft && !entry && (
          <p className="draft-reminder" role="status">
            Your unfinished entry is here. Check the start time before saving.
          </p>
        )}
        <section className="panel">
          <div className="section-heading">
            <span className="step">1</span>
            <div>
              <h2>Where do you feel it?</h2>
              <p>Start with the area. Be as specific as you can.</p>
            </div>
          </div>
          {!entry && frequent.length > 0 && (
            <div className="recent-locations">
              <span className="eyebrow">QUICK START · RECENT ENTRIES</span>
              <p className="helper">Reuse a location and symptoms, then choose today’s pain score.</p>
              <div className="recent-template-list">
                {frequent.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    aria-label={`Use details from ${formatDate(e.startAt)}: ${sideLabel(e.side)}, ${regionLabel(e)}, ${jointLabel(e)}, ${symptomLabel(e)}`}
                    onClick={() => {
                      setForm((p) => ({
                        ...p,
                        region: e.regionKey ?? '',
                        joint: e.jointKey ?? '',
                        custom: e.jointCustom ?? '',
                        side: e.side ?? '',
                        symptoms: symptomKeys(e),
                        symptomCustom: e.symptomCustom ?? '',
                        pain: null
                      }));
                      setLocationVersion((v) => v + 1);
                    }}
                  >
                    <strong>
                      {sideLabel(e.side).replace('Side not recorded', 'Side unsure')} · {regionLabel(e)}
                    </strong>
                    <span>
                      {jointLabel(e)} · {symptomLabel(e)}
                    </span>
                    <small>{formatDate(e.startAt)} · Use details</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {entry && !entry.regionKey && (
            <p className="helper">
              Earlier location: {entry.region}. Choose an area to refine it, or keep the existing description.
            </p>
          )}
          <LocationPicker
            key={locationVersion}
            region={form.region}
            joint={form.joint}
            custom={form.custom}
            side={form.side}
            onChange={(changes) => setForm((prev) => ({ ...prev, ...changes }))}
          />
        </section>
        <section className="panel">
          <div className="section-heading">
            <span className="step">2</span>
            <div>
              <h2>What are you noticing?</h2>
              <p>Choose all symptoms that apply to this location.</p>
            </div>
          </div>
          <div className="chips symptom-chips">
            {SYMPTOM_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={form.symptoms.includes(o.key)}
                onClick={() =>
                  set(
                    'symptoms',
                    form.symptoms.includes(o.key)
                      ? form.symptoms.filter((k) => k !== o.key)
                      : [...form.symptoms, o.key]
                  )
                }
              >
                {form.symptoms.includes(o.key) && <Icon name="check" size={16} />}
                {o.label}
              </button>
            ))}
          </div>
          {form.symptoms.includes('other') && (
            <label className="field">
              Describe the symptom
              <input
                required
                value={form.symptomCustom}
                onChange={(e) => set('symptomCustom', e.target.value)}
              />
            </label>
          )}
          {entry?.symptomKey && !SYMPTOM_OPTIONS.some((o) => o.key === entry.symptomKey) && (
            <p className="helper">Earlier symptom retained: {entry.symptomKey}</p>
          )}
          <fieldset className="pain-field">
            <legend>
              Pain level <strong>{form.pain === null ? 'Choose a score' : form.pain + ' / 10'}</strong>
            </legend>
            <div className="pain-scale">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Pain ${i} out of 10`}
                  aria-pressed={form.pain === i}
                  onClick={() => set('pain', i)}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="scale-labels">
              <span>0 · No pain</span>
              <span>10 · Worst imaginable</span>
            </div>
          </fieldset>
        </section>
        <section className="panel">
          <div className="section-heading">
            <span className="step">3</span>
            <div>
              <h2>When & anything else</h2>
              <p>A short note can help you remember the context.</p>
            </div>
          </div>
          <label className="field">
            Started at
            <input
              type="datetime-local"
              required
              value={form.start}
              onChange={(e) => set('start', e.target.value)}
            />
          </label>
          <label className="field">
            Notes <span className="optional">optional</span>
            <textarea
              rows={3}
              placeholder="What felt different? Did it affect walking, sleep, or everyday tasks?"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
          <button
            type="button"
            className="details-toggle"
            aria-expanded={more}
            onClick={() => setMore(!more)}
          >
            <Icon name={more ? 'close' : 'plus'} size={17} />
            Fatigue, morning stiffness & other details
          </button>
          {more && (
            <div className="more-fields">
              <p className="helper">Optional observations. Leave blank when you haven’t measured them.</p>
              <div className="measure-fields">
                <label className="field">
                  Fatigue (0–10)
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="1"
                    inputMode="numeric"
                    value={form.fatigue ?? ''}
                    onChange={(e) => set('fatigue', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  Morning stiffness (minutes)
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    step="1"
                    inputMode="numeric"
                    value={form.morningStiffnessMinutes ?? ''}
                    onChange={(e) =>
                      set('morningStiffnessMinutes', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <label className="field">
                Ended at <span className="optional">leave blank if unknown or ongoing</span>
                <input
                  type="datetime-local"
                  min={form.start}
                  value={form.end}
                  onChange={(e) => set('end', e.target.value)}
                />
              </label>
              {optionalSelect('Possible trigger', TRIGGER_OPTIONS, 'trigger', 'triggerCustom')}
              {optionalSelect('Action taken', ACTION_OPTIONS, 'action', 'actionCustom')}
            </div>
          )}
        </section>
        <div className="save-bar">
          {error && (
            <p role="alert" className="message error">
              {error}
            </p>
          )}
          <div className="button-row">
            <button type="submit" className="primary" disabled={busy}>
              <Icon name="check" />
              {busy ? 'Saving…' : entry ? 'Save changes' : 'Save entry'}
            </button>
            {!entry && (
              <button
                type="submit"
                name="saveAction"
                value="another"
                className="save-another"
                aria-label="Save and add another area"
                disabled={busy}
              >
                <Icon name="plus" size={18} />
                Save + next area
              </button>
            )}
            <button
              type="button"
              className={!entry ? 'form-close' : undefined}
              onClick={() => {
                if (!entry) {
                  try {
                    localStorage.removeItem(draftKey);
                  } catch {
                    /* Ignore unavailable storage. */
                  }
                }
                onCancel();
              }}
              disabled={busy}
            >
              {entry ? 'Cancel edit' : sessionCount ? 'Done for now' : 'Clear & close'}
            </button>
          </div>
          <p className="helper">
            {!entry && hasDraft
              ? 'Draft kept on this device until you save or clear it.'
              : 'Saved on this device. Ready even when you’re offline.'}
          </p>
        </div>
      </div>
      <aside className="log-aside">
        <Icon name="leaf" size={30} />
        <h2>
          A little detail.
          <br />A clearer picture.
        </h2>
        <p>
          You don’t need to know the medical name. Pick the nearest area and describe it in your own words.
        </p>
        <div className="aside-rule" />
        <strong>One location, one entry</strong>
        <p>
          Use “Save + next area” to record each affected location with its own pain score. The time and
          symptoms carry forward; review them for the next area.
        </p>
      </aside>
    </form>
  );
}
