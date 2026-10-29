import { eventsFor } from "@/lib/engine";
import { handle, notFound } from "@/lib/http";
import { getJob } from "@/lib/jobs";

export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  return handle(async () => {
    const id = (await ctx.params).id;
    const job = await getJob(id);
    return job ? Response.json({ job, events: await eventsFor(id) }) : notFound("Job");
  });
}
