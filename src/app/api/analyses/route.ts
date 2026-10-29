import { requireAccess } from "@/lib/access";
import { handle } from "@/lib/http";
import { InputError, startAnalysis } from "@/lib/jobs";
import { listAnalyses } from "@/lib/store";
import type { SampleOptions } from "@/lib/types";

export async function GET() {
  return handle(async () => Response.json({ analyses: await listAnalyses() }));
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireAccess();
    const body = (await req.json().catch(() => ({}))) as Partial<SampleOptions> & { url?: string };
    if (!body.url) throw new InputError("Missing url.");
    const options: SampleOptions = {
      perSide: Math.min(Math.max(Number(body.perSide) || 200, 50), 500),
      language: /^[a-z]+$/.test(body.language ?? "") ? body.language! : "english",
      reportLanguage: body.reportLanguage === "es" ? "es" : "en",
    };
    return Response.json({ job: await startAnalysis(body.url, options) }, { status: 202 });
  });
}
