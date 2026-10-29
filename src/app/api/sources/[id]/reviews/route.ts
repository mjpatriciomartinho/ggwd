import { handle } from "@/lib/http";
import { searchReviews } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/sources/[id]/reviews">) {
  return handle(async () => {
    const p = new URL(req.url).searchParams;
    const num = (k: string) => (p.get(k) != null && p.get(k) !== "" ? Number(p.get(k)) : undefined);
    const sentiment = p.get("sentiment");
    const reviews = await searchReviews((await ctx.params).id, {
      query: p.get("q") ?? undefined,
      sentiment: sentiment === "positive" || sentiment === "negative" ? sentiment : undefined,
      minHours: num("minHours"),
      maxHours: num("maxHours"),
      limit: num("limit"),
    });
    return Response.json({ reviews });
  });
}
