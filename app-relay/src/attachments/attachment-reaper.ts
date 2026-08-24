// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Lifecycle Reaper
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { UNCOMMITTED_TTL_MS } from './attachment-limits.js';
import { AttachmentService } from './attachment-service.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface AttachmentReaperOptions {
  readonly service: AttachmentService;
  readonly now?: () => number;
  readonly intervalMs?: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Converge every transient lifecycle boundary on the same unlink path. */
export class AttachmentReaper {
  private readonly now: () => number;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  public constructor(private readonly options: AttachmentReaperOptions) {
    this.now = options.now ?? Date.now;
    this.intervalMs = options.intervalMs ?? Math.min(30_000, UNCOMMITTED_TTL_MS);
  }

  public async start(): Promise<void> {
    await this.options.service.recoverStartup();
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.options.service.reapExpired(this.now());
    }, this.intervalMs);
    this.timer.unref();
  }

  public async onLogout(sessionToken: string): Promise<void> {
    await this.options.service.cancelForSession(sessionToken, 'revoked');
  }

  public async onDeviceRevoked(deviceId: string): Promise<void> {
    await this.options.service.cancelForDevice(deviceId, 'revoked');
  }

  public async onEpochChange(epoch: string): Promise<void> {
    await this.options.service.cancelForEpoch(epoch);
  }

  public async onDeliveryUnknown(setId: string): Promise<void> {
    await this.options.service.markDeliveryUnknown(setId);
  }

  public async shutdown(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.options.service.cleanupAll();
  }
}
