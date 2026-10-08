import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Branding,
  ButtonAction,
  ExternalSurfaceNode,
  FlowManifest,
  NormalizedSurfaceOutcome,
  Screen,
} from '@getrheo/contracts';
import {
  findExternalSurface,
  findScreen,
  initFlowState,
  startFlow,
  submitResponse,
  type FlowState,
  type StepResponse,
} from '@getrheo/flow-runtime/stateMachine';
import type { InterpolationContext } from '@getrheo/flow-runtime/interpolateTemplate';
import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import { useRheoContext } from './client.js';
import {
  cancelStripeCheckoutAttempt,
  readStripeCheckoutAttemptStatus,
  registerStripeCheckoutAttempt,
} from './checkoutAttempt.js';
import { getResolvedAppUserId } from './events.js';
import { getSdkLogger } from './logging.js';
import { registerPush, requestWebNotificationOutcome, unregisterPush } from './webPush.js';
import { useChannel } from './useChannel.js';
import {
  clearStripeResumeSnapshot,
  loadStripeResumeSnapshot,
  outcomeForStripeReturn,
  presentStripePaymentLink,
  readStripeReturnFromSearch,
  STRIPE_CHECKOUT_SESSION_QUERY,
  STRIPE_RESUME_QUERY_STATUS,
  STRIPE_RESUME_QUERY_TOKEN,
  type StripeCheckoutResumeSnapshot,
} from './stripe.js';

export type WebFlowTerminalInfo = {
  flowId: string;
  versionId: string;
  experimentId: string | null;
  variantId: string | null;
};

export type UseFlowOptions = {
  channelId: string;
  onFlowCompleted?: (payload: WebFlowTerminalInfo) => void;
  onFlowAbandoned?: (payload: WebFlowTerminalInfo) => void;
};

export type UseFlowResult = {
  loading: boolean;
  error: Error | null;
  resolveFailed: boolean;
  retry: () => void;
  state: FlowState | null;
  screen: Screen | undefined;
  manifest: FlowManifest | null;
  pendingExternalSurface: ExternalSurfaceNode | null;
  flowId: string | null;
  versionId: string | null;
  variantId: string | null;
  branding: Branding | null;
  mediaMap: Record<string, string>;
  respond: (r: StepResponse) => void;
  reportExternalSurfaceOutcome: (
    nodeId: string,
    outcome: NormalizedSurfaceOutcome,
    opts?: { provider?: string; productId?: string; ensurePending?: boolean },
  ) => void;
  interpolationContext: InterpolationContext | undefined;
  relayNativeButtonAction: (action: ButtonAction, meta?: { layerId?: string }) => void;
  trackExternalLinkOpened: (meta: { layerId: string; href: string }) => void;
  abandon: () => void;
};

