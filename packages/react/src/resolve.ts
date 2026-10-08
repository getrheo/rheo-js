import type { SdkResolveResponse } from '@getrheo/contracts';
import { getResolvedAppUserId } from './events.js';
import type { RheoConfig } from './client.js';
import {
  loadManifestResolveCache,
  manifestResolveCacheKey,
  saveManifestResolveCache,
  shouldSendManifestConditional,
} from './manifestResolveCache.js';

export class RheoChannelArchivedError extends Error {
  readonly code = 'channel_archived' as const;
  constructor(message = 'Channel is archived') {
    super(message);
    this.name = 'RheoChannelArchivedError';
  }
}

export class RheoChannelNotFoundError extends Error {
  readonly code = 'channel_not_found' as const;
  constructor(message = 'Channel not found') {
    super(message);
    this.name = 'RheoChannelNotFoundError';
  }
}

export class RheoChannelRequiredError extends Error {
  readonly code = 'channel_required' as const;
  constructor(message = 'Channel id is required') {
    super(message);
    this.name = 'RheoChannelRequiredError';
  }
}

export const mapChannelError = async (response: Response): Promise<Error> => {
  let body: { error?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    /* ignore */
  }
  const msg = body.message ?? body.error ?? `resolve failed (${response.status})`;
  if (response.status === 404) return new RheoChannelNotFoundError(msg);
  if (response.status === 410 || body.error === 'channel_archived') {
    return new RheoChannelArchivedError(msg);
  }
  return new Error(msg);
};

const parseEtag = (response: Response): string | null => {
  const raw = response.headers.get('etag') ?? response.headers.get('ETag');
  if (!raw?.trim()) return null;
  return raw.trim();
};

const inFlight = new Map<string, Promise<SdkResolveResponse>>();

const runResolveManifest = async (params: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  config: RheoConfig;
  fetcher: typeof fetch;
  cacheKey: string;
}): Promise<SdkResolveResponse> => {
  const cached = loadManifestResolveCache(params.cacheKey);
  const headers: Record<string, string> = {
    authorization: `Bearer ${params.publishableKey}`,
    'content-type': 'application/json',
    'x-rheo-channel': params.channelId,
  };
  if (shouldSendManifestConditional(cached)) {
    headers['if-none-match'] = cached.etag;
  }

  const response = await params.fetcher(`${params.apiBaseUrl}/v1/sdk/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      identity: { appUserId: getResolvedAppUserId(params.config) },
      context: {
        platform: params.config.platform ?? 'web',
        ...(params.config.locale ? { locale: params.config.locale } : {}),
        ...(params.config.appVersion ? { appVersion: params.config.appVersion } : {}),
      },
    }),
  });

  if (response.status === 304) {
    if (!shouldSendManifestConditional(cached)) {
      throw new Error('resolve returned 304 without a local manifest cache entry');
    }
    return cached.body;
  }

  if (!response.ok) throw await mapChannelError(response);

  const data = (await response.json()) as SdkResolveResponse;
  const etag = parseEtag(response);
  if (etag) {
    saveManifestResolveCache(params.cacheKey, {
      etag,
      body: data,
      cachedAt: Date.now(),
    });
  }
  return data;
};

export const resolveManifest = (params: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  config: RheoConfig;
  fetcher?: typeof fetch;
}): Promise<SdkResolveResponse> => {
  const channelId = params.channelId.trim();
  if (!channelId) throw new RheoChannelRequiredError();
  const cacheKey = manifestResolveCacheKey(
    params.apiBaseUrl,
    params.publishableKey,
    channelId,
    params.config.locale,
  );
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = runResolveManifest({
    apiBaseUrl: params.apiBaseUrl,
    publishableKey: params.publishableKey,
    channelId,
    config: params.config,
    fetcher: params.fetcher ?? params.config.fetcher ?? fetch,
    cacheKey,
  }).finally(() => {
    inFlight.delete(cacheKey);
  });
  inFlight.set(cacheKey, promise);
  return promise;
};
