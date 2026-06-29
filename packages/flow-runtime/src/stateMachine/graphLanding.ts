import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';
import {
  OS_PERMISSION_OUTCOME_CONTINUE,
  OS_PERMISSION_OUTCOME_END,
  appReviewCaptureFieldKey,
  emailPasswordAuthResponseKey,
  oauthLoginResponseKey,
  permissionCaptureFieldKey,
} from '@getrheo/contracts/layers';





import { findInputLayer, findLayerById } from '../layers.js';
import { evaluateDecisionNode, findDecisionNode } from '../decisionEval.js';
import type { DecisionEvaluationTelemetry } from '../decisionEval.js';
import type { FlowSessionContext, FlowState } from './flowSession.js';
import { findExternalSurface } from './flowSession.js';
import type { StepResponse } from './stepResponse.js';

/**
 * Result of walking the manifest from a cursor id past decision nodes:
 * either we landed on a screen (renderable), an external surface (await
 * outcome), or fell off the graph (flow complete).
 */
export type GraphLanding =
  | { kind: 'screen'; screenId: string }
  | { kind: 'surface'; nodeId: string }
  | { kind: 'end' };

const resolveOsPermissionDestination = (
  screen: Screen,
  response: Extract<StepResponse, { kind: 'permission_outcome' }>,
): string | null => {
  const layer = findLayerById(screen, response.layerId);
  if (!layer || layer.kind !== 'button' || layer.action.kind !== 'request_os_permission')
    return null;
  if (layer.action.permissionKey !== response.permissionKey) return null;
  const target = layer.action.outcomes[response.outcome];
  if (target === OS_PERMISSION_OUTCOME_END) return null;
  if (target === OS_PERMISSION_OUTCOME_CONTINUE) return screen.next.default ?? null;
  return target;
};

export const resolveNextScreenId = (screen: Screen, response: StepResponse): string | null => {
  if (response.kind === 'screen_commit') {
    return resolveNextScreenId(screen, response.primary);
  }
  if (response.kind === 'go_to_screen') return response.screenId;

  if (response.kind === 'permission_outcome') {
    const nextId = resolveOsPermissionDestination(screen, response);
    return nextId ?? screen.next.default ?? null;
  }

  if (response.kind === 'app_review_outcome') {
    const layer = findLayerById(screen, response.layerId);
    if (!layer || layer.kind !== 'button' || layer.action.kind !== 'request_app_review') {
      return screen.next.default ?? null;
    }
    return screen.next.default ?? null;
  }

  if (response.kind === 'oauth_login_resolve') {
    return screen.next.default ?? null;
  }

  if (response.kind === 'email_password_auth_resolve') {
    return screen.next.default ?? null;
  }

  const input = findInputLayer(screen);
  if (
    input &&
    (input.kind === 'single_choice' || input.kind === 'multiple_choice') &&
    input.branching.enabled
  ) {
    if (response.kind === 'choice') {
      const m = input.branching.conditions.find((c) => c.choiceId === response.choiceId);
      if (m) return m.goTo;
    } else if (response.kind === 'multiChoice') {
      const m = input.branching.conditions.find((c) => response.choiceIds.includes(c.choiceId));
      if (m) return m.goTo;
    }
  }
  return screen.next.default ?? null;
};

export const resolveThroughGraph = (
  manifest: FlowManifest,
  cursor: string | null,
  responses: Record<string, StepResponse>,
  session: FlowSessionContext,
  onDecisionEvaluated?: (payload: DecisionEvaluationTelemetry) => void,
): GraphLanding => {
  let cur = cursor;
  const seen = new Set<string>();
  const evalCtx = {
    locale: session.locale,
    platform: session.platform,
    sdkAttributes: session.sdkAttributes,
    responses: responses as Record<string, unknown>,
  };
  while (cur) {
    const dn = findDecisionNode(manifest, cur);
    if (!dn) break;
    if (seen.has(cur)) {
      cur = null;
      break;
    }
    seen.add(cur);
    const evalResult = evaluateDecisionNode(dn, evalCtx);
    onDecisionEvaluated?.({
      decisionNodeId: dn.id,
      matchedCaseId: evalResult.matchedCaseId,
      clauseDigest: evalResult.clauseDigest,
    });
    cur = evalResult.next;
    if (cur == null) break;
  }
  if (cur == null) return { kind: 'end' };
  if (findExternalSurface(manifest, cur)) return { kind: 'surface', nodeId: cur };
  return { kind: 'screen', screenId: cur };
};

/** Determine the storage key for a response on a given screen. Input layers
 * use their `fieldKey`; others use the screen id (for analytics breadcrumbs). */
export const responseKeyFor = (screen: Screen, response: StepResponse): string => {
  if (
    response.kind === 'text' ||
    response.kind === 'choice' ||
    response.kind === 'multiChoice' ||
    response.kind === 'scale' ||
    response.kind === 'checkbox'
  ) {
    const input = findInputLayer(screen);
    if (input) return input.fieldKey;
  }
  if (response.kind === 'permission_outcome') return permissionCaptureFieldKey(response.permissionKey);
  if (response.kind === 'app_review_outcome') return appReviewCaptureFieldKey(response.layerId);
  if (response.kind === 'checkbox') return response.fieldKey;
  if (response.kind === 'oauth_login_resolve') return oauthLoginResponseKey(response.layerId);
  if (response.kind === 'email_password_auth_resolve') {
    return emailPasswordAuthResponseKey(response.layerId);
  }
  return screen.id;
};

/** Apply a surface landing to a state update (history + pending flag). */
export const applyGraphLanding = (
  base: FlowState,
  landing: GraphLanding,
  nextResponses: Record<string, StepResponse>,
  now: string,
): FlowState => {
  if (landing.kind === 'end') {
    return {
      ...base,
      responses: nextResponses,
      currentScreenId: null,
      pendingExternalSurface: null,
      status: 'completed',
      completedAt: now,
    };
  }
  if (landing.kind === 'surface') {
    return {
      ...base,
      responses: nextResponses,
      currentScreenId: null,
      pendingExternalSurface: { nodeId: landing.nodeId },
      history: [...base.history, landing.nodeId],
    };
  }
  return {
    ...base,
    responses: nextResponses,
    currentScreenId: landing.screenId,
    pendingExternalSurface: null,
    history: [...base.history, landing.screenId],
  };
};
