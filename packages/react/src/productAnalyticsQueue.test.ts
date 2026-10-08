import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SdkProductAnalyticsEvent } from '@getrheo/contracts';
import { ProductAnalyticsQueue } from './productAnalyticsQueue.js';

const event = (eventId: string): SdkProductAnalyticsEvent => ({
  eventId,
  name: 'page_view',
  timestamp: '2026-09-30T12:00:00.000Z',
  identity: { appUserId: 'user-1', sessionId: 'sess-1' },
});

const idsFrom = (init: RequestInit | undefined): string[] => {
  const body = JSON.parse(String(init?.body ?? '{}')) as { events: Array<{ eventId: string }> };
  return body.events.map((item) => item.eventId);
};

describe('ProductAnalyticsQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const queueWith = (fetcher: typeof fetch) =>
    new ProductAnalyticsQueue({
      publishableKey: 'pk',
      apiBaseUrl: 'https://api.test',
      fetcher,
    });

  it('retries a 503 with the same event id', async () => {
    vi.useFakeTimers();
    let status = 503;
    const seen: string[][] = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(idsFrom(init));
      return new Response('{}', { status });
    });
    const queue = queueWith(fetcher as unknown as typeof fetch);
    const id = '11111111-1111-4111-8111-111111111111';
    queue.enqueue(event(id));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(seen).toEqual([[id]]);
    status = 200;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[1]).toEqual([id]);
    queue.dispose();
  });

  it('drops a 400 without retrying', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response('{}', { status: 400 }));
    const queue = queueWith(fetcher as unknown as typeof fetch);
    queue.enqueue(event('22222222-2222-4222-8222-222222222222'));
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    queue.dispose();
  });

  it('sends once on dispose and does not requeue a failure', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => new Response('{}', { status: 503 }));
    const queue = queueWith(fetcher as unknown as typeof fetch);
    queue.enqueue(event('33333333-3333-4333-8333-333333333333'));
    queue.dispose();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('drops the oldest events past 2000 while a retry is waiting', async () => {
    vi.useFakeTimers();
    const seen: string[][] = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(idsFrom(init));
      return new Response('{}', { status: 503 });
    });
    const queue = queueWith(fetcher as unknown as typeof fetch);
    const first = '44444444-4444-4444-8444-444444444444';
    queue.enqueue(event(first));
    await vi.advanceTimersByTimeAsync(5_000);
    for (let i = 0; i < 2_000; i += 1) {
      queue.enqueue(event(`55555555-5555-4555-8555-${String(i).padStart(12, '0')}`));
    }
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[1]?.[0]).not.toBe(first);
    expect(seen[1]).toHaveLength(500);
    queue.dispose();
  });
});
