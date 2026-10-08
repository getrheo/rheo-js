import {
  StripeCheckoutAttemptCreateRequestSchema,
  StripeCheckoutAttemptCreateResponseSchema,
  StripeCheckoutAttemptStatusResponseSchema,
  type StripeCheckoutAttemptCreateRequest,
  type StripeCheckoutAttemptStatus,
} from '@getrheo/contracts';

const sdkHeaders = (publishableKey: string, channelId: string) => ({
  authorization: `Bearer ${publishableKey}`,
  'content-type': 'application/json',
  'x-rheo-channel': channelId,
});

export const registerStripeCheckoutAttempt = async (params: {
  apiBaseUrl: string;
  publishableKey: string;
  fetcher?: typeof fetch;
  body: StripeCheckoutAttemptCreateRequest;
}) => {
  const body = StripeCheckoutAttemptCreateRequestSchema.parse(params.body);
  const fetcher = params.fetcher ?? fetch;
  const response = await fetcher(`${params.apiBaseUrl}/v1/sdk/stripe/checkout-attempts`, {
    method: 'POST',
    headers: sdkHeaders(params.publishableKey, body.channelId),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`checkout attempt failed (${response.status})`);
  return StripeCheckoutAttemptCreateResponseSchema.parse(await response.json());
};

export const readStripeCheckoutAttemptStatus = async (params: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  attemptId: string;
  fetcher?: typeof fetch;
}): Promise<StripeCheckoutAttemptStatus> => {
  const fetcher = params.fetcher ?? fetch;
  const response = await fetcher(
    `${params.apiBaseUrl}/v1/sdk/stripe/checkout-attempts/${encodeURIComponent(params.attemptId)}`,
    {
      method: 'GET',
      headers: sdkHeaders(params.publishableKey, params.channelId),
    },
  );
  if (!response.ok) throw new Error(`checkout attempt status failed (${response.status})`);
  return StripeCheckoutAttemptStatusResponseSchema.parse(await response.json()).status;
};

export const cancelStripeCheckoutAttempt = async (params: {
  apiBaseUrl: string;
  publishableKey: string;
  channelId: string;
  attemptId: string;
  fetcher?: typeof fetch;
}): Promise<StripeCheckoutAttemptStatus> => {
  const fetcher = params.fetcher ?? fetch;
  const response = await fetcher(
    `${params.apiBaseUrl}/v1/sdk/stripe/checkout-attempts/${encodeURIComponent(params.attemptId)}/cancel`,
    {
      method: 'POST',
      headers: sdkHeaders(params.publishableKey, params.channelId),
    },
  );
  if (!response.ok) throw new Error(`checkout attempt cancel failed (${response.status})`);
  return StripeCheckoutAttemptStatusResponseSchema.parse(await response.json()).status;
};
