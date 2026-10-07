const art = (name: string) => `${import.meta.env.BASE_URL}anatomy/${name}.png`;
type DetailArt = 'finger' | 'thumb' | 'toe' | 'toe-small';
const jointPositions: Record<DetailArt, [string, number][]> = {
  finger: [['tip', 30], ['middle', 55], ['base', 89]],
  thumb: [['tip', 39], ['base', 70]],
  toe: [['tip', 36], ['base', 82]],
  'toe-small': [['tip', 30], ['middle', 48], ['base', 76]]
};

export function BodyArtwork({ view }: { view: 'front' | 'back' }) {
  return <img className="anatomy-art body-art" src={art(`body-${view}`)} alt="" draggable={false} />;
}

export function HandArtwork() {
  return <img className="anatomy-art" src={art('hand')} alt="" draggable={false} />;
}

export function FootArtwork() {
  return <img className="anatomy-art" src={art('foot')} alt="" draggable={false} />;
}

export function DigitArtwork({
  kind,
  selected,
  digitIndex
}: {
  kind: 'finger' | 'toe';
  selected: string;
  digitIndex: number;
}) {
  const name: DetailArt = kind === 'finger'
    ? digitIndex === 0 ? 'thumb' : 'finger'
    : digitIndex === 0 ? 'toe' : 'toe-small';
  return (
    <div className="digit-anatomy" aria-hidden="true">
      <div className="digit-artwork">
        <img className="anatomy-art" src={art(name)} alt="" draggable={false} />
        {jointPositions[name].map(([part, top]) => (
          <span
            key={part}
            className={'art-joint ' + (selected === part ? 'active' : '')}
            style={{ top: `${top}%` }}
          />
        ))}
      </div>
      <small>{kind === 'toe' ? 'Toe' : 'Finger'} · nail at top</small>
    </div>
  );
}
