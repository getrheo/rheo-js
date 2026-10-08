import {
  ATTR_KEY_ACQ_CAMPAIGN,
  ATTR_KEY_ACQ_CHANNEL,
  ATTR_KEY_ACQ_SOURCE,
  ATTR_KEY_IS_ORGANIC,
  ATTR_KEY_LINK_ENTRY,
  ATTR_KEY_PROVIDER,
  LINK_EXT_PREFIX,
} from '@getrheo/attribution';

/** Host-supplied attribution adapter (mirrors RN provider extension point). */
export type WebAttributionProvider = {
  id: string;
  /** Return sdkAttributes to merge (canonical keys preferred). */
  collect: () => Record<string, unknown> | Promise<Record<string, unknown>>;
};

export type RheoWebAttributionConfig = {
  enabled?: boolean;
  /** Auto-capture UTM / query / referrer (default true). */
  captureUrlParams?: boolean;
  providers?: WebAttributionProvider[];
};

const UTM_MAP: Record<string, string> = {
  utm_source: ATTR_KEY_ACQ_SOURCE,
  utm_campaign: ATTR_KEY_ACQ_CAMPAIGN,
  utm_medium: ATTR_KEY_ACQ_CHANNEL,
  utm_content: `${LINK_EXT_PREFIX}utm_content`,
  utm_term: `${LINK_EXT_PREFIX}utm_term`,
};

/** Pure helper — parse first-party web attribution from URL + referrer. */
const referrerHost = (value: string) => {
  try {
    const candidate = value.includes('://') ? value : `https://${value}`;
    return new URL(candidate).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

export type WebAttributionLocation = {
  search?: string;
  referrer?: string;
  href?: string;
  pageHost?: string;
};

export const captureWebAttributionFromLocation = (params: WebAttributionLocation): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    [ATTR_KEY_PROVIDER]: 'web_first_party',
  };
  const search = params.search ?? '';
  const qs = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  let sawPaidHint = false;
  for (const [utm, key] of Object.entries(UTM_MAP)) {
    const v = qs.get(utm);
    if (v) {
      out[key] = v;
      if (utm === 'utm_source' || utm === 'utm_campaign') sawPaidHint = true;
    }
  }
  const entry = qs.get('rheo_entry') ?? qs.get('entry');
  if (entry) out[ATTR_KEY_LINK_ENTRY] = entry;
  const pageHost = params.pageHost?.replace(/^www\./i, '').toLowerCase();
  const referrer = params.referrer?.trim();
  if (referrer && (!pageHost || referrerHost(referrer) !== pageHost)) {
    out[`${LINK_EXT_PREFIX}referrer`] = referrer;
  }
  if (params.href) out[`${LINK_EXT_PREFIX}landing_url`] = params.href;
  out[ATTR_KEY_IS_ORGANIC] = !sawPaidHint;
  return out;
};

const FIRST_TOUCH_KEY = 'rheo_web_attribution_first_touch_v1';
const SESSION_KEY = 'rheo_web_attribution_session_v1';

let memoryFirstTouch: Record<string, unknown> | null = null;
let boundSessionId: string | null = null;
/** Set after this document has used document.referrer. A full page load resets the module. */
let documentReferrerConsumed = false;

export type CollectWebAttributionOptions = {
  /** When false, keep the first touch in memory and skip sessionStorage. */
  persist?: boolean;
  /** When false, a new session does not read the current URL. Default true. */
  captureUrl?: boolean;
};

export const clearWebAttributionStorage = (): void => {
  memoryFirstTouch = null;
  boundSessionId = null;
  documentReferrerConsumed = false;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(FIRST_TOUCH_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode */
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
};

const readSession = (): { sessionId: string; attrs: Record<string, unknown> } | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string; attrs?: Record<string, unknown> };
    if (!parsed || typeof parsed.sessionId !== 'string' || !parsed.attrs) return null;
    return { sessionId: parsed.sessionId, attrs: parsed.attrs };
  } catch {
    return null;
  }
};

const currentLocation = (): WebAttributionLocation => {
  if (typeof window === 'undefined') return {};
  return {
    search: window.location.search,
    referrer: document.referrer || undefined,
    href: window.location.href,
    pageHost: window.location.hostname,
  };
};

/**
 * Attribution for one analytics session.
 * The same session keeps its landing hit, including across a reload.
 * A later session in this document reads the current URL and ignores document.referrer.
 */
export const attributionForAnalyticsSession = (
  sessionId: string,
  options?: CollectWebAttributionOptions,
): Record<string, unknown> => {
  const persist = options?.persist !== false;
  const stored = readSession();
  if (stored?.sessionId === sessionId) {
    documentReferrerConsumed = true;
    boundSessionId = sessionId;
    memoryFirstTouch = stored.attrs;
    return stored.attrs;
  }
  if (boundSessionId === null && memoryFirstTouch) {
    boundSessionId = sessionId;
    if (persist) writeJson(SESSION_KEY, { sessionId, attrs: memoryFirstTouch });
    return memoryFirstTouch;
  }
  if (options?.captureUrl === false) {
    boundSessionId = sessionId;
    return memoryFirstTouch ?? {};
  }
  const attrs = captureWebAttributionFromLocation({
    ...currentLocation(),
    referrer: undefined,
  });
  documentReferrerConsumed = true;
  boundSessionId = sessionId;
  memoryFirstTouch = attrs;
  if (persist) {
    writeJson(FIRST_TOUCH_KEY, attrs);
    writeJson(SESSION_KEY, { sessionId, attrs });
  }
  return attrs;
};

export const collectWebAttributionAttributes = async (
  config: RheoWebAttributionConfig | undefined,
  options?: CollectWebAttributionOptions,
): Promise<Record<string, unknown>> => {
  if (config?.enabled === false) return {};
  const persist = options?.persist !== false;
  if (memoryFirstTouch) {
    if (persist) writeJson(FIRST_TOUCH_KEY, memoryFirstTouch);
    return memoryFirstTouch;
  }
  const merged: Record<string, unknown> = {};
  if (config?.captureUrlParams !== false && typeof window !== 'undefined') {
    const location = currentLocation();
    Object.assign(
      merged,
      captureWebAttributionFromLocation({
        ...location,
        referrer: documentReferrerConsumed ? undefined : location.referrer,
      }),
    );
    documentReferrerConsumed = true;
  }
  for (const provider of config?.providers ?? []) {
    try {
      const part = await provider.collect();
      Object.assign(merged, part);
    } catch {
      /* host provider failures are non-fatal */
    }
  }
  if (Object.keys(merged).length > 0) {
    memoryFirstTouch = merged;
    if (persist) writeJson(FIRST_TOUCH_KEY, merged);
  }
  return merged;
};
