import { renderBrief } from "@/lib/brief";
import { handle, notFound } from "@/lib/http";
import { getAnalysis, getSource } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/analyses/[id]/brief">) {
  return handle(async () => {
    const analysis = await getAnalysis(Number((await ctx.params).id));
    const source = analysis && (await getSource(analysis.sourceId));
    if (!analysis || !source) return notFound("Analysis");
    const download = new URL(req.url).searchParams.get("download") === "1";
    return new Response(renderBrief(source, analysis), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        ...(download && { "Content-Disposition": `attachment; filename="${source.id}-reviews.md"` }),
      },
    });
  });
}
