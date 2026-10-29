"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Picks ?code=… up from any page, trades it for the access cookie and cleans it out of the address bar. */
export function AccessCode() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const code = params.get("code");

  useEffect(() => {
    if (!code) return;
    void fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).finally(() => {
      const rest = new URLSearchParams(params);
      rest.delete("code");
      router.replace(rest.size ? `${pathname}?${rest}` : pathname);
      router.refresh();
    });
  }, [code, params, pathname, router]);

  return null;
}