export const useFlow = (options: UseFlowOptions): UseFlowResult => {
  const { config, queue, attributionAttributes, attributionReady } = useRheoContext();
  const channelId = options.channelId.trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<FlowState | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [retryToken, setRetryToken] = useState(0);
  const stripeHandledRef = useRef(false);
  const presentingSurfaceRef = useRef<string | null>(null);
  const completedSentRef = useRef(false);
  const resumeSnapshotRef = useRef<StripeCheckoutResumeSnapshot | null | undefined>(undefined);
  const onCompletedRef = useRef(options.onFlowCompleted);
  const onAbandonedRef = useRef(options.onFlowAbandoned);
  onCompletedRef.current = options.onFlowCompleted;
  onAbandonedRef.current = options.onFlowAbandoned;

  if (resumeSnapshotRef.current === undefined) {
    if (typeof window === 'undefined') {
      resumeSnapshotRef.current = null;
    } else {
      const snap = loadStripeResumeSnapshot();
      resumeSnapshotRef.current = snap && snap.channelId === channelId ? snap : null;
    }
  }

  const mergedSdkAttributes = useMemo(
    () => ({
      ...(config.sdkAttributes ?? {}),
      ...attributionAttributes,
    }),
    [config.sdkAttributes, attributionAttributes],
  );

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);
  const channelState = useChannel({
    channelId,
    enabled: attributionReady && resumeSnapshotRef.current == null,
    attempt: retryToken,
  });

  useEffect(() => {
    if (resumeSnapshotRef.current) return;
    if (!attributionReady) return;
    if (channelState.loading) {
      setLoading(true);
      return;
    }
    if (channelState.error) {
      setError(channelState.error);
      setState(null);
      setLoading(false);
      return;
    }
    const resolved = channelState.channel;
    if (!resolved || resolved.kind !== 'flow') {
      setError(new Error('useFlow requires a flow channel'));
      setState(null);
      setLoading(false);
      return;
    }
    setError(null);
    setFlowId(resolved.flowId);
    setVersionId(resolved.versionId);
    setExperimentId(resolved.experimentId);
    setVariantId(resolved.variantId);
    setBranding(resolved.branding ?? null);
    setMediaMap(resolved.mediaMap ?? {});
    const next = startFlow(
      initFlowState(resolved.manifest, {
        locale: config.locale,
        platform: config.platform ?? 'web',
        sdkAttributes: { ...mergedSdkAttributes },
      }),
    );
    setState(next);
    setLoading(false);
    queue.enqueue(
      {
        name: 'flow_started',
        flowId: resolved.flowId,
        versionId: resolved.versionId,
        experimentId: resolved.experimentId,
        variantId: resolved.variantId,
      },
      { channelId },
    );
  }, [
    attributionReady,
    channelId,
    channelState.channel,
    channelState.error,
    channelState.loading,
    config.locale,
    config.platform,
    mergedSdkAttributes,
    queue,
  ]);

  const reportExternalSurfaceOutcome = useCallback(
    (
      nodeId: string,
      outcome: NormalizedSurfaceOutcome,
      opts?: { provider?: string; productId?: string; ensurePending?: boolean },
    ) => {
      presentingSurfaceRef.current = null;
      setState((prev) => {
        if (!prev || !flowId || !versionId) return prev;
        const base =
          opts?.ensurePending && prev.pendingExternalSurface?.nodeId !== nodeId
            ? {
                ...prev,
                pendingExternalSurface: { nodeId },
                currentScreenId: null,
              }
            : prev;
        const provider = opts?.provider ?? 'unknown';
        queue.enqueue(
          {
            name: 'surface_outcome',
            flowId,
            versionId,
            experimentId,
            variantId,
            stepId: nodeId,
            properties: { outcome, provider },
          },
          { channelId },
        );
        return submitResponse(base, {
          kind: 'external_surface_outcome',
          nodeId,
          outcome,
        });
      });
    },
    [channelId, experimentId, flowId, queue, variantId, versionId],
  );

  // Restore the in-progress session after a Payment Link redirect. Does not resolve again.
  useEffect(() => {
    const snapshot = resumeSnapshotRef.current;
    if (!snapshot || stripeHandledRef.current) return;
    stripeHandledRef.current = true;
    let cancelled = false;
    void (async () => {
      const ret = typeof window === 'undefined' ? null : readStripeReturnFromSearch(window.location.search);
      if (ret?.token && ret.token !== snapshot.attemptId) {
        getSdkLogger().warn('[rheo] Stripe resume token mismatch');
        if (!cancelled) setLoading(false);
        return;
      }
      let outcome: NormalizedSurfaceOutcome = 'purchase_cancelled';
      if (ret?.status === 'success' || ret?.status === 'cancel') {
        outcome = outcomeForStripeReturn(ret.status);
      } else {
        try {
          const status = await readStripeCheckoutAttemptStatus({
            apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
            publishableKey: config.publishableKey,
            channelId: snapshot.channelId,
            attemptId: snapshot.attemptId,
            fetcher: config.fetcher,
          });
          if (status === 'confirmed') {
            outcome = 'purchase_completed';
          } else {
            if (status === 'pending') {
              await cancelStripeCheckoutAttempt({
                apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
                publishableKey: config.publishableKey,
                channelId: snapshot.channelId,
                attemptId: snapshot.attemptId,
                fetcher: config.fetcher,
              });
            }
            outcome = 'purchase_cancelled';
          }
        } catch (err) {
          getSdkLogger().warn('[rheo] Stripe resume status check failed', err);
          outcome = 'failed';
        }
      }
      if (cancelled) return;
      clearStripeResumeSnapshot();
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete(STRIPE_RESUME_QUERY_STATUS);
        url.searchParams.delete(STRIPE_RESUME_QUERY_TOKEN);
        url.searchParams.delete(STRIPE_CHECKOUT_SESSION_QUERY);
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* ignore */
      }
      setFlowId(snapshot.flowId);
      setVersionId(snapshot.versionId);
      setExperimentId(snapshot.experimentId);
      setVariantId(snapshot.variantId);
      setBranding(snapshot.branding);
      setMediaMap(snapshot.mediaMap);
      queue.enqueue(
        {
          name: 'surface_outcome',
          flowId: snapshot.flowId,
          versionId: snapshot.versionId,
          experimentId: snapshot.experimentId,
          variantId: snapshot.variantId,
          stepId: snapshot.surfaceId,
          properties: { outcome, provider: 'stripe' },
        },
        { channelId: snapshot.channelId },
      );
      setState(() =>
        submitResponse(
          {
            ...snapshot.flowState,
            pendingExternalSurface: { nodeId: snapshot.surfaceId },
            currentScreenId: null,
          },
          { kind: 'external_surface_outcome', nodeId: snapshot.surfaceId, outcome },
        ),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [config.apiBaseUrl, config.fetcher, config.publishableKey, queue]);

  // Present pending external surfaces
  useEffect(() => {
    if (resumeSnapshotRef.current) return;
    if (!state?.pendingExternalSurface || !flowId || !versionId) return;
    const node = findExternalSurface(state.manifest, state.pendingExternalSurface.nodeId);
    if (!node) return;
    if (presentingSurfaceRef.current === node.id) return;
    presentingSurfaceRef.current = node.id;

    const finishFailed = () => {
      reportExternalSurfaceOutcome(node.id, 'failed', { provider: node.config.provider });
      presentingSurfaceRef.current = null;
    };

    if (node.config.provider === 'stripe') {
      const attribution = Object.fromEntries(
        Object.entries(attributionAttributes).filter(
          (entry): entry is [string, string | number | boolean] =>
            typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
        ),
      );
      void (async () => {
        try {
          const created = await registerStripeCheckoutAttempt({
            apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
            publishableKey: config.publishableKey,
            fetcher: config.fetcher,
            body: {
              channelId,
              flowId,
              versionId,
              experimentId,
              variantId,
              surfaceId: node.id,
              appUserId: getResolvedAppUserId(config),
              paymentLinkUrl: node.config.provider === 'stripe' ? (node.config.paymentLinkUrl ?? '') : '',
              attribution,
            },
          });
          if (presentingSurfaceRef.current !== node.id) {
            void cancelStripeCheckoutAttempt({
              apiBaseUrl: config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
              publishableKey: config.publishableKey,
              channelId,
              attemptId: created.attemptId,
              fetcher: config.fetcher,
            }).catch(() => undefined);
            return;
          }
          const result = presentStripePaymentLink({
            node,
            attemptId: created.attemptId,
            channelId,
            flowId,
            versionId,
            experimentId,
            variantId,
            flowState: state,
            branding,
            mediaMap,
            attribution,
          });
          if (result === 'redirecting') return;
          reportExternalSurfaceOutcome(node.id, result.outcome, { provider: 'stripe' });
          presentingSurfaceRef.current = null;
        } catch (err) {
          getSdkLogger().warn('[rheo] Stripe checkout attempt failed', err);
          finishFailed();
        }
      })();
      return;
    }

    if (
      node.config.provider === 'revenuecat' ||
      node.config.provider === 'superwall' ||
      node.config.provider === 'unspecified' ||
      node.config.provider === 'headless'
    ) {
      getSdkLogger().warn(
        `[rheo] provider "${node.config.provider}" is not supported in the web SDK; failing surface`,
        { surfaceId: node.id },
      );
      finishFailed();
      return;
    }
  }, [
    attributionAttributes,
    branding,
    channelId,
    config.apiBaseUrl,
    config.fetcher,
    config.publishableKey,
    config.userId,
    experimentId,
    flowId,
    mediaMap,
    reportExternalSurfaceOutcome,
    state,
    variantId,
    versionId,
  ]);

  const respond = useCallback((r: StepResponse) => {
    setState((prev) => (prev ? submitResponse(prev, r) : prev));
  }, []);

  const relayNativeButtonAction = useCallback(
    (action: ButtonAction, meta?: { layerId?: string }) => {
      if (action.kind === 'request_os_permission') {
        if (!meta?.layerId) return;
        const layerId = meta.layerId;
        if (action.permissionKey !== 'notifications') {
          getSdkLogger().warn('[rheo] request_os_permission is unavailable on web; treating as denied');
          respond({
            kind: 'permission_outcome',
            layerId,
            permissionKey: action.permissionKey,
            outcome: 'denied',
          });
          return;
        }
        void requestWebNotificationOutcome()
          .then((outcome) => {
            respond({
              kind: 'permission_outcome',
              layerId,
              permissionKey: action.permissionKey,
              outcome,
            });
            const sync = outcome === 'granted' ? registerPush(undefined, config) : unregisterPush(config);
            return sync.catch((error) => {
              getSdkLogger().warn('[rheo] push registration failed', error);
            });
          })
          .catch(() => {
            respond({
              kind: 'permission_outcome',
              layerId,
              permissionKey: action.permissionKey,
              outcome: 'denied',
            });
          });
        return;
      }
      if (action.kind === 'request_app_review') {
        if (!meta?.layerId) return;
        getSdkLogger().warn('[rheo] request_app_review is a no-op on web');
        respond({
          kind: 'screen_commit',
          primary: { kind: 'app_review_outcome', layerId: meta.layerId, outcome: 'not_shown' },
          checkboxValues: {},
        });
        return;
      }
      if (action.kind === 'go_to_step' && action.screenId) {
        respond({ kind: 'go_to_screen', screenId: action.screenId });
      }
    },
    [config, respond],
  );

  const trackExternalLinkOpened = useCallback(
    (meta: { layerId: string; href: string }) => {
      if (!flowId || !versionId) return;
      queue.enqueue(
        {
          name: 'external_link_opened',
          flowId,
          versionId,
          experimentId,
          variantId,
          stepId: meta.layerId,
          properties: { href: meta.href },
        },
        { channelId },
      );
    },
    [channelId, experimentId, flowId, queue, variantId, versionId],
  );

  const abandon = useCallback(() => {
    if (!flowId || !versionId) return;
    queue.enqueue(
      {
        name: 'flow_abandoned',
        flowId,
        versionId,
        experimentId,
        variantId,
      },
      { channelId },
    );
    options.onFlowAbandoned?.({
      flowId,
      versionId,
      experimentId,
      variantId,
    });
  }, [channelId, experimentId, flowId, options, queue, variantId, versionId]);

  useEffect(() => {
    if (!state || state.status !== 'completed' || !flowId || !versionId || completedSentRef.current) return;
    completedSentRef.current = true;
    queue.enqueue(
      {
        name: 'flow_completed',
        flowId,
        versionId,
        experimentId,
        variantId,
      },
      { channelId },
    );
    onCompletedRef.current?.({
      flowId,
      versionId,
      experimentId,
      variantId,
    });
  }, [channelId, experimentId, flowId, queue, state, variantId, versionId]);

  const screen =
    state?.status === 'running' && state.currentScreenId
      ? findScreen(state.manifest, state.currentScreenId)
      : undefined;

  const pendingExternalSurface =
    state?.pendingExternalSurface
      ? findExternalSurface(state.manifest, state.pendingExternalSurface.nodeId) ?? null
      : null;

  const interpolationContext = useMemo<InterpolationContext | undefined>(() => {
    if (!state) return undefined;
    return {
      responses: state.responses,
      customProperties: config.customProperties,
      canGoBack: state.history.length > 1,
    };
  }, [config.customProperties, state]);

  return {
    loading: loading || !attributionReady,
    error,
    resolveFailed: !loading && !!error && !state,
    retry,
    state,
    screen,
    manifest: state?.manifest ?? null,
    pendingExternalSurface,
    flowId,
    versionId,
    variantId,
    branding,
    mediaMap,
    respond,
    reportExternalSurfaceOutcome,
    interpolationContext,
    relayNativeButtonAction,
    trackExternalLinkOpened,
    abandon,
  };
};
