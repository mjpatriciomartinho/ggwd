"use client";

import { useState } from "react";
import { Check, Copy, Download, FileJson } from "lucide-react";

const MCP_CMD = "claude mcp add ggwd -- npx tsx /path/to/ggwd/mcp/server.mts";

export function ExportPanel({ analysisId, sourceName, sourceId }: { analysisId: number; sourceName: string; sourceId: string }) {
  const [copied, setCopied] = useState<"brief" | "mcp" | null>(null);

  async function copy(kind: "brief" | "mcp") {
    const text = kind === "brief" ? await fetch(`/api/analyses/${analysisId}/brief`).then((r) => r.text()) : MCP_CMD;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <aside className="h-fit rounded-2xl border border-line bg-sheet p-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">Hand it to your AI</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
        The full report as Markdown, with counts and quotes, ready to paste next to your design doc.
      </p>
      <button
        onClick={() => copy("brief")}
        className="font-display btn-hot mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold uppercase"
      >
        {copied === "brief" ? <Check size={17} /> : <Copy size={17} />}
        {copied === "brief" ? "Copied" : "Copy report"}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <a
          href={`/api/analyses/${analysisId}/brief?download=1`}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-ink-2 hover:text-ink"
        >
          <Download size={15} /> .md
        </a>
        <a
          href={`/api/analyses/${analysisId}?reviews=1`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-ink-2 hover:text-ink"
        >
          <FileJson size={15} /> .json
        </a>
      </div>

      <details className="group mt-5 border-t border-line pt-4 text-sm">
        <summary className="cursor-pointer list-none font-medium text-ink-2 marker:hidden">
          <span className="group-open:hidden">+ </span>
          <span className="hidden group-open:inline">− </span>
          Use it from your coding agent (MCP)
        </summary>
        <p className="mt-2 leading-relaxed text-ink-2">
          Your coding agent can run reports, read this one and search the reviews without leaving your game&apos;s repo.
          Add it once:
        </p>
        <button
          onClick={() => copy("mcp")}
          className="mt-2 w-full rounded-lg bg-paper p-2.5 text-left font-mono text-[11px] leading-relaxed break-all text-ink-2"
          title="Copy"
        >
          {copied === "mcp" ? "Copied" : MCP_CMD}
        </button>
        <p className="mt-2 leading-relaxed text-ink-3">
          Then ask, for example: “with ggwd, compare our GDD with what frustrates {sourceName} players”. This game&apos;s
          id: <code className="text-ink-2">{sourceId}</code>.
        </p>
      </details>
    </aside>
  );
}
