import type { Analysis, Source, Theme, ThemeKind } from "./types";

// The "AI brief": the report as Markdown, written to be pasted into another model's context (or read
// through the MCP server) when designing or reviewing your own game.

const T = {
  es: {
    title: "Informe de reviews",
    method: (n: number, eras: string) =>
      `Muestra: las ${n} reviews con texto más votadas como útiles (mitad recomendadas, mitad no), repartidas entre estas épocas: ${eras}. La muestra está equilibrada a propósito, así que no refleja la aprobación general.`,
    overall: "Valoración global en Steam",
    profile: "Quién lo juega",
    kinds: { love: "Lo que engancha", pain: "Lo que frustra", request: "Lo que piden" } as Record<ThemeKind, string>,
    stats: (t: Theme) =>
      `${t.stats.reviews} reviews (${Math.round(t.stats.share * 100)}% de la muestra) · ${Math.round(t.stats.positiveShare * 100)}% en reviews positivas · mediana ${t.stats.medianHours} h jugadas · ${t.stats.helpfulVotes} votos de útil`,
    takeaway: "Para tu juego",
    severity: { dealbreaker: "hace abandonar", major: "grave", minor: "menor" },
    earlyExit: "Por qué abandonan pronto",
    evolution: "Cómo ha cambiado la opinión",
    takeaways: "Lecciones de diseño",
    usage:
      "Cómo usar este informe: pégalo como contexto y pide, por ejemplo, \"revisa el diseño de mi juego contra lo que frustra a estos jugadores\" o \"qué de lo que engancha aquí encaja con mi juego\".",
  },
  en: {
    title: "Review report",
    method: (n: number, eras: string) =>
      `Sample: the ${n} most helpful-voted reviews with text (half recommended, half not), spread across these eras: ${eras}. The sample is balanced on purpose, so it does not reflect overall approval.`,
    overall: "Overall on Steam",
    profile: "Who plays it",
    kinds: { love: "What hooks players", pain: "What frustrates them", request: "What they ask for" } as Record<ThemeKind, string>,
    stats: (t: Theme) =>
      `${t.stats.reviews} reviews (${Math.round(t.stats.share * 100)}% of sample) · ${Math.round(t.stats.positiveShare * 100)}% from positive reviews · median ${t.stats.medianHours} h played · ${t.stats.helpfulVotes} helpful votes`,
    takeaway: "For your game",
    severity: { dealbreaker: "makes people quit", major: "major", minor: "minor" },
    earlyExit: "Why players quit early",
    evolution: "How opinion changed",
    takeaways: "Design lessons",
    usage:
      "How to use this report: paste it as context and ask, for example, \"review my game's design against what frustrates these players\" or \"which of the things that hook players here fit my game\".",
  },
};

export function renderBrief(source: Source, analysis: Analysis): string {
  const t = T[analysis.options.reportLanguage];
  const r = analysis.report;
  const lines: string[] = [];
  lines.push(`# ${t.title}: ${source.name}`, "");
  lines.push(`${source.url}${source.developer ? ` · ${source.developer}` : ""}${source.genres.length ? ` · ${source.genres.join(", ")}` : ""}`);
  if (source.totals) {
    const pct = source.totals.total ? Math.round((source.totals.positive / source.totals.total) * 100) : 0;
    lines.push(`${t.overall}: ${pct}% (${source.totals.total.toLocaleString("en-US")}) ${source.totals.scoreLabel ?? ""}`);
  }
  lines.push(t.method(analysis.sample.length, analysis.eras.map((e) => e.label).join("; ")), "");
  lines.push(r.summary, "", `## ${t.profile}`, "", r.playerProfile, "");

  for (const kind of ["love", "pain", "request"] as ThemeKind[]) {
    const themes = r.themes.filter((x) => x.kind === kind);
    if (!themes.length) continue;
    lines.push(`## ${t.kinds[kind]}`, "");
    for (const theme of themes) {
      const sev = theme.severity ? ` [${t.severity[theme.severity]}]` : "";
      lines.push(`### ${theme.title}${sev}`, "", `_${t.stats(theme)}_`, "", theme.description, "");
      for (const q of theme.quotes) lines.push(`> "${q.text}" (${q.positive ? "👍" : "👎"} ${q.hours} h, ${q.helpful} 👍)`);
      if (theme.quotes.length) lines.push("");
      lines.push(`**${t.takeaway}:** ${theme.takeaway}`, "");
    }
  }

  lines.push(`## ${t.earlyExit}`, "", r.earlyExit.summary, "");
  for (const reason of r.earlyExit.reasons) lines.push(`- ${reason.title} (${reason.reviewIds.length})`);
  lines.push("", `## ${t.evolution}`, "", r.evolution, "", `## ${t.takeaways}`, "");
  r.takeaways.forEach((k, i) => lines.push(`${i + 1}. **${k.title}.** ${k.detail}`));
  lines.push("", "---", t.usage, "");
  return lines.join("\n");
}
