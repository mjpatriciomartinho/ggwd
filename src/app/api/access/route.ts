import { cookies } from "next/headers";
import { access, ACCESS_COOKIE, codeMatches } from "@/lib/access";
import { handle } from "@/lib/http";

export async function GET() {
  return handle(async () => Response.json({ access: await access() }));
}

/** Exchanges the ?code=… from the URL for a 30-day cookie. */
export async function POST(req: Request) {
  return handle(async () => {
    const { code } = (await req.json().catch(() => ({}))) as { code?: string };
    if (!code || !codeMatches(code)) return Response.json({ access: await access(), error: "Wrong code." }, { status: 403 });
    (await cookies()).set(ACCESS_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 86400,
    });
    return Response.json({ access: "unlocked" });
  });
}
