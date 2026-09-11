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
import { jointLabel, regionLabel, sideLabel, symptomKeys, toLocalInput } from '../lib/insights';
import { LocationPicker } from './LocationPicker';
import { Icon } from './Icon';
type Form = {
  start: string;
  end: string;
  pain: number | null;
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
function initial(entry?: EventRecord): Form {
  return {
    start: toLocalInput(entry?.startAt),
    end: entry?.endAt != null ? toLocalInput(entry.endAt) : '',
    pain: entry?.pain ?? null,
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
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Form>(() => initial(entry));
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(Boolean(entry?.endAt || entry?.triggerKey || entry?.actionKey));
  const [locationVersion, setLocationVersion] = useState(0);
  const initialStart = useRef(form.start);
  useEffect(() => {
    if (active && !entry)
      setForm((current) => {
        if (
          current.start !== initialStart.current ||
          current.region ||
          current.symptoms.length ||
          current.notes ||
          current.pain !== null
        )
          return current;
        initialStart.current = toLocalInput();
        return { ...current, start: initialStart.current };
      });
  }, [active, entry]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const frequent = [
    ...new Map(
      recent
        .filter((e) => e.regionKey)
        .map((e) => [`${e.regionKey}|${e.jointKey}|${e.side}`, e] as const)
        .reverse()
    ).values()
  ]
    .reverse()
    .slice(0, 3);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving.current) return;
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
      setForm(initial());
      onSaved();
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
              <span className="eyebrow">Recent locations</span>
              <div className="chips">
                {frequent.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => {
                      setForm((p) => ({
                        ...p,
                        region: e.regionKey ?? '',
                        joint: e.jointKey ?? '',
                        custom: e.jointCustom ?? '',
                        side: e.side ?? ''
                      }));
                      setLocationVersion((v) => v + 1);
                    }}
                  >
                    {sideLabel(e.side).replace('Side not recorded', '')} {regionLabel(e)} · {jointLabel(e)}
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
            End time, possible trigger & action taken
          </button>
          {more && (
            <div className="more-fields">
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
            <button type="button" onClick={onCancel} disabled={busy}>
              {entry ? 'Cancel edit' : 'Clear & close'}
            </button>
          </div>
          <p className="helper">Saved on this device. Ready even when you’re offline.</p>
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
        <p>For another affected area, save this entry and add a new one. You can reuse a recent location.</p>
      </aside>
    </form>
  );
}
