"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chorus, type ChorusItem } from "./Chorus";
import type { Era, Quote, ThemeKind } from "@/lib/types";

export interface DemoTheme {
  key: string;
  kind: ThemeKind;
  title: string;
  ids: string[];
  share: number;
  quote: Quote | null;
}

const KIND = {
  love: { label: "Hooks players", color: "var(--pos)" },
  pain: { label: "Frustrates them", color: "var(--neg)" },
  request: { label: "They ask for", color: "var(--ask)" },
} as const;

/**
 * A real report, playing itself: every few seconds the next theme lights up the reviews that mention it
 * on the timeline. Stops cycling once the visitor picks a theme, and never cycles with reduced motion.
 */
export function HeroDemo({
  analysisId,
  name,
  meta,
  eras,
  sample,
  themes,
}: {
  analysisId: number;
  name: string;
  meta: string;
  eras: Era[];
  sample: ChorusItem[];
  themes: DemoTheme[];
}) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const theme = themes[index];
  const highlight = useMemo(() => new Set(theme?.ids ?? []), [theme]);

  useEffect(() => {
    if (!auto || themes.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % themes.length), 3800);
    return () => clearInterval(t);
  }, [auto, themes.length]);

  if (!theme) return null;
  const k = KIND[theme.kind];

  return (
    <div className="rounded-3xl border border-line bg-sheet p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-xl font-semibold tracking-tight">{name}</p>
        <p className="text-sm text-ink-3">{meta}</p>
      </div>
      <div className="mt-5">
        <Chorus items={sample} eras={eras} height={110} highlight={highlight} animate />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div aria-live="polite">
          <p className="text-sm font-medium" style={{ color: k.color }}>
            {k.label}
          </p>
          <p className="font-display mt-1 text-2xl leading-tight font-semibold tracking-tight">{theme.title}</p>
          <p className="tnum mt-2 text-sm text-ink-3">
            {theme.ids.length} of {sample.length} reviews · {Math.round(theme.share * 100)}%
          </p>
        </div>
        {theme.quote && (
          <blockquote className="border-l-2 pl-4" style={{ borderColor: theme.quote.positive ? "var(--pos)" : "var(--neg)" }}>
            <p className="leading-relaxed">“{theme.quote.text}”</p>
            <footer className="tnum mt-1.5 text-xs text-ink-3">
              {theme.quote.positive ? "Recommended" : "Not recommended"} · {theme.quote.hours} h played · {theme.quote.helpful} found it helpful
            </footer>
          </blockquote>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        {themes.map((t, i) => (
          <button
            key={t.key}
            onClick={() => {
              setAuto(false);
              setIndex(i);
            }}
            aria-pressed={i === index}
            className="rounded-full border px-3 py-1 text-sm transition-colors"
            style={
              i === index
                ? { background: KIND[t.kind].color, borderColor: KIND[t.kind].color, color: "var(--sheet)" }
                : { borderColor: "var(--line)", color: "var(--ink-2)" }
            }
          >
            {t.title}
          </button>
        ))}
        <Link href={`/report/${analysisId}`} className="ml-auto text-sm text-ink-2 underline decoration-line underline-offset-4 hover:decoration-ink-2">
          Open the full report
        </Link>
      </div>
    </div>
  );
}
