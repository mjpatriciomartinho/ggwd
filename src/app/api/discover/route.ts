import { suggestGames } from "@/lib/discover";
import { requireAccess } from "@/lib/access";
import { handle } from "@/lib/http";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAccess();
    const { description, runId } = (await req.json().catch(() => ({}))) as { description?: string; runId?: string };
    // The client picks the run id so it can poll the engine log (/api/runs/:id) while it waits.
    const id = runId && /^[\w-]{8,64}$/.test(runId) ? `discover-${runId}` : null;
    return Response.json(await suggestGames(description ?? "", id));
  });
}
