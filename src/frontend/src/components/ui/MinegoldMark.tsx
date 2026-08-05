/**
 * THE minegold.defi brand mark — stacked gold ingots.
 *
 * One component, every surface. It replaced a hand-drawn pickaxe that had
 * been copy-pasted into four files (login gate, nav bar, the portfolio
 * card, the Brave strip) and read as a wooden stick at small sizes. When
 * the same 8-path SVG lives in four places, three of them drift.
 *
 * The geometry is deliberately simple: three trapezoids and a highlight.
 * It survives 16px, which the pickaxe did not.
 */
export function MinegoldMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* bottom pair */}
      <path d="M4.5 30.5 L7.5 23 H17 L20 30.5 Z" fill="#3B2400" />
      <path d="M20.5 30.5 L23.5 23 H33 L36 30.5 Z" fill="#4A2E00" />
      {/* top ingot */}
      <path d="M12.5 20 L15.5 12.5 H25 L28 20 Z" fill="#5C3A00" />
      {/* shine */}
      <path
        d="M16.5 14.5 H23.5"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The mark on its gold plate — the app-icon lockup used in headers. */
export function MinegoldBadge({
  size = 80,
  radius = "1.5rem",
  className,
}: {
  size?: number;
  radius?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br from-yellow-600 to-yellow-400 flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <MinegoldMark size={size / 2} />
    </div>
  );
}
