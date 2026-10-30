import { RadarScout, SteamEngine } from "@/components/Engines";
import { EngineRoomLive } from "@/components/EngineRoom";
import { MODELS, route, type Task } from "@/lib/models";
import { engineState, type Power } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Engine room" };

const JOBS: { task: Task; what: string; example: number }[] = [
  { task: "understand", what: "Read your game pitch, plan web searches", example: 400 },
  { task: "digest", what: "Turn web results into a dated timeline", example: 6_000 },
  { task: "skim", what: "Read each batch of 40 reviews, note every point", example: 14_000 },
  { task: "discover", what: "Pick the games worth studying", example: 4_000 },
  { task: "synthesize", what: "Weigh every note and write the report", example: 60_000 },
  { task: "skim", what: "…a batch too long for Lightning's window", example: 800_000 },
];

const POWER: Record<Power, string> = {
  online: "Connected",
  mock: "Mock mode: canned answers, no key used",
  offline: "No API key set",
};

export default async function EnginePage() {
  const state = await engineState();
  return (
    <main className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-8 sm:pt-20">
      <p className="font-pixel text-xs text-hot uppercase">Under the hood</p>
      <h1 className="font-display mt-2 text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] font-bold uppercase">Engine room</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
        Every report is a little rail yard. NVIDIA Nemotron models on Nebius Token Factory do the reading and the thinking,
        Tavily scouts the web, and a router picks the right engine for each job. Nothing is hidden: every call is logged here
        with the model that ran it and why.
      </p>

      <section className="mt-12 grid gap-4 md:grid-cols-4">
        {Object.values(MODELS).map((m) => (
          <div key={m.tier} className="hud flex flex-col rounded-xl p-5">
            <SteamEngine label={m.label} running={false} size={140} />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">{m.blurb}</p>
            <dl className="tnum mt-3 space-y-0.5 text-xs text-ink-3">
              <div>
                <dt className="inline">context </dt>
                <dd className="inline text-ink-2">{m.context >= 1e6 ? "1M" : `${m.context / 1000}k`}</dd>
              </div>
              <div>
                <dt className="inline">$/1M tok </dt>
                <dd className="inline text-ink-2">
                  {m.price.input} in · {m.price.output} out
                </dd>
              </div>
              <div className="truncate font-mono" title={m.id}>
                {m.id}
              </div>
            </dl>
          </div>
        ))}
        <div className="hud flex flex-col items-center rounded-xl p-5">
          <RadarScout running={false} label="Tavily Search" size={84} />
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Live web search: patch history, launch coverage and controversies for each game, and fresh releases when we
            suggest games to study.
          </p>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <p>
          <span className="text-nv">Nebius Token Factory</span> <span className="text-ink-3">· {POWER[state.nebius]}</span>
        </p>
        <p>
          <span className="text-tv">Tavily</span> <span className="text-ink-3">· {POWER[state.tavily]}</span>
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold uppercase">The router</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
          Small, parallel, mechanical jobs go to Lightning. Someone waiting on an answer gets Super. The one call that has to weigh
          hundreds of reviews at once gets Ultra, with thinking on and a 1M-token window. If a model fails, the next in its chain takes over, and the log says so.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="font-pixel text-[10px] text-ink-3 uppercase">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Job</th>
                <th className="py-2 pr-4 font-normal">Input</th>
                <th className="py-2 pr-4 font-normal">Engine</th>
                <th className="py-2 pr-4 font-normal">Fallback</th>
                <th className="py-2 font-normal">Why</th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map((j) => {
                const r = route(j.task, j.example);
                return (
                  <tr key={j.what} className="border-b border-line align-top">
                    <td className="py-3 pr-4">{j.what}</td>
                    <td className="tnum py-3 pr-4 text-ink-3">~{Math.round(j.example / 1000) || "<1"}k tok</td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap text-nv">
                      {MODELS[r.tier].label}
                      {r.thinking && <span className="ml-1 text-xs font-normal text-ask">thinking</span>}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-ink-3">{r.fallbacks.map((f) => MODELS[f].label).join(" → ") || "—"}</td>
                    <td className="py-3 text-ink-2">{r.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display mb-6 text-3xl font-bold uppercase">Live</h2>
        <EngineRoomLive initial={state} />
      </section>
    </main>
  );
}
