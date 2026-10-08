import type { SdkResolveResponse } from '@getrheo/contracts';

export type ManifestResolveCacheEntry = {
  etag: string;
  body: SdkResolveResponse;
  cachedAt: number;
};

type StoredManifestResolveCacheEntry = {
  etag: string;
  body: SdkResolveResponse;
  cachedAt: number;
};

const memory = new Map<string, ManifestResolveCacheEntry>();

export const MANIFEST_RESOLVE_CACHE_KEY_PREFIX = 'rheo:resolve:';

export type ManifestResolveCacheKeyParts = {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  locale: string;
};

const normalizeApiBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.localStorage);

/** Parses a persisted manifest cache key back into its segments. */
export const parseManifestResolveCacheKey = (
  key: string,
): ManifestResolveCacheKeyParts | null => {
  if (!key.startsWith(MANIFEST_RESOLVE_CACHE_KEY_PREFIX)) return null;
  const rest = key.slice(MANIFEST_RESOLVE_CACHE_KEY_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length < 4) return null;
  const locale = parts[parts.length - 1] ?? '';
  const channelId = parts[parts.length - 2] ?? '';
  const publishableKey = parts[parts.length - 3] ?? '';
  const apiBaseUrl = parts.slice(0, -3).join(':');
  if (!apiBaseUrl || !publishableKey || !channelId) return null;
  return { apiBaseUrl, publishableKey, channelId, locale };
};

/** Clears every manifest cache entry from memory and localStorage. Returns count removed. */
export const clearManifestResolveCache = (): number => {
  const keys = new Set<string>(memory.keys());
  if (hasLocalStorage()) {
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key?.startsWith(MANIFEST_RESOLVE_CACHE_KEY_PREFIX)) keys.add(key);
      }
    } catch {
      /* private mode */
    }
  }
  memory.clear();
  if (hasLocalStorage()) {
    for (const key of keys) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
  return keys.size;
};

export const manifestResolveCacheKey = (
  apiBaseUrl: string,
  publishableKey: string,
  channelId: string,
  locale?: string,
): string =>
  `rheo:resolve:${normalizeApiBaseUrl(apiBaseUrl)}:${publishableKey}:${channelId.trim()}:${locale?.trim() ?? ''}`;

export const shouldSendManifestConditional = (
  entry: ManifestResolveCacheEntry | null | undefined,
): entry is ManifestResolveCacheEntry =>
  Boolean(entry?.etag?.trim() && entry.body);

export const peekManifestResolveCache = (
  key: string,
): ManifestResolveCacheEntry | null => memory.get(key) ?? null;

const parseStoredEntry = (raw: string): ManifestResolveCacheEntry | null => {
  try {
    const parsed = JSON.parse(raw) as StoredManifestResolveCacheEntry;
    if (
      typeof parsed?.etag !== 'string' ||
      !parsed.etag.trim() ||
      !parsed.body ||
      typeof parsed.body.flowId !== 'string'
    ) {
      return null;
    }
    return {
      etag: parsed.etag.trim(),
      body: parsed.body,
      cachedAt: typeof parsed.cachedAt === 'number' ? parsed.cachedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

export const loadManifestResolveCache = (
  key: string,
): ManifestResolveCacheEntry | null => {
  const mem = memory.get(key);
  if (mem) return mem;
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry = parseStoredEntry(raw);
    if (!entry) return null;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
};

export const saveManifestResolveCache = (
  key: string,
  entry: ManifestResolveCacheEntry,
): void => {
  memory.set(key, entry);
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        etag: entry.etag,
        body: entry.body,
        cachedAt: entry.cachedAt,
      } satisfies StoredManifestResolveCacheEntry),
    );
  } catch {
    // Persistence is best-effort; in-memory cache still applies for the session.
  }
};

/** Test-only: reset in-memory cache between Vitest cases. */
export const clearManifestResolveCacheMemoryForTests = (): void => {
  memory.clear();
};
