CREATE TABLE stream_epochs (
  host_id TEXT NOT NULL,
  workspace_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  PRIMARY KEY (host_id, workspace_ref, session_id, epoch)
);

CREATE TABLE stream_state (
  host_id TEXT NOT NULL,
  workspace_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  current_epoch TEXT NOT NULL,
  floor_seq INTEGER NOT NULL CHECK (floor_seq >= 1),
  high_seq INTEGER NOT NULL CHECK (high_seq >= 0),
  PRIMARY KEY (host_id, workspace_ref, session_id)
);

CREATE TABLE envelopes (
  event_id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  workspace_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK (seq >= 1),
  kind TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  UNIQUE (host_id, workspace_ref, session_id, epoch, seq)
);

CREATE INDEX envelopes_replay_idx
  ON envelopes (host_id, workspace_ref, session_id, epoch, seq);

CREATE TABLE session_catalog (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'interrupted', 'unknown')),
  updated_at TEXT NOT NULL,
  message_count INTEGER NOT NULL CHECK (message_count >= 0)
);
