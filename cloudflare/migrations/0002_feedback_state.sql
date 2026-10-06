CREATE TABLE IF NOT EXISTS feedback_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
