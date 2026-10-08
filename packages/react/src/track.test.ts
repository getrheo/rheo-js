import { describe, expect, it, vi } from 'vitest';
import { track } from './track.js';

describe('track', () => {
  it('posts a custom Engage event to /v1/sdk/track', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ accepted: true }),
    ) as unknown as typeof fetch;

    const result = await track(
      { name: 'trial_started', properties: { plan: 'pro' }, eventId: 'evt_1' },
      {
        publishableKey: 'ob_pk_test',
        apiBaseUrl: 'https://api.test',
        userId: 'user-1',
        sessionId: 'sess_1',
        platform: 'web',
        fetcher: fetchMock,
      },
    );

    expect(result).toEqual({ accepted: true });
    const [url, init] = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toBe('https://api.test/v1/sdk/track');
    const body = JSON.parse(String(init?.body)) as {
      name: string;
      identity: { appUserId: string; sessionId?: string };
      context: { platform?: string };
      properties?: { plan?: string };
    };
    expect(body.name).toBe('trial_started');
    expect(body.identity.appUserId).toBe('user-1');
    expect(body.identity.sessionId).toBe('sess_1');
    expect(body.context.platform).toBe('web');
    expect(body.properties?.plan).toBe('pro');
  });
});
