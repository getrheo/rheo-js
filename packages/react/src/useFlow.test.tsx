import { createElement, useEffect, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlowManifest, SdkResolveResponse } from '@getrheo/contracts';
import { initFlowState, startFlow, submitResponse } from '@getrheo/flow-runtime/stateMachine';
import { RheoProvider, type RheoConfig } from './client.js';
import {
  clearStripeResumeSnapshot,
  persistStripeResumeSnapshot,
  STRIPE_RESUME_STORAGE_KEY,
} from './stripe.js';
import { useFlow, type UseFlowResult } from './useFlow.js';

type ReactTestRenderer = { unmount: () => void };
type RtrModule = {
  create: (e: ReactNode) => ReactTestRenderer;
  act: (cb: () => Promise<void> | void) => Promise<void>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as RtrModule;
const { act } = TestRenderer;

const doneScreen = (): FlowManifest['screens'][number] => ({
  id: 'scr_done',
  name: 'Done',
  regions: {
    body: {
      id: 'lyr_done_body',
      kind: 'stack',
      direction: 'vertical',
      children: [{ id: 'lyr_done_t', kind: 'text', text: { default: 'Done' } }],
    },
  },
  next: { default: null },
});

const continueWelcome = (next: string | null): FlowManifest['screens'][number] => ({
  id: 'scr_welcome',
  name: 'Welcome',
  regions: {
    body: {
      id: 'lyr_welcome_body',
      kind: 'stack',
      direction: 'vertical',
      children: [
        {
          id: 'lyr_welcome_btn',
          kind: 'button',
          variant: 'primary',
          action: { kind: 'continue' },
          children: [
            { id: 'lyr_welcome_btn_text', kind: 'text', text: { default: 'Continue' } },
          ],
        },
      ],
    },
  },
  next: { default: next },
});

const buildManifest = (opts: {
  entryNext: string | null;
  screens?: FlowManifest['screens'];
  externalSurfaceNodes?: FlowManifest['externalSurfaceNodes'];
}): FlowManifest => ({
  flowId: '11111111-1111-4111-8111-111111111111',
  schemaVersion: 7,
  version: 1,
  defaultLocale: 'en',
  locales: ['en'],
  entryScreenId: 'scr_welcome',
  screens: opts.screens ?? [continueWelcome(opts.entryNext), doneScreen()],
  decisionNodes: [],
  externalSurfaceNodes: opts.externalSurfaceNodes ?? [],
  sdkAttributeKeys: [],
});

const resolveFor = (manifest: FlowManifest): SdkResolveResponse => ({
  kind: 'flow',
  experiment: null,
  flowId: manifest.flowId,
  versionId: '22222222-2222-4222-8222-222222222222',
  versionNumber: 1,
  assignmentVersion: 1,
  environment: 'test',
  channelId: 'ch_test_web',
  experimentId: null,
  variantId: null,
  manifest,
  mediaMap: {},
  features: { attribution: true },
  integrations: {
    revenuecat: { enabled: false, defaultOfferingId: '', defaultPlacementId: '' },
    superwall: { enabled: false, defaultPlacementId: '' },
    appsflyer: { enabled: false },
    stripe: { enabled: false },
  },
});

const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

let lastFetcher: ReturnType<typeof vi.fn> | null = null;

const makeFetcher = (
  manifest: FlowManifest,
  attemptStatus: 'pending' | 'confirmed' | 'cancelled' = 'pending',
): typeof fetch => {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/stripe/checkout-attempts')) {
      if (init?.method === 'POST' && url.endsWith('/cancel')) {
        return new Response(
          JSON.stringify({ attemptId: ATTEMPT_ID, status: 'cancelled' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            attemptId: ATTEMPT_ID,
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ attemptId: ATTEMPT_ID, status: attemptStatus }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(resolveFor(manifest)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  lastFetcher = fetcher;
  return fetcher as unknown as typeof fetch;
};

type Harness = { current: UseFlowResult | null };

const HarnessComponent = ({ harness }: { harness: Harness }) => {
  const result = useFlow({ channelId: 'ch_test_web' });
  useEffect(() => {
    harness.current = result;
  });
  return null;
};

const flush = async () => {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0));
  });
};

const renderUseFlow = (params: {
  harness: Harness;
  manifest: FlowManifest;
  attemptStatus?: 'pending' | 'confirmed' | 'cancelled';
}) =>
  TestRenderer.create(
    createElement(
      RheoProvider,
      {
        config: {
          publishableKey: 'ob_pk_test_web',
          apiBaseUrl: 'https://api.test',
          fetcher: makeFetcher(params.manifest, params.attemptStatus),
          sessionId: 'sess_test',
          attribution: { enabled: false },
        } satisfies RheoConfig,
        children: createElement(HarnessComponent, { harness: params.harness }) as ReactNode,
      },
    ),
  );

const stubLocation = (opts: {
  href?: string;
  search?: string;
  assign?: (url: string) => void;
}) => {
  const href = opts.href ?? `http://localhost/${opts.search ?? ''}`;
  const search = opts.search ?? new URL(href).search;
  vi.stubGlobal('location', {
    ancestorOrigins: [] as unknown as DOMStringList,
    hash: '',
    host: 'localhost',
    hostname: 'localhost',
    href,
    origin: 'http://localhost',
    pathname: '/onboarding',
    port: '',
    protocol: 'http:',
    search,
    assign: opts.assign ?? vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    toString: () => href,
  } satisfies Partial<Location>);
};

afterEach(() => {
  clearStripeResumeSnapshot();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useFlow web soft-degrade', () => {
  it('fails RevenueCat surfaces and follows fallback', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_rc',
      externalSurfaceNodes: [
        {
          id: 'surf_rc',
          config: { provider: 'revenuecat' },
          outcomes: {},
          fallback: 'scr_done',
        },
      ],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    expect(harness.current?.screen?.id).toBe('scr_welcome');
    await act(async () => {
      harness.current?.respond({ kind: 'cta', action: 'primary' });
    });
    await flush();
    await flush();

    expect(harness.current?.pendingExternalSurface).toBeNull();
    expect(harness.current?.screen?.id).toBe('scr_done');
    tree?.unmount();
  });

  it('fails Superwall surfaces and follows fallback', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_sw',
      externalSurfaceNodes: [
        {
          id: 'surf_sw',
          config: { provider: 'superwall' },
          outcomes: {},
          fallback: 'scr_done',
        },
      ],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    await act(async () => {
      harness.current?.respond({ kind: 'cta', action: 'primary' });
    });
    await flush();
    await flush();

    expect(harness.current?.screen?.id).toBe('scr_done');
    tree?.unmount();
  });

  it('fails headless surfaces and follows fallback', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_headless',
      externalSurfaceNodes: [
        {
          id: 'surf_headless',
          config: { provider: 'headless' },
          outcomes: {},
          fallback: 'scr_done',
        },
      ],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();
    await act(async () => {
      harness.current?.respond({ kind: 'cta', action: 'primary' });
    });
    await flush();
    await flush();
    expect(harness.current?.screen?.id).toBe('scr_done');
    tree?.unmount();
  });

  it('fails Stripe surfaces when paymentLinkUrl is missing', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_stripe',
      externalSurfaceNodes: [
        {
          id: 'surf_stripe',
          config: { provider: 'stripe' },
          outcomes: { purchase_completed: 'scr_done' },
          fallback: 'scr_done',
        },
      ],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    expect(harness.current?.error?.message).toContain('paymentLinkUrl');
    expect(harness.current?.screen).toBeUndefined();
    tree?.unmount();
  });

  it('treats request_os_permission as denied on web', async () => {
    const welcome: FlowManifest['screens'][number] = {
      id: 'scr_welcome',
      name: 'Welcome',
      regions: {
        body: {
          id: 'lyr_welcome_body',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_perm',
              kind: 'button',
              variant: 'primary',
              action: {
                kind: 'request_os_permission',
                permissionKey: 'notifications',
                outcomes: {
                  granted: 'scr_done',
                  denied: 'scr_done',
                  blocked: 'scr_done',
                },
              },
              children: [{ id: 'lyr_perm_t', kind: 'text', text: { default: 'Allow' } }],
            },
          ],
        },
      },
      next: { default: null },
    };
    const manifest = buildManifest({
      entryNext: null,
      screens: [welcome, doneScreen()],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    await act(async () => {
      harness.current?.relayNativeButtonAction(
        {
          kind: 'request_os_permission',
          permissionKey: 'notifications',
          outcomes: {
            granted: 'scr_done',
            denied: 'scr_done',
            blocked: 'scr_done',
          },
        },
        { layerId: 'lyr_perm' },
      );
    });
    await flush();

    expect(harness.current?.screen?.id).toBe('scr_done');
    tree?.unmount();
  });

  it('treats request_app_review as a no-op commit on web', async () => {
    const welcome: FlowManifest['screens'][number] = {
      id: 'scr_welcome',
      name: 'Welcome',
      regions: {
        body: {
          id: 'lyr_welcome_body',
          kind: 'stack',
          direction: 'vertical',
          children: [
            {
              id: 'lyr_review',
              kind: 'button',
              variant: 'secondary',
              action: { kind: 'request_app_review' },
              children: [{ id: 'lyr_review_t', kind: 'text', text: { default: 'Rate' } }],
            },
          ],
        },
      },
      next: { default: 'scr_done' },
    };
    const manifest = buildManifest({
      entryNext: 'scr_done',
      screens: [welcome, doneScreen()],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    await act(async () => {
      harness.current?.relayNativeButtonAction(
        { kind: 'request_app_review' },
        { layerId: 'lyr_review' },
      );
    });
    await flush();

    expect(harness.current?.screen?.id).toBe('scr_done');
    tree?.unmount();
  });

  it('emits flow_completed once', async () => {
    const manifest = buildManifest({
      entryNext: null,
      screens: [continueWelcome(null)],
    });
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();
    await act(async () => {
      harness.current?.respond({ kind: 'cta', action: 'primary' });
    });
    await flush();
    await flush();
    const completed = () =>
      (lastFetcher?.mock.calls ?? []).filter((call) =>
        String((call[1] as RequestInit | undefined)?.body ?? '').includes('flow_completed'),
      ).length;
    expect(completed()).toBe(1);
    await flush();
    expect(completed()).toBe(1);
    tree?.unmount();
  });
});

