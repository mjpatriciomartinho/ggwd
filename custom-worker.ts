// Worker entry: the Next.js app built by OpenNext, plus the Workflow that runs analyses in the background.
// `.open-next/worker.js` only exists after a build, so the check depends on build state.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";

// While the product is private, every request needs the SITE_PASSWORD secret through HTTP Basic auth
// (any username). Remove the secret to open the site; `next dev` never goes through this file.
async function authorized(request: Request, password: string): Promise<boolean> {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let given = "";
  try {
    given = atob(header.slice(6)).split(":").slice(1).join(":");
  } catch {
    return false;
  }
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(password)),
  ]);
  // Workers-only API; the DOM typings the app compiles with don't know it.
  const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean };
  return subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(request, env, ctx) {
    if (env.SITE_PASSWORD && !(await authorized(request, env.SITE_PASSWORD))) {
      return new Response("This site is private for now.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Private preview", charset="UTF-8"', "X-Robots-Tag": "noindex" },
      });
    }
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv & { SITE_PASSWORD?: string }>;

export { AnalysisWorkflow } from "./src/workflows/analysis";
