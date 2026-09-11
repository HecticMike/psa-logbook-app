export const OTHER_KEY = 'other';
export type Option = { key: string; label: string };
export type TimeframeKey = 'all' | 'year' | 'm6' | 'month' | 'week';
export const TIMEFRAME_OPTIONS: Option[] = [
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: 'm6', label: 'Last 6 months' },
  { key: 'year', label: 'Last year' },
  { key: 'all', label: 'All time' }
];
export const REGION_OPTIONS: Option[] = [
  { key: 'hands', label: 'Hands & wrists' },
  { key: 'feet', label: 'Feet & ankles' },
  { key: 'knees', label: 'Knees' },
  { key: 'hips', label: 'Hips' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'elbows', label: 'Elbows' },
  { key: 'spine', label: 'Back' },
  { key: 'neck', label: 'Neck' },
  { key: 'other', label: 'Another area' }
];
export const FINGERS = ['Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger'];
export const TOES = ['Big toe', 'Second toe', 'Third toe', 'Fourth toe', 'Little toe'];
export function digitOptions(region: string): Option[] {
  return (region === 'hands' ? FINGERS : TOES).flatMap((name, index) => {
    const prefix = region === 'hands' ? 'finger' : 'toe';
    const parts = index === 0 ? ['base', 'tip', 'whole'] : ['base', 'middle', 'tip', 'whole'];
    const labels: Record<string, string> = {
      base: 'base knuckle',
      middle: 'middle joint',
      tip: 'joint nearest nail',
      whole: 'whole digit / unsure joint'
    };
    return parts.map((part) => ({ key: `${prefix}-${index}-${part}`, label: `${name} · ${labels[part]}` }));
  });
}
export const JOINT_OPTIONS_BY_REGION: Record<string, Option[]> = {
  hands: [
    { key: 'fingers', label: 'Fingers · unsure which joint' },
    { key: 'wrists', label: 'Wrist' },
    ...digitOptions('hands'),
    { key: 'other', label: 'Another location in hand' }
  ],
  feet: [
    { key: 'ankles', label: 'Ankle' },
    { key: 'toes', label: 'Toes · unsure which joint' },
    { key: 'heel', label: 'Heel / Achilles area' },
    { key: 'sole', label: 'Sole of foot' },
    ...digitOptions('feet'),
    { key: 'other', label: 'Another location in foot' }
  ],
  knees: [
    { key: 'knee', label: 'Knee' },
    { key: 'left-knee', label: 'Left knee (earlier entry)' },
    { key: 'right-knee', label: 'Right knee (earlier entry)' },
    { key: 'other', label: 'Another location near knee' }
  ],
  spine: [
    { key: 'lumbar', label: 'Lower back' },
    { key: 'thoracic', label: 'Middle / upper back' },
    { key: 'other', label: 'Another location in back' }
  ],
  neck: [
    { key: 'cervical', label: 'Neck' },
    { key: 'other', label: 'Another location near neck' }
  ],
  hips: [{ key: 'hips', label: 'Hip' }],
  shoulders: [{ key: 'shoulder', label: 'Shoulder' }],
  elbows: [{ key: 'elbow', label: 'Elbow' }],
  other: [{ key: 'other', label: 'Describe the location' }]
};
export const SYMPTOM_OPTIONS: Option[] = [
  { key: 'pain', label: 'Pain' },
  { key: 'stiffness', label: 'Stiffness' },
  { key: 'swelling', label: 'Swelling' },
  { key: 'tenderness', label: 'Tenderness' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'skin', label: 'Skin / nail changes' },
  { key: 'other', label: 'Other symptom' }
];
export const TRIGGER_OPTIONS: Option[] = [
  { key: 'stress', label: 'Stress' },
  { key: 'activity', label: 'Activity' },
  { key: 'weather', label: 'Weather' },
  { key: 'sleep', label: 'Poor sleep' },
  { key: 'other', label: 'Other trigger' }
];
export const ACTION_OPTIONS: Option[] = [
  { key: 'medication', label: 'Medication' },
  { key: 'rest', label: 'Rest' },
  { key: 'exercise', label: 'Exercise / stretching' },
  { key: 'heat-cold', label: 'Heat / cold' },
  { key: 'other', label: 'Other action' }
];
export function labelForKey(list: Option[], key?: string): string {
  return key ? (list.find((item) => item.key === key)?.label ?? key) : 'Not recorded';
}
export function jointsForRegion(key?: string): Option[] {
  return JOINT_OPTIONS_BY_REGION[key ?? ''] ?? [];
}
export function hasOtherSelected(key?: string): boolean {
  return key === OTHER_KEY;
}
