

import type {
  AppReviewOutcome,
  EmailPasswordAuthMode,
  OsPermissionKey,
  OAuthLoginProvider,
  PermissionOutcome,
} from '@getrheo/contracts/layers';
import type {
  NormalizedSurfaceOutcome,
} from '@getrheo/contracts/externalSurfaces';

/** Reserved-key patch the SDK can merge into the session when an external surface resolves. */
export type SurfaceSdkKeyPatch = Record<string, string | number | boolean>;

/** Stable response key used to store an external surface outcome for analytics. */
export const externalSurfaceResponseKey = (nodeId: string): string => `surface_${nodeId}`;

/** Input/capture payloads merged when Skip or End flow consumes the screen draft. */
export type ConsumedDraftPayload =
  | { kind: 'choice'; choiceId: string }
  | { kind: 'multiChoice'; choiceIds: string[] }
  | { kind: 'text'; value: string; classification: 'safe' | 'sensitive' }
  | { kind: 'scale'; value: number }
  | { kind: 'wheel'; value: string }
  | { kind: 'cta'; action: 'primary' | 'secondary' }
  | { kind: 'carousel' };

/** Payloads issued when advancing a step (excludes {@link screen_commit}). */
export type StepResponseCore =
  | { kind: 'choice'; choiceId: string }
  | { kind: 'multiChoice'; choiceIds: string[] }
  | { kind: 'text'; value: string; classification: 'safe' | 'sensitive' }
  | { kind: 'scale'; value: number }
  | { kind: 'wheel'; value: string }
  | { kind: 'checkbox'; fieldKey: string; value: boolean }
  | { kind: 'cta'; action: 'primary' | 'secondary' }
  | { kind: 'carousel' }
  | { kind: 'skip'; consumedDraft?: ConsumedDraftPayload }
  | { kind: 'end_flow'; consumedDraft?: ConsumedDraftPayload }
  /** Recorded under the screen's `fieldKey` when Skip / Go to screen leaves a manual-submit input empty. */
  | { kind: 'bypass_input'; via: 'skip' | 'go_to_screen' }
  | { kind: 'go_to_screen'; screenId: string }
  | {
      kind: 'permission_outcome';
      layerId: string;
      permissionKey: OsPermissionKey;
      outcome: PermissionOutcome;
    }
  | {
      kind: 'app_review_outcome';
      layerId: string;
      outcome: AppReviewOutcome;
    }
  | {
      kind: 'oauth_login_resolve';
      layerId: string;
      provider: OAuthLoginProvider;
      success: boolean;
      customerExternalId?: string;
      error?: unknown;
    }
  | {
      kind: 'email_password_auth_resolve';
      layerId: string;
      fieldKey: string;
      mode: EmailPasswordAuthMode;
      email: string;
      password: string;
      confirmPassword?: string;
      success: boolean;
      error?: unknown;
    }
  | {
      /** Resolved when an external surface (e.g. RevenueCat paywall) finishes. */
      kind: 'external_surface_outcome';
      nodeId: string;
      outcome: NormalizedSurfaceOutcome;
      /** Reserved SDK keys merged into the session (e.g. `onb_rc_last_product_id`). */
      sdkKeyPatch?: SurfaceSdkKeyPatch;
    }
  | { kind: 'go_back'; fallbackScreenId?: string };

/** Single user or SDK action on the flow (may bundle checkbox snapshots on Continue). */
export type StepResponse =
  | StepResponseCore
  | {
      kind: 'screen_commit';
      primary: StepResponseCore;
      checkboxValues: Record<string, boolean>;
      /** Input draft captured alongside a non-input primary (e.g. `app_review_outcome`). */
      capturedDraft?: ConsumedDraftPayload;
    };

export const isEligibleConsumedDraft = (r: StepResponse): r is ConsumedDraftPayload => {
  switch (r.kind) {
    case 'text':
    case 'choice':
    case 'multiChoice':
    case 'scale':
    case 'wheel':
    case 'cta':
    case 'carousel':
      return true;
    default:
      return false;
  }
};
