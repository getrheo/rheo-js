import type { SdkTrackRequest, SdkTrackResponse } from '@getrheo/contracts';
import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import type { RheoConfig } from './client.js';
import { generateEventId, getResolvedAppUserId } from './events.js';
import { mapChannelError } from './resolve.js';

export type TrackCustomEventInput = {
  name: string;
  properties?: SdkTrackRequest['properties'];
  /** Override; defaults to `getResolvedAppUserId(config)`. */
  appUserId?: string;
  eventId?: string;
  timestamp?: string;
};

/**
 * Emit a custom behavioral event (Engage automations + segments).
 * Does not require flow/version ids and does not write flow analytics.
 */
export const track = async (
  input: TrackCustomEventInput,
  config: Pick<
    RheoConfig,
    | 'publishableKey'
    | 'apiBaseUrl'
    | 'userId'
    | 'customUserId'
    | 'sessionId'
    | 'locale'
    | 'appVersion'
    | 'platform'
    | 'customProperties'
    | 'fetcher'
  >,
): Promise<SdkTrackResponse> => {
  const apiBaseUrl = config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL;
  const fetcher = config.fetcher ?? fetch;
  const body: SdkTrackRequest = {
    eventId: input.eventId ?? generateEventId(),
    name: input.name,
    timestamp: input.timestamp ?? new Date().toISOString(),
    identity: {
      appUserId: input.appUserId ?? getResolvedAppUserId(config),
      ...(config.customUserId !== undefined ? { customUserId: config.customUserId } : {}),
      ...(config.sessionId !== undefined ? { sessionId: config.sessionId } : {}),
    },
    context: {
      platform: config.platform ?? 'web',
      ...(config.appVersion !== undefined ? { appVersion: config.appVersion } : {}),
      ...(config.locale !== undefined ? { locale: config.locale } : {}),
      ...(config.customProperties !== undefined
        ? { customProperties: config.customProperties }
        : {}),
    },
    ...(input.properties !== undefined ? { properties: input.properties } : {}),
  };

  const response = await fetcher(`${apiBaseUrl}/v1/sdk/track`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.publishableKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw await mapChannelError(response);
  }

  return (await response.json()) as SdkTrackResponse;
};
