import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The D1 database (schema in /migrations). Inside Next requests it comes from the Cloudflare context;
// the analysis Workflow runs outside Next and hands its own binding over with bindDb().
// `next dev` gets a local D1 from initOpenNextCloudflareForDev (apply migrations with `npm run db:migrate`).

let bound: D1Database | null = null;

export function bindDb(database: D1Database) {
  bound = database;
}

export function db(): D1Database {
  return bound ?? getCloudflareContext().env.DB;
}
