import Link from "next/link";
import { SITE } from "@/lib/site";

/** The mark is a tiny chorus: bars above and below a baseline, like the strip in every report. */
export function Logo() {
  const bars = [6, 10, 4, -5, 8, -9, 5, -3, 7];
  return (
    <Link href="/" title={SITE.fullName} className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={1.5 + i * 2.2}
            y={h > 0 ? 11 - h : 11}
            width="1.4"
            height={Math.abs(h)}
            rx="0.7"
            fill={h > 0 ? "var(--pos)" : "var(--neg)"}
          />
        ))}
      </svg>
      {SITE.name.toLowerCase()}
    </Link>
  );
}
