CREATE TABLE push_subscriptions (
  device_id TEXT PRIMARY KEY,
  subscription_ciphertext TEXT NOT NULL,
  subscription_iv TEXT NOT NULL,
  preferences_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE attention_items (
  lookup_id TEXT PRIMARY KEY,
  attention_class TEXT NOT NULL CHECK (attention_class IN ('needs_input', 'finished', 'error')),
  generation INTEGER NOT NULL CHECK (generation > 0),
  nonce TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('session', 'review')),
  focus_id TEXT,
  occurred_at TEXT NOT NULL,
  UNIQUE (session_id, epoch, generation, nonce)
);

CREATE INDEX attention_items_recent_idx ON attention_items (occurred_at DESC);
