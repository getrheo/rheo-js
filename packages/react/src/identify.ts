import type {
  MarketingConsent,
  SdkIdentifyAttributes,
  SdkIdentifyRequest,
  SdkIdentifyResponse,
} from '@getrheo/contracts';
import { RHEO_DEFAULT_SDK_API_BASE_URL } from '@getrheo/contracts/sdk';
import type { RheoConfig } from './client.js';
import { getResolvedAppUserId } from './events.js';
import { mapChannelError } from './resolve.js';

/** Fields for `POST /v1/sdk/identify`. `appUserId` defaults from config. */
export type IdentifyInput = {
  email?: string;
  marketingConsent?: MarketingConsent;
  topicConsents?: Record<string, MarketingConsent>;
  customUserId?: string;
  /** Bounded Customer attributes; shallow-merged server-side. */
  attributes?: SdkIdentifyAttributes;
  /** Blank clears the stored value. Omit the field to leave it unchanged. */
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: string;
  country?: string;
  /** Customer IANA timezone for Engage local send / quiet hours. */
  timezone?: string;
  /** Override; defaults to `getResolvedAppUserId(config)`. */
  appUserId?: string;
};

/**
 * Link email + marketing consent (and optional attributes / timezone) to the resolved `appUserId`.
 *
 * After collecting email + checkbox:
 * `await identify({ email, marketingConsent: 'granted', topicConsents? }, config)`
 */
export const identify = async (
  input: IdentifyInput,
  config: Pick<RheoConfig, 'publishableKey' | 'apiBaseUrl' | 'userId' | 'customUserId' | 'fetcher'>,
): Promise<SdkIdentifyResponse> => {
  const apiBaseUrl = config.apiBaseUrl ?? RHEO_DEFAULT_SDK_API_BASE_URL;
  const fetcher = config.fetcher ?? fetch;
  const customUserId = input.customUserId ?? config.customUserId;
  const body: SdkIdentifyRequest = {
    appUserId: input.appUserId ?? getResolvedAppUserId(config),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.marketingConsent !== undefined ? { marketingConsent: input.marketingConsent } : {}),
    ...(input.topicConsents !== undefined ? { topicConsents: input.topicConsents } : {}),
    ...(customUserId !== undefined ? { customUserId } : {}),
    ...(input.attributes !== undefined ? { attributes: input.attributes } : {}),
    ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
    ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.locale !== undefined ? { locale: input.locale } : {}),
    ...(input.country !== undefined ? { country: input.country } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
  };

  const response = await fetcher(`${apiBaseUrl}/v1/sdk/identify`, {
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

  return (await response.json()) as SdkIdentifyResponse;
};
