import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetAnalyticsConsentState,
  setAnalyticsConsent,
  syncAnalyticsConsentFromProp,
} from './analyticsConsent.js';
import { RheoProvider, type RheoConfig } from './client.js';
import { getResolvedAppUserId } from './events.js';
import { currentPageName, installWebPageViewListener } from './pageViews.js';
import { logEvent, startWebProductAnalytics } from './productAnalytics.js';
import { clearWebAttributionStorage } from './attribution.js';

const FIRST_TOUCH_KEY = 'rheo_web_attribution_first_touch_v1';
const DEVICE_KEYS = [
  'rheo_app_user_id',
  'rheo_product_analytics_session_id',
  'rheo_product_analytics_session_last_at',
  'rheo_product_analytics_first_sent',
] as const;

type ReactTestRenderer = { unmount: () => void };
type RtrModule = {
  create: (element: ReactNode) => ReactTestRenderer;
  act: (cb: () => Promise<void> | void) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as RtrModule;

type AnalyticsEvent = {
  name: string;
  screenName?: string;
  context?: { attribution?: Record<string, string> };
};

const recordingFetcher = (bodies: Array<{ events: AnalyticsEvent[] }>) =>
  vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')) as { events: AnalyticsEvent[] });
    return new Response(JSON.stringify({ accepted: true }), { status: 200 });
  });

