-- Every call to an AI model (Nebius Token Factory) or the web (Tavily), so the UI can always show which
-- engine is doing what, and why the router picked it.

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  label TEXT NOT NULL,
  task TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE INDEX IF NOT EXISTS events_by_run ON events(run_id, started_at);
CREATE INDEX IF NOT EXISTS events_by_time ON events(started_at);

-- Which pipeline step a job is on (lookup, collect, scout, skim, synthesize).
ALTER TABLE jobs ADD COLUMN step TEXT NOT NULL DEFAULT '';
