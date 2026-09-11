import type { CSSProperties } from 'react';
const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  plus: 'M12 5v14 M5 12h14',
  journal: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  export: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  check: 'M5 12l4 4L19 6',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  close: 'M6 6l12 12 M18 6L6 18',
  chevron: 'M9 5l7 7-7 7',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',
  edit: 'M4 16l12-12 4 4L8 20H4z M13 7l4 4',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',
  sliders: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  cloud: 'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 6 6 0 0 1 0 11z',
  leaf: 'M5 19C1 9 8 3 21 3c0 13-6 19-16 16z M5 19L16 8'
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
