import { describe, expect, it, vi } from 'vitest';
import { identify } from './identify.js';

describe('identify', () => {
  it('posts email and marketing consent to /v1/sdk/identify', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        appUserId: 'user-1',
        email: 'a@example.com',
        marketingConsent: 'granted',
        topicConsents: {},
        merged: false,
      }),
    ) as unknown as typeof fetch;

    const result = await identify(
      {
        email: 'a@example.com',
        marketingConsent: 'granted',
        timezone: 'America/New_York',
      },
      {
        publishableKey: 'ob_pk_test',
        apiBaseUrl: 'https://api.test',
        userId: 'user-1',
        fetcher: fetchMock,
      },
    );

    expect(result.appUserId).toBe('user-1');
    expect(result.merged).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toBe('https://api.test/v1/sdk/identify');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      appUserId: 'user-1',
      email: 'a@example.com',
      marketingConsent: 'granted',
      timezone: 'America/New_York',
    });
  });

  it('throws mapped errors on non-OK responses', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: 'channel_not_found', message: 'missing' }, { status: 404 }),
    ) as unknown as typeof fetch;

    await expect(
      identify(
        { email: 'a@example.com' },
        {
          publishableKey: 'ob_pk_test',
          apiBaseUrl: 'https://api.test',
          userId: 'user-1',
          fetcher: fetchMock,
        },
      ),
    ).rejects.toMatchObject({ code: 'channel_not_found' });
  });
});
