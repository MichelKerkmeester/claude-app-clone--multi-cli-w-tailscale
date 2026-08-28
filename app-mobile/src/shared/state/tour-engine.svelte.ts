// ───────────────────────────────────────────────────────────────────
// MODULE: TOUR ENGINE
// ───────────────────────────────────────────────────────────────────
// Device-local coach-mark state that only exposes steps with a live target.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface TourStep {
  readonly id: string;
  readonly target: string;
  readonly title?: string;
  readonly description?: string;
}

export interface TourDefinition {
  readonly id: string;
  readonly steps: readonly TourStep[];
}

export interface TourStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface TourEngineOptions {
  readonly tours: readonly TourDefinition[];
  readonly isOverlayOpen: () => boolean;
  readonly storage?: TourStorage | null;
}

export interface TourEngine {
  readonly activeTourId: string | null;
  readonly currentStep: TourStep | null;
  readonly isVisible: boolean;
  readonly hasSeen: (tourId: string) => boolean;
  readonly start: (tourId: string) => boolean;
  readonly advance: () => boolean;
  readonly refresh: () => boolean;
  readonly dismiss: () => void;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const SEEN_TOURS_STORAGE_KEY = 'pi-remote:seen-tours';

// ───────────────────────────────────────────────────────────────────
// 3. STORAGE
// ───────────────────────────────────────────────────────────────────

function resolveStorage(storage: TourStorage | null | undefined): TourStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readSeenTours(storage: TourStorage | null): Set<string> {
  if (storage === null) return new Set();

  try {
    const raw = storage.getItem(SEEN_TOURS_STORAGE_KEY);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

function persistSeenTours(storage: TourStorage | null, seenTours: readonly string[]): boolean {
  if (storage === null) return false;

  try {
    storage.setItem(SEEN_TOURS_STORAGE_KEY, JSON.stringify(seenTours));
    return true;
  } catch {
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. TARGET GATING
// ───────────────────────────────────────────────────────────────────

function targetIsVisible(selector: string): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;

    let current: HTMLElement | null = element;
    while (current !== null) {
      if (
        current.hidden ||
        current.inert ||
        current.getAttribute('aria-hidden') === 'true'
      ) {
        return false;
      }

      if (typeof window !== 'undefined') {
        const style = window.getComputedStyle(current);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          style.opacity === '0'
        ) {
          return false;
        }
      }

      current = current.parentElement;
    }

    return true;
  } catch {
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. ENGINE
// ───────────────────────────────────────────────────────────────────

export function createTourEngine(options: TourEngineOptions): TourEngine {
  const storage = resolveStorage(options.storage);
  const seenTours = readSeenTours(storage);
  const tours = options.tours;

  let activeTourId = $state<string | null>(null);
  let activeStepIndex = $state(-1);

  function isOverlayOpen(): boolean {
    try {
      return typeof options.isOverlayOpen === 'function' ? options.isOverlayOpen() : true;
    } catch {
      return true;
    }
  }

  function getTour(tourId: string): TourDefinition | null {
    return tours.find((tour) => tour.id === tourId) ?? null;
  }

  function getActiveTour(): TourDefinition | null {
    if (activeTourId === null) return null;
    return getTour(activeTourId);
  }

  function canRender(step: TourStep | null): step is TourStep {
    return step !== null && !isOverlayOpen() && targetIsVisible(step.target);
  }

  function findAvailableStep(tour: TourDefinition, startIndex: number): number {
    for (let index = Math.max(0, startIndex); index < tour.steps.length; index++) {
      const step = tour.steps[index];
      if (step !== undefined && canRender(step)) return index;
    }
    return -1;
  }

  function clearActiveStep(): void {
    activeTourId = null;
    activeStepIndex = -1;
  }

  function start(tourId: string): boolean {
    if (seenTours.has(tourId) || storage === null || isOverlayOpen()) return false;

    const tour = getTour(tourId);
    if (tour === null) return false;

    const stepIndex = findAvailableStep(tour, 0);
    if (stepIndex < 0) return false;

    const nextSeenTours = [...seenTours, tourId];
    if (!persistSeenTours(storage, nextSeenTours)) return false;

    seenTours.add(tourId);
    activeTourId = tourId;
    activeStepIndex = stepIndex;
    return true;
  }

  function advance(): boolean {
    const tour = getActiveTour();
    if (tour === null || isOverlayOpen()) return false;

    const nextIndex = findAvailableStep(tour, activeStepIndex + 1);
    if (nextIndex < 0) {
      clearActiveStep();
      return false;
    }

    activeStepIndex = nextIndex;
    return true;
  }

  function refresh(): boolean {
    const tour = getActiveTour();
    if (tour === null || isOverlayOpen()) return false;

    const currentStep = tour.steps[activeStepIndex] ?? null;
    if (canRender(currentStep)) return true;

    const nextIndex = findAvailableStep(tour, activeStepIndex + 1);
    if (nextIndex < 0) {
      clearActiveStep();
      return false;
    }

    activeStepIndex = nextIndex;
    return true;
  }

  function dismiss(): void {
    clearActiveStep();
  }

  function getCurrentStep(): TourStep | null {
    const tour = getActiveTour();
    const step = tour?.steps[activeStepIndex] ?? null;
    return canRender(step) ? step : null;
  }

  return {
    get activeTourId() {
      return activeTourId;
    },
    get currentStep() {
      return getCurrentStep();
    },
    get isVisible() {
      return getCurrentStep() !== null;
    },
    hasSeen: (tourId) => seenTours.has(tourId),
    start,
    advance,
    refresh,
    dismiss,
  };
}
