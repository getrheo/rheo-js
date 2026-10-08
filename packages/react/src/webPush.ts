import type { SdkPushRegisterResponse, SdkWebPushKeys } from '@getrheo/contracts';
import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import type { RheoConfig } from './client.js';
import { getResolvedAppUserId } from './events.js';
import { getSdkLogger } from './logging.js';

export type WebNotificationOutcome = 'granted' | 'denied' | 'blocked';

type CachedWebPush = SdkWebPushKeys & { appUserId: string };

let activeConfig: RheoConfig | null = null;
let cached: CachedWebPush | null = null;

/** @internal */
export const bindActiveWebPushConfig = (config: RheoConfig | null): void => {
  activeConfig = config;
};

const resolveConfig = (config?: RheoConfig): RheoConfig => {
  const resolved = config ?? activeConfig;
  if (!resolved?.publishableKey) {
    throw new Error('registerPush requires a RheoProvider or a config argument.');
  }
  return resolved;
};

const urlBase64ToUint8Array = (value: string): Uint8Array => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
};

const postJson = async (
  config: RheoConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> => {
  const apiBaseUrl = config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL;
  const fetcher = config.fetcher ?? fetch;
  return fetcher(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.publishableKey}`,
    },
    body: JSON.stringify(body),
  });
};

/** Browser notification permission. Missing `Notification` stays denied. */
export const requestWebNotificationOutcome = async (): Promise<WebNotificationOutcome> => {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'blocked';
  const next = await Notification.requestPermission();
  return next === 'granted' ? 'granted' : 'denied';
};

const readSubscriptionKeys = (subscription: PushSubscription): SdkWebPushKeys => {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Push subscription is missing endpoint keys.');
  }
  return { endpoint, p256dh, auth };
};

const subscribeWebPush = async (config: RheoConfig): Promise<SdkWebPushKeys> => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    throw new Error('Service workers are unavailable.');
  }
  const apiBaseUrl = config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL;
  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher(`${apiBaseUrl}/v1/sdk/push/config`, {
    headers: { authorization: `Bearer ${config.publishableKey}` },
  });
  if (!response.ok) {
    throw new Error(`push config failed: ${response.status}`);
  }
  const body = (await response.json()) as { vapidPublicKey?: string | null };
  if (!body.vapidPublicKey) {
    throw new Error('Web Push is not configured for this app.');
  }
  const registration = config.push?.serviceWorkerUrl
    ? await navigator.serviceWorker.register(config.push.serviceWorkerUrl)
    : await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(body.vapidPublicKey) as BufferSource,
  });
  return readSubscriptionKeys(subscription);
};

/**
 * Subscribe with the app VAPID key, or upload a subscription the host already has.
 * Uses the current `appUserId`.
 */
export const registerPush = async (
  input?: { webPush?: SdkWebPushKeys },
  config?: RheoConfig,
): Promise<SdkPushRegisterResponse> => {
  const resolved = resolveConfig(config);
  const webPush = input?.webPush ?? (await subscribeWebPush(resolved));
  const appUserId = getResolvedAppUserId(resolved);
  const response = await postJson(resolved, '/v1/sdk/push/register', {
    appUserId,
    platform: 'web',
    provider: 'web_push',
    webPush,
  });
  if (!response.ok) {
    throw new Error(`push register failed: ${response.status}`);
  }
  cached = { ...webPush, appUserId };
  return (await response.json()) as SdkPushRegisterResponse;
};

/** Revoke the cached web subscription. No-op when nothing was registered. */
export const unregisterPush = async (config?: RheoConfig): Promise<void> => {
  if (!cached) return;
  const resolved = resolveConfig(config);
  const endpoint = cached.endpoint;
  const appUserId = cached.appUserId;
  cached = null;
  const response = await postJson(resolved, '/v1/sdk/push/unregister', {
    appUserId,
    endpoint,
  });
  if (!response.ok) {
    throw new Error(`push unregister failed: ${response.status}`);
  }
};

/** Re-post the cached subscription when `userId` changes. */
export const rebindCachedWebPush = async (config: RheoConfig): Promise<void> => {
  if (!cached) return;
  const appUserId = getResolvedAppUserId(config);
  if (appUserId === cached.appUserId) return;
  try {
    await registerPush(
      { webPush: { endpoint: cached.endpoint, p256dh: cached.p256dh, auth: cached.auth } },
      config,
    );
  } catch (error) {
    getSdkLogger().warn('[rheo] push re-register failed', error);
  }
};

/** @internal */
export const __resetWebPushForTests = (): void => {
  cached = null;
  activeConfig = null;
};
