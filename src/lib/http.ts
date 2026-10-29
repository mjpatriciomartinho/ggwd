import "server-only";
import { LockedError } from "./access";
import { AIError } from "./llm";
import { InputError } from "./jobs";
import { SteamError } from "./platforms/steam";

/** Wraps a route handler body so known errors become readable JSON responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof LockedError) return Response.json({ error: err.message, locked: true }, { status: 403 });
    if (err instanceof InputError) return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof SteamError) return Response.json({ error: `Steam: ${err.message}` }, { status: 502 });
    if (err instanceof AIError) return Response.json({ error: err.message }, { status: 422 });
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export function notFound(what: string) {
  return Response.json({ error: `${what} not found` }, { status: 404 });
}
