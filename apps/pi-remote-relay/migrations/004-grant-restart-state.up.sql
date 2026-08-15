ALTER TABLE accept_edits_grants RENAME TO accept_edits_grants_legacy;

CREATE TABLE accept_edits_grants (
  grant_id TEXT PRIMARY KEY,
  principal_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  allowed_tools_json TEXT NOT NULL,
  remaining_actions INTEGER NOT NULL CHECK (remaining_actions >= 0),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'active', 'expired', 'revoked', 'restart-invalidated', 'exhausted'
  )),
  created_at TEXT NOT NULL
);

INSERT INTO accept_edits_grants (
  grant_id, principal_ref, session_id, epoch, allowed_tools_json,
  remaining_actions, expires_at, status, created_at
)
SELECT grant_id, principal_ref, session_id, epoch, allowed_tools_json,
  remaining_actions, expires_at, status, created_at
FROM accept_edits_grants_legacy;

DROP TABLE accept_edits_grants_legacy;
