CREATE TABLE inbound_artifacts (
  session_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  revision TEXT NOT NULL,
  block_id TEXT NOT NULL,
  block_revision INTEGER NOT NULL CHECK (block_revision > 0),
  owner_principal TEXT NOT NULL,
  owner_device_id TEXT NOT NULL,
  media_class TEXT NOT NULL CHECK (media_class IN ('screenshot', 'raster', 'generated')),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('ready', 'withheld', 'expired', 'revoked')),
  full_digest TEXT,
  full_media_type TEXT,
  full_width INTEGER,
  full_height INTEGER,
  full_byte_length INTEGER CHECK (full_byte_length IS NULL OR full_byte_length > 0),
  thumbnail_digest TEXT,
  thumbnail_media_type TEXT,
  thumbnail_width INTEGER,
  thumbnail_height INTEGER,
  thumbnail_byte_length INTEGER CHECK (thumbnail_byte_length IS NULL OR thumbnail_byte_length > 0),
  expires_at TEXT NOT NULL,
  retention_until TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settled_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY (session_id, artifact_id, revision),
  CHECK (
    lifecycle <> 'ready' OR (
      full_digest IS NOT NULL AND full_media_type IS NOT NULL AND
      full_width IS NOT NULL AND full_height IS NOT NULL AND full_byte_length IS NOT NULL AND
      thumbnail_digest IS NOT NULL AND thumbnail_media_type IS NOT NULL AND
      thumbnail_width IS NOT NULL AND thumbnail_height IS NOT NULL AND thumbnail_byte_length IS NOT NULL
    )
  )
);

CREATE INDEX inbound_artifacts_expiry_idx
  ON inbound_artifacts (expires_at, retention_until);
CREATE INDEX inbound_artifacts_owner_idx
  ON inbound_artifacts (session_id, owner_device_id, lifecycle);
