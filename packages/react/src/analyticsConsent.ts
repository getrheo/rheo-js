import { PRODUCT_ANALYTICS_STORAGE_KEYS } from '@getrheo/contracts';
import { clearWebAttributionStorage } from './attribution.js';
import {
  PERSISTED_APP_USER_ID_KEY,
  resetMemoryAppUserId,
  setAnalyticsStorageAllowed,
} from './events.js';

export type AnalyticsConsent = 'granted' | 'pending' | 'denied';

let consent: AnalyticsConsent = 'pending';
/** Last provider prop applied. An unchanged prop must not undo `setAnalyticsConsent`. */
let propConsent: AnalyticsConsent | null = null;
const listeners = new Set<(next: AnalyticsConsent) => void>();
let stopCollection: (() => void) | null = null;

const LOCAL_KEYS = [PERSISTED_APP_USER_ID_KEY, ...Object.values(PRODUCT_ANALYTICS_STORAGE_KEYS)];

export const getAnalyticsConsent = (): AnalyticsConsent => consent;

export const clearAnalyticsDeviceStorage = (): void => {
  resetMemoryAppUserId();
  clearWebAttributionStorage();
  if (typeof window === 'undefined') return;
  try {
    for (const key of LOCAL_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
};

const stopActiveCollection = (): void => {
  const stop = stopCollection;
  stopCollection = null;
  stop?.();
};

const commitAnalyticsConsent = (next: AnalyticsConsent): void => {
  if (consent === next) return;
  consent = next;
  setAnalyticsStorageAllowed(next === 'granted');
  if (next !== 'granted') stopActiveCollection();
  if (next === 'denied') clearAnalyticsDeviceStorage();
};

/** Host signal. `pending` is only set from the provider prop. */
export const setAnalyticsConsent = (next: 'granted' | 'denied'): void => {
  if (consent === next) return;
  commitAnalyticsConsent(next);
  for (const listener of [...listeners]) listener(consent);
};

/**
 * Apply `analytics.consent` from `RheoProvider`.
 * When the prop is unchanged, a later grant or deny from `setAnalyticsConsent` stays in effect.
 */
export const syncAnalyticsConsentFromProp = (next: AnalyticsConsent): AnalyticsConsent => {
  if (propConsent === next) return consent;
  propConsent = next;
  commitAnalyticsConsent(next);
  return consent;
};

export const subscribeAnalyticsConsent = (
  listener: (next: AnalyticsConsent) => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Lets a deny stop the running queue before the provider effect cleans up. */
export const bindAnalyticsCollection = (stop: () => void): (() => void) => {
  stopCollection = stop;
  return () => {
    if (stopCollection === stop) stopCollection = null;
    stop();
  };
};

/** Test isolation. Not part of the host API. */
export const resetAnalyticsConsentState = (): void => {
  stopActiveCollection();
  consent = 'granted';
  propConsent = null;
  listeners.clear();
  setAnalyticsStorageAllowed(true);
  resetMemoryAppUserId();
};
