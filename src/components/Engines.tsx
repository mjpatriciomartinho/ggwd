"use client";

import { useEffect, useState } from "react";
import type { EngineEvent } from "@/lib/types";

// The engines, drawn. Every Nemotron call on Nebius is a little steam locomotive (Steam, get it) with the
// model's name on its nameplate; every Tavily search is a radar sweeping the web. They puff and spin only
// while their call is running, so at a glance you can see which model is doing what.

const PUFFS = [0, 0.4, 0.8, 1.2];

export function SteamEngine({ label, running, error, size = 150 }: { label: string; running: boolean; error?: boolean; size?: number }) {
  const body = error ? "var(--neg)" : "var(--nv)";
  return (
    <figure className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 160 96" width={size} height={size * 0.6} className={running ? "engine-on" : ""} aria-hidden>
        {/* steam */}
        {PUFFS.map((d, i) => (
          <circle key={i} className="puff" cx={48} cy={16} r={7 + (i % 2) * 2} fill="var(--ink)" style={{ ["--d" as string]: `${d}s` }} />
        ))}
        <g className="bob">
          {/* chimney */}
          <path d="M40 22 h16 l-3 4 v16 h-10 v-16 z" fill="var(--ink-2)" />
          {/* boiler */}
          <rect x="26" y="40" width="84" height="28" rx="9" fill={body} />
          <rect x="26" y="40" width="84" height="7" rx="3.5" fill="var(--ink)" opacity="0.18" />
          <circle cx="30" cy="54" r="5" fill="var(--ask)" />
          {/* dome and bell */}
          <rect x="70" y="32" width="14" height="10" rx="5" fill="var(--ink-2)" />
          {/* cab */}
          <rect x="106" y="24" width="38" height="46" rx="4" fill={body} />
          <rect x="102" y="20" width="46" height="7" rx="2" fill="var(--ink-2)" />
          <rect x="114" y="32" width="22" height="15" rx="2" fill="var(--paper)" />
          {running && <rect x="117" y="35" width="16" height="9" rx="1" fill="var(--ask)" opacity="0.8" />}
          {/* cow catcher */}
          <path d="M26 66 l-12 10 h14 z" fill="var(--ink-2)" />
        </g>
        {/* wheels */}
        {[
          [44, 76, 11],
          [74, 76, 11],
          [124, 78, 9],
        ].map(([cx, cy, r]) => (
          <g key={cx} className="wheel">
            <circle cx={cx} cy={cy} r={r} fill="var(--paper)" stroke="var(--ink-2)" strokeWidth="3" />
            <path d={`M${cx - r + 2} ${cy} H${cx + r - 2} M${cx} ${cy - r + 2} V${cy + r - 2}`} stroke="var(--ink-3)" strokeWidth="2" />
          </g>
        ))}
        <line x1="44" y1="76" x2="74" y2="76" stroke="var(--ink-3)" strokeWidth="3" strokeLinecap="round" />
        <line x1="4" y1="89" x2="156" y2="89" stroke="var(--line)" strokeWidth="3" />
      </svg>
      <figcaption
        className="font-pixel mt-1 max-w-full truncate rounded-sm border px-1.5 py-0.5 text-[10px] uppercase"
        style={{ borderColor: body, color: body }}
      >
        {label}
      </figcaption>
    </figure>
  );
}