describe('web product analytics', () => {
  beforeEach(() => {
    resetAnalyticsConsentState();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearWebAttributionStorage();
    resetAnalyticsConsentState();
    vi.useRealTimers();
  });

  it('emits session_start, first_visit, and page_view without a flow', async () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/pricing');
    const bodies: Array<{ events: Array<{ name: string; screenName?: string }> }> = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(
        JSON.parse(String(init?.body ?? '{}')) as {
          events: Array<{ name: string; screenName?: string }>;
        },
      );
      return new Response(JSON.stringify({ accepted: true }), { status: 200 });
    });
    const stop = startWebProductAnalytics({
      enabled: true,
      transport: {
        publishableKey: 'ob_pk_test_analytics',
        apiBaseUrl: 'https://api.test',
        fetcher: fetcher as unknown as typeof fetch,
      },
      getBuildConfig: () => ({ userId: 'user-1', platform: 'web' }),
      onUserId: () => undefined,
    });
    await vi.waitFor(() => {
      expect(window.localStorage.getItem('rheo_product_analytics_session_id')).toBeTruthy();
    });
    logEvent('cta_clicked', { id: 'hero' });
    await vi.advanceTimersByTimeAsync(5000);
    stop();
    await vi.advanceTimersByTimeAsync(0);
    const names = bodies.flatMap((body) => body.events.map((event) => event.name));
    expect(names).toEqual(
      expect.arrayContaining(['session_start', 'first_visit', 'page_view', 'cta_clicked']),
    );
    const page = bodies.flatMap((body) => body.events).find((event) => event.name === 'page_view');
    expect(page?.screenName).toBe('/pricing');
    const urls = fetcher.mock.calls.map((call) => String(call[0]));
    expect(urls.every((url) => url.endsWith('/v1/sdk/analytics/events'))).toBe(true);
  });

  it('copies first-touch UTM parameters onto the event context', async () => {
    vi.useFakeTimers();
    const bodies: Array<{
      events: Array<{ context?: { attribution?: Record<string, string> } }>;
    }> = [];
    const stop = startWebProductAnalytics({
      enabled: true,
      transport: {
        publishableKey: 'ob_pk_test_analytics',
        apiBaseUrl: 'https://api.test',
        fetcher: (async (_input: RequestInfo | URL, init?: RequestInit) => {
          bodies.push(
            JSON.parse(String(init?.body ?? '{}')) as {
              events: Array<{ context?: { attribution?: Record<string, string> } }>;
            },
          );
          return new Response(JSON.stringify({ accepted: true }), { status: 200 });
        }) as unknown as typeof fetch,
      },
      getBuildConfig: () => ({
        userId: 'user-1',
        platform: 'web',
        attribution: {
          'acquisition.source': 'tiktok',
          'acquisition.campaign': 'spring',
          'acquisition.channel': 'cpc',
          'link.ext.utm_content': 'hero',
          'link.ext.utm_term': 'shoes',
        },
      }),
      onUserId: () => undefined,
    });
    logEvent('cta_clicked');
    await vi.advanceTimersByTimeAsync(5000);
    stop();
    const event = bodies.flatMap((body) => body.events).find((item) => item.context?.attribution);
    expect(event?.context?.attribution?.['acquisition.source']).toBe('tiktok');
    expect(event?.context?.attribution?.['link.ext.utm_term']).toBe('shoes');
  });

  it('keeps a pushState that happens while attribution is still loading', async () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: Array<{ events: Array<{ name: string; screenName?: string }> }> = [];
    const stop = startWebProductAnalytics({
      enabled: true,
      transport: {
        publishableKey: 'ob_pk_test_analytics',
        apiBaseUrl: 'https://api.test',
        fetcher: (async (_input: RequestInfo | URL, init?: RequestInit) => {
          bodies.push(
            JSON.parse(String(init?.body ?? '{}')) as {
              events: Array<{ name: string; screenName?: string }>;
            },
          );
          return new Response(JSON.stringify({ accepted: true }), { status: 200 });
        }) as unknown as typeof fetch,
      },
      getBuildConfig: () => ({ userId: 'user-1', platform: 'web' }),
      onUserId: () => undefined,
      whenAttributionReady: () => gate,
    });
    window.history.pushState({}, '', '/pricing');
    release();
    await vi.advanceTimersByTimeAsync(5000);
    stop();
    await vi.advanceTimersByTimeAsync(0);
    const pages = bodies
      .flatMap((body) => body.events)
      .filter((event) => event.name === 'page_view')
      .map((event) => event.screenName);
    expect(pages).toEqual(['/', '/pricing']);
  });

  it('stores a hash route as its path', async () => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/#!/pricing');
    const bodies: Array<{ events: Array<{ name: string; screenName?: string }> }> = [];
    const stop = startWebProductAnalytics({
      enabled: true,
      transport: {
        publishableKey: 'ob_pk_test_analytics',
        apiBaseUrl: 'https://api.test',
        fetcher: (async (_input: RequestInfo | URL, init?: RequestInit) => {
          bodies.push(
            JSON.parse(String(init?.body ?? '{}')) as {
              events: Array<{ name: string; screenName?: string }>;
            },
          );
          return new Response(JSON.stringify({ accepted: true }), { status: 200 });
        }) as unknown as typeof fetch,
      },
      getBuildConfig: () => ({ userId: 'user-1', platform: 'web' }),
      onUserId: () => undefined,
    });
    await vi.advanceTimersByTimeAsync(5000);
    stop();
    const page = bodies.flatMap((body) => body.events).find((event) => event.name === 'page_view');
    expect(page?.screenName).toBe('/pricing');
  });

  it('does not collect when analytics is disabled', async () => {
    const fetcher = vi.fn();
    const stop = startWebProductAnalytics({
      enabled: false,
      transport: {
        publishableKey: 'ob_pk_test_analytics',
        apiBaseUrl: 'https://api.test',
        fetcher: fetcher as unknown as typeof fetch,
      },
      getBuildConfig: () => ({ userId: 'user-1' }),
      onUserId: () => undefined,
    });
    logEvent('cta_clicked');
    stop();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('analytics consent', () => {
  let renderer: ReactTestRenderer | null = null;

  afterEach(() => {
    if (renderer) {
      const current = renderer;
      renderer = null;
      TestRenderer.act(() => {
        current.unmount();
      });
    }
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearWebAttributionStorage();
    resetAnalyticsConsentState();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mount = async (analytics?: RheoConfig['analytics'], fetcher?: ReturnType<typeof vi.fn>) => {
    window.history.pushState({}, '', '/pricing?utm_source=tiktok');
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        createElement(RheoProvider, {
          config: {
            publishableKey: 'ob_pk_test_analytics',
            apiBaseUrl: 'https://api.test',
            fetcher: (fetcher ?? vi.fn()) as unknown as typeof fetch,
            analytics,
          },
          children: null,
        }),
      );
    });
  };

  const eventNames = (bodies: Array<{ events: AnalyticsEvent[] }>): string[] =>
    bodies.flatMap((body) => body.events.map((event) => event.name));

  it('keeps the anonymous id in memory until consent is granted', () => {
    window.localStorage.setItem('rheo_app_user_id', 'stored-id');
    syncAnalyticsConsentFromProp('pending');
    const memoryId = getResolvedAppUserId({});
    expect(memoryId).not.toBe('stored-id');
    expect(window.localStorage.getItem('rheo_app_user_id')).toBe('stored-id');
    setAnalyticsConsent('granted');
    expect(getResolvedAppUserId({})).toBe('stored-id');
  });

  it('persists the in-memory anonymous id when storage is empty at grant', () => {
    syncAnalyticsConsentFromProp('pending');
    const memoryId = getResolvedAppUserId({});
    expect(window.localStorage.getItem('rheo_app_user_id')).toBeNull();
    setAnalyticsConsent('granted');
    expect(getResolvedAppUserId({})).toBe(memoryId);
    expect(window.localStorage.getItem('rheo_app_user_id')).toBe(memoryId);
  });

  it('does not store or send while consent is pending', async () => {
    const bodies: Array<{ events: AnalyticsEvent[] }> = [];
    const fetcher = recordingFetcher(bodies);
    await mount({ consent: 'pending' }, fetcher);
    logEvent('cta_clicked');
    for (const key of DEVICE_KEYS) expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not store or send when consent is omitted', async () => {
    vi.useFakeTimers();
    const bodies: Array<{ events: AnalyticsEvent[] }> = [];
    const fetcher = recordingFetcher(bodies);
    await mount(undefined, fetcher);
    logEvent('cta_clicked');
    await vi.advanceTimersByTimeAsync(5000);
    for (const key of DEVICE_KEYS) expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('drops events from before a grant, then stores and sends', async () => {
    vi.useFakeTimers();
    const bodies: Array<{ events: AnalyticsEvent[] }> = [];
    const fetcher = recordingFetcher(bodies);
    await mount({ consent: 'pending' }, fetcher);
    logEvent('cta_clicked', { id: 'hero' });
    await TestRenderer.act(async () => {
      setAnalyticsConsent('granted');
    });
    await vi.waitFor(() => {
      expect(window.localStorage.getItem('rheo_product_analytics_session_id')).toBeTruthy();
    });
    expect(window.localStorage.getItem('rheo_app_user_id')).toBeTruthy();
    expect(window.sessionStorage.getItem(FIRST_TOUCH_KEY)).toContain('tiktok');
    await vi.advanceTimersByTimeAsync(5000);
    const names = eventNames(bodies);
    expect(names).not.toContain('cta_clicked');
    expect(names).toEqual(expect.arrayContaining(['session_start', 'first_visit', 'page_view']));
    const page = bodies.flatMap((body) => body.events).find((event) => event.name === 'page_view');
    expect(page?.context?.attribution?.['acquisition.source']).toBe('tiktok');
  });

  it('clears device storage and stops collection when consent is denied', async () => {
    vi.useFakeTimers();
    const bodies: Array<{ events: AnalyticsEvent[] }> = [];
    const fetcher = recordingFetcher(bodies);
    await mount({ consent: 'granted' }, fetcher);
    await vi.waitFor(() => {
      expect(window.localStorage.getItem('rheo_app_user_id')).toBeTruthy();
    });
    await TestRenderer.act(async () => {
      setAnalyticsConsent('denied');
    });
    for (const key of DEVICE_KEYS) expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(FIRST_TOUCH_KEY)).toBeNull();
    logEvent('cta_clicked');
    await vi.advanceTimersByTimeAsync(5000);
    expect(eventNames(bodies)).not.toContain('cta_clicked');
  });

  it('does not collect when analytics is disabled, even if consent is granted', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn();
    await mount({ enabled: false, consent: 'granted' }, fetcher);
    logEvent('cta_clicked');
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('rheo_product_analytics_session_id')).toBeNull();
  });
});

describe('installWebPageViewListener', () => {
  it('emits the current path and later pushState paths', () => {
    window.history.pushState({}, '', '/start');
    const paths: string[] = [];
    const stop = installWebPageViewListener((path) => paths.push(path));
    window.history.pushState({}, '', '/next');
    stop();
    expect(paths).toEqual(['/start', '/next']);
  });

  it('uses a hash route and leaves an anchor off the name', () => {
    window.history.pushState({}, '', '/#/pricing');
    expect(currentPageName()).toBe('/pricing');
    window.history.pushState({}, '', '/docs#section');
    expect(currentPageName()).toBe('/docs');
    window.history.pushState({}, '', '/#!/billing');
    expect(currentPageName()).toBe('/billing');
  });
});
