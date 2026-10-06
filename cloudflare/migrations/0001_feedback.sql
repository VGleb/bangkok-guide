PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS feedback_items (
  item_id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_fields (
  item_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (item_id, field),
  FOREIGN KEY (item_id) REFERENCES feedback_items(item_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_fields_updated_at
  ON feedback_fields(updated_at);
