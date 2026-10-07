import { useState } from 'react';
import { FINGERS, TOES, REGION_OPTIONS, jointsForRegion, labelForKey } from '../lib/lookups';
import { Icon } from './Icon';
import { BodyArtwork, HandArtwork, FootArtwork, DigitArtwork } from './AnatomyArt';
type Props = {
  region: string;
  joint: string;
  custom: string;
  side: string;
  onChange: (value: { region?: string; joint?: string; custom?: string; side?: string }) => void;
};
// Percent coordinates are calibrated against the generated front and back artwork.
const spots: { key: string; front?: [number, number]; back: [number, number] }[] = [
  { key: 'neck', front: [50, 16], back: [50, 16] },
  { key: 'shoulders', front: [34, 22], back: [67, 22] },
  { key: 'elbows', front: [26, 35], back: [74, 36] },
  { key: 'hands', front: [17, 51], back: [83, 52] },
  { key: 'spine', back: [50, 37] },
  { key: 'hips', front: [38, 48], back: [62, 48] },
  { key: 'knees', front: [40, 66], back: [62, 70] },
  { key: 'feet', front: [39, 93], back: [64, 94] }
];
const handPoints = [
  [18, 48],
  [33, 17],
  [52, 10],
  [67, 17],
  [83, 30]
];
const footCallouts = [15, 32.5, 50, 67.5, 85];
const toeTargets = [
  [37, 10],
  [48, 11],
  [55, 14],
  [61, 19],
  [66, 25]
];
export function LocationPicker({ region, joint, custom, side, onChange }: Props) {
  const [digit, setDigit] = useState<number | null>(() =>
    /^(finger|toe)-\d-/.test(joint) ? Number(joint.split('-')[1]) : null
  );
  const [showBody, setShowBody] = useState(!region);
  const [bodyView, setBodyView] = useState<'front' | 'back'>(region === 'spine' ? 'back' : 'front');
  const detailed = region === 'hands' || region === 'feet';
  const names = region === 'hands' ? FINGERS : TOES;
  const prefix = region === 'hands' ? 'finger' : 'toe';
  const areaChoices = REGION_OPTIONS;
  // The hand art is a left palm; the foot art is a right foot viewed from above.
  const mirrored = region === 'hands' ? side === 'right' : side === 'left';
  function chooseDigit(index: number) {
    setDigit(index);
    onChange({ joint: `${prefix}-${index}-whole`, custom: '' });
  }
  function chooseRegion(key: string) {
    onChange({
      region: key,
      joint: '',
      custom: '',
      side: ['spine', 'neck', 'other'].includes(key) ? '' : side
    });
    setDigit(null);
    setShowBody(false);
  }
  return (
    <div className="location-picker">
      {showBody ? (
        <>
          <p className="helper">Tap a marked area, or choose its name below.</p>
          <div className="body-view-switch" role="group" aria-label="Body view">
            <button type="button" aria-pressed={bodyView === 'front'} onClick={() => setBodyView('front')}>
              Front view
            </button>
            <button type="button" aria-pressed={bodyView === 'back'} onClick={() => setBodyView('back')}>
              Back view
            </button>
          </div>
          <div className="body-guide">
            <BodyArtwork view={bodyView} />
            {spots.filter((spot) => spot[bodyView]).map((spot) => {
              const [left, top] = spot[bodyView]!;
              return (
                <button
                  key={spot.key}
                  type="button"
                  className={'body-point ' + (region === spot.key ? 'selected' : '')}
                  style={{ top: top + '%', left: left + '%' }}
                  aria-label={labelForKey(REGION_OPTIONS, spot.key)}
                  aria-pressed={region === spot.key}
                  onClick={() => chooseRegion(spot.key)}
                >
                  <span aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div className="chips area-chips">
            {areaChoices.map((o) => (
              <button
                type="button"
                key={o.key}
                aria-label={o.label}
                aria-pressed={region === o.key}
                onClick={() => chooseRegion(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="location-breadcrumb">
            <strong>{labelForKey(REGION_OPTIONS, region)}</strong>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setBodyView(region === 'spine' ? 'back' : 'front');
                setShowBody(true);
              }}
            >
              Change area
            </button>
          </div>
          {!['spine', 'neck', 'other'].includes(region) && (
            <fieldset className="side-picker">
              <legend>Which side of your body?</legend>
              <div className="segmented">
                {[
                  ['left', 'Left'],
                  ['right', 'Right'],
                  ['both', 'Both'],
                  ['', 'Unsure']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={side === key}
                    onClick={() =>
                      onChange({
                        side: key,
                        ...(joint === 'left-knee' || joint === 'right-knee' ? { joint: 'knee' } : {})
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {detailed && (
            <div className="detail-guide">
              <div className={'digit-guide ' + (region === 'feet' ? 'foot-guide' : 'hand-guide')}>
                <div className={'digit-image ' + (mirrored ? 'art-mirrored' : '')}>
                  {region === 'hands' ? <HandArtwork /> : <FootArtwork />}
                </div>
                {region === 'feet' && (
                  <svg className="toe-leaders" viewBox="0 0 300 350" aria-hidden="true">
                    {toeTargets.map(([x, y], i) => {
                      return (
                        <line
                          key={i}
                          x1={(mirrored ? 100 - footCallouts[i] : footCallouts[i]) * 3}
                          y1="45"
                          x2={(mirrored ? 100 - x : x) * 3}
                          y2={50 + y * 3}
                        />
                      );
                    })}
                  </svg>
                )}
                {(region === 'hands' ? handPoints : footCallouts.map((x) => [x, 7.1])).map(([x, y], i) => (
                  <button
                    type="button"
                    className={'digit-point ' + (digit === i ? 'selected' : '')}
                    key={i}
                    style={{ left: (mirrored ? 100 - x : x) + '%', top: y + '%' }}
                    aria-label={names[i]}
                    aria-pressed={digit === i}
                    onClick={() => chooseDigit(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="helper centered">The guide mirrors for your selected side. Tap a marker or choose a name below.</p>
              <div className="chips digit-names">
                {names.map((name, i) => (
                  <button key={name} type="button" aria-pressed={digit === i} onClick={() => chooseDigit(i)}>
                    <span className="number">{i + 1}</span>
                    {name}
                  </button>
                ))}
              </div>
              {digit !== null && (
                <div className="joint-detail">
                  <strong>{names[digit]}: where does it feel affected?</strong>
                  <div className="joint-guide">
                    <DigitArtwork
                      kind={region === 'hands' ? 'finger' : 'toe'}
                      selected={joint.split('-').at(-1) ?? ''}
                      digitIndex={digit}
                    />
                    <div className="joint-buttons">
                      {['tip', ...(digit !== 0 ? ['middle'] : []), 'base', 'whole'].map((part) => (
                        <button
                          type="button"
                          key={part}
                          aria-pressed={joint === `${prefix}-${digit}-${part}`}
                          onClick={() => onChange({ joint: `${prefix}-${digit}-${part}`, custom: '' })}
                        >
                          {
                            {
                              tip: 'Joint nearest the nail',
                              middle: 'Middle joint',
                              base: 'Base knuckle',
                              whole: 'Whole digit / unsure joint'
                            }[part]
                          }
                          {joint === `${prefix}-${digit}-${part}` && <Icon name="check" size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <label className="field">
            {detailed ? 'Or choose a location by name' : 'More specific location (optional)'}
            <select
              value={joint}
              onChange={(e) => {
                const digitMatch = e.target.value.match(/^(?:finger|toe)-(\d)-/);
                setDigit(digitMatch ? Number(digitMatch[1]) : null);
                onChange({
                  joint: e.target.value,
                  custom: '',
                  ...(e.target.value === 'left-knee'
                    ? { side: 'left' }
                    : e.target.value === 'right-knee'
                      ? { side: 'right' }
                      : {})
                });
              }}
            >
              <option value="">Whole area / unsure of joint</option>
              {jointsForRegion(region).map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {(joint === 'other' || region === 'other') && (
            <label className="field">
              Describe the location
              <input
                value={custom}
                onChange={(e) => onChange({ custom: e.target.value })}
                placeholder="e.g. outside of left ankle"
                required
              />
            </label>
          )}
          <div className="selection-summary">
            <Icon name="check" size={17} />
            <span>
              {side ? side[0].toUpperCase() + side.slice(1) + ' · ' : ''}
              {labelForKey(REGION_OPTIONS, region)} ·{' '}
              {custom || (joint ? labelForKey(jointsForRegion(region), joint) : 'Area only / unsure joint')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
