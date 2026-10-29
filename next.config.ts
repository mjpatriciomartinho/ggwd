import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Gives `next dev` local versions of the Cloudflare bindings (D1) declared in wrangler.jsonc.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
