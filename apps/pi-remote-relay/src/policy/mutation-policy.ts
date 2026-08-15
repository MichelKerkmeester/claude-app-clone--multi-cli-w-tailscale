// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Mutation Command Policy
// ───────────────────────────────────────────────────────────────────

export type MutationFamily = 'filesystem' | 'process' | 'network';

const FAMILY_TOOLS: Readonly<Record<MutationFamily, ReadonlySet<string>>> = {
  filesystem: new Set(['edit', 'write']),
  process: new Set(['bash']),
  network: new Set(['fetch']),
};

/** Default-deny mutation policy with exactly one enabled command family at a time. */
export class MutationPolicy {
  private enabled = false;
  private readonly families = new Set<MutationFamily>();
  private readonly listeners = new Set<(reason: string) => void>();

  public isAllowed(tool: string): boolean {
    if (!this.enabled) return false;
    for (const family of this.families) {
      if (FAMILY_TOOLS[family].has(tool)) return true;
    }
    return false;
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.emitDisabled('kill-switch');
  }

  public enableFamily(family: MutationFamily): void {
    if (this.families.has(family)) return;
    this.families.clear();
    this.families.add(family);
    this.emitDisabled('family-changed');
  }

  public disableFamily(family: MutationFamily): void {
    if (this.families.delete(family)) this.emitDisabled('family-disabled');
  }

  public status(): { readonly enabled: boolean; readonly family: MutationFamily | null } {
    return { enabled: this.enabled, family: this.families.values().next().value ?? null };
  }

  public onDisable(listener: (reason: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitDisabled(reason: string): void {
    for (const listener of this.listeners) listener(reason);
  }
}
