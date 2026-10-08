import type { SdkEvent } from '@getrheo/contracts';

export type SdkEventBuildConfig = {
  userId?: string;
  customUserId?: string;
  sessionId?: string;
  locale?: string;
  appVersion?: string;
  platform?: 'ios' | 'android' | 'web';
  customProperties?: Record<string, string>;
  attribution?: Record<string, string | number | boolean>;
};

export const PERSISTED_APP_USER_ID_KEY = 'rheo_app_user_id';

export const generateEventId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && 'getRandomValues' in c) {
    (c as Crypto).getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
};

const hasWebLocalStorage = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.localStorage);

let memoryAppUserId: string | null = null;
let analyticsStorageOpen = false;

/** When false, anonymous id resolution stays in memory and does not touch localStorage. */
export const setAnalyticsStorageAllowed = (allowed: boolean): void => {
  analyticsStorageOpen = allowed;
};

export const analyticsStorageAllowed = (): boolean => analyticsStorageOpen;

export const resetMemoryAppUserId = (): void => {
  memoryAppUserId = null;
};

export const getResolvedAppUserId = (config: Pick<SdkEventBuildConfig, 'userId'>): string => {
  if (config.userId) return config.userId;
  if (analyticsStorageOpen && hasWebLocalStorage()) {
    try {
      const existing = window.localStorage.getItem(PERSISTED_APP_USER_ID_KEY);
      if (existing) {
        memoryAppUserId = existing;
        return existing;
      }
      const id = memoryAppUserId ?? generateEventId();
      window.localStorage.setItem(PERSISTED_APP_USER_ID_KEY, id);
      memoryAppUserId = id;
      return id;
    } catch {
      /* private mode */
    }
  }
  if (!memoryAppUserId) memoryAppUserId = generateEventId();
  return memoryAppUserId;
};

export type TrackEventInput = {
  name: SdkEvent['name'];
  flowId: string;
  versionId: string;
  experimentId?: string | null;
  variantId?: string | null;
  stepId?: string | null;
  properties?: Record<string, string | number | boolean | null | string[]>;
  fieldClassification?: 'safe' | 'sensitive';
  timestamp?: string;
};

export const buildSdkEvent = (config: SdkEventBuildConfig, input: TrackEventInput): SdkEvent => ({
  eventId: generateEventId(),
  name: input.name,
  timestamp: input.timestamp ?? new Date().toISOString(),
  flowId: input.flowId,
  versionId: input.versionId,
  experimentId: input.experimentId ?? null,
  variantId: input.variantId ?? null,
  stepId: input.stepId ?? null,
  identity: {
    appUserId: getResolvedAppUserId(config),
    ...(config.sessionId ? { sessionId: config.sessionId } : {}),
    ...(config.customUserId ? { customUserId: config.customUserId } : {}),
  },
  context: {
    platform: config.platform ?? 'web',
    ...(config.locale ? { locale: config.locale } : {}),
    ...(config.appVersion ? { appVersion: config.appVersion } : {}),
    ...(config.customProperties ? { customProperties: config.customProperties } : {}),
    ...(config.attribution && Object.keys(config.attribution).length > 0
      ? { attribution: config.attribution }
      : {}),
  },
  ...(input.properties ? { properties: input.properties } : {}),
  ...(input.fieldClassification ? { fieldClassification: input.fieldClassification } : {}),
});
