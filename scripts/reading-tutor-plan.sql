-- Contains only short-lived, encrypted plan grants. The cookie holds an opaque handle.
CREATE TABLE IF NOT EXISTS reading_tutor_plan_sessions (
  session_hash TEXT PRIMARY KEY,
  credential TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reading_tutor_plan_expiry ON reading_tutor_plan_sessions(expires_at);

-- One-time OAuth transactions. The encrypted cookie holds the verifier and return route.
CREATE TABLE IF NOT EXISTS reading_tutor_plan_flows (
  flow_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reading_tutor_plan_flow_expiry ON reading_tutor_plan_flows(expires_at);
