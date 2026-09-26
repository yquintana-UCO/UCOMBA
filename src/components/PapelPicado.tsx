// Lighter blue so flags stay visible against the blue/navy header.
const COLORS = ["#ef3b24", "#ffffff", "#5cc0f2"];

/** A string of papel picado flags in the team colors. Decorative only. */
export default function PapelPicado({ count = 14 }: { count?: number }) {
  return (
    <div aria-hidden className="relative h-16 w-full overflow-hidden">
      <div className="absolute inset-x-0 top-2 h-px bg-white/60" />
      <div className="flex justify-between px-2">
        {Array.from({ length: count }, (_, i) => (
          <svg
            key={i}
            viewBox="0 0 40 52"
            className="mt-2 h-12 w-9 shrink-0 drop-shadow-sm"
            style={{ transform: `rotate(${i % 2 ? 3 : -3}deg)` }}
          >
            <defs>
              <mask id={`cut-${i}`}>
                <path d="M0 0H40V44L34 52L28 44L20 52L12 44L6 52L0 44Z" fill="white" />
                <circle cx="20" cy="20" r="6" fill="black" />
                <path d="M20 8l2 4-2 4-2-4z M8 20l4-2 4 2-4 2z M32 20l-4-2-4 2 4 2z M20 32l2-4-2-4-2 4z" fill="black" />
                <circle cx="8" cy="36" r="2" fill="black" />
                <circle cx="20" cy="38" r="2" fill="black" />
                <circle cx="32" cy="36" r="2" fill="black" />
              </mask>
            </defs>
            <rect width="40" height="52" fill={COLORS[i % COLORS.length]} mask={`url(#cut-${i})`} />
          </svg>
        ))}
      </div>
    </div>
  );
}