describe('useFlow Stripe Payment Link', () => {
  it('redirects to the Payment Link and persists a resume snapshot', async () => {
    const assign = vi.fn();
    stubLocation({
      href: 'http://localhost/onboarding',
      search: '',
      assign,
    });

    const manifest = buildManifest({
      entryNext: 'surf_stripe',
      externalSurfaceNodes: [
        {
          id: 'surf_stripe',
          config: { provider: 'stripe', paymentLinkUrl: 'https://buy.stripe.com/test_abc' },
          outcomes: {
            purchase_completed: 'scr_done',
            purchase_cancelled: 'scr_welcome',
          },
          fallback: 'scr_done',
        },
      ],
    });

    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();

    await act(async () => {
      harness.current?.respond({ kind: 'cta', action: 'primary' });
    });
    await flush();
    await flush();

    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining('https://buy.stripe.com/test_abc'),
    );
    expect(assign).toHaveBeenCalledWith(expect.stringContaining(`client_reference_id=${ATTEMPT_ID}`));
    const raw = sessionStorage.getItem(STRIPE_RESUME_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? '{}').v).toBe(2);
    expect(harness.current?.pendingExternalSurface?.id).toBe('surf_stripe');
    tree?.unmount();
  });

  it('resumes from sessionStorage after Payment Link return', async () => {
    const token = 'resume_tok_abc';
    const manifest = buildManifest({
      entryNext: 'surf_stripe',
      externalSurfaceNodes: [
        {
          id: 'surf_stripe',
          config: { provider: 'stripe', paymentLinkUrl: 'https://buy.stripe.com/test_abc' },
          outcomes: {
            purchase_completed: 'scr_done',
            purchase_cancelled: 'scr_welcome',
          },
          fallback: 'scr_done',
        },
      ],
    });

    persistStripeResumeSnapshot({
      v: 2,
      attemptId: token,
      channelId: 'ch_test_web',
      surfaceId: 'surf_stripe',
      flowId: manifest.flowId,
      versionId: '22222222-2222-4222-8222-222222222222',
      experimentId: null,
      variantId: null,
      paymentLinkUrl: 'https://buy.stripe.com/test_abc',
      savedAt: Date.now(),
      flowState: submitResponse(startFlow(initFlowState(manifest, { platform: 'web' })), {
        kind: 'cta',
        action: 'primary',
      }),
      branding: null,
      mediaMap: {},
      attribution: { 'acquisition.source': 'tiktok' },
    });
    stubLocation({
      href: `http://localhost/onboarding?rheo_stripe_status=success&rheo_stripe_resume=${token}`,
      search: `?rheo_stripe_status=success&rheo_stripe_resume=${token}`,
    });
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);

    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();
    await flush();

    expect(harness.current?.screen?.id).toBe('scr_done');
    expect(sessionStorage.getItem(STRIPE_RESUME_STORAGE_KEY)).toBeNull();
    const urls = (lastFetcher?.mock.calls ?? []).map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('/v1/sdk/resolve'))).toBe(false);
    tree?.unmount();
  });

  it('ignores a spoofed session id and does not emit iap_purchase', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_stripe',
      externalSurfaceNodes: [
        {
          id: 'surf_stripe',
          config: { provider: 'stripe', paymentLinkUrl: 'https://buy.stripe.com/test_abc' },
          outcomes: {
            purchase_completed: 'scr_done',
            purchase_cancelled: 'scr_welcome',
          },
          fallback: 'scr_done',
        },
      ],
    });
    const pending = submitResponse(startFlow(initFlowState(manifest, { platform: 'web' })), {
      kind: 'cta',
      action: 'primary',
    });
    persistStripeResumeSnapshot({
      v: 2,
      attemptId: ATTEMPT_ID,
      channelId: 'ch_test_web',
      surfaceId: 'surf_stripe',
      flowId: manifest.flowId,
      versionId: '22222222-2222-4222-8222-222222222222',
      experimentId: null,
      variantId: null,
      paymentLinkUrl: 'https://buy.stripe.com/test_abc',
      savedAt: Date.now(),
      flowState: { ...pending, responses: { color: pending.responses.color ?? { kind: 'cta', action: 'primary' } } },
      branding: null,
      mediaMap: {},
      attribution: {},
    });
    stubLocation({
      href: 'http://localhost/onboarding?session_id=not-a-checkout-session',
      search: '?session_id=not-a-checkout-session',
    });
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest });
    });
    await flush();
    await flush();
    expect(harness.current?.screen?.id).toBe('scr_welcome');
    const bodies = (lastFetcher?.mock.calls ?? [])
      .filter((call) => String(call[0]).includes('/v1/sdk/events'))
      .map((call) => String((call[1] as RequestInit | undefined)?.body ?? ''));
    expect(bodies.some((body) => body.includes('iap_purchase'))).toBe(false);
    tree?.unmount();
  });

  it('lets a confirmed payment win when Back has no success marker', async () => {
    const manifest = buildManifest({
      entryNext: 'surf_stripe',
      externalSurfaceNodes: [
        {
          id: 'surf_stripe',
          config: { provider: 'stripe', paymentLinkUrl: 'https://buy.stripe.com/test_abc' },
          outcomes: {
            purchase_completed: 'scr_done',
            purchase_cancelled: 'scr_welcome',
          },
          fallback: 'scr_done',
        },
      ],
    });
    persistStripeResumeSnapshot({
      v: 2,
      attemptId: ATTEMPT_ID,
      channelId: 'ch_test_web',
      surfaceId: 'surf_stripe',
      flowId: manifest.flowId,
      versionId: '22222222-2222-4222-8222-222222222222',
      experimentId: null,
      variantId: null,
      paymentLinkUrl: 'https://buy.stripe.com/test_abc',
      savedAt: Date.now(),
      flowState: submitResponse(startFlow(initFlowState(manifest, { platform: 'web' })), {
        kind: 'cta',
        action: 'primary',
      }),
      branding: null,
      mediaMap: {},
      attribution: {},
    });
    stubLocation({ href: 'http://localhost/onboarding', search: '' });
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
    const harness: Harness = { current: null };
    let tree: ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderUseFlow({ harness, manifest, attemptStatus: 'confirmed' });
    });
    await flush();
    await flush();
    expect(harness.current?.screen?.id).toBe('scr_done');
    const urls = (lastFetcher?.mock.calls ?? []).map((call) => String(call[0]));
    expect(urls.some((url) => url.endsWith('/cancel'))).toBe(false);
    tree?.unmount();
  });
});
