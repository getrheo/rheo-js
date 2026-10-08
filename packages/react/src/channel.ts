import type { CodeParameters, CodeParameterValue } from '@getrheo/contracts/contentKind';
import {
  codeResolveEtag,
  SdkBannerResolveResponseSchema,
  SdkCodeResolveResponseSchema,
  type SdkBannerResolveResponse,
  type SdkChannelResolveResponse,
  type SdkCodeResolveResponse,
} from '@getrheo/contracts/sdkChannel';
import { SdkResolveResponseSchema, type SdkResolveResponse } from '@getrheo/contracts/sdk';
import { EXPERIMENT_EXPOSED_EVENT } from '@getrheo/contracts/codeChannelEvents';
import { getResolvedAppUserId, generateEventId } from './events.js';
import {
  loadManifestResolveCache,
  manifestResolveCacheKey,
  saveManifestResolveCache,
  shouldSendManifestConditional,
} from './manifestResolveCache.js';
import {
  mapChannelError,
  RheoChannelRequiredError,
} from './resolve.js';
import type { RheoConfig } from './client.js';

export type CodeChannel = SdkCodeResolveResponse & {
  get: <T extends CodeParameterValue>(key: string, fallback: T) => T;
};

export type BannerChannel = SdkBannerResolveResponse;

export type RheoChannel = SdkResolveResponse | CodeChannel | BannerChannel;

const jsonType = (value: unknown): string => (value === null ? 'null' : typeof value);

export const withCodeGet = (body: SdkCodeResolveResponse): CodeChannel => ({
  ...body,
  get: (key, fallback) => {
    if (!Object.prototype.hasOwnProperty.call(body.parameters, key)) return fallback;
    const value = body.parameters[key];
    if (jsonType(value) !== jsonType(fallback)) return fallback;
    return value as typeof fallback;
  },
});

export const parseChannelResolve = (input: unknown): RheoChannel => {
  const kind = (input as { kind?: string } | null)?.kind;
  if (kind === 'code') return withCodeGet(SdkCodeResolveResponseSchema.parse(input));
  if (kind === 'flow') return SdkResolveResponseSchema.parse(input);
  if (kind === 'banner') return SdkBannerResolveResponseSchema.parse(input);
  throw new Error(`unsupported channel kind: ${String(kind)}`);
};

const codeCache = new Map<string, { etag: string; body: SdkCodeResolveResponse }>();

export const loadCodeResolveCache = (
  key: string,
): { etag: string; body: SdkCodeResolveResponse } | null => codeCache.get(key) ?? null;

export const saveCodeResolveCache = (
  key: string,
  entry: { etag: string; body: SdkCodeResolveResponse },
): void => {
  codeCache.set(key, entry);
};

export const clearCodeResolveCacheForTests = (): void => {
  codeCache.clear();
};

const parseEtag = (response: Response): string | null => {
  const raw = response.headers.get('etag') ?? response.headers.get('ETag');
  return raw?.trim() ? raw.trim() : null;
};

const inFlight = new Map<string, Promise<RheoChannel | null>>();

export const resolveChannel = (params: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  config: RheoConfig;
  fetcher?: typeof fetch;
}): Promise<RheoChannel | null> => {
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
  const promise = runResolveChannel({ ...params, channelId, cacheKey }).finally(() => {
    inFlight.delete(cacheKey);
  });
  inFlight.set(cacheKey, promise);
  return promise;
};

