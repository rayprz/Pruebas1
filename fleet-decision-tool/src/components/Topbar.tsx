export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-6 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-base font-semibold text-ink">
          Fleet Decision Tool
        </span>
        <span className="hidden text-xs text-inkfaint sm:inline">
          Multi-brand owning &amp; operating cost
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-inkfaint">
        <span className="rounded-full border border-line bg-card px-2.5 py-1">
          2022 base · USD
        </span>
      </div>
    </header>
  );
}
