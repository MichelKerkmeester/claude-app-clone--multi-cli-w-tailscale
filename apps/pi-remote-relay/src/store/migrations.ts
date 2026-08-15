// ───────────────────────────────────────────────────────────────────
// MODULE: Numbered SQL Migration Runner
// ───────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type Database from 'better-sqlite3';

const MIGRATION_PATTERN = /^(\d{3})-([a-z0-9-]+)\.(up|down)\.sql$/;

interface MigrationFile {
  readonly version: number;
  readonly direction: 'up' | 'down';
  readonly path: string;
}

interface AppliedMigrationRow {
  readonly version: number;
}

/** Apply and reverse numbered SQL migration pairs transactionally. */
export class MigrationRunner {
  public constructor(
    private readonly database: Database.Database,
    private readonly migrationDirectory: string,
  ) {}

  /** Apply every pending up migration in numeric order. */
  public migrateUp(): void {
    this.ensureMetadataTable();
    const applied = new Set(
      this.database
        .prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all()
        .map((row) => (row as AppliedMigrationRow).version),
    );

    for (const migration of this.discover('up')) {
      if (applied.has(migration.version)) {
        continue;
      }
      const sql = readFileSync(migration.path, 'utf8');
      this.database.transaction(() => {
        this.database.exec(sql);
        this.database
          .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
          .run(migration.version, new Date().toISOString());
      })();
    }
  }

  /** Reverse the latest applied migration and return its version. */
  public migrateDown(): number | null {
    this.ensureMetadataTable();
    const latest = this.database
      .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
      .get() as AppliedMigrationRow | undefined;
    if (latest === undefined) {
      return null;
    }

    const migration = this.discover('down').find((item) => item.version === latest.version);
    if (migration === undefined) {
      throw new Error(`Missing down migration for version ${latest.version}.`);
    }
    const sql = readFileSync(migration.path, 'utf8');
    this.database.transaction(() => {
      this.database.exec(sql);
      this.database.prepare('DELETE FROM schema_migrations WHERE version = ?').run(latest.version);
    })();
    return latest.version;
  }

  private ensureMetadataTable(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);
  }

  private discover(direction: 'up' | 'down'): MigrationFile[] {
    return readdirSync(this.migrationDirectory)
      .flatMap((fileName): MigrationFile[] => {
        const match = MIGRATION_PATTERN.exec(fileName);
        if (match === null || match[3] !== direction || match[1] === undefined) {
          return [];
        }
        return [
          {
            version: Number.parseInt(match[1], 10),
            direction,
            path: path.join(this.migrationDirectory, fileName),
          },
        ];
      })
      .sort((left, right) => left.version - right.version);
  }
}
