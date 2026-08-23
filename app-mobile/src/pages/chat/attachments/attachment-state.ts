// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Draft State
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  MEDIA_SOURCE_MIME_TYPES,
  type RuntimeMediaCapabilityDto,
} from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. DRAFT LIMITS AND ACCEPTED TYPES
// ───────────────────────────────────────────────────────────────────

export const MAX_ATTACHMENT_COUNT = 4;
export const ATTACHMENT_ACCEPT = MEDIA_SOURCE_MIME_TYPES.join(',');

// ───────────────────────────────────────────────────────────────────
// 3. DRAFT STATE TYPES
// ───────────────────────────────────────────────────────────────────

export type AttachmentPreviewState = 'available' | 'unavailable';
export type AttachmentItemStatus =
  'local-validating' | 'local-ready' | 'local-rejected' | 'model-blocked';
export type AttachmentDraftPhase =
  | 'idle'
  | 'menu-open'
  | 'picker-active'
  | 'local-validating'
  | 'local-ready'
  | 'local-rejected'
  | 'model-blocked';
export type AttachmentRejectionReason = 'unsupported-type';

/** Only bounded, generic metadata belongs in this state. Files and URLs stay outside it. */
export interface AttachmentDraftItem {
  readonly id: string;
  readonly ordinal: number;
  readonly label: string;
  readonly status: AttachmentItemStatus;
  readonly preview: AttachmentPreviewState;
  readonly rejection: AttachmentRejectionReason | null;
}

export interface AttachmentDraftState {
  readonly items: readonly AttachmentDraftItem[];
  readonly phase: AttachmentDraftPhase;
  readonly message: string | null;
  readonly previewId: string | null;
  readonly capabilityAvailable: boolean;
  readonly modelCanViewPhotos: boolean;
}

export interface AttachmentCandidate {
  readonly id: string;
  readonly accepted: boolean;
  readonly preview: AttachmentPreviewState;
  readonly reason: AttachmentRejectionReason | null;
}

export type AttachmentDraftAction =
  | {
      readonly type: 'configure';
      readonly capabilityAvailable: boolean;
      readonly modelCanViewPhotos: boolean;
    }
  | { readonly type: 'menu-open' }
  | { readonly type: 'picker-open' }
  | { readonly type: 'picker-cancel' }
  | {
      readonly type: 'select';
      readonly candidates: readonly AttachmentCandidate[];
      readonly limitReached: boolean;
    }
  | { readonly type: 'validate' }
  | { readonly type: 'preview-open'; readonly id: string }
  | { readonly type: 'preview-close' }
  | { readonly type: 'remove'; readonly id: string }
  | {
      readonly type: 'clear';
      readonly message?: string | null;
      readonly phase?: AttachmentDraftPhase;
    }
  | {
      readonly type: 'lifecycle-clear';
      readonly message?: string | null;
      readonly phase?: AttachmentDraftPhase;
    };

export type AttachmentCapability = Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'>;

// ───────────────────────────────────────────────────────────────────
// 4. DEFAULT STATE AND USER MESSAGES
// ───────────────────────────────────────────────────────────────────

export const EMPTY_ATTACHMENT_DRAFT: AttachmentDraftState = {
  items: [],
  phase: 'idle',
  message: null,
  previewId: null,
  capabilityAvailable: false,
  modelCanViewPhotos: true,
};

const LIMIT_MESSAGE = 'You can add up to four photos.';
const UNSUPPORTED_MESSAGE = 'One or more selections are not supported photos.';
const MODEL_BLOCKED_MESSAGE = 'Current model cannot view photos.';

// ───────────────────────────────────────────────────────────────────
// 5. DRAFT REDUCER
// ───────────────────────────────────────────────────────────────────

