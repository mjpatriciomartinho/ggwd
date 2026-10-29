import { handle, notFound } from "@/lib/http";
import { deleteSource, getSource, latestAnalysisFor } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/sources/[id]">) {
  return handle(async () => {
    const id = (await ctx.params).id;
    const source = await getSource(id);
    if (!source) return notFound("Source");
    return Response.json({ source, latestAnalysisId: (await latestAnalysisFor(id))?.id ?? null });
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/sources/[id]">) {
  return handle(async () => {
    await deleteSource((await ctx.params).id);
    return Response.json({ ok: true });
  });
}
