"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EngineState, Power } from "@/lib/status";

const POWER: Record<Power, { text: string; color: string }> = {
  online: { text: "online", color: "var(--pos)" },
  mock: { text: "mock", color: "var(--ask)" },
  offline: { text: "offline", color: "var(--neg)" },
};

/** Always-on engine status in the header: are Nebius and Tavily connected, and what's running now. */
export function EngineHUD() {
  const [state, setState] = useState<EngineState | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/engine").catch(() => null);
      if (alive && res?.ok) setState((await res.json()) as EngineState);
    };
    void load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const running = state?.recent.filter((e) => e.status === "running") ?? [];
  const lamp = (name: string, power: Power | undefined, accent: string) => (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block size-2 rounded-full ${power === "online" && running.length ? "blink" : ""}`}
        style={{ background: power ? POWER[power].color : "var(--ink-3)", boxShadow: power ? `0 0 8px ${POWER[power].color}` : undefined }}
      />
      <span style={{ color: accent }}>{name}</span>
      <span className="text-ink-3">{power ? POWER[power].text : "…"}</span>
    </span>
  );

  return (
    <Link
      href="/engine"
      className="font-pixel hud hidden items-center gap-4 rounded-md px-3 py-1.5 text-[10px] uppercase hover:border-ink-3 lg:flex"
      title="Engine room: which models and searches are running"
    >
      {lamp("Nebius", state?.nebius, "var(--nv)")}
      {lamp("Tavily", state?.tavily, "var(--tv)")}
      {state?.access === "locked" && <span className="text-ink-3">🔒 AI locked</span>}
      {state?.access === "unlocked" && <span className="text-pos">🔓 Judge mode</span>}
      {running.length > 0 && (
        <span className="max-w-[220px] truncate text-ask">
          ▶ {running[0].label}
          {running.length > 1 ? ` +${running.length - 1}` : ""}
        </span>
      )}
    </Link>
  );
}
