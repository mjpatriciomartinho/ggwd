// The NVIDIA Nemotron models we run on Nebius Token Factory, and the router that picks one for each job.
// Kept free of server-only imports so the UI can show the roster and the routing rules.

export type Tier = "nano" | "super" | "ultra";

export interface ModelSpec {
  tier: Tier;
  id: string; // Token Factory model id (overridable with NEBIUS_MODEL_NANO / _SUPER / _ULTRA)
  legacy?: string; // previous id, used only while Token Factory still serves it and not `id`
  family: string; // matched against /v1/models when the exact id isn't listed
  label: string;
  context: number; // tokens
  price: { input: number; output: number }; // USD per 1M tokens
  blurb: string;
}

export const MODELS: Record<Tier, ModelSpec> = {
  nano: {
    tier: "nano",
    // Nemotron 3 Nano leaves Token Factory Serverless on 2026-11-09; Lightning is Nebius's replacement.
    id: "nvidia/Nemotron-3_5-Lightning",
    legacy: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    family: "lightning",
    label: "Nemotron 3.5 Lightning",
    context: 1_048_576,
    price: { input: 0.06, output: 0.24 },
    blurb: "30B MoE, 3B active. Fast and cheap: reads every review.",
  },
  super: {
    tier: "super",
    // Nemotron 3 Super leaves Token Factory Serverless on 2026-11-09; 3.5 Super VL is Nebius's replacement.
    id: "nvidia/Nemotron-3.5-Super-VL",
    legacy: "nvidia/nemotron-3-super-120b-a12b",
    family: "super-vl",
    label: "Nemotron 3.5 Super",
    context: 1_048_576,
    price: { input: 0.3, output: 0.9 },
    blurb: "The fast all-rounder, 1M context.",
  },
  ultra: {
    tier: "ultra",
    id: "nvidia/Nemotron-3-Ultra-550b-a55b",
    family: "nemotron-3-ultra",
    label: "Nemotron 3 Ultra",
    context: 1_048_576,
    price: { input: 1, output: 3 },
    blurb: "550B MoE, 55B active, 1M context. Serious reasoning for the final report.",
  },
};

export type Task = "skim" | "synthesize" | "digest" | "understand" | "discover";

export interface Route {
  tier: Tier;
  reason: string;
  thinking: boolean;
  /** Who takes over if the chosen model fails or is unavailable. */
  fallbacks: Tier[];
}

/** Rough token count: good enough to decide whether a prompt fits. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.6);

/**
 * Picks the model for a task. The rules are simple on purpose so the UI can explain every choice:
 * many small parallel reads go to Nano, interactive answers to Super, the one deep synthesis to Ultra,
 * and a skim batch that doesn't fit Lightning's window moves up to Super.
 */
export function route(task: Task, inputTokens: number): Route {
  const fits = (tier: Tier) => inputTokens < MODELS[tier].context * 0.7;
  switch (task) {
    case "skim":
      return fits("nano")
        ? { tier: "nano", thinking: false, fallbacks: ["super"], reason: "Many small parallel reads: speed and price win, no deep reasoning needed." }
        : { tier: "super", thinking: false, fallbacks: [], reason: "Batch too big for Lightning's window, moved up to Super." };
    case "digest":
      return { tier: "nano", thinking: false, fallbacks: ["super"], reason: "Turning web snippets into a dated timeline is extraction, not reasoning." };
    case "understand":
      return { tier: "nano", thinking: false, fallbacks: ["super"], reason: "A one-line restatement and a few search queries: the smallest model is plenty." };
    case "discover":
      return { tier: "super", thinking: false, fallbacks: ["nano"], reason: "Someone is waiting: market knowledge with a fast answer." };
    case "synthesize":
      return {
        tier: "ultra",
        thinking: true,
        fallbacks: fits("super") ? ["super"] : [],
        reason: "One call that weighs every review at once: worth the best reasoning model and its 1M window.",
      };
  }
}

export function costOf(tier: Tier, inputTokens: number, outputTokens: number) {
  const p = MODELS[tier].price;
  return (inputTokens * p.input + outputTokens * p.output) / 1e6;
}
