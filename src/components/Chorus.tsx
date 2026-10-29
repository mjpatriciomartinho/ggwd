"use client";

import { useMemo } from "react";
import type { Era } from "@/lib/types";

export interface ChorusItem {
  id?: string;
  positive: boolean;
  createdAt: number;
  helpful: number;
  era?: string;
}

const W = 1000;

/**
 * Every sampled review as one bar on a time axis: recommended above the line, not recommended below,
 * taller the more players found it helpful. Eras get a band each (sized by how many reviews they hold)
 * so a busy launch window doesn't get squashed next to years of quieter reviews.
 */
export function Chorus({
  items,
  eras,
  height = 120,
  highlight,
  showLabels = true,
  animate = false,
  markers,
}: {
  items: ChorusItem[];
  eras?: Era[];
  height?: number;
  highlight?: Set<string> | null;
  showLabels?: boolean;
  animate?: boolean;
  /** Things that happened outside the reviews (from the web), drawn as flags on the time axis. */
  markers?: { t: number; label: string }[];
}) {
  const layout = useMemo(() => {
    const bands = (eras?.length ? eras : [{ key: "", label: "", from: 0, to: 0 }]).map((era) => ({
      era,
      items: items
        .filter((it) => !eras?.length || it.era === era.key)
        .sort((a, b) => a.createdAt - b.createdAt),
    }));
    const nonEmpty = bands.filter((b) => b.items.length);
    const gap = nonEmpty.length > 1 ? 14 : 0;
    const usable = W - gap * (nonEmpty.length - 1);
    const minShare = 0.1;
    const raw = nonEmpty.map((b) => Math.max(b.items.length / items.length, minShare));
    const total = raw.reduce((s, x) => s + x, 0);
    let x = 0;
    const maxHelpful = Math.max(1, ...items.map((i) => i.helpful));
    const half = height / 2 - 2;
    const bars: { key: string; x: number; y: number; h: number; positive: boolean; id?: string; i: number }[] = [];
    const labels: { label: string; x: number; w: number }[] = [];
    const spans: { from: number; to: number; x: number; step: number; times: number[] }[] = [];
    nonEmpty.forEach((band, bi) => {
      const w = (raw[bi] / total) * usable;
      const step = w / band.items.length;
      band.items.forEach((it, j) => {
        const h = 2 + (half - 2) * (Math.log1p(it.helpful) / Math.log1p(maxHelpful));
        bars.push({
          key: `${bi}-${j}`,
          x: x + step * j + step / 2,
          y: it.positive ? height / 2 - h - 1 : height / 2 + 1,
          h,
          positive: it.positive,
          id: it.id,
          i: bars.length,
        });
      });
      labels.push({ label: band.era.label, x, w });
      spans.push({
        from: band.era.from || band.items[0].createdAt,
        to: band.era.to || band.items.at(-1)!.createdAt,
        x,
        step,
        times: band.items.map((it) => it.createdAt),
      });
      x += w + gap;
    });
    const barW = Math.min(3.2, Math.max(1, (usable / Math.max(items.length, 1)) * 0.62));
    // Bands aren't linear in time, so a marker sits between the reviews written just before and after it.
    const flags = (markers ?? []).flatMap((m) => {
      const span = spans.find((sp) => m.t >= sp.from && m.t <= sp.to);
      if (!span) return [];
      const j = span.times.filter((t) => t < m.t).length;
      return [{ x: span.x + span.step * j, label: m.label }];
    });
    return { bars, labels, barW, flags };
  }, [items, eras, height, markers]);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className={`block w-full ${animate ? "reveal-strip" : ""}`}
        style={{ height }}
        role="img"
        aria-label={`${items.filter((i) => i.positive).length} recommended and ${items.filter((i) => !i.positive).length} not recommended reviews over time`}
      >
        <line x1="0" x2={W} y1={height / 2} y2={height / 2} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {layout.flags.map((f) => (
          <g key={f.label + f.x}>
            <title>{f.label}</title>
            <line x1={f.x} x2={f.x} y1={0} y2={height} stroke="var(--tv)" strokeDasharray="3 3" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {layout.bars.map((b) => {
          const lit = !highlight || (b.id && highlight.has(b.id));
          return (
            <rect
              key={b.key}
              className="chorus-bar"
              x={b.x - layout.barW / 2}
              y={b.y}
              width={layout.barW}
              height={b.h}
              rx={Math.min(1, layout.barW / 2)}
              fill={b.positive ? "var(--pos)" : "var(--neg)"}
              opacity={lit ? 1 : 0.13}
              style={{
                transformBox: "fill-box",
                transformOrigin: b.positive ? "bottom" : "top",
                ["--i" as string]: b.i,
              }}
            />
          );
        })}
      </svg>
      {showLabels && layout.labels.length > 1 && (
        <figcaption className="relative mt-2 h-4 text-[11px] text-ink-3">
          {layout.labels.map((l) => (
            <span
              key={l.label}
              className="absolute top-0 truncate border-l border-line pl-1.5"
              style={{ left: `${(l.x / W) * 100}%`, width: `${(l.w / W) * 100}%` }}
            >
              {l.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
