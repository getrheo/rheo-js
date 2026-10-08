import {
  DEFAULT_SDK_LOG_LEVEL,
  RHEO_DEFAULT_SDK_API_BASE_URL,
  type SdkLogLevel,
} from '@getrheo/contracts/sdk';
import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  bindAnalyticsCollection,
  subscribeAnalyticsConsent,
  syncAnalyticsConsentFromProp,
  type AnalyticsConsent,
} from './analyticsConsent.js';
import {
  attributionForAnalyticsSession,
  collectWebAttributionAttributes,
  type RheoWebAttributionConfig,
} from './attribution.js';
import { EventQueue } from './eventQueue.js';
import { createSdkLogger, registerSdkLogLevel } from './logging.js';
import {
  __prefetchAllWithConfig,
  __prefetchChannelWithConfig,
  __registerPrefetchConfig,
} from './prefetch.js';
import { startWebProductAnalytics } from './productAnalytics.js';
import { bindActiveWebPushConfig, rebindCachedWebPush } from './webPush.js';

export type { AnalyticsConsent };
export type RheoConfig = {
  publishableKey: string;
  apiBaseUrl?: string;
  userId?: string;
  customUserId?: string;
  sessionId?: string;
  locale?: string;
  appVersion?: string;
  platform?: 'ios' | 'android' | 'web';
  sdkAttributes?: Record<string, unknown>;
  attribution?: RheoWebAttributionConfig;
  customProperties?: Record<string, string>;
  fetcher?: typeof fetch;
  /** Web Push. `serviceWorkerUrl` is registered before `pushManager.subscribe`. */
  push?: {
    serviceWorkerUrl?: string;
  };
  /**
   * Product analytics collection. `enabled: false` turns it off.
   * An omitted `consent` is pending: nothing is stored or sent until a grant.
   */
  analytics?: { enabled?: boolean; consent?: AnalyticsConsent };
};

type RheoCtxValue = {
  config: RheoConfig;
  queue: EventQueue;
  attributionAttributes: Record<string, unknown>;
  attributionReady: boolean;
};

const Ctx = createContext<RheoCtxValue | null>(null);

