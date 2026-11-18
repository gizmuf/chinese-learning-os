CREATE TABLE IF NOT EXISTS reading_lab_audio_quota (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_used INTEGER NOT NULL DEFAULT 0 CHECK (daily_used >= 0),
  utc_day TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO reading_lab_audio_quota (id) VALUES (1);