export function RadarScout({ running, label = "Tavily", size = 96 }: { running: boolean; label?: string; size?: number }) {
  return (
    <figure className="flex flex-col items-center" style={{ width: size + 30 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className={running ? "radar-on" : ""} aria-hidden>
        <circle cx="50" cy="50" r="44" fill="color-mix(in srgb, var(--tv) 8%, transparent)" stroke="var(--tv)" strokeWidth="2" />
        <circle cx="50" cy="50" r="29" fill="none" stroke="var(--tv)" strokeOpacity="0.4" />
        <circle cx="50" cy="50" r="14" fill="none" stroke="var(--tv)" strokeOpacity="0.4" />
        <path d="M50 6 V94 M6 50 H94" stroke="var(--tv)" strokeOpacity="0.25" />
        <g className="sweep">
          <path d="M50 50 L50 6 A44 44 0 0 1 88 28 Z" fill="var(--tv)" opacity="0.35" />
        </g>
        {running &&
          [
            [68, 30, 0],
            [32, 66, 0.6],
            [72, 70, 1.1],
          ].map(([x, y, d]) => <circle key={x} className="blip" cx={x} cy={y} r="3.5" fill="var(--tv)" style={{ ["--d" as string]: `${d}s` }} />)}
      </svg>
      <figcaption className="font-pixel mt-1 rounded-sm border border-tv px-1.5 py-0.5 text-[10px] text-tv uppercase">{label}</figcaption>
    </figure>
  );
}

/** The engines working on a run right now, or the last ones that did if nothing is running. */
export function EngineYard({ events, idleText = "Engines idle" }: { events: EngineEvent[]; idleText?: string }) {
  const running = events.filter((e) => e.status === "running");
  // One sprite per model (or Tavily): a model running 4 batches in parallel is one busy engine "×4".
  const groups = new Map<string, { e: EngineEvent; n: number }>();
  for (const e of running) {
    const k = e.provider === "tavily" ? "tavily" : e.label;
    const g = groups.get(k);
    if (g) g.n++;
    else groups.set(k, { e, n: 1 });
  }
  const list = [...groups.values()];
  const last = events.at(-1);

  return (
    <div className="flex min-h-[132px] flex-wrap items-end gap-x-8 gap-y-4">
      {list.length ? (
        list.map(({ e, n }) => (
          <div key={e.provider + e.label} className="flex flex-col items-center gap-1">
            {e.provider === "tavily" ? <RadarScout running /> : <SteamEngine label={e.label} running />}
            <p className="max-w-[180px] truncate text-center text-xs text-ink-2">
              {n > 1 ? `${n}× ` : ""}
              {e.task}
            </p>
          </div>
        ))
      ) : last ? (
        <div className="flex flex-col items-center gap-1 opacity-60">
          {last.provider === "tavily" ? <RadarScout running={false} /> : <SteamEngine label={last.label} running={false} error={last.status === "error"} />}
          <p className="text-xs text-ink-3">{idleText}</p>
        </div>
      ) : (
        <p className="font-pixel self-center text-xs text-ink-3 uppercase">{idleText}</p>
      )}
    </div>
  );
}

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false });

const STATUS = {
  running: { mark: "▶", color: "var(--ask)" },
  done: { mark: "✓", color: "var(--pos)" },
  error: { mark: "✗", color: "var(--neg)" },
  skipped: { mark: "–", color: "var(--ink-3)" },
} as const;

/** A terminal-style log of every engine call: who, what for, why that model, and how it went. */
export function EngineLog({ events, max = 12, showReasons = true }: { events: EngineEvent[]; max?: number; showReasons?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const anyRunning = events.some((e) => e.status === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [anyRunning]);

  const shown = events.slice(-max);
  if (!shown.length) return null;
  return (
    <ol className="space-y-1.5 font-mono text-[12px] leading-snug" aria-live="polite">
      {shown.map((e) => {
        const s = STATUS[e.status];
        const secs = (((e.endedAt ?? now) - e.startedAt) / 1000).toFixed(1);
        return (
          <li key={e.id} className="grid grid-cols-[auto_1fr] gap-x-2">
            <span style={{ color: s.color }} className={e.status === "running" ? "blink" : ""}>
              {s.mark}
            </span>
            <span className="min-w-0">
              <span className="text-ink-3">{time(e.startedAt)} </span>
              <span className="font-semibold" style={{ color: e.provider === "tavily" ? "var(--tv)" : "var(--nv)" }}>
                [{e.provider === "tavily" ? "TAVILY" : "NEBIUS"}] {e.label}
              </span>
              <span className="text-ink"> · {e.task}</span>
              <span className="text-ink-3">
                {" "}
                · {secs}s{e.detail ? ` · ${e.detail}` : ""}
              </span>
              {showReasons && e.reason && <span className="block text-ink-3 italic">↳ why: {e.reason}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
