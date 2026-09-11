import { useState } from 'react';
import { FINGERS, TOES, REGION_OPTIONS, jointsForRegion, labelForKey } from '../lib/lookups';
import { Icon } from './Icon';
type Props = {
  region: string;
  joint: string;
  custom: string;
  side: string;
  onChange: (value: { region?: string; joint?: string; custom?: string; side?: string }) => void;
};
const spots = [
  { key: 'neck', top: 16, left: 52 },
  { key: 'shoulders', top: 25, left: 29 },
  { key: 'elbows', top: 40, left: 77 },
  { key: 'hands', top: 54, left: 16 },
  { key: 'spine', top: 38, left: 50 },
  { key: 'hips', top: 53, left: 62 },
  { key: 'knees', top: 73, left: 39 },
  { key: 'feet', top: 93, left: 61 }
];
export function LocationPicker({ region, joint, custom, side, onChange }: Props) {
  const [digit, setDigit] = useState<number | null>(() =>
    /^(finger|toe)-\d-/.test(joint) ? Number(joint.split('-')[1]) : null
  );
  const [showBody, setShowBody] = useState(!region);
  const detailed = region === 'hands' || region === 'feet';
  const names = region === 'hands' ? FINGERS : TOES;
  const prefix = region === 'hands' ? 'finger' : 'toe';
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
          <p className="helper">Tap an area on the guide, or choose its name below.</p>
          <div className="body-guide">
            <svg viewBox="0 0 240 420" aria-hidden="true">
              <circle cx="120" cy="35" r="25" />
              <path d="M107 60v15L77 85Q67 89 62 108L42 183l-8 32q-2 17 11 18 10 0 14-15l8-32 19-51-2 79-2 32 11 133-7 22q-3 10 10 10h15l9-134 9 134h15q13 0 10-10l-7-22 11-133-2-32-2-79 19 51 8 32q4 15 14 15 13-1 11-18l-8-32-20-75q-5-19-15-23l-30-10V60" />
              <path className="body-detail" d="M120 82v142 M90 216q30 13 60 0 M100 292h10 M130 292h10" />
            </svg>
            {spots.map((spot) => (
              <button
                key={spot.key}
                type="button"
                className={'body-point ' + (region === spot.key ? 'selected' : '')}
                style={{ top: spot.top + '%', left: spot.left + '%' }}
                aria-label={labelForKey(REGION_OPTIONS, spot.key)}
                onClick={() => chooseRegion(spot.key)}
              >
                <span />
                <span className="point-label">{labelForKey(REGION_OPTIONS, spot.key).split(' &')[0]}</span>
              </button>
            ))}
          </div>
          <div className="chips area-chips">
            {REGION_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.key}
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
            <button className="text-button" type="button" onClick={() => setShowBody(true)}>
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
              <div className="digit-guide">
                <svg viewBox="0 0 300 290" aria-hidden="true">
                  {region === 'hands' ? (
                    <>
                      <path d="M90 268l-6-43-43-65q-12-23 5-30 15-4 28 17l19 24-6-95q-2-23 15-23 16 0 17 21l4 69-2-105q0-21 16-21 18 0 18 22l4 103 5-94q1-23 17-20 16 1 15 22l-2 100 10-65q4-21 19-18 16 3 12 24l-12 97q-3 23-19 49l-3 35z" />
                    </>
                  ) : (
                    <>
                      <path d="M106 271q-33-49-22-105 3-29 30-52 18-18 32-31 22-18 49 1 34 30 24 80l-19 103q-44 22-94 4z" />
                      <ellipse cx="105" cy="75" rx="23" ry="34" />
                      <ellipse cx="150" cy="58" rx="16" ry="27" />
                      <ellipse cx="184" cy="67" rx="14" ry="24" />
                      <ellipse cx="211" cy="85" rx="12" ry="21" />
                      <ellipse cx="232" cy="110" rx="10" ry="17" />
                      <path
                        d="M60 44L105 75 M114 23L150 58 M168 32L184 67 M222 58L211 85 M261 104L232 110"
                        fill="none"
                        className="digit-connectors"
                      />
                    </>
                  )}
                </svg>
                {(region === 'hands'
                  ? [
                      [13, 51],
                      [31, 21],
                      [49, 9],
                      [69, 18],
                      [87, 39]
                    ]
                  : [
                      [20, 15],
                      [38, 8],
                      [56, 11],
                      [74, 20],
                      [87, 36]
                    ]
                ).map(([x, y], i) => (
                  <button
                    type="button"
                    className={'digit-point ' + (digit === i ? 'selected' : '')}
                    key={i}
                    style={{ left: x + '%', top: y + '%' }}
                    aria-label={names[i]}
                    aria-pressed={digit === i}
                    onClick={() => chooseDigit(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="helper centered">Location guide for either side. Choose the side above.</p>
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
                    <div className="finger-sketch" aria-hidden="true">
                      <span>Nail</span>
                      {['tip', ...(digit !== 0 ? ['middle'] : []), 'base'].map((part) => (
                        <i key={part} className={joint === `${prefix}-${digit}-${part}` ? 'active' : ''} />
                      ))}
                      <small>Palm / foot</small>
                    </div>
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
              onChange={(e) =>
                onChange({
                  joint: e.target.value,
                  custom: '',
                  ...(e.target.value === 'left-knee'
                    ? { side: 'left' }
                    : e.target.value === 'right-knee'
                      ? { side: 'right' }
                      : {})
                })
              }
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
