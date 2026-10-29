"use client";

import { useEffect, useState } from "react";
import { EngineLog, EngineYard } from "./Engines";
import type { EngineState } from "@/lib/status";

const num = new Intl.NumberFormat("en-US");

/** Live part of the engine room: what's running anywhere right now, and the last 24 hours per engine. */
export function EngineRoomLive({ initial }: { initial: EngineState }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/engine").catch(() => null);
      if (res?.ok) setState((await res.json()) as EngineState);
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const events = [...state.recent].reverse();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="hud rounded-xl p-5">
        <p className="font-pixel mb-4 text-xs text-ink-3 uppercase">Live yard</p>
        <EngineYard events={events} idleText="All engines idle. Start a report to fire them up." />
        <div className="mt-6 border-t border-line pt-4">
          <p className="font-pixel mb-3 text-xs text-ink-3 uppercase">Engine log</p>
          {events.length ? <EngineLog events={events} max={25} /> : <p className="text-sm text-ink-3">Nothing has run yet.</p>}
        </div>
      </div>
      <div className="hud h-fit rounded-xl p-5">
        <p className="font-pixel mb-3 text-xs text-ink-3 uppercase">Last 24 hours</p>
        {state.totals.length ? (
          <table className="w-full text-sm">
            <tbody>
              {state.totals.map((t) => (
                <tr key={t.provider + t.label} className="border-b border-line last:border-0">
                  <td className="py-2" style={{ color: t.provider === "tavily" ? "var(--tv)" : "var(--nv)" }}>
                    {t.label}
                  </td>
                  <td className="tnum py-2 text-right text-ink-2">{t.calls} calls</td>
                  <td className="tnum py-2 text-right text-ink-3">
                    {t.provider === "tavily" ? "" : `${num.format(Math.round((t.inputTokens + t.outputTokens) / 1000))}k tok`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ink-3">No calls yet.</p>
        )}
      </div>
    </div>
  );
}
