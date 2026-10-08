import {
  ProductAnalyticsClient,
  type ProductAnalyticsPropertyMap,
  type ProductAnalyticsStorage,
  type SdkContext,
} from '@getrheo/contracts';
import {
  analyticsStorageAllowed,
  generateEventId,
  getResolvedAppUserId,
  type SdkEventBuildConfig,
} from './events.js';
import { installWebPageViewListener } from './pageViews.js';
import { ProductAnalyticsQueue, type ProductAnalyticsTransport } from './productAnalyticsQueue.js';
import { createSdkLogger, type SdkLogger } from './logging.js';

export type WebAnalyticsRuntime = {
  logEvent: (name: string, properties?: ProductAnalyticsPropertyMap) => void;
  screen: (name: string, properties?: ProductAnalyticsPropertyMap) => void;
  setUserId: (id: string | null | undefined) => void;
};

let runtime: WebAnalyticsRuntime | null = null;

const registerRuntime = (next: WebAnalyticsRuntime | null): void => {
  runtime = next;
};

export const logEvent = (name: string, properties?: ProductAnalyticsPropertyMap): void => {
  runtime?.logEvent(name, properties);
};

export const screen = (name: string, properties?: ProductAnalyticsPropertyMap): void => {
  runtime?.screen(name, properties);
};

export const setUserId = (id: string | null | undefined): void => {
  runtime?.setUserId(id);
};

type BillingTransport = ProductAnalyticsTransport & { getAppUserId: () => string };
let billingTransport: BillingTransport | null = null;

/** Registers the host's RevenueCat or Superwall user id. Rheo does not import those SDKs. */
export const setBillingIdentity = (
  provider: 'revenuecat' | 'superwall',
  externalId: string | null | undefined,
): void => {
  const transport = billingTransport;
  const id = externalId?.trim();
  if (!transport || !id) return;
  const fetcher = transport.fetcher ?? fetch;
  void fetcher(`${transport.apiBaseUrl}/v1/sdk/billing-identities`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${transport.publishableKey}`,
    },
    body: JSON.stringify({
      appUserId: transport.getAppUserId(),
      provider,
      externalId: id,
    }),
  }).catch(() => undefined);
};

const webStorage = (): ProductAnalyticsStorage => ({
  get: async (key) => {
    if (!analyticsStorageAllowed()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    if (!analyticsStorageAllowed()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* private mode */
    }
  },
});

export const startWebProductAnalytics = ({
  enabled,
  transport,
  getBuildConfig,
  onUserId,
  logger,
  whenAttributionReady,
  onSessionStart,
}: {
  enabled: boolean;
  transport: ProductAnalyticsTransport;
  getBuildConfig: () => SdkEventBuildConfig;
  onUserId: (id: string | undefined) => void;
  logger?: SdkLogger;
  whenAttributionReady?: () => Promise<void>;
  onSessionStart?: (sessionId: string) => void;
}): (() => void) => {
  billingTransport = {
    ...transport,
    getAppUserId: () => getResolvedAppUserId(getBuildConfig()),
  };
  if (!enabled) {
    registerRuntime(null);
    return () => {
      billingTransport = null;
    };
  }
  const queue = new ProductAnalyticsQueue(transport, logger ?? createSdkLogger('silent'));
  const client = new ProductAnalyticsClient({
    storage: webStorage(),
    enqueue: queue.enqueue,
    createId: generateEventId,
    firstEventName: 'first_visit',
    getIdentity: () => {
      const config = getBuildConfig();
      return {
        appUserId: getResolvedAppUserId(config),
        ...(config.customUserId ? { customUserId: config.customUserId } : {}),
      };
    },
    whenAttributionReady,
    onSessionStart,
    getContext: (): SdkContext => {
      const config = getBuildConfig();
      return {
        platform: 'web',
        ...(config.locale ? { locale: config.locale } : {}),
        ...(config.appVersion ? { appVersion: config.appVersion } : {}),
        ...(config.customProperties ? { customProperties: config.customProperties } : {}),
        ...(config.attribution && Object.keys(config.attribution).length > 0
          ? { attribution: config.attribution }
          : {}),
      };
    },
  });
  const api: WebAnalyticsRuntime = {
    logEvent: client.logEvent,
    screen: (name, properties) => client.view('screen_view', name, properties),
    setUserId: (id) => {
      client.setUserId(id);
      onUserId(id?.trim() ? id.trim() : undefined);
    },
  };
  registerRuntime(api);
  let stopped = false;
  void client.start();
  const stopPages = installWebPageViewListener((path) => client.view('page_view', path));
  return () => {
    if (stopped) return;
    stopped = true;
    stopPages();
    billingTransport = null;
    registerRuntime(null);
    queue.dispose();
  };
};