export const RheoProvider = ({
  config,
  prefetch,
  logLevel = DEFAULT_SDK_LOG_LEVEL,
  children,
}: {
  config: RheoConfig;
  /**
   * Warm the resolve cache on mount so flows render without a cold network round-trip.
   * `'all'` batch-prefetches every assigned channel via `POST /v1/sdk/resolve-all`;
   * a list prefetches just those channel public ids. Best-effort and silent.
   */
  prefetch?: 'all' | string[];
  logLevel?: SdkLogLevel;
  children: ReactNode;
}) => {
  const resolvedConfig = useMemo<RheoConfig>(
    () => ({
      apiBaseUrl: RHEO_DEFAULT_SDK_API_BASE_URL,
      platform: 'web',
      ...config,
    }),
    [config],
  );
  if (!resolvedConfig.publishableKey) {
    throw new Error('RheoProvider: `publishableKey` is required');
  }

  useEffect(() => {
    registerSdkLogLevel(logLevel);
  }, [logLevel]);

  const propConsent = resolvedConfig.analytics?.consent ?? 'pending';
  const [consent, setConsent] = useState<AnalyticsConsent>(() =>
    syncAnalyticsConsentFromProp(propConsent),
  );
  const syncedConsent = syncAnalyticsConsentFromProp(propConsent);
  if (syncedConsent !== consent) setConsent(syncedConsent);

  useEffect(() => subscribeAnalyticsConsent(setConsent), []);

  const [customUserId, setCustomUserId] = useState<string | undefined>(config.customUserId);
  useEffect(() => {
    setCustomUserId(config.customUserId);
  }, [config.customUserId]);

  const mergedConfig = useMemo<RheoConfig>(() => {
    const next: RheoConfig = { ...resolvedConfig };
    if (customUserId) next.customUserId = customUserId;
    else delete next.customUserId;
    return next;
  }, [resolvedConfig, customUserId]);

  const [attributionAttributes, setAttributionAttributes] = useState<Record<string, unknown>>({});
  const [attributionReady, setAttributionReady] = useState(false);
  const attributionWaitRef = useRef<{
    consent: AnalyticsConsent;
    promise: Promise<void>;
    resolve: () => void;
  } | null>(null);
  if (attributionWaitRef.current?.consent !== consent) {
    let resolveWait: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      resolveWait = resolve;
    });
    attributionWaitRef.current = { consent, promise, resolve: resolveWait };
  }

  const configRef = useRef(mergedConfig);
  configRef.current = mergedConfig;
  const attributionRef = useRef<Record<string, string | number | boolean>>({});

  const publishAttribution = useCallback((attrs: Record<string, unknown>) => {
    attributionRef.current = Object.fromEntries(
      Object.entries(attrs).filter(
        (entry): entry is [string, string | number | boolean] =>
          typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
      ),
    );
    setAttributionAttributes(attrs);
    setAttributionReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const wait = attributionWaitRef.current;
    void (async () => {
      const attrs = await collectWebAttributionAttributes(resolvedConfig.attribution, {
        persist: consent === 'granted',
      });
      if (cancelled || wait?.consent !== consent) return;
      publishAttribution(attrs);
      wait?.resolve();
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedConfig.attribution, consent, publishAttribution]);

  bindActiveWebPushConfig(resolvedConfig);
  useEffect(() => {
    void rebindCachedWebPush(resolvedConfig);
  }, [
    resolvedConfig.userId,
    resolvedConfig.publishableKey,
    resolvedConfig.apiBaseUrl,
    resolvedConfig.fetcher,
    resolvedConfig.push?.serviceWorkerUrl,
  ]);

  const mergedConfigRef = useRef(mergedConfig);
  mergedConfigRef.current = mergedConfig;
  useEffect(() => {
    __registerPrefetchConfig(mergedConfig);
    return () => {
      __registerPrefetchConfig(null);
    };
  }, [mergedConfig]);

  const prefetchKey = Array.isArray(prefetch) ? prefetch.join(',') : (prefetch ?? '');
  useEffect(() => {
    if (!prefetch) return;
    const cfg = mergedConfigRef.current;
    if (prefetch === 'all') {
      void __prefetchAllWithConfig(cfg);
      return;
    }
    for (const channelId of prefetch) {
      void __prefetchChannelWithConfig(cfg, channelId);
    }
  }, [prefetchKey, resolvedConfig.publishableKey, resolvedConfig.apiBaseUrl, resolvedConfig.locale]);

  const queue = useMemo(
    () =>
      new EventQueue(
        {
          publishableKey: resolvedConfig.publishableKey,
          apiBaseUrl: resolvedConfig.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
          fetcher: resolvedConfig.fetcher,
        },
        () => ({ ...configRef.current, attribution: attributionRef.current }),
        createSdkLogger(logLevel),
      ),
    [resolvedConfig.publishableKey, resolvedConfig.apiBaseUrl, resolvedConfig.fetcher, logLevel],
  );

  useEffect(
    () => () => {
      queue.dispose();
    },
    [queue],
  );

  const analyticsAllowed = resolvedConfig.analytics?.enabled !== false && consent === 'granted';

  useEffect(() => {
    const stop = startWebProductAnalytics({
      enabled: analyticsAllowed,
      transport: {
        publishableKey: resolvedConfig.publishableKey,
        apiBaseUrl: resolvedConfig.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL,
        fetcher: resolvedConfig.fetcher,
      },
      getBuildConfig: () => ({
        ...configRef.current,
        attribution: attributionRef.current,
      }),
      onUserId: setCustomUserId,
      logger: createSdkLogger(logLevel),
      whenAttributionReady: () => attributionWaitRef.current?.promise ?? Promise.resolve(),
      onSessionStart: (sessionId) => {
        const attributionConfig = configRef.current.attribution;
        publishAttribution(
          attributionForAnalyticsSession(sessionId, {
            persist: consent === 'granted',
            captureUrl:
              attributionConfig?.enabled !== false && attributionConfig?.captureUrlParams !== false,
          }),
        );
      },
    });
    if (!analyticsAllowed) return stop;
    return bindAnalyticsCollection(stop);
  }, [
    analyticsAllowed,
    resolvedConfig.publishableKey,
    resolvedConfig.apiBaseUrl,
    resolvedConfig.fetcher,
    logLevel,
    publishAttribution,
    consent,
  ]);

  const value = useMemo<RheoCtxValue>(
    () => ({
      config: mergedConfig,
      queue,
      attributionAttributes,
      attributionReady,
    }),
    [mergedConfig, queue, attributionAttributes, attributionReady],
  );

  return createElement(Ctx.Provider, { value }, children);
};

export const useRheo = (): RheoConfig => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRheo must be used within RheoProvider');
  return ctx.config;
};

export const useRheoContext = (): RheoCtxValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRheoContext must be used within RheoProvider');
  return ctx;
};

export const useEventQueue = (): EventQueue => useRheoContext().queue;
