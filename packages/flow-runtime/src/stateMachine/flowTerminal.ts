import type { EmailPasswordAuthMode, OAuthLoginProvider } from '@getrheo/contracts/layers';
import type { NormalizedSurfaceOutcome } from '@getrheo/contracts/externalSurfaces';
import type { FlowState } from './flowSession.js';
import type { StepResponse } from './stepResponse.js';

const TERMINAL_EXPORT_AUTH_RESPONSE_KEY_PREFIXES = ['oauth:', 'email_pw:'] as const;

/** Response map keys produced by OAuth / email-password layers (see `oauthLoginResponseKey`, `emailPasswordAuthResponseKey`). */
export const isAuthTerminalExportResponseKey = (key: string): boolean =>
  TERMINAL_EXPORT_AUTH_RESPONSE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

/** Copy of `responses` without OAuth / email-password auth entries (hosts use auth provider callbacks for those). */
export const stripAuthResponsesForTerminalExport = (
  responses: Record<string, StepResponse>,
): Record<string, StepResponse> => {
  const out: Record<string, StepResponse> = {};
  for (const [k, v] of Object.entries(responses)) {
    if (isAuthTerminalExportResponseKey(k)) continue;
    out[k] = v;
  }
  return out;
};

/** Values stored under each field key in {@link buildCompletionResponses} / terminal `answers`. */
export type FlowTerminalAnswerEntryValue =
  | string
  | string[]
  | number
  | { value: string; classification: string }
  | { success: boolean; customerExternalId?: string; provider: OAuthLoginProvider }
  | { success: boolean; mode: EmailPasswordAuthMode; email: string }
  | { bypassed: true; via: 'skip' | 'go_to_screen' }
  | { outcome: NormalizedSurfaceOutcome }
  | boolean
  | 'end_flow'
  | 'skip'
  | 'carousel'
  | { goToScreen: string };

/**
 * Maps one stored {@link StepResponse} to a JSON-safe completion value.
 * `screen_commit` should not appear in `FlowState.responses` (it unwraps in `submitResponse`).
 */
export const stepResponseToCompletionValue = (
  r: StepResponse,
): FlowTerminalAnswerEntryValue | undefined => {
  if (r.kind === 'screen_commit') return undefined;
  switch (r.kind) {
    case 'choice':
      return r.choiceId;
    case 'multiChoice':
      return r.choiceIds;
    case 'text':
      return { value: r.value, classification: r.classification };
    case 'scale':
      return r.value;
    case 'checkbox':
      return r.value;
    case 'cta':
      return r.action;
    case 'carousel':
      return 'carousel';
    case 'end_flow':
      return 'end_flow';
    case 'skip':
      return 'skip';
    case 'permission_outcome':
      return r.outcome;
    case 'app_review_outcome':
      return r.outcome;
    case 'oauth_login_resolve':
      return {
        success: r.success,
        customerExternalId: r.customerExternalId,
        provider: r.provider,
      };
    case 'email_password_auth_resolve':
      return {
        success: r.success,
        mode: r.mode,
        email: r.email,
      };
    case 'bypass_input':
      return { bypassed: true, via: r.via };
    case 'external_surface_outcome':
      return { outcome: r.outcome };
    case 'go_to_screen':
      return { goToScreen: r.screenId };
    case 'go_back':
      return undefined;
    default: {
      const _never: never = r;
      return _never;
    }
  }
};

export const buildCompletionResponses = (
  state: FlowState,
): Record<string, FlowTerminalAnswerEntryValue> => {
  const out: Record<string, FlowTerminalAnswerEntryValue> = {};
  for (const [key, r] of Object.entries(state.responses)) {
    const v = stepResponseToCompletionValue(r);
    if (v !== undefined) out[key] = v;
  }
  return out;
};

/** Normalized `answers` map in {@link FlowTerminalSnapshot} (from {@link buildCompletionResponses}). */
export type FlowTerminalAnswerMap = ReturnType<typeof buildCompletionResponses>;

export const abandonFlow = (
  state: FlowState,
  now: string = new Date().toISOString(),
): FlowState => ({
  ...state,
  status: 'abandoned',
  completedAt: now,
});
