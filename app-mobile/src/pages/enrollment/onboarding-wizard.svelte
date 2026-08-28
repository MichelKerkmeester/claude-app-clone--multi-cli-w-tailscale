<script module lang="ts">
  // This module holds the props for the device-local onboarding choice surface.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ONBOARDING WIZARD
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  import type {
    OnboardingDecisions,
    OnboardingGate,
  } from '$shared/state/onboarding-gates.js';

  export interface OnboardingWizardProps {
    readonly gates?: readonly OnboardingGate[];
    readonly decisions?: OnboardingDecisions;
    readonly entryGateId?: string;
    readonly onDecision?: (gateId: string, decision: string) => void;
    readonly onComplete?: () => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 2. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import {
    clearOnboardingDecisions,
    DEFAULT_ONBOARDING_GATES,
    getNextOnboardingGate,
    isOnboardingGateSkipped,
    persistOnboardingDecision,
    readOnboardingGateState,
    setOnboardingDecision,
  } from '$shared/state/onboarding-gates.js';

  // ───────────────────────────────────────────────────────────────────
  // 3. PROPS AND STATE
  // ───────────────────────────────────────────────────────────────────

  let {
    gates = DEFAULT_ONBOARDING_GATES,
    decisions: initialDecisions,
    entryGateId,
    onDecision,
    onComplete,
  }: OnboardingWizardProps = $props();

  const storedState = readOnboardingGateState();
  let decisions = $state<Record<string, string>>({});
  let completionNotified = $state(false);

  const activeGate = $derived(getNextOnboardingGate(gates, decisions, entryGateId));

  // Rehydrate prop-provided choices without making local choices an effect dependency.
  $effect(() => {
    const next = {
      ...(storedState.available ? storedState.decisions : {}),
      ...(initialDecisions ?? {}),
    };
    untrack(() => (decisions = next));
  });
  const isComplete = $derived(activeGate === null);

  // Keep completion notification separate from the derived gate so rendering
  // never treats a local choice as a confirmed pairing result.
  $effect(() => {
    if (!isComplete || completionNotified) return;
    untrack(() => {
      completionNotified = true;
      onComplete?.();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Store only an option offered by the currently visible gate.
  function choose(decision: string): void {
    const gate = activeGate;
    if (gate === null || isOnboardingGateSkipped(gate, decisions)) return;
    if (!gate.options.some((option) => option.value === decision)) return;

    decisions = setOnboardingDecision(decisions, gate.id, decision);
    persistOnboardingDecision(gate.id, decision);
    onDecision?.(gate.id, decision);
  }

  // Reopen the local choices without touching authentication or host state.
  function changeChoices(): void {
    clearOnboardingDecisions();
    decisions = {};
    completionNotified = false;
  }
</script>

<!-- section: onboarding choice -->
<section
  class="onboarding--wizard"
  data-onboarding-state={isComplete ? 'complete' : 'choice'}
  aria-live="polite"
>
  {#if activeGate !== null}
    <p class="surface--eyebrow">First-run setup</p>
    <h2>{activeGate.title}</h2>
    <p class="onboarding--description">{activeGate.description}</p>
    <p class="onboarding--change-note">You can change this choice later on this device.</p>
    <div class="onboarding--options" role="group" aria-label={activeGate.title}>
      {#each activeGate.options as option (option.value)}
        <button
          type="button"
          data-onboarding-option={option.value}
          onclick={() => choose(option.value)}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {:else}
    <p class="surface--eyebrow">First-run setup</p>
    <h2>Setup choices complete</h2>
    <p class="onboarding--description">
      These choices affect only this device. Pairing still waits for a confirmed device session.
    </p>
    <button type="button" class="onboarding--change" onclick={changeChoices}>
      Change setup choices
    </button>
  {/if}
</section>

<style>
  /* This surface: onboarding--wizard — local setup choices before device pairing. */
  /* ───────────────────────────────────────────────────────────────────
     1. WIZARD SURFACE
  ─────────────────────────────────────────────────────────────────── */
  .onboarding--wizard {
    display: grid;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }

  /* Keeps the choice heading compact so pairing remains the primary action. */
  .onboarding--wizard h2 {
    margin: 0;
    color: var(--ink);
    font-size: clamp(1.35rem, 4vw, 2rem);
    letter-spacing: -0.025em;
  }

  /* Keeps local guidance readable without implying a host decision. */
  .onboarding--description,
  .onboarding--change-note {
    max-width: 36rem;
    margin: 0;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  /* Separates the reversible-choice reminder from the main explanation. */
  .onboarding--change-note {
    color: var(--ink-muted);
    font-size: 0.8rem;
  }

  /* Keeps every choice reachable by touch, keyboard and assistive technology. */
  .onboarding--options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: var(--space-3);
  }

  /* Gives local choices a clear action shape without using color as the only signal. */
  .onboarding--options button,
  .onboarding--change {
    min-height: 44px;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.8rem;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }

  /* Keeps the reset action visibly secondary after the wizard reaches its terminal state. */
  .onboarding--change {
    justify-self: start;
    color: var(--ink-secondary);
  }

  /* Preserves a visible keyboard position for local choices. */
  .onboarding--wizard button:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  /* Keeps the wizard calm for people who disable motion. */
  @media (prefers-reduced-motion: reduce) {
    .onboarding--wizard button {
      transition: none;
    }
  }
</style>
