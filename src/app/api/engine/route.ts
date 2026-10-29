import { handle } from "@/lib/http";
import { engineState } from "@/lib/status";

export async function GET() {
  return handle(async () => Response.json(await engineState()));
}
