-- Sources (games/apps), their reviews, analyses and background jobs.
-- Reviewer names and Steam IDs are never stored, only the review itself.

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  positive INTEGER NOT NULL,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  hours_total REAL NOT NULL,
  hours_at_review REAL NOT NULL,
  helpful INTEGER NOT NULL,
  funny INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  early_access INTEGER NOT NULL,
  free_copy INTEGER NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (source_id, review_id)
);

CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  options TEXT NOT NULL,
  eras TEXT NOT NULL,
  sample TEXT NOT NULL,
  report TEXT NOT NULL,
  model TEXT NOT NULL,
  usage TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  analysis_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS reviews_by_source ON reviews(source_id, positive);
CREATE INDEX IF NOT EXISTS analyses_by_source ON analyses(source_id, created_at);
CREATE INDEX IF NOT EXISTS jobs_by_source ON jobs(source_id, status);