export function attachmentDraftReducer(
  state: AttachmentDraftState,
  action: AttachmentDraftAction,
): AttachmentDraftState {
  switch (action.type) {
    case 'configure': {
      if (!action.capabilityAvailable) {
        return {
          ...state,
          items: [],
          phase: 'idle',
          message: null,
          previewId: null,
          capabilityAvailable: false,
          modelCanViewPhotos: action.modelCanViewPhotos,
        };
      }
      return {
        ...state,
        capabilityAvailable: true,
        modelCanViewPhotos: action.modelCanViewPhotos,
      };
    }
    case 'menu-open':
      return state.capabilityAvailable ? { ...state, phase: 'menu-open', message: null } : state;
    case 'picker-open':
      return state.capabilityAvailable
        ? { ...state, phase: 'picker-active', message: null }
        : state;
    case 'picker-cancel':
      return state.items.length === 0
        ? { ...state, phase: 'idle', message: null }
        : stateWithPhase(state);
    case 'select': {
      if (!state.capabilityAvailable || action.candidates.length === 0) {
        return action.limitReached
          ? { ...state, phase: stateWithPhase(state).phase, message: LIMIT_MESSAGE }
          : stateWithPhase(state);
      }
      const available = Math.max(0, MAX_ATTACHMENT_COUNT - state.items.length);
      const acceptedCandidates = action.candidates.slice(0, available);
      const newItems = acceptedCandidates.map((candidate) => ({
        id: candidate.id,
        ordinal: 0,
        label: 'Photo 0',
        status: candidate.accepted ? ('local-validating' as const) : ('local-rejected' as const),
        preview: candidate.preview,
        rejection: candidate.reason,
      }));
      const items = renumberItems([...state.items, ...newItems]);
      const hasRejected = newItems.some((item) => item.status === 'local-rejected');
      const message =
        action.limitReached || action.candidates.length > acceptedCandidates.length
          ? LIMIT_MESSAGE
          : hasRejected
            ? UNSUPPORTED_MESSAGE
            : null;
      return {
        ...state,
        items,
        phase: phaseForItems(items),
        message,
        previewId: null,
      };
    }
    case 'validate': {
      const items = state.items.map((item) =>
        item.status === 'local-validating'
          ? {
              ...item,
              status: state.modelCanViewPhotos
                ? ('local-ready' as const)
                : ('model-blocked' as const),
            }
          : item,
      );
      return {
        ...state,
        items,
        phase: phaseForItems(items),
        message: state.modelCanViewPhotos
          ? items.some((item) => item.status === 'local-rejected')
            ? UNSUPPORTED_MESSAGE
            : state.message
          : MODEL_BLOCKED_MESSAGE,
      };
    }
    case 'preview-open':
      return state.items.some((item) => item.id === action.id)
        ? { ...state, previewId: action.id }
        : state;
    case 'preview-close':
      return { ...state, previewId: null };
    case 'remove': {
      const items = renumberItems(state.items.filter((item) => item.id !== action.id));
      return {
        ...state,
        items,
        phase: phaseForItems(items),
        message: null,
        previewId: state.previewId === action.id ? null : state.previewId,
      };
    }
    case 'clear':
    case 'lifecycle-clear':
      return {
        ...state,
        items: [],
        phase: action.phase ?? 'idle',
        message: action.message ?? null,
        previewId: null,
      };
  }
}

// ───────────────────────────────────────────────────────────────────
// 6. PUBLIC DRAFT HELPERS
// ───────────────────────────────────────────────────────────────────

export function capabilityAllowsPhotos(
  capability: AttachmentCapability | null | undefined,
): boolean {
  return capability?.enabled === true && capability.imageIn === true;
}

export function attachmentStatusLabel(item: AttachmentDraftItem): string {
  switch (item.status) {
    case 'local-ready':
      return 'Ready locally';
    case 'local-validating':
      return 'Checking locally';
    case 'local-rejected':
      return 'Not supported';
    case 'model-blocked':
      return 'Model unavailable';
  }
}

export function modelBlockedMessage(): string {
  return MODEL_BLOCKED_MESSAGE;
}

// ───────────────────────────────────────────────────────────────────
// 7. PHASE AND ORDINAL HELPERS
// ───────────────────────────────────────────────────────────────────

function phaseForItems(items: readonly AttachmentDraftItem[]): AttachmentDraftPhase {
  if (items.some((item) => item.status === 'local-validating')) return 'local-validating';
  if (items.some((item) => item.status === 'model-blocked')) return 'model-blocked';
  if (items.some((item) => item.status === 'local-rejected')) return 'local-rejected';
  return items.length === 0 ? 'idle' : 'local-ready';
}

function stateWithPhase(state: AttachmentDraftState): AttachmentDraftState {
  return { ...state, phase: phaseForItems(state.items) };
}

function renumberItems(items: readonly AttachmentDraftItem[]): readonly AttachmentDraftItem[] {
  return items.map((item, index) => ({
    ...item,
    ordinal: index + 1,
    label: `Photo ${index + 1}`,
  }));
}
