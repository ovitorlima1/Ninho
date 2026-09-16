export function Brand() {
  return (
    <div className="brand" data-testid="brand-ninho">
      <svg className="brand-mark" viewBox="0 0 128 128" aria-hidden focusable="false">
        <rect className="brand-mark-bg" width="128" height="128" rx="32" />
        <ellipse className="brand-mark-egg" cx="64" cy="55" rx="15" ry="19" />
        <path className="brand-mark-nest" d="M26 66c4 21 19 34 38 34s34-13 38-34" />
        <path className="brand-mark-weave" d="M36 80c9 5 18 7 28 7s19-2 28-7" />
      </svg>
      <span className="brand-word">ninho</span>
    </div>
  );
}
