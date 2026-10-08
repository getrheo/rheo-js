import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlowManifest } from '@getrheo/contracts';
import {
  buildCompletionResponses,
  findScreen,
  initFlowState,
  startFlow,
  submitResponse,
  type DecisionEvaluationTelemetry,
  type FlowState,
  type StepResponse,
} from '@getrheo/flow-runtime/stateMachine';
import {
  PhoneFrame,
  previewPhoneSafeAreaInsetBottomPx,
  previewPhoneSafeAreaInsetTopPx,
  type PhoneSystemUi,
} from './PhoneFrame';
import { LayerRenderer } from './LayerRenderer';
import type { ButtonAction, PermissionOutcome } from '@getrheo/contracts/layers';

export type FlowSimulatorProps = {
  manifest: FlowManifest;
  mediaMap?: Record<string, string>;
  locale?: string;
  theme?: 'light' | 'dark';
  /** Device frame width in CSS points. Forwarded to `PhoneFrame`. */
  width?: number;
  /** Device frame height in CSS points. Forwarded to `PhoneFrame`. */
  height?: number;
  /** Status bar + nav affordances: iOS vs Android. Defaults to `ios`. */
  systemUi?: PhoneSystemUi;
  /** Desktop presets hide the phone status bar and home affordance. */
  showSystemChrome?: boolean;
  onComplete?: (responses: ReturnType<typeof buildCompletionResponses>) => void;
  /** Stub SDK custom properties when exercising `{{ custom.* }}` in copy. */
  mockCustomProperties?: Record<string, string>;
  /**
   * Stub session SDK attributes for decision preview (e.g. `attribution.isOrganic`,
   * `acquisition.campaign`). Merged into the flow session at init only.
   */
  mockSdkAttributes?: Record<string, unknown>;
  onDecisionEvaluated?: (payload: DecisionEvaluationTelemetry) => void;
  /**
   * Branch used when tapping a button whose action is `request_os_permission`.
   * Defaults to `denied`, matching SDK behavior without a host resolver.
   */
  mockOsPermissionOutcome?: PermissionOutcome;
  /** Rheo dashboard: static media previews, no in-browser video audio. */
  authoringPreview?: boolean;
  /** Fired when the active preview screen changes (null when the flow has completed). */
  onScreenChange?: (screenId: string | null) => void;
  /** When set to a screen id, navigates the preview to that screen (builder jump-to-screen). */
  jumpToScreenId?: string | null;
};

const jumpPreviewToScreen = (state: FlowState, screenId: string): FlowState => {
  if (!findScreen(state.manifest, screenId)) return state;
  const base =
    state.status === 'running' && state.currentScreenId
      ? state
      : startFlow(
          initFlowState(state.manifest, {
            locale: state.session.locale,
            platform: state.session.platform,
            sdkAttributes: { ...state.session.sdkAttributes },
          }),
        );
  if (base.status !== 'running' || !base.currentScreenId) return base;
  if (base.currentScreenId === screenId) return base;
  return submitResponse(base, { kind: 'go_to_screen', screenId });
};

export const FlowSimulator = ({
  manifest,
  mediaMap,
  locale = 'en',
  theme = 'dark',
  width,
  height,
  systemUi = 'ios',
  showSystemChrome = true,
  onComplete,
  mockCustomProperties,
  mockSdkAttributes,
  onDecisionEvaluated,
  mockOsPermissionOutcome = 'denied',
  authoringPreview = true,
  onScreenChange,
  jumpToScreenId,
}: FlowSimulatorProps) => {
  const frameWidth = width ?? 280;

  const [flow, setFlow] = useState<FlowState>(() =>
    startFlow(
      initFlowState(manifest, {
        locale,
        platform: 'web',
        sdkAttributes: { ...(mockSdkAttributes ?? {}) },
      }),
    ),
  );

  const handleRespond = useCallback(
    (response: StepResponse) => {
      setFlow((s) => {
        const nextFlow = submitResponse(s, response, {
          onDecisionEvaluated,
        });
        if (nextFlow.status === 'completed') {
          onComplete?.(buildCompletionResponses(nextFlow));
        }
        return nextFlow;
      });
    },
    [onComplete, onDecisionEvaluated],
  );

  const handleSimulatorButtonAction = useCallback(
    (action: ButtonAction, meta?: { layerId?: string }) => {
      if (!meta?.layerId) return;
      if (action.kind === 'request_os_permission') {
        handleRespond({
          kind: 'permission_outcome',
          layerId: meta.layerId,
          permissionKey: action.permissionKey,
          outcome: mockOsPermissionOutcome,
        });
        return;
      }
      if (action.kind === 'request_app_review') {
        handleRespond({
          kind: 'screen_commit',
          primary: { kind: 'app_review_outcome', layerId: meta.layerId, outcome: 'not_shown' },
          checkboxValues: {},
        });
      }
    },
    [handleRespond, mockOsPermissionOutcome],
  );

  const currentScreen = useMemo(
    () => (flow.currentScreenId ? findScreen(manifest, flow.currentScreenId) : undefined),
    [manifest, flow.currentScreenId],
  );

  useEffect(() => {
    onScreenChange?.(flow.status === 'completed' ? null : flow.currentScreenId);
  }, [flow.currentScreenId, flow.status, onScreenChange]);

  useEffect(() => {
    if (!jumpToScreenId || jumpToScreenId === flow.currentScreenId) return;
    setFlow((s) => jumpPreviewToScreen(s, jumpToScreenId));
  }, [jumpToScreenId, flow.currentScreenId]);

  if (flow.status === 'completed') {
    const w = frameWidth;
    const top = previewPhoneSafeAreaInsetTopPx(w);
    const bottom = previewPhoneSafeAreaInsetBottomPx(w, systemUi);
    return (
      <PhoneFrame theme={theme} width={width} height={height} systemUi={systemUi} showSystemChrome={showSystemChrome}>
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxSizing: 'border-box',
            textAlign: 'center',
            paddingTop: `max(env(safe-area-inset-top, 0px), ${top}px)`,
            paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${bottom}px)`,
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>Flow complete</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            {Object.keys(flow.responses).length} response
            {Object.keys(flow.responses).length === 1 ? '' : 's'} captured
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (!currentScreen) return null;

  return (
    <PhoneFrame theme={theme} width={width} height={height} systemUi={systemUi} showSystemChrome={showSystemChrome}>
      <LayerRenderer
        manifest={manifest}
        screen={currentScreen}
        locale={locale}
        mediaMap={mediaMap}
        mode="interactive"
        onRespond={handleRespond}
        onAction={handleSimulatorButtonAction}
        theme={theme}
        motionResetKey={currentScreen.id}
        previewWidthPx={frameWidth}
        previewSafeAreaSystemUi={systemUi}
        simulateSafeArea={false}
        interpolationContext={{
          responses: flow.responses,
          customProperties: mockCustomProperties,
          canGoBack: flow.history.length > 1,
        }}
        conditionalEval={{
          platform: flow.session.platform,
          sdkAttributes: flow.session.sdkAttributes,
          responses: flow.responses,
        }}
        authoringPreview={authoringPreview}
      />
    </PhoneFrame>
  );
};
