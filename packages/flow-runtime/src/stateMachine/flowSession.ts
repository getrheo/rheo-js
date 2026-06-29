import type { FlowManifest } from '@getrheo/contracts/manifest';
import type { Screen } from '@getrheo/contracts/screens';




import type {
  ExternalSurfaceNode,
} from '@getrheo/contracts/externalSurfaces';

import type { DecisionEvaluationTelemetry } from '../decisionEval.js';
import type { StepResponse } from './stepResponse.js';

export type FlowSessionContext = {
  locale: string;
  platform: string;
  sdkAttributes: Record<string, unknown>;
};

export type FlowState = {
  manifest: FlowManifest;
  currentScreenId: string | null;
  /**
   * Non-null while the flow is awaiting an outcome from an external surface
   * (e.g. RevenueCat paywall). `currentScreenId` is null in this state so the
   * native renderer doesn't try to paint a screen.
   */
  pendingExternalSurface: { nodeId: string } | null;
  history: string[];
  /** Responses keyed by `fieldKey` (or screen id for non-input responses like CTA/skip). */
  responses: Record<string, StepResponse>;
  session: FlowSessionContext;
  status: 'idle' | 'running' | 'completed' | 'abandoned';
  startedAt: string | null;
  completedAt: string | null;
};

export type SubmitResponseOptions = {
  now?: string;
  onDecisionEvaluated?: (payload: DecisionEvaluationTelemetry) => void;
};


export const findScreen = (manifest: FlowManifest, screenId: string): Screen | undefined =>
  manifest.screens.find((s) => s.id === screenId) as Screen | undefined;

export const findExternalSurface = (
  manifest: FlowManifest,
  nodeId: string,
): ExternalSurfaceNode | undefined =>
  // Older / hand-constructed manifests may omit `externalSurfaceNodes` entirely;
  // treat that as "no surfaces" rather than crashing the state machine.
  (manifest.externalSurfaceNodes ?? []).find((n) => n.id === nodeId);

export const initFlowState = (
  manifest: FlowManifest,
  sessionPartial?: Partial<FlowSessionContext>,
): FlowState => ({
  manifest,
  currentScreenId: null,
  pendingExternalSurface: null,
  history: [],
  responses: {},
  session: {
    locale: sessionPartial?.locale ?? manifest.defaultLocale,
    platform: sessionPartial?.platform ?? 'unknown',
    sdkAttributes: sessionPartial?.sdkAttributes ?? {},
  },
  status: 'idle',
  startedAt: null,
  completedAt: null,
});
