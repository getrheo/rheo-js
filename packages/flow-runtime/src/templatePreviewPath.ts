import type { NormalizedSurfaceOutcome } from '@getrheo/contracts/externalSurfaces';
import type { FlowManifest } from '@getrheo/contracts/manifest';
import type {
  InputLayer,
  MultipleChoiceLayer,
  SingleChoiceLayer,
} from '@getrheo/contracts/layers';
import type { Screen } from '@getrheo/contracts/screens';

import { findInputLayer, walkScreen } from './layers.js';
import { defaultWheelPickerValue } from './wheelPickerItems.js';
import { startFlow, submitResponse } from './stateMachine/flowAdvance.js';
import { findExternalSurface, findScreen, initFlowState } from './stateMachine/flowSession.js';
import type { StepResponse } from './stateMachine/stepResponse.js';

const PREVIEW_MAX_STEPS = 500;

const previewSampleText = (fieldKey: string): string => {
  const samples: Record<string, string> = {
    first_name: 'Alex',
    last_name: 'Smith',
    email: 'alex@example.com',
    name: 'Alex',
  };
  const normalized = fieldKey.trim().toLowerCase();
  if (samples[normalized]) return samples[normalized];
  return fieldKey
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const firstBranchChoiceId = (
  input: SingleChoiceLayer | MultipleChoiceLayer,
): string | null => {
  if (input.branching.enabled && input.branching.conditions.length > 0) {
    return input.branching.conditions[0]?.choiceId ?? null;
  }
  return input.optionBindings[0]?.optionId ?? null;
};

const previewResponseForInput = (input: InputLayer): StepResponse | null => {
  switch (input.kind) {
    case 'single_choice': {
      const choiceId = firstBranchChoiceId(input);
      return choiceId ? { kind: 'choice', choiceId } : null;
    }
    case 'multiple_choice': {
      const choiceId = firstBranchChoiceId(input);
      return choiceId ? { kind: 'multiChoice', choiceIds: [choiceId] } : null;
    }
    case 'text_input':
      return {
        kind: 'text',
        value: previewSampleText(input.fieldKey),
        classification: input.classification,
      };
    case 'scale_input': {
      const mid = Math.round((input.min + input.max) / 2);
      return { kind: 'scale', value: mid };
    }
    case 'wheel_picker': {
      const value = defaultWheelPickerValue(input);
      return value ? { kind: 'wheel', value } : null;
    }
    default:
      return null;
  }
};

const findAuthPreviewLayers = (
  screen: Screen,
): { oauth: OAuthPreviewLayer | null; email: EmailAuthPreviewLayer | null } => {
  let oauth: OAuthPreviewLayer | null = null;
  let email: EmailAuthPreviewLayer | null = null;
  walkScreen(screen, (layer) => {
    if (layer.kind === 'oauth_login' && !oauth) {
      const presetChild = layer.children.find(
        (child): child is Extract<typeof child, { variant: 'preset' }> =>
          child.kind === 'oauth_provider' && child.variant === 'preset',
      );
      oauth = {
        layerId: layer.id,
        provider: {
          type: 'preset',
          provider: presetChild?.provider === 'google' ? 'google' : 'apple',
        },
      };
    }
    if (layer.kind === 'email_password_auth' && !email) {
      email = {
        layerId: layer.id,
        fieldKey: layer.fieldKey,
        mode: layer.mode,
      };
    }
  });
  return { oauth, email };
};

type OAuthPreviewLayer = {
  layerId: string;
  provider: { type: 'preset'; provider: 'apple' | 'google' };
};

type EmailAuthPreviewLayer = {
  layerId: string;
  fieldKey: string;
  mode: 'sign_in' | 'sign_up';
};

/** Auto-advance payload for template gallery / builder static previews. */
export const buildPreviewAdvanceResponse = (screen: Screen): StepResponse => {
  const input = findInputLayer(screen);
  if (input) {
    const response = previewResponseForInput(input);
    if (response) return response;
  }

  const { oauth, email } = findAuthPreviewLayers(screen);

  if (oauth) {
    return {
      kind: 'oauth_login_resolve',
      layerId: oauth.layerId,
      provider: oauth.provider,
      success: true,
      customerExternalId: 'preview-user',
    };
  }

  if (email) {
    return {
      kind: 'email_password_auth_resolve',
      layerId: email.layerId,
      fieldKey: email.fieldKey,
      mode: email.mode,
      email: 'preview@example.com',
      password: 'preview-password',
      success: true,
    };
  }

  return { kind: 'cta', action: 'primary' };
};

export type TemplatePreviewStep = {
  screen: Screen;
  /** Responses accumulated before this screen — used to interpolate copy. */
  interpolationResponses: Record<string, StepResponse>;
};

export type TemplatePreviewPath = {
  steps: TemplatePreviewStep[];
  responses: Record<string, StepResponse>;
};

/**
 * Walk one deterministic path through a manifest for static previews: first choice
 * branch at each fork, decision nodes evaluated against stub answers, external
 * surfaces auto-resolved with their first outcome.
 */
export const buildTemplatePreviewPath = (
  manifest: FlowManifest,
  options?: { locale?: string; maxSteps?: number },
): TemplatePreviewPath => {
  const maxSteps = options?.maxSteps ?? PREVIEW_MAX_STEPS;
  const locale = options?.locale ?? manifest.defaultLocale ?? 'en';

  let state = initFlowState(manifest, { locale, platform: 'web' });
  state = startFlow(state);

  const steps: TemplatePreviewStep[] = [];
  let iterations = 0;

  while (state.status === 'running' && iterations < maxSteps) {
    iterations += 1;

    if (state.pendingExternalSurface) {
      const surface = findExternalSurface(manifest, state.pendingExternalSurface.nodeId);
      if (!surface) break;
      const outcome = Object.keys(surface.outcomes)[0] as NormalizedSurfaceOutcome | undefined;
      if (!outcome) break;
      state = submitResponse(state, {
        kind: 'external_surface_outcome',
        nodeId: surface.id,
        outcome,
      });
      continue;
    }

    const screenId = state.currentScreenId;
    if (!screenId) break;
    const screen = findScreen(manifest, screenId);
    if (!screen) break;

    steps.push({
      screen,
      interpolationResponses: { ...state.responses },
    });
    state = submitResponse(state, buildPreviewAdvanceResponse(screen));
  }

  return { steps, responses: { ...state.responses } };
};
