import "server-only";
import { z } from "zod";
import { startEvent, type EventHandle } from "./engine";
import { estimateTokens, MODELS, route, type Task, type Tier } from "./models";

// NVIDIA Nemotron on Nebius Token Factory (OpenAI-compatible API, plain fetch so it runs on Workers).
// Every call goes through complete(): the router picks the model, the call is logged as an engine event
// the UI shows live, and if a model fails the next one in its fallback chain takes over.

const BASE = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1";

export class AIError extends Error {}

/** GGWD_MOCK=1 replaces every model call with a canned answer, to preview the app without a key. */
export const isMock = () => process.env.GGWD_MOCK === "1";

/** NEBIUS_API_KEY as in Nebius's docs; NEBIUS_TOKEN_FACTORY is the name in María's SSM (`secrets run`). */
export const nebiusKey = async () => process.env.NEBIUS_API_KEY || process.env.NEBIUS_TOKEN_FACTORY || null;

let catalog: Promise<string[]> | null = null;

/** Ids Token Factory serves right now, so a renamed model still resolves by family name. */
function listModels(key: string): Promise<string[]> {
  catalog ??= fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
    .then(async (res) => (res.ok ? ((await res.json()) as { data: { id: string }[] }).data.map((m) => m.id) : []))
    .catch(() => []);
  return catalog;
}

const ENV_ID: Record<Tier, string | undefined> = {
  nano: process.env.NEBIUS_MODEL_NANO,
  super: process.env.NEBIUS_MODEL_SUPER,
  ultra: process.env.NEBIUS_MODEL_ULTRA,
};

async function modelId(tier: Tier, key: string): Promise<string> {
  const spec = MODELS[tier];
  if (ENV_ID[tier]) return ENV_ID[tier]!;
  const ids = await listModels(key);
  if (!ids.length || ids.includes(spec.id)) return spec.id;
  return ids.find((id) => id.toLowerCase().includes(spec.family)) ?? spec.id;
}

export interface CompleteOptions<T> {
  runId: string | null;
  task: Task;
  /** Shown in the engine log, e.g. "Skim batch 3/10". */
  label: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  maxTokens: number;
  /** Canned answer for mock mode. */
  mock: () => T;
}

export interface Completion<T> {
  data: T;
  tier: Tier;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function complete<T>(o: CompleteOptions<T>): Promise<Completion<T>> {
  const estimate = estimateTokens(o.system + o.prompt);
  const plan = route(o.task, estimate);
  const key = isMock() ? null : await nebiusKey();
  if (!isMock() && !key) throw new AIError("NEBIUS_API_KEY is not set, so the Nemotron engines can't start.");

  let lastError: unknown = null;
  for (const [i, tier] of [plan.tier, ...plan.fallbacks].entries()) {
    const spec = MODELS[tier];
    const model = key ? await modelId(tier, key) : spec.id;
    const reason = i === 0 ? plan.reason : `Fallback: ${MODELS[plan.tier].label} failed (${messageOf(lastError)}).`;
    const ev = await startEvent({ runId: o.runId, provider: "nebius", model, label: spec.label, task: o.label, reason });
    try {
      const out = key ? await call(o, model, key, plan.thinking, ev) : await fake(o, estimate, ev);
      await ev.finish("done", {
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        detail: `${(out.inputTokens / 1000).toFixed(1)}k in · ${(out.outputTokens / 1000).toFixed(1)}k out`,
      });
      return { ...out, tier, model };
    } catch (err) {
      lastError = err;
      console.error(`${spec.label} failed on ${o.label}`, err);
      await ev.finish("error", { detail: messageOf(err) });
    }
  }
  throw lastError instanceof AIError ? lastError : new AIError(`The Nemotron engines failed: ${messageOf(lastError)}`);
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 160);

async function call<T>(o: CompleteOptions<T>, model: string, key: string, thinking: boolean, ev: EventHandle) {
  const jsonSchema = z.toJSONSchema(o.schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  const body = (strict: boolean) => ({
    model,
    max_tokens: o.maxTokens,
    temperature: thinking ? 0.6 : 0.3,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: `${o.system}\n\nAnswer with one JSON object that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}` },
      { role: "user", content: o.prompt },
    ],
    // Some models reject strict schemas or the thinking switch; the second attempt drops both.
    ...(strict
      ? {
          response_format: { type: "json_schema", json_schema: { name: "answer", schema: jsonSchema, strict: true } },
          chat_template_kwargs: { enable_thinking: thinking },
        }
      : { response_format: { type: "json_object" } }),
  });

  let res = await post(body(true), key);
  if (res.status === 400 || res.status === 422) res = await post(body(false), key);
  if (!res.ok) throw new AIError(`Token Factory answered HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const out = await read(res, ev);
  if (out.finish === "length") throw new AIError("The answer was cut off (max_tokens).");
  const parsed = o.schema.safeParse(extractJson(out.content));
  if (!parsed.success) throw new AIError(`The model's JSON didn't match the schema: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  return {
    data: parsed.data,
    inputTokens: out.usage?.prompt_tokens ?? estimateTokens(o.system + o.prompt),
    outputTokens: out.usage?.completion_tokens ?? estimateTokens(out.content + out.reasoning),
  };
}

function post(body: unknown, key: string) {
  return fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15 * 60_000),
  });
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface Delta {
  content?: string | null;
  reasoning?: string | null; // Token Factory's field for thinking
  reasoning_content?: string | null; // the vLLM name, just in case
}

/** Reads a streamed (SSE) or plain JSON completion, reporting progress while the model writes. */
async function read(res: Response, ev: EventHandle) {
  let content = "";
  let reasoning = "";
  let finish: string | null = null;
  let usage: Usage | null = null;

  if (!res.headers.get("content-type")?.includes("event-stream")) {
    const json = (await res.json()) as { choices: { message: Delta; finish_reason: string }[]; usage?: Usage };
    const c = json.choices[0];
    return { content: c?.message.content ?? "", reasoning: c?.message.reasoning ?? "", finish: c?.finish_reason ?? null, usage: json.usage ?? null };
  }

  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const chunk = JSON.parse(data) as { choices?: { delta?: Delta; finish_reason?: string | null }[]; usage?: Usage | null };
      const choice = chunk.choices?.[0];
      content += choice?.delta?.content ?? "";
      reasoning += choice?.delta?.reasoning ?? choice?.delta?.reasoning_content ?? "";
      finish = choice?.finish_reason ?? finish;
      if (chunk.usage) usage = chunk.usage;
    }
    ev.progress(
      content
        ? `writing · ${(content.length / 1000).toFixed(1)}k chars`
        : `thinking · ${(reasoning.length / 1000).toFixed(1)}k chars`,
    );
  }
  return { content, reasoning, finish, usage };
}

/** Models sometimes wrap JSON in a code fence or leave thinking tags in the content. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new AIError("The model didn't return JSON.");
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AIError("The model returned malformed JSON.");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mock mode: same timing shape and logging as a real call, canned output. */
async function fake<T>(o: CompleteOptions<T>, estimate: number, ev: EventHandle) {
  const steps = o.task === "synthesize" ? 14 : o.task === "skim" ? 4 : 6;
  for (let i = 1; i <= steps; i++) {
    await sleep(500 + Math.random() * 600);
    ev.progress(i < steps / 3 ? `thinking · ${(i * 0.8).toFixed(1)}k chars` : `writing · ${(i * 1.3).toFixed(1)}k chars`);
  }
  const data = o.mock();
  return { data, inputTokens: estimate, outputTokens: estimateTokens(JSON.stringify(data)) };
}
