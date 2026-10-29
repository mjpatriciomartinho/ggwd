import "server-only";
import { access, type Access } from "./access";
import { engineTotals, recentEvents } from "./engine";
import { isMock, nebiusKey } from "./llm";
import { tavilyKey } from "./tavily";
import type { EngineEvent } from "./types";

export type Power = "online" | "mock" | "offline";

export interface EngineState {
  nebius: Power;
  tavily: Power;
  access: Access;
  recent: EngineEvent[];
  totals: Awaited<ReturnType<typeof engineTotals>>;
}

/** What the engine HUD shows: are the engines connected, what ran lately, what's running now. */
export async function engineState(): Promise<EngineState> {
  const mock = isMock();
  const [nk, tk, recent, totals, acc] = await Promise.all([
    mock ? null : nebiusKey(),
    mock ? null : tavilyKey(),
    recentEvents(25),
    engineTotals(Date.now() - 24 * 3600_000),
    access(),
  ]);
  return { nebius: mock ? "mock" : nk ? "online" : "offline", tavily: mock ? "mock" : tk ? "online" : "offline", access: acc, recent, totals };
}
