CREATE TABLE approval_leases (
  approval_id TEXT PRIMARY KEY,
  principal_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  tool TEXT NOT NULL,
  digest TEXT NOT NULL,
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  revision INTEGER NOT NULL CHECK (revision > 0),
  source TEXT NOT NULL CHECK (source IN ('explicit', 'accept-edits')),
  requested_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'approved', 'denied', 'expired', 'revoked',
    'restart-invalidated', 'consumed', 'failed'
  )),
  decision TEXT CHECK (decision IN ('approve', 'deny')),
  decided_by_device TEXT,
  idempotency_key TEXT UNIQUE,
  settled_at TEXT,
  reason TEXT
);

CREATE INDEX approval_leases_session_idx
  ON approval_leases (session_id, epoch, requested_at DESC);

CREATE TABLE approval_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_id TEXT NOT NULL,
  principal_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  tool TEXT NOT NULL,
  digest TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  transition TEXT NOT NULL,
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX approval_audit_lease_idx
  ON approval_audit (approval_id, audit_id);

CREATE TABLE accept_edits_grants (
  grant_id TEXT PRIMARY KEY,
  principal_ref TEXT NOT NULL,
  session_id TEXT NOT NULL,
  epoch TEXT NOT NULL,
  allowed_tools_json TEXT NOT NULL,
  remaining_actions INTEGER NOT NULL CHECK (remaining_actions >= 0),
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked', 'exhausted')),
  created_at TEXT NOT NULL
);
