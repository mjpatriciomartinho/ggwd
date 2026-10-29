import "server-only";
import { startEvent } from "./engine";
import { isMock } from "./llm";

// Tavily web search. Reviews tell us *what* players felt; the web tells us what happened to the game at
// the time (a big update, a controversy, a port), so the report can explain why opinion moved.
// It also grounds game suggestions in what's out now, past the models' training cutoff.

export interface WebResult {
  title: string;
  url: string;
  content: string;
  published: string | null;
}

export const tavilyKey = async () => process.env.TAVILY_API_KEY || null;

export interface SearchOptions {
  runId: string | null;
  task: string;
  reason: string;
  topic?: "general" | "news";
  maxResults?: number;
  includeDomains?: string[];
}

/** One logged search. Never throws: no key or a failed search means the report is built without it. */
export async function webSearch(query: string, o: SearchOptions): Promise<WebResult[]> {
  const key = isMock() ? null : await tavilyKey();
  const ev = await startEvent({ runId: o.runId, provider: "tavily", model: "search", label: "Tavily Search", task: o.task, reason: o.reason });
  if (!key && !isMock()) {
    await ev.finish("skipped", { detail: "TAVILY_API_KEY not set" });
    return [];
  }
  ev.progress(`“${query}”`);
  try {
    const results = key ? await search(query, o, key) : await fakeSearch(query);
    await ev.finish("done", { detail: `${results.length} results · “${query}”` });
    return results;
  } catch (err) {
    console.error("Tavily", err);
    await ev.finish("error", { detail: err instanceof Error ? err.message.slice(0, 160) : "failed" });
    return [];
  }
}

async function search(query: string, o: SearchOptions, key: string): Promise<WebResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      topic: o.topic ?? "general",
      search_depth: "basic",
      max_results: o.maxResults ?? 6,
      chunks_per_source: 2,
      ...(o.includeDomains ? { include_domains: o.includeDomains } : {}),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Tavily answered HTTP ${res.status}`);
  const data = (await res.json()) as { results: { title: string; url: string; content: string; published_date?: string }[] };
  return data.results.map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 900), published: r.published_date ?? null }));
}

async function fakeSearch(query: string): Promise<WebResult[]> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 900));
  return [1, 2, 3].map((i) => ({
    title: `Mock result ${i} for ${query}`,
    url: `https://example.com/mock-${i}`,
    content: "Mock mode: no real web search ran. Set TAVILY_API_KEY to search the web.",
    published: null,
  }));
}
