import { eventsFor } from "@/lib/engine";
import { handle } from "@/lib/http";

/** The engine log of one game-suggestion run, polled by the UI while the suggestions are being made. */
export async function GET(_req: Request, ctx: RouteContext<"/api/runs/[id]">) {
  return handle(async () => Response.json({ events: await eventsFor(`discover-${(await ctx.params).id}`) }));
}
