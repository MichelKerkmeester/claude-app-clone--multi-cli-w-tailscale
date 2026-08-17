CREATE TABLE artifacts (
  session_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  descriptor_json TEXT NOT NULL,
  artifact_bytes BLOB NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0 AND byte_length <= 52428800),
  range_start INTEGER NOT NULL CHECK (range_start = 0),
  range_end INTEGER NOT NULL CHECK (range_end >= -1),
  digest TEXT NOT NULL CHECK (length(digest) = 64),
  etag TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  renderer TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (session_id, artifact_id, revision)
);

CREATE INDEX artifacts_expiry_idx ON artifacts (expires_at, retention_until);
CREATE INDEX artifacts_session_idx ON artifacts (session_id, artifact_id, revision);