const runResolveChannel = async ({
  apiBaseUrl,
  publishableKey,
  channelId,
  config,
  fetcher = config.fetcher ?? fetch,
  cacheKey,
}: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  config: RheoConfig;
  fetcher?: typeof fetch;
  cacheKey: string;
}): Promise<RheoChannel | null> => {
  const flowCached = loadManifestResolveCache(cacheKey);
  const codeCached = loadCodeResolveCache(cacheKey);
  const headers: Record<string, string> = {
    authorization: `Bearer ${publishableKey}`,
    'content-type': 'application/json',
    'x-rheo-channel': channelId,
  };
  const conditional =
    flowCached && shouldSendManifestConditional(flowCached)
      ? flowCached.etag
      : codeCached?.etag;
  if (conditional) headers['if-none-match'] = conditional;

  const response = await fetcher(`${apiBaseUrl}/v1/sdk/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      identity: { appUserId: getResolvedAppUserId(config) },
      context: {
        platform: config.platform ?? 'web',
        ...(config.locale ? { locale: config.locale } : {}),
        ...(config.appVersion ? { appVersion: config.appVersion } : {}),
      },
    }),
  });
  if (response.status === 404) return null;
  if (response.status === 304) {
    if (codeCached && !flowCached) return withCodeGet(codeCached.body);
    if (flowCached && shouldSendManifestConditional(flowCached)) return flowCached.body;
    if (codeCached) return withCodeGet(codeCached.body);
    throw new Error('resolve returned 304 without a local channel cache entry');
  }
  if (!response.ok) throw await mapChannelError(response);
  const json: unknown = await response.json();
  const kind = (json as { kind?: string }).kind;
  const etag = parseEtag(response);
  if (kind === 'code') {
    const body = SdkCodeResolveResponseSchema.parse(json);
    saveCodeResolveCache(cacheKey, {
      etag: etag ?? codeResolveEtag(body.assignmentVersion, body.variantKey, body.parameters),
      body,
    });
    return withCodeGet(body);
  }
  if (kind === 'banner') {
    return SdkBannerResolveResponseSchema.parse(json);
  }
  if (kind != null && kind !== 'flow') {
    throw new Error(`unsupported channel kind: ${kind}`);
  }
  const flow =
    kind === 'flow' ? SdkResolveResponseSchema.parse(json) : (json as SdkResolveResponse);
  if (etag) {
    saveManifestResolveCache(cacheKey, { etag, body: flow, cachedAt: Date.now() });
  }
  return flow;
};

type ActiveCodeExperiment = {
  experimentId: string;
  variantId: string;
  assignmentVersion: number;
  appUserId: string;
};

const activeByChannel = new Map<string, ActiveCodeExperiment | null>();
const loggedExposure = new Set<string>();

export const rememberCodeResolve = (
  channelId: string,
  channel: RheoChannel | null,
  appUserId: string,
): void => {
  if (
    !channel ||
    (channel.kind !== 'code' && channel.kind !== 'banner') ||
    !channel.experiment
  ) {
    activeByChannel.set(channelId, null);
    return;
  }
  activeByChannel.set(channelId, {
    experimentId: channel.experiment.id,
    variantId: channel.experiment.variantId,
    assignmentVersion: channel.assignmentVersion,
    appUserId,
  });
};

export const exposureKey = (
  appUserId: string,
  experimentId: string,
  variantId: string,
  assignmentVersion: number,
): string => `${appUserId}:${experimentId}:${variantId}:${assignmentVersion}`;

export const shouldLogExposure = (key: string): boolean => {
  if (loggedExposure.has(key)) return false;
  loggedExposure.add(key);
  return true;
};

export const resetChannelExposureForTests = (): void => {
  loggedExposure.clear();
  activeByChannel.clear();
};

type CodeEventTransport = {
  apiBaseUrl: string;
  publishableKey: string;
  fetcher?: typeof fetch;
  appUserId: string;
  platform?: 'ios' | 'android' | 'web';
  locale?: string;
  appVersion?: string;
};

let transport: CodeEventTransport | null = null;

export const registerCodeEventTransport = (next: CodeEventTransport): void => {
  transport = next;
};

const postCodeEvent = async (
  channelId: string,
  name: string,
  experimentId: string | null,
  variantId: string | null,
  properties?: Record<string, string | number | boolean | null>,
): Promise<void> => {
  if (!transport) return;
  const fetcher = transport.fetcher ?? fetch;
  await fetcher(`${transport.apiBaseUrl}/v1/sdk/code-events`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${transport.publishableKey}`,
      'content-type': 'application/json',
      'x-rheo-channel': channelId,
    },
    body: JSON.stringify({
      events: [
        {
          eventId: generateEventId(),
          name,
          timestamp: new Date().toISOString(),
          experimentId,
          variantId,
          identity: { appUserId: transport.appUserId },
          context: {
            platform: transport.platform ?? 'web',
            ...(transport.locale ? { locale: transport.locale } : {}),
            ...(transport.appVersion ? { appVersion: transport.appVersion } : {}),
          },
          ...(properties ? { properties } : {}),
        },
      ],
    }),
  });
};

export const logCodeExposure = async (channelId: string, channel: CodeChannel, appUserId: string): Promise<void> => {
  if (!channel.experiment) return;
  const key = exposureKey(
    appUserId,
    channel.experiment.id,
    channel.experiment.variantId,
    channel.assignmentVersion,
  );
  if (!shouldLogExposure(key)) return;
  await postCodeEvent(
    channelId,
    EXPERIMENT_EXPOSED_EVENT,
    channel.experiment.id,
    channel.experiment.variantId,
  );
};

/** Host events for a channel. Experiment ids are stamped only from an active code experiment. */
export const logChannelEvent = (
  channelId: string,
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void => {
  const active = activeByChannel.get(channelId.trim());
  void postCodeEvent(
    channelId.trim(),
    name,
    active?.experimentId ?? null,
    active?.variantId ?? null,
    properties,
  );
};

export type { SdkChannelResolveResponse, CodeParameters };
