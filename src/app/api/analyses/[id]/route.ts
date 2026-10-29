import { handle, notFound } from "@/lib/http";
import { getAnalysis, getReviews, getSource } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/analyses/[id]">) {
  return handle(async () => {
    const analysis = await getAnalysis(Number((await ctx.params).id));
    if (!analysis) return notFound("Analysis");
    const source = await getSource(analysis.sourceId);
    const withReviews = new URL(req.url).searchParams.get("reviews") === "1";
    const reviews = withReviews ? await getReviews(analysis.sourceId, analysis.sample.map((s) => s.id)) : undefined;
    return Response.json({ analysis, source, reviews });
  });
}
