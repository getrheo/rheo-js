import {
  emailPasswordAuthResponseKey,
  oauthLoginResponseKey,
} from '@getrheo/contracts/layers';





import { EXTERNAL_SURFACE_NO_NEXT } from '@getrheo/contracts/decisions';
import { findManualSubmitInputLayer } from '../layers.js';
import type { DecisionEvaluationTelemetry } from '../decisionEval.js';
import type { FlowState, FlowSessionContext, SubmitResponseOptions } from './flowSession.js';
import { findExternalSurface, findScreen } from './flowSession.js';
import {
  applyGraphLanding,
  resolveNextScreenId,
  resolveThroughGraph,
  responseKeyFor,
} from './graphLanding.js';
import type { StepResponse } from './stepResponse.js';
import { externalSurfaceResponseKey } from './stepResponse.js';

export type { DecisionEvaluationTelemetry } from '../decisionEval.js';

export type StartFlowOptions = {
  now?: string;
  onDecisionEvaluated?: (payload: DecisionEvaluationTelemetry) => void;
};

export const startFlow = (
  state: FlowState,
  second?: string | StartFlowOptions,
): FlowState => {
  const opts: StartFlowOptions = typeof second === 'string' ? { now: second } : second ?? {};
  const now = opts.now ?? new Date().toISOString();
  const entry = state.manifest.entryScreenId;
  if (entry == null) {
    return {
      ...state,
      status: 'idle',
      currentScreenId: null,
      pendingExternalSurface: null,
      history: [],
      startedAt: null,
      completedAt: null,
    };
  }

  // Walk decisions starting at entry so a flow can begin on a decision or surface.
  // With no responses yet, decision branches that depend on responses fall through
  // to their `false` branch — same behaviour as evaluating a missing field today.
  const landing = resolveThroughGraph(
    state.manifest,
    entry,
    {},
    {
      ...state.session,
    },
    opts.onDecisionEvaluated,
  );

  if (landing.kind === 'end') {
    return {
      ...state,
      status: 'completed',
      currentScreenId: null,
      pendingExternalSurface: null,
      history: [entry],
      startedAt: now,
      completedAt: now,
    };
  }
  if (landing.kind === 'surface') {
    return {
      ...state,
      status: 'running',
      currentScreenId: null,
      pendingExternalSurface: { nodeId: landing.nodeId },
      history: [landing.nodeId],
      startedAt: now,
    };
  }
  return {
    ...state,
    status: 'running',
    currentScreenId: landing.screenId,
    pendingExternalSurface: null,
    history: [landing.screenId],
    startedAt: now,
  };
};

export const submitResponse = (
  state: FlowState,
  response: StepResponse,
  third?: string | SubmitResponseOptions,
): FlowState => {
  const opts: SubmitResponseOptions = typeof third === 'string' ? { now: third } : third ?? {};
  const now = opts.now ?? new Date().toISOString();

  if (state.status !== 'running') return state;

  // Surface outcomes are the only response kind valid while pending on a surface.
  if (response.kind === 'external_surface_outcome') {
    const pending = state.pendingExternalSurface;
    if (!pending || pending.nodeId !== response.nodeId) return state;
    const surface = findExternalSurface(state.manifest, pending.nodeId);
    if (!surface) return state;

    const nextSession: FlowSessionContext = response.sdkKeyPatch
      ? {
          ...state.session,
          sdkAttributes: { ...state.session.sdkAttributes, ...response.sdkKeyPatch },
        }
      : state.session;

    const target = surface.outcomes[response.outcome] ?? surface.fallback;
    const nextResponses = {
      ...state.responses,
      [externalSurfaceResponseKey(pending.nodeId)]: response,
    };
    if (target === EXTERNAL_SURFACE_NO_NEXT) {
      return {
        ...state,
        session: nextSession,
        responses: nextResponses,
        pendingExternalSurface: null,
        currentScreenId: null,
        status: 'completed',
        completedAt: now,
      };
    }
    const landing = resolveThroughGraph(
      state.manifest,
      target,
      nextResponses,
      nextSession,
      opts.onDecisionEvaluated,
    );
    return applyGraphLanding(
      { ...state, session: nextSession },
      landing,
      nextResponses,
      now,
    );
  }

  if (!state.currentScreenId) return state;
  const screen = findScreen(state.manifest, state.currentScreenId);
  if (!screen) return state;

  if (response.kind === 'screen_commit') {
    const mergedResponses = { ...state.responses };
    for (const [fk, value] of Object.entries(response.checkboxValues)) {
      mergedResponses[fk] = { kind: 'checkbox', fieldKey: fk, value };
    }
    if (response.capturedDraft) {
      mergedResponses[responseKeyFor(screen, response.capturedDraft)] = response.capturedDraft;
    }
    return submitResponse({ ...state, responses: mergedResponses }, response.primary, opts);
  }

  if (response.kind === 'go_back') {
    const fallback = response.fallbackScreenId;
    if (state.history.length > 1) {
      const nextHistory = state.history.slice(0, -1);
      const prevId = nextHistory[nextHistory.length - 1];
      if (!prevId) return state;
      return {
        ...state,
        currentScreenId: prevId,
        history: nextHistory,
      };
    }
    if (fallback && findScreen(state.manifest, fallback)) {
      return {
        ...state,
        currentScreenId: fallback,
        history: [fallback],
      };
    }
    return state;
  }

  if (response.kind === 'oauth_login_resolve' && !response.success) {
    const key = oauthLoginResponseKey(response.layerId);
    return {
      ...state,
      responses: { ...state.responses, [key]: response },
    };
  }

  if (response.kind === 'email_password_auth_resolve' && !response.success) {
    const key = emailPasswordAuthResponseKey(response.layerId);
    return {
      ...state,
      responses: { ...state.responses, [key]: response },
    };
  }

  if (response.kind === 'end_flow') {
    const nextResponses = { ...state.responses };
    if (response.consumedDraft) {
      nextResponses[responseKeyFor(screen, response.consumedDraft)] = response.consumedDraft;
    }
    nextResponses[responseKeyFor(screen, { kind: 'end_flow' })] = { kind: 'end_flow' };
    return {
      ...state,
      responses: nextResponses,
      currentScreenId: null,
      status: 'completed',
      completedAt: now,
    };
  }

  if (response.kind === 'skip') {
    const nextResponses = { ...state.responses };
    const manualInput = findManualSubmitInputLayer(screen);
    if (manualInput) {
      nextResponses[manualInput.fieldKey] = { kind: 'bypass_input', via: 'skip' };
    }
    nextResponses[responseKeyFor(screen, { kind: 'skip' })] = { kind: 'skip' };
    const nextRaw = resolveNextScreenId(screen, { kind: 'skip' });
    const landing = resolveThroughGraph(
      state.manifest,
      nextRaw,
      nextResponses,
      state.session,
      opts.onDecisionEvaluated,
    );
    return applyGraphLanding(state, landing, nextResponses, now);
  }

  const key = responseKeyFor(screen, response);
  const nextResponses = { ...state.responses, [key]: response };
  if (response.kind === 'go_to_screen') {
    const manualInput = findManualSubmitInputLayer(screen);
    if (manualInput) {
      nextResponses[manualInput.fieldKey] = { kind: 'bypass_input', via: 'go_to_screen' };
    }
  }
  const nextRaw = resolveNextScreenId(screen, response);

  const landing = resolveThroughGraph(
    state.manifest,
    nextRaw,
    nextResponses,
    state.session,
    opts.onDecisionEvaluated,
  );
  return applyGraphLanding(state, landing, nextResponses, now);
};
